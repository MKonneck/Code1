import Foundation
import CoreBluetooth
import Network

struct BluetoothDeviceReading: Identifiable, Hashable {
    let id: UUID
    var name: String
    var rssi: Int
    var advertisementData: [String: String]
    var lastSeen: Date
    var isConnectable: Bool

    var signalQuality: SignalQuality {
        SignalQuality.fromBluetoothRSSI(rssi)
    }

    var displayName: String {
        name.isEmpty ? "Unknown device" : name
    }
}

enum SignalQuality: String, CaseIterable {
    case excellent
    case good
    case fair
    case weak
    case none

    var label: String {
        switch self {
        case .excellent: return "Excellent"
        case .good: return "Good"
        case .fair: return "Fair"
        case .weak: return "Weak"
        case .none: return "None"
        }
    }

    var rank: Int {
        switch self {
        case .excellent: return 4
        case .good: return 3
        case .fair: return 2
        case .weak: return 1
        case .none: return 0
        }
    }

    static func fromBluetoothRSSI(_ rssi: Int) -> SignalQuality {
        switch rssi {
        case (-50)...0: return .excellent
        case (-65)...(-51): return .good
        case (-75)...(-66): return .fair
        case (-90)...(-76): return .weak
        default: return .none
        }
    }
}

struct WiFiSnapshot: Equatable {
    var ssid: String?
    var bssid: String?
    var isConnected: Bool
    var usesWiFi: Bool
    var isExpensive: Bool
    var isConstrained: Bool
    var supportsIPv4: Bool
    var supportsIPv6: Bool
    var interfaceName: String?
    var updatedAt: Date

    static let empty = WiFiSnapshot(
        ssid: nil,
        bssid: nil,
        isConnected: false,
        usesWiFi: false,
        isExpensive: false,
        isConstrained: false,
        supportsIPv4: false,
        supportsIPv6: false,
        interfaceName: nil,
        updatedAt: .distantPast
    )
}

struct LatencySample: Identifiable, Equatable {
    let id = UUID()
    let target: String
    let milliseconds: Double?
    let succeeded: Bool
    let timestamp: Date
    let note: String?
}

struct DiagnosticInsight: Identifiable, Equatable {
    var id: String { "\(category.rawValue)-\(title)" }
    let severity: Severity
    let title: String
    let detail: String
    let category: Category

    enum Severity: String {
        case info
        case caution
        case alert

        var label: String {
            switch self {
            case .info: return "Info"
            case .caution: return "Caution"
            case .alert: return "Alert"
            }
        }
    }

    enum Category: String {
        case bluetooth
        case wifi
        case network
        case general
    }
}

struct ScanStats: Equatable {
    var bluetoothDeviceCount: Int = 0
    var strongBluetoothCount: Int = 0
    var averageBluetoothRSSI: Double?
    var lastBluetoothUpdate: Date?
    var latencyAverageMs: Double?
    var latencyJitterMs: Double?
    var packetSuccessRate: Double?
}
