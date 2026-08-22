// Helpers compartidos de scraping para fuentes HTML (DIAN, SFC, SIC)

const ENTITIES: Record<string, string> = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  nbsp: ' ', amp: '&', quot: '"', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—',
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
}

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

export const BROWSER_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }

// fechas tipo "Sep 29, 2023" / "Dic 7, 2018" (abreviaturas ES) → ISO
const MONTHS: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
}
export function parseSpanishDate(text: string): string | null {
  const m = text.match(/([A-Za-z]{3})\w*\.?\s+(\d{1,2}),?\s+(\d{4})/)
  if (!m) return text.match(/\b(20\d\d)\b/) ? `${text.match(/\b(20\d\d)\b/)![1]}-01-01` : null
  const month = MONTHS[m[1].toLowerCase().slice(0, 3)]
  return month ? `${m[3]}-${month}-${m[2].padStart(2, '0')}` : `${m[3]}-01-01`
}
