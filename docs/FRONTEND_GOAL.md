# Meta del frontend de CumplAI (rama `feat/frontend-dashboard`)

> Contexto para los subagentes `frontend-developer` y `frontend-reviewer`.
> Este documento es el criterio de "terminado" — el loop developer↔reviewer
> corre hasta que TODO lo de la sección "Criterios de aceptación" esté ✅.

## Ya hecho (no repetir)

- shadcn inicializado (base UI, preset nova, Tailwind v4). Componentes ya
  añadidos: button, input, label, checkbox, switch, select, tabs, card,
  badge, separator, toggle/toggle-group, avatar, dropdown-menu, sonner,
  skeleton, textarea, alert. Si falta un componente, añádelo con
  `pnpm exec shadcn add <nombre>` (o el MCP de shadcn si está disponible) —
  **nunca lo escribas a mano ni lo copies de otra librería.**
- Clerk instalado y cableado: `ClerkProvider` en `src/app/layout.tsx`,
  `src/proxy.ts` protege `/settings` y `/feed` (convención `proxy.ts` de
  Next 16, reemplaza a `middleware.ts` — no lo revivas).
- `supabase/schema.sql`: `companies.clerk_org_id` (no `owner_user_id`).
  La empresa cuelga de la ORGANIZACIÓN de Clerk, no de un usuario.
- `src/lib/types.ts` ya tiene `Company` con `clerk_org_id` / `clerk_user_id`.
- `src/lib/supabase/admin.ts` ya existe: cliente service-role. Es el único
  cliente de Supabase que se usa aquí — no crear `src/lib/supabase/server.ts`
  ni `browser.ts` al estilo Supabase Auth, ese flujo quedó obsoleto con Clerk.

## Alcance — qué SÍ construir

Todo el frontend de cliente (Next.js App Router, Server Components +
Server Actions donde aplique), usando **exclusivamente componentes de
shadcn/ui** para cualquier pieza de interfaz (botones, inputs, switches,
tabs, cards, badges, menús...). Cero HTML+CSS a mano para algo que shadcn
ya resuelve, cero otra librería de componentes.

1. **`src/app/(dashboard)/layout.tsx`** — shell del dashboard: barra
   superior con logo "CumplAI", nav (`Alertas` → `/feed`, `Configuración`
   → `/settings`), `<OrganizationSwitcher/>` y `<UserButton/>` de Clerk,
   badge de rol (admin/miembro, vía `auth().orgRole`). Responsive: en
   móvil el nav colapsa a un menú (usa el `Sheet` o `DropdownMenu` de
   shadcn — añádelo si no está).

2. **`src/app/sign-in/[[...sign-in]]/page.tsx (+ sign-up equivalente)`** — página de login con `<SignIn/>` de
   Clerk, envuelta en un `Card` de shadcn. Sin diseño de marca elaborado:
   texto simple + el componente de Clerk basta.

3. **`src/app/(dashboard)/settings/page.tsx` + `actions.ts`** — el
   dashboard de configuración. Server component que lee `auth()` (orgId,
   orgRole) y la fila de `companies` vía `admin.ts`. Si el rol no es
   `org:admin`, renderiza una vista de SOLO LECTURA (resumen de campos,
   sin inputs editables, con aviso de que solo un admin puede cambiarlo)
   — nunca ocultar el control de acceso solo en el cliente: el server
   action de guardado también debe rechazar si `orgRole !== 'org:admin'`.
   Si es admin, formulario editable con Server Action que hace upsert en
   `companies` por `clerk_org_id`:
   - Perfil: nombre (`Input`), tipo de sociedad (`ToggleGroup` con los 4
     valores de `COMPANY_TYPES`), sectores (`Toggle`/badges clicables con
     los 10 valores de `SECTORS`).
   - Canales: los 7 `CHANNEL_TYPES` (slack, google_chat, discord, teams,
     email, whatsapp, voice). Cada uno: `Switch` para encender/apagar +
     `Input` para su config (`webhook_url`/`address`/`phone` según el
     canal) + selector de `min_severity` (`ToggleGroup`: Todo/Media+/Solo
     alta) — **excepto `voice`, que no lleva selector**: el server action
     ya fuerza `min_severity: 'high'` para voice, así que la UI no debe
     ofrecer una opción que el servidor va a sobrescribir.
   - PRO: `github_repo` y `reviewer_github` (`Input`).
   - Si la organización no tiene fila en `companies` todavía: muestra un
     estado vacío (`Card` con copy corto explicando qué es esto + botón
     que revela el formulario) en vez de un formulario en blanco sin
     contexto.
   - Usa `sonner` (`toast`) para confirmar guardado o mostrar error.

4. **`src/app/(dashboard)/feed/page.tsx`** — lista de `alerts` (join con
   `norms` por `norm_id`) de la empresa de la organización activa: título
   de la norma, resumen, `Badge` de severidad, `pr_url` si existe (link).
   Estado vacío si no hay alertas o si la empresa no está configurada
   todavía (con link a `/settings`).

5. **`src/app/page.tsx`** — reemplaza el scaffold de create-next-app.
   Algo simple: si hay sesión activa redirige a `/feed`, si no a
   `/sign-in`. No hace falta una landing de marketing — no es el foco.

## Explícitamente FUERA de alcance (no lo construyas)

- Cualquier pantalla o control para configurar **tema/apariencia**
  (claro/oscuro, densidad, tipografía, colores) — no interesa para esta
  entrega.
- Pulido visual más allá de usar shadcn correctamente: no inventes
  ilustraciones, gradientes, animaciones decorativas ni una identidad
  visual propia. shadcn + los tokens que trae por defecto son
  suficientes.
- Task 5/5b/6(matching)/7/8/9 del plan (`docs/superpowers/plans/2026-08-22-complia.md`):
  dispatcher de canales, matching real, análisis de repo/PR, MCP server.
  Esto es solo el frontend — las páginas pueden mostrar datos reales o
  vacíos, pero no implementes esa lógica de backend.
- No reescribas Task 3 del plan tal cual está escrita (usa Supabase Auth
  con `@supabase/ssr`) — quedó obsoleta por Clerk. Ignórala.

## Criterios de aceptación (marcar cada uno; el reviewer los verifica)

- [ ] `pnpm build` termina sin errores (typecheck incluido).
- [ ] `pnpm lint` (eslint) sin errores. Si hay Prettier configurado en
      el repo, también sin diffs pendientes — **verificar primero si
      existe config de Prettier antes de asumir que hay que correrlo**
      (al momento de escribir esto NO hay `.prettierrc` ni dependencia
      `prettier` en el repo; si sigue así, no inventes esa gate).
- [ ] `pnpm dev` levanta y las rutas `/sign-in`, `/settings`, `/feed`
      responden (protegidas por Clerk: sin sesión redirigen a `/sign-in`).
- [ ] Cada componente de UI usado viene de `src/components/ui/*`
      (shadcn) — sin excepciones sin justificar.
- [ ] El formulario de `/settings` cubre los 3 bloques (perfil, canales,
      PRO) y persiste de verdad contra Supabase (fila `companies` por
      `clerk_org_id`).
- [ ] Vista de solo-lectura para rol no-admin, y el server action
      también rechaza la escritura para ese rol (no solo el cliente).
- [ ] Canal `voice` no expone selector de severidad.
- [ ] `/feed` lee `alerts`+`norms` reales cuando existen, y tiene un
      estado vacío razonable cuando no.
- [ ] Verificado visualmente en el navegador (servidor local +
      extensión de Chrome/Browser tool): las 3 rutas cargan sin errores
      de consola, el layout no se rompe en un ancho de ~390px.
- [ ] Nada de lo listado en "Explícitamente fuera de alcance" quedó
      implementado.

Cuando TODOS los checks estén en verde, el reviewer lo confirma
explícitamente en su reporte y el loop termina.
