# 🪺 Nido

App per due persone che dividono una casa, **condivisa in tempo reale**: cucina (lista
della spesa, dispensa, menu settimanale), faccende con i turni, spese e conti fra voi,
eventi. Tutto gratis: Firebase piano Spark (senza carta di credito), installazione via
APK su Android e come web app da qualunque browser.

Come funziona il ciclo:

1. Aggiungi "latte" alla lista → lei lo vede subito sul suo telefono.
2. Al supermercato spunti "latte" → sparisce dalla lista e compare in **Dispensa**.
3. In dispensa usi − e + per la quantità. Quando arriva a zero → torna da solo in lista spesa.
4. Nuovi membri entrano con un codice invito tipo `PANE-42`.

---

## Passo 1 — Prepara il computer (10 min)

Serve solo **Node.js** (versione LTS): scaricalo da https://nodejs.org e installalo.

Poi apri il terminale e crea il progetto Expo:

```bash
npx create-expo-app spesa-famiglia --template blank
cd spesa-famiglia
npx expo install firebase @react-native-async-storage/async-storage
```

> `create-expo-app` scarica sempre le versioni più recenti e compatibili tra loro: per questo non ti fornisco un `package.json` pronto — così eviti conflitti di versione.

Ora **copia i file di questa cartella dentro il progetto appena creato**:

- `App.js` → sostituisce quello esistente nella radice
- la cartella `src/` → copiala nella radice del progetto

## Passo 2 — Crea il progetto Firebase (10 min)

1. Vai su https://console.firebase.google.com e accedi con un account Google.
2. **Crea progetto** → chiamalo ad es. `spesa-famiglia` (Google Analytics: puoi disattivarlo).
3. Nella schermata del progetto, clicca l'icona **`</>`** (app Web) → registra l'app con un nome qualsiasi → ti mostra un blocco `firebaseConfig`.
4. **Copia quei valori dentro `src/firebase.js`** al posto dei segnaposto.

### Attiva il login

Menu **Build → Authentication → Get started → Email/Password → Abilita → Salva**.

### Attiva il database

Menu **Build → Firestore Database → Crea database** → scegli una regione europea (es. `eur3` o `europe-west`) → **modalità produzione**.

### Imposta le regole di sicurezza

In Firestore, tab **Regole**: cancella tutto e incolla il contenuto del file `firestore.rules`, poi **Pubblica**. Queste regole fanno sì che solo i membri della vostra famiglia possano leggere/scrivere le vostre liste.

### Crea l'indice (serve alla ricerca del codice invito)

Non serve fare nulla in anticipo: la prima volta che qualcuno usa "Unisciti con codice", se Firestore chiede un indice troverai un link nell'errore in console — cliccalo e confermi. Per query semplici come questa di solito non è nemmeno necessario.

## Passo 3 — Prova l'app subito (2 min)

```bash
npx expo start
```

Installa **Expo Go** dal Play Store sul telefono, inquadra il QR code che appare nel terminale, e l'app parte sul tuo telefono. Ogni modifica al codice si ricarica in automatico. Fai una prova completa: crea un account, crea la famiglia, aggiungi articoli. Poi sul telefono della tua compagna: altro account, "Unisciti" col codice invito (lo trovi nel database, oppure aggiungi una schermata che lo mostra — vedi Idee sotto).

> Dov'è il codice invito? Su console.firebase.google.com → Firestore → collezione `famiglie` → campo `codice`. (Miglioria facile: mostrarlo dentro l'app.)

## Passo 4 — Genera l'APK da installare (gratis)

Quando l'app ti piace, crea l'APK definitivo con EAS (il servizio di build di Expo, con piano gratuito):

```bash
npm install -g eas-cli
eas login          # account Expo gratuito, crealo su expo.dev
eas build:configure
```

Nel file `eas.json` che viene creato, assicurati che il profilo `preview` produca un APK:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    }
  }
}
```

Poi:

```bash
eas build -p android --profile preview
```

A fine build ricevi un **link per scaricare l'APK**: apritelo dai telefoni, scaricate e installate (Android chiederà di autorizzare l'installazione da origini sconosciute — è normale, è la vostra app). Fatto: l'app resta installata per sempre, si comporta come qualsiasi altra app.

> Alternativa senza EAS: installa Android Studio e lancia `npx expo run:android --variant release` per compilare l'APK in locale. Più macchinoso la prima volta, ma zero dipendenze da servizi esterni.

---

## Costi: riepilogo onesto

| Voce | Costo |
|---|---|
| Firebase (Spark): 50k letture + 20k scritture/giorno, 1 GB | 0 €, senza carta |
| Expo + EAS build (piano free) | 0 € |
| Installazione APK su Android | 0 € |
| **Totale** | **0 €** |

Voi due farete al massimo qualche centinaio di operazioni al giorno: meno dell'1% dei limiti gratuiti. E siccome il piano Spark non ha un metodo di pagamento collegato, è *impossibile* ricevere addebiti.

## Idee per i prossimi weekend

- **Mostrare il codice invito nell'app** (schermata "Famiglia") invece di cercarlo in console.
- **Categorie/reparti** (latticini, frutta…) per ordinare la lista come il giro al supermercato.
- **Suggerimenti**: quando scrivi "la", proporre "latte" dagli acquisti passati.
- **Scadenze** in dispensa con notifica locale (gratis con `expo-notifications`).
- **Quantità in lista** ("uova ×2") oltre che in dispensa.
