// Come si consuma un prodotto. Non parliamo mai di "scadenza" (l'app non sa
// se qualcosa è andato a male): stimiamo soltanto quando l'hai finito.
//
//  monouso  → un pasto lo finisce (carne, pesce)   → diventa "Consumato"
//  graduale → lo finisci in pochi giorni (frutta)  → diventa "Consumato"
//  scorta   → cala poco a poco (pasta, scatolame)  → diventa "Poco"
import { normalizza } from './catalogo';

export const PROFILI = {
  monouso: {
    label: 'Monouso',
    nota: 'un pasto lo finisce · carne, pesce',
  },
  graduale: {
    label: 'Graduale',
    nota: 'lo finisci in pochi giorni · frutta, verdura',
  },
  scorta: {
    label: 'Scorta',
    nota: 'dura a lungo e cala poco a poco · pasta, scatolame',
  },
};

// Dopo quanti giorni si stima che l'abbiate finito (solo per i freschi).
const GIORNI_MONOUSO = 4;
const GIORNI_GRADUALE = 14;
const GIORNI_LUNGA_DURATA = 30;

// Ortaggi e frutta che durano molto più a lungo del resto del fresco.
const LUNGA_DURATA = [
  'patate', 'patata', 'cipolla', 'cipolle', 'aglio', 'carote', 'carota',
  'zucca', 'mela', 'mele', 'limone', 'limoni', 'arancia', 'arance',
];

// Salumi e conserve: stanno nel reparto carne/pesce ma durano come scorte.
const CONSERVATI = [
  'tonno', 'prosciutto', 'salame', 'bresaola', 'speck', 'mortadella', 'wurstel',
];

// Freschi che il reparto classificherebbe come scorta ma che si finiscono in
// pochi giorni. Il latte arriva dal travaso: correzione fatta dall'app.
const GRADUALI = [
  'latte', 'panna', 'ricotta', 'mozzarella', 'yogurt',
];

// Confronto per parola intera: evita che "mela" corrisponda a "melanzana".
function contieneParola(nome, lista) {
  const n = normalizza(nome || '');
  if (lista.includes(n)) return true;
  return n.split(' ').some((p) => lista.includes(p));
}

// Profilo di partenza, dedotto dal reparto (con le dovute eccezioni).
export function profiloDi(nome, categoria) {
  if (contieneParola(nome, CONSERVATI)) return 'scorta';
  if (contieneParola(nome, GRADUALI)) return 'graduale';
  if (categoria === 'carne-pesce') return 'monouso';
  if (categoria === 'frutta-verdura') return 'graduale';
  return 'scorta';
}

// Giorni stimati prima di considerarlo finito (null = le scorte non si consumano da sole).
export function giorniDi(nome, profilo) {
  if (profilo === 'monouso') return GIORNI_MONOUSO;
  if (profilo === 'graduale') {
    return contieneParola(nome, LUNGA_DURATA) ? GIORNI_LUNGA_DURATA : GIORNI_GRADUALE;
  }
  return null;
}

// Data di riferimento di un prodotto in dispensa (acquisto, o inserimento).
export function dataRiferimento(item) {
  const ts = item.compratoIl || item.creato;
  return ts && ts.toDate ? ts.toDate().getTime() : null;
}
