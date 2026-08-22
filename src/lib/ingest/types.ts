export type SourceNorm = {
  external_id: string; source: string; title: string; issuer: string | null
  norm_type: string | null; published_at: string | null; url: string | null
  raw_text: string
}

// Cada fuente de normativa es un archivo que implementa esto y se registra en ingest.ts.
export interface SourceAdapter {
  id: string
  fetch(limit: number): Promise<SourceNorm[]>
}
