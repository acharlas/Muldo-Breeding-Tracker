'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
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
  const remove  = useInventoryStore((s) => s.remove)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [sex, setSex] = useState<'F' | 'M'>('F')
  const [count, setCount] = useState(1)

  const confirm = async () => {
    try {
      if (mode === 'add') await capture(speciesName, sex, count)
      else await remove(speciesName, sex, count)
      setOpen(false)
      setCount(1)
    } catch (err) {
      console.error('Action failed:', err)
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
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setMode('add'); setCount(1) } }}>
          <PopoverTrigger style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: '1px solid rgba(220,220,230,0.25)',
            color: '#E5E7EB', cursor: 'pointer' }}>
            <Plus size={12} /> Gérer
          </PopoverTrigger>
          <PopoverContent style={{ width: 210, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setMode('add')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 4, padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: mode === 'add' ? 'rgba(74,222,128,0.15)' : 'transparent',
                  borderColor: mode === 'add' ? 'rgba(74,222,128,0.4)' : 'rgba(220,220,230,0.2)',
                  color: mode === 'add' ? '#4ADE80' : '#6B7280' }}>
                <Plus size={11} /> Ajouter
              </button>
              <button onClick={() => setMode('remove')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 4, padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: mode === 'remove' ? 'rgba(248,113,113,0.15)' : 'transparent',
                  borderColor: mode === 'remove' ? 'rgba(248,113,113,0.4)' : 'rgba(220,220,230,0.2)',
                  color: mode === 'remove' ? '#F87171' : '#6B7280' }}>
                <Minus size={11} /> Retirer
              </button>
            </div>

            {/* Sex toggle */}
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

            <Button size="sm"
              onClick={confirm}
              style={mode === 'remove' ? {
                background: 'rgba(248,113,113,0.2)', color: '#F87171',
                border: '1px solid rgba(248,113,113,0.4)'
              } : {}}>
              {mode === 'add' ? 'Confirmer' : 'Retirer'}
            </Button>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  )
}
