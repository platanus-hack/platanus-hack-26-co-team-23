-- Seed: 3 curated norms with a clear impact on code, so every track can
-- work without waiting on real ingestion. BEFORE THE DEMO: replace raw_text with
-- the real text of each norm (look them up in the DIAN / SFC Normograma).
insert into norms (source, external_id, title, issuer, norm_type, published_at, url, raw_text,
  summary, sectors, company_types, obligations, severity, analyzed_at) values
('seed', 'seed-001', 'Resolución DIAN — nuevos campos obligatorios en factura electrónica',
 'DIAN', 'resolucion', '2026-08-10', 'https://www.dian.gov.co/', 'TEXTO REAL DE LA NORMA AQUÍ',
 'La DIAN exige dos campos adicionales en el XML de factura electrónica a partir de octubre 2026.',
 array['fintech','comercio','tecnologia'], array['SAS','SA','LTDA'],
 '[{"action":"Agregar campos al XML de facturación","deadline":"2026-10-01"}]', 'high', now()),
('seed', 'seed-002', 'Circular Superfinanciera — retención de logs de transacciones',
 'Superfinanciera', 'circular', '2026-08-12', 'https://www.superfinanciera.gov.co/', 'TEXTO REAL AQUÍ',
 'Entidades vigiladas deben retener logs de transacciones 5 años con integridad verificable.',
 array['fintech'], array['SAS','SA'],
 '[{"action":"Extender retención de logs a 5 años","deadline":"2026-12-01"}]', 'high', now()),
('seed', 'seed-003', 'Decreto — consentimiento explícito para tratamiento de datos biométricos',
 'MinTIC', 'decreto', '2026-08-15', 'https://www.mintic.gov.co/', 'TEXTO REAL AQUÍ',
 'Todo tratamiento de datos biométricos requiere consentimiento explícito y revocable.',
 array['datos-personales','tecnologia','salud','fintech'], array['SAS','SA','LTDA','persona natural'],
 '[{"action":"Agregar flujo de consentimiento biométrico","deadline":null}]', 'medium', now());
