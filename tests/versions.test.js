// Garde-fou : la version marketing doit rester cohérente entre package.json,
// Android (versionName) et iOS (MARKETING_VERSION, toutes configs).
// Le build number iOS (CURRENT_PROJECT_VERSION) est volontairement ignoré :
// il est auto-incrémenté par Codemagic depuis TestFlight.
// À chaque montée de version (1.0 → 1.1), mettre à jour MARKETING ci-dessous + les 3 sources.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const MARKETING = '1.0';

test('package.json : la version commence par la version marketing', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.version === MARKETING || pkg.version.startsWith(MARKETING + '.'),
    `package.json version ${pkg.version} devrait correspondre à ${MARKETING}`
  );
});

test('Android : versionName == version marketing', () => {
  const m = read('android/app/build.gradle').match(/versionName\s+"([^"]+)"/);
  assert.ok(m, 'versionName introuvable dans android/app/build.gradle');
  assert.strictEqual(m[1], MARKETING);
});

test('iOS : MARKETING_VERSION == version marketing (toutes configs)', () => {
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  const versions = [...pbx.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(versions.length > 0, 'MARKETING_VERSION introuvable dans project.pbxproj');
  for (const v of versions) assert.strictEqual(v, MARKETING);
});
