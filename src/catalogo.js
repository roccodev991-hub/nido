// Catalogo prodotti → categoria (reparto del supermercato).
// Serve per raggruppare la lista come il giro tra gli scaffali.
// I prodotti non riconosciuti finiscono in "Altro".

// Reparti, in ordine di visita al supermercato.
export const CATEGORIE = {
  'frutta-verdura': { label: 'Frutta e verdura', icon: 'food-apple-outline', ordine: 1 },
  latticini:        { label: 'Latticini e uova', icon: 'cheese', ordine: 2 },
  'carne-pesce':    { label: 'Carne e pesce', icon: 'food-drumstick-outline', ordine: 3 },
  'pane-forno':     { label: 'Pane e forno', icon: 'baguette', ordine: 4 },
  dispensa:         { label: 'Pasta e scatolame', icon: 'pasta', ordine: 5 },
  colazione:        { label: 'Colazione e dolci', icon: 'cupcake', ordine: 6 },
  bevande:          { label: 'Bevande', icon: 'bottle-soda-outline', ordine: 7 },
  casa:             { label: 'Casa e igiene', icon: 'spray-bottle', ordine: 8 },
  altro:            { label: 'Altro', icon: 'dots-horizontal', ordine: 99 },
};

// Prodotti comuni per reparto (singolare e plurale dove utile).
// Le voci marcate "travaso 2026-07" vengono dal ricettario vero della famiglia:
// erano ingredienti usati nei piatti che il catalogo non conosceva e che
// finivano tutti nel reparto "altro", in fondo alla lista.
const PRODOTTI = {
  'frutta-verdura': [
    'mela', 'mele', 'banana', 'banane', 'pomodoro', 'pomodori', 'insalata', 'lattuga',
    'zucchine', 'zucchina', 'carote', 'carota', 'patate', 'patata', 'cipolla', 'cipolle',
    'aglio', 'limone', 'limoni', 'arancia', 'arance', 'pera', 'pere', 'fragole', 'fragola',
    'spinaci', 'melanzane', 'melanzana', 'peperoni', 'peperone', 'funghi', 'basilico',
    'uva', 'kiwi', 'sedano', 'broccoli', 'finocchi', 'finocchio', 'zucca', 'clementine',
    'mandarini', 'pesche', 'pesca', 'albicocche', 'ciliegie', 'anguria', 'melone', 'avocado',
    // travaso 2026-07
    'prezzemolo', 'cicoria', 'cicorie', 'pomodorini', 'cavolo', 'porro', 'porri',
    'patata dolce', 'zenzero', 'verdure a foglia', 'bietole',
    // generici: usali nei piatti quando l'ingrediente è intercambiabile
    'verdure', 'verdura', 'frutta', 'insalata mista', 'contorno',
  ],
  latticini: [
    'latte', 'yogurt', 'burro', 'formaggio', 'parmigiano', 'mozzarella', 'ricotta', 'uova',
    'uovo', 'panna', 'stracchino', 'philadelphia', 'mascarpone', 'grana', 'gorgonzola',
    'scamorza', 'provola', 'emmental', 'fontina',
    // travaso 2026-07
    'cheddar', 'pecorino', 'pecorino romano', 'yogurt greco',
  ],
  'carne-pesce': [
    'pollo', 'manzo', 'maiale', 'salsiccia', 'salsicce', 'prosciutto', 'tonno', 'salmone',
    'pesce', 'carne', 'macinato', 'tacchino', 'wurstel', 'speck', 'bresaola', 'gamberi',
    'mortadella', 'salame', 'vitello', 'hamburger', 'cotolette', 'merluzzo', 'alici',
    // travaso 2026-07
    'orata', 'sgombro', 'carne rossa', 'fesa di tacchino', 'pesce surgelato',
    // generici
    'salumi', 'affettati', 'pesce bianco', 'carne bianca',
  ],
  'pane-forno': [
    'pane', 'pancarre', 'grissini', 'crackers', 'fette biscottate', 'focaccia', 'piadina',
    'cornetti', 'brioche', 'baguette', 'michette',
    // travaso 2026-07
    'toast', 'pane vecchio', 'tortillas',
  ],
  dispensa: [
    'pasta', 'riso', 'sugo', 'pelati', 'passata', 'olio', 'sale', 'zucchero', 'farina',
    'fagioli', 'ceci', 'lenticchie', 'mais', 'aceto', 'pesto', 'legumi', 'brodo', 'dado',
    'gnocchi', 'polenta', 'couscous', 'tonno in scatola', 'olive', 'capperi', 'spezie',
    'pangrattato', // sta in dispensa, non in panetteria
    // travaso 2026-07
    'spaghetti', 'tonnarelli', 'cous cous', 'farro', 'fagioli corona', 'lenticchie rosse',
    'farina di ceci', 'salsa di soia', 'maionese', 'senape', 'concentrato di pomodoro',
    'pepe', 'peperoncino', 'cumino', 'curcuma', 'coriandolo', 'rosmarino', 'chipotle',
    'ravioli cinesi', 'tempeh',
  ],
  colazione: [
    'biscotti', 'caffe', 'caffè', 'the', 'tè', 'miele', 'marmellata', 'cereali', 'nutella',
    'fette', 'merendine', 'cioccolato', 'zucchero a velo', 'lievito', 'wafer', 'crackers dolci',
  ],
  bevande: [
    'acqua', 'vino', 'birra', 'coca cola', 'coca', 'aranciata', 'succo', 'succhi', 'spremuta',
    'latte di soia', 'bibite', 'tè freddo', 'the freddo', 'gassosa', 'tonica', 'redbull',
    // travaso 2026-07
    'vino bianco', 'marsala',
  ],
  casa: [
    'detersivo', 'sapone', 'shampoo', 'carta igienica', 'scottex', 'tovaglioli', 'sacchetti',
    'spugne', 'ammorbidente', 'dentifricio', 'deodorante', 'bagnoschiuma', 'candeggina',
    'sgrassatore', 'lavastoviglie', 'pattumiera', 'alluminio', 'pellicola', 'cotone', 'salviette',
    // piatti e lavastoviglie
    'detersivo piatti', 'detersivo lavastoviglie', 'pastiglie lavastoviglie', 'brillantante',
    'sale per lavastoviglie', 'anticalcare',
    // bucato
    'detersivo lavatrice', 'detersivo bucato', 'ammoniaca', 'smacchiatore', 'candeggina delicata',
    // pulizie di casa
    'detergente pavimenti', 'detersivo pavimenti', 'detergente bagno', 'anticalcare bagno',
    'detergente vetri', 'panni', 'panni cattura polvere', 'guanti', 'ricarica mocio',
    // igiene personale
    'balsamo', 'sapone mani', 'spazzolino', 'filo interdentale', 'collutorio',
    'rasoi', 'schiuma da barba', 'assorbenti', 'cotton fioc', 'crema idratante',
    // carta e cucina
    'carta forno', 'sacchetti gelo', 'sacchi immondizia', 'fazzoletti',
  ],
};

// Costruisce la mappa inversa nome → categoria (una volta sola).
const MAPPA = {};
for (const [cat, prodotti] of Object.entries(PRODOTTI)) {
  for (const p of prodotti) MAPPA[p] = cat;
}

// Normalizza un nome: minuscolo, senza spazi doppi. Per i confronti.
export function normalizza(nome) {
  return nome.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Come si scrive un nome prodotto a schermo: iniziale maiuscola, sempre.
// Serve perché in archivio i nomi arrivano scritti in modi diversi — il
// catalogo è minuscolo, i piatti importati dall'Excel sono capitalizzati,
// e ciascuno scrive come gli pare. Uniformiamo alla lettura, non nei dati.
export function perSchermo(nome) {
  const n = (nome || '').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : n;
}

// Elenco piatto di tutti i prodotti noti (per i suggerimenti mentre scrivi).
export const TUTTI_I_PRODOTTI = Object.values(PRODOTTI)
  .flat()
  .filter((v, i, arr) => arr.indexOf(v) === i)
  .sort();

// I soli prodotti per la casa: suggerimenti della sezione Casa (modulo Task).
export const PRODOTTI_CASA = PRODOTTI.casa.slice().sort();

// Restituisce la categoria di un prodotto (o 'altro' se sconosciuto).
export function categoriaDi(nome) {
  const n = normalizza(nome);
  if (MAPPA[n]) return MAPPA[n];
  // prova a riconoscere una parola nota dentro il nome (es. "latte intero" → latte)
  for (const parola of n.split(' ')) {
    if (MAPPA[parola]) return MAPPA[parola];
  }
  return 'altro';
}

// Ordina e raggruppa una lista di articoli per categoria.
// Ritorna array di sezioni: { key, label, icon, data } pronte per SectionList.
export function raggruppaPerCategoria(articoli) {
  const gruppi = {};
  for (const a of articoli) {
    const cat = a.categoria && CATEGORIE[a.categoria] ? a.categoria : 'altro';
    (gruppi[cat] = gruppi[cat] || []).push(a);
  }
  return Object.keys(gruppi)
    .sort((x, y) => CATEGORIE[x].ordine - CATEGORIE[y].ordine)
    .map((cat) => ({
      key: cat,
      label: CATEGORIE[cat].label,
      icon: CATEGORIE[cat].icon,
      data: gruppi[cat],
    }));
}
