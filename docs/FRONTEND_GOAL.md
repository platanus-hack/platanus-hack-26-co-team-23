# Meta del frontend de ComplAI (rama `feat/frontend-dashboard`) — iteración 2

> Contexto para los subagentes `frontend-developer` y `frontend-reviewer`.
> Este documento es el criterio de "terminado" — el loop developer↔reviewer
> corre hasta que TODO lo de la sección "Criterios de aceptación" esté ✅.
> La iteración 1 (shell del dashboard, `/settings`, `/feed`, `/sign-in`,
> `/sign-up`, Clerk, shadcn) ya está hecha y en PR. Esta iteración 2 es una
> ronda de feedback sobre esa base — no repitas ni reviertas lo ya hecho.

## Ya hecho (no repetir)

- shadcn inicializado (base UI, preset nova, Tailwind v4). Componentes ya
  añadidos: button, input, label, checkbox, switch, select, tabs, card,
  badge, separator, toggle/toggle-group, avatar, dropdown-menu, sonner,
  skeleton, textarea, alert, sheet. Si falta un componente, añádelo con
  `pnpm exec shadcn add <nombre>` (o el MCP de shadcn si está disponible) —
  **nunca lo escribas a mano ni lo copies de otra librería.**
- Clerk instalado y cableado: `ClerkProvider` en `src/app/layout.tsx`,
  `src/proxy.ts` protege `/settings` y `/feed`. Auth es Clerk, **no**
  Supabase Auth — la empresa cuelga de la organización (`clerk_org_id`),
  no de un usuario. Usa `auth()` de `@clerk/nextjs/server` (sus propias
  `orgId`/`userId`/`orgRole`, **nunca** `sessionClaims.org_id` /
  `sessionClaims.sub` — eso ya causó un bug real de datos huérfanos en la
  iteración 1, no lo repitas).
- `supabase/schema.sql`: `companies.clerk_org_id` (no `owner_user_id`).
  `src/lib/supabase/admin.ts` es el ÚNICO cliente de Supabase que se usa
  aquí (service role) — no crear `src/lib/supabase/server.ts` con
  `@supabase/ssr`/cookies al estilo Supabase Auth, ese patrón no aplica.
- `src/app/(dashboard)/layout.tsx`, `settings/`, `feed/`, `sign-in/`,
  `sign-up/` ya implementados y funcionales contra Supabase real.
- El bug de CSS que rompía TODAS las utilidades de padding/margin de
  Tailwind ya está arreglado (no había `@layer` en un reset heredado del
  scaffold) — si algo se ve "roto"/sin espaciado, ese no es el problema,
  investiga la causa real antes de tocar `globals.css`.

## Alcance de esta iteración — feedback a resolver

### 1. Indicar visualmente los campos requeridos en `/settings`

`settings-form.tsx` valida `name` y `company_type` como requeridos (ve
`handleSubmit`) pero el usuario no tiene forma de saber cuáles son antes
de que el toast de error aparezca. Añade un asterisco rojo (`text-destructive`
o similar, ej. `<span className="text-destructive">*</span>` después del
texto del `Label`) en los `Label` de **Nombre de la empresa** y **Tipo de
sociedad** (los dos únicos campos actualmente requeridos por el server
action). No marques como requeridos campos que el server action no exige.

### 2. Rebrand: es "ComplAI", no "CumplAI"

Busca y reemplaza **todas** las apariciones visibles de "CumplAI" (y
cualquier resto de "CumplIA") por **"ComplAI"** en el código fuente de
`src/` (título de `<head>`, logo del header, textos de `/sign-in`,
`/sign-up`, estados vacíos de `/settings` y `/feed`, cualquier copy).
Usa `grep -rn "CumplAI\|CumplIA" src/` para encontrarlos todos — al
momento de escribir esto hay ocurrencias en `layout.tsx`, `sign-in/page.tsx`,
`sign-up/page.tsx`, `(dashboard)/layout.tsx`, `(dashboard)/settings/page.tsx`,
`(dashboard)/settings/settings-form.tsx`, `(dashboard)/feed/page.tsx`.
**No toques** `.env.example`/`.env.local` ni nada relacionado al nombre de
la app de Clerk (`app_3IGYo5UOL2tYGSklhjEzgeOveO6`) — ese es un recurso
externo compartido, renombrarlo no es parte de este alcance.

### 3. El tab activo del nav del header no se distingue

En `(dashboard)/layout.tsx`, el nav (`Alertas` / `Configuración`, desktop
y el `Sheet` de móvil) usa siempre `text-muted-foreground hover:text-foreground`
sin importar en qué ruta estás — no hay forma de saber cuál está
seleccionado. Arréglalo:

- Extrae el nav a un client component (ej. `src/app/(dashboard)/nav-links.tsx`,
  `"use client"`) que use `usePathname()` de `next/navigation` para saber
  la ruta activa (compara con `startsWith` porque `/feed` y `/settings`
  pueden tener subrutas).
- El link activo debe verse claramente distinto del inactivo: por ejemplo
  `text-foreground font-medium` + un indicador visual (subrayado,
  `border-b-2 border-primary`, o fondo con `bg-accent` en un pill) — no
  alcanza con solo cambiar el color de texto sutilmente, tiene que notarse
  a simple vista. Aplica lo mismo en el nav de escritorio y en el del
  `Sheet` móvil.
- Sigue usando componentes/tokens de shadcn (no inventes colores fuera
  del theme).

### 4 y 5. Diseñar e implementar generación de API keys para el MCP

Hay un PR de otro track (`ComplAI-Crew/comply#5`, **sin mergear**) que ya
resuelve esto para un modelo con Supabase Auth (`auth.uid()`,
`owner_user_id`) — **ese modelo no aplica aquí** (aquí el login es Clerk).
Usa ese PR solo como referencia de *qué* construir (tabla `api_keys`, hash
SHA-256, prefijo visible, revocación, guard en las rutas MCP), no copies
su código tal cual (usa HTML a mano sin shadcn, y su esquema requiere
Supabase Auth). Implementa la versión adaptada a Clerk + shadcn:

**Esquema** (`supabase/api-keys.sql`, migración incremental — no reescribas
`schema.sql`, este es un archivo nuevo a correr aparte, igual que el resto
del schema; si tienes acceso al MCP de Supabase para aplicar la migración
directamente, úsalo, si no, deja el `.sql` listo):

```sql
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  clerk_user_id text not null,       -- quién la generó
  name text not null,                -- etiqueta libre ("CI de Acme", "agente interno")
  key_prefix text not null,          -- primeros chars visibles (cai_a1b2c3)
  key_hash text not null unique,     -- sha256 hex de la key completa; la key cruda nunca se persiste
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Sin sesión de Supabase Auth aquí tampoco: mismo patrón que companies/alerts,
-- RLS encendida como cierre por defecto, todo acceso pasa por admin.ts
-- validando organización/rol contra Clerk en el server.
alter table api_keys enable row level security;
```

**`src/lib/api-keys.ts`** (nuevo, junto a los demás helpers de `src/lib/`):
- `generateApiKey()`: crea `raw = "cai_" + randomBytes(24).toString("hex")`,
  devuelve `{ raw, prefix: raw.slice(0, 10), hash: sha256(raw) }` (usa
  `node:crypto`, `createHash("sha256")`).
- `hashApiKey(raw)`: el mismo sha256 hex, para validar contra `key_hash`.
- No necesitas replicar el `MASTER_API_KEY` de bootstrap del PR de
  referencia — no existe esa env var en este proyecto, no la inventes.

**`src/app/(dashboard)/keys/page.tsx`** (nueva ruta, protegida igual que
`/settings` y `/feed` por `src/proxy.ts` — añade `/keys` al matcher):
Server component: lee `auth()` (orgId/userId/orgRole), busca `company_id`
por `clerk_org_id` vía `admin.ts`, lista las keys de esa empresa
(`name`, `key_prefix`, `created_at`, `last_used_at`, `revoked_at`,
ordenadas por `created_at desc`). Usa `Card`/`Table`-like markup con
componentes de shadcn (si no existe `table.tsx`, añádelo con
`pnpm exec shadcn add table`) — **nunca** una `<table>` con estilos
inline como el PR de referencia. Solo `org:admin` puede generar/revocar
(igual patrón que `/settings`: si no es admin, vista de solo lectura de
la lista, sin controles).

**`src/app/(dashboard)/keys/actions.ts`** (Server Actions):
- `createKey(name: string)`: valida `orgRole === 'org:admin'` en el
  servidor, resuelve `company_id` por `clerk_org_id`, genera la key,
  inserta la fila, hace `revalidatePath('/keys')`, devuelve `{ raw }`
  (la key cruda) o `{ error }`. La key cruda **solo se devuelve esta
  vez** — nunca se vuelve a poder leer.
- `revokeKey(id: string)`: valida admin + que la key pertenezca a la
  empresa de la organización activa (no confíes solo en el `id` del
  formulario), setea `revoked_at = now()`.

**`src/app/(dashboard)/keys/create-key-form.tsx`** (client component):
Formulario shadcn (`Input` + `Button`) para generar una key con nombre.
Cuando `createKey` devuelve `raw`, muéstrala en un `Alert` (variante
success/default de shadcn) con copy tipo "cópiala ahora, no se vuelve a
mostrar" — usa un botón de copiar al portapapeles si es simple de añadir,
si no, basta con que el texto sea seleccionable.

**Nav**: añade "API Keys" (→ `/keys`) al array `navItems` de
`(dashboard)/layout.tsx` (o del nuevo `nav-links.tsx` del punto 3).

**Rutas MCP existentes** (`src/app/api/mcp/route.ts` y
`src/app/api/public/norms/route.ts`): estas rutas hoy son 100% públicas
sin ningún guard, y son de otro track (M5). Añadir el guard de API key
ahí es un cambio de comportamiento cross-track (puede romper la demo si
algo más las está usando sin key todavía) — **no las toques** en esta
iteración; el guard queda listo en `src/lib/api-keys.ts`
(`validateApiKey(req)` que revisa header `x-api-key` o
`Authorization: Bearer cai_...`) para que el dueño de esas rutas lo
enchufe cuando le corresponda. Documenta esto explícitamente en el reporte
final si haces esta implementación.

### 6. (Ya cubierto) Revisar `ComplAI-Crew/comply#5`

Ya está resumido arriba — es la referencia para el punto 4/5, no una
tarea aparte.

## Explícitamente FUERA de alcance (no lo construyas)

- Cualquier pantalla o control para configurar tema/apariencia.
- Pulido visual más allá de shadcn: nada de ilustraciones, gradientes,
  animaciones decorativas propias.
- Wireing el guard de API key dentro de `/api/mcp` o `/api/public/norms`
  (ver nota arriba — cross-track, fuera de esta iteración).
- Matching real, dispatcher de canales, análisis de repo/PR — no es tu
  track.

## Criterios de aceptación (marcar cada uno; el reviewer los verifica)

- [ ] `pnpm build` termina sin errores (typecheck incluido).
- [ ] `pnpm lint` sin errores (y sin diffs de Prettier si hay config —
      verificar primero si existe antes de exigirlo).
- [ ] Labels de "Nombre de la empresa" y "Tipo de sociedad" en
      `/settings` muestran un asterisco rojo (u otro indicador visual
      claro) de campo requerido.
- [ ] Cero apariciones de "CumplAI"/"CumplIA" en `src/` — todo dice
      "ComplAI" (`grep -rn "CumplAI\|CumplIA" src/` no devuelve nada).
- [ ] El tab activo del nav del header (desktop y móvil) se distingue
      claramente del inactivo al navegar entre `/feed` y `/settings`
      (y `/keys`).
- [ ] `/keys` existe, protegida por `src/proxy.ts`, lista las keys de la
      empresa activa, permite generar (solo admin) mostrando la key
      cruda una única vez, y revocar (solo admin).
- [ ] `api_keys` tiene RLS encendida y ningún acceso pasa fuera de
      `admin.ts`; la key cruda nunca se persiste, solo su hash.
- [ ] Todo componente de interfaz nuevo viene de `src/components/ui/*`
      (shadcn) — sin HTML a mano reinventando inputs/botones/tablas.
- [ ] Verificado visualmente en el navegador real (Claude en Chrome, no
      el navegador sandboxeado): `/settings` muestra los asteriscos,
      el nav marca la ruta activa, `/keys` genera y revoca una key sin
      errores de consola. Probado también en ~390px de ancho.
- [ ] Nada de "Explícitamente fuera de alcance" quedó implementado.

Cuando TODOS los checks estén en verde, el reviewer lo confirma
explícitamente en su reporte y el loop termina.
