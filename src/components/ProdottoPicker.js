import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import { CONSERVAZIONI } from '../conservazione';
import { consumoDi } from '../profili';

// Impostazioni di un prodotto in dispensa: dove lo tieni. Come si consuma
// non è più una scelta — lo decide il file di conoscenza — ma lo diciamo,
// così il cambio di stato non sembra magia.
export default function ProdottoPicker({
  visible, nome, categoria, conservazione, accent, onConservazione, onChiudi,
}) {
  const consumo = consumoDi(nome, categoria);
  const comeSiConsuma = consumo.tipo === 'scorta'
    ? 'È una scorta: non finisce con un pasto. Diventa «Poco» quando l’app stima che stia calando, in base a ogni quanto lo ricompri.'
    : consumo.pasti > 0
      ? `Un piatto che lo usa ${consumo.pasti === 1 ? 'lo esaurisce' : `× ${consumo.pasti} lo esaurisce`}; comunque dopo ~${consumo.giorni} giorni l’app lo segna «Consumato».`
      : `L’app lo segna «Consumato» dopo ~${consumo.giorni} giorni: il menu non lo tocca.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChiudi}>
      <View style={s.velo}>
        <Pressable style={s.sfondo} onPress={onChiudi} />
        <View style={s.pannello}>
          <View style={s.head}>
            <Text style={s.titolo} numberOfLines={1}>{nome}</Text>
            <TouchableOpacity onPress={onChiudi} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Dove lo tieni</Text>
          <View style={s.chipWrap}>
            {Object.entries(CONSERVAZIONI).map(([key, c]) => {
              const attivo = conservazione === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: accent }]}
                  onPress={() => onConservazione(key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={c.icon}
                    size={14}
                    color={attivo ? accent : colors.inkSoft}
                  />
                  <Text style={[s.chipTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.nota}>“Casa” lo toglie dalla dispensa della cucina.</Text>

          <Text style={s.spiega}>{comeSiConsuma}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sfondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(32, 48, 31, 0.35)' },
  pannello: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 18, ...shadow.float,
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
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line,
  },
  chipTxt: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 7 },
  spiega: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft,
    marginTop: 16, lineHeight: 18,
  },
});
