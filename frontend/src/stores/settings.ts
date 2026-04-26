import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SettingsStore = {
  baseLevel: number
  setBaseLevel: (n: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      baseLevel: 0,
      setBaseLevel: (n) => set({ baseLevel: Math.max(0, n) }),
    }),
    { name: 'muldo-settings' },
  ),
)

export function computeSuccessRate(baseLevel: number): number {
  return Math.min(1.0, baseLevel * 0.30 + 0.30)
}

export function successPct(baseLevel: number): number {
  return Math.min(100, Math.round(computeSuccessRate(baseLevel) * 100))
}
