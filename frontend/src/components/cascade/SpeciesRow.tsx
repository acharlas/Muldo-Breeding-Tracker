'use client'

import { Progress } from '@/components/ui/progress'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { StatusBadge } from './StatusBadge'
import type { CascadeItem } from '@/types'

export function SpeciesRow({ item }: { item: CascadeItem }) {
  const progress = item.production_target > 0
    ? Math.min(100, Math.round((Math.min(item.fertile_f, item.fertile_m) / item.production_target) * 100))
    : 0

  return (
    <TableRow>
      <TableCell className="font-medium text-sm"
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.species_name}
      </TableCell>
      <TableCell><GenBadge gen={item.generation} /></TableCell>
      <TableCell><StatusBadge status={item.status} /></TableCell>
      <TableCell className="text-center text-sm">
        <span style={{ color: '#D1D5DB' }}>♀ {item.fertile_f}</span>
        <span style={{ color: '#374151', margin: '0 4px' }}>/</span>
        <span style={{ color: '#9CA3AF' }}>♂ {item.fertile_m}</span>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{item.production_target}</TableCell>
      <TableCell className="text-center text-sm">
        {item.remaining > 0
          ? <span style={{ color: '#9CA3AF', fontWeight: 600 }}>−{item.remaining}</span>
          : <span style={{ color: '#E5E7EB', fontWeight: 600 }}>✓</span>}
      </TableCell>
      <TableCell style={{ minWidth: 80 }}>
        <Progress value={progress} className="h-1" />
      </TableCell>
    </TableRow>
  )
}
