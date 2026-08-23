-- Free citizen tier: one row per cédula scan.
-- Holds personal data (cédula, EPS, régimen) in clear text by product decision.
-- Ley 1581: no anon access — service role only, so the public endpoint is the only door.
create table if not exists citizen_scans (
  id uuid primary key default gen_random_uuid(),
  cedula text not null,
  profile jsonb not null,
  sources jsonb not null,
  created_at timestamptz default now()
);
create index if not exists citizen_scans_cedula_idx on citizen_scans (cedula);
alter table citizen_scans enable row level security;
