import SwiftUI

// LED and status badge painted from the generated status recipe.

/// What an LED says.
public enum MetalLEDKind: Sendable {
    case live, waiting, failed, link, off

    var recipeState: String {
        switch self {
        case .live: return "live"
        case .waiting: return "waiting"
        case .failed: return "failed"
        case .link: return "link"
        case .off: return "off"
        }
    }
}

/// A tiny lamp in a small sunk socket, lit from the top left. Decorative: pair it with words.
///
/// The dark bezel and the light lip under it give the lamp its own ground on any surface; a lit lamp
/// glows in its ink, an off lamp is a dull lens. `gesture` is how it behaves over time (steady,
/// flicker, breathe, blink2, rise; tokens status.gestures). A new gesture plays from the start;
/// Reduce Motion holds the lamp lit at its final level.
public struct MetalLED: View {
    public enum Size: Sendable { case `default`, small }
    let kind: MetalLEDKind
    let size: Size
    let diameter: CGFloat?
    let gesture: MetalLampGesture
    /// A fixed point in the gesture (0–1), for captures; nil plays it in time.
    let phase: Double?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()

    public init(_ kind: MetalLEDKind, size: Size = .default, diameter: CGFloat? = nil, gesture: MetalLampGesture = .steady, phase: Double? = nil) {
        self.kind = kind
        self.size = size
        self.diameter = diameter
        self.gesture = gesture
        self.phase = phase
    }

    /// The lamp's level (0 dark lens … 1 lit) at a point in the gesture.
    static func level(_ gesture: MetalLampGesture, at progress: Double) -> Double {
        let keys = gesture.keys, p = min(1, max(0, progress))
        guard let hi = keys.firstIndex(where: { $0.0 >= p }), hi > 0 else { return keys.first?.1 ?? 1 }
        let (t0, l0) = keys[hi - 1], (t1, l1) = keys[hi]
        var f = t1 > t0 ? (p - t0) / (t1 - t0) : 1
        if gesture.eased { f = f * f * (3 - 2 * f) }
        return l0 + (l1 - l0) * f
    }

    /// A dimmed lamp's saturation and brightness: the web's saturate() and brightness() at this level,
    /// applied to the whole lamp (socket and halo too), as the web's filter is.
    static func saturation(at level: Double) -> Double { MetalLampDim.saturate + (1 - MetalLampDim.saturate) * level }
    static func brightness(at level: Double) -> Double { MetalLampDim.brightness + (1 - MetalLampDim.brightness) * level }

    public var body: some View {
        let recipe = MetalRecipes.status
        let d = diameter ?? recipe.points(size == .small ? "led.size-small" : "led.size")
        let still = gesture.duration == 0 || reduceMotion
        TimelineView(.animation(paused: still || phase != nil)) { context in
            // Reduce Motion (and steady) hold the final level, lit, as the web's animate-none does.
            let level: Double = {
                if let phase { return Self.level(gesture, at: phase) }
                if still { return 1 }
                let t = context.date.timeIntervalSince(start) / gesture.duration
                return Self.level(gesture, at: gesture.loops ? t.truncatingRemainder(dividingBy: 1) : min(1, t))
            }()
            Color.clear
                .frame(width: d, height: d)
                .metalObjectRecipe(recipe, part: "led", state: kind.recipeState, in: Circle())
                .saturation(Self.saturation(at: level))
                .colorMultiply(Color(white: Self.brightness(at: level)))
        }
        .id("\(kind.recipeState)-\(gesture.rawValue)")
        .onChange(of: gesture) { start = Date() }
        .onChange(of: kind.recipeState) { start = Date() }
        .accessibilityHidden(true)
    }
}

/// How a status badge is drawn: a raised plate (default), the lamp and words alone (quiet, for dense
/// places), or a plate tinted in the state's ink (strong, for one alert).
public enum MetalStatusTone: Sendable { case plate, quiet, strong }

/// A state the system is in, with its LED. Not a button; the hint is its help.
///
/// Never colour alone: each state also has its own gesture (live steady, waiting breathing, failed two
/// blinks, off dark) and the words say it. `solid` is transparent mode (frost, glass, an image): the
/// plate keeps a keyline and a quiet badge takes its plate back. Reduce Transparency turns it on.
public struct MetalStatusBadge: View {
    let text: String
    let led: MetalLEDKind
    let hint: String?
    let tone: MetalStatusTone
    let solid: Bool
    let gesture: MetalLampGesture?
    let phase: Double?
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    /// `gesture` nil plays the state's own; `phase` fixes the lamp at a point in it, for captures.
    public init(_ text: String, led: MetalLEDKind, hint: String? = nil, tone: MetalStatusTone = .plate, solid: Bool = false, gesture: MetalLampGesture? = nil, phase: Double? = nil) {
        self.text = text
        self.led = led
        self.hint = hint
        self.tone = tone
        self.solid = solid
        self.gesture = gesture
        self.phase = phase
    }

    /// Each state's own gesture, so a state never rests on colour alone.
    static func gesture(for kind: MetalLEDKind) -> MetalLampGesture {
        switch kind {
        case .waiting: return .breathe
        case .failed: return .blink2
        case .live, .link, .off: return .steady
        }
    }

    public var body: some View {
        let recipe = MetalRecipes.status
        let cw = MetalRecipeColorway(colorway)
        let keyline = solid || reduceTransparency
        let plated = tone != .quiet || keyline
        let strong = tone == .strong && led != .off
        let ink = strong ? recipe.color("strong.ink-\(led.recipeState)", colorway: cw) : nil
        HStack(spacing: recipe.points("badge.gap")) {
            MetalLED(led, gesture: gesture ?? Self.gesture(for: led), phase: phase)
            Text(text.uppercased())
                .font(recipe.font("badge.font"))
                .tracking(recipe.tracking("badge.tracking", size: recipe.fontSize("badge.font")))
                .foregroundColor(ink?.color ?? colorway.tokens.ink2.color)
        }
        .padding(.horizontal, plated ? recipe.points("badge.pad") : .zero)
        .frame(height: recipe.points("badge.height"))
        // a quiet badge paints no part: the recipe has no "none" layers
        .metalObjectRecipe(recipe, part: plated ? "badge" : "none", state: strong ? "strong-\(led.recipeState)" : nil, in: Capsule(style: .continuous))
        .overlay {
            if keyline, let line = recipe.color("badge.keyline", colorway: cw) {
                Capsule(style: .continuous).strokeBorder(line.color, lineWidth: 1)
            }
        }
        .fixedSize()
        .help(hint ?? "")
        .accessibilityElement(children: .combine)
        .accessibilityHint(hint ?? "")
    }
}
