import { anthropic, MODEL } from '@/lib/llm'

/**
 * COMPLIA.md es el archivo de contexto que vive en la raíz del repo del cliente:
 * describe qué hace el repo y qué archivos importan para cumplimiento normativo.
 * Es prosa libre — lo único que el agente extrae de forma determinista son las
 * rutas escritas en `backticks` que existan de verdad en el árbol del repo.
 */
export const COMPLIA_FILENAMES = ['COMPLIA.md', 'complia.md', '.complia.md']

/**
 * Rutas mencionadas en backticks que existen en el repo. Un backtick que termina
 * en "/" se expande a todos los archivos bajo esa carpeta.
 * Validar contra el árbol real evita que el manifiesto haga leer cualquier cosa.
 */
export function parseCompliaPaths(md: string, repoPaths: string[]): string[] {
  const known = new Set(repoPaths)
  const found = new Set<string>()
  for (const [, raw] of md.matchAll(/`([^`\n]+)`/g)) {
    const p = raw.trim().replace(/^\.\//, '')
    if (known.has(p)) found.add(p)
    else if (p.endsWith('/')) for (const r of repoPaths) if (r.startsWith(p)) found.add(r)
  }
  return [...found]
}

const GENERATE_SYSTEM = `Escribes el COMPLIA.md de un repositorio: el archivo que le dice a un
agente de cumplimiento normativo colombiano qué mirar cuando llegue una norma nueva.

Responde SOLO el markdown del archivo, sin explicaciones ni bloques de código alrededor.
Estructura:

# COMPLIA.md

Una o dos frases: qué hace este sistema y qué normativa lo toca (facturación DIAN,
protección de datos SIC, reportes SFC, etc.).

## Archivos relevantes

Lista cada archivo que un cambio normativo podría tocar, con su ruta EXACTA entre
backticks tal como aparece en el repo, seguida de qué hace y qué obligación cubre hoy.
Ordena de más a menos probable. Máximo 12. Ignora configs, lockfiles y tests.

## Fuera de alcance

Rutas entre backticks que el agente NO debe modificar, con el motivo.

## Notas para el revisor

Qué mirar con lupa en un PR generado automáticamente.`

/** Genera el contenido de COMPLIA.md a partir de los archivos del repo. */
export async function generateCompliaMd(
  repo: string,
  files: { path: string; content: string }[],
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: GENERATE_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `REPOSITORIO: ${repo}\n\nARCHIVOS:\n` +
          files.map((f) => `=== ${f.path} ===\n${f.content.slice(0, 6000)}`).join('\n\n'),
      },
    ],
  })
  const text = msg.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text' || !text.text.trim()) throw new Error('el modelo no devolvió COMPLIA.md')
  return text.text.trim()
}
