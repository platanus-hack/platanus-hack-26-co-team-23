# complAI — la IA que vigila la ley por tu empresa

## El problema

En Colombia el Estado publica **~4 normas nuevas cada día** (+104% vs pre-pandemia), en PDFs
y portales que ningún software puede leer. El resultado:

- Una empresa dedica **5.237 horas/año** a trámites y cumplimiento — más de 2 empleados de
  tiempo completo.
- **El 45% de las empresas no se entera** de los cambios de su sector… hasta que llega la
  multa. El desconocimiento normativo es causa documentada de cierre de pymes.

## La solución

complAI convierte la normativa colombiana en un **agente que trabaja para tu empresa**:

1. **Ingesta multi-fuente**: SUIN-Juriscol, Normograma DIAN (texto completo), circulares de
   la Superfinanciera, repositorio de la SIC, la Corte Constitucional y los **proyectos de ley
   del Congreso** (Cámara de Representantes) — todo normalizado a un solo esquema.
2. **Estructuración con IA**: cada norma se vuelve dato — qué cambia, a quién obliga, qué
   obligaciones concretas crea (con plazo) y qué tan grave es incumplirla.
3. **Matching por perfil**: registras tu empresa (tipo de sociedad + sectores) y complAI
   cruza cada norma nueva contra tu perfil — solo te llega lo que de verdad te aplica.
4. **Alertas donde vivas** (plan Plus): Slack, Google Chat, Teams, Discord, email, **WhatsApp**
   y, para normas críticas, **una llamada de un agente de voz conversacional** que te lee la
   norma. Cada alerta trae un brief accionable — *qué cambió, por qué te afecta, qué hacer,
   con qué plazo* — más una guía en PDF.
5. **Cumplimiento en código** (plan PRO): el agente analiza tu repositorio en GitHub,
   encuentra dónde tu software incumple la nueva norma y **abre un Pull Request con el fix**,
   asignado a tu Tech Lead como revisor. complAI propone — el humano siempre aprueba.
6. **Radar proactivo — "En trámite"**: complAI no solo reacciona a lo que ya es ley; también
   trae los **proyectos de ley que aún se están debatiendo** en el Congreso, para que tu
   empresa se adelante a lo que viene. Cada proyecto se trabaja como un post: tu equipo deja
   su **postura (a favor / en contra)**, privada por organización — de la alerta reactiva a la
   incidencia proactiva.

## Acceso para agentes (track ACCESS)

Todo el corpus estructurado queda expuesto para que **cualquier agente de IA** lo consulte,
en dos superficies:

- **MCP server HTTP** (`/api/mcp`) y **paquete npm `complai-mcp`** — se conecta con una línea:
  `claude mcp add complai --env COMPLAI_API_KEY=... -- npx -y complai-mcp`.
- **6 tools**, incluidos los que ningún buscador jurídico ofrece: `cambios_recientes`
  (¿qué cambió esta semana?), `normas_que_me_aplican` (matching contra el perfil de una
  empresa) y `plan_remediacion_codigo` (de la norma al plan de cambios en el código).

Hoy ningún agente puede responder con confianza *"¿qué norma me cambió esta semana y qué
hago?"* en LatAm. complAI es esa infraestructura — el equivalente al
[MCP de GovInfo](https://www.govinfo.gov/features/mcp-public-preview) de EE.UU., pero para
Colombia y diseñado para escalar a la región (agregar un país = agregar un adaptador de fuente).

## Arquitectura

Next.js 15 · Supabase (Postgres) · Clerk (auth por organización) · Claude API (estructuración
con tool use forzado, JSON garantizado) · Vercel. Patrón simétrico de adapters —
`SourceAdapter` (entrada) y `ChannelAdapter` (salida): un contrato, un archivo por
implementación, aislamiento de fallos. Agregar una fuente o un canal es 1 archivo + 1 línea.
El match corre en lotes concurrentes; el acceso MCP va protegido con API keys y rate limiting.

**En la demo verás datos reales**: normativa viva ingestada de las fuentes oficiales,
clasificada por sector con sus obligaciones y plazos — y una alerta que llega por WhatsApp,
correo y una llamada telefónica en vivo.
