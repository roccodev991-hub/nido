// Dove si conserva un prodotto in casa: guida la divisione in sezioni della Dispensa.
// La mappa di partenza viene dalla colonna "Conservazione" del foglio Mangiamo.
import { normalizza } from './catalogo';

export const CONSERVAZIONI = {
  frigo:    { label: 'Frigo',    icon: 'fridge-outline',   ordine: 1 },
  dispensa: { label: 'Dispensa', icon: 'cupboard-outline', ordine: 2 },
  freezer:  { label: 'Freezer',  icon: 'snowflake',        ordine: 3 },
  casa:     { label: 'Casa',     icon: 'spray-bottle',     ordine: 4 },
};

// Classificazione nota (dal tuo Excel).
const NOTI = {
  'acqua': 'dispensa',
  'aglio': 'dispensa',
  'avocado': 'frigo',
  'basilico': 'frigo',
  'broccoli': 'frigo',
  'brodo': 'dispensa',
  'burro': 'frigo',
  'capperi': 'frigo',
  'carne rossa': 'frigo',
  'carote': 'frigo',
  'cavolo': 'frigo',
  'ceci': 'dispensa',
  'cheddar': 'frigo',
  'chipotle': 'dispensa',
  'cicoria': 'frigo',
  'cipolla': 'dispensa',
  'coriandolo': 'dispensa',
  'tortillas': 'dispensa',
  'cous cous': 'dispensa',
  'cumino': 'dispensa',
  'curcuma': 'dispensa',
  'fagioli': 'dispensa',
  'fagioli corona': 'dispensa',
  'farina di ceci': 'dispensa',
  'farro': 'dispensa',
  'fesa di tacchino': 'frigo',
  'formaggio': 'frigo',
  'greens': 'frigo',
  'hamburger': 'frigo',
  'kimchi': 'frigo',
  'lenticchie': 'dispensa',
  'lenticchie rosse': 'dispensa',
  'limone': 'dispensa',
  'macinato': 'frigo',
  'maionese': 'dispensa',
  'manzo': 'frigo',
  'marsala': 'dispensa',
  'melanzana': 'frigo',
  'mustard': 'frigo',
  'pane': 'dispensa',
  'pane grattugiato': 'dispensa',
  'pane vecchio': 'dispensa',
  'parmigiano': 'frigo',
  'pasta': 'dispensa',
  'patata dolce': 'dispensa',
  'patate': 'dispensa',
  'pepe': 'dispensa',
  'peperoncino': 'dispensa',
  'peperoni': 'frigo',
  'pesce': 'frigo',
  'pesto': 'frigo',
  'pollo': 'frigo',
  'pomodorini': 'dispensa',
  'porro': 'frigo',
  'prezzemolo': 'frigo',
  'ravioli cinesi': 'freezer',
  'riso': 'dispensa',
  'rosmarino': 'dispensa',
  'sale': 'dispensa',
  'salsa di soia': 'frigo',
  'salsiccia': 'frigo',
  'sedano': 'frigo',
  'sgombro': 'dispensa',
  // travaso 2026-07
  'tempeh': 'frigo',            // fresco, va in frigo anche se sta col reparto dispensa
  'pesce surgelato': 'freezer', // vostra correzione dall'app
  // ampliamento 2026-07: freschi che il reparto dispensa manderebbe allo scaffale
  'tofu': 'frigo',
  'pasta sfoglia': 'frigo',
  'pasta frolla': 'frigo',
  'burro di arachidi': 'dispensa', // la parola "burro" lo manderebbe in frigo
  'spaghetti': 'dispensa',
  'stracchino': 'frigo',
  'sugo': 'dispensa',
  'tacchino': 'frigo',
  'temphe': 'dispensa',
  'toast': 'dispensa',
  'tomato paste': 'dispensa',
  'tonno': 'dispensa',
  'uova': 'frigo',
  'vino bianco': 'frigo',
  'yogurt greco': 'frigo',
  'zenzero': 'dispensa',
  'zucchine': 'frigo',
};

// Ripiego quando il prodotto non è tra quelli noti: si deduce dal reparto.
const DA_REPARTO = {
  'frutta-verdura': 'frigo',
  'carne-pesce': 'frigo',
  latticini: 'frigo',
  'pane-forno': 'dispensa',
  dispensa: 'dispensa',
  colazione: 'dispensa',
  bevande: 'dispensa',
  casa: 'casa',
  altro: 'dispensa',
};

// Dove va conservato un prodotto: prima i noti, poi il reparto, infine dispensa.
//
// Il reparto "casa" ha la precedenza sul riconoscimento per parola: un prodotto
// del reparto casa non è mai un alimento, e senza questa regola "sale per
// lavastoviglie" finirebbe in dispensa perché contiene la parola "sale"
// (stessa trappola di "mela" dentro "melanzana").
export function conservazioneDi(nome, categoria) {
  const n = normalizza(nome || '');
  if (NOTI[n]) return NOTI[n];
  if (categoria === 'casa') return 'casa';
  for (const parola of n.split(' ')) {
    if (NOTI[parola]) return NOTI[parola];
  }
  return DA_REPARTO[categoria] || 'dispensa';
}

// Raggruppa i prodotti della dispensa per sezione (per SectionList).
export function raggruppaPerConservazione(prodotti, conservazionePer) {
  const gruppi = {};
  for (const p of prodotti) {
    const c = p.conservazione && CONSERVAZIONI[p.conservazione]
      ? p.conservazione
      : conservazionePer(p.nome, p.categoria);
    (gruppi[c] = gruppi[c] || []).push(p);
  }
  return Object.keys(gruppi)
    .sort((a, b) => CONSERVAZIONI[a].ordine - CONSERVAZIONI[b].ordine)
    .map((c) => ({
      key: c,
      label: CONSERVAZIONI[c].label,
      icon: CONSERVAZIONI[c].icon,
      data: gruppi[c],
    }));
}
