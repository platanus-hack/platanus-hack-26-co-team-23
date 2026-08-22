# complia-mcp

Normativa colombiana estructurada para agentes de IA — resoluciones DIAN, circulares de la
Superfinanciera, normativa SIC y el inventario SUIN-Juriscol, analizadas y clasificadas por
[CumplIA](https://complia-weld.vercel.app).

## Uso

**Claude Code:**

```bash
claude mcp add complia -- npx -y complia-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{ "mcpServers": { "complia": { "command": "npx", "args": ["-y", "complia-mcp"] } } }
```

## Tools

- `buscar_normas(query, limit?)` — búsqueda por texto libre en título/resumen.
- `normas_por_sector(sector, limit?)` — normativa reciente que afecta a un sector
  (fintech, salud, alimentos, transporte, construccion, comercio, tecnologia,
  datos-personales, laboral-general, tributario-general).

Cada norma incluye: título, emisor, tipo, fecha, resumen, obligaciones concretas (con
deadline), severidad y link a la fuente oficial.

## Config

- `COMPLIA_API_URL` — override del backend (default: producción de CumplIA).

---

Hecho en Platanus Hack 26 · Bogotá — team ComplAI-Crew.
