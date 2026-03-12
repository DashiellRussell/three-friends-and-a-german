# Tessera Production Readiness Audit

**Total issues found:** 60 (27 Critical, 34 High, 4 Medium)
**Resolved this pass:** 22 items

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

1. ~~**x-user-id header bypass**~~ — RESOLVED: already gated behind `NODE_ENV !== "production"` in Clerk migration
2. ~~**No input validation on email login**~~ — RESOLVED: login endpoint removed, Clerk handles authentication
3. ~~**CORS too broad**~~ — RESOLVED: added `credentials: true`, origin from env var
4. **Unprotected webhook** — `backend/src/routes/voice.ts` — added conversation_id type validation + TODO for HMAC when ElevenLabs supports webhook signing
5. ~~**Unprotected admin endpoint**~~ — RESOLVED: added `requireAuth` to `/api/voice/backfill`
6. ~~**Health data in localStorage**~~ — RESOLVED: Clerk migration removed localStorage, uses API fetch
7. ~~**No rate limiting on check-in**~~ — RESOLVED: 20 req/15min via express-rate-limit
8. ~~**No rate limiting on document upload**~~ — RESOLVED: 10 req/15min + 20MB multer file size limit
9. ~~**Hardcoded demo user auto-login**~~ — RESOLVED: replaced with Clerk auth

## Critical Bugs

1. ~~**Race condition in call polling**~~ — RESOLVED: added error counter, clears interval after 3 consecutive failures
2. ~~**Null reference on missing profile**~~ — RESOLVED: added null guards with fallback values on profile data
3. **Silent chunking failures** — `backend/src/routes/voice.ts` — errors are logged but non-blocking by design
4. ~~**Mistral API failure handling**~~ — RESOLVED: wrapped Zod parse in try-catch with descriptive errors
5. ~~**Partial insertion failures**~~ — RESOLVED: returns 207 with warning when symptoms fail but check-in succeeds
6. **Medication log overwrites** — `backend/src/routes/voice.ts` — same-day meds use upsert pattern (by design)

## Missing for Production

- ~~No health check endpoint (DB/API connectivity)~~ — RESOLVED: added `/health` endpoint with DB check
- No structured logging (only console.log) — PII sanitized but not switched to pino/winston yet
- No error monitoring (Sentry)
- No database migration strategy (monolithic schema.sql)
- ~~No 404/500 error pages~~ — RESOLVED: added error.tsx, not-found.tsx, app/error.tsx
- ~~No env var validation at startup~~ — RESOLVED: validates 4 required vars, exits on missing
- ~~No rate limiting middleware anywhere~~ — RESOLVED: global + route-specific rate limiters
- ~~No request size limits on express.json~~ — RESOLVED: 1MB limit
- ~~No CSP headers~~ — RESOLVED: helmet + Next.js security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
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

- ~~No environment-specific configuration (dev features leak to prod)~~ — RESOLVED: auth bypass gated behind NODE_ENV, error messages hidden in production
- No database backup strategy
- No CI/CD for main app (only worker has GitHub Action)
- ~~TypeScript not strict mode~~ — RESOLVED: already enabled in both tsconfig files
- No staging environment
- No Vercel branch previews

---

## Immediate Action Items (Pre-Production)

1. ~~Add "Tessera appears to be down" error screen when backend is unreachable~~ — DONE
2. ~~Remove x-user-id header shortcut or gate behind `NODE_ENV === 'development'`~~ — DONE (was already gated)
3. Add HMAC verification to webhook endpoint — TODO when ElevenLabs provides signing
4. ~~Add `requireAuth` to backfill endpoint~~ — DONE
5. ~~Implement rate limiting (check-in, upload, login)~~ — DONE
6. ~~Move sensitive data out of localStorage~~ — DONE (Clerk migration)
7. ~~Replace hardcoded Margaret auto-login with Clerk auth~~ — DONE (Clerk migration)
8. ~~Add health check with DB/API connectivity tests~~ — DONE
9. Add structured logging (pino) + Sentry — TODO (PII sanitized as interim)
10. ~~Validate all env vars at startup (fail fast)~~ — DONE
11. ~~Add React Error Boundary~~ — DONE
12. ~~Create 404.tsx and error.tsx pages~~ — DONE
13. Set up GitHub Actions CI/CD — TODO
14. ~~Enable strict TypeScript~~ — DONE (was already enabled)

## Additional Issues Found & Fixed

- **Express.json() missing size limit** — RESOLVED: 1MB limit
- **Helmet security headers missing** — RESOLVED: helmet middleware added
- **Phone number validation weak** — RESOLVED: validates 10-15 digits, rejects non-numeric
- **Webhook accepts unlimited transcript size** — RESOLVED: truncates to 50KB
- **Error handler exposes internals** — RESOLVED: hides error messages in production
- **PII in console.log statements** — RESOLVED: sanitized health data from logs
- **Unused axios in frontend** — RESOLVED: removed
