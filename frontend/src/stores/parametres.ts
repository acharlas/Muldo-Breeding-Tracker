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

// Returns best k/xp restricted to checked tiers; falls back to global best if none checked
export function effectiveKxp(grid: CarburantGrid, tierSelected: Record<Tier, boolean>): number | null {
  const active = TIERS.filter(t => tierSelected[t])
  const search = active.length > 0 ? active : TIERS
  let best: number | null = null
  for (const tier of search) {
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

type JaugeName = 'foudroyeur' | 'abreuvoir' | 'dragofesse' | 'baffeur' | 'caresseur'

function emptySelectedTiers(): Record<Tier, boolean> {
  return { extrait: false, philtre: false, potion: false, elixir: false }
}

type ParametresStore = {
  baseLevel: number
  optimakina: boolean
  prixFilet: number | null
  prixOptimakina: Record<number, number | null>
  nbEnclos: number
  carburants: Record<JaugeName, CarburantGrid>
  selectedTiers: Record<JaugeName, Record<Tier, boolean>>
  setBaseLevel: (n: number) => void
  setOptimakina: (v: boolean) => void
  setPrixFilet: (n: number | null) => void
  setPrixOptimakina: (gen: number, n: number | null) => void
  setNbEnclos: (n: number) => void
  setCarburantPrice: (jauge: string, tier: Tier, size: Size, prix: number | null) => void
  setTierSelected: (jauge: JaugeName, tier: Tier, selected: boolean) => void
}

export const useParametresStore = create<ParametresStore>()(
  persist(
    (set) => ({
      baseLevel: 1,
      optimakina: false,
      prixFilet: null,
      prixOptimakina: { 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null },
      nbEnclos: 1,
      carburants: {
        foudroyeur: emptyGrid(),
        abreuvoir: emptyGrid(),
        dragofesse: emptyGrid(),
        baffeur: emptyGrid(),
        caresseur: emptyGrid(),
      },
      selectedTiers: {
        foudroyeur: emptySelectedTiers(),
        abreuvoir: emptySelectedTiers(),
        dragofesse: emptySelectedTiers(),
        baffeur: emptySelectedTiers(),
        caresseur: emptySelectedTiers(),
      },
      setBaseLevel: (n) => set({ baseLevel: Math.max(1, Math.min(200, n)) }),
      setOptimakina: (v) => set({ optimakina: v }),
      setPrixFilet: (n) => set({ prixFilet: n }),
      setPrixOptimakina: (gen, n) => set((s) => ({ prixOptimakina: { ...s.prixOptimakina, [gen]: n } })),
      setNbEnclos: (n) => set({ nbEnclos: Math.max(1, n) }),
      setTierSelected: (jauge, tier, selected) =>
        set((s) => ({ selectedTiers: { ...s.selectedTiers, [jauge]: { ...s.selectedTiers[jauge], [tier]: selected } } })),
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
        // Migrate old nbMuldosLot → nbEnclos (derive: lot/10, minimum 1)
        if ((state as any).nbMuldosLot !== undefined && state.nbEnclos === 1) {
          state.nbEnclos = Math.max(1, Math.round((state as any).nbMuldosLot / 10))
        }
        // Fill in any carburant grids that didn't exist in older persisted state
        if (!state.carburants) state.carburants = { foudroyeur: emptyGrid(), abreuvoir: emptyGrid(), dragofesse: emptyGrid(), baffeur: emptyGrid(), caresseur: emptyGrid() }
        if (!state.carburants.caresseur) state.carburants.caresseur = emptyGrid()
        if (!state.prixOptimakina || typeof state.prixOptimakina !== 'object') state.prixOptimakina = { 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null }
        const JAUGES: JaugeName[] = ['foudroyeur', 'abreuvoir', 'dragofesse', 'baffeur', 'caresseur']
        if (!state.selectedTiers) state.selectedTiers = Object.fromEntries(JAUGES.map(j => [j, emptySelectedTiers()])) as Record<JaugeName, Record<Tier, boolean>>
        for (const j of JAUGES) if (!state.selectedTiers[j]) state.selectedTiers[j] = emptySelectedTiers()
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
