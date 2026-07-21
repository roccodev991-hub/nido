// ============================================================
// FIREBASE — versione per l'app nativa (Android/iOS con Expo Go).
// Su web Metro carica al suo posto `firebase.web.js`: i due file
// non si vedono mai a vicenda, quindi il bundle Android non contiene
// una riga di codice per il browser (e viceversa).
// La configurazione, uguale per tutti, sta in `firebaseConfig.js`.
// ============================================================
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

const app = initializeApp(firebaseConfig);

// Auth con persistenza: resti loggato anche chiudendo l'app
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
