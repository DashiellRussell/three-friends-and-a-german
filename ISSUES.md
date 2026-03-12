# Tessera Production Readiness Audit

**Total issues found:** 60 (27 Critical, 34 High, 4 Medium)

| Category | Count | Critical | High | Medium |
|---|---|---|---|---|
| Security Flaws | 11 | 6 | 5 | - |
| Bugs | 11 | 6 | 5 | - |
| Missing Features | 14 | 6 | 8 | - |
| Performance | 6 | - | 6 | - |
| Infrastructure | 8 | 3 | 5 | - |
| Code Quality | 6 | - | 6 | - |
| Accessibility | 4 | - | - | 4 |

---

## Critical Security Flaws

1. **x-user-id header bypass** — `backend/src/middleware/auth.ts:23-27` — accepts ANY user ID without JWT validation
2. **No input validation on email login** — `backend/src/routes/profiles.ts:10-16` — no format/length checks
3. **CORS too broad** — `backend/src/index.ts:23` — defaults to localhost, no HTTPS enforcement
4. **Unprotected webhook** — `backend/src/routes/voice.ts:308-357` — `/api/voice/webhook/call-complete` has NO auth
5. **Unprotected admin endpoint** — `backend/src/routes/voice.ts:359-476` — `/api/voice/backfill` has NO auth
6. **Health data in localStorage** — `frontend/src/lib/user-context.tsx:62-140` — conditions, allergies, DOB in plaintext
7. **No rate limiting on check-in** — `backend/src/routes/checkin.ts:247-361` — can exhaust Mistral API quota
8. **No rate limiting on document upload** — `backend/src/routes/documents.ts:86-140` — 20MB files, unlimited requests
9. **Hardcoded demo user auto-login** — `frontend/src/lib/user-context.tsx:57-110` — auto-logs in as margaret@tessera.health

## Critical Bugs

1. **Race condition in call polling** — `backend/src/routes/voice.ts:275-306` — setInterval runs indefinitely, memory leak
2. **Null reference on missing profile** — `backend/src/routes/voice.ts:545-562` — no fallback for empty check-ins
3. **Silent chunking failures** — `backend/src/routes/voice.ts:266-268` — swallows errors, data loss not surfaced
4. **Mistral API failure handling** — `backend/src/services/mistral.ts:18-28` — JSON.parse can fail on malformed responses
5. **Partial insertion failures** — `backend/src/routes/checkin.ts:284-301` — symptoms fail silently, returns 201 anyway
6. **Medication log overwrites** — `backend/src/routes/voice.ts:212-260` — same-day meds overwritten instead of appended

## Missing for Production

- No health check endpoint (DB/API connectivity)
- No structured logging (only console.log)
- No error monitoring (Sentry)
- No database migration strategy (monolithic schema.sql)
- No 404/500 error pages
- No env var validation at startup
- No rate limiting middleware anywhere
- No request size limits on express.json
- No CSP headers
- No sitemap/robots.txt
- No social meta tags (og:image, twitter:card)
- No CI/CD pipeline for main app

## Performance Issues

- N+1 query on check-in list (fetches all nested relations)
- Dashboard stats calculated in JS instead of SQL aggregates
- Embedding generation not cached (duplicate API calls)
- Document embedding without chunking (poor RAG precision)
- Voice context regenerated on every session start
- Report generation is synchronous (10+ seconds blocking)

## Infrastructure Gaps

- No environment-specific configuration (dev features leak to prod)
- No database backup strategy
- No CI/CD for main app (only worker has GitHub Action)
- TypeScript not strict mode
- No staging environment
- No Vercel branch previews

---

## Immediate Action Items (Pre-Production)

1. Add "Tessera appears to be down" error screen when backend is unreachable
2. Remove x-user-id header shortcut or gate behind `NODE_ENV === 'development'`
3. Add HMAC verification to webhook endpoint
4. Add `requireAuth` to backfill endpoint
5. Implement rate limiting (check-in, upload, login)
6. Move sensitive data out of localStorage
7. Replace hardcoded Margaret auto-login with Clerk auth
8. Add health check with DB/API connectivity tests
9. Add structured logging (pino) + Sentry
10. Validate all env vars at startup (fail fast)
11. Add React Error Boundary
12. Create 404.tsx and error.tsx pages
13. Set up GitHub Actions CI/CD
14. Enable strict TypeScript
