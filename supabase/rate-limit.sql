-- Rate limiting backed by Postgres (fixed window). Works across instances on
-- Vercel serverless — an in-memory Map does NOT (each invocation can land on a
-- different instance). Run in the SQL Editor (idempotent).
create table if not exists rate_limit_hits (
  bucket text not null,           -- "key:<sha256>" or "ip:<ip>"
  window_start bigint not null,   -- epoch (seconds) of the window's start
  count int not null default 0,
  primary key (bucket, window_start)
);

-- Increments and returns the current window's count, atomically (a single upsert).
create or replace function check_rate_limit(p_bucket text, p_limit int, p_window int)
returns int as $$
declare
  v_window bigint := (floor(extract(epoch from now()) / p_window) * p_window)::bigint;
  v_count int;
begin
  insert into rate_limit_hits (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
  do update set count = rate_limit_hits.count + 1
  returning count into v_count;
  -- best-effort cleanup of old windows (cheap: only this bucket)
  delete from rate_limit_hits where bucket = p_bucket and window_start < v_window;
  return v_count;
end;
$$ language plpgsql;
