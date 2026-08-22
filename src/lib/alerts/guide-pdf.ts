import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Brief } from './brief'
import { LOGO_PNG_BASE64 } from './logo'

/**
 * Las fuentes estándar de PDF codifican en WinAnsi: acentos y ñ entran, pero un
 * emoji o un guion largo raro hace que pdf-lib lance al escribir. Sanitizamos
 * antes de dibujar para que un texto del modelo no rompa la descarga.
 */
const WINANSI_OK = /[\x20-\x7E\xA0-\xFF‘’“”–—•€…]/
function sanitize(text: string): string {
  return [...text.replace(/\s+/g, ' ')].map((c) => (WINANSI_OK.test(c) ? c : '')).join('').trim()
}

const A4 = { w: 595.28, h: 841.89 }
const MARGIN = 56
const TINTA = rgb(0.11, 0.11, 0.12)
const SUAVE = rgb(0.42, 0.44, 0.48)
const LINEA = rgb(0.85, 0.86, 0.88)

type Cursor = { page: PDFPage; y: number }

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lineas: string[] = []
  let actual = ''
  for (const palabra of sanitize(text).split(' ')) {
    const tentativa = actual ? `${actual} ${palabra}` : palabra
    if (font.widthOfTextAtSize(tentativa, size) > maxWidth && actual) {
      lineas.push(actual)
      actual = palabra
    } else actual = tentativa
  }
  if (actual) lineas.push(actual)
  return lineas
}

export async function buildGuidePdf(
  brief: Brief,
  meta: { normTitle: string; companyName: string; source: string | null; url: string | null },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ancho = A4.w - MARGIN * 2

  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'))

  // La marca de agua se estampa al crear la página, antes de cualquier texto:
  // en PDF lo que se dibuja primero queda debajo.
  const nuevaPagina = (): PDFPage => {
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

  const cur: Cursor = { page: nuevaPagina(), y: A4.h - MARGIN }
  const espacio = (n: number) => {
    if (cur.y - n < MARGIN) {
      cur.page = nuevaPagina()
      cur.y = A4.h - MARGIN
    }
  }
  const texto = (
    t: string,
    o: { size?: number; font?: PDFFont; color?: typeof TINTA; gap?: number; indent?: number } = {},
  ) => {
    const size = o.size ?? 11
    const font = o.font ?? regular
    const indent = o.indent ?? 0
    for (const linea of wrap(t, font, size, ancho - indent)) {
      espacio(size * 1.45)
      cur.page.drawText(linea, {
        x: MARGIN + indent,
        y: cur.y - size,
        size,
        font,
        color: o.color ?? TINTA,
      })
      cur.y -= size * 1.45
    }
    cur.y -= o.gap ?? 0
  }
  const separador = () => {
    espacio(18)
    cur.page.drawLine({
      start: { x: MARGIN, y: cur.y - 8 },
      end: { x: A4.w - MARGIN, y: cur.y - 8 },
      thickness: 0.75,
      color: LINEA,
    })
    cur.y -= 22
  }

  // Portada
  texto('GUÍA DE CUMPLIMIENTO', { size: 9, font: bold, color: SUAVE, gap: 6 })
  texto(meta.normTitle, { size: 19, font: bold, gap: 6 })
  texto(`Preparada para ${meta.companyName}`, { size: 11, color: SUAVE })
  if (brief.plazo) texto(`Plazo: ${brief.plazo}`, { size: 11, font: bold, color: SUAVE })
  separador()

  for (const [titulo, cuerpo] of [
    ['Qué cambió', brief.que_cambio],
    ['Por qué te afecta', brief.por_que_te_afecta],
    ['Qué pasa si no haces nada', brief.si_no_haces_nada],
  ] as const) {
    texto(titulo, { size: 13, font: bold, gap: 4 })
    texto(cuerpo, { gap: 14 })
  }

  texto('Qué deberías hacer', { size: 13, font: bold, gap: 6 })
  brief.pasos.forEach((paso, i) => {
    texto(`${i + 1}. ${paso.titulo}`, { size: 11, font: bold, gap: 2 })
    texto(paso.detalle, { size: 10.5, indent: 16, gap: 2 })
    texto(`Responsable: ${paso.responsable}`, { size: 9.5, color: SUAVE, indent: 16, gap: 10 })
  })

  separador()
  if (meta.source) texto(`Fuente: ${meta.source}`, { size: 9, color: SUAVE })
  if (meta.url) texto(meta.url, { size: 9, color: SUAVE })
  texto(
    'Generada por complAI a partir del texto oficial de la norma. Es una guía operativa, no asesoría legal: ' +
      'contrasta los plazos y montos con la publicación oficial antes de actuar.',
    { size: 9, color: SUAVE },
  )

  return pdf.save()
}
