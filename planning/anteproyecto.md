# complAI — Implementation Plan (Platanus Hack 2026, 36h)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App que ingesta normativa colombiana (SUIN-Juriscol), la estructura con Claude, la cruza con el perfil de cada empresa y entrega alertas a Slack (Plus) + abre PRs de cumplimiento con revisor asignado (PRO) + expone todo como MCP server.

**Architecture:** Monolito Next.js 15 (App Router) desplegado en Vercel: API routes hacen de pipeline (ingesta → estructuración → matching → entrega) disparadas por cron/botón; Supabase da Postgres + Auth (Google SSO); Octokit abre los PRs; un endpoint `/api/mcp` expone las normas a agentes externos.

**Tech Stack:** Next.js 15 + TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), `@anthropic-ai/sdk` (modelo `claude-sonnet-5`), `zod`, `octokit`, `mcp-handler`, `vitest`, pnpm, Vercel.

## Global Constraints

- Todas las rutas de archivo son **relativas a la raíz del repo del equipo**. El plan asume repo Next.js vacío o recién creado.
- Node ≥ 20, gestor de paquetes **pnpm**.
- Modelo LLM en todo el proyecto: **`claude-sonnet-5`** (constante única en `src/lib/llm.ts` — nunca hardcodear en otro archivo).
- Taxonomía de sectores **cerrada** (ver `SECTORS` en Task 0) — LLM y formularios usan exactamente esa lista.
- Copy de UI en **español**.
- El agente PRO **nunca mergea** un PR — solo lo abre y asigna reviewer.
- Columnas DB y campos TS en `snake_case` (sin capa de mapeo).
- Env vars requeridas (`.env.local`, y en Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY`; para los canales wow (Task 5b): `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `RETELL_API_KEY`, `RETELL_FROM_NUMBER`, `RETELL_AGENT_ID`.
- **Entrega multicanal vía patrón adapter:** cada canal es un archivo en `src/lib/deliver/channels/` que implementa `ChannelAdapter` y se registra con UNA línea en `dispatch.ts`. Agregar un canal nunca toca el pipeline, el matching ni otros canales.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`).
- **Fuera de alcance del hackathon** (decisión consciente, no olvido): free tier/boletín, Diario Oficial scraping (SUIN + seed curado bastan para la demo), multi-país (el schema ya trae `country`), billing.

## Reparto por miembro (tracks paralelos)

| Miembro | Track | Tareas | Depende de |
|---|---|---|---|
| M1 | Data pipeline (fuentes SUIN + DIAN + SFC + SIC + estructuración) | 1, 1b, 1c, 2 | Task 0 (1c es delegable a quien vaya adelantado) |
| M2 | Auth + Dashboard de configuración | 3, 4 | Task 0 |
| M3 | Matching + dispatcher multicanal + canales base + feed | 5, 6 | Task 0 (usa seed; re-corre con datos reales cuando M1 termine) |
| M4 | PRO: análisis de repo + PR + reviewer | 7 | Task 0 (usa seed) |
| M5 | MCP server + deploy + demo | 8, 9 | Task 0 (usa seed) |
| M2 (tras Task 4) | Canales wow: WhatsApp (Kapso) + llamada de voz (Retell) | 5b | Task 5 (contrato `ChannelAdapter`) |

**Task 0 la hace un solo miembro (M1) con todos mirando** — es el contrato compartido (schema + types + seed). Nadie arranca su track hasta que Task 0 esté mergeada a `main`.

---

### Task 0: Fundación — scaffold, schema, types, seed (M1, bloquea a todos)

**Files:**
- Create: proyecto Next.js completo (scaffold)
- Create: `supabase/schema.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/types.ts`
- Create: `src/lib/llm.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `.env.local` (no se commitea), `.env.example`

**Interfaces:**
- Produces: tablas `norms`, `companies`, `alerts`; tipos `Norm`, `Company`, `Alert`, `SECTORS`; cliente `supabaseAdmin()`; constante `MODEL`. **Todos los tracks consumen esto.**

- [ ] **Step 1: Scaffold del proyecto**

```bash
pnpm create next-app@latest . --typescript --app --src-dir --no-tailwind --eslint --import-alias "@/*"
pnpm add @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk zod octokit mcp-handler
pnpm add -D vitest
```

- [ ] **Step 2: Crear proyecto en supabase.com** (plan free), habilitar **Google provider** en Authentication → Providers (crear OAuth client en Google Cloud Console, redirect URI: `https://<project>.supabase.co/auth/v1/callback`). Copiar URL + keys a `.env.local` y crear `.env.example` con las 6 vars vacías.

- [ ] **Step 3: Schema** — pegar en el SQL Editor de Supabase y guardar copia en `supabase/schema.sql`:

```sql
create table norms (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'suin' | 'seed'
  external_id text unique not null,        -- id de la norma en la fuente
  country text not null default 'CO',
  title text not null,
  issuer text,
  norm_type text,                          -- ley | decreto | resolucion | circular
  published_at date,
  url text,
  raw_text text,
  -- resultado de estructuración LLM (null hasta analizar):
  summary text,
  sectors text[] default '{}',
  company_types text[] default '{}',
  obligations jsonb default '[]',          -- [{action, deadline}]
  severity text,                           -- info | low | medium | high
  analyzed_at timestamptz
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users not null,
  name text not null,
  company_type text not null,              -- 'SAS' | 'SA' | 'LTDA' | 'persona natural'
  sectors text[] not null default '{}',
  channels jsonb not null default '[]',    -- [{type, min_severity?, config}] — ver ChannelConfig en types.ts
  github_repo text,                        -- 'owner/repo' (PRO)
  reviewer_github text,                    -- username del Tech Lead revisor (PRO)
  created_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),... (Tiempo restante: 37 KB)