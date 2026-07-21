import { Modal, View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import StrisciaGiorni from './StrisciaGiorni';
import { GIORNI, inizioGiorno, spiega, quandoFatto } from '../ricorrenza';

// Le quattro frequenze, con l'unità che compare nel "ogni N …".
const FREQUENZE = [
  { key: 'una-tantum', label: 'Una volta' },
  { key: 'giorni',     label: 'A giorni',    unita: ['giorno', 'giorni'] },
  { key: 'settimana',  label: 'A settimane', unita: ['settimana', 'settimane'] },
  { key: 'mese',       label: 'A mesi',      unita: ['mese', 'mesi'] },
];

// Impostazioni di una faccenda: ogni quanto torna, in che giorno,
// e cosa succede quando la spunti in ritardo.
export default function TaskPicker({ visible, task, accent, onCambia, onSposta, onElimina, onChiudi }) {
  if (!task) return null;

  const ogni = Math.max(1, task.ogni || 1);
  const scelti = task.giorniSettimana || [];
  const freq = FREQUENZE.find((f) => f.key === task.ricorrenza) || FREQUENZE[0];
  const ripete = task.ricorrenza && task.ricorrenza !== 'una-tantum';
  // Con giorni precisi della settimana il giorno è già deciso: "dopo" non ha senso.
  const scegliAncora = ripete && scelti.length === 0;
  // Ne teniamo dieci, ma oltre le cinque più recenti diventa un registro
  // che nessuno legge: il pannello ne mostra cinque.
  const storico = (task.storico || []).slice(0, 5);

  // Accende o spegne un giorno della settimana.
  function toggleGiorno(i) {
    const nuovi = scelti.includes(i) ? scelti.filter((g) => g !== i) : [...scelti, i].sort((a, b) => a - b);
    onCambia({ giorniSettimana: nuovi, ...(nuovi.length ? { ancora: 'fisso' } : {}) });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChiudi}>
      <View style={s.velo}>
        <Pressable style={s.sfondo} onPress={onChiudi} />
        <View style={s.pannello}>
          <View style={s.head}>
            <Text style={s.titolo} numberOfLines={2}>{task.nome}</Text>
            <TouchableOpacity onPress={onChiudi} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Solo questa volta</Text>
            <StrisciaGiorni
              selezionato={task.scadenza ? inizioGiorno(task.scadenza) : null}
              onGiorno={(g) => g && onSposta(g)}
              accent={accent}
            />
            <Text style={[s.nota, { marginTop: -6, marginBottom: 4 }]}>
              Spostarla non cambia il ritmo: la volta dopo torna dove sarebbe stata.
            </Text>

            <Text style={[s.label, { marginTop: 18 }]}>Ogni quanto</Text>
            <View style={s.chipWrap}>
              {FREQUENZE.map((f) => {
                const attivo = task.ricorrenza === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: accent }]}
                    onPress={() => onCambia({
                      ricorrenza: f.key,
                      // I giorni della settimana valgono solo per la frequenza settimanale.
                      ...(f.key === 'settimana' ? {} : { giorniSettimana: [] }),
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {ripete && (
              <View style={s.contatore}>
                <Text style={s.contaTxt}>Ogni</Text>
                <TouchableOpacity
                  style={[s.tondo, ogni === 1 && { opacity: 0.35 }]}
                  onPress={() => ogni > 1 && onCambia({ ogni: ogni - 1 })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="minus" size={18} color={accent} />
                </TouchableOpacity>
                <Text style={[s.numero, { color: accent }]}>{ogni}</Text>
                <TouchableOpacity
                  style={s.tondo}
                  onPress={() => onCambia({ ogni: ogni + 1 })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={accent} />
                </TouchableOpacity>
                <Text style={s.contaTxt}>{freq.unita[ogni === 1 ? 0 : 1]}</Text>
              </View>
            )}

            {task.ricorrenza === 'settimana' && (
              <>
                <Text style={[s.label, { marginTop: 18 }]}>In che giorno</Text>
                <View style={s.giorni}>
                  {GIORNI.map((g, i) => {
                    const attivo = scelti.includes(i);
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[s.giorno, attivo && { backgroundColor: accent, borderColor: accent }]}
                        onPress={() => toggleGiorno(i)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.giornoTxt, attivo && { color: '#FFFFFF', fontFamily: fonts.semibold }]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {scelti.length === 0 && (
                  <Text style={s.nota}>Nessun giorno scelto: conta solo l'intervallo.</Text>
                )}
              </>
            )}

            {scegliAncora && (
              <>
                <Text style={[s.label, { marginTop: 18 }]}>Se la fai in ritardo</Text>
                {[
                  { key: 'fisso', label: 'Resta al suo giorno', nota: 'Il ritmo non slitta: la prossima volta è dove sarebbe stata comunque.' },
                  { key: 'dopo',  label: 'Riparte da quando la fai', nota: 'L’intervallo si conta dall’ultima volta che l’hai spuntata.' },
                ].map((o) => {
                  const attivo = (task.ancora || 'fisso') === o.key;
                  return (
                    <TouchableOpacity
                      key={o.key}
                      style={[s.voce, attivo && { backgroundColor: colors.bg }]}
                      onPress={() => onCambia({ ancora: o.key })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.voceTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                          {o.label}
                        </Text>
                        <Text style={s.voceNota}>{o.nota}</Text>
                      </View>
                      {attivo && <MaterialCommunityIcons name="check" size={18} color={accent} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <Text style={s.spiega}>{spiega(task)}</Text>

            {storico.length > 0 && (
              <>
                <Text style={[s.label, { marginTop: 18 }]}>Ultime volte</Text>
                {storico.map((v, i) => (
                  <View key={i} style={s.storicoRiga}>
                    <MaterialCommunityIcons name="check" size={14} color={colors.done} />
                    <Text style={s.storicoTxt}>{v.chi}</Text>
                    <Text style={s.storicoQuando}>{quandoFatto(v.quando)}</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity style={s.elimina} onPress={onElimina} activeOpacity={0.8}>
              <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.tomato} />
              <Text style={s.eliminaTxt}>Elimina la faccenda</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32, 48, 31, 0.35)' },
  pannello: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 18, maxHeight: '100%', ...shadow.float,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, gap: 10,
  },
  titolo: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  label: {
    fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
  },
  chipTxt: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  contatore: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
  },
  contaTxt: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  tondo: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  numero: { fontFamily: fonts.semibold, fontSize: 17, minWidth: 22, textAlign: 'center' },
  giorni: { flexDirection: 'row', gap: 5 },
  giorno: {
    flex: 1, paddingVertical: 8, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center',
  },
  giornoTxt: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 7 },
  voce: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.lg,
  },
  voceTxt: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  voceNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  spiega: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft,
    marginTop: 14, lineHeight: 18,
  },
  storicoRiga: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5,
  },
  storicoTxt: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  storicoQuando: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  elimina: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 20, paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: colors.tomatoSoft,
  },
  eliminaTxt: { fontFamily: fonts.medium, fontSize: 14, color: colors.tomato },
});
