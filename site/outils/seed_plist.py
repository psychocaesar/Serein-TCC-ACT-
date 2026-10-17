# Écrit des données d'exemple dans les Preferences natives (UserDefaults) de l'app, pour les captures
# des stores. Au premier lancement, Store.hydrate() les recopie dans le localStorage (WebView vide).
import json, plistlib, sys, datetime, time
out = sys.argv[1]
today = datetime.date.today()
d = lambda n: (today - datetime.timedelta(days=n)).isoformat()
now_ms = int(time.time() * 1000)
moods = [4,None,5,5,6,None,5,6,6,None,5,7,6,None,6,7,7,None,6,7,None,7,7,6,None,7,8,7,7]
mood_log = [{"date": d(29 - i), "mood": m, "tags": []} for i, m in enumerate(moods) if m is not None]  # rien aujourd'hui : l'accueil montre le curseur
kinds = ['respirer','journal','respirer','petitpas','defi','journal','experiences','respirer','defi','valeurs','journal','respirer','exposition','defi','journal','petitpas','respirer','experiences','defi','journal','respirer','valeurs','exposition','defi','journal','respirer','petitpas','experiences','journal','defi','respirer','journal','exposition','respirer','defi','journal','valeurs','respirer','journal']
practice = [{"d": d(40 - i), "k": k, "ts": now_ms - (40 - i) * 86400000} for i, k in enumerate(kinds)]
data = {
  "serein_onboarding_done": "1", "serein_disclaimer_seen": "1", "serein_swipe_hint_seen": "1",
  "serein_widget_tip_dismissed": "1",
  "serein_mood_log": mood_log,
  "serein_practice": practice,
  "serein_tasks": [
    {"id": 1, "kind": "journal", "detail": "Une situation au travail", "target": 3, "count": 2, "due": None, "createdAt": d(3)},
    {"id": 2, "kind": "exposition", "detail": "Palier 2 : deux stations de métro", "target": 1, "count": 0, "due": d(-4), "createdAt": d(3)},
    {"id": 3, "kind": "respirer", "detail": "5 min de cohérence le soir", "target": 1, "count": 1, "due": None, "createdAt": d(3)},
  ],
  "serein_next_session": d(-6),
  "serein_relapse_plan": {"learned": "Mes pensées ne sont pas des faits.\nL’évitement soulage, puis entretient la peur.",
    "signals": "Je m’isole\nJe dors mal\nJ’évite les appels", "risks": "Les bouclages au travail → je garde ma marche du midi",
    "helps": ["respirer", "journal", "petitpas"], "helpsOther": "Marcher vingt minutes", "p1name": "Léa", "p1tel": "0600000000",
    "recontact": "Si plusieurs signaux durent plus de deux semaines", "updatedAt": d(20)},
  "serein_cards": [{"trigger": "Je vais tout rater", "thought": "J’ai déjà traversé des moments comme celui-ci."},
    {"trigger": "Il m’en veut", "thought": "Je ne sais pas ce qu’il pense."},
    {"trigger": "Réunion", "thought": "Je peux avoir peur et parler quand même."},
    {"trigger": "Fatigue", "thought": "Un petit pas suffit pour aujourd’hui."}],
  "serein_journal": [{"ts": now_ms - i * 86400000 * 3, "situation": "Situation", "thought": "Pensée", "balanced": "Pensée équilibrée", "traps": ["lecture"]} for i in range(9)],
  "serein_diary": [{"text": "Un bon moment", "date": "octobre"} for _ in range(12)],
  "serein_values": {"ratings": [{"key": "famille", "imp": 9, "align": 5}, {"key": "sante", "imp": 8, "align": 6}, {"key": "travail", "imp": 6, "align": 6}]},
  "serein_exposure": {"fear": "Prendre le métro", "steps": [
    {"id": 1, "text": "Une station aux heures creuses", "suds": 3, "sessions": [{"date": d(9), "fear": "Faire un malaise", "beliefBefore": 70, "outcome": "Rien de grave", "beliefAfter": 30}]},
    {"id": 2, "text": "Deux stations aux heures creuses", "suds": 5, "sessions": [{"date": d(4), "fear": "Devoir sortir", "beliefBefore": 60, "outcome": "Je suis resté", "beliefAfter": 25}]},
    {"id": 3, "text": "Heure de pointe", "suds": 8, "sessions": []}]},
  # Brouillon de journal à l'étape 7 : ouvrir le journal montre directement la nouvelle cotation
  "serein_journal_draft": {"situation": "Mon ami ne répond pas depuis hier", "thought": "Il m’en veut, j’ai dû dire quelque chose de travers.",
    "emotion": "Anxiété", "evidenceFor": "", "evidenceAgainst": "", "decatWorst": "", "decatBest": "", "decatLikely": "", "decatCope": "",
    "balanced": "Je ne sais pas ce qu’il pense. Il est peut-être juste débordé.", "intensityBefore": 8, "intensityAfter": 4,
    "beliefBefore": 80, "beliefAfter": 30, "traps": ["lecture"], "step": 7, "editingTs": None, "savedAt": now_ms + 3600 * 1000},
}
plist = {}
for k, v in data.items():
    plist["CapacitorStorage." + k] = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
with open(out, "wb") as f:
    plistlib.dump(plist, f)
print("ok", len(plist), "clés")
