# complai-mcp

Colombian regulation structured for AI agents — DIAN resolutions, Superfinanciera
circulars, SIC regulations, and the SUIN-Juriscol inventory, analyzed and classified by
[complAI](https://complai-co.vercel.app).

## Usage

You need an API key — generate one for free at [complai-co.vercel.app/keys](https://complai-co.vercel.app/keys).

**Claude Code:**

```bash
claude mcp add complai --env COMPLAI_API_KEY=cai_your_key -- npx -y complai-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{ "mcpServers": { "complai": {
  "command": "npx", "args": ["-y", "complai-mcp"],
  "env": { "COMPLAI_API_KEY": "cai_your_key" }
} } }
```

## Tools

**Query**
- `buscar_normas(query, limit?)` — free-text search over title/summary.
- `normas_por_sector(sector, limit?)` — recent regulation affecting a sector.

**Differentiators** (what a legal search engine doesn't do)
- `cambios_recientes(desde?, sector?, severidad_min?, limit?)` — the "what changed
  this week?" feed.
- `normas_que_me_aplican(tipo_empresa, sectores[], severidad_min?, limit?)` — real
  matching against a company's profile, not topic search.
- `obligaciones_con_deadline(sector?, antes_de?, limit?)` — compliance calendar:
  concrete obligations with a deadline, ordered by due date.
- `plan_remediacion_codigo(norma, stack?)` — from norm to code: a concrete plan of which
  components to touch to comply, with verification.

Valid sectors: `fintech, salud, alimentos, transporte, construccion, comercio,
tecnologia, datos-personales, laboral-general, tributario-general`.
Company types: `SAS, SA, LTDA, persona natural`.

Each norm includes: id, title, issuer, type, date, summary, obligations (with deadline),
severity, and a link to the official source.

## Config

- `COMPLAI_API_KEY` — your API key (required; generated in the dashboard).
- `COMPLAI_API_URL` — backend override (default: complAI production).

---

Built at Platanus Hack 26 · Bogotá — team ComplAI-Crew.
