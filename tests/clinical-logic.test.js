// Teste la logique clinique telle qu'elle tourne réellement dans le fichier source :
// on charge le <script> de serein-tcc-act.html dans un sandbox vm (DOM stub, cf.
// pattern de l'app sœur), coupé juste avant boot() pour éviter tout effet de bord
// (Store.hydrate, plugins Capacitor...) puisque seules les déclarations pures nous
// intéressent ici. Couvre le mapping humeur→état (getMoodFromValence) et le routage
// des suggestions par émotion (emotionSuggestions), les deux points où une régression
// silencieuse enverrait quelqu'un vers le mauvais exercice en pleine détresse.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'serein-tcc-act.html'), 'utf8');

const scriptStart = html.indexOf('<script>') + '<script>'.length;
const CUT_MARKER = "initTheme(); // peinture immédiate du thème depuis le miroir localStorage";
const cutAt = html.indexOf(CUT_MARKER, scriptStart);
assert.ok(cutAt > scriptStart, 'marqueur de coupure introuvable (boot() a peut-être bougé) - à mettre à jour si le fichier source a changé autour de boot()');
const src = html.slice(scriptStart, cutAt);

// ── Stub universel (même pattern que l'app sœur) : un Proxy callable/indexable
//    absorbe tout appel DOM sans rien casser, sans jamais exécuter de vrai rendu.
const noop = () => {};
const stub = new Proxy(function () {}, {
  get: (_t, p) => {
    if (p === Symbol.toPrimitive || p === 'valueOf' || p === 'toString') return () => '';
    if (p === Symbol.iterator) return function* () {};
    if (p === 'then') return undefined; // sinon `await stub` le traite comme un thenable qui ne résout jamais
    if (p === 'length') return 0;
    return stub;
  },
  apply: () => stub,
  construct: () => stub,
  set: () => true,
  has: () => true,
});

const storage = new Map();
const localStorageStub = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k),
  clear: () => storage.clear(),
};

const sandbox = {
  console,
  document: stub,
  navigator: stub,
  location: stub,
  history: stub,
  localStorage: localStorageStub,
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  setTimeout: () => 0,
  clearTimeout: noop,
  setInterval: () => 0,
  clearInterval: noop,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: noop,
  fetch: () => Promise.resolve(stub),
  alert: noop,
  confirm: () => true,
  Audio: stub,
  MediaMetadata: stub,
  AudioContext: stub,
  webkitAudioContext: stub,
  IntersectionObserver: stub,
  URL: stub,
  Blob: stub,
  FileReader: stub,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

const SHIM = `
;globalThis.__clinical = {
  getMoodFromValence: getMoodFromValence,
  MOOD_STATES: MOOD_STATES,
  emotionSuggestions: emotionSuggestions,
  POSITIVE_MOODS: POSITIVE_MOODS,
  screenMap: screenMap,
  VALUES_DOMAINS: VALUES_DOMAINS,
  VALUES_FEEDBACK: VALUES_FEEDBACK,
  getValuesProfile: getValuesProfile,
  valuesFeedbackFor: valuesFeedbackFor,
  pickFocusDomain: pickFocusDomain,
};`;

vm.createContext(sandbox);
vm.runInContext(src + '\n' + SHIM, sandbox, { filename: 'serein-tcc-act.html' });

const C = sandbox.__clinical;

test('getMoodFromValence couvre tout 0-100 avec un état connu', () => {
  for (let v = 0; v <= 100; v++) {
    const key = C.getMoodFromValence(v);
    assert.ok(C.MOOD_STATES[key], `valence ${v} -> état inconnu "${key}"`);
  }
});

test('getMoodFromValence : bornes exactes documentées', () => {
  const cases = [
    [0, 'panique'], [14, 'panique'],
    [15, 'stress'], [28, 'stress'],
    [29, 'triste'], [42, 'triste'],
    [43, 'rumination'], [49, 'rumination'],
    [50, 'bien'], [63, 'bien'],
    [64, 'serein'], [82, 'serein'],
    [83, 'forme'], [100, 'forme'],
  ];
  for (const [v, expected] of cases) {
    assert.strictEqual(C.getMoodFromValence(v), expected, `valence ${v} devrait donner "${expected}"`);
  }
});

test('getMoodFromValence est monotone par palier (pas de zone qui repasse en arrière)', () => {
  const order = ['panique', 'stress', 'triste', 'rumination', 'bien', 'serein', 'forme'];
  let lastRank = -1;
  for (let v = 0; v <= 100; v++) {
    const rank = order.indexOf(C.getMoodFromValence(v));
    assert.ok(rank >= lastRank, `valence ${v} régresse de l'état rang ${lastRank} à ${rank}`);
    lastRank = rank;
  }
});

test('le centre 50/50 tombe sur "bien" (neutre, pas de détresse présumée)', () => {
  assert.strictEqual(C.getMoodFromValence(50), 'bien');
});

test('chaque MOOD_STATES a les champs requis pour l\'affichage', () => {
  for (const [key, s] of Object.entries(C.MOOD_STATES)) {
    assert.ok(s.emoji, `${key} : emoji manquant`);
    assert.ok(s.label, `${key} : label manquant`);
    assert.ok(s.desc, `${key} : desc manquant`);
    assert.match(s.bg, /^#[0-9a-fA-F]{6}$/, `${key} : bg invalide (${s.bg})`);
    assert.match(s.light, /^#[0-9a-fA-F]{6}$/, `${key} : light invalide (${s.light})`);
  }
});

test('POSITIVE_MOODS ne recoupe jamais emotionSuggestions (routage détresse vs positif exclusifs)', () => {
  for (const mood of C.POSITIVE_MOODS) {
    assert.ok(!(mood in C.emotionSuggestions), `"${mood}" est à la fois positif et dans emotionSuggestions`);
  }
});

test('chaque émotion négative/neutre a une suggestion complète et pointe vers un écran réel', () => {
  const negativeStates = Object.keys(C.MOOD_STATES).filter(k => !C.POSITIVE_MOODS.includes(k));
  for (const key of negativeStates) {
    const sugg = C.emotionSuggestions[key];
    assert.ok(sugg, `emotionSuggestions["${key}"] manquant`);
    assert.ok(sugg.title && sugg.text, `suggestion incomplète pour "${key}"`);
    assert.ok(Array.isArray(sugg.tags) && sugg.tags.length, `tags manquants pour "${key}"`);
    assert.ok(sugg.ctaScreen, `ctaScreen manquant pour "${key}"`);
    assert.ok(C.screenMap[sugg.ctaScreen], `ctaScreen "${sugg.ctaScreen}" (${key}) n'existe pas dans screenMap`);
  }
});

// ── Boussole des valeurs (ACT) ──

test('VALUES_DOMAINS : 8 domaines complets, clés uniques, liens d\'écran valides', () => {
  assert.strictEqual(C.VALUES_DOMAINS.length, 8);
  const keys = new Set();
  for (const d of C.VALUES_DOMAINS) {
    assert.ok(d.key && !keys.has(d.key), `clé dupliquée ou manquante : "${d.key}"`);
    keys.add(d.key);
    assert.ok(d.emoji && d.label && d.desc, `domaine "${d.key}" incomplet`);
    assert.strictEqual(d.values.length, 3, `"${d.key}" : 3 valeurs-exemples attendues`);
    assert.strictEqual(d.actions.length, 4, `"${d.key}" : 4 micro-actions attendues`);
    for (const a of d.actions) {
      assert.ok(a.text && a.text.length > 10, `micro-action vide ou trop courte (${d.key})`);
      if (a.screen) assert.ok(C.screenMap[a.screen], `screen "${a.screen}" (${d.key}) n'existe pas dans screenMap`);
    }
  }
});

test('getValuesProfile : seuils documentés (faible ≤4, écart ≥3, sinon aligné)', () => {
  const cases = [
    [4, 0, 'faible'], [4, 10, 'faible'], [0, 0, 'faible'],
    [5, 2, 'ecart'], [10, 7, 'ecart'], [10, 0, 'ecart'],
    [5, 3, 'aligne'], [10, 8, 'aligne'], [5, 10, 'aligne'],
  ];
  for (const [imp, align, expected] of cases) {
    assert.strictEqual(C.getValuesProfile(imp, align), expected, `(imp:${imp}, align:${align}) devrait donner "${expected}"`);
  }
});

test('feedback spiritualité faible : variante dédiée, non culpabilisante, réservée à ce domaine', () => {
  assert.strictEqual(C.valuesFeedbackFor('spirituel', 3, 5), C.VALUES_FEEDBACK.faibleSpirituel);
  assert.strictEqual(C.valuesFeedbackFor('travail', 3, 5), C.VALUES_FEEDBACK.faible);
  assert.strictEqual(C.valuesFeedbackFor('spirituel', 8, 2), C.VALUES_FEEDBACK.ecart); // la variante ne s'applique qu'au profil faible
});

test('pickFocusDomain : plus grand écart parmi les importants, sinon le plus important', () => {
  // Deux écarts : le plus grand gagne
  const r1 = C.pickFocusDomain([
    { key: 'travail', imp: 8, align: 4 },  // écart 4
    { key: 'famille', imp: 9, align: 2 },  // écart 7 → cap
    { key: 'sante', imp: 3, align: 1 },    // faible, ignoré
  ]);
  assert.strictEqual(r1.rating.key, 'famille');
  assert.strictEqual(r1.mode, 'ecart');
  // Tout aligné ou peu investi : on nourrit le plus important
  const r2 = C.pickFocusDomain([
    { key: 'amis', imp: 7, align: 6 },
    { key: 'loisirs', imp: 9, align: 8 },  // le plus important → cap
    { key: 'spirituel', imp: 2, align: 2 },
  ]);
  assert.strictEqual(r2.rating.key, 'loisirs');
  assert.strictEqual(r2.mode, 'entretien');
});
