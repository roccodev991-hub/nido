// Ritmo delle faccende di casa.
//
// Due cose distinte, ed è il cuore del modulo:
//   - la *serie*: il ritmo ideale ("ogni domenica"), definito da
//     `origine` + `ricorrenza` + `ogni` + `giorniSettimana`. Non cambia da sola.
//   - la *scadenza*: la data di questo giro. Si può spostare a mano senza
//     sporcare la serie: le pulizie spostate a lunedì tornano domenica dopo.
//
// `ancora` dice chi comanda quando spunti:
//   'fisso' → la serie (il giorno resta quello)
//   'dopo'  → il completamento (la serie riparte da oggi)

export const RICORRENZE = {
  'una-tantum': { label: 'Una volta' },
  giorni:       { label: 'Ogni giorno' },
  settimana:    { label: 'Ogni settimana' },
  mese:         { label: 'Ogni mese' },
};

// Lunedì = 0, come in settimana.js.
export const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
export const GIORNI_LUNGHI = [
  'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica',
];

// Mezzanotte del giorno di una data (in millisecondi).
export function inizioGiorno(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Indice del giorno della settimana (0 = lunedì).
export function indiceGiorno(ms) {
  return (new Date(ms).getDay() + 6) % 7;
}

// Somma giorni passando da setDate: l'ora legale non fa sballare il conto.
export function piuGiorni(ms, n) {
  const d = new Date(inizioGiorno(ms));
  d.setDate(d.getDate() + n);
  return inizioGiorno(d.getTime());
}

// Giorni interi fra due date (arrotondati: assorbe l'ora legale).
export function giorniTra(a, b) {
  return Math.round((inizioGiorno(b) - inizioGiorno(a)) / 86400000);
}

// Somma mesi tenendo il giorno del mese di partenza, senza scavallare
// (31 gennaio + 1 mese = 28 febbraio, non 3 marzo).
function piuMesi(ms, n, giornoDelMese) {
  const d = new Date(inizioGiorno(ms));
  const giorno = giornoDelMese || d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(giorno, ultimo));
  return inizioGiorno(d.getTime());
}

// Lunedì della settimana di una data.
function lunediDi(ms) {
  return piuGiorni(ms, -indiceGiorno(ms));
}

// Prima data della serie *strettamente successiva* a "da".
// Restituisce null per le faccende una tantum (non tornano).
export function prossimaOccorrenza(task, da) {
  const { ricorrenza, ogni, giorniSettimana, origine } = task;
  if (!ricorrenza || ricorrenza === 'una-tantum') return null;

  const dopo = inizioGiorno(da);
  const passi = Math.max(1, ogni || 1);
  const base = inizioGiorno(origine || dopo);

  if (ricorrenza === 'giorni' || ricorrenza === 'settimana') {
    const scelti = ricorrenza === 'settimana' ? giorniSettimana : null;

    // Giorni precisi della settimana ("martedì e giovedì"): scorro in avanti
    // e prendo il primo che casca in una settimana buona.
    if (scelti && scelti.length) {
      const lunediBase = lunediDi(base);
      const limite = 7 * passi + 7; // basta e avanza per trovarne uno
      for (let i = 1; i <= limite; i += 1) {
        const g = piuGiorni(dopo, i);
        if (!scelti.includes(indiceGiorno(g))) continue;
        const settimane = giorniTra(lunediBase, lunediDi(g)) / 7;
        if (settimane >= 0 && settimane % passi === 0) return g;
      }
      return piuGiorni(dopo, 7); // rete di sicurezza, non dovrebbe servire
    }

    // Ritmo puro a passi fissi dall'origine.
    const passo = ricorrenza === 'settimana' ? passi * 7 : passi;
    if (base > dopo) return base;
    const salti = Math.floor(giorniTra(base, dopo) / passo) + 1;
    return piuGiorni(base, salti * passo);
  }

  if (ricorrenza === 'mese') {
    const giornoDelMese = new Date(base).getDate();
    let d = base;
    let giri = 0;
    while (d <= dopo && giri < 400) {
      d = piuMesi(d, passi, giornoDelMese);
      giri += 1;
    }
    return d;
  }

  return null;
}

// Scadenza dopo aver spuntato una faccenda.
// Con 'fisso' parto dalla più lontana fra oggi e la scadenza del giro
// (fatta in anticipo non sposta la serie, fatta in ritardo non lascia arretrati).
// Con 'dopo' la serie riparte da oggi.
export function dopoCompletamento(task, adesso = Date.now()) {
  const oggi = inizioGiorno(adesso);
  if (task.ricorrenza === 'una-tantum') return null;

  if (task.ancora === 'dopo') {
    const serie = { ...task, origine: oggi };
    return { origine: oggi, scadenza: prossimaOccorrenza(serie, oggi) };
  }

  const da = Math.max(oggi, inizioGiorno(task.scadenza || oggi));
  return { scadenza: prossimaOccorrenza(task, da) };
}

// "Ogni domenica", "Ogni 3 giorni", "Mar e gio", …
export function descrivi(task) {
  const { ricorrenza, ogni, giorniSettimana } = task;
  const n = Math.max(1, ogni || 1);

  if (!ricorrenza || ricorrenza === 'una-tantum') return 'Una volta';

  if (ricorrenza === 'giorni') {
    return n === 1 ? 'Ogni giorno' : `Ogni ${n} giorni`;
  }

  if (ricorrenza === 'settimana') {
    const scelti = (giorniSettimana || []).slice().sort((a, b) => a - b);
    if (scelti.length === 1) {
      const g = GIORNI_LUNGHI[scelti[0]];
      return n === 1 ? `Ogni ${g}` : `Ogni ${n} settimane, ${g}`;
    }
    if (scelti.length > 1) {
      const nomi = scelti.map((i) => GIORNI[i]);
      const testo = `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
      return n === 1 ? testo[0].toUpperCase() + testo.slice(1) : `Ogni ${n} settimane: ${testo}`;
    }
    return n === 1 ? 'Ogni settimana' : `Ogni ${n} settimane`;
  }

  if (ricorrenza === 'mese') return n === 1 ? 'Ogni mese' : `Ogni ${n} mesi`;
  return 'Una volta';
}

// Cosa farà l'app quando spunti: detto senza giri di parole, per il pannello.
export function spiega(task) {
  if (!task.ricorrenza || task.ricorrenza === 'una-tantum') {
    return 'Quando la spunti sparisce: non torna più.';
  }
  if (task.ancora === 'dopo') {
    const quando = descrivi(task).toLowerCase().replace(/^ogni /, '');
    return `Torna ${quando === 'giorno' ? 'il giorno dopo' : `${quando} dopo`} che l'hai spuntata. Se tardi, slitta con te.`;
  }
  const prossima = prossimaOccorrenza(task, task.scadenza || Date.now());
  const testo = prossima
    ? new Date(prossima).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : null;
  return `Il giorno resta quello anche se la fai in ritardo${testo ? ` — la volta dopo è ${testo}` : ''}.`;
}

// Testo relativo alla scadenza, per la riga della lista.
// `txt`   forma piena, per la riga principale
// `breve` forma corta, dove sta già insieme ad altro (es. "torna giovedì")
export function quandoScade(scadenza, adesso = Date.now()) {
  const oggi = inizioGiorno(adesso);
  const giorni = giorniTra(oggi, scadenza);
  if (giorni < 0) {
    const n = -giorni;
    return {
      txt: `in ritardo di ${n} ${n === 1 ? 'giorno' : 'giorni'}`,
      breve: 'in ritardo',
      gruppo: 'ritardo',
    };
  }
  if (giorni === 0) return { txt: 'da fare oggi', breve: 'oggi', gruppo: 'oggi' };
  if (giorni === 1) return { txt: 'domani', breve: 'domani', gruppo: 'settimana' };
  if (giorni <= 7) {
    const g = GIORNI_LUNGHI[indiceGiorno(scadenza)];
    return { txt: `${g}, fra ${giorni} giorni`, breve: g, gruppo: 'settimana' };
  }
  const data = new Date(scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  return { txt: data, breve: data, gruppo: 'dopo' };
}

// A chi tocca il prossimo giro: chi non la fa da più tempo (o non l'ha mai fatta).
// Non è un'assegnazione salvata, è dedotta dallo storico — nessuno è obbligato
// a rispettarla, e se cambiate idea basta che la spunti l'altro.
// Restituisce null finché nessuno l'ha mai fatta: non c'è niente da dedurre.
export function tocca(storico, membri) {
  if (!membri || membri.length === 0) return null;
  if (!storico || storico.length === 0) return null;

  let scelto = null;
  let piuVecchio = Infinity;
  for (const nome of membri) {
    const sua = storico.find((v) => v.chi === nome);
    const quando = sua ? sua.quando : -Infinity; // mai fatta: tocca a lui
    if (quando < piuVecchio) {
      piuVecchio = quando;
      scelto = nome;
    }
  }
  return scelto;
}

// "3 giorni fa", "ieri", "oggi": per la riga «ultima volta».
export function quandoFatto(ms, adesso = Date.now()) {
  const giorni = giorniTra(ms, adesso);
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  if (giorni < 30) return `${giorni} giorni fa`;
  return new Date(ms).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}
