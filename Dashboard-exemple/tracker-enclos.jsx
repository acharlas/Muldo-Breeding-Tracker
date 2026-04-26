
// ── Enclos View ───────────────────────────────────────────────────────────

function PairCard({ pair, idx }) {
  return (
    <div style={enclosStyles.pairCard}>
      <div style={enclosStyles.pairIdx}>{idx + 1}</div>
      <div style={enclosStyles.pairFem}>
        <span style={{ color: '#D1D5DB', fontSize: 10 }}>♀</span>
        <span style={enclosStyles.pairName}>{pair.mere}</span>
        <GenBadge gen={pair.mereGen} />
      </div>
      <div style={enclosStyles.pairArrow}>×</div>
      <div style={enclosStyles.pairMal}>
        <span style={{ color: '#9CA3AF', fontSize: 10 }}>♂</span>
        <span style={enclosStyles.pairName}>{pair.pere}</span>
        <GenBadge gen={pair.pereGen} />
      </div>
      <div style={enclosStyles.pairTarget}>
        <span style={{ color: '#E5E7EB', fontSize: 11 }}>🎯</span>
        <span style={{ color: '#E5E7EB', fontSize: 11, fontWeight: 600 }}>{pair.child}</span>
      </div>
      <div style={enclosStyles.successBadge}>55%</div>
    </div>
  );
}

function EnclosCard({ num, pairs }) {
  return (
    <div style={enclosStyles.card}>
      <div style={enclosStyles.cardHeader}>
        <div style={enclosStyles.cardNum}>Enclos {num}</div>
        <div style={enclosStyles.cardMeta}>{pairs.length} paires</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pairs.map((p, i) => <PairCard key={i} pair={p} idx={i} />)}
      </div>
    </div>
  );
}

function EnclosView() {
  const { SPECIES_LIST } = window.MULDO_DATA;
  const [numEnclos, setNumEnclos] = React.useState(4);
  const [inputVal, setInputVal] = React.useState('4');
  const [planned, setPlanned] = React.useState(null);

  const planifier = () => {
    const n = Math.min(10, Math.max(1, +inputVal || 1));
    setNumEnclos(n);

    // Pick species that are en_cours or a_faire and need breeding
    const candidates = SPECIES_LIST.filter(s => s.status !== 'ok' && s.femelles > 0 && s.males > 0);
    const result = [];

    for (let e = 0; e < n; e++) {
      const pairs = [];
      for (let p = 0; p < 5; p++) {
        const idx = (e * 5 + p) % candidates.length;
        const sp = candidates[idx];
        const nextGen = Math.min(10, sp.gen + 1);
        const childCandidates = SPECIES_LIST.filter(s => s.gen === nextGen);
        const child = childCandidates[(e * 7 + p * 3) % childCandidates.length];
        pairs.push({
          mere: sp.name, mereGen: sp.gen,
          pere: candidates[(idx + 3) % candidates.length].name,
          pereGen: candidates[(idx + 3) % candidates.length].gen,
          child: child ? child.name : sp.name,
        });
      }
      result.push({ num: e + 1, pairs });
    }
    setPlanned(result);
  };

  const totalPairs = planned ? planned.reduce((a, e) => a + e.pairs.length, 0) : 0;
  const expectedSucc = planned ? Math.round(totalPairs * 0.55) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Enclos</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Planifiez vos sessions d'élevage par enclos</p>
      </div>

      {/* Planner input */}
      <div style={enclosStyles.plannerBox}>
        <div style={enclosStyles.plannerTitle}>Configuration de session</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Nombre d'enclos</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setInputVal(v => String(Math.max(1, +v - 1)))} style={enclosStyles.stepBtn}>−</button>
              <input
                type="number" min={1} max={10}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                style={enclosStyles.numInput}
              />
              <button onClick={() => setInputVal(v => String(Math.min(10, +v + 1)))} style={enclosStyles.stepBtn}>+</button>
              <span style={{ color: '#27272E', fontSize: 12 }}>/ 10 max</span>
            </div>
          </div>

          <div style={{ width: 1, height: 50, background: 'rgba(220,220,230,0.2)', margin: '0 6px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6B7280' }}>Paires par enclos</label>
            <div style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 22 }}>5</div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button onClick={planifier} style={enclosStyles.planBtn}>
              ⚡ Planifier
            </button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {planned && (
        <div style={enclosStyles.summaryBar}>
          <div style={enclosStyles.summStat}>
            <span style={{ color: '#6B7280', fontSize: 11 }}>Enclos planifiés</span>
            <span style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 20 }}>{planned.length}</span>
          </div>
          <div style={enclosStyles.summDivider} />
          <div style={enclosStyles.summStat}>
            <span style={{ color: '#6B7280', fontSize: 11 }}>Paires totales</span>
            <span style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 20 }}>{totalPairs}</span>
          </div>
          <div style={enclosStyles.summDivider} />
          <div style={enclosStyles.summStat}>
            <span style={{ color: '#6B7280', fontSize: 11 }}>Succès estimés (~55%)</span>
            <span style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 20 }}>{expectedSucc}</span>
          </div>
          <div style={enclosStyles.summDivider} />
          <div style={enclosStyles.summStat}>
            <span style={{ color: '#6B7280', fontSize: 11 }}>Espèces restantes</span>
            <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: 20 }}>
              {SPECIES_LIST.filter(s => s.status !== 'ok').length - expectedSucc}
            </span>
          </div>
        </div>
      )}

      {/* Enclos grid */}
      {planned && (
        <div style={enclosStyles.grid}>
          {planned.map(e => <EnclosCard key={e.num} num={e.num} pairs={e.pairs} />)}
        </div>
      )}

      {!planned && (
        <div style={enclosStyles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <div style={{ color: '#6B7280', fontSize: 15 }}>Configurez vos enclos et lancez la planification</div>
        </div>
      )}
    </div>
  );
}

const enclosStyles = {
  plannerBox: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 14, padding: '20px 24px', marginBottom: 20,
  },
  plannerTitle: { fontSize: 13, fontWeight: 600, color: '#E5E7EB', letterSpacing: '0.03em' },
  stepBtn: {
    width: 32, height: 32, borderRadius: 7, border: '1px solid rgba(220,220,230,0.3)',
    background: 'rgba(220,220,230,0.1)', color: '#E5E7EB', fontSize: 18, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  numInput: {
    width: 56, textAlign: 'center', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(220,220,230,0.3)', borderRadius: 7,
    padding: '6px 8px', color: '#F9FAFB', fontSize: 18, fontWeight: 700, outline: 'none',
  },
  planBtn: {
    padding: '10px 24px', borderRadius: 9, border: 'none',
    background: 'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 0 20px rgba(220,220,230,0.4)', letterSpacing: '0.02em',
  },
  summaryBar: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: 'rgba(220,220,230,0.08)', border: '1px solid rgba(220,220,230,0.2)',
    borderRadius: 12, padding: '16px 28px', marginBottom: 20,
  },
  summStat: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', flex: 1 },
  summDivider: { width: 1, height: 40, background: 'rgba(220,220,230,0.2)' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(220,220,230,0.15)',
    borderRadius: 14, overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 12px',
    borderBottom: '1px solid rgba(220,220,230,0.1)',
    background: 'rgba(220,220,230,0.07)',
  },
  cardNum: { fontSize: 14, fontWeight: 700, color: '#E5E7EB' },
  cardMeta: { fontSize: 11, color: '#6B7280' },
  pairCard: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', margin: '6px 6px',
    background: 'rgba(255,255,255,0.025)', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  pairIdx: { fontSize: 10, color: '#27272E', width: 16, textAlign: 'center', fontWeight: 700 },
  pairFem: { display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' },
  pairMal: { display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' },
  pairArrow: { color: '#27272E', fontSize: 14, fontWeight: 700, padding: '0 4px' },
  pairName: { fontSize: 11, color: '#E5E7EB', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pairTarget: { display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  successBadge: {
    padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', color: '#E5E7EB', fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center', padding: '80px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
};

Object.assign(window, { EnclosView });
