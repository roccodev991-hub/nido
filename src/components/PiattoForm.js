import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, font, fonts, shadow } from '../theme';
import { OCCASIONI, TIPI, IMPEGNI, STAGIONI } from '../piatti';
import { COMPENSA_TASTIERA } from '../tastiera';

// Riga di chip a scelta singola.
function ChipRow({ etichetta, opzioni, valore, onScegli, accent, soft }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{etichetta}</Text>
      <View style={s.chipWrap}>
        {opzioni.map((o) => {
          const attivo = valore === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[
                s.chip,
                attivo && { backgroundColor: soft, borderColor: accent },
              ]}
              onPress={() => onScegli(attivo ? null : o.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Modale per creare o modificare un piatto.
export default function PiattoForm({
  visible, piatto, onSalva, onChiudi, accent, soft, testoSalva,
}) {
  const [nome, setNome] = useState('');
  const [occasione, setOccasione] = useState('sempre');
  const [tipo, setTipo] = useState(null);
  const [impegno, setImpegno] = useState(null);
  const [stagione, setStagione] = useState('sempre');
  const [avanzi, setAvanzi] = useState(false);
  const [ingredienti, setIngredienti] = useState([]);
  const [ingr, setIngr] = useState('');
  const [tags, setTags] = useState([]);
  const [tag, setTag] = useState('');

  // All'apertura carico il piatto da modificare (o azzero per uno nuovo)
  useEffect(() => {
    if (!visible) return;
    setNome(piatto ? piatto.nome || '' : '');
    setOccasione(piatto ? (piatto.occasione || 'sempre') : 'sempre');
    setTipo(piatto ? piatto.tipo || null : null);
    setImpegno(piatto ? piatto.impegno || null : null);
    setStagione(piatto ? piatto.stagione || 'sempre' : 'sempre');
    setAvanzi(piatto ? !!piatto.avanzi : false);
    setIngredienti(piatto ? [...(piatto.ingredienti || [])] : []);
    setTags(piatto ? [...(piatto.tags || [])] : []);
    setIngr('');
    setTag('');
  }, [visible, piatto]);

  function addIngrediente() {
    const n = ingr.trim();
    if (!n) return;
    setIngredienti((a) => [...a, { nome: n }]);
    setIngr('');
  }

  function addTag() {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) { setTag(''); return; }
    setTags((a) => [...a, t]);
    setTag('');
  }

  function salva() {
    onSalva({
      nome: nome.trim(),
      occasione: occasione || 'sempre',
      tipo: tipo || null,
      impegno: impegno || null,
      stagione: stagione || 'sempre',
      avanzi,
      ingredienti,
      tags,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onChiudi}>
      {/* Nelle build native (edge-to-edge) Android non ridimensiona più la
          finestra quando esce la tastiera: senza questo, i campi in basso
          finiscono coperti. Su Expo Go sembrava a posto solo perché lì la
          finestra si restringe da sola. */}
      <KeyboardAvoidingView style={s.velo} behavior={COMPENSA_TASTIERA}>
        <Pressable style={s.sfondo} onPress={onChiudi} />
        <View style={s.foglio}>
          <View style={s.head}>
            <Text style={font.h2}>{piatto ? 'Modifica piatto' : 'Nuovo piatto'}</Text>
            <TouchableOpacity onPress={onChiudi} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <TextInput
              style={s.campoNome}
              placeholder="Nome del piatto (es. Bistecca e cicoria)"
              placeholderTextColor={colors.inkSoft}
              value={nome}
              onChangeText={setNome}
            />

            <ChipRow
              etichetta="Quando"
              opzioni={OCCASIONI}
              valore={occasione}
              onScegli={(v) => setOccasione(v || 'sempre')}
              accent={accent}
              soft={soft}
            />
            <ChipRow
              etichetta="Tipo"
              opzioni={TIPI}
              valore={tipo}
              onScegli={setTipo}
              accent={accent}
              soft={soft}
            />
            <ChipRow
              etichetta="Impegno"
              opzioni={IMPEGNI}
              valore={impegno}
              onScegli={setImpegno}
              accent={accent}
              soft={soft}
            />
            <ChipRow
              etichetta="Stagione"
              opzioni={STAGIONI}
              valore={stagione}
              onScegli={(v) => setStagione(v || 'sempre')}
              accent={accent}
              soft={soft}
            />

            {/* Se ne avanza, "Proponi" può mettere «Avanzi» nel pasto dopo. */}
            <View style={{ marginBottom: 14 }}>
              <Text style={s.label}>Avanzi</Text>
              <TouchableOpacity
                style={[s.chip, s.chipAvanzi, avanzi && { backgroundColor: soft, borderColor: accent }]}
                onPress={() => setAvanzi((v) => !v)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="recycle-variant"
                  size={15}
                  color={avanzi ? accent : colors.inkSoft}
                />
                <Text style={[s.chipTxt, avanzi && { color: accent, fontFamily: fonts.semibold }]}>
                  Di solito ne avanza per un altro pasto
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Ingredienti</Text>
            <View style={s.addRow}>
              <TouchableOpacity onPress={addIngrediente} activeOpacity={0.7} hitSlop={8}>
                <MaterialCommunityIcons name="plus" size={22} color={accent} />
              </TouchableOpacity>
              <TextInput
                style={s.addInput}
                placeholder="Aggiungi ingrediente"
                placeholderTextColor={colors.inkSoft}
                value={ingr}
                onChangeText={setIngr}
                onSubmitEditing={addIngrediente}
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </View>
            <View style={s.listaChip}>
              {ingredienti.length === 0 ? (
                <Text style={[font.small, { paddingVertical: 4 }]}>Nessun ingrediente.</Text>
              ) : (
                ingredienti.map((it, idx) => (
                  <View key={idx} style={[s.chipPieno, { backgroundColor: soft }]}>
                    <Text style={[s.chipPienoTxt, { color: accent }]}>
                      {it.nome}{it.qta ? ` · ${it.qta}${it.unita ? ` ${it.unita}` : ''}` : ''}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIngredienti((a) => a.filter((_, i) => i !== idx))}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons name="close" size={14} color={accent} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <Text style={[s.label, { marginTop: 14 }]}>Tag liberi</Text>
            <View style={s.addRow}>
              <TouchableOpacity onPress={addTag} activeOpacity={0.7} hitSlop={8}>
                <MaterialCommunityIcons name="tag-plus-outline" size={20} color={accent} />
              </TouchableOpacity>
              <TextInput
                style={s.addInput}
                placeholder="es. domenica, ospiti, comfort food"
                placeholderTextColor={colors.inkSoft}
                value={tag}
                onChangeText={setTag}
                onSubmitEditing={addTag}
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </View>
            <View style={s.listaChip}>
              {tags.map((t, idx) => (
                <View key={idx} style={s.tagChip}>
                  <Text style={s.tagChipTxt}>#{t}</Text>
                  <TouchableOpacity
                    onPress={() => setTags((a) => a.filter((_, i) => i !== idx))}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="close" size={13} color={colors.inkSoft} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[s.salva, { backgroundColor: accent }]}
            onPress={salva}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={s.salvaTxt}>{testoSalva || 'Salva piatto'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32, 48, 31, 0.35)' },
  foglio: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: 20, paddingBottom: 28, ...shadow.float,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  campoNome: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16,
    color: colors.ink, fontFamily: fonts.regular, marginBottom: 16,
  },
  label: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 7,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  chipTxt: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  chipAvanzi: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
  },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10,
  },
  addInput: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: fonts.regular, padding: 0 },
  listaChip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipPieno: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipPienoTxt: { fontFamily: fonts.medium, fontSize: 14 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg, borderRadius: radius.pill,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  tagChipTxt: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  salva: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.pill, paddingVertical: 15, marginTop: 16,
  },
  salvaTxt: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 16 },
});
