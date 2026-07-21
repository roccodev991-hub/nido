// Le faccende di casa che l'app conosce già, con il ritmo tipico.
// Servono a due cose: i suggerimenti mentre scrivi e le proposte a lista vuota
// (quelle con `seed: true`).
//
// `ancora: 'fisso'` → ha un suo giorno, il ritardo non lo sposta.
// `ancora: 'dopo'`  → il ritmo lo detta l'ultima volta che l'hai fatta.
// giorniSettimana: 0 = lunedì … 6 = domenica.

export const FACCENDE = [
  // — Le quattro di partenza, decise con l'utente —
  { nome: 'Pulizie casa',    icona: 'broom',            ricorrenza: 'settimana', ogni: 1, giorniSettimana: [6], ancora: 'fisso', seed: true },
  { nome: 'Lavatrice',       icona: 'washing-machine',  ricorrenza: 'giorni',    ogni: 7, ancora: 'dopo', seed: true },
  { nome: 'Lavastoviglie',   icona: 'dishwasher',       ricorrenza: 'giorni',    ogni: 3, ancora: 'dopo', seed: true },
  { nome: 'Cambio lenzuola', icona: 'bed',              ricorrenza: 'settimana', ogni: 1, giorniSettimana: [6], ancora: 'fisso', seed: true },

  // — Bucato e stanze —
  { nome: 'Stendere il bucato',   icona: 'tshirt-crew-outline', ricorrenza: 'giorni', ogni: 3, ancora: 'dopo' },
  { nome: 'Stirare',              icona: 'iron-outline',        ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Cambio asciugamani',   icona: 'hanger',              ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Spolverare',           icona: 'feather',             ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Aspirapolvere',        icona: 'vacuum-outline',      ricorrenza: 'giorni', ogni: 4, ancora: 'dopo' },
  { nome: 'Lavare i pavimenti',   icona: 'bucket-outline',      ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Pulire il bagno',      icona: 'shower',              ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Pulire la cucina',     icona: 'countertop-outline',  ricorrenza: 'giorni', ogni: 3, ancora: 'dopo' },
  { nome: 'Pulire i vetri',       icona: 'window-closed-variant', ricorrenza: 'mese', ogni: 1, ancora: 'dopo' },
  { nome: 'Cambio federe',        icona: 'bed-outline',         ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },

  // — Immondizia: ha giorni suoi, il calendario del comune non aspetta —
  { nome: 'Portare fuori l’immondizia', icona: 'trash-can-outline', ricorrenza: 'giorni', ogni: 2, ancora: 'dopo' },
  { nome: 'Differenziata',              icona: 'recycle',           ricorrenza: 'settimana', ogni: 1, giorniSettimana: [1, 4], ancora: 'fisso' },
  { nome: 'Buttare l’umido',            icona: 'delete-empty-outline', ricorrenza: 'giorni', ogni: 2, ancora: 'dopo' },

  // — Cura della casa —
  { nome: 'Innaffiare le piante', icona: 'watering-can-outline', ricorrenza: 'giorni', ogni: 3, ancora: 'dopo' },
  { nome: 'Pulire il frigo',      icona: 'fridge-outline',       ricorrenza: 'mese',   ogni: 1, ancora: 'dopo' },
  { nome: 'Sbrinare il freezer',  icona: 'snowflake-melt',       ricorrenza: 'mese',   ogni: 6, ancora: 'dopo' },
  { nome: 'Cambiare la lettiera', icona: 'cat',                  ricorrenza: 'giorni', ogni: 2, ancora: 'dopo' },
  { nome: 'Fare la spesa',        icona: 'cart-outline',         ricorrenza: 'giorni', ogni: 7, ancora: 'dopo' },
  { nome: 'Controllare la posta', icona: 'mailbox-outline',      ricorrenza: 'giorni', ogni: 3, ancora: 'dopo' },
];

// Le quattro proposte quando la lista è vuota.
export const FACCENDE_SEED = FACCENDE.filter((f) => f.seed);

// Suggerimenti mentre scrivi: quelle note che non hai già in lista.
// Prima chi comincia col testo digitato, poi chi lo contiene.
export function suggerisciFaccende(testo, giaPresenti = []) {
  const t = testo.trim().toLowerCase();
  if (!t) return [];
  const gia = new Set(giaPresenti.map((n) => n.trim().toLowerCase()));
  return FACCENDE
    .filter((f) => !gia.has(f.nome.toLowerCase()) && f.nome.toLowerCase().includes(t))
    .sort((a, b) => a.nome.toLowerCase().indexOf(t) - b.nome.toLowerCase().indexOf(t))
    .slice(0, 5);
}
