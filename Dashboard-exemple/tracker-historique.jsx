
// ── Historique View ───────────────────────────────────────────────────────

function HistoriqueView() {
  const { CYCLE_RESULTS, SPECIES_LIST } = window.MULDO_DATA;
  const [filterCycle, setFilterCycle] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sortDir, setSortDir] = React.useState('desc');

  const maxCycle = Math.max(...CYCLE_RESULTS.map(r => r.cycle));
  const cycles = Array.from({ length: maxCycle }, (_, i) => i + 1);

  const filtered = CYCLE_RESULTS.filter(r => {
    if (filterCycle !== 'all' && r.cycle !== +filterCycle) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.mere.toLowerCase().includes(q) && !r.pere.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => sortDir === 'desc' ? b.id - a.id : a.id - b.id);

  const totalSucces = CYCLE_RESULTS.filter(r => r.resultat === 'succes').length;
  const tauxSucces = Math.round((totalSucces / CYCLE_RESULTS.length) * 100);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Historique</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Tous vos cycles d'élevage passés</p>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Cycles totaux', val: maxCycle, color: '#E5E7EB' },
          { label: 'Élevages tentés', val: CYCLE_RESULTS.length, color: '#E5E7EB' },
          { label: 'Succès', val: totalSucces, color: '#E5E7EB' },
          { label: 'Taux de réussite', val: `${tauxSucces}%`, color: '#E5E7EB' },
        ].map(s => (
          <div key={s.label} style={histStyles.statCard}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={histStyles.filterBar}>
        <input
          placeholder="Rechercher une espèce…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={histStyles.input}
        />
        <select value={filterCycle} onChange={e => setFilterCycle(e.target.value)} style={histStyles.select}>
          <option value="all">Tous les cycles</option>
          {cycles.map(c => <option key={c} value={c}>Cycle {c}</option>)}
        </select>
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          style={histStyles.sortBtn}
        >
          {sortDir === 'desc' ? '↓ Plus récent' : '↑ Plus ancien'}
        </button>
        <span style={{ color: '#27272E', fontSize: 12, marginLeft: 'auto' }}>{filtered.length} entrées</span>
      </div>

      {/* Table */}
      <div style={histStyles.table}>
        <div style={histStyles.tableHeader}>
          <div style={{ flex: '0 0 70px' }}>Cycle</div>
          <div style={{ flex: '0 0 90px' }}>Date</div>
          <div style={{ flex: 1 }}>Espèce ♀</div>
          <div style={{ flex: 1 }}>Espèce ♂</div>
          <div style={{ flex: '0 0 110px' }}>Résultat</div>
          <div style={{ flex: 1 }}>Enfant obtenu</div>
        </div>

        {filtered.map(r => (
          <div key={r.id} style={{
            ...histStyles.row,
            background: r.resultat === 'succes' ? 'rgba(255,255,255,0.01)' : 'transparent',
          }}>
            <div style={{ flex: '0 0 70px' }}>
              <span style={histStyles.cycleBadge}>C{r.cycle}</span>
            </div>
            <div style={{ flex: '0 0 90px', color: '#27272E', fontSize: 12 }}>{r.date}</div>
            <div style={{ flex: 1, color: '#E5E7EB', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#D1D5DB', fontSize: 10 }}>♀</span> {r.mere}
            </div>
            <div style={{ flex: 1, color: '#E5E7EB', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#9CA3AF', fontSize: 10 }}>♂</span> {r.pere}
            </div>
            <div style={{ flex: '0 0 110px' }}>
              {r.resultat === 'succes'
                ? <span style={histStyles.successBadge}>✓ Succès</span>
                : <span style={histStyles.failBadge}>✕ Échec</span>}
            </div>
            <div style={{ flex: 1, color: r.enfant ? '#E5E7EB' : '#27272E', fontSize: 12, fontStyle: r.enfant ? 'normal' : 'italic' }}>
              {r.enfant || '—'}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#27272E' }}>Aucun résultat trouvé</div>
        )}
      </div>

      {/* Cycle timeline summary */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Historique par cycle
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cycles.map(c => {
            const cResults = CYCLE_RESULTS.filter(r => r.cycle === c);
            const cSucces = cResults.filter(r => r.resultat === 'succes').length;
            const rate = cResults.length ? Math.round((cSucces / cResults.length) * 100) : 0;
            const active = filterCycle === String(c);
            return (
              <button
                key={c}
                onClick={() => setFilterCycle(active ? 'all' : String(c))}
                style={{
                  ...histStyles.cyclePill,
                  background: active ? 'rgba(220,220,230,0.3)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(220,220,230,0.6)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#E5E7EB' : '#6B7280',
                }}
              >
                <span style={{ fontWeight: 700 }}>C{c}</span>
                <span style={{ fontSize: 10 }}>{cSucces}/{cResults.length}</span>
                <div style={{
                  width: 24, height: 3, borderRadius: 2,
                  background: `linear-gradient(to right, #9CA3AF ${rate}%, rgba(255,255,255,0.1) ${rate}%)`,
                }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const histStyles = {
  statCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.18)',
    borderRadius: 12, padding: '16px 18px',
  },
  filterBar: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '10px 14px',
  },
  input: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '7px 12px', color: '#E5E7EB', fontSize: 13, outline: 'none', width: 200,
  },
  select: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '7px 10px', color: '#E5E7EB', fontSize: 12, outline: 'none', cursor: 'pointer',
  },
  sortBtn: {
    padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(220,220,230,0.2)',
    background: 'rgba(220,220,230,0.08)', color: '#E5E7EB', fontSize: 12, cursor: 'pointer',
  },
  table: {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(220,220,230,0.13)',
    borderRadius: 12, overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex', padding: '10px 18px', fontSize: 10, color: '#27272E',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(220,220,230,0.1)', background: 'rgba(220,220,230,0.05)',
  },
  row: {
    display: 'flex', alignItems: 'center', padding: '10px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.1s',
  },
  cycleBadge: {
    padding: '2px 8px', borderRadius: 4, background: 'rgba(220,220,230,0.15)',
    border: '1px solid rgba(220,220,230,0.25)', color: '#E5E7EB', fontSize: 11, fontWeight: 700,
  },
  successBadge: {
    padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
    background: 'rgba(255,255,255,0.08)', color: '#F9FAFB', border: '1px solid rgba(255,255,255,0.16)',
  },
  failBadge: {
    padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
    background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)',
  },
  cyclePill: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, minWidth: 52,
    transition: 'all 0.15s',
  },
};

Object.assign(window, { HistoriqueView });
