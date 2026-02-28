# Backend Architecture — RAG & Data Flows

## High-Level System Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        Demo[Demo App Shell]
        Dashboard[Dashboard Tab]
        Trends[Trends Tab]
        Log[Log Tab]
        Profile[Profile Tab]
        InputOverlay[Input Overlay<br/>Voice / Chat / Upload / Call]
    end

    subgraph Backend["Backend (Express + TypeScript)"]
        subgraph Routes["API Routes"]
            CheckinRoute["/api/checkin"]
            DocRoute["/api/documents"]
            ReportRoute["/api/reports"]
            VoiceRoute["/api/voice"]
            PatternRoute["/api/patterns"]
            ProfileRoute["/api/profiles"]
            SymptomRoute["/api/symptoms"]
        end

        subgraph Services["Service Layer"]
            MistralSvc["mistral.ts<br/>embedText() | extractCheckinData()<br/>generateConversationContext()<br/>summarizeDocument()"]
            CrossRef["crossReference.ts<br/>findRelatedContext()"]
            PatternSvc["patternDetection.ts<br/>detectPatterns()<br/>checkNewCheckinPattern()"]
            ChunkSvc["chunking.ts<br/>chunkDocument()"]
            DocPipeline["documentPipeline.ts<br/>processDocument()"]
            ReportSvc["generateReport.ts<br/>generateReport()"]
            ElevenSvc["elevenlabs.ts<br/>getSignedUrl()<br/>initiateOutboundCall()"]
        end
    end

    subgraph External["External Services"]
        Mistral["Mistral AI<br/>mistral-large-latest<br/>mistral-embed"]
        ElevenLabs["ElevenLabs<br/>WebRTC Voice<br/>Outbound Calls"]
        Twilio["Twilio<br/>Telephony"]
    end

    subgraph Database["Supabase (PostgreSQL + pgvector)"]
        CheckIns[(check_ins<br/>+ 1024-dim embedding)]
        Documents[(documents<br/>+ 1024-dim embedding)]
        DocChunks[(document_chunks<br/>+ 1024-dim embedding)]
        Symptoms[(symptoms)]
        Reports[(reports)]
        Profiles[(profiles)]
        Calls[(outbound_calls)]
        MatchCI["match_check_ins()<br/>pgvector RPC"]
        MatchDC["match_document_chunks()<br/>pgvector RPC"]
        Storage["Supabase Storage<br/>medical-documents<br/>reports"]
    end

    Frontend -->|HTTP + x-user-id| Backend
    MistralSvc -->|API| Mistral
    ElevenSvc -->|API| ElevenLabs
    ElevenSvc -->|API| Twilio
    CrossRef --> MatchCI
    CrossRef --> MatchDC
    PatternSvc --> MatchCI
    DocPipeline --> ChunkSvc
    DocPipeline --> MistralSvc
    ReportSvc --> Mistral
```

## RAG Data Flow — Document Upload & Chunking

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant DocRoute as POST /api/documents/upload
    participant Mistral as Mistral AI
    participant Supabase as Supabase DB
    participant Pipeline as documentPipeline.ts
    participant Chunking as chunking.ts

    User->>Frontend: Upload medical document (PDF + text)
    Frontend->>DocRoute: POST multipart (file + document_text)

    par Summarize & Embed in parallel
        DocRoute->>Mistral: summarizeDocument(text)
        Mistral-->>DocRoute: 3-5 sentence summary
        DocRoute->>Mistral: embedText(text) → 1024-dim vector
        Mistral-->>DocRoute: embedding[]
    end

    DocRoute->>Supabase: INSERT documents (summary, embedding)
    DocRoute-->>Frontend: 201 Created (document record)

    Note over DocRoute,Pipeline: Fire-and-forget background task

    DocRoute->>Pipeline: processDocument(docId, text, type)

    Pipeline->>Chunking: chunkDocument(text, docId, type)
    Note over Chunking: Split: paragraphs → lines → sentences<br/>Merge small chunks (min 400 chars)<br/>Add last-sentence overlap

    Chunking-->>Pipeline: Chunk[] (each ~500 tokens)

    loop For each chunk
        Pipeline->>Mistral: embedText(chunk.content)
        Mistral-->>Pipeline: 1024-dim vector
        Pipeline->>Supabase: INSERT document_chunks (content, embedding, metadata)
        Note over Pipeline: 150ms delay between calls
    end
```

## RAG Data Flow — Check-in Creation with Pattern Detection

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant CheckinRoute as POST /api/checkin
    participant Mistral as Mistral AI
    participant Supabase as Supabase DB
    participant Pattern as patternDetection.ts
    participant CrossRef as crossReference.ts

    User->>Frontend: Submit check-in transcript
    Frontend->>CheckinRoute: POST { transcript }

    CheckinRoute->>Mistral: extractCheckinData(transcript)
    Note over Mistral: Structured output via Zod schema:<br/>mood, energy, sleep, symptoms,<br/>flagged, summary (embedding-optimized)
    Mistral-->>CheckinRoute: CheckInExtraction

    CheckinRoute->>Mistral: embedText(summary) → 1024-dim vector
    Mistral-->>CheckinRoute: embedding[]

    CheckinRoute->>Supabase: INSERT check_ins (transcript, summary, mood, energy, embedding, ...)

    par RAG enrichment (non-blocking)
        CheckinRoute->>Pattern: checkNewCheckinPattern(embedding, userId)
        Pattern->>Supabase: match_check_ins RPC (pgvector cosine similarity)
        Supabase-->>Pattern: top 5 similar check-ins
        Note over Pattern: If 3+ neighbors with similarity >= 0.82<br/>→ recurring pattern detected
        Pattern-->>CheckinRoute: HealthPattern | null

        CheckinRoute->>CrossRef: findRelatedContext(summary, userId)
        CrossRef->>Mistral: embedText(summary)
        CrossRef->>Supabase: match_document_chunks RPC
        CrossRef->>Supabase: match_check_ins RPC
        Note over CrossRef: Merge results, filter by threshold (0.3),<br/>format as chronological context string
        CrossRef-->>CheckinRoute: RelatedContext
    end

    CheckinRoute-->>Frontend: 201 { checkin, pattern?, related_context? }
```

## RAG Data Flow — Voice Session with Context Injection

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant SummaryRoute as POST /api/checkin/summary
    participant SignedURL as GET /api/voice/signed-url
    participant CrossRef as crossReference.ts
    participant Mistral as Mistral AI
    participant Supabase as Supabase DB
    participant ElevenLabs as ElevenLabs WebRTC

    User->>Frontend: Tap "Start Voice Check-in"

    Frontend->>SummaryRoute: POST (generate conversation context)
    SummaryRoute->>Supabase: Fetch last 7 days of check-ins

    SummaryRoute->>CrossRef: findRelatedContext(recentSummaries, userId)
    Note over CrossRef: Search document_chunks by vector similarity<br/>includeCheckins: false (already have them)
    CrossRef-->>SummaryRoute: RAG context (matching documents)

    SummaryRoute->>Mistral: generateConversationContext(checkIns, ragContext)
    Note over Mistral: Generates 150-250 word system prompt<br/>incorporating check-in history + document findings
    Mistral-->>SummaryRoute: System prompt string

    SummaryRoute-->>Frontend: { context: systemPrompt }

    Frontend->>SignedURL: GET (with x-user-id)

    SignedURL->>CrossRef: findRelatedContext(healthConcerns, userId)
    CrossRef-->>SignedURL: RAG context string

    SignedURL->>ElevenLabs: getSignedUrl(agentId)
    ElevenLabs-->>SignedURL: Signed WebRTC URL

    SignedURL-->>Frontend: { signed_url, dynamic_variables: { health_context, ... } }

    Frontend->>ElevenLabs: WebRTC session with dynamic variables
    Note over User,ElevenLabs: Real-time voice conversation<br/>Agent has RAG context + user profile
```

## RAG Data Flow — Report Generation with Cross-Referencing

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant ReportRoute as GET /api/reports/generate
    participant Pattern as patternDetection.ts
    participant CrossRef as crossReference.ts
    participant Supabase as Supabase DB
    participant Mistral as Mistral AI
    participant PDF as generateReport.ts (jsPDF)

    User->>Frontend: Request health report (time range, options)
    Frontend->>ReportRoute: GET ?timeRange=week&detailLevel=summary

    par Fetch data from Supabase
        ReportRoute->>Supabase: SELECT profiles WHERE id = userId
        ReportRoute->>Supabase: SELECT check_ins WHERE date in range
        ReportRoute->>Supabase: SELECT symptoms WHERE date in range
        ReportRoute->>Supabase: SELECT documents WHERE date in range
    end

    ReportRoute->>Pattern: detectPatterns(userId)
    Note over Pattern: Clusters check-in embeddings via pgvector<br/>Connected components (similarity >= 0.82)<br/>Mistral describes each cluster
    Pattern-->>ReportRoute: HealthPattern[]

    ReportRoute->>CrossRef: findRelatedContext(symptomNames, userId)
    Note over CrossRef: Embeds "headache, fatigue, dizziness"<br/>Searches document_chunks for matching sections<br/>(e.g., blood test iron studies)
    CrossRef-->>ReportRoute: RAG context string

    ReportRoute->>PDF: generateReport({ checkIns, symptoms, patterns, ragContext, ... })

    PDF->>Mistral: Generate executive summary with patterns + RAG context
    Note over Mistral: Cross-references symptoms with documents:<br/>"Patient reported recurring fatigue (5x).<br/>Blood panel showed Hb 11.2 g/dL,<br/>consistent with iron deficiency."
    Mistral-->>PDF: Executive summary text

    PDF-->>ReportRoute: jsPDF document

    ReportRoute->>Supabase: Upload PDF to Storage
    ReportRoute->>Supabase: INSERT reports record

    ReportRoute-->>Frontend: PDF binary (inline)
```

## Pattern Detection Algorithm

```mermaid
graph TD
    A[Fetch last 30 days of check-ins<br/>with embeddings] --> B[For each check-in]

    B --> C["Query pgvector: match_check_ins()<br/>Find 5 nearest neighbors by<br/>cosine similarity"]

    C --> D[Build neighbor graph<br/>adjacency list of similar pairs]

    D --> E["Connected components clustering<br/>threshold: similarity >= 0.82<br/>min cluster size: 3"]

    E --> F{Cluster found?}

    F -->|No| G[No pattern]
    F -->|Yes| H[Count common symptoms<br/>across cluster members]

    H --> I{Common symptoms?}

    I -->|"2+ symptoms"| J["symptom_cluster<br/>(e.g., headache + dizziness)"]
    I -->|"1 symptom"| K["recurring_symptom<br/>(e.g., fatigue 5x in 12 days)"]
    I -->|"None"| L["trend_change<br/>(similar health state)"]

    J --> M["Mistral generates description<br/>+ confidence score"]
    K --> M
    L --> M

    M --> N["Return HealthPattern[]<br/>cached for 1 hour"]
```

## Vector Search Infrastructure

```mermaid
graph LR
    subgraph "Embedding Sources"
        CI["check_ins.embedding<br/>(from summary text)"]
        DC["document_chunks.embedding<br/>(from chunk content)"]
        DOC["documents.embedding<br/>(from full document text)"]
    end

    subgraph "Mistral Embed"
        E["mistral-embed model<br/>text → 1024-dim vector"]
    end

    subgraph "pgvector RPCs"
        MCI["match_check_ins()<br/>cosine similarity search"]
        MDC["match_document_chunks()<br/>cosine similarity search"]
    end

    subgraph "Consumers"
        XR["crossReference.ts<br/>findRelatedContext()"]
        PD["patternDetection.ts<br/>detectPatterns()<br/>checkNewCheckinPattern()"]
    end

    subgraph "Injected Into"
        Voice["Voice AI system prompt"]
        Chat["Chat AI system prompt"]
        Report["Report executive summary"]
        API["Check-in API response"]
    end

    E --> CI
    E --> DC
    E --> DOC

    CI --> MCI
    DC --> MDC

    MCI --> XR
    MDC --> XR
    MCI --> PD

    XR --> Voice
    XR --> Chat
    XR --> Report
    XR --> API
    PD --> Report
    PD --> API
```
