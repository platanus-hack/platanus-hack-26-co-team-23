# Estado — qué está resuelto y qué falta

Corte: 2026-08-22, tras la jornada de M4 (tier PRO) + entrega multicanal + B2C.
Este documento existe para retomar sin releer el historial.

## Lo que funciona, verificado en producción

No "compila": probado contra `complai-co.vercel.app` y la base real.

| Pieza | Evidencia |
|---|---|
| Tier PRO: PR de cumplimiento | [PR #3 en `facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/3) — draft, `complia-app[bot]`, revisor asignado, ~35s |
| Gate de relevancia | 3 alertas reales: la resolución DIAN abre PR; dos circulares SFC se rechazan por regular entidades vigiladas (~5s) |
| Aviso de 4 secciones + guía PDF | brief cacheado en `alerts.brief` (9s la 1ª vez, 0s después); PDF con marca de agua |
| Entrega multicanal | **WhatsApp ✅ · voz ✅ · Discord ✅** en la misma corrida, 1,7s en paralelo |
| Reenvío para diagnóstico | `POST /api/alerts/[id]/resend` — motivo textual por canal en ~1,5s |
| Capa B2C por cédula | SSE con 4 fuentes de Croma + 5 normas cruzadas, probado end-to-end |
| Cierre de API | 6 rutas que respondían sin credencial, ahora con sesión de Clerk o HMAC |

## Lo que falta

### 1. Botón PRO en el feed — 1 línea, alto impacto en demo
`src/app/(dashboard)/feed/page.tsx` lee `pr_url` y muestra el enlace, pero **no monta `PrButton`**, que existe desde el principio en `feed/pr-button.tsx`. Sin esto, en la demo el PR hay que dispararlo por curl.

```tsx
{a.pr_url ? <p>✅ <a href={a.pr_url}>PR de cumplimiento abierto</a></p> : <PrButton alertId={a.id} />}
```

### 2. README — requisito de entrega
Sigue siendo la plantilla del hackathon (habla del dual-push y de los pasos previos). Platanus lo pide conciso y describiendo el proyecto. **Escribirlo a mano**: el enunciado tiene una trampa anti-LLM que exige un 🍌 después de cada palabra si lo redacta un modelo.

### 3. PRs abiertos

| PR | Acción |
|---|---|
| #48 errores de canal | mergear |
| #72 B2C por cédula | mergear + correr `003_citizen_scans.sql` |
| #73 paginación de ingesta | mergear |
| **#54** | **cerrar** — su contenido ya está en `main` y mergearlo borraría 854 líneas (endpoint `/resend`, validación de canales, 3 adaptadores, Twilio→Retell) |

### 4. Rate limit en `/api/citizen/scan`
Público y sin límite: cualquiera puede consultar cédulas ajenas en masa y quemar la cuota de Croma (100 req/día). El repo ya tiene `rate-limit` usado por `/api/public/*`.

## Bloqueos que NO son código

- **Email (`resend 403`)** — el remitente es `onboarding@resend.dev` y ese dominio de pruebas **solo entrega al correo de la cuenta**. Verificar dominio en Resend o poner ese correo en la empresa.
- **WhatsApp (`kapso 422`)** — la Cloud API solo permite texto libre dentro de las 24h tras un mensaje del usuario. Para la demo: que el destinatario escriba al número de Kapso justo antes.
- **Voz** — resuelto: las cuentas trial de Twilio rechazan el `Twiml` inline, ahora se sirve por URL firmada desde `/api/alerts/[id]/twiml`.
- **Croma** — el corpus de Consejo de Estado está congelado en feb-2022.

## Trampas operativas descubiertas

- **El cron de match se come el cupo por orden de empresa.** `MAX_NEW_ALERTS_PER_RUN = 20` y recorre las empresas en el orden de la tabla: si las primeras tienen alertas pendientes, la última **nunca** llega. Para probar una empresa concreta hay que vaciar temporalmente los sectores de las demás (con backup y `finally`).
- **Los canales sin `min_severity` mandan por cada alerta.** `CompLIA` y `empresa de bbc` están en `low`: una corrida grande les dispara decenas de mensajes. Subirlos a `high` antes de poblar.
- **La ingesta se estancó en 115 normas** porque ningún adaptador paginaba y el contador venía del `count` del upsert (filas *tocadas*, no nuevas). PR #73 lo corrige; en la primera corrida se descubrió además que cortar en "página sin novedades" dejaba a SUIN pegada en la página 1 — el corte correcto es comparar la huella de ids entre páginas.
- **El PR #43 se mergeó a medias** y dejó `src/lib/sources.ts` huérfano; lo recuperó el #51. Vale revisar dos veces los merges con conflicto.

## Decisiones de producto tomadas (no son descuidos)

- **`citizen_scans` guarda cédula, EPS y régimen en claro** — decisión explícita del equipo pese a que es dato sensible bajo la Ley 1581. Mitigación aplicada: RLS activo sin políticas, así que solo el service role la alcanza.
- **El agente nunca mergea**: los PR salen en *draft*, que además lo impide técnicamente.
- **Una sola llamada al modelo por alerta**: `impact` y `recommendation` se derivan del brief en vez de pedir un segundo análisis.

## Números del corpus

115 normas al corte (7 fuentes: suin 30, sfc 21, sic 16, dian 15, legalize 15, corte-constitucional 15, seed 3), todas analizadas. 85 aplican a persona natural. Con el PR #73 desplegado, una corrida debería subirlo bastante.
