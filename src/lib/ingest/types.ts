export type SourceNorm = {
  external_id: string; source: string; title: string; issuer: string | null
  norm_type: string | null; published_at: string | null; url: string | null
  raw_text: string
}

// Each regulation source is a file that implements this and registers itself in ingest.ts.
export interface SourceAdapter {
  id: string
  fetch(limit: number): Promise<SourceNorm[]>
}
