import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { GIORNI, inizioGiorno, indiceGiorno } from '../ricorrenza';

export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// Mezzanotte del primo del mese che contiene `ms`.
function primoDelMese(ms) {
  const d = new Date(ms);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Griglia del mese, lunedì → domenica, con le frecce ‹ ›.
// Qui il mese ha senso (a differenza delle faccende): un concerto il 14 è un
// fatto, non una previsione, quindi si può disegnare senza mentire.
//
// `conteggi` mappa { millisecondi mezzanotte → numero di eventi }
export default function MeseGriglia({
  selezionato, conteggi, onGiorno, accent, meseDi,
}) {
  const oggi = inizioGiorno(Date.now());
  const [mese, setMese] = useState(() => primoDelMese(meseDi || selezionato || oggi));

  // Se da fuori cambia il giorno scelto, seguo il suo mese.
  useEffect(() => {
    if (selezionato) setMese(primoDelMese(selezionato));
  }, [selezionato]);

  const primo = new Date(mese);
  const vuotiPrima = indiceGiorno(mese);
  const quantiGiorni = new Date(primo.getFullYear(), primo.getMonth() + 1, 0).getDate();
  // Celle: i buchi iniziali + i giorni, arrotondato a settimane intere.
  const celle = [];
  for (let i = 0; i < vuotiPrima; i += 1) celle.push(null);
  for (let g = 1; g <= quantiGiorni; g += 1) {
    celle.push(new Date(primo.getFullYear(), primo.getMonth(), g).getTime());
  }
  while (celle.length % 7 !== 0) celle.push(null);

  function cambiaMese(passo) {
    const d = new Date(mese);
    d.setMonth(d.getMonth() + passo);
    setMese(primoDelMese(d.getTime()));
  }

  return (
    <View>
      <View style={s.nav}>
        <TouchableOpacity style={s.navBtn} onPress={() => cambiaMese(-1)} activeOpacity={0.7} hitSlop={6}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMese(primoDelMese(oggi))}
          disabled={mese === primoDelMese(oggi)}
          activeOpacity={0.7}
        >
          <Text style={[s.titolo, { color: accent }]}>
            {MESI[primo.getMonth()]} {primo.getFullYear()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => cambiaMese(1)} activeOpacity={0.7} hitSlop={6}>
          <MaterialCommunityIcons name="chevron-right" size={20} color={accent} />
        </TouchableOpacity>
      </View>

      <View style={s.intestazione}>
        {GIORNI.map((g) => (
          <Text key={g} style={s.sigla}>{g}</Text>
        ))}
      </View>

      <View style={s.griglia}>
        {celle.map((g, i) => {
          if (g === null) return <View key={`v${i}`} style={s.cella} />;
          const n = (conteggi && conteggi[g]) || 0;
          const attivo = selezionato === g;
          const oggiEh = g === oggi;
          const passato = g < oggi;
          return (
            <TouchableOpacity
              key={g}
              style={[
                s.cella,
                oggiEh && !attivo && { backgroundColor: colors.bg },
                attivo && { backgroundColor: accent },
              ]}
              onPress={() => onGiorno(attivo ? null : g)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.numero,
                  passato && { color: colors.faint },
                  oggiEh && !attivo && { color: accent, fontFamily: fonts.semibold },
                  attivo && { color: '#FFFFFF', fontFamily: fonts.semibold },
                ]}
              >
                {new Date(g).getDate()}
              </Text>
              <View style={s.segno}>
                {n > 0 && (
                  <View
                    style={[
                      s.punto,
                      n > 1 && s.barretta,
                      { backgroundColor: attivo ? '#FFFFFF' : accent },
                      passato && { opacity: 0.35 },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  titolo: { fontFamily: fonts.semibold, fontSize: 15, textTransform: 'capitalize' },
  intestazione: { flexDirection: 'row', marginBottom: 2 },
  sigla: {
    flex: 1, textAlign: 'center',
    fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft,
  },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  cella: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
  },
  numero: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  // Altezza fissa: i giorni senza eventi non fanno ballare la griglia.
  segno: { height: 7, justifyContent: 'center', marginTop: 2 },
  punto: { width: 5, height: 5, borderRadius: 2.5 },
  barretta: { width: 13 },
});
