import { validateApiKey, unauthorized } from '@/lib/api-keys'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// Guard compartido para las superficies públicas: rate limit (antes de auth, para
// frenar brute-force de keys) + validación de API key. Un solo lugar que mantener.
export function withApiGuard(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const rl = await rateLimit(req)
    if (!rl.ok) return tooManyRequests(rl.retryAfter)
    if (!(await validateApiKey(req))) return unauthorized()
    return fn(req)
  }
}
