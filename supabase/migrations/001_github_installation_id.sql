-- El schema base ya está aplicado en Supabase: esta migración agrega la columna
-- sin recrear nada. Correr en el SQL editor del proyecto.
alter table companies add column if not exists github_installation_id bigint;
