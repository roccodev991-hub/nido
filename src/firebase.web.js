// ============================================================
// FIREBASE — versione per il browser (web app / PWA).
// Metro sceglie questo file al posto di `firebase.js` quando compila
// per web, e lo ignora del tutto quando compila per Android.
//
// Differenza unica: la persistenza del login. Su nativo si usa
// AsyncStorage; qui `browserLocalPersistence`, cioè il localStorage
// del browser — così la sessione sopravvive al refresh della pagina
// e alla chiusura della scheda. Senza, ogni ricarica riporta al login.
// ============================================================
import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

export const db = getFirestore(app);
