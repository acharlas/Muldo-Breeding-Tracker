'use client'

import type { ReactNode } from 'react'
import { BarChart2, Package, LayoutGrid, History, TrendingUp, Settings } from 'lucide-react'
import { useCascadeStore } from '@/stores/cascade'

type View = 'cascade' | 'inventaire' | 'enclos' | 'historique' | 'dashboard' | 'parametres'

const NAV_ITEMS: { id: View; icon: ReactNode; label: string }[] = [
  { id: 'dashboard' as const,  icon: <TrendingUp size={16} />,  label: 'Dashboard' },
  { id: 'cascade' as const,    icon: <BarChart2 size={16} />,   label: 'Cascade' },
  { id: 'inventaire' as const, icon: <Package size={16} />,     label: 'Inventaire' },
  { id: 'enclos' as const,     icon: <LayoutGrid size={16} />,  label: 'Enclos' },
  { id: 'historique' as const, icon: <History size={16} />,     label: 'Historique' },
  { id: 'parametres' as const, icon: <Settings size={16} />,    label: 'Paramètres' },
]

type Props = { activeView: View; onNav: (v: View) => void }

export function Sidebar({ activeView, onNav }: Props) {
  const items = useCascadeStore((s) => s.items)
  const ok = items.filter((i) => i.status === 'ok').length

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

      {/* Progress indicator */}
      <div style={{ margin: '0 12px 12px', padding: '12px 14px',
        background: 'rgba(220,220,230,0.05)', borderRadius: 10,
        border: '1px solid rgba(220,220,230,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: '#6B7280' }}>Progression</span>
          <span style={{ color: '#E5E7EB', fontWeight: 700 }}>
            {ok} <span style={{ color: '#4B5563' }}>/ 120</span>
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(220,220,230,0.1)', borderRadius: 2 }}>
          <div style={{ height: '100%', borderRadius: 2,
            background: ok >= 120 ? '#4ADE80' : '#E5E7EB',
            width: `${Math.min(100, (ok / 120) * 100)}%`,
            transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(220,220,230,0.08)' }}>
        <div style={{ fontSize: 11, color: '#374151' }}>v1.0.0</div>
      </div>
    </aside>
  )
}
