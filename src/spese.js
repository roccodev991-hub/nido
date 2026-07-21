// Spese di casa e conti fra voi due.
//
// Due tipi di movimento, nella stessa collezione `movimenti`:
//   spesa    → qualcuno ha pagato qualcosa (per tutti, o solo per sé)
//   rimborso → qualcuno ha dato dei soldi all'altro per pareggiare
//
// Una spesa condivisa si divide sempre a metà; quelle segnate "solo mia"
// restano fuori dal conto. Il saldo è totale, non mensile: le frecce ‹ › servono
// a sfogliare i mesi, ma il numero in cima è il debito vero di oggi.

export const CATEGORIE_SPESA = {
  spesa:      { label: 'Spesa',     icon: 'cart-outline',            colore: '#2E5B3E' },
  bollette:   { label: 'Bollette',  icon: 'flash-outline',           colore: '#B07813' },
  casa:       { label: 'Casa',      icon: 'home-outline',            colore: '#5B4B8A' },
  trasporti:  { label: 'Trasporti', icon: 'car-outline',             colore: '#2F4A78' },
  svago:      { label: 'Svago',     icon: 'glass-wine',              colore: '#A03D22' },
  salute:     { label: 'Salute',    icon: 'medical-bag',             colore: '#1F6E6A' },
  altro:      { label: 'Altro',     icon: 'dots-horizontal',         colore: '#6B7A66' },
};

// Parole che fanno indovinare la categoria mentre scrivi la descrizione.
// Confronto per parola intera, come per i prodotti.
const INDIZI = {
  spesa: ['spesa', 'supermercato', 'conad', 'coop', 'esselunga', 'lidl', 'carrefour',
    'panetteria', 'macellaio', 'fruttivendolo', 'mercato', 'pane', 'frutta'],
  bollette: ['bolletta', 'bollette', 'luce', 'gas', 'acqua', 'internet', 'telefono',
    'wifi', 'enel', 'tari', 'rifiuti', 'condominio', 'netflix', 'spotify', 'abbonamento'],
  casa: ['affitto', 'mutuo', 'detersivi', 'ikea', 'mobili', 'lampadina', 'idraulico',
    'elettricista', 'manutenzione', 'pulizie'],
  trasporti: ['benzina', 'gasolio', 'metro', 'metropolitana', 'autobus', 'bus', 'treno',
    'taxi', 'parcheggio', 'pedaggio', 'autostrada', 'bici', 'monopattino'],
  svago: ['cena', 'pranzo', 'ristorante', 'pizza', 'bar', 'caffè', 'aperitivo', 'cinema',
    'teatro', 'concerto', 'libro', 'libri', 'regalo', 'vacanza', 'viaggio', 'museo'],
  salute: ['farmacia', 'medico', 'dentista', 'visita', 'medicine', 'occhiali', 'analisi'],
};

// Indovina la categoria dalla descrizione ("Spesa Conad" → spesa).
export function categoriaSpesaDi(descrizione) {
  const parole = (descrizione || '').toLowerCase().trim().split(/\s+/);
  for (const [cat, indizi] of Object.entries(INDIZI)) {
    if (parole.some((p) => indizi.includes(p))) return cat;
  }
  return 'altro';
}

// "1.234,50" — come si scrivono i soldi in italiano.
export function euro(importo) {
  const n = Number(importo) || 0;
  const [interi, decimali] = Math.abs(n).toFixed(2).split('.');
  const conPunti = interi.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '−' : ''}${conPunti},${decimali}`;
}

// Legge un importo scritto a mano. Accetta "12,50", "12.50", "€ 8", "1.234,56".
// Il punto è ambiguo in italiano: con la virgola presente è separatore di
// migliaia ("1.234,56"); da solo vale come decimale ("12.50") a meno che non
// separi gruppi di tre cifre ("1.234" = milleduecentotrentaquattro).
export function leggiImporto(testo) {
  const grezzo = (testo || '').trim();
  if (!grezzo || grezzo.includes('-')) return null; // niente importi negativi
  let pulito = grezzo.replace(/[^\d.,]/g, '');
  if (!pulito) return null;

  if (pulito.includes(',')) {
    pulito = pulito.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(pulito)) {
    pulito = pulito.replace(/\./g, '');
  }

  const n = parseFloat(pulito);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

// Quanto ha anticipato ciascuno e quanto è il suo saldo.
//
// Per ogni spesa condivisa: chi paga mette tutto, ma deve solo la sua quota.
// Un rimborso sposta soldi da una persona all'altra senza essere una spesa.
// Saldo positivo = ha dato più di quanto doveva, gli altri gli devono qualcosa.
export function calcolaSaldi(movimenti, membri) {
  const saldo = {};
  const anticipato = {}; // solo le spese condivise: quadra col saldo
  const speso = {};      // tutto quello che è uscito dalle sue tasche
  for (const m of membri) { saldo[m] = 0; anticipato[m] = 0; speso[m] = 0; }

  for (const mov of movimenti || []) {
    const importo = Number(mov.importo) || 0;
    if (importo <= 0) continue;

    if (mov.tipo === 'rimborso') {
      // Chi rimborsa riduce il proprio debito, chi riceve il proprio credito.
      if (mov.pagatoDa in saldo) saldo[mov.pagatoDa] += importo;
      if (mov.a in saldo) saldo[mov.a] -= importo;
      continue;
    }

    if (!(mov.pagatoDa in speso)) continue; // pagata da chi non è più in famiglia
    speso[mov.pagatoDa] += importo;
    if (mov.condivisa === false) continue; // "solo mia": fuori dal conto

    const quota = importo / membri.length;
    anticipato[mov.pagatoDa] += importo;
    saldo[mov.pagatoDa] += importo;
    for (const m of membri) saldo[m] -= quota;
  }

  // Arrotondo ai centesimi: le divisioni lasciano code infinite.
  for (const m of membri) {
    saldo[m] = Math.round(saldo[m] * 100) / 100;
    anticipato[m] = Math.round(anticipato[m] * 100) / 100;
    speso[m] = Math.round(speso[m] * 100) / 100;
  }
  return { saldo, anticipato, speso };
}

// Chi deve dare quanto a chi, detto in una frase. Pensato per due persone:
// con più membri restituisce il debito maggiore, che è quello che conta.
export function chiDeveCosa(saldo, membri) {
  const ordinati = [...membri].sort((a, b) => saldo[a] - saldo[b]);
  const debitore = ordinati[0];
  const creditore = ordinati[ordinati.length - 1];
  const quanto = Math.min(-saldo[debitore], saldo[creditore]);
  // Sotto il centesimo è pari: non ha senso segnalare 0,004 €.
  if (!(quanto > 0.005)) return null;
  return { da: debitore, a: creditore, importo: Math.round(quanto * 100) / 100 };
}

// Totale del mese per categoria, dal più caro al meno caro.
export function perCategoria(movimenti) {
  const per = {};
  for (const m of movimenti || []) {
    if (m.tipo === 'rimborso') continue; // spostare soldi non è spendere
    const c = m.categoria || 'altro';
    per[c] = (per[c] || 0) + (Number(m.importo) || 0);
  }
  return Object.entries(per)
    .map(([chiave, totale]) => ({ chiave, totale }))
    .sort((a, b) => b.totale - a.totale);
}
