import { App, Octokit } from 'octokit'

export type Gh = Octokit

/**
 * Cliente de GitHub para UNA empresa.
 *
 * - Con `installationId`: la empresa instaló la GitHub App en sus repos y el token
 *   se pide al vuelo (dura 1h, alcance solo los repos que ella eligió).
 * - Sin él: se cae al PAT de `GITHUB_TOKEN`, que es el modo demo — una sola cuenta
 *   que debe ser colaboradora del repo. No sirve para múltiples clientes.
 */
export async function octokitFor(installationId: number | null): Promise<Gh> {
  if (installationId) {
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    if (!appId || !privateKey)
      throw new Error('la empresa tiene GitHub App instalada pero faltan GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY')
    // Vercel guarda los saltos de línea del PEM escapados.
    const app = new App({ appId, privateKey: privateKey.replace(/\\n/g, '\n') })
    return app.getInstallationOctokit(installationId) as unknown as Gh
  }
  if (!process.env.GITHUB_TOKEN)
    throw new Error('empresa sin GitHub App instalada y sin GITHUB_TOKEN de respaldo')
  return new Octokit({ auth: process.env.GITHUB_TOKEN })
}
