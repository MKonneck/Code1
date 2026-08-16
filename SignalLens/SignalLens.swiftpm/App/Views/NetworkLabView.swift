import SwiftUI

struct NetworkLabView: View {
    @EnvironmentObject private var environment: RadioEnvironment

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    wifiPanel
                    pathPanel
                    probePanel
                    samplesPanel
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .navigationTitle("Network")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private var wifiPanel: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(
                    title: "Current Wi‑Fi",
                    subtitle: "iOS exposes the joined network — not a full channel scan"
                )

                infoRow("SSID", environment.network.wifi.ssid ?? missingSSIDText)
                infoRow("BSSID", environment.network.wifi.bssid ?? "—")
                infoRow("Interface", environment.network.wifi.interfaceName ?? "—")
                infoRow(
                    "Updated",
                    environment.network.wifi.updatedAt == .distantPast
                        ? "—"
                        : environment.network.wifi.updatedAt.formatted(date: .omitted, time: .shortened)
                )

                if environment.network.locationDenied {
                    Text("Location access is required by iOS to read the Wi‑Fi name. Enable it in Settings → SignalLens.")
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(SLTheme.coral)
                    Button("Request location access") {
                        environment.network.requestSSIDAccessIfNeeded()
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
            }
        }
    }

    private var pathPanel: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "System path", subtitle: environment.network.pathStatusMessage)

                flowChips
                infoRow("Connected", environment.network.wifi.isConnected ? "Yes" : "No")
                infoRow("Uses Wi‑Fi", environment.network.wifi.usesWiFi ? "Yes" : "No")
                infoRow("Expensive path", environment.network.wifi.isExpensive ? "Yes" : "No")
                infoRow("Constrained", environment.network.wifi.isConstrained ? "Yes" : "No")
                infoRow("IPv4 / IPv6", "\(environment.network.wifi.supportsIPv4 ? "IPv4" : "—") · \(environment.network.wifi.supportsIPv6 ? "IPv6" : "—")")
            }
        }
    }

    private var flowChips: some View {
        HStack(spacing: 8) {
            chip(environment.network.wifi.usesWiFi ? "Wi‑Fi" : "No Wi‑Fi", active: environment.network.wifi.usesWiFi)
            chip(environment.network.wifi.isConstrained ? "Constrained" : "Unconstrained", active: !environment.network.wifi.isConstrained)
            chip(environment.network.wifi.isConnected ? "Online" : "Offline", active: environment.network.wifi.isConnected)
        }
    }

    private var probePanel: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(
                    title: "Connectivity probe",
                    subtitle: "TCP handshake timing to well-known hosts"
                )
                Text(environment.latency.lastSummary)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(SLTheme.slate)

                HStack(spacing: 10) {
                    Button {
                        Task {
                            await environment.latency.runProbe()
                            environment.refreshDerivedState()
                        }
                    } label: {
                        Label(environment.latency.isRunning ? "Running…" : "Run probe", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(environment.latency.isRunning)

                    Button {
                        environment.latency.clear()
                        environment.refreshDerivedState()
                    } label: {
                        Label("Clear", systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
            }
        }
    }

    private var samplesPanel: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Recent samples", subtitle: nil)

                if environment.latency.samples.isEmpty {
                    Text("No samples yet.")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(SLTheme.slate)
                } else {
                    ForEach(environment.latency.samples.suffix(18).reversed()) { sample in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(sample.target)
                                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                    .foregroundStyle(SLTheme.ink)
                                if let note = sample.note, !sample.succeeded {
                                    Text(note)
                                        .font(.system(.caption2, design: .rounded))
                                        .foregroundStyle(SLTheme.coral)
                                }
                            }
                            Spacer()
                            Text(sample.succeeded ? String(format: "%.0f ms", sample.milliseconds ?? 0) : "fail")
                                .font(.system(.subheadline, design: .rounded).monospacedDigit())
                                .foregroundStyle(sample.succeeded ? SLTheme.sea : SLTheme.coral)
                        }
                        if sample.id != environment.latency.samples.suffix(18).reversed().last?.id {
                            Divider().opacity(0.25)
                        }
                    }
                }
            }
        }
    }

    private var missingSSIDText: String {
        if !environment.network.wifi.usesWiFi {
            return "Not on Wi‑Fi"
        }
        if environment.network.locationDenied {
            return "Need Location permission"
        }
        return "Unavailable (simulator / restricted)"
    }

    private func infoRow(_ title: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(SLTheme.slate)
            Spacer()
            Text(value)
                .font(.system(.subheadline, design: .rounded).weight(.medium))
                .foregroundStyle(SLTheme.ink)
                .multilineTextAlignment(.trailing)
        }
    }

    private func chip(_ text: String, active: Bool) -> some View {
        Text(text)
            .font(.system(.caption, design: .rounded).weight(.semibold))
            .foregroundStyle(active ? SLTheme.seaDeep : SLTheme.slate)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule(style: .continuous)
                    .fill(active ? SLTheme.foam : Color.white.opacity(0.5))
            )
    }
}
