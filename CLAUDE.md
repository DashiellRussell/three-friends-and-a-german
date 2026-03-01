# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tessera — AI Health Companion** built for the Mistral AI Worldwide Hackathon (Sydney). Provides voice-based daily health check-ins, proactive outbound health calls, text check-ins with AI conversation, medical document upload and analysis, critical symptom flagging, health trend tracking, and doctor report PDF generation.

## Commands

### Frontend (`frontend/`)

- `cd frontend && pnpm dev` — start Next.js dev server (localhost:3000)
- `cd frontend && pnpm build` — production build
- `cd frontend && pnpm lint` — run ESLint
- `cd frontend && pnpm start` — serve production build

### Backend (`backend/`)

- `cd backend && npm run dev` — start Express dev server with ts-node-dev (localhost:3001)
- `cd backend && npm run build` — compile TypeScript
- `cd backend && npm start` — run compiled output

## Tech Stack

### Frontend

- **Framework:** Next.js 16 (App Router, `frontend/src/` directory)
- **Language:** TypeScript (strict mode), React 19
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Components:** shadcn/ui primitives
- **HTTP client:** axios
- **Voice:** `@elevenlabs/react` v0.14.1 (WebRTC conversation hook)
- **PDF:** jsPDF (client-side test report generation), pdfjs-dist (PDF viewing)
- **Icons:** lucide-react
- **Package manager:** pnpm
- **Path alias:** `@/*` maps to `./src/*`

### Backend

- **Framework:** Express 4.21.2 with TypeScript
- **AI:** `@mistralai/mistralai` 1.5.0 for LLM structured extraction, embeddings, chat, and summarization
- **Database:** `@supabase/supabase-js` 2.49.4 (service role client, bypasses RLS)
- **Voice/Phone:** ElevenLabs API (signed URLs, conversational AI) + Twilio (outbound telephony)
- **File uploads:** multer (20MB limit, memory storage)
- **Validation:** zod v4.3.6 for structured output schemas
- **PDF:** jsPDF for server-side report generation
- **Package manager:** npm
- **Dev server:** ts-node-dev (auto-restart on changes)

### Infrastructure

- **Database:** Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)
- **Voice/Phone:** ElevenLabs (conversational AI, WebRTC, TTS) + Twilio (telephony)
- **Deployment:** Vercel (frontend) + Railway (backend) + Supabase (managed DB)
- **Observability:** W&B Weave for tracing all LLM calls (not yet instrumented)

## Architecture

### Monorepo Structure

```
three-friends-and-a-german/
├── frontend/          — Next.js app (pnpm)
├── backend/           — Express API server (npm)
├── docs/              — Project scope docs, schema diagrams
├── .vibe/             — Mistral Vibe CLI config + agent profiles
├── CLAUDE.md          — Claude Code guidance (this file)
├── AGENTS.md          — Mistral Vibe workspace rules
└── DEPLOYMENT.md      — Production deployment guide (Vercel + Railway + Supabase)
```

### Frontend (`frontend/src/`)

```
app/
├── layout.tsx              — Root layout with Geist fonts + UserProvider
├── providers.tsx           — UserProvider wrapper
├── page.tsx                — Marketing landing page (waitlist, features, hero)
├── globals.css             — Animations (fadeUp, slideUp, waveBar, bounce, spin)
├── demo/page.tsx           — Demo app shell with login gate + tab navigation
└── checkin/                — Defunct route stubs (voice/text/upload subpages)

components/app/
├── dashboard.tsx           — Home tab (greeting, daily check-in CTA, alerts, stats, energy sparkline)
├── log.tsx                 — Log container with 3 subtabs (log, files, reports)
├── log-tab.tsx             — Expandable check-in entry list (fetches from backend)
├── files-tab.tsx           — Document storage list (placeholder)
├── reports-tab.tsx         — Generated reports with download links
├── trends.tsx              — Trends tab (sparklines, mood distribution, symptom frequency, adherence)
├── profile.tsx             — Profile tab (user info, health profile, documents, call-me button, prefs)
├── input-overlay.tsx       — Central input modal (voice/chat/upload/calling modes)
├── new-entry-popup.tsx     — Entry type picker (voice/call/text/upload)
├── shared.tsx              — UI primitives (Pill, Toast, Sparkline, SegmentedControl, Toggle, Bar)
├── types.ts                — TypeScript interfaces (CheckIn, Report, Document)
├── report-config.tsx       — Report generation form (time range, detail level, options)
├── SummaryButton.tsx       — Dev test button for summary endpoint
└── TestEmbed.tsx           — Dev test button for embedding transcripts

lib/
├── user-context.tsx        — Auth context (UserProvider, useUser hook, localStorage persistence)
├── mock-data.ts            — Demo data (check-ins, lab results, conversation, report data)
└── generate-test-report.ts — jsPDF client-side test report generator
```

### Backend (`backend/src/`)

```
index.ts                    — Express app entry point (port 3001, CORS)
middleware/
├── auth.ts                 — Auth middleware (dev x-user-id shortcut + Supabase JWT)
└── errorHandler.ts         — Global error handler

routes/
├── profiles.ts             — User profiles + onboarding + email login
├── checkin.ts              — Check-ins + stats + chat conversation + summary context
├── symptoms.ts             — Symptom tracking + alerts + frequency
├── documents.ts            — Medical document upload + AI summarization
├── reports.ts              — Report generation + PDF download
└── voice.ts                — ElevenLabs signed URLs + outbound calls + polling + webhooks

services/
├── supabase.ts             — Supabase service role client (lazy singleton via Proxy)
├── mistral.ts              — Mistral AI: embedText, extractCheckinData, generateConversationContext, summarizeDocument, generateChatOpener, generateChatReply
├── elevenlabs.ts           — ElevenLabs: getSignedUrl, getConversationDetails, initiateOutboundCall
└── generateReport.ts       — jsPDF report builder (patient info, health metrics, AI summary)
```

### Database Schema (`backend/schema.sql`)

7 tables with RLS policies:

| Table             | Purpose                                                      | Embeddings |
| ----------------- | ------------------------------------------------------------ | ---------- |
| `profiles`        | User identity, health profile, onboarding state              | No         |
| `check_ins`       | Daily health logs (mood, energy, sleep, transcript, flagged) | 1024-dim   |
| `symptoms`        | Extracted symptoms with severity, criticality, alerts        | No         |
| `documents`       | Uploaded medical docs (lab/prescription/imaging/discharge)   | 1024-dim   |
| `document_chunks` | RAG chunks for document similarity search                    | 1024-dim   |
| `reports`         | Generated PDF reports (pending/generating/completed/failed)  | No         |
| `outbound_calls`  | Phone call logs with ElevenLabs conversation + Twilio SIDs   | No         |

**RPC functions:** `match_document_chunks()`, `match_check_ins()` for pgvector similarity search.

### Key Data Flows

**Voice Check-in (WebRTC):**

```
Frontend → GET /api/voice/signed-url → ElevenLabs WebRTC session
→ User speaks ↔ AI agent responds (real-time transcript)
→ Frontend POST /api/checkin { transcript }
→ Mistral extractCheckinData() → embedText() → Supabase check_ins
```

**Outbound Proactive Call:**

```
POST /api/voice/outbound-call { phone_number }
→ Fetch recent check-ins + symptoms → build health context
→ ElevenLabs initiateOutboundCall() → Twilio rings user
→ Background poll (15s interval, 15 min max)
→ On completion: syncCallFromElevenLabs() → parseTranscriptWithMistral()
→ Auto-create check_in + symptoms records
```

**Text Check-in:**

```
POST /api/checkin { transcript }
→ extractCheckinData() → structured output (mood, energy, sleep, symptoms, flags)
→ embedText(summary) → 1024-dim vector
→ Insert to check_ins with embedding
```

**Document Upload:**

```
POST /api/documents/upload (multipart: file + document_text)
→ Store PDF to Supabase Storage (medical-documents bucket)
→ summarizeDocument() → AI summary
→ embedText() → 1024-dim vector
→ Insert document record
```

**Report Generation:**

```
GET /api/reports/generate?timeRange=week&detailLevel=summary
→ Fetch profile, check-ins, symptoms, documents in range
→ generateReport() via jsPDF (patient info, metrics table, AI summary)
→ Upload PDF to Supabase Storage (reports bucket)
→ Return PDF binary inline
```

### API Endpoints

**Public (no auth):**

- `GET /ping` — health check
- `POST /api/profiles/login` — email-based login (find or create user)
- `POST /api/voice/webhook/call-complete` — ElevenLabs webhook
- `POST /api/voice/backfill` — admin: sync all incomplete calls

**Profiles (auth required):**

- `GET /api/profiles` — get own profile
- `PATCH /api/profiles` — update profile fields
- `POST /api/profiles/onboarding` — track onboarding progress

**Check-ins (auth required):**

- `GET /api/checkin` — list check-ins (pagination: limit, offset) with nested symptoms
- `GET /api/checkin/:id` — single check-in
- `POST /api/checkin` — create check-in from transcript (Mistral extraction + embedding)
- `GET /api/checkin/stats/summary` — dashboard stats (avg energy, sleep, flagged count, streak)
- `POST /api/checkin/summary` — generate 7-day conversation context for voice AI
- `POST /api/checkin/chat/start` — start AI conversation (generate opening)
- `POST /api/checkin/chat/message` — continue AI conversation (generate reply)

**Symptoms (auth required):**

- `GET /api/symptoms` — list symptoms (filters: alerts_only, dismissed)
- `GET /api/symptoms/alerts` — critical alerts only
- `PATCH /api/symptoms/:id/dismiss` — dismiss alert
- `GET /api/symptoms/frequency` — top symptoms by frequency

**Documents (auth required):**

- `GET /api/documents` — list user documents
- `GET /api/documents/:id` — single document
- `POST /api/documents/upload` — upload + AI summarize + embed

**Reports (auth required):**

- `GET /api/reports` — list reports
- `GET /api/reports/:id` — single report
- `POST /api/reports` — create report record (pending status)
- `GET /api/reports/generate` — generate + download PDF immediately

**Voice (auth required):**

- `GET /api/voice/signed-url` — get ElevenLabs WebRTC signed URL + dynamic variables
- `POST /api/voice/outbound-call` — initiate proactive health call
- `GET /api/voice/calls` — list outbound calls
- `PATCH /api/voice/calls/:id` — update call record
- `POST /api/voice/sync-calls` — fetch call status from ElevenLabs + sync

**CORS:** Backend allows `FRONTEND_URL` env var (defaults to `localhost:3000`).

## Mistral AI Integration (`backend/src/services/mistral.ts`)

All LLM calls go through the Mistral service. Key functions:

| Function                                   | Model                  | Purpose                                                                  |
| ------------------------------------------ | ---------------------- | ------------------------------------------------------------------------ |
| `embedText(text)`                          | `mistral-embed`        | Generate 1024-dim vector for similarity search                           |
| `extractCheckinData(transcript)`           | `mistral-large-latest` | Structured extraction: mood, energy, sleep, symptoms, flags (Zod schema) |
| `generateConversationContext(checkIns)`    | `mistral-large-latest` | Build 150-250 word system prompt from last 7 days for voice AI           |
| `summarizeDocument(text)`                  | `mistral-large-latest` | 3-5 sentence medical document summary                                    |
| `generateChatOpener(systemPrompt)`         | `mistral-large-latest` | AI's opening greeting for voice check-in                                 |
| `generateChatReply(systemPrompt, history)` | `mistral-large-latest` | Continue multi-turn conversation                                         |

**Voice route also uses:** `parseTranscriptWithMistral(transcript)` — extracts check-in data + symptoms array from outbound call transcripts with Mistral structured JSON output. Biases toward false positives for critical symptom flagging.

## Coding Conventions

- `async/await` throughout; no `.then()` chains
- React Server Components by default; `"use client"` only when needed
- All Supabase access through `backend/src/services/supabase.ts` (service role, bypasses RLS, manually filter by `req.userId`)
- All Mistral calls through `backend/src/services/mistral.ts`
- All ElevenLabs calls through `backend/src/services/elevenlabs.ts`
- Service clients use lazy singleton pattern via Proxy
- Tailwind utility classes only; no custom CSS beyond globals.css
- shadcn/ui primitives before custom components
- Critical symptom flagging biases toward false positives over false negatives
- Every AI health insight includes a medical disclaimer
- Mobile-first UI design (demo container max-w-[430px])
- Frontend uses `x-user-id` header on all authenticated requests (dev mode)

## Authentication & User Identity

### Login Flow

1. User enters email on demo page → `POST /api/profiles/login`
2. Backend finds or creates profile by email → returns `UserProfile`
3. Frontend stores profile in localStorage (`Tessera_user` key) via `UserProvider`
4. All subsequent API calls include `x-user-id` header (dev mode) or `Authorization: Bearer <token>` (production)

### UserProfile Shape

```typescript
{
  id, email, display_name, date_of_birth, blood_type,
  conditions: string[], allergies: string[],
  phone_number, timezone, emergency_contact: { name, phone, relationship },
  checkin_time, voice_pref, language
}
```

### Auth Middleware (`backend/src/middleware/auth.ts`)

- Dev mode: reads `x-user-id` or `uuid` header directly
- Production: validates Supabase JWT from `Authorization: Bearer <token>`
- All protected routes use `requireAuth` middleware
- Unprotected: `POST /api/profiles/login`, `POST /api/voice/webhook/*`, `POST /api/voice/backfill`

### User Filtering

- All backend queries MUST filter by `req.userId` — never return data from other users
- Frontend components use `useUser()` hook for user ID
- Pass `x-user-id` header on every authenticated request

## Environment Variables

### Backend (`backend/.env`)

```
MISTRAL_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID              # WebRTC voice check-in agent
ELEVENLABS_OUTBOUND_AGENT_ID     # Phone call agent (falls back to ELEVENLABS_AGENT_ID)
ELEVENLABS_PHONE_NUMBER_ID
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
WANDB_API_KEY                    # Not yet instrumented
PORT                             # Default 3001
FRONTEND_URL                     # CORS origin, default localhost:3000
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_BACKEND_URL          # Default http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Current Implementation Status

### Fully Implemented

- **Authentication:** Email-based login, UserProvider context, localStorage persistence, dev shortcut + JWT auth middleware
- **Profiles:** Create/read/update profiles + onboarding workflow with resumable state
- **Voice Check-ins (WebRTC):** ElevenLabs signed URL generation, real-time bidirectional transcript, dynamic variables (user_name, conditions, allergies), auto-save via agent tool callback
- **Outbound Proactive Calls:** ElevenLabs + Twilio integration, background polling (15s interval, 15 min max), auto-parse transcript into check-in + symptoms
- **Text Check-ins:** Transcript → Mistral structured extraction (mood, energy, sleep, food, notes, flags) → embedding → Supabase
- **Chat Conversation:** AI-powered multi-turn check-in conversation (generateChatOpener + generateChatReply)
- **Conversation Context:** Generate 7-day history context as system prompt for voice AI sessions
- **Symptom Tracking:** Auto-extracted from voice/text check-ins, critical flagging, alert dismissal, frequency analysis
- **Report Generation:** jsPDF reports with patient info, health metrics table, AI-generated executive summary, uploaded to Supabase Storage
- **Document Upload:** File upload to Supabase Storage + Mistral summarization + vector embedding
- **Frontend Demo UI:** 4-tab app (dashboard, log, trends, profile) behind login gate
- **Dashboard:** Time-based greeting, daily check-in CTA, alert cards, stat cards (streak, energy avg, adherence), energy sparkline
- **Log Tab:** 3 subtabs (log entries, files, reports) fetching from backend, expandable check-in entries, report generation form
- **Trends Tab:** Energy/sleep/mood sparklines, mood distribution bar chart, symptom frequency, medication adherence, AI insight card
- **Profile Tab:** Health profile display, document listing from backend, check-in preferences, call-me button, notification toggles
- **Input Overlay:** 4 modes — voice (WebRTC with status orb), calling (outbound with status progression), chat (text input), upload (drag-and-drop with progress)
- **Animations:** fadeUp, slideUp, waveBar, bounce, spin animations; Toast notification system
- **Call Sync Pipeline:** Outbound calls → poll ElevenLabs → parse transcript → auto-create check-in + symptoms
- **Voice Webhook:** Inbound call completion events from ElevenLabs
- **Backfill Endpoint:** Admin tool to sync all incomplete/unparsed calls

### Partially Implemented

- **Document Upload:** File storage + summarization works, but OCR/text extraction relies on frontend sending `document_text` manually (no server-side PDF parsing)
- **Document Chunking:** `document_chunks` table + `match_document_chunks()` RPC exist but chunking logic is not implemented in upload route
- **Document Findings:** `findings` JSONB field exists but is never populated (no lab value/imaging result extraction)
- **Report Generation (Async):** Immediate PDF download works; `POST /api/reports` creates pending record but no async pipeline triggers generation
- **Upload Mode UI:** Drag-and-drop UI exists but shows mock lab results; real extraction not wired
- **Chat Mode UI:** Text input works but uses hardcoded mock responses (not connected to `/api/checkin/chat/*` endpoints)

### Not Yet Implemented

- **OCR Pipeline:** Server-side PDF text extraction (currently frontend responsibility)
- **Document Chunking Pipeline:** Split large docs into chunks with per-chunk embeddings
- **Report RAG Retrieval:** Vector similarity search to enrich reports with relevant past documents/check-ins
- **W&B Weave Tracing:** Environment configured but no LLM call instrumentation
- **Frontend Trends Backend Integration:** Trends tab partially uses mock data for some visualizations
- **Async Job Queue:** No background job processing for report generation or document analysis

## Deployment

See `DEPLOYMENT.md` for full production deployment guide.

- **Frontend:** Vercel (free hobby tier)
- **Backend:** Railway ($0–5 hobby tier)
- **Database:** Supabase (free tier)
- **ElevenLabs:** ~$22/month (Creator plan)
- **Twilio:** ~$2–7 (pay-as-you-go)

## Mistral Vibe CLI

This project supports Mistral Vibe CLI with 4 specialized agent profiles defined in `.vibe/agents/`:

| Agent              | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| Report Generation  | Synthesize health timeline into structured doctor reports                  |
| Symptom Extraction | Parse voice transcripts into structured health data (Pydantic models)      |
| Document Analysis  | Process medical docs: chunk, embed, OCR (Pixtral), contextual summaries    |
| Triage & Flagging  | Evaluate symptom urgency, flag critical conditions, trigger outbound calls |

See `AGENTS.md` for workspace rules and `.vibe/` for agent profiles and config. All agents use `mistral-large-latest` in safe mode.
