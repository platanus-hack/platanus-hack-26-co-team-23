# complAI — agent context

> Platanus Hack 2026 · Track ACCESS · team-23. Product: Colombian regulation turned
> into an agent — multi-source ingestion, personalized multichannel alerts (Plus),
> compliance PRs with a human reviewer (PRO), and an MCP server (HTTP + npm `complai-mcp`).

## Language hardrule

**Everything in this repo must be written in English** — code, identifiers, comments,
commit messages, PR descriptions, and internal docs — **except**:

- [`docs/ANTEPROYECTO.md`](./docs/ANTEPROYECTO.md) (the anteproyecto/pitch)
- [`docs/superpowers/plans/2026-08-22-complai.md`](./docs/superpowers/plans/2026-08-22-complai.md) (the executable spec)
- `platanus-hack-project.jsonc` and `project-description.md` (Platanus submission
  material for the jury — the platform's own schema requires these in Spanish)

Those stay in Spanish as-is. Everything else — including this file, README.md,
AGENTS.md, other docs, and all source — must be in English.

This does **not** cover: end-user-visible UI copy (the product's dashboard is for
Colombian companies and stays in Spanish for now) or domain data values (seed norms,
the `SECTORS` / `company_type` taxonomy in `src/lib/types.ts`) — those represent real
Colombian regulatory content and the shared schema contract, not repo prose.

## Read this first

1. **Executable plan (source of truth for WHAT and HOW):**
   [`docs/superpowers/plans/2026-08-22-complai.md`](./docs/superpowers/plans/2026-08-22-complai.md)
   — Task 0 + per-member tracks, with full code, tests, and **Interfaces** per task.
   Run it with `superpowers:executing-plans` (or subagent-driven), task by task, checking off boxes.
2. **Anteproyecto (pitch, data, sources):** [`docs/ANTEPROYECTO.md`](./docs/ANTEPROYECTO.md)

## Ownership by member

| Member | Track | Plan tasks |
|---|---|---|
| M1 — Alejandro (@alejocas17) | Task 0 (blocks everyone) + data pipeline: SUIN/DIAN/SFC/SIC sources + LLM structuring | 0, 1, 1b, 1c, 2 |
| M2 | Google SSO + dashboard settings → then wow channels (WhatsApp Kapso + Retell voice) | 3, 4, 5b |
| M3 | Matching + multichannel dispatcher + base channels + feed | 5, 6 |
| M4 | PRO tier: repo analysis → PR → reviewer | 7 |
| M5 | MCP server + npm package + Vercel deploy + demo | 8, 9 |

Assign M2–M5 to Santiago R., David, Santiago P., and Juan E. by preference. Task 1c is
delegable to whoever is ahead of schedule.

## Repo rules (non-negotiable within the 36h)

- **Task 0 and the M1 track (ingestion pipeline) are already on `main` and verified** —
  the shared contract (schema + `src/lib/types.ts` + seed + 64 real norms in Supabase) exists.
- **Branch flow:** `feat/<your-thing>` branches off **`dev`** (default branch) → PR to `dev` →
  once there's a demo-candidate, PR `dev` → `main`. Short-lived branches (<3h), merge as soon as it compiles.
- **Mirror to Platanus: automatic.** A GitHub Action (`.github/workflows/mirror.yml`) replicates
  every push to the Platanus repo. **Do NOT set up local dual-push** (old README rule) and
  **never push directly to the Platanus repo** — it desyncs the mirror and the Action will fail.
- Conventional Commits.
- Each plan task declares what it **consumes/produces** — if you need something from another
  track, check its `Interfaces` block, don't read its half-finished code.
- The PRO agent **never merges PRs**; the LLM model is referenced only via `MODEL` in
  `src/lib/llm.ts`; the sector taxonomy is closed in `SECTORS` (`src/lib/types.ts`).

## Stack and commands

Next.js 15 (App Router, TypeScript, pnpm) + Supabase (Postgres + Google Auth) +
`@anthropic-ai/sdk` + Vercel. Env vars: see **Global Constraints** in the plan.

```bash
pnpm dev          # local
pnpm test         # vitest
pnpm build        # typecheck + build
# trigger the pipeline locally:
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/match
```

## Agent skills (local setup, once per machine)

Clerk and Supabase publish skills for Claude Code with API/CLI-specific guides.
They install globally (`~/.claude/skills`, outside the repo) — everyone runs this once
on their machine and they become available in any project or worktree, without touching the repo:

```bash
npx skills add clerk/skills
npx skills add supabase/agent-skills
```

## Manual setup pending (do early, depends on third parties)

- [ ] Supabase project + Google OAuth (Task 0 Step 2)
- [ ] Kapso account (WhatsApp) + number — API key in env (Task 5b)
- [ ] Retell account (voice) + agent with the plan's prompt + number (Task 5b)
- [ ] Check `complai-mcp` is free on npm (`npm view complai-mcp` → 404 = free)
- [ ] Demo repo `facturador-demo` with code that "violates" compliance (Task 7)
- [ ] Before submitting: `platanus-hack-project.jsonc` + `project-description.md` + logo
  (Platanus README requirements — write the final readme by hand)
