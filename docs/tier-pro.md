# Tier PRO — análisis de repo → PR de cumplimiento → revisor

Estado de la rama `feat/task-7-pro-repo-analyzer` (Task 7 del plan, track M4).

**Verificado end-to-end el 2026-08-22:**
[PR #3 en `ComplAI-Crew/facturador-demo`](https://github.com/ComplAI-Crew/facturador-demo/pull/3)
— **draft**, abierto por `complia-app[bot]`, revisor solicitado, ~36s desde el POST, sin merge.

## Qué hace

Cuando una norma afecta a una empresa que conectó su repo, CumplIA lee el código,
propone el cambio que la norma exige y abre un PR **en draft** asignado a un revisor humano.
**Nunca mergea**: un draft ni siquiera admite merge hasta que una persona lo marque
"ready for review". En repos privados de plan Free, que no admiten draft, cae a PR normal.

```
alerta (norma × empresa)
   └─ POST /api/pro/pr { alertId }
        ├─ octokitFor(installationId)      credencial de ESA empresa
        ├─ lee COMPLIA.md del repo         → qué archivos mirar
        ├─ ¿la norma regula lo que hace este código?
        │     no → { skipped: true, reason } y NO se abre PR
        └─ sí → cambios + rama + commits + PR draft + reviewer
                devuelve prUrl, lo guarda en alerts.pr_url
```

### El gate de relevancia

Que una norma matchee con la empresa no significa que obligue a tocar su código. Antes de
proponer nada, el modelo decide `aplica` **por materia**: ¿la norma regula la actividad que
este código ejecuta? Si no, devuelve `{ skipped: true, reason }` y no se abre ningún PR.

El campo `aplica` va primero en el schema del tool a propósito: el modelo lo genera antes de
ponerse a proponer cambios, así la decisión no queda contaminada por el trabajo ya hecho.

La decisión es solo de ámbito, no de detalle. Una norma vaga que sí regula la actividad
genera PR igual, con los supuestos declarados en el body bajo "Qué debe confirmar el
revisor" — para eso existe el revisor humano. Lo que el prompt prohíbe es inventar cifras,
plazos o códigos presentándolos como si vinieran de la norma.

Verificado contra tres alertas reales sobre `facturador-demo`:

| Norma | Veredicto |
|---|---|
| Resolución DIAN — campos obligatorios en factura electrónica | PR abierto |
| Circular SFC — pruebas de resistencia (EPR/PAC/PAL) | sin PR: regula entidades vigiladas, no un facturador |
| Circular SFC — retención de logs de transacciones | sin PR: mismo motivo, pese al nombre parecido a `logger.ts` |

El tercero es interesante: por nombre parecía tocar `src/logger.ts`, y el gate lo rechazó
por ámbito. De paso deja ver un falso positivo del matching.

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

`POST /api/pro/complia { companyId }` lo genera analizando el repo. El repo y la credencial
salen de la empresa en la DB, nunca del request: aceptar un `installationId` suelto dejaba
leer el código de cualquier instalación cuyo id se adivinara.

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
  -d '{"companyId":"<company_id>"}' | jq -r .markdown
```

Env necesarias: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`,
`GITHUB_STATE_SECRET`, `ANTHROPIC_API_KEY`, las de Supabase.

## Pendiente

> Handoff detallado para M2/M3, con contratos de API y estados de UI:
> [`tier-pro-dashboard.md`](./tier-pro-dashboard.md)

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
    .then((res) => {
      if ('skipped' in res) return console.log('sin PR para', alert.id, '—', res.reason)
      return db.from('alerts').update({ pr_url: res.prUrl }).eq('id', alert.id)
    })
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

- `GET/POST /api/pro/repos` y `POST /api/pro/complia` reciben `companyId` del request y no
  hay sesión que verificar (marcado con `lazy:`). Con auth, sacarlo de la sesión. Ninguno
  acepta ya `installationId` ni repos sueltos: todo se deriva de la empresa.
- El `state` del callback ya va firmado con HMAC (`GITHUB_STATE_SECRET`), así que nadie
  puede asociar una instalación a una empresa ajena. Cuando exista auth, sumar la
  verificación de sesión como segunda barrera.
