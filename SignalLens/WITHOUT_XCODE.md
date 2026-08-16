# Running without Xcode

You do **not** need the full Xcode IDE to try SignalLens. Options:

## 1. Swift Playgrounds (easiest — no Mac Xcode)

Use the App Playground package:

`SignalLens/SignalLens.swiftpm`

1. Install **[Swift Playgrounds](https://apps.apple.com/app/swift-playgrounds/id1496833156)** on an **iPad** (or Mac)
2. Copy / AirDrop / clone this folder onto the device
3. Open `SignalLens.swiftpm` in Swift Playgrounds
4. Tap **Run** — allow Bluetooth and Location when asked

Notes:
- Best on a real iPad/iPhone-class device with Bluetooth radios
- Playgrounds can run the app on the iPad itself
- Getting a signed install onto a separate iPhone still needs Apple Developer signing (Playgrounds “App Store Connect” upload, or a Mac build)

## 2. Cloud build → TestFlight (no Xcode on your machine)

Services like **Codemagic**, **GitHub Actions (macOS runner)**, or **Xcode Cloud** compile with Xcode **in the cloud**, then you install via TestFlight. You never open Xcode locally, but Apple’s build tools still run remotely.

## 3. What does *not* work on iPhone

| Approach | Why not |
|----------|---------|
| Website / PWA | iOS Safari has **no Web Bluetooth** for ambient BLE scanning |
| Expo Go / generic RN client | Needs a custom native build for this BLE + Wi‑Fi path tooling |
| Sideloading random IPAs | Still requires Apple code signing / developer account |

## Bottom line

- **No Xcode on your computer:** use **`SignalLens.swiftpm` in Swift Playgrounds**
- **Install on iPhone long-term:** still need Apple signing (Playgrounds → App Store Connect, or a cloud Mac build + TestFlight)
