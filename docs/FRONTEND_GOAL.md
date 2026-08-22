# ComplAI frontend goal (branch `feat/frontend-dashboard`) — iteration 2

> Context for the `frontend-developer` and `frontend-reviewer` subagents.
> This document is the "done" criteria — the developer↔reviewer loop
> runs until EVERYTHING in the "Acceptance criteria" section is ✅.
> Iteration 1 (dashboard shell, `/settings`, `/feed`, `/sign-in`,
> `/sign-up`, Clerk, shadcn) is already done and in a PR. This iteration 2 is a
> feedback round on top of that base — don't repeat or revert what's already done.

## Already done (don't repeat)

- shadcn initialized (base UI, nova preset, Tailwind v4). Components already
  added: button, input, label, checkbox, switch, select, tabs, card,
  badge, separator, toggle/toggle-group, avatar, dropdown-menu, sonner,
  skeleton, textarea, alert, sheet. If a component is missing, add it with
  `pnpm exec shadcn add <name>` (or the shadcn MCP if available) —
  **never hand-write it or copy it from another library.**
- Clerk installed and wired: `ClerkProvider` in `src/app/layout.tsx`,
  `src/proxy.ts` protects `/settings` and `/feed`. Auth is Clerk, **not**
  Supabase Auth — the company hangs off the organization (`clerk_org_id`),
  not a user. Use `auth()` from `@clerk/nextjs/server` (its own
  `orgId`/`userId`/`orgRole`, **never** `sessionClaims.org_id` /
  `sessionClaims.sub` — that already caused a real orphaned-data bug in
  iteration 1, don't repeat it).
- `supabase/schema.sql`: `companies.clerk_org_id` (not `owner_user_id`).
  `src/lib/supabase/admin.ts` is the ONLY Supabase client used
  here (service role) — do not create `src/lib/supabase/server.ts` with
  `@supabase/ssr`/cookies in the Supabase-Auth style, that pattern doesn't apply.
- `src/app/(dashboard)/layout.tsx`, `settings/`, `feed/`, `sign-in/`,
  `sign-up/` already implemented and working against real Supabase.
- The CSS bug that broke ALL of Tailwind's padding/margin utilities is
  already fixed (there was no `@layer` in a reset inherited from the
  scaffold) — if something looks "broken"/unspaced, that's not the issue,
  investigate the real cause before touching `globals.css`.

## Scope of this iteration — feedback to resolve

### 1. Visually indicate required fields in `/settings`

`settings-form.tsx` validates `name` and `company_type` as required (see
`handleSubmit`) but the user has no way to know which fields those are before
the error toast appears. Add a red asterisk (`text-destructive`
or similar, e.g. `<span className="text-destructive">*</span>` after
the `Label` text) on the `Label`s for **"Nombre de la empresa"** and **"Tipo de
sociedad"** (the only two fields currently required by the server
action). Do not mark fields as required if the server action doesn't require them.

### 2. Rebrand: it's "ComplAI", not "CumplAI"

Find and replace **every** visible occurrence of "CumplAI" (and
any leftover "CumplIA") with **"ComplAI"** in the `src/` source code
(`<head>` title, header logo, `/sign-in` and `/sign-up` copy,
`/settings` and `/feed` empty states, any copy).
Use `grep -rn "CumplAI\|CumplIA" src/` to find them all — at
the time of writing there are occurrences in `layout.tsx`, `sign-in/page.tsx`,
`sign-up/page.tsx`, `(dashboard)/layout.tsx`, `(dashboard)/settings/page.tsx`,
`(dashboard)/settings/settings-form.tsx`, `(dashboard)/feed/page.tsx`.
**Do not touch** `.env.example`/`.env.local` or anything related to the
Clerk app name (`app_3IGYo5UOL2tYGSklhjEzgeOveO6`) — that's a shared
external resource, renaming it is not part of this scope.

### 3. The active tab in the header nav isn't distinguishable

In `(dashboard)/layout.tsx`, the nav (**"Alertas"** / **"Configuración"**, desktop
and the mobile `Sheet`) always uses `text-muted-foreground hover:text-foreground`
regardless of which route you're on — there's no way to tell which is
selected. Fix it:

- Extract the nav into a client component (e.g. `src/app/(dashboard)/nav-links.tsx`,
  `"use client"`) that uses `usePathname()` from `next/navigation` to know
  the active route (compare with `startsWith` since `/feed` and `/settings`
  can have subroutes).
- The active link must look clearly different from the inactive ones: for example
  `text-foreground font-medium` + a visual indicator (underline,
  `border-b-2 border-primary`, or a pill with `bg-accent` background) — a subtle
  text-color change alone isn't enough, it needs to be obvious at a glance.
  Apply the same to both the desktop nav and the mobile `Sheet` nav.
- Keep using shadcn components/tokens (don't invent colors outside
  the theme).

### 4 and 5. Design and implement API key generation for the MCP

There's a PR from another track (`ComplAI-Crew/comply#5`, **unmerged**) that already
solves this for a model with Supabase Auth (`auth.uid()`,
`owner_user_id`) — **that model doesn't apply here** (auth here is Clerk).
Use that PR only as a reference for *what* to build (`api_keys` table, SHA-256
hash, visible prefix, revocation, guard on the MCP routes), don't copy
its code as-is (it uses hand-written HTML with no shadcn, and its schema requires
Supabase Auth). Implement the version adapted to Clerk + shadcn:

**Schema** (`supabase/api-keys.sql`, incremental migration — don't rewrite
`schema.sql`, this is a new file to run separately, same as the rest
of the schema; if you have access to the Supabase MCP to apply the migration
directly, use it, otherwise leave the `.sql` ready):

```sql
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  clerk_user_id text not null,       -- who generated it
  name text not null,                -- free-form label ("Acme CI", "internal agent")
  key_prefix text not null,          -- first visible chars (cai_a1b2c3)
  key_hash text not null unique,     -- sha256 hex of the full key; the raw key is never persisted
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- No Supabase Auth session here either: same pattern as companies/alerts,
-- RLS on as a default lockdown, all access goes through admin.ts
-- validating organization/role against Clerk on the server.
alter table api_keys enable row level security;
```

**`src/lib/api-keys.ts`** (new, alongside the other `src/lib/` helpers):
- `generateApiKey()`: creates `raw = "cai_" + randomBytes(24).toString("hex")`,
  returns `{ raw, prefix: raw.slice(0, 10), hash: sha256(raw) }` (use
  `node:crypto`, `createHash("sha256")`).
- `hashApiKey(raw)`: the same sha256 hex, to validate against `key_hash`.
- You don't need to replicate the reference PR's bootstrap `MASTER_API_KEY` —
  that env var doesn't exist in this project, don't invent it.

**`src/app/(dashboard)/keys/page.tsx`** (new route, protected the same way as
`/settings` and `/feed` via `src/proxy.ts` — add `/keys` to the matcher):
Server component: reads `auth()` (orgId/userId/orgRole), looks up `company_id`
by `clerk_org_id` via `admin.ts`, lists that company's keys
(`name`, `key_prefix`, `created_at`, `last_used_at`, `revoked_at`,
ordered by `created_at desc`). Use `Card`/`Table`-like markup with
shadcn components (if `table.tsx` doesn't exist, add it with
`pnpm exec shadcn add table`) — **never** a `<table>` with inline
styles like the reference PR. Only `org:admin` can generate/revoke
(same pattern as `/settings`: if not an admin, read-only view of
the list, with no controls).

**`src/app/(dashboard)/keys/actions.ts`** (Server Actions):
- `createKey(name: string)`: validates `orgRole === 'org:admin'` on the
  server, resolves `company_id` by `clerk_org_id`, generates the key,
  inserts the row, calls `revalidatePath('/keys')`, returns `{ raw }`
  (the raw key) or `{ error }`. The raw key is **only ever returned
  this once** — it can never be read again.
- `revokeKey(id: string)`: validates admin + that the key belongs to the
  active organization's company (don't trust the form's `id` alone),
  sets `revoked_at = now()`.

**`src/app/(dashboard)/keys/create-key-form.tsx`** (client component):
shadcn form (`Input` + `Button`) to generate a named key.
When `createKey` returns `raw`, show it in an `Alert` (shadcn
success/default variant) with copy like "copy it now, it won't be
shown again" — use a copy-to-clipboard button if it's simple to add,
otherwise it's enough for the text to be selectable.

**Nav**: add "API Keys" (→ `/keys`) to the `navItems` array in
`(dashboard)/layout.tsx` (or the new `nav-links.tsx` from item 3).

**Existing MCP routes** (`src/app/api/mcp/route.ts` and
`src/app/api/public/norms/route.ts`): these routes are currently 100% public
with no guard at all, and belong to another track (M5). Adding the API key
guard there is a cross-track behavior change (it could break the demo if
something else is already using them without a key) — **do not touch them** in
this iteration; the guard is ready to use in `src/lib/api-keys.ts`
(`validateApiKey(req)`, which checks the `x-api-key` header or
`Authorization: Bearer cai_...`) so the owner of those routes can plug it in
when it's their turn. Document this explicitly in the final report if you do
this implementation.

### 6. (Already covered) Review `ComplAI-Crew/comply#5`

Already summarized above — it's the reference for item 4/5, not a separate
task.

## Explicitly OUT of scope (do not build)

- Any screen or control to configure theme/appearance.
- Visual polish beyond shadcn: no custom illustrations, gradients,
  or decorative animations.
- Wiring the API key guard inside `/api/mcp` or `/api/public/norms`
  (see note above — cross-track, out of scope for this iteration).
- Real matching, channel dispatcher, repo/PR analysis — not your
  track.

## Acceptance criteria (check off each one; the reviewer verifies them)

- [ ] `pnpm build` finishes with no errors (typecheck included).
- [ ] `pnpm lint` with no errors (and no Prettier diffs if a config exists —
      check first whether one exists before requiring it).
- [ ] The **"Nombre de la empresa"** and **"Tipo de sociedad"** labels in
      `/settings` show a red asterisk (or another clear visual indicator)
      for required fields.
- [ ] Zero occurrences of "CumplAI"/"CumplIA" in `src/` — everything says
      "ComplAI" (`grep -rn "CumplAI\|CumplIA" src/` returns nothing).
- [ ] The active tab in the header nav (desktop and mobile) is clearly
      distinguishable from the inactive ones when navigating between `/feed`
      and `/settings` (and `/keys`).
- [ ] `/keys` exists, protected by `src/proxy.ts`, lists the active
      company's keys, allows generating one (admin only) showing the raw
      key exactly once, and revoking one (admin only).
- [ ] `api_keys` has RLS on and no access bypasses
      `admin.ts`; the raw key is never persisted, only its hash.
- [ ] Every new UI component comes from `src/components/ui/*`
      (shadcn) — no hand-written HTML reinventing inputs/buttons/tables.
- [ ] Visually verified in a real browser (Claude in Chrome, not
      the sandboxed browser): `/settings` shows the asterisks,
      the nav marks the active route, `/keys` generates and revokes a key with
      no console errors. Also tested at ~390px width.
- [ ] Nothing from "Explicitly out of scope" ended up implemented.

Once ALL checks are green, the reviewer confirms it
explicitly in its report and the loop ends.
