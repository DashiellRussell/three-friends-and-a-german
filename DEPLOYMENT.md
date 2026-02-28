# Deployment Guide — AI Health Companion

## Architecture

| Component | Platform | Build Command | Why |
|-----------|----------|---------------|-----|
| Frontend (Next.js) | **Vercel** | `pnpm build` | Zero-config Next.js hosting, edge CDN, automatic HTTPS |
| Backend (Express) | **Railway** | `npm run build` | Long-running server, supports WebSocket, easy env vars |
| Database | **Supabase** | N/A (managed) | Already using Supabase — no separate DB deploy needed |

---

## 1. Deploy Frontend to Vercel

### Option A: Via Git (Recommended)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `pnpm build`
   - **Output Directory:** `.next` (default)
   - **Install Command:** `pnpm install`
5. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
   ```
6. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# From the repo root
cd frontend
vercel

# Follow prompts:
#   - Link to existing project or create new
#   - Framework: Next.js
#   - Root directory: . (since you're already in frontend/)

# For production deploy:
vercel --prod
```

### Vercel Settings Notes
- The frontend uses pnpm — Vercel auto-detects this from `pnpm-lock.yaml`
- No need to configure the build output; Next.js defaults work
- Set the root directory to `frontend` since this is a monorepo

---

## 2. Deploy Backend to Railway

### Setup

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub Repo"
3. Select your repository
4. Configure the service:
   - **Root Directory:** `backend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

### Environment Variables

Add all of these in Railway's dashboard under your service → Variables:

```
PORT=3001
FRONTEND_URL=https://your-app.vercel.app

# Mistral
MISTRAL_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_PHONE_NUMBER_ID=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# W&B
WANDB_API_KEY=
```

### Railway Notes
- Railway auto-detects Node.js from `package.json`
- It assigns a random port via `PORT` env var — make sure your Express app reads `process.env.PORT`
- Railway provides a public URL like `your-service.up.railway.app` — use this as `NEXT_PUBLIC_BACKEND_URL` in Vercel
- Railway has a free tier with $5 of usage per month — more than enough for a hackathon

### Alternative: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
cd backend
railway link

# Deploy
railway up
```

---

## 3. Supabase (Already Managed)

No deployment needed — Supabase is a hosted service. Just make sure:

1. Your database schema is applied (run the SQL from PROJECT_SCOPE.md in Supabase SQL Editor)
2. RLS policies are enabled
3. Storage buckets are created for document uploads and report PDFs
4. Your environment variables point to the correct Supabase project

---

## 4. CORS Configuration

After deploying, update the backend CORS to allow your Vercel domain.

In `backend/src/index.ts`, ensure CORS reads from `FRONTEND_URL`:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

Set `FRONTEND_URL` in Railway to your Vercel production URL (e.g. `https://your-app.vercel.app`).

---

## 5. Post-Deploy Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Frontend can reach backend API (`/ping` endpoint)
- [ ] Supabase connection works (test auth or a simple query)
- [ ] ElevenLabs signed URL generation works
- [ ] Voice check-in connects via WebRTC
- [ ] Document upload works through multer
- [ ] Outbound call triggers successfully
- [ ] CORS is not blocking requests
- [ ] All environment variables are set in both Vercel and Railway

---

## 6. Custom Domain (Optional)

### Vercel
```bash
vercel domains add yourdomain.com
```
Or configure in Vercel dashboard → Project → Settings → Domains.

### Railway
Railway supports custom domains under Settings → Networking → Custom Domain.

---

## Quick Reference

```bash
# Local development
cd frontend && pnpm dev          # http://localhost:3000
cd backend && npm run dev         # http://localhost:3001

# Build (test locally before deploying)
cd frontend && pnpm build
cd backend && npm run build

# Deploy frontend
cd frontend && vercel --prod

# Deploy backend
cd backend && railway up
```

---

## Cost Estimate (Hackathon)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0 |
| Railway | Trial / Hobby | $0–5 |
| Supabase | Free tier | $0 |
| ElevenLabs | Creator ($22/mo) | $22 |
| Twilio | Pay-as-you-go | ~$2–7 |
| **Total** | | **~$25–35** |
