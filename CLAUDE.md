# CLAUDE.md — working notes for this repo

## What this is
Higher View Onboarding OS: a productized, multi-tenant onboarding platform. Higher View is the
first operator; each **Office Owner** is a white-label **tenant** with their own invite link,
contract, logo, and business name. The prospect-facing experience is the same form everywhere —
it is headed by the inviting office's name, and beyond that only the contract branding and owner
notifications differ.

## Stack & conventions
- Vite + React 18 + TypeScript + Tailwind CSS v3. Routing via react-router-dom.
- Functional components only. Keep pages in `src/pages`, reusable UI in `src/components/ui`,
  layout chrome in `src/components/layout`.
- Theme lives in `src/index.css` (CSS vars + `@layer components`) and `tailwind.config.js`
  (color + font tokens). Prefer Tailwind utilities for layout; use the `.bevel`, `.gold-text`,
  `.gold-fill`, `.eyebrow`, and `.btn-gold` classes for the signature gold treatment.
- Never introduce a flat single-accent gold — always the multi-stop `--goldgrad`.
- All domain data comes from `src/data/mock.ts`. Types are in `src/types.ts`.

## Core domain rules (do not break)
1. One standardized invitation form — no logos, no office selector. Office is resolved from the
   unique link → Office ID, never from prospect input. The form is headed by that office's name,
   which is read from the slug; showing it is not a selector and does not break this rule.
2. All contacts and pipeline stages live in one central account.
3. The contract sent must match the inviting owner's Office ID (their logo, name, template).
4. Contract follow-up: two reminders, then STOP automation and notify the owner.
5. Discovery Session (initial info session) is distinct from New Preparer Orientation
   (post-contract onboarding). Never merge them.

## Pipeline stages
invited → scheduled (discovery) → attended → contract sent → reminder1 → reminder2 →
signed | owner-followup → orientation scheduled → onboarded. See `Stage` in `types.ts`.

## Suggested next tasks
- **Preparer detail drawer**: click a row in Preparers/Contracts to open a side panel with the
  full journey timeline, messages sent, and manual actions.
- **Prospect-facing invitation form**: the standardized public form at `/j/:officeSlug` (short
  link; `/join/:officeSlug` still resolves for links already sent) that
  resolves the office from the slug and shows the session catalog. This is the one place a
  prospect ever sees.
- **Real data layer**: replace `mock.ts` with an API client. Integration targets:
  - GoHighLevel — contacts, pipeline movement, email/SMS, workflows, owner notifications.
  - Contract platform — receive Office ID, load branded template, send, return signed status,
    provide signed-copy download link, trigger the next workflow on signature.
  - Calendar — Discovery Session + New Preparer Orientation scheduling and reminders.
  - Training/LMS — auto-grant community access on signature; assign required modules.
- **Auth**: swap the mocked `localStorage` flag in `components/auth/auth.tsx` for real auth.
- **AI features (optional)**: draft owner-outreach for escalated preparers; summarize a
  preparer's history; answer new-preparer FAQs.

## Known simplifications
- Auth is a `localStorage` boolean; the login form does not validate credentials.
- Mobile: the sidebar is hidden below the `md` breakpoint (desktop-first admin console).
  A mobile nav is a good addition if mobile use is expected.
