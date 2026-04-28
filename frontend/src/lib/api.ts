import type {
  CascadeItem,
  InventoryEntry,
  InventoryStats,
  MuldoOut,
  PlanResult,
  BatchBreedResult,
  BreedRequest,
  CycleHistory,
} from '@/types'

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
  deleteWithStatus: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
}

export const apiCalls = {
  getCascade: (base_level = 0, optimakina = false) =>
    api.get<CascadeItem[]>(`/api/cascade?base_level=${base_level}&optimakina=${optimakina}`),
  getInventory: () => api.get<Record<string, InventoryEntry>>('/api/inventory'),
  getInventoryStats: () => api.get<InventoryStats>('/api/inventory/stats'),
  capture: (species_name: string, sex: 'F' | 'M', is_fertile = true) =>
    api.post<MuldoOut>('/api/inventory/capture', { species_name, sex, is_fertile }),
  bulkCapture: (species_name: string, sex: 'F' | 'M', count: number, is_fertile = true) =>
    api.post<MuldoOut[]>('/api/inventory/bulk-capture', { species_name, sex, count, is_fertile }),
  getPlan: (enclos_count: number, base_level: number, optimakina = false) =>
    api.post<PlanResult>('/api/plan', { enclos_count, base_level, optimakina }),
  submitBatch: (results: BreedRequest[]) =>
    api.post<BatchBreedResult>('/api/breed/batch', { results }),
  removeBySpecies: (species_name: string, sex: 'F' | 'M', count: number, is_fertile = true) =>
    api.deleteWithStatus<{ removed: number }>(
      `/api/inventory/by-species?species_name=${encodeURIComponent(species_name)}&sex=${sex}&count=${count}&is_fertile=${is_fertile}`
    ),
  getHistory: () => api.get<CycleHistory[]>('/api/history'),
  getDashboardProgression: () =>
    api.get<Array<{ cycle_number: number; species_ok_count: number; created_at: string }>>('/api/dashboard/progression'),
  exportData: () => api.get<Record<string, unknown>>('/api/export'),
  importData: (data: Record<string, unknown>, mode: 'replace' | 'merge') =>
    api.post<{ inserted: Record<string, number> }>(`/api/import?mode=${mode}`, data),
}
