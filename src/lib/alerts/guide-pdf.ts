import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Brief } from './brief'
import { LOGO_PNG_BASE64 } from './logo'

/**
 * The standard PDF fonts encode in WinAnsi: accents and ñ are fine, but an emoji
 * or an exotic dash makes pdf-lib throw while drawing. Sanitize before drawing so
 * a stray character from the model can't break the download.
 */
const WINANSI_OK = /[\x20-\x7E\xA0-\xFF‘’“”–—•€…]/
function sanitize(text: string): string {
  return [...text.replace(/\s+/g, ' ')].map((c) => (WINANSI_OK.test(c) ? c : '')).join('').trim()
}

const A4 = { w: 595.28, h: 841.89 }
const MARGIN = 56
const INK = rgb(0.11, 0.11, 0.12)
const MUTED = rgb(0.42, 0.44, 0.48)
const RULE = rgb(0.85, 0.86, 0.88)

type Cursor = { page: PDFPage; y: number }

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of sanitize(text).split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else current = candidate
  }
  if (current) lines.push(current)
  return lines
}

export async function buildGuidePdf(
  brief: Brief,
  meta: { normTitle: string; companyName: string; source: string | null; url: string | null },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const contentWidth = A4.w - MARGIN * 2
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'))

  // The watermark is stamped when the page is created, before any text:
  // in PDF, whatever is drawn first stays underneath.
  const newPage = (): PDFPage => {
    const page = pdf.addPage([A4.w, A4.h])
    const w = A4.w * 0.62
    const h = (w * logo.height) / logo.width
    page.drawImage(logo, {
      x: (A4.w - w) / 2,
      y: (A4.h - h) / 2,
      width: w,
      height: h,
      opacity: 0.06,
    })
    return page
  }

  const cursor: Cursor = { page: newPage(), y: A4.h - MARGIN }
  const room = (needed: number) => {
    if (cursor.y - needed < MARGIN) {
      cursor.page = newPage()
      cursor.y = A4.h - MARGIN
    }
  }
  const text = (
    body: string,
    o: { size?: number; font?: PDFFont; color?: typeof INK; gap?: number; indent?: number } = {},
  ) => {
    const size = o.size ?? 11
    const font = o.font ?? regular
    const indent = o.indent ?? 0
    for (const line of wrap(body, font, size, contentWidth - indent)) {
      room(size * 1.45)
      cursor.page.drawText(line, {
        x: MARGIN + indent,
        y: cursor.y - size,
        size,
        font,
        color: o.color ?? INK,
      })
      cursor.y -= size * 1.45
    }
    cursor.y -= o.gap ?? 0
  }
  const divider = () => {
    room(18)
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y - 8 },
      end: { x: A4.w - MARGIN, y: cursor.y - 8 },
      thickness: 0.75,
      color: RULE,
    })
    cursor.y -= 22
  }

  // Cover. Every printed string stays in Spanish — it's what the user reads.
  text('GUÍA DE CUMPLIMIENTO', { size: 9, font: bold, color: MUTED, gap: 6 })
  text(meta.normTitle, { size: 19, font: bold, gap: 6 })
  text(`Preparada para ${meta.companyName}`, { size: 11, color: MUTED })
  if (brief.plazo) text(`Plazo: ${brief.plazo}`, { size: 11, font: bold, color: MUTED })
  divider()

  for (const [heading, body] of [
    ['Qué cambió', brief.que_cambio],
    ['Por qué te afecta', brief.por_que_te_afecta],
    ['Qué pasa si no haces nada', brief.si_no_haces_nada],
  ] as const) {
    text(heading, { size: 13, font: bold, gap: 4 })
    text(body, { gap: 14 })
  }

  text('Qué deberías hacer', { size: 13, font: bold, gap: 6 })
  brief.pasos.forEach((step, i) => {
    text(`${i + 1}. ${step.titulo}`, { size: 11, font: bold, gap: 2 })
    text(step.detalle, { size: 10.5, indent: 16, gap: 2 })
    text(`Responsable: ${step.responsable}`, { size: 9.5, color: MUTED, indent: 16, gap: 10 })
  })

  divider()
  if (meta.source) text(`Fuente: ${meta.source}`, { size: 9, color: MUTED })
  if (meta.url) text(meta.url, { size: 9, color: MUTED })
  text(
    'Generada por complAI a partir del texto oficial de la norma. Es una guía operativa, no asesoría legal: ' +
      'contrasta los plazos y montos con la publicación oficial antes de actuar.',
    { size: 9, color: MUTED },
  )

  return pdf.save()
}
