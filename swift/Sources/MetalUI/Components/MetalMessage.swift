import SwiftUI

// Message: one turn of a conversation. Mirrors components/message (message.agent.md) from the message recipe:
//   user       the person's turn at the end, on a raised plate (raise-sm, the card radius), indented from
//              the start; a header only for a time or an avatar
//   assistant  at the start, content type on the page; a header: the name, the model after a dot, the time
//   avatar     at the turn's own side, level with the header
//   status     the header's lamp and its word: waiting (amber, breathing, "Thinking", a skeleton line while
//              there is no body yet), writing (green, "Writing"), done (off), stopped ("Stopped"), failed (red,
//              "Failed")
//   footer     under the body; insert it inside `withMetalAnimation(.settle)` and it fades in
//   grouped    the same speaker again: no header, the avatar's column kept; in a MetalThread the gap closes
//   system     centred meta words in ink2 between two engraved rules
// Arrival: insert messages inside `withMetalAnimation(.object)`; they rise one nest from below.
// Reduce Motion: messages and footers fade in place; the lamp holds steady.

public enum MetalMessageFrom: Sendable { case user, assistant, system }
public enum MetalMessageStatus: Sendable, Equatable { case waiting, writing, done, stopped, failed }

/// How far a grouped message pulls up toward the one before (set by `MetalThread`, from its recipe).
private struct MetalThreadGroupPullKey: EnvironmentKey { static let defaultValue: Double = .zero }

extension EnvironmentValues {
    var metalThreadGroupPull: Double {
        get { self[MetalThreadGroupPullKey.self] }
        set { self[MetalThreadGroupPullKey.self] = newValue }
    }
}

/// One turn of a conversation: the person's on a plate at the end, the assistant's on the page at the start.
public struct MetalMessage<Content: View, Footer: View>: View {
    let from: MetalMessageFrom
    let name: String?
    let model: String?
    let time: Date?
    let status: MetalMessageStatus?
    let avatar: MetalAvatar?
    let grouped: Bool
    let content: Content
    let footer: Footer
    @Environment(\.metalColorway) private var colorway
    @Environment(\.metalThreadGroupPull) private var pull
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ from: MetalMessageFrom, name: String? = nil, model: String? = nil, time: Date? = nil,
                status: MetalMessageStatus? = nil, avatar: MetalAvatar? = nil, grouped: Bool = false,
                @ViewBuilder content: () -> Content, @ViewBuilder footer: () -> Footer) {
        self.from = from
        self.name = name
        self.model = model
        self.time = time
        self.status = status
        self.avatar = avatar
        self.grouped = grouped
        self.content = content()
        self.footer = footer()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.message }
    private var user: Bool { from == .user }
    private var speaker: String { name ?? (user ? "You" : "Assistant") }
    private var said: String { model != nil && !user ? "\(speaker), \(model!)" : speaker }
    private var showsHeader: Bool { !grouped && (user ? (time != nil || avatar != nil) : true) }

    public var body: some View {
        Group {
            if from == .system { system } else { turn }
        }
        .padding(.top, grouped ? -pull : .zero)
        .transition(reduceMotion ? .opacity : .offset(y: MetalRadius.nest).combined(with: .opacity))
    }

    private var system: some View {
        HStack(spacing: recipe.points("system.gap")) {
            MetalRule(.horizontal).accessibilityHidden(true)
            content.font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color).fixedSize()
            MetalRule(.horizontal).accessibilityHidden(true)
        }
        .accessibilityElement(children: .combine)
    }

    private var turn: some View {
        HStack(alignment: .top, spacing: recipe.points("self.avatar-gap")) {
            if user { Spacer(minLength: recipe.points("user.indent")) }
            if !user, let avatar { side(avatar) }
            VStack(alignment: user ? .trailing : .leading, spacing: recipe.points("self.gap")) {
                if showsHeader { header }
                // As React: the skeleton holds the place only until words come; a waiting reply that already
                // has a body (a tool call, the thought so far) shows it.
                if status == .waiting && Content.self == EmptyView.self {
                    MetalSkeleton().frame(maxWidth: .infinity, alignment: .leading)
                } else if user {
                    content
                        .font(.metal(MetalType.content)).tracking(MetalType.content.trackingPoints)
                        .foregroundColor(colorway.tokens.ink.color)
                        .padding(.horizontal, recipe.points("plate.pad-x"))
                        .padding(.vertical, recipe.points("plate.pad-y"))
                        .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm",
                                           in: RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous))
                } else {
                    content
                        .font(.metal(MetalType.content)).tracking(MetalType.content.trackingPoints)
                        .foregroundColor(colorway.tokens.ink.color)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if Footer.self != EmptyView.self {
                    HStack(spacing: recipe.points("footer.gap")) { footer }
                        .transition(.opacity)
                }
            }
            .frame(maxWidth: user ? nil : .infinity, alignment: user ? .trailing : .leading)
            if user, let avatar { side(avatar) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(said)
        .accessibilityValue(status == .waiting || status == .writing ? "busy" : "")
    }

    /// The avatar's column; a grouped turn keeps it, empty.
    @ViewBuilder private func side(_ avatar: MetalAvatar) -> some View {
        let column = avatar.frame(minHeight: recipe.points("header.height")).accessibilityHidden(true)
        if grouped { column.hidden() } else { column }
    }

    private var header: some View {
        let t = colorway.tokens
        return HStack(spacing: recipe.points("header.gap")) {
            if let status {
                MetalLED(MetalMessageWords.lamp(status), size: .small, gesture: status == .waiting ? .breathe : .steady)
            }
            if !user { Text(model.map { "\(speaker) · \($0)" } ?? speaker).foregroundColor(t.ink2.color) }
            if let time {
                Text(time.formatted(date: .omitted, time: .shortened)).monospacedDigit().foregroundColor(t.ink3.color)
            }
            if let status, let word = MetalMessageWords.word(status) {
                Text(word).foregroundColor(t.ink3.color)
                    .contentTransition(.opacity)
                    .metalAnimation(.settle, value: word)
            }
        }
        .font(.metal(MetalType.meta))
        .frame(minHeight: recipe.points("header.height"))
    }
}

extension MetalMessage where Footer == EmptyView {
    public init(_ from: MetalMessageFrom, name: String? = nil, model: String? = nil, time: Date? = nil,
                status: MetalMessageStatus? = nil, avatar: MetalAvatar? = nil, grouped: Bool = false,
                @ViewBuilder content: () -> Content) {
        self.init(from, name: name, model: model, time: time, status: status, avatar: avatar, grouped: grouped,
                  content: content, footer: { EmptyView() })
    }
}

private enum MetalMessageWords {
    static func lamp(_ s: MetalMessageStatus) -> MetalLEDKind {
        switch s {
        case .waiting: return .waiting
        case .writing: return .live
        case .failed: return .failed
        case .done, .stopped: return .off
        }
    }

    static func word(_ s: MetalMessageStatus) -> String? {
        switch s {
        case .waiting: return "Thinking"
        case .writing: return "Writing"
        case .stopped: return "Stopped"
        case .failed: return "Failed"
        case .done: return nil
        }
    }
}
