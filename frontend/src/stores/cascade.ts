import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CascadeItem } from '@/types'
import { apiCalls } from '@/lib/api'

type CascadeStore = {
  items: CascadeItem[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  openGens: number[]
  setGenOpen: (gen: number, open: boolean) => void
}

export const useCascadeStore = create<CascadeStore>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      openGens: [1, 2, 3],
      fetch: async () => {
        set({ loading: true, error: null })
        try {
          const { useSettingsStore } = await import('./settings')
          const { baseLevel, optimakina } = useSettingsStore.getState()
          const items = await apiCalls.getCascade(baseLevel, optimakina)
          set({ items, loading: false })
        } catch (e) {
          set({ error: String(e), loading: false })
        }
      },
      setGenOpen: (gen, open) => {
        const prev = get().openGens
        set({ openGens: open ? [...prev, gen] : prev.filter((g) => g !== gen) })
      },
    }),
    { name: 'cascade-ui', partialize: (s) => ({ openGens: s.openGens }) },
  ),
)
