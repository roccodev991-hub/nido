# Nido — guida al progetto

App React Native (Expo) per due persone: cucina (lista della spesa, dispensa, menu
settimanale), faccende di casa con i turni, spese e conti fra i due, eventi.
Tutto condiviso in tempo reale via Firebase. Interfaccia **in italiano**.

Si chiamava "Spesa di famiglia": il nome è cambiato quando la spesa è diventata una
sezione su quattro. La cartella e lo `slug` restano `spesa-famiglia` — cambiarli
rinominerebbe il progetto EAS senza alcun vantaggio visibile.

## Come si lavora

- **Non lanciare mai `npx expo start`**: lo fa l'utente nel suo terminale e testa con Expo Go.
  Dopo una modifica basta dirglielo: Metro ricarica da solo.
- Per verificare che il codice compili: se il server dell'utente è attivo,
  `curl "http://localhost:8081/index.bundle?platform=android&dev=true"` (HTTP 200 = ok).
  Altrimenti parse-check con Babel (`babel.parseSync`, plugin `jsx`).
- **Prima di implementare una funzionalità nuova, discutine il modello con l'utente.**
  Vuole ragionare sulle scelte, non ricevere codice a sorpresa. Mostra dati concreti
  (liste di prodotti, numeri, tabelle) prima di applicarli.
- Attenzione: il progetto sta su OneDrive e `npm install` a volte lascia pacchetti
  incompleti (file mancanti). Sintomo: `UnableToResolve` su un modulo appena installato.
  Rimedio: cancellare la cartella del pacchetto in `node_modules` e reinstallarlo.
- ⚠️ **Mai `npm install -g`.** Le **scritture** dei comandi eseguiti da Claude *fuori* dalla
  cartella del progetto finiscono in una copia privata che l'utente non vede; dentro la
  cartella del progetto invece sono reali e condivise. Le **letture** vedono il sistema
  vero. Quindi: `npm install -g` riesce, Claude poi lo trova, l'utente no.
  Sintomo micidiale perché sembra un problema di PATH: il comando "non è riconosciuto"
  nel terminale dell'utente mentre da Claude risponde, e persino il percorso completo
  risulta esistente a Claude e inesistente all'utente.
  Gli strumenti vanno installati **nel progetto** (`npm install --save-dev`) e richiamati
  da `node_modules\.bin`, oppure con `npx`.
  Il verso opposto invece funziona: `firebase login` fatto dall'utente ha scritto in
  `C:\Users\<utente>\.config\configstore\` e Claude lo legge senza problemi.
  Corollario: per sapere com'è messa *davvero* la macchina dell'utente non basta un
  controllo fatto da Claude — serve un comando che esegua **lui** (un `.bat` da doppio
  clic funziona bene). Tutto verificato il 2026-07-21 con `firebase-tools`.

## Stack

Expo SDK 54 · React Native 0.81 · Firebase 12 (Auth + Firestore) ·
font **Outfit** (`@expo-google-fonts/outfit`) · icone **MaterialCommunityIcons**
(`@expo/vector-icons`). Nessuna libreria di navigazione: gli schermi si scambiano a stato.

Verificare sempre che il nome di un'icona esista nel glyphmap prima di usarlo:
`node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json`

## Struttura

```
App.js                     login, famiglia, menu ☰ moduli, dialogo famiglia, export dati
                           `vaiA(modulo, sezione)` → la home apre il punto esatto
firestore.rules            regole di sicurezza (da deployare a parte)
                           repo: github.com/roccodev991-hub/nido (privato, branch master)
                           ⚠️ sta su OneDrive: se i salvataggi git si comportano in modo
                           strano, sospetta il conflitto OneDrive↔Git prima d'altro
eas.json                   profili di build: `apk` (APK sideload) e `production` (AAB)
                           ⚠️ `appVersionSource: local` → alzare `android.versionCode`
                           in app.json a ogni build, o Android rifiuta l'installazione
strumenti/icona.mjs        generatore dell'icona (Node puro, nessuna dipendenza)
firebase.json/.firebaserc  Firebase Hosting per la web app (vedi "Web app")
public/                    template HTML + manifest + icone della web app
src/firebaseConfig.js      i valori del progetto Firebase, uguali per tutti
src/firebase.js            init Firebase per l'app nativa (AsyncStorage)
src/firebase.web.js        init Firebase per il browser (localStorage)
src/theme.js               colori, raggi, font, moduli, sezioni, stati dispensa
src/components/
  Hero.js                  intestazione colorata + Sheet (foglio bianco) + tab sezioni
  Dialog.js                DialogProvider + useDialog (dialoghi in-app)
  PiattoForm.js            crea/modifica piatto
  ProdottoPicker.js        impostazioni prodotto: dove lo tieni + come si consuma
  CategoriaPicker.js       correzione reparto di un articolo in lista
  TaskPicker.js            impostazioni faccenda: ogni quanto, che giorno, se tardi
  StrisciaGiorni.js        settimana lun→dom con ‹ › (lista faccende + sposta)
  MeseGriglia.js           mese lun→dom con ‹ › (Eventi + scelta data nel form)
  SpesaPicker.js           dettagli movimento: categoria, chi paga, di chi è
  EventoForm.js            crea/modifica evento
src/screens/
  LoginScreen, FamigliaScreen
  HomeScreen               🏠 Oggi: schermata d'ingresso, riepilogo dei moduli
  CucinaScreen             router fra Lista / Dispensa / Menu
  ListaScreen, DispensaScreen, MenuScreen
  TasksScreen              router fra Faccende / Casa
  FaccendeScreen, CasaScreen
  SpeseScreen, CalendarioScreen
```

**File di "conoscenza" (dati statici nel codice, non nel DB):**

| File | Contenuto |
|---|---|
| `src/catalogo.js` | 258 prodotti → reparto (frutta-verdura, latticini, …) + `categoriaDi()` + `perSchermo()` |
| `src/conservazione.js` | 76 prodotti → frigo/dispensa/freezer (dall'Excel dell'utente) |
| `src/profili.js` | `consumoDi()` → come si consuma: `{tipo:'fresco',pasti,giorni}` o `{tipo:'scorta'}` |
| `src/stime.js` | giorni stimati prima che una scorta finisca (cold start) |
| `src/piattiSeed.js` | 29 piatti: il ricettario vero, travasato dall'app il 2026-07-20 |
| `src/settimana.js` | `lunedi()`, `ymd()`, `inizioOggi()` |
| `src/ricorrenza.js` | ritmo delle faccende: `prossimaOccorrenza()`, `dopoCompletamento()`, `descrivi()` |
| `src/faccende.js` | 23 faccende note col ritmo tipico → suggerimenti + le 4 `seed` a lista vuota |
| `src/spese.js` | categorie di spesa + `calcolaSaldi()`, `chiDeveCosa()`, `euro()`, `leggiImporto()` |
| `src/frequenti.js` | hook `useCategorie` + apprendimento (vedi sotto) |
| `src/esporta.js` | export di `frequenti` + `piatti` per backup e travaso |

**Perché stanno nel codice e non sul DB**: sono la *conoscenza di partenza*, statica e
condivisa; costo zero e funziona offline. L'estensione dinamica avviene già in
`frequenti` (vedi sotto). Periodicamente si "travasa" `frequenti` dentro questi file.

## Dati su Firestore

Tutto sotto `famiglie/{famigliaId}/…` (regole: solo i membri della famiglia).

| Collezione | Campi principali |
|---|---|
| `spesa` | `nome`, `categoria`, `aggiuntoDa`, `creato`, + se generato dal menu: `piatto`, `daMenu` (= chiave settimana) |
| `dispensa` | `nome`, `categoria`, `conservazione`, `profilo`, `stato`, `compratoIl`, `creato` |
| `frequenti/{nomeNormalizzato}` | `nome`, `categoria`, `conservazione`, `profilo`, `conteggio`, `ultimo`, `intervalloMedio`, `intervalliVisti` |
| `piatti` | `nome`, `occasione`, `tipo`, `impegno`, `stagione`, `tags[]`, `ingredienti[{nome,qta?,unita?}]` |
| `menuSettimana/{lunedì AAAA-MM-GG}` | `slots{ g{0-6}_{pranzo\|cena} }`, `ultimaGenerazione{firma,quando}` |
| `tasks` | `nome`, `ricorrenza`, `ogni`, `giorniSettimana[]`, `ancora`, `origine`, `scadenza`, `storico[{chi,quando}]`, `ultimoFattoDa`, `primaDi` (per l'annulla) |
| `movimenti` | `tipo` (`spesa`\|`rimborso`), `importo`, `quando`, `pagatoDa`, + spesa: `descrizione`, `categoria`, `condivisa` · + rimborso: `a` |
| `eventi` | `nome`, `quando` (ms mezzanotte), `ora`, `luogo`, `note` (facoltativi), `visibileA[]` (uid) |

⚠️ `spesa` (singolare) è la **lista della spesa**; i soldi stanno in `movimenti`.

Le regole stanno in `firestore.rules` (nel repo, si deploya a parte). Dentro `famiglie/{fid}`
c'è `match /{sub}/{docId}`: un jolly su **qualsiasi** sottocollezione, quindi aggiungerne
una nuova non richiede di toccare le regole.

I prodotti per la casa **stanno in `dispensa`** con `conservazione: 'casa'`: li scrive già
`ListaScreen.comprato()`. La Dispensa della cucina li filtra via, `CasaScreen` mostra
esattamente quelli. Nessuna collezione separata.

`frequenti` è il **livello di apprendimento**: ogni correzione dell'utente finisce lì e
ha priorità sui file statici. Vale per reparto, sezione e profilo.

## Decisioni di design (e perché)

**Moduli** (menu ☰ in alto a sinistra): 🏠 Oggi · 🍳 Cucina · ✅ Task · 💶 Spese · 📅 Eventi.
Dentro Cucina tre sezioni: 🛒 Lista · 🥫 Dispensa · 🍽️ Menu. Dentro Task due: 🧹 Faccende · 🧴 Casa.

**Oggi (home)** — è la schermata d'ingresso (`tab` parte da `home`). Cinque blocchi, in
quest'ordine: *Oggi* (eventi di oggi) · *Oggi si mangia* (slot di oggi da `menuSettimana`)
· *Da fare oggi* (faccende scadute o in scadenza, col turno) · *Lista della spesa*
(conteggio + primi nomi) · *Sta finendo* (dispensa e casa a Poco/Finito non già in lista).
Gli eventi stanno **in cima** perché sono il blocco più raro: quasi sempre assente, quindi
quando compare è una notizia — e un concerto stasera cambia il senso del menu qui sotto.

La home **riassume, non ricopia**: ogni blocco ha un tetto di righe e poi rimanda al
modulo (`MAX_FACCENDE`, `MAX_FINISCONO`; la lista spesa mostra il conteggio e i primi
nomi). Senza, in una giornata piena diventava un lenzuolo da scorrere.
Un blocco senza dati **non compare**: meglio quattro blocchi veri che sei mezzi vuoti, ed
è il motivo per cui Spese ed Eventi non ci sono finché sono segnaposto.
Due azioni si fanno da qui — spuntare una faccenda e mettere in lista ciò che sta finendo —
perché sono quelle che si ripetono dieci volte al giorno. Tutto il resto porta al modulo
con `vaiA(modulo, sezione)`.

**Lista spesa**
- Raggruppata per **reparto** (il giro tra gli scaffali).
- Suggerimenti mentre scrivi da catalogo + acquisti passati; icona 🕐 apre un pannello
  con "Stanno finendo in dispensa" e "Comprati spesso".
- L'etichetta del reparto sotto ogni articolo è toccabile: la correzione va in `frequenti`.
- Articoli generati dal menu mostrano "da «nome piatto»".

**Dispensa**
- Raggruppata per **dove tieni le cose** (Frigo / Dispensa / Freezer). I prodotti per la
  **casa sono esclusi** da qui (restano nella lista spesa; troveranno posto altrove).
- Stati: **C'è → Poco → Finito** (ciclo al tocco) + **Consumato** (assegnato dall'app,
  un tocco lo riporta a "C'è").
- **Come si consuma** (`consumoDi()` in `profili.js`), **non più scelto a mano**:
  - `fresco` con `pasti > 0`: dopo **quanti pasti pianificati** lo usano lo segna
    **Consumato** (zucchine/mozzarella 1; cicoria/insalata 2; carne-pesce 1). `giorni` è
    la rete di sicurezza se non è in un menu.
  - `fresco` con `pasti: 0`: il menu **non lo tocca**, esce solo per tempo — frutta da
    mangiare (6/20 gg) e scorta fresca di casa (patate, cipolla, agrumi… 30 gg).
  - `scorta`: mai "Consumato"; diventa **Poco** quando l'app stima che stia calando —
    formaggi stagionati, scatolame (tonno, ceci), pasta, pane, uova, burro.
  La classificazione dei freschi noti è la mappa `FRESCHI`; i default vengono dal reparto.
  La mappa `ECCEZIONI` (nome intero, vince su tutto) copre i composti che il match per
  parola sbaglierebbe: "latte di mandorla"≠latte, "tonno fresco"≠tonno in scatola,
  "frutta secca"≠frutta. Se compare un nuovo caso storto, si aggiunge lì.
  Il pannello del prodotto **non fa più scegliere il profilo**: mostra solo dove lo tieni
  e una riga che spiega come si consuma (letta da `consumoDi`).
- Quando una scorta diventa "Poco": **prima il ritmo imparato** dai riacquisti
  (`intervalloMedio`), altrimenti **usi nei menu** (soglia 6) e **tempo stimato** come rete.
- ⚠️ **Non usare mai la parola "scadenza"** nei testi utente: l'app non sa se qualcosa è
  andato a male, stima solo *quando l'avete finito*.

**Menu settimana**
- Griglia 7 giorni × (Pranzo, Cena). Ogni slot: vuoto, un **piatto**, **Avanzi**, o
  **Fuori** (pasto saltato di proposito — "Proponi" lo rispetta).
- Navigazione settimane con ‹ ›; si apre sempre sulla settimana corrente.
- **La lista spesa si aggiorna da sola** dal menu (nessun pulsante "genera"): aggiunge gli
  ingredienti mancanti, toglie quelli dei piatti rimossi, salta ciò che è in dispensa
  come "C'è". Gli articoli aggiunti a mano non vengono mai toccati.
  Ogni voce generata porta `daMenu` = chiave settimana, così settimane diverse non si
  cancellano a vicenda.
- **Proponi**: riempie solo gli slot vuoti. Vincoli rigidi: mai lo stesso piatto due volte
  nella settimana + occasione. Preferenze (punteggio): ingredienti già in dispensa,
  impegno adatto al giorno (veloci nei feriali), varietà di tipo, stagione.
  Anteprima con "Rigenera" prima di applicare.

**Task** — due sezioni: ✅ Faccende · 🧴 Casa.

*Faccende.* La distinzione portante è fra **la serie** (il ritmo ideale: `origine` +
`ricorrenza` + `ogni` + `giorniSettimana`) e **il giro in corso** (`scadenza`, spostabile a
mano). Spostare una faccenda non tocca mai la serie: le pulizie fatte lunedì tornano
comunque la domenica. `ancora` dice chi comanda quando spunti:
`'fisso'` la serie (il ritardo non sposta niente e non lascia arretrati accumulati),
`'dopo'` il completamento (`origine` diventa oggi). Con giorni precisi della settimana
`'dopo'` è nascosto: il giorno è già deciso.
Lista raggruppata per urgenza: In ritardo · Oggi · Questa settimana · Più avanti,
con sopra la **striscia della settimana** (lun→dom, frecce ‹ › ed etichette come il Menu:
"Questa settimana", "Prossima settimana"…). Tocchi un giorno e la lista filtra.
Una settimana per volta e non un mese di proposito: con `ancora: 'dopo'` le date lontane
sono supposizioni, e un mese a griglia le disegnerebbe come se fossero certe. La striscia
serve soprattutto a vedere gli **ingorghi** prima di arrivarci (la domenica si accumula).
Un solo segno per giorno: **pallino** se c'è una cosa sola, **barretta** se ce n'è più
d'una (rosso su oggi se ci sono arretrati). Mai contare pallini: il numero è a un tocco.
Se un giorno faremo il modulo Eventi, la vista mensile va lì, unita agli appuntamenti.
**Sposta** (nel pannello, stessa striscia): cambia solo `scadenza`, mai `origine`.
Creando una faccenda col giorno selezionato nella striscia, quel giorno diventa il suo
(`origine` + `giorniSettimana` se settimanale): scelto giovedì, nasce "Ogni giovedì".
Suggerimenti mentre scrivi dal catalogo, già col ritmo tipico.

Chi fa cosa: `storico` tiene le ultime 10 volte (`serverTimestamp()` non è ammesso dentro
un array Firestore, quindi lì si usa `Date.now()`); il pannello ne mostra 5, oltre è un
registro che nessuno legge. Il **pallino-iniziale** (come gli avatar dell'Hero) mostra a
chi **tocca adesso**, non chi l'ha fatta: `tocca()` prende chi non la fa da più tempo fra
i membri, dedotto dallo storico — niente assegnazione da mantenere, e finché nessuno l'ha
mai fatta non dice niente. Chi l'ha fatta l'ultima volta sta nel testo tenue accanto,
scritto per esteso ("ultima volta: Roc, oggi"): abbreviato era ambiguo. Spuntandola la faccenda non sparisce: passa in **"Fatte oggi"**
in fondo alla lista, con chi l'ha fatta e **Annulla** (`primaDi` conserva scadenza,
origine e storico precedenti). Chi è in "Fatte oggi" è escluso dai gruppi
per urgenza, altrimenti comparirebbe due volte, essendo già ripianificata in avanti.
**Ma non dal filtro per giorno**: lì la domanda è "cosa cade in questo giorno", quindi una
faccenda spuntata oggi si vede lo stesso sul giorno in cui torna — è dove la striscia la
conta, e nasconderla lasciava un pallino senza riga sotto.

⚠️ **`giornoDiLista()` è la regola unica** su in che giorno una faccenda si *mostra*:
la sua scadenza, oppure **oggi** se è in ritardo (una cosa scaduta ieri la devi fare
adesso, non ieri). La usano sia i pallini della striscia sia il filtro per giorno: quando
esistevano due implementazioni discordavano, e il pallino finiva su oggi mentre la riga
restava su ieri. Gli arretrati **non** si spostano nei dati: `scadenza` resta quella, così
"in ritardo di 3 giorni" continua a saperlo, e due telefoni non si mettono a riscrivere
gli stessi documenti ogni mattina. `inRitardo` in `StrisciaGiorni` serve solo a colorare
di rosso: il conteggio è già dentro `conteggi`.

*Casa.* Detersivi, carta, igiene (54 prodotti nel reparto `casa` di `catalogo.js`).
Stati C'è → Poco → Finito, senza "Consumato" e senza profili di consumo.
"Poco"/"Finito" li fa comparire da soli nel pannello 🕐 della lista spesa.

Passaggio automatico a **"Poco"**: *solo* il ritmo imparato dai riacquisti
(`intervalloMedio` in `frequenti`), e solo da `intervalliVisti >= 1`, cioè dopo che lo
stesso prodotto è stato comprato **due volte**. Nessuna stima di ripiego come in cucina:
per un detersivo l'app non sa quanto duri, e inventarlo sarebbe peggio che tacere.
Il ritmo appreso è scritto in chiaro sulla riga ("lo ricomprate ogni ~24 giorni"), così
il cambio di stato non sembra magia.

⚠️ In `conservazioneDi()` il reparto `casa` **ha la precedenza sul match per parola**:
senza quella regola "sale per lavastoviglie" finiva in dispensa per via di "sale".

**Spese** — due tipi di movimento nella stessa collezione: **spesa** (chi ha pagato cosa) e
**rimborso** (chi ha dato soldi a chi). Il rimborso è il pezzo che rende il modulo usabile
oltre il primo mese: senza, il saldo cresce all'infinito e nessuno lo guarda più.

Le spese condivise si dividono **sempre a metà**; quelle segnate "solo mia"
(`condivisa: false`) restano fuori dal conto ma contano nel totale speso da quella persona.
Il **saldo è totale, non mensile**: le frecce ‹ › sfogliano i mesi, ma il numero in cima è
il debito vero di oggi. La categoria si indovina dalla descrizione ("Spesa Conad" → spesa),
correggibile con una chip.

`euro()` e `leggiImporto()` fanno i conti in italiano: il punto è ambiguo, quindi con la
virgola presente vale come separatore di migliaia (`1.234,56`), da solo come decimale
(`12.50`) tranne quando separa gruppi di tre cifre (`1.234` = 1234).

**Eventi** — cose da fare insieme: concerti, compleanni, cene. Griglia del mese con ‹ ›
in cima, sotto **"Prossimi"** (e le ultime 5 già passate, in grigio); toccando un giorno
si vede solo quello. Nessuna ricorrenza: ogni evento è una data sola — scelta consapevole,
un compleanno si risegna. Nessuna faccenda nella griglia: quelle restano in Task.
Solo il nome è obbligatorio; ora, luogo e note si riempiono quando servono.

Qui il **mese** è legittimo, a differenza delle faccende: un concerto il 14 è un fatto,
non una previsione.

**Chi vede cosa** (`src/eventi.js`): `visibileA` è l'elenco degli uid. Un evento nuovo nasce
**solo di chi lo crea**, e dal form si aggiungono gli altri membri. Uno senza `visibileA`
è di prima di questa funzione: lo vedono tutti (nessuna migrazione necessaria).

⚠️ **È un filtro dell'interfaccia, non una protezione**, ed è una scelta consapevole
dell'utente. `firestore.rules` lascia leggere ogni documento a tutti i membri, quindi un
evento "solo per me" arriva comunque sull'altro telefono: non viene disegnato, ma c'è.
Va bene per una sorpresa, non per cose davvero riservate — per questo nei testi non si usa
mai la parola "privato", ma **"solo per me"**: descrive l'intenzione senza promettere
sicurezza. Il campo ha già la forma della versione vera: per renderla reale basta
interrogare con `array-contains`, togliere `eventi` dal jolly in `firestore.rules` e dargli
regole proprie — senza toccare i dati salvati.

Gli uid dei membri arrivano da `HeaderContext` (`membri`, `membriNomi`), non solo i `nomi`.

**Convenzioni di codice**
- Nomi di variabili, funzioni e commenti **in italiano**, come il resto del progetto.
- `StyleSheet.create` in fondo al file, stili con nomi brevi (`s.riga`, `s.chip`).
- **Mai `Alert.alert`**: usare `useDialog()` (dialoghi coerenti con lo stile dell'app).
- Nei modali con contenuto scorrevole: sfondo cliccabile come `<Pressable style={s.sfondo}>`
  **separato** dal pannello, mai `Pressable` che avvolge lo scroll (blocca il gesto).
- Confronti sui nomi prodotto sempre via `normalizza()`; per le liste di eccezioni usare
  il **confronto per parola intera** (altrimenti "mela" corrisponde a "melanzana").
- I nomi prodotto si mostrano **sempre** con `perSchermo()` (iniziale maiuscola). In
  archivio arrivano scritti in modi diversi — catalogo minuscolo, piatti importati
  dall'Excel capitalizzati, e ognuno scrive come gli pare: si uniforma alla lettura, non
  nei dati. Non reintrodurre `cap()` locali nelle schermate.

## Web app (PWA)

Stessa base di codice pubblicata su **Firebase Hosting**, così chi ha l'iPhone prova
l'app senza Expo Go e senza i 99 €/anno di Apple: si apre in Safari e con "Aggiungi alla
schermata Home" diventa un'icona a tutto schermo.

`npm run deploy` = `expo export -p web` (in `dist/`) + `firebase deploy --only hosting`.
Serve il CLI: `npm install -g firebase-tools` e `firebase login` (globale, fuori da OneDrive).

**Persistenza del login: due file, non un `if`.** `firebase.js` (nativo, AsyncStorage) e
`firebase.web.js` (browser, `browserLocalPersistence`); i valori del progetto stanno in
`firebaseConfig.js`, letti da entrambi. Metro sceglie il `.web.js` solo quando compila per
web. Un `Platform.OS === 'web' ? …` non basterebbe: `getReactNativePersistence` va comunque
*importato* da `firebase/auth`, e quell'export sul bundle web non esiste — il ramo a runtime
non salva da un import che fallisce in fase di build.

⚠️ **`Alert.alert` su web è un no-op**: in `react-native-web` il metodo è letteralmente
`static alert() {}`, corpo vuoto. Nessun messaggio, nessun errore in console. È il motivo
per cui la regola "mai `Alert.alert`, sempre `useDialog()`" non è solo stilistica.

**La colonna da telefono sta in `public/index.html`, non in `App.js`.** L'app è disegnata
per un telefono in verticale: su desktop `#root` è limitato a 460px e centrato. In CSS di
proposito, così nessun file compilato anche da Android viene toccato. Il punto non ovvio
sono i **Modal**: `react-native-web` non li lascia nell'albero React, crea un `<div>` e lo
appende a `<body>` col contenuto in `position: fixed`. Senza la regola su
`body > div:not(#root)` — `max-width` **più** `transform: translateZ(0)`, che rende il div
il riferimento per i `position: fixed` dentro — i fogli e il menu ☰ si aprirebbero larghi
quanto il monitor. Il `pointer-events: none` sullo stesso selettore serve perché quel div
esiste anche a modale chiuso: senza, intercetterebbe ogni clic e l'app sembrerebbe morta.

**Niente `viewport-fit=cover`**: così iOS in standalone tiene da solo il contenuto sotto il
notch e sopra la barra home, senza toccare i padding di `Hero.js`. Prezzo: la striscia dello
status bar prende il colore di sfondo invece del colore dell'Hero, che su Android sale fin
lassù. Per andare a filo servirebbe `env(safe-area-inset-top)` in `Hero.js`.

`public/index.html` è il template ufficiale di Expo (lo cerca `@expo/cli`, `webTemplate.js`):
`%LANG_ISO_CODE%` e `%WEB_TITLE%` li sostituisce lui dalla sezione `web` di `app.json`,
e ci appende gli script del bundle.

`Share.share` (l'export dati) su web usa `navigator.share`: c'è su Safari iPhone, non su
Chrome desktop, dove la promise viene rifiutata e parte il dialogo "Esportazione non
riuscita" che c'era già. Degrada da sé, è una funzione dell'amministratore.

## In sospeso

- **La famiglia attuale è di test.** Andando in produzione se ne creerà una nuova: tutto
  sta sotto `famiglie/{famigliaId}/…`, quindi `frequenti`, `tasks`, `dispensa` e `spesa`
  ripartono vuoti da soli. Non c'è nessuna separazione test/prod su Firebase (un solo
  progetto, `spesa-famiglia-c15e2`) e va bene così: la separazione è la famiglia.
  I ritmi imparati in test sono rumore, si buttano di proposito.
- ✅ **Travaso fatto il 2026-07-20.** `piattiSeed.js` è ora il ricettario vero (29 piatti,
  tolti "Pizza rustica" e "Ramen" perché senza ingredienti); i 41 ingredienti che
  mancavano sono in `catalogo.js`; rinominati gli inglesismi e i refusi (Mustard→Senape,
  Tomato paste→Concentrato di pomodoro, Corn tortillas→Tortillas, Temphe→Tempeh,
  Tonnerelli→Tonnarelli, Greens→Verdure a foglia). Le due correzioni fatte dall'app sono
  nei file statici (poi il modello dei profili è stato rifatto, vedi Dispensa) e
  pesce surgelato → `freezer`. `importaPiattiSeed()` ora rispetta tipo/impegno/stagione
  del seed invece di azzerarli.
- **Gli ingredienti dei piatti non si suggeriscono in lista.** I suggerimenti pescano solo
  da `TUTTI_I_PRODOTTI` e da `frequenti` (cioè da ciò che avete *comprato*): un
  ingrediente aggiunto a un piatto entra in lista se pianifichi quel piatto, ma non
  compare fra i suggerimenti finché non lo compri una volta. Miglioramento sensato.
- L'export copre solo `frequenti` + `piatti`: **non** `tasks` né `dispensa`. Ripartendo da
  una famiglia nuova, le faccende si riconfigurano a mano (scelta consapevole).
- **Spese**: bollette ricorrenti non gestite (si inseriscono a mano, scelta consapevole);
  il saldo non compare in home; nessun collegamento fra "spesa fatta" in Lista e importo.
- **Eventi**: niente ricorrenze annuali (compleanni da risegnare) e niente notifiche,
  rimandati di proposito. In home compaiono solo quelli **di oggi**: se serve anche
  "domani" o "questa settimana", è la finestra della query in `HomeScreen`.
- La home non mostra il **saldo delle spese**. Da riprendere.
- ✅ **Nome scelto: Nido**, motto **«La casa che tenete insieme.»** (schermo di login).
- **Icona: provvisoria.** È la casa col cuore, cioè il glifo `home-heart` dello schermo di
  login ridisegnato pieno con il cuore ritagliato. Da rifare con calma: i riferimenti che
  l'utente preferisce sono **line art** (tratti sottili intrecciati) e una casa geometrica.
  Un tentativo col nido è stato scartato — resta nel generatore sotto `SEGNO=nido`, perché
  il progetto non è sotto git e altrimenti sarebbe perso.
  L'icona è **generata da codice**, niente pacchetti da installare (su OneDrive
  `npm install` è inaffidabile):
  `node strumenti/icona.mjs assets` · `... public web` · `... <cartella> prova` (anteprime
  a 1024/128/48px, senza toccare il progetto).
  **Giudicare sempre a 48px**: è lì che i disegni fini diventano una macchia — il nido
  intrecciato si sfaldava proprio lì.
- ⚠️ **L'app resta sullo spinner per sempre se un font non arriva.** `App.js` fa
  `const [fontiPronte] = useFonts(…)` e ignora il secondo valore, che è l'errore:
  se il caricamento fallisce, `fontiPronte` non diventa mai `true` e non compare nessun
  messaggio. Su Android non capita (i font sono nel pacchetto), sul web sì — è successo
  davvero il 2026-07-21 col primo deploy senza font. Correzione, valutata e rimandata:
  `const [fontiPronte, erroreFont] = useFonts(…)` e poi
  `if (!pronto || (!fontiPronte && !erroreFont))`, così riparte coi caratteri di sistema.
- **Cache di Hosting da sistemare.** Firebase serve tutto con `max-age=3600`, `index.html`
  compreso: dopo un rilascio chi ha già aperto l'app può restare un'ora sulla versione
  vecchia. Serve una sezione `headers` in `firebase.json`: `index.html` senza cache, e i
  file col nome a impronta (`_expo/**`, `assets/**`) in cache lunga. Valutato e rimandato.
- ✅ **Web app online dal 2026-07-21**: https://spesa-famiglia-c15e2.web.app
  Verificati sul sito pubblicato: font e icone caricati, colonna a 460px, rewrite SPA
  (un indirizzo qualsiasi risponde 200 con l'app), `manifest.json` servito.
  Provata e funzionante da Android. **Non ancora provata da iPhone/Safari**: restano da
  verificare "Aggiungi alla schermata Home", l'apertura a tutto schermo e il
  comportamento vicino al notch e alla barra home.
  Il nome e l'icona della PWA sono ancora quelli attuali di proposito: si allineeranno
  al rename quando lo si deciderà. Chi ha già aggiunto l'icona dovrà toglierla e
  rimetterla per vedere il nome nuovo — iOS la fotografa al momento dell'aggiunta.
- La web app è **pubblica**: chiunque abbia il link può registrarsi. Senza codice invito
  però non vede niente, perché i dati stanno tutti sotto `famiglie/{famigliaId}` e le
  regole lasciano passare solo i membri. Il codice (`PANE-42`) è però corto e indovinabile:
  se un giorno la cosa desse fastidio, è lì che si interviene.
- La striscia parte dal lunedì: di sabato mostra cinque giorni già passati (in grigio).
- ⚠️ **Doppioni per maiuscole**: tre punti confrontano il nome esatto e non normalizzato —
  `ListaScreen.comprato()`, `DispensaScreen.aggiungi()`, `CasaScreen.aggiungi()`
  (`where('nome', '==', …)`). "Pepe" dal menu e "pepe" scritto a mano creano **due**
  documenti in `dispensa`. Firestore non sa fare confronti senza maiuscole: serve salvare
  una `chiave` normalizzata sui documenti e interrogare quella. Da fare col travaso.
- **Quantità**: salvate sui piatti importati ma non usate da nessuna logica.
- **Test tabellari versionati** per ricorrenza.js / profili.js / spese.js: oggi le
  verifiche vivono in script usa-e-getta nello scratchpad; andrebbero portati in
  `strumenti/` per rifarli a ogni modifica. (Suggerito anche dalla review esterna.)
- **Avanzi sui piatti** (campo + Proponi che mette "Avanzi" il pasto dopo): deciso,
  non ancora implementato — in attesa che il nuovo modello consumi sia testato sul campo.
- Idee: statistiche, quantità in lista, notifiche.
