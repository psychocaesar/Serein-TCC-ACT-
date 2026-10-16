const sharp = require('/Users/brochecesar/Serein-TCC-ACT-/node_modules/sharp'); const fs = require('fs');
(async () => {
  fs.mkdirSync('icones', { recursive: true });
  const r = (src, size, out) => sharp(fs.readFileSync(src), { density: Math.max(72, size * 72 / 256 * 2) }).resize(size, size).png().toFile('icones/' + out);
  await r('icone-app.svg', 1024, 'icone-app-1024.png');           // iOS / App Store / Play (carré, le système arrondit)
  await r('icone-app.svg', 512, 'icone-play-512.png');
  await r('icone-app.svg', 180, 'apple-touch-icon.png');
  await r('icone-app.svg', 192, 'icon-192.png');
  await r('icone-app.svg', 512, 'icon-512.png');
  await r('icone-app.svg', 512, 'maskable-512.png');               // la marque tient dans la zone sûre (cercle de 80 %)
  for (const s of [16, 32, 48]) await r('favicon.svg', s, `favicon-${s}.png`);
  fs.copyFileSync('favicon.svg', 'icones/favicon.svg');
  // favicon.ico : conteneur ICO avec les 3 PNG
  const pngs = [16, 32, 48].map(s => fs.readFileSync(`icones/favicon-${s}.png`));
  const head = Buffer.alloc(6 + 16 * pngs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach((b, i) => { const s = [16, 32, 48][i], o = 6 + 16 * i;
    head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length; });
  fs.writeFileSync('icones/favicon.ico', Buffer.concat([head, ...pngs]));
})();
