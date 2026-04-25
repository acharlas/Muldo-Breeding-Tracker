import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlanResult, PairResult, BreedRequest, BatchBreedResult } from '@/types'
import { apiCalls } from '@/lib/api'

type PlannerStore = {
  plan: PlanResult | null
  results: Record<string, PairResult>
  loading: boolean
  generate: (enclosCount: number) => Promise<void>
  setResult: (key: string, result: PairResult) => void
  submitBatch: () => Promise<BatchBreedResult>
  clearPlan: () => void
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      plan: null,
      results: {},
      loading: false,

      generate: async (enclosCount) => {
        set({ loading: true })
        try {
          const plan = await apiCalls.getPlan(enclosCount)
          set({ plan, results: {}, loading: false })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      setResult: (key, result) =>
        set((s) => ({ results: { ...s.results, [key]: result } })),

      submitBatch: async () => {
        const { plan, results } = get()
        if (!plan) throw new Error('No active plan')

        const batch: BreedRequest[] = []
        for (const enclos of plan.enclos) {
          for (let pairIdx = 0; pairIdx < enclos.pairs.length; pairIdx++) {
            const key = `${enclos.enclos_number}-${pairIdx}`
            const r = results[key]
            const pair = enclos.pairs[pairIdx]
            if (!r) continue
            batch.push({
              parent_f_id: pair.parent_f.id,
              parent_m_id: pair.parent_m.id,
              success: r.success,
              child_species_name: r.child_species_name,
              child_sex: r.child_sex,
            })
          }
        }

        const result = await apiCalls.submitBatch(batch)

        // Refresh cascade + inventory after submit
        const { useCascadeStore } = await import('./cascade')
        const { useInventoryStore } = await import('./inventory')
        await Promise.all([
          useCascadeStore.getState().fetch(),
          useInventoryStore.getState().fetch(),
        ])

        get().clearPlan()
        return result
      },

      clearPlan: () => set({ plan: null, results: {} }),
    }),
    {
      name: 'muldo-planner',
      partialize: (state) => ({ plan: state.plan, results: state.results }),
    }
  )
)
