import { useContext, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import {
  collection, doc, query, where, onSnapshot, addDoc, updateDoc,
  deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, modules, sezioniTasks } from '../theme';
import Hero, { Sheet, HeaderContext } from '../components/Hero';
import { normalizza, perSchermo } from '../catalogo';
import { vedeLEvento } from '../eventi';
import { lunedi, ymd } from '../settimana';
import {
  inizioGiorno, piuGiorni, dopoCompletamento, quandoScade, tocca,
} from '../ricorrenza';

const mod = modules.home;

// Quanto mostrare prima di riassumere: la home è un riepilogo, non una
// seconda copia delle liste.
const MAX_FINISCONO = 4;
const MAX_FACCENDE = 3;

// Saluto in base all'ora: la prima riga che leggi deve suonare come casa tua.
function saluto() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function HomeScreen({ famigliaId, vaiA }) {
  const { nomi } = useContext(HeaderContext);
  const [tasks, setTasks] = useState([]);
  const [spesa, setSpesa] = useState([]);
  const [scorte, setScorte] = useState([]);
  const [eventi, setEventi] = useState([]);
  const [settimana, setSettimana] = useState(null);

  const oggi = inizioGiorno(Date.now());
  const chi = auth.currentUser?.displayName || 'Qualcuno';
  const nome = (chi.split(' ')[0]) || '';

  const tasksRef = collection(db, 'famiglie', famigliaId, 'tasks');
  const spesaRef = collection(db, 'famiglie', famigliaId, 'spesa');
  const dispensaRef = collection(db, 'famiglie', famigliaId, 'dispensa');

  useEffect(() => {
    const stops = [
      onSnapshot(tasksRef, (s) => setTasks(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      onSnapshot(spesaRef, (s) => setSpesa(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
      // Solo ciò che manca: il resto della dispensa qui non serve.
      onSnapshot(
        query(dispensaRef, where('stato', 'in', ['poco', 'finito'])),
        (s) => setScorte(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      // Solo gli eventi di oggi: un intervallo invece dell'uguaglianza esatta,
      // così regge anche un `quando` che non cade preciso a mezzanotte.
      onSnapshot(
        query(
          collection(db, 'famiglie', famigliaId, 'eventi'),
          where('quando', '>=', oggi),
          where('quando', '<', piuGiorni(oggi, 1)),
        ),
        (s) => setEventi(
          s.docs.map((d) => ({ id: d.id, ...d.data() }))
            .filter((e) => vedeLEvento(e, auth.currentUser?.uid)),
        ),
      ),
      onSnapshot(
        doc(db, 'famiglie', famigliaId, 'menuSettimana', ymd(lunedi())),
        (s) => setSettimana(s.exists() ? s.data() : null),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [famigliaId]);

  // Pranzo e cena di oggi. Gli slot sono { tipo: 'piatto'|'avanzi'|'fuori', nome },
  // con le stesse etichette che usa il Menu.
  const pasti = useMemo(() => {
    const slots = settimana?.slots || {};
    const g = (new Date().getDay() + 6) % 7; // 0 = lunedì, come in settimana.js
    const leggi = (quale) => {
      const v = slots[`g${g}_${quale}`];
      if (!v) return null;
      if (v.tipo === 'avanzi') return 'Avanzi';
      if (v.tipo === 'fuori') return 'Fuori';
      return v.nome || null;
    };
    return { pranzo: leggi('pranzo'), cena: leggi('cena') };
  }, [settimana]);

  // Faccende che riguardano oggi: arretrate e in scadenza. Le altre no,
  // altrimenti la home diventa una seconda lista delle faccende.
  const daFare = useMemo(() => (
    tasks
      .filter((t) => inizioGiorno(t.scadenza || oggi) <= oggi)
      .sort((a, b) => (a.scadenza || 0) - (b.scadenza || 0))
  ), [tasks, oggi]);

  // Sta finendo: dispensa e casa a Poco/Finito che non hai già messo in lista.
  const finiscono = useMemo(() => {
    const inLista = new Set(spesa.map((a) => normalizza(a.nome)));
    const ordine = { finito: 0, poco: 1 };
    return scorte
      .filter((p) => !inLista.has(normalizza(p.nome)))
      .sort((a, b) => (ordine[a.stato] ?? 9) - (ordine[b.stato] ?? 9));
  }, [scorte, spesa]);

  async function completa(item) {
    if (!item.ricorrenza || item.ricorrenza === 'una-tantum') {
      await deleteDoc(doc(tasksRef, item.id));
      return;
    }
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

  async function metti(prodotto) {
    await addDoc(spesaRef, {
      nome: prodotto.nome,
      categoria: prodotto.categoria || 'altro',
      aggiuntoDa: chi,
      creato: serverTimestamp(),
    });
  }

  const niente = daFare.length === 0 && finiscono.length === 0 && eventi.length === 0
    && spesa.length === 0 && !pasti.pranzo && !pasti.cena;

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title={nome ? `${saluto()}, ${nome}` : saluto()}
        stat={new Date().toLocaleDateString('it-IT', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      />

      <Sheet>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          {niente && (
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="coffee-outline" size={48} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>Tutto tranquillo</Text>
              <Text style={[font.small, { textAlign: 'center' }]}>
                Niente in scadenza, niente da comprare.{'\n'}
                Apri un modulo dal menu ☰ per cominciare.
              </Text>
            </View>
          )}

          {/* — Eventi di oggi: raro, quindi quando c'è è una notizia: sta in cima — */}
          {eventi.length > 0 && (
            <Blocco
              icona="calendar-blank-outline"
              titolo={eventi.length === 1 ? 'Oggi' : 'Oggi avete'}
              colore={modules.calendario.accent}
              onApri={() => vaiA('calendario')}
            >
              {[...eventi]
                .sort((a, b) => (a.ora || '').localeCompare(b.ora || ''))
                .map((e) => {
                  const dettagli = [e.ora, e.luogo].filter(Boolean).join(' · ');
                  return (
                    <View key={e.id} style={s.evento}>
                      <View style={[s.puntoEvento, { backgroundColor: modules.calendario.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={font.body} numberOfLines={1}>{e.nome}</Text>
                        {dettagli ? (
                          <Text style={font.small} numberOfLines={1}>{dettagli}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
            </Blocco>
          )}

          {/* — Oggi si mangia — */}
          {(pasti.pranzo || pasti.cena) && (
            <Blocco
              icona="silverware-fork-knife"
              titolo="Oggi si mangia"
              colore={modules.cucina.accent}
              onApri={() => vaiA('cucina', 'menu')}
            >
              <Pasto etichetta="Pranzo" piatto={pasti.pranzo} />
              <Pasto etichetta="Cena" piatto={pasti.cena} />
            </Blocco>
          )}

          {/* — Faccende di oggi e arretrate — */}
          {daFare.length > 0 && (
            <Blocco
              icona="broom"
              titolo="Da fare oggi"
              colore={sezioniTasks.faccende.accent}
              badge={daFare.length}
              onApri={() => vaiA('tasks', 'faccende')}
            >
              {daFare.slice(0, MAX_FACCENDE).map((t) => {
                const stato = quandoScade(t.scadenza || oggi);
                const colore = stato.gruppo === 'ritardo' ? colors.tomato : sezioniTasks.faccende.accent;
                const diChi = tocca(t.storico, nomi);
                return (
                  <View key={t.id} style={s.faccenda}>
                    <TouchableOpacity
                      style={[s.check, { borderColor: colore }]}
                      onPress={() => completa(t)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="check" size={16} color={colore} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={font.body}>{t.nome}</Text>
                      <Text style={font.small} numberOfLines={1}>
                        <Text style={{ color: colore, fontFamily: fonts.medium }}>{stato.txt}</Text>
                        {diChi ? ` · tocca a ${diChi}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {daFare.length > MAX_FACCENDE && (
                <TouchableOpacity
                  style={s.altre}
                  onPress={() => vaiA('tasks', 'faccende')}
                  activeOpacity={0.7}
                >
                  <Text style={font.small}>
                    {daFare.length - MAX_FACCENDE === 1
                      ? 'e un’altra da fare'
                      : `e altre ${daFare.length - MAX_FACCENDE} da fare`}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.inkSoft} />
                </TouchableOpacity>
              )}
            </Blocco>
          )}

          {/* — Lista della spesa — */}
          {spesa.length > 0 && (
            <Blocco
              icona="cart-outline"
              titolo="Lista della spesa"
              colore={modules.cucina.accent}
              onApri={() => vaiA('cucina', 'lista')}
            >
              <Text style={font.body}>
                {spesa.length} {spesa.length === 1 ? 'articolo da prendere' : 'articoli da prendere'}
              </Text>
              <Text style={[font.small, { marginTop: 2 }]} numberOfLines={2}>
                {spesa.slice(0, 5).map((a) => a.nome).join(' · ')}
                {spesa.length > 5 ? ' …' : ''}
              </Text>
            </Blocco>
          )}

          {/* — Sta finendo — */}
          {finiscono.length > 0 && (
            <Blocco
              icona="alert-circle-outline"
              titolo="Sta finendo"
              colore="#B07813"
              onApri={() => vaiA('cucina', 'dispensa')}
            >
              <View style={s.chipWrap}>
                {finiscono.slice(0, MAX_FINISCONO).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={s.chip}
                    onPress={() => metti(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.chipTxt}>{perSchermo(p.nome)}</Text>
                    <MaterialCommunityIcons name="cart-plus" size={14} color={mod.accent} />
                  </TouchableOpacity>
                ))}
                {finiscono.length > MAX_FINISCONO && (
                  <Text style={[font.small, { alignSelf: 'center' }]}>
                    e altri {finiscono.length - MAX_FINISCONO}
                  </Text>
                )}
              </View>
              <Text style={[font.small, { marginTop: 8, color: colors.faint }]}>
                Tocca un prodotto per metterlo in lista.
              </Text>
            </Blocco>
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}

// Riquadro di un blocco: intestazione colorata + contenuto.
function Blocco({ icona, titolo, colore, badge, onApri, children }) {
  return (
    <View style={s.blocco}>
      <TouchableOpacity style={s.bloccoTop} onPress={onApri} activeOpacity={0.7}>
        <MaterialCommunityIcons name={icona} size={17} color={colore} />
        <Text style={[s.bloccoTitolo, { color: colore }]}>{titolo}</Text>
        {badge ? (
          <View style={[s.badge, { backgroundColor: colore }]}>
            <Text style={s.badgeTxt}>{badge}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.faint} />
      </TouchableOpacity>
      {children}
    </View>
  );
}

// Una riga pranzo/cena.
function Pasto({ etichetta, piatto }) {
  return (
    <View style={s.pasto}>
      <Text style={s.pastoEtichetta}>{etichetta}</Text>
      <Text style={[font.body, !piatto && { color: colors.faint }]} numberOfLines={1}>
        {piatto || 'niente in programma'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  blocco: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, padding: 14, marginBottom: 12,
  },
  bloccoTop: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10,
  },
  bloccoTitolo: {
    flex: 1, fontFamily: fonts.semibold, fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' },
  pasto: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  pastoEtichetta: {
    width: 58, fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft,
  },
  faccenda: {
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 5,
  },
  altre: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingTop: 8, paddingLeft: 37, // allineata al testo delle faccende
  },
  evento: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  puntoEvento: { width: 7, height: 7, borderRadius: 3.5, marginLeft: 4 },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg,
  },
  chipTxt: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  vuoto: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 50,
  },
});
