// Esporta la "conoscenza" accumulata dalla famiglia: le correzioni imparate
// (reparto, sezione, profilo, ritmi di riacquisto) e il ricettario.
// Serve come backup e per travasare questi dati nei default dell'app.
import { getDocs } from 'firebase/firestore';
import { piattiRef } from './piatti';
import { frequentiRef } from './frequenti';

// I Timestamp di Firestore non sono serializzabili: li rendo date leggibili.
function pulisci(dati) {
  const out = {};
  for (const [k, v] of Object.entries(dati)) {
    out[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
  }
  return out;
}

export async function raccogliDati(famigliaId) {
  const [fSnap, pSnap] = await Promise.all([
    getDocs(frequentiRef(famigliaId)),
    getDocs(piattiRef(famigliaId)),
  ]);
  return {
    esportatoIl: new Date().toISOString(),
    frequenti: fSnap.docs.map((d) => pulisci(d.data())),
    piatti: pSnap.docs.map((d) => pulisci(d.data())),
  };
}
