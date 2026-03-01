# Tessera — Ideal Customer Profile (ICP)

## The Core Problem

Doctors get 10 minutes every few months. Between appointments, symptoms go untracked, medication adherence slips, and warning signs get missed. The patients who need monitoring most — elderly individuals with chronic conditions — are the least likely to use a health app daily. They don't want another screen to navigate. They just want someone to check in.

## Primary ICP: The Elderly Patient

### Demographics

- **Age:** 65–85+
- **Location:** Urban, suburban, and regional areas (Australia initially)
- **Living situation:** Living alone, with a partner, or in assisted living
- **Income:** Fixed income (pension, superannuation); cost-sensitive but willing to pay for peace of mind
- **Tech ownership:** Has a phone (landline or basic mobile). May have a smartphone or tablet but doesn't use it confidently

### Health Profile

- **One or more chronic conditions:** Type 2 diabetes, hypertension, arthritis, COPD, heart disease, depression
- **Multiple medications:** Often 3–8 daily medications with different schedules
- **Regular doctor visits:** GP every 4–12 weeks, specialist appointments quarterly
- **Declining memory:** Difficulty recalling when symptoms started, sleep quality over time, or whether they took medication

### Tech Literacy

- **Comfort level:** Low. Can answer a phone call, maybe send a text. Struggles with apps, logins, and multi-step digital workflows
- **Attitude:** Not opposed to technology — just finds it confusing and frustrating. Has had bad experiences with apps that assume digital fluency
- **What works:** Phone calls, voice interaction, printed documents. Things that feel familiar
- **What doesn't:** Form-filling, star ratings, typing on small screens, remembering passwords, navigating menus

### Daily Life

- Routine-oriented. Wakes at a similar time, takes medication at set times, watches the same shows
- May feel isolated — limited social contact, especially if mobility-impaired
- Health is a constant background concern but they avoid "making a fuss"
- Tends to downplay symptoms ("it's probably nothing") or forget to mention them at appointments
- Values independence — doesn't want to burden family or feel like they're losing autonomy

### Pain Points

| Pain Point | Impact |
|---|---|
| Forgets symptoms between appointments | Doctor gets incomplete picture; conditions worsen silently |
| Struggles to track medication adherence | Missed doses, doubled doses, no record for the doctor |
| Appointments feel rushed | 10 minutes isn't enough to cover weeks of health changes |
| Health apps are intimidating | Downloads app, gets confused, never opens it again |
| Doesn't want to worry family | Avoids calling children about "minor" issues that may not be minor |
| Feels isolated | Limited daily human interaction, especially around health |

### What They Actually Want

1. **Someone to check in on them** — not an app notification, a conversation
2. **To feel heard** — a patient listener who remembers their conditions and history
3. **No effort required** — they answer the phone, talk naturally, and everything is handled
4. **Their doctor to know what's happening** — a printable summary they can bring to appointments
5. **Peace of mind** — knowing that if something is wrong, someone will flag it
6. **Independence** — managing their own health without depending on family for tech support

## How Tessera Serves This ICP

### The Phone Call Is the Product

The core interaction is a **daily outbound phone call**. Tessera calls the patient at their preferred time. They answer. They talk for 2–3 minutes about how they're feeling. That's it.

Behind the scenes:
- The AI conversation is warm, personal, and remembers their history
- Transcript is automatically parsed into structured health data (mood, energy, sleep, symptoms, medication)
- Critical symptoms are flagged immediately (chest pain, breathing difficulty, stroke signs)
- No app interaction required at any point

### Zero Cognitive Load

| Traditional Health App | Tessera |
|---|---|
| Open app, navigate to check-in | Answer the phone |
| Rate mood 1–10 | "How are you feeling today?" |
| Fill in sleep hours | "Did you sleep alright?" |
| Check medication boxes | "Have you taken your morning tablets?" |
| Type symptom description | "Any aches or pains bothering you?" |
| Save and close | Hang up — done |

### Safety-First Design

- Symptom flagging **biases toward false positives** — it's better to flag something harmless than miss something critical
- Critical alert thresholds calibrated for elderly patients
- AI proactively follows up on concerning symptoms from previous calls
- Every health insight includes a medical disclaimer

### Doctor-Ready Output

- One-page PDF health reports covering any time period
- Patient info, health metrics, medication adherence, AI-generated summary
- Designed to be **printed** and brought to an appointment — no screen sharing or QR codes
- Structured clinical data, not just conversation transcripts

## Secondary ICP: The Adult Child / Caregiver

### Demographics

- **Age:** 35–55
- **Relationship:** Son, daughter, or primary caregiver of the elderly patient
- **Location:** Often lives separately from the patient (different suburb or city)
- **Tech literacy:** Moderate to high — comfortable with apps and dashboards

### Pain Points

- Worries about parent's health between visits
- Can't call every day (work, kids, distance)
- Gets incomplete or downplayed health updates ("I'm fine, dear")
- Scrambles to prepare health summaries before parent's doctor appointments
- Feels guilty about not being more present

### What They Want

1. **Passive monitoring** — know that someone is checking in daily without them having to do it
2. **Alerts for serious issues** — notified if a critical symptom is flagged
3. **Appointment-ready reports** — download or print a health summary for the doctor
4. **Trend visibility** — see if energy, mood, or sleep are declining over weeks
5. **Peace of mind** — confidence that their parent isn't silently deteriorating

### How Tessera Serves Them

- Dashboard with parent's health trends (energy, sleep, mood sparklines)
- Critical symptom alerts surfaced prominently
- One-click report generation for doctor appointments
- Check-in history with full transcripts and extracted data
- Document upload for lab results, prescriptions, and scans

## Tertiary ICP: Healthcare Providers

### Profile

- GPs, geriatricians, chronic disease management teams
- Aged care facilities and home care providers
- Telehealth platforms looking to extend between-visit monitoring

### Pain Points

- 10-minute appointments with patients who can't recall their week
- No structured data between visits
- Paper-based or fragmented patient reporting
- High readmission rates for elderly patients with chronic conditions

### What They Want

- Structured, longitudinal health data from between appointments
- Symptom trend analysis over weeks and months
- Medication adherence tracking
- Critical alert escalation pathways
- Integration-friendly data (structured JSON, PDF reports)

### How Tessera Serves Them

- Structured clinical output (not just notes) from every check-in
- Vector-embedded health data for semantic similarity search
- PDF reports with patient info, metrics tables, and AI summaries
- Symptom frequency analysis and trend tracking
- Designed for eventual EHR integration

## Design Principles (Derived from ICP)

These principles should guide every product and engineering decision:

1. **Voice first, screen second.** The phone call is the primary interface. The app exists for caregivers and tech-comfortable users, not as a requirement.

2. **Infer, don't ask.** Extract structured data from natural conversation. Never ask users to rate things on a scale or fill in forms.

3. **The system initiates.** Tessera calls the patient. The patient doesn't need to remember to open an app or dial a number.

4. **Err on the side of caution.** False positives for symptom flagging are acceptable. False negatives are not. When in doubt, flag it.

5. **Print-ready output.** Reports should work on paper. Not everyone has a tablet in the doctor's office.

6. **Familiar interactions only.** Phone calls, printed pages, simple buttons. No gestures, swipes, or hidden menus.

7. **Respect independence.** The system monitors without being patronizing. It's a companion, not a supervisor.

8. **One setup, forever value.** Capture health profile, medications, and preferences once. Every future interaction uses that context automatically.

## Key Metrics to Track

| Metric | Why It Matters |
|---|---|
| Call answer rate | Are patients picking up? If not, timing or trust needs adjustment |
| Average call duration | 2–3 minutes is ideal; much longer suggests confusion, much shorter suggests disengagement |
| Symptom capture rate | How many check-ins produce at least one structured health data point |
| Critical flag accuracy | Are flagged symptoms genuinely concerning? Track false positive rate |
| Report generation frequency | Are caregivers/patients actually using reports for appointments |
| Medication adherence trend | Is tracking medication actually improving adherence over time |
| 7-day streak rate | What % of patients complete 7 consecutive daily check-ins |
| Caregiver dashboard visits | Are secondary users (children/caregivers) finding value in the dashboard |

## Competitive Landscape

| Competitor | Approach | Why Tessera Wins for This ICP |
|---|---|---|
| MyFitnessPal, Apple Health | App-first, self-tracking | Requires daily app use — elderly users won't do it |
| CarePredict, Lively | Wearable sensors | Hardware cost, charging, setup friction |
| Telehealth platforms (Teladoc) | On-demand video calls | Reactive, not proactive; requires scheduling and screen |
| Family group chats | Informal check-ins | Unstructured, guilt-driven, no clinical output |
| Paper health diaries | Manual logging | Relies on memory and discipline; no alerts or analysis |

Tessera's advantage: **proactive voice interaction with zero tech literacy required, producing structured clinical data automatically.**

## Summary

Tessera exists because the people who need health monitoring most are the people least served by existing health apps. By making a phone call the primary interface, automatically extracting clinical data from natural conversation, and producing doctor-ready reports, Tessera bridges the gap between daily life and clinical care for elderly patients — without asking them to learn anything new.
