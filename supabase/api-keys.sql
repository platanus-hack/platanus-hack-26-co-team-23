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
