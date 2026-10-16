// Teste la logique clinique telle qu'elle tourne réellement dans le fichier source :
// on charge le <script> de serein-tcc-act.html dans un sandbox vm (DOM stub, cf.
// pattern de l'app sœur), coupé juste avant boot() pour éviter tout effet de bord
// (Store.hydrate, plugins Capacitor...) puisque seules les déclarations pures nous
// intéressent ici. Couvre la « pratique du jour » (pickDailyPractice), le point où une
// régression silencieuse enverrait quelqu'un vers le mauvais exercice en pleine détresse,
// plus l'échelle d'humeur, les niveaux de la mosaïque et la boussole des valeurs.
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
  moodLabel: moodLabel,
  moodColor: moodColor,
  moodFromLegacyIntensity: moodFromLegacyIntensity,
  pickDailyPractice: pickDailyPractice,
  EXERCISES: EXERCISES,
  PRACTICE_KINDS: PRACTICE_KINDS,
  levelFor: levelFor,
  nextLevelGap: nextLevelGap,
  defiOptions: defiOptions,
  quizData: quizData,
  schemaLabels: schemaLabels,
  rerateVerdict: rerateVerdict,
  moodInsight: moodInsight,
  screenMap: screenMap,
  navMap: navMap,
  VALUES_DOMAINS: VALUES_DOMAINS,
  VALUES_FEEDBACK: VALUES_FEEDBACK,
  getValuesProfile: getValuesProfile,
  valuesFeedbackFor: valuesFeedbackFor,
  pickFocusDomain: pickFocusDomain,
};`;

vm.createContext(sandbox);
vm.runInContext(src + '\n' + SHIM, sandbox, { filename: 'serein-tcc-act.html' });

const C = sandbox.__clinical;

// ── Humeur du jour (0-10, haut = bien) ──

test('moodLabel couvre 0-10 et ne déduit jamais une émotion (que des niveaux)', () => {
  const allowed = ['Très difficile', 'Difficile', 'Plutôt bas', 'Mitigé', 'Plutôt bien', 'Bien'];
  for (let v = 0; v <= 10; v++) assert.ok(allowed.includes(C.moodLabel(v)), `${v} -> "${C.moodLabel(v)}"`);
  assert.strictEqual(C.moodLabel(5), 'Mitigé');
  for (let v = 0; v <= 10; v++) assert.match(C.moodColor(v), /^#[0-9a-f]{6}$/i);
});

test('migration de l\'ancien suivi : intensité (haut = mal) → humeur (haut = bien)', () => {
  assert.strictEqual(C.moodFromLegacyIntensity(2), 10);  // curseur à fond « bien »
  assert.strictEqual(C.moodFromLegacyIntensity(10), 0);  // curseur à fond « difficile »
  assert.strictEqual(C.moodFromLegacyIntensity(6), 5);   // centre
  assert.strictEqual(C.moodFromLegacyIntensity(0), 10);  // intensité d'émotion nulle (ancien check-in) : bornée
});

// ── Ta pratique du jour ──

const P = args => C.pickDailyPractice(args);

test('pratique du jour : une tâche du psy en cours passe avant tout', () => {
  const r = P({ mood: 2, tags: ['Stress'], tasks: [{ kind: 'journal', count: 1, target: 3 }] });
  assert.strictEqual(r.source, 'psy');
  assert.strictEqual(r.screen, 'journal');
  assert.match(r.meta, /1\/3/);
});

test('pratique du jour : la tâche à l\'échéance la plus proche d\'abord, les tâches finies ignorées', () => {
  const r = P({ tasks: [
    { kind: 'journal', count: 3, target: 3, due: '2020-01-01' },
    { kind: 'petitpas', count: 0, target: 1 },
    { kind: 'exposition', count: 0, target: 1, due: '2030-05-02' },
  ] });
  assert.strictEqual(r.screen, 'ladder');
});

test('pratique du jour : une tâche « Autre » renvoie vers la liste des tâches', () => {
  assert.strictEqual(P({ tasks: [{ kind: 'autre', detail: 'Appeler ma sœur', count: 0, target: 1 }] }).screen, 'taches');
});

test('pratique du jour : expérience prévue, puis humeur', () => {
  assert.strictEqual(P({ mood: 5, dueExperiment: { belief: 'x' } }).screen, 'experiments');
});

test('pratique du jour : détresse forte → d\'abord apaiser le corps (jamais le journal)', () => {
  for (let m = 0; m <= 3; m++) {
    for (const tags of [[], ['Stress'], ['Rumination'], ['Colère'], ['Stress', 'Tristesse']]) {
      const r = P({ mood: m, tags });
      assert.ok(['respirer', 'petitpas'].includes(r.kind), `humeur ${m} ${tags} -> ${r.kind}`);
    }
  }
  assert.strictEqual(P({ mood: 1, tags: ['Tristesse'] }).kind, 'petitpas');
  assert.strictEqual(P({ mood: 1, tags: ['Tristesse', 'Stress'] }).kind, 'respirer');
});

test('pratique du jour : routage par ce qui domine (humeur moyenne)', () => {
  assert.strictEqual(P({ mood: 5, tags: ['Rumination'] }).kind, 'valeurs');
  assert.strictEqual(P({ mood: 5, tags: ['Stress'] }).kind, 'respirer');
  assert.strictEqual(P({ mood: 5, tags: ['Fatigue'] }).kind, 'petitpas');
  assert.strictEqual(P({ mood: 5, tags: [] }).kind, 'journal');
});

test('pratique du jour : humeur haute → « Ce qui va bien », sans humeur → respirer', () => {
  const r = P({ mood: 9 });
  assert.strictEqual(r.screen, 'diary');
  assert.ok(r.positive);
  assert.strictEqual(P({}).kind, 'respirer');
});

test('pratique du jour : chaque proposition pointe vers un écran réel', () => {
  for (let m = 0; m <= 10; m++) {
    for (const tags of [[], ['Stress'], ['Tristesse'], ['Rumination'], ['Fatigue'], ['Colère']]) {
      const r = P({ mood: m, tags });
      assert.ok(C.screenMap[r.screen], `écran "${r.screen}" inconnu`);
      assert.ok(r.title && r.meta, 'titre / meta manquant');
    }
  }
});

// ── Exercices, mosaïque, niveaux ──

test('EXERCISES : 6 outils, clés uniques, écrans réels rattachés à l\'onglet Exercices', () => {
  assert.strictEqual(C.EXERCISES.length, 6);
  const kinds = new Set(C.PRACTICE_KINDS.map(e => e.kind));
  assert.strictEqual(kinds.size, C.PRACTICE_KINDS.length);
  for (const ex of C.EXERCISES) {
    assert.ok(C.screenMap[ex.screen], `${ex.kind} : écran ${ex.screen} inconnu`);
    assert.strictEqual(C.navMap[ex.screen], 'nav-exercices', `${ex.screen} doit dépendre de l'onglet Exercices`);
    assert.match(ex.color, /^#[0-9a-f]{6}$/i);
  }
});

test('niveaux : découverte dès 1, pratique à 5, autonomie à 15 ; écart au niveau suivant', () => {
  assert.strictEqual(C.levelFor(0).bars, 0);
  assert.strictEqual(C.levelFor(1).label, 'Découverte');
  assert.strictEqual(C.levelFor(4).label, 'Découverte');
  assert.strictEqual(C.levelFor(5).label, 'Pratique');
  assert.strictEqual(C.levelFor(15).label, 'Autonomie');
  assert.strictEqual(C.levelFor(400).label, 'Autonomie');
  assert.deepStrictEqual({ ...C.nextLevelGap(10) }, { label: 'Autonomie', left: 5 });
  assert.strictEqual(C.nextLevelGap(15), null);
});

test('défi du jour : 3 réponses distinctes dont la bonne, pour chaque pensée', () => {
  C.quizData.forEach((q, i) => {
    const opts = C.defiOptions(q, i);
    assert.strictEqual(opts.length, 3);
    assert.strictEqual(new Set(opts).size, 3, `doublon pour la question ${i}`);
    assert.ok(opts.includes(q.schema), `bonne réponse absente (question ${i})`);
    opts.forEach(k => assert.ok(C.schemaLabels[k]));
  });
});

test('re-cotation du journal : message non culpabilisant même si l\'émotion monte', () => {
  assert.match(C.rerateVerdict(8, 4), /baissé de 4/);
  assert.match(C.rerateVerdict(5, 5), /information utile/);
  assert.doesNotMatch(C.rerateVerdict(3, 6), /échec|raté|mauvais/i);
});

test('synthèse du suivi : pas de tendance avant 3 jours notés', () => {
  assert.match(C.moodInsight([5, 6], []), /quelques jours/);
  assert.match(C.moodInsight([5, 6, 7], []), /Moyenne 6,0\/10/);
  assert.match(C.moodInsight([7, 7, 7], [4, 4, 4]), /plus haut/);
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
