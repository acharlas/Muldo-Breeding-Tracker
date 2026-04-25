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
      <GenBadge gen={1} />
      <span style={{ color: '#374151', fontWeight: 700, padding: '0 4px' }}>×</span>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>♂</span>
      <span style={{ fontSize: 11, color: '#E5E7EB', fontWeight: 500, maxWidth: 80,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {pair.parent_m.species_name}
      </span>
      <GenBadge gen={1} />
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
