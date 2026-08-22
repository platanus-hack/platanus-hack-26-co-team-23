# complai-mcp

Normativa colombiana estructurada para agentes de IA — resoluciones DIAN, circulares de la
Superfinanciera, normativa SIC y el inventario SUIN-Juriscol, analizadas y clasificadas por
[complAI](https://complai-co.vercel.app).

## Uso

**Claude Code:**

```bash
claude mcp add complai -- npx -y complai-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{ "mcpServers": { "complai": { "command": "npx", "args": ["-y", "complai-mcp"] } } }
```

## Tools

- `buscar_normas(query, limit?)` — búsqueda por texto libre en título/resumen.
- `normas_por_sector(sector, limit?)` — normativa reciente que afecta a un sector
  (fintech, salud, alimentos, transporte, construccion, comercio, tecnologia,
  datos-personales, laboral-general, tributario-general).

Cada norma incluye: título, emisor, tipo, fecha, resumen, obligaciones concretas (con
deadline), severidad y link a la fuente oficial.

## Config

- `COMPLAI_API_URL` — override del backend (default: producción de complAI).

---

Hecho en Platanus Hack 26 · Bogotá — team ComplAI-Crew.
