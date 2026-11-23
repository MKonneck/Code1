import Foundation
import CoreBluetooth
import Combine

@MainActor
final class BluetoothScanner: NSObject, ObservableObject {
    @Published private(set) var devices: [BluetoothDeviceReading] = []
    @Published private(set) var isScanning = false
    @Published private(set) var authorizationStatus: CBManagerAuthorization = .notDetermined
    @Published private(set) var stateMessage = "Bluetooth idle"
    @Published private(set) var congestionScore: Int = 0

    private var central: CBCentralManager!
    private var stalePurgeTimer: Timer?
    private let staleAfter: TimeInterval = 12

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil, options: [
            CBCentralManagerOptionShowPowerAlertKey: true
        ])
        authorizationStatus = CBCentralManager.authorization
    }

    func start() {
        authorizationStatus = CBCentralManager.authorization
        guard central.state == .poweredOn else {
            stateMessage = statusText(for: central.state)
            return
        }
        guard !isScanning else { return }

        isScanning = true
        stateMessage = "Scanning ambient Bluetooth…"
        central.scanForPeripherals(
            withServices: nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
        )
        stalePurgeTimer?.invalidate()
        stalePurgeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.purgeStaleDevices()
            }
        }
    }

    func stop() {
        guard isScanning else { return }
        isScanning = false
        central.stopScan()
        stalePurgeTimer?.invalidate()
        stalePurgeTimer = nil
        stateMessage = "Scan paused"
    }

    func toggle() {
        if isScanning { stop() } else { start() }
    }

    func clear() {
        devices = []
        congestionScore = 0
    }

    private func purgeStaleDevices() {
        let cutoff = Date().addingTimeInterval(-staleAfter)
        let before = devices.count
        devices.removeAll { $0.lastSeen < cutoff }
        if devices.count != before {
            recalculateCongestion()
        }
    }

    private func upsert(peripheral: CBPeripheral, rssi: NSNumber, advertisementData: [String: Any]) {
        let rssiValue = rssi.intValue
        // Ignore impossible / unavailable RSSI readings (127 is Apple's "not available")
        guard rssiValue != 127, rssiValue > -120, rssiValue < 0 else { return }

        let name = resolvedName(peripheral: peripheral, advertisementData: advertisementData)
        let connectable = (advertisementData[CBAdvertisementDataIsConnectable] as? NSNumber)?.boolValue ?? false
        let ads = readableAdvertisement(advertisementData)

        if let index = devices.firstIndex(where: { $0.id == peripheral.identifier }) {
            devices[index].name = name
            devices[index].rssi = rssiValue
            devices[index].lastSeen = Date()
            devices[index].isConnectable = connectable
            devices[index].advertisementData = ads
        } else {
            devices.append(
                BluetoothDeviceReading(
                    id: peripheral.identifier,
                    name: name,
                    rssi: rssiValue,
                    advertisementData: ads,
                    lastSeen: Date(),
                    isConnectable: connectable
                )
            )
        }

        devices.sort { lhs, rhs in
            if lhs.rssi == rhs.rssi {
                return lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
            }
            return lhs.rssi > rhs.rssi
        }
        recalculateCongestion()
    }

    private func recalculateCongestion() {
        let strong = devices.filter { $0.rssi >= -70 }.count
        let total = devices.count
        // Heuristic 0–100: more nearby BLE radios → higher 2.4 GHz contention risk
        let density = min(100, total * 6 + strong * 8)
        congestionScore = density
    }

    private func resolvedName(peripheral: CBPeripheral, advertisementData: [String: Any]) -> String {
        if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String, !localName.isEmpty {
            return localName
        }
        if let name = peripheral.name, !name.isEmpty {
            return name
        }
        return ""
    }

    private func readableAdvertisement(_ data: [String: Any]) -> [String: String] {
        var result: [String: String] = [:]
        if let services = data[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID], !services.isEmpty {
            result["Services"] = services.map(\.uuidString).joined(separator: ", ")
        }
        if let tx = data[CBAdvertisementDataTxPowerLevelKey] as? NSNumber {
            result["TX Power"] = "\(tx.intValue) dBm"
        }
        if let mfg = data[CBAdvertisementDataManufacturerDataKey] as? Data, !mfg.isEmpty {
            result["Manufacturer"] = mfg.prefix(8).map { String(format: "%02X", $0) }.joined(separator: " ")
        }
        return result
    }

    private func statusText(for state: CBManagerState) -> String {
        switch state {
        case .poweredOn: return "Bluetooth ready"
        case .poweredOff: return "Turn on Bluetooth in Settings"
        case .unauthorized: return "Allow Bluetooth access in Settings"
        case .unsupported: return "Bluetooth LE is not supported on this device"
        case .resetting: return "Bluetooth is resetting…"
        case .unknown: return "Waiting for Bluetooth…"
        @unknown default: return "Bluetooth unavailable"
        }
    }
}

extension BluetoothScanner: CBCentralManagerDelegate {
    nonisolated func centralManagerDidUpdateState(_ central: CBCentralManager) {
        Task { @MainActor in
            authorizationStatus = CBCentralManager.authorization
            stateMessage = statusText(for: central.state)
            if central.state == .poweredOn {
                // Auto-start when ready so ambient reading begins quickly
                if !isScanning {
                    start()
                }
            } else {
                isScanning = false
                central.stopScan()
            }
        }
    }

    nonisolated func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        Task { @MainActor in
            upsert(peripheral: peripheral, rssi: RSSI, advertisementData: advertisementData)
        }
    }
}
