import { create } from 'zustand'
import type { CascadeItem } from '@/types'
import { apiCalls } from '@/lib/api'

type CascadeStore = {
  items: CascadeItem[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useCascadeStore = create<CascadeStore>()((set) => ({
  items: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const items = await apiCalls.getCascade()
      set({ items, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },
}))
