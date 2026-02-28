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
- **Voice:** `@elevenlabs/react` (useConversation hook, WebRTC)
- **Package manager:** pnpm
- **Path alias:** `@/*` maps to `./src/*`

### Backend
- **Framework:** Express.js with TypeScript
- **AI:** `@mistralai/mistralai` for LLM and embeddings
- **Database:** `@supabase/supabase-js` (service role client, bypasses RLS)
- **Voice/Phone:** ElevenLabs API (signed URLs, outbound calls via Twilio)
- **File uploads:** multer
- **Package manager:** npm
- **Dev server:** ts-node-dev (auto-restart on changes)

### Infrastructure
- **Database:** Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)
- **Voice/Phone:** ElevenLabs (conversational AI, TTS) + Twilio (telephony)
- **Observability:** W&B Weave for tracing all LLM calls

## Architecture

### Monorepo Structure
- `frontend/` — Next.js app (pnpm)
- `backend/` — Express API server (npm)
- Root has shared config: CLAUDE.md, AGENTS.md, .vibe/, .gitignore

### Frontend (`frontend/src/`)
- `app/` — Next.js App Router (layout, pages, API routes)
- `components/` — React components (shadcn/ui based)
- `lib/` — shared utilities, Supabase client, API helpers
- `types/` — TypeScript type definitions

### Backend (`backend/src/`)
- `index.ts` — Express app entry point (port 3001, CORS for localhost:3000)
- `routes/` — API route handlers (e.g. `checkin.ts`)
- `services/` — external service clients:
  - `supabase.ts` — Supabase service role client
  - `mistral.ts` — Mistral AI client
  - `elevenlabs.ts` — signed URL generation + outbound call initiation
- `middleware/` — Express middleware (error handler)

### Data Flow
```
Voice (ElevenLabs WebRTC) -> transcript -> Mistral extraction -> Supabase
Document upload (multer) -> Mistral analysis -> pgvector embeddings -> Supabase
Health timeline -> Mistral report generation -> PDF
Triage flagging -> ElevenLabs + Twilio outbound call
```

### API Endpoints
- `GET /ping` — health check
- `GET /api/checkin` — check-in endpoint (WIP)
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
`MISTRAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
`WANDB_API_KEY`, `PORT`, `FRONTEND_URL`

### Frontend (`frontend/.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`

## Mistral Vibe CLI

This project also supports Mistral Vibe CLI. See `AGENTS.md` for workspace rules and `.vibe/` for agent profiles and config.
