import { create } from 'zustand'
import type { CycleHistory } from '@/types'
import { apiCalls } from '@/lib/api'

type HistoryStore = {
  cycles: CycleHistory[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  cycles: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const cycles = await apiCalls.getHistory()
      set({ cycles, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },
}))
