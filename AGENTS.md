# AGENTS.md

## Project: AI Health Companion

Voice-based health check-ins, medical document analysis, critical symptom flagging,
doctor report generation, and proactive outbound health calls via phone.

Monorepo: `frontend/` (Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui, pnpm)
and `backend/` (Express + TypeScript + Mistral + Supabase + ElevenLabs, npm).

## TypeScript Rules — Frontend

scope: frontend/src/**/*.{ts,tsx}

- React Server Components by default. Only add `"use client"` when component needs browser APIs, hooks, or event handlers.
- No `any` type. Use `unknown` and narrow with type guards.
- Prefer `async/await` over `.then()` chains.
- One component per file, PascalCase filename matching export name.
- Use `@/*` path alias for all imports from `src/`.
- Tailwind utility classes only. No custom CSS files beyond globals.css.
- Use shadcn/ui primitives before building custom components.
- ElevenLabs voice via `@elevenlabs/react` useConversation hook with WebRTC connection type.

## TypeScript Rules — Backend

scope: backend/src/**/*.ts

- Express with TypeScript. Entry point: `backend/src/index.ts` (port 3001).
- All external service access through dedicated files in `backend/src/services/`:
  - `supabase.ts` — Supabase service role client (bypasses RLS)
  - `mistral.ts` — Mistral AI client
  - `elevenlabs.ts` — signed URL generation + outbound call initiation
- Never call external APIs directly from route handlers; always go through services.
- Route files in `backend/src/routes/` export an Express Router.
- Global error handler in `backend/src/middleware/errorHandler.ts` — throw errors, don't catch-and-respond in routes.
- Use native `fetch` for HTTP calls (pattern established in elevenlabs.ts).
- Type all request/response bodies. No untyped `req.body` access.

## Architecture Constraints

- Frontend talks to backend via REST API at `NEXT_PUBLIC_BACKEND_URL` (default localhost:3001).
- Backend CORS configured via `FRONTEND_URL` env var.
- All Supabase operations go through `backend/src/services/supabase.ts`.
- ElevenLabs signed URL flow: frontend -> backend -> ElevenLabs API -> signed URL -> frontend connects via WebRTC.
- Outbound calls: backend calls `elevenlabs.ts` -> ElevenLabs + Twilio initiates call.
- RAG pipeline: Mistral Embed for embeddings, pgvector for similarity search, Mistral Large for synthesis.
- Critical symptom flagging biases toward false positives over false negatives.
- Every AI-generated health insight must include a medical disclaimer.

## Database

Supabase with RLS scoped to authenticated user. Tables: `profiles`, `health_entries`, `documents`, `document_chunks` (pgvector 1024-dim), `outbound_calls`, `reports`.

## Environment Variables

Backend: `MISTRAL_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `WANDB_API_KEY`, `PORT`, `FRONTEND_URL`.

Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`.

Never hardcode secrets. Always read from environment.
