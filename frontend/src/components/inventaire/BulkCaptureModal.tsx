'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GenBadge } from '@/components/shared/GenBadge'
import { useCascadeStore } from '@/stores/cascade'
import { useInventoryStore } from '@/stores/inventory'

const PINK = '#F472B6'
const BLUE = '#60A5FA'

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
      if (next.has(name)) {
        next.delete(name)
        setQty((q) => { const n = { ...q }; delete n[name]; return n })
      } else {
        next.add(name)
      }
      return next
    })
  }

  const setF = (name: string, val: string) =>
    setQty((q) => ({ ...q, [name]: { f: Math.max(0, Math.min(500, +val || 0)), m: q[name]?.m ?? 0 } }))

  const setM = (name: string, val: string) =>
    setQty((q) => ({ ...q, [name]: { f: q[name]?.f ?? 0, m: Math.max(0, Math.min(500, +val || 0)) } }))

  const confirm = async () => {
    const tasks: Promise<unknown>[] = []
    for (const name of selected) {
      const f = qty[name]?.f ?? 0
      const m = qty[name]?.m ?? 0
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
      <DialogContent style={{ maxWidth: 820, width: '92vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 17 }}>Capture en masse</DialogTitle>
        </DialogHeader>

        <Input placeholder="Rechercher une espèce…" value={search}
          onChange={(e) => setSearch(e.target.value)} autoFocus />

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Column header */}
          <div style={{ display: 'grid',
            gridTemplateColumns: '24px 1fr 52px 100px 100px',
            gap: 8, padding: '4px 12px',
            fontSize: 11, color: '#6B7280', letterSpacing: '0.06em', userSelect: 'none' }}>
            <span />
            <span>Espèce</span>
            <span>Gen</span>
            <span style={{ color: PINK, textAlign: 'center' }}>♀ Femelles</span>
            <span style={{ color: BLUE, textAlign: 'center' }}>♂ Mâles</span>
          </div>

          {filtered.map((s) => {
            const isSelected = selected.has(s.name)
            return (
              <div key={s.name}
                onClick={() => toggle(s.name)}
                style={{ display: 'grid',
                  gridTemplateColumns: '24px 1fr 52px 100px 100px',
                  alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: isSelected ? 'rgba(220,220,230,0.1)' : 'rgba(255,255,255,0.025)',
                  border: isSelected
                    ? '1px solid rgba(220,220,230,0.28)'
                    : '1px solid rgba(255,255,255,0.05)' }}>

                <input type="checkbox" checked={isSelected} readOnly
                  style={{ accentColor: '#E5E7EB', cursor: 'pointer', width: 16, height: 16 }}
                  onClick={(e) => e.stopPropagation()} onChange={() => toggle(s.name)} />

                <span style={{ fontSize: 14, color: '#E5E7EB',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>

                <GenBadge gen={s.gen} />

                {/* ♀ count */}
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number" min={0} max={500}
                    value={isSelected ? (qty[s.name]?.f ?? '') : ''}
                    disabled={!isSelected}
                    placeholder="0"
                    onChange={(e) => setF(s.name, e.target.value)}
                    style={{ width: '100%', background: isSelected ? 'rgba(244,114,182,0.08)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(244,114,182,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 6, padding: '5px 8px', color: PINK, fontSize: 13,
                      textAlign: 'center', outline: 'none',
                      cursor: isSelected ? 'text' : 'default' }}
                  />
                </div>

                {/* ♂ count */}
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number" min={0} max={500}
                    value={isSelected ? (qty[s.name]?.m ?? '') : ''}
                    disabled={!isSelected}
                    placeholder="0"
                    onChange={(e) => setM(s.name, e.target.value)}
                    style={{ width: '100%', background: isSelected ? 'rgba(96,165,250,0.08)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 6, padding: '5px 8px', color: BLUE, fontSize: 13,
                      textAlign: 'center', outline: 'none',
                      cursor: isSelected ? 'text' : 'default' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid rgba(220,220,230,0.1)', paddingTop: 12 }}>
          <span style={{ color: '#6B7280', fontSize: 13 }}>
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
