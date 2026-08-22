# complai-mcp

Normativa colombiana estructurada para agentes de IA — resoluciones DIAN, circulares de la
Superfinanciera, normativa SIC y el inventario SUIN-Juriscol, analizadas y clasificadas por
[complAI](https://complai-co.vercel.app).

## Uso

Necesitas una API key — genérala gratis en [complai-co.vercel.app/keys](https://complai-co.vercel.app/keys).

**Claude Code:**

```bash
claude mcp add complai --env COMPLAI_API_KEY=cai_tu_key -- npx -y complai-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{ "mcpServers": { "complai": {
  "command": "npx", "args": ["-y", "complai-mcp"],
  "env": { "COMPLAI_API_KEY": "cai_tu_key" }
} } }
```

## Tools

**Consulta**
- `buscar_normas(query, limit?)` — búsqueda por texto libre en título/resumen.
- `normas_por_sector(sector, limit?)` — normativa reciente que afecta a un sector.

**Diferenciadores** (lo que un buscador jurídico no hace)
- `cambios_recientes(desde?, sector?, severidad_min?, limit?)` — el feed de "¿qué cambió
  esta semana?".
- `normas_que_me_aplican(tipo_empresa, sectores[], severidad_min?, limit?)` — matching real
  contra el perfil de una empresa, no búsqueda por tema.
- `obligaciones_con_deadline(sector?, antes_de?, limit?)` — calendario de cumplimiento:
  obligaciones concretas con fecha límite, ordenadas por deadline.
- `plan_remediacion_codigo(norma, stack?)` — de la norma al código: plan concreto de qué
  componentes tocar para cumplir, con verificación.

Sectores válidos: `fintech, salud, alimentos, transporte, construccion, comercio,
tecnologia, datos-personales, laboral-general, tributario-general`.
Tipos de empresa: `SAS, SA, LTDA, persona natural`.

Cada norma incluye: id, título, emisor, tipo, fecha, resumen, obligaciones (con deadline),
severidad y link a la fuente oficial.

## Config

- `COMPLAI_API_KEY` — tu API key (requerida; se genera en el dashboard).
- `COMPLAI_API_URL` — override del backend (default: producción de complAI).

---

Hecho en Platanus Hack 26 · Bogotá — team ComplAI-Crew.
