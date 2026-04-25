'use client'

import { Badge } from '@/components/ui/badge'

type Status = 'ok' | 'en_cours' | 'a_faire'

const STATUS_CFG: Record<Status, { label: string; color: string }> = {
  ok:       { label: '✓ OK',       color: 'rgba(255,255,255,0.9)' },
  en_cours: { label: '↻ En cours', color: 'rgba(255,255,255,0.5)' },
  a_faire:  { label: '○ À faire',  color: 'rgba(255,255,255,0.2)' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUS_CFG[status]
  return (
    <Badge variant="outline" style={{ color, borderColor: color, fontSize: 11, whiteSpace: 'nowrap' }}>
      {label}
    </Badge>
  )
}
