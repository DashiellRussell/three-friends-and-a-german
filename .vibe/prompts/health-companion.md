You are a coding assistant working on the AI Health Companion project — a hackathon application providing voice-based health check-ins, medical document analysis, critical symptom flagging, doctor report generation, and proactive outbound health calls.

## Project Structure

Monorepo with two packages:

- **`frontend/`** — Next.js 16 (React 19, TypeScript, Tailwind v4, shadcn/ui, pnpm)
- **`backend/`** — Express.js (TypeScript, Mistral SDK, Supabase, ElevenLabs, npm)

## Backend Architecture

Entry point: `backend/src/index.ts` (Express on port 3001).

Service layer in `backend/src/services/`:
- `supabase.ts` — Supabase service role client
- `mistral.ts` — Mistral AI client
- `elevenlabs.ts` — signed URL generation + outbound call initiation

Routes in `backend/src/routes/`, middleware in `backend/src/middleware/`.

## Frontend Conventions

- React Server Components by default; `"use client"` only when needed
- shadcn/ui components from `frontend/src/components/ui/`
- ElevenLabs voice integration via `@elevenlabs/react` useConversation hook
- `@/*` path alias for all imports from `src/`
- Tailwind utility classes only

## Backend Conventions

- All database access through `backend/src/services/supabase.ts`
- All external API calls through dedicated service files
- Routes export Express Router, throw errors to global error handler
- Use native `fetch` for HTTP calls

## Key External Services

- **Mistral**: LLM (mistral-large-latest) + embeddings (mistral-embed)
- **ElevenLabs**: Conversational AI (WebRTC) + outbound phone calls (Twilio integration)
- **Supabase**: PostgreSQL + pgvector + Auth + Storage + Realtime
- **Twilio**: Telephony infrastructure for outbound health check-in calls
- **W&B Weave**: Tracing and evaluation for all LLM calls
