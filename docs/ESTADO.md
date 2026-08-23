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
- **La ingesta se estancó en 115 normas** porque ningún adaptador paginaba y el contador venía del `count` del upsert (filas *tocadas*, no nuevas). PR #73 lo corrige y sube el corpus a 233; el resto de la deuda de paginación está auditada abajo, en «Paginación de la ingesta».
- **El PR #43 se mergeó a medias** y dejó `src/lib/sources.ts` huérfano; lo recuperó el #51. Vale revisar dos veces los merges con conflicto.

## Decisiones de producto tomadas (no son descuidos)

- **`citizen_scans` guarda cédula, EPS y régimen en claro** — decisión explícita del equipo pese a que es dato sensible bajo la Ley 1581. Mitigación aplicada: RLS activo sin políticas, así que solo el service role la alcanza.
- **El agente nunca mergea**: los PR salen en *draft*, que además lo impide técnicamente.
- **Una sola llamada al modelo por alerta**: `impact` y `recommendation` se derivan del brief en vez de pedir un segundo análisis.

## Paginación de la ingesta — auditoría por fuente

`ingestAll` recorre hasta `DEFAULT_PAGES = 8` páginas por fuente y corta cuando dos
páginas traen la misma huella de ids, es decir, cuando la fuente ignora el `offset`.
El mecanismo está bien; **el problema es que solo un adaptador de siete lo aprovecha**:
`SourceAdapter.fetch(limit, offset)` declara `offset`, pero seis lo descartan en la firma.

Medido el 2026-08-22 contra las fuentes en vivo:

| Fuente | Hoy trae | Disponible | Diagnóstico |
|---|---:|---:|---|
| **corte-constitucional** | 15 | **29.424** | SODA acepta `$offset` igual que SUIN. Solo hay que pasarlo. Es el mayor techo desaprovechado con diferencia. |
| **suin** | 120 | **443** (vigentes 2025-26) | Único que pagina. El límite ya no es el adaptador sino `8 páginas × 15`; subir el producto la termina de vaciar. |
| **sic** | 16 | ~10 por página, **varias páginas** | El listado Drupal sí acepta `?page=N` y devuelve contenido distinto (verificado: pág. 0 → Res. 60687/2025, pág. 2 → Res. 28170/2022). El adaptador nunca lo manda. |
| **legalize** | 15 | 30 por página, **varias páginas** | La API de commits de GitHub acepta `page=N` (verificado hasta la 3). El adaptador pide solo la primera. |
| **superfinanciera** | 15 | **28** | No es que no pagine: **descarga las 28 y tira 13** en el `.slice(0, limit)` final. Paginar aquí es gratis, los datos ya están en memoria. |
| **dian** | 15 | **28** | Mismo caso: descarga hasta 60 candidatos, encuentra 28 y recorta a 15. El techo real (28) lo pone el documento semilla, no el código. |
| **croma** | 14 | — | **No es un bug**: no pagina a propósito por la cuota de 100 req/día, y su corpus de Consejo de Estado está congelado en feb-2022. Dejar como está. |

**Arreglado** (commit siguiente a esta auditoría). Dos estrategias según la fuente:

- **Las que sí paginan** (`corte-constitucional`, `sic`, `legalize`) ahora reenvían el
  `offset`: `$offset` en Socrata, `?page=N` en el Drupal de la SIC, `page=N` 1-based en la
  API de commits de GitHub. En `legalize` además se igualó `per_page` a `limit`: el buffer
  de sobre-descarga con recorte cliente dejaba huecos, porque la página siguiente arrancaba
  después de los commits recortados.
- **Las acotadas** (`dian`, `superfinanciera`, `croma`) devuelven **todo lo que tienen en la
  página 0** y un array vacío después. No solo traen más que antes (28 en vez de 15 las dos
  primeras, porque el `.slice(0, limit)` botaba lo ya descargado): también hacen *menos*
  peticiones, porque el corte por huella ya no necesita una segunda descarga completa para
  descubrir que la fuente se repite. En DIAN eso son ~8 s por corrida.

### Colisión de `external_id` — bug destapado por la paginación

Al recorrer 8 páginas apareció un problema que con una sola página casi no se veía: el
`external_id` de dos fuentes **no era único**, y como el upsert va por
`onConflict: 'external_id'`, las normas se pisaban entre sí y se perdían en silencio.

- **SIC** — el id era solo el nombre (`sic-circular-03`). La SIC reinicia la numeración cada
  año, así que la Circular 03 de tres años distintos competía por una misma fila. 9
  colisiones en 128 filas. También colapsaban títulos largos distintos que el slug recorta a
  60 caracteres. **Arreglado**: la fecha entra en el id.
- **legalize** — el id era el trailer `Source-Id`, que el comentario describía como "id de la
  disposición". No lo es: identifica la **norma**, así que las reformas al art. 296 y al art.
  58 de la Ley 599 de 2000 compartían id. 17 colisiones en 78 filas. **Arreglado**: el id es
  el sha del commit, que es uno por reforma y estable entre corridas.

**Ojo al desplegar**: el cambio de formato deja huérfanas las filas ya cargadas (16 de `sic`
y 15 de `legalize`), que quedarán duplicadas con las nuevas. Hay que borrarlas:
`delete from norms where source in ('sic','legalize');` — se vuelven a ingestar en la
siguiente corrida.

### Verificación final

Las siete fuentes, 8 páginas cada una, sin escribir en la base:

```
suin                  +15 +15 +15 +14 +15 +15 +15 +15  únicos=119  colisiones=0  2.1s
dian                  +28                              únicos= 28  colisiones=0  4.3s  pág 1 vacía
superfinanciera       +28                              únicos= 28  colisiones=0  1.8s  pág 1 vacía
sic                   +20 +20 +20 +20 +20 +20 +20 +20  únicos=157  colisiones=0  2.2s
legalize              +11 +15 +15 +15 +14 +15 +15 +15  únicos=115  colisiones=0  2.0s
corte-constitucional  +15 +15 +15 +15 +15 +15 +15 +15  únicos=120  colisiones=0  2.2s
croma                 +14                              únicos= 14  colisiones=0  0.5s  pág 1 vacía

TOTAL: 581 normas distintas por corrida (antes: ~210), 15 s contra ~50 s
```

El contrato está fijado en `src/lib/ingest/pagination.test.ts`, para que un adaptador nuevo
que se coma el `offset` falle en CI en vez de estancar el corpus en silencio.

Pendiente menor: el comentario de `sic.ts` apunta a
`src/lib/ingest/certs/globalsign-rsa-ov-2018.pem`, que no existe; el certificado está
embebido en el propio archivo.

Descartado tras medirlo: sospeché que el `$order=a_o DESC` de SUIN, al no tener desempate,
haría que Socrata devolviera filas repetidas o saltadas entre páginas. Cuatro páginas con y
sin `:id` dan el mismo resultado (59 únicas de 60; el duplicado viene del dataset, no del
orden). **No hay que tocarlo.**

## Números del corpus

233 normas tras la corrida con el corte por huella corregido (129 → 233; SUIN aportó las
104 nuevas), todas analizadas por el LLM. Con la paginación de las seis fuentes arreglada,
una corrida del cron (`ingestAll(15)`, 8 páginas) recorre 581 normas distintas en vez de
~210, y tarda menos (15 s contra ~50 s) porque las fuentes acotadas ya no se descargan dos
veces.
