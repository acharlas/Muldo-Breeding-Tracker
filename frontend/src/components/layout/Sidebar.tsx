'use client'

import type { ReactNode } from 'react'
import { BarChart2, Package, LayoutGrid, History } from 'lucide-react'
import { useCascadeStore } from '@/stores/cascade'
import { useParametresStore, successPct } from '@/stores/parametres'

type View = 'cascade' | 'inventaire' | 'enclos' | 'historique'

const NAV_ITEMS: { id: View; icon: ReactNode; label: string }[] = [
  { id: 'cascade',    icon: <BarChart2 size={16} />,  label: 'Cascade' },
  { id: 'inventaire', icon: <Package size={16} />,    label: 'Inventaire' },
  { id: 'enclos',     icon: <LayoutGrid size={16} />, label: 'Enclos' },
  { id: 'historique', icon: <History size={16} />,    label: 'Historique' },
]

type Props = { activeView: View; onNav: (v: View) => void }

export function Sidebar({ activeView, onNav }: Props) {
  const items = useCascadeStore((s) => s.items)
  const fetch = useCascadeStore((s) => s.fetch)
  const { baseLevel, setBaseLevel, optimakina, setOptimakina } = useParametresStore()

  const changeLevel = (delta: number) => {
    const next = Math.max(1, Math.min(200, baseLevel + delta))
    setBaseLevel(next)
    fetch()
  }
  const ok       = items.filter((i) => i.status === 'ok').length
  const en_cours = items.filter((i) => i.status === 'en_cours').length
  const a_faire  = items.filter((i) => i.status === 'a_faire').length

  return (
    <aside style={{
      width: 220, minWidth: 220, position: 'fixed', left: 0, top: 0,
      height: '100vh', zIndex: 100, display: 'flex', flexDirection: 'column',
      background: 'rgba(10,10,12,0.98)',
      borderRight: '1px solid rgba(220,220,230,0.12)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '24px 20px 20px', borderBottom: '1px solid rgba(220,220,230,0.1)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #E5E7EB, #1C1C22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff',
          boxShadow: '0 0 16px rgba(220,220,230,0.3)' }}>M</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.2 }}>Muldo</div>
          <div style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Breeding Tracker
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, color: '#374151', letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '0 8px 10px' }}>Navigation</div>
        {NAV_ITEMS.map(({ id, icon, label }) => {
          const active = activeView === id
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
              textAlign: 'left', fontSize: 14, fontWeight: 500, position: 'relative',
              background: active ? 'rgba(220,220,230,0.12)' : 'transparent',
              color: active ? '#E5E7EB' : '#6B7280',
            }}>
              {icon}
              <span style={{ flex: 1 }}>{label}</span>
              {active && <div style={{ position: 'absolute', right: 0, width: 3,
                height: 16, borderRadius: 2, background: '#E5E7EB' }} />}
            </button>
          )
        })}
      </nav>

      {/* Level setting */}
      <div style={{ margin: '0 12px 10px', padding: '12px 14px',
        background: 'rgba(220,220,230,0.05)', borderRadius: 10,
        border: '1px solid rgba(220,220,230,0.1)' }}>
        <div style={{ fontSize: 10, color: '#374151', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10 }}>Niveau parents</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => changeLevel(-1)} disabled={baseLevel <= 1}
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(220,220,230,0.2)',
              background: 'transparent', color: baseLevel <= 1 ? '#374151' : '#9CA3AF',
              cursor: baseLevel <= 1 ? 'default' : 'pointer', fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <input
            type="number" min={1} max={200} value={baseLevel}
            onChange={(e) => {
              const v = Math.max(1, Math.min(200, parseInt(e.target.value) || 1))
              setBaseLevel(v)
              fetch()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700,
              color: '#E5E7EB', fontVariantNumeric: 'tabular-nums',
              background: 'transparent', border: 'none', outline: 'none',
              width: 0, minWidth: 0 }} />
          <button onClick={() => changeLevel(+1)}
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(220,220,230,0.2)',
              background: 'transparent', color: '#9CA3AF',
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: 600,
          color: successPct(baseLevel, optimakina) >= 60 ? '#4ADE80' : successPct(baseLevel, optimakina) >= 45 ? '#FB923C' : '#9CA3AF' }}>
          {successPct(baseLevel, optimakina)}% succès
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          cursor: 'pointer', fontSize: 11, color: optimakina ? '#A78BFA' : '#6B7280' }}>
          <input
            type="checkbox"
            checked={optimakina}
            onChange={(e) => { setOptimakina(e.target.checked); fetch() }}
            style={{ accentColor: '#A78BFA', cursor: 'pointer' }}
          />
          Optimakina (+10%)
        </label>
      </div>

      {/* Quick stats */}
      <div style={{ margin: '0 12px 12px', padding: 14,
        background: 'rgba(220,220,230,0.05)', borderRadius: 10,
        border: '1px solid rgba(220,220,230,0.1)', display: 'flex',
        flexDirection: 'column', gap: 8 }}>
        {[
          { dot: '#E5E7EB', label: 'Terminées', val: ok },
          { dot: '#9CA3AF', label: 'En cours',  val: en_cours },
          { dot: '#374151', label: 'À faire',   val: a_faire },
        ].map(({ dot, label, val }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%',
              background: dot, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ flex: 1, color: '#6B7280' }}>{label}</span>
            <span style={{ color: '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(220,220,230,0.08)' }}>
        <div style={{ fontSize: 11, color: '#374151' }}>v1.0.0</div>
      </div>
    </aside>
  )
}
