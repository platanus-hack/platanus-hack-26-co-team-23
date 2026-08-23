import tls from 'node:tls'
import { Agent } from 'undici'
import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

const BASE = 'https://www.sic.gov.co'
// verified mapping of the Drupal repository: each value returns a table of 10 items
const LISTINGS = [
  { url: `${BASE}/repositorio-de-normatividad?field_tipo_de_norma_value=3`, norm_type: 'resolucion' },
  { url: `${BASE}/repositorio-de-normatividad?field_tipo_de_norma_value=5`, norm_type: 'circular' },
]

// sic.gov.co serves an incomplete TLS chain: it doesn't send its intermediate. Verification
// stays FULL — we just add the official GlobalSign intermediate
// (downloaded from the site's own cert's AIA: secure.globalsign.com/cacert/gsrsaovsslca2018.crt,
// issued by GlobalSign Root CA R3, which is in Node's trust store; expires 2028-11).
// Copy in the repo: src/lib/ingest/certs/globalsign-rsa-ov-2018.pem
const GLOBALSIGN_RSA_OV_2018 = `-----BEGIN CERTIFICATE-----
MIIETjCCAzagAwIBAgINAe5fIh38YjvUMzqFVzANBgkqhkiG9w0BAQsFADBMMSAw
HgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEGA1UEChMKR2xvYmFs
U2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjAeFw0xODExMjEwMDAwMDBaFw0yODEx
MjEwMDAwMDBaMFAxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52
LXNhMSYwJAYDVQQDEx1HbG9iYWxTaWduIFJTQSBPViBTU0wgQ0EgMjAxODCCASIw
DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKdaydUMGCEAI9WXD+uu3Vxoa2uP
UGATeoHLl+6OimGUSyZ59gSnKvuk2la77qCk8HuKf1UfR5NhDW5xUTolJAgvjOH3
idaSz6+zpz8w7bXfIa7+9UQX/dhj2S/TgVprX9NHsKzyqzskeU8fxy7quRU6fBhM
abO1IFkJXinDY+YuRluqlJBJDrnw9UqhCS98NE3QvADFBlV5Bs6i0BDxSEPouVq1
lVW9MdIbPYa+oewNEtssmSStR8JvA+Z6cLVwzM0nLKWMjsIYPJLJLnNvBhBWk0Cq
o8VS++XFBdZpaFwGue5RieGKDkFNm5KQConpFmvv73W+eka440eKHRwup08CAwEA
AaOCASkwggElMA4GA1UdDwEB/wQEAwIBhjASBgNVHRMBAf8ECDAGAQH/AgEAMB0G
A1UdDgQWBBT473/yzXhnqN5vjySNiPGHAwKz6zAfBgNVHSMEGDAWgBSP8Et/qC5F
JK5NUPpjmove4t0bvDA+BggrBgEFBQcBAQQyMDAwLgYIKwYBBQUHMAGGImh0dHA6
Ly9vY3NwMi5nbG9iYWxzaWduLmNvbS9yb290cjMwNgYDVR0fBC8wLTAroCmgJ4Yl
aHR0cDovL2NybC5nbG9iYWxzaWduLmNvbS9yb290LXIzLmNybDBHBgNVHSAEQDA+
MDwGBFUdIAAwNDAyBggrBgEFBQcCARYmaHR0cHM6Ly93d3cuZ2xvYmFsc2lnbi5j
b20vcmVwb3NpdG9yeS8wDQYJKoZIhvcNAQELBQADggEBAJmQyC1fQorUC2bbmANz
EdSIhlIoU4r7rd/9c446ZwTbw1MUcBQJfMPg+NccmBqixD7b6QDjynCy8SIwIVbb
0615XoFYC20UgDX1b10d65pHBf9ZjQCxQNqQmJYaumxtf4z1s4DfjGRzNpZ5eWl0
6r/4ngGPoJVpjemEuunl1Ig423g7mNA2eymw0lIYkN5SQwCuaifIFJ6GlazhgDEw
fpolu4usBCOmmQDo8dIm7A9+O4orkjgTHY+GzYZSR+Y0fFukAj6KYXwidlNalFMz
hriSqHKvoflShx8xpfywgVcvzfTO3PYkz6fiNJBonf6q8amaEsybwMbDqKWwIX7e
SPY=
-----END CERTIFICATE-----`

// default trust store + the intermediate the site omits
const sicAgent = new Agent({
  connect: { ca: [...tls.rootCertificates, GLOBALSIGN_RSA_OV_2018] },
})
const sicFetch = (url: string) =>
  fetch(url, { headers: BROWSER_HEADERS, dispatcher: sicAgent } as RequestInit)

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// Repository table rows: [type, topic, name, description, date, ..., PDF link]
export function parseSicRows(html: string, norm_type: string, limit: number): SourceNorm[] {
  const norms: SourceNorm[] = []
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, c]) => stripHtml(c))
    if (cells.length < 5 || !cells[2]) continue
    const [, topic, name, description, date] = cells
    const pdf = row.match(/href="(https?:\/\/[^"]+\.pdf[^"]*)"/i)?.[1] ?? null
    const published_at = parseSpanishDate(date ?? '')
    // The name alone is NOT unique: the SIC restarts its numbering every year, so
    // "Circular 03" exists in almost every one of them and the ids collapsed onto a single
    // row — the upsert then kept whichever page arrived last and dropped the rest. The date
    // also separates the long titles that the 60-char slug truncates to the same string.
    norms.push({
      external_id: `sic-${slug(name)}-${published_at ?? 'sin-fecha'}`,
      source: 'sic',
      title: `${name} (SIC)${description ? ` — ${description.slice(0, 90)}` : ''}`,
      issuer: 'SIC',
      norm_type,
      published_at,
      url: pdf,
      // listing metadata; the full text lives in the PDF (post-hackathon stretch)
      raw_text: `${name} — SIC. Tema: ${topic}. ${description}. Fecha: ${date}.`,
    })
    if (norms.length >= limit) break
  }
  return norms
}

export const sic: SourceAdapter = {
  id: 'sic',
  async fetch(limit = 10, offset = 0) {
    // The Drupal listing paginates with ?page=N (0-based) and each page holds 10 rows.
    // `limit` is a per-page cap, not a budget to split across listings: splitting it
    // (ceil(limit / 2) = 8) silently dropped 2 of every page's 10 rows.
    const page = Math.floor(offset / limit)
    const norms: SourceNorm[] = []
    for (const listing of LISTINGS) {
      const html = await (await sicFetch(`${listing.url}&page=${page}`)).text()
      norms.push(...parseSicRows(html, listing.norm_type, limit))
    }
    return norms
  },
}
