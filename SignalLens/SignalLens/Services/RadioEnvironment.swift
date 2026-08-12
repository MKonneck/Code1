import Foundation
import Combine

@MainActor
final class RadioEnvironment: ObservableObject {
    let bluetooth = BluetoothScanner()
    let network = NetworkEnvironmentMonitor()
    let latency = LatencyProbe()

    @Published private(set) var insights: [DiagnosticInsight] = []
    @Published private(set) var stats = ScanStats()
    @Published var isActive = false

    private var refreshTimer: Timer?

    func start() {
        guard !isActive else { return }
        isActive = true
        network.start()
        bluetooth.start()
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.refreshDerivedState()
            }
        }
        refreshDerivedState()
    }

    func stop() {
        isActive = false
        bluetooth.stop()
        network.stop()
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func refreshDerivedState() {
        let devices = bluetooth.devices
        let avg: Double? = devices.isEmpty
            ? nil
            : Double(devices.map(\.rssi).reduce(0, +)) / Double(devices.count)

        stats = ScanStats(
            bluetoothDeviceCount: devices.count,
            strongBluetoothCount: devices.filter { $0.rssi >= -70 }.count,
            averageBluetoothRSSI: avg,
            lastBluetoothUpdate: devices.map(\.lastSeen).max(),
            latencyAverageMs: latency.averageMs,
            latencyJitterMs: latency.jitterMs,
            packetSuccessRate: latency.successRate
        )
        insights = InsightEngine.makeInsights(
            bluetoothDevices: devices,
            congestionScore: bluetooth.congestionScore,
            wifi: network.wifi,
            pathMessage: network.pathStatusMessage,
            locationDenied: network.locationDenied,
            latency: latency
        )
    }
}

enum InsightEngine {
    static func makeInsights(
        bluetoothDevices: [BluetoothDeviceReading],
        congestionScore: Int,
        wifi: WiFiSnapshot,
        pathMessage: String,
        locationDenied: Bool,
        latency: LatencyProbe
    ) -> [DiagnosticInsight] {
        var items: [DiagnosticInsight] = []

        if !wifi.isConnected {
            items.append(
                DiagnosticInsight(
                    severity: .alert,
                    title: "No usable network path",
                    detail: "\(pathMessage). Confirm Wi‑Fi is joined and not stuck on a captive portal.",
                    category: .network
                )
            )
        } else if !wifi.usesWiFi {
            items.append(
                DiagnosticInsight(
                    severity: .caution,
                    title: "Traffic is not on Wi‑Fi",
                    detail: "The system path is satisfied, but not via Wi‑Fi. Your iPhone may be on cellular or another interface while Wi‑Fi looks connected.",
                    category: .wifi
                )
            )
        } else {
            items.append(
                DiagnosticInsight(
                    severity: .info,
                    title: wifi.ssid.map { "On Wi‑Fi “\($0)”" } ?? "On Wi‑Fi",
                    detail: locationDenied
                        ? "Location permission is needed to show the network name (SSID). Path looks healthy otherwise."
                        : "Active Wi‑Fi path detected. BSSID helps distinguish which access point you’re on when roaming.",
                    category: .wifi
                )
            )
        }

        if wifi.isConstrained {
            items.append(
                DiagnosticInsight(
                    severity: .caution,
                    title: "Low Data Mode / constrained path",
                    detail: "iOS reports this path as constrained. Background refreshes and some media may be throttled.",
                    category: .network
                )
            )
        }

        if congestionScore >= 70 {
            items.append(
                DiagnosticInsight(
                    severity: .alert,
                    title: "Crowded Bluetooth airtime",
                    detail: "\(bluetoothDevices.count) nearby BLE advertisers (\(congestionScore)/100 congestion). Dense 2.4 GHz Bluetooth activity often correlates with Wi‑Fi slowdowns on the same band—try 5 GHz/6 GHz Wi‑Fi or move away from hubs, watches, and speakers.",
                    category: .bluetooth
                )
            )
        } else if congestionScore >= 40 {
            items.append(
                DiagnosticInsight(
                    severity: .caution,
                    title: "Moderate Bluetooth density",
                    detail: "Seeing \(bluetoothDevices.count) BLE devices nearby. If Wi‑Fi is on 2.4 GHz, interference is possible during busy hours.",
                    category: .bluetooth
                )
            )
        } else if bluetoothDevices.isEmpty {
            items.append(
                DiagnosticInsight(
                    severity: .info,
                    title: "Quiet Bluetooth environment",
                    detail: "Few or no BLE advertisers right now. Connection issues are less likely to be Bluetooth congestion—check the router, ISP, or distance to the AP.",
                    category: .bluetooth
                )
            )
        } else {
            items.append(
                DiagnosticInsight(
                    severity: .info,
                    title: "Bluetooth environment looks calm",
                    detail: "\(bluetoothDevices.count) devices visible with congestion \(congestionScore)/100. Unlikely to be the main cause unless they sit very close to the phone or AP.",
                    category: .bluetooth
                )
            )
        }

        if let nearest = bluetoothDevices.first, nearest.rssi >= -45 {
            items.append(
                DiagnosticInsight(
                    severity: .caution,
                    title: "Very strong nearby radio: \(nearest.displayName)",
                    detail: "RSSI \(nearest.rssi) dBm. A transmitter this close can desensitize receivers. Briefly power it down or move it to test.",
                    category: .bluetooth
                )
            )
        }

        if let rate = latency.successRate, !latency.samples.isEmpty {
            if rate < 0.7 {
                items.append(
                    DiagnosticInsight(
                        severity: .alert,
                        title: "Probe success rate is low",
                        detail: String(format: "%.0f%% of TCP probes failed. This points to DNS, routing, captive portal, or upstream outage—not just local RF noise.", rate * 100),
                        category: .network
                    )
                )
            } else if let avg = latency.averageMs, avg > 180 {
                items.append(
                    DiagnosticInsight(
                        severity: .caution,
                        title: "High latency to the internet",
                        detail: String(format: "Average probe %.0f ms. Local RF can contribute, but also check VPN, mesh backhaul, and ISP load.", avg),
                        category: .network
                    )
                )
            } else if let jitter = latency.jitterMs, jitter > 60 {
                items.append(
                    DiagnosticInsight(
                        severity: .caution,
                        title: "Unstable latency (jitter)",
                        detail: String(format: "Jitter ≈ %.0f ms. Spiky delay often feels like “Wi‑Fi is fine but calls/games suck.” Try a less congested band or wired backhaul for the AP.", jitter),
                        category: .network
                    )
                )
            } else if let avg = latency.averageMs {
                items.append(
                    DiagnosticInsight(
                        severity: .info,
                        title: "Internet probes look healthy",
                        detail: String(format: "Average %.0f ms with good success. If apps still fail, the problem may be app-specific or DNS-related.", avg),
                        category: .network
                    )
                )
            }
        }

        items.append(
            DiagnosticInsight(
                severity: .info,
                title: "What iPhone can and can’t measure",
                detail: "iOS apps can scan Bluetooth LE RSSI and inspect the active network path. They cannot show a full Wi‑Fi channel survey or raw RF spectrum without special Apple entitlements / external hardware. Use this as a triage lens, not a spectrum analyzer.",
                category: .general
            )
        )

        return items
    }
}
