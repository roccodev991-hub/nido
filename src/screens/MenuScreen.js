import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, Modal, Pressable,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection, doc, query, orderBy, onSnapshot, getDocs, addDoc, deleteDoc,
  setDoc, updateDoc, deleteField, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, shadow, sezioni } from '../theme';
import { normalizza, perSchermo } from '../catalogo';
import { COMPENSA_TASTIERA } from '../tastiera';
import { useCategorie } from '../frequenti';
import {
  piattiRef, importaPiattiSeed, deduciTipiMancanti, stagioneCorrente, TIPI, IMPEGNI,
} from '../piatti';
import Hero, { Sheet, SezioniTabs } from '../components/Hero';
import { useDialog } from '../components/Dialog';
import PiattoForm from '../components/PiattoForm';

const mod = sezioni.menu;
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const PASTI = [
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
];

// Lunedì della settimana corrente (mezzanotte).
function lunedi(base = new Date()) {
  const d = new Date(base);
  const g = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - g);
  d.setHours(0, 0, 0, 0);
  return d;
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "Firma" degli ingredienti richiesti dal menu: cambia se cambia ciò che serve.
function firmaMenu(slots) {
  const nomi = new Set();
  for (const v of Object.values(slots || {})) {
    if (v && v.tipo === 'piatto') {
      for (const i of v.ingredienti || []) {
        const n = normalizza(i.nome);
        if (n) nomi.add(n);
      }
    }
  }
  return [...nomi].sort().join('|');
}

const WARN = '#B07813';
const WARN_SOFT = '#F6ECD9';

// Mescola una lista (Fisher-Yates): serve a rompere i pareggi in modo casuale.
function mescola(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MenuScreen({ famigliaId, sezione, setSezione }) {
  const dialog = useDialog();
  const { categoriaPer } = useCategorie(famigliaId);
  const [piatti, setPiatti] = useState([]);
  const [settimana, setSettimana] = useState({});
  const [picker, setPicker] = useState(false);
  const [cerca, setCerca] = useState('');
  const [target, setTarget] = useState(null); // { giorno: index, pasto: 'pranzo'|'cena' }

  // form piatto: aperto in creazione (piattoInModifica === null) o modifica
  const [formAperto, setFormAperto] = useState(false);
  const [piattoInModifica, setPiattoInModifica] = useState(null);

  const generando = useRef(false);
  const settimanaCaricata = useRef(false);
  const inCasaRef = useRef(new Set());
  const [proposta, setProposta] = useState(null); // { slot: {...}, nonRiempiti }

  const [offset, setOffset] = useState(0); // 0 = questa settimana, +1 = prossima…
  const inizio = useMemo(() => {
    const d = lunedi();
    d.setDate(d.getDate() + offset * 7);
    return d;
  }, [offset]);
  const settimanaKey = ymd(inizio);
  const oggiKey = ymd(new Date());

  const giorni = useMemo(() => (
    GIORNI.map((label, i) => {
      const d = new Date(inizio);
      d.setDate(d.getDate() + i);
      return { i, label, num: d.getDate(), key: ymd(d) };
    })
  ), [inizio]);

  const settimanaRef = doc(db, 'famiglie', famigliaId, 'menuSettimana', settimanaKey);

  useEffect(() => {
    const stop = onSnapshot(query(piattiRef(famigliaId), orderBy('nome')), (snap) => {
      setPiatti(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  useEffect(() => {
    settimanaCaricata.current = false;
    const stop = onSnapshot(settimanaRef, (snap) => {
      setSettimana(snap.exists() ? snap.data() : {});
      settimanaCaricata.current = true;
    });
    return stop;
  }, [famigliaId, settimanaKey]);

  const slots = settimana.slots || {};
  const gen = settimana.ultimaGenerazione || null;
  const firmaCorrente = firmaMenu(slots);
  const nPasti = Object.values(slots).filter(Boolean).length;

  const etichettaSettimana = offset === 0
    ? 'Questa settimana'
    : offset === 1
      ? 'Prossima settimana'
      : offset === -1
        ? 'Settimana scorsa'
        : `Settimana del ${inizio.getDate()} ${MESI[inizio.getMonth()]}`;
  const fine = new Date(inizio);
  fine.setDate(fine.getDate() + 6);
  const rangeSettimana = inizio.getMonth() === fine.getMonth()
    ? `${inizio.getDate()} – ${fine.getDate()} ${MESI[fine.getMonth()]}`
    : `${inizio.getDate()} ${MESI[inizio.getMonth()]} – ${fine.getDate()} ${MESI[fine.getMonth()]}`;

  // Auto-sincronizza la lista spesa col menu quando cambiano gli ingredienti richiesti.
  useEffect(() => {
    if (!settimanaCaricata.current) return; // aspetta il primo caricamento
    if (generando.current) return;
    if (firmaCorrente === (gen ? gen.firma || '' : '')) return; // già allineata
    generando.current = true;
    sincronizzaLista().finally(() => { generando.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaCorrente, gen ? gen.firma : '']);

  const senzaTipo = piatti.filter((p) => !p.tipo).length;

  const piattiFiltrati = useMemo(() => {
    const t = normalizza(cerca);
    if (!t) return piatti;
    return piatti.filter((p) => normalizza(p.nome).includes(t));
  }, [piatti, cerca]);

  const slotKey = (giorno, pasto) => `g${giorno}_${pasto}`;

  async function impostaSlot(valore) {
    if (!target) return;
    const key = slotKey(target.giorno, target.pasto);
    await setDoc(settimanaRef, { slots: { [key]: valore } }, { merge: true });
    setPicker(false);
    setCerca('');
  }

  async function svuotaSlot(giorno, pasto) {
    const key = slotKey(giorno, pasto);
    await setDoc(settimanaRef, { slots: { [key]: deleteField() } }, { merge: true });
  }

  function apriPicker(giorno, pasto) {
    setTarget({ giorno, pasto });
    setCerca('');
    setPicker(true);
  }

  // apre il ricettario senza uno slot target (solo gestione/consultazione)
  function apriPickerLibero() {
    setTarget(null);
    setCerca('');
    setPicker(true);
  }

  function apriNuovo() {
    setPiattoInModifica(null);
    setPicker(false);
    setFormAperto(true);
  }

  function apriModifica(p) {
    setPiattoInModifica(p);
    setPicker(false);
    setFormAperto(true);
  }

  // Salva dal form: crea un nuovo piatto o aggiorna quello in modifica.
  async function salvaPiatto(dati) {
    if (!dati.nome) {
      dialog({ title: 'Manca il nome', message: 'Dai un nome al piatto per salvarlo.' });
      return;
    }
    setFormAperto(false);
    if (piattoInModifica) {
      await updateDoc(doc(piattiRef(famigliaId), piattoInModifica.id), dati);
      setPiattoInModifica(null);
      return;
    }
    await addDoc(piattiRef(famigliaId), { ...dati, creato: serverTimestamp() });
    if (target) {
      await impostaSlot({ tipo: 'piatto', nome: dati.nome, ingredienti: dati.ingredienti });
    }
  }

  // Assegna in automatico il tipo (carne/pesce/veg) ai piatti che non ce l'hanno.
  async function deduciTipi() {
    const n = await deduciTipiMancanti(famigliaId, piatti);
    dialog({
      title: n === 0 ? 'Già tutti a posto' : 'Tipi assegnati',
      message: n === 0
        ? 'Tutti i piatti hanno già un tipo.'
        : `Ho dedotto il tipo di ${n} ${n === 1 ? 'piatto' : 'piatti'} dagli ingredienti. Controlla dal ricettario e correggi quelli sbagliati.`,
    });
  }

  function eliminaPiatto(p) {
    dialog({
      title: 'Eliminare il piatto?',
      message: `"${p.nome}" verrà tolto dal ricettario.`,
      actions: [
        {
          label: 'Elimina',
          tone: 'danger',
          onPress: () => deleteDoc(doc(piattiRef(famigliaId), p.id)).catch(() => {}),
        },
        { label: 'Annulla', tone: 'ghost' },
      ],
    });
  }

  // Allinea in automatico la lista spesa al menu attuale (silenzioso):
  // aggiunge gli ingredienti mancanti e rimuove quelli dei piatti tolti
  // (solo quelli generati dal menu e non ancora comprati). Salta ciò che è in dispensa.
  async function sincronizzaLista() {
    const voluti = new Map(); // nomeNorm -> { nome, piatto }
    for (const v of Object.values(settimana.slots || {})) {
      if (v && v.tipo === 'piatto') {
        for (const i of v.ingredienti || []) {
          const n = normalizza(i.nome);
          if (n && !voluti.has(n)) voluti.set(n, { nome: i.nome, piatto: v.nome });
        }
      }
    }

    const spesaRef = collection(db, 'famiglie', famigliaId, 'spesa');
    const dispensaRef = collection(db, 'famiglie', famigliaId, 'dispensa');
    const [dispSnap, spesaSnap] = await Promise.all([getDocs(dispensaRef), getDocs(spesaRef)]);
    const inCasa = new Set(
      dispSnap.docs.map((d) => d.data())
        .filter((d) => (d.stato || 'pieno') === 'pieno')
        .map((d) => normalizza(d.nome)),
    );

    const batch = writeBatch(db);
    const inLista = new Set();
    let modifiche = 0;

    // 1) Riconcilia gli articoli già in lista.
    // Gestisco solo quelli generati da QUESTA settimana: gli altri (altre settimane
    // o aggiunti a mano) restano intoccabili, ma occupano il posto per non duplicare.
    for (const d of spesaSnap.docs) {
      const dati = d.data();
      const n = normalizza(dati.nome);
      const miei = dati.daMenu === settimanaKey || (dati.daMenu === true && offset === 0);
      if (miei) {
        if (voluti.has(n)) {
          inLista.add(n); // ancora richiesto: resta
        } else {
          batch.delete(d.ref); // piatto tolto: via dalla lista
          modifiche += 1;
        }
      } else {
        inLista.add(n); // di un'altra settimana o aggiunto a mano: non lo tocco
      }
    }

    // 2) Aggiungo i nuovi ingredienti mancanti
    for (const [n, info] of voluti) {
      if (inCasa.has(n) || inLista.has(n)) continue;
      batch.set(doc(spesaRef), {
        nome: info.nome,
        categoria: categoriaPer(info.nome),
        piatto: info.piatto,
        daMenu: settimanaKey,
        aggiuntoDa: auth.currentUser.displayName || 'Menu',
        creato: serverTimestamp(),
      });
      modifiche += 1;
      inLista.add(n);
    }

    if (modifiche > 0) await batch.commit();
    // Memorizza la firma raggiunta (così l'auto-sync non riparte a vuoto)
    await setDoc(
      settimanaRef,
      voluti.size > 0
        ? { ultimaGenerazione: { firma: firmaMenu(settimana.slots || {}), quando: serverTimestamp() } }
        : { ultimaGenerazione: deleteField() },
      { merge: true },
    );
  }

  function svuotaMenu() {
    if (Object.keys(slots).length === 0) return;
    dialog({
      title: 'Svuotare il menu?',
      message: 'Toglie tutti i piatti dalla settimana. Gli ingredienti aggiunti dal menu (non ancora comprati) verranno rimossi anche dalla lista.',
      actions: [
        {
          label: 'Svuota il menu',
          tone: 'danger',
          onPress: async () => {
            const upd = {};
            for (const k of Object.keys(slots)) upd[`slots.${k}`] = deleteField();
            // Svuota gli slot ma lascia la firma vecchia: l'auto-sync pulirà la lista.
            await updateDoc(settimanaRef, upd).catch(() => {});
          },
        },
        { label: 'Annulla', tone: 'ghost' },
      ],
    });
  }

  // Un piatto è adatto a un pasto secondo la sua "occasione".
  function adatto(piatto, pasto) {
    const occ = (piatto.occasione || '').toLowerCase();
    if (!occ || occ === 'sempre') return true;
    return occ === pasto; // 'pranzo' | 'cena'
  }

  // Quanto un piatto è già "coperto" dalla dispensa (0..1): più alto = meno spesa.
  function punteggioDispensa(piatto, inCasa) {
    const ingr = piatto.ingredienti || [];
    if (ingr.length === 0) return 0;
    const presenti = ingr.filter((i) => inCasa.has(normalizza(i.nome))).length;
    return presenti / ingr.length;
  }

  // Compone una proposta per i soli slot davvero vuoti.
  // Vincolo rigido: mai lo stesso piatto due volte nella settimana + occasione.
  // Il resto sono PREFERENZE (punteggio): dispensa, impegno adatto al giorno,
  // varietà di tipo, stagione. Se non c'è di meglio, riempie comunque.
  function creaProposta(inCasa) {
    const stagione = stagioneCorrente();
    const usati = new Set();
    const contaTipi = {}; // quante volte un tipo è già nella settimana

    for (const v of Object.values(slots)) {
      if (v && v.tipo === 'piatto') {
        usati.add(normalizza(v.nome));
        const pt = piatti.find((x) => normalizza(x.nome) === normalizza(v.nome));
        if (pt && pt.tipo) contaTipi[pt.tipo] = (contaTipi[pt.tipo] || 0) + 1;
      }
    }

    const proposta = {};
    let nonRiempiti = 0;
    // Un piatto che "fa avanzi" lascia la scia: il pasto subito dopo, se è
    // vuoto, diventa «Avanzi» invece di un piatto nuovo. Se il pasto dopo è
    // già occupato, la scia si perde (gli avanzi non scavalcano).
    let avanziInArrivo = false;

    for (const g of giorni) {
      const feriale = g.i <= 3; // lun–gio
      for (const p of PASTI) {
        const key = slotKey(g.i, p.key);
        if (slots[key]) { avanziInArrivo = false; continue; } // occupato: non si tocca

        if (avanziInArrivo) {
          proposta[key] = { tipo: 'avanzi' };
          avanziInArrivo = false;
          continue;
        }

        const candidati = piatti.filter(
          (pt) => !usati.has(normalizza(pt.nome)) && adatto(pt, p.key),
        );
        if (candidati.length === 0) { nonRiempiti += 1; continue; }

        const punteggio = (pt) => {
          let v = 2 * punteggioDispensa(pt, inCasa); // ciò che ho in casa
          // impegno: nei feriali meglio i veloci, nel weekend spazio agli elaborati
          if (pt.impegno === 'veloce') v += feriale ? 1 : 0.2;
          else if (pt.impegno === 'elaborato') v += feriale ? -1.2 : 0.8;
          // varietà: penalizzo i tipi già presenti nella settimana
          if (pt.tipo) v -= 0.6 * (contaTipi[pt.tipo] || 0);
          // stagione: chi è fuori stagione scende parecchio, ma non è escluso
          if (pt.stagione && pt.stagione !== 'sempre' && pt.stagione !== stagione) v -= 2;
          return v;
        };

        // mescolo (pareggi casuali, non alfabetici), ordino per punteggio,
        // poi pesco tra i migliori per mantenere varietà
        const ordinati = mescola(candidati).sort((a, b) => punteggio(b) - punteggio(a));
        const rosa = ordinati.slice(0, Math.min(5, ordinati.length));
        const scelto = rosa[Math.floor(Math.random() * rosa.length)];

        proposta[key] = {
          tipo: 'piatto',
          nome: scelto.nome,
          ingredienti: scelto.ingredienti || [],
        };
        usati.add(normalizza(scelto.nome));
        if (scelto.tipo) contaTipi[scelto.tipo] = (contaTipi[scelto.tipo] || 0) + 1;
        if (scelto.avanzi) avanziInArrivo = true;
      }
    }
    return { proposta, nonRiempiti };
  }

  async function proponi() {
    if (piatti.length === 0) {
      dialog({
        title: 'Ricettario vuoto',
        message: 'Aggiungi qualche piatto (o importa quelli di esempio) prima di usare Proponi.',
      });
      return;
    }
    // leggo la dispensa una volta sola, per preferire i piatti già coperti
    const dispSnap = await getDocs(collection(db, 'famiglie', famigliaId, 'dispensa'));
    const inCasa = new Set(
      dispSnap.docs.map((d) => d.data())
        .filter((d) => (d.stato || 'pieno') === 'pieno')
        .map((d) => normalizza(d.nome)),
    );
    inCasaRef.current = inCasa;

    const { proposta: p, nonRiempiti } = creaProposta(inCasa);
    if (Object.keys(p).length === 0) {
      dialog({
        title: 'Niente da proporre',
        message: 'Tutti gli slot sono già occupati, oppure non ci sono piatti adatti disponibili.',
      });
      return;
    }
    setProposta({ slot: p, nonRiempiti });
  }

  function rigeneraProposta() {
    const { proposta: p, nonRiempiti } = creaProposta(inCasaRef.current);
    setProposta({ slot: p, nonRiempiti });
  }

  async function applicaProposta() {
    if (!proposta) return;
    const p = proposta.slot;
    setProposta(null);
    await setDoc(settimanaRef, { slots: p }, { merge: true });
  }

  function renderSlot(giorno, pasto) {
    const v = slots[slotKey(giorno, pasto)];
    if (!v) {
      return (
        <TouchableOpacity
          style={s.slotVuoto}
          onPress={() => apriPicker(giorno, pasto)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={15} color={colors.inkSoft} />
          <Text style={s.slotVuotoTxt}>aggiungi</Text>
        </TouchableOpacity>
      );
    }
    const fuori = v.tipo === 'fuori';
    const avanzi = v.tipo === 'avanzi';
    const etichetta = avanzi ? 'Avanzi' : fuori ? 'Fuori' : v.nome;
    return (
      <View style={[s.slotPieno, fuori && { backgroundColor: colors.bg }]}>
        <TouchableOpacity
          style={s.slotTocca}
          onPress={() => apriPicker(giorno, pasto)}
          activeOpacity={0.7}
        >
          {(avanzi || fuori) && (
            <MaterialCommunityIcons
              name={avanzi ? 'recycle-variant' : 'home-export-outline'}
              size={14}
              color={fuori ? colors.inkSoft : mod.accent}
            />
          )}
          <Text
            style={[s.slotNome, fuori && { color: colors.inkSoft }]}
            numberOfLines={1}
          >
            {etichetta}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => svuotaSlot(giorno, pasto)} hitSlop={8} activeOpacity={0.7}>
          <MaterialCommunityIcons name="close" size={15} color={colors.inkSoft} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title="Menu settimana"
        stat={
          nPasti === 0
            ? 'Nessun pasto in programma'
            : `${nPasti} ${nPasti === 1 ? 'pasto' : 'pasti'} in programma`
        }
      >
        <SezioniTabs sezione={sezione} setSezione={setSezione} />
      </Hero>

      <Sheet>
        <View style={s.weekNav}>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setOffset((o) => o - 1)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={mod.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.weekCentro}
            onPress={() => setOffset(0)}
            disabled={offset === 0}
            activeOpacity={0.7}
          >
            <Text style={s.weekLabel}>{etichettaSettimana}</Text>
            <Text style={s.weekRange}>{rangeSettimana}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => setOffset((o) => o + 1)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={mod.accent} />
          </TouchableOpacity>
        </View>

        <View style={s.barraTop}>
          <TouchableOpacity style={s.ricettarioBtn} onPress={() => apriPickerLibero()} activeOpacity={0.8}>
            <MaterialCommunityIcons name="book-open-variant" size={16} color={mod.accent} />
            <Text style={s.ricettarioTxt}>Ricettario</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.proponiBtn} onPress={proponi} activeOpacity={0.8}>
            <MaterialCommunityIcons name="auto-fix" size={16} color="#FFFFFF" />
            <Text style={s.proponiTxt}>Proponi</Text>
          </TouchableOpacity>
        </View>

        <View style={s.subBar}>
          <View style={s.autoHint}>
            <MaterialCommunityIcons name="sync" size={13} color={colors.inkSoft} />
            <Text style={s.autoHintTxt}>La spesa si aggiorna dal menu</Text>
          </View>
          {Object.keys(slots).length > 0 && (
            <TouchableOpacity onPress={svuotaMenu} hitSlop={8} activeOpacity={0.7} style={s.svuotaBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.tomato} />
              <Text style={s.svuotaTxt}>Svuota</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {giorni.map((g) => {
            const oggi = g.key === oggiKey;
            return (
              <View key={g.i} style={[s.giorno, oggi && { borderColor: mod.accent }]}>
                <View style={s.giornoHead}>
                  <Text style={[s.giornoTxt, oggi && { color: mod.accent }]}>
                    {perSchermo(g.label)} {g.num}
                  </Text>
                  {oggi && <Text style={s.oggiTag}>oggi</Text>}
                </View>
                {PASTI.map((p) => (
                  <View key={p.key} style={s.pastoRiga}>
                    <Text style={s.pastoLabel}>{p.label}</Text>
                    <View style={{ flex: 1 }}>{renderSlot(g.i, p.key)}</View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </Sheet>

      {/* MODALE: scegli cosa mettere nello slot (o gestisci il ricettario) */}
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <KeyboardAvoidingView style={s.velo} behavior={COMPENSA_TASTIERA}>
          <Pressable style={s.sfondo} onPress={() => setPicker(false)} />
          <View style={s.foglio}>
            <View style={s.foglioHead}>
              <Text style={font.h2}>{target ? 'Cosa si mangia?' : 'Ricettario'}</Text>
              <TouchableOpacity onPress={() => setPicker(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>

            {target && (
              <>
                <TouchableOpacity
                  style={s.opzione}
                  onPress={() => impostaSlot({ tipo: 'avanzi' })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="recycle-variant" size={20} color={mod.accent} />
                  <Text style={s.opzioneTxt}>Avanzi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.opzione}
                  onPress={() => impostaSlot({ tipo: 'fuori' })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="home-export-outline" size={20} color={colors.inkSoft} />
                  <Text style={[s.opzioneTxt, { color: colors.inkSoft }]}>
                    Fuori (salta questo pasto)
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={s.opzione} onPress={apriNuovo} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={mod.accent} />
              <Text style={s.opzioneTxt}>Nuovo piatto</Text>
            </TouchableOpacity>

            {piatti.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={[font.small, { textAlign: 'center', marginBottom: 14 }]}>
                  Ricettario vuoto. Importa i piatti di esempio o creane uno.
                </Text>
                <TouchableOpacity
                  style={s.btnPrimario}
                  onPress={() => importaPiattiSeed(famigliaId)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="tray-arrow-down" size={18} color="#FFFFFF" />
                  <Text style={s.btnPrimarioTxt}>Importa piatti di esempio</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.cercaRow}>
                  <MaterialCommunityIcons name="magnify" size={18} color={colors.inkSoft} />
                  <TextInput
                    style={s.cercaInput}
                    placeholder="Cerca un piatto…"
                    placeholderTextColor={colors.inkSoft}
                    value={cerca}
                    onChangeText={setCerca}
                  />
                </View>
                {senzaTipo > 0 && (
                  <TouchableOpacity style={s.deduci} onPress={deduciTipi} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="auto-fix" size={16} color={mod.accent} />
                    <Text style={s.deduciTxt}>
                      Deduci il tipo di {senzaTipo} {senzaTipo === 1 ? 'piatto' : 'piatti'} dagli ingredienti
                    </Text>
                  </TouchableOpacity>
                )}
                <FlatList
                  data={piattiFiltrati}
                  keyExtractor={(i) => i.id}
                  style={{ maxHeight: 300, flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const et = [
                      (TIPI.find((t) => t.key === item.tipo) || {}).label,
                      (IMPEGNI.find((t) => t.key === item.impegno) || {}).label,
                    ].filter(Boolean);
                    return (
                      <View style={s.pRiga}>
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          onPress={() => (target
                            ? impostaSlot({ tipo: 'piatto', nome: item.nome, ingredienti: item.ingredienti || [] })
                            : apriModifica(item))}
                          activeOpacity={0.7}
                        >
                          <Text style={font.body}>{perSchermo(item.nome)}</Text>
                          <View style={s.pMeta}>
                            <Text style={font.small}>{(item.ingredienti || []).length} ingredienti</Text>
                            {et.map((e) => (
                              <View key={e} style={s.metaChip}>
                                <Text style={s.metaChipTxt}>{e}</Text>
                              </View>
                            ))}
                            {(item.tags || []).slice(0, 2).map((t) => (
                              <Text key={t} style={s.tagInline}>#{t}</Text>
                            ))}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => apriModifica(item)}
                          hitSlop={8}
                          activeOpacity={0.7}
                          style={{ padding: 6 }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={19} color={colors.inkSoft} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => eliminaPiatto(item)}
                          hitSlop={8}
                          activeOpacity={0.7}
                          style={{ padding: 6 }}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={19} color={colors.inkSoft} />
                        </TouchableOpacity>
                        {target && (
                          <TouchableOpacity
                            onPress={() => impostaSlot({ tipo: 'piatto', nome: item.nome, ingredienti: item.ingredienti || [] })}
                            hitSlop={8}
                            activeOpacity={0.7}
                            style={{ padding: 6 }}
                          >
                            <MaterialCommunityIcons name="plus-circle" size={24} color={mod.accent} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FORM: crea o modifica un piatto */}
      <PiattoForm
        visible={formAperto}
        piatto={piattoInModifica}
        accent={mod.accent}
        soft={mod.soft}
        testoSalva={!piattoInModifica && target ? 'Salva e metti nel menu' : 'Salva piatto'}
        onSalva={salvaPiatto}
        onChiudi={() => { setFormAperto(false); setPiattoInModifica(null); }}
      />

      {/* MODALE: anteprima della proposta */}
      <Modal
        visible={!!proposta}
        transparent
        animationType="slide"
        onRequestClose={() => setProposta(null)}
      >
        <View style={s.velo}>
          <Pressable style={s.sfondo} onPress={() => setProposta(null)} />
          <View style={s.foglio}>
            <View style={s.foglioHead}>
              <Text style={font.h2}>Proposta della settimana</Text>
              <TouchableOpacity onPress={() => setProposta(null)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>
            <Text style={[font.small, { marginBottom: 12 }]}>
              Riempie solo gli slot vuoti. Quelli che hai già scelto restano come sono.
            </Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {giorni.map((g) => {
                const righe = PASTI
                  .map((p) => ({ p, v: proposta ? proposta.slot[slotKey(g.i, p.key)] : null }))
                  .filter((r) => r.v);
                if (righe.length === 0) return null;
                return (
                  <View key={g.i} style={s.antGiorno}>
                    <Text style={s.antGiornoTxt}>{perSchermo(g.label)} {g.num}</Text>
                    {righe.map((r) => (
                      <View key={r.p.key} style={s.antRiga}>
                        <Text style={s.antPasto}>{r.p.label}</Text>
                        {r.v.tipo === 'avanzi' ? (
                          <View style={s.antAvanzi}>
                            <MaterialCommunityIcons name="recycle-variant" size={14} color={mod.accent} />
                            <Text style={[s.antNome, { color: mod.accent }]}>Avanzi</Text>
                          </View>
                        ) : (
                          <Text style={s.antNome} numberOfLines={1}>{r.v.nome}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
              {proposta && proposta.nonRiempiti > 0 && (
                <Text style={s.antNota}>
                  {proposta.nonRiempiti} {proposta.nonRiempiti === 1 ? 'slot resta vuoto' : 'slot restano vuoti'}:
                  {' '}non ci sono abbastanza piatti adatti (senza ripetere).
                </Text>
              )}
            </ScrollView>

            <View style={s.antAzioni}>
              <TouchableOpacity style={s.antRigenera} onPress={rigeneraProposta} activeOpacity={0.8}>
                <MaterialCommunityIcons name="shuffle-variant" size={18} color={mod.accent} />
                <Text style={s.antRigeneraTxt}>Rigenera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.antApplica} onPress={applicaProposta} activeOpacity={0.85}>
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={s.antApplicaTxt}>Applica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: mod.soft,
    alignItems: 'center', justifyContent: 'center',
  },
  weekCentro: { flex: 1, alignItems: 'center' },
  weekLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  weekRange: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  barraTop: {
    flexDirection: 'row', gap: 10, marginBottom: 14,
  },
  ricettarioBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: mod.soft, borderRadius: radius.pill, paddingVertical: 10,
  },
  ricettarioTxt: { color: mod.accent, fontFamily: fonts.semibold, fontSize: 14 },
  listaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: mod.accent, borderRadius: radius.pill, paddingVertical: 10,
  },
  listaTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 14 },
  proponiBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: mod.accent, borderRadius: radius.pill, paddingVertical: 10,
  },
  proponiTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 14 },
  subBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  autoHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  autoHintTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  svuotaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  svuotaTxt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.tomato },
  genBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: mod.soft, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14,
  },
  genBannerTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: mod.accent },
  annulla: { fontFamily: fonts.semibold, fontSize: 13, color: colors.tomato },
  genBannerWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: WARN_SOFT, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14,
  },
  genBannerWarnTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: WARN },
  rigeneraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: mod.accent, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  rigeneraTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 13 },
  giorno: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, padding: 12, marginBottom: 8,
  },
  giornoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  giornoTxt: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  oggiTag: {
    fontFamily: fonts.semibold, fontSize: 11, color: mod.accent,
    backgroundColor: mod.soft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  pastoRiga: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  pastoLabel: { width: 58, fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  slotVuoto: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: radius.sm, backgroundColor: colors.bg,
    alignSelf: 'flex-start',
  },
  slotVuotoTxt: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  slotPieno: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: radius.sm, backgroundColor: mod.soft,
  },
  slotTocca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  slotNome: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  antGiorno: { marginBottom: 12 },
  antGiornoTxt: {
    fontFamily: fonts.semibold, fontSize: 13, color: mod.accent,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4,
  },
  antRiga: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  antPasto: { width: 58, fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  antNome: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  antAvanzi: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  antNota: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft,
    marginTop: 4, marginBottom: 8, lineHeight: 19,
  },
  antAzioni: { flexDirection: 'row', gap: 10, marginTop: 16 },
  antRigenera: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: mod.soft, borderRadius: radius.pill, paddingVertical: 14,
  },
  antRigeneraTxt: { color: mod.accent, fontFamily: fonts.semibold, fontSize: 15 },
  antApplica: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: mod.accent, borderRadius: radius.pill, paddingVertical: 14,
  },
  antApplicaTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 15 },
  velo: { flex: 1, justifyContent: 'flex-end' },
  // sfondo cliccabile separato dal contenuto: così lo scroll dentro il foglio funziona
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32, 48, 31, 0.35)' },
  foglio: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 30, ...shadow.float,
    maxHeight: '100%', // mai piu alto dello spazio sopra la tastiera
  },
  foglioHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  opzione: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  opzioneTxt: { color: mod.accent, fontFamily: fonts.semibold, fontSize: 15 },
  cercaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, marginBottom: 10,
  },
  cercaInput: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: fonts.regular, padding: 0 },
  pRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  pMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  metaChip: {
    backgroundColor: mod.soft, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  metaChipTxt: { fontFamily: fonts.medium, fontSize: 11, color: mod.accent },
  tagInline: { fontFamily: fonts.regular, fontSize: 11, color: colors.faint },
  deduci: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: mod.soft, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  deduciTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: mod.accent },
  btnPrimario: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: mod.accent, borderRadius: radius.pill,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  btnPrimarioTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 15 },
  campoNome: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16,
    color: colors.ink, fontFamily: fonts.regular, marginBottom: 16,
  },
  label: {
    fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12,
  },
  addInput: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: fonts.regular, padding: 0 },
  ingrWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  ingrChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: mod.soft, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  ingrChipTxt: { color: mod.accent, fontFamily: fonts.medium, fontSize: 14 },
  genera: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: mod.accent, borderRadius: radius.pill, paddingVertical: 15, marginTop: 4,
  },
  generaTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 16 },
});
