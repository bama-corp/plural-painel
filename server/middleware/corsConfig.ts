/**
 * Origens CORS: variável CORS_ORIGINS (lista separada por vírgulas: https://a.com,https://b.com).
 * Em produção, se existir VERCEL_URL, adiciona-se https://<VERCEL_URL> automaticamente.
 * Em desenvolvimento (NODE_ENV !== 'production') usa-se `origin: true` para o Vite (localhost) sem configuração.
 */
export function getCorsOptions() {
  const raw = process.env.CORS_ORIGINS || ''
  const list = new Set(
    raw
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
  )
  if (process.env.VERCEL_URL) {
    list.add(`https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`)
  }

  if (process.env.NODE_ENV !== 'production') {
    return { origin: true, credentials: true, maxAge: 86400 }
  }

  const allowed = Array.from(list)

  return {
    credentials: true,
    maxAge: 86400,
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Postman, curl, server-to-server, alguns clientes móveis
      if (!origin) {
        return callback(null, true)
      }
      if (allowed.length === 0) {
        console.warn(
          '[CORS] Em produção sem CORS_ORIGINS nem derivado; a aceitar a origem do pedido. Defina CORS_ORIGINS (domínio do painel).'
        )
        return callback(null, true)
      }
      return callback(null, allowed.includes(origin))
    },
  }
}
