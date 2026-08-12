import SwiftUI

struct BluetoothRadarView: View {
    @EnvironmentObject private var environment: RadioEnvironment
    @State private var pulse = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    radar
                    deviceList
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .navigationTitle("Bluetooth")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(environment.bluetooth.isScanning ? "Pause" : "Scan") {
                        environment.bluetooth.toggle()
                    }
                }
            }
        }
    }

    private var header: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 10) {
                Text(environment.bluetooth.stateMessage)
                    .font(.system(.headline, design: .rounded))
                    .foregroundStyle(SLTheme.ink)
                Text("Each row is a BLE advertiser. Stronger RSSI usually means closer or higher transmit power — useful for spotting local interference sources.")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(SLTheme.slate)
                HStack {
                    Label("\(environment.stats.bluetoothDeviceCount) devices", systemImage: "wave.3.right")
                    Spacer()
                    Label("\(environment.stats.strongBluetoothCount) strong", systemImage: "bolt.horizontal")
                }
                .font(.system(.caption, design: .rounded).weight(.semibold))
                .foregroundStyle(SLTheme.seaDeep)
            }
        }
    }

    private var radar: some View {
        SoftPanel {
            ZStack {
                Circle()
                    .stroke(SLTheme.sea.opacity(0.15), lineWidth: 1)
                    .frame(width: 220, height: 220)
                Circle()
                    .stroke(SLTheme.sea.opacity(0.12), lineWidth: 1)
                    .frame(width: 150, height: 150)
                Circle()
                    .stroke(SLTheme.sea.opacity(0.10), lineWidth: 1)
                    .frame(width: 80, height: 80)

                Circle()
                    .fill(SLTheme.sea.opacity(0.18))
                    .frame(width: pulse ? 70 : 40, height: pulse ? 70 : 40)
                    .animation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true), value: pulse)

                ForEach(Array(environment.bluetooth.devices.prefix(18).enumerated()), id: \.element.id) { index, device in
                    let angle = Double(index) / Double(max(environment.bluetooth.devices.prefix(18).count, 1)) * 2 * Double.pi
                    let radius = radarRadius(for: device.rssi)
                    Circle()
                        .fill(SLTheme.qualityColor(device.signalQuality))
                        .frame(width: 10, height: 10)
                        .offset(x: cos(angle) * radius, y: sin(angle) * radius)
                        .opacity(0.85)
                }

                VStack(spacing: 2) {
                    Text("YOU")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(SLTheme.seaDeep)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 240)
            .onAppear { pulse = true }
        }
    }

    private var deviceList: some View {
        SoftPanel {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Ambient devices", subtitle: "Sorted by signal strength")

                if environment.bluetooth.devices.isEmpty {
                    Text("Listening…")
                        .foregroundStyle(SLTheme.slate)
                } else {
                    ForEach(environment.bluetooth.devices) { device in
                        BluetoothRow(device: device, compact: false)
                        if device.id != environment.bluetooth.devices.last?.id {
                            Divider().opacity(0.3)
                        }
                    }
                }
            }
        }
    }

    private func radarRadius(for rssi: Int) -> CGFloat {
        // Map RSSI (-40…-100) into ring distance
        let clamped = min(max(Double(rssi), -100), -35)
        let normalized = (clamped + 100) / 65 // 0 far-ish ... 1 near
        return CGFloat(30 + (1 - normalized) * 90)
    }
}

struct BluetoothRow: View {
    let device: BluetoothDeviceReading
    var compact: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 6 : 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(device.displayName)
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .foregroundStyle(SLTheme.ink)
                    .lineLimit(1)
                Spacer()
                Text("\(device.rssi) dBm")
                    .font(.system(.subheadline, design: .rounded).monospacedDigit().weight(.medium))
                    .foregroundStyle(SLTheme.qualityColor(device.signalQuality))
            }

            SignalMeter(
                value: rssiNormalized,
                color: SLTheme.qualityColor(device.signalQuality)
            )

            if !compact {
                HStack(spacing: 8) {
                    Text(device.signalQuality.label)
                        .font(.system(.caption, design: .rounded).weight(.semibold))
                        .foregroundStyle(SLTheme.qualityColor(device.signalQuality))
                    if device.isConnectable {
                        Text("Connectable")
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(SLTheme.slate)
                    }
                    Spacer()
                    Text(device.lastSeen, style: .time)
                        .font(.system(.caption2, design: .rounded))
                        .foregroundStyle(SLTheme.slate)
                }

                if !device.advertisementData.isEmpty {
                    ForEach(device.advertisementData.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                        Text("\(key): \(value)")
                            .font(.system(.caption2, design: .rounded))
                            .foregroundStyle(SLTheme.slate)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var rssiNormalized: Double {
        let clamped = min(max(Double(device.rssi), -100), -40)
        return (clamped + 100) / 60
    }
}
