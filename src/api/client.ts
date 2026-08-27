import { isClientLoginPath, isPanelLoginPath } from '../lib/publicRoutes'

const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    const hint = BASE
      ? `Não foi possível contactar a API (${BASE}).`
      : 'Não foi possível contactar a API. Confirme que `npm run dev:all` está a correr (Vite :3000 + API :3001).'
    throw new Error(hint)
  }
  if (res.status === 401) {
    const loc = window.location.pathname
    if (path.startsWith('/api/client-portal')) {
      if (!isClientLoginPath(loc) && loc !== '/cliente') {
        window.location.href = '/'
      }
    } else if (!isClientLoginPath(loc) && !isPanelLoginPath(loc)) {
      window.location.href = '/'
    }
    throw new Error('Não autorizado')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; detail?: string }
    const raw = (err.error || res.statusText || '').trim()
    // Nunca mostrar stack traces / detalhes técnicos ao utilizador
    const looksTechnical =
      /prisma|DATABASE_URL|Environment variable|at Object\.|at async |node_modules|\\|\/server\/|\.ts:\d+/i.test(
        raw
      ) ||
      (err.detail != null &&
        /prisma|DATABASE_URL|Environment variable|at Object\.|node_modules/i.test(String(err.detail)))
    if (looksTechnical || !raw) {
      throw new Error(
        path.includes('/auth/login')
          ? 'Erro ao iniciar sessão. Tente novamente.'
          : 'Ocorreu um erro. Tente novamente.'
      )
    }
    throw new Error(raw)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
