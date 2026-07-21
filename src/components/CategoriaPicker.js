import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, shadow } from '../theme';
import { CATEGORIE } from '../catalogo';

// Modal per scegliere/cambiare il reparto di un articolo.
export default function CategoriaPicker({ visible, nome, corrente, accent, onScegli, onChiudi }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChiudi}>
      <Pressable style={s.velo} onPress={onChiudi}>
        <Pressable style={s.pannello} onPress={() => {}}>
          <Text style={s.titolo}>Reparto di “{nome}”</Text>
          {Object.entries(CATEGORIE).map(([key, cat]) => {
            const attivo = corrente === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.voce, attivo && { backgroundColor: colors.bg }]}
                onPress={() => onScegli(key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={20}
                  color={attivo ? accent : colors.inkSoft}
                />
                <Text style={[s.voceTxt, attivo && { color: accent, fontFamily: fonts.semibold }]}>
                  {cat.label}
                </Text>
                {attivo && (
                  <MaterialCommunityIcons name="check" size={18} color={accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: {
    flex: 1, backgroundColor: 'rgba(32, 48, 31, 0.35)',
    justifyContent: 'center', paddingHorizontal: 28,
  },
  pannello: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 12, ...shadow.float,
  },
  titolo: {
    fontFamily: fonts.semibold, fontSize: 15, color: colors.ink,
    paddingHorizontal: 10, paddingTop: 6, paddingBottom: 10,
  },
  voce: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  voceTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
