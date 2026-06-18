// Génère www/ (webDir Capacitor) à partir de la source single-file.
// Copie serein-tcc-act.html -> www/index.html et les sons -> www/.
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

mkdirSync(www, { recursive: true });
copyFileSync(join(root, 'serein-tcc-act.html'), join(www, 'index.html'));
copyFileSync(join(root, 'assets', 'cloche.mp3'), join(www, 'cloche.mp3'));
copyFileSync(join(root, 'assets', 'clochegrave.mp3'), join(www, 'clochegrave.mp3'));

console.log('www/ généré : index.html + cloche.mp3 + clochegrave.mp3');
