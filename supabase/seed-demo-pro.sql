-- Datos de demo del tier PRO: empresa conectada al repo facturador-demo + una alerta
-- sobre la que disparar el PR de cumplimiento.
--
-- Prerequisito: al menos un usuario en auth.users.
-- Si no hay ninguno, créalo en el dashboard: Authentication → Users → Add user
-- (email + password, marcando "Auto Confirm User").

-- 1. Columna de la GitHub App (idempotente).
alter table companies add column if not exists github_installation_id bigint;

-- 2. Empresa de demo + alerta, en una sola corrida.
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
    'alejocas17',              -- ⚠️ cualquiera MENOS el dueño del token: GitHub no deja auto-asignarse revisión
    155641303                  -- installation_id de la GitHub App en ComplAI-Crew
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
