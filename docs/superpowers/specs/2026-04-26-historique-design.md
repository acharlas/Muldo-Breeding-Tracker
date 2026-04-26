# Historique View Design

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec.

**Goal:** Add a Historique view that shows the full history of breeding sessions (cycles), with per-cycle drill-down into individual pair results and auto-clone events.

---

## Data layer — snapshot strategy

Parent individuals, children, and clone results can be deleted after the fact (ON DELETE SET NULL). Joining through FKs to recover species names or sex is unreliable once a row is deleted. **All display data must be snapshotted at write time.**

### Schema changes (two migrations)

**Migration 1 — `breeding_log` snapshot columns:**

Add to `breeding_log`:
- `parent_f_species_name VARCHAR NULLABLE` — species name of the female parent at breed time
- `parent_m_species_name VARCHAR NULLABLE` — species name of the male parent at breed time
- `child_sex VARCHAR NULLABLE` — sex of the child at breed time (`'F'` or `'M'`)

Existing rows get NULL for these columns (backfill not required — they show as `"Inconnu"` in history).

**Migration 2 — `clone_log` snapshot columns:**

Add to `clone_log`:
- `cycle_number INTEGER NULLABLE` — the breeding cycle that triggered this clone
- `species_name VARCHAR NULLABLE` — species name of the cloned individual at clone time
- `sex VARCHAR NULLABLE` — sex of the cloned individual at clone time

Existing rows get NULL. The history query excludes clone rows where `cycle_number IS NULL` (they predate this feature).

### Model changes (`api/app/models/models.py`)

```python
class BreedingLog(Base):
    # existing columns ...
    parent_f_species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    parent_m_species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    child_sex: Mapped[Optional[str]] = mapped_column(String, nullable=True)

class CloneLog(Base):
    # existing columns ...
    cycle_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
```

### Breeding service changes (`api/app/services/breeding.py`)

**In `breed()`:** Before creating `BreedingLog`, resolve parent species names from the already-loaded `MuldoIndividual` and `MuldoSpecies` objects. Populate `parent_f_species_name`, `parent_m_species_name`, and `child_sex` on the log row.

**In `_run_auto_clone()`:** Add `cycle_number: int` parameter. After resolving the species for a clone, populate `species_name`, `sex`, and `cycle_number` on the `CloneLog` row.

**In `breed()`:** Pass `cycle_number` to `_run_auto_clone(db, cycle_number)`.

---

## New endpoint

`GET /api/history` — returns all cycles ordered by `cycle_number` descending.

**Query logic:**
1. Group `breeding_log` by `cycle_number`; `date` = `MIN(created_at)` per group (stored as UTC, displayed as UTC in the frontend)
2. Per row: use snapshot columns `parent_f_species_name`, `parent_m_species_name`, `child_sex`; fall back to `"Inconnu"` if NULL. `child_species` comes from joining `target_species_id` → `muldo_species.name` (species are never deleted, this join is safe)
3. Fetch `clone_log` rows by `cycle_number` for each cycle; use snapshot `species_name` and `sex`

### New Pydantic schemas (`api/app/schemas/schemas.py`)

```python
class PairHistory(BaseModel):
    parent_f_species: str
    parent_m_species: str
    child_species: str
    child_sex: str        # "F", "M", or "Inconnu"
    success: bool

class CloneHistory(BaseModel):
    species_name: str
    sex: str              # "F" or "M"

class CycleSummary(BaseModel):
    total: int
    successes: int
    fails: int
    clones: int

class CycleHistory(BaseModel):
    cycle_number: int
    date: datetime        # UTC; frontend displays as-is
    pairs: list[PairHistory]
    clones: list[CloneHistory]
    summary: CycleSummary
```

### New files

- **`api/app/routers/history.py`** — `GET /api/history`, returns `list[CycleHistory]`
- **`api/app/services/history.py`** — query logic
- **`api/app/main.py`** — register the history router

---

## Frontend

### New types (`src/types/index.ts`)

```ts
export type PairHistory = {
  parent_f_species: string
  parent_m_species: string
  child_species: string
  child_sex: string
  success: boolean
}

export type CloneHistory = {
  species_name: string
  sex: string
}

export type CycleHistory = {
  cycle_number: number
  date: string            // ISO 8601 UTC string
  pairs: PairHistory[]
  clones: CloneHistory[]
  summary: { total: number; successes: number; fails: number; clones: number }
}
```

### New store (`src/stores/history.ts`)

```ts
type HistoryStore = {
  cycles: CycleHistory[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}
```

- No persistence
- `fetch()` sets `loading: true`, calls `GET /api/history`, sets `cycles`, clears `error`, and sets `loading: false` on success; sets `error`, clears `loading` on failure

### New API call (`src/lib/api.ts`)

```ts
getHistory: () => api.get<CycleHistory[]>('/api/history')
```

### New components

**`src/components/historique/HistoriqueView.tsx`**
- Fetches history on mount via `useHistoryStore`
- Page header: "Historique" (h1, same style as other views), subtitle "Historique de vos sessions d'élevage"
- Loading state: centered "Chargement…"
- Error state: inline red error message
- Empty state (cycles.length === 0): centered `History` icon + "Aucune session enregistrée"
- Maps cycles to `CycleCard`; passes `defaultOpen={i === 0}` (cycles are sorted descending so index 0 is the most recent)

**`src/components/historique/CycleCard.tsx`**
- Props: `cycle: CycleHistory`, `defaultOpen: boolean`
- Uses shadcn `Collapsible` — same structure as `GenGroup` in Cascade
- **Header** (CollapsibleTrigger): "Cycle N" · date formatted as `DD/MM/YYYY HH:mm` (UTC) · summary chips · chevron
  - Summary chips: green `✓ N succès`, red `✗ N échecs`, purple `⟳ N clones` (only shown if > 0)
- **Expanded — pairs table**: columns `♀ Espèce`, `♂ Espèce`, `Enfant`, `Sexe`, `Résultat`
  - `♀` colored pink (`#F472B6`), `♂` colored blue (`#60A5FA`)
  - `"Inconnu"` rendered in muted color (`#6B7280`)
  - `Sexe` cell: ♀/♂ symbol with appropriate color
  - `Résultat`: green "Succès" or red "Échec" badge (same style as `StatusBadge`)
- **Expanded — clones section**: only rendered if `clones.length > 0`
  - Small label "Clonages automatiques" in muted color
  - Each clone as a pill: `Espèce · ♀` or `Espèce · ♂`

### Navigation

**`src/components/layout/Sidebar.tsx`** — add "Historique" tab with lucide `History` icon, same style as existing tabs.

**`src/app/page.tsx`** — add `'historique'` to the `View` type union, add the `HistoriqueView` render branch in the conditional.

---

## Error handling summary

| Scenario | Behaviour |
|---|---|
| Parent deleted before history loaded | `parent_f/m_species_name` NULL in DB (snapshotted before delete ran or pre-migration row) → API returns `"Inconnu"` → rendered in muted color |
| Pre-migration breeding row | `child_sex` NULL (not yet snapshotted) → API returns `"Inconnu"` |
| Pre-migration clone row | `clone_log.cycle_number` NULL → excluded from history query entirely |
| `child_species` join returns NULL | Should not occur (species never deleted); API layer falls back to `"Inconnu"` as defensive measure |
| `clone_log.sex` NULL (data anomaly) | API returns `"Inconnu"` for `CloneHistory.sex` |
| Network error on fetch | `error` set in store, `loading` set to `false` → view shows inline error message |
| No sessions yet | Empty state UI |

---

## Out of scope

- Pagination (all cycles loaded at once)
- Filtering or searching history
- Editing or deleting past cycles
- Real-time updates / polling
- Backfilling snapshot data for existing rows
