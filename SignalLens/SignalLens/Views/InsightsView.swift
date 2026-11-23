import SwiftUI

struct InsightsView: View {
    @EnvironmentObject private var environment: RadioEnvironment

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    intro
                    ForEach(environment.insights) { insight in
                        insightCard(insight)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Refresh") {
                        environment.refreshDerivedState()
                    }
                }
            }
        }
    }

    private var intro: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 8) {
                Text("Triage your connection issues")
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(SLTheme.ink)
                Text("SignalLens combines Bluetooth density, the active Wi‑Fi path, and latency probes into plain-language hints about what might be hurting your link.")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(SLTheme.slate)
            }
        }
    }

    private func insightCard(_ insight: DiagnosticInsight) -> some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Text(insight.severity.label.uppercased())
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .tracking(0.7)
                        .foregroundStyle(SLTheme.severityColor(insight.severity))
                    Text("·")
                        .foregroundStyle(SLTheme.slate)
                    Text(insight.category.rawValue.capitalized)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(SLTheme.slate)
                    Spacer()
                }

                Text(insight.title)
                    .font(.system(.title3, design: .rounded).weight(.semibold))
                    .foregroundStyle(SLTheme.ink)

                Text(insight.detail)
                    .font(.system(.body, design: .rounded))
                    .foregroundStyle(SLTheme.slate)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(SLTheme.severityColor(insight.severity))
                .frame(width: 4)
                .padding(.vertical, 14)
                .padding(.leading, 2)
        }
    }
}
