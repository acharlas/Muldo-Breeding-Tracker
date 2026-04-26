
// ── Muldo Tracker — Mock Data ──────────────────────────────────────────────

const GEN_COLORS = {
  1:  { bg: '#1C1C1E', text: '#6B7280', label: 'Gen 1' },
  2:  { bg: '#1F1F22', text: '#6B7280', label: 'Gen 2' },
  3:  { bg: '#222226', text: '#9CA3AF', label: 'Gen 3' },
  4:  { bg: '#26262B', text: '#9CA3AF', label: 'Gen 4' },
  5:  { bg: '#2A2A30', text: '#D1D5DB', label: 'Gen 5' },
  6:  { bg: '#2E2E35', text: '#D1D5DB', label: 'Gen 6' },
  7:  { bg: '#323239', text: '#E5E7EB', label: 'Gen 7' },
  8:  { bg: '#36363E', text: '#F3F4F6', label: 'Gen 8' },
  9:  { bg: '#3A3A44', text: '#F9FAFB', label: 'Gen 9' },
  10: { bg: '#424250', text: '#FFFFFF', label: 'Gen 10' },
};

const PREFIXES = ['Glo','Ver','Sol','Tor','Kru','Zar','Fre','Pel','Gal','Bri','Vol','Zel',
  'Dar','Cor','Mel','Arz','Vra','Sat','Gol','Dra','Kro','Aur','Ven','Rex','Mog','Del','Eth',
  'Fax','Gil','Hur','Isk','Jov','Lux','Mur','Nex','Osk','Plu','Qin','Ral','Sku','Tri','Urx',
  'Vep','Wul','Xor','Yor','Zep','Alp','Bex','Cru','Dra','Eth','Fal','Griv','Hex','Ilk',
  'Jex','Kral','Luz','Morv','Nalx','Ork','Prax','Riv','Sel','Tov','Ulk','Varn','Wex','Xlor'];
const SUFFIXES = ['pin','vex','orn','drak','thor','mel','kor','gast','phir','mis','sel','corn',
  'max','rix','bas','thar','nix','zel','don','mar','phos','vel','trax','gon','byx','cron',
  'dor','eph','forn','gal','hel','imx','jorn','kral','lux','morn','nel','orx','pral','qual',
  'rox','skel','thorn','urm','vak','wex','xul','yor','zan','phon','bras','ctor','deph','el',
  'fox','gryx','hek','ilon','jax','kron','lor','maxon','nek','opx','por','rix','sion','tor'];

function seededRand(seed) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const STATUS_OPTIONS = ['ok', 'en_cours', 'a_faire'];

function generateSpecies() {
  const species = [];
  let id = 1;
  for (let gen = 1; gen <= 10; gen++) {
    for (let i = 0; i < 12; i++) {
      const seed = gen * 100 + i;
      const pIdx = Math.floor(seededRand(seed) * PREFIXES.length);
      const sIdx = Math.floor(seededRand(seed + 50) * SUFFIXES.length);
      const name = PREFIXES[pIdx] + SUFFIXES[sIdx];
      const statusSeed = seededRand(seed + 77);
      const status = gen <= 3
        ? (statusSeed < 0.6 ? 'ok' : statusSeed < 0.85 ? 'en_cours' : 'a_faire')
        : gen <= 6
        ? (statusSeed < 0.3 ? 'ok' : statusSeed < 0.65 ? 'en_cours' : 'a_faire')
        : (statusSeed < 0.1 ? 'ok' : statusSeed < 0.35 ? 'en_cours' : 'a_faire');
      const target = 2 + gen + Math.floor(seededRand(seed + 13) * 4);
      const femelles = status === 'ok' ? target + Math.floor(seededRand(seed + 21) * 3)
                     : status === 'en_cours' ? Math.floor(seededRand(seed + 21) * target)
                     : Math.floor(seededRand(seed + 21) * 2);
      const males = status === 'ok' ? target + Math.floor(seededRand(seed + 31) * 2)
                  : status === 'en_cours' ? Math.floor(seededRand(seed + 31) * target)
                  : Math.floor(seededRand(seed + 31) * 2);
      const femSterile = Math.floor(seededRand(seed + 41) * 5);
      const malSterile = Math.floor(seededRand(seed + 51) * 4);
      species.push({ id, name, gen, status, target, femelles, males, femSterile, malSterile });
      id++;
    }
  }
  return species;
}

const SPECIES_LIST = generateSpecies();

// Breeding history
const CYCLE_RESULTS = (() => {
  const results = [];
  const speciesNames = SPECIES_LIST.map(s => s.name);
  for (let i = 1; i <= 40; i++) {
    const seed = i * 37;
    const mereIdx = Math.floor(seededRand(seed) * 60);
    const pereIdx = Math.floor(seededRand(seed + 10) * 60);
    const succes = seededRand(seed + 20) < 0.55;
    const childIdx = Math.floor(seededRand(seed + 30) * speciesNames.length);
    const daysAgo = i * 2;
    const d = new Date(2026, 3, 25 - (daysAgo % 90));
    results.push({
      id: i,
      cycle: Math.ceil(i / 5),
      date: d.toLocaleDateString('fr-FR'),
      mere: speciesNames[mereIdx],
      pere: speciesNames[pereIdx],
      resultat: succes ? 'succes' : 'echec',
      enfant: succes ? speciesNames[childIdx] : null,
    });
  }
  return results.reverse();
})();

// Export to window
window.MULDO_DATA = {
  GEN_COLORS,
  SPECIES_LIST,
  CYCLE_RESULTS,
  TOTAL_SPECIES: 120,
  GEN10_GOAL: 50,
};
