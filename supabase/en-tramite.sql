-- Feature "en trámite": proyectos de ley (proactivos) + votación privada por empresa.
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (IF NOT EXISTS).

-- 1) Estado de la norma. Todo lo existente queda 'vigente'; el scraper del Congreso marca 'en_tramite'.
alter table public.norms
  add column if not exists status text not null default 'vigente'
  check (status in ('vigente', 'en_tramite'));

-- Listar la vista /en-tramite es un filtro por status → un índice lo hace barato.
create index if not exists norms_status_idx on public.norms (status);

-- 2) Votos "tipo Reddit" sobre un proyecto de ley, privados por organización (Clerk).
--    Un voto por usuario y norma (cambiable): la UNIQUE permite el upsert-toggle.
create table if not exists public.norm_votes (
  id            uuid primary key default gen_random_uuid(),
  norm_id       uuid not null references public.norms (id) on delete cascade,
  clerk_org_id  text not null,
  clerk_user_id text not null,
  vote          text not null check (vote in ('favor', 'contra')),
  created_at    timestamptz not null default now(),
  unique (norm_id, clerk_user_id)
);

-- El agregado ("a favor N / en contra M") se lee por norma dentro de una organización.
create index if not exists norm_votes_norm_org_idx on public.norm_votes (norm_id, clerk_org_id);
