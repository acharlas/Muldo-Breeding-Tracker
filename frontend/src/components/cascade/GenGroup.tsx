'use client'

import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SpeciesRow } from './SpeciesRow'
import { useCascadeStore } from '@/stores/cascade'
import type { CascadeItem } from '@/types'

const GEN_TEXT: Record<number, string> = {
  1:'#6B7280',2:'#6B7280',3:'#9CA3AF',4:'#9CA3AF',5:'#D1D5DB',
  6:'#D1D5DB',7:'#E5E7EB',8:'#F3F4F6',9:'#F9FAFB',10:'#FFFFFF',
}

export function GenGroup({ gen, items }: { gen: number; items: CascadeItem[] }) {
  const openGens = useCascadeStore((s) => s.openGens)
  const setGenOpen = useCascadeStore((s) => s.setGenOpen)
  const open = openGens.includes(gen)
  const setOpen = (next: boolean) => setGenOpen(gen, next)
  const done = items.filter((i) => i.status === 'ok').length
  const progress = items.length > 0 ? Math.round((done / items.length) * 100) : 0
  const color = GEN_TEXT[gen] ?? '#6B7280'
  const critical = items.filter((i) => i.remaining > 0 && Math.min(i.fertile_f, i.fertile_m) === 0).length
  const urgent   = items.filter((i) => {
    if (i.remaining === 0) return false
    const avail = Math.min(i.fertile_f, i.fertile_m)
    const pct = i.production_target > 0 ? (avail / i.production_target) * 100 : 0
    return avail > 0 && pct < 30
  }).length

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.1)', borderRadius: 12, overflow: 'hidden' }}>
      <CollapsibleTrigger
        onMouseDown={(e) => e.preventDefault()}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0,
          padding: '12px 18px', background: 'rgba(220,220,230,0.05)',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: open ? '1px solid rgba(220,220,230,0.08)' : 'none',
          cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ color, fontWeight: 700, fontSize: 15, letterSpacing: '0.04em' }}>
          GÉNÉRATION {gen}
        </span>
        <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 10 }}>
          {done}/{items.length} terminées
        </span>
        {critical > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 10,
            padding: '2px 7px', borderRadius: 5,
            background: 'rgba(248,113,113,0.15)', color: '#F87171',
            border: '1px solid rgba(248,113,113,0.3)' }}>
            {critical} bloquée{critical > 1 ? 's' : ''}
          </span>
        )}
        {urgent > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6,
            padding: '2px 7px', borderRadius: 5,
            background: 'rgba(251,146,60,0.15)', color: '#FB923C',
            border: '1px solid rgba(251,146,60,0.3)' }}>
            {urgent} urgente{urgent > 1 ? 's' : ''}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ width: 100, marginRight: 12 }}>
          <Progress value={progress} className="h-1" />
        </div>
        <ChevronRight size={14} style={{ color: '#6B7280',
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: 220 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
          </colgroup>
          <TableHeader>
            <TableRow style={{ fontSize: 12, color: '#374151', letterSpacing: '0.08em' }}>
              <TableHead>Espèce</TableHead>
              <TableHead>Gen</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-center">Fertiles</TableHead>
              <TableHead className="text-center">Objectif</TableHead>
              <TableHead className="text-center">Restants</TableHead>
              <TableHead>Paires dispo / Objectif</TableHead>
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
