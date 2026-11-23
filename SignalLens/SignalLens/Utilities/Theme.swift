import SwiftUI

enum SLTheme {
    static let ink = Color(red: 0.10, green: 0.16, blue: 0.20)
    static let mist = Color(red: 0.93, green: 0.96, blue: 0.97)
    static let sea = Color(red: 0.05, green: 0.45, blue: 0.48)
    static let seaDeep = Color(red: 0.02, green: 0.28, blue: 0.32)
    static let coral = Color(red: 0.86, green: 0.35, blue: 0.22)
    static let amber = Color(red: 0.90, green: 0.62, blue: 0.18)
    static let foam = Color(red: 0.78, green: 0.90, blue: 0.88)
    static let slate = Color(red: 0.45, green: 0.52, blue: 0.55)

    static var atmosphere: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.88, green: 0.94, blue: 0.95),
                Color(red: 0.95, green: 0.96, blue: 0.94),
                Color(red: 0.86, green: 0.91, blue: 0.90)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static func qualityColor(_ quality: SignalQuality) -> Color {
        switch quality {
        case .excellent: return sea
        case .good: return Color(red: 0.20, green: 0.55, blue: 0.40)
        case .fair: return amber
        case .weak: return coral
        case .none: return slate
        }
    }

    static func severityColor(_ severity: DiagnosticInsight.Severity) -> Color {
        switch severity {
        case .info: return sea
        case .caution: return amber
        case .alert: return coral
        }
    }
}

struct AtmosphereBackground: View {
    var body: some View {
        ZStack {
            SLTheme.atmosphere
            TimelineView(.animation(minimumInterval: 1 / 30)) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    drawRipple(context: context, size: size, t: t, yFactor: 0.22, amp: 14, speed: 0.7, color: SLTheme.foam.opacity(0.35))
                    drawRipple(context: context, size: size, t: t, yFactor: 0.48, amp: 18, speed: 0.45, color: SLTheme.sea.opacity(0.08))
                    drawRipple(context: context, size: size, t: t, yFactor: 0.72, amp: 12, speed: 0.9, color: SLTheme.seaDeep.opacity(0.06))
                }
            }
            RadialGradient(
                colors: [SLTheme.sea.opacity(0.12), .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 380
            )
        }
        .ignoresSafeArea()
    }

    private func drawRipple(
        context: GraphicsContext,
        size: CGSize,
        t: TimeInterval,
        yFactor: CGFloat,
        amp: CGFloat,
        speed: Double,
        color: Color
    ) {
        var path = Path()
        let baseY = size.height * yFactor
        path.move(to: CGPoint(x: 0, y: size.height))
        path.addLine(to: CGPoint(x: 0, y: baseY))
        for x in stride(from: 0, through: size.width, by: 8) {
            let y = baseY + sin((Double(x) * 0.02) + t * speed) * amp
            path.addLine(to: CGPoint(x: x, y: y))
        }
        path.addLine(to: CGPoint(x: size.width, y: size.height))
        path.closeSubpath()
        context.fill(path, with: .color(color))
    }
}

struct SignalMeter: View {
    let value: Double // 0...1
    let color: Color

    var body: some View {
        GeometryReader { geo in
            let bars = 12
            let spacing: CGFloat = 3
            let barWidth = (geo.size.width - spacing * CGFloat(bars - 1)) / CGFloat(bars)
            HStack(alignment: .bottom, spacing: spacing) {
                ForEach(0..<bars, id: \.self) { index in
                    let threshold = Double(index + 1) / Double(bars)
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(value >= threshold - 0.001 ? color : color.opacity(0.15))
                        .frame(width: barWidth, height: geo.size.height * (0.35 + 0.65 * threshold))
                }
            }
        }
        .frame(height: 28)
        .accessibilityHidden(true)
    }
}

struct SoftPanel<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(SLTheme.sea.opacity(0.12), lineWidth: 1)
            )
    }
}

struct SectionTitle: View {
    let title: String
    let subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(.title3, design: .rounded).weight(.semibold))
                .foregroundStyle(SLTheme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(SLTheme.slate)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
