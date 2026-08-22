-- Enables Postgres Changes for `alerts` so the dashboard can stream new rows
-- over Supabase Realtime (used by /api/alerts/stream) instead of polling.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'alerts'
  ) then
    alter publication supabase_realtime add table alerts;
  end if;
end $$;
