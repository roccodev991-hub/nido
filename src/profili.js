// Come si consuma un prodotto in dispensa. Non parliamo mai di "scadenza"
// (l'app non sa se qualcosa è andato a male): stimiamo soltanto quando l'hai
// finito.
//
// Due modi di finire:
//   fresco  → un tot di pasti pianificati lo esauriscono, oppure il tempo.
//             Diventa «Consumato». `pasti: 0` = il menu non lo tocca (frutta,
//             scorta fresca di casa): esce solo per tempo trascorso.
//   scorta  → non finisce con un pasto; cala poco a poco. Diventa «Poco»
//             quando l'app stima che stia calando (vedi DispensaScreen).
//
// La classificazione sta qui, nel codice, come il resto della conoscenza di
// partenza (catalogo, conservazione). L'utente non la sceglie più a mano.
import { normalizza } from './catalogo';

// Freschi noti: nome → { pasti, giorni }.
//   pasti  quanti pasti pianificati lo finiscono (0 = il menu lo ignora)
//   giorni rete di sicurezza: esce comunque dopo tanti giorni dall'acquisto
const FRESCHI = {
  // — Verdura da piatto: un pasto la finisce —
  zucchine: { pasti: 1, giorni: 10 }, zucchina: { pasti: 1, giorni: 10 },
  melanzane: { pasti: 1, giorni: 10 }, melanzana: { pasti: 1, giorni: 10 },
  broccoli: { pasti: 1, giorni: 10 },
  funghi: { pasti: 1, giorni: 10 },
  peperoni: { pasti: 1, giorni: 10 }, peperone: { pasti: 1, giorni: 10 },
  finocchi: { pasti: 1, giorni: 10 }, finocchio: { pasti: 1, giorni: 10 },

  // — Verdura che dura qualche giorno: due pasti —
  cicoria: { pasti: 2, giorni: 14 }, cicorie: { pasti: 2, giorni: 14 },
  insalata: { pasti: 2, giorni: 14 }, lattuga: { pasti: 2, giorni: 14 },
  cavolo: { pasti: 2, giorni: 14 },
  pomodori: { pasti: 2, giorni: 14 }, pomodoro: { pasti: 2, giorni: 14 },
  pomodorini: { pasti: 2, giorni: 14 },
  sedano: { pasti: 2, giorni: 14 },
  bietole: { pasti: 2, giorni: 14 },
  porri: { pasti: 2, giorni: 14 }, porro: { pasti: 2, giorni: 14 },
  spinaci: { pasti: 2, giorni: 14 },
  asparagi: { pasti: 2, giorni: 14 },
  'verdure a foglia': { pasti: 2, giorni: 14 },

  // — Erbe: un pizzico basta a un pasto, ma vanno male in fretta —
  basilico: { pasti: 1, giorni: 7 }, prezzemolo: { pasti: 1, giorni: 7 },

  // — Scorta fresca di casa: il menu non la tocca, dura a lungo —
  patate: { pasti: 0, giorni: 30 }, patata: { pasti: 0, giorni: 30 },
  'patata dolce': { pasti: 0, giorni: 30 },
  cipolla: { pasti: 0, giorni: 30 }, cipolle: { pasti: 0, giorni: 30 },
  aglio: { pasti: 0, giorni: 30 },
  carote: { pasti: 0, giorni: 30 }, carota: { pasti: 0, giorni: 30 },
  zucca: { pasti: 0, giorni: 30 },
  limone: { pasti: 0, giorni: 30 }, limoni: { pasti: 0, giorni: 30 },
  arance: { pasti: 0, giorni: 30 }, arancia: { pasti: 0, giorni: 30 },
  mandarini: { pasti: 0, giorni: 30 }, clementine: { pasti: 0, giorni: 30 },
  zenzero: { pasti: 0, giorni: 30 },

  // — Frutta da mangiare: il menu la ignora, esce a tempo —
  fragole: { pasti: 0, giorni: 6 }, fragola: { pasti: 0, giorni: 6 },
  pesche: { pasti: 0, giorni: 6 }, pesca: { pasti: 0, giorni: 6 },
  albicocche: { pasti: 0, giorni: 6 },
  ciliegie: { pasti: 0, giorni: 6 },
  uva: { pasti: 0, giorni: 6 },
  banane: { pasti: 0, giorni: 6 }, banana: { pasti: 0, giorni: 6 },
  avocado: { pasti: 0, giorni: 6 },
  melone: { pasti: 0, giorni: 6 }, anguria: { pasti: 0, giorni: 6 },
  mele: { pasti: 0, giorni: 20 }, mela: { pasti: 0, giorni: 20 },
  pere: { pasti: 0, giorni: 20 }, pera: { pasti: 0, giorni: 20 },
  kiwi: { pasti: 0, giorni: 20 },
  frutta: { pasti: 0, giorni: 10 }, // generico: il menu non la tocca

  // — Latticini freschi da piatto: un pasto li finisce —
  mozzarella: { pasti: 1, giorni: 10 },
  ricotta: { pasti: 1, giorni: 10 },
  panna: { pasti: 1, giorni: 10 },

  // — Latticini freschi da colazione/spuntino: solo a tempo —
  latte: { pasti: 0, giorni: 10 },
  yogurt: { pasti: 0, giorni: 12 }, 'yogurt greco': { pasti: 0, giorni: 12 },
  stracchino: { pasti: 0, giorni: 10 },
  philadelphia: { pasti: 0, giorni: 10 },
  mascarpone: { pasti: 0, giorni: 10 },
  scamorza: { pasti: 0, giorni: 10 },
  provola: { pasti: 0, giorni: 10 },
};

// Salumi e conserve: stanno nel reparto carne/pesce ma durano come scorte.
const CONSERVATI = [
  'tonno', 'prosciutto', 'salame', 'bresaola', 'speck', 'mortadella', 'wurstel',
  'salumi', 'affettati', // generici
];

// Confronto per parola intera: evita che "mela" corrisponda a "melanzana".
function contieneParola(nome, lista) {
  const n = normalizza(nome || '');
  if (lista.includes(n)) return true;
  return n.split(' ').some((p) => lista.includes(p));
}

// Come si consuma un prodotto. Ritorna:
//   { tipo: 'fresco', pasti, giorni }  oppure  { tipo: 'scorta' }
// Prima i freschi noti, poi un default ragionevole dal reparto.
export function consumoDi(nome, categoria) {
  const n = normalizza(nome || '');
  if (FRESCHI[n]) return { tipo: 'fresco', ...FRESCHI[n] };
  for (const parola of n.split(' ')) {
    if (FRESCHI[parola]) return { tipo: 'fresco', ...FRESCHI[parola] };
  }

  if (categoria === 'carne-pesce') {
    // Carne e pesce freschi: un pasto li finisce. Salumi e scatolame no.
    if (contieneParola(n, CONSERVATI)) return { tipo: 'scorta' };
    return { tipo: 'fresco', pasti: 1, giorni: 4 };
  }
  if (categoria === 'frutta-verdura') {
    // Verdura non nota: la tratto come "da piatto" media.
    return { tipo: 'fresco', pasti: 2, giorni: 14 };
  }
  // Latticini non noti (formaggi stagionati), dispensa, pane, bevande, casa:
  // tutto scorta, cala poco a poco.
  return { tipo: 'scorta' };
}

// Data di riferimento di un prodotto in dispensa (acquisto, o inserimento).
export function dataRiferimento(item) {
  const ts = item.compratoIl || item.creato;
  return ts && ts.toDate ? ts.toDate().getTime() : null;
}
