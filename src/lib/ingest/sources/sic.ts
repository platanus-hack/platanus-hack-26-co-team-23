import tls from 'node:tls'
import { Agent } from 'undici'
import type { SourceAdapter, SourceNorm } from '../types'
import { stripHtml, parseSpanishDate, BROWSER_HEADERS } from '../scrape'

const BASE = 'https://www.sic.gov.co'
// mapeo verificado del repositorio Drupal: cada value devuelve una tabla de 10 ítems
const LISTINGS = [
  { url: `${BASE}/repositorio-de-normatividad?field_tipo_de_norma_value=3`, norm_type: 'resolucion' },
  { url: `${BASE}/repositorio-de-normatividad?field_tipo_de_norma_value=5`, norm_type: 'circular' },
]

// sic.gov.co sirve una cadena TLS incompleta: no envía su intermedio. La verificación
// se mantiene COMPLETA — solo agregamos el intermedio oficial de GlobalSign
// (bajado del AIA del propio cert del sitio: secure.globalsign.com/cacert/gsrsaovsslca2018.crt,
// emitido por GlobalSign Root CA R3, que está en el trust store de Node; expira 2028-11).
// Copia en repo: src/lib/ingest/certs/globalsign-rsa-ov-2018.pem
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

// trust store por defecto + el intermedio que el sitio omite
const sicAgent = new Agent({
  connect: { ca: [...tls.rootCertificates, GLOBALSIGN_RSA_OV_2018] },
})
const sicFetch = (url: string) =>
  fetch(url, { headers: BROWSER_HEADERS, dispatcher: sicAgent } as RequestInit)

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// Filas de la tabla del repositorio: [tipo, tema, nombre, descripción, fecha, ..., link PDF]
export function parseSicRows(html: string, norm_type: string, limit: number): SourceNorm[] {
  const norms: SourceNorm[] = []
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, c]) => stripHtml(c))
    if (cells.length < 5 || !cells[2]) continue
    const [, tema, nombre, descripcion, fecha] = cells
    const pdf = row.match(/href="(https?:\/\/[^"]+\.pdf[^"]*)"/i)?.[1] ?? null
    norms.push({
      external_id: `sic-${slug(nombre)}`,
      source: 'sic',
      title: `${nombre} (SIC)${descripcion ? ` — ${descripcion.slice(0, 90)}` : ''}`,
      issuer: 'SIC',
      norm_type,
      published_at: parseSpanishDate(fecha ?? ''),
      url: pdf,
      // metadata del listado; el texto completo vive en el PDF (stretch post-hackathon)
      raw_text: `${nombre} — SIC. Tema: ${tema}. ${descripcion}. Fecha: ${fecha}.`,
    })
    if (norms.length >= limit) break
  }
  return norms
}

export const sic: SourceAdapter = {
  id: 'sic',
  async fetch(limit = 10) {
    const norms: SourceNorm[] = []
    for (const listing of LISTINGS) {
      const html = await (await sicFetch(listing.url)).text()
      norms.push(...parseSicRows(html, listing.norm_type, Math.ceil(limit / LISTINGS.length)))
    }
    return norms
  },
}
