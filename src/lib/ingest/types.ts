export type SourceNorm = {
  external_id: string; source: string; title: string; issuer: string | null
  norm_type: string | null; published_at: string | null; url: string | null
  raw_text: string
}

// Each regulation source is a file that implements this and registers itself in ingest.ts.
export interface SourceAdapter {
  id: string
  /** `offset` lets ingestAll walk past the first page. Sources that can't paginate
   *  ignore it and simply return the same first page again — ingestAll detects that
   *  nothing new arrived and moves on. */
  fetch(limit: number, offset?: number): Promise<SourceNorm[]>
}
