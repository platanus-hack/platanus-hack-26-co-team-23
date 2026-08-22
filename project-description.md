# complAI — la IA que vigila la ley por tu empresa

## El problema

En Colombia el Estado publica **~4 normas nuevas cada día** (+104% vs pre-pandemia). Esa
normativa vive en PDFs y portales de los 90s que ningún software puede leer. El resultado:

- Una empresa dedica **5.237 horas/año** a trámites y cumplimiento — más de 2 empleados de
  tiempo completo.
- **El 45% de las empresas no se entera** de los cambios legislativos de su sector… hasta
  que llega la multa. El desconocimiento normativo es causa documentada de cierre de pymes.

## La solución

complAI convierte la normativa colombiana en un **agente que trabaja para tu empresa**:

1. **Ingesta multi-fuente diaria**: SUIN-Juriscol (API de datos abiertos), Normograma DIAN
   (texto completo de resoluciones), circulares de la Superfinanciera y repositorio de la
   SIC — normalizado todo a un solo esquema.
2. **Estructuración con IA**: cada norma se convierte en dato — qué cambia, a quién obliga,
   qué obligaciones concretas crea (con deadline) y qué tan grave es incumplirla.
3. **Matching por perfil**: configuras tu empresa (tipo de sociedad + sectores) y complAI
   cruza cada norma nueva contra tu perfil.
4. **Alertas donde tú vivas** (plan Plus): Slack, Google Chat, Teams, Discord, email,
   **WhatsApp**, y para normas críticas, **una llamada de un agente de voz** que te lee la
   norma. Cada alerta dice: *qué cambió, cómo te afecta, qué hacer*.
5. **Cumplimiento en código** (plan PRO): el agente analiza tu repositorio en GitHub,
   encuentra dónde tu software incumple la nueva norma y **abre un Pull Request con el
   cambio propuesto**, asignando como revisor al Tech Lead responsable. complAI propone —
   el humano siempre aprueba.

## Acceso para agentes (track ACCESS)

Todo el corpus estructurado queda expuesto de dos formas para que **cualquier agente de IA**
lo consulte:

- **MCP server HTTP** (`/api/mcp`) con tools `buscar_normas` y `normas_por_sector`.
- **Paquete npm `complai-mcp`**: cualquier persona conecta la normativa colombiana a Claude
  Desktop, Cursor o su agente con una línea: `npx -y complai-mcp`.

Hoy ningún agente puede responder con confianza *"¿qué norma me cambió esta semana?"* en
LatAm. complAI es esa infraestructura — el equivalente al [MCP de GovInfo](https://www.govinfo.gov/features/mcp-public-preview)
que el gobierno de EE.UU. acaba de lanzar, pero para Colombia y diseñado para escalar a la
región (el pipeline es un adaptador por fuente: agregar Chile = agregar LeyChile).

## Arquitectura

Next.js 15 + Supabase (Postgres + Google SSO) + Claude API (estructuración con tool use
forzado, JSON válido garantizado) + Vercel. Patrón simétrico de adapters: fuentes de
entrada (`SourceAdapter`) y canales de salida (`ChannelAdapter`) — un contrato, un archivo
por implementación, aislamiento de fallos. Agregar una fuente o un canal nuevo es 1 archivo
+ 1 línea.

**En la demo verás datos reales**: 60+ normas vivas ingestadas de las 4 fuentes oficiales y
analizadas — incluyendo resoluciones DIAN de 2026 clasificadas por sector con sus
obligaciones extraídas.
