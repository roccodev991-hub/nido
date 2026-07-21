import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, Pressable, Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase';
import LoginScreen from './src/screens/LoginScreen';
import FamigliaScreen from './src/screens/FamigliaScreen';
import HomeScreen from './src/screens/HomeScreen';
import CucinaScreen from './src/screens/CucinaScreen';
import TasksScreen from './src/screens/TasksScreen';
import SpeseScreen from './src/screens/SpeseScreen';
import CalendarioScreen from './src/screens/CalendarioScreen';
import { HeaderContext } from './src/components/Hero';
import { DialogProvider, useDialog } from './src/components/Dialog';
import { raccogliDati } from './src/esporta';
import { colors, radius, shadow, modules, fonts } from './src/theme';

const SCHERMATE = {
  home: HomeScreen,
  cucina: CucinaScreen,
  tasks: TasksScreen,
  spese: SpeseScreen,
  calendario: CalendarioScreen,
};

export default function App() {
  return (
    <DialogProvider>
      <AppInner />
    </DialogProvider>
  );
}

function AppInner() {
  const dialog = useDialog();
  const [fontiPronte] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [pronto, setPronto] = useState(false);
  const [utente, setUtente] = useState(null);
  const [famigliaId, setFamigliaId] = useState(null);
  const [famiglia, setFamiglia] = useState(null);
  const [tab, setTab] = useState('home');
  const [sezioneIniziale, setSezioneIniziale] = useState(null);
  const [menuAperto, setMenuAperto] = useState(false);

  // 1) Ascolta il login/logout
  useEffect(() => {
    const stop = onAuthStateChanged(auth, (u) => {
      setUtente(u);
      if (!u) {
        setFamigliaId(null);
        setPronto(true);
      }
    });
    return stop;
  }, []);

  // 2) Se loggato, ascolta il documento utente per sapere la sua famiglia
  useEffect(() => {
    if (!utente) return;
    const stop = onSnapshot(doc(db, 'utenti', utente.uid), (snap) => {
      setFamigliaId(snap.exists() ? snap.data().famigliaId || null : null);
      setPronto(true);
    });
    return stop;
  }, [utente]);

  // 3) Ascolta il documento famiglia: nome, codice invito, membri
  useEffect(() => {
    if (!famigliaId) {
      setFamiglia(null);
      return;
    }
    const stop = onSnapshot(doc(db, 'famiglie', famigliaId), (snap) => {
      setFamiglia(snap.exists() ? snap.data() : null);
    });
    return stop;
  }, [famigliaId]);

  // 4) Ogni membro salva il proprio nome nel doc famiglia (serve per gli avatar)
  useEffect(() => {
    if (!famiglia || !utente || !famigliaId) return;
    const nome = utente.displayName;
    if (nome && (famiglia.membriNomi || {})[utente.uid] !== nome) {
      updateDoc(doc(db, 'famiglie', famigliaId), {
        [`membriNomi.${utente.uid}`]: nome,
      }).catch(() => {});
    }
  }, [famiglia, utente, famigliaId]);

  // Esporta correzioni imparate + ricettario: backup e base per i default dell'app.
  async function esportaDati() {
    try {
      const dati = await raccogliDati(famigliaId);
      await Share.share({
        title: 'Dati di Nido',
        message: JSON.stringify(dati),
      });
    } catch (e) {
      dialog({
        title: 'Esportazione non riuscita',
        message: 'Non sono riuscito a leggere i dati. Riprova tra un momento.',
      });
    }
  }

  function infoFamiglia() {
    dialog({
      title: famiglia?.nome || 'La tua famiglia',
      body: (
        <View>
          <Text style={s.codiceLabel}>CODICE INVITO</Text>
          <View style={s.codiceBox}>
            <Text style={s.codice}>{famiglia?.codice || '—'}</Text>
          </View>
          <Text style={s.codiceHint}>
            Condividilo con chi vuoi far entrare nella famiglia.
          </Text>
        </View>
      ),
      actions: [
        { label: 'Esporta i miei dati', tone: 'primary', onPress: esportaDati },
        { label: 'Esci dall\'account', tone: 'danger', onPress: () => signOut(auth) },
        { label: 'Chiudi', tone: 'ghost' },
      ],
    });
  }

  // La home apre il modulo *e* la sezione giusta ("vedi il menu", "vedi la lista"),
  // altrimenti da lì atterreresti sempre sulla prima sezione.
  function vaiA(key, sezione = null) {
    setTab(key);
    setSezioneIniziale(sezione);
    setMenuAperto(false);
  }

  if (!pronto || !fontiPronte) {
    return (
      <View style={s.centro}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (!utente) return <><StatusBar style="dark" /><LoginScreen /></>;

  if (!famigliaId) {
    return (
      <>
        <StatusBar style="dark" />
        <FamigliaScreen onFamiglia={setFamigliaId} />
      </>
    );
  }

  const nomi = Object.values(famiglia?.membriNomi || {});
  const Schermata = SCHERMATE[tab];

  return (
    <HeaderContext.Provider
      value={{
        famigliaNome: famiglia?.nome || 'La tua famiglia',
        nomi,
        membri: famiglia?.membri || [],
        membriNomi: famiglia?.membriNomi || {},
        onMenu: () => setMenuAperto(true),
        onInfo: infoFamiglia,
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />

        <Schermata
          famigliaId={famigliaId}
          sezioneIniziale={sezioneIniziale}
          vaiA={vaiA}
        />

        {/* Menu moduli: pannello arrotondato in alto a sinistra */}
        <Modal
          visible={menuAperto}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuAperto(false)}
        >
          <Pressable style={s.velo} onPress={() => setMenuAperto(false)}>
            <Pressable style={s.pannello} onPress={() => {}}>
              {Object.entries(modules).map(([key, m]) => {
                const attivo = tab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.voce, attivo && { backgroundColor: m.soft }]}
                    onPress={() => vaiA(key)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={m.icon}
                      size={22}
                      color={attivo ? m.accent : colors.inkSoft}
                    />
                    <Text
                      style={[
                        s.voceTxt,
                        attivo && { color: m.accent, fontFamily: fonts.semibold },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </HeaderContext.Provider>
  );
}

const s = StyleSheet.create({
  centro: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  velo: {
    flex: 1, backgroundColor: 'rgba(32, 48, 31, 0.35)',
  },
  pannello: {
    marginTop: 104, marginLeft: 16, width: 230,
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 10,
    ...shadow.float,
  },
  voce: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: radius.lg,
  },
  voceTxt: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  codiceLabel: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    letterSpacing: 0.5, marginBottom: 6,
  },
  codiceBox: {
    backgroundColor: colors.greenSoft, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  codice: {
    fontFamily: fonts.bold, fontSize: 24, color: colors.green, letterSpacing: 2,
  },
  codiceHint: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
});
