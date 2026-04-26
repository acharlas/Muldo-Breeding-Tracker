'use client'

import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { GenBadge } from '@/components/shared/GenBadge'
import { useInventoryStore } from '@/stores/inventory'
import type { InventoryEntry } from '@/types'

type Props = {
  speciesName: string
  generation: number
  entry: InventoryEntry
}

type Draft = { fertile_f: number; fertile_m: number; sterile_f: number; sterile_m: number }

const PINK = '#F472B6'
const BLUE  = '#60A5FA'

function CountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={999}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(999, +e.target.value || 0)))}
      style={{ width: 56, textAlign: 'center', background: 'rgba(220,220,230,0.08)',
        border: '1px solid rgba(220,220,230,0.3)', borderRadius: 6,
        padding: '4px 6px', color: '#E5E7EB', fontSize: 13, outline: 'none' }}
    />
  )
}

function SterileCell({ count }: { count: number }) {
  const clones = Math.floor(count / 2)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: count > 0 ? '#D1D5DB' : '#6B7280' }}>
      {count}
      {clones > 0 && (
        <span title={`${clones} clone${clones > 1 ? 's' : ''} prêt${clones > 1 ? 's' : ''}`}
          style={{ fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
            border: '1px solid rgba(167,139,250,0.35)', cursor: 'default' }}>
          ⟳{clones}
        </span>
      )}
    </span>
  )
}

export function InventaireSpeciesRow({ speciesName, generation, entry }: Props) {
  const capture = useInventoryStore((s) => s.capture)
  const remove  = useInventoryStore((s) => s.remove)

  const safeEntry: InventoryEntry = entry ?? { fertile_f: 0, fertile_m: 0, sterile_f: 0, sterile_m: 0 }
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>({ ...safeEntry })
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setDraft({ ...safeEntry })
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const confirm = async () => {
    setSaving(true)
    try {
      const ops: Promise<void>[] = []

      const diff = (newVal: number, oldVal: number, sex: 'F' | 'M', fertile: boolean) => {
        const d = newVal - oldVal
        if (d > 0) ops.push(capture(speciesName, sex, d, fertile))
        if (d < 0) ops.push(remove(speciesName, sex, -d, fertile))
      }

      diff(draft.fertile_f, safeEntry.fertile_f, 'F', true)
      diff(draft.fertile_m, safeEntry.fertile_m, 'M', true)
      diff(draft.sterile_f, safeEntry.sterile_f, 'F', false)
      diff(draft.sterile_m, safeEntry.sterile_m, 'M', false)

      await Promise.all(ops)
      setEditing(false)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Draft) => (v: number) => setDraft((d) => ({ ...d, [key]: v }))

  if (editing) {
    return (
      <TableRow style={{ background: 'rgba(220,220,230,0.04)', fontSize: 15 }}>
        <TableCell className="font-medium">{speciesName}</TableCell>
        <TableCell><GenBadge gen={generation} /></TableCell>
        <TableCell className="text-center">
          <CountInput value={draft.fertile_f} onChange={set('fertile_f')} />
        </TableCell>
        <TableCell className="text-center">
          <CountInput value={draft.fertile_m} onChange={set('fertile_m')} />
        </TableCell>
        <TableCell className="text-center">
          <CountInput value={draft.sterile_f} onChange={set('sterile_f')} />
        </TableCell>
        <TableCell className="text-center">
          <CountInput value={draft.sterile_m} onChange={set('sterile_m')} />
        </TableCell>
        <TableCell>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={confirm} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
                color: '#4ADE80' }}>
              <Check size={12} /> {saving ? '…' : 'OK'}
            </button>
            <button onClick={cancel} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center',
                padding: '4px 8px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', background: 'transparent',
                border: '1px solid rgba(220,220,230,0.2)', color: '#6B7280' }}>
              <X size={12} />
            </button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow style={{ fontSize: 15 }}>
      <TableCell className="font-medium">{speciesName}</TableCell>
      <TableCell><GenBadge gen={generation} /></TableCell>
      <TableCell className="text-center" style={{ color: PINK }}>{safeEntry.fertile_f}</TableCell>
      <TableCell className="text-center" style={{ color: BLUE }}>{safeEntry.fertile_m}</TableCell>
      <TableCell className="text-center"><SterileCell count={safeEntry.sterile_f} /></TableCell>
      <TableCell className="text-center"><SterileCell count={safeEntry.sterile_m} /></TableCell>
      <TableCell>
        <button onClick={startEdit}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: '1px solid rgba(220,220,230,0.25)',
            color: '#E5E7EB', cursor: 'pointer' }}>
          <Pencil size={11} /> Gérer
        </button>
      </TableCell>
    </TableRow>
  )
}
