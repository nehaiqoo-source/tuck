import SwiftUI
import FirebaseAuth
import FirebaseFirestore

struct ContentView: View {
    @State private var service = HybridTuckService()
    @State private var draftText = ""
    @State private var isPrivate = false
    @State private var items: [TuckItem] = [
        TuckItem(
            id: "ios-seed-1",
            title: "Arashiyama bamboo grove 6:30am route",
            rawContent: "Take JR Sagano Line from Kyoto Station at 6:30am to beat tour buses.",
            url: "https://www.japan-guide.com/e/e3912.html",
            source: "ios",
            summary: "Early 6:30am train itinerary to visit Arashiyama before crowds.",
            nextAction: "Add 6:30am train slot to Day 2 of your Kyoto plan.",
            tags: ["travel", "kyoto"],
            isPrivate: false,
            status: "tucked",
            inferenceMeta: InferenceMeta(
                source: "on-device",
                model: "Apple Foundation Models (iOS)",
                latencyMs: 118,
                modeUsed: "prefer_on_device"
            ),
            createdAt: Date().timeIntervalSince1970 * 1000,
            updatedAt: Date().timeIntervalSince1970 * 1000
        )
    ]

    private let warmPaper = Color(red: 0.98, green: 0.97, blue: 0.95)
    private let terracotta = Color(red: 0.76, green: 0.35, blue: 0.20)
    private let sage = Color(red: 0.12, green: 0.36, blue: 0.25)

    private var currentCard: TuckItem? {
        items.first { $0.status == "tucked" }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header badge
                    HStack {
                        Text("Tuck")
                            .font(.system(size: 34, weight: .regular, design: .serif))
                        Spacer()
                        Text("Hybrid AI · On-Device First")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(sage)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(sage.opacity(0.12), in: Capsule())
                    }

                    // Quick Tuck Card
                    VStack(alignment: .leading, spacing: 12) {
                        TextField(
                            "Paste a link or quick note to tuck...",
                            text: $draftText,
                            axis: .vertical
                        )
                        .lineLimit(2...4)
                        .textFieldStyle(.roundedBorder)

                        HStack {
                            Toggle("Private on-device", isOn: $isPrivate)
                                .toggleStyle(.switch)
                                .font(.footnote)
                                .tint(sage)
                            Spacer()
                            Button(service.isBusy ? "Tucking..." : "Tuck it") {
                                Task { await tuckDraft() }
                            }
                            .disabled(service.isBusy || draftText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            .buttonStyle(.borderedProminent)
                            .tint(terracotta)
                            .clipShape(Capsule())
                        }
                    }
                    .padding(16)
                    .background(.white, in: RoundedRectangle(cornerRadius: 18))

                    // Daily Triage Deck
                    Text("Today's forgotten saves")
                        .font(.system(size: 22, weight: .regular, design: .serif))

                    if let card = currentCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("\(card.inferenceMeta.source.uppercased()) · \(card.inferenceMeta.latencyMs)ms")
                                .font(.caption2.monospaced().weight(.semibold))
                                .foregroundStyle(sage)

                            Text(card.title)
                                .font(.title3.weight(.semibold))

                            Text(card.summary)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            VStack(alignment: .leading, spacing: 3) {
                                Text("NEXT STEP")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                                Text(card.nextAction)
                                    .font(.subheadline.weight(.medium))
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(warmPaper, in: RoundedRectangle(cornerRadius: 12))

                            HStack(spacing: 10) {
                                Button("Do it") { updateStatus(card.id, to: "done") }
                                    .buttonStyle(.borderedProminent)
                                    .tint(sage)
                                    .clipShape(Capsule())

                                Button("Keep") { updateStatus(card.id, to: "kept") }
                                    .buttonStyle(.bordered)
                                    .clipShape(Capsule())

                                Button("Let go") { updateStatus(card.id, to: "let-go") }
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(20)
                        .background(.white, in: RoundedRectangle(cornerRadius: 20))
                    } else {
                        Text("Desk is clear for today.")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(28)
                            .background(.white, in: RoundedRectangle(cornerRadius: 18))
                    }
                }
                .padding(20)
            }
            .background(warmPaper.ignoresSafeArea())
        }
    }

    private func tuckDraft() async {
        let trimmed = draftText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let created = await service.summarize(rawText: trimmed, url: nil, isPrivate: isPrivate)
        items.insert(created, at: 0)
        draftText = ""
        isPrivate = false

        if let uid = Auth.auth().currentUser?.uid {
            try? Firestore.firestore()
                .collection("users")
                .document(uid)
                .collection("items")
                .document(created.id)
                .setData(from: created)
        }
    }

    private func updateStatus(_ id: String, to status: String) {
        if let idx = items.firstIndex(where: { $0.id == id }) {
            items[idx].status = status
        }
    }
}
