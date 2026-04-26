'use client'

import { useEffect } from 'react'
import { History } from 'lucide-react'
import { useHistoryStore } from '@/stores/history'
import { CycleCard } from './CycleCard'

export function HistoriqueView() {
  const { cycles, loading, error, fetch } = useHistoryStore()

  useEffect(() => {
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Historique</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Historique de vos sessions d'élevage
        </p>
      </div>

      {loading && (
        <div style={{ color: '#6B7280', textAlign: 'center', padding: 60 }}>Chargement…</div>
      )}

      {error && (
        <div style={{ padding: 14, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
          fontSize: 13, color: '#F87171' }}>
          {error}
        </div>
      )}

      {!loading && !error && cycles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#6B7280' }}>
          <History size={48} strokeWidth={1.5} />
          <div style={{ fontSize: 15 }}>Aucune session enregistrée</div>
        </div>
      )}

      {!loading && !error && cycles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cycles.map((cycle, i) => (
            <CycleCard key={cycle.cycle_number} cycle={cycle} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
