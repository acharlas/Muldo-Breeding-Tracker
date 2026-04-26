import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SettingsStore = {
  baseLevel: number
  setBaseLevel: (n: number) => void
  optimakina: boolean
  setOptimakina: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      baseLevel: 1,
      setBaseLevel: (n) => set({ baseLevel: Math.max(1, Math.min(200, n)) }),
      optimakina: false,
      setOptimakina: (v) => set({ optimakina: v }),
    }),
    { name: 'muldo-settings' },
  ),
)

/** (level1 + level2) × 0.15% + 30%, both parents at same level → level × 0.003 + 0.30 */
export function computeSuccessRate(baseLevel: number, optimakina = false): number {
  return Math.min(1.0, baseLevel * 0.003 + 0.30 + (optimakina ? 0.10 : 0))
}

export function successPct(baseLevel: number, optimakina = false): number {
  return parseFloat((computeSuccessRate(baseLevel, optimakina) * 100).toFixed(2))
}
