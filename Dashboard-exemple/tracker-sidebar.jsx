
// ── Sidebar Navigation ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'cascade',    icon: '📊', label: 'Cascade' },
  { id: 'inventaire', icon: '🗃️', label: 'Inventaire' },
  { id: 'enclos',     icon: '🏠', label: 'Enclos' },
  { id: 'historique', icon: '📜', label: 'Historique' },
];

function Sidebar({ activeView, onNav }) {
  const { SPECIES_LIST } = window.MULDO_DATA;
  const owned = SPECIES_LIST.filter(s => s.status === 'ok').length;
  const inProgress = SPECIES_LIST.filter(s => s.status === 'en_cours').length;

  return (
    <aside style={sidebarStyles.aside}>
      {/* Logo */}
      <div style={sidebarStyles.logo}>
        <div style={sidebarStyles.logoIcon}>M</div>
        <div>
          <div style={sidebarStyles.logoTitle}>Muldo</div>
          <div style={sidebarStyles.logoSub}>Breeding Tracker</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={sidebarStyles.nav}>
        <div style={sidebarStyles.navLabel}>Navigation</div>
        {NAV_ITEMS.map(item => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                ...sidebarStyles.navItem,
                ...(active ? sidebarStyles.navItemActive : {}),
              }}
            >
              <span style={sidebarStyles.navIcon}>{item.icon}</span>
              <span style={sidebarStyles.navText}>{item.label}</span>
              {active && <div style={sidebarStyles.navIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* Quick stats */}
      <div style={sidebarStyles.quickStats}>
        <div style={sidebarStyles.statRow}>
          <span style={sidebarStyles.statDot('#E5E7EB')} />
          <span style={sidebarStyles.statLabel}>Terminées</span>
          <span style={sidebarStyles.statVal}>{owned}</span>
        </div>
        <div style={sidebarStyles.statRow}>
          <span style={sidebarStyles.statDot('#9CA3AF')} />
          <span style={sidebarStyles.statLabel}>En cours</span>
          <span style={sidebarStyles.statVal}>{inProgress}</span>
        </div>
        <div style={sidebarStyles.statRow}>
          <span style={sidebarStyles.statDot('#374151')} />
          <span style={sidebarStyles.statLabel}>À faire</span>
          <span style={sidebarStyles.statVal}>{120 - owned - inProgress}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={sidebarStyles.footer}>
        <div style={sidebarStyles.footerText}>v1.0.0</div>
      </div>
    </aside>
  );
}

const sidebarStyles = {
  aside: {
    width: 220,
    minWidth: 220,
    background: 'rgba(10,10,12,0.98)',
    borderRight: '1px solid rgba(220,220,230,0.2)',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(220,220,230,0.15)',
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #E5E7EB, #1C1C22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 0 16px rgba(220,220,230,0.4)',
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#F9FAFB',
    letterSpacing: '0.02em',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: 10,
    color: '#6B7280',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  nav: {
    padding: '20px 12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLabel: {
    fontSize: 10,
    color: '#27272E',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '0 8px 10px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 500,
    width: '100%',
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    background: 'rgba(220,220,230,0.15)',
    color: '#E5E7EB',
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navText: { flex: 1 },
  navIndicator: {
    width: 3,
    height: 16,
    borderRadius: 2,
    background: '#E5E7EB',
    position: 'absolute',
    right: 0,
  },
  quickStats: {
    margin: '0 12px 12px',
    padding: '14px',
    background: 'rgba(220,220,230,0.06)',
    borderRadius: 10,
    border: '1px solid rgba(220,220,230,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
  },
  statDot: (color) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    display: 'inline-block',
  }),
  statLabel: { flex: 1, color: '#6B7280' },
  statVal: { color: '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  footer: {
    padding: '14px 20px',
    borderTop: '1px solid rgba(220,220,230,0.1)',
  },
  footerText: { fontSize: 11, color: '#27272E' },
};

Object.assign(window, { Sidebar });
