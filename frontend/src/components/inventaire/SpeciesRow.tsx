'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { useInventoryStore } from '@/stores/inventory'
import type { InventoryEntry } from '@/types'

type Props = {
  speciesName: string
  generation: number
  entry: InventoryEntry
}

export function InventaireSpeciesRow({ speciesName, generation, entry }: Props) {
  const capture = useInventoryStore((s) => s.capture)
  const [open, setOpen] = useState(false)
  const [sex, setSex] = useState<'F' | 'M'>('F')
  const [count, setCount] = useState(1)

  const confirm = async () => {
    try {
      await capture(speciesName, sex, count)
      setOpen(false)
      setCount(1)
    } catch (err) {
      console.error('Capture failed:', err)
    }
  }

  const safeEntry: InventoryEntry = entry ?? { fertile_f: 0, fertile_m: 0, sterile_f: 0, sterile_m: 0 }

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{speciesName}</TableCell>
      <TableCell><GenBadge gen={generation} /></TableCell>
      <TableCell className="text-center" style={{ color: '#D1D5DB' }}>{safeEntry.fertile_f}</TableCell>
      <TableCell className="text-center" style={{ color: '#9CA3AF' }}>{safeEntry.fertile_m}</TableCell>
      <TableCell className="text-center text-muted-foreground">{safeEntry.sterile_f}</TableCell>
      <TableCell className="text-center text-muted-foreground">{safeEntry.sterile_m}</TableCell>
      <TableCell>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: '1px solid rgba(220,220,230,0.25)',
            color: '#E5E7EB', cursor: 'pointer' }}>
            <Plus size={12} /> Capturer
          </PopoverTrigger>
          <PopoverContent style={{ width: 200, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['F', 'M'] as const).map((s) => (
                <Button key={s} size="sm" variant={sex === s ? 'default' : 'outline'}
                  onClick={() => setSex(s)} style={{ flex: 1 }}>
                  {s === 'F' ? '♀' : '♂'}
                </Button>
              ))}
            </div>
            <Input type="number" min={1} max={500} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, +e.target.value)))} />
            <Button size="sm" onClick={confirm}>Confirmer</Button>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  )
}
