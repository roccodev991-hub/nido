import { createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts, sezioni } from '../theme';

// Dati globali dell'intestazione (nome famiglia, avatar, azioni),
// forniti da App.js e letti dal componente Hero.
export const HeaderContext = createContext({
  famigliaNome: '',
  nomi: [],        // solo i nomi, per gli avatar
  membri: [],      // gli uid, quando serve sapere *chi* e non solo come si chiama
  membriNomi: {},  // uid → nome
  onMenu: () => {},
  onInfo: () => {},
});

// Intestazione colorata morbida in cima a ogni schermata.
export default function Hero({ accent, soft, icon, title, stat, children }) {
  const { famigliaNome, nomi, onMenu, onInfo } = useContext(HeaderContext);
  const iniziali = nomi.length ? nomi : ['?'];

  return (
    <View style={[s.hero, { backgroundColor: soft }]}>
      <View style={s.top}>
        <TouchableOpacity style={s.menuBtn} onPress={onMenu} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={22} color={accent} />
        </TouchableOpacity>
        <Text style={[s.fam, { color: accent }]} numberOfLines={1}>
          {famigliaNome}
        </Text>
        <TouchableOpacity style={s.avatars} onPress={onInfo} activeOpacity={0.7}>
          {iniziali.map((n, i) => (
            <View
              key={i}
              style={[s.avatar, { borderColor: soft }, i > 0 && { marginLeft: -8 }]}
            >
              <Text style={[s.avatarTxt, { color: accent }]}>
                {(n[0] || '?').toUpperCase()}
              </Text>
            </View>
          ))}
        </TouchableOpacity>
      </View>

      <View style={s.titleRow}>
        <MaterialCommunityIcons name={icon} size={26} color={accent} />
        <Text style={[s.title, { color: accent }]}>{title}</Text>
      </View>
      {stat ? <Text style={[s.stat, { color: accent }]}>{stat}</Text> : null}
      {children}
    </View>
  );
}

// Foglio bianco arrotondato che ospita i contenuti, sotto l'Hero.
export function Sheet({ children }) {
  return <View style={s.sheet}>{children}</View>;
}

// Tab a pillole per le sezioni interne di un modulo.
// `set` è la mappa delle sezioni (theme.js): Cucina se non specificata.
export function SezioniTabs({ sezione, setSezione, set = sezioni }) {
  const accent = set[sezione].accent;
  return (
    <View style={s.tabs}>
      {Object.entries(set).map(([key, sz]) => {
        const attivo = sezione === key;
        return (
          <TouchableOpacity
            key={key}
            style={[s.tab, attivo && s.tabAttivo]}
            onPress={() => setSezione(key)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={sz.icon} size={16} color={accent} />
            <Text
              style={[
                s.tabTxt,
                { color: accent },
                attivo && { fontFamily: fonts.semibold },
              ]}
            >
              {sz.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingTop: 54, paddingHorizontal: 20, paddingBottom: 32 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  menuTxt: { fontSize: 15, fontFamily: fonts.semibold },
  fam: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF',
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: fonts.bold, fontSize: 12 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
  },
  title: { fontFamily: fonts.semibold, fontSize: 24 },
  stat: { marginTop: 3, fontFamily: fonts.regular, fontSize: 14, opacity: 0.85 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 16 },
  tab: {
    flex: 1, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: radius.pill,
  },
  tabAttivo: { backgroundColor: '#FFFFFF' },
  tabTxt: { fontFamily: fonts.regular, fontSize: 13 },
  sheet: {
    flex: 1, backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -20, paddingHorizontal: 20, paddingTop: 20,
  },
});
