import { Modal, View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import { CATEGORIE_SPESA, euro } from '../spese';

// Dettagli di un movimento: in che categoria sta, chi l'ha pagato,
// e se riguarda tutti e due o solo chi l'ha fatta.
export default function SpesaPicker({
  visible, movimento, membri, accent, onCambia, onElimina, onChiudi,
}) {
  if (!movimento) return null;
  const rimborso = movimento.tipo === 'rimborso';
  const condivisa = movimento.condivisa !== false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChiudi}>
      <View style={s.velo}>
        <Pressable style={s.sfondo} onPress={onChiudi} />
        <View style={s.pannello}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.titolo} numberOfLines={2}>
                {rimborso ? 'Rimborso' : movimento.descrizione}
              </Text>
              <Text style={[s.importo, { color: accent }]}>{euro(movimento.importo)} €</Text>
            </View>
            <TouchableOpacity onPress={onChiudi} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {rimborso ? (
              <Text style={s.spiega}>
                {movimento.pagatoDa} ha dato {euro(movimento.importo)} € a {movimento.a} per
                pareggiare i conti. Un rimborso non è una spesa: sposta soldi e basta.
              </Text>
            ) : (
              <>
                <Text style={s.label}>Categoria</Text>
                <View style={s.chipWrap}>
                  {Object.entries(CATEGORIE_SPESA).map(([key, c]) => {
                    const attivo = (movimento.categoria || 'altro') === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: c.colore }]}
                        onPress={() => onCambia({ categoria: key })}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={c.icon}
                          size={14}
                          color={attivo ? c.colore : colors.inkSoft}
                        />
                        <Text style={[s.chipTxt, attivo && { color: c.colore, fontFamily: fonts.semibold }]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.label, { marginTop: 18 }]}>Pagata da</Text>
                <View style={s.chipWrap}>
                  {membri.map((m) => {
                    const attivo = movimento.pagatoDa === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[s.chip, attivo && { backgroundColor: colors.bg, borderColor: accent }]}
                        onPress={() => onCambia({ pagatoDa: m })}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.label, { marginTop: 18 }]}>Di chi è</Text>
                {[
                  { val: true, label: 'Di tutti e due', nota: 'Si divide a metà ed entra nel saldo.' },
                  { val: false, label: 'Solo mia', nota: 'Resta fuori dal conto: non la deve nessuno.' },
                ].map((o) => {
                  const attivo = condivisa === o.val;
                  return (
                    <TouchableOpacity
                      key={String(o.val)}
                      style={[s.voce, attivo && { backgroundColor: colors.bg }]}
                      onPress={() => onCambia({ condivisa: o.val })}
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

            <TouchableOpacity style={s.elimina} onPress={onElimina} activeOpacity={0.8}>
              <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.tomato} />
              <Text style={s.eliminaTxt}>
                {rimborso ? 'Elimina il rimborso' : 'Elimina la spesa'}
              </Text>
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
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  titolo: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  importo: { fontFamily: fonts.bold, fontSize: 22, marginTop: 2 },
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
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.lg,
  },
  voceTxt: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  voceNota: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  spiega: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 19,
  },
  elimina: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 22, paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: colors.tomatoSoft,
  },
  eliminaTxt: { fontFamily: fonts.medium, fontSize: 14, color: colors.tomato },
});
