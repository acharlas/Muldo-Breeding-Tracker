'use client'

import { useEffect, useMemo, useState } from 'react'
import { Zap, Ban, Dna, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCascadeStore } from '@/stores/cascade'
import { useInventoryStore } from '@/stores/inventory'
import { InventaireSpeciesRow } from './SpeciesRow'
import { BulkCaptureModal } from './BulkCaptureModal'

type SortKey = 'name' | 'gen' | 'fertile_f' | 'fertile_m' | 'sterile_f' | 'sterile_m'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />
  return sortDir === 'asc'
    ? <ChevronUp size={12} style={{ marginLeft: 4 }} />
    : <ChevronDown size={12} style={{ marginLeft: 4 }} />
}

function SortHead({ col, label, sortKey, sortDir, onSort, style, className }: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir
  onSort: (col: SortKey) => void; style?: React.CSSProperties; className?: string
}) {
  return (
    <TableHead className={className}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      onClick={() => onSort(col)}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </TableHead>
  )
}

export function InventaireView() {
  const cascadeItems = useCascadeStore((s) => s.items)
  const fetchCascade = useCascadeStore((s) => s.fetch)
  const { inventory, loading, fetch } = useInventoryStore()

  useEffect(() => {
    fetch()
    if (cascadeItems.length === 0) fetchCascade()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch, fetchCascade])

  const genMap = useMemo(() => {
    const m = new Map<string, number>()
    cascadeItems.forEach((i) => m.set(i.species_name, i.generation))
    return m
  }, [cascadeItems])

  const [search, setSearch] = useState('')
  const [filterGen, setFilterGen] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('gen')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const speciesKeys = Object.keys(inventory)

  const filtered = useMemo(() => {
    const keys = speciesKeys.filter((name) => {
      const gen = genMap.get(name) ?? 0
      if (filterGen !== 'all' && gen !== +filterGen) return false
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    keys.sort((a, b) => {
      let va: number | string
      let vb: number | string
      const ea = inventory[a] ?? { fertile_f: 0, fertile_m: 0, sterile_f: 0, sterile_m: 0 }
      const eb = inventory[b] ?? { fertile_f: 0, fertile_m: 0, sterile_f: 0, sterile_m: 0 }
      switch (sortKey) {
        case 'name':    va = a; vb = b; break
        case 'gen':     va = genMap.get(a) ?? 0; vb = genMap.get(b) ?? 0; break
        case 'fertile_f':  va = ea.fertile_f;  vb = eb.fertile_f;  break
        case 'fertile_m':  va = ea.fertile_m;  vb = eb.fertile_m;  break
        case 'sterile_f':  va = ea.sterile_f;  vb = eb.sterile_f;  break
        case 'sterile_m':  va = eb.sterile_m;  vb = eb.sterile_m;  break
        default: return 0
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return keys
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesKeys.join(','), inventory, genMap, filterGen, search, sortKey, sortDir])

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
          { icon: <Dna size={20} />, val: speciesKeys.length, label: 'Espèces référencées',
            sub: `${new Set(speciesKeys.map(n => genMap.get(n)).filter((g): g is number => g !== undefined)).size} générations` },
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
        <div style={{ position: 'relative' }}>
          <Input placeholder="Rechercher…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200, paddingRight: search ? 28 : undefined }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280',
                display: 'flex', alignItems: 'center', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={filterGen} onValueChange={(v) => setFilterGen(v ?? 'all')}>
          <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gens</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map((g) => (
              <SelectItem key={g} value={String(g)}>Gen {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterGen !== 'all' && (
          <button onClick={() => setFilterGen('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
              cursor: 'pointer', color: '#6B7280', fontSize: 12 }}>
            <X size={13} /> Gen {filterGen}
          </button>
        )}
        <span style={{ color: '#374151', fontSize: 12, marginLeft: 'auto' }}>{filtered.length} espèces</span>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.12)', borderRadius: 12, overflow: 'hidden' }}>
        {loading && <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Chargement…</div>}
        <Table>
          <TableHeader>
            <TableRow style={{ fontSize: 12, color: '#374151', letterSpacing: '0.08em' }}>
              <SortHead col="name"      label="Espèce"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHead col="gen"       label="Gen"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHead col="fertile_f" label="Fertile ♀"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center" style={{ color: '#F472B6' }} />
              <SortHead col="fertile_m" label="Fertile ♂"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center" style={{ color: '#60A5FA' }} />
              <SortHead col="sterile_f" label="Stérile ♀"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center" />
              <SortHead col="sterile_m" label="Stérile ♂"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-center" />
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
