import Foundation
import Network
import Combine

@MainActor
final class LatencyProbe: ObservableObject {
    @Published private(set) var samples: [LatencySample] = []
    @Published private(set) var isRunning = false
    @Published private(set) var lastSummary = "Tap Run to probe connectivity"

    struct Target: Identifiable {
        let id = UUID()
        let label: String
        let host: String
        let port: NWEndpoint.Port
    }

    let targets: [Target] = [
        Target(label: "Apple (edge)", host: "www.apple.com", port: 443),
        Target(label: "Cloudflare DNS", host: "1.1.1.1", port: 443),
        Target(label: "Google DNS", host: "8.8.8.8", port: 443)
    ]

    func runProbe(rounds: Int = 3) async {
        guard !isRunning else { return }
        isRunning = true
        samples = []
        lastSummary = "Probing…"

        for target in targets {
            for _ in 0..<rounds {
                let sample = await measure(target: target)
                samples.append(sample)
            }
        }

        let successes = samples.filter(\.succeeded).compactMap(\.milliseconds)
        if successes.isEmpty {
            lastSummary = "All probes failed — check Wi‑Fi or captive portal"
        } else {
            let avg = successes.reduce(0, +) / Double(successes.count)
            let variance = successes.map { pow($0 - avg, 2) }.reduce(0, +) / Double(successes.count)
            let jitter = sqrt(variance)
            let rate = Double(successes.count) / Double(samples.count)
            lastSummary = String(
                format: "Avg %.0f ms · jitter %.0f ms · success %.0f%%",
                avg,
                jitter,
                rate * 100
            )
        }

        isRunning = false
    }

    func clear() {
        samples = []
        lastSummary = "Tap Run to probe connectivity"
    }

    var averageMs: Double? {
        let values = samples.filter(\.succeeded).compactMap(\.milliseconds)
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    var jitterMs: Double? {
        let values = samples.filter(\.succeeded).compactMap(\.milliseconds)
        guard values.count > 1, let avg = averageMs else { return nil }
        let variance = values.map { pow($0 - avg, 2) }.reduce(0, +) / Double(values.count)
        return sqrt(variance)
    }

    var successRate: Double? {
        guard !samples.isEmpty else { return nil }
        return Double(samples.filter(\.succeeded).count) / Double(samples.count)
    }

    private func measure(target: Target) async -> LatencySample {
        await withCheckedContinuation { continuation in
            let endpoint = NWEndpoint.hostPort(
                host: NWEndpoint.Host(target.host),
                port: target.port
            )
            let connection = NWConnection(to: endpoint, using: .tcp)
            let start = Date()
            var resumed = false

            let finish: (Bool, Double?, String?) -> Void = { ok, ms, note in
                guard !resumed else { return }
                resumed = true
                connection.cancel()
                continuation.resume(
                    returning: LatencySample(
                        target: target.label,
                        milliseconds: ms,
                        succeeded: ok,
                        timestamp: Date(),
                        note: note
                    )
                )
            }

            connection.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    let ms = Date().timeIntervalSince(start) * 1000
                    finish(true, ms, nil)
                case .failed(let error):
                    finish(false, nil, error.localizedDescription)
                case .cancelled:
                    break
                default:
                    break
                }
            }

            connection.start(queue: .global(qos: .userInitiated))

            DispatchQueue.global().asyncAfter(deadline: .now() + 4) {
                finish(false, nil, "Timed out")
            }
        }
    }
}
