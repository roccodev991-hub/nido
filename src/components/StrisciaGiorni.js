import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { GIORNI, inizioGiorno, piuGiorni, indiceGiorno } from '../ricorrenza';

// Settimana di calendario (lunedì → domenica) con le frecce ‹ ›,
// come il Menu: stesso schema, stesse parole.
// La usano la lista delle faccende (pallini di quante ne cadono) e il
// pannello, per spostare un giro a un altro giorno.
//
// `conteggi`  mappa { millisecondi mezzanotte → numero } (facoltativa)
// `inRitardo` quante faccende arretrate: pallino rosso su oggi
export default function StrisciaGiorni({
  conteggi, inRitardo = 0, selezionato, onGiorno, accent,
}) {
  const [offset, setOffset] = useState(0); // 0 = questa settimana, +1 = prossima…

  const oggi = inizioGiorno(Date.now());
  const lunedi = piuGiorni(oggi, -indiceGiorno(oggi) + offset * 7);

  const etichetta = offset === 0
    ? 'Questa settimana'
    : offset === 1
      ? 'Prossima settimana'
      : offset === -1
        ? 'Settimana scorsa'
        : `Settimana del ${new Date(lunedi).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={s.nav}>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => setOffset((o) => o - 1)}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setOffset(0)}
          disabled={offset === 0}
          activeOpacity={0.7}
        >
          <Text style={[s.etichetta, offset !== 0 && { color: accent }]}>{etichetta}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => setOffset((o) => o + 1)}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={accent} />
        </TouchableOpacity>
      </View>

      <View style={s.striscia}>
        {Array.from({ length: 7 }, (_, i) => {
          const g = piuGiorni(lunedi, i);
          const n = (conteggi && conteggi[g]) || 0;
          const oggiEh = g === oggi;
          const passato = g < oggi;
          const attivo = selezionato === g;
          // Gli arretrati sono già dentro `conteggi` (finiscono su oggi):
          // qui `inRitardo` serve solo a colorare di rosso, che è il
          // messaggio più urgente. Sommarli di nuovo li conterebbe due volte.
          const arretrati = oggiEh ? inRitardo : 0;
          const quante = n;

          return (
            <TouchableOpacity
              key={g}
              style={[
                s.giorno,
                oggiEh && { backgroundColor: colors.bg },
                attivo && { backgroundColor: accent },
              ]}
              onPress={() => onGiorno(attivo ? null : g)}
              activeOpacity={0.7}
            >
              <Text style={[s.sigla, passato && s.sbiadito, attivo && s.suAccento]}>
                {GIORNI[i]}
              </Text>
              <Text
                style={[
                  s.numero,
                  passato && s.sbiadito,
                  oggiEh && { color: accent, fontFamily: fonts.semibold },
                  attivo && s.suAccento,
                ]}
              >
                {new Date(g).getDate()}
              </Text>
              {/* Un solo segno per giorno: pallino se c'è una cosa sola,
                  barretta se ce n'è più d'una. Il numero esatto è a un tocco. */}
              <View style={s.segno}>
                {quante > 0 && (
                  <View
                    style={[
                      s.punto,
                      quante > 1 && s.barretta,
                      { backgroundColor: attivo ? '#FFFFFF' : (arretrati > 0 ? colors.tomato : accent) },
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
  etichetta: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  striscia: { flexDirection: 'row', gap: 4 },
  giorno: {
    flex: 1, alignItems: 'center', paddingVertical: 7,
    borderRadius: radius.md,
  },
  sigla: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft },
  numero: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, marginTop: 1 },
  sbiadito: { color: colors.faint },
  suAccento: { color: '#FFFFFF' },
  // Altezza fissa: i giorni vuoti non fanno saltare la riga.
  segno: { alignItems: 'center', justifyContent: 'center', height: 8, marginTop: 3 },
  punto: { width: 5, height: 5, borderRadius: 2.5 },
  barretta: { width: 14 },
});
