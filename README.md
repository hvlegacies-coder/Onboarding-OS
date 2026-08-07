# Higher View — Onboarding OS

A multi-tenant, white-label preparer onboarding console. Office Owners invite prospective
preparers with a single link; the platform runs the entire journey — scheduling, reminders,
the correctly-branded contract, follow-ups, escalations, and training-community access — from
one central account.

Obsidian-and-gold theme. Built with Vite + React + TypeScript + Tailwind.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. On the login screen, click **Sign in** (auth is mocked) to enter
the console.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check only (`tsc --noEmit`) |

## Project structure

```
src/
├── App.tsx                 Router + auth wiring
├── main.tsx                Entry point
├── index.css               Tailwind + gold/obsidian theme tokens
├── types.ts                Shared domain types
├── data/mock.ts            Mock data (swap for real API/GHL calls)
├── components/
│   ├── auth/auth.tsx       AuthProvider, useAuth, RequireAuth
│   ├── layout/             Sidebar, Topbar, AppShell
│   └── ui/                 Bevel Card, KpiCard, Chip, StagePill, Toggle, Medallion, Avatar
└── pages/                  Login, Overview, Pipeline, Preparers, Offices,
                            Sessions, Contracts, Messages, Settings
```

## Design system

- **Palette:** obsidian `#0A0A0C`, onyx `#131316`, graphite `#1C1C21`, bronze `#8C6A1E`,
  gold `#D4AF37`, champagne `#F5D98B`, ivory `#EDE7D6`.
- **Type:** Cinzel (wordmark), Cormorant Garamond (display numbers), Inter (UI).
- **Signature:** the `.bevel` class — a milled gold gradient border with layered shadows.
  Gold is always the multi-stop `--goldgrad`, never a flat single accent.

## What's mocked vs. real

Everything renders from `src/data/mock.ts` and a fake `localStorage` auth flag. There is no
backend yet. See `CLAUDE.md` for how the real integrations (GoHighLevel, the contract platform,
the calendar, and the training/LMS) are intended to connect.
