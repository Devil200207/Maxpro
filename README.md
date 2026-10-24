# MaxPro — Interactive Prototype

Clickable prototype of the MaxPro Qatar property platform (brief **MPT-PRJ-REQ-003**), built to demo the
five UAT scenarios in §10.2. Bilingual Arabic (RTL) / English throughout.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /en (or /ar for Arabic browsers)
```

Production build: `npm run build && npm start`.

### Optional: real AI assistant

Without a key, the assistant uses a built-in rules engine (still grounded in the live listings).
To use Claude instead:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

The assistant footer shows which engine answered (`claude` or `rules`).

## Where things are

| Portal | URL |
|---|---|
| Public site, search, map | `/en`, `/en/search`, `/en/search?view=map` |
| Listing detail (SEO + JSON-LD) | `/en/listing/MP-10231` |
| Pricing & checkout | `/en/pricing` |
| Advertiser dashboard / post listing | `/en/advertiser`, `/en/advertiser/new` |
| Meta promotion (marketing agent) | `/en/advertiser/promote/MP-10233` |
| Admin & moderation | `/en/admin` |
| Shared support inbox | `/en/inbox` |
| WhatsApp simulator | `/en/whatsapp?listing=MP-10231` |
| **Demo guide (start here)** | `/en/demo` |

Swap `/en` for `/ar` for the Arabic version.

## Demo tips

- Open **Admin** and **Advertiser** in two browser windows side by side — state syncs live across tabs
  (submit a listing on one side, approve it on the other).
- "Reset demo data" in the footer restores the seed data.
- Small dashed tags (e.g. `FR-WAP-03`) map UI to requirement IDs in the brief.
- Blue `Pixel + CAPI` toasts show the Meta events that would fire (click one to hide them).

## What's real vs simulated

Real: bilingual UI/RTL, search + Arabic normalisation, map, moderation auto-checks, AI tool-based retrieval with
grounding validation, client-side photo compression/EXIF stripping, cross-tab sync.
Simulated: WhatsApp Cloud API and Meta APIs, payment gateway/3-D Secure, persistence (browser localStorage),
authentication.

Photos: Unsplash (Unsplash License).
