# SignalLens

An iPhone app that helps you triage flaky Wi‑Fi by measuring **ambient Bluetooth LE activity**, your **current Wi‑Fi path**, and **connection latency**.

## What it does

| Area | What you get |
|------|----------------|
| **Bluetooth** | Live BLE scan with RSSI, radar view, congestion score (2.4 GHz contention proxy) |
| **Wi‑Fi** | Joined SSID/BSSID (needs Location), path status, expensive/constrained flags |
| **Network lab** | TCP probes to Apple / Cloudflare / Google with average latency, jitter, success rate |
| **Insights** | Plain-language hints about likely causes (crowded Bluetooth, high jitter, not actually on Wi‑Fi, etc.) |

## Honest limits (iOS)

Apple does **not** let normal App Store apps:

- Sweep all nearby Wi‑Fi SSIDs / channels (needs special Hotspot Helper entitlement)
- Act as a true RF spectrum analyzer

So SignalLens uses what *is* allowed: CoreBluetooth RSSI, Network path APIs, and reachability probes. That is still enough to answer questions like “is the room full of BLE radios?” and “is the internet path actually healthy?”

## Open in Xcode

1. On a Mac, open `SignalLens/SignalLens.xcodeproj`
2. Select your **Team** under Signing & Capabilities
3. Plug in an iPhone (Bluetooth scanning is limited/empty on Simulator)
4. Build & run, allow **Bluetooth** and **Location** when prompted

Minimum: **iOS 17**

## How to use it for connection issues

1. Stand where the problem happens and watch **Overview** / **Bluetooth**
2. If congestion is high or one device is extremely strong (e.g. −40 dBm), power that device down or move away and retest
3. Run **Probe net** — low success or high jitter points past “local RF only” toward router/ISP/VPN
4. Prefer **5 GHz / 6 GHz** Wi‑Fi when Bluetooth density is high on 2.4 GHz

## Project layout

```
SignalLens/
├── SignalLens.xcodeproj
└── SignalLens/
    ├── App/
    ├── Models/
    ├── Services/     # Bluetooth, Wi‑Fi path, latency, insights
    ├── Views/
    ├── Utilities/
    ├── Assets.xcassets
    └── Info.plist
```
