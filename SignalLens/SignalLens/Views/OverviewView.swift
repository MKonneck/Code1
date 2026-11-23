import SwiftUI

struct OverviewView: View {
    @EnvironmentObject private var environment: RadioEnvironment

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    hero
                    statusGrid
                    quickActions
                    topBluetooth
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("SignalLens")
                .font(.system(size: 42, weight: .bold, design: .serif))
                .foregroundStyle(SLTheme.ink)
                .minimumScaleFactor(0.8)

            Text("See what’s crowding your air before you blame the router.")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(SLTheme.slate)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.top, 12)
        .opacity(1)
        .modifier(FadeInOnAppear())
    }

    private var statusGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                metricTile(
                    title: "Wi‑Fi path",
                    value: environment.network.wifi.usesWiFi ? "Active" : "Off path",
                    detail: environment.network.wifi.ssid ?? environment.network.pathStatusMessage,
                    tint: environment.network.wifi.usesWiFi ? SLTheme.sea : SLTheme.coral
                )
                metricTile(
                    title: "BLE nearby",
                    value: "\(environment.stats.bluetoothDeviceCount)",
                    detail: congestionLabel,
                    tint: congestionColor
                )
            }
            HStack(spacing: 12) {
                metricTile(
                    title: "Congestion",
                    value: "\(environment.bluetooth.congestionScore)",
                    detail: "2.4 GHz risk score",
                    tint: congestionColor
                )
                metricTile(
                    title: "Latency",
                    value: latencyValue,
                    detail: environment.latency.lastSummary,
                    tint: SLTheme.seaDeep
                )
            }
        }
    }

    private var quickActions: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionTitle(
                    title: "Live scan",
                    subtitle: environment.bluetooth.stateMessage
                )

                SignalMeter(
                    value: Double(min(environment.bluetooth.congestionScore, 100)) / 100.0,
                    color: congestionColor
                )

                HStack(spacing: 10) {
                    Button {
                        environment.bluetooth.toggle()
                    } label: {
                        Label(
                            environment.bluetooth.isScanning ? "Pause Bluetooth" : "Scan Bluetooth",
                            systemImage: environment.bluetooth.isScanning ? "pause.fill" : "play.fill"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButtonStyle())

                    Button {
                        Task { await environment.latency.runProbe() }
                    } label: {
                        Label(
                            environment.latency.isRunning ? "Probing…" : "Probe net",
                            systemImage: "gauge.with.needle"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .disabled(environment.latency.isRunning)
                }
            }
        }
    }

    private var topBluetooth: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(
                    title: "Strongest nearby",
                    subtitle: "Likeliest local RF sources by Bluetooth RSSI"
                )

                if environment.bluetooth.devices.isEmpty {
                    Text("No BLE advertisers heard yet. Walk around or wait a few seconds.")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(SLTheme.slate)
                } else {
                    ForEach(environment.bluetooth.devices.prefix(5)) { device in
                        BluetoothRow(device: device, compact: true)
                        if device.id != environment.bluetooth.devices.prefix(5).last?.id {
                            Divider().opacity(0.35)
                        }
                    }
                }
            }
        }
    }

    private func metricTile(title: String, value: String, detail: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(SLTheme.slate)
                .tracking(0.6)
            Text(value)
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(detail)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(SLTheme.slate)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 118, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white.opacity(0.55))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(tint.opacity(0.18), lineWidth: 1)
        )
    }

    private var congestionLabel: String {
        let score = environment.bluetooth.congestionScore
        switch score {
        case 70...: return "Crowded air"
        case 40..<70: return "Busy air"
        default: return "Calm air"
        }
    }

    private var congestionColor: Color {
        let score = environment.bluetooth.congestionScore
        switch score {
        case 70...: return SLTheme.coral
        case 40..<70: return SLTheme.amber
        default: return SLTheme.sea
        }
    }

    private var latencyValue: String {
        if let avg = environment.stats.latencyAverageMs {
            return String(format: "%.0f ms", avg)
        }
        return "—"
    }
}

struct FadeInOnAppear: ViewModifier {
    @State private var shown = false

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : 8)
            .onAppear {
                withAnimation(.easeOut(duration: 0.55)) {
                    shown = true
                }
            }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.subheadline, design: .rounded).weight(.semibold))
            .foregroundStyle(.white)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(SLTheme.sea.opacity(configuration.isPressed ? 0.75 : 1))
            )
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.subheadline, design: .rounded).weight(.semibold))
            .foregroundStyle(SLTheme.seaDeep)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(SLTheme.foam.opacity(configuration.isPressed ? 0.55 : 0.9))
            )
    }
}
