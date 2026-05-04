import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Tier = 'extrait' | 'philtre' | 'potion' | 'elixir'
type Size = '1000' | '2000' | '3000' | '4000' | '5000'
export type CarburantGrid = Record<Tier, Record<Size, number | null>>

const TIERS: Tier[] = ['extrait', 'philtre', 'potion', 'elixir']
const SIZES: Size[] = ['1000', '2000', '3000', '4000', '5000']
const DURABILITE: Record<Size, number> = { '1000': 1000, '2000': 2000, '3000': 3000, '4000': 4000, '5000': 5000 }

// XP gained per 10-second tick per tier
export const XP_TIER_GAIN: Record<Tier, number> = { extrait: 10, philtre: 20, potion: 30, elixir: 40 }

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

// XP-specific helpers
// kamas per 1 character XP point per muldo (solo). Identical to k/xp model:
// 1 unit of durabilité ↔ 1 point gained per muldo. Tier only changes throughput, not cost-per-point.
function xpCostPerPoint(prix: number | null, size: Size, _tier: Tier): number | null {
  return computeKxp(prix, size)
}

// Best (lowest) kamas/XP from checked tiers; falls back to all tiers if none checked
export function effectiveXpCostPerPoint(grid: CarburantGrid, tierSelected: Record<Tier, boolean>): number | null {
  const active = TIERS.filter(t => tierSelected[t])
  const search = active.length > 0 ? active : TIERS
  let best: number | null = null
  for (const tier of search) {
    for (const size of SIZES) {
      const c = xpCostPerPoint(grid[tier][size], size, tier)
      if (c !== null && (best === null || c < best)) best = c
    }
  }
  return best
}

// Best XP/s from checked tiers (highest rate, requires at least one price in that tier)
export function effectiveBestXpRate(grid: CarburantGrid, tierSelected: Record<Tier, boolean>): number | null {
  const active = TIERS.filter(t => tierSelected[t])
  const search = active.length > 0 ? active : TIERS
  let best: number | null = null
  for (const tier of search) {
    const hasPrice = SIZES.some(s => grid[tier][s] !== null && grid[tier][s]! > 0)
    if (!hasPrice) continue
    const rate = XP_TIER_GAIN[tier] / 10  // XP per second
    if (best === null || rate > best) best = rate
  }
  return best
}

// Global best kamas/XP for the experience grid (same model as the k/xp gauges,
// kept as a separate function so the XP grid can evolve independently if needed).
export function bestXpKGlobal(grid: CarburantGrid): number | null {
  let best: number | null = null
  for (const tier of TIERS) {
    for (const size of SIZES) {
      const c = xpCostPerPoint(grid[tier][size], size, tier)
      if (c !== null && (best === null || c < best)) best = c
    }
  }
  return best
}

export function bestXpKPerRow(grid: CarburantGrid): Record<Tier, number | null> {
  return Object.fromEntries(
    TIERS.map(t => [t, SIZES.reduce<number | null>((best, s) => {
      const c = xpCostPerPoint(grid[t][s], s, t)
      return c !== null && (best === null || c < best) ? c : best
    }, null)])
  ) as Record<Tier, number | null>
}

// Total character XP needed to go from level 1 to `level`
export function totalXpToReach(level: number): number {
  let total = 0
  for (let x = 1; x < level; x++) total += Math.pow(x, 1.3) * 10
  return total
}

type JaugeName = 'foudroyeur' | 'abreuvoir' | 'dragofesse' | 'baffeur' | 'caresseur' | 'experience'

function emptySelectedTiers(): Record<Tier, boolean> {
  return { extrait: false, philtre: false, potion: false, elixir: false }
}

type ParametresStore = {
  baseLevel: number
  optimakina: boolean
  prixFilet: number | null
  prixOptimakina: Record<number, number | null>
  nbEnclos: number
  heuresAccouplement: number | null
  carburants: Record<JaugeName, CarburantGrid>
  selectedTiers: Record<JaugeName, Record<Tier, boolean>>
  setBaseLevel: (n: number) => void
  setOptimakina: (v: boolean) => void
  setPrixFilet: (n: number | null) => void
  setPrixOptimakina: (gen: number, n: number | null) => void
  setNbEnclos: (n: number) => void
  setHeuresAccouplement: (n: number | null) => void
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
      heuresAccouplement: null,
      carburants: {
        foudroyeur: emptyGrid(),
        abreuvoir: emptyGrid(),
        dragofesse: emptyGrid(),
        baffeur: emptyGrid(),
        caresseur: emptyGrid(),
        experience: emptyGrid(),
      },
      selectedTiers: {
        foudroyeur: emptySelectedTiers(),
        abreuvoir: emptySelectedTiers(),
        dragofesse: emptySelectedTiers(),
        baffeur: emptySelectedTiers(),
        caresseur: emptySelectedTiers(),
        experience: emptySelectedTiers(),
      },
      setBaseLevel: (n) => set({ baseLevel: Math.max(1, Math.min(200, n)) }),
      setOptimakina: (v) => set({ optimakina: v }),
      setPrixFilet: (n) => set({ prixFilet: n }),
      setPrixOptimakina: (gen, n) => set((s) => ({ prixOptimakina: { ...s.prixOptimakina, [gen]: n } })),
      setNbEnclos: (n) => set({ nbEnclos: Math.max(1, n) }),
      setHeuresAccouplement: (n) => set({ heuresAccouplement: n }),
      setTierSelected: (jauge, tier, selected) =>
        set((s) => {
          // Exclusive per gauge: ticking a tier clears the others in the same gauge.
          // Unticking the active tier leaves no preference → cost falls back to best across all tiers.
          const next: Record<Tier, boolean> = selected
            ? { extrait: false, philtre: false, potion: false, elixir: false, [tier]: true }
            : { ...s.selectedTiers[jauge], [tier]: false }
          return { selectedTiers: { ...s.selectedTiers, [jauge]: next } }
        }),
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
        if (!state.carburants) state.carburants = { foudroyeur: emptyGrid(), abreuvoir: emptyGrid(), dragofesse: emptyGrid(), baffeur: emptyGrid(), caresseur: emptyGrid(), experience: emptyGrid() }
        if (!state.carburants.caresseur) state.carburants.caresseur = emptyGrid()
        if (!state.carburants.experience) state.carburants.experience = emptyGrid()
        if (!state.prixOptimakina || typeof state.prixOptimakina !== 'object') state.prixOptimakina = { 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null }
        const JAUGES: JaugeName[] = ['foudroyeur', 'abreuvoir', 'dragofesse', 'baffeur', 'caresseur', 'experience']
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

// Points/sec gain at the currently ticked tier (independent of price). All carburants
// share the same rate per tier (10/20/30/40 per 10s for tiers 1/2/3/4). Returns 0
// if no tier is ticked.
export function activeTierRate(selectedTiers: Record<Tier, boolean>): number {
  const tiers: Tier[] = ['extrait', 'philtre', 'potion', 'elixir']
  const active = tiers.find(t => selectedTiers[t])
  return active ? XP_TIER_GAIN[active] / 10 : 0
}

export function computeSuccessRate(baseLevel: number, optimakina = false): number {
  return Math.min(1.0, baseLevel * 0.003 + 0.30 + (optimakina ? 0.10 : 0))
}

export function successPct(baseLevel: number, optimakina = false): number {
  return parseFloat((computeSuccessRate(baseLevel, optimakina) * 100).toFixed(2))
}
