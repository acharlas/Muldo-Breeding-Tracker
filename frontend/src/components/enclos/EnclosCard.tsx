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
          <PairCard key={`${pair.parent_f.id}-${pair.parent_m.id}`} pair={pair} index={i} />
        ))}
      </CardContent>
    </Card>
  )
}
