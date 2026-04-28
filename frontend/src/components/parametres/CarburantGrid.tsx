'use client'

import { computeKxp, bestKxpGlobal, bestKxpPerRow, type CarburantGrid } from '@/stores/parametres'

type Tier = 'extrait' | 'philtre' | 'potion' | 'elixir'
type Size = '1000' | '2000' | '3000' | '4000' | '5000'

const TIERS: Tier[] = ['extrait', 'philtre', 'potion', 'elixir']
const SIZES: Size[] = ['1000', '2000', '3000', '4000', '5000']
const TIER_LABELS: Record<Tier, string> = { extrait: 'Extrait', philtre: 'Philtre', potion: 'Potion', elixir: 'Élixir' }
const SIZE_LABELS: Record<Size, string> = { '1000': 'minuscule', '2000': 'petit', '3000': 'normal', '4000': 'grand', '5000': 'gigantesque' }

type Props = {
  label: string
  grid: CarburantGrid
  selectedTiers: Record<Tier, boolean>
  onChange: (tier: Tier, size: Size, value: number | null) => void
  onTierSelect: (tier: Tier, selected: boolean) => void
}

export function CarburantGrid({ label, grid, selectedTiers, onChange, onTierSelect }: Props) {
  const globalBest = bestKxpGlobal(grid)
  const rowBest = bestKxpPerRow(grid)

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', marginBottom: 10 }}>{label}</div>
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
                <td style={{ color: selectedTiers[tier] ? '#E5E7EB' : '#9CA3AF', padding: '4px 8px', fontWeight: 500 }}>{TIER_LABELS[tier]}</td>
                {SIZES.map(size => {
                  const prix = grid[tier][size]
                  const kxp = computeKxp(prix, size)
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
