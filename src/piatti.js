// Ricettario (piatti) e menu della settimana su Firestore.
// Un piatto = un documento con dentro i suoi ingredienti (NoSQL: niente join).
import {
  collection, doc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizza } from './catalogo';
import { PIATTI_SEED } from './piattiSeed';

export function piattiRef(famigliaId) {
  return collection(db, 'famiglie', famigliaId, 'piatti');
}

export function menuRef(famigliaId) {
  return collection(db, 'famiglie', famigliaId, 'menu');
}

// ── Attributi di un piatto ───────────────────────────────────────────────
// Valori fissi, così "Proponi" può ragionarci sopra (i tag liberi invece
// servono solo a te per organizzare e cercare).
export const OCCASIONI = [
  { key: 'sempre', label: 'Sempre' },
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
];
export const TIPI = [
  { key: 'carne', label: 'Carne' },
  { key: 'pesce', label: 'Pesce' },
  { key: 'veg', label: 'Vegetariano' },
  { key: 'altro', label: 'Altro' },
];
export const IMPEGNI = [
  { key: 'veloce', label: 'Veloce' },
  { key: 'normale', label: 'Normale' },
  { key: 'elaborato', label: 'Elaborato' },
];
export const STAGIONI = [
  { key: 'sempre', label: 'Sempre' },
  { key: 'estate', label: 'Estate' },
  { key: 'inverno', label: 'Inverno' },
];

const PAROLE_PESCE = [
  'pesce', 'tonno', 'salmone', 'merluzzo', 'alici', 'gamberi', 'sgombro',
  'vongole', 'calamari', 'platessa', 'branzino', 'orata', 'baccala', 'baccalà',
];
const PAROLE_CARNE = [
  'pollo', 'manzo', 'maiale', 'tacchino', 'carne', 'macinato', 'hamburger',
  'salsiccia', 'salsicce', 'prosciutto', 'speck', 'bresaola', 'mortadella',
  'salame', 'vitello', 'wurstel', 'cotolette', 'agnello',
];

// Deduce il tipo di un piatto leggendo i suoi ingredienti.
export function deduciTipo(ingredienti) {
  const nomi = (ingredienti || []).map((i) => normalizza(i.nome || ''));
  const contiene = (lista) => nomi.some((n) => lista.some((p) => n.includes(p)));
  if (contiene(PAROLE_PESCE)) return 'pesce';
  if (contiene(PAROLE_CARNE)) return 'carne';
  if (nomi.length === 0) return 'altro';
  return 'veg';
}

// Stagione in corso (serve a Proponi per scartare i piatti fuori stagione).
export function stagioneCorrente(data = new Date()) {
  const m = data.getMonth(); // 0 = gennaio
  return m >= 4 && m <= 8 ? 'estate' : 'inverno'; // maggio–settembre
}

// Assegna il tipo dedotto ai piatti che non ce l'hanno ancora.
export async function deduciTipiMancanti(famigliaId, piatti) {
  const daFare = (piatti || []).filter((p) => !p.tipo);
  if (daFare.length === 0) return 0;
  const batch = writeBatch(db);
  for (const p of daFare) {
    batch.update(doc(piattiRef(famigliaId), p.id), { tipo: deduciTipo(p.ingredienti) });
  }
  await batch.commit();
  return daFare.length;
}

// Importa i piatti di esempio nel ricettario della famiglia (una tantum).
export async function importaPiattiSeed(famigliaId) {
  const batch = writeBatch(db);
  for (const p of PIATTI_SEED) {
    // Il seed ora arriva dal ricettario vero della famiglia: dove sa già
    // tipo, impegno o stagione si tiene il suo, non si azzera.
    batch.set(doc(piattiRef(famigliaId)), {
      nome: p.nome,
      occasione: (p.occasione || 'sempre').toLowerCase(),
      tipo: p.tipo || deduciTipo(p.ingredienti),
      impegno: p.impegno || null,
      stagione: p.stagione || 'sempre',
      tags: p.tags || [],
      ingredienti: p.ingredienti || [],
      creato: serverTimestamp(),
    });
  }
  await batch.commit();
}
