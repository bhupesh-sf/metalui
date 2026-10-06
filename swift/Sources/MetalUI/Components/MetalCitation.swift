import SwiftUI

// Citation: where an answer's words came from. Mirrors components/citation (citation.agent.md) from the
// citation recipe:
//   mark      the source's number on the link cue's host pill (MetalCueURLPill's look), meta type; it
//             opens the source; a steady hover (the preview card's delay) shows MetalPreviewCard
//   sources   MetalCitationSources: one collapsible row ("4 sources"), folded by default; open, each
//             source with its number, its title as a quiet external MetalLink and its host in ink3
// Reduce Motion: the card and the fold crossfade.

public struct MetalCitationSource: Sendable {
    public let url: URL
    public let title: String
    public let description: String?
    public let host: String?

    /// `host` defaults to the URL's host without "www.".
    public init(url: URL, title: String, description: String? = nil, host: String? = nil) {
        self.url = url
        self.title = title
        self.description = description
        self.host = host ?? url.host().map { $0.hasPrefix("www.") ? String($0.dropFirst(4)) : $0 }
    }
}

/// The number on the link cue's pill.
private struct MetalCitationPill: View {
    let n: Int
    let hovering: Bool
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let recipe = MetalRecipes.citation
        Text("\(n)")
            .font(.metal(MetalType.meta)).monospacedDigit()
            .foregroundColor(colorway.tokens.cueUrlInk.color)
            .padding(.horizontal, recipe.points("mark.pad-x"))
            .frame(minWidth: recipe.points("mark.min-width"), minHeight: MetalCue.urlHeight)
            .metalRecipe(MetalRecipe(fill: .solid(hovering ? MetalCue.urlBgHover : MetalCue.urlBg), shadows: MetalCue.urlRing), in: Capsule(style: .continuous))
    }
}

/// A numbered mark in the text: opens the source, and previews it after a steady hover.
public struct MetalCitation: View {
    let n: Int
    let source: MetalCitationSource
    @State private var hovering = false
    @State private var previewing = false
    @State private var dwell: Task<Void, Never>?
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ n: Int, source: MetalCitationSource) {
        self.n = n
        self.source = source
    }

    public var body: some View {
        Button { openURL(source.url) } label: { MetalCitationPill(n: n, hovering: hovering) }
            .buttonStyle(.plain)
            .metalAnimation(.settle, value: hovering)
            .onHover { inside in
                hovering = inside
                dwell?.cancel()
                guard inside else { previewing = false; return }
                dwell = Task { @MainActor in
                    try? await Task.sleep(nanoseconds: UInt64(MetalRecipes.previewCard.points("self.delay") * 1_000_000))
                    guard !Task.isCancelled else { return }
                    previewing = true
                }
            }
            .popover(isPresented: $previewing, arrowEdge: .bottom) {
                MetalPreviewCard(source.title, description: source.description, host: source.host)
            }
            .accessibilityLabel("Source \(n): \(source.title)")
            .accessibilityAddTraits(.isLink)
    }
}

/// The sources under an answer, folded under one row: "4 sources".
public struct MetalCitationSources: View {
    let sources: [MetalCitationSource]
    let label: String?
    @State private var isOpen: Bool
    @Environment(\.metalColorway) private var colorway

    /// In the order of their numbers: the first is 1.
    public init(_ sources: [MetalCitationSource], label: String? = nil, isOpen: Bool = false) {
        self.sources = sources
        self.label = label
        _isOpen = State(initialValue: isOpen)
    }

    public var body: some View {
        let recipe = MetalRecipes.citation
        let words = label ?? "\(sources.count) \(sources.count == 1 ? "source" : "sources")"
        VStack(alignment: .leading, spacing: .zero) {
            MetalCollapsibleRow(isOpen: $isOpen) { Text(words) }
            MetalCollapsiblePanel(isOpen: isOpen) {
                VStack(alignment: .leading, spacing: recipe.points("list.gap")) {
                    ForEach(Array(sources.enumerated()), id: \.offset) { i, s in
                        HStack(spacing: recipe.points("list.number-gap")) {
                            MetalCitationPill(n: i + 1, hovering: false).accessibilityHidden(true)
                            MetalLink(s.title, destination: s.url, kind: .quiet, external: true).lineLimit(1)
                            if let host = s.host {
                                Text(host).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color)
                            }
                        }
                    }
                }
                .padding(.vertical, recipe.points("list.pad-y"))
            }
        }
        .accessibilityElement(children: .contain)
    }
}
