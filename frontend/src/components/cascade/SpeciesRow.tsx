'use client'

import { Progress } from '@/components/ui/progress'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { StatusBadge } from './StatusBadge'
import type { CascadeItem } from '@/types'

function urgencyBorder(available: number, remaining: number, progress: number): string {
  if (remaining === 0) return 'none'
  if (available === 0) return '3px solid rgba(248,113,113,0.7)'   // no pairs at all → red
  if (progress < 30)   return '3px solid rgba(251,146,60,0.7)'   // < 30% ready → orange
  return 'none'
}

export function SpeciesRow({ item }: { item: CascadeItem }) {
  const available = Math.min(item.fertile_f, item.fertile_m)
  const progress = item.production_target > 0
    ? Math.min(100, Math.round((available / item.production_target) * 100))
    : 0
  const borderLeft = urgencyBorder(available, item.remaining, progress)

  return (
    <TableRow style={{ fontSize: 15, borderLeft }}>
      <TableCell className="font-medium"
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.species_name}
      </TableCell>
      <TableCell><GenBadge gen={item.generation} /></TableCell>
      <TableCell><StatusBadge status={item.status} /></TableCell>
      <TableCell className="text-center">
        <span style={{ color: '#F472B6' }}>♀ {item.fertile_f}</span>
        <span style={{ color: '#374151', margin: '0 4px' }}>/</span>
        <span style={{ color: '#60A5FA' }}>♂ {item.fertile_m}</span>
      </TableCell>
      <TableCell className="text-center text-muted-foreground">{item.production_target}</TableCell>
      <TableCell className="text-center">
        {item.remaining > 0
          ? <span style={{ color: '#9CA3AF', fontWeight: 600 }}>−{item.remaining}</span>
          : <span style={{ color: '#4ADE80', fontWeight: 600 }}>✓</span>}
      </TableCell>
      <TableCell>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: progress >= 100 ? '#4ADE80' : '#9CA3AF' }}>
              {available} / {item.production_target} paires
            </span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </TableCell>
    </TableRow>
  )
}
