export type SourceNorm = {
  external_id: string; source: string; title: string; issuer: string | null
  norm_type: string | null; published_at: string | null; url: string | null
  raw_text: string
  // Omitted by sources of norms already in force → the DB default ('vigente') applies.
  // Sources of bills still being debated (e.g. Congreso) set 'en_tramite'.
  status?: 'vigente' | 'en_tramite'
}

// Each regulation source is a file that implements this and registers itself in ingest.ts.
export interface SourceAdapter {
  id: string
  /** `offset` lets ingestAll walk past the first page. Bounded sources (dian, sfc, croma)
   *  hand back everything they have on page 0 and an empty array afterwards, so ingestAll
   *  moves on without paying a second scrape of the same documents. */
  fetch(limit: number, offset?: number): Promise<SourceNorm[]>
}
