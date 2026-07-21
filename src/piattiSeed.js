// Piatti di partenza: il ricettario vero della famiglia, travasato dall'app
// il 20 luglio 2026 (avatar → "Esporta i miei dati"). Modificabili dall'app.
// Ognuno: nome, occasione, ingredienti (con quantità opzionali), e dove noti
// tipo/impegno/stagione.
//
// Rispetto all'export: occasioni in minuscolo, inglesismi e refusi corretti
// (Mustard→Senape, Temphe→Tempeh, Tonnerelli→Tonnarelli…), tolti i piatti
// senza ingredienti e le quantità finite per errore nel campo nome.
export const PIATTI_SEED = [
  {
    "nome": "Beans and bread",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Fagioli corona",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Pane",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "veg",
    "impegno": "veloce",
    "stagione": "sempre"
  },
  {
    "nome": "Burger e patate",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Hamburger",
        "qta": "180.0",
        "unita": "g"
      },
      {
        "nome": "Patate",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Pane",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Cicoria",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Formaggio",
        "qta": "50.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "2.0",
        "unita": "pz"
      }
    ],
    "tipo": "carne",
    "impegno": "elaborato",
    "stagione": "sempre"
  },
  {
    "nome": "Cabbage tempeh riso",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Cavolo",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Tempeh",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Peperoni",
        "qta": "30.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Zenzero",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Pomodorini",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Riso",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "veg",
    "stagione": "sempre"
  },
  {
    "nome": "Carne e verdure",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Carne rossa",
        "qta": "200.0",
        "unita": "g"
      },
      {
        "nome": "Cicoria",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Patate",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Cous Cous sgombro e veg",
    "occasione": "sempre",
    "ingredienti": [
      {
        "nome": "Cous cous",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Sgombro",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Zucchine",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Melanzana",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      }
    ],
    "tipo": "pesce"
  },
  {
    "nome": "Fish Cicoria e patate",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Pesce",
        "qta": "200.0",
        "unita": "g"
      },
      {
        "nome": "Cicoria",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Patate",
        "qta": "150.0",
        "unita": "g"
      }
    ],
    "tipo": "pesce"
  },
  {
    "nome": "Frittata and bread",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Uova",
        "qta": "2.0",
        "unita": "pz"
      },
      {
        "nome": "Patate",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Pane",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Insalata al forno",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Melanzana",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Patata dolce",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Pomodorini",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Lenticchie",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Lentils and rice",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Lenticchie rosse",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Riso",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Concentrato di pomodoro",
        "qta": "2.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Brodo",
        "qta": "300.0",
        "unita": "ml"
      },
      {
        "nome": "Limone",
        "qta": "0,5",
        "unita": "pz"
      },
      {
        "nome": "Verdure a foglia",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Orata all'acqua pazza",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Orata"
      },
      {
        "nome": "Pomodorini"
      },
      {
        "nome": "Prezzemolo"
      },
      {
        "nome": "Aglio"
      }
    ],
    "tipo": "pesce",
    "impegno": "normale",
    "stagione": "sempre"
  },
  {
    "nome": "Panino indiano",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Pane",
        "qta": "2.0",
        "unita": "pz"
      },
      {
        "nome": "Farina di ceci",
        "qta": "20.0",
        "unita": "g"
      },
      {
        "nome": "Yogurt greco",
        "qta": "20.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla"
      },
      {
        "nome": "Prezzemolo"
      },
      {
        "nome": "Curcuma"
      },
      {
        "nome": "Marsala"
      },
      {
        "nome": "Coriandolo"
      },
      {
        "nome": "Sale"
      },
      {
        "nome": "Pepe"
      },
      {
        "nome": "Acqua"
      },
      {
        "nome": "Cheddar"
      },
      {
        "nome": "Stracchino"
      },
      {
        "nome": "Fesa di tacchino"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Pasta al sugo",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Spaghetti",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Sugo",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Aglio",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Peperoncino",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Parmigiano",
        "qta": "1.0",
        "unita": "cucchiai"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Pasta cacio e pepe",
    "occasione": "sempre",
    "ingredienti": [
      {
        "nome": "Tonnarelli"
      },
      {
        "nome": "Pecorino romano"
      },
      {
        "nome": "Pepe"
      }
    ],
    "tipo": "veg",
    "impegno": "normale",
    "stagione": "inverno"
  },
  {
    "nome": "Pasta e ceci",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Pasta",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Ceci",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Peperoncino",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Prezzemolo",
        "qta": "1.0",
        "unita": "cucchiai"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Pasta e fagioli",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Pasta",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Fagioli",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Peperoncino",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Rosmarino",
        "qta": "1.0",
        "unita": "cucchiai"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Pasta e pesto",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Pasta",
        "qta": "120.0",
        "unita": "g"
      },
      {
        "nome": "Pesto",
        "qta": "40.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Pasta nerano",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Spaghetti",
        "qta": "120.0",
        "unita": "g"
      },
      {
        "nome": "Zucchine",
        "qta": "2.0",
        "unita": "g"
      },
      {
        "nome": "Formaggio",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Basilico",
        "qta": "20.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Piadina prosciutto e veg",
    "occasione": "sempre",
    "ingredienti": [
      {
        "nome": "Piadina"
      },
      {
        "nome": "Prosciutto"
      },
      {
        "nome": "Insalata"
      }
    ],
    "tipo": "carne",
    "impegno": "veloce",
    "stagione": "estate"
  },
  {
    "nome": "Pollo Piccata e patate",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Pollo",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Capperi",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Burro",
        "qta": "10.0",
        "unita": "g"
      },
      {
        "nome": "Limone",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Vino bianco",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Aglio",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Peperoncino",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Patate",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Pollo verdure e patate",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Pollo",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Patate",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Cicoria",
        "qta": "150.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Polpette",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Macinato",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Pane vecchio",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Pangrattato",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Uova",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Prezzemolo",
        "qta": "50.0",
        "unita": "g"
      },
      {
        "nome": "Sugo",
        "qta": "50.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Ravioli chinese and rice",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Ravioli cinesi",
        "qta": "200.0",
        "unita": "g"
      },
      {
        "nome": "Riso",
        "qta": "80.0",
        "unita": "g"
      }
    ],
    "tipo": "veg"
  },
  {
    "nome": "Rice broccoli beef stir fry",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Riso",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Broccoli",
        "qta": "150.0",
        "unita": "g"
      },
      {
        "nome": "Manzo",
        "qta": "150.0",
        "unita": "g"
      }
    ],
    "tipo": "carne",
    "impegno": "normale",
    "stagione": "sempre"
  },
  {
    "nome": "Riso e tonno",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Riso",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Tonno",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Salsa di soia",
        "qta": "1.0",
        "unita": "cucchiai"
      }
    ],
    "tipo": "pesce"
  },
  {
    "nome": "Salsiccia e verdure e patate(riso)",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Salsiccia"
      },
      {
        "nome": "Riso"
      },
      {
        "nome": "Cavolo"
      },
      {
        "nome": "Verdure a foglia"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Smear tacos with chipotle cabbage",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Tortillas",
        "qta": "2.0",
        "unita": "pz"
      },
      {
        "nome": "Macinato",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Cumino",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Aglio",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Cavolo",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Chipotle",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Limone",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Maionese",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Peperoni",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  },
  {
    "nome": "Spaghetti e tonno",
    "occasione": "pranzo",
    "ingredienti": [
      {
        "nome": "Spaghetti",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Tonno",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Aglio",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Cipolla",
        "qta": "1.0",
        "unita": "cucchiai"
      }
    ],
    "tipo": "pesce"
  },
  {
    "nome": "Tuna Salad",
    "occasione": "sempre",
    "ingredienti": [
      {
        "nome": "Tonno",
        "qta": "80.0",
        "unita": "g"
      },
      {
        "nome": "Maionese",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Senape",
        "qta": "1.0",
        "unita": "cucchiai"
      },
      {
        "nome": "Prezzemolo",
        "qta": "30.0",
        "unita": "g"
      },
      {
        "nome": "Sedano",
        "qta": "50.0",
        "unita": "g"
      },
      {
        "nome": "Uova",
        "qta": "1.0",
        "unita": "pz"
      },
      {
        "nome": "Toast",
        "qta": "2.0",
        "unita": "pz"
      }
    ],
    "tipo": "pesce"
  },
  {
    "nome": "White bean turkey soup",
    "occasione": "cena",
    "ingredienti": [
      {
        "nome": "Fagioli corona",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Porro",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Tacchino",
        "qta": "100.0",
        "unita": "g"
      },
      {
        "nome": "Brodo",
        "qta": "200.0",
        "unita": "ml"
      },
      {
        "nome": "Farro",
        "qta": "100.0",
        "unita": "g"
      }
    ],
    "tipo": "carne"
  }
];
