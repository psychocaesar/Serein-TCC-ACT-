// Genere les sources d'icones/splash (assets/) pour @capacitor/assets a partir
// du master vectoriel logo-serein.svg (S neon sur fond vert-noir arrondi).
//
// Produit, en plein cadre (sans coins arrondis : l'OS applique le masque) :
//   assets/icon-only.png        1024  -> iOS + Android legacy
//   assets/icon-foreground.png  1024  -> Android adaptatif (le S, transparent)
//   assets/icon-background.png  1024  -> Android adaptatif (fond degrade)
//   assets/splash.png           2732  -> splash clair/sombre (S centre sur fond)
//   assets/splash-dark.png      2732
//
// Usage : node tools/icons/make-sources.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const assets = join(root, 'assets');
const svg = readFileSync(join(here, 'logo-serein.svg'), 'utf8');

// Variantes par retrait d'elements
const squared = svg.replace('rx="108"', 'rx="0"');                 // fond carre plein
const bgOnly = squared.replace(/\s*<path[\s\S]*?\/>/g, '')         // fond + halo, sans S
                      .replace(/\s*<circle[^>]*\/>/g, '');
const fgOnly = svg.replace(/\s*<rect[^>]*\/>/, '')                 // S seul, fond transparent
                  .replace(/\s*<ellipse[^>]*\/>/, '');

const render = (svgStr, size) =>
  sharp(Buffer.from(svgStr), { density: 384 }).resize(size, size).png();

// Icones plein cadre
await render(squared, 1024).toFile(join(assets, 'icon-only.png'));
await render(bgOnly, 1024).toFile(join(assets, 'icon-background.png'));

// S seul rogne au plus juste (sert d'avant-plan adaptatif + splash)
const fgRaw = await render(fgOnly, 1200).toBuffer();
const sTrim = await sharp(fgRaw).trim().toBuffer();
const transparent = (size) => ({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

// Avant-plan adaptatif : le S occupe ~58% du cadre, centre dans la zone de securite
const fgInner = await sharp(sTrim).resize({ width: 600, height: 600, fit: 'inside' }).toBuffer();
await sharp(transparent(1024)).composite([{ input: fgInner, gravity: 'center' }]).png().toFile(join(assets, 'icon-foreground.png'));

// Splash : fond degrade plein 2732 + S centre (~28%)
const splashBg = await render(bgOnly, 2732).toBuffer();
const splashS = await sharp(sTrim).resize({ width: 760, height: 760, fit: 'inside' }).toBuffer();
const splash = await sharp(splashBg).composite([{ input: splashS, gravity: 'center' }]).png().toBuffer();
await sharp(splash).toFile(join(assets, 'splash.png'));
await sharp(splash).toFile(join(assets, 'splash-dark.png'));

console.log('Sources generees dans assets/ (icon-only, icon-foreground, icon-background, splash, splash-dark).');
