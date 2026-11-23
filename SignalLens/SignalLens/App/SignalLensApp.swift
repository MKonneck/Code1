import SwiftUI

@main
struct SignalLensApp: App {
    @StateObject private var environment = RadioEnvironment()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(environment)
                .preferredColorScheme(.light)
        }
    }
}
