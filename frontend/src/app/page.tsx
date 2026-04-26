'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { CascadeView } from '@/components/cascade/CascadeView'
import { InventaireView } from '@/components/inventaire/InventaireView'
import { EnclosView } from '@/components/enclos/EnclosView'

type View = 'cascade' | 'inventaire' | 'enclos'

export default function DashboardShell() {
  const [activeView, setActiveView] = useState<View>('cascade')

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0C', display: 'flex',
      color: '#E5E7EB', position: 'relative' }}>
      <Sidebar activeView={activeView} onNav={setActiveView} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: 'auto',
        position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <div style={{ padding: '32px 36px', width: '100%', boxSizing: 'border-box' }}>
          {activeView === 'cascade'    && <CascadeView />}
          {activeView === 'inventaire' && <InventaireView />}
          {activeView === 'enclos'     && <EnclosView />}
        </div>
      </main>
    </div>
  )
}
