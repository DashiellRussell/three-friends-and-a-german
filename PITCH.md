# Tessera — CompSci Pitch Comp Preparation

## Form Answers

### Describe your startup in one sentence

**Option A (recommended):**

> Tessera is an AI health companion that proactively calls elderly and disabled patients daily, turns natural conversation into structured clinical data, and generates doctor-ready reports — no app literacy required.

**Option B (shorter):**

> Tessera replaces health tracking apps with AI phone calls that elderly patients actually answer, automatically building structured health records for their doctors.

**Option C (problem-first):**

> Tessera bridges the gap between a doctor's 10-minute appointment and the 10,070 minutes of unmonitored health in between, using AI voice calls that require zero tech literacy.

---

### MVP Description (100 words max)

> Tessera is a voice-first AI health companion. It proactively calls patients via phone (ElevenLabs + Twilio), conducts natural 2-minute check-in conversations, then uses Mistral AI to extract structured health data — mood, energy, sleep, symptoms, medication adherence — from the transcript automatically. Critical symptoms (chest pain, stroke signs) trigger immediate alerts. Caregivers monitor trends via a web dashboard with energy sparklines, symptom frequency charts, and medication tracking. One-click PDF report generation produces doctor-ready health summaries covering any time period. Also supports in-app WebRTC voice check-ins, AI text chat, and medical document upload with AI summarization. Built on Next.js, Express, Supabase (pgvector), Mistral, and ElevenLabs.

*(98 words)*

---

### Website / Demo Link / GitHub

- **GitHub:** `https://github.com/[your-org]/three-friends-and-a-german`
- **Live demo:** [your Vercel URL]
- **Backend:** [your Railway URL]

---

### Proof of Early Traction

Consider including any of these:

- **Hackathon validation:** Built at Mistral AI Worldwide Hackathon (Sydney, UNSW MCIC) — functional end-to-end MVP in 31 hours
- **Waitlist:** Landing page with waitlist signup form (deployed on Vercel)
- **Closed beta gate:** Already implemented Clerk auth with `closed_beta` metadata gating
- **Functional MVP:** 15+ API endpoints, 7 database tables, full voice-to-structured-data pipeline working end-to-end
- **Live outbound calls:** Twilio + ElevenLabs phone integration tested with real phone numbers
- **Market validation:** 4.2M Australians aged 65+ (ABS 2023), 50%+ managing chronic conditions, $22B aged care market. NHS, Medicare, and aged care providers actively seeking remote monitoring solutions
- **User interviews / interest:** [add if you've spoken to any elderly patients, caregivers, GPs, or aged care providers]

**Suggested answer:**

> Built as a functional MVP at the Mistral AI Worldwide Hackathon (Sydney). Live waitlist on our landing page. Working end-to-end: AI phone calls reach real phone numbers, transcripts are parsed into structured health data, and doctor-ready PDF reports generate instantly. Closed beta auth gate implemented. Currently seeking pilot partnerships with aged care providers and GP clinics for initial user testing. Australia has 4.2M people aged 65+ — over half manage chronic conditions with limited digital literacy, making voice-first health monitoring a clear gap in the market.

---

### Team Info

**Size:** 4

**Team members:**

- Dashiell Russell — Bachelor of Robotics & Mechatronics and Physics (z5692823)
- [Team member 2 — name, degree, zID]
- [Team member 3 — name, degree, zID]
- [Team member 4 — name, degree, zID]

---

### Anything Else

> Tessera was purpose-built for accessibility — the primary interface is a phone call, not an app. Our target users (elderly, disabled, chronically ill) are systematically underserved by existing health tech because every competitor assumes smartphone literacy. We're the only solution where the patient's entire interaction is answering a phone call and having a conversation. The tech stack (Mistral AI structured extraction, ElevenLabs conversational AI, Twilio telephony, Supabase pgvector) is production-grade and designed to scale. We're exploring B2B channels: aged care facilities, GP clinics, and telehealth platforms as distribution partners.

---

## 2-Minute Pitch Script

### Structure: Problem → Solution → Demo → Market → Ask

**[0:00–0:20] THE HOOK**

"Your mum has a doctor's appointment every 3 months. The doctor gets 10 minutes. In between? Nothing. She tells you she's fine. She told the doctor she's fine. But her knee pain has been getting worse for 6 weeks, she's been sleeping 4 hours a night, and she stopped taking her blood pressure medication because it made her dizzy. Nobody knows — because nobody asked."

**[0:20–0:40] THE PROBLEM**

"4.2 million Australians are over 65. More than half are managing chronic conditions. And the health apps designed to help them? They require downloading, logging in, navigating menus, rating things on scales, and typing on tiny screens. Our users can barely send a text message. So they don't use them. The data gap between appointments is where health deteriorates silently."

**[0:40–1:00] THE SOLUTION**

"Tessera is an AI health companion that calls your mum every morning. She just answers the phone. A warm, context-aware AI has a 2-minute conversation: 'How are you feeling today, Margaret? Did you sleep alright? Have you taken your morning tablets?' That's it. She hangs up. Behind the scenes, Mistral AI extracts structured health data — mood, energy, sleep, symptoms, medication adherence — automatically. No forms. No screens. No effort."

**[1:00–1:30] THE DEMO (show, don't tell)**

Pick 2-3 of these to show live:

1. **Dashboard:** "Here's what you see as a caregiver. Energy trending down this week. Sleep dropped below 6 hours twice. Knee pain flagged 3 days in a row. One critical alert — she mentioned chest tightness yesterday."
2. **Live outbound call:** "Let me show you how it works. I'll press 'Call Me' — watch." *[Phone rings, AI conducts live check-in, data appears on dashboard after]*
3. **Report generation:** "Her GP appointment is Thursday. One click — here's a printable health report with 2 weeks of structured data, symptom trends, and an AI summary. The doctor has never had this before."
4. **Voice check-in (WebRTC):** Quick demo of the in-app voice conversation with real-time transcript.

**[1:30–1:50] MARKET & BUSINESS MODEL**

"Our ICP is the adult child who worries about their ageing parent. They pay $15-25/month for daily AI check-in calls, a caregiver dashboard, and doctor-ready reports. B2B: aged care facilities pay per-resident for continuous monitoring that reduces hospital readmissions. Australia's aged care market is $22 billion. We start here, expand to chronic disease management globally."

**[1:50–2:00] THE ASK**

"We have a working MVP — voice calls reach real phones, structured data flows end-to-end, reports generate instantly. We're looking for $[X] to run a 3-month pilot with [aged care partner / GP clinic] and acquire our first 100 paying users. Tessera — because the people who need health monitoring most shouldn't need to be tech-savvy to get it."

---

## What to Show in the 2-Minute Demo Video

For the required pitch video, prioritize these moments:

### Must-show (pick 3):

1. **The outbound call** — Phone rings, AI talks, data appears. This is your "holy shit" moment.
2. **The dashboard** — Show real health data: sparklines, alerts, symptom trends. Proves structured data extraction works.
3. **Report generation** — One click → printable PDF. Tangible output doctors can use.

### Nice-to-show (if time):

1. **Voice check-in (WebRTC)** — In-app voice conversation showing real-time transcript
2. **Landing page** — Shows the product positioning and waitlist
3. **Critical alert** — Symptom flagging with emergency notification

### Do NOT waste time on:

- Code walkthrough or architecture diagrams
- Explaining the tech stack in detail
- Document upload (less impressive visually)
- Login/auth flow

---

## Key Differentiators to Emphasize


| What judges care about            | What to say                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Is this a real problem?**       | 4.2M Australians 65+, 50%+ with chronic conditions, zero health apps designed for people who can't use apps                                                                 |
| **Why can't incumbents do this?** | Apple Health, MyFitnessPal, CarePredict all assume smartphone literacy or require hardware. We're phone-call-first — zero tech required from the patient                    |
| **Is the tech real?**             | Working MVP: Mistral structured extraction, ElevenLabs WebRTC + outbound calls, Twilio telephony, Supabase pgvector, 15+ API endpoints, 7 DB tables                         |
| **How do you make money?**        | B2C: $15-25/mo caregiver subscription. B2B: per-resident pricing for aged care facilities. Reduces hospital readmissions ($$$ saved)                                        |
| **What's your moat?**             | Longitudinal health data from daily conversations creates a compounding data asset. More history = better context = better AI responses. Switching cost increases over time |
| **Can this scale?**               | Voice calls scale linearly with ElevenLabs/Twilio infrastructure. No hardware to ship. Mistral handles multilingual natively. Works in any country with phone networks      |


---

## Pitch Deck Outline (if submitting one)

1. **Cover:** Tessera — AI Health Companion. "A daily check-in call for the people you care about."
2. **Problem:** The 10-minute appointment gap. Elderly patients don't use health apps. Symptoms go untracked.
3. **Solution:** AI phone calls → structured health data → doctor-ready reports. Zero tech literacy required.
4. **How it works:** 3 steps — Tessera calls → AI extracts data → caregiver sees trends & generates reports.
5. **Demo screenshots:** Dashboard, outbound call flow, PDF report.
6. **Market:** 4.2M Australians 65+. $22B aged care market. Global chronic disease management TAM.
7. **Business model:** B2C subscription ($15-25/mo) + B2B aged care facility contracts (per-resident).
8. **Competitive landscape:** Table showing why voice-first wins vs app-first, wearable-first, telehealth.
9. **Traction:** Working MVP, waitlist, hackathon validation, [any user interviews/LOIs].
10. **Team:** 4 UNSW students — [highlight relevant skills: robotics, AI, healthcare domain knowledge].
11. **Ask:** $[X] for 3-month pilot → first 100 users → product-market fit validation.

---

## Revenue Model Ideas


| Channel              | Pricing              | Notes                                                                               |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **B2C Caregiver**    | $15-25/month         | Adult children subscribe to monitor elderly parent. Daily calls, dashboard, reports |
| **B2B Aged Care**    | $8-15/resident/month | Bulk pricing for facilities. Reduces readmissions, improves compliance reporting    |
| **B2B GP Clinics**   | $200-500/month       | Clinic subscribes for patient panel. Gets structured between-visit data             |
| **B2B Telehealth**   | API/white-label      | Telehealth platforms integrate Tessera's voice check-in as a feature                |
| **Premium features** | +$5-10/month         | Family sharing (multiple caregivers), priority alerting, specialist report formats  |


**Unit economics (rough):**

- ElevenLabs: ~$0.10/min → 3 min/day = $9/month per user
- Twilio: ~$0.013/min → 3 min/day = $1.17/month per user
- Mistral API: ~$0.50-1/month per user (extraction + embedding)
- Supabase: negligible at scale on paid plan
- **Total COGS: ~$10-12/user/month**
- **At $20/month B2C: ~45% gross margin**
- **At $12/month B2B: ~15% gross margin (but volume)**

