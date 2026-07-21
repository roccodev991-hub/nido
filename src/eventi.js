// Chi vede un evento.
//
// `visibileA` è l'elenco degli uid che lo vedono: di default solo chi lo crea,
// e si allarga scegliendo i membri dal form.
//
// ⚠️ Questo è un filtro dell'interfaccia, NON una protezione. Le regole
// Firestore (`firestore.rules`) lasciano leggere ogni documento a tutti i
// membri della famiglia, quindi un evento "solo per me" arriva comunque sul
// telefono dell'altro: semplicemente non viene disegnato. Va benissimo per
// organizzare una sorpresa, non per qualcosa che deve restare davvero riservato.
//
// Per renderlo vero servirebbero tre cose, senza toccare i dati già salvati:
//   1. interrogare gli eventi con `where('visibileA', 'array-contains', uid)`
//   2. togliere `eventi` dal jolly `match /{sub}/{docId}` in firestore.rules
//   3. dare a `eventi` regole proprie basate su `visibileA`, e deployarle
// Il campo ha già la forma giusta apposta: quel giorno non serve migrare niente.

// Un evento senza `visibileA` è di prima di questa funzione: lo vedono tutti.
export function vedeLEvento(evento, uid) {
  const lista = evento?.visibileA;
  if (!Array.isArray(lista) || lista.length === 0) return true;
  return lista.includes(uid);
}

// È riservato a chi lo ha creato? Serve a mostrare il lucchetto sulla riga.
export function soloPerMe(evento, uid) {
  const lista = evento?.visibileA;
  return Array.isArray(lista) && lista.length === 1 && lista[0] === uid;
}

// Con chi è condiviso, a parole: "solo per te", "anche con Eli", "con tutti".
export function conChi(evento, uid, membriNomi = {}, totaleMembri = 1) {
  const lista = evento?.visibileA;
  if (!Array.isArray(lista) || lista.length === 0) return null; // vecchio: tutti
  if (!lista.includes(uid)) return null; // non è cosa tua: niente da raccontare
  if (lista.length === 1 && lista[0] === uid) return 'solo per te';
  if (lista.length >= totaleMembri) return null; // tutti: non vale la pena dirlo
  const altri = lista.filter((u) => u !== uid).map((u) => membriNomi[u]).filter(Boolean);
  return altri.length ? `con ${altri.join(' e ')}` : null;
}
