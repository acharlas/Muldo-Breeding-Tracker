import { create } from 'zustand'
import type { InventoryEntry, InventoryStats } from '@/types'
import { apiCalls } from '@/lib/api'

type InventoryStore = {
  inventory: Record<string, InventoryEntry>
  stats: InventoryStats | null
  loading: boolean
  fetch: () => Promise<void>
  capture: (speciesName: string, sex: 'F' | 'M', count?: number, isFertile?: boolean) => Promise<void>
  remove: (speciesName: string, sex: 'F' | 'M', count?: number, isFertile?: boolean) => Promise<void>
}

export const useInventoryStore = create<InventoryStore>()((set) => ({
  inventory: {},
  stats: null,
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const [inventory, stats] = await Promise.all([
        apiCalls.getInventory(),
        apiCalls.getInventoryStats(),
      ])
      set({ inventory, stats, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },
  capture: async (speciesName, sex, count = 1, isFertile = true) => {
    if (count === 1) {
      await apiCalls.capture(speciesName, sex, isFertile)
    } else {
      await apiCalls.bulkCapture(speciesName, sex, count, isFertile)
    }
    const [inventory, stats] = await Promise.all([
      apiCalls.getInventory(),
      apiCalls.getInventoryStats(),
    ])
    set({ inventory, stats })
  },
  remove: async (speciesName, sex, count = 1, isFertile = true) => {
    await apiCalls.removeBySpecies(speciesName, sex, count, isFertile)
    const [inventory, stats] = await Promise.all([
      apiCalls.getInventory(),
      apiCalls.getInventoryStats(),
    ])
    set({ inventory, stats })
  },
}))
