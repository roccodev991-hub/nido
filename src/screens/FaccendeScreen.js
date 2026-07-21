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
import { colors, radius, font, fonts, modules, sezioniTasks } from '../theme';
import Hero, { Sheet, SezioniTabs, HeaderContext } from '../components/Hero';
import TaskPicker from '../components/TaskPicker';
import { FACCENDE_SEED, suggerisciFaccende } from '../faccende';
import StrisciaGiorni from '../components/StrisciaGiorni';
import {
  inizioGiorno, piuGiorni, giorniTra, indiceGiorno, prossimaOccorrenza,
  dopoCompletamento, descrivi, quandoScade, quandoFatto, tocca,
} from '../ricorrenza';

const mod = modules.tasks;
const sz = sezioniTasks.faccende;

// Le frequenze offerte alla creazione: il resto si regola dal pannello.
const RAPIDE = [
  { key: 'una-tantum', label: 'Una volta',    ogni: 1 },
  { key: 'giorni',     label: 'Ogni giorno',  ogni: 1 },
  { key: 'settimana',  label: 'Ogni settimana', ogni: 1 },
  { key: 'mese',       label: 'Ogni mese',    ogni: 1 },
];

const GRUPPI = [
  { key: 'ritardo',   titolo: 'In ritardo' },
  { key: 'oggi',      titolo: 'Oggi' },
  { key: 'settimana', titolo: 'Questa settimana' },
  { key: 'dopo',      titolo: 'Più avanti' },
];

const COLORE_GRUPPO = {
  ritardo: colors.tomato,
  oggi: sz.accent,
  settimana: colors.inkSoft,
  dopo: colors.inkSoft,
  giorno: sz.accent,
  fatte: colors.done,
};

// È stata spuntata oggi? Allora sta fra le "Fatte oggi", non fra quelle da fare.
function fattaOggi(task) {
  const ultima = (task.storico || [])[0];
  return !!ultima && giorniTra(ultima.quando, Date.now()) === 0;
}

// In che giorno si mostra una faccenda: il suo, oppure oggi se è in ritardo —
// una cosa scaduta ieri la devi fare adesso, non ieri.
// Regola unica per la striscia e per il filtro: se ne esistessero due
// potrebbero discordare, e il pallino finirebbe su un giorno diverso dalla riga.
function giornoDiLista(task, oggi) {
  return Math.max(inizioGiorno(task.scadenza || oggi), oggi);
}

// "Oggi", "Domani", "Giovedì 23 luglio": titolo quando filtri per giorno.
function etichettaGiorno(ms) {
  const d = giorniTra(inizioGiorno(Date.now()), ms);
  if (d === 0) return 'Oggi';
  if (d === 1) return 'Domani';
  return new Date(ms).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function FaccendeScreen({ famigliaId, sezione, setSezione }) {
  const { nomi } = useContext(HeaderContext); // i membri, per dedurre di chi è il turno
  const [tasks, setTasks] = useState([]);
  const [nuovo, setNuovo] = useState('');
  const [ricorrenza, setRicorrenza] = useState('settimana');
  const [aperto, setAperto] = useState(null);  // id della faccenda nel pannello
  const [giorno, setGiorno] = useState(null);  // giorno scelto dalla striscia

  const tasksRef = collection(db, 'famiglie', famigliaId, 'tasks');
  const oggi = inizioGiorno(Date.now());
  const chi = auth.currentUser?.displayName || 'Qualcuno';

  useEffect(() => {
    const q = query(tasksRef, orderBy('scadenza', 'asc'));
    const stop = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  // Nasce nel giorno che stai guardando nella striscia (oggi se non ne hai scelto uno):
  // se è settimanale, quel giorno diventa anche il suo giorno fisso.
  async function crea(dati) {
    const nome = (dati.nome || '').trim();
    if (!nome) return;
    const parte = giorno != null ? giorno : oggi;
    const giorniSettimana = (dati.giorniSettimana || []).length
      ? dati.giorniSettimana
      : (dati.ricorrenza === 'settimana' && giorno != null ? [indiceGiorno(giorno)] : []);
    const serie = { ...dati, giorniSettimana, origine: parte };

    await addDoc(tasksRef, {
      nome,
      ricorrenza: dati.ricorrenza,
      ogni: dati.ogni || 1,
      giorniSettimana,
      ancora: dati.ancora || 'fisso',
      origine: parte,
      // Il primo giro parte dal giorno scelto; se ha giorni precisi, al primo utile.
      scadenza: giorniSettimana.length
        ? prossimaOccorrenza(serie, piuGiorni(parte, -1))
        : parte,
      aggiuntoDa: chi,
      creato: serverTimestamp(),
    });
  }

  function aggiungi(dati) {
    if (dati) {
      crea(dati);
    } else {
      const r = RAPIDE.find((x) => x.key === ricorrenza) || RAPIDE[2];
      crea({ nome: nuovo, ricorrenza: r.key, ogni: r.ogni });
    }
    setNuovo('');
  }

  // Spuntata: se non torna la elimino, altrimenti ricalcolo il prossimo giro
  // e tengo le ultime dieci volte per sapere chi fa cosa.
  // `primaDi` conserva lo stato di partenza: un tocco sbagliato si annulla.
  async function completa(item) {
    if (!item.ricorrenza || item.ricorrenza === 'una-tantum') {
      await deleteDoc(doc(tasksRef, item.id));
      return;
    }
    // serverTimestamp() non è ammesso dentro un array Firestore: uso l'ora del telefono.
    const storico = [{ chi, quando: Date.now() }, ...(item.storico || [])].slice(0, 10);
    await updateDoc(doc(tasksRef, item.id), {
      ...dopoCompletamento(item),
      storico,
      ultimoFattoDa: chi,
      ultimoFatto: serverTimestamp(),
      primaDi: {
        scadenza: item.scadenza ?? null,
        origine: item.origine ?? null,
        storico: item.storico || [],
      },
    });
  }

  // Ripristina com'era prima della spunta.
  async function annulla(item) {
    const prima = item.primaDi;
    if (!prima) return;
    const ultima = (item.storico || [])[1];
    await updateDoc(doc(tasksRef, item.id), {
      scadenza: prima.scadenza ?? oggi,
      origine: prima.origine ?? oggi,
      storico: prima.storico || [],
      ultimoFattoDa: ultima ? ultima.chi : null,
      primaDi: null,
    });
  }

  // Modifica dal pannello: cambiando la serie ricalcolo anche il giro in corso,
  // così quello che leggi in lista è sempre coerente con quello che hai scelto.
  async function cambia(item, patch) {
    const nuovoTask = { ...item, ...patch };
    const aggiornamento = { ...patch };
    if (nuovoTask.ricorrenza && nuovoTask.ricorrenza !== 'una-tantum') {
      const prossima = prossimaOccorrenza(
        { ...nuovoTask, origine: nuovoTask.origine || oggi },
        piuGiorni(oggi, -1), // oggi è ancora buono
      );
      if (prossima) aggiornamento.scadenza = prossima;
    }
    await updateDoc(doc(tasksRef, item.id), aggiornamento);
  }

  // Sposta solo questo giro. Non tocca `origine` né la ricorrenza: la serie
  // resta dov'è, così le pulizie fatte lunedì tornano comunque la domenica.
  async function sposta(item, quando) {
    await updateDoc(doc(tasksRef, item.id), { scadenza: quando });
  }

  async function elimina(item) {
    setAperto(null);
    await deleteDoc(doc(tasksRef, item.id));
  }

  // Quante faccende cadono in ciascun giorno: i pallini della striscia.
  // Niente finestra, così le frecce ‹ › funzionano su qualsiasi settimana.
  // Gli arretrati finiscono su oggi, dove `arretrate` li colora di rosso.
  const conteggi = useMemo(() => {
    const per = {};
    for (const t of tasks) {
      const g = giornoDiLista(t, oggi);
      per[g] = (per[g] || 0) + 1;
    }
    return per;
  }, [tasks, oggi]);

  const arretrate = tasks.filter((t) => inizioGiorno(t.scadenza || oggi) < oggi);

  // Raggruppa per urgenza: In ritardo · Oggi · Questa settimana · Più avanti,
  // più "Fatte oggi" in fondo. Con un giorno scelto dalla striscia mostro solo quello.
  const sezioniLista = useMemo(() => {
    // Spuntata oggi: sta solo fra le fatte, altrimenti comparirebbe due volte
    // (è già ripianificata in avanti).
    const fatte = tasks.filter((t) => fattaOggi(t));
    const attive = tasks.filter((t) => !fattaOggi(t));
    const sezioneFatte = fatte.length
      ? [{ titolo: 'Fatte oggi', chiave: 'fatte', data: fatte.map((t) => ({ ...t, fatta: true })) }]
      : [];

    // Scegliendo un giorno la domanda cambia: non è più "cosa devo fare adesso"
    // ma "cosa cade in questo giorno". Quindi una faccenda spuntata oggi e
    // ripianificata a domani va mostrata domani — è lì che la striscia la conta.
    // Solo su oggi resta esclusa, perché è già nella sezione "Fatte oggi".
    if (giorno != null) {
      const candidate = giorno === oggi ? attive : tasks;
      const data = candidate
        .filter((t) => giornoDiLista(t, oggi) === giorno)
        .map((t) => ({ ...t, stato: quandoScade(t.scadenza || oggi) }));
      return [
        ...(data.length ? [{ titolo: etichettaGiorno(giorno), chiave: 'giorno', data }] : []),
        ...(giorno === oggi ? sezioneFatte : []),
      ];
    }
    const per = { ritardo: [], oggi: [], settimana: [], dopo: [] };
    for (const t of attive) {
      const stato = quandoScade(t.scadenza || oggi);
      per[stato.gruppo].push({ ...t, stato });
    }
    return [
      ...GRUPPI
        .filter((g) => per[g.key].length)
        .map((g) => ({ titolo: g.titolo, chiave: g.key, data: per[g.key] })),
      ...sezioneFatte,
    ];
  }, [tasks, oggi, giorno]);

  const daFare = tasks.filter((t) => (t.scadenza || oggi) <= oggi).length;
  const inPannello = tasks.find((t) => t.id === aperto) || null;
  const staScrivendo = nuovo.trim().length > 0;
  const suggerimenti = useMemo(
    () => suggerisciFaccende(nuovo, tasks.map((t) => t.nome)),
    [nuovo, tasks],
  );

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={sz.accent}
        soft={sz.soft}
        icon={sz.icon}
        title="Faccende di casa"
        stat={
          tasks.length === 0
            ? 'Niente in programma'
            : daFare > 0
              ? `${daFare} da fare · ${tasks.length} in tutto`
              : `Tutto in pari · ${tasks.length} in programma`
        }
      >
        <SezioniTabs sezione={sezione} setSezione={setSezione} set={sezioniTasks} />
      </Hero>

      <Sheet>
        <View style={s.addRow}>
          <TouchableOpacity onPress={aggiungi} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={22} color={sz.accent} />
          </TouchableOpacity>
          <TextInput
            style={s.addInput}
            placeholder="Aggiungi faccenda"
            placeholderTextColor={colors.inkSoft}
            value={nuovo}
            onChangeText={setNuovo}
            onSubmitEditing={aggiungi}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        {/* I prossimi 7 giorni: fa vedere gli ingorghi prima di arrivarci */}
        {!staScrivendo && tasks.length > 0 && (
          <StrisciaGiorni
            conteggi={conteggi}
            inRitardo={arretrate.length}
            selezionato={giorno}
            onGiorno={setGiorno}
            accent={sz.accent}
          />
        )}

        {/* Faccende note: le prendi già col loro ritmo tipico */}
        {suggerimenti.length > 0 && (
          <View style={s.suggBox}>
            {suggerimenti.map((f) => (
              <TouchableOpacity
                key={f.nome}
                style={s.suggRiga}
                onPress={() => aggiungi(f)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={f.icona} size={17} color={colors.inkSoft} />
                <Text style={s.suggTxt}>{f.nome}</Text>
                <Text style={s.suggNota}>{descrivi(f).toLowerCase()}</Text>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={sz.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ogni quanto torna: si sceglie mentre scrivi, il resto dal pannello */}
        {staScrivendo && (
          <View style={s.rapide}>
            {RAPIDE.map((r) => {
              const attivo = ricorrenza === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[s.ric, attivo && { backgroundColor: sz.soft, borderColor: sz.accent }]}
                  onPress={() => setRicorrenza(r.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.ricTxt, attivo && { color: sz.accent, fontFamily: fonts.semibold }]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <SectionList
          sections={sezioniLista}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            giorno != null ? (
              <View style={s.vuoto}>
                <MaterialCommunityIcons name="coffee-outline" size={44} color={colors.faint} />
                <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>
                  {etichettaGiorno(giorno)}: niente
                </Text>
                <Text style={[font.small, { textAlign: 'center', marginBottom: 14 }]}>
                  Nessuna faccenda in programma.
                </Text>
                <TouchableOpacity style={s.tuttoBtn} onPress={() => setGiorno(null)} activeOpacity={0.8}>
                  <Text style={[s.tuttoTxt, { color: sz.accent }]}>Vedi tutte</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="broom" size={50} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>Nessuna faccenda</Text>
              <Text style={[font.small, { textAlign: 'center', marginBottom: 16 }]}>
                Scrivila qui sopra, oppure parti{'\n'}da quelle di sempre.
              </Text>
              <View style={s.semiWrap}>
                {FACCENDE_SEED.map((f) => (
                  <TouchableOpacity
                    key={f.nome}
                    style={s.seme}
                    onPress={() => crea(f)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name={f.icona} size={15} color={sz.accent} />
                    <Text style={s.semeTxt}>{f.nome}</Text>
                    <Text style={s.semeNota}>{descrivi(f).toLowerCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )
          }
          renderSectionHeader={({ section }) => (
            <View style={s.rigaSez}>
              <Text style={[s.titoloSez, { color: COLORE_GRUPPO[section.chiave] }]}>
                {section.titolo}
              </Text>
              {section.chiave === 'giorno' && (
                <TouchableOpacity onPress={() => setGiorno(null)} hitSlop={8} activeOpacity={0.7}>
                  <Text style={[s.tuttoTxt, { color: colors.inkSoft }]}>Vedi tutte</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const ultima = (item.storico || [])[0];
            const diChi = tocca(item.storico, nomi);

            // Appena spuntata: resta in vista, con chi l'ha fatta e come annullare.
            if (item.fatta) {
              return (
                <View style={[s.riga, s.rigaFatta]}>
                  <View style={[s.check, s.checkFatto]}>
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  </View>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setAperto(item.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={[font.body, s.nomeFatto]}>{item.nome}</Text>
                    <View style={s.chiRiga}>
                      <View style={[s.iniziale, { backgroundColor: sz.accent }]}>
                        <Text style={s.inizialeTxt}>
                          {(ultima?.chi?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[s.chiTxt, { color: sz.accent }]}>
                        fatta da {ultima?.chi || 'qualcuno'}
                      </Text>
                      <Text style={font.small} numberOfLines={1}>
                        · torna {quandoScade(item.scadenza || oggi).breve}
                        {diChi ? `, tocca a ${diChi}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {item.primaDi && (
                    <TouchableOpacity
                      style={s.annulla}
                      onPress={() => annulla(item)}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="undo-variant" size={15} color={colors.inkSoft} />
                      <Text style={s.annullaTxt}>Annulla</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }

            const colore = COLORE_GRUPPO[item.stato.gruppo];
            return (
              <View style={s.riga}>
                <TouchableOpacity
                  style={[s.check, { borderColor: colore }]}
                  onPress={() => completa(item)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={18} color={colore} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => setAperto(item.id)}
                  activeOpacity={0.6}
                >
                  <Text style={font.body}>{item.nome}</Text>
                  <Text style={font.small}>
                    {descrivi(item)} ·{' '}
                    <Text style={{ color: colore, fontFamily: fonts.medium }}>{item.stato.txt}</Text>
                  </Text>
                  {ultima && (
                    <View style={s.chiRiga}>
                      {/* Il pallino colorato dice a chi tocca adesso;
                          chi l'ha fatta l'ultima volta sta nel testo tenue. */}
                      <View style={[s.iniziale, { backgroundColor: sz.accent }]}>
                        <Text style={s.inizialeTxt}>
                          {((diChi || ultima.chi)?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      {diChi ? (
                        <Text style={[s.chiTxt, { color: sz.accent }]}>tocca a {diChi}</Text>
                      ) : null}
                      <Text style={s.ultima} numberOfLines={1}>
                        {diChi ? '· ' : ''}ultima volta: {ultima.chi}, {quandoFatto(ultima.quando)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.impostazioni}
                  onPress={() => setAperto(item.id)}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="tune-variant" size={16} color={colors.inkSoft} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </Sheet>

      <TaskPicker
        visible={!!inPannello}
        task={inPannello}
        accent={sz.accent}
        onCambia={(patch) => cambia(inPannello, patch)}
        onSposta={(quando) => sposta(inPannello, quando)}
        onElimina={() => elimina(inPannello)}
        onChiudi={() => setAperto(null)}
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
  rapide: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  ric: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  ricTxt: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  rigaSez: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, marginBottom: 8,
  },
  titoloSez: {
    fontFamily: fonts.semibold, fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  tuttoBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line,
  },
  tuttoTxt: { fontFamily: fonts.medium, fontSize: 13 },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8, padding: 12,
  },
  check: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  ultima: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  // Chi l'ha fatta: pallino con l'iniziale, come gli avatar in cima all'app.
  chiRiga: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  iniziale: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  inizialeTenue: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  inizialeTxt: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  chiTxt: { fontFamily: fonts.semibold, fontSize: 13 },
  rigaFatta: { backgroundColor: colors.bg, borderColor: colors.bg },
  checkFatto: { backgroundColor: colors.done, borderWidth: 0 },
  nomeFatto: { color: colors.inkSoft },
  annulla: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.card,
  },
  annullaTxt: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  suggBox: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, marginBottom: 14, overflow: 'hidden',
  },
  suggRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  suggTxt: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  suggNota: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.faint },
  impostazioni: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  vuoto: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 30, paddingTop: 20,
  },
  semiWrap: { width: '100%', gap: 8 },
  seme: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  semeTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  semeNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
});
