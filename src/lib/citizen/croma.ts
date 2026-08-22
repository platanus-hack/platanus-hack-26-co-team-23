/**
 * Public-record lookups for one citizen, by cédula.
 *
 * Timings measured live (2026-08-22) against a real key, with a fictional cédula:
 * procuraduría 4.5s · registraduría 5.2s · adres 10s · contaduría 54s.
 * That spread is why the scan streams: waiting for the slowest source would make
 * everyone wait a minute for data that was ready in five seconds.
 *
 * SICAAC (insolvency) is deliberately absent: its endpoint runs as an async job and
 * returned 502 `job_failed` inline. It needs polling, not a request.
 */
const BASE = 'https://api.croma.run'

export const CITIZEN_SOURCES = ['registraduria', 'procuraduria', 'adres', 'contaduria'] as const
export type CitizenSource = (typeof CITIZEN_SOURCES)[number]

const PATHS: Record<CitizenSource, string> = {
  registraduria: '/co/registraduria/vital-status/v1',
  procuraduria: '/co/procuraduria/disciplinary-records/v1',
  adres: '/co/adres/affiliation-status/v1',
  contaduria: '/co/contaduria/state-delinquent-debtors/v1',
}

/** Slowest source needs ~54s; anything past 90s is a dead request, not a slow one. */
const TIMEOUT_MS = 90_000

export type SourceResult =
  | { source: CitizenSource; ok: true; ms: number; data: Record<string, unknown> }
  | { source: CitizenSource; ok: false; ms: number; error: string }

export async function fetchSource(source: CitizenSource, cedula: string): Promise<SourceResult> {
  const t0 = Date.now()
  try {
    const res = await fetch(BASE + PATHS[source], {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CROMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_number: cedula }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const ms = Date.now() - t0
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
      return { source, ok: false, ms, error: message }
    }
    // Croma wraps every payload one level deep in `data`.
    return { source, ok: true, ms, data: (body as { data?: Record<string, unknown> }).data ?? {} }
  } catch (e) {
    return { source, ok: false, ms: Date.now() - t0, error: (e as Error).message }
  }
}

/** Each source resolves on its own so the caller can emit it as it lands. */
export const fetchAllSources = (cedula: string): Promise<SourceResult>[] =>
  CITIZEN_SOURCES.map((s) => fetchSource(s, cedula))

export type CitizenProfile = {
  cedula: string
  nombre: string | null
  cedulaValida: boolean | null
  eps: string | null
  regimen: string | null
  tieneAntecedentes: boolean | null
  deudorDelEstado: boolean | null
}

/** Folds whatever sources have answered so far into a profile. Partial by design. */
export function buildProfile(cedula: string, results: SourceResult[]): CitizenProfile {
  const ok = (s: CitizenSource) => results.find((r) => r.source === s && r.ok) as
    | Extract<SourceResult, { ok: true }>
    | undefined
  const reg = ok('registraduria')?.data
  const adres = ok('adres')?.data
  const proc = ok('procuraduria')?.data
  const cont = ok('contaduria')?.data
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

  return {
    cedula,
    nombre: str(adres?.full_name) ?? str(proc?.full_name) ?? str(reg?.full_name),
    cedulaValida: reg ? reg.status === 'ALIVE' : null,
    eps: str(adres?.eps) ?? str(adres?.entity) ?? null,
    regimen: str(adres?.regimen) ?? null,
    tieneAntecedentes: proc ? proc.found === true : null,
    deudorDelEstado: cont ? cont.reported === true : null,
  }
}
