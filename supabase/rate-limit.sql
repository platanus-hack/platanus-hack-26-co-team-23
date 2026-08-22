-- Rate limiting backed by Postgres (fixed window). Funciona across-instances en
-- Vercel serverless — un Map en memoria NO (cada invocación puede caer en otra
-- instancia). Correr en el SQL Editor (idempotente).
create table if not exists rate_limit_hits (
  bucket text not null,           -- "key:<sha256>" o "ip:<ip>"
  window_start bigint not null,   -- epoch (segundos) del inicio de la ventana
  count int not null default 0,
  primary key (bucket, window_start)
);

-- Incrementa y devuelve el conteo de la ventana actual, atómico (un solo upsert).
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
  -- limpieza best-effort de ventanas viejas (barata: solo de este bucket)
  delete from rate_limit_hits where bucket = p_bucket and window_start < v_window;
  return v_count;
end;
$$ language plpgsql;
