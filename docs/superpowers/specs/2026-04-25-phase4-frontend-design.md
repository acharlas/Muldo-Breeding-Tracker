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
| UI components | shadcn — Button, Input, Select, Badge, Card, Dialog, Popover, Table, Progress, Collapsible |

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

Applied via CSS variables in `globals.css`. Background `#0A0A0C`, subtle grid texture (fixed, pointer-events none). Font: Space Grotesk (Google Fonts via `next/font/google`, added to `layout.tsx`). All shadcn components inherit the dark theme via the existing `dark` class on `<html>`.

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
| Accordions | `<Collapsible>` |
| Inline capture | `<Popover>` |

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
│   │   └── Sidebar.tsx           CREATE
│   ├── shared/
│   │   └── GenBadge.tsx          CREATE — gen color badge, used across views
│   ├── cascade/
│   │   ├── CascadeView.tsx       CREATE — StatBar + filters + GenGroups
│   │   ├── GenGroup.tsx          CREATE — collapsible generation accordion
│   │   ├── SpeciesRow.tsx        CREATE — one species row with progress
│   │   └── StatusBadge.tsx       CREATE — ok / en_cours / a_faire badge
│   ├── inventaire/
│   │   ├── InventaireView.tsx    CREATE
│   │   ├── SpeciesRow.tsx        CREATE — row with inline capture Popover
│   │   └── BulkCaptureModal.tsx  CREATE — Dialog with species checklist
│   └── enclos/
│       ├── EnclosView.tsx        CREATE — orchestrator (plan or results mode)
│       ├── PlannerForm.tsx       CREATE — enclos count input + Planifier button
│       ├── EnclosCard.tsx        CREATE — card with 5 PairCards
│       ├── PairCard.tsx          CREATE — ♀ × ♂ → target child
│       └── ResultsPanel.tsx      CREATE — success/fail input per pair + submit
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
  child_species_name: string  // target species if success, actual species if fail
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
}
```

- `fetch()` calls `GET /api/inventory` and `GET /api/inventory/stats` in parallel
- After `capture` / `bulkCapture`, calls `fetch()` to refresh
- No delete action in Phase 4 (no UI trigger — YAGNI)
- Errors from API calls are logged to console; no error state needed for Phase 4

**Generation data in Inventaire:** `GET /api/inventory` returns `Record<string, InventoryEntry>` with no generation field. The InventaireView sources generation by cross-referencing `useCascadeStore.items` — it builds a `Map<string, number>` from `species_name → generation` on mount. This means CascadeView data is fetched before or alongside InventaireView data. Both stores `fetch()` on their view's mount independently.

### `usePlannerStore` (persisted)

```typescript
type PlannerStore = {
  plan: PlanResult | null
  results: Record<string, PairResult>  // key: `${enclosNum}-${pairIdx}`
  loading: boolean
  generate: (enclosCount: number) => Promise<void>
  setResult: (key: string, result: PairResult) => void
  submitBatch: () => Promise<BatchBreedResult>
  clearPlan: () => void
}
```

- Uses `zustand/middleware` `persist` with `partialize` to save only `plan` and `results`:
  ```typescript
  partialize: (state) => ({ plan: state.plan, results: state.results })
  ```
- `generate(enclosCount)` calls `POST /api/plan` with body `{ enclos_count: enclosCount }` (snake_case). Replaces `plan`, clears `results`.
- `submitBatch()` builds `{ results: BreedRequest[] }` from `results` map — iterating in enclos/pair order. Calls `POST /api/breed/batch`. On success, triggers `useCascadeStore.fetch()` and `useInventoryStore.fetch()` to refresh data, then calls `clearPlan()`. On partial failure (response contains `errors[]`), shows the error list in a banner before clearing.
- `clearPlan()` resets `plan` to `null` and `results` to `{}` — clears localStorage via Zustand persist.

---

## Views

### Cascade

**Data:** `useCascadeStore.items` (fetch on mount)

**Layout:**
1. Page header (title + subtitle)
2. StatBar — 4 shadcn `<Card>` items in a 4-column grid:
   - Espèces possédées: `owned / 120` with `<Progress>`
   - Objectif Gen 10: `gen10owned / 50` with `<Progress>`
   - Femelles fertiles: sum of `fertile_f` across all items
   - Mâles fertiles: sum of `fertile_m` across all items
3. Filter bar (`<Input>` search + `<Select>` generation + `<Select>` status + count label)
4. List of `<GenGroup>` for generations 1–10 (only those with matching species shown after filter)

**GenGroup (`GenGroup.tsx`):**
- Wraps shadcn `<Collapsible>`. Header: gen label + color, done/total count, `<Progress>` bar, `<ChevronRight>` icon (rotated when open)
- Gen 1–3 open by default
- Inside: `<Table>` with columns: Espèce / Gen / Statut / Fertiles ♀/♂ / Objectif / Restants / Progression

**SpeciesRow (`cascade/SpeciesRow.tsx`):**
- Columns: species name | `<GenBadge>` | `<StatusBadge>` | `♀ N / ♂ N` | target | remaining | `<Progress h-1>`

**StatusBadge:** shadcn `<Badge variant="outline">` with inline color style per status:
- `ok` → white text + white border
- `en_cours` → muted text + muted border
- `a_faire` → dim text + dim border

**GenBadge (`shared/GenBadge.tsx`):** Custom `<span>` — color-coded by generation (Gen 1 `#4ADE80` → Gen 10 `#F59E0B`). Not shadcn (game-specific). Used in Cascade, Inventaire, and BulkCaptureModal.

### Inventaire

**Data:** `useInventoryStore.inventory` + `useInventoryStore.stats` (fetch on mount). Generation sourced from `useCascadeStore.items` (also fetched on mount if not already loaded).

**Layout:**
1. Page header + "Capture en masse" `<Button>` (top right, opens BulkCaptureModal)
2. 3 summary `<Card>` items in a 3-column grid:
   - Total fertiles (with `♀ N · ♂ N` subtitle) — `<Zap>` icon
   - Total stériles — `<Ban>` icon
   - Espèces référencées — `<Dna>` icon
3. Filter bar — `<Input>` search, `<Select>` gen filter, count label
4. `<Table>` with columns: Espèce / Gen / Fert ♀ / Fert ♂ / Stér ♀ / Stér ♂ / Actions

**SpeciesRow (`inventaire/SpeciesRow.tsx`):**
- Actions column: `<Popover>` trigger — a `<Button variant="outline" size="sm">` with `<Plus>` icon labelled "Capturer"
- Popover content: sex toggle (♀ / ♂ `<Button>` pair), count `<Input type="number" min=1 max=500>`, confirm `<Button>` — calls `useInventoryStore.capture(speciesName, sex)` then closes

**BulkCaptureModal (`BulkCaptureModal.tsx`):**
- shadcn `<Dialog>` triggered by "Capture en masse" button
- Content: search `<Input>`, scrollable list of species (species list sourced from `useCascadeStore.items` — all 120 species names)
- Each species row: checkbox + species name + `<GenBadge>` + (when checked) ♀ count `<Input>` + ♂ count `<Input>`
- Footer: selected count label + Cancel `<Button>` + Confirmer `<Button>` — calls `bulkCapture` for each selected species/sex pair, then closes

### Enclos

**Data:** `usePlannerStore` (Zustand persist — survives page refresh)

**Two modes driven by `plan !== null`:**

#### Mode 1 — No active plan

- `PlannerForm` card at top
- If a persisted plan exists in localStorage on page load, show a "Session en cours" banner above PlannerForm: "Session en cours — N résultats saisis sur M. Continuez ci-dessous ou régénérez un plan." Banner rendered inside `EnclosView.tsx` (not a separate component file).
- Empty state below: centered icon + "Configurez vos enclos et lancez la planification"

#### Mode 2 — Plan active

- `PlannerForm` remains at top (allows re-generating — clears current plan after confirm dialog)
- Summary bar: 4 stat chips (Enclos / Paires / Succès estimés / Restantes après)
- `EnclosCard` grid: 2-column CSS grid, `<Card>` per enclos numbered 1–N
- Each `EnclosCard`: header "Enclos N · N paires", then 5 `PairCard` rows
- `ResultsPanel` below the grid: lists all pairs with result inputs, then submit button

**PlannerForm (`PlannerForm.tsx`):**
- `<Card>` with title "Configuration de session"
- − `<Button>` / number `<Input>` / + `<Button>` stepper for enclos count (1–10)
- "Planifier" `<Button>` — calls `usePlannerStore.generate(enclosCount)`

**PairCard (`PairCard.tsx`):**
- Pair index · `♀` species name · `×` · `♂` species name · `<Target>` icon · target child name · 55% `<Badge>`
- Read-only display — no interaction here

**ResultsPanel (`ResultsPanel.tsx`):**
- Lists every pair (in enclos order) with:
  - Pair label (Enclos N · Paire M)
  - Succès / Échec toggle: two `<Button>` — one sets `success: true`, one `success: false`
  - Child species `<Select>`: populated from `useCascadeStore.items` (all 120 species names). Defaults to `target_child_species` from the plan.
  - Child sex `<Select>` or toggle: ♀ / ♂ — required for all pairs (success and fail)
- "Enregistrer la session (X / Y saisis)" `<Button>` — disabled until all pairs have a result. On click: calls `usePlannerStore.submitBatch()`, then refreshes cascade + inventory.
- On partial failure (`BatchBreedResult.errors` non-empty): show error list inline (breed index + detail message) above the button. Plan is still cleared.

**Enclos Persistence Flow:**
```
generate(enclosCount)
  → POST /api/plan  body: { enclos_count: enclosCount }
  → plan = response.data         ← persisted to localStorage
  → results = {}                 ← persisted to localStorage

setResult(key, PairResult)
  → results[key] = result        ← persisted on each change

submitBatch()
  → builds { results: BreedRequest[] } from results map
  → POST /api/breed/batch
  → on success: fetch cascade + inventory, clearPlan()
  → on partial failure: show errors[], then clearPlan()

clearPlan()
  → plan = null, results = {}    ← clears localStorage
```

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

## Out of Scope (Phase 4)

- Historique view (deferred — requires new backend endpoint)
- Mobile responsiveness
- Authentication
- Dark/light theme toggle
- Delete muldo from inventory (no UI trigger needed in Phase 4)
