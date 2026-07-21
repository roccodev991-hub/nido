// Generatore del logo/icona di "Nido". Node puro: niente pacchetti da
// installare (su OneDrive npm install è inaffidabile), PNG scritto con zlib.
//
// Il segno attuale (provvisorio): una casa piena, bassa e larga, con la falda
// che sporge, su un fondo verde sfumato. È il glifo `home-heart` dello schermo
// di login, semplificato.
//
// Nel file resta anche un tentativo col nido (`SEGNO=nido`), scartato: a 48px
// i rametti intrecciati diventavano una macchia. Tenuto perché il progetto non
// è sotto git e altrimenti sarebbe perso.
//
// Uso:
//   node strumenti/icona.mjs assets        → icone dell'app
//   node strumenti/icona.mjs public web    → icone della web app (manifest PWA)
//   node strumenti/icona.mjs <cart> prova  → anteprime 1024/128/48px
//
// Giudicare sempre l'anteprima a 48px: è lì che i disegni fini si sfaldano.
import zlib from 'zlib';
import fs from 'fs';

const VERDE = [0x2e, 0x5b, 0x3e]; // verde bosco, l'accento dell'app
const CARTA = [0xf6, 0xf2, 0xe8]; // carta chiara del fondo

// Il fondo è sfumato: più chiaro in alto, più cupo in basso. Sono due passi
// attorno al verde bosco, non due colori nuovi — la parentela si vede.
const VERDE_ALTO = [0x3b, 0x6f, 0x4c];
const VERDE_BASSO = [0x22, 0x47, 0x30];
function sfumato(y) {
  const t = Math.min(1, Math.max(0, y));
  return [
    Math.round(VERDE_ALTO[0] + (VERDE_BASSO[0] - VERDE_ALTO[0]) * t),
    Math.round(VERDE_ALTO[1] + (VERDE_BASSO[1] - VERDE_ALTO[1]) * t),
    Math.round(VERDE_ALTO[2] + (VERDE_BASSO[2] - VERDE_ALTO[2]) * t),
  ];
}

// ——— PNG minimale (RGBA, senza filtri) ———————————————————————————
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(tipo, dati) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}
function scriviPng(file, lato, pixel) {
  const righe = Buffer.alloc(lato * (lato * 4 + 1));
  for (let y = 0; y < lato; y += 1) {
    righe[y * (lato * 4 + 1)] = 0; // filtro "none"
    pixel.copy(righe, y * (lato * 4 + 1) + 1, y * lato * 4, (y + 1) * lato * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8; // 8 bit per canale
  ihdr[9] = 6; // RGBA
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(righe, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

// ——— Primitive geometriche ———————————————————————————————————————
const rad = (g) => (g * Math.PI) / 180;

// Ruota un punto attorno a un centro (angolo in gradi, y verso il basso).
function ruota(px, py, cx, cy, gradi) {
  const a = rad(gradi);
  const dx = px - cx;
  const dy = py - cy;
  return [
    cx + dx * Math.cos(a) + dy * Math.sin(a),
    cy - dx * Math.sin(a) + dy * Math.cos(a),
  ];
}

// Tratto lungo un arco d'ellisse. `da`/`a` in gradi: 0 = destra, 90 = in basso.
// La distanza è misurata lungo il raggio invece che perpendicolarmente:
// per tratti sottili la differenza non si vede e il conto resta semplice.
function arco(x, y, { cx, cy, rx, ry, rot = 0, spessore, da, a }, extra = 0) {
  const [px, py] = ruota(x, y, cx, cy, rot);
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.hypot(dx, dy);
  if (d === 0) return false;

  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  while (ang < da) ang += 360;
  if (ang > a) return false;

  // Punto dell'ellisse nella stessa direzione.
  const ux = dx / d;
  const uy = dy / d;
  const t = 1 / Math.hypot(ux / rx, uy / ry);
  return Math.abs(d - t) <= (spessore + extra) / 2;
}

// Un uovo: ellisse che si assottiglia verso l'alto.
function uovo(x, y, { cx, cy, rx, ry, rot = 0 }) {
  const [px0, py0] = ruota(x, y, cx, cy, rot);
  const px = px0 - cx;
  const py = py0 - cy;
  const stretta = rx * (1 - 0.24 * (-py / ry));
  return (px * px) / (stretta * stretta) + (py * py) / (ry * ry) <= 1;
}

// ——— Il disegno ————————————————————————————————————————————————
// Coordinate 0..1, così la stessa forma vale a ogni dimensione.
// `s` restringe il segno per la zona sicura dell'icona adattiva Android.
function pezzi(s) {
  const cx = 0.5;
  // Il centro del nido sta sopra la metà: il segno pende verso il basso e
  // così l'insieme risulta centrato nel quadrato.
  const cy = 0.5 - 0.065 * s;

  // Il bordo dell'imboccatura, visto un po' dall'alto: è un'ellisse intera,
  // e la sua metà davanti passa SOPRA le uova. È questo che le fa stare
  // dentro il nido invece che galleggiarci sopra.
  const bordo = [
    { rx: 0.240, ry: 0.076, rot: 0, spessore: 0.017, da: 0, a: 360 },
    { rx: 0.252, ry: 0.086, rot: 6, spessore: 0.011, da: 200, a: 340 },
  ];

  // I rametti della conca, sotto il bordo: raggi e inclinazioni diverse
  // così si incrociano invece di essere cerchi concentrici.
  const conca = [
    { rx: 0.240, ry: 0.222, rot: 0, spessore: 0.021, da: 2, a: 178 },
    { rx: 0.206, ry: 0.168, rot: 0, spessore: 0.015, da: 6, a: 174 },
    { rx: 0.166, ry: 0.116, rot: 0, spessore: 0.012, da: 10, a: 170 },
    { rx: 0.234, ry: 0.204, rot: 9, spessore: 0.011, da: 28, a: 152 },
    { rx: 0.234, ry: 0.204, rot: -9, spessore: 0.011, da: 28, a: 152 },
  ];

  const rametti = [...bordo, ...conca].map((r) => ({
    ...r,
    cx,
    cy,
    rx: r.rx * s,
    ry: r.ry * s,
    spessore: r.spessore * s,
  }));

  // Le uova appoggiate dentro, appena sotto il filo del bordo.
  const uova = [
    { cx: cx - 0.062 * s, cy: cy + 0.005 * s, rx: 0.055 * s, ry: 0.079 * s, rot: -10 },
    { cx: cx + 0.062 * s, cy: cy + 0.005 * s, rx: 0.055 * s, ry: 0.079 * s, rot: 10 },
  ];

  return { rametti, uova };
}

// ——— Segno alternativo: la casa col cuore ————————————————————————
// È il glifo `home-heart` dello schermo di login, ridisegnato: piena, con il
// cuore ritagliato. A 48px un contorno sottile sparirebbe; una sagoma piena
// con un buco dentro no.

// Un cuore: due lobi tondi in alto e una punta in basso.
function cuore(x, y, { cx, cy, r }) {
  const px = (x - cx) / r;
  const py = (y - cy) / r;
  const spalla = -0.30; // altezza dove i lobi lasciano il posto ai fianchi
  const punta = 0.98;

  if (Math.hypot(px + 0.47, py + spalla * -1 - 0.02) <= 0.53) return true;
  if (Math.hypot(px - 0.47, py + spalla * -1 - 0.02) <= 0.53) return true;

  if (py < spalla || py > punta) return false;
  // Fianchi convessi: larghi sotto i lobi, poi giù a punta.
  const t = (py - spalla) / (punta - spalla);
  const largo = 1.00 * (1 - t) ** 0.62;
  return Math.abs(px) <= largo;
}

// La casa: tetto a spiovente sopra un corpo squadrato.
function casa(x, y, {
  cx, cy, larg, alt, tetto, sporgenza, gronda,
}) {
  const px = x - cx;
  const py = y - cy;
  const mezza = larg / 2;
  const cima = -alt / 2;
  const base = cima + tetto; // dove il tetto incontra il corpo

  // corpo
  if (px >= -mezza && px <= mezza && py >= base && py <= alt / 2) return true;

  // La gronda ha uno spessore: senza, le falde finiscono a lama di coltello
  // e a 48px la sporgenza svanisce.
  if (py >= base && py <= base + gronda) return Math.abs(px) <= mezza * sporgenza;

  // tetto: triangolo con la falda che sborda ai lati
  if (py < cima || py > base) return false;
  const t = (py - cima) / tetto; // 0 in cima, 1 alla gronda
  return Math.abs(px) <= mezza * sporgenza * t;
}

function pezziCasa(s) {
  const cx = 0.5;
  const cy = 0.5;
  return {
    // Bassa e larga, con la falda che sporge: sta in un quadrato meglio di
    // una casa alta e stretta.
    casa: {
      cx,
      cy,
      larg: 0.42 * s,
      alt: 0.44 * s,
      tetto: 0.19 * s,
      sporgenza: 1.36,
      gronda: 0.026 * s,
    },
  };
}

// Quale segno disegnare: 'casa' (attuale) o 'nido' (il tentativo precedente,
// tenuto perché il progetto non è sotto git e sarebbe perso per sempre).
const SEGNO = process.env.SEGNO || 'casa';

// Colore di un campione: si guardano gli strati dal davanti al fondo.
function campione(x, y, s, { sfondo, tratto }) {
  if (SEGNO === 'casa') {
    if (casa(x, y, pezziCasa(s).casa)) return tratto;
    return sfondo === null ? null : sfumato(y);
  }

  const { rametti, uova } = pezzi(s);
  // 1. i rametti, davanti a tutto
  for (const r of rametti) if (arco(x, y, r)) return tratto;
  // 2. l'alone: stacca le uova dai rametti che ci passano davanti
  for (const r of rametti) if (arco(x, y, r, 0.026 * s)) return sfondo;
  // 3. le uova
  for (const u of uova) if (uovo(x, y, u)) return tratto;
  // 4. il fondo
  return sfondo;
}

// Disegna con 4×4 campioni per pixel: i bordi vengono morbidi.
function disegna(lato, { sfondo, tratto, scala = 1 }) {
  const px = Buffer.alloc(lato * lato * 4);
  const N = 4;
  const pieno = !!sfondo;
  const fondo = sfondo || null;
  for (let y = 0; y < lato; y += 1) {
    for (let x = 0; x < lato; x += 1) {
      let r = 0; let g = 0; let b = 0; let opachi = 0;
      for (let sy = 0; sy < N; sy += 1) {
        for (let sx = 0; sx < N; sx += 1) {
          const fx = (x + (sx + 0.5) / N) / lato;
          const fy = (y + (sy + 0.5) / N) / lato;
          const c = campione(fx, fy, scala, { sfondo: fondo, tratto });
          if (c === null) continue; // fuori dal segno, su trasparente
          r += c[0]; g += c[1]; b += c[2]; opachi += 1;
        }
      }
      const i = (y * lato + x) * 4;
      const tot = N * N;
      if (pieno) {
        px[i] = Math.round(r / tot);
        px[i + 1] = Math.round(g / tot);
        px[i + 2] = Math.round(b / tot);
        px[i + 3] = 255;
      } else if (opachi === 0) {
        px[i + 3] = 0;
      } else {
        px[i] = Math.round(r / opachi);
        px[i + 1] = Math.round(g / opachi);
        px[i + 2] = Math.round(b / opachi);
        px[i + 3] = Math.round((opachi / tot) * 255);
      }
    }
  }
  return px;
}

// Fondo sfumato pieno: serve allo sfondo dell'icona adattiva Android.
function fondo(lato) {
  const px = Buffer.alloc(lato * lato * 4);
  for (let y = 0; y < lato; y += 1) {
    const c = sfumato((y + 0.5) / lato);
    for (let x = 0; x < lato; x += 1) {
      const i = (y * lato + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    }
  }
  return px;
}

// ——— Uscite ————————————————————————————————————————————————————
const out = process.argv[2] || '.';

if (process.argv[3] === 'web') {
  for (const n of [180, 192, 512]) {
    scriviPng(`${out}/icona-${n}.png`, n, disegna(n, { sfondo: VERDE, tratto: CARTA }));
  }
  console.log('icone web fatte');
} else if (process.argv[3] === 'prova') {
  scriviPng(`${out}/prova-1024.png`, 1024, disegna(1024, { sfondo: VERDE, tratto: CARTA }));
  scriviPng(`${out}/prova-128.png`, 128, disegna(128, { sfondo: VERDE, tratto: CARTA }));
  scriviPng(`${out}/prova-48.png`, 48, disegna(48, { sfondo: VERDE, tratto: CARTA }));
  console.log('prove fatte');
} else {
  // Icona piena (iOS, store)
  scriviPng(`${out}/icon.png`, 1024, disegna(1024, { sfondo: VERDE, tratto: CARTA }));
  // Android adattiva: fondo e segno separati, il segno nella zona sicura
  scriviPng(`${out}/android-icon-background.png`, 1024, fondo(1024));
  scriviPng(`${out}/android-icon-foreground.png`, 1024, disegna(1024, { tratto: CARTA, scala: 0.68 }));
  scriviPng(`${out}/android-icon-monochrome.png`, 1024, disegna(1024, { tratto: [255, 255, 255], scala: 0.68 }));
  // Splash e favicon
  scriviPng(`${out}/splash-icon.png`, 1024, disegna(1024, { tratto: VERDE, scala: 0.64 }));
  scriviPng(`${out}/favicon.png`, 96, disegna(96, { sfondo: VERDE, tratto: CARTA }));
  console.log('icone app fatte');
}
