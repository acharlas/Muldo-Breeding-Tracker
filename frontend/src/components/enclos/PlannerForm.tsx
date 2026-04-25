'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { usePlannerStore } from '@/stores/planner'

export function PlannerForm() {
  const { generate, loading, plan, clearPlan } = usePlannerStore()
  const [count, setCount] = useState(4)

  const handlePlanify = async () => {
    if (plan) {
      if (!window.confirm('Un plan est déjà actif. Régénérer efface les résultats saisis. Continuer ?')) return
      clearPlan()
    }
    await generate(count)
  }

  return (
    <Card style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.18)', marginBottom: 20 }}>
      <CardContent style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', marginBottom: 16 }}>
          Configuration de session
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Nombre d'enclos</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="outline" size="sm"
                onClick={() => setCount((c) => Math.max(1, c - 1))}>−</Button>
              <Input type="number" min={1} max={10} value={count}
                onChange={(e) => setCount(Math.min(10, Math.max(1, +e.target.value)))}
                style={{ width: 64, textAlign: 'center', fontWeight: 700 }} />
              <Button variant="outline" size="sm"
                onClick={() => setCount((c) => Math.min(10, c + 1))}>+</Button>
              <span style={{ color: '#374151', fontSize: 12 }}>/ 10 max</span>
            </div>
          </div>
          <div style={{ width: 1, height: 50, background: 'rgba(220,220,230,0.15)', margin: '0 6px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Paires par enclos</label>
            <div style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 22 }}>5</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button onClick={handlePlanify} disabled={loading}>
              {loading ? 'Planification…' : '⚡ Planifier'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
