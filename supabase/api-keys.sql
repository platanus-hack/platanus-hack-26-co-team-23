-- API keys para el acceso MCP / API pública. Correr en el SQL Editor (incremental,
-- no re-correr schema.sql). Solo se persiste el hash — la key se muestra una vez.
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users not null,
  company_id uuid references companies,          -- opcional: null hasta que exista la empresa
  name text not null,                            -- etiqueta ("CI de Acme", "agente interno")
  key_prefix text not null,                      -- primeros chars visibles (cai_a1b2c3)
  key_hash text not null unique,                 -- sha256 hex de la key completa
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table api_keys enable row level security;
create policy "own keys" on api_keys for all
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
