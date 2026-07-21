import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection, query, orderBy, where, onSnapshot, getDocs, addDoc, deleteDoc,
  updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { colors, radius, font, fonts, sezioni, statiDispensa } from '../theme';
import {
  raggruppaPerCategoria, normalizza, perSchermo, TUTTI_I_PRODOTTI, CATEGORIE,
} from '../catalogo';
import { useCategorie, registraAcquisto, imparaCategoria } from '../frequenti';
import Hero, { Sheet, SezioniTabs } from '../components/Hero';
import CategoriaPicker from '../components/CategoriaPicker';

const mod = sezioni.lista;

export default function ListaScreen({ famigliaId, sezione, setSezione }) {
  const { frequenti, categoriaPer, conservazionePer } = useCategorie(famigliaId);
  const [articoli, setArticoli] = useState([]);
  const [dispensa, setDispensa] = useState([]);
  const [nuovo, setNuovo] = useState('');
  const [mostraStorico, setMostraStorico] = useState(false);
  const [itemModifica, setItemModifica] = useState(null);

  const listaRef = collection(db, 'famiglie', famigliaId, 'spesa');
  const dispensaRef = collection(db, 'famiglie', famigliaId, 'dispensa');

  // Lista in tempo reale
  useEffect(() => {
    const q = query(listaRef, orderBy('creato', 'desc'));
    const stop = onSnapshot(q, (snap) => {
      setArticoli(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  // Dispensa: serve per suggerire i prodotti che stanno finendo
  useEffect(() => {
    const stop = onSnapshot(dispensaRef, (snap) => {
      setDispensa(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return stop;
  }, [famigliaId]);

  async function aggiungiNome(nomeRaw) {
    const nome = (nomeRaw != null ? nomeRaw : nuovo).trim();
    if (!nome) return;
    setNuovo('');
    setMostraStorico(false);
    await addDoc(listaRef, {
      nome,
      categoria: categoriaPer(nome),
      aggiuntoDa: auth.currentUser.displayName || 'Qualcuno',
      creato: serverTimestamp(),
    });
  }

  // Comprato → in dispensa (senza doppioni), e registra l'acquisto nello storico
  async function comprato(item) {
    // Se il prodotto è già in dispensa (es. un "immancabile" finito), lo riporto a "c'è".
    const esistenti = await getDocs(query(dispensaRef, where('nome', '==', item.nome)));
    if (!esistenti.empty) {
      await updateDoc(esistenti.docs[0].ref, {
        stato: 'pieno',
        compratoIl: serverTimestamp(),
      });
    } else {
      const categoria = item.categoria || categoriaPer(item.nome);
      await addDoc(dispensaRef, {
        nome: item.nome,
        categoria,
        conservazione: conservazionePer(item.nome, categoria),
        stato: 'pieno',
        compratoIl: serverTimestamp(),
        creato: serverTimestamp(),
      });
    }
    await deleteDoc(doc(listaRef, item.id));
    registraAcquisto(famigliaId, item).catch(() => {});
  }

  async function elimina(item) {
    await deleteDoc(doc(listaRef, item.id));
  }

  // Cambia reparto a mano e "insegna" all'app per la prossima volta
  async function cambiaReparto(item, catKey) {
    setItemModifica(null);
    await updateDoc(doc(listaRef, item.id), { categoria: catKey });
    imparaCategoria(famigliaId, item.nome, catKey).catch(() => {});
  }

  // Suggerimenti mentre scrivi (catalogo + storico), escludendo ciò che è già in lista
  const suggerimenti = useMemo(() => {
    const testo = normalizza(nuovo);
    if (!testo) return [];
    const inLista = new Set(articoli.map((a) => normalizza(a.nome)));
    const cand = new Map();
    for (const f of frequenti) {
      cand.set(normalizza(f.nome), { disp: f.nome, count: f.conteggio || 0 });
    }
    for (const p of TUTTI_I_PRODOTTI) {
      const n = normalizza(p);
      if (!cand.has(n)) cand.set(n, { disp: p, count: 0 });
    }
    const out = [];
    for (const [n, v] of cand) {
      if (inLista.has(n)) continue;
      if (n.startsWith(testo)) out.push({ ...v, rank: 0 });
      else if (n.includes(testo)) out.push({ ...v, rank: 1 });
    }
    out.sort((a, b) => a.rank - b.rank || b.count - a.count || a.disp.localeCompare(b.disp));
    return out.slice(0, 6);
  }, [nuovo, frequenti, articoli]);

  // Comprati spesso (quando il campo è vuoto e apri lo storico)
  const spesso = useMemo(() => {
    const inLista = new Set(articoli.map((a) => normalizza(a.nome)));
    return [...frequenti]
      .filter((f) => (f.conteggio || 0) > 0 && !inLista.has(normalizza(f.nome)))
      .sort((a, b) => (b.conteggio || 0) - (a.conteggio || 0))
      .slice(0, 8);
  }, [frequenti, articoli]);

  // Prodotti in dispensa che stanno finendo o sono finiti (e non già in lista)
  const daRicomprare = useMemo(() => {
    const inLista = new Set(articoli.map((a) => normalizza(a.nome)));
    const ordine = { finito: 0, poco: 1 };
    return dispensa
      .filter((p) => (p.stato === 'poco' || p.stato === 'finito') && !inLista.has(normalizza(p.nome)))
      .sort((a, b) => (ordine[a.stato] ?? 9) - (ordine[b.stato] ?? 9));
  }, [dispensa, articoli]);

  const sezioniLista = raggruppaPerCategoria(articoli);
  const staScrivendo = nuovo.trim().length > 0;

  return (
    <View style={{ flex: 1 }}>
      <Hero
        accent={mod.accent}
        soft={mod.soft}
        icon={mod.icon}
        title="Da comprare"
        stat={
          articoli.length === 0
            ? 'Niente in lista, per ora'
            : `${articoli.length} ${articoli.length === 1 ? 'articolo da prendere' : 'articoli da prendere'}`
        }
      >
        <SezioniTabs sezione={sezione} setSezione={setSezione} />
      </Hero>

      <Sheet>
        <View style={s.addRow}>
          <TouchableOpacity onPress={() => aggiungiNome()} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={22} color={mod.accent} />
          </TouchableOpacity>
          <TextInput
            style={s.addInput}
            placeholder="Aggiungi articolo"
            placeholderTextColor={colors.inkSoft}
            value={nuovo}
            onChangeText={setNuovo}
            onSubmitEditing={() => aggiungiNome()}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={() => setMostraStorico((v) => !v)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="history"
              size={22}
              color={mostraStorico ? mod.accent : colors.inkSoft}
            />
          </TouchableOpacity>
        </View>

        {/* Suggerimenti mentre scrivi */}
        {staScrivendo && suggerimenti.length > 0 && (
          <View style={s.suggBox}>
            {suggerimenti.map((sug) => (
              <TouchableOpacity
                key={sug.disp}
                style={s.suggRiga}
                onPress={() => aggiungiNome(sug.disp)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={sug.count > 0 ? 'history' : 'magnify'}
                  size={17}
                  color={colors.inkSoft}
                />
                <Text style={s.suggTxt}>{perSchermo(sug.disp)}</Text>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={mod.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pannello nascosto: stanno finendo + comprati spesso */}
        {!staScrivendo && mostraStorico && (
          <View style={s.storico}>
            {daRicomprare.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.storicoTitolo}>Stanno finendo in dispensa</Text>
                <View style={s.chipWrap}>
                  {daRicomprare.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={s.chip}
                      onPress={() => aggiungiNome(p.nome)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[s.chipDot, { backgroundColor: (statiDispensa[p.stato] || {}).colore }]}
                      />
                      <Text style={s.chipTxt}>{perSchermo(p.nome)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.storicoTitolo}>Comprati spesso</Text>
            {spesso.length === 0 ? (
              <Text style={font.small}>
                Ancora niente qui: quando spunti gli articoli comprati, i più frequenti compaiono qui.
              </Text>
            ) : (
              <View style={s.chipWrap}>
                {spesso.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={s.chip}
                    onPress={() => aggiungiNome(f.nome)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={14} color={mod.accent} />
                    <Text style={s.chipTxt}>{perSchermo(f.nome)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <SectionList
          sections={sezioniLista}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.vuoto}>
              <MaterialCommunityIcons name="cart-outline" size={54} color={colors.faint} />
              <Text style={[font.h2, { marginTop: 12, marginBottom: 4 }]}>Lista vuota</Text>
              <Text style={[font.small, { textAlign: 'center' }]}>
                Scrivi qui sopra la prima cosa{'\n'}da comprare.
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
            const cat = item.categoria && CATEGORIE[item.categoria] ? item.categoria : 'altro';
            const isAltro = cat === 'altro';
            return (
              <View style={s.riga}>
                <TouchableOpacity
                  style={s.check}
                  onPress={() => comprato(item)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={18} color={mod.accent} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={font.body}>{perSchermo(item.nome)}</Text>
                  {item.piatto ? (
                    <Text style={s.daPiatto} numberOfLines={1}>da {item.piatto}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={s.repChip}
                    onPress={() => setItemModifica(item)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={CATEGORIE[cat].icon}
                      size={12}
                      color={isAltro ? mod.accent : colors.inkSoft}
                    />
                    <Text style={[s.repChipTxt, isAltro && { color: mod.accent }]}>
                      {CATEGORIE[cat].label}
                    </Text>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={11}
                      color={isAltro ? mod.accent : colors.inkSoft}
                    />
                  </TouchableOpacity>
                </View>
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

      <CategoriaPicker
        visible={!!itemModifica}
        nome={itemModifica?.nome}
        corrente={itemModifica?.categoria}
        accent={mod.accent}
        onScegli={(k) => cambiaReparto(itemModifica, k)}
        onChiudi={() => setItemModifica(null)}
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
  suggBox: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, marginBottom: 14, overflow: 'hidden',
  },
  suggRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  suggTxt: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  storico: { marginBottom: 14 },
  storicoTitolo: {
    fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: mod.soft, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipTxt: { fontFamily: fonts.medium, fontSize: 13, color: mod.accent },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  reparto: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginBottom: 8,
  },
  repartoTxt: {
    fontFamily: fonts.semibold, fontSize: 13, color: mod.accent,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, marginBottom: 8,
    padding: 12,
  },
  check: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: mod.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  repChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: colors.bg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  repChipTxt: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  daPiatto: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 1 },
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
