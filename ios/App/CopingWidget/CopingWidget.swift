import WidgetKit
import SwiftUI
import AppIntents

// IMPORTANT : ce fichier doit appartenir à la target d'extension "CopingWidget"
// (créée dans Xcode), et l'App Group "group.fr.sereinapp.tccact" doit être activé
// sur CETTE target ET sur la target App. L'app (AppDelegate.syncWidgetData)
// écrit les cartes dans cet App Group ; le widget les lit ici.

private let appGroup = "group.fr.sereinapp.tccact"

// Couleurs de marque (cohérentes avec le widget Android)
// "brandAccent" (pas "accentColor") : ce nom entre en collision avec View.accentColor(_:),
// toujours présente dans le SDK malgré la dépréciation - Swift résout alors l'identifiant
// nu vers la méthode (self implicite) plutôt que vers cette constante de fichier.
private let bgColor = Color(red: 0.110, green: 0.192, blue: 0.153)      // #1C3127
private let brandAccent = Color(red: 0.576, green: 0.788, blue: 0.675)  // #93C9AC
private let textColor = Color(red: 0.94, green: 0.957, blue: 0.94)      // #F0F4F0
private let mutedColor = Color(red: 0.78, green: 0.84, blue: 0.80)

private func loadThoughts() -> [String] {
    guard let shared = UserDefaults(suiteName: appGroup),
          let json = shared.string(forKey: "serein_cards"),
          let data = json.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return []
    }
    return arr.compactMap { dict in
        if let t = dict["thought"] as? String, !t.isEmpty { return t }
        return nil
    }
}

// Cartes-modèles (générées par l'app, jamais de données utilisateur - cf. seedWidgetExamples()
// côté JS) : filet de sécurité tant que l'utilisateur n'a créé aucune carte personnelle.
private func loadExamples() -> [String] {
    guard let shared = UserDefaults(suiteName: appGroup),
          let json = shared.string(forKey: "serein_cards_examples"),
          let data = json.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [String] else {
        return []
    }
    return arr
}

// Cartes personnelles si l'utilisateur en a ; sinon cartes-modèles.
private func currentThoughts() -> [String] {
    let personal = loadThoughts()
    return personal.isEmpty ? loadExamples() : personal
}

// Index de la carte actuellement affichée, partagé entre tous les widgets de ce kind
// (StaticConfiguration ne donne pas d'identité par instance, contrairement à Android).
private func currentCardIndex(count: Int) -> Int {
    guard count > 0, let shared = UserDefaults(suiteName: appGroup) else { return 0 }
    let idx = shared.integer(forKey: "widget_card_index")
    return ((idx % count) + count) % count
}

// Bouton "carte suivante" du widget (écran d'accueil, iOS 17+ uniquement - les widgets
// interactifs n'existent pas avant). Incrémente l'index partagé puis force un rechargement
// de la timeline ; getTimeline() lit ce même index pour choisir la carte à afficher.
@available(iOS 17.0, *)
struct NextCopingCardIntent: AppIntent {
    static var title: LocalizedStringResource = "Carte de coping suivante"
    static var description = IntentDescription("Affiche la carte de coping suivante sur le widget.")

    func perform() async throws -> some IntentResult {
        if let shared = UserDefaults(suiteName: appGroup) {
            shared.set(shared.integer(forKey: "widget_card_index") + 1, forKey: "widget_card_index")
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "CopingWidget")
        return .result()
    }
}

struct CopingEntry: TimelineEntry {
    let date: Date
    let thought: String?   // nil = aucune carte
}

struct CopingProvider: TimelineProvider {
    func placeholder(in context: Context) -> CopingEntry {
        CopingEntry(date: Date(), thought: "Une pensée-ressource, à portée de regard.")
    }

    func getSnapshot(in context: Context, completion: @escaping (CopingEntry) -> Void) {
        let thoughts = currentThoughts()
        let thought = thoughts.isEmpty ? nil : thoughts[currentCardIndex(count: thoughts.count)]
        completion(CopingEntry(date: Date(), thought: thought))
    }

    // Une seule entrée "courante" : pas de rotation programmée dans le temps (comme sur
    // Android). La timeline se recharge uniquement sur événement explicite - tap sur le
    // bouton ↻ (NextCopingCardIntent) ou sync de nouvelles cartes (AppDelegate.syncWidgetData).
    func getTimeline(in context: Context, completion: @escaping (Timeline<CopingEntry>) -> Void) {
        let thoughts = currentThoughts()
        let thought = thoughts.isEmpty ? nil : thoughts[currentCardIndex(count: thoughts.count)]
        let entry = CopingEntry(date: Date(), thought: thought)
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct CopingWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: CopingEntry

    // ── Écran d'accueil (systemMedium / systemLarge) : carte brandée ──
    private var homeInner: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text("CARTE DE COPING")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.5)
                    .foregroundColor(brandAccent)
                Spacer(minLength: 4)
                if #available(iOS 17.0, *), entry.thought != nil {
                    Button(intent: NextCopingCardIntent()) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(brandAccent)
                    }
                    .buttonStyle(.plain)
                }
            }
            if let thought = entry.thought {
                Text("« \(thought) »")
                    .font(.system(size: 15))
                    .foregroundColor(textColor)
                    .lineLimit(6)
                    .minimumScaleFactor(0.8)
            } else {
                Text("Choisis une carte-modèle dans l'app pour commencer.")
                    .font(.system(size: 14))
                    .foregroundColor(mutedColor)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "serein-tcc://cards"))
    }

    @ViewBuilder
    private var homeView: some View {
        if #available(iOS 17.0, *) {
            homeInner.padding(16).containerBackground(bgColor, for: .widget)
        } else {
            homeInner.padding(16).background(bgColor)
        }
    }

    // ── Écran verrouillé (accessoryRectangular) : monochrome, rendu système ──
    @available(iOS 16.0, *)
    private var lockRectInner: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Carte de coping")
                .font(.system(size: 11, weight: .semibold))
            if let thought = entry.thought {
                Text("« \(thought) »")
                    .font(.system(size: 13))
                    .lineLimit(3)
            } else {
                Text("Choisis un modèle dans l'app")
                    .font(.system(size: 12))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "serein-tcc://cards"))
    }

    @available(iOS 16.0, *)
    @ViewBuilder
    private var lockRectView: some View {
        if #available(iOS 17.0, *) {
            lockRectInner.containerBackground(.clear, for: .widget).widgetAccentable()
        } else {
            lockRectInner.widgetAccentable()
        }
    }

    @ViewBuilder
    var body: some View {
        if #available(iOS 16.0, *) {
            switch family {
            case .accessoryRectangular:
                lockRectView
            case .accessoryInline:
                Text(entry.thought.map { "🌿 \($0)" } ?? "Carte de coping")
                    .widgetURL(URL(string: "serein-tcc://cards"))
            default:
                homeView
            }
        } else {
            homeView
        }
    }
}

struct CopingWidget: Widget {
    let kind = "CopingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CopingProvider()) { entry in
            CopingWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Carte de coping")
        .description("Une carte de coping sur ton écran d'accueil ou verrouillé.")
        .supportedFamilies(supportedFamilies)
    }

    private var supportedFamilies: [WidgetFamily] {
        var fams: [WidgetFamily] = [.systemMedium, .systemLarge]
        if #available(iOS 16.0, *) {
            fams.append(.accessoryRectangular) // écran verrouillé
            fams.append(.accessoryInline)      // ligne au-dessus de l'heure
        }
        return fams
    }
}

@main
struct CopingWidgetBundle: WidgetBundle {
    var body: some Widget {
        CopingWidget()
    }
}
