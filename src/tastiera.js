// Come compensare la tastiera nei modali con campi di testo.
//
// Il problema ha due facce opposte:
//   - nelle BUILD NATIVE (APK, edge-to-edge di SDK 54) Android non
//     ridimensiona più la finestra: senza compensazione la tastiera copre
//     i campi in basso;
//   - su EXPO GO la finestra si ridimensiona da sola: compensare DI NUOVO
//     fa salire il form il doppio e non vedi più quello che scrivi.
// Quindi: KeyboardAvoidingView con "padding" ovunque TRANNE che su Expo Go
// Android, dove si lascia fare al sistema.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const expoGo = Constants.appOwnership === 'expo';

export const COMPENSA_TASTIERA = (Platform.OS === 'android' && expoGo)
  ? undefined
  : 'padding';
