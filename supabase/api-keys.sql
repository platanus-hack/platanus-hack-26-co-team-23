create table api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  clerk_user_id text not null,       -- quién la generó
  name text not null,                -- etiqueta libre ("CI de Acme", "agente interno")
  key_prefix text not null,          -- primeros chars visibles (cai_a1b2c3)
  key_hash text not null unique,     -- sha256 hex de la key completa; la key cruda nunca se persiste
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Sin sesión de Supabase Auth aquí tampoco: mismo patrón que companies/alerts,
-- RLS encendida como cierre por defecto, todo acceso pasa por admin.ts
-- validando organización/rol contra Clerk en el server.
alter table api_keys enable row level security;
