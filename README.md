# AqarPro — Interactive Prototype

Clickable prototype of the **AqarPro AI Website Platform** (specification **AQP-REQ-001**, Final R2), built to
demonstrate the six UAT scenarios (C1–C6) and Appendix A of the specification. Bilingual Arabic (RTL) /
English throughout. Nothing here is production-ready — see the prototype audit page.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /en (or /ar for Arabic browsers)
```

Production build: `npm run build && npm start`.

### Optional: real AI assistant

Without a key the assistant uses a built-in rules engine (still grounded in live listings). To use Claude:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

## Stages

The header has a **S1 / S1 + S2** switch:

- **S1** shows only the Stage 1 scope (revenue-ready website): Stage 2 features (WhatsApp property packs,
  AI assistant, full shared inbox, Meta campaigns, favourites/compare/alerts, AI console) are hidden or shown
  as locked "Delivered in Stage 2" cards.
- **S1 + S2** shows everything. Feature badges (`S1`, `S2`) mark the stage of each module.

| Page | URL |
|---|---|
| **Demo guide — UAT swimlanes C1–C6 + Appendix A** | `/en/demo` |
| Roadmap by stage (every requirement ID with priority, stage and prototype status) | `/en/roadmap` |
| Prototype audit (S0: retain / refactor / rebuild) | `/en/audit` |

## UAT walkthroughs

| Scenario | Steps |
|---|---|
| C1 Find a property with the AI assistant (S2) | `/en` → "Ask AqarPro AI" → `/en/advertiser/leads` → `/en/inbox` |
| C2 Property pack on WhatsApp (S1/S2) | `/en/listing/AQ-10231` → `/en/whatsapp?listing=AQ-10231&pack=1` → `/en/advertiser/leads` |
| C3 Subscribe, pay and post (S1) | `/en/register` → `/en/admin?tab=verification` → `/en/pricing` → `/en/advertiser/new` → `/en/admin?tab=moderation` |
| C4 AI Studio listing to two portals (S1) | `/en/advertiser/studio` → `/en/hub` |
| C5 Promote on Meta (S2) | `/en/advertiser/promote/AQ-10233` |
| C6 Report + WhatsApp handover (S1/S2) | `/en/listing/AQ-10246` (report) → `/en/admin?tab=reports` → `/en/advertiser`; `/en/whatsapp` → `/en/inbox` |

Swap `/en` for `/ar` for the Arabic version.

## Demo tips

- Open **Admin** and the **Agency dashboard** in two windows — state syncs live across tabs.
- "Reset demo data" in the footer restores the seed data.
- Dashed tags (e.g. `HUB-08`) map UI to requirement IDs in AQP-REQ-001.
- Blue `Pixel + CAPI` toasts show the Meta events that would fire (click one to hide them).

## What's real vs simulated

Real in the prototype: bilingual UI/RTL, search + Arabic normalisation, map, moderation checks, report →
resubmit, Portal Hub validation and idempotent retry logic, AI Studio checks, lead manager, AI assistant
grounding, client-side photo compression/EXIF stripping.
Simulated: external portals (two mock connectors), WhatsApp Cloud API, Meta APIs, payment gateway,
login/OTP, email/SMS, OCR/speech-to-text, persistence (browser localStorage).

Photos: Unsplash (Unsplash License) — demo only.
