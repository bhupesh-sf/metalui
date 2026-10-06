import SwiftUI

// WIP: MetalAvatar is a placeholder that keeps the React API's shape (a name, an optional image). It
// draws a circle with initials over the image, not yet the raised surface, the presence LED, the photo's
// fade or the group's spread from avatar.agent.md. Web is the reference.

/// A person as a small disc. Work in progress: see avatar.agent.md.
public struct MetalAvatar: View {
    private let name: String
    private let image: Image?
    private let waiting: Bool
    @Environment(\.metalColorway) private var colorway

    /// `waiting`: a new photo is on its way; after the show delay a short arc travels round the rim.
    public init(name: String, image: Image? = nil, waiting: Bool = false) {
        self.name = name
        self.image = image
        self.waiting = waiting
    }

    private var initials: String {
        let words = name.split(separator: " ")
        return ((words.first?.first.map(String.init) ?? "") + (words.count > 1 ? words.last!.first.map(String.init) ?? "" : "")).uppercased()
    }

    public var body: some View {
        let size = MetalRecipes.avatar.points("size.regular")
        ZStack {
            Circle().fill(.quaternary)
            Text(initials).foregroundStyle(.secondary)
            image?.resizable().scaledToFill().clipShape(Circle())
        }
        .metalWaitDim(waiting)
        .frame(width: size, height: size)
        .overlay {
            if waiting {
                MetalSpinnerRim(waiting: waiting)
                    .padding(-MetalRecipes.avatar.points("ring.width"))
                    .foregroundStyle(colorway.tokens.ink2.color)
            }
        }
        .accessibilityValue(waiting ? "Uploading a new photo" : "")
        .accessibilityElement()
        .accessibilityLabel(name)
    }
}
