// Garde-fou : la version marketing doit rester cohérente entre package.json,
// Android (versionName) et iOS (MARKETING_VERSION, toutes configs).
// Le build number iOS (CURRENT_PROJECT_VERSION) se monte à la main, comme pour Serein méditation
// (commit « chore(ios): build N ») ; le test du bas vérifie qu'il est identique partout et relié aux Info.plist.
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

// Même règle que sur Serein méditation. Le numéro de build part de CURRENT_PROJECT_VERSION (pbxproj) et
// doit rester le même pour l'app et le widget, sinon Apple refuse l'envoi. `agvtool` remplace
// $(CURRENT_PROJECT_VERSION) par la valeur en dur dans Info.plist : le numéro se figerait en silence.
test('iOS : build number identique partout (app + widget) et relié aux Info.plist', () => {
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  const builds = [...pbx.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/g)].map((m) => m[1]);
  assert.ok(builds.length >= 2, 'CURRENT_PROJECT_VERSION introuvable dans project.pbxproj');
  assert.strictEqual(new Set(builds).size, 1, `build numbers différents dans le pbxproj : ${[...new Set(builds)].join(', ')}`);
  for (const plist of ['ios/App/App/Info.plist', 'ios/App/CopingWidget/Info.plist']) {
    assert.match(
      read(plist),
      /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/,
      `${plist} : CFBundleVersion doit rester $(CURRENT_PROJECT_VERSION)`
    );
  }
});
