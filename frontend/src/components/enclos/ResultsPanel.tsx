'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlannerStore } from '@/stores/planner'
import { useCascadeStore } from '@/stores/cascade'
import type { BatchBreedError, PairResult } from '@/types'

export function ResultsPanel() {
  const { plan, results, setResult, submitBatch } = usePlannerStore()
  const allSpecies = useCascadeStore((s) => s.items.map((i) => i.species_name))
  const [errors, setErrors] = useState<BatchBreedError[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!plan) return null

  const allPairs = plan.enclos.flatMap((e) =>
    e.pairs.map((pair, pairIdx) => ({ enclosNum: e.enclos_number, pairIdx, pair }))
  )
  const totalPairs = allPairs.length
  const filledCount = Object.keys(results).length
  const allFilled = filledCount === totalPairs

  const handleSubmit = async () => {
    setSubmitting(true)
    setErrors([])
    setNetworkError(null)
    try {
      const result = await submitBatch()
      if (result.errors.length > 0) setErrors(result.errors)
    } catch (e) {
      setNetworkError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(220,220,230,0.12)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(220,220,230,0.08)',
        background: 'rgba(220,220,230,0.05)', fontSize: 13, fontWeight: 600, color: '#E5E7EB' }}>
        Résultats des élevages
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allPairs.map(({ enclosNum, pairIdx, pair }) => {
          const key = `${enclosNum}-${pairIdx}`
          const r = results[key] as PairResult | undefined

          const setSuccess = (success: boolean) =>
            setResult(key, {
              success,
              child_species_name: r?.child_species_name ?? pair.target_child_species,
              child_sex: r?.child_sex ?? 'F',
            })

          const setChildSpecies = (child_species_name: string | null) =>
            r && child_species_name && setResult(key, { ...r, child_species_name })

          const setChildSex = (child_sex: 'F' | 'M') =>
            r && setResult(key, { ...r, child_sex })

          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, color: '#6B7280', minWidth: 120, flexShrink: 0 }}>
                Enclos {enclosNum} · Paire {pairIdx + 1}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="sm" variant={r?.success === true ? 'default' : 'outline'}
                  onClick={() => setSuccess(true)} style={{ fontSize: 11 }}>Succès</Button>
                <Button size="sm" variant={r?.success === false ? 'default' : 'outline'}
                  onClick={() => setSuccess(false)} style={{ fontSize: 11 }}>Échec</Button>
              </div>
              {r !== undefined && (
                <>
                  <Select value={r.child_species_name} onValueChange={setChildSpecies}>
                    <SelectTrigger style={{ width: 180, fontSize: 11 }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allSpecies.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['F', 'M'] as const).map((s) => (
                      <Button key={s} size="sm" variant={r.child_sex === s ? 'default' : 'outline'}
                        onClick={() => setChildSex(s)} style={{ fontSize: 11 }}>
                        {s === 'F' ? '♀' : '♂'}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {networkError && (
        <div style={{ margin: '0 16px 12px', padding: 12, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#F87171' }}>{networkError}</div>
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ margin: '0 16px 12px', padding: 12, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#F87171', marginBottom: 6 }}>Erreurs partielles :</div>
          {errors.map((e) => (
            <div key={e.index} style={{ fontSize: 11, color: '#FCA5A5' }}>
              Paire {e.index + 1} : {e.detail}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(220,220,230,0.08)' }}>
        <Button onClick={handleSubmit} disabled={!allFilled || submitting} style={{ width: '100%' }}>
          {submitting
            ? 'Enregistrement…'
            : `Enregistrer la session (${filledCount} / ${totalPairs} saisis)`}
        </Button>
      </div>
    </div>
  )
}
