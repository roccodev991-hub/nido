// Stile "semplice e amichevole": tema chiaro carta + verde bosco,
// sans-serif pulito (Outfit), card arrotondate con barrette colorate,
// chip morbide, bottoni a pillola.
export const colors = {
  bg: '#F6F2E8',        // carta chiara di fondo
  card: '#FFFFFF',
  ink: '#20301F',       // testo principale, verde-nero
  inkSoft: '#6B7A66',   // testo secondario
  green: '#2E5B3E',     // verde bosco: azioni principali
  greenSoft: '#E4EEE4', // sfondo chip/badge verdi
  tomato: '#D64533',    // accento: eliminazioni, avvisi
  tomatoSoft: '#FBEAE6',// sfondo chip rossi
  line: '#E9E3D5',      // bordi sottili
  done: '#A9B8A4',      // elementi spuntati
  faint: '#CBC3B2',     // icone stato-vuoto, dettagli tenui
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 30 };

// I font vanno caricati in App.js con useFonts prima di usarli.
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
};

// Ombra leggera: solo per gli elementi flottanti (tab bar).
export const shadow = {
  float: {
    shadowColor: '#20301F',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

// Ogni modulo dell'app ha il suo colore d'accento e la sua icona (MaterialCommunityIcons).
export const modules = {
  home:       { icon: 'home-variant-outline',     label: 'Oggi',   accent: '#3F5063', soft: '#E9EDF2' },
  cucina:     { icon: 'silverware-fork-knife',   label: 'Cucina', accent: '#2E5B3E', soft: '#E4EEE4' },
  tasks:      { icon: 'clipboard-check-outline',  label: 'Task',   accent: '#5B4B8A', soft: '#ECE7F6' },
  spese:      { icon: 'wallet-outline',           label: 'Spese',  accent: '#2F4A78', soft: '#E6EEF8' },
  calendario: { icon: 'calendar-blank-outline',   label: 'Eventi', accent: '#A03D22', soft: '#F9E8E2' },
};

// Sezioni interne del modulo Cucina.
export const sezioni = {
  lista:    { icon: 'cart-outline',        label: 'Lista',    accent: '#2E5B3E', soft: '#E4EEE4' },
  dispensa: { icon: 'fridge-outline',      label: 'Dispensa', accent: '#8A5A17', soft: '#F6ECD9' },
  menu:     { icon: 'silverware-variant',  label: 'Menu',     accent: '#A03D22', soft: '#F9E8E2' },
};

// Sezioni interne del modulo Task.
// "Casa" raccoglie i prodotti non alimentari (detersivi, carta igienica…):
// stanno nella collezione `dispensa` con conservazione 'casa', ma fuori
// dalla dispensa della cucina.
export const sezioniTasks = {
  faccende: { icon: 'broom',        label: 'Faccende', accent: '#5B4B8A', soft: '#ECE7F6' },
  casa:     { icon: 'spray-bottle', label: 'Casa',     accent: '#1F6E6A', soft: '#E0F0EE' },
};

// Stati semplici di un prodotto in dispensa.
// "consumato" non fa parte del ciclo manuale: lo assegna l'app (pasto passato
// o scadenza) e con un tocco torna a "C'è".
export const statiDispensa = {
  pieno:     { label: "C'è",       colore: '#2E7D46', soft: '#E4EEE4' },
  poco:      { label: 'Poco',      colore: '#B07813', soft: '#F6ECD9' },
  finito:    { label: 'Finito',    colore: '#D64533', soft: '#FBEAE6' },
  consumato: { label: 'Consumato', colore: '#8A8578', soft: '#EFEBE2' },
};
export const cicloStato = {
  pieno: 'poco', poco: 'finito', finito: 'pieno', consumato: 'pieno',
};

export const font = {
  title: { fontFamily: fonts.semibold, fontSize: 24, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
};
