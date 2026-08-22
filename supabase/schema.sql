create table norms (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'suin' | 'dian' | 'superfinanciera' | 'sic' | 'seed'
  external_id text unique not null,        -- id de la norma en la fuente
  country text not null default 'CO',
  title text not null,
  issuer text,
  norm_type text,                          -- ley | decreto | resolucion | circular
  published_at date,
  url text,
  raw_text text,
  -- resultado de estructuración LLM (null hasta analizar):
  summary text,
  sectors text[] default '{}',
  company_types text[] default '{}',
  obligations jsonb default '[]',          -- [{action, deadline}]
  severity text,                           -- info | low | medium | high
  analyzed_at timestamptz
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  -- auth es Clerk, no Supabase Auth: la empresa cuelga de la organización de Clerk,
  -- no de un usuario. clerk_user_id registra quién guardó el último cambio.
  clerk_org_id text unique,
  clerk_user_id text,
  name text not null,
  company_type text not null,              -- 'SAS' | 'SA' | 'LTDA' | 'persona natural'
  sectors text[] not null default '{}',
  channels jsonb not null default '[]',    -- [{type, min_severity?, config}] — ver ChannelConfig en types.ts
  github_repo text,                        -- 'owner/repo' (PRO)
  reviewer_github text,                    -- username del Tech Lead revisor (PRO)
  github_installation_id bigint,           -- instalación de la GitHub App; null = fallback a GITHUB_TOKEN (PRO)
  created_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  norm_id uuid references norms not null,
  impact text not null,
  recommendation text not null,
  pr_url text,                             -- null hasta que PRO abre PR
  created_at timestamptz default now(),
  unique (company_id, norm_id)
);

-- Sin sesión de Supabase Auth (el login es Clerk), así que no hay auth.uid() con el
-- que escribir una policy por fila. RLS queda encendida como cierre por defecto —
-- ninguna key de Supabase la atraviesa — y toda lectura/escritura de companies/alerts
-- pasa por el server (service role) validando organización y rol contra Clerk.
alter table companies enable row level security;
alter table alerts enable row level security;
alter table norms enable row level security;
create policy "norms are public" on norms for select using (true);
