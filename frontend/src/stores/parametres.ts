import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Tier = 'extrait' | 'philtre' | 'potion' | 'elixir'
type Size = '1000' | '2000' | '3000' | '4000' | '5000'
export type CarburantGrid = Record<Tier, Record<Size, number | null>>

const TIERS: Tier[] = ['extrait', 'philtre', 'potion', 'elixir']
const SIZES: Size[] = ['1000', '2000', '3000', '4000', '5000']
const DURABILITE: Record<Size, number> = { '1000': 1000, '2000': 2000, '3000': 3000, '4000': 4000, '5000': 5000 }

function emptyGrid(): CarburantGrid {
  return Object.fromEntries(
    TIERS.map(t => [t, Object.fromEntries(SIZES.map(s => [s, null]))])
  ) as CarburantGrid
}

export function computeKxp(prix: number | null, size: Size): number | null {
  if (prix === null || prix === 0) return null
  return prix / DURABILITE[size]
}

export function bestKxpGlobal(grid: CarburantGrid): number | null {
  let best: number | null = null
  for (const tier of TIERS) {
    for (const size of SIZES) {
      const kxp = computeKxp(grid[tier][size], size)
      if (kxp !== null && (best === null || kxp < best)) best = kxp
    }
  }
  return best
}

export function bestKxpPerRow(grid: CarburantGrid): Record<Tier, number | null> {
  return Object.fromEntries(
    TIERS.map(t => [t, SIZES.reduce<number | null>((best, s) => {
      const kxp = computeKxp(grid[t][s], s)
      return kxp !== null && (best === null || kxp < best) ? kxp : best
    }, null)])
  ) as Record<Tier, number | null>
}

type ParametresStore = {
  baseLevel: number
  optimakina: boolean
  prixFilet: number | null
  prixOptimakina: number | null
  nbMuldosLot: number
  carburants: Record<'foudroyeur' | 'abreuvoir' | 'dragofesse' | 'baffeur' | 'caresseur', CarburantGrid>
  setBaseLevel: (n: number) => void
  setOptimakina: (v: boolean) => void
  setPrixFilet: (n: number | null) => void
  setPrixOptimakina: (n: number | null) => void
  setNbMuldosLot: (n: number) => void
  setCarburantPrice: (jauge: string, tier: Tier, size: Size, prix: number | null) => void
}

export const useParametresStore = create<ParametresStore>()(
  persist(
    (set) => ({
      baseLevel: 1,
      optimakina: false,
      prixFilet: null,
      prixOptimakina: null,
      nbMuldosLot: 10,
      carburants: {
        foudroyeur: emptyGrid(),
        abreuvoir: emptyGrid(),
        dragofesse: emptyGrid(),
        baffeur: emptyGrid(),
        caresseur: emptyGrid(),
      },
      setBaseLevel: (n) => set({ baseLevel: Math.max(1, Math.min(200, n)) }),
      setOptimakina: (v) => set({ optimakina: v }),
      setPrixFilet: (n) => set({ prixFilet: n }),
      setPrixOptimakina: (n) => set({ prixOptimakina: n }),
      setNbMuldosLot: (n) => set({ nbMuldosLot: Math.max(1, Math.min(10, n)) }),
      setCarburantPrice: (jauge, tier, size, prix) =>
        set((s) => ({
          carburants: {
            ...s.carburants,
            [jauge]: {
              ...s.carburants[jauge as keyof typeof s.carburants],
              [tier]: {
                ...s.carburants[jauge as keyof typeof s.carburants][tier],
                [size]: prix
              }
            }
          }
        })),
    }),
    {
      name: 'parametres-ui',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Fill in any carburant grids that didn't exist in older persisted state
        if (!state.carburants) state.carburants = { foudroyeur: emptyGrid(), abreuvoir: emptyGrid(), dragofesse: emptyGrid(), baffeur: emptyGrid(), caresseur: emptyGrid() }
        if (!state.carburants.caresseur) state.carburants.caresseur = emptyGrid()
        if (typeof window !== 'undefined') {
          const old = localStorage.getItem('muldo-settings')
          if (old) {
            try {
              const parsed = JSON.parse(old)
              if (parsed?.state?.baseLevel !== undefined) state.baseLevel = parsed.state.baseLevel
              if (parsed?.state?.optimakina !== undefined) state.optimakina = parsed.state.optimakina
              localStorage.removeItem('muldo-settings')
            } catch {}
          }
        }
      },
    }
  )
)

export function computeSuccessRate(baseLevel: number, optimakina = false): number {
  return Math.min(1.0, baseLevel * 0.003 + 0.30 + (optimakina ? 0.10 : 0))
}

export function successPct(baseLevel: number, optimakina = false): number {
  return parseFloat((computeSuccessRate(baseLevel, optimakina) * 100).toFixed(2))
}
