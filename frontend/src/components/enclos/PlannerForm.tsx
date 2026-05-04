'use client'

import { Button } from '@/components/ui/button'
import { usePlannerStore } from '@/stores/planner'
import { useParametresStore } from '@/stores/parametres'

export function PlannerForm() {
  const { generate, loading, plan, clearPlan } = usePlannerStore()
  const nbEnclos = useParametresStore((s) => s.nbEnclos)

  const handlePlanify = async () => {
    if (plan) {
      if (!window.confirm('Un plan est déjà actif. Régénérer efface les résultats saisis. Continuer ?')) return
      clearPlan()
    }
    await generate()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <span style={{ fontSize: 13, color: '#6B7280' }}>
        {nbEnclos} enclos · {nbEnclos * 5} paires
      </span>
      <Button onClick={handlePlanify} disabled={loading}>
        {loading ? 'Planification…' : 'Planifier'}
      </Button>
    </div>
  )
}
