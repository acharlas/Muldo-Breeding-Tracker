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
  const { inventory, loading, fetch } = useInventoryStore()

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
        <Input placeholder="Rechercher…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
        <Select value={filterGen} onValueChange={(v) => setFilterGen(v ?? 'all')}>
          <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gens</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map((g) => (
              <SelectItem key={g} value={String(g)}>Gen {g}</SelectItem>
            ))}
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
