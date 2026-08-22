# Anteproyecto — complAI

**Platanus Hack 2026 · Track: ACCESS · Equipo: Alejandro Castillo et al.**
**One-liner:** *La normativa colombiana convertida en un agente que vigila la ley por tu empresa — y en el tier PRO, abre el PR que te pone en cumplimiento.*

> Nombre decidido: **complAI** (comply + AI — *"tu empresa, siempre complAI-nt"*).
> Paquete npm: `complai-mcp`.

---

## 1. Resumen ejecutivo

Los Estados de LatAm publican normativa a un ritmo que ninguna empresa puede seguir
manualmente: **Colombia emitió 1.321 normas en 2025 — casi 4 por día — un 104% más que
antes de la pandemia**. Esa normativa vive en PDFs y portales sin API pensados para humanos,
no para software. El resultado: las empresas queman **5.237 horas/año** (más de 2 empleados
de tiempo completo) en trámites y cumplimiento, y aun así **el 45% no se entera de los
cambios legislativos de su sector** — y paga multas, o cierra.

**complAI** ingesta la normativa colombiana diariamente (Diario Oficial + SUIN-Juriscol),
la estructura con IA, la cruza contra el **perfil de cada empresa cliente** (tipo de empresa,
sector, obligaciones), y entrega:

- **Plus:** alertas accionables por el canal que la empresa designe — Slack, Google Chat,
  Microsoft Teams, Discord, email, **WhatsApp (vía Kapso)** e incluso **una llamada de un
  agente de voz (Retell AI) para normas críticas**: *qué cambió, cómo te afecta, qué hacer*.
- **PRO:** además, un agente analiza el **codebase** del cliente, identifica dónde el
  software incumple la nueva norma, **abre un Pull Request** con los cambios propuestos y
  lo asigna a un **revisor responsable** (p. ej. el Tech Lead dueño de esa normativa),
  que aprueba o rechaza.

Arquitectura diseñada país-agnóstica: el pipeline de ingesta es un adaptador por fuente,
así que escalar a Chile, México o Perú es agregar adaptadores, no reescribir el producto.

---

## 2. El problema (con datos)

### 2.1 La ley crece más rápido de lo que cualquier humano puede leer

| Dato | Fuente |
|---|---|
| Colombia emitió **1.321 normas en 2025 (~4/día)**, +104% vs pre-pandemia, +85% vs 2022 | SUIN, citado en estudio del Adam Smith Center ([El Nuevo Siglo](https://www.elnuevosiglo.com.co/economia/cada-empresa-destina-5237-horas-al-ano-en-tramites-que-frenan-la-competitividad)) |
| El acervo normativo colombiano acumula **87.392 normas + 13.596 sentencias** | [SUIN-Juriscol, MinJusticia](https://www.suin-juriscol.gov.co/index.html) |
| Globalmente se pasó de **10 cambios regulatorios/día (2008) a 200+/día (2016)** | [Thomson Reuters Cost of Compliance](https://legal.thomsonreuters.com/en/insights/articles/cost-compliance-changing-world-regulation) |

No es solo volumen: es **dispersión**. Leyes, decretos, resoluciones y circulares salen de
docenas de emisores (Congreso, ministerios, DIAN, superintendencias, Banrep…) sin un feed
unificado por sector.

### 2.2 Enterarse cuesta — hoy es trabajo humano

- Una empresa colombiana dedica **5.237 horas/año** a trámites y cumplimiento — en un
  tejido de microempresas, ~**20% del personal** dedicado a esto
  ([El Nuevo Siglo / Adam Smith Center](https://www.elnuevosiglo.com.co/economia/cada-empresa-destina-5237-horas-al-ano-en-tramites-que-frenan-la-competitividad)).
- **Más de un tercio de las firmas gasta ≥1 día completo por semana** solo rastreando y
  analizando cambio regulatorio ([Thomson Reuters Cost of Compliance 2017](https://legal.thomsonreuters.com/en/insights/articles/cost-of-compliance-report-2017-is-there-a-new-risk-approach)).
- La OCDE documenta la carga administrativa regulatoria como freno estructural de
  competitividad en [Colombia](https://www.oecd.org/content/dam/oecd/es/publications/reports/2013/10/regulatory-policy-in-colombia_g1g303ca/9789264201965-es.pdf).

### 2.3 No enterarse cuesta más

- **El 45% de las empresas colombianas no está al tanto de los cambios legislativos de su
  sector**, derivando en multas prevenibles
  ([Soluciones Legales](https://www.solucioneslegales.net.co/blog/problemas-legales-que-enfrenta-una-pyme-por-desconocimiento)).
- El desconocimiento normativo figura entre las causas principales de sanción e incluso
  **cierre de pymes** ([La FM](https://www.lafm.com.co/economia/los-5-errores-legales-que-pueden-llevar-al-cierre-de-una-pyme-en-colombia)).
- El enforcement se endurece: Supersociedades **aumentó 123% las visitas de verificación**
  SAGRILAFT/PTEE e impuso multas por ~$1.300M COP en un solo frente
  ([Holland & Knight](https://www.hklaw.com/en/insights/publications/2024/04/aumentan-las-sanciones-por-incumplimiento-del-sagrilaft)).

### 2.4 El gap de ACCESO — por qué esto es un problema de agentes

- Solo **~53% de los datos públicos evaluados globalmente es machine-readable**
  ([Global Data Barometer](https://globaldatabarometer.org/explore-the-results/)); la
  normativa está entre lo peor: PDFs escaneados, portales sin API, cero estándar
  ([BID — datos abiertos en LatAm](https://publications.iadb.org/en/los-datos-abiertos-en-america-latina-y-el-caribe)).
- Hoy **ningún agente de IA puede responder con confianza "¿qué norma me cambió esta
  semana y qué debo hacer?"** para una empresa colombiana.
- El precedente institucional ya existe: el gobierno de EE.UU. lanzó el
  [GovInfo MCP server](https://www.govinfo.gov/features/mcp-public-preview) para dar a los
  LLMs acceso a su normativa. **En LatAm no hay equivalente.** Ese es el hueco.

---

## 3. La solución

### 3.1 Pipeline (el corazón del producto)

```
[Diario Oficial + SUIN-Juriscol + reguladores]      ← ingesta diaria (adaptadores por fuente)
        │
        ▼
[Estructuración con IA]                              ← por cada norma: emisor, tipo, sector(es)
  qué cambió · a quién aplica · desde cuándo            afectado(s), obligaciones, vigencia,
  qué obligaciones crea/modifica/deroga                 diff contra versión anterior
        │
        ▼
[Matching contra el perfil del cliente]              ← tipo de empresa + sector + stack
        │
        ├──► PLUS: alerta multicanal (patrón adapter — cada canal desacoplado)
        │         Slack · Google Chat · Teams · Discord · email · WhatsApp (Kapso)
        │         · llamada de agente de voz (Retell) solo para normas críticas
        │         "qué cambió · cómo te afecta · qué hacer / cómo mitigar"
        │
        └──► PRO: agente analiza el codebase (GitHub App)
                  → localiza dónde el código incumple
                  → abre PR con los cambios propuestos
                  → asigna al revisor responsable (Tech Lead) para aprobar/rechazar
```

### 3.2 Experiencia de usuario

1. **Login con SSO** (Google / Microsoft — donde ya viven las empresas).
2. **Dashboard de configuración:**
   - Perfil de la empresa: tipo de sociedad, tamaño, sector(es) de industria afectables
     (fintech, salud, logística, alimentos, SaaS…), obligaciones conocidas.
   - Canales de entrega (Plus): Slack, Google Chat, Teams, Discord, email, WhatsApp y
     llamada de voz (esta última reservada para severidad alta — el teléfono solo suena
     cuando de verdad importa).
   - Integración de repos (PRO): GitHub App con permisos de lectura + creación de PRs.
   - **Revisores responsables (PRO):** por área normativa se asigna un dueño
     (p. ej. "protección de datos → Tech Lead X"); todo PR de complAI llega con ese
     revisor pre-asignado. El humano siempre aprueba — complAI propone, nunca mergea.
3. **Feed de normas** filtrado por su perfil, con el análisis de impacto de cada una.

### 3.3 Por qué el humano-en-el-loop del PRO importa

El PR nunca se auto-mergea: el revisor designado es el control de calidad y el
responsable de cumplimiento ante la empresa. Esto convierte a complAI en herramienta del
compliance officer / Tech Lead, no en su reemplazo — clave para la venta B2B y para el
riesgo reputacional (una IA que "cambia tu código por ley" sin humano asusta; una que
"te trae el PR listo para revisar" vende).

---

## 4. Tiers

| | **Free** | **Plus** | **PRO** |
|---|---|---|---|
| Boletín semanal público por sector | ✅ | ✅ | ✅ |
| Alertas en tiempo real a canales propios | — | ✅ | ✅ |
| Análisis de impacto personalizado (perfil de empresa) | — | ✅ | ✅ |
| Recomendación de solución / mitigación | — | ✅ | ✅ |
| Análisis de codebase (dónde incumples) | — | — | ✅ |
| PRs automáticos con cambios propuestos | — | — | ✅ |
| Revisores responsables por área normativa | — | — | ✅ |
| Precio orientativo | $0 | $ | $$$ |

### Free tier — propuesta (ustedes dijeron que no se les ocurría nada)

**Recomendación: sí tener free, pero como embudo, no como producto.**

- **Boletín semanal por sector, público y por email** ("Lo que cambió esta semana en
  normativa fintech/salud/logística en Colombia"). Costo marginal ~cero (ya generamos el
  análisis para los pagos), y es la máquina de adquisición: SEO + shareability + lista de
  correos de exactamente el ICP. El upsell es evidente: *"esto salió hace 5 días; con Plus
  te habría llegado a tu Slack el mismo día con tu análisis de impacto"*.
- Alternativa/complemento: **N consultas/mes al chat de normativa** ("¿qué me aplica si
  soy una SAS fintech?") — genera el momento *aha* antes de pagar.

Si el free no convence, la versión mínima es solo el boletín: es marketing con forma de tier.

### Racional de precios (para el pitch, no comprometerse aún)

- **Plus** compite contra "un abogado leyendo el Diario Oficial" → precio de SaaS por
  empresa/mes (referencia: decenas de USD).
- **PRO** compite contra horas de ingeniería + consultoría de compliance → precio por
  empresa/mes en cientos de USD + posible cobro por repo/asiento. El ROI se cuenta en
  multas evitadas (una sola multa SAGRILAFT supera años de suscripción).

---

## 5. Cliente objetivo (ICP)

**Cabeza de playa: empresas colombianas cuyo cumplimiento pasa por el software** —
fintechs, healthtechs, e-commerce, SaaS con datos personales. Ahí el tier PRO tiene
sentido pleno: normas como protección de datos (Ley 1581/habeas data), facturación
electrónica DIAN, open finance, SAGRILAFT, se traducen en **cambios de código** —
retención de datos, campos de reporte, cifrado, flujos de consentimiento.

**Segunda ola (Plus):** cualquier pyme de sector regulado (alimentos/INVIMA, transporte,
construcción, laboral) donde el valor es enterarse a tiempo, sin componente de código.

---

## 6. Mercado

- RegTech global: **USD 24,2B (2025) → USD 29,2B (2026), CAGR ~21%**
  ([360iResearch](https://www.360iresearch.com/library/intelligence/regtech)); proyección a
  **USD 85B+ hacia 2035** ([Precedence Research](https://www.precedenceresearch.com/regtech-market)).
- El segmento de más rápido crecimiento dentro de regtech es justamente **regulatory
  intelligence** ([Grand View Research](https://www.grandviewresearch.com/industry-analysis/regulatory-technology-market)).
- LatAm es región emergente en adopción regtech, empujada por open finance, pagos
  instantáneos y modernización regulatoria — pero captura solo ~1% de la inversión global
  en IA, señal de espacio abierto ([LatamRepublic](https://www.latamrepublic.com/top-10-emerging-ai-startups-in-latin-america-pre-series-a/)).
- Colombia: 1,7M+ de empresas registradas, mayoría micro y pyme — el segmento que
  demostradamente no puede pagar un departamento de compliance.

---

## 7. Competencia y diferenciación

| Quién | Qué hace | Por qué no es esto |
|---|---|---|
| Newsletters legales de firmas de abogados | Resumen genérico por email | No personalizado, no accionable, no agente-consumible |
| Thomson Reuters / LexisNexis | Regulatory intelligence enterprise | Precio enterprise, foco US/EU, cero LatAm-pyme, sin capa de código |
| MCPs de licitaciones (LicitaLAB, SECOP MCP, Mercado Público MCP) | Compras públicas | Otro dominio — validan la tesis de acceso, no compiten en normativa |
| [GovInfo MCP (EE.UU.)](https://www.govinfo.gov/features/mcp-public-preview) | Acceso agente-nativo a normativa federal US | Valida la tendencia; no existe equivalente LatAm |

**Diferenciadores:**
1. **Normativa → diff → impacto por perfil** (nadie hace change-detection normativo agente-nativo en LatAm).
2. **La capa de código (PRO):** de "te aviso" a "te traigo el PR". Ningún incumbente
   conecta el Diario Oficial con tu repositorio.
3. **Agente-nativo por diseño:** el mismo backend se expone como MCP server — cualquier
   agente corporativo del cliente puede consultar "¿qué me aplica?" (jugada ACCESS pura).

---

## 8. Viabilidad técnica (validada)

**Fuentes de datos Colombia — existen y son accesibles hoy:**

- **[SUIN-Juriscol](https://www.suin-juriscol.gov.co/index.html)** (MinJusticia): 87.392
  normas + 13.596 sentencias, con afectaciones normativas (qué deroga/modifica qué).
- **[Dataset SUIN en datos.gov.co](https://www.datos.gov.co/Justicia-y-Derecho/Lista-de-normas-cargadas-en-el-Sistema-nico-de-Inf/fiev-nid6)** — portal Socrata,
  es decir **API SODA lista para consumir** (mismo stack que ya usan los MCP de SECOP).
- **Normograma DIAN** (`normograma.dian.gov.co`) — verificado: HTML estático con URLs
  predecibles y **texto completo** de cada resolución/circular tributaria (lo que SUIN no
  da). Segunda fuente del hackathon.
- **Circulares Superfinanciera** — verificado: páginas anuales server-rendered
  (`/publicaciones/.../circulares-externas-2026/`); número + asunto de cada circular
  (el PDF completo queda como stretch).
- **SIC** — verificado: repositorio de normatividad Drupal filtrable por tipo
  (resoluciones/circulares) con fichas HTML de texto completo.
- Post-hackathon, mismos adapters: Diario Oficial (Imprenta Nacional), Gestor Normativo
  de Función Pública (~14.200 docs), LeyChile.

**Stack propuesto para las 36h:**

- Ingesta: job diario (cron) → adaptador Colombia → texto plano + metadatos.
- Estructuración: Claude API con salida estructurada (norma → sectores, obligaciones,
  vigencia, resumen de impacto, severidad).
- Matching: perfil del cliente (tags de sector/tipo) × tags de la norma; ranking por LLM.
- App: Next.js + SSO (Google OAuth vía Clerk/Auth0 = "login con SSO" en 1 hora) +
  Postgres. Dashboard de configuración = 3 formularios.
- Entrega Plus: patrón adapter (`ChannelAdapter` + dispatcher con registro) — un archivo por
  canal, desacoplados: webhooks (Slack/Google Chat/Teams/Discord), email (Resend),
  WhatsApp ([Kapso](https://docs.kapso.ai) — ecosistema Platanus, puntos con el jurado) y
  voz saliente ([Retell AI](https://docs.retellai.com/api-references/create-phone-call)).
- PRO demo: GitHub App con un repo de ejemplo → agente (Claude Agent SDK) analiza el repo
  contra la norma estructurada → abre PR → asigna reviewer.
- Bonus ACCESS: exponer el backend como **MCP server** público de solo-lectura, en dos
  superficies: endpoint HTTP (`/api/mcp`) y **paquete npm instalable** (`npx complai-mcp`)
  que cualquier agente agrega en una línea — sin credenciales, solo consume la API pública.

---

## 9. Plan de demo (36 horas)

**Guion de demo (3 min):**
1. Mostrar el Diario Oficial real de ayer — PDF, ilegible, 4 normas nuevas. *"Esto le pasó
   ayer a toda empresa colombiana."*
2. Dashboard: la empresa demo (una fintech SAS) configura sector + canal + repo.
3. Llega la alerta a Slack: norma real reciente, *qué cambió / cómo te afecta / qué hacer*. (Plus)
4. Clic al PR: el agente ya analizó el repo demo y propone el cambio (p. ej. nuevo campo
   de reporte o política de retención), con el Tech Lead asignado como reviewer. (PRO)
5. Cierre: Claude Desktop consultando nuestro MCP: *"¿qué normativa me aplicó este mes?"* (ACCESS)

**Reparto de las 36h (agresivo pero realista):**
- H0–6: ingesta Colombia (SUIN vía SODA + scrape Diario Oficial) + estructuración LLM.
- H6–14: matching + dashboard (SSO, perfil, canales) + entrega a Slack.
- H14–26: flujo PRO end-to-end sobre 1 repo demo con 1–2 normas curadas.
- H26–32: MCP server + pulir demo.
- H32–36: pitch, deck, ensayo.

**Truco de demo:** curar de antemano 2–3 normas reales recientes con impacto claro en
código, para que el flujo PRO luzca determinista en vivo.

---

## 10. Escalabilidad a más países (diseño, no promesa vacía)

- El pipeline es **fuente-agnóstico**: cada país = un paquete de adaptadores de ingesta;
  estructuración, matching, entrega y capa de código no cambian.
- Chile es el siguiente natural: **LeyChile tiene API abierta** y el Diario Oficial
  chileno publica índices estructurados — menor costo de adaptación que Colombia.
- El esquema interno de "norma estructurada" se define desde el día 1 con campo `country`
  y taxonomía de sectores compartida.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alucinación en el análisis de impacto | Toda alerta cita la norma fuente con link + texto original; el análisis es "borrador para el responsable", nunca consejo legal definitivo (disclaimer) |
| PR incorrecto en PRO | Humano-en-el-loop obligatorio: reviewer asignado, complAI jamás mergea |
| Responsabilidad legal ("no me avisaste") | ToS: herramienta de monitoreo, no asesoría jurídica; complementa, no reemplaza, al abogado |
| Calidad/latencia de las fuentes públicas | Doble fuente (Diario Oficial + SUIN) con reconciliación; alertas de "fuente caída" |
| El clasificador de sectores se equivoca | Feedback loop en la alerta ("¿te aplicaba? 👍👎") — mejora el matching y da métrica de precisión para inversionistas |

---

## 12. El pitch

### Elevator (30 s)

> En Colombia el Estado publica **4 normas nuevas cada día**. Las empresas gastan **más de
> dos empleados de tiempo completo** en cumplimiento y aun así **el 45% no se entera** de
> los cambios que le aplican — y paga multas, o cierra. **complAI** convierte el Diario
> Oficial en un agente: monitorea la normativa, te avisa en tu Slack qué cambió y cómo te
> afecta, y en el plan PRO analiza tu código y **te abre el Pull Request que te pone en
> cumplimiento**, listo para que tu Tech Lead lo apruebe. Empezamos por Colombia; la
> arquitectura ya está lista para LatAm.

### Estructura del pitch de 3 minutos

1. **Hook (20 s):** mostrar un PDF real del Diario Oficial de ayer. "¿Alguien puede
   decirme si esto afecta a su empresa? Exacto. Nadie puede. Y salieron 4 ayer."
2. **Problema (40 s):** las 3 cifras — 4 normas/día (+104%), 5.237 horas/año, 45% no se
   entera. "El cumplimiento en LatAm es un impuesto invisible pagado en horas humanas y multas."
3. **Solución + demo (80 s):** el flujo en vivo (alerta Slack → PR con reviewer → consulta MCP).
4. **Por qué ahora / por qué nosotros (30 s):** GovInfo MCP valida la tendencia y LatAm
   está vacío; regtech crece 21% anual y regulatory intelligence es su segmento más
   caliente; el equipo construye integraciones de agentes y compliance fintech a diario.
5. **Modelo y cierre (10 s):** Plus para enterarte, PRO para cumplir. "La ley ya es
   machine-readable. Solo que nadie la había conectado."

---

## 13. Fuentes

- [El Nuevo Siglo — 5.237 horas/año en trámites; SUIN: 1.321 normas en 2025 (+104%)](https://www.elnuevosiglo.com.co/economia/cada-empresa-destina-5237-horas-al-ano-en-tramites-que-frenan-la-competitividad)
- [SUIN-Juriscol (MinJusticia) — 87.392 normas, 13.596 sentencias](https://www.suin-juriscol.gov.co/index.html)
- [Dataset SUIN-Juriscol en datos.gov.co (API Socrata)](https://www.datos.gov.co/Justicia-y-Derecho/Lista-de-normas-cargadas-en-el-Sistema-nico-de-Inf/fiev-nid6)
- [Thomson Reuters — Cost of Compliance (200+ cambios regulatorios/día)](https://legal.thomsonreuters.com/en/insights/articles/cost-compliance-changing-world-regulation)
- [Thomson Reuters — Cost of Compliance 2017 (⅓ de firmas gasta ≥1 día/semana rastreando)](https://legal.thomsonreuters.com/en/insights/articles/cost-of-compliance-report-2017-is-there-a-new-risk-approach)
- [Soluciones Legales — 45% de empresas no se entera de cambios legislativos](https://www.solucioneslegales.net.co/blog/problemas-legales-que-enfrenta-una-pyme-por-desconocimiento)
- [La FM — errores legales que llevan al cierre de pymes](https://www.lafm.com.co/economia/los-5-errores-legales-que-pueden-llevar-al-cierre-de-una-pyme-en-colombia)
- [Holland & Knight — multas SAGRILAFT/PTEE, +123% visitas de verificación](https://www.hklaw.com/en/insights/publications/2024/04/aumentan-las-sanciones-por-incumplimiento-del-sagrilaft)
- [OCDE — política regulatoria en Colombia](https://www.oecd.org/content/dam/oecd/es/publications/reports/2013/10/regulatory-policy-in-colombia_g1g303ca/9789264201965-es.pdf)
- [Global Data Barometer — 53% de datos machine-readable](https://globaldatabarometer.org/explore-the-results/)
- [BID — datos abiertos en América Latina y el Caribe](https://publications.iadb.org/en/los-datos-abiertos-en-america-latina-y-el-caribe)
- [GovInfo MCP server (precedente EE.UU.)](https://www.govinfo.gov/features/mcp-public-preview)
- [360iResearch — RegTech USD 24,2B → 29,2B, CAGR 21%](https://www.360iresearch.com/library/intelligence/regtech)
- [Precedence Research — RegTech USD 85B a 2035](https://www.precedenceresearch.com/regtech-market)
- [Grand View Research — regulatory intelligence, segmento de mayor crecimiento](https://www.grandviewresearch.com/industry-analysis/regulatory-technology-market)
- [Libertad y Desarrollo — inflación legislativa (Chile)](https://lyd.org/opinion/2019/05/columna-de-natalia-gonzalez-en-el-mercurio-abordando-la-inflacion-legislativa/)

---

*Caveat de datos: la cifra del 45% proviene de una fuente secundaria (blog legal
colombiano) — usable en pitch, pero las cifras estrella deben ser las 5.237 horas/año y el
+104% de inflación normativa, que tienen respaldo de estudio citado en prensa. Verificar el
dato del SUIN directamente en datos.gov.co antes de la final.*
