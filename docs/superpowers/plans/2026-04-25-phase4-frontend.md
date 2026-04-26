# Phase 4 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed dashboard UI for the Muldo Breeding Tracker with Cascade, Inventaire, and Enclos views, backed by Zustand stores fetching from the FastAPI backend.

**Architecture:** Single-page client shell (`page.tsx`) with a fixed 220px sidebar and tab switching via `useState`. Three Zustand stores own all server state; the planner store persists to localStorage via Zustand's `persist` middleware. No Next.js routing — view switching is local state only.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn (base-nova), lucide-react, Zustand v5, existing `api.ts` fetch wrapper.

**Important — read before writing any Next.js code:**  
Check `frontend/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` for `'use client'` rules and `13-fonts.md` for the `next/font/google` API. Every interactive component (useState, useEffect, event handlers, Zustand) needs `'use client'` at the top. Server components cannot use hooks.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| MODIFY | `frontend/src/app/layout.tsx` | Add Space Grotesk font |
| MODIFY | `frontend/src/app/page.tsx` | DashboardShell — sidebar + view switcher |
| MODIFY | `frontend/src/app/globals.css` | Add grid texture CSS |
| MODIFY | `frontend/src/lib/api.ts` | Add typed functions per endpoint |
| MODIFY | `frontend/src/types/index.ts` | All TypeScript types |
| CREATE | `frontend/src/components/layout/Sidebar.tsx` | Nav + quick stats |
| CREATE | `frontend/src/components/shared/GenBadge.tsx` | Gen color badge |
| CREATE | `frontend/src/stores/cascade.ts` | useCascadeStore |
| CREATE | `frontend/src/stores/inventory.ts` | useInventoryStore |
| CREATE | `frontend/src/stores/planner.ts` | usePlannerStore (persisted) |
| CREATE | `frontend/src/components/cascade/StatusBadge.tsx` | ok/en_cours/a_faire badge |
| CREATE | `frontend/src/components/cascade/SpeciesRow.tsx` | One species table row |
| CREATE | `frontend/src/components/cascade/GenGroup.tsx` | Collapsible gen accordion |
| CREATE | `frontend/src/components/cascade/CascadeView.tsx` | StatBar + filters + GenGroups |
| CREATE | `frontend/src/components/inventaire/SpeciesRow.tsx` | Row with Popover capture |
| CREATE | `frontend/src/components/inventaire/BulkCaptureModal.tsx` | Dialog mass capture |
| CREATE | `frontend/src/components/inventaire/InventaireView.tsx` | Summary cards + table |
| CREATE | `frontend/src/components/enclos/PlannerForm.tsx` | Enclos count stepper + button |
| CREATE | `frontend/src/components/enclos/PairCard.tsx` | ♀×♂ → target display row |
| CREATE | `frontend/src/components/enclos/EnclosCard.tsx` | Card with 5 PairCards |
| CREATE | `frontend/src/components/enclos/ResultsPanel.tsx` | Result inputs + submit |
| CREATE | `frontend/src/components/enclos/EnclosView.tsx` | Orchestrator — form or plan |

---

## Task 1: Install missing shadcn components

The project only has `button.tsx`. Install the remaining components needed by the spec.

**Files:**
- Create (auto): `frontend/src/components/ui/{card,input,select,badge,progress,dialog,popover,table,collapsible}.tsx`

- [ ] **Step 1: Install components**

```bash
cd frontend
npx shadcn@latest add card input select badge progress dialog popover table collapsible
```

Expected: Each component file appears under `src/components/ui/`. Answer "yes" if prompted to overwrite existing files.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors (warnings about unused `any` types are acceptable at this stage).

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/ui/
git commit -m "feat: install shadcn ui components (card, input, select, badge, progress, dialog, popover, table, collapsible)"
```

---

## Task 2: TypeScript types + typed API functions

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Write all types in `src/types/index.ts`**

```typescript
export type CascadeItem = {
  species_name: string
  generation: number
  production_target: number
  fertile_f: number
  fertile_m: number
  total_owned: number
  remaining: number
  status: 'ok' | 'en_cours' | 'a_faire'
  expected_f: number
  expected_m: number
}

export type InventoryEntry = {
  fertile_f: number
  fertile_m: number
  sterile_f: number
  sterile_m: number
}

export type InventoryStats = {
  total_fertile: number
  total_sterile: number
  par_gen: Record<string, { fertile: number; sterile: number }>
}

export type MuldoOut = {
  id: number
  species_name: string
  generation: number
  sex: 'F' | 'M'
  is_fertile: boolean
  origin: string
  created_at: string
}

export type PlannedParent = {
  id: number
  species_name: string
  sex: 'F' | 'M'
}

export type PlannedPair = {
  parent_f: PlannedParent
  parent_m: PlannedParent
  target_child_species: string
  success_chance: number
}

export type PlannedEnclos = {
  enclos_number: number
  pairs: PlannedPair[]
}

export type PlanResult = {
  enclos: PlannedEnclos[]
  summary: {
    total_pairs: number
    estimated_successes: number
    remaining_after: number
  }
}

export type BreedRequest = {
  parent_f_id: number
  parent_m_id: number
  success: boolean
  child_species_name: string
  child_sex: 'F' | 'M'
}

export type BatchBreedError = {
  index: number
  detail: string
}

export type BatchBreedResult = {
  cycle_number: number
  total: number
  successes: number
  errors: BatchBreedError[]
}

export type PairResult = {
  success: boolean
  child_species_name: string
  child_sex: 'F' | 'M'
}
```

- [ ] **Step 2: Add typed API functions to `src/lib/api.ts`**

Append after the existing `export const api = { ... }` block:

```typescript
import type {
  CascadeItem, InventoryEntry, InventoryStats,
  PlanResult, BatchBreedResult, BreedRequest,
} from '@/types'

export const apiCalls = {
  getCascade: () => api.get<CascadeItem[]>('/api/cascade'),
  getInventory: () => api.get<Record<string, InventoryEntry>>('/api/inventory'),
  getInventoryStats: () => api.get<InventoryStats>('/api/inventory/stats'),
  capture: (species_name: string, sex: 'F' | 'M', count = 1) =>
    api.post<unknown>('/api/inventory/capture', { species_name, sex, count }),
  getPlan: (enclos_count: number) =>
    api.post<PlanResult>('/api/plan', { enclos_count }),
  submitBatch: (results: BreedRequest[]) =>
    api.post<BatchBreedResult>('/api/breed/batch', { results }),
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/types/index.ts src/lib/api.ts
git commit -m "feat: add TypeScript types and typed API functions"
```

---

## Task 3: globals.css grid texture + layout.tsx Space Grotesk font

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add grid texture to `globals.css`**

Add this at the end of the file (after the existing `@layer base` block):

```css
/* Fixed dark grid texture — game-specific visual */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(220,220,230,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220,220,230,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

- [ ] **Step 2: Add Space Grotesk font to `layout.tsx`**

Replace the entire file:

```typescript
import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Muldo Tracker',
  description: 'Muldo breeding tracker for Dofus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`dark ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Note: `globals.css` already maps `--font-sans` via `@theme inline { --font-sans: var(--font-sans); }` so the variable wires up automatically.

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add Space Grotesk font and grid texture"
```

---

## Task 4: GenBadge + Sidebar + DashboardShell

This task wires up the visible shell. After it, `npm run dev` shows the sidebar.

**Files:**
- Create: `frontend/src/components/shared/GenBadge.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create `src/components/shared/GenBadge.tsx`**

```typescript
'use client'

const GEN_COLORS: Record<number, { bg: string; text: string }> = {
  1:  { bg: '#1C1C1E', text: '#6B7280' },
  2:  { bg: '#1F1F22', text: '#6B7280' },
  3:  { bg: '#222226', text: '#9CA3AF' },
  4:  { bg: '#26262B', text: '#9CA3AF' },
  5:  { bg: '#2A2A30', text: '#D1D5DB' },
  6:  { bg: '#2E2E35', text: '#D1D5DB' },
  7:  { bg: '#323239', text: '#E5E7EB' },
  8:  { bg: '#36363E', text: '#F3F4F6' },
  9:  { bg: '#3A3A44', text: '#F9FAFB' },
  10: { bg: '#424250', text: '#FFFFFF' },
}

export function GenBadge({ gen }: { gen: number }) {
  const c = GEN_COLORS[gen] ?? GEN_COLORS[1]
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.text}22`,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      G{gen}
    </span>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/Sidebar.tsx`**

```typescript
'use client'

import { BarChart2, Package, LayoutGrid } from 'lucide-react'
import { useCascadeStore } from '@/stores/cascade'

type View = 'cascade' | 'inventaire' | 'enclos'

const NAV_ITEMS: { id: View; icon: React.ReactNode; label: string }[] = [
  { id: 'cascade',    icon: <BarChart2 size={16} />,  label: 'Cascade' },
  { id: 'inventaire', icon: <Package size={16} />,    label: 'Inventaire' },
  { id: 'enclos',     icon: <LayoutGrid size={16} />, label: 'Enclos' },
]

type Props = { activeView: View; onNav: (v: View) => void }

export function Sidebar({ activeView, onNav }: Props) {
  const items = useCascadeStore((s) => s.items)
  const ok       = items.filter((i) => i.status === 'ok').length
  const en_cours = items.filter((i) => i.status === 'en_cours').length
  const a_faire  = items.filter((i) => i.status === 'a_faire').length

  return (
    <aside style={{
      width: 220, minWidth: 220, position: 'fixed', left: 0, top: 0,
      height: '100vh', zIndex: 100, display: 'flex', flexDirection: 'column',
      background: 'rgba(10,10,12,0.98)',
      borderRight: '1px solid rgba(220,220,230,0.12)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '24px 20px 20px', borderBottom: '1px solid rgba(220,220,230,0.1)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #E5E7EB, #1C1C22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff',
          boxShadow: '0 0 16px rgba(220,220,230,0.3)' }}>M</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.2 }}>Muldo</div>
          <div style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Breeding Tracker
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, color: '#374151', letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '0 8px 10px' }}>Navigation</div>
        {NAV_ITEMS.map(({ id, icon, label }) => {
          const active = activeView === id
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
              textAlign: 'left', fontSize: 14, fontWeight: 500, position: 'relative',
              background: active ? 'rgba(220,220,230,0.12)' : 'transparent',
              color: active ? '#E5E7EB' : '#6B7280',
            }}>
              {icon}
              <span style={{ flex: 1 }}>{label}</span>
              {active && <div style={{ position: 'absolute', right: 0, width: 3,
                height: 16, borderRadius: 2, background: '#E5E7EB' }} />}
            </button>
          )
        })}
      </nav>

      {/* Quick stats */}
      <div style={{ margin: '0 12px 12px', padding: 14,
        background: 'rgba(220,220,230,0.05)', borderRadius: 10,
        border: '1px solid rgba(220,220,230,0.1)', display: 'flex',
        flexDirection: 'column', gap: 8 }}>
        {[
          { dot: '#E5E7EB', label: 'Terminées', val: ok },
          { dot: '#9CA3AF', label: 'En cours',  val: en_cours },
          { dot: '#374151', label: 'À faire',   val: a_faire },
        ].map(({ dot, label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%',
              background: dot, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ flex: 1, color: '#6B7280' }}>{label}</span>
            <span style={{ color: '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(220,220,230,0.08)' }}>
        <div style={{ fontSize: 11, color: '#374151' }}>v1.0.0 · Saison 4</div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create `src/stores/cascade.ts`** (needed by Sidebar — full store in Task 5, but create the file now with a stub so Sidebar compiles)

```typescript
import { create } from 'zustand'
import type { CascadeItem } from '@/types'

type CascadeStore = {
  items: CascadeItem[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useCascadeStore = create<CascadeStore>()((set) => ({
  items: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const { apiCalls } = await import('@/lib/api')
      const items = await apiCalls.getCascade()
      set({ items, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },
}))
```

- [ ] **Step 4: Replace `src/app/page.tsx` with DashboardShell**

```typescript
'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'

type View = 'cascade' | 'inventaire' | 'enclos'

export default function DashboardShell() {
  const [activeView, setActiveView] = useState<View>('cascade')

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0C', display: 'flex',
      color: '#E5E7EB', position: 'relative' }}>
      <Sidebar activeView={activeView} onNav={setActiveView} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: 'auto',
        position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <div style={{ padding: '32px 36px', maxWidth: 1320 }}>
          {activeView === 'cascade'    && <div style={{ color: '#6B7280' }}>Cascade view — coming soon</div>}
          {activeView === 'inventaire' && <div style={{ color: '#6B7280' }}>Inventaire view — coming soon</div>}
          {activeView === 'enclos'     && <div style={{ color: '#6B7280' }}>Enclos view — coming soon</div>}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Start dev server and verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`. Expected: sidebar visible with M logo, three nav items (BarChart2/Package/LayoutGrid icons), active state highlights, placeholder text in main area. Stats show 0/0/0 until cascade loads — that's fine.

Stop the server (`Ctrl+C`).

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/components/shared/GenBadge.tsx src/components/layout/Sidebar.tsx src/stores/cascade.ts src/app/page.tsx
git commit -m "feat: add DashboardShell, Sidebar, GenBadge"
```

---

## Task 5: Zustand stores (inventory + planner)

**Files:**
- Modify: `frontend/src/stores/cascade.ts` (already created in Task 4 — no change needed, it's complete)
- Create: `frontend/src/stores/inventory.ts`
- Create: `frontend/src/stores/planner.ts`

- [ ] **Step 1: Create `src/stores/inventory.ts`**

```typescript
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
    await apiCalls.capture(speciesName, sex, count)
    const [inventory, stats] = await Promise.all([
      apiCalls.getInventory(),
      apiCalls.getInventoryStats(),
    ])
    set({ inventory, stats })
  },
}))
```

- [ ] **Step 2: Create `src/stores/planner.ts`**

```typescript
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
        const plan = await apiCalls.getPlan(enclosCount)
        set({ plan, results: {}, loading: false })
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

        // Refresh cascade + inventory stores after submit
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
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/stores/inventory.ts src/stores/planner.ts
git commit -m "feat: add inventory and planner Zustand stores"
```

---

## Task 6: CascadeView

**Files:**
- Create: `frontend/src/components/cascade/StatusBadge.tsx`
- Create: `frontend/src/components/cascade/SpeciesRow.tsx`
- Create: `frontend/src/components/cascade/GenGroup.tsx`
- Create: `frontend/src/components/cascade/CascadeView.tsx`

- [ ] **Step 1: Create `src/components/cascade/StatusBadge.tsx`**

```typescript
'use client'

import { Badge } from '@/components/ui/badge'

type Status = 'ok' | 'en_cours' | 'a_faire'

const STATUS_CFG: Record<Status, { label: string; color: string }> = {
  ok:       { label: '✓ OK',       color: 'rgba(255,255,255,0.9)' },
  en_cours: { label: '↻ En cours', color: 'rgba(255,255,255,0.5)' },
  a_faire:  { label: '○ À faire',  color: 'rgba(255,255,255,0.2)' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUS_CFG[status]
  return (
    <Badge variant="outline" style={{ color, borderColor: color, fontSize: 11, whiteSpace: 'nowrap' }}>
      {label}
    </Badge>
  )
}
```

- [ ] **Step 2: Create `src/components/cascade/SpeciesRow.tsx`**

```typescript
'use client'

import { Progress } from '@/components/ui/progress'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { StatusBadge } from './StatusBadge'
import type { CascadeItem } from '@/types'

export function SpeciesRow({ item }: { item: CascadeItem }) {
  const progress = item.production_target > 0
    ? Math.min(100, Math.round((Math.min(item.fertile_f, item.fertile_m) / item.production_target) * 100))
    : 0

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{item.species_name}</TableCell>
      <TableCell><GenBadge gen={item.generation} /></TableCell>
      <TableCell><StatusBadge status={item.status} /></TableCell>
      <TableCell className="text-center text-sm">
        <span style={{ color: '#D1D5DB' }}>♀ {item.fertile_f}</span>
        <span style={{ color: '#374151', margin: '0 4px' }}>/</span>
        <span style={{ color: '#9CA3AF' }}>♂ {item.fertile_m}</span>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{item.production_target}</TableCell>
      <TableCell className="text-center text-sm">
        {item.remaining > 0
          ? <span style={{ color: '#9CA3AF', fontWeight: 600 }}>−{item.remaining}</span>
          : <span style={{ color: '#E5E7EB', fontWeight: 600 }}>✓</span>}
      </TableCell>
      <TableCell style={{ minWidth: 80 }}>
        <Progress value={progress} className="h-1" />
      </TableCell>
    </TableRow>
  )
}
```

- [ ] **Step 3: Create `src/components/cascade/GenGroup.tsx`**

Gen 1–3 open by default; 4–10 collapsed. Uses shadcn `<Collapsible>`.

```typescript
'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SpeciesRow } from './SpeciesRow'
import type { CascadeItem } from '@/types'

const GEN_TEXT: Record<number, string> = {
  1:'#6B7280',2:'#6B7280',3:'#9CA3AF',4:'#9CA3AF',5:'#D1D5DB',
  6:'#D1D5DB',7:'#E5E7EB',8:'#F3F4F6',9:'#F9FAFB',10:'#FFFFFF',
}

export function GenGroup({ gen, items }: { gen: number; items: CascadeItem[] }) {
  const [open, setOpen] = useState(gen <= 3)
  const done = items.filter((i) => i.status === 'ok').length
  const progress = items.length > 0 ? Math.round((done / items.length) * 100) : 0
  const color = GEN_TEXT[gen] ?? '#6B7280'

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.1)', borderRadius: 12, overflow: 'hidden' }}>
      <CollapsibleTrigger asChild>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0,
          padding: '12px 18px', background: 'rgba(220,220,230,0.05)',
          borderBottom: open ? '1px solid rgba(220,220,230,0.08)' : 'none',
          border: 'none', cursor: 'pointer' }}>
          <span style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
            GÉNÉRATION {gen}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 10 }}>
            {done}/{items.length} terminées
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 100, marginRight: 12 }}>
            <Progress value={progress} className="h-1" />
          </div>
          <ChevronRight size={14} style={{ color: '#6B7280',
            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Table>
          <TableHeader>
            <TableRow style={{ fontSize: 10, color: '#374151', letterSpacing: '0.08em' }}>
              <TableHead>Espèce</TableHead>
              <TableHead>Gen</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-center">Fertiles</TableHead>
              <TableHead className="text-center">Objectif</TableHead>
              <TableHead className="text-center">Restants</TableHead>
              <TableHead>Progression</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => <SpeciesRow key={item.species_name} item={item} />)}
          </TableBody>
        </Table>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- [ ] **Step 4: Create `src/components/cascade/CascadeView.tsx`**

```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCascadeStore } from '@/stores/cascade'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { GenGroup } from './GenGroup'

export function CascadeView() {
  const { items, loading, fetch } = useCascadeStore()
  useEffect(() => { fetch() }, [fetch])

  const [search, setSearch] = useState('')
  const [filterGen, setFilterGen] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = useMemo(() => items.filter((i) => {
    if (filterGen !== 'all' && i.generation !== +filterGen) return false
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    if (search && !i.species_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, filterGen, filterStatus, search])

  // Stats
  const owned   = items.filter((i) => i.status === 'ok').length
  const gen10ok = items.filter((i) => i.generation === 10 && i.status === 'ok').length
  const totalF  = items.reduce((a, i) => a + i.fertile_f, 0)
  const totalM  = items.reduce((a, i) => a + i.fertile_m, 0)

  const statCards = [
    { label: 'Espèces possédées', value: `${owned} / 120`,  sub: `${items.filter(i=>i.status==='en_cours').length} en cours`, bar: Math.round(owned/120*100) },
    { label: 'Objectif Gen 10',   value: `${gen10ok} / 50`, sub: `${50 - gen10ok} restantes`, bar: Math.round(gen10ok/50*100) },
    { label: 'Femelles fertiles', value: totalF, sub: 'total élevage', bar: null },
    { label: 'Mâles fertiles',    value: totalM, sub: 'total élevage', bar: null },
  ]

  // Group by generation
  const byGen: Record<number, typeof items> = {}
  for (let g = 1; g <= 10; g++) {
    const gs = filtered.filter((i) => i.generation === g)
    if (gs.length > 0) byGen[g] = gs
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Cascade</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Vue d'ensemble de toutes les espèces par génération
        </p>
      </div>

      {/* Stat bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map((s) => (
          <Card key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.15)' }}>
            <CardContent style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#E5E7EB', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{s.sub}</div>
              {s.bar !== null && <Progress value={s.bar} className="h-1 mt-3" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '10px 14px' }}>
        <Input placeholder="Rechercher une espèce…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
        <Select value={filterGen} onValueChange={setFilterGen}>
          <SelectTrigger style={{ width: 190 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les générations</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map((g) => <SelectItem key={g} value={String(g)}>Génération {g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="a_faire">À faire</SelectItem>
          </SelectContent>
        </Select>
        <div style={{ color: '#374151', fontSize: 12, marginLeft: 'auto' }}>
          {filtered.length} espèce{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Gen groups */}
      {loading && <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Chargement…</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(byGen).map(([gen, sp]) => (
          <GenGroup key={gen} gen={+gen} items={sp} />
        ))}
        {!loading && Object.keys(byGen).length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#374151' }}>Aucune espèce trouvée</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire CascadeView into `page.tsx`**

Replace the `cascade` placeholder line:

```typescript
// Old:
{activeView === 'cascade'    && <div style={{ color: '#6B7280' }}>Cascade view — coming soon</div>}

// New:
{activeView === 'cascade'    && <CascadeView />}
```

Add import at top: `import { CascadeView } from '@/components/cascade/CascadeView'`

- [ ] **Step 6: Type-check + visual verify**

```bash
cd frontend && npx tsc --noEmit
npm run dev
```

Navigate to Cascade tab. Expected: stat cards (0 / 120 with progress), filter bar, generation accordions. Gen 1–3 open, 4–10 collapsed. Species rows populate once the backend is running (otherwise stays empty with the loading state).

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/components/cascade/ src/app/page.tsx
git commit -m "feat: add CascadeView with StatBar, GenGroup, SpeciesRow, StatusBadge"
```

---

## Task 7: InventaireView

**Files:**
- Create: `frontend/src/components/inventaire/SpeciesRow.tsx`
- Create: `frontend/src/components/inventaire/BulkCaptureModal.tsx`
- Create: `frontend/src/components/inventaire/InventaireView.tsx`

- [ ] **Step 1: Create `src/components/inventaire/SpeciesRow.tsx`**

The "Capturer" button opens a Popover with sex toggle (♀/♂), count input, and confirm button. Calls `useInventoryStore.capture()` for count=1 and `capture(name, sex, count)` for count>1.

```typescript
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { useInventoryStore } from '@/stores/inventory'
import type { InventoryEntry } from '@/types'

type Props = {
  speciesName: string
  generation: number
  entry: InventoryEntry
}

export function InventaireSpeciesRow({ speciesName, generation, entry }: Props) {
  const capture = useInventoryStore((s) => s.capture)
  const [open, setOpen] = useState(false)
  const [sex, setSex] = useState<'F' | 'M'>('F')
  const [count, setCount] = useState(1)

  const confirm = async () => {
    await capture(speciesName, sex, count)
    setOpen(false)
    setCount(1)
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{speciesName}</TableCell>
      <TableCell><GenBadge gen={generation} /></TableCell>
      <TableCell className="text-center" style={{ color: '#D1D5DB' }}>{entry.fertile_f}</TableCell>
      <TableCell className="text-center" style={{ color: '#9CA3AF' }}>{entry.fertile_m}</TableCell>
      <TableCell className="text-center text-muted-foreground">{entry.sterile_f}</TableCell>
      <TableCell className="text-center text-muted-foreground">{entry.sterile_m}</TableCell>
      <TableCell>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" style={{ gap: 4 }}>
              <Plus size={12} /> Capturer
            </Button>
          </PopoverTrigger>
          <PopoverContent style={{ width: 200, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['F', 'M'] as const).map((s) => (
                <Button key={s} size="sm" variant={sex === s ? 'default' : 'outline'}
                  onClick={() => setSex(s)} style={{ flex: 1 }}>
                  {s === 'F' ? '♀' : '♂'}
                </Button>
              ))}
            </div>
            <Input type="number" min={1} max={500} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, +e.target.value)))} />
            <Button size="sm" onClick={confirm}>Confirmer</Button>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  )
}
```

- [ ] **Step 2: Create `src/components/inventaire/BulkCaptureModal.tsx`**

Species list sourced from `useCascadeStore.items` (all 120 species names + their generation).

```typescript
'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GenBadge } from '@/components/shared/GenBadge'
import { useCascadeStore } from '@/stores/cascade'
import { useInventoryStore } from '@/stores/inventory'

export function BulkCaptureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cascadeItems = useCascadeStore((s) => s.items)
  const capture = useInventoryStore((s) => s.capture)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState<Record<string, { f: number; m: number }>>({})

  const allSpecies = useMemo(() =>
    cascadeItems.map((i) => ({ name: i.species_name, gen: i.generation })),
    [cascadeItems]
  )

  const filtered = allSpecies.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const confirm = async () => {
    const tasks: Promise<void>[] = []
    for (const name of selected) {
      const f = qty[name]?.f ?? 1
      const m = qty[name]?.m ?? 1
      if (f > 0) tasks.push(capture(name, 'F', f) as Promise<void>)
      if (m > 0) tasks.push(capture(name, 'M', m) as Promise<void>)
    }
    await Promise.all(tasks)
    setSelected(new Set())
    setQty({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>Capture en masse</DialogTitle>
        </DialogHeader>
        <Input placeholder="Rechercher une espèce…" value={search}
          onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((s) => {
            const isSelected = selected.has(s.name)
            return (
              <div key={s.name} onClick={() => toggle(s.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: isSelected ? 'rgba(220,220,230,0.12)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid rgba(220,220,230,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(s.name)}
                  style={{ accentColor: '#E5E7EB', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                <GenBadge gen={s.gen} />
                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>♀</span>
                    <input type="number" min={0} max={500} defaultValue={1}
                      onChange={(e) => setQty((q) => ({ ...q, [s.name]: { ...q[s.name], f: +e.target.value } }))}
                      style={{ width: 44, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(220,220,230,0.2)', borderRadius: 5,
                        padding: '3px 6px', color: '#E5E7EB', fontSize: 12, textAlign: 'center' }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>♂</span>
                    <input type="number" min={0} max={500} defaultValue={1}
                      onChange={(e) => setQty((q) => ({ ...q, [s.name]: { ...q[s.name], m: +e.target.value } }))}
                      style={{ width: 44, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(220,220,230,0.2)', borderRadius: 5,
                        padding: '3px 6px', color: '#E5E7EB', fontSize: 12, textAlign: 'center' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6B7280', fontSize: 12 }}>
            {selected.size} espèce{selected.size !== 1 ? 's' : ''} sélectionnée{selected.size !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={confirm} disabled={selected.size === 0}>Confirmer la capture</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create `src/components/inventaire/InventaireView.tsx`**

Generation data comes from `useCascadeStore.items` — build a `Map<string, number>`.

```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Zap, Ban, Dna } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCascadeStore } from '@/stores/cascade'
import { useInventoryStore } from '@/stores/inventory'
import { InventaireSpeciesRow } from './SpeciesRow'
import { BulkCaptureModal } from './BulkCaptureModal'

export function InventaireView() {
  const cascadeItems = useCascadeStore((s) => s.items)
  const fetchCascade = useCascadeStore((s) => s.fetch)
  const { inventory, stats, loading, fetch } = useInventoryStore()

  useEffect(() => { fetch(); fetchCascade() }, [fetch, fetchCascade])

  // Build generation map from cascade store
  const genMap = useMemo(() => {
    const m = new Map<string, number>()
    cascadeItems.forEach((i) => m.set(i.species_name, i.generation))
    return m
  }, [cascadeItems])

  const [search, setSearch] = useState('')
  const [filterGen, setFilterGen] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const speciesKeys = Object.keys(inventory)
  const filtered = speciesKeys.filter((name) => {
    const gen = genMap.get(name) ?? 0
    if (filterGen !== 'all' && gen !== +filterGen) return false
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalFertF = speciesKeys.reduce((a, n) => a + (inventory[n]?.fertile_f ?? 0), 0)
  const totalFertM = speciesKeys.reduce((a, n) => a + (inventory[n]?.fertile_m ?? 0), 0)
  const totalFert  = totalFertF + totalFertM
  const totalSterF = speciesKeys.reduce((a, n) => a + (inventory[n]?.sterile_f ?? 0), 0)
  const totalSterM = speciesKeys.reduce((a, n) => a + (inventory[n]?.sterile_m ?? 0), 0)
  const totalSter  = totalSterF + totalSterM

  return (
    <div>
      <BulkCaptureModal open={showModal} onClose={() => setShowModal(false)} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Inventaire</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Gérez vos captures et effectifs par espèce
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowModal(true)}>+ Capture en masse</Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <Zap size={20} />, val: totalFert, label: 'Individus fertiles', sub: `♀ ${totalFertF} · ♂ ${totalFertM}` },
          { icon: <Ban size={20} />, val: totalSter, label: 'Individus stériles',  sub: `♀ ${totalSterF} · ♂ ${totalSterM}` },
          { icon: <Dna size={20} />, val: speciesKeys.length, label: 'Espèces référencées', sub: `${[...new Set(speciesKeys.map(n => genMap.get(n)).filter(Boolean))].length} générations` },
        ].map(({ icon, val, label, sub }) => (
          <Card key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.15)' }}>
            <CardContent style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(220,220,230,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E5E7EB', flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#E5E7EB', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <Input placeholder="Rechercher…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
        <Select value={filterGen} onValueChange={setFilterGen}>
          <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gens</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map((g) => <SelectItem key={g} value={String(g)}>Gen {g}</SelectItem>)}
          </SelectContent>
        </Select>
        <span style={{ color: '#374151', fontSize: 12, marginLeft: 'auto' }}>{filtered.length} espèces</span>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        {loading && <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Chargement…</div>}
        <Table>
          <TableHeader>
            <TableRow style={{ fontSize: 10, color: '#374151', letterSpacing: '0.08em' }}>
              <TableHead>Espèce</TableHead>
              <TableHead>Gen</TableHead>
              <TableHead className="text-center" style={{ color: '#D1D5DB' }}>Fert ♀</TableHead>
              <TableHead className="text-center" style={{ color: '#9CA3AF' }}>Fert ♂</TableHead>
              <TableHead className="text-center">Stér ♀</TableHead>
              <TableHead className="text-center">Stér ♂</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((name) => (
              <InventaireSpeciesRow
                key={name}
                speciesName={name}
                generation={genMap.get(name) ?? 0}
                entry={inventory[name]}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire InventaireView into `page.tsx`**

```typescript
// Old:
{activeView === 'inventaire' && <div style={{ color: '#6B7280' }}>Inventaire view — coming soon</div>}

// New:
{activeView === 'inventaire' && <InventaireView />}
```

Add import: `import { InventaireView } from '@/components/inventaire/InventaireView'`

- [ ] **Step 5: Type-check + visual verify**

```bash
cd frontend && npx tsc --noEmit && npm run dev
```

Navigate to Inventaire. Expected: 3 summary cards, filter bar, table with Capturer popovers. Bulk capture modal opens and closes. If backend not running, tables are empty — that's fine.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/inventaire/ src/app/page.tsx
git commit -m "feat: add InventaireView with Popover capture and BulkCaptureModal"
```

---

## Task 8: EnclosView

**Files:**
- Create: `frontend/src/components/enclos/PlannerForm.tsx`
- Create: `frontend/src/components/enclos/PairCard.tsx`
- Create: `frontend/src/components/enclos/EnclosCard.tsx`
- Create: `frontend/src/components/enclos/ResultsPanel.tsx`
- Create: `frontend/src/components/enclos/EnclosView.tsx`

- [ ] **Step 1: Create `src/components/enclos/PlannerForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { usePlannerStore } from '@/stores/planner'

export function PlannerForm() {
  const { generate, loading, plan, clearPlan } = usePlannerStore()
  const [count, setCount] = useState(4)

  const handlePlanify = async () => {
    if (plan) {
      if (!window.confirm('Un plan est déjà actif. Régénérer efface les résultats saisis. Continuer ?')) return
      clearPlan()
    }
    await generate(count)
  }

  return (
    <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.18)', marginBottom: 20 }}>
      <CardContent style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', marginBottom: 16 }}>
          Configuration de session
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Nombre d'enclos</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="outline" size="sm"
                onClick={() => setCount((c) => Math.max(1, c - 1))}>−</Button>
              <Input type="number" min={1} max={10} value={count}
                onChange={(e) => setCount(Math.min(10, Math.max(1, +e.target.value)))}
                style={{ width: 64, textAlign: 'center', fontWeight: 700 }} />
              <Button variant="outline" size="sm"
                onClick={() => setCount((c) => Math.min(10, c + 1))}>+</Button>
              <span style={{ color: '#374151', fontSize: 12 }}>/ 10 max</span>
            </div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(220,220,230,0.15)', margin: '0 6px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Paires par enclos</label>
            <div style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 22 }}>5</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button onClick={handlePlanify} disabled={loading}>
              {loading ? 'Planification…' : '⚡ Planifier'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `src/components/enclos/PairCard.tsx`**

```typescript
'use client'

import { Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GenBadge } from '@/components/shared/GenBadge'
import type { PlannedPair } from '@/types'

export function PairCard({ pair, index }: { pair: PlannedPair; index: number }) {
  const pct = Math.round(pair.success_chance * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 8,
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 10, color: '#374151', width: 16, textAlign: 'center', fontWeight: 700 }}>
        {index + 1}
      </span>
      <span style={{ fontSize: 10, color: '#D1D5DB' }}>♀</span>
      <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 500, maxWidth: 80,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {pair.parent_f.species_name}
      </span>
      <GenBadge gen={0} />
      <span style={{ color: '#374151', fontWeight: 700, padding: '0 4px' }}>×</span>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>♂</span>
      <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 500, maxWidth: 80,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {pair.parent_m.species_name}
      </span>
      <GenBadge gen={0} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <Target size={12} style={{ color: '#E5E7EB' }} />
        <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 600,
          maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pair.target_child_species}
        </span>
      </div>
      <Badge variant="outline" style={{ fontSize: 10, flexShrink: 0 }}>{pct}%</Badge>
    </div>
  )
}
```

Note: `GenBadge gen={0}` won't resolve correctly — the parent generation is not stored in `PlannedParent`. Pass `gen={0}` as a placeholder; the badge will render with gen 1 fallback color. This is acceptable per YAGNI — the backend doesn't return parent generation in `PlannedParent`.

- [ ] **Step 3: Create `src/components/enclos/EnclosCard.tsx`**

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { PairCard } from './PairCard'
import type { PlannedEnclos } from '@/types'

export function EnclosCard({ enclos }: { enclos: PlannedEnclos }) {
  return (
    <Card style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(220,220,230,0.13)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px 12px', borderBottom: '1px solid rgba(220,220,230,0.08)',
        background: 'rgba(220,220,230,0.06)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>
          Enclos {enclos.enclos_number}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>{enclos.pairs.length} paires</span>
      </div>
      <CardContent style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {enclos.pairs.map((pair, i) => (
          <PairCard key={i} pair={pair} index={i} />
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create `src/components/enclos/ResultsPanel.tsx`**

All pairs must have a result (success/fail + child species + child sex) before submit is enabled.

```typescript
'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlannerStore } from '@/stores/planner'
import { useCascadeStore } from '@/stores/cascade'
import type { BatchBreedError, PairResult } from '@/types'

export function ResultsPanel() {
  const { plan, results, setResult, submitBatch } = usePlannerStore()
  const allSpecies = useCascadeStore((s) => s.items.map((i) => i.species_name))
  const [errors, setErrors] = useState<BatchBreedError[]>([])
  const [submitting, setSubmitting] = useState(false)

  if (!plan) return null

  const allPairs = plan.enclos.flatMap((e) =>
    e.pairs.map((pair, pairIdx) => ({ enclosNum: e.enclos_number, pairIdx, pair }))
  )
  const totalPairs = allPairs.length
  const filledCount = Object.keys(results).length
  const allFilled = filledCount === totalPairs

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await submitBatch()
      if (result.errors.length > 0) setErrors(result.errors)
    } catch (e) {
      console.error('submitBatch failed', e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(220,220,230,0.12)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(220,220,230,0.08)',
        background: 'rgba(220,220,230,0.05)', fontSize: 13, fontWeight: 600, color: '#E5E7EB' }}>
        Résultats des élevages
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allPairs.map(({ enclosNum, pairIdx, pair }) => {
          const key = `${enclosNum}-${pairIdx}`
          const r = results[key] as PairResult | undefined

          const setSuccess = (success: boolean) =>
            setResult(key, {
              success,
              child_species_name: r?.child_species_name ?? pair.target_child_species,
              child_sex: r?.child_sex ?? 'F',
            })

          const setChildSpecies = (child_species_name: string) =>
            r && setResult(key, { ...r, child_species_name })

          const setChildSex = (child_sex: 'F' | 'M') =>
            r && setResult(key, { ...r, child_sex })

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, color: '#6B7280', minWidth: 120, flexShrink: 0 }}>
                Enclos {enclosNum} · Paire {pairIdx + 1}
              </span>
              {/* Succès / Échec toggle */}
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="sm" variant={r?.success === true ? 'default' : 'outline'}
                  onClick={() => setSuccess(true)} style={{ fontSize: 11 }}>Succès</Button>
                <Button size="sm" variant={r?.success === false ? 'default' : 'outline'}
                  onClick={() => setSuccess(false)} style={{ fontSize: 11 }}>Échec</Button>
              </div>
              {/* Child species */}
              {r !== undefined && (
                <>
                  <Select value={r.child_species_name} onValueChange={setChildSpecies}>
                    <SelectTrigger style={{ width: 180, fontSize: 11 }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allSpecies.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Child sex */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['F', 'M'] as const).map((s) => (
                      <Button key={s} size="sm" variant={r.child_sex === s ? 'default' : 'outline'}
                        onClick={() => setChildSex(s)} style={{ fontSize: 11 }}>
                        {s === 'F' ? '♀' : '♂'}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {errors.length > 0 && (
        <div style={{ margin: '0 16px 12px', padding: 12, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#F87171', marginBottom: 6 }}>Erreurs partielles :</div>
          {errors.map((e) => (
            <div key={e.index} style={{ fontSize: 11, color: '#FCA5A5' }}>
              Paire {e.index + 1} : {e.detail}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(220,220,230,0.08)' }}>
        <Button onClick={handleSubmit} disabled={!allFilled || submitting} style={{ width: '100%' }}>
          {submitting
            ? 'Enregistrement…'
            : `Enregistrer la session (${filledCount} / ${totalPairs} saisis)`}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/enclos/EnclosView.tsx`**

```typescript
'use client'

import { usePlannerStore } from '@/stores/planner'
import { PlannerForm } from './PlannerForm'
import { EnclosCard } from './EnclosCard'
import { ResultsPanel } from './ResultsPanel'

export function EnclosView() {
  const { plan, results } = usePlannerStore()

  const totalPairs = plan?.enclos.reduce((a, e) => a + e.pairs.length, 0) ?? 0
  const filledCount = Object.keys(results).length
  const hasPersistedData = plan !== null && filledCount > 0

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Enclos</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Planifiez vos sessions d'élevage par enclos
        </p>
      </div>

      {/* Session en cours banner — inside EnclosView Mode 1 only */}
      {hasPersistedData && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: 'rgba(220,220,230,0.08)', border: '1px solid rgba(220,220,230,0.2)',
          fontSize: 13, color: '#9CA3AF' }}>
          Session en cours — {filledCount} résultat{filledCount !== 1 ? 's' : ''} saisi{filledCount !== 1 ? 's' : ''} sur {totalPairs}.
          Continuez ci-dessous ou régénérez un plan.
        </div>
      )}

      <PlannerForm />

      {plan && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', alignItems: 'center',
            background: 'rgba(220,220,230,0.07)', border: '1px solid rgba(220,220,230,0.15)',
            borderRadius: 12, padding: '16px 28px', marginBottom: 20 }}>
            {[
              { label: 'Enclos', val: plan.enclos.length },
              { label: 'Paires', val: plan.summary.total_pairs },
              { label: 'Succès estimés', val: plan.summary.estimated_successes },
              { label: 'Restantes après', val: plan.summary.remaining_after },
            ].map(({ label, val }, i, arr) => (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column',
                  gap: 4, alignItems: 'center', flex: 1 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#E5E7EB',
                    fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 1, height: 40, background: 'rgba(220,220,230,0.15)' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Enclos grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {plan.enclos.map((enclos) => <EnclosCard key={enclos.enclos_number} enclos={enclos} />)}
          </div>

          <ResultsPanel />
        </>
      )}

      {!plan && (
        <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex',
          flexDirection: 'column', alignItems: 'center', color: '#6B7280' }}>
          <div style={{ marginBottom: 16, fontSize: 48 }}>
            {/* LayoutGrid icon as placeholder */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div style={{ fontSize: 15 }}>Configurez vos enclos et lancez la planification</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Wire EnclosView into `page.tsx`**

```typescript
// Old:
{activeView === 'enclos' && <div style={{ color: '#6B7280' }}>Enclos view — coming soon</div>}

// New:
{activeView === 'enclos' && <EnclosView />}
```

Add import: `import { EnclosView } from '@/components/enclos/EnclosView'`

- [ ] **Step 7: Type-check + visual verify**

```bash
cd frontend && npx tsc --noEmit && npm run dev
```

Navigate to Enclos. Expected:
- PlannerForm card with stepper and Planifier button
- Empty state with grid icon below
- After clicking Planifier (backend must be running): summary bar + 2-column EnclosCard grid + ResultsPanel with all pair rows
- Pair rows: Succès/Échec buttons, species select (defaults to target), sex toggle
- Submit button disabled until all pairs filled
- Plan survives page refresh (localStorage persist)

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/components/enclos/ src/app/page.tsx
git commit -m "feat: add EnclosView with PlannerForm, EnclosCard, PairCard, ResultsPanel"
```

