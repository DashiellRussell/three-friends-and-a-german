# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Health Companion — hackathon project providing voice-based daily health check-ins, medical document analysis, critical symptom flagging, doctor report generation, and proactive outbound health calls. Built for the Mistral AI Worldwide Hackathon (Sydney).

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
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **Components:** shadcn/ui
- **HTTP client:** axios
- **PDF generation:** jsPDF (client-side test report generation)
- **Package manager:** pnpm
- **Path alias:** `@/*` maps to `./src/*`

### Backend
- **Framework:** Express 4.21.2 with TypeScript
- **AI:** `@mistralai/mistralai` 1.5.0 for LLM and embeddings
- **Database:** `@supabase/supabase-js` 2.49.4 (service role client, bypasses RLS)
- **Voice/Phone:** ElevenLabs API (signed URLs, outbound calls via Twilio)
- **File uploads:** multer (20MB limit, memory storage)
- **Package manager:** npm
- **Dev server:** ts-node-dev (auto-restart on changes)

### Infrastructure
- **Database:** Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)
- **Voice/Phone:** ElevenLabs (conversational AI, TTS) + Twilio (telephony)
- **Observability:** W&B Weave for tracing all LLM calls (not yet implemented)

## Architecture

### Monorepo Structure
- `frontend/` — Next.js app (pnpm)
- `backend/` — Express API server (npm)
- Root has shared config: CLAUDE.md, AGENTS.md, .vibe/, .gitignore

### Frontend (`frontend/src/`)
- `app/page.tsx` — Marketing landing page (waitlist signup, features, hero)
- `app/demo/page.tsx` — Demo app shell with tab navigation
- `components/app/` — App UI components:
  - `dashboard.tsx` — Home tab (greeting, alerts, stats, energy sparkline)
  - `log.tsx` — Log tab (check-in entries, report generation form)
  - `trends.tsx` — Trends tab (sparklines, mood distribution, symptom frequency)
  - `profile.tsx` — Profile tab (user info, health profile, medications)
  - `input-overlay.tsx` — Central input modal (voice, chat, document upload modes)
  - `shared.tsx` — Shared UI primitives (Pill, Sparkline, SegmentedControl, etc.)
- `lib/mock-data.ts` — Demo data (check-ins, lab results, conversations)
- `lib/generate-test-report.ts` — Client-side PDF generation via jsPDF

### Backend (`backend/src/`)
- `index.ts` — Express app entry point (port 3001, CORS for localhost:3000)
- `routes/` — API route handlers:
  - `profiles.ts` — User profiles + onboarding
  - `checkins.ts` — Health check-ins + stats
  - `symptoms.ts` — Symptom tracking + alerts
  - `documents.ts` — Medical document uploads
  - `reports.ts` — Health report generation
  - `voice.ts` — ElevenLabs signed URLs + outbound calls
- `services/` — external service clients:
  - `supabase.ts` — Supabase service role client
  - `mistral.ts` — Mistral AI client
  - `elevenlabs.ts` — signed URL generation + outbound call initiation
- `middleware/` — Express middleware:
  - `auth.ts` — Auth middleware (dev shortcut via x-user-id header + Supabase JWT)
  - `errorHandler.ts` — Global error handler

### Database Schema (`backend/schema.sql`)
7 tables with RLS: `profiles`, `check_ins`, `symptoms`, `documents`, `document_chunks`, `reports`, `outbound_calls`
- pgvector embeddings (1024-dim) on `check_ins`, `documents`, `document_chunks`
- RPC functions: `match_document_chunks()`, `match_check_ins()` for vector similarity search

### Data Flow
```
Voice (ElevenLabs WebRTC) -> transcript -> Mistral extraction -> Supabase
Document upload (multer) -> Mistral analysis -> pgvector embeddings -> Supabase
Health timeline -> Mistral report generation -> PDF
Triage flagging -> ElevenLabs + Twilio outbound call
```

### API Endpoints
- `GET /ping` — health check
- **Profiles:** `GET/PATCH /api/profiles`, `POST /api/profiles/onboarding`
- **Check-ins:** `GET /api/checkins`, `GET /api/checkins/:id`, `POST /api/checkins`, `GET /api/checkins/stats/summary`
- **Symptoms:** `GET /api/symptoms`, `GET /api/symptoms/alerts`, `PATCH /api/symptoms/:id/dismiss`, `GET /api/symptoms/frequency`
- **Documents:** `GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents/upload`
- **Reports:** `GET /api/reports`, `GET /api/reports/:id`, `POST /api/reports`
- **Voice:** `GET /api/voice/signed-url`, `POST /api/voice/outbound-call`, `GET /api/voice/calls`, `PATCH /api/voice/calls/:id`, `POST /api/voice/sync-calls`, `POST /api/voice/webhook/call-complete`, `POST /api/voice/backfill`
- **Profiles (public):** `POST /api/profiles/login`
- Backend CORS allows `FRONTEND_URL` env var (defaults to localhost:3000)

## Coding Conventions

- `async/await` throughout; no `.then()` chains
- React Server Components by default; `"use client"` only when needed
- All Supabase access through `backend/src/services/supabase.ts`
- All Mistral calls through `backend/src/services/mistral.ts`
- All ElevenLabs calls through `backend/src/services/elevenlabs.ts`
- Tailwind utility classes only; no custom CSS beyond globals.css
- shadcn/ui primitives before custom components
- Critical symptom flagging biases toward false positives over false negatives
- Every AI health insight includes a medical disclaimer

## Environment Variables

### Backend (`backend/.env`)
`MISTRAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_OUTBOUND_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
`WANDB_API_KEY`, `PORT`, `FRONTEND_URL`

### Frontend (`frontend/.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

## Authentication & User Identity

### Login Flow
- Email-based login via `POST /api/profiles/login` (unauthenticated endpoint)
- Backend finds or creates user profile by email
- Frontend stores user profile in localStorage (`kira_user` key) via `UserProvider` context
- All subsequent API calls include `x-user-id` header (dev mode) or Supabase JWT (production)
- `useUser()` hook provides `user`, `loading`, `login()`, `logout()`, `refreshProfile()`

### Auth Middleware (`backend/src/middleware/auth.ts`)
- Dev mode: reads `x-user-id` header directly
- Production: validates Supabase JWT from `Authorization: Bearer <token>` header
- All protected routes use `requireAuth` middleware
- Unprotected: `POST /api/profiles/login`, `POST /api/voice/webhook/*`, `POST /api/voice/backfill`

### User Filtering
- All backend queries MUST filter by `req.userId` — never return data from other users
- Frontend components should use `useUser()` to get user ID for API calls
- Pass `x-user-id` header on every authenticated request

## Current Implementation Status

### Completed
- Full backend route scaffolding (profiles, checkins, symptoms, documents, reports, voice)
- Auth middleware with dev shortcut + Supabase JWT validation
- Database schema with 7 tables, RLS policies, and vector search RPCs
- Frontend demo UI with 4 tabs (dashboard, log, trends, profile) behind login gate
- Email-based login system with `UserProvider` context (`frontend/src/lib/user-context.tsx`)
- ElevenLabs WebRTC voice check-in integration (input-overlay.tsx, real signed URLs)
- Outbound proactive health calls via ElevenLabs + Twilio
- Mistral transcript parsing for structured health data extraction
- Auto-sync pipeline: outbound calls → poll ElevenLabs → parse transcript → create check-in + symptoms
- Voice webhook for inbound call completion events
- Client-side test PDF generation via jsPDF

### TODO / Not Yet Implemented
- Document analysis pipeline (OCR, extraction, summarization, embeddings)
- Report generation pipeline (RAG retrieval, Mistral generation, PDF rendering)
- Frontend-backend API integration for log & trends tabs (currently mock data)
- W&B Weave tracing for LLM calls

## Mistral Vibe CLI

This project also supports Mistral Vibe CLI. See `AGENTS.md` for workspace rules and `.vibe/` for agent profiles and config.
