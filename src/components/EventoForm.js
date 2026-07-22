import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, ScrollView, TouchableOpacity, Pressable, StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import MeseGriglia from './MeseGriglia';
import { inizioGiorno } from '../ricorrenza';
import { COMPENSA_TASTIERA } from '../tastiera';

// Crea o modifica un evento. Solo il nome è obbligatorio: ora, luogo e note
// si riempiono quando servono (per un compleanno l'ora non ha senso).
export default function EventoForm({
  visible, evento, giorno, accent, io, membri, membriNomi, onSalva, onElimina, onChiudi,
}) {
  const [nome, setNome] = useState('');
  const [ora, setOra] = useState('');
  const [luogo, setLuogo] = useState('');
  const [note, setNote] = useState('');
  const [quando, setQuando] = useState(inizioGiorno(Date.now()));
  const [visibileA, setVisibileA] = useState([]);
  const [scegliData, setScegliData] = useState(false);

  // Riempio i campi ogni volta che si apre.
  useEffect(() => {
    if (!visible) return;
    setNome(evento?.nome || '');
    setOra(evento?.ora || '');
    setLuogo(evento?.luogo || '');
    setNote(evento?.note || '');
    setQuando(evento?.quando || giorno || inizioGiorno(Date.now()));
    // Un evento nuovo nasce solo tuo; uno vecchio senza `visibileA` era di tutti.
    setVisibileA(
      Array.isArray(evento?.visibileA) && evento.visibileA.length
        ? evento.visibileA
        : (evento ? membri : [io]),
    );
    setScegliData(false);
  }, [visible, evento, giorno, io, membri]);

  // Chi lo vede: tu ci sei sempre, gli altri si aggiungono e si tolgono.
  function alterna(uid) {
    if (uid === io) return;
    setVisibileA((v) => (v.includes(uid) ? v.filter((u) => u !== uid) : [...v, uid]));
  }

  function salva() {
    const pulito = nome.trim();
    if (!pulito) return;
    onSalva({
      nome: pulito,
      quando,
      ora: ora.trim() || null,
      luogo: luogo.trim() || null,
      note: note.trim() || null,
      visibileA: visibileA.includes(io) ? visibileA : [...visibileA, io],
    });
  }

  const altri = membri.filter((u) => u !== io);
  const condiviso = altri.some((u) => visibileA.includes(u));

  const dataScritta = new Date(quando).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChiudi}>
      {/* Vedi PiattoForm: nelle build native la tastiera copre i campi in
          basso (ora/luogo/note) senza questo compensatore. */}
      <KeyboardAvoidingView style={s.velo} behavior={COMPENSA_TASTIERA}>
        <Pressable style={s.sfondo} onPress={onChiudi} />
        <View style={s.pannello}>
          <View style={s.head}>
            <Text style={s.titolo}>{evento ? 'Modifica evento' : 'Nuovo evento'}</Text>
            <TouchableOpacity onPress={onChiudi} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={s.campoNome}
              placeholder="Cosa? (es. concerto dei Verdena)"
              placeholderTextColor={colors.inkSoft}
              value={nome}
              onChangeText={setNome}
              autoFocus={!evento}
            />

            <TouchableOpacity
              style={s.data}
              onPress={() => setScegliData((v) => !v)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="calendar-blank-outline" size={17} color={accent} />
              <Text style={[s.dataTxt, { color: accent }]}>{dataScritta}</Text>
              <MaterialCommunityIcons
                name={scegliData ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.inkSoft}
              />
            </TouchableOpacity>

            {scegliData && (
              <View style={s.calendario}>
                <MeseGriglia
                  selezionato={quando}
                  onGiorno={(g) => { if (g) { setQuando(g); setScegliData(false); } }}
                  accent={accent}
                />
              </View>
            )}

            <View style={s.riga}>
              <MaterialCommunityIcons name="clock-outline" size={17} color={colors.inkSoft} />
              <TextInput
                style={s.campo}
                placeholder="Ora (facoltativa)"
                placeholderTextColor={colors.inkSoft}
                value={ora}
                onChangeText={setOra}
              />
            </View>
            <View style={s.riga}>
              <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.inkSoft} />
              <TextInput
                style={s.campo}
                placeholder="Dove (facoltativo)"
                placeholderTextColor={colors.inkSoft}
                value={luogo}
                onChangeText={setLuogo}
              />
            </View>
            <View style={[s.riga, { alignItems: 'flex-start' }]}>
              <MaterialCommunityIcons
                name="note-text-outline"
                size={17}
                color={colors.inkSoft}
                style={{ marginTop: 10 }}
              />
              <TextInput
                style={[s.campo, { minHeight: 44, textAlignVertical: 'top' }]}
                placeholder="Note (facoltative)"
                placeholderTextColor={colors.inkSoft}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>

            {/* Si mostra sempre, anche da soli: se sparisse, chi cerca la
                condivisione non capirebbe dove è finita. */}
            <Text style={s.label}>Chi lo vede</Text>
            <View style={s.chipWrap}>
              <View style={[s.chip, s.chipIo]}>
                <MaterialCommunityIcons name="check" size={13} color={accent} />
                <Text style={[s.chipTxt, { color: accent, fontFamily: fonts.semibold }]}>Tu</Text>
              </View>
              {altri.map((uid) => {
                const attivo = visibileA.includes(uid);
                return (
                  <TouchableOpacity
                    key={uid}
                    style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: accent }]}
                    onPress={() => alterna(uid)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={attivo ? 'check' : 'plus'}
                      size={13}
                      color={attivo ? accent : colors.inkSoft}
                    />
                    <Text style={[s.chipTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                      {membriNomi[uid] || 'Membro'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.nota}>
              {altri.length === 0
                ? 'Per ora sei l’unico nella famiglia: quando entrerà qualcun altro potrai scegliere con chi condividere.'
                : condiviso
                  ? 'Lo vedete tutti quelli che hai scelto.'
                  : 'Resta solo tuo: non compare nel calendario degli altri.'}
            </Text>

            <TouchableOpacity
              style={[s.salva, { backgroundColor: accent }, !nome.trim() && { opacity: 0.4 }]}
              onPress={salva}
              disabled={!nome.trim()}
              activeOpacity={0.85}
            >
              <Text style={s.salvaTxt}>{evento ? 'Salva' : 'Aggiungi'}</Text>
            </TouchableOpacity>

            {evento && (
              <TouchableOpacity style={s.elimina} onPress={onElimina} activeOpacity={0.8}>
                <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.tomato} />
                <Text style={s.eliminaTxt}>Elimina l’evento</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 50 },
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32, 48, 31, 0.35)' },
  pannello: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 18, maxHeight: '100%', ...shadow.float,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  titolo: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  campoNome: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    fontSize: 16, color: colors.ink, fontFamily: fonts.medium,
  },
  data: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  dataTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 15, textTransform: 'capitalize' },
  calendario: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
    padding: 10, marginBottom: 10,
  },
  riga: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  campo: {
    flex: 1, paddingVertical: 11,
    fontSize: 15, color: colors.ink, fontFamily: fonts.regular,
  },
  label: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 18, marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
  },
  chipIo: { backgroundColor: colors.bg, opacity: 0.7 },
  chipTxt: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 7 },
  salva: {
    alignItems: 'center', justifyContent: 'center',
    marginTop: 18, paddingVertical: 13, borderRadius: radius.md,
  },
  salvaTxt: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF' },
  elimina: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 10, paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: colors.tomatoSoft,
  },
  eliminaTxt: { fontFamily: fonts.medium, fontSize: 14, color: colors.tomato },
});
