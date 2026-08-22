# PRO tier — repo analysis → compliance PR → reviewer

Status of branch `feat/task-7-pro-repo-analyzer` (Task 7 of the plan, track M4).

**Verified end-to-end on 2026-08-22:**
[PR #3 on `ComplAI-Crew/facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/3)
— **draft**, opened by `complia-app[bot]`, reviewer requested, ~36s from the POST, not merged.

## What it does

When a norm affects a company that connected its repo, complAI reads the code,
proposes the change the norm requires, and opens a PR **in draft** assigned to a human reviewer.
**Never merges**: a draft doesn't even allow merging until a person marks it
"ready for review". In private repos on the Free plan, which don't support drafts, it falls back to a normal PR.

```
alert (norm × company)
   └─ POST /api/pro/pr { alertId }
        ├─ octokitFor(installationId)      that company's credential
        ├─ reads the repo's COMPLIA.md     → which files to look at
        ├─ does the norm regulate what this code does?
        │     no → { skipped: true, reason } and NO PR is opened
        └─ yes → changes + branch + commits + draft PR + reviewer
                returns prUrl, saves it in alerts.pr_url
```

### The relevance gate

A norm matching a company doesn't mean it requires touching its code. Before
proposing anything, the model decides `aplica` (applies) **by subject matter**: does the norm
regulate the activity this code performs? If not, it returns `{ skipped: true, reason }`
and no PR is opened.

The `aplica` field comes first in the tool schema on purpose: the model generates it before
starting to propose changes, so the decision isn't contaminated by work already done.

The decision is scope-only, not detail-level. A vague norm that does regulate the activity
still generates a PR, with the assumptions declared in the body under "What the
reviewer must confirm" — that's what the human reviewer is for. What the prompt
forbids is inventing figures, deadlines, or codes and presenting them as if they came
from the norm.

Verified against three real alerts on `facturador-demo`:

| Norm | Verdict |
|---|---|
| DIAN resolution — mandatory fields on electronic invoices | PR opened |
| SFC circular — stress tests (EPR/PAC/PAL) | no PR: regulates supervised entities, not an invoicer |
| SFC circular — transaction log retention | no PR: same reason, despite the name sounding like `logger.ts` |

The third one is interesting: by name it looked like it touched `src/logger.ts`, and the gate rejected
it on scope grounds. It also surfaces a matching false positive along the way.

## Pieces

| File | Role |
|---|---|
| `src/lib/pro/github.ts` | `openCompliancePR()` — the full flow |
| `src/lib/pro/complia-md.ts` | manifest parser + generator (`generateCompliaMd`) |
| `src/lib/pro/octokit.ts` | `octokitFor()` — per-company credential |
| `src/lib/pro/install-state.ts` | signed `state` for the install flow |
| `src/app/api/pro/pr/route.ts` | triggers the PR from an alert |
| `src/app/api/pro/complia/route.ts` | generates a repo's `COMPLIA.md` |
| `src/app/api/pro/repos/route.ts` | lists and pins the company's repo |
| `src/app/api/pro/github/callback/route.ts` | saves the `installation_id` after install |
| `src/app/(dashboard)/feed/pr-button.tsx` | the feed button |

### COMPLIA.md — the repo declares what to look at

Without a manifest, the agent takes the first 15 files in alphabetical order and can
miss the one that matters. With a `COMPLIA.md` at the root of the client's repo, **every
path written in backticks that exists in the tree** enters the selection (one that ends in
`/` expands the folder), and the full markdown is injected as context.

The client writes it, so it's delimited inside `<contexto_del_repo>` and labeled as
information, not instructions; and the paths are validated against the real tree, so
a hostile manifest can't make it read anything outside the repo.

`POST /api/pro/complia { companyId }` generates it by analyzing the repo. The repo and credential
come from the company in the DB, never from the request: accepting a loose `installationId`
would let anyone read the code of any installation whose id they guessed.

### Per-company credential

`GITHUB_TOKEN` used to be a single account that had to be a collaborator on every client
repo: doesn't scale. Now each company stores `companies.github_installation_id` and
`octokitFor()` requests an installation token on the fly (1h, scoped only to the repos the
client chose). `GITHUB_TOKEN` remains as a demo fallback.

GitHub App: **complia-app** (App ID `4680485`), permissions `contents:write`,
`pull_requests:write`, `metadata:read`.

## How to test it

```bash
# 1. Migration + demo data
psql/SQL editor → supabase/migrations/001_github_installation_id.sql
                  supabase/seed-demo-pro.sql   # returns the alert_id

# 2. Compliance PR
curl -X POST localhost:3000/api/pro/pr -H 'Content-Type: application/json' \
  -d '{"alertId":"<alert_id>"}'

# 3. Regenerate a repo's manifest
curl -X POST localhost:3000/api/pro/complia -H 'Content-Type: application/json' \
  -d '{"companyId":"<company_id>"}' | jq -r .markdown
```

Required env vars: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`,
`GITHUB_STATE_SECRET`, `ANTHROPIC_API_KEY`, plus the Supabase ones.

## Pending

> Detailed handoff for M2/M3, with API contracts and UI states:
> [`tier-pro-dashboard.md`](./tier-pro-dashboard.md)

### 1. Wire the button into the feed — blocked on M3 (Task 6)

Once `src/app/(dashboard)/feed/page.tsx` exists, inside the `<article>`:

```tsx
import { PrButton } from './pr-button'
…
{a.pr_url ? <p>✅ <a href={a.pr_url}>PR de cumplimiento abierto</a></p> : <PrButton alertId={a.id} />}
```

### 2. Connect GitHub from the dashboard — blocked on M2 (Tasks 3/4)

In settings, a button to `buildInstallUrl(companyId)` and a `<select>` fed by
`GET /api/pro/repos?companyId=…`, which saves via `POST /api/pro/repos { companyId, repo }`.

`companyId` comes from the session: it's the logged-in user's company
(`companies.owner_user_id = auth.uid()`), never from user input.

### 3. Automatic trigger on match — blocked on M3 (Task 5)

Today the PR opens **manually** from the button. That's deliberate for the demo: each
trigger costs ~30s of Claude and writes to the client's repo.

The automatic path goes in `/api/cron/match`, right after inserting each alert:

```ts
// src/app/api/cron/match/route.ts — after inserting the alert
if (company.github_repo && company.auto_pr && norm.severity === 'high') {
  openCompliancePR({
    repo: company.github_repo,
    installationId: company.github_installation_id,
    reviewer: company.reviewer_github,
    normTitle: norm.title,
    obligations: norm.obligations,
    impact: alert.impact,
  })
    .then((res) => {
      if ('skipped' in res) return console.log('no PR for', alert.id, '—', res.reason)
      return db.from('alerts').update({ pr_url: res.prUrl }).eq('id', alert.id)
    })
    .catch((e) => console.error('automatic PR failed for', alert.id, e))
}
```

Three conditions before turning it on:

- **Opt-in per company** — `alter table companies add column auto_pr boolean default false`.
  Opening PRs on someone's repo without them asking for it is intrusive.
- **`severity = 'high'` only** — otherwise a cron run with 64 norms opens dozens of PRs.
- **Don't block the cron** — `openCompliancePR` takes ~30s; matching shouldn't wait on it.
  With many companies this needs to move to a queue instead of firing inline.

### 4. Harden before real clients

- `GET/POST /api/pro/repos` and `POST /api/pro/complia` take `companyId` from the request and
  there's no session to check (marked with `lazy:`). Once there's auth, pull it from the
  session instead. Neither one accepts a loose `installationId` or repo anymore: everything
  is derived from the company.
- The callback's `state` is already HMAC-signed (`GITHUB_STATE_SECRET`), so no one
  can associate an installation with someone else's company. Once auth exists, add
  session verification as a second layer.
