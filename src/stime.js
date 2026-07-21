// Stime iniziali di quanto dura una scorta prima di finire.
// Sono solo impalcature: appena l'app vede due riacquisti dello stesso prodotto
// usa il TUO ritmo reale e butta via questi numeri.
import { normalizza } from './catalogo';

// Dopo quanti pasti pianificati che lo usano una scorta si considera in esaurimento.
export const SOGLIA_USI = 6;

// Giorni stimati per i prodotti più comuni (per due persone).
const PER_PRODOTTO = {
  pane: 3,
  latte: 5,
  yogurt: 7,
  acqua: 7,
  uova: 14,
  biscotti: 14,
  vino: 14,
  pasta: 14,
  prosciutto: 7,
  salame: 10,
  mozzarella: 7,
  caffe: 21,
  caffè: 21,
  formaggio: 21,
  parmigiano: 30,
  cereali: 21,
  birra: 21,
  passata: 21,
  pelati: 21,
  sugo: 21,
  'carta igienica': 21,
  scottex: 21,
  burro: 30,
  tonno: 30,
  marmellata: 42,
  detersivo: 42,
  riso: 42,
  olio: 60,
  farina: 60,
  zucchero: 60,
  shampoo: 60,
  dentifricio: 60,
  sale: 180,
};

// Ripiego per reparto, quando il prodotto non è nell'elenco sopra.
const PER_REPARTO = {
  latticini: 14,
  bevande: 14,
  'pane-forno': 21,
  colazione: 28,
  dispensa: 42,
  casa: 42,
  'carne-pesce': 14,
  altro: 30,
};

// Giorni stimati prima che una scorta sia da ricomprare.
export function stimaGiorni(nome, categoria) {
  const n = normalizza(nome || '');
  if (PER_PRODOTTO[n]) return PER_PRODOTTO[n];
  for (const parola of n.split(' ')) {
    if (PER_PRODOTTO[parola]) return PER_PRODOTTO[parola];
  }
  return PER_REPARTO[categoria] || 30;
}
