'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { CascadeView } from '@/components/cascade/CascadeView'
import { InventaireView } from '@/components/inventaire/InventaireView'
import { EnclosView } from '@/components/enclos/EnclosView'
import { HistoriqueView } from '@/components/historique/HistoriqueView'

type View = 'cascade' | 'inventaire' | 'enclos' | 'historique' | 'dashboard' | 'parametres'

// Temporarily until DashboardView and ParametresView are created in later tasks
const DashboardView = () => <div style={{ padding: 32, color: '#9CA3AF' }}>Dashboard (coming soon)</div>
const ParametresView = () => <div style={{ padding: 32, color: '#9CA3AF' }}>Paramètres (coming soon)</div>

export default function DashboardShell() {
  const [activeView, setActiveView] = useState<View>('cascade')

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0C', display: 'flex',
      color: '#E5E7EB', position: 'relative' }}>
      <Sidebar activeView={activeView} onNav={setActiveView} />
      <main style={{ marginLeft: 220, flex: 1, overflowY: 'auto',
        position: 'relative', zIndex: 1, minHeight: '100vh', overflowAnchor: 'auto' }}>
        <div style={{ padding: '32px 36px', width: '100%', boxSizing: 'border-box' }}>
          {activeView === 'cascade'    && <CascadeView />}
          {activeView === 'inventaire' && <InventaireView />}
          {activeView === 'enclos'     && <EnclosView />}
          {activeView === 'historique' && <HistoriqueView />}
          {activeView === 'dashboard'  && <DashboardView />}
          {activeView === 'parametres' && <ParametresView />}
        </div>
      </main>
    </div>
  )
}
