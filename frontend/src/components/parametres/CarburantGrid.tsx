'use client'

import { computeKxp, bestKxpGlobal, bestKxpPerRow, bestXpKGlobal, bestXpKPerRow, XP_TIER_GAIN, activeTierRate, type CarburantGrid } from '@/stores/parametres'

type Tier = 'extrait' | 'philtre' | 'potion' | 'elixir'
type Size = '1000' | '2000' | '3000' | '4000' | '5000'

const TIERS: Tier[] = ['extrait', 'philtre', 'potion', 'elixir']
const SIZES: Size[] = ['1000', '2000', '3000', '4000', '5000']
const TIER_LABELS: Record<Tier, string> = { extrait: 'Extrait', philtre: 'Philtre', potion: 'Potion', elixir: 'Élixir' }
const SIZE_LABELS: Record<Size, string> = { '1000': 'minuscule', '2000': 'petit', '3000': 'normal', '4000': 'grand', '5000': 'gigantesque' }

function formatBatchTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

type Props = {
  label: string
  grid: CarburantGrid
  selectedTiers: Record<Tier, boolean>
  onChange: (tier: Tier, size: Size, value: number | null) => void
  onTierSelect: (tier: Tier, selected: boolean) => void
  xpMode?: boolean  // when true, uses XP-tier multipliers for cost/highlight
  target?: number   // points to fill (20000 for productive, 5000 for sérénité, totalXP for experience)
}

export function CarburantGrid({ label, grid, selectedTiers, onChange, onTierSelect, xpMode, target }: Props) {
  const globalBest = xpMode ? bestXpKGlobal(grid) : bestKxpGlobal(grid)
  const rowBest = xpMode ? bestXpKPerRow(grid) : bestKxpPerRow(grid)

  // Per-batch time at the ticked tier. All muldos in an enclos lèvent en parallèle, so
  // this is the wall-clock time for one whole batch (not per muldo).
  const rate = activeTierRate(selectedTiers)
  const targetTime = (target && rate > 0) ? target / rate : null

  const cellValue = (tier: Tier, size: Size): number | null => {
    return computeKxp(grid[tier][size], size)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB' }}>{label}</span>
        {targetTime !== null && target !== undefined && (
          <span style={{ fontSize: 11, color: '#60A5FA', fontFamily: 'monospace' }}>
            ≈ {formatBatchTime(targetTime)} pour {target.toLocaleString('fr-FR')} pts
          </span>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 64, textAlign: 'left', color: '#6B7280', padding: '4px 8px' }}>Tier</th>
              {SIZES.map(s => (
                <th key={s} style={{ textAlign: 'center', color: '#6B7280', padding: '4px 8px', minWidth: 80 }}>
                  {SIZE_LABELS[s]}
                </th>
              ))}
              <th style={{ width: 40, textAlign: 'center', color: '#6B7280', padding: '4px 8px' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map(tier => (
              <tr key={tier} style={{ opacity: selectedTiers[tier] ? 1 : 0.6 }}>
                <td style={{ color: selectedTiers[tier] ? '#E5E7EB' : '#9CA3AF', padding: '4px 8px', fontWeight: 500 }}>
                  {TIER_LABELS[tier]}
                  {xpMode && (
                    <div style={{ fontSize: 9, color: '#4B5563', marginTop: 1 }}>
                      {XP_TIER_GAIN[tier] / 10} XP/s
                    </div>
                  )}
                </td>
                {SIZES.map(size => {
                  const prix = grid[tier][size]
                  const kxp = cellValue(tier, size)
                  const isGlobalBest = kxp !== null && globalBest !== null && kxp === globalBest
                  const isRowBest = kxp !== null && rowBest[tier] !== null && kxp === rowBest[tier] && !isGlobalBest
                  const bg = isGlobalBest
                    ? 'rgba(251,191,36,0.15)'
                    : isRowBest
                    ? 'rgba(74,222,128,0.12)'
                    : 'transparent'
                  const border = isGlobalBest
                    ? '1px solid rgba(251,191,36,0.5)'
                    : isRowBest
                    ? '1px solid rgba(74,222,128,0.3)'
                    : '1px solid rgba(220,220,230,0.08)'
                  return (
                    <td key={size} style={{ padding: '3px 6px' }}>
                      <div style={{ background: bg, border, borderRadius: 6, padding: '4px 6px' }}>
                        <input
                          type="number"
                          min={0}
                          placeholder="prix"
                          value={prix ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : parseFloat(e.target.value)
                            onChange(tier, size, v)
                          }}
                          style={{
                            width: '100%', background: 'transparent', border: 'none',
                            outline: 'none', color: '#E5E7EB', fontSize: 11,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        />
                        {kxp !== null && (
                          <div style={{ fontSize: 9, color: isGlobalBest ? '#FCD34D' : isRowBest ? '#4ADE80' : '#4B5563', marginTop: 1 }}>
                            {kxp.toFixed(4)} k/xp
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedTiers[tier]}
                    onChange={(e) => onTierSelect(tier, e.target.checked)}
                    style={{ accentColor: '#60A5FA', cursor: 'pointer', width: 14, height: 14 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
