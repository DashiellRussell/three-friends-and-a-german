# Tessera — Clerk Auth Migration (TODO)

**Status:** Deferred. Implement when ready to add real authentication.

## Why Clerk?

Supabase Auth was attempted but reverted — it hard-limits email sending to 2/hour without custom SMTP. Clerk handles email delivery, password auth, session management, and JWT issuance out of the box with no SMTP setup.

## Pre-requisite: Clerk Dashboard Setup (manual, no code)

1. Create a Clerk app at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Enable "Email + Password" as the sign-in method
3. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
4. Set redirect URLs: Sign-in → `/app`, Sign-up → `/onboarding`

---

## Phase 1: Install Dependencies

**1a. Frontend** — `pnpm add @clerk/nextjs` in `frontend/`

**1b. Backend** — `npm install @clerk/express` in `backend/`

**1c. Environment variables**

`frontend/.env.local` (add):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

`backend/.env` (add):
```
CLERK_SECRET_KEY=sk_...
```

---

## Phase 2: Database Migration

Run in Supabase SQL editor:

```sql
ALTER TABLE profiles ADD COLUMN clerk_user_id text UNIQUE;
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
```

The existing `auth_id` column (unused) can be left as-is or dropped later.

---

## Phase 3: Backend Changes (2 files)

**3a. `backend/src/index.ts`** — Add `clerkMiddleware()` before routes

**3b. `backend/src/middleware/auth.ts`** — Rewrite auth logic
- Dev shortcut (`x-user-id`) preserved for `NODE_ENV !== "production"`
- Production: `getAuth(req)` from `@clerk/express` extracts Clerk user ID from Bearer token
- Lookup `profiles.clerk_user_id` → internal UUID
- Lazy profile creation on first login (fetch email from Clerk, insert profile row)

**3c. `backend/src/routes/profiles.ts`** — Delete `POST /login` endpoint

---

## Phase 4: Frontend Changes

**4a. `frontend/src/app/providers.tsx`** — Wrap with `<ClerkProvider>`

**4b. `frontend/src/middleware.ts`** — Create Next.js middleware (NEW FILE)
- Public routes: `/`, `/login(.*)`, `/api/waitlist(.*)`
- Everything else requires auth

**4c. `frontend/src/lib/user-context.tsx`** — Rewrite to use Clerk
- Import `useAuth` + `useUser as useClerkUser` from `@clerk/nextjs`
- Remove `login()` — Clerk handles this
- `logout()` calls Clerk `signOut()`
- Fetch health profile via `GET /api/profiles` with Bearer token
- Keep exporting `useUser()` with same shape — no downstream changes needed

**4d. `frontend/src/lib/api.ts`** — Token getter pattern
- Export `setTokenGetter(fn)` accepting `() => Promise<string | null>`
- `apiFetch()` calls `await getToken()` per request for fresh Clerk JWT
- `UserProvider` calls `setTokenGetter(getToken)` on mount

**4e. `frontend/src/app/login/page.tsx`** — Replace with Clerk `<SignIn>` component

**4f. `frontend/src/app/app/page.tsx`** — Remove auth `useEffect` guard (middleware handles it)

**4g. `frontend/src/app/checkin/text/page.tsx` + `checkin/upload/page.tsx`** — Replace `axios` + `x-user-id` with `apiFetch()`

---

## Phase 5: Cleanup

- Delete `frontend/src/app/auth/callback/route.ts` (dead Supabase callback)
- Delete `frontend/src/lib/supabase.ts` (unused browser client)
- Remove `@supabase/supabase-js` from `frontend/package.json`

---

## File Change Summary

| File | Action |
|------|--------|
| `backend/src/index.ts` | Add `clerkMiddleware()` |
| `backend/src/middleware/auth.ts` | Rewrite → Clerk `getAuth()` |
| `backend/src/routes/profiles.ts` | Delete `POST /login` |
| `frontend/src/middleware.ts` | **Create** |
| `frontend/src/app/providers.tsx` | Wrap `<ClerkProvider>` |
| `frontend/src/lib/user-context.tsx` | Rewrite → Clerk session |
| `frontend/src/lib/api.ts` | Rewrite → Bearer token |
| `frontend/src/app/login/page.tsx` | Rewrite → `<SignIn>` |
| `frontend/src/app/app/page.tsx` | Remove auth guard |
| `frontend/src/app/checkin/text/page.tsx` | axios → apiFetch |
| `frontend/src/app/checkin/upload/page.tsx` | axios → apiFetch |
| `frontend/src/app/auth/callback/route.ts` | **Delete** |
| `frontend/src/lib/supabase.ts` | **Delete** |
