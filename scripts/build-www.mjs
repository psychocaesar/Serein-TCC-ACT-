// Génère www/ (webDir Capacitor) à partir de la source single-file.
// Copie la source, la politique de confidentialité, le manifeste, les icônes et les sons.
import { mkdirSync, copyFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

mkdirSync(www, { recursive: true });
copyFileSync(join(root, 'serein-tcc-act.html'), join(www, 'index.html'));
copyFileSync(join(root, 'privacy.html'), join(www, 'privacy.html'));
copyFileSync(join(root, 'manifest.webmanifest'), join(www, 'manifest.webmanifest'));
copyFileSync(join(root, 'icon.png'), join(www, 'apple-touch-icon.png'));
cpSync(join(root, 'icons'), join(www, 'icons'), { recursive: true });
copyFileSync(join(root, 'assets', 'cloche.mp3'), join(www, 'cloche.mp3'));
copyFileSync(join(root, 'assets', 'clochegrave.mp3'), join(www, 'clochegrave.mp3'));

console.log('www/ généré : index.html + privacy.html + manifest + icons + cloches');
