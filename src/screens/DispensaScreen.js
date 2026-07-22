import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection, query, orderBy, where, onSnapshot, getDocs, getDoc, addDoc, deleteDoc,
  updateDoc, doc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, sezioni, statiDispensa, cicloStato } from '../theme';
import { normalizza, perSchermo } from '../catalogo';
import { raggruppaPerConservazione, CONSERVAZIONI } from '../conservazione';
import { consumoDi, dataRiferimento } from '../profili';
import { stimaGiorni, SOGLIA_USI } from '../stime';
import { lunedi, ymd, inizioOggi } from '../settimana';
import { useCategorie, imparaConservazione } from '../frequenti';
import ProdottoPicker from '../components/ProdottoPicker';
import { useDialog } from '../components/Dialog';
import Hero, { Sheet, SezioniTabs } from '../components/Hero';

const mod = sezioni.dispensa;
const SETTIMANE_STORICO = 8; // quante settimane di menu guardare per contare gli usi

// Testo relativo dell'ultimo acquisto (discreto).
function quandoComprato(ts) {
  if (!ts || !ts.toDate) return null;
  const giorni = Math.floor((Date.now() - ts.toDate().getTime()) / 86400000);
  if (giorni <= 0) return 'comprato oggi';
  if (giorni === 1) return 'comprato ieri';
  if (giorni < 7) return `comprato ${giorni} giorni fa`;
  if (giorni < 30) {
    const w = Math.floor(giorni / 7);
    return `comprato ${w} ${w === 1 ? 'settimana' : 'settimane'} fa`;
  }
  const m = Math.floor(giorni / 30);
  return `comprato ${m} ${m === 1 ? 'mese' : 'mesi'} fa`;
}

export default function DispensaScreen({ famigliaId, sezione, setSezione }) {
  const dialog = useDialog();
  const {
    frequenti, pronto, categoriaPer, conservazionePer,
  } = useCategorie(famigliaId);
  const [prodotti, setProdotti] = useState([]);
  const [nuovo, setNuovo] = useState('');
  const [nascondiFiniti, setNascondiFiniti] = useState(false);
  const [itemSezione, setItemSezione] = useState(null); // prodotto di cui cambiare impostazioni
  const controllo = useRef(false);

  const dispensaRef = collection(db, 'famiglie', famigliaId, 'dispensa');

  useEffect(() => {
    const q = query(dispensaRef, orderBy('nome'));
    const stop = onSnapshot(q, (snap) => {
      setProdotti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  // Ritmi di riacquisto imparati, per nome prodotto.
  const mappaFrequenti = new Map(
    frequenti.map((f) => [normalizza(f.nome), f]),
  );

  // Segna come "consumati" i freschi il cui pasto è passato o che sono scaduti.
  // Gira una volta per apertura della schermata: le scorte non vengono mai toccate.
  useEffect(() => {
    if (!pronto || prodotti.length === 0 || controllo.current) return;
    controllo.current = true;
    verificaConsumi().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prodotti.length, pronto]);

  async function verificaConsumi() {
    const oggi = inizioOggi();

    // 1) Raccolgo i pasti già passati delle ultime settimane, con la loro data:
    //    servono sia a consumare i freschi, sia a contare gli usi delle scorte.
    const pastiPassati = []; // { quando: ms, ingredienti: Set }
    const inizio = lunedi();
    const chiavi = [];
    for (let k = SETTIMANE_STORICO - 1; k >= 0; k -= 1) {
      const d = new Date(inizio);
      d.setDate(d.getDate() - k * 7);
      chiavi.push(ymd(d));
    }

    const docs = await Promise.all(
      chiavi.map((c) => getDoc(doc(db, 'famiglie', famigliaId, 'menuSettimana', c))),
    );
    docs.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const slots = snap.data().slots || {};
      const base = new Date(`${chiavi[idx]}T00:00:00`);
      for (const [key, valore] of Object.entries(slots)) {
        if (!valore || valore.tipo !== 'piatto') continue;
        const giorno = parseInt(key.replace('g', ''), 10); // "g3_cena" → 3
        if (Number.isNaN(giorno)) continue;
        const data = new Date(base);
        data.setDate(data.getDate() + giorno);
        if (data.getTime() >= oggi) continue; // pasto non ancora passato
        const ingredienti = new Set(
          (valore.ingredienti || []).map((i) => normalizza(i.nome)).filter(Boolean),
        );
        pastiPassati.push({ quando: data.getTime(), ingredienti });
      }
    });

    // 2) Decido prodotto per prodotto
    const batch = writeBatch(db);
    let modifiche = 0;
    for (const p of prodotti) {
      if ((p.stato || 'pieno') !== 'pieno') continue;
      // Il reparto si legge da categoriaPer (correzioni imparate + catalogo),
      // non dalla foto salvata sul documento: se correggi il reparto di un
      // prodotto già in dispensa, il consumo deve accorgersene.
      const categoria = categoriaPer(p.nome);
      const consumo = consumoDi(p.nome, categoria);
      const nome = normalizza(p.nome);
      const rif = dataRiferimento(p);
      // Giorni di CALENDARIO, non frazioni: comprato ieri sera = 1 giorno fa.
      // Mezzanotte + arrotondamento assorbono anche l'ora legale,
      // come già fa giorniTra() in ricorrenza.js.
      const mezzanotteRif = rif ? new Date(rif).setHours(0, 0, 0, 0) : null;
      const giorniPassati = rif ? Math.round((oggi - mezzanotteRif) / 86400000) : 0;
      // pasti che hanno usato il prodotto DOPO che l'hai comprato
      const usi = rif
        ? pastiPassati.filter((m) => m.quando > rif && m.ingredienti.has(nome)).length
        : 0;

      if (consumo.tipo === 'scorta') {
        // Scorta → "Poco". Se conosco il tuo ritmo uso solo quello,
        // altrimenti mi baso sugli usi e, come rete, sul tempo stimato.
        const imparato = mappaFrequenti.get(nome);
        const ritmo = imparato && imparato.intervalliVisti >= 1
          ? imparato.intervalloMedio
          : null;
        const inEsaurimento = ritmo
          ? giorniPassati >= ritmo
          : usi >= SOGLIA_USI || giorniPassati >= stimaGiorni(p.nome, categoria);
        if (inEsaurimento && rif) {
          batch.update(doc(dispensaRef, p.id), { stato: 'poco' });
          modifiche += 1;
        }
        continue;
      }

      // Fresco → "Consumato": abbastanza pasti l'hanno usato (con pasti > 0),
      // oppure è passato il tempo di rete. `pasti: 0` = il menu non lo tocca.
      // Senza data di riferimento non si consuma niente, di proposito: ogni
      // documento nasce con `creato`, quindi il caso è solo la latenza di
      // serverTimestamp (si risolve al sync) — meglio prudenti che a caso.
      if (!rif) continue;
      const daPasto = consumo.pasti > 0 && usi >= consumo.pasti;
      const perTempo = giorniPassati >= consumo.giorni;
      if (daPasto || perTempo) {
        batch.update(doc(dispensaRef, p.id), { stato: 'consumato' });
        modifiche += 1;
      }
    }
    if (modifiche > 0) await batch.commit();
  }

  // Aggiungi ciò che hai già in casa (primo inventario e non solo).
  async function aggiungi(nomeRaw) {
    const nome = (nomeRaw != null ? nomeRaw : nuovo).trim();
    if (!nome) return;
    const categoria = categoriaPer(nome);
    const cons = conservazionePer(nome, categoria);

    // I prodotti per la casa non vivono nella dispensa della cucina:
    // hanno la loro sezione in Task → Casa.
    if (cons === 'casa') {
      setNuovo('');
      dialog({
        title: 'Prodotto per la casa',
        message: `"${nome}" non è un alimento: il suo posto è in Task → Casa, insieme a detersivi e carta. Lo metto lì?`,
        actions: [
          {
            label: 'Mettilo in Casa',
            tone: 'primary',
            onPress: () => addDoc(dispensaRef, {
              nome,
              categoria,
              conservazione: 'casa',
              stato: 'pieno',
              creato: serverTimestamp(),
            }).catch(() => {}),
          },
          {
            label: 'Aggiungi alla lista',
            onPress: () => addDoc(collection(db, 'famiglie', famigliaId, 'spesa'), {
              nome,
              categoria,
              aggiuntoDa: auth.currentUser.displayName || 'Dispensa',
              creato: serverTimestamp(),
            }).catch(() => {}),
          },
          { label: 'Lascia stare', tone: 'ghost' },
        ],
      });
      return;
    }

    setNuovo('');
    const gia = await getDocs(query(dispensaRef, where('nome', '==', nome)));
    if (!gia.empty) {
      await updateDoc(gia.docs[0].ref, { stato: 'pieno' });
    } else {
      await addDoc(dispensaRef, {
        nome,
        categoria,
        conservazione: cons,
        stato: 'pieno',
        creato: serverTimestamp(),
      });
    }
  }

  // Cambia stato: c'è → poco → finito → c'è. (Non tocca la lista spesa.)
  async function cambiaStato(item) {
    const attuale = item.stato || 'pieno';
    await updateDoc(doc(dispensaRef, item.id), { stato: cicloStato[attuale] });
  }

  async function elimina(item) {
    await deleteDoc(doc(dispensaRef, item.id));
  }

  // Cambia sezione a mano e "insegna" all'app per la prossima volta.
  async function cambiaSezione(item, chiave) {
    setItemSezione(null);
    await updateDoc(doc(dispensaRef, item.id), { conservazione: chiave });
    imparaConservazione(famigliaId, item.nome, chiave).catch(() => {});
  }

  // La dispensa della cucina contiene solo alimenti: i prodotti per la casa
  // restano fuori (li ritroverai comunque nella lista della spesa).
  const cucina = prodotti.filter(
    (p) => (p.conservazione || conservazionePer(p.nome, p.categoria)) !== 'casa',
  );
  const esaurito = (p) => ['finito', 'consumato'].includes(p.stato || 'pieno');
  const nFiniti = cucina.filter(esaurito).length;
  const visibili = nascondiFiniti ? cucina.filter((p) => !esaurito(p)) : cucina;
  const sezioniDispensa = raggruppaPerConservazione(visibili, conservazionePer);

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title="In dispensa"
        stat={
          cucina.length === 0
            ? 'Vuota per ora'
            : `${cucina.length} ${cucina.length === 1 ? 'prodotto' : 'prodotti'}`
        }
      >
        <SezioniTabs sezione={sezione} setSezione={setSezione} />
      </Hero>

      <Sheet>
        <View style={s.addRow}>
          <TouchableOpacity onPress={() => aggiungi()} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={22} color={mod.accent} />
          </TouchableOpacity>
          <TextInput
            style={s.addInput}
            placeholder="Aggiungi in dispensa"
            placeholderTextColor={colors.inkSoft}
            value={nuovo}
            onChangeText={setNuovo}
            onSubmitEditing={() => aggiungi()}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        {nFiniti > 0 && (
          <TouchableOpacity
            style={s.filtro}
            onPress={() => setNascondiFiniti((v) => !v)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={nascondiFiniti ? 'eye-outline' : 'eye-off-outline'}
              size={16}
              color={colors.inkSoft}
            />
            <Text style={s.filtroTxt}>
              {nascondiFiniti ? `Mostra esauriti (${nFiniti})` : 'Nascondi esauriti'}
            </Text>
          </TouchableOpacity>
        )}

        <SectionList
          sections={sezioniDispensa}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="fridge-outline" size={54} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>Dispensa vuota</Text>
              <Text style={[font.small, { textAlign: 'center' }]}>
                Aggiungi ciò che hai già in casa qui sopra,{'\n'}o spunta la spesa dalla lista.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.reparto}>
              <MaterialCommunityIcons name={section.icon} size={15} color={mod.accent} />
              <Text style={s.repartoTxt}>{section.label}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const stato = statiDispensa[item.stato] ? item.stato : 'pieno';
            const st = statiDispensa[stato];
            const finito = stato === 'finito' || stato === 'consumato';
            const data = quandoComprato(item.compratoIl);
            return (
              <View style={[s.riga, { borderColor: st.soft }]}>
                <View style={[s.accento, { backgroundColor: st.colore }]} />
                <View style={s.contenuto}>
                  <Text style={[font.body, finito && { color: colors.inkSoft }]} numberOfLines={1}>
                    {perSchermo(item.nome)}
                  </Text>
                  <View style={s.metaRiga}>
                    <TouchableOpacity
                      style={s.sezChip}
                      onPress={() => setItemSezione(item)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={CONSERVAZIONI[item.conservazione || conservazionePer(item.nome, item.categoria)].icon}
                        size={11}
                        color={colors.inkSoft}
                      />
                      <Text style={s.sezChipTxt}>
                        {CONSERVAZIONI[item.conservazione || conservazionePer(item.nome, item.categoria)].label}
                      </Text>
                    </TouchableOpacity>
                    {data && <Text style={s.dataTxt}>{data}</Text>}
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.pill, { backgroundColor: st.soft }]}
                  onPress={() => cambiaStato(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.dot, { backgroundColor: st.colore }]} />
                  <Text style={[s.pillTxt, { color: st.colore }]}>{st.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.xBtn}
                  onPress={() => elimina(item)}
                  hitSlop={6}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={16} color={colors.tomato} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </Sheet>

      <ProdottoPicker
        visible={!!itemSezione}
        nome={itemSezione ? itemSezione.nome : ''}
        categoria={itemSezione ? itemSezione.categoria : null}
        conservazione={itemSezione
          ? (itemSezione.conservazione || conservazionePer(itemSezione.nome, itemSezione.categoria))
          : null}
        accent={mod.accent}
        onConservazione={(k) => cambiaSezione(itemSezione, k)}
        onChiudi={() => setItemSezione(null)}
      />
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
  filtro: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end', marginBottom: 8, paddingVertical: 2,
  },
  filtroTxt: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  reparto: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginBottom: 8,
  },
  repartoTxt: {
    fontFamily: fonts.semibold, fontSize: 13, color: mod.accent,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8,
    paddingRight: 10, overflow: 'hidden',
  },
  accento: { width: 5, alignSelf: 'stretch', marginRight: 4 },
  contenuto: { flex: 1, paddingVertical: 11 },
  metaRiga: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sezChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.bg, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  sezChipTxt: { fontFamily: fonts.medium, fontSize: 11, color: colors.inkSoft },
  dataTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillTxt: { fontFamily: fonts.semibold, fontSize: 13 },
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
