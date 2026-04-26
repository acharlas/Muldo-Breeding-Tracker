
// ── Main App Shell ────────────────────────────────────────────────────────

function App() {
  const [view, setView] = React.useState('cascade');

  const views = {
    cascade:    () => React.createElement(CascadeView, null),
    inventaire: () => React.createElement(InventaireView, null),
    enclos:     () => React.createElement(EnclosView, null),
    historique: () => React.createElement(HistoriqueView, null),
  };

  return (
    <div style={appStyles.root}>
      {/* Background grid texture */}
      <div style={appStyles.bgGrid} />

      <Sidebar activeView={view} onNav={setView} />

      <main style={appStyles.main}>
        <div style={appStyles.content}>
          {(views[view] || views['cascade'])()}
        </div>
      </main>
    </div>
  );
}

const appStyles = {
  root: {
    minHeight: '100vh',
    background: '#0A0A0C',
    display: 'flex',
    fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
    color: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrid: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage: `
      linear-gradient(rgba(220,220,230,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(220,220,230,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  },
  main: {
    marginLeft: 220,
    flex: 1,
    overflowY: 'auto',
    position: 'relative',
    zIndex: 1,
    height: '100vh',
  },
  content: {
    padding: '32px 36px',
    maxWidth: 1320,
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
