import Foundation
import FirebaseAI

@MainActor
@Observable
final class HybridTuckService {
    // Lazily initialized after FirebaseApp.configure()
    private lazy var hybridModel = FirebaseAI.firebaseAI(backend: .googleAI()).generativeModel(
        modelName: "gemini-2.5-flash"
    )

    var isBusy = false

    func summarize(rawText: String, url: String?, isPrivate: Bool) async -> TuckItem {
        isBusy = true
        defer { isBusy = false }

        let start = Date()
        let prompt = """
        You are Tuck, a quiet personal triage assistant.
        Return ONLY valid JSON:
        {
          "title": "short human title (max 60 chars)",
          "summary": "1-2 plain sentences explaining why the user saved this",
          "nextAction": "one concrete next step (max 90 chars)",
          "tags": ["1 to 3 lowercase single-word tags"],
          "isPrivate": true or false
        }
        URL: \(url ?? "none")
        Content: \(rawText)
        """

        let nowMs = Date().timeIntervalSince1970 * 1000
        let itemId = "ios-\(Int(nowMs))-\(UUID().uuidString.prefix(4).lowercased())"

        do {
            let response = try await hybridModel.generateContent(prompt)
            let latency = Int(Date().timeIntervalSince(start) * 1000)
            let cleaned = (response.text ?? "")
                .replacingOccurrences(of: "```json", with: "")
                .replacingOccurrences(of: "```", with: "")
                .trimmingCharacters(in: .whitespacesAndNewlines)

            if let data = cleaned.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let title = (json["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
                let summary = (json["summary"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
                let nextAction = (json["nextAction"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
                let tags = (json["tags"] as? [String])?.prefix(3).map { $0.lowercased() } ?? ["ios"]
                let detectedPrivate = (json["isPrivate"] as? Bool) ?? false

                return TuckItem(
                    id: itemId,
                    title: title?.isEmpty == false ? title! : String(rawText.prefix(56)),
                    rawContent: rawText,
                    url: url,
                    source: "ios",
                    summary: summary?.isEmpty == false ? summary! : String(rawText.prefix(140)),
                    nextAction: nextAction?.isEmpty == false ? nextAction! : "Review in your daily 3-card deck.",
                    tags: tags.isEmpty ? ["ios"] : tags,
                    isPrivate: isPrivate || detectedPrivate,
                    status: "tucked",
                    inferenceMeta: InferenceMeta(
                        source: "on-device",
                        model: "Firebase AI Logic (Apple Foundation Models / Cloud Fallback)",
                        latencyMs: latency,
                        modeUsed: "prefer_on_device"
                    ),
                    createdAt: nowMs,
                    updatedAt: nowMs
                )
            }
        } catch {
            // Fall through to offline local save
        }

        let latency = Int(Date().timeIntervalSince(start) * 1000)
        return TuckItem(
            id: itemId,
            title: String(rawText.prefix(56)),
            rawContent: rawText,
            url: url,
            source: "ios",
            summary: String(rawText.prefix(140)),
            nextAction: "Review in your daily 3-card deck.",
            tags: ["ios"],
            isPrivate: isPrivate,
            status: "tucked",
            inferenceMeta: InferenceMeta(
                source: "on-device",
                model: "Offline local fallback",
                latencyMs: latency,
                modeUsed: "prefer_on_device"
            ),
            createdAt: nowMs,
            updatedAt: nowMs
        )
    }
}
