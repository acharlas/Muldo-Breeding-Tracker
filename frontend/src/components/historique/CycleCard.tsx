'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CycleHistory } from '@/types'

const PINK = '#F472B6'
const BLUE = '#60A5FA'
const MUTED = '#6B7280'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function SexSymbol({ sex }: { sex: string }) {
  if (sex === 'F') return <span style={{ color: PINK }}>♀</span>
  if (sex === 'M') return <span style={{ color: BLUE }}>♂</span>
  return <span style={{ color: MUTED }}>?</span>
}

function ResultBadge({ success }: { success: boolean }) {
  return success ? (
    <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
      background: 'rgba(74,222,128,0.15)', color: '#4ADE80',
      border: '1px solid rgba(74,222,128,0.3)' }}>Succès</span>
  ) : (
    <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
      background: 'rgba(248,113,113,0.15)', color: '#F87171',
      border: '1px solid rgba(248,113,113,0.3)' }}>Échec</span>
  )
}

export function CycleCard({ cycle, defaultOpen }: { cycle: CycleHistory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const { summary } = cycle

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.1)', borderRadius: 12, overflow: 'hidden' }}>

      <CollapsibleTrigger
        onMouseDown={(e) => e.preventDefault()}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'rgba(220,220,230,0.05)',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: open ? '1px solid rgba(220,220,230,0.08)' : 'none',
          cursor: 'pointer', textAlign: 'left',
        }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#E5E7EB' }}>
          Cycle {cycle.cycle_number}
        </span>
        <span style={{ fontSize: 13, color: MUTED }}>{formatDate(cycle.date)}</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {summary.successes > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(74,222,128,0.12)', color: '#4ADE80',
              border: '1px solid rgba(74,222,128,0.25)' }}>
              ✓ {summary.successes} succès
            </span>
          )}
          {summary.fails > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(248,113,113,0.12)', color: '#F87171',
              border: '1px solid rgba(248,113,113,0.25)' }}>
              ✗ {summary.fails} échec{summary.fails > 1 ? 's' : ''}
            </span>
          )}
          {summary.clones > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(167,139,250,0.12)', color: '#A78BFA',
              border: '1px solid rgba(167,139,250,0.25)' }}>
              ⟳ {summary.clones} clone{summary.clones > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <ChevronRight size={14} style={{ color: MUTED,
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <TableHeader>
              <TableRow style={{ fontSize: 12, color: '#374151', letterSpacing: '0.08em' }}>
                <TableHead><span style={{ color: PINK }}>♀</span> Espèce</TableHead>
                <TableHead><span style={{ color: BLUE }}>♂</span> Espèce</TableHead>
                <TableHead>Enfant</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycle.pairs.map((pair, i) => (
                <TableRow key={i} style={{ fontSize: 14 }}>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.parent_f_species === 'Inconnu' ? MUTED : '#E5E7EB' }}>
                    {pair.parent_f_species}
                  </TableCell>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.parent_m_species === 'Inconnu' ? MUTED : '#E5E7EB' }}>
                    {pair.parent_m_species}
                  </TableCell>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.child_species === 'Inconnu' ? MUTED : '#D1D5DB' }}>
                    {pair.child_species}
                  </TableCell>
                  <TableCell><SexSymbol sex={pair.child_sex} /></TableCell>
                  <TableCell><ResultBadge success={pair.success} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {cycle.clones.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8 }}>
                Clonages automatiques
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cycle.clones.map((c, i) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 13,
                    background: 'rgba(167,139,250,0.1)', color: '#A78BFA',
                    border: '1px solid rgba(167,139,250,0.2)' }}>
                    {c.species_name} · {c.sex === 'F' ? '♀' : c.sex === 'M' ? '♂' : '?'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
