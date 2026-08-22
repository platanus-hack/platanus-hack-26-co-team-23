# Tier PRO — qué falta integrar en el dashboard

Handoff de M4 para **M2** (settings/auth) y **M3** (feed/matching).

El motor del tier PRO está terminado y verificado end-to-end
([PR #3 en `facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/3)).
Lo que falta es **UI y cableado**: cuatro puntos, ninguno de más de una pantalla.
Detalle del motor en [`tier-pro.md`](./tier-pro.md).

## Lo que ya existe (contratos cerrados)

Todo deriva de la empresa: **ningún endpoint acepta `installationId` ni credenciales
del request**. No los agregues al llamar.

### `GET /api/pro/repos?companyId=…`

```jsonc
// aún no instaló la GitHub App
{ "connected": false, "installUrl": "https://github.com/apps/complia-app/installations/new?state=…" }

// ya instaló
{ "connected": true,
  "selected": "ComplAI-Crew/facturador-demo",   // null si todavía no eligió
  "repos": [{ "fullName": "ComplAI-Crew/facturador-demo", "private": true }],
  "manageUrl": "https://github.com/apps/complia-app/installations/new?state=…" }
```

### `POST /api/pro/repos` — `{ companyId, repo }`

`{ ok: true, selected }` · 400 si la empresa no instaló la App o si la instalación no
alcanza ese repo.

### `POST /api/pro/complia` — `{ companyId, repo? }`

`{ repo, markdown }` — el `COMPLIA.md` propuesto. Tarda ~20s. No lo commitea: lo muestras
para que el cliente lo copie a la raíz de su repo.

### `POST /api/pro/pr` — `{ alertId }`

```jsonc
{ "prUrl": "https://github.com/…/pull/3" }        // PR draft abierto, ~35s
{ "skipped": true, "reason": "La circular regula entidades vigiladas por la SFC…" }  // ~5s
```

`skipped` **no es un error**: la norma no obliga a tocar ese código. Llega con 200.

### `GET /api/pro/github/callback`

Lo llama GitHub, no tú. Redirige a `/settings` con `?github=ok`, `?github=error`, o
`?installation_id=N` cuando la instalación se inició desde GitHub y no desde el botón.

### `buildInstallUrl(companyId)` — `src/lib/pro/install-state.ts`

Server-side. Devuelve la URL de instalación con el `state` firmado. **No armes esa URL a
mano**: sin la firma el callback descarta la asociación.

---

## 1. Settings — conectar GitHub · M2

Pantalla nueva en `/settings` (la ruta a la que ya redirige el callback). Tres estados:

| Estado | Qué mostrar |
|---|---|
| `connected: false` | Botón "Conectar GitHub" → `installUrl` |
| `connected: true`, `selected: null` | `<select>` con `repos` → `POST /api/pro/repos` |
| `connected: true`, `selected` | El repo actual + "Cambiar repo" y "Gestionar en GitHub" (`manageUrl`) |

Después de guardar el repo, ofrecer **"Generar COMPLIA.md"** → `POST /api/pro/complia`,
mostrar el markdown en un bloque copiable y explicar que va en la raíz del repo. Es
opcional, pero sin él el agente elige archivos por orden alfabético.

Al volver del callback, leer `?github=ok|error` y mostrar el resultado.

**El `companyId` sale de la sesión** (`companies.owner_user_id = auth.uid()`), nunca de un
input ni de la URL.

## 2. Feed — el botón · M3

`src/app/(dashboard)/feed/pr-button.tsx` ya está escrito y maneja los cinco estados
(idle, working, done, skipped, error). Solo hay que montarlo en `feed/page.tsx`:

```tsx
import { PrButton } from './pr-button'
…
{a.pr_url ? <p>✅ <a href={a.pr_url}>PR de cumplimiento abierto</a></p> : <PrButton alertId={a.id} />}
```

Dos cosas a respetar en el diseño:

- **Tarda ~35s.** El botón ya muestra "Analizando tu código…", pero si el feed tiene
  spinners propios, que no parezca colgado.
- **`skipped` es un desenlace normal**, no un fallo. El componente pinta el motivo tal
  cual lo devuelve el modelo; no lo trates como error.

Mostrar el botón solo si la empresa tiene `github_repo`; si no, un enlace a settings.

## 3. Disparo automático al matchear · M3

Hoy el PR se abre a mano. El disparo natural es el matching: norma que aplica + empresa
con GitHub conectado. En `/api/cron/match`, tras insertar la alerta:

```ts
if (company.github_repo && company.auto_pr && norm.severity === 'high') {
  openCompliancePR({
    repo: company.github_repo,
    installationId: company.github_installation_id,
    reviewer: company.reviewer_github,
    normTitle: norm.title,
    obligations: norm.obligations,
    impact: alert.impact,
  })
    .then((res) => {
      if ('skipped' in res) return console.log('sin PR para', alert.id, '—', res.reason)
      return db.from('alerts').update({ pr_url: res.prUrl }).eq('id', alert.id)
    })
    .catch((e) => console.error('PR automático falló para', alert.id, e))
}
```

Tres condiciones antes de encenderlo:

- **Opt-in por empresa** — `alter table companies add column auto_pr boolean default false`,
  con su switch en settings. Abrir PRs en el repo de alguien sin que lo pida es intrusivo.
- **Solo `severity = 'high'`** — con 64 normas en base, sin filtro el cron abre decenas de PRs.
- **No bloquear el cron** — ~35s por PR. Con varias empresas hay que sacarlo a una cola.

El gate de relevancia ya evita los PRs sin sentido, pero cuesta ~5s y una llamada al modelo
por alerta: filtrar por severidad antes ahorra esas llamadas.

## 4. Cerrar la puerta de `companyId` · M2, cuando haya auth

`GET/POST /api/pro/repos` y `POST /api/pro/complia` reciben `companyId` del request porque
todavía no hay sesión que verificar (marcado con `lazy:` en el código). Con auth:

1. Sacar `companyId` de la sesión y quitarlo del body/query.
2. En el callback (`src/app/api/pro/github/callback/route.ts`), además de verificar la firma
   del `state`, confirmar que el usuario logueado es dueño de esa empresa.

La firma HMAC ya impide que alguien asocie su instalación a una empresa ajena; esto es la
segunda barrera.

---

## Lo que NO hay que hacer

- **No pasar `installationId` ni tokens desde el cliente.** Se derivan de la empresa. Un
  `installation_id` es un entero correlativo: aceptarlo del request dejaba leer repos ajenos.
- **No armar la URL de instalación a mano** — usa `buildInstallUrl()`, el `state` va firmado.
- **No mergear PRs desde el producto.** Salen en draft a propósito; marcarlos "ready" y
  mergear es del humano. Es regla del repo.
- **No tratar `skipped` como error** en la UI.

## Variables de entorno

`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, `GITHUB_STATE_SECRET`.
Las cuatro deben estar también en Vercel. `GITHUB_TOKEN` es solo fallback de demo.

Migración pendiente en Supabase: `supabase/migrations/001_github_installation_id.sql`.
