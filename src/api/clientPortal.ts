import { isClientLoginPath } from '../lib/publicRoutes'

const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (res.status === 401) {
    if (!isClientLoginPath()) {
      window.location.href = '/'
    }
    throw new Error('Não autorizado')
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string }
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const clientPortalApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}
