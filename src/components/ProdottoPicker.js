import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import { CONSERVAZIONI } from '../conservazione';
import { PROFILI, giorniDi } from '../profili';

// Impostazioni di un prodotto in dispensa: dove lo tieni e come si consuma.
export default function ProdottoPicker({
  visible, nome, conservazione, profilo, accent,
  onConservazione, onProfilo, onChiudi,
}) {
  const giorni = giorniDi(nome, profilo);
  // Cosa farà l'app con questo prodotto, detto senza giri di parole.
  const spiegazione = profilo === 'monouso'
    ? `Quando il pasto che lo usa è passato — o dopo ~${giorni} giorni — l'app lo segna «Consumato».`
    : profilo === 'graduale'
      ? `Dopo ~${giorni} giorni l'app lo segna «Consumato».`
      : 'L\'app non lo segna mai «Consumato» da sola. Lo segna «Poco» quando stima che stia calando, in base a ogni quanto lo ricompri.';

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

          <Text style={[s.label, { marginTop: 16 }]}>Come si consuma</Text>
          {Object.entries(PROFILI).map(([key, p]) => {
            const attivo = profilo === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.voce, attivo && { backgroundColor: colors.bg }]}
                onPress={() => onProfilo(key)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.voceTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                    {p.label}
                  </Text>
                  <Text style={s.voceNota}>{p.nota}</Text>
                </View>
                {attivo && <MaterialCommunityIcons name="check" size={18} color={accent} />}
              </TouchableOpacity>
            );
          })}

          <Text style={s.spiega}>{spiegazione}</Text>
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
  voce: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.lg,
  },
  voceTxt: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  voceNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  spiega: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft,
    marginTop: 12, lineHeight: 18,
  },
});
