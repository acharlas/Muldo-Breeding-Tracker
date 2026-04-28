'use client'

import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCascadeStore } from '@/stores/cascade'
import { useParametresStore, effectiveKxp, computeSuccessRate } from '@/stores/parametres'
import { apiCalls } from '@/lib/api'

type Snapshot = { cycle_number: number; species_ok_count: number; created_at: string }

export function DashboardView() {
  const items = useCascadeStore((s) => s.items)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    apiCalls.getDashboardProgression().then(setSnapshots).catch(() => {})
  }, [])

  const { baseLevel, optimakina, prixFilet, prixOptimakina, nbEnclos, carburants, selectedTiers } = useParametresStore()
  const successRate = computeSuccessRate(baseLevel, optimakina)

  // Bloc 1 — progression
  const ok = items.filter(i => i.status === 'ok').length
  const progressPct = Math.round((ok / 120) * 100)

  // Bloc 2 — temps restant
  // total couples needed = Σ ceil(remaining / successRate) across all species
  // pairs per cycle   = nbEnclos × 5  (10 muldos per enclos → 5 M/F pairs)
  const { totalCouplesNeeded, cyclesLeft } = useMemo(() => {
    const enc = nbEnclos || 1
    const pairsPerCycle = enc * 5
    const totalCouplesNeeded = items.reduce((sum, i) => {
      if (i.remaining <= 0) return sum
      return sum + Math.ceil(i.remaining / successRate)
    }, 0)
    const cyclesLeft = totalCouplesNeeded > 0 ? Math.ceil(totalCouplesNeeded / pairsPerCycle) : 0
    return { totalCouplesNeeded, cyclesLeft }
  }, [items, nbEnclos, successRate])

  // Bloc 3 — coût estimé
  const fkxp = effectiveKxp(carburants.foudroyeur, selectedTiers.foudroyeur)
  const akxp = effectiveKxp(carburants.abreuvoir, selectedTiers.abreuvoir)
  const dkxp = effectiveKxp(carburants.dragofesse, selectedTiers.dragofesse)
  const bkxp = effectiveKxp(carburants.baffeur, selectedTiers.baffeur)
  const ckxp = effectiveKxp(carburants.caresseur, selectedTiers.caresseur)
  const hasAllPrices = fkxp !== null && akxp !== null && dkxp !== null && bkxp !== null && ckxp !== null

  const estimatedCost = useMemo(() => {
    if (!hasAllPrices) return null
    const lot = (nbEnclos || 1) * 10
    const fecCost = (20000 * fkxp! + 20000 * akxp! + 20000 * dkxp! + 5000 * bkxp! + 5000 * ckxp!) / lot
    let total = 0
    for (const item of items) {
      if (item.remaining <= 0) continue
      const nb = Math.ceil(item.remaining / successRate)
      total += nb * 2 * fecCost
      if (item.generation === 1 && prixFilet) total += nb * 2 * prixFilet
      if (optimakina) { const po = prixOptimakina[item.generation]; if (po) total += nb * po }
    }
    return total
  }, [items, fkxp, akxp, dkxp, bkxp, ckxp, nbEnclos, successRate, prixFilet, prixOptimakina, optimakina, hasAllPrices])

  // Bloc 4 — breakdown by gen
  const genData = useMemo(() => {
    const map: Record<number, { ok: number; remaining: number }> = {}
    for (const item of items) {
      if (!map[item.generation]) map[item.generation] = { ok: 0, remaining: 0 }
      if (item.status === 'ok') map[item.generation].ok++
      else map[item.generation].remaining++
    }
    return Object.entries(map).sort(([a], [b]) => +a - +b).map(([gen, v]) => ({ gen: `Gen ${gen}`, ...v }))
  }, [items])

  const card = (title: string, children: React.ReactNode) => (
    <div style={{ background: 'rgba(220,220,230,0.04)', border: '1px solid rgba(220,220,230,0.1)',
      borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: '#374151', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', marginBottom: 32 }}>Dashboard</h1>

      {card('Progression globale', (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#F9FAFB', fontVariantNumeric: 'tabular-nums' }}>{ok}</span>
            <span style={{ fontSize: 18, color: '#4B5563' }}>/ 120 espèces</span>
            <span style={{ marginLeft: 'auto', fontSize: 14, color: '#9CA3AF' }}>{progressPct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(220,220,230,0.1)', borderRadius: 3, marginBottom: 24 }}>
            <div style={{ height: '100%', borderRadius: 3, background: ok >= 120 ? '#4ADE80' : '#E5E7EB',
              width: `${Math.min(100, progressPct)}%`, transition: 'width 0.4s ease' }} />
          </div>
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '20px 0' }}>
              Aucun cycle enregistré
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,220,230,0.06)" />
                <XAxis dataKey="cycle_number" stroke="#374151" tick={{ fill: '#4B5563', fontSize: 11 }} />
                <YAxis stroke="#374151" tick={{ fill: '#4B5563', fontSize: 11 }} domain={[0, 120]} />
                <Tooltip contentStyle={{ background: '#1C1C22', border: '1px solid rgba(220,220,230,0.15)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="species_ok_count" stroke="#E5E7EB" strokeWidth={2} dot={false} name="Espèces complètes" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {card('Temps restant estimé', (
          cyclesLeft === 0
            ? <div style={{ color: '#4ADE80', fontSize: 13 }}>Terminé !</div>
            : <>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>
                {Math.ceil(cyclesLeft * 72 / 24)} jours
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                ~{cyclesLeft} cycles × 72h · {nbEnclos} enclos × 10 muldos
              </div>
            </>
        ))}

        {card('Coût estimé restant', (
          !hasAllPrices
            ? <div style={{ fontSize: 13, color: '#FB923C' }}>
                Renseigner les prix carburants dans Paramètres
              </div>
            : estimatedCost === null
            ? <div style={{ color: '#374151', fontSize: 13 }}>—</div>
            : <>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>
                {(estimatedCost / 1_000_000).toFixed(1)} Mk
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                {(estimatedCost / 1000).toFixed(0)} k kamas
              </div>
            </>
        ))}
      </div>

      {card('Breakdown par génération', (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={genData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,220,230,0.06)" />
            <XAxis dataKey="gen" stroke="#374151" tick={{ fill: '#4B5563', fontSize: 11 }} />
            <YAxis stroke="#374151" tick={{ fill: '#4B5563', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1C1C22', border: '1px solid rgba(220,220,230,0.15)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="ok" stackId="a" fill="#4ADE80" name="Complètes" />
            <Bar dataKey="remaining" stackId="a" fill="rgba(220,220,230,0.15)" name="Restantes" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ))}
    </div>
  )
}
