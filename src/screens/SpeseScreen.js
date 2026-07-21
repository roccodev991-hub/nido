import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet,
} from 'react-native';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc,
  updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, modules } from '../theme';
import Hero, { Sheet, HeaderContext } from '../components/Hero';
import SpesaPicker from '../components/SpesaPicker';
import { useDialog } from '../components/Dialog';
import {
  CATEGORIE_SPESA, categoriaSpesaDi, euro, leggiImporto,
  calcolaSaldi, chiDeveCosa, perCategoria,
} from '../spese';

const mod = modules.spese;

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// Primo giorno del mese, spostato di `offset` mesi.
function inizioMese(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offset);
  return d;
}

export default function SpeseScreen({ famigliaId }) {
  const dialog = useDialog();
  const { nomi } = useContext(HeaderContext);
  const [movimenti, setMovimenti] = useState([]);
  const [descrizione, setDescrizione] = useState('');
  const [importo, setImporto] = useState('');
  const [categoria, setCategoria] = useState(null); // null = indovinala tu
  const [pagatoDa, setPagatoDa] = useState(null);   // null = sono io
  const [offset, setOffset] = useState(0);
  const [aperto, setAperto] = useState(null);

  const movimentiRef = collection(db, 'famiglie', famigliaId, 'movimenti');
  const io = auth.currentUser?.displayName || 'Qualcuno';
  const membri = nomi.length ? nomi : [io];

  useEffect(() => {
    const q = query(movimentiRef, orderBy('quando', 'desc'));
    const stop = onSnapshot(q, (snap) => {
      setMovimenti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  // Il saldo guarda TUTTI i movimenti, non solo il mese sfogliato:
  // è il debito vero di oggi, non un rendiconto mensile.
  const { saldo, speso } = useMemo(
    () => calcolaSaldi(movimenti, membri),
    [movimenti, membri],
  );
  const debito = useMemo(() => chiDeveCosa(saldo, membri), [saldo, membri]);

  const inizio = inizioMese(offset);
  const fine = inizioMese(offset + 1);
  const delMese = useMemo(() => movimenti.filter(
    (m) => m.quando >= inizio.getTime() && m.quando < fine.getTime(),
  ), [movimenti, offset]);

  const totaleMese = delMese
    .filter((m) => m.tipo !== 'rimborso')
    .reduce((t, m) => t + (Number(m.importo) || 0), 0);

  // Raggruppo per giorno: è così che uno ricorda le spese.
  const sezioni = useMemo(() => {
    const per = new Map();
    for (const m of delMese) {
      const g = new Date(m.quando);
      g.setHours(0, 0, 0, 0);
      const k = g.getTime();
      if (!per.has(k)) per.set(k, []);
      per.get(k).push(m);
    }
    return [...per.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([k, data]) => ({
        titolo: new Date(k).toLocaleDateString('it-IT', {
          weekday: 'long', day: 'numeric', month: 'long',
        }),
        totale: data.filter((m) => m.tipo !== 'rimborso')
          .reduce((t, m) => t + (Number(m.importo) || 0), 0),
        data,
      }));
  }, [delMese]);

  const categorieMese = useMemo(() => perCategoria(delMese), [delMese]);

  async function aggiungi() {
    const testo = descrizione.trim();
    const valore = leggiImporto(importo);
    if (!testo || !valore) return;
    setDescrizione('');
    setImporto('');
    setCategoria(null);
    setPagatoDa(null);
    await addDoc(movimentiRef, {
      tipo: 'spesa',
      descrizione: testo,
      importo: valore,
      categoria: categoria || categoriaSpesaDi(testo),
      pagatoDa: pagatoDa || io,
      condivisa: true,
      quando: Date.now(),
      creato: serverTimestamp(),
    });
  }

  // Pareggia: registra il rimborso che azzera il conto.
  function pareggia() {
    if (!debito) return;
    dialog({
      title: 'Pareggiare i conti',
      message: `${debito.da} dà ${euro(debito.importo)} € a ${debito.a}. `
        + 'Lo registro così il saldo torna a zero — i soldi passateveli voi.',
      actions: [
        {
          label: 'Registra il rimborso',
          tone: 'primary',
          onPress: () => addDoc(movimentiRef, {
            tipo: 'rimborso',
            importo: debito.importo,
            pagatoDa: debito.da,
            a: debito.a,
            quando: Date.now(),
            creato: serverTimestamp(),
          }).catch(() => {}),
        },
        { label: 'Non ancora', tone: 'ghost' },
      ],
    });
  }

  async function cambia(item, patch) {
    await updateDoc(doc(movimentiRef, item.id), patch);
  }

  async function elimina(item) {
    setAperto(null);
    await deleteDoc(doc(movimentiRef, item.id));
  }

  const staScrivendo = descrizione.trim().length > 0;
  const suggerita = staScrivendo ? categoriaSpesaDi(descrizione) : null;
  const inPannello = movimenti.find((m) => m.id === aperto) || null;

  const etichettaMese = offset === 0
    ? 'Questo mese'
    : offset === -1
      ? 'Mese scorso'
      : `${MESI[inizio.getMonth()]} ${inizio.getFullYear()}`;

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title="Spese di casa"
        stat={
          movimenti.length === 0
            ? 'Nessuna spesa registrata'
            : `${euro(totaleMese)} € in ${MESI[inizio.getMonth()]}`
        }
      />

      <Sheet>
        {/* — Il saldo: sempre su tutto, non solo sul mese che stai guardando — */}
        <View style={[s.saldo, { backgroundColor: mod.soft }]}>
          {debito ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={s.saldoTesto}>
                  <Text style={{ fontFamily: fonts.semibold }}>{debito.da}</Text> deve a{' '}
                  <Text style={{ fontFamily: fonts.semibold }}>{debito.a}</Text>
                </Text>
                <Text style={[s.saldoCifra, { color: mod.accent }]}>
                  {euro(debito.importo)} €
                </Text>
              </View>
              <TouchableOpacity
                style={[s.pareggia, { backgroundColor: mod.accent }]}
                onPress={pareggia}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={16} color="#FFFFFF" />
                <Text style={s.pareggiaTxt}>Pareggia</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <MaterialCommunityIcons name="scale-balance" size={20} color={mod.accent} />
              <Text style={[s.saldoTesto, { color: mod.accent }]}>
                {movimenti.length === 0 ? 'Ancora nessun conto' : 'Siete pari'}
              </Text>
            </View>
          )}
        </View>

        {/* — Nuova spesa: descrizione e importo sulla stessa riga — */}
        <View style={s.addRow}>
          <TouchableOpacity onPress={aggiungi} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={22} color={mod.accent} />
          </TouchableOpacity>
          <TextInput
            style={s.addInput}
            placeholder="Aggiungi spesa"
            placeholderTextColor={colors.inkSoft}
            value={descrizione}
            onChangeText={setDescrizione}
            returnKeyType="next"
            blurOnSubmit={false}
          />
          <TextInput
            style={s.addImporto}
            placeholder="0,00"
            placeholderTextColor={colors.inkSoft}
            value={importo}
            onChangeText={setImporto}
            onSubmitEditing={aggiungi}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Text style={s.eur}>€</Text>
        </View>

        {/* Categoria e chi paga: si scelgono mentre scrivi */}
        {staScrivendo && (
          <View style={{ marginBottom: 14 }}>
            <View style={s.chipWrap}>
              {Object.entries(CATEGORIE_SPESA).map(([key, c]) => {
                const attivo = (categoria || suggerita) === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: c.colore }]}
                    onPress={() => setCategoria(key)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={c.icon}
                      size={13}
                      color={attivo ? c.colore : colors.inkSoft}
                    />
                    <Text style={[s.chipTxt, attivo && { color: c.colore, fontFamily: fonts.semibold }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {membri.length > 1 && (
              <View style={[s.chipWrap, { marginTop: 8 }]}>
                <Text style={[font.small, { alignSelf: 'center', marginRight: 2 }]}>paga:</Text>
                {membri.map((m) => {
                  const attivo = (pagatoDa || io) === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: mod.accent }]}
                      onPress={() => setPagatoDa(m)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipTxt, attivo && { color: mod.accent, fontFamily: fonts.semibold }]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* — Il mese che stai sfogliando — */}
        {!staScrivendo && (
          <View style={s.nav}>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => setOffset((o) => o - 1)}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={mod.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOffset(0)} disabled={offset === 0} activeOpacity={0.7}>
              <Text style={[s.navTxt, offset !== 0 && { color: mod.accent }]}>{etichettaMese}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => setOffset((o) => o + 1)}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color={mod.accent} />
            </TouchableOpacity>
          </View>
        )}

        <SectionList
          sections={sezioni}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            categorieMese.length > 1 ? (
              <View style={s.riepilogo}>
                {categorieMese.map(({ chiave, totale }) => {
                  const c = CATEGORIE_SPESA[chiave] || CATEGORIE_SPESA.altro;
                  return (
                    <View key={chiave} style={s.riepVoce}>
                      <MaterialCommunityIcons name={c.icon} size={13} color={c.colore} />
                      <Text style={s.riepTxt}>{c.label}</Text>
                      <Text style={[s.riepCifra, { color: c.colore }]}>{euro(totale)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="wallet-outline" size={50} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>
                {offset === 0 ? 'Nessuna spesa' : `Niente in ${MESI[inizio.getMonth()]}`}
              </Text>
              <Text style={[font.small, { textAlign: 'center' }]}>
                Scrivi cosa hai pagato e quanto,{'\n'}
                la categoria la indovina l'app.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.rigaSez}>
              <Text style={s.titoloSez}>{section.titolo}</Text>
              <Text style={s.totaleSez}>{euro(section.totale)} €</Text>
            </View>
          )}
          renderItem={({ item }) => {
            if (item.tipo === 'rimborso') {
              return (
                <TouchableOpacity
                  style={[s.riga, s.rigaRimborso]}
                  onPress={() => setAperto(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.icona, { backgroundColor: colors.bg }]}>
                    <MaterialCommunityIcons name="swap-horizontal" size={17} color={colors.inkSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={font.body}>Rimborso</Text>
                    <Text style={font.small}>{item.pagatoDa} → {item.a}</Text>
                  </View>
                  <Text style={[s.cifra, { color: colors.inkSoft }]}>{euro(item.importo)} €</Text>
                </TouchableOpacity>
              );
            }
            const c = CATEGORIE_SPESA[item.categoria] || CATEGORIE_SPESA.altro;
            const solaSua = item.condivisa === false;
            return (
              <TouchableOpacity
                style={s.riga}
                onPress={() => setAperto(item.id)}
                activeOpacity={0.7}
              >
                <View style={[s.icona, { backgroundColor: colors.bg }]}>
                  <MaterialCommunityIcons name={c.icon} size={17} color={c.colore} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={font.body} numberOfLines={1}>{item.descrizione}</Text>
                  <Text style={font.small} numberOfLines={1}>
                    {item.pagatoDa}
                    {solaSua ? ' · solo sua' : ''}
                  </Text>
                </View>
                <Text style={[s.cifra, solaSua && { color: colors.inkSoft }]}>
                  {euro(item.importo)} €
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </Sheet>

      <SpesaPicker
        visible={!!inPannello}
        movimento={inPannello}
        membri={membri}
        accent={mod.accent}
        onCambia={(patch) => cambia(inPannello, patch)}
        onElimina={() => elimina(inPannello)}
        onChiudi={() => setAperto(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  saldo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.lg, padding: 14, marginBottom: 14,
  },
  saldoTesto: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  saldoCifra: { fontFamily: fonts.bold, fontSize: 24, marginTop: 1 },
  pareggia: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
  },
  pareggiaTxt: { fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF' },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 14,
  },
  addInput: {
    flex: 1, fontSize: 16, color: colors.ink, fontFamily: fonts.regular, padding: 0,
  },
  addImporto: {
    width: 76, fontSize: 16, color: colors.ink, fontFamily: fonts.semibold,
    padding: 0, textAlign: 'right',
  },
  eur: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
  },
  chipTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  navTxt: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  riepilogo: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingVertical: 10, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  riepVoce: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riepTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  riepCifra: { fontFamily: fonts.semibold, fontSize: 12 },
  rigaSez: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, marginBottom: 6,
  },
  titoloSez: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  totaleSez: { fontFamily: fonts.medium, fontSize: 12, color: colors.faint },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8, padding: 11,
  },
  rigaRimborso: { backgroundColor: colors.bg, borderColor: colors.bg },
  icona: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cifra: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  vuoto: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 30, paddingTop: 30,
  },
});
