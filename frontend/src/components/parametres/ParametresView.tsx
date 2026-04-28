'use client'

import { useRef } from 'react'
import { Download, Upload, FileText } from 'lucide-react'
import { useParametresStore, successPct } from '@/stores/parametres'
import { useCascadeStore } from '@/stores/cascade'
import { apiCalls } from '@/lib/api'
import { CarburantGrid as CarburantGridComponent } from './CarburantGrid'

type Tier = 'extrait' | 'philtre' | 'potion' | 'elixir'
type Size = '1000' | '2000' | '3000' | '4000' | '5000'

export function ParametresView() {
  const {
    baseLevel, optimakina, prixFilet, prixOptimakina, nbMuldosLot,
    carburants,
    setBaseLevel, setOptimakina, setPrixFilet, setPrixOptimakina, setNbMuldosLot,
    setCarburantPrice,
  } = useParametresStore()
  const fetchCascade = useCascadeStore((s) => s.fetch)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, color: '#374151', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8,
        borderBottom: '1px solid rgba(220,220,230,0.08)' }}>{title}</div>
      {children}
    </div>
  )

  const numInput = (label: string, value: number | null, onChange: (v: number | null) => void, extra?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#9CA3AF', flex: 1 }}>{label}</span>
      <input
        type="number" min={0} placeholder="—"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        style={{ width: 120, background: 'rgba(220,220,230,0.05)', border: '1px solid rgba(220,220,230,0.12)',
          borderRadius: 6, padding: '6px 10px', color: '#E5E7EB', fontSize: 13, outline: 'none' }}
      />
      {extra && <span style={{ fontSize: 11, color: '#4B5563' }}>{extra}</span>}
    </div>
  )

  const handleExportJSON = async () => {
    const data = await apiCalls.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `muldo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const items = useCascadeStore.getState().items
    const rows = [
      ['Génération', 'Espèce', 'Cible', 'F attendues', 'M attendus', 'Fertiles F', 'Fertiles M', 'Restant', 'Statut'],
      ...items.map(i => [
        i.generation, i.species_name, i.production_target,
        i.expected_f, i.expected_m, i.fertile_f, i.fertile_m, i.remaining, i.status,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `muldo-cascade-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = JSON.parse(text)
    const mode = (document.getElementById('import-mode') as HTMLInputElement)?.checked ? 'replace' : 'merge'
    await apiCalls.importData(data, mode)
    fetchCascade()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const JAUGES = ['foudroyeur', 'abreuvoir', 'dragofesse', 'baffeur'] as const
  const JAUGE_LABELS: Record<string, string> = {
    foudroyeur: 'Foudroyeur (Endurance)',
    abreuvoir: 'Abreuvoir (Maturité)',
    dragofesse: 'Dragofesse (Amour)',
    baffeur: 'Baffeur / Caresseur (Sérénité)',
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', marginBottom: 32 }}>Paramètres</h1>

      {section('Élevage', (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#9CA3AF', flex: 1 }}>Niveau parents</span>
            <button onClick={() => { setBaseLevel(baseLevel - 1); fetchCascade() }}
              disabled={baseLevel <= 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(220,220,230,0.2)',
                background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 16 }}>−</button>
            <input type="number" min={1} max={200} value={baseLevel}
              onChange={(e) => { setBaseLevel(parseInt(e.target.value) || 1); fetchCascade() }}
              style={{ width: 70, textAlign: 'center', background: 'rgba(220,220,230,0.05)',
                border: '1px solid rgba(220,220,230,0.12)', borderRadius: 6, padding: '6px 10px',
                color: '#E5E7EB', fontSize: 14, fontWeight: 700, outline: 'none' }} />
            <button onClick={() => { setBaseLevel(baseLevel + 1); fetchCascade() }}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(220,220,230,0.2)',
                background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontSize: 16 }}>+</button>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>
              {successPct(baseLevel, optimakina)}% succès
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            color: optimakina ? '#A78BFA' : '#9CA3AF', cursor: 'pointer' }}>
            <input type="checkbox" checked={optimakina}
              onChange={(e) => { setOptimakina(e.target.checked); fetchCascade() }}
              style={{ accentColor: '#A78BFA' }} />
            Optimakina (+10%)
          </label>
        </>
      ))}

      {section('Prix marché — Carburants', (
        <div>
          {JAUGES.map(jauge => (
            <CarburantGridComponent
              key={jauge}
              label={JAUGE_LABELS[jauge]}
              grid={carburants[jauge]}
              onChange={(tier, size, prix) => setCarburantPrice(jauge, tier as Tier, size as Size, prix)}
            />
          ))}
        </div>
      ))}

      {section('Prix filet et Makinas', (
        <>
          {numInput("Prix d'un filet de capture", prixFilet, setPrixFilet, 'kamas')}
          {numInput('Nombre de muldos par session', nbMuldosLot, (v) => setNbMuldosLot(v ?? 10), '(défaut 10)')}
          {optimakina && numInput("Prix d'une Optimakina", prixOptimakina, setPrixOptimakina, 'kamas')}
        </>
      ))}

      {section('Export / Import', (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleExportJSON} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'rgba(220,220,230,0.08)', border: '1px solid rgba(220,220,230,0.15)',
              borderRadius: 8, color: '#E5E7EB', fontSize: 13, cursor: 'pointer' }}>
              <Download size={14} /> Exporter JSON
            </button>
            <button onClick={handleExportCSV} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: 'rgba(220,220,230,0.08)', border: '1px solid rgba(220,220,230,0.15)',
              borderRadius: 8, color: '#E5E7EB', fontSize: 13, cursor: 'pointer' }}>
              <FileText size={14} /> Exporter CSV Cascade
            </button>
          </div>
          <div style={{ padding: 16, background: 'rgba(220,220,230,0.04)',
            borderRadius: 10, border: '1px solid rgba(220,220,230,0.1)' }}>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 10 }}>Importer un backup JSON</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              color: '#E5E7EB', marginBottom: 12, cursor: 'pointer' }}>
              <input id="import-mode" type="checkbox" defaultChecked
                style={{ accentColor: '#E5E7EB' }} />
              Remplacer les données existantes (décocher = fusion)
            </label>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport}
              style={{ fontSize: 13, color: '#9CA3AF', cursor: 'pointer' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
