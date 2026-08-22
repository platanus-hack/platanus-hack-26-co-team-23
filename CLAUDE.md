# complAI — contexto para agentes

> Platanus Hack 2026 · Track ACCESS · team-23. Producto: la normativa colombiana convertida
> en agente — ingesta multi-fuente, alertas multicanal personalizadas (Plus), PRs de
> cumplimiento con revisor humano (PRO), y MCP server (HTTP + npm `complai-mcp`).

## Lee esto primero

1. **Plan ejecutable (fuente de verdad del QUÉ y CÓMO):**
   [`docs/superpowers/plans/2026-08-22-complai.md`](./docs/superpowers/plans/2026-08-22-complai.md)
   — Task 0 + tracks por miembro, con código completo, tests e **Interfaces** por tarea.
   Ejecútalo con `superpowers:executing-plans` (o subagent-driven), tarea por tarea, marcando checkboxes.
2. **Anteproyecto (pitch, datos, fuentes):** [`docs/ANTEPROYECTO.md`](./docs/ANTEPROYECTO.md)

## Reparto por miembro

| Miembro | Track | Tareas del plan |
|---|---|---|
| M1 — Alejandro (@alejocas17) | Task 0 (bloquea a todos) + data pipeline: fuentes SUIN/DIAN/SFC/SIC + estructuración LLM | 0, 1, 1b, 1c, 2 |
| M2 | Google SSO + dashboard settings → luego canales wow (WhatsApp Kapso + voz Retell) | 3, 4, 5b |
| M3 | Matching + dispatcher multicanal + canales base + feed | 5, 6 |
| M4 | Tier PRO: análisis de repo → PR → reviewer | 7 |
| M5 | MCP server + paquete npm + deploy Vercel + demo | 8, 9 |

Asignar M2–M5 a Santiago R., David, Santiago P. y Juan E. según preferencia. La Task 1c es
delegable a quien vaya adelantado.

## Reglas del repo (no negociables en las 36h)

- **La Task 0 y el track M1 (pipeline de ingesta) ya están en `main` y verificados** — el
  contrato compartido (schema + `src/lib/types.ts` + seed + 64 normas reales en Supabase) existe.
- **Flujo de ramas:** `feat/<lo-tuyo>` sale de **`dev`** (rama default) → PR a `dev` →
  cuando hay demo-candidate, PR `dev` → `main`. Ramas de vida corta (<3h), mergear apenas compile.
- **Espejo a Platanus: automático.** Un GitHub Action (`.github/workflows/mirror.yml`) replica
  cada push al repo de Platanus. **NO configures dual-push local** (regla vieja del README) y
  **jamás pushees directo al repo de Platanus** — desincroniza el espejo y el Action fallará.
- Conventional Commits.
- Cada tarea del plan declara qué **consume/produce** — si necesitas algo de otro track,
  míralo en su bloque `Interfaces`, no leas su código a medio hacer.
- El agente PRO **nunca mergea PRs**; el modelo LLM se referencia solo vía `MODEL` en
  `src/lib/llm.ts`; taxonomía de sectores cerrada en `SECTORS` (`src/lib/types.ts`).

## Stack y comandos

Next.js 15 (App Router, TypeScript, pnpm) + Supabase (Postgres + Auth Google) +
`@anthropic-ai/sdk` + Vercel. Env vars: ver **Global Constraints** en el plan.

```bash
pnpm dev          # local
pnpm test         # vitest
pnpm build        # typecheck + build
# disparar pipeline local:
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/match
```

## Pendientes de setup manual (hacer temprano, dependen de terceros)

- [ ] Proyecto Supabase + Google OAuth (Task 0 Step 2)
- [ ] Cuenta Kapso (WhatsApp) + número — API key en env (Task 5b)
- [ ] Cuenta Retell (voz) + agente con el prompt del plan + número (Task 5b)
- [ ] Verificar `complai-mcp` libre en npm (`npm view complai-mcp` → 404 = libre)
- [ ] Repo demo `facturador-demo` con código que "incumple" (Task 7)
- [ ] Antes de entregar: `platanus-hack-project.jsonc` + `project-description.md` + logo
  (requisitos del README de Platanus — escribir el readme final a mano)
