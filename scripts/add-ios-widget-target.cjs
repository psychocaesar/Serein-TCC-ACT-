#!/usr/bin/env node
'use strict';
/**
 * Injecte la target d'extension "CopingWidget" (WidgetKit) dans le projet Xcode,
 * sans avoir besoin d'ouvrir Xcode : manipule project.pbxproj via la lib `xcode`
 * (déjà vendue en dépendance transitive de Capacitor, même format que celui
 * qu'utilise Xcode en interne).
 *
 * Idempotent : si la target existe déjà, ne fait rien (juste une copie du fichier
 * si SRC != DEST).
 *
 * Usage : node scripts/add-ios-widget-target.cjs <pbxproj source> <pbxproj destination>
 * (SRC et DEST peuvent être identiques pour appliquer directement, ou différents
 * pour valider le résultat dans un fichier séparé avant d'écraser l'original.)
 */
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const SRC = process.argv[2];
const DEST = process.argv[3];
if (!SRC || !DEST) {
  console.error('Usage: node add-ios-widget-target.cjs <input-pbxproj> <output-pbxproj>');
  process.exit(1);
}

const TARGET_NAME = 'CopingWidget';
const BUNDLE_ID = 'fr.sereinapp.tccact.CopingWidget';

// project.addTarget() écrit son propre `name` avec des guillemets littéraux
// (ex. name = "CopingWidget";) et dérive les commentaires depuis cette valeur
// telle quelle (ex. /* "CopingWidget" */) — donc pbxTargetByName('CopingWidget'),
// qui compare au commentaire brut, ne retrouve pas une target déjà créée par ce
// script. Sans ce correctif, relancer le script une 2e fois créerait une target
// en double au lieu de la détecter. On compare donc en retirant les guillemets
// éventuels avant comparaison (fonctionnellement neutre pour Xcode : ces
// guillemets ne sont que des délimiteurs de string dans le format pbxproj).
function stripQuotes(s) {
  return typeof s === 'string' ? s.replace(/^"(.*)"$/, '$1') : s;
}
function findTargetByName(proj, name) {
  const section = proj.pbxNativeTargetSection();
  for (const key in section) {
    if (/_comment$/.test(key)) continue;
    const t = section[key];
    if (t && stripQuotes(t.name) === name) return t;
  }
  return null;
}

const project = xcode.project(SRC);
project.parseSync();

if (findTargetByName(project, TARGET_NAME)) {
  console.log(`Target "${TARGET_NAME}" déjà présente — rien à faire.`);
  fs.copyFileSync(SRC, DEST);
  process.exit(0);
}

// Lit les réglages de version courants de la target App pour les répliquer
// (agvtool -all, déjà en place dans codemagic.yaml, les réalignera de toute façon
// à chaque build de release — mais on démarre sur une valeur cohérente).
const appTarget = project.pbxTargetByName('App');
if (!appTarget) throw new Error('Target "App" introuvable dans le projet.');
const appConfigList = project.pbxXCConfigurationList()[appTarget.buildConfigurationList];
const buildConfigSection = project.pbxXCBuildConfigurationSection(); // section globale, indexée par UUID (tous targets confondus)
const appDebugConfig = buildConfigSection[appConfigList.buildConfigurations[0].value];
const currentProjectVersion = appDebugConfig.buildSettings.CURRENT_PROJECT_VERSION || '1';

// Le projet n'a jusqu'ici qu'une seule target ("App"), donc les sections
// PBXContainerItemProxy/PBXTargetDependency n'existent pas encore.
// addTarget() (via addTargetDependency) ne les crée PAS si elles sont absentes
// — il no-op silencieusement (`if (pbxContainerItemProxySection && ...)`) et la
// dépendance de target ne serait jamais ajoutée. On les pré-crée donc ici.
const objects = project.hash.project.objects;
if (!objects.PBXContainerItemProxy) objects.PBXContainerItemProxy = {};
if (!objects.PBXTargetDependency) objects.PBXTargetDependency = {};

// 1) Crée la target d'extension : gère automatiquement le type de produit
//    (com.apple.product-type.app-extension / wrapper.app-extension), la phase
//    "Copy Files" d'embed sur la target App (dstSubfolderSpec 13 = PlugIns),
//    et la dépendance de target App -> CopingWidget.
const target = project.addTarget(TARGET_NAME, 'app_extension', TARGET_NAME, BUNDLE_ID);

// 2) Phase Sources : crée la phase ET y ajoute le fichier Swift en un seul appel.
project.addBuildPhase([`${TARGET_NAME}/${TARGET_NAME}.swift`], 'PBXSourcesBuildPhase', 'Sources', target.uuid);

// 3) Phase Frameworks : WidgetKit + SwiftUI (frameworks système, auto-linkés par
//    le compilateur Swift en pratique, mais explicités ici pour matcher ce que
//    génère Xcode et éviter toute ambiguïté de link).
project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
project.addFramework('WidgetKit.framework', { target: target.uuid });
project.addFramework('SwiftUI.framework', { target: target.uuid });

// 4) Réglages de build additionnels sur les 2 configs (Debug/Release) de la target
//    widget. Les guillemets suivent exactement la convention déjà utilisée dans
//    ce fichier pour ces mêmes clés (ex. TARGETED_DEVICE_FAMILY = "1,2").
const widgetConfigList = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
for (const ref of widgetConfigList.buildConfigurations) {
  const config = buildConfigSection[ref.value];
  Object.assign(config.buildSettings, {
    IPHONEOS_DEPLOYMENT_TARGET: '15.0',
    MARKETING_VERSION: '1.0',
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    VERSIONING_SYSTEM: '"apple-generic"',
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: '"1,2"',
    CODE_SIGN_STYLE: 'Automatic',
    CODE_SIGN_ENTITLEMENTS: `${TARGET_NAME}/${TARGET_NAME}.entitlements`,
    INFOPLIST_FILE: `${TARGET_NAME}/Info.plist`,
  });
}

// 5) Target App : ajoute l'entitlement App Group (elle n'en avait aucun jusqu'ici).
for (const ref of appConfigList.buildConfigurations) {
  const config = buildConfigSection[ref.value];
  config.buildSettings.CODE_SIGN_ENTITLEMENTS = 'App/App.entitlements';
}

// omitEmptyValues : la lib laisse parfois des `fileEncoding`/`lastKnownFileType`
// à `undefined` sur les références de PRODUIT (ex. CopingWidget.appex) qui,
// sans cette option, seraient sérialisées littéralement en "fileEncoding =
// undefined;" (Xcode omet simplement ces clés quand elles ne s'appliquent pas).
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, project.writeSync({ omitEmptyValues: true }));
console.log(`Target "${TARGET_NAME}" ajoutée -> ${DEST}`);
