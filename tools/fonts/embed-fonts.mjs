// Embarque les polices (Bricolage Grotesque + Hanken Grotesk, variables,
// sous-ensembles latin + latin-ext) en base64 dans le HTML, pour un offline
// complet sans dependance reseau a Google Fonts.
//
// Usage : node tools/fonts/embed-fonts.mjs <chemin-vers-serein-tcc-act.html>
// Idempotent : ne fait rien si les polices sont deja embarquees.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2];
if (!htmlPath) { console.error('Chemin du HTML manquant.'); process.exit(1); }

let html = readFileSync(htmlPath, 'utf8');
if (html.includes('id="embedded-fonts"')) { console.log('Polices deja embarquees - rien a faire.'); process.exit(0); }

const b64 = (f) => readFileSync(join(dir, f)).toString('base64');
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

const face = (family, weights, range, file) =>
  `@font-face{font-family:'${family}';font-style:normal;font-weight:${weights};font-display:swap;src:url(data:font/woff2;base64,${b64(file)}) format('woff2');unicode-range:${range};}`;

const css = [
  face('Bricolage Grotesque', '200 800', LATIN, 'bricolage-latin.woff2'),
  face('Bricolage Grotesque', '200 800', LATIN_EXT, 'bricolage-latinext.woff2'),
  face('Hanken Grotesk', '100 900', LATIN, 'hanken-latin.woff2'),
  face('Hanken Grotesk', '100 900', LATIN_EXT, 'hanken-latinext.woff2'),
].join('\n');

const style = `<style id="embedded-fonts">\n${css}\n</style>`;

const re = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/;
if (!re.test(html)) { console.error('Bloc Google Fonts introuvable dans le HTML.'); process.exit(1); }

html = html.replace(re, style);
writeFileSync(htmlPath, html);
console.log('Polices embarquees dans', htmlPath);
