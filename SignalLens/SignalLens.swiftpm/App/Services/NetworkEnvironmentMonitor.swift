import Foundation
import Network
import NetworkExtension
import SystemConfiguration.CaptiveNetwork
import CoreLocation
import Combine

@MainActor
final class NetworkEnvironmentMonitor: NSObject, ObservableObject {
    @Published private(set) var wifi = WiFiSnapshot.empty
    @Published private(set) var pathStatusMessage = "Checking network…"
    @Published private(set) var locationDenied = false

    private var monitor: NWPathMonitor?
    private let queue = DispatchQueue(label: "com.signallens.pathmonitor")
    private let locationManager = CLLocationManager()
    private var refreshTimer: Timer?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func start() {
        monitor?.cancel()
        let newMonitor = NWPathMonitor()
        newMonitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.apply(path: path)
            }
        }
        newMonitor.start(queue: queue)
        monitor = newMonitor
        requestSSIDAccessIfNeeded()
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.refreshWiFiIdentity()
            }
        }
    }

    func stop() {
        monitor?.cancel()
        monitor = nil
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func requestSSIDAccessIfNeeded() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            locationDenied = false
            refreshWiFiIdentity()
        case .denied, .restricted:
            locationDenied = true
        @unknown default:
            break
        }
    }

    private func apply(path: NWPath) {
        let usesWiFi = path.usesInterfaceType(.wifi)
        let usesCellular = path.usesInterfaceType(.cellular)
        let interface = path.availableInterfaces.first(where: { $0.type == .wifi })?.name
            ?? path.availableInterfaces.first?.name

        wifi.isConnected = path.status == .satisfied
        wifi.usesWiFi = usesWiFi
        wifi.isExpensive = path.isExpensive
        wifi.isConstrained = path.isConstrained
        wifi.supportsIPv4 = path.supportsIPv4
        wifi.supportsIPv6 = path.supportsIPv6
        wifi.interfaceName = interface
        wifi.updatedAt = Date()

        switch path.status {
        case .satisfied:
            if usesWiFi {
                pathStatusMessage = "Connected over Wi‑Fi"
            } else if usesCellular {
                pathStatusMessage = "Connected over Cellular (not Wi‑Fi)"
            } else {
                pathStatusMessage = "Connected"
            }
        case .requiresConnection:
            pathStatusMessage = "Network requires a connection"
        case .unsatisfied:
            pathStatusMessage = "No usable network path"
        @unknown default:
            pathStatusMessage = "Network status unknown"
        }

        refreshWiFiIdentity()
    }

    private func refreshWiFiIdentity() {
        guard wifi.usesWiFi else {
            wifi.ssid = nil
            wifi.bssid = nil
            return
        }

        NEHotspotNetwork.fetchCurrent { [weak self] network in
            Task { @MainActor in
                guard let self else { return }
                if let network {
                    self.wifi.ssid = network.ssid.isEmpty ? nil : network.ssid
                    self.wifi.bssid = network.bssid.isEmpty ? nil : network.bssid
                    self.wifi.updatedAt = Date()
                } else {
                    self.loadCaptiveNetworkFallback()
                }
            }
        }
    }

    private func loadCaptiveNetworkFallback() {
        guard let interfaces = CNCopySupportedInterfaces() as? [String] else { return }
        for interface in interfaces {
            guard let info = CNCopyCurrentNetworkInfo(interface as CFString) as? [String: Any] else { continue }
            wifi.ssid = info[kCNNetworkInfoKeySSID as String] as? String
            wifi.bssid = info[kCNNetworkInfoKeyBSSID as String] as? String
            wifi.updatedAt = Date()
            break
        }
    }
}

extension NetworkEnvironmentMonitor: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            requestSSIDAccessIfNeeded()
        }
    }
}
