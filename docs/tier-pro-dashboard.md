# PRO tier — what's left to wire into the dashboard

Handoff from M4 to **M2** (settings/auth) and **M3** (feed/matching).

The PRO tier engine is done and verified end-to-end
([PR #3 on `facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/3)).
What's left is **UI and wiring**: four items, none bigger than one screen.
Engine details in [`tier-pro.md`](./tier-pro.md).

## What already exists (closed contracts)

Everything derives from the company: **no endpoint accepts `installationId` or
credentials from the request**. Don't add them when calling.

### `GET /api/pro/repos?companyId=…`

```jsonc
// hasn't installed the GitHub App yet
{ "connected": false, "installUrl": "https://github.com/apps/complia-app/installations/new?state=…" }

// already installed
{ "connected": true,
  "selected": "ComplAI-Crew/facturador-demo",   // null if not chosen yet
  "repos": [{ "fullName": "ComplAI-Crew/facturador-demo", "private": true }],
  "manageUrl": "https://github.com/apps/complia-app/installations/new?state=…" }
```

### `POST /api/pro/repos` — `{ companyId, repo }`

`{ ok: true, selected }` · 400 if the company hasn't installed the App or if the
installation doesn't reach that repo.

### `POST /api/pro/complia` — `{ companyId, repo? }`

`{ repo, markdown }` — the proposed `COMPLIA.md`. Takes ~20s. Doesn't commit it: you show it
so the client can copy it to the root of their repo.

### `POST /api/pro/pr` — `{ alertId }`

```jsonc
{ "prUrl": "https://github.com/…/pull/3" }        // draft PR opened, ~35s
{ "skipped": true, "reason": "The circular regulates entities supervised by the SFC…" }  // ~5s
```

`skipped` **is not an error**: the norm doesn't require touching that code. Comes back with a 200.

### `GET /api/pro/github/callback`

Called by GitHub, not by you. Redirects to `/settings` with `?github=ok`, `?github=error`, or
`?installation_id=N` when the installation started from GitHub instead of the button.

### `buildInstallUrl(companyId)` — `src/lib/pro/install-state.ts`

Server-side. Returns the install URL with the signed `state`. **Don't build that URL by
hand**: without the signature the callback discards the association.

---

## 1. Settings — connect GitHub · M2

New screen in `/settings` (the route the callback already redirects to). Three states:

| State | What to show |
|---|---|
| `connected: false` | "Connect GitHub" button → `installUrl` |
| `connected: true`, `selected: null` | `<select>` fed by `repos` → `POST /api/pro/repos` |
| `connected: true`, `selected` | The current repo + "Change repo" and "Manage on GitHub" (`manageUrl`) |

After saving the repo, offer **"Generate COMPLIA.md"** → `POST /api/pro/complia`,
show the markdown in a copyable block and explain that it goes at the root of the repo. It's
optional, but without it the agent picks files in alphabetical order.

On return from the callback, read `?github=ok|error` and show the result.

**`companyId` comes from the session** (`companies.owner_user_id = auth.uid()`), never from
an input or the URL.

## 2. Feed — the button · M3

`src/app/(dashboard)/feed/pr-button.tsx` is already written and handles all five states
(idle, working, done, skipped, error). It just needs to be mounted in `feed/page.tsx`:

```tsx
import { PrButton } from './pr-button'
…
{a.pr_url ? <p>✅ <a href={a.pr_url}>PR de cumplimiento abierto</a></p> : <PrButton alertId={a.id} />}
```

Two things to respect in the design:

- **Takes ~35s.** The button already shows "Analizando tu código…", but if the feed has
  its own spinners, make sure it doesn't look stuck.
- **`skipped` is a normal outcome**, not a failure. The component renders the reason
  exactly as the model returns it; don't treat it as an error.

Show the button only if the company has `github_repo`; otherwise, a link to settings.

## 3. Automatic trigger on match · M3

Today the PR opens manually. The natural trigger is matching: a norm that applies + a
company with GitHub connected. In `/api/cron/match`, right after inserting the alert:

```ts
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

- **Opt-in per company** — `alter table companies add column auto_pr boolean default false`,
  with its switch in settings. Opening PRs on someone's repo without them asking is intrusive.
- **`severity = 'high'` only** — with 64 norms in the DB, without a filter the cron opens dozens of PRs.
- **Don't block the cron** — ~35s per PR. With several companies this needs to move to a queue.

The relevance gate already avoids pointless PRs, but it costs ~5s and one model call
per alert: filtering by severity first saves those calls.

## 4. Close the `companyId` gap · M2, once there's auth

`GET/POST /api/pro/repos` and `POST /api/pro/complia` take `companyId` from the request
because there's no session to check yet (marked with `lazy:` in the code). Once there's auth:

1. Pull `companyId` from the session and remove it from the body/query.
2. In the callback (`src/app/api/pro/github/callback/route.ts`), besides verifying the
   `state` signature, confirm the logged-in user owns that company.

The HMAC signature already prevents someone from associating their installation with
someone else's company; this is the second layer.

---

## What NOT to do

- **Don't pass `installationId` or tokens from the client.** They're derived from the
  company. An `installation_id` is a sequential integer: accepting it from the request
  would let anyone read someone else's repos.
- **Don't build the install URL by hand** — use `buildInstallUrl()`, the `state` is signed.
- **Don't merge PRs from the product.** They come out as drafts on purpose; marking them
  "ready" and merging is a human's job. It's a repo rule.
- **Don't treat `skipped` as an error** in the UI.

## Environment variables

`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, `GITHUB_STATE_SECRET`.
All four must also be set in Vercel. `GITHUB_TOKEN` is a demo fallback only.

Pending Supabase migration: `supabase/migrations/001_github_installation_id.sql`.
