-- PRO tier demo data: a company connected to the facturador-demo repo + an alert
-- to trigger the compliance PR against.
--
-- Prerequisite: at least one user in auth.users.
-- If there isn't one, create it in the dashboard: Authentication → Users → Add user
-- (email + password, checking "Auto Confirm User").

-- 1. GitHub App column (idempotent).
alter table companies add column if not exists github_installation_id bigint;

-- 2. Demo company + alert, in a single run.
with u as (
  select id from auth.users order by created_at limit 1
), c as (
  insert into companies (
    owner_user_id, name, company_type, sectors, channels,
    github_repo, reviewer_github, github_installation_id
  )
  select
    u.id,
    'Facturador Demo SAS',
    'SAS',
    array['tecnologia', 'tributario-general'],
    '[]'::jsonb,
    'ComplAI-Crew/facturador-demo',
    'alejocas17',              -- ⚠️ anyone EXCEPT the token owner: GitHub won't let you self-assign a review
    155641303                  -- installation_id of the GitHub App on ComplAI-Crew
  from u
  returning id
)
insert into alerts (company_id, norm_id, impact, recommendation)
select
  c.id,
  'bfdde591-5e57-4b7e-9745-1b5ec4fead4d',  -- Resolución DIAN — nuevos campos obligatorios en factura electrónica
  'La generación del XML UBL 2.0 en src/invoice.ts no incluye los campos que la resolución vuelve obligatorios, así que las facturas serían rechazadas en la validación previa de la DIAN.',
  'Agregar los campos exigidos al XML de factura y validar contra el XSD antes de enviar.'
from c
returning id as alert_id;
