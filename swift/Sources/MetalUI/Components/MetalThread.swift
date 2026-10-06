import SwiftUI

// Thread: a conversation that scrolls, newest at the foot. Mirrors components/thread (thread.agent.md)
// from the thread recipe:
//   open      starts at the foot
//   pinned    while within the follow slop of the foot, it follows its content as it grows
//   away      scrolled up, it stays put; Jump to latest rises at the trailing edge from one nest below
//   jump      Jump to latest scrolls to the foot on the settle spring and follows again
//   pinKey    changes when the person sends: back to the foot, following
//   grouped   a grouped MetalMessage pulls up to the group gap
// Arrival: insert messages inside `withMetalAnimation(.object)`; they rise one nest from below.
// Reduce Motion: Jump to latest jumps and only fades.

/// A conversation that stays with the newest message while you are there, and lets you read back.
public struct MetalThread<Content: View>: View {
    let label: String
    let pinKey: AnyHashable?
    let jumpLabel: String
    let content: Content
    @State private var pinned = true
    @State private var away = false
    @State private var height: Double = .zero
    @State private var viewport: Double = .zero
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `pinKey`: change it when the person sends (their newest message's id).
    public init(label: String = "Conversation", pinKey: AnyHashable? = nil, jumpLabel: String = "Jump to latest",
                @ViewBuilder content: () -> Content) {
        self.label = label
        self.pinKey = pinKey
        self.jumpLabel = jumpLabel
        self.content = content()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.thread }
    private let foot = "metal-thread-foot"
    private let space = "metal-thread"

    public var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
                    content
                }
                .environment(\.metalThreadGroupPull, recipe.points("self.gap") - recipe.points("self.group-gap"))
                .padding(.horizontal, recipe.points("self.pad-x"))
                .padding(.vertical, recipe.points("self.pad-y"))
                .background(GeometryReader { g in
                    Color.clear.preference(key: MetalThreadContentKey.self, value: g.frame(in: .named(space)))
                })
                Color.clear.frame(height: .zero).id(foot)
            }
            .coordinateSpace(name: space)
            .background(GeometryReader { g in
                Color.clear
                    .onAppear { viewport = g.size.height }
                    .onChange(of: g.size.height) { _, h in viewport = h }
            })
            .onPreferenceChange(MetalThreadContentKey.self) { frame in
                let grew = frame.height != height
                height = frame.height
                let atFoot = frame.maxY - viewport <= recipe.points("self.follow")
                if grew && pinned {
                    proxy.scrollTo(foot, anchor: .bottom)
                } else if !grew {
                    pinned = atFoot
                    if away == atFoot { withMetalAnimation(.settle, reduceMotion: reduceMotion) { away = !atFoot } }
                }
            }
            .onAppear { proxy.scrollTo(foot, anchor: .bottom) }
            .onChange(of: pinKey) { _, _ in
                pinned = true
                away = false
                proxy.scrollTo(foot, anchor: .bottom)
            }
            .overlay(alignment: .bottomTrailing) {
                if away {
                    MetalButton(jumpLabel, icon: .chevron, size: .compact) {
                        pinned = true
                        withMetalAnimation(.settle, reduceMotion: reduceMotion) {
                            away = false
                            proxy.scrollTo(foot, anchor: .bottom)
                        }
                    }
                    .padding(.trailing, recipe.points("self.pad-x"))
                    .padding(.bottom, recipe.points("jump.inset"))
                    .transition(reduceMotion ? .opacity : .offset(y: MetalRadius.nest).combined(with: .opacity))
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }
}

private struct MetalThreadContentKey: PreferenceKey {
    static let defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) { value = nextValue() }
}
