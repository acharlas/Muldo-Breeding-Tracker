# Phase 4 — Frontend Design Spec

**Date:** 2026-04-25
**Status:** Approved

## Goal

Build a dark-themed dashboard UI for the Muldo Breeding Tracker with three views: Cascade, Inventaire, and Enclos. The app is a single-page client application with tab-based navigation, Zustand stores for state, and shadcn components throughout.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind v4 + shadcn (base-nova style) |
| Icons | lucide-react (already installed) |
| State | Zustand v5 |
| HTTP | Existing `api.ts` (fetch wrapper) |
| UI components | shadcn — Button, Input, Select, Badge, Card, Dialog, Table, Progress |

No new dependencies. All packages are already in `package.json`.

## Architecture

### Single-page shell

`src/app/page.tsx` is a client component (`'use client'`) that holds the active view in local state. The layout is a fixed sidebar (220px) plus a scrollable main content area. No Next.js routing — tab switching via `useState`.

```
page.tsx
├── Sidebar (fixed left, 220px)
│   ├── Logo block
│   ├── Nav items (BarChart2 / Package / LayoutGrid)
│   └── Quick stats (Terminées / En cours / À faire)
└── main (margin-left 220px, scrollable)
    └── {activeView === 'cascade' && <CascadeView />}
        {activeView === 'inventaire' && <InventaireView />}
        {activeView === 'enclos' && <EnclosView />}
```

### Dark theme

Applied via CSS variables in `globals.css`. Background `#0A0A0C`, subtle grid texture (fixed, pointer-events none). Font: Space Grotesk (Google Fonts, added to `layout.tsx`). All shadcn components inherit the dark theme via the existing `dark` class on `<html>`.

### shadcn component usage

Use shadcn components as the primary building block whenever a match exists:

| Need | shadcn component |
|---|---|
| Stat cards | `<Card>` + `<CardHeader>` + `<CardContent>` |
| Buttons | `<Button variant="outline">` / `<Button variant="ghost">` |
| Text inputs | `<Input>` |
| Dropdowns | `<Select>` + `<SelectContent>` + `<SelectItem>` |
| Status labels | `<Badge variant="outline">` |
| Progress bars | `<Progress>` |
| Modals | `<Dialog>` + `<DialogContent>` |
| Tables | `<Table>` + `<TableRow>` + `<TableCell>` |
| Accordions | `<Collapsible>` or `<Accordion>` |

Custom inline styles only for game-specific visual elements that shadcn doesn't cover (gen color badges, grid texture, glass card effect).

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx          MODIFY — add Space Grotesk font
│   ├── page.tsx            MODIFY — DashboardShell (client component)
│   └── globals.css         MODIFY — dark theme CSS variables
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx     CREATE
│   ├── cascade/
│   │   ├── CascadeView.tsx CREATE — StatBar + filters + GenGroups
│   │   ├── GenGroup.tsx    CREATE — collapsible generation accordion
│   │   ├── SpeciesRow.tsx  CREATE — one species row with progress
│   │   └── StatusBadge.tsx CREATE — ok / en_cours / a_faire badge
│   ├── inventaire/
│   │   ├── InventaireView.tsx    CREATE
│   │   ├── SpeciesRow.tsx        CREATE — capture buttons per row
│   │   └── BulkCaptureModal.tsx  CREATE — Dialog with species checklist
│   └── enclos/
│       ├── EnclosView.tsx    CREATE — orchestrator (plan or results mode)
│       ├── PlannerForm.tsx   CREATE — enclos count input + Planifier button
│       ├── EnclosCard.tsx    CREATE — card with 5 PairCards
│       ├── PairCard.tsx      CREATE — ♀ × ♂ → target child
│       └── ResultsPanel.tsx  CREATE — success/fail input per pair + submit
├── stores/
│   ├── cascade.ts    CREATE
│   ├── inventory.ts  CREATE
│   └── planner.ts    CREATE — persist middleware (localStorage)
├── lib/
│   └── api.ts        MODIFY — add typed functions per endpoint
└── types/
    └── index.ts      CREATE — all TypeScript types
```

---

## TypeScript Types (`src/types/index.ts`)

Mirror the backend Pydantic schemas:

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

// Stored alongside each PlannedPair once the user records the result
export type PairResult = {
  success: boolean
  child_species_name: string  // target if success, actual species if fail
  child_sex: 'F' | 'M'
}
```

---

## Zustand Stores

### `useCascadeStore`

```typescript
type CascadeStore = {
  items: CascadeItem[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}
```

- `fetch()` calls `GET /api/cascade`, sets `items`
- Called once on CascadeView mount

### `useInventoryStore`

```typescript
type InventoryStore = {
  inventory: Record<string, InventoryEntry>
  stats: InventoryStats | null
  loading: boolean
  fetch: () => Promise<void>
  capture: (speciesName: string, sex: 'F' | 'M') => Promise<void>
  bulkCapture: (speciesName: string, sex: 'F' | 'M', count: number) => Promise<void>
  deleteMultido: (id: number) => Promise<void>
}
```

- `fetch()` calls `GET /api/inventory` and `GET /api/inventory/stats` in parallel
- After `capture` / `bulkCapture` / `delete`, calls `fetch()` to refresh

### `usePlannerStore` (persisted)

```typescript
type PlannerStore = {
  plan: PlanResult | null
  results: Record<string, PairResult>  // key: `${enclosNum}-${pairIdx}`
  loading: boolean
  generate: (enclosCount: number) => Promise<void>
  setResult: (key: string, result: PairResult) => void
  submitBatch: () => Promise<void>
  clearPlan: () => void
}
```

- Uses `zustand/middleware` `persist` to save `plan` and `results` to localStorage key `muldo-planner`
- `generate()` calls `POST /api/plan`, replaces `plan`, clears `results`
- `submitBatch()` builds `BreedRequest[]` from `results`, calls `POST /api/breed/batch`, then calls `clearPlan()`
- `clearPlan()` resets both `plan` and `results` to null/empty

---

## Views

### Cascade

**Data:** `useCascadeStore.items`

**Layout:**
1. Page header (title + subtitle)
2. StatBar — 4 shadcn `<Card>` items: species owned / 120, Gen 10 goal (N/50), total fertile ♀, total fertile ♂. Cards with `<Progress>` bar on the first two.
3. Filter bar — `<Input>` search, `<Select>` generation filter, `<Select>` status filter, count label
4. GenGroup list — one collapsible `<Collapsible>` per generation (1–10), showing gen color, done/total count, and a `<Progress>` bar in the header. Gen 1–3 open by default.
5. Inside each GenGroup: `<Table>` with columns: Espèce / Gen / Statut / Fertiles (♀/♂) / Objectif / Restants / Progression

**StatusBadge:** shadcn `<Badge variant="outline">` with custom color per status:
- `ok` → white/light text, white border
- `en_cours` → muted text, muted border
- `a_faire` → dimmed text, dimmed border

**GenBadge:** custom inline span — color-coded by generation (Gen 1 green → Gen 10 gold). Not shadcn (too custom).

**ProgressBar in SpeciesRow:** shadcn `<Progress>` at `h-1`.

### Inventaire

**Data:** `useInventoryStore.inventory`, `useInventoryStore.stats`

**Layout:**
1. Page header + "Capture en masse" `<Button>` (top right)
2. 3 summary `<Card>` items: total fertiles (with ♀/♂ breakdown), total stériles, espèces référencées
3. Filter bar — `<Input>` search, `<Select>` gen filter
4. Species `<Table>`: Espèce / Gen / Fert ♀ / Fert ♂ / Stér ♀ / Stér ♂ / Actions
5. Each row Actions column: `<Button variant="outline" size="sm">` with `<Plus>` icon — opens single capture inline (sex selector + confirm)

**BulkCaptureModal:** shadcn `<Dialog>`. Content: search `<Input>`, scrollable species checklist (checkbox + GenBadge + ♀ count input + ♂ count input per selected species), confirm `<Button>`.

### Enclos

**Data:** `usePlannerStore`

**Two modes driven by `plan !== null`:**

#### Mode 1 — No plan (empty state)
- PlannerForm: shadcn `<Card>` with label, stepper (− / number `<Input>` / +), "Planifier" `<Button>`
- Empty state illustration below

#### Mode 2 — Plan generated
- PlannerForm remains visible at top (to re-generate)
- Summary bar: 4 stats (enclos, paires, succès estimés, restantes après)
- Enclos grid: 2-column `<Card>` grid, each card shows "Enclos N" header + 5 PairCards
- Each PairCard: pair index · ♀ species · × · ♂ species · → target · 55% badge
- ResultsPanel below grid: lists all pairs with Succès / Échec toggle (`<Button>` pair) + species `<Select>` (for fail: what species was actually obtained) — initially hidden until at least one pair is filled
- "Enregistrer la session (X/Y saisis)" `<Button>` — enabled only when all pairs have a result

**localStorage persistence:** Zustand persist keeps `plan` and `results` across page refreshes. A banner appears if a persisted plan exists on load: "Session en cours — N résultats saisis sur M."

---

## Icon Mapping (lucide-react)

| Emoji (design) | Lucide icon | Usage |
|---|---|---|
| 📊 | `BarChart2` | Sidebar — Cascade |
| 🗃️ | `Package` | Sidebar — Inventaire |
| 🏠 | `LayoutGrid` | Sidebar — Enclos |
| ⚡ | `Zap` | Summary card — Fertiles |
| 🚫 | `Ban` | Summary card — Stériles |
| 🧬 | `Dna` | Summary card — Espèces |
| 🎯 | `Target` | Pair card — target child |
| ✓ | `Check` | Success badge / status ok |
| ✕ | `X` | Fail badge |
| › | `ChevronRight` | Accordion chevron |
| + | `Plus` | Capture button |

---

## Enclos Persistence Flow

```
User clicks Planifier
  → POST /api/plan
  → usePlannerStore.plan = response         ← persisted to localStorage
  → usePlannerStore.results = {}            ← persisted to localStorage

User records results (in-game then returns)
  → usePlannerStore.setResult(key, result)  ← persisted on each change

User clicks Enregistrer la session
  → POST /api/breed/batch (built from results)
  → useCascadeStore.fetch()                 ← refresh cascade after batch
  → useInventoryStore.fetch()               ← refresh inventory
  → usePlannerStore.clearPlan()             ← clears localStorage
```

---

## Out of Scope (Phase 4)

- Historique view (deferred — requires new backend endpoint)
- Mobile responsiveness
- Authentication
- Dark/light theme toggle
