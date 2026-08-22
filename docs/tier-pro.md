# Tier PRO — análisis de repo → PR de cumplimiento → revisor

Estado de la rama `feat/task-7-pro-repo-analyzer` (Task 7 del plan, track M4).

**Verificado end-to-end el 2026-08-22:**
[PR #1 en `ComplAI-Crew/facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/1)
— abierto por `complia-app[bot]`, revisor solicitado, 32s desde el POST, sin merge.

## Qué hace

Cuando una norma afecta a una empresa que conectó su repo, CumplIA lee el código,
propone el cambio que la norma exige y abre un PR asignado a un revisor humano.
**Nunca mergea**: el PR queda abierto esperando aprobación.

```
alerta (norma × empresa)
   └─ POST /api/pro/pr { alertId }
        ├─ octokitFor(installationId)      credencial de ESA empresa
        ├─ lee COMPLIA.md del repo         → qué archivos mirar
        ├─ Claude propone los cambios      → tool use forzado + zod
        └─ rama + commits + PR + reviewer  → devuelve prUrl, lo guarda en alerts.pr_url
```

## Piezas

| Archivo | Rol |
|---|---|
| `src/lib/pro/github.ts` | `openCompliancePR()` — el flujo completo |
| `src/lib/pro/complia-md.ts` | parser del manifiesto + generador (`generateCompliaMd`) |
| `src/lib/pro/octokit.ts` | `octokitFor()` — credencial por empresa |
| `src/lib/pro/install-state.ts` | `state` firmado del flujo de instalación |
| `src/app/api/pro/pr/route.ts` | dispara el PR desde una alerta |
| `src/app/api/pro/complia/route.ts` | genera el `COMPLIA.md` de un repo |
| `src/app/api/pro/repos/route.ts` | lista y fija el repo de la empresa |
| `src/app/api/pro/github/callback/route.ts` | guarda el `installation_id` tras instalar |
| `src/app/(dashboard)/feed/pr-button.tsx` | botón del feed |

### COMPLIA.md — el repo declara qué mirar

Sin manifiesto, el agente toma los primeros 15 archivos por orden alfabético y puede
perderse el que importa. Con `COMPLIA.md` en la raíz del repo del cliente, **toda ruta
escrita en backticks que exista en el árbol** entra a la selección (una que termine en
`/` expande la carpeta), y el markdown completo se inyecta como contexto.

Lo escribe el cliente, así que va delimitado en `<contexto_del_repo>` y etiquetado como
información, no instrucciones; y las rutas se validan contra el árbol real, de modo que
un manifiesto hostil no puede hacer leer nada fuera del repo.

`POST /api/pro/complia { repo, installationId }` lo genera analizando el repo.

### Credencial por empresa

`GITHUB_TOKEN` era una sola cuenta que debía ser colaboradora de cada repo cliente: no
escala. Ahora cada empresa guarda `companies.github_installation_id` y `octokitFor()`
pide al vuelo un token de instalación (1h, alcance solo los repos que el cliente eligió).
`GITHUB_TOKEN` queda como fallback de demo.

GitHub App: **complia-app** (App ID `4680485`), permisos `contents:write`,
`pull_requests:write`, `metadata:read`.

## Cómo probarlo

```bash
# 1. Migración + datos de demo
psql/SQL editor → supabase/migrations/001_github_installation_id.sql
                  supabase/seed-demo-pro.sql   # devuelve el alert_id

# 2. PR de cumplimiento
curl -X POST localhost:3000/api/pro/pr -H 'Content-Type: application/json' \
  -d '{"alertId":"<alert_id>"}'

# 3. Regenerar el manifiesto de un repo
curl -X POST localhost:3000/api/pro/complia -H 'Content-Type: application/json' \
  -d '{"repo":"ComplAI-Crew/facturador-demo","installationId":155641303}' | jq -r .markdown
```

Env necesarias: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`,
`GITHUB_STATE_SECRET`, `ANTHROPIC_API_KEY`, las de Supabase.

## Pendiente

### 1. Montar el botón en el feed — bloqueado por M3 (Task 6)

Cuando exista `src/app/(dashboard)/feed/page.tsx`, dentro del `<article>`:

```tsx
import { PrButton } from './pr-button'
…
{a.pr_url ? <p>✅ <a href={a.pr_url}>PR de cumplimiento abierto</a></p> : <PrButton alertId={a.id} />}
```

### 2. Conectar GitHub desde el dashboard — bloqueado por M2 (Tasks 3/4)

En settings, un botón a `buildInstallUrl(companyId)` y un `<select>` alimentado por
`GET /api/pro/repos?companyId=…`, que guarda con `POST /api/pro/repos { companyId, repo }`.

El `companyId` sale de la sesión: es la empresa del usuario logueado
(`companies.owner_user_id = auth.uid()`), nunca del input del usuario.

### 3. Disparo automático al matchear — bloqueado por M3 (Task 5)

Hoy el PR se abre **manualmente** desde el botón. Eso es deliberado para la demo: cada
disparo cuesta ~30s de Claude y escribe en el repo del cliente.

El automático va en `/api/cron/match`, justo después de insertar cada alerta:

```ts
// src/app/api/cron/match/route.ts — tras insertar la alerta
if (company.github_repo && company.auto_pr && norm.severity === 'high') {
  openCompliancePR({
    repo: company.github_repo,
    installationId: company.github_installation_id,
    reviewer: company.reviewer_github,
    normTitle: norm.title,
    obligations: norm.obligations,
    impact: alert.impact,
  })
    .then((prUrl) => db.from('alerts').update({ pr_url: prUrl }).eq('id', alert.id))
    .catch((e) => console.error('PR automático falló para', alert.id, e))
}
```

Tres condiciones antes de encenderlo:

- **Opt-in por empresa** — `alter table companies add column auto_pr boolean default false`.
  Abrir PRs en el repo de alguien sin que lo pida es intrusivo.
- **Solo `severity = 'high'`** — si no, un cron con 64 normas abre decenas de PRs.
- **No bloquear el cron** — el `openCompliancePR` tarda ~30s; el match no debe esperarlo.
  Con muchas empresas hay que sacarlo a una cola en vez de dispararlo inline.

### 4. Endurecer antes de clientes reales

- `GET/POST /api/pro/repos` y `POST /api/pro/complia` reciben `companyId`/`installationId`
  del request y no hay sesión que verificar (marcado con `lazy:`). Con auth, sacarlos de
  la sesión.
- El `state` del callback ya va firmado con HMAC (`GITHUB_STATE_SECRET`), así que nadie
  puede asociar una instalación a una empresa ajena. Cuando exista auth, sumar la
  verificación de sesión como segunda barrera.
