import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
} from 'react-native';
import {
  collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc,
  updateDoc, doc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, sezioniTasks, statiDispensa } from '../theme';
import { normalizza, perSchermo, PRODOTTI_CASA } from '../catalogo';
import { useCategorie } from '../frequenti';
import { dataRiferimento } from '../profili';
import Hero, { Sheet, SezioniTabs } from '../components/Hero';

const sz = sezioniTasks.casa;

// Qui il ciclo è più corto che in dispensa: per un detersivo non ha senso
// stimare quando l'avete finito, lo sapete voi. Niente "Consumato".
const CICLO = { pieno: 'poco', poco: 'finito', finito: 'pieno', consumato: 'pieno' };
const ORDINE = { finito: 0, poco: 1, pieno: 2, consumato: 3 };

export default function CasaScreen({ famigliaId, sezione, setSezione }) {
  const { frequenti, pronto, categoriaPer } = useCategorie(famigliaId);
  const [prodotti, setProdotti] = useState([]);
  const [inLista, setInLista] = useState([]);
  const [nuovo, setNuovo] = useState('');
  const controllato = useRef(false);

  const dispensaRef = collection(db, 'famiglie', famigliaId, 'dispensa');
  const listaRef = collection(db, 'famiglie', famigliaId, 'spesa');

  // Stessa collezione della dispensa: i prodotti per la casa ci finiscono già
  // quando spunti la spesa, semplicemente la cucina non li mostra.
  useEffect(() => {
    const stop = onSnapshot(query(dispensaRef, where('conservazione', '==', 'casa')), (snap) => {
      setProdotti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  useEffect(() => {
    const stop = onSnapshot(listaRef, (snap) => {
      setInLista(snap.docs.map((d) => normalizza(d.data().nome || '')));
    });
    return stop;
  }, [famigliaId]);

  // Passa a "Poco" quello che secondo i tuoi riacquisti dovrebbe star finendo.
  //
  // Qui c'è solo questa regola, nessuna stima: per un detersivo l'app non ha
  // idea di quanto duri, e inventarselo sarebbe peggio che tacere. Serve almeno
  // un intervallo osservato — cioè lo stesso prodotto comprato due volte — e
  // finché non ce l'ha non tocca niente: lo stato lo decidi tu al tocco.
  useEffect(() => {
    if (!pronto || controllato.current || prodotti.length === 0) return;
    controllato.current = true;

    const imparati = new Map(frequenti.map((f) => [normalizza(f.nome), f]));
    const adesso = Date.now();
    const batch = writeBatch(db);
    let modifiche = 0;

    for (const p of prodotti) {
      if ((p.stato || 'pieno') !== 'pieno') continue;
      const imparato = imparati.get(normalizza(p.nome));
      if (!imparato || (imparato.intervalliVisti || 0) < 1) continue; // meno di due acquisti
      const rif = dataRiferimento(p);
      if (!rif) continue;
      if ((adesso - rif) / 86400000 >= imparato.intervalloMedio) {
        batch.update(doc(dispensaRef, p.id), { stato: 'poco' });
        modifiche += 1;
      }
    }
    if (modifiche > 0) batch.commit().catch(() => {});
  }, [pronto, frequenti, prodotti]);

  async function aggiungi(nomeRaw) {
    const nome = (nomeRaw != null ? nomeRaw : nuovo).trim();
    if (!nome) return;
    setNuovo('');
    const gia = await getDocs(query(dispensaRef, where('nome', '==', nome)));
    if (!gia.empty) {
      await updateDoc(gia.docs[0].ref, { stato: 'pieno', conservazione: 'casa' });
      return;
    }
    await addDoc(dispensaRef, {
      nome,
      categoria: categoriaPer(nome),
      conservazione: 'casa',
      stato: 'pieno',
      creato: serverTimestamp(),
    });
  }

  async function cambiaStato(item) {
    await updateDoc(doc(dispensaRef, item.id), { stato: CICLO[item.stato || 'pieno'] });
  }

  async function elimina(item) {
    await deleteDoc(doc(dispensaRef, item.id));
  }

  // Scorciatoia: dal prodotto alla lista della spesa, senza riscriverne il nome.
  async function metti(item) {
    await addDoc(listaRef, {
      nome: item.nome,
      categoria: item.categoria || categoriaPer(item.nome),
      aggiuntoDa: auth.currentUser?.displayName || 'Casa',
      creato: serverTimestamp(),
    });
  }

  // Suggerimenti: i prodotti casa del catalogo che non hai già qui dentro.
  const suggerimenti = useMemo(() => {
    const testo = normalizza(nuovo);
    if (!testo) return [];
    const gia = new Set(prodotti.map((p) => normalizza(p.nome)));
    return PRODOTTI_CASA
      .filter((p) => !gia.has(normalizza(p)) && normalizza(p).includes(testo))
      .sort((a, b) => normalizza(a).indexOf(testo) - normalizza(b).indexOf(testo))
      .slice(0, 6);
  }, [nuovo, prodotti]);

  // Il ritmo imparato, per prodotto: serve a spiegare in chiaro perché
  // qualcosa è passato a "Poco" da solo.
  const ritmi = useMemo(() => {
    const m = new Map();
    for (const f of frequenti) {
      if ((f.intervalliVisti || 0) >= 1 && f.intervalloMedio) {
        m.set(normalizza(f.nome), Math.round(f.intervalloMedio));
      }
    }
    return m;
  }, [frequenti]);

  // Prima quello che manca, poi il resto: è l'ordine con cui li guardi.
  const ordinati = useMemo(
    () => prodotti.slice().sort((a, b) => {
      const d = (ORDINE[a.stato] ?? 9) - (ORDINE[b.stato] ?? 9);
      return d !== 0 ? d : a.nome.localeCompare(b.nome);
    }),
    [prodotti],
  );

  const daComprare = prodotti.filter((p) => ['poco', 'finito'].includes(p.stato)).length;

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={sz.accent}
        soft={sz.soft}
        icon={sz.icon}
        title="Prodotti per la casa"
        stat={
          prodotti.length === 0
            ? 'Detersivi, carta, igiene'
            : daComprare > 0
              ? `${daComprare} da ricomprare · ${prodotti.length} in tutto`
              : `${prodotti.length} prodotti, non manca niente`
        }
      >
        <SezioniTabs sezione={sezione} setSezione={setSezione} set={sezioniTasks} />
      </Hero>

      <Sheet>
        <View style={s.addRow}>
          <TouchableOpacity onPress={() => aggiungi()} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={22} color={sz.accent} />
          </TouchableOpacity>
          <TextInput
            style={s.addInput}
            placeholder="Aggiungi prodotto"
            placeholderTextColor={colors.inkSoft}
            value={nuovo}
            onChangeText={setNuovo}
            onSubmitEditing={() => aggiungi()}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        {/* Suggerimenti mentre scrivi, come nella lista della spesa */}
        {suggerimenti.length > 0 && (
          <View style={s.suggBox}>
            {suggerimenti.map((sug) => (
              <TouchableOpacity
                key={sug}
                style={s.suggRiga}
                onPress={() => aggiungi(sug)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="spray-bottle" size={17} color={colors.inkSoft} />
                <Text style={s.suggTxt}>{perSchermo(sug)}</Text>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={sz.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FlatList
          data={ordinati}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="spray-bottle" size={50} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>Ancora niente qui</Text>
              <Text style={[font.small, { textAlign: 'center' }]}>
                Detersivi, carta igienica, sapone…{'\n'}
                Compaiono da soli quando li spunti dalla spesa.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const stato = statiDispensa[item.stato || 'pieno'];
            const gia = inLista.includes(normalizza(item.nome));
            const manca = ['poco', 'finito'].includes(item.stato);
            const ritmo = ritmi.get(normalizza(item.nome));
            return (
              <View style={s.riga}>
                <TouchableOpacity
                  style={[s.pallino, { backgroundColor: stato.soft }]}
                  onPress={() => cambiaStato(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.punto, { backgroundColor: stato.colore }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => cambiaStato(item)}
                  activeOpacity={0.6}
                >
                  <Text style={font.body}>{perSchermo(item.nome)}</Text>
                  <Text style={font.small} numberOfLines={1}>
                    <Text style={{ color: stato.colore, fontFamily: fonts.medium }}>
                      {stato.label}
                    </Text>
                    {ritmo ? ` · lo ricomprate ogni ~${ritmo} giorni` : ''}
                  </Text>
                </TouchableOpacity>

                {manca && (
                  gia ? (
                    <View style={s.giaInLista}>
                      <MaterialCommunityIcons name="cart" size={14} color={colors.inkSoft} />
                      <Text style={s.giaTxt}>in lista</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.metti, { borderColor: sz.accent }]}
                      onPress={() => metti(item)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="cart-plus" size={14} color={sz.accent} />
                      <Text style={[s.mettiTxt, { color: sz.accent }]}>In lista</Text>
                    </TouchableOpacity>
                  )
                )}

                <TouchableOpacity
                  style={s.xBtn}
                  onPress={() => elimina(item)}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={16} color={colors.tomato} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 14,
  },
  addInput: {
    flex: 1, fontSize: 16, color: colors.ink, fontFamily: fonts.regular,
    padding: 0,
  },
  suggBox: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, marginBottom: 14, overflow: 'hidden',
  },
  suggRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  suggTxt: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8, padding: 12,
  },
  pallino: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  punto: { width: 12, height: 12, borderRadius: 6 },
  metti: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1,
  },
  mettiTxt: { fontFamily: fonts.medium, fontSize: 12 },
  giaInLista: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  giaTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  xBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.tomatoSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  vuoto: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 30, paddingTop: 20,
  },
});
