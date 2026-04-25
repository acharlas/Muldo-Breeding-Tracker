'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'

type View = 'cascade' | 'inventaire' | 'enclos'

export default function DashboardShell() {
  const [activeView, setActiveView] = useState<View>('cascade')

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0C', display: 'flex',
      color: '#E5E7EB', position: 'relative' }}>
      <Sidebar activeView={activeView} onNav={setActiveView} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: 'auto',
        position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <div style={{ padding: '32px 36px', maxWidth: 1320 }}>
          {activeView === 'cascade'    && <div style={{ color: '#6B7280' }}>Cascade view — coming soon</div>}
          {activeView === 'inventaire' && <div style={{ color: '#6B7280' }}>Inventaire view — coming soon</div>}
          {activeView === 'enclos'     && <div style={{ color: '#6B7280' }}>Enclos view — coming soon</div>}
        </div>
      </main>
    </div>
  )
}
