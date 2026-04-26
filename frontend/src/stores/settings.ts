import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SettingsStore = {
  baseLevel: number
  setBaseLevel: (n: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      baseLevel: 1,
      setBaseLevel: (n) => set({ baseLevel: Math.max(1, Math.min(200, n)) }),
    }),
    { name: 'muldo-settings' },
  ),
)

/** (level1 + level2) × 0.15% + 30%, both parents at same level → level × 0.003 + 0.30 */
export function computeSuccessRate(baseLevel: number): number {
  return Math.min(1.0, baseLevel * 0.003 + 0.30)
}

export function successPct(baseLevel: number): number {
  return parseFloat((computeSuccessRate(baseLevel) * 100).toFixed(2))
}
