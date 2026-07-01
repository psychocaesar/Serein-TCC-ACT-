import WidgetKit
import SwiftUI

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

struct CopingEntry: TimelineEntry {
    let date: Date
    let thought: String?   // nil = aucune carte
}

struct CopingProvider: TimelineProvider {
    func placeholder(in context: Context) -> CopingEntry {
        CopingEntry(date: Date(), thought: "Une pensée-ressource, à portée de regard.")
    }

    func getSnapshot(in context: Context, completion: @escaping (CopingEntry) -> Void) {
        let thoughts = loadThoughts()
        completion(CopingEntry(date: Date(), thought: thoughts.first))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CopingEntry>) -> Void) {
        let thoughts = loadThoughts()
        var entries: [CopingEntry] = []
        let now = Date()
        if thoughts.isEmpty {
            entries.append(CopingEntry(date: now, thought: nil))
        } else {
            // Rotation : une carte toutes les 3 h (max 8 entrées), recharge à la fin.
            let step: TimeInterval = 3 * 3600
            let maxEntries = min(thoughts.count, 8)
            for i in 0..<maxEntries {
                let date = now.addingTimeInterval(Double(i) * step)
                entries.append(CopingEntry(date: date, thought: thoughts[i % thoughts.count]))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct CopingWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: CopingEntry

    // ── Écran d'accueil (systemMedium / systemLarge) : carte brandée ──
    private var homeInner: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CARTE DE COPING")
                .font(.system(size: 11, weight: .bold))
                .tracking(0.5)
                .foregroundColor(brandAccent)
            if let thought = entry.thought {
                Text("« \(thought) »")
                    .font(.system(size: 15))
                    .foregroundColor(textColor)
                    .lineLimit(6)
                    .minimumScaleFactor(0.8)
            } else {
                Text("Crée ta première carte de coping dans l'app.")
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
                Text("Crée une carte dans l'app")
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
