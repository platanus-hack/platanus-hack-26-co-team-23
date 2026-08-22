-- The base schema is already applied on Supabase: this migration just adds the
-- column without recreating anything. Run in the project's SQL editor.
alter table companies add column if not exists github_installation_id bigint;
