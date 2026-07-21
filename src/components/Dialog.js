import { createContext, useContext, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable, StyleSheet,
} from 'react-native';
import { colors, radius, fonts, shadow } from '../theme';

// Dialoghi in-app nello stile dell'app (al posto di Alert di sistema).
// Uso: const dialog = useDialog(); dialog({ title, message, actions:[{label,tone,onPress}] });
const Ctx = createContext(() => {});
export const useDialog = () => useContext(Ctx);

export function DialogProvider({ children }) {
  const [cfg, setCfg] = useState(null);
  const mostra = useCallback((c) => setCfg(c), []);
  const chiudi = () => setCfg(null);

  const azioni = (cfg && cfg.actions) || [{ label: 'Ok', tone: 'primary' }];

  return (
    <Ctx.Provider value={mostra}>
      {children}
      <Modal visible={!!cfg} transparent animationType="fade" onRequestClose={chiudi}>
        <Pressable style={s.velo} onPress={chiudi}>
          <Pressable style={s.card} onPress={() => {}}>
            {cfg && cfg.title ? <Text style={s.title}>{cfg.title}</Text> : null}
            {cfg && cfg.body
              ? cfg.body
              : cfg && cfg.message
                ? <Text style={s.msg}>{cfg.message}</Text>
                : null}
            <View style={s.actions}>
              {azioni.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.btn,
                    a.tone === 'primary' && s.btnPrimary,
                    a.tone === 'danger' && s.btnDanger,
                    a.tone === 'ghost' && s.btnGhost,
                  ]}
                  onPress={() => { chiudi(); if (a.onPress) a.onPress(); }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.btnTxt,
                      a.tone === 'primary' && s.btnTxtPrimary,
                      a.tone === 'danger' && s.btnTxtDanger,
                      a.tone === 'ghost' && s.btnTxtGhost,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  velo: {
    flex: 1, backgroundColor: 'rgba(32, 48, 31, 0.4)',
    justifyContent: 'center', paddingHorizontal: 30,
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: 22, ...shadow.float,
  },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink, marginBottom: 8 },
  msg: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  actions: { marginTop: 20, gap: 8 },
  btn: {
    borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center',
    backgroundColor: colors.bg,
  },
  btnPrimary: { backgroundColor: colors.green },
  btnDanger: { backgroundColor: colors.tomatoSoft },
  btnGhost: { backgroundColor: 'transparent' },
  btnTxt: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  btnTxtPrimary: { color: '#FFFFFF' },
  btnTxtDanger: { color: colors.tomato },
  btnTxtGhost: { color: colors.inkSoft },
});
