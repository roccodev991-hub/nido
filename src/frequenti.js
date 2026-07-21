// Storico "comprati spesso" + categorie imparate.
// Ogni prodotto acquistato incrementa un contatore e ricorda il suo reparto.
// Documenti: famiglie/{fid}/frequenti/{nomeNormalizzato}
import { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, setDoc, getDoc, onSnapshot, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizza, categoriaDi, CATEGORIE } from './catalogo';
import { conservazioneDi, CONSERVAZIONI } from './conservazione';
import { profiloDi, PROFILI } from './profili';

export function frequentiRef(famigliaId) {
  return collection(db, 'famiglie', famigliaId, 'frequenti');
}

// Punto unico per capire il reparto di un prodotto, usato da tutte le schermate:
// prima ciò che l'app ha imparato dalle tue correzioni, poi il catalogo di base.
// Restituisce anche i "frequenti" grezzi (servono a suggerimenti e comprati spesso).
export function useCategorie(famigliaId) {
  const [frequenti, setFrequenti] = useState([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!famigliaId) return undefined;
    setPronto(false);
    return onSnapshot(frequentiRef(famigliaId), (snap) => {
      setFrequenti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPronto(true);
    });
  }, [famigliaId]);

  const mappa = useMemo(() => {
    const m = new Map();
    for (const f of frequenti) m.set(normalizza(f.nome), f);
    return m;
  }, [frequenti]);

  const categoriaPer = useMemo(() => (nome) => {
    const f = mappa.get(normalizza(nome || ''));
    if (f && f.categoria && CATEGORIE[f.categoria]) return f.categoria;
    return categoriaDi(nome || '');
  }, [mappa]);

  // Dove si conserva: prima la tua correzione, poi la classificazione di partenza.
  const conservazionePer = useMemo(() => (nome, categoria) => {
    const f = mappa.get(normalizza(nome || ''));
    if (f && f.conservazione && CONSERVAZIONI[f.conservazione]) return f.conservazione;
    return conservazioneDi(nome || '', categoria);
  }, [mappa]);

  // Come si consuma: prima la tua correzione, poi il profilo di partenza.
  const profiloPer = useMemo(() => (nome, categoria) => {
    const f = mappa.get(normalizza(nome || ''));
    if (f && f.profilo && PROFILI[f.profilo]) return f.profilo;
    return profiloDi(nome || '', categoria);
  }, [mappa]);

  return {
    frequenti, pronto, categoriaPer, conservazionePer, profiloPer,
  };
}

// Id documento sicuro (Firestore non ammette '/').
function idDa(nome) {
  return normalizza(nome).replace(/[/\\.#$[\]]/g, '-');
}

// Registra un acquisto: +1 al contatore, memorizza il reparto e — soprattutto —
// impara ogni volta il tuo intervallo di riacquisto (media dei giorni tra un
// acquisto e il successivo). È questo che col tempo sostituisce ogni stima.
export async function registraAcquisto(famigliaId, item) {
  const id = idDa(item.nome);
  if (!id) return;
  const ref = doc(db, 'famiglie', famigliaId, 'frequenti', id);

  let imparato = {};
  try {
    const snap = await getDoc(ref);
    const dati = snap.exists() ? snap.data() : null;
    if (dati && dati.ultimo && dati.ultimo.toDate) {
      const giorni = (Date.now() - dati.ultimo.toDate().getTime()) / 86400000;
      // scarto i doppioni dello stesso giorno e le pause troppo lunghe
      if (giorni >= 1 && giorni <= 365) {
        const n = dati.intervalliVisti || 0;
        const media = dati.intervalloMedio || giorni;
        imparato = {
          intervalloMedio: (media * n + giorni) / (n + 1),
          intervalliVisti: n + 1,
        };
      }
    }
  } catch (e) {
    // se la lettura fallisce registro comunque l'acquisto
  }

  await setDoc(
    ref,
    {
      nome: item.nome,
      categoria: item.categoria || 'altro',
      conteggio: increment(1),
      ultimo: serverTimestamp(),
      ...imparato,
    },
    { merge: true },
  );
}

// Memorizza il reparto scelto a mano, così la prossima volta è già giusto.
export async function imparaCategoria(famigliaId, nome, categoria) {
  const id = idDa(nome);
  if (!id) return;
  await setDoc(
    doc(db, 'famiglie', famigliaId, 'frequenti', id),
    { nome, categoria },
    { merge: true },
  );
}

// Memorizza dove si conserva un prodotto (frigo, dispensa, freezer, casa).
export async function imparaConservazione(famigliaId, nome, conservazione) {
  const id = idDa(nome);
  if (!id) return;
  await setDoc(
    doc(db, 'famiglie', famigliaId, 'frequenti', id),
    { nome, conservazione },
    { merge: true },
  );
}

// Memorizza come si consuma un prodotto (monouso, graduale, scorta).
export async function imparaProfilo(famigliaId, nome, profilo) {
  const id = idDa(nome);
  if (!id) return;
  await setDoc(
    doc(db, 'famiglie', famigliaId, 'frequenti', id),
    { nome, profilo },
    { merge: true },
  );
}
