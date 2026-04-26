'use client'

import { usePlannerStore } from '@/stores/planner'
import { PlannerForm } from './PlannerForm'
import { EnclosCard } from './EnclosCard'
import { ResultsPanel } from './ResultsPanel'
import React from 'react'

export function EnclosView() {
  const { plan, results } = usePlannerStore()

  const totalPairs = plan?.enclos.reduce((a, e) => a + e.pairs.length, 0) ?? 0
  const filledCount = Object.keys(results).length
  const hasPersistedData = plan !== null

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Enclos</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Planifiez vos sessions d'élevage par enclos
        </p>
      </div>

      {hasPersistedData && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: 'rgba(220,220,230,0.08)', border: '1px solid rgba(220,220,230,0.2)',
          fontSize: 13, color: '#9CA3AF' }}>
          Session en cours — {filledCount} résultat{filledCount !== 1 ? 's' : ''} saisi{filledCount !== 1 ? 's' : ''} sur {totalPairs}.
          Continuez ci-dessous ou régénérez un plan.
        </div>
      )}

      <PlannerForm />

      {plan && (
        <>
          {/* Summary bar */}
          <div style={{ display: 'flex', alignItems: 'center',
            background: 'rgba(220,220,230,0.07)', border: '1px solid rgba(220,220,230,0.15)',
            borderRadius: 12, padding: '16px 28px', marginBottom: 20 }}>
            {[
              { label: 'Enclos', val: plan.enclos.length },
              { label: 'Paires', val: plan.summary.total_pairs },
              { label: 'Succès estimés', val: plan.summary.estimated_successes },
              { label: 'Restantes après', val: plan.summary.remaining_after },
            ].map(({ label, val }, i, arr) => (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column',
                  gap: 4, alignItems: 'center', flex: 1 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#E5E7EB',
                    fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 1, height: 40, background: 'rgba(220,220,230,0.15)' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Enclos grid — 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {plan.enclos.map((enclos) => (
              <EnclosCard key={enclos.enclos_number} enclos={enclos} />
            ))}
          </div>

          <ResultsPanel />
        </>
      )}

      {!plan && (
        <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex',
          flexDirection: 'column', alignItems: 'center', color: '#6B7280' }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div style={{ fontSize: 15 }}>Configurez vos enclos et lancez la planification</div>
        </div>
      )}
    </div>
  )
}
