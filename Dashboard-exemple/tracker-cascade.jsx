
// ── Cascade View ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    ok:       { label: '✓ OK',        bg: 'rgba(255,255,255,0.08)', color: '#F9FAFB', border: 'rgba(255,255,255,0.18)' },
    en_cours: { label: '↻ En cours',  bg: 'rgba(255,255,255,0.05)', color: '#D1D5DB', border: 'rgba(255,255,255,0.12)' },
    a_faire:  { label: '○ À faire',   bg: 'rgba(255,255,255,0.02)', color: '#6B7280', border: 'rgba(255,255,255,0.07)' },
  }[status];
  return (
    <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function GenBadge({ gen }) {
  const { GEN_COLORS } = window.MULDO_DATA;
  const c = GEN_COLORS[gen];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.text}22`, letterSpacing: '0.03em' }}>
      G{gen}
    </span>
  );
}

function ProgressBar({ value, max, color = '#E5E7EB' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2,
        transition: 'width 0.4s ease', boxShadow: `0 0 6px ${color}88` }} />
    </div>
  );
}

function StatBar() {
  const { SPECIES_LIST, TOTAL_SPECIES, GEN10_GOAL } = window.MULDO_DATA;
  const owned = SPECIES_LIST.filter(s => s.status === 'ok').length;
  const inProg = SPECIES_LIST.filter(s => s.status === 'en_cours').length;
  const gen10ok = SPECIES_LIST.filter(s => s.gen === 10 && s.status === 'ok').length;
  const totalFem = SPECIES_LIST.reduce((a, s) => a + s.femelles, 0);
  const totalMal = SPECIES_LIST.reduce((a, s) => a + s.males, 0);

  const stats = [
    { label: 'Espèces possédées', value: `${owned} / ${TOTAL_SPECIES}`, sub: `${inProg} en cours`, accent: '#E5E7EB',
      bar: { value: owned, max: TOTAL_SPECIES, color: '#E5E7EB' } },
    { label: 'Objectif Gen 10', value: `${gen10ok} / ${GEN10_GOAL}`, sub: `${GEN10_GOAL - gen10ok} restantes`, accent: '#D1D5DB',
      bar: { value: gen10ok, max: GEN10_GOAL, color: '#9CA3AF' } },
    { label: 'Femelles fertiles', value: totalFem, sub: 'total élevage', accent: '#E5E7EB', bar: null },
    { label: 'Mâles fertiles',   value: totalMal, sub: 'total élevage', accent: '#D1D5DB', bar: null },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
      {stats.map(s => (
        <div key={s.label} style={cascadeStyles.statCard}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: s.accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#27272E', marginTop: 4 }}>{s.sub}</div>
          {s.bar && <div style={{ marginTop: 10 }}><ProgressBar {...s.bar} /></div>}
        </div>
      ))}
    </div>
  );
}

function SpeciesRow({ species }) {
  const remaining = Math.max(0, species.target - Math.min(species.femelles, species.males));
  return (
    <div style={cascadeStyles.row}>
      <div style={{ flex: '0 0 180px', color: '#E5E7EB', fontWeight: 500, fontSize: 13 }}>{species.name}</div>
      <div style={{ flex: '0 0 48px' }}><GenBadge gen={species.gen} /></div>
      <div style={{ flex: '0 0 110px' }}><StatusBadge status={species.status} /></div>
      <div style={{ flex: '0 0 80px', textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
        <span style={{ color: '#D1D5DB' }}>♀ {species.femelles}</span>
        <span style={{ color: '#27272E', margin: '0 4px' }}>/</span>
        <span style={{ color: '#9CA3AF' }}>♂ {species.males}</span>
      </div>
      <div style={{ flex: '0 0 70px', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
        {species.target}
      </div>
      <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
        {remaining > 0
          ? <span style={{ color: '#9CA3AF', fontWeight: 600, fontSize: 12 }}>−{remaining}</span>
          : <span style={{ color: '#E5E7EB', fontWeight: 600, fontSize: 12 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 60 }}>
        <ProgressBar value={Math.min(species.femelles, species.males)} max={species.target} color={remaining === 0 ? '#9CA3AF' : '#E5E7EB'} />
      </div>
    </div>
  );
}

function GenGroup({ gen, species, defaultOpen = true }) {
  const { GEN_COLORS } = window.MULDO_DATA;
  const [open, setOpen] = React.useState(defaultOpen);
  const c = GEN_COLORS[gen];
  const done = species.filter(s => s.status === 'ok').length;

  return (
    <div style={cascadeStyles.genGroup}>
      <button onClick={() => setOpen(o => !o)} style={cascadeStyles.genHeader}>
        <span style={{ color: c.text, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
          GÉNÉRATION {gen}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 10 }}>{done}/{species.length} terminées</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: 100, marginRight: 12 }}>
          <ProgressBar value={done} max={species.length} color={c.text} />
        </div>
        <span style={{ color: '#6B7280', fontSize: 13, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
      </button>

      {open && (
        <div>
          <div style={cascadeStyles.tableHeader}>
            <div style={{ flex: '0 0 180px' }}>Espèce</div>
            <div style={{ flex: '0 0 48px' }}>Gen</div>
            <div style={{ flex: '0 0 110px' }}>Statut</div>
            <div style={{ flex: '0 0 80px', textAlign: 'center' }}>Fertiles</div>
            <div style={{ flex: '0 0 70px', textAlign: 'center' }}>Objectif</div>
            <div style={{ flex: '0 0 80px', textAlign: 'center' }}>Restants</div>
            <div style={{ flex: 1 }}>Progression</div>
          </div>
          {species.map(s => <SpeciesRow key={s.id} species={s} />)}
        </div>
      )}
    </div>
  );
}

function CascadeView() {
  const { SPECIES_LIST } = window.MULDO_DATA;
  const [filterGen, setFilterGen] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [search, setSearch] = React.useState('');

  const filtered = SPECIES_LIST.filter(s => {
    if (filterGen !== 'all' && s.gen !== +filterGen) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byGen = {};
  for (let g = 1; g <= 10; g++) {
    const gs = filtered.filter(s => s.gen === g);
    if (gs.length > 0) byGen[g] = gs;
  }

  return (
    <div>
      <div style={cascadeStyles.pageHeader}>
        <div>
          <h1 style={cascadeStyles.pageTitle}>Cascade</h1>
          <p style={cascadeStyles.pageSubtitle}>Vue d'ensemble de toutes les espèces par génération</p>
        </div>
      </div>

      <StatBar />

      {/* Filters */}
      <div style={cascadeStyles.filterBar}>
        <input
          placeholder="Rechercher une espèce…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={cascadeStyles.searchInput}
        />
        <select value={filterGen} onChange={e => setFilterGen(e.target.value)} style={cascadeStyles.select}>
          <option value="all">Toutes les générations</option>
          {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Génération {g}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={cascadeStyles.select}>
          <option value="all">Tous les statuts</option>
          <option value="ok">✅ OK</option>
          <option value="en_cours">🔄 En cours</option>
          <option value="a_faire">⏳ À faire</option>
        </select>
        <div style={{ color: '#27272E', fontSize: 12, marginLeft: 'auto', alignSelf: 'center' }}>
          {filtered.length} espèce{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Gen groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(byGen).map(([gen, sp]) => (
          <GenGroup key={gen} gen={+gen} species={sp} defaultOpen={+gen <= 3} />
        ))}
        {Object.keys(byGen).length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#27272E' }}>Aucune espèce trouvée</div>
        )}
      </div>
    </div>
  );
}

const cascadeStyles = {
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0, letterSpacing: '-0.01em' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', margin: '4px 0 0' },
  statCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(220,220,230,0.18)',
    borderRadius: 12,
    padding: '16px 18px',
    backdropFilter: 'blur(8px)',
  },
  filterBar: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '10px 14px',
  },
  searchInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '6px 12px', color: '#E5E7EB', fontSize: 13, outline: 'none',
    width: 200,
  },
  select: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '6px 10px', color: '#E5E7EB', fontSize: 12, outline: 'none', cursor: 'pointer',
  },
  genGroup: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(220,220,230,0.13)',
    borderRadius: 12, overflow: 'hidden',
  },
  genHeader: {
    width: '100%', background: 'rgba(220,220,230,0.07)', border: 'none', borderBottom: '1px solid rgba(220,220,230,0.1)',
    padding: '12px 18px', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0,
  },
  tableHeader: {
    display: 'flex', padding: '8px 18px', fontSize: 10, color: '#27272E',
    letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  row: {
    display: 'flex', alignItems: 'center', padding: '10px 18px', gap: 0,
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.1s',
  },
};

Object.assign(window, { CascadeView, StatusBadge, GenBadge, ProgressBar });
