import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, setDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useDialog } from '../components/Dialog';
import { colors, radius, font, fonts } from '../theme';

// Genera un codice invito leggibile, es. "PANE-42"
function generaCodice() {
  const parole = ['PANE', 'MELA', 'UOVA', 'RISO', 'PERA', 'KIWI', 'MIELE', 'TONNO'];
  const p = parole[Math.floor(Math.random() * parole.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${p}-${n}`;
}

export default function FamigliaScreen({ onFamiglia }) {
  const dialog = useDialog();
  const [nomeFamiglia, setNomeFamiglia] = useState('');
  const [codice, setCodice] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const uid = auth.currentUser.uid;

  async function collega(famigliaId) {
    await setDoc(doc(db, 'utenti', uid), { famigliaId }, { merge: true });
    onFamiglia(famigliaId);
  }

  async function crea() {
    if (!nomeFamiglia.trim()) {
      dialog({
        title: 'Manca il nome',
        message: 'Dai un nome alla famiglia, es. "Casa Rossi".',
      });
      return;
    }
    setCaricamento(true);
    try {
      const ref = await addDoc(collection(db, 'famiglie'), {
        nome: nomeFamiglia.trim(),
        codice: generaCodice(),
        membri: [uid],
        membriNomi: { [uid]: auth.currentUser.displayName || 'Membro' },
        creato: serverTimestamp(),
      });
      await collega(ref.id);
    } catch (e) {
      dialog({
        title: 'Ops',
        message: 'Non sono riuscito a creare la famiglia. Riprova.',
      });
    } finally {
      setCaricamento(false);
    }
  }

  async function unisciti() {
    const c = codice.trim().toUpperCase();
    if (!c) {
      dialog({
        title: 'Manca il codice',
        message: 'Chiedi il codice invito a chi ha creato la famiglia.',
      });
      return;
    }
    setCaricamento(true);
    try {
      const q = query(collection(db, 'famiglie'), where('codice', '==', c));
      const snap = await getDocs(q);
      if (snap.empty) {
        dialog({
          title: 'Codice non trovato',
          message: 'Controlla che sia scritto giusto, es. PANE-42.',
        });
        return;
      }
      const fam = snap.docs[0];
      await updateDoc(fam.ref, {
        membri: arrayUnion(uid),
        [`membriNomi.${uid}`]: auth.currentUser.displayName || 'Membro',
      });
      await collega(fam.id);
    } catch (e) {
      dialog({
        title: 'Ops',
        message: 'Non sono riuscito a unirti alla famiglia. Riprova.',
      });
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={font.title}>Quasi fatto</Text>
      <Text style={[font.small, { marginBottom: 30 }]}>
        La lista è condivisa dentro una famiglia. Creane una nuova,{'\n'}
        oppure entra in quella della tua compagna col codice invito.
      </Text>

      <View style={s.card}>
        <Text style={font.h2}>Crea una famiglia</Text>
        <TextInput
          style={s.input}
          placeholder='Nome, es. "Casa Rossi"'
          placeholderTextColor={colors.inkSoft}
          value={nomeFamiglia}
          onChangeText={setNomeFamiglia}
        />
        <TouchableOpacity style={s.btn} onPress={crea} disabled={caricamento}>
          <Text style={s.btnTxt}>Crea</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.oppure}>oppure</Text>

      <View style={s.card}>
        <Text style={font.h2}>Entra con un codice</Text>
        <TextInput
          style={s.input}
          placeholder="Codice invito, es. PANE-42"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="characters"
          value={codice}
          onChangeText={setCodice}
        />
        <TouchableOpacity style={[s.btn, s.btnAlt]} onPress={unisciti} disabled={caricamento}>
          <Text style={[s.btnTxt, { color: colors.green }]}>Unisciti</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line,
    padding: 18,
  },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: 13, marginVertical: 12,
    fontSize: 16, color: colors.ink, fontFamily: fonts.regular,
  },
  btn: {
    backgroundColor: colors.green, borderRadius: radius.pill,
    padding: 14, alignItems: 'center',
  },
  btnAlt: {
    backgroundColor: colors.greenSoft,
  },
  btnTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 15 },
  oppure: {
    textAlign: 'center', marginVertical: 16,
    color: colors.inkSoft, fontFamily: fonts.regular, fontSize: 14,
  },
});
