import SwiftUI

struct RootView: View {
    @EnvironmentObject private var environment: RadioEnvironment
    @State private var tab: Tab = .overview

    enum Tab: Hashable {
        case overview
        case bluetooth
        case network
        case insights
    }

    var body: some View {
        ZStack {
            AtmosphereBackground()

            TabView(selection: $tab) {
                OverviewView()
                    .tabItem { Label("Overview", systemImage: "dot.radiowaves.left.and.right") }
                    .tag(Tab.overview)

                BluetoothRadarView()
                    .tabItem { Label("Bluetooth", systemImage: "antenna.radiowaves.left.and.right") }
                    .tag(Tab.bluetooth)

                NetworkLabView()
                    .tabItem { Label("Network", systemImage: "wifi") }
                    .tag(Tab.network)

                InsightsView()
                    .tabItem { Label("Insights", systemImage: "lightbulb.max") }
                    .tag(Tab.insights)
            }
            .tint(SLTheme.sea)
        }
        .onAppear {
            environment.start()
        }
    }
}
