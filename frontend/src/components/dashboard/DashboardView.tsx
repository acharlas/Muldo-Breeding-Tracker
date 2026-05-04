'use client'

import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCascadeStore } from '@/stores/cascade'
import { useParametresStore, effectiveKxp, computeSuccessRate, effectiveXpCostPerPoint, totalXpToReach, activeTierRate } from '@/stores/parametres'
import { apiCalls } from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Snapshot = { cycle_number: number; species_ok_count: number; created_at: string }

function formatBatch(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatTotal(sec: number): string {
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  const totalH = sec / 3600
  if (totalH < 24) {
    const h = Math.floor(totalH)
    const m = Math.round((totalH - h) * 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${Math.ceil(totalH / 24)} j`
}

export function DashboardView() {
  const items = useCascadeStore((s) => s.items)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    apiCalls.getDashboardProgression().then(setSnapshots).catch(() => {})
  }, [])

  const { baseLevel, optimakina, prixFilet, prixOptimakina, nbEnclos, heuresAccouplement, carburants, selectedTiers } = useParametresStore()

  const xpCostPerPoint = effectiveXpCostPerPoint(carburants.experience, selectedTiers.experience)
  const totalXpNeeded = totalXpToReach(baseLevel)
  const successRate = computeSuccessRate(baseLevel, optimakina)

  // Bloc 1 — progression
  const ok = items.filter(i => i.status === 'ok').length
  const progressPct = Math.round((ok / 120) * 100)

  // Bloc 2 — temps restant
  // Breeding attempts only — Gen 1 muldos are captured, not bred, so they don't consume breed cycles.
  // pairs per cycle = nbEnclos × 5  (10 muldos per enclos → 5 M/F pairs)
  const cyclesLeft = useMemo(() => {
    const enc = nbEnclos || 1
    const pairsPerCycle = enc * 5
    const breedAttempts = items.reduce((sum, i) => {
      if (i.remaining <= 0 || i.generation === 1) return sum
      return sum + Math.ceil(i.remaining / successRate)
    }, 0)
    return breedAttempts > 0 ? Math.ceil(breedAttempts / pairsPerCycle) : 0
  }, [items, nbEnclos, successRate])

  // Calculated per-batch time from ticked tiers. Sequential workflow:
  //   1. Baffeur (sérénité)        — solo
  //   2. Foudroyeur || Abreuvoir   — parallel; phase length = T_F (Endurance is the long pole)
  //                                  Maturité gained during phase 2 = rate_A × T_F
  //   3. Caresseur (sérénité)      — solo
  //   4. Dragofesse || Abreuvoir   — Abreuvoir only if Maturité not full from phase 2
  //                                  phase length = max(T_D, max(0, T_A - T_F))
  // Sérénité gauges are mutex with productive ones (and with each other), so they're additive.
  // XP is added if the experience tier is ticked (otherwise assumed already leveled = 0).
  const calcPerBatch = useMemo(() => {
    const r_F = activeTierRate(selectedTiers.foudroyeur)
    const r_A = activeTierRate(selectedTiers.abreuvoir)
    const r_D = activeTierRate(selectedTiers.dragofesse)
    const r_B = activeTierRate(selectedTiers.baffeur)
    const r_C = activeTierRate(selectedTiers.caresseur)
    const r_X = activeTierRate(selectedTiers.experience)
    if (r_F === 0 || r_A === 0 || r_D === 0 || r_B === 0 || r_C === 0) return null
    const T_F = 20000 / r_F
    const T_A = 20000 / r_A
    const T_D = 20000 / r_D
    const T_B = 5000 / r_B
    const T_C = 5000 / r_C
    const T_phase4 = Math.max(T_D, Math.max(0, T_A - T_F))
    const T_X = r_X > 0 ? totalXpNeeded / r_X : 0
    return T_B + T_F + T_C + T_phase4 + T_X
  }, [selectedTiers, totalXpNeeded])

  // Bloc 3 — coût estimé
  const fkxp = effectiveKxp(carburants.foudroyeur, selectedTiers.foudroyeur)
  const akxp = effectiveKxp(carburants.abreuvoir, selectedTiers.abreuvoir)
  const dkxp = effectiveKxp(carburants.dragofesse, selectedTiers.dragofesse)
  const bkxp = effectiveKxp(carburants.baffeur, selectedTiers.baffeur)
  const ckxp = effectiveKxp(carburants.caresseur, selectedTiers.caresseur)
  const hasAllPrices = fkxp !== null && akxp !== null && dkxp !== null && bkxp !== null && ckxp !== null

  const estimatedCost = useMemo(() => {
    if (!hasAllPrices) return null
    // Fuel amortization is per enclos, not across enclos: a fuel piece feeds one enclos's
    // gauge, shared by the (up to) 10 muldos in that enclos. Adding more enclos parallelizes
    // throughput (cyclesLeft) but doesn't change per-muldo cost — each enclos still needs
    // its own fuel. So we divide by the per-enclos batch size, not by total parallel muldos.
    const MULDOS_PER_ENCLOS = 10
    const fecCost = (20000 * fkxp! + 20000 * akxp! + 20000 * dkxp! + 5000 * bkxp! + 5000 * ckxp!) / MULDOS_PER_ENCLOS
    const xpCostPerMuldoBatch = xpCostPerPoint !== null ? (totalXpNeeded * xpCostPerPoint) / MULDOS_PER_ENCLOS : null
    let total = 0
    for (const item of items) {
      if (item.remaining <= 0) continue
      // Gen 1 muldos are captured, not bred. Their fec/XP cost as future parents is paid in
      // their children's rows (Gen 2 row counts the fec/XP for the Gen 1 parents it consumes).
      // So Gen 1's own row only contributes capture cost.
      if (item.generation === 1) {
        if (prixFilet) total += item.remaining * prixFilet
        continue
      }
      const nb = Math.ceil(item.remaining / successRate)
      total += nb * 2 * fecCost
      if (xpCostPerMuldoBatch !== null) total += nb * 2 * xpCostPerMuldoBatch
      if (optimakina) { const po = prixOptimakina[item.generation]; if (po) total += nb * po }
    }
    return total
  }, [items, fkxp, akxp, dkxp, bkxp, ckxp, successRate, prixFilet, prixOptimakina, optimakina, hasAllPrices, xpCostPerPoint, totalXpNeeded])

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

  const card = (title: string, children: React.ReactNode, info?: React.ReactNode) => (
    <div style={{ background: 'rgba(220,220,230,0.04)', border: '1px solid rgba(220,220,230,0.1)',
      borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: '#374151', letterSpacing: '0.1em',
          textTransform: 'uppercase' }}>{title}</span>
        {info && (
          <Popover>
            <PopoverTrigger
              aria-label="Détails du calcul"
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(220,220,230,0.06)',
                border: '1px solid rgba(220,220,230,0.15)',
                color: '#9CA3AF', fontSize: 10, fontWeight: 700,
                cursor: 'help', padding: 0, lineHeight: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ?
            </PopoverTrigger>
            <PopoverContent style={{ width: 360 }}>
              {info}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {children}
    </div>
  )

  const timeInfo = (
    <div style={{ fontSize: 12, color: '#D1D5DB', lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>Cycles restants</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
        nb = Σ ⌈remaining / p⌉ (Gen 2-10)<br />
        cycles = ⌈ nb / (nbEnclos × 5) ⌉
      </div>

      <div style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>Estimé (input)</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
        cycles × heuresAccouplement
      </div>

      <div style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>Calculé (workflow)</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
        T_batch = T_B + T_F + T_C + T_phase4 + T_XP<br />
        T_phase4 = max(T_D, max(0, T_A − T_F))
      </div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
        Abreuvoir (Maturité) tourne en parallèle avec Foudroyeur en phase 2,
        puis avec Dragofesse en phase 4 si Maturité pas encore pleine.
        Sérénité (Baffeur, Caresseur) en mutex avec les jauges productives → séquentiel.
      </div>

      <div style={{ paddingTop: 10, borderTop: '1px solid rgba(220,220,230,0.1)',
        fontSize: 11, color: '#6B7280' }}>
        Gen 1 exclu (capture). p = niveau × 0.003 + 0.30 (+0.10 Optimakina).
        Tiers cochés dans Paramètres → débit (10/20/30/40 pts par 10s).
      </div>
    </div>
  )

  const costInfo = (
    <div style={{ fontSize: 12, color: '#D1D5DB', lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>
        Pour chaque espèce restante
      </div>

      <div style={{ fontWeight: 600, color: '#E5E7EB', marginTop: 8, marginBottom: 2 }}>
        Gen 2-10 (élevage)
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
        nb = ⌈remaining / p⌉<br />
        + nb × 2 × fecCost<br />
        + nb × 2 × xpCost<br />
        + nb × prixOptimakina[gen]
      </div>

      <div style={{ fontWeight: 600, color: '#E5E7EB', marginBottom: 2 }}>Gen 1 (capture)</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>
        + remaining × prixFilet
      </div>

      <div style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>Constantes</div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
        fecCost = (20k×(kF+kA+kD) + 5k×(kB+kC)) / 10<br />
        xpCost  = XP_totale(lvl) × kxp_exp / 10
      </div>
      <div style={{ fontSize: 11, color: '#6B7280' }}>
        ÷10 = un enclos plein partage 1 carburant entre 10 muldos. Indépendant de nbEnclos.
      </div>
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
        {card('Temps restant', (
          cyclesLeft === 0
            ? <div style={{ color: '#4ADE80', fontSize: 13 }}>Terminé !</div>
            : (() => {
                const breedHours = heuresAccouplement ? cyclesLeft * heuresAccouplement : null
                const calcTotalSec = calcPerBatch !== null ? cyclesLeft * calcPerBatch : null
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Estimé */}
                    <div>
                      <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 6 }}>Estimé</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', marginBottom: 4,
                        fontVariantNumeric: 'tabular-nums' }}>
                        {breedHours ? `${Math.ceil(breedHours / 24)} j` : `~${cyclesLeft} cycles`}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {breedHours
                          ? `${cyclesLeft} × ${heuresAccouplement}h`
                          : <span style={{ color: '#FB923C' }}>
                              Heures entre accouplements ?
                            </span>}
                      </div>
                    </div>
                    {/* Calculé */}
                    <div style={{ borderLeft: '1px solid rgba(220,220,230,0.08)', paddingLeft: 16 }}>
                      <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 6 }}>Calculé</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', marginBottom: 4,
                        fontVariantNumeric: 'tabular-nums' }}>
                        {calcTotalSec !== null ? formatTotal(calcTotalSec) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {calcPerBatch !== null
                          ? `${cyclesLeft} × ${formatBatch(calcPerBatch)}`
                          : <span style={{ color: '#FB923C' }}>
                              Cocher un tier par jauge
                            </span>}
                      </div>
                    </div>
                  </div>
                )
              })()
        ), timeInfo)}

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
        ), costInfo)}
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
