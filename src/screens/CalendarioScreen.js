import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, SectionList, StyleSheet,
} from 'react-native';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc,
  updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, modules } from '../theme';
import Hero, { Sheet, HeaderContext } from '../components/Hero';
import MeseGriglia from '../components/MeseGriglia';
import EventoForm from '../components/EventoForm';
import { vedeLEvento, conChi } from '../eventi';
import { inizioGiorno, giorniTra } from '../ricorrenza';

const mod = modules.calendario;

// "oggi", "domani", "fra 3 giorni", "il 14 ottobre": quanto manca.
function quantoManca(quando, adesso = Date.now()) {
  const g = giorniTra(adesso, quando);
  if (g < 0) return `${-g === 1 ? 'ieri' : `${-g} giorni fa`}`;
  if (g === 0) return 'oggi';
  if (g === 1) return 'domani';
  if (g <= 30) return `fra ${g} giorni`;
  return null;
}

export default function CalendarioScreen({ famigliaId }) {
  const { membri, membriNomi } = useContext(HeaderContext);
  const io = auth.currentUser?.uid;
  const [tutti, setTutti] = useState([]);
  const [giorno, setGiorno] = useState(null); // giorno scelto sulla griglia
  const [form, setForm] = useState(null);     // { evento } | { nuovo: true }

  const eventiRef = collection(db, 'famiglie', famigliaId, 'eventi');
  const oggi = inizioGiorno(Date.now());

  useEffect(() => {
    const q = query(eventiRef, orderBy('quando', 'asc'));
    const stop = onSnapshot(q, (snap) => {
      setTutti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  // Quelli che ti riguardano. È un filtro dell'interfaccia, non una protezione:
  // vedi la nota in eventi.js.
  const eventi = useMemo(
    () => tutti.filter((e) => vedeLEvento(e, io)),
    [tutti, io],
  );

  // Pallini sulla griglia.
  const conteggi = useMemo(() => {
    const per = {};
    for (const e of eventi) {
      const g = inizioGiorno(e.quando || oggi);
      per[g] = (per[g] || 0) + 1;
    }
    return per;
  }, [eventi]);

  // Con un giorno scelto mostro quello; altrimenti "Prossimi", che è la
  // domanda vera quando apri l'app: cosa ci aspetta.
  const sezioni = useMemo(() => {
    const ordina = (a, b) => (a.quando - b.quando) || (a.ora || '').localeCompare(b.ora || '');

    if (giorno != null) {
      const data = eventi.filter((e) => inizioGiorno(e.quando || 0) === giorno).sort(ordina);
      return data.length
        ? [{
          titolo: new Date(giorno).toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long',
          }),
          chiave: 'giorno',
          data,
        }]
        : [];
    }

    const prossimi = eventi.filter((e) => inizioGiorno(e.quando || 0) >= oggi).sort(ordina);
    const passati = eventi.filter((e) => inizioGiorno(e.quando || 0) < oggi)
      .sort((a, b) => b.quando - a.quando)
      .slice(0, 5);

    return [
      ...(prossimi.length ? [{ titolo: 'Prossimi', chiave: 'prossimi', data: prossimi }] : []),
      ...(passati.length ? [{ titolo: 'Già passati', chiave: 'passati', data: passati }] : []),
    ];
  }, [eventi, giorno, oggi]);

  async function salva(dati) {
    const aperto = form?.evento;
    setForm(null);
    if (aperto) {
      await updateDoc(doc(eventiRef, aperto.id), dati);
    } else {
      await addDoc(eventiRef, {
        ...dati,
        aggiuntoDa: auth.currentUser?.displayName || 'Qualcuno',
        creato: serverTimestamp(),
      });
    }
  }

  async function elimina() {
    const aperto = form?.evento;
    setForm(null);
    if (aperto) await deleteDoc(doc(eventiRef, aperto.id));
  }

  const prossimo = eventi.find((e) => inizioGiorno(e.quando || 0) >= oggi);

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title="Eventi"
        stat={
          prossimo
            ? `${prossimo.nome} · ${quantoManca(prossimo.quando) || new Date(prossimo.quando).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
            : 'Niente in programma'
        }
      />

      <Sheet>
        <MeseGriglia
          selezionato={giorno}
          conteggi={conteggi}
          onGiorno={setGiorno}
          accent={mod.accent}
        />

        <TouchableOpacity
          style={[s.aggiungi, { borderColor: mod.accent }]}
          onPress={() => setForm({ nuovo: true })}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={18} color={mod.accent} />
          <Text style={[s.aggiungiTxt, { color: mod.accent }]}>
            {giorno != null
              ? `Aggiungi il ${new Date(giorno).getDate()} ${new Date(giorno).toLocaleDateString('it-IT', { month: 'long' })}`
              : 'Aggiungi evento'}
          </Text>
        </TouchableOpacity>

        <SectionList
          sections={sezioni}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={46} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>
                {giorno != null ? 'Niente quel giorno' : 'Nessun evento'}
              </Text>
              <Text style={[font.small, { textAlign: 'center', marginBottom: 14 }]}>
                {giorno != null
                  ? 'Tocca «Aggiungi» qui sopra per metterci qualcosa.'
                  : 'Cene, visite, concerti, impegni:\nquello che vi aspetta, in un posto solo.'}
              </Text>
              {giorno != null && (
                <TouchableOpacity style={s.tutti} onPress={() => setGiorno(null)} activeOpacity={0.8}>
                  <Text style={[s.tuttiTxt, { color: mod.accent }]}>Vedi tutti</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.rigaSez}>
              <Text style={[s.titoloSez, section.chiave === 'passati' && { color: colors.faint }]}>
                {section.titolo}
              </Text>
              {section.chiave === 'giorno' && (
                <TouchableOpacity onPress={() => setGiorno(null)} hitSlop={8} activeOpacity={0.7}>
                  <Text style={s.tuttiTxt}>Vedi tutti</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item, section }) => {
            const passato = section.chiave === 'passati';
            const manca = quantoManca(item.quando);
            const data = new Date(item.quando).toLocaleDateString('it-IT', {
              weekday: 'short', day: 'numeric', month: 'long',
            });
            const dettagli = [item.ora, item.luogo].filter(Boolean).join(' · ');
            const con = conChi(item, io, membriNomi, membri.length);
            return (
              <TouchableOpacity
                style={[s.riga, passato && s.rigaPassata]}
                onPress={() => setForm({ evento: item })}
                activeOpacity={0.7}
              >
                <View style={[s.giornoBox, { backgroundColor: passato ? colors.bg : mod.soft }]}>
                  <Text style={[s.giornoNum, { color: passato ? colors.faint : mod.accent }]}>
                    {new Date(item.quando).getDate()}
                  </Text>
                  <Text style={[s.giornoMese, { color: passato ? colors.faint : mod.accent }]}>
                    {new Date(item.quando).toLocaleDateString('it-IT', { month: 'short' })}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.nomeRiga}>
                    <Text
                      style={[font.body, passato && { color: colors.inkSoft }]}
                      numberOfLines={1}
                    >
                      {item.nome}
                    </Text>
                    {con && (
                      <View style={s.riservato}>
                        <MaterialCommunityIcons
                          name={con === 'solo per te' ? 'eye-off-outline' : 'account-multiple-outline'}
                          size={12}
                          color={colors.inkSoft}
                        />
                        <Text style={s.riservatoTxt}>{con}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={font.small} numberOfLines={1}>
                    {section.chiave === 'giorno' ? (dettagli || 'tutto il giorno') : data}
                    {section.chiave !== 'giorno' && dettagli ? ` · ${dettagli}` : ''}
                  </Text>
                  {item.note ? (
                    <Text style={s.note} numberOfLines={1}>{item.note}</Text>
                  ) : null}
                </View>
                {!passato && manca && section.chiave !== 'giorno' && (
                  <Text style={[s.manca, { color: mod.accent }]}>{manca}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </Sheet>

      <EventoForm
        visible={!!form}
        evento={form?.evento || null}
        giorno={giorno}
        accent={mod.accent}
        io={io}
        membri={membri}
        membriNomi={membriNomi}
        onSalva={salva}
        onElimina={elimina}
        onChiudi={() => setForm(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  aggiungi: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: radius.md, borderStyle: 'dashed',
    paddingVertical: 11, marginTop: 12, marginBottom: 4,
  },
  aggiungiTxt: { fontFamily: fonts.medium, fontSize: 14 },
  rigaSez: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, marginBottom: 8,
  },
  titoloSez: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tutti: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line,
  },
  tuttiTxt: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8, padding: 11,
  },
  rigaPassata: { backgroundColor: colors.bg, borderColor: colors.bg },
  giornoBox: {
    width: 44, paddingVertical: 6, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  giornoNum: { fontFamily: fonts.bold, fontSize: 17 },
  giornoMese: { fontFamily: fonts.medium, fontSize: 10, textTransform: 'uppercase' },
  nomeRiga: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  riservato: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  riservatoTxt: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 2 },
  manca: { fontFamily: fonts.medium, fontSize: 12 },
  vuoto: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 20, paddingTop: 24,
  },
});
