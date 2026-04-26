'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlannerStore } from '@/stores/planner'
import { useCascadeStore } from '@/stores/cascade'
import { PlannerForm } from './PlannerForm'
import type { BatchBreedError, PairResult, PlannedPair } from '@/types'

const PINK = '#F472B6'
const BLUE  = '#60A5FA'

function PairRow({
  pair, index, enclosNum, allSpecies,
}: { pair: PlannedPair; index: number; enclosNum: number; allSpecies: string[] }) {
  const { results, setResult } = usePlannerStore()
  const key = `${enclosNum}-${index}`
  const r = results[key] as PairResult | undefined

  const setSuccess = (success: boolean) =>
    setResult(key, {
      success,
      child_species_name: r?.child_species_name ?? pair.target_child_species,
      child_sex: r?.child_sex ?? 'F',
    })

  const setChildSpecies = (v: string | null) =>
    r && v && setResult(key, { ...r, child_species_name: v })

  const setChildSex = (sex: 'F' | 'M') =>
    r && setResult(key, { ...r, child_sex: sex })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 16px', borderRadius: 10,
      background: r !== undefined ? 'rgba(220,220,230,0.04)' : 'rgba(255,255,255,0.02)',
      border: r !== undefined
        ? `1px solid ${r.success ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`
        : '1px solid rgba(255,255,255,0.05)' }}>

      {/* Pair info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 700, width: 22 }}>
          {index + 1}
        </span>
        <span style={{ fontSize: 13, color: PINK, fontWeight: 600 }}>♀</span>
        <span style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 500 }}>
          {pair.parent_f.species_name}
        </span>
        <span style={{ color: '#374151', fontWeight: 700 }}>×</span>
        <span style={{ fontSize: 13, color: BLUE, fontWeight: 600 }}>♂</span>
        <span style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 500 }}>
          {pair.parent_m.species_name}
        </span>
        <div style={{ flex: 1 }} />
        <Target size={13} style={{ color: '#9CA3AF' }} />
        <span style={{ fontSize: 13, color: '#D1D5DB' }}>{pair.target_child_species}</span>
      </div>

      {/* Result inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingLeft: 32 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="sm"
            variant={r?.success === true ? 'default' : 'outline'}
            onClick={() => setSuccess(true)}
            style={{ fontSize: 12, minWidth: 72,
              ...(r?.success === true ? { background: 'rgba(74,222,128,0.2)', color: '#4ADE80',
                border: '1px solid rgba(74,222,128,0.4)' } : {}) }}>
            Succès
          </Button>
          <Button size="sm"
            variant={r?.success === false ? 'default' : 'outline'}
            onClick={() => setSuccess(false)}
            style={{ fontSize: 12, minWidth: 72,
              ...(r?.success === false ? { background: 'rgba(248,113,113,0.2)', color: '#F87171',
                border: '1px solid rgba(248,113,113,0.4)' } : {}) }}>
            Échec
          </Button>
        </div>

        {r !== undefined && (
          <>
            <Select value={r.child_species_name} onValueChange={setChildSpecies}>
              <SelectTrigger style={{ width: 190, fontSize: 12 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                {allSpecies.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div style={{ display: 'flex', gap: 4 }}>
              {(['F', 'M'] as const).map((s) => (
                <Button key={s} size="sm"
                  variant={r.child_sex === s ? 'default' : 'outline'}
                  onClick={() => setChildSex(s)}
                  style={{ fontSize: 13, minWidth: 36,
                    ...(r.child_sex === s
                      ? s === 'F'
                        ? { background: 'rgba(244,114,182,0.2)', color: PINK, border: '1px solid rgba(244,114,182,0.4)' }
                        : { background: 'rgba(96,165,250,0.25)', color: '#FFFFFF', border: '1px solid rgba(96,165,250,0.5)' }
                      : {}) }}>
                  {s === 'F' ? '♀' : '♂'}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function EnclosView() {
  const { plan, results, submitBatch, clearPlan } = usePlannerStore()
  const cascadeItems = useCascadeStore((s) => s.items)
  const allSpecies = useMemo(() => cascadeItems.map((i) => i.species_name), [cascadeItems])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<BatchBreedError[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)

  const totalPairs = plan?.enclos.reduce((a, e) => a + e.pairs.length, 0) ?? 0
  const filledCount = Object.keys(results).length
  const allFilled = filledCount === totalPairs && totalPairs > 0
  const hasPersistedData = plan !== null

  // Clamp index when plan changes
  const safeIdx = plan ? Math.min(currentIdx, plan.enclos.length - 1) : 0
  const currentEnclos = plan?.enclos[safeIdx]

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitErrors([])
    setNetworkError(null)
    try {
      const result = await submitBatch()
      if (result.errors.length > 0) setSubmitErrors(result.errors)
    } catch (e) {
      setNetworkError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Enclos</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Planifiez vos sessions d'élevage par enclos
        </p>
      </div>

      {hasPersistedData && (
        <div style={{ padding: '10px 16px', borderRadius: 8,
          background: 'rgba(220,220,230,0.07)', border: '1px solid rgba(220,220,230,0.18)',
          fontSize: 13, color: '#9CA3AF' }}>
          Session en cours — {filledCount} résultat{filledCount !== 1 ? 's' : ''} saisi{filledCount !== 1 ? 's' : ''} sur {totalPairs}.
          Continuez ci-dessous ou régénérez un plan.
        </div>
      )}

      <PlannerForm />

      {plan && currentEnclos && (
        <>
          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Enclos', val: plan.enclos.length },
              { label: 'Paires', val: plan.summary.total_pairs },
              { label: 'Succès estimés', val: plan.summary.estimated_successes },
              { label: 'Restantes après', val: plan.summary.remaining_after },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8,
                background: 'rgba(220,220,230,0.06)', border: '1px solid rgba(220,220,230,0.13)' }}>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#E5E7EB',
                  fontVariantNumeric: 'tabular-nums' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Enclos tabs + navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button variant="ghost" size="sm"
              disabled={safeIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}>
              <ChevronLeft size={16} />
            </Button>
            <div style={{ display: 'flex', gap: 4 }}>
              {plan.enclos.map((e, i) => {
                const enclosFilled = e.pairs.every((_, pIdx) =>
                  results[`${e.enclos_number}-${pIdx}`] !== undefined
                )
                return (
                  <button key={e.enclos_number}
                    onClick={() => setCurrentIdx(i)}
                    style={{ width: 36, height: 36, borderRadius: 8, fontWeight: 700,
                      fontSize: 14, cursor: 'pointer',
                      background: i === safeIdx
                        ? 'rgba(96,165,250,0.25)'
                        : enclosFilled
                          ? 'rgba(74,222,128,0.15)'
                          : 'rgba(255,255,255,0.05)',
                      border: i === safeIdx
                        ? '1px solid rgba(96,165,250,0.5)'
                        : enclosFilled
                          ? '1px solid rgba(74,222,128,0.3)'
                          : '1px solid rgba(255,255,255,0.1)',
                      color: i === safeIdx ? BLUE : enclosFilled ? '#4ADE80' : '#9CA3AF' }}>
                    {e.enclos_number}
                  </button>
                )
              })}
            </div>
            <Button variant="ghost" size="sm"
              disabled={safeIdx === plan.enclos.length - 1}
              onClick={() => setCurrentIdx((i) => Math.min(plan.enclos.length - 1, i + 1))}>
              <ChevronRight size={16} />
            </Button>
            <span style={{ fontSize: 12, color: '#4B5563', marginLeft: 4 }}>
              Enclos {currentEnclos.enclos_number} / {plan.enclos.length}
            </span>
          </div>

          {/* Current enclos card */}
          <Card style={{ background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(220,220,230,0.13)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid rgba(220,220,230,0.08)',
              background: 'rgba(220,220,230,0.05)' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#E5E7EB' }}>
                Enclos {currentEnclos.enclos_number}
              </span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {currentEnclos.pairs.filter((_, i) =>
                  results[`${currentEnclos.enclos_number}-${i}`] !== undefined).length
                } / {currentEnclos.pairs.length} paires saisies
              </span>
            </div>
            <CardContent style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentEnclos.pairs.map((pair, pairIdx) => (
                <PairRow
                  key={`${pair.parent_f.id}-${pair.parent_m.id}`}
                  pair={pair}
                  index={pairIdx}
                  enclosNum={currentEnclos.enclos_number}
                  allSpecies={allSpecies}
                />
              ))}
            </CardContent>
          </Card>

          {/* Errors */}
          {(networkError || submitErrors.length > 0) && (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
              {networkError && <div style={{ fontSize: 13, color: '#F87171' }}>{networkError}</div>}
              {submitErrors.map((e) => (
                <div key={e.index} style={{ fontSize: 12, color: '#FCA5A5' }}>
                  Paire {e.index + 1} : {e.detail}
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={!allFilled || submitting}
            style={{ alignSelf: 'flex-end', minWidth: 280 }}>
            {submitting
              ? 'Enregistrement…'
              : `Enregistrer la session (${filledCount} / ${totalPairs} saisis)`}
          </Button>
        </>
      )}

      {!plan && (
        <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex',
          flexDirection: 'column', alignItems: 'center', color: '#6B7280' }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div style={{ fontSize: 15 }}>Configurez vos enclos et lancez la planification</div>
        </div>
      )}
    </div>
  )
}
