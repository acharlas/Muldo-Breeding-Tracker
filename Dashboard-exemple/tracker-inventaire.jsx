
// ── Inventaire View ───────────────────────────────────────────────────────

function SummaryCards() {
  const { SPECIES_LIST, GEN_COLORS } = window.MULDO_DATA;
  const totalFert = SPECIES_LIST.reduce((a, s) => a + s.femelles + s.males, 0);
  const totalSter = SPECIES_LIST.reduce((a, s) => a + s.femSterile + s.malSterile, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
      <div style={invStyles.summCard}>
        <div style={invStyles.summIcon('#E5E7EB')}>⚡</div>
        <div>
          <div style={invStyles.summVal('#E5E7EB')}>{totalFert}</div>
          <div style={invStyles.summLabel}>Individus fertiles</div>
          <div style={invStyles.summSub}>♀ {SPECIES_LIST.reduce((a,s)=>a+s.femelles,0)} · ♂ {SPECIES_LIST.reduce((a,s)=>a+s.males,0)}</div>
        </div>
      </div>
      <div style={invStyles.summCard}>
        <div style={invStyles.summIcon('#9CA3AF')}>🚫</div>
        <div>
          <div style={invStyles.summVal('#9CA3AF')}>{totalSter}</div>
          <div style={invStyles.summLabel}>Individus stériles</div>
          <div style={invStyles.summSub}>♀ {SPECIES_LIST.reduce((a,s)=>a+s.femSterile,0)} · ♂ {SPECIES_LIST.reduce((a,s)=>a+s.malSterile,0)}</div>
        </div>
      </div>
      <div style={invStyles.summCard}>
        <div style={invStyles.summIcon('#E5E7EB')}>🧬</div>
        <div>
          <div style={invStyles.summVal('#E5E7EB')}>{SPECIES_LIST.length}</div>
          <div style={invStyles.summLabel}>Espèces référencées</div>
          <div style={invStyles.summSub}>{[...new Set(SPECIES_LIST.map(s=>s.gen))].length} générations</div>
        </div>
      </div>
    </div>
  );
}

function BulkCaptureModal({ onClose }) {
  const { SPECIES_LIST } = window.MULDO_DATA;
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState([]);
  const [qty, setQty] = React.useState({});

  const filtered = SPECIES_LIST.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 12);

  const toggle = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  return (
    <div style={invStyles.modalOverlay} onClick={onClose}>
      <div style={invStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={invStyles.modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>Capture en masse</span>
          <button onClick={onClose} style={invStyles.closeBtn}>✕</button>
        </div>

        <input
          placeholder="Rechercher une espèce…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...invStyles.input, marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
          autoFocus
        />

        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(s => (
            <div key={s.id} style={{
              ...invStyles.modalRow,
              background: selected.includes(s.id) ? 'rgba(220,220,230,0.15)' : 'rgba(255,255,255,0.03)',
              border: selected.includes(s.id) ? '1px solid rgba(220,220,230,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                style={{ accentColor: '#E5E7EB', cursor: 'pointer' }} />
              <span style={{ color: '#E5E7EB', flex: 1, fontSize: 13 }}>{s.name}</span>
              <GenBadge gen={s.gen} />
              {selected.includes(s.id) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>♀</span>
                  <input type="number" min={0} max={20} defaultValue={1}
                    onChange={e => setQty(q => ({ ...q, [`${s.id}_f`]: +e.target.value }))}
                    style={{ ...invStyles.numInput }} />
                  <span style={{ fontSize: 11, color: '#6B7280' }}>♂</span>
                  <input type="number" min={0} max={20} defaultValue={1}
                    onChange={e => setQty(q => ({ ...q, [`${s.id}_m`]: +e.target.value }))}
                    style={{ ...invStyles.numInput }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ color: '#6B7280', fontSize: 12 }}>{selected.length} espèce{selected.length !== 1 ? 's' : ''} sélectionnée{selected.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={invStyles.btnSecondary}>Annuler</button>
            <button onClick={onClose} style={invStyles.btnPrimary}>
              Confirmer la capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventaireView() {
  const { SPECIES_LIST } = window.MULDO_DATA;
  const [search, setSearch] = React.useState('');
  const [filterGen, setFilterGen] = React.useState('all');
  const [showModal, setShowModal] = React.useState(false);
  const [counts, setCounts] = React.useState(() => {
    const c = {};
    SPECIES_LIST.forEach(s => {
      c[s.id] = { femelles: s.femelles, males: s.males, femSterile: s.femSterile, malSterile: s.malSterile };
    });
    return c;
  });

  const filtered = SPECIES_LIST.filter(s => {
    if (filterGen !== 'all' && s.gen !== +filterGen) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateCount = (id, field, delta) => {
    setCounts(c => ({ ...c, [id]: { ...c[id], [field]: Math.max(0, (c[id][field] || 0) + delta) } }));
  };

  return (
    <div>
      {showModal && <BulkCaptureModal onClose={() => setShowModal(false)} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Inventaire</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Gérez vos captures et effectifs par espèce</p>
        </div>
        <button onClick={() => setShowModal(true)} style={invStyles.btnPrimary}>
          + Capture en masse
        </button>
      </div>

      <SummaryCards />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={invStyles.input} />
        <select value={filterGen} onChange={e => setFilterGen(e.target.value)} style={invStyles.select}>
          <option value="all">Toutes gens</option>
          {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Gen {g}</option>)}
        </select>
        <span style={{ color: '#27272E', fontSize: 12, marginLeft: 'auto' }}>{filtered.length} espèces</span>
      </div>

      {/* Table */}
      <div style={invStyles.table}>
        <div style={invStyles.tableHeader}>
          <div style={{ flex: '0 0 180px' }}>Espèce</div>
          <div style={{ flex: '0 0 48px' }}>Gen</div>
          <div style={{ flex: '0 0 60px', textAlign: 'center', color: '#D1D5DB' }}>Fert ♀</div>
          <div style={{ flex: '0 0 60px', textAlign: 'center', color: '#9CA3AF' }}>Fert ♂</div>
          <div style={{ flex: '0 0 65px', textAlign: 'center', color: '#9CA3AF' }}>Stér ♀</div>
          <div style={{ flex: '0 0 65px', textAlign: 'center', color: '#9CA3AF' }}>Stér ♂</div>
          <div style={{ flex: 1 }}>Actions</div>
        </div>
        {filtered.map(s => {
          const c = counts[s.id];
          return (
            <div key={s.id} style={invStyles.row}>
              <div style={{ flex: '0 0 180px', color: '#E5E7EB', fontWeight: 500, fontSize: 13 }}>{s.name}</div>
              <div style={{ flex: '0 0 48px' }}><GenBadge gen={s.gen} /></div>
              {['femelles','males','femSterile','malSterile'].map((field, fi) => (
                <div key={field} style={{ flex: `0 0 ${fi < 2 ? 60 : 65}px`, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <button onClick={() => updateCount(s.id, field, -1)} style={invStyles.countBtn}>−</button>
                    <span style={{ width: 24, textAlign: 'center', color: fi < 2 ? (fi===0 ? '#D1D5DB' : '#9CA3AF') : '#9CA3AF', fontSize: 13, fontWeight: 600 }}>
                      {c[field]}
                    </span>
                    <button onClick={() => updateCount(s.id, field, 1)} style={invStyles.countBtn}>+</button>
                  </div>
                </div>
              ))}
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <button style={invStyles.captureBtn}>📥 Capturer</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const invStyles = {
  summCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.18)',
    borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
  },
  summIcon: (color) => ({
    fontSize: 28, width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `${color}18`, border: `1px solid ${color}30`,
  }),
  summVal: (color) => ({ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }),
  summLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  summSub: { fontSize: 11, color: '#27272E', marginTop: 2 },
  input: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '7px 12px', color: '#E5E7EB', fontSize: 13, outline: 'none', width: 200,
  },
  select: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 7, padding: '7px 10px', color: '#E5E7EB', fontSize: 12, outline: 'none', cursor: 'pointer',
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
    display: 'flex', alignItems: 'center', padding: '9px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  countBtn: {
    width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(220,220,230,0.3)',
    background: 'rgba(220,220,230,0.1)', color: '#E5E7EB', fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
  },
  captureBtn: {
    padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(220,220,230,0.3)',
    background: 'rgba(220,220,230,0.1)', color: '#E5E7EB', fontSize: 11, cursor: 'pointer',
  },
  btnPrimary: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 0 16px rgba(220,220,230,0.3)',
  },
  btnSecondary: {
    padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(220,220,230,0.3)',
    background: 'transparent', color: '#E5E7EB', fontSize: 13, cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#141418', border: '1px solid rgba(220,220,230,0.3)',
    borderRadius: 14, padding: 24, width: 560, maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#9CA3AF', cursor: 'pointer', padding: '4px 8px', fontSize: 12,
  },
  modalRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: 8, cursor: 'pointer',
  },
  numInput: {
    width: 44, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 5, padding: '3px 6px', color: '#E5E7EB', fontSize: 12, textAlign: 'center', outline: 'none',
  },
};

Object.assign(window, { InventaireView });
