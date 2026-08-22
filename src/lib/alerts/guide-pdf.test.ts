import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildGuidePdf } from './guide-pdf'
import type { Brief } from './brief'

const brief: Brief = {
  que_cambio: 'La DIAN exige campos nuevos en la factura electrónica.',
  por_que_te_afecta: 'Tu compañía emite facturación electrónica en el sector tecnología.',
  si_no_haces_nada: 'Las facturas serían rechazadas en la validación previa.',
  pasos: [{ titulo: 'Actualizar el XML', detalle: 'Agregar los campos.', responsable: 'TI' }],
  plazo: '1 de octubre de 2026',
}
const meta = { normTitle: 'Resolución DIAN', companyName: 'Demo SAS', source: 'DIAN', url: null }

const pdfBytes = async (b: Brief) => buildGuidePdf(b, meta)

describe('guía en PDF', () => {
  it('produce un PDF válido con acentos y ñ', async () => {
    const pdf = await pdfBytes(brief)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(1000)
  })

  it('no revienta con caracteres fuera de WinAnsi (emoji, viñetas, CJK)', async () => {
    // Las fuentes estándar de PDF codifican en WinAnsi: sin sanear, pdf-lib lanza aquí.
    const sucio: Brief = {
      ...brief,
      que_cambio: '🚨 Cambio urgente ⚠️ 中文 — con viñeta • y comillas “así”',
      pasos: [{ titulo: '✅ Hacerlo', detalle: 'Ya 🎯', responsable: 'TI' }],
    }
    await expect(pdfBytes(sucio)).resolves.toBeInstanceOf(Uint8Array)
  })

  it('funciona sin plazo y sin fuente', async () => {
    const pdf = await buildGuidePdf({ ...brief, plazo: null }, { ...meta, source: null })
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
  })

  it('pagina cuando el contenido no cabe en una hoja', async () => {
    const largo: Brief = {
      ...brief,
      pasos: Array.from({ length: 40 }, (_, i) => ({
        titulo: `Paso ${i + 1} con un título razonablemente largo para ocupar espacio`,
        detalle: 'Detalle de la acción a ejecutar, con su explicación correspondiente.',
        responsable: 'contador',
      })),
    }
    const pdf = await pdfBytes(largo)
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1)
  })
})
