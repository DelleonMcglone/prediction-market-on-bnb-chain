# Phase 08 · Polish & Handoff

**Goal:** Everything the spec demands is shipped, the live URL is sharable, and the repo reads like something a prospective partner would trust.

## Prerequisites

- Phases 01-07 complete — all core flows work on testnet.

## Deliverables

### Copy pass

Walk every screen and every state. Rewrite any text that was placeholder-quality in earlier phases. Rules:
- No "Lorem ipsum". No "TODO:" in the UI. No unstyled error strings.
- Every empty state tells the visitor what to do next.
- Every loading state shows a skeleton, not a spinner-on-blank-page.
- Every error state explains what went wrong and what to try.
- Copy tone matches the case study — direct, calm, no marketing speak.

Checklist:
- [ ] Homepage hero + testnet banner.
- [ ] Market card truncation.
- [ ] Market detail: chart empty state, trade form empty state, "no trades yet" text.
- [ ] Portfolio: disconnected, empty, one-position, resolved-won, resolved-lost, claimed states.
- [ ] Admin: overview empty state, create-market help text, submit-outcome warning copy.
- [ ] Dispenser modal onboarding copy.
- [ ] 404 page.
- [ ] Wrong-network modal.
- [ ] Wallet-not-connected states.

### Loading / empty / error states audit

- [ ] Every `useQuery` has a skeleton variant.
- [ ] Every form has a disabled variant when fetch is pending.
- [ ] Every async action has a pending-state button label.
- [ ] Every known revert has a decoded message (see `decodeError.ts`).

### `/about` page

- One-page summary of the case study.
- Embedded PDF viewer or prominent download link for Case Study № 007.
- Architecture diagram (from `docs/architecture.md`) rendered as an SVG.
- BscScan links for every contract.
- GitHub repo link.
- "Who built this" section — Igbo Labs credit.

### SEO / sharing

- **`app/layout.tsx` metadata:**
  - `title`: "Prediction Market Demo · Igbo Labs"
  - `description`: one-line pitch.
  - `openGraph`: image, title, description, URL.
  - `twitter`: card type `summary_large_image`.
- **`app/opengraph-image.tsx`** — Dynamic OG image using Next.js built-in. Renders the current featured market question + a stylized price.
- **`app/favicon.ico`** and **`app/icon.png`**.
- **`app/robots.ts`** — `Allow: /`, no `Disallow`.
- **`app/sitemap.ts`** — Lists `/`, each `/market/[address]`, `/portfolio`, `/about`.

### Performance

- [ ] Lighthouse score ≥ 90 on Performance, Accessibility, Best Practices, SEO (mobile and desktop).
- [ ] First contentful paint < 1.5s on 4G simulation.
- [ ] No layout shift on card list load (CLS < 0.05).
- [ ] Fonts use `display: swap` and are self-hosted via Next.js font optimization.

### Accessibility

- [ ] All interactive elements keyboard-focusable with visible focus rings.
- [ ] All images have `alt` text.
- [ ] All form inputs have labels.
- [ ] Color contrast meets WCAG AA on both dark and light backgrounds.
- [ ] Axe DevTools audit clean on every route.

### README

Comprehensive. Sections:
1. **What this is** — 2 paragraphs.
2. **Live demo** — URL + screenshot.
3. **Contract addresses** — table with BscScan links.
4. **Getting testnet funds** — tBNB faucet link + "or use the in-app Dispenser".
5. **Local development** — one-command setup: `pnpm install && pnpm sync:abis && pnpm dev`.
6. **Running contract tests** — `cd contracts && forge test`.
7. **Architecture** — link to `docs/architecture.md`.
8. **Built with** — short tech list.
9. **License** — MIT or similar.

### Architecture doc review

- [ ] `docs/architecture.md` sections for Contracts, Frontend, Deployment each match the shipped code.
- [ ] Diagram in the doc matches the shipped contract layout.
- [ ] Any deviations from the spec (added view functions, inlined helpers, etc.) are documented with a "Deviations from spec" section at the bottom.

### Contracts reference

- [ ] `docs/contracts.md` covers every contract: address, role grants, every external function signature, events.
- [ ] Each entry links to the verified BscScan page.

### Smoke test run

Execute the checklist from `docs/smoke-test.md` on the live URL with a fresh wallet on a fresh browser. Fix anything that fails. Re-run.

### Analytics (if enabled)

- [ ] Plausible script added to `app/layout.tsx` if decided upstream.
- [ ] Privacy policy link in footer if analytics enabled.

## Acceptance criteria

- [ ] A prospective partner can land on the demo URL, understand what it is, and complete the full flow (drip → trade → wait for resolve → claim) without instructions.
- [ ] README includes working live URL, contract addresses, and faucet link.
- [ ] All 9 items from Section 2 of the spec (Success Criteria) are demonstrably checked.
- [ ] CI is green.
- [ ] Vercel production URL is linked in README and points to the latest main.
- [ ] No known failure conditions from Section 3 occur during a three-person walk-through test.

## Tests

- **Manual walk-through:** Three people independently run the `docs/smoke-test.md` checklist. Each logs any friction. Fix before declaring done.
- **Accessibility audit:** Axe DevTools + manual keyboard navigation on every route.
- **Lighthouse:** Recorded for homepage, market detail, portfolio. Scores committed to `docs/lighthouse.md`.

## Risks / gotchas

- **"Done" ambiguity:** Polish phases balloon. Hard cap: everything in Section 2 works, everything in Section 3 does not occur, copy is consistent. Anything beyond that is optional.
- **Live URL for the case study PDF:** The `/about` page links to it — must exist somewhere. Agree with the case study author on the canonical URL before launch.
- **Demo freshness:** The seeded markets reference "this week" etc. Either rotate them or reword to be evergreen. Prefer evergreen.
- **Sharing hazards:** OG image must not say anything the demo can't back up. No "trade real crypto" copy. Testnet banner must appear everywhere.

## Decisions recorded

- **Seeded market #2 phrasing:** Change "by the end of the week" to "in its first 100 blocks" or similar evergreen phrasing.
- **Analytics:** (decision pending from Section 12 of the spec — if enabled, Plausible only).
- **Domain:** (decision pending).

## Exit criteria

Commit `chore: phase 08 polish and handoff`. Demo URL announced. Case Study № 007 links back to the demo. Project is dem-ready and publicly claimable.
