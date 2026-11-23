// swift-tools-version: 5.9

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "SignalLens",
    platforms: [
        .iOS("17.0")
    ],
    products: [
        .iOSApplication(
            name: "SignalLens",
            targets: ["AppModule"],
            bundleIdentifier: "com.signallens.app",
            displayVersion: "1.0",
            bundleVersion: "1",
            appIcon: .asset("AppIcon"),
            accentColor: .asset("AccentColor"),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight(.when(deviceFamilies: [.pad])),
                .landscapeLeft(.when(deviceFamilies: [.pad])),
                .portraitUpsideDown(.when(deviceFamilies: [.pad]))
            ],
            capabilities: [
                .bluetoothAlways(
                    purposeString: "SignalLens scans nearby Bluetooth LE devices and signal strength to help you find local sources of wireless congestion."
                ),
                .locationWhenInUse(
                    purposeString: "Location access is required by iOS to show the name of the Wi‑Fi network you are currently joined to."
                ),
                .outgoingNetworkConnections(),
                .localNetwork(
                    purposeString: "SignalLens probes network reachability to help diagnose connection quality issues.",
                    bonjourServiceTypes: []
                )
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "App",
            resources: [
                .process("Assets.xcassets")
            ]
        )
    ]
)
