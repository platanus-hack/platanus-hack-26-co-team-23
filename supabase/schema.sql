create table norms (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'suin' | 'dian' | 'superfinanciera' | 'sic' | 'seed'
  external_id text unique not null,        -- id of the norm at the source
  country text not null default 'CO',
  title text not null,
  issuer text,
  norm_type text,                          -- ley | decreto | resolucion | circular
  published_at date,
  url text,
  raw_text text,
  -- LLM structuring result (null until analyzed):
  summary text,
  sectors text[] default '{}',
  company_types text[] default '{}',
  obligations jsonb default '[]',          -- [{action, deadline}]
  severity text,                           -- info | low | medium | high
  analyzed_at timestamptz
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  -- auth is Clerk, not Supabase Auth: the company hangs off the Clerk organization,
  -- not a user. clerk_user_id records who saved the last change.
  clerk_org_id text unique,
  clerk_user_id text,
  name text not null,
  company_type text not null,              -- 'SAS' | 'SA' | 'LTDA' | 'persona natural'
  sectors text[] not null default '{}',
  channels jsonb not null default '[]',    -- [{type, min_severity?, config}] — see ChannelConfig in types.ts
  github_repo text,                        -- 'owner/repo' (PRO)
  reviewer_github text,                    -- reviewing Tech Lead's username (PRO)
  github_installation_id bigint,           -- GitHub App installation; null = fallback to GITHUB_TOKEN (PRO)
  created_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  norm_id uuid references norms not null,
  impact text not null,
  recommendation text not null,
  pr_url text,                             -- null until PRO opens a PR
  created_at timestamptz default now(),
  unique (company_id, norm_id)
);

-- No Supabase Auth session (login is Clerk), so there's no auth.uid() to write a
-- per-row policy against. RLS stays on as a default lockdown — no Supabase key
-- bypasses it — and all reads/writes to companies/alerts go through the server
-- (service role) validating organization and role against Clerk.
alter table companies enable row level security;
alter table alerts enable row level security;
alter table norms enable row level security;
create policy "norms are public" on norms for select using (true);
