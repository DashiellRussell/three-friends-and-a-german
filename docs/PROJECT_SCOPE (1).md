# Project Scope — AI Health Companion

> **Status:** Pre-hackathon planning  
> **Event:** Mistral AI Worldwide Hackathon, Sydney (UNSW MCIC)  
> **Timeline:** 31 hours (Saturday 9 AM – Sunday 6:30 PM)  
> **Team size:** 1–4  
> **Name:** TBD

---

## Problem Statement

Doctors typically have 10–15 minutes per patient visit. Patients forget symptoms between appointments, have no structured way to communicate daily health context, and medical records are fragmented across providers. In developing countries, GP access is severely limited and record-keeping infrastructure is poor or nonexistent. Visually impaired users are further excluded by chart-heavy, visually-dependent health apps.

Critically, patients with chronic conditions or concerning symptom patterns often fail to follow through on scheduling doctor visits — even when the data clearly indicates they should. There is no proactive mechanism to bridge the gap between health tracking and actually reaching a healthcare provider.

**The gap:** No tool exists that combines voice-first daily health logging, medical document understanding, structured doctor-ready report generation, and proactive outbound calling to connect patients with care — all in a single accessible interface.

---

## Target Users

**Primary:** Individuals in regions with limited healthcare access who need to maximise the value of infrequent doctor visits. People managing chronic conditions, ongoing symptoms, or medication regimens who lose track of health patterns between appointments.

**Secondary:** Visually impaired users who cannot use conventional health tracking apps. Elderly patients who find form-based health apps intimidating but can hold a conversation. Caregivers managing health tracking for dependents.

---

## MVP Scope (Hackathon Build)

These are the features required for a functional demo within the 31-hour build window. Everything below this line must work end-to-end for the pitch.

### 1. Voice Check-In

- Daily conversational health logging via ElevenLabs Conversational AI
- Duration target: ~2 minutes per session
- Captures: mood, energy level, sleep quality, active symptoms, medication adherence, free-form notes
- AI extracts structured health data from natural conversation (not form-filling)
- Conversation is transcribed and stored alongside extracted structured data
- Works as the primary input method — the app should be fully usable without touching the screen
- Language: English for MVP, architecture should not hardcode language assumptions

**Technical notes:**
- ElevenLabs Conversational AI via `@elevenlabs/react` `useConversation` hook
- WebRTC connection type (lower latency than WebSocket)
- Custom LLM backend: FastAPI server wrapping Mistral Large, exposing OpenAI-compatible `/v1/chat/completions` streaming endpoint
- Signed URL authentication flow: backend generates signed URLs via `GET /v1/convai/conversation/get-signed-url`, frontend connects via WebRTC
- Mistral Large for parsing transcripts into structured health entries
- Supabase for storing both raw transcripts and structured extractions
- W&B Weave tracing on every extraction call for evaluation

**ElevenLabs Agent Configuration:**
- Voice: Select a warm, empathetic voice from the ElevenLabs voice library (e.g. `JBFqnCBsd6RMkjVDRZzb` — George)
- Model: Flash v2.5 (`eleven_flash_v2_5`) for real-time interactions — 75ms latency, 0.5 credits/char
- Turn-taking: ElevenLabs proprietary model handles "hmm", "okay" as speech patterns, not interruptions
- Latency optimisation: `chunk_length_schedule: [120, 160, 250, 290]`, `flush: true` at end of utterances
- Client tools registered for UI updates (showing extracted symptoms on-screen mid-conversation)

**Custom LLM Backend (FastAPI → Mistral):**
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from mistralai import Mistral
import json

app = FastAPI()
mistral = Mistral(api_key="YOUR_MISTRAL_KEY")

@app.post("/v1/chat/completions")
async def chat(request: dict):
    messages = request.get("messages", [])
    async def stream():
        response = await mistral.chat.stream_async(
            model="mistral-large-latest",
            messages=messages
        )
        async for chunk in response:
            delta = chunk.data.choices[0].delta
            yield f"data: {json.dumps({'choices': [{'delta': {'content': delta.content or ''}, 'index': 0, 'finish_reason': None}]})}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

**React Frontend Integration:**
```tsx
import { useConversation } from '@elevenlabs/react';

function VoiceCheckIn() {
  const conversation = useConversation({
    onConnect: ({ conversationId }) => saveConversationId(conversationId),
    onDisconnect: (details) => processTranscript(details),
    onMessage: ({ message, source }) => updateLiveTranscript(message, source),
    onModeChange: (mode) => updateUIState(mode), // "speaking" | "listening"
    clientTools: {
      show_extracted_symptoms: (params) => {
        updateSymptomDisplay(params.symptoms);
        return "Displayed symptoms on screen";
      },
      flag_critical_symptom: (params) => {
        showCriticalAlert(params);
        return "Alert displayed";
      }
    },
  });

  const start = async () => {
    const signedUrl = await fetch('/api/elevenlabs/signed-url').then(r => r.json());
    await conversation.startSession({
      signedUrl: signedUrl.url,
      connectionType: 'webrtc',
    });
  };
}
```

### 2. Document Upload and Understanding

- Users upload medical documents: blood test results, prescriptions, discharge summaries, imaging reports, referral letters
- RAG pipeline ingests documents into vector store for retrieval
- AI can reference uploaded documents in future check-ins and report generation
- Supported formats for MVP: PDF, images (photos of paper documents)
- Each document is chunked, embedded, and associated with the user profile

**Technical notes:**
- Mistral embedding API for vector generation
- Supabase pgvector for storage and similarity search
- Chunking strategy must account for varied document structures (tables in blood tests vs prose in discharge summaries)
- OCR pipeline for image uploads (Mistral Vision / Pixtral)
- Document metadata stored relationally: upload date, document type, source

### 3. Critical Symptom Flagging

- When a user reports symptoms that may indicate a medical emergency (chest pain, difficulty breathing, sudden vision loss, signs of stroke), the app immediately surfaces a clear, prominent alert recommending the user seek immediate medical attention
- This is NOT diagnosis — it is pattern-matched urgency flagging with a conservative threshold
- Every flagging decision is logged and traceable via W&B Weave
- The alert includes localised emergency contact information where possible
- Disclaimer is always visible: "This app does not provide medical diagnoses. If you are experiencing a medical emergency, contact emergency services immediately."

**Technical notes:**
- Symptom flagging runs as a dedicated agent/tool, not inline with general conversation
- Conservative keyword and context matching supplemented by Mistral reasoning
- All flagging events logged with full context for auditability
- False negatives are more dangerous than false positives — bias toward flagging
- Registered as an ElevenLabs client tool (`flag_critical_symptom`) so the voice agent can trigger visual alerts mid-conversation

### 4. Doctor Report Generation

- One-page structured health brief generated on demand for upcoming appointments
- Sections: patient summary, symptom timeline, medication list, uploaded document summaries, AI-identified trends, patient concerns
- Designed to be printed or shown on a phone screen during a consultation
- Professional medical document styling — not a chatbot transcript dump
- Report pulls from all stored data: voice check-ins, uploaded documents, structured extractions

**Technical notes:**
- Mistral Large for report synthesis and summarisation
- RAG retrieval across all user data for comprehensive context
- PDF generation for downloadable/printable output
- Report generation traced end-to-end in W&B Weave

### 5. Health Timeline

- Chronological view of all health entries: voice check-ins, document uploads, flagged symptoms, generated reports
- Each entry shows date, type, brief summary, and key health indicators
- Serves as the user's persistent health narrative
- Searchable and filterable by date range and entry type

**Technical notes:**
- Supabase queries with RLS scoped to authenticated user
- Real-time updates via Supabase Realtime when new entries are added
- Lightweight frontend component — not the demo centrepiece but necessary for context

### 6. Proactive Outbound Health Calls (ElevenLabs Phone Integration)

This is the **"holy shit" demo moment** and the primary differentiator for the Best Use of ElevenLabs prize. The app doesn't just passively track health — it proactively calls the patient to check in, remind them of medications, or follow up on concerning symptom trends.

**User-facing behaviour:**
- User configures their phone number and preferred check-in schedule in the app
- The AI health companion calls the user at their scheduled time (or on-demand via a "Call me now" button in the UI)
- The phone conversation follows the same health check-in flow as the in-app voice check-in
- After the call ends, the transcript and extracted health data are stored identically to an in-app check-in
- If the AI detects concerning symptoms during the call, it can verbally recommend the user seek medical attention and log the flagging event
- The system can also make follow-up calls when symptom trends warrant it (e.g. "You've reported worsening headaches 3 days in a row — I'm calling to check in")

**Why this wins the ElevenLabs prize:**
- Voice is not just an input method — it's an outbound, proactive care mechanism
- Demonstrates deep ElevenLabs integration: Conversational AI + Twilio telephony + custom Mistral LLM backend + client/server tools + system tools (`end_call`)
- Real-world healthcare utility: reaches patients who won't open an app but will answer a phone call
- Aligns with ElevenLabs' accessibility mission — serves users with no smartphone, limited literacy, or visual impairment
- Creates a visceral demo moment: the judge's phone rings during the presentation, and the AI health companion talks to them live

**Technical architecture:**

The outbound calling flow uses ElevenLabs' native Twilio integration. No custom TwiML or media stream handling is required — ElevenLabs manages the Twilio ↔ Conversational AI bridge.

**Prerequisites:**
1. A Twilio account with a purchased phone number (or verified caller ID for outbound-only)
2. Twilio phone number imported into ElevenLabs dashboard (Phone Numbers tab)
3. The phone number linked to your ElevenLabs Conversational AI agent
4. Agent configured with the custom Mistral LLM backend

**Outbound Call API:**
```
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
Headers: xi-api-key: YOUR_ELEVENLABS_KEY
```

**Request body:**
```json
{
  "agent_id": "your-agent-id",
  "agent_phone_number_id": "your-phone-number-id",
  "to_number": "+61412345678",
  "conversation_initiation_client_data": {
    "dynamic_variables": {
      "user_name": "Sarah",
      "last_check_in": "2 days ago",
      "trending_symptoms": "recurring headaches, fatigue",
      "medication_list": "Metformin 500mg, Lisinopril 10mg"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call initiated",
  "conversation_id": "conv_abc123",
  "callSid": "CA1234567890abcdef"
}
```

**Python SDK (backend service):**
```python
from elevenlabs import ElevenLabs

client = ElevenLabs(api_key="YOUR_KEY")

def initiate_health_check_call(user):
    """Proactively call a user for their health check-in."""
    # Fetch user context from Supabase
    recent_entries = get_recent_health_entries(user.id, days=7)
    trending = analyse_symptom_trends(recent_entries)
    
    result = client.conversational_ai.twilio.outbound_call(
        agent_id="your-health-agent-id",
        agent_phone_number_id="your-phone-number-id",
        to_number=user.phone_number,
        conversation_initiation_client_data={
            "dynamic_variables": {
                "user_name": user.first_name,
                "last_check_in": format_relative_time(user.last_check_in),
                "trending_symptoms": ", ".join(trending.symptoms),
                "medication_list": ", ".join(user.medications),
                "concern_level": trending.concern_level,
            }
        }
    )
    
    # Log the call initiation in Supabase
    log_outbound_call(
        user_id=user.id,
        conversation_id=result.conversation_id,
        call_sid=result.call_sid,
        trigger_reason="scheduled_check_in"  # or "symptom_trend_concern"
    )
    
    return result
```

**FastAPI endpoints for outbound calling:**
```python
@app.post("/api/call/initiate")
async def initiate_call(request: CallRequest, user=Depends(get_current_user)):
    """User-triggered: 'Call me now' button."""
    result = initiate_health_check_call(user)
    return {"conversation_id": result.conversation_id, "status": "calling"}

@app.post("/api/call/schedule")
async def schedule_call(request: ScheduleRequest, user=Depends(get_current_user)):
    """Schedule a daily check-in call at a specific time."""
    # Store schedule in Supabase, cron job triggers calls
    await save_call_schedule(user.id, request.time, request.timezone)
    return {"status": "scheduled"}

@app.post("/api/call/webhook")
async def call_completed_webhook(request: dict):
    """ElevenLabs/Twilio webhook when call ends — process transcript."""
    conversation_id = request.get("conversation_id")
    transcript = await fetch_conversation_transcript(conversation_id)
    structured_data = await extract_health_data(transcript)
    await store_health_entry(structured_data, source="outbound_call")
    return {"status": "processed"}
```

**Agent system prompt for outbound calls:**
```
You are a caring AI health companion making a scheduled check-in call to {{user_name}}.

Their last check-in was {{last_check_in}}. Recently trending symptoms: {{trending_symptoms}}.
Current medications: {{medication_list}}.

Start with a warm greeting: "Hi {{user_name}}, this is your health companion calling for your check-in."

Guide the conversation through:
1. How they're feeling today (mood, energy)
2. Sleep quality last night
3. Any new or worsening symptoms
4. Medication adherence
5. Anything they want to mention to their doctor

If they report symptoms matching emergency patterns (chest pain, difficulty breathing, 
sudden vision loss, signs of stroke, severe allergic reaction), immediately:
- Tell them clearly to seek emergency medical attention
- Provide the emergency number (000 in Australia, 911 in US)
- Use the flag_critical_symptom tool
- Do NOT end the call abruptly — stay calm and supportive

Keep the conversation natural and under 3 minutes. End with a summary of what you logged.
```

**ElevenLabs System Tools used:**
- `end_call` — gracefully terminate after check-in is complete
- `language_detection` — auto-detect if user responds in a non-English language (post-MVP: multilingual support)

**ElevenLabs Server Tools (webhook-based):**
- `save_health_entry` — POST to your FastAPI server to store extracted data mid-call
- `get_patient_history` — GET recent health entries for context during the call
- `schedule_followup` — schedule a follow-up call if symptoms are concerning

**Frontend "Call Me" UI component:**
```tsx
function CallMeButton({ userPhone }) {
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | connected | ended
  
  const initiateCall = async () => {
    setCallStatus('calling');
    const res = await fetch('/api/call/initiate', { method: 'POST' });
    const data = await res.json();
    setCallStatus('connected');
    // Poll for call completion or use WebSocket for real-time status
    pollCallStatus(data.conversation_id);
  };

  return (
    <div>
      <button onClick={initiateCall} disabled={callStatus === 'calling'}>
        {callStatus === 'idle' && '📞 Call Me for Check-In'}
        {callStatus === 'calling' && 'Calling your phone...'}
        {callStatus === 'connected' && 'Call in progress'}
      </button>
      <p>We'll call {userPhone} — answer to start your check-in</p>
    </div>
  );
}
```

**Twilio setup checklist:**
1. Create Twilio account, purchase a phone number with voice capability (Australian number: +61 prefix)
2. Note the Account SID and Auth Token from the Twilio console
3. In ElevenLabs dashboard → Phone Numbers → Import Twilio Number
4. Enter Twilio Account SID, Auth Token, and the phone number
5. Assign the imported number to your Conversational AI agent
6. Test with a manual outbound call from the ElevenLabs dashboard before coding
7. For demo: use a verified caller ID (free) rather than a purchased number if budget-conscious

**Cost considerations:**
- Twilio voice calls: ~$0.013/min outbound in Australia
- ElevenLabs Conversational AI: ~$0.10/min on Pro plan (included minutes) or $0.12/min overage
- A 3-minute outbound health check-in costs approximately $0.34 total
- Budget for demo: ~20 test calls × 3 minutes = $6.80 in call costs
- Creator plan ($22/month) includes 250 Conversational AI minutes — more than enough for hackathon

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│               React / Next.js / shadcn/ui               │
│                                                         │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐│
│  │ Voice     │ │ Document │ │ Timeline / │ │ Call Me ││
│  │ Check-in  │ │ Upload   │ │ Dashboard  │ │ Button  ││
│  │ (WebRTC)  │ │          │ │            │ │         ││
│  └─────┬─────┘ └────┬─────┘ └─────┬──────┘ └────┬────┘│
└────────┼────────────┼─────────────┼──────────────┼──────┘
         │            │             │              │
         ▼            ▼             ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend / API                          │
│                  FastAPI (Python)                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Multi-Agent System                   │   │
│  │  ┌────────────┐ ┌────────────────┐               │   │
│  │  │ Symptom    │ │ Document       │               │   │
│  │  │ Extraction │ │ Analysis       │               │   │
│  │  │ Agent      │ │ Agent          │               │   │
│  │  └────────────┘ └────────────────┘               │   │
│  │  ┌────────────┐ ┌────────────────┐               │   │
│  │  │ Report     │ │ Triage /       │               │   │
│  │  │ Generation │ │ Flagging       │               │   │
│  │  │ Agent      │ │ Agent          │               │   │
│  │  └────────────┘ └────────────────┘               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Outbound Call Service                     │   │
│  │  ┌─────────────────┐  ┌───────────────────────┐  │   │
│  │  │ Call Scheduler   │  │ Call Initiation API   │  │   │
│  │  │ (cron triggers)  │  │ (user-triggered)      │  │   │
│  │  └─────────────────┘  └───────────────────────┘  │   │
│  │  ┌─────────────────┐  ┌───────────────────────┐  │   │
│  │  │ Post-Call        │  │ Trend Analysis /     │  │   │
│  │  │ Transcript Proc. │  │ Proactive Triggers   │  │   │
│  │  └─────────────────┘  └───────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Custom LLM Endpoint (Mistral → OpenAI format)  │   │
│  │   POST /v1/chat/completions (streaming SSE)       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
           ▼                  ▼
┌───────────────────┐ ┌──────────────────────────────────┐
│    Supabase       │ │       External APIs               │
│  ┌─────────────┐  │ │                                   │
│  │ PostgreSQL  │  │ │ Mistral (LLM + embeddings)        │
│  │ + pgvector  │  │ │ ElevenLabs (voice + phone calls)  │
│  │ + RLS       │  │ │ Twilio (telephony infrastructure) │
│  │ + Realtime  │  │ │ W&B Weave (tracing + eval)        │
│  └─────────────┘  │ │                                   │
│  ┌─────────────┐  │ └──────────────────────────────────┘
│  │ Auth        │  │
│  │ Storage     │  │
│  └─────────────┘  │
└───────────────────┘
```

---

## Database Schema (Supabase)

```sql
-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  first_name text,
  phone_number text,          -- E.164 format for outbound calls
  timezone text default 'Australia/Sydney',
  check_in_schedule jsonb,    -- { "enabled": true, "time": "09:00", "days": ["mon","wed","fri"] }
  created_at timestamptz default now()
);

-- Health entries (from voice check-ins, outbound calls, manual input)
create table public.health_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  source text not null,       -- 'voice_checkin' | 'outbound_call' | 'manual'
  conversation_id text,       -- ElevenLabs conversation ID
  call_sid text,              -- Twilio call SID (for phone calls)
  raw_transcript text,
  mood integer,               -- 1-10 scale
  energy integer,             -- 1-10 scale
  sleep_quality integer,      -- 1-10 scale
  symptoms jsonb,             -- [{ "name": "headache", "severity": 3, "duration": "2 days" }]
  medications_taken jsonb,    -- [{ "name": "Metformin", "taken": true, "dose": "500mg" }]
  notes text,
  flagged boolean default false,
  flag_reason text,
  created_at timestamptz default now()
);

-- Uploaded medical documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  file_path text not null,    -- Supabase Storage path
  document_type text,         -- 'blood_test' | 'prescription' | 'discharge_summary' | 'imaging' | 'referral'
  summary text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Document chunks for RAG
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents not null,
  content text not null,
  embedding vector(1024),     -- Mistral embedding dimension
  chunk_index integer,
  created_at timestamptz default now()
);

-- Outbound call log
create table public.outbound_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  conversation_id text,
  call_sid text,
  trigger_reason text,        -- 'scheduled' | 'symptom_trend' | 'user_requested' | 'follow_up'
  status text default 'initiated', -- 'initiated' | 'answered' | 'completed' | 'no_answer' | 'failed'
  duration_seconds integer,
  health_entry_id uuid references public.health_entries,
  created_at timestamptz default now()
);

-- Generated reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  title text,
  content jsonb,              -- Structured report sections
  pdf_path text,              -- Supabase Storage path
  date_range_start date,
  date_range_end date,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.health_entries enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.outbound_calls enable row level security;
alter table public.reports enable row level security;

create policy "Users can only access their own data" on public.profiles
  for all using (auth.uid() = id);
create policy "Users can only access their own entries" on public.health_entries
  for all using (auth.uid() = user_id);
create policy "Users can only access their own documents" on public.documents
  for all using (auth.uid() = user_id);
create policy "Users can only access their own chunks" on public.document_chunks
  for all using (document_id in (select id from public.documents where user_id = auth.uid()));
create policy "Users can only access their own calls" on public.outbound_calls
  for all using (auth.uid() = user_id);
create policy "Users can only access their own reports" on public.reports
  for all using (auth.uid() = user_id);
```

---

## Additional Features (Post-MVP / If Time Permits)

Ordered by impact-to-effort ratio for hackathon context. Build these only after MVP is fully functional and demo-ready.

### Tier 1 — High Impact, Moderate Effort

**Multilingual voice check-ins:** Support check-ins in languages other than English. Mistral models handle multilingual input natively. ElevenLabs supports multiple languages for voice synthesis. A German or Hindi demo during the pitch would be memorable. Effort is mostly in testing and prompt tuning, not architecture changes.

**Symptom trend recognition:** AI identifies patterns across multiple check-ins — recurring headaches every Monday, declining energy correlated with medication changes, seasonal symptom patterns. Surfaced as insights in the timeline and included in doctor reports. Requires sufficient check-in history to be meaningful, so demo would use seeded data.

**Image uploads for visual symptoms:** User photographs a rash, swelling, wound, or skin change. Mistral Vision / Pixtral analyses the image and logs a structured description alongside the health timeline. Useful for conditions that are hard to describe verbally. Stored in Supabase Storage with metadata.

### Tier 2 — Medium Impact, Lower Effort

**Medication reminders:** Extracted medication schedules from uploaded prescriptions automatically populate reminder notifications. Simple but demonstrates document understanding feeding into actionable features.

**Check-in customisation:** Users set preferred check-in time, frequency, and focus areas (e.g. "ask me about my knee rehab exercises"). Personalises the voice conversation and increases retention framing.

**Export and sharing:** Health data exportable as structured JSON or PDF bundle. Shareable via link or QR code for doctor visits. Privacy-conscious — user controls what is included.

### Tier 3 — High Impact, High Effort (Post-Hackathon)

**Wearable integration:** Apple Watch, Garmin, Whoop, Fitbit data ingestion. Passive biometrics (heart rate, sleep stages, activity) merged with active voice check-ins for comprehensive health picture. Requires OAuth flows and device-specific APIs.

**Health baseline establishment:** After sufficient data collection, the app establishes personalised baselines for each health metric and flags deviations. "Your energy has been below your baseline for 5 consecutive days" is more useful than absolute thresholds.

**End-to-end encryption:** Client-side encryption for all health data at rest. Zero-knowledge architecture where even the backend cannot read user health records. Critical for production but excessive for a 31-hour demo.

**Caregiver and family access:** Shared access model where a caregiver can view and contribute to a dependent's health timeline. Requires granular permission system and careful RLS policy design.

**Integration with healthcare systems:** FHIR-compliant data export for interoperability with electronic health record systems. HL7 message formatting for doctor report delivery. Production healthcare compliance (HIPAA, GDPR health data provisions).

---

## Prize Category Alignment

| Category | How This Project Qualifies |
|---|---|
| **Best Vibe Usage** | All code written via Mistral Vibe CLI with AGENTS.md, custom skills, and documented agent profiles |
| **Best Use of ElevenLabs** | Voice check-in as primary interaction + outbound phone calls for proactive care. Conversational AI with WebRTC, custom Mistral LLM backend, Twilio telephony integration, client tools for UI updates, server tools for health data persistence, system tools (`end_call`). Voice is the *core* of the product, not an add-on. 3+ ElevenLabs features working together. |
| **Best Agent Skills (HF)** | Multi-agent system with distinct specialist agents for symptom extraction, document analysis, report generation, and triage |
| **W&B Global Track** | Every LLM call traced via Weave. Evaluation metrics on extraction accuracy, flagging precision, and report quality. Dashboard visible to judges |
| **Global Winner** | Healthcare accessibility for underserved populations. Voice-first design for visually impaired users. Proactive outbound calling reaches patients who won't use an app. Technically sophisticated multi-agent architecture with production-ready observability |

---

## Constraints and Non-Goals

- This app does NOT provide medical diagnoses, treatment recommendations, or drug interaction checks
- This app does NOT replace professional medical advice
- This app does NOT store data with clinical-grade encryption in the MVP (acknowledged limitation)
- This app is NOT a telemedicine platform — it does not connect patients with doctors in real-time
- Every AI-generated health insight includes appropriate disclaimers
- The MVP targets a single-user experience — no multi-tenant or collaborative features in the hackathon build
- Native mobile apps (iOS/Android) are out of scope — web app only
- Outbound calls in the MVP are user-triggered or demo-seeded — fully autonomous scheduled calling is a stretch goal

---

## Demo Script Outline

1. **Open:** User opens the app, shows the health dashboard (seeded with 2 weeks of demo data)
2. **Voice check-in (in-app):** 60-second live voice conversation logging symptoms, mood, sleep, and medication. Show extracted structured data appearing on-screen in real-time via client tools.
3. **Document upload:** User uploads a blood test PDF, AI extracts and summarises key findings
4. **Timeline:** Show the health timeline with the new check-in and document entries, plus historical data showing symptom trends
5. **Critical alert:** Trigger a demo scenario where reported symptoms flag an urgent alert — show the visual warning and hear the agent verbally recommend seeking care
6. **📞 THE MOMENT — Outbound call:** Press "Call Me for Check-In" in the app. A judge's phone rings. The AI health companion introduces itself and conducts a live health check-in via phone. After the call, the transcript and extracted data appear in the app's timeline.
7. **Doctor report:** Generate a one-page health brief pulling from all logged data including the phone call
8. **Close:** Show the W&B Weave dashboard with traced calls and evaluation metrics across all interactions

**Total demo time target: 3–5 minutes**

**Demo moment strategy:** The phone call is the "holy shit" moment. A phone ringing in the middle of a hackathon demo is visceral and unexpected. The judge talking to an AI health companion live, then seeing their conversation appear as structured health data in the app, demonstrates the full end-to-end value proposition.

---

## Development Priority Order

This is the build sequence for the hackathon. Each phase should produce a demoable increment.

1. **Supabase schema + auth + RLS** — database foundation, user model, tables for health entries, documents, outbound calls, and reports
2. **Custom LLM backend** — FastAPI server wrapping Mistral Large with OpenAI-compatible streaming endpoint
3. **Voice check-in flow (in-app)** — ElevenLabs Conversational AI via WebRTC, transcript capture, Mistral extraction to structured data, storage in Supabase
4. **Document upload + RAG pipeline** — file upload, chunking, embedding, vector storage, basic retrieval
5. **Health timeline UI** — display stored entries chronologically with summaries
6. **Doctor report generation** — synthesise all data into formatted one-page brief
7. **Critical symptom flagging** — triage agent with conservative alerting, registered as client tool
8. **Outbound calling integration** — Twilio number setup, ElevenLabs phone number import, outbound call API endpoint, post-call transcript processing, "Call Me" UI button
9. **W&B Weave instrumentation** — trace all LLM calls, add evaluation metrics
10. **UI polish + demo prep** — visual refinement on key screens, seed demo data, rehearse pitch, test outbound call on demo phone

---

## Environment Variables Required

```env
# Mistral
MISTRAL_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_PHONE_NUMBER_ID=

# Twilio (for outbound calls)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# W&B Weave
WANDB_API_KEY=
WANDB_PROJECT=health-companion

# App
NEXT_PUBLIC_APP_URL=
BACKEND_URL=
```

---

## Key Dependencies

### Frontend (Next.js)
```json
{
  "@elevenlabs/react": "latest",
  "@supabase/supabase-js": "^2",
  "@supabase/auth-helpers-nextjs": "latest",
  "shadcn/ui": "latest"
}
```

### Backend (Python / FastAPI)
```
fastapi
uvicorn
mistralai
elevenlabs[pyaudio]
supabase
weave
python-multipart
```

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Hackathon WiFi congestion | Mobile hotspot as backup. Flash v2.5 absorbs network variability. |
| Browser audio permissions fail | Deploy to Vercel (HTTPS). Pre-grant permissions. Desktop Chrome for demo. |
| Outbound call doesn't connect during demo | Have a backup pre-recorded call video. Test 30 minutes before demo. Use "Call Me" button as primary (user-triggered is more reliable than scheduled). |
| Audio feedback loop from speakers | Use AirPods Pro for in-app voice. Phone call uses handset speaker — no feedback risk. |
| ElevenLabs rate limits | Creator plan (5 concurrent). Separate API keys for testing vs demo. Pre-warm connections. |
| Twilio number provisioning delays | Purchase number and import to ElevenLabs the night before. Verify it works with a test call. |
| WebSocket drops mid-conversation | ElevenLabs ping/pong keepalive. Reconnection logic. Pre-recorded backup. |
| Mistral API latency spikes | Buffer words ("Let me think about that...") sent immediately while real response processes. LLM cascading as fallback. |
