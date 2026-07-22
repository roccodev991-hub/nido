import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import { CONSERVAZIONI } from '../conservazione';
import { SCELTE_CONSUMO } from '../profili';

// Impostazioni di un prodotto in dispensa: dove lo tieni e come si consuma.
// Il consumo di default lo decide l'app (profili.js); qui puoi correggerla
// in parole semplici — serve soprattutto per i prodotti che non conosce,
// finiti in "altro" e trattati da scorta per prudenza. La scelta va in
// `frequenti`: vale per sempre, anche per i prossimi acquisti.
export default function ProdottoPicker({
  visible, nome, conservazione, consumo, accent,
  onConservazione, onConsumo, onChiudi,
}) {
  const scelto = consumo ? consumo.scelto : null;

  const spiegazione = !consumo
    ? ''
    : consumo.tipo === 'scorta'
      ? 'Non finisce con un pasto: diventa «Poco» quando l’app stima che stia calando, in base a ogni quanto lo ricompri.'
      : consumo.pasti > 0
        ? `${consumo.pasti === 1 ? 'Un pasto che lo usa' : `${consumo.pasti} pasti che lo usano`} lo segna${consumo.pasti === 1 ? '' : 'no'} «Consumato»; comunque dopo ~${consumo.giorni} giorni esce da solo.`
        : `Il menu non lo tocca: l’app lo segna «Consumato» dopo ~${consumo.giorni} giorni.`;

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
          {Object.entries(SCELTE_CONSUMO).map(([key, sc]) => {
            const attivo = scelto === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.voce, attivo && { backgroundColor: colors.bg }]}
                onPress={() => onConsumo(attivo ? null : key)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.voceTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                    {sc.label}
                  </Text>
                  <Text style={s.voceNota}>{sc.nota}</Text>
                </View>
                {attivo && <MaterialCommunityIcons name="check" size={18} color={accent} />}
              </TouchableOpacity>
            );
          })}
          <Text style={s.nota}>
            {scelto
              ? 'Scelto da te — un altro tocco e torna a decidere l’app.'
              : 'Nessuna scelta: decide l’app dal tipo di prodotto.'}
          </Text>

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
  voce: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.lg,
  },
  voceTxt: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  voceNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  nota: { fontFamily: fonts.regular, fontSize: 12, color: colors.faint, marginTop: 7 },
  spiega: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft,
    marginTop: 10, lineHeight: 18,
  },
});
