import { create } from 'zustand'
import type { InventoryEntry, InventoryStats } from '@/types'
import { apiCalls } from '@/lib/api'

type InventoryStore = {
  inventory: Record<string, InventoryEntry>
  stats: InventoryStats | null
  loading: boolean
  fetch: () => Promise<void>
  capture: (speciesName: string, sex: 'F' | 'M', count?: number) => Promise<void>
}

export const useInventoryStore = create<InventoryStore>()((set) => ({
  inventory: {},
  stats: null,
  loading: false,
  fetch: async () => {
    set({ loading: true })
    const [inventory, stats] = await Promise.all([
      apiCalls.getInventory(),
      apiCalls.getInventoryStats(),
    ])
    set({ inventory, stats, loading: false })
  },
  capture: async (speciesName, sex, count = 1) => {
    if (count === 1) {
      await apiCalls.capture(speciesName, sex)
    } else {
      await apiCalls.bulkCapture(speciesName, sex, count)
    }
    const [inventory, stats] = await Promise.all([
      apiCalls.getInventory(),
      apiCalls.getInventoryStats(),
    ])
    set({ inventory, stats })
  },
}))
