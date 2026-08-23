/**
 * Where a norm comes from, in words the user recognizes.
 *
 * `norms.issuer` is who issued it and `norms.source` is the portal we ingested it
 * from. Both matter for trust: the issuer gives the authority, the portal is where
 * the reader goes to verify it — but naming both is only useful when they differ.
 */
type Source = {
  label: string
  /** True when the portal publishes norms from many entities, so the issuer adds
   *  information (SUIN carries every ministry). False when the portal *is* the
   *  entity, where printing both would read "Superfinanciera · Superintendencia
   *  Financiera". */
  aggregator?: boolean
}

const SOURCES: Record<string, Source> = {
  suin: { label: 'SUIN — Sistema Único de Información Normativa', aggregator: true },
  dian: { label: 'Normograma DIAN' },
  superfinanciera: { label: 'Superintendencia Financiera' },
  sic: { label: 'Superintendencia de Industria y Comercio' },
  congreso: { label: 'Congreso — Cámara de Representantes' },
  seed: { label: 'Datos de ejemplo' },
}

export const sourceLabel = (source: string | null | undefined): string =>
  (source && SOURCES[source]?.label) || source || 'Fuente oficial'

/** One line naming the origin: "Normograma DIAN", "MinHacienda · SUIN — …". */
export function sourceLine(issuer: string | null | undefined, source: string | null | undefined): string {
  const known = source ? SOURCES[source] : undefined
  const portal = sourceLabel(source)
  // Unknown portals keep the issuer: it's the only reliable attribution we have.
  const showIssuer = issuer && (known ? known.aggregator : true)
  return showIssuer ? `${issuer} · ${portal}` : portal
}
