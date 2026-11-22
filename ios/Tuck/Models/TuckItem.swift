import Foundation

struct InferenceMeta: Codable, Hashable {
    var source: String
    var model: String
    var latencyMs: Int
    var modeUsed: String
}

struct TuckItem: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var rawContent: String
    var url: String?
    var source: String
    var summary: String
    var nextAction: String
    var tags: [String]
    var isPrivate: Bool
    var status: String
    var inferenceMeta: InferenceMeta
    var createdAt: Double
    var updatedAt: Double
}
