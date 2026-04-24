// Server components use the internal Docker network URL.
// Client components use the public localhost URL.
const getBaseUrl = () =>
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? 'http://api:8000')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
