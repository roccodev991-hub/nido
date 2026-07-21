// Utilità sulle settimane, condivise tra Menu e Dispensa.

// Lunedì della settimana che contiene la data (mezzanotte).
export function lunedi(base = new Date()) {
  const d = new Date(base);
  const g = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - g);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Chiave giorno in formato AAAA-MM-GG (id dei documenti settimana).
export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Mezzanotte di oggi, in millisecondi.
export function inizioOggi() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
