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
  const [filterGen, setFilterGen] = useState<string | null>('all')
  const [filterStatus, setFilterStatus] = useState<string | null>('all')

  const filtered = useMemo(() => items.filter((i) => {
    if (filterGen !== null && filterGen !== 'all' && i.generation !== Number(filterGen)) return false
    if (filterStatus !== null && filterStatus !== 'all' && i.status !== filterStatus) return false
    if (search && !i.species_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, filterGen, filterStatus, search])

  // Stats for the stat bar
  const owned   = items.filter((i) => i.status === 'ok').length
  const gen10ok = items.filter((i) => i.generation === 10 && i.status === 'ok').length
  const totalF  = items.reduce((a, i) => a + i.fertile_f, 0)
  const totalM  = items.reduce((a, i) => a + i.fertile_m, 0)
  const inProg  = items.filter((i) => i.status === 'en_cours').length

  const statCards = [
    { label: 'Espèces possédées', value: `${owned} / 120`,  sub: `${inProg} en cours`,    bar: Math.round(owned / 120 * 100) },
    { label: 'Objectif Gen 10',   value: `${gen10ok} / 50`, sub: `${50 - gen10ok} restantes`, bar: Math.round(gen10ok / 50 * 100) },
    { label: 'Femelles fertiles', value: totalF,            sub: 'total élevage',           bar: null },
    { label: 'Mâles fertiles',    value: totalM,            sub: 'total élevage',           bar: null },
  ]

  // Group filtered items by generation (1–10)
  const byGen: Record<number, typeof items> = {}
  for (let g = 1; g <= 10; g++) {
    const gs = filtered
      .filter((i) => i.generation === g)
      .sort((a, b) => {
        // completed species last
        if (a.remaining === 0 && b.remaining > 0) return 1
        if (b.remaining === 0 && a.remaining > 0) return -1
        // among unfinished: most remaining first
        return b.remaining - a.remaining
      })
    if (gs.length > 0) byGen[g] = gs
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Cascade</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Vue d&apos;ensemble de toutes les espèces par génération
        </p>
      </div>

      {/* Stat bar — 4 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map((s) => (
          <Card key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.15)' }}>
            <CardContent style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.04em',
                textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#E5E7EB', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
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
        <Select value={filterGen} onValueChange={(v) => setFilterGen(v)}>
          <SelectTrigger style={{ width: 190 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les générations</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map((g) => (
              <SelectItem key={g} value={String(g)}>Génération {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
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
