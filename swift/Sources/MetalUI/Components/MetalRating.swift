import AppKit
import SwiftUI

// Rating: how good something is, on a short scale. Mirrors components/rating (rating.agent.md) from the
// rating recipe, on borrowed looks: the well's track (a detent) and the slider's fill (lit).
//   read-only  the detents filled to the value; a decimal fills that share of its detent, cut square;
//              the value beside them in the figure type, the count in ink3
//   hover      the detents a press would change at the ghost of their lit look; the readout says the
//              value under the pointer (or the empty label over the chosen one: a press there clears)
//   press      the detent dips on the part spring and latches
//   change     the run sweeps from its old edge, one detent at a time (the meter's stagger and fade)
//   keys       ← → set the value; Delete clears; VoiceOver adjusts it
//   disabled   40 %
// Reduce Motion: detents change at once and don't dip; the readout crossfades.

/// The rating's sizes: the detent and the row height its hit area takes (tokens.json `recipes.rating.props`).
public enum MetalRatingSize: String, CaseIterable, Sendable {
    case compact
    case regular
    case large
}

/// How good something is, on a short scale: detents you read at a glance, or press to rate.
public struct MetalRating: View {
    private let value: Binding<Int?>?
    private let rating: Double?
    private let max: Int
    private let count: Int?
    private let labels: [String]
    private let emptyLabel: String
    private let showsValue: Bool
    private let size: MetalRatingSize
    private let label: String

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @FocusState private var focused: Bool
    @State private var keyboardFocus = false
    @State private var hover: Int?
    /// The lit run before the latest change: the sweep starts from its edge.
    @State private var from = 0

    /// Editable: `value` is 1…`max`, or nil for none. `labels` gives each point a word for the readout.
    public init(value: Binding<Int?>, max: Int = 5, labels: [String] = [], emptyLabel: String = "Not rated",
                showsValue: Bool = true, size: MetalRatingSize = .regular, label: String) {
        self.value = value
        self.rating = nil
        self.max = max
        self.count = nil
        self.labels = labels
        self.emptyLabel = emptyLabel
        self.showsValue = showsValue
        self.size = size
        self.label = label
        self._from = State(initialValue: value.wrappedValue ?? .zero)
    }

    /// Read-only: any decimal `rating` (nil for none), and how many ratings it averages.
    public init(rating: Double?, max: Int = 5, count: Int? = nil, emptyLabel: String = "Not rated",
                showsValue: Bool = true, size: MetalRatingSize = .regular, label: String = "Rating") {
        self.value = nil
        self.rating = rating
        self.max = max
        self.count = count
        self.labels = []
        self.emptyLabel = emptyLabel
        self.showsValue = showsValue
        self.size = size
        self.label = label
        self._from = State(initialValue: Int((rating ?? .zero).rounded(.up)))
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.rating }
    private func metric(_ key: String) -> CGFloat { recipe.points("\(size.rawValue).\(key)") }

    /// The value shown: the rating, or the bound value, clamped to the scale.
    private var whole: Double { min(Double(max), Swift.max(.zero, rating ?? value?.wrappedValue.map(Double.init) ?? .zero)) }
    private var isEmpty: Bool { value == nil ? rating == nil : value?.wrappedValue == nil }
    /// Hovering a detent: what a press there would set (the chosen one clears).
    private var target: Int {
        let current = Int(whole)
        guard let hover else { return current }
        return hover == current ? .zero : hover
    }
    private var lit: Int { Int(whole.rounded(.up)) }

    public var body: some View {
        HStack(spacing: metric("gap")) {
            detents
            if showsValue || count != nil { readout }
        }
        .opacity(isEnabled ? .one : recipe.scalar("self.disabled"))
        .onChange(of: lit) { old, _ in from = old }
        .modifier(MetalRatingAccess(editable: value != nil, label: label, said: said, set: set, max: max,
                                    current: value?.wrappedValue))
        .modifier(MetalRatingKeys(editable: value != nil, focused: $focused, keyboardFocus: $keyboardFocus,
                                  current: value?.wrappedValue, max: max, set: set))
    }

    private var said: String {
        if isEmpty { return emptyLabel }
        if value != nil {
            let v = Int(whole)
            return labels.indices.contains(v - 1) ? "\(v) of \(max), \(labels[v - 1])" : "\(v) of \(max)"
        }
        let ratings = count.map { ", \($0.formatted()) ratings" } ?? ""
        return "\(whole.formatted(.number.precision(.fractionLength(1)))) out of \(max)\(ratings)"
    }

    private func set(_ next: Int?) {
        withMetalAnimation(.part, reduceMotion: reduceMotion) { value?.wrappedValue = next }
    }

    private var detents: some View {
        HStack(spacing: .zero) {
            ForEach(0..<max, id: \.self) { i in
                if value != nil {
                    Button { set(i + 1 == Int(whole) && !isEmpty ? nil : i + 1); hover = nil } label: { cell(i) }
                        .buttonStyle(MetalRatingPress(scale: recipe.scalar("press.scale")))
                        .onHover { inside in
                            if inside { hover = i + 1 } else if hover == i + 1 { hover = nil }
                        }
                } else {
                    cell(i)
                }
            }
        }
    }

    private func cell(_ i: Int) -> some View {
        let isLit = Double(i) < whole
        let after = i < target
        let ghost = hover != nil && isLit != after
        let share = value == nil ? min(.one, Swift.max(.zero, whole - Double(i))) : (isLit || after ? .one : .zero)
        let step = hover == nil ? Swift.max(0, lit >= from ? i - from : from - 1 - i) : 0
        let fade = MetalRecipes.meter.durationSeconds("lamp.fade")
        let stagger = MetalRecipes.meter.durationSeconds("lamp.stagger")
        let capsule = Capsule(style: .continuous)
        return ZStack(alignment: .leading) {
            Color.clear.metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: capsule)
            Color.clear.metalObjectRecipe(MetalRecipes.slider, part: "fill", in: capsule)
                // Cut square at the share, so a part-lit detent's rounded end isn't squashed.
                .mask(alignment: .leading) {
                    GeometryReader { box in Rectangle().frame(width: box.size.width * share) }
                }
                .opacity(share > .zero ? (ghost ? recipe.scalar("ghost.opacity") : .one) : .zero)
                .animation(reduceMotion ? nil : .easeOut(duration: fade).delay(Double(step) * stagger), value: share > .zero && !ghost)
                .animation(reduceMotion ? nil : .easeOut(duration: fade), value: ghost)
            if focused && keyboardFocus && i + 1 == Swift.max(1, Int(whole)) {
                capsule
                    .inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2))
                    .stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
            }
        }
        .frame(width: metric("width"), height: metric("height"))
        .padding(.horizontal, metric("pad"))
        .frame(height: metric("row"))
        .contentShape(Rectangle())
    }

    private var readout: some View {
        let t = colorway.tokens
        let shown: String = {
            if value != nil { return target == .zero ? emptyLabel : labels.indices.contains(target - 1) ? labels[target - 1] : "\(target)" }
            return isEmpty ? emptyLabel : whole.formatted(.number.precision(.fractionLength(1)))
        }()
        // Editable, the readout keeps the width of its widest word, so the detents never move as it turns.
        let words = value == nil ? [] : [emptyLabel] + (1...Swift.max(1, max)).map { labels.indices.contains($0 - 1) ? labels[$0 - 1] : "\($0)" }
        return HStack(alignment: .firstTextBaseline, spacing: recipe.points("count.gap")) {
            ZStack(alignment: .leading) {
                ForEach(words.indices, id: \.self) { Text(words[$0]).hidden() }
                Text(shown)
                .font(.metal(MetalType.figure))
                .monospacedDigit()
                .foregroundColor(t.ink.color)
                .contentTransition(reduceMotion ? .opacity : .numericText())
                .metalAnimation(.settle, value: shown)
            }
            .font(.metal(MetalType.figure))
            .monospacedDigit()
            if let count {
                Text("(\(count.formatted()))").font(.metal(MetalType.meta)).foregroundColor(t.ink3.color)
            }
        }
        .fixedSize()
        .accessibilityHidden(true)
    }
}

/// A detent dips while pressed, on the part spring (at once under Reduce Motion).
private struct MetalRatingPress: ButtonStyle {
    let scale: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? scale : .one)
            .metalAnimation(.part, value: configuration.isPressed)
    }
}

/// One element for VoiceOver: the label and the sentence; editable, it adjusts the value.
private struct MetalRatingAccess: ViewModifier {
    let editable: Bool
    let label: String
    let said: String
    let set: (Int?) -> Void
    let max: Int
    let current: Int?

    func body(content: Content) -> some View {
        if editable {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(label)
                .accessibilityValue(said)
                .accessibilityAdjustableAction { direction in
                    switch direction {
                    case .increment: set(min(max, (current ?? .zero) + 1))
                    case .decrement: set((current ?? .zero) > 1 ? (current ?? .zero) - 1 : nil)
                    @unknown default: break
                    }
                }
        } else {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(label)
                .accessibilityValue(said)
                .accessibilityAddTraits(.isImage)
        }
    }
}

/// The keys of an editable rating: ← → set the value, Delete clears it. Focus by keyboard only.
private struct MetalRatingKeys: ViewModifier {
    let editable: Bool
    @FocusState.Binding var focused: Bool
    @Binding var keyboardFocus: Bool
    let current: Int?
    let max: Int
    let set: (Int?) -> Void

    func body(content: Content) -> some View {
        if editable {
            content
                .focusable(interactions: .activate)
                .focusEffectDisabled()
                .focused($focused)
                .onChange(of: focused) { _, isFocused in
                    keyboardFocus = isFocused && NSApp.currentEvent?.type == .keyDown
                }
                .onKeyPress(.leftArrow) { keyboardFocus = true; set(Swift.max(1, (current ?? 1) - 1)); return .handled }
                .onKeyPress(.rightArrow) { keyboardFocus = true; set(min(max, (current ?? .zero) + 1)); return .handled }
                .onKeyPress(.delete) { set(nil); return .handled }
                .onKeyPress(.deleteForward) { set(nil); return .handled }
        } else {
            content
        }
    }
}
