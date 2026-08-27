/**
 * Retry para erros de conexão à BD (Neon pausado, timeouts, etc.)
 */
const MAX_ATTEMPTS = 3
const DELAY_MS = 600

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: string })?.code
  return (
    /can't reach database|connection refused|connection timeout|ECONNRESET|ETIMEDOUT|connection/i.test(msg) ||
    code === 'P1001' ||
    code === 'P1017' ||
    code === 'P2024'
  )
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (isConnectionError(e) && attempt < MAX_ATTEMPTS) {
      await sleep(DELAY_MS * attempt)
      return withRetry(fn, attempt + 1)
    }
    throw e
  }
}
