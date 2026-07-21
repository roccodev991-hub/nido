import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useDialog } from '../components/Dialog';
import { colors, radius, font, fonts } from '../theme';

// Traduzione degli errori Firebase più comuni
function messaggioErrore(code) {
  const mappa = {
    'auth/invalid-email': 'Email non valida.',
    'auth/user-not-found': 'Nessun account con questa email.',
    'auth/wrong-password': 'Password sbagliata.',
    'auth/invalid-credential': 'Email o password sbagliata.',
    'auth/email-already-in-use': 'Esiste già un account con questa email.',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
  };
  return mappa[code] || 'Qualcosa è andato storto. Riprova.';
}

export default function LoginScreen() {
  const dialog = useDialog();
  const [registrazione, setRegistrazione] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  async function invia() {
    if (!email || !password || (registrazione && !nome.trim())) {
      dialog({
        title: 'Campi mancanti',
        message: 'Compila tutti i campi per continuare.',
      });
      return;
    }
    setCaricamento(true);
    try {
      if (registrazione) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: nome.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Da qui in poi ci pensa il listener in App.js
    } catch (e) {
      dialog({ title: 'Ops', message: messaggioErrore(e.code) });
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.logo}>
        <MaterialCommunityIcons name="home-heart" size={40} color={colors.green} />
      </View>
      <Text style={font.title}>Nido</Text>
      <Text style={s.slogan}>La casa che tenete insieme.</Text>

      <View style={s.card}>
        {registrazione && (
          <TextInput
            style={s.input}
            placeholder="Il tuo nome (es. Marco)"
            placeholderTextColor={colors.inkSoft}
            value={nome}
            onChangeText={setNome}
          />
        )}
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.inkSoft}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={s.btn}
          onPress={invia}
          disabled={caricamento}
          activeOpacity={0.8}
        >
          <Text style={s.btnTxt}>
            {caricamento ? 'Un attimo…' : registrazione ? 'Crea account' : 'Entra'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setRegistrazione(!registrazione)}>
        <Text style={s.switch}>
          {registrazione
            ? 'Hai già un account? Entra'
            : 'Prima volta qui? Crea un account'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  logo: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  slogan: {
    fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft,
    marginTop: 4, marginBottom: 26,
  },
  card: {
    width: '100%', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, padding: 18,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    padding: 14, marginBottom: 12, fontSize: 16, color: colors.ink,
    fontFamily: fonts.regular,
  },
  btn: {
    backgroundColor: colors.green,
    borderRadius: radius.pill, padding: 15, alignItems: 'center', marginTop: 4,
  },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontFamily: fonts.semibold },
  switch: {
    marginTop: 22, color: colors.green, fontFamily: fonts.medium, fontSize: 14,
  },
});
