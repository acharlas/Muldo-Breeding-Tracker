'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GenBadge } from '@/components/shared/GenBadge'
import { useCascadeStore } from '@/stores/cascade'
import { useInventoryStore } from '@/stores/inventory'

export function BulkCaptureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cascadeItems = useCascadeStore((s) => s.items)
  const capture = useInventoryStore((s) => s.capture)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState<Record<string, { f: number; m: number }>>({})

  const allSpecies = useMemo(() =>
    cascadeItems.map((i) => ({ name: i.species_name, gen: i.generation })),
    [cascadeItems]
  )

  const filtered = allSpecies.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const confirm = async () => {
    const tasks: Promise<unknown>[] = []
    for (const name of selected) {
      const f = qty[name]?.f ?? 1
      const m = qty[name]?.m ?? 1
      if (f > 0) tasks.push(capture(name, 'F', f))
      if (m > 0) tasks.push(capture(name, 'M', m))
    }
    await Promise.all(tasks)
    setSelected(new Set())
    setQty({})
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>Capture en masse</DialogTitle>
        </DialogHeader>
        <Input placeholder="Rechercher une espèce…" value={search}
          onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((s) => {
            const isSelected = selected.has(s.name)
            return (
              <div key={s.name} onClick={() => toggle(s.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: isSelected ? 'rgba(220,220,230,0.12)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid rgba(220,220,230,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(s.name)}
                  style={{ accentColor: '#E5E7EB', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
                <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                <GenBadge gen={s.gen} />
                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>♀</span>
                    <input type="number" min={0} max={500} defaultValue={1}
                      onChange={(e) => setQty((q) => ({ ...q, [s.name]: { ...q[s.name], f: +e.target.value } }))}
                      style={{ width: 44, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(220,220,230,0.2)', borderRadius: 5,
                        padding: '3px 6px', color: '#E5E7EB', fontSize: 12, textAlign: 'center' }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>♂</span>
                    <input type="number" min={0} max={500} defaultValue={1}
                      onChange={(e) => setQty((q) => ({ ...q, [s.name]: { ...q[s.name], m: +e.target.value } }))}
                      style={{ width: 44, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(220,220,230,0.2)', borderRadius: 5,
                        padding: '3px 6px', color: '#E5E7EB', fontSize: 12, textAlign: 'center' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6B7280', fontSize: 12 }}>
            {selected.size} espèce{selected.size !== 1 ? 's' : ''} sélectionnée{selected.size !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={confirm} disabled={selected.size === 0}>Confirmer la capture</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
