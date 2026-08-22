# Guion de demo — complAI

Platanus Hack 2026 · Track ACCESS · team-23
Producción: **https://complai-co.vercel.app**

> **Regla de oro:** todo lo frágil (llamada, WhatsApp, red) se prepara ANTES. En vivo solo
> se dispara el cron y se muestran cosas que ya sabemos que funcionan. Ten el **video de
> respaldo** grabado en el ensayo por si la red del venue falla.

---

## La narrativa (30s de elevator)

> En Colombia el Estado publica **~4 normas nuevas al día**. Las empresas gastan **más de
> dos empleados de tiempo completo** en cumplimiento y aun así **el 45% no se entera** de lo
> que le aplica — y paga multas, o cierra. **complAI** convierte la normativa en un agente:
> ingesta las fuentes oficiales, cruza cada norma contra el perfil de tu empresa, y te avisa
> por donde vivas — Slack, WhatsApp, incluso **una llamada de un agente de voz** si es
> crítico — con *qué cambió, cómo te afecta y qué hacer*. Y en el plan PRO, **abre el Pull
> Request** que pone tu código en cumplimiento. Todo consultable por cualquier agente de IA
> vía MCP.

---

## Pre-flight (preparar 15 min antes, NO en vivo)

- [ ] **Empresa demo lista** (recomendado: usar una con pocos sectores para no floodear).
      Sugerido: una fintech SAS con sectores `fintech` + canales:
      - Slack o Google Chat (entrega instantánea, visible en pantalla)
      - WhatsApp: `+57...` del presentador
      - Voz: un teléfono **distinto** de `+573168213658` (el `RETELL_FROM_NUMBER`) — si no,
        Retell rechaza `from==to`.
- [ ] **Reabrir ventana de WhatsApp (Kapso):** desde el teléfono destino, enviar CUALQUIER
      mensaje al número del sandbox de Kapso (la ventana de 24h se cuenta desde ese último
      mensaje entrante). Verificar en el dashboard de Kapso que la sesión esté "Active".
- [ ] **Twilio Geo Permissions:** Colombia habilitado (para la voz vía SIP trunk). Trunk
      Retell "verified/active".
- [ ] **Claude Desktop** conectado al MCP: `claude mcp add complai --env COMPLAI_API_KEY=<key> -- npx -y complai-mcp`
- [ ] **Repo demo PRO** restaurado (borrar PRs/branches `complai/*` de ensayos anteriores).
- [ ] **Resetear alertas de la empresa demo** para poder disparar en vivo (ver comandos abajo).
- [ ] Pestañas abiertas: PDF del Diario Oficial de ayer, `/feed`, el canal (Slack/GChat),
      Claude Desktop, el repo demo, el PR de ejemplo.
- [ ] **Video de respaldo** grabado (la llamada + WhatsApp llegando), por si falla la red.

### Comandos de reset (para una corrida limpia en vivo)

```bash
# Variables (de .env.local o del entorno del que corre)
SUPA=https://insghaahzdrwbcsajdzf.supabase.co
KEY=<SUPABASE_SERVICE_ROLE_KEY>
SECRET=<CRON_SECRET>
COMPANY=<id de la empresa demo>

# 1. Borrar sus alertas (para que el match las regenere y dispare)
curl -s -X DELETE "$SUPA/rest/v1/alerts?company_id=eq.$COMPANY" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"

# 2. Disparar el match (crea alerta + despacha a todos los canales, ~15s)
curl -s -X POST -H "Authorization: Bearer $SECRET" \
  https://complai-co.vercel.app/api/cron/match
# → {"alertsCreated":N,"channels":{"slack":..,"whatsapp":..,"voice":..}}
```

---

## Guion (3 minutos)

**1. El gancho (20s)**
Muestra el PDF del Diario Oficial de ayer. *"¿Alguien puede decirme si esto le aplica a su
empresa? Exacto. Nadie puede. Y salieron 4 ayer."*

**2. El problema (30s)**
Las 3 cifras: **4 normas/día (+104%)**, **5.237 horas/año** en cumplimiento, **45% no se
entera**. *"El cumplimiento en LatAm es un impuesto invisible pagado en horas y en multas."*

**3. La solución en vivo — el momento estrella (70s)**
- Corre el reset+match (o ten el terminal listo con el curl).
- En segundos: **la alerta cae en Slack/Google Chat** (léela: *qué cambió · cómo te afecta ·
  qué hacer*), **llega el WhatsApp**, y **suena el teléfono** — pon el altavoz: el agente de
  complAI lee la norma en español. *"Una norma que salió hoy, cruzada contra el perfil de
  esta empresa, entregada por sus canales y con una llamada porque es crítica."*

**4. Del aviso al código — el diferenciador ACCESS (40s)**
- En `/feed`, abre una alerta y muestra el **brief** + el botón/PR.
- Muestra el **Pull Request** que complAI abrió en el repo demo con el fix de cumplimiento,
  asignado al Tech Lead como revisor. *"No te decimos que incumples: te abrimos el PR que te
  pone en cumplimiento. El humano aprueba — complAI nunca mergea."*

**5. Acceso agente-nativo (20s)**
- En Claude Desktop: *"¿qué normativa fintech salió este mes en Colombia y qué debo hacer?"*
- Claude encadena los tools MCP (`cambios_recientes` → `normas_que_me_aplican` →
  `plan_remediacion_codigo`) y responde con normas reales. *"Cualquier agente se conecta con
  una línea: `npx complai-mcp`."*

**6. Cierre (10s)**
*"La ley ya es machine-readable. Solo que nadie la había conectado — hasta ahora."*

---

## Qué está corriendo de verdad (para responder al jurado)

- **Ingesta multi-fuente**: SUIN-Juriscol (API SODA), Normograma DIAN (texto completo),
  circulares Superfinanciera, repositorio SIC — 4 adaptadores, ~64 normas reales analizadas.
- **Estructuración con Claude** (tool use forzado): resumen, sectores, obligaciones con
  deadline, severidad.
- **Matching por perfil** (reusa el mismo motor del tool MCP `normas_que_me_aplican`).
- **Entrega multicanal** (patrón adapter, `Promise.allSettled` — un canal caído no bloquea a
  los demás): Slack, Google Chat, Discord, Teams, email (Resend), WhatsApp (Kapso), voz
  (Retell conversacional vía SIP trunk de Twilio, alcanzando Colombia).
- **PRO**: GitHub App analiza el repo y abre PR de cumplimiento con revisor asignado.
- **MCP**: HTTP (`/api/mcp`) + paquete npm `complai-mcp`, con API keys + rate limit.
- **Cron**: ingesta 6am, match 6:30am (Vercel Cron por GET). Match en lotes concurrentes (~15s).
- Stack: Next.js 15 + Supabase + Clerk + Claude API + Vercel.

## Caveats conocidos (por si preguntan / para no romper la demo)

- **WhatsApp (Kapso sandbox):** ventana de 24h — reabrir con un mensaje entrante antes de demostrar.
- **Voz (Retell):** el destino debe ser ≠ `RETELL_FROM_NUMBER`; Retell alcanza CO solo vía el
  SIP trunk de Twilio (sus números propios no soportan Colombia).
- **Email (Resend sandbox):** sin dominio verificado, solo entrega al email dueño de la cuenta.
- Twilio trial mete un preámbulo de "trial account" si se usa esa vía; la voz productiva va por Retell.
