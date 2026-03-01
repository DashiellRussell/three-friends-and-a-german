# Tessera Production Readiness Plan

## Context

The Mistral AI Worldwide Hackathon (Sydney) is over. The team has strong traction (20K+ views/likes on content) and wants to push Tessera live within days for public use, demo video, and potential sub-category prizes. The app is functionally complete but needs: persistent waitlist, feedback collection, user onboarding, automated scheduled calls (cron), chat mode wiring, and production hardening.

---

## Workstream 1: Quick Wins (Tonight)

### 1A. Persist Waitlist Emails

**Problem:** Landing page waitlist form (`frontend/src/app/page.tsx:47-115`) collects email but only sets `submitted=true` in React state — never hits backend.

**Database:**
```sql
-- Run in Supabase SQL Editor
CREATE TABLE waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  source     text DEFAULT 'landing_page',
  created_at timestamptz DEFAULT now()
);
-- No RLS needed (public insert, admin read)
```

**Backend — `backend/src/routes/waitlist.ts` (new file):**
- `POST /api/waitlist` — no auth required, takes `{ email }`, inserts to `waitlist` table, returns 201 (or 200 if duplicate)
- Register in `backend/src/index.ts` alongside other routes

**Frontend — `frontend/src/app/page.tsx`:**
- In `WaitlistSection.handleSubmit`, POST to `${BACKEND_URL}/api/waitlist` with the email before setting `submitted=true`
- Add error handling (show toast on failure, still show success if duplicate)

**Files to modify:**
- `backend/src/routes/waitlist.ts` (new)
- `backend/src/index.ts` (register route)
- `frontend/src/app/page.tsx` (wire form to API)

---

### 1B. Wire Chat Mode to Backend

**Problem:** Chat mode in `frontend/src/components/app/input-overlay.tsx:329-336` uses a hardcoded mock reply. The backend endpoints `/api/checkin/chat/start` and `/api/checkin/chat/message` already exist and work.

**Frontend — `frontend/src/components/app/input-overlay.tsx`:**
- Add state for `systemPrompt` (fetched once when chat mode opens)
- Add state for `chatHistory` (array of `{role, content}` for backend)
- On chat open: call `POST /api/checkin/summary` to get conversation context, then `POST /api/checkin/chat/start` with that context as systemPrompt → display AI opener
- On user message: call `POST /api/checkin/chat/message` with `{ systemPrompt, history }` → display AI reply
- Add a "Save check-in" button that POSTs the full conversation as transcript to `POST /api/checkin`
- Replace the `setTimeout` mock with actual API calls
- Add loading states (typing indicator while AI responds)

**Files to modify:**
- `frontend/src/components/app/input-overlay.tsx` (replace mock chat with real API calls)

---

### 1C. Add Feedback Tab + Nav Restructure

**Problem:** No way for users to give feedback. Also restructure bottom nav to prioritize feedback.

**Nav restructure:**
- **Old bottom nav:** Home | Log | [+] | Trends | Profile
- **New bottom nav:** Home | Log | [+] | **Feedback** | **Info**
- **Info page** = combined Profile + Trends (Trends section accessible via the Info/Profile page)
- **Top bar** gets a small profile avatar/initial in the top-right corner (tapping goes to Info tab)

**Database:**
```sql
CREATE TABLE feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type       text DEFAULT 'general' CHECK (type IN ('bug', 'feature', 'general', 'praise')),
  message    text NOT NULL,
  page       text,
  created_at timestamptz DEFAULT now()
);
```

**Backend — `backend/src/routes/feedback.ts` (new file):**
- `POST /api/feedback` — auth required, takes `{ type, message, page }`
- `GET /api/feedback` — auth required, returns user's own feedback
- Register in `backend/src/index.ts`

**Frontend — `frontend/src/components/app/feedback-tab.tsx` (new file):**
- Full-page feedback tab (replaces Trends in bottom nav)
- Quick emoji/star rating at top
- Type selector chips (bug / feature / general / praise)
- Text area for detailed feedback
- Submit button → POST to backend
- Below the form: list of user's previous feedback submissions (read-only)

**Frontend — `frontend/src/components/app/profile.tsx` (modify):**
- Rename/restructure to be an "Info" page
- Add a "Health Trends" section/link that expands or navigates to the Trends component inline
- Keep all existing profile sections (health info, medications, preferences, etc.)

**Frontend — `frontend/src/app/demo/page.tsx` (modify):**
- Update `Tab` type from `"dashboard" | "log" | "trends" | "profile"` to `"dashboard" | "log" | "feedback" | "info"`
- Update `NAV_ITEMS` array: replace Trends with Feedback icon, rename Profile to Info
- Add profile avatar/initial to top bar (right side) that navigates to Info tab
- Render `<FeedbackTab />` for feedback tab, keep `<Profile />` for info tab (with Trends embedded)

**Files to modify/create:**
- `backend/src/routes/feedback.ts` (new)
- `backend/src/index.ts` (register route)
- `frontend/src/components/app/feedback-tab.tsx` (new — full feedback page)
- `frontend/src/components/app/profile.tsx` (restructure as Info page with embedded Trends)
- `frontend/src/app/demo/page.tsx` (nav restructure + profile avatar in top bar)

---

### 1D. Landing Page Cleanup

**Problem:** Dev test components (`TestEmbedButton`, `SummaryButton`, stray `<div>Hi</div>`) are on the production landing page.

**Frontend — `frontend/src/app/page.tsx`:**
- Remove `TestEmbedButton`, `SummaryButton` imports and usage (lines 17-19, 296-297)
- Remove `<div>Hi</div>` (line 295)

**Files to modify:**
- `frontend/src/app/page.tsx`

---

## Workstream 2: User Onboarding (1-2 days)

### 2A. Onboarding Wizard Component

**Problem:** New users log in and see the dashboard immediately with no context. Backend already supports onboarding via `POST /api/profiles/onboarding` with step tracking and data persistence.

**Frontend — `frontend/src/components/app/onboarding.tsx` (new file):**

Multi-step wizard with 5 steps (matching backend `onboarding_step` 0-4):

1. **Welcome (step 0):** "Welcome to Tessera" — brief explanation, continue button
2. **About You (step 1):** display_name, date_of_birth (optional), gender (optional)
3. **Health Profile (step 2):** conditions (tag input), allergies (tag input), blood_type (select), medications (add/remove list with name + dosage + frequency)
4. **Preferences (step 3):** phone_number (for proactive calls), checkin_time (time picker), voice_pref, notification preferences, timezone (auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`)
5. **All Set (step 4):** Summary card, "Start using Tessera" button

**Behavior:**
- Each step saves progress via `POST /api/profiles/onboarding { step, data, completed: false }`
- Final step sends `completed: true` which auto-applies all profile fields
- Resumable: on load, check `user.onboarding_step` and start from there
- **Mandatory** — no skip-all option (individual optional fields can be left blank)
- Progress indicator (dots or bar)
- Future enhancement: demo accounts with preloaded data for viewers who just want to explore

**Frontend — `frontend/src/app/demo/page.tsx`:**
- After login, check `user.onboarding_completed`
- If `false`, show `<Onboarding />` instead of `<DemoApp />`
- On completion, refresh profile and show DemoApp

**Frontend — `frontend/src/lib/user-context.tsx`:**
- Ensure `refreshProfile()` is called after onboarding completes so the user context has the updated profile

**Files to create/modify:**
- `frontend/src/components/app/onboarding.tsx` (new — main wizard)
- `frontend/src/app/demo/page.tsx` (gate behind onboarding)
- `frontend/src/lib/user-context.tsx` (may need minor updates)

---

## Workstream 3: Scheduled Automated Calls (1-2 days)

### 3A. Cron Job Infrastructure

**Problem:** Proactive outbound calls only trigger manually. Users set a `checkin_time` preference but nothing acts on it.

**Backend — Install `node-cron`:**
```bash
cd backend && npm install node-cron && npm install -D @types/node-cron
```

**Backend — `backend/src/services/scheduler.ts` (new file):**
- Import `node-cron`
- Run a cron job every hour (e.g., `0 * * * *`)
- Query profiles where:
  - `checkin_time` hour matches current UTC hour (adjusted for user timezone)
  - `onboarding_completed = true`
  - User has a `phone_number` set
  - A new `auto_call_enabled` column is `true`
  - No check-in exists for today (avoid duplicate calls)
- For each matching user, call the existing outbound call logic from `voice.ts`
- Log results, handle errors gracefully (one failed call shouldn't block others)

**Database — Add opt-in column:**
```sql
ALTER TABLE profiles ADD COLUMN auto_call_enabled boolean DEFAULT false;
```

**Backend — `backend/src/routes/profiles.ts`:**
- Add `auto_call_enabled` to the allowed PATCH fields

**Backend — `backend/src/index.ts`:**
- Import and start the scheduler after Express starts listening

**Frontend — `frontend/src/components/app/profile.tsx`:**
- Add toggle for "Daily automated check-in calls" in the preferences section
- Wire to `PATCH /api/profiles { auto_call_enabled: true/false }`

**Frontend — `frontend/src/components/app/onboarding.tsx`:**
- In the Preferences step, include the auto-call opt-in toggle

**Files to create/modify:**
- `backend/src/services/scheduler.ts` (new)
- `backend/src/index.ts` (start scheduler)
- `backend/src/routes/profiles.ts` (allow auto_call_enabled in PATCH)
- `frontend/src/components/app/profile.tsx` (add toggle)
- `frontend/src/components/app/onboarding.tsx` (add opt-in during onboarding)

---

## Workstream 4: Production Hardening

### 4A. Rate Limiting

**Backend — Install `express-rate-limit`:**
```bash
cd backend && npm install express-rate-limit
```

**Backend — `backend/src/middleware/rateLimiter.ts` (new file):**
- General API limiter: 100 requests per 15 minutes per IP
- Auth limiter: 10 login attempts per 15 minutes per IP
- Waitlist limiter: 5 submissions per hour per IP
- Voice/call limiter: 10 calls per hour per user

**Backend — `backend/src/index.ts`:**
- Apply general limiter globally
- Apply specific limiters to sensitive routes

### 4B. Environment Variable Validation

**Backend — `backend/src/config.ts` (new file):**
- Validate all required env vars on startup using Zod
- Fail fast with clear error messages if critical vars missing
- Export typed config object

**Backend — `backend/src/index.ts`:**
- Import config at top, fail immediately if validation fails

### 4C. CORS Hardening

**Backend — `backend/src/index.ts`:**
- Support multiple CORS origins (comma-separated `FRONTEND_URL`)
- Add `credentials: true` for cookie support if needed later

### 4D. Health Check Enhancement

**Backend — `backend/src/index.ts`:**
- Enhance `/ping` to return `{ status: "ok", version, uptime, timestamp }`
- Add `/health` endpoint that checks Supabase connectivity

**Files to create/modify:**
- `backend/src/middleware/rateLimiter.ts` (new)
- `backend/src/config.ts` (new)
- `backend/src/index.ts` (rate limiting, CORS, health check)

---

## Workstream 5: Demo Polish

### 5A. Remove Dev Artifacts

- Remove `TestEmbedButton` and `SummaryButton` from landing page (covered in 1D)
- Remove stray `<div>Hi</div>`

### 5B. Landing Page Social Proof

**Frontend — `frontend/src/app/page.tsx`:**
- Update waitlist counter from hardcoded "240+" to dynamic count from `GET /api/waitlist/count` (simple count endpoint)
- Add the backend endpoint `GET /api/waitlist/count` (no auth) to `backend/src/routes/waitlist.ts`

### 5C. Ensure Demo Flow Continuity

Verify these flows work end-to-end for demo recording:
1. Landing page → waitlist signup → confirmation
2. Landing page → Demo button → login → mandatory onboarding → dashboard
3. Dashboard → voice check-in → transcript → save → appears in log
4. Dashboard → text chat → AI conversation → save as check-in
5. Dashboard → upload document → AI summary → appears in files
6. Info page → call me → phone rings → auto-parsed check-in
7. Log → generate report → PDF download
8. Info page → trends section → visualizations render with real data
9. Feedback tab → submit feedback → confirmation

---

## Implementation Order (Priority)

| Priority | Task | Est. Effort | Workstream |
|----------|------|-------------|------------|
| 1 | Landing page cleanup (remove dev buttons) | 10 min | 1D |
| 2 | Persist waitlist emails | 30 min | 1A |
| 3 | Nav restructure (Feedback tab + Info tab + profile avatar) | 1-2 hrs | 1C |
| 4 | Wire chat mode to backend | 1-2 hrs | 1B |
| 5 | Onboarding wizard (mandatory) | 3-4 hrs | 2A |
| 6 | Cron scheduler for auto calls | 2-3 hrs | 3A |
| 7 | Rate limiting | 30 min | 4A |
| 8 | Env validation + config | 30 min | 4B |
| 9 | CORS + health check | 20 min | 4C/4D |
| 10 | Landing page dynamic counter | 20 min | 5B |

---

## New Database Tables Summary

```sql
-- 1. Waitlist
CREATE TABLE waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  source     text DEFAULT 'landing_page',
  created_at timestamptz DEFAULT now()
);

-- 2. Feedback
CREATE TABLE feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type       text DEFAULT 'general' CHECK (type IN ('bug', 'feature', 'general', 'praise')),
  message    text NOT NULL,
  page       text,
  created_at timestamptz DEFAULT now()
);

-- 3. Profile column addition
ALTER TABLE profiles ADD COLUMN auto_call_enabled boolean DEFAULT false;
```

---

## New Dependencies

**Backend:**
- `node-cron` + `@types/node-cron` — scheduled job execution
- `express-rate-limit` — API rate limiting

**Frontend:**
- No new dependencies needed

---

## New Files Summary

| File | Purpose |
|------|---------|
| `backend/src/routes/waitlist.ts` | Waitlist email collection endpoint |
| `backend/src/routes/feedback.ts` | Feedback submission endpoint |
| `backend/src/services/scheduler.ts` | Cron job for automated daily calls |
| `backend/src/middleware/rateLimiter.ts` | Rate limiting middleware |
| `backend/src/config.ts` | Env var validation + typed config |
| `frontend/src/components/app/onboarding.tsx` | Multi-step onboarding wizard |
| `frontend/src/components/app/feedback-tab.tsx` | Full-page feedback tab (replaces Trends in nav) |

---

## Verification Plan

1. **Waitlist:** Submit email on landing page → verify row appears in Supabase `waitlist` table → submit same email again → verify no error (idempotent)
2. **Chat mode:** Open chat in demo → verify AI opener appears → send message → verify AI reply → save as check-in → verify in log
3. **Feedback tab:** Navigate to Feedback tab in bottom nav → submit feedback → verify row in Supabase `feedback` table → verify it appears in "your feedback" list
4. **Nav restructure:** Verify bottom nav shows Home | Log | [+] | Feedback | Info — verify Info page has both profile and trends sections — verify profile avatar in top bar navigates to Info
5. **Onboarding:** Create new account → verify mandatory onboarding wizard appears → complete all steps → verify profile updated → verify dashboard loads
6. **Cron scheduler:** Set a user's `checkin_time` to current hour, `auto_call_enabled=true` → verify cron triggers outbound call (or mock in test)
7. **Rate limiting:** Hit login endpoint 11 times rapidly → verify 429 on attempt 11
8. **Landing page:** Verify no dev buttons visible, waitlist counter updates
9. **Full demo flow:** Record screen walking through all flows listed in 5C
