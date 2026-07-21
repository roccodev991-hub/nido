// ============================================================
// CONFIGURAZIONE FIREBASE (condivisa fra app nativa e web)
// La trovi su: console.firebase.google.com
//   → il tuo progetto → ⚙️ Impostazioni progetto → Le tue app
//   → aggiungi un'app Web (</>) → copia "firebaseConfig"
//
// Sta in un file a parte perché l'inizializzazione è diversa
// per piattaforma (vedi firebase.js e firebase.web.js): i valori
// però sono gli stessi, e vanno scritti una volta sola.
// ============================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyBRud_jjM-hCl4cceF2BTc85gYSJj8kU_E',
  authDomain: 'spesa-famiglia-c15e2.firebaseapp.com',
  projectId: 'spesa-famiglia-c15e2',
  storageBucket: 'spesa-famiglia-c15e2.firebasestorage.app',
  messagingSenderId: '651582350560',
  appId: '1:651582350560:web:adf14651d10afa0cb9dc85',
};
