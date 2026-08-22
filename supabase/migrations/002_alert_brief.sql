-- Contenido del aviso (qué cambió, por qué te afecta, qué pasa si no haces nada, pasos).
-- Se genera una vez por alerta para que todos los canales y la guía en PDF digan lo mismo.
alter table alerts add column if not exists brief jsonb;
