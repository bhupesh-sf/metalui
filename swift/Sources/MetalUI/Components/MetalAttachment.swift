import SwiftUI

// WIP: MetalAttachment keeps the React API's shape (a name, a size, progress, an error, a picture, the
// row or the tile). The row lays out a type well (or the picture), the name, Progress's well and fill
// (slid in, never resized), and a line; the tile is the raised plate with a sunk window, Progress's ring
// on a raised disc while it uploads, Try again when it failed, and its keys on raised caps. Not yet the
// row's raised plate or the land and leave from attachment.agent.md. Web is the reference.

/// How an attachment is laid out: the 52 row, or a square tile for a grid of pictures.
public enum MetalAttachmentKind: Sendable { case row, tile }

/// A file someone attached. Work in progress: see attachment.agent.md.
public struct MetalAttachment: View {
    private let name: String
    private let size: Int?
    private let progress: Double?
    private let error: String?
    private let preview: Image?
    private let kind: MetalAttachmentKind
    private let compact: Bool
    private let retry: (() -> Void)?
    private let remove: (() -> Void)?
    private let open: (() -> Void)?

    /// `preview` is a picture of the file, shown in place of its extension. `compact` makes a tile 52 square,
    /// the window alone. `open` (tiles) shows the open key and opens on a tap on the picture.
    public init(name: String, size: Int? = nil, progress: Double? = nil, error: String? = nil, preview: Image? = nil,
                kind: MetalAttachmentKind = .row, compact: Bool = false,
                retry: (() -> Void)? = nil, remove: (() -> Void)? = nil, open: (() -> Void)? = nil) {
        self.name = name
        self.size = size
        self.progress = progress
        self.error = error
        self.preview = preview
        self.kind = kind
        self.compact = compact
        self.retry = retry
        self.remove = remove
        self.open = open
    }

    private var r: MetalObjectRecipe { MetalRecipes.attachment }
    private var ext: String { (name as NSString).pathExtension.prefix(4).uppercased() }
    private var uploading: Bool { progress != nil && error == nil }
    private var line: String {
        if let error { return error }
        if let progress { return "Uploading · \(Int(progress.rounded())) %" }
        if let size { return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .decimal) }
        return ""
    }

    public var body: some View {
        switch kind {
        case .row: row
        case .tile: tile
        }
    }

    // MARK: Row

    private var row: some View {
        HStack(spacing: r.points("self.gap")) {
            face(radius: r.points("type.radius"))
                .frame(width: r.points("type.size"), height: r.points("type.size"))
            VStack(alignment: .leading) {
                Text(name).lineLimit(1).truncationMode(.middle)
                if let progress, error == nil {
                    MetalProgressWell(fill: min(max(progress / 100, .zero), .one), buffer: nil, state: .running)
                        .frame(height: r.points("track.height"))
                        .metalAnimation(.settle, value: progress)
                        .accessibilityElement()
                        .accessibilityLabel("Uploading")
                        .accessibilityValue("\(Int(progress.rounded())) %")
                }
                if let error { Text(error).font(.caption).foregroundStyle(.red) }
                else if let size { Text(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .decimal)).font(.caption).foregroundStyle(.tertiary) }
            }
            if error != nil, let retry { MetalButton("Try again", size: .compact, action: retry) }
            if let remove { MetalIconButton("Remove \(name)", icon: .close, variant: .mini, action: remove) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(name)
    }

    /// The sunk well with the picture, or the extension engraved.
    private func face(radius: CGFloat) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return MetalWell(.field, radius: radius) {
            ZStack {
                Color.clear
                if let preview {
                    preview.resizable().scaledToFill()
                } else {
                    Text(ext).font(.caption2.weight(.medium)).foregroundStyle(.secondary)
                }
            }
        }
        .clipShape(shape)
        .accessibilityHidden(true)
    }

    // MARK: Tile

    private var tile: some View {
        let plate = RoundedRectangle(cornerRadius: r.points("tile.radius"), style: .continuous)
        let windowRadius = r.points(compact ? "compact.window-radius" : "tile.window-radius")
        let pad = r.points(compact ? "compact.pad" : "tile.pad")
        return VStack(alignment: .leading, spacing: r.points("tile.gap")) {
            ZStack {
                face(radius: windowRadius)
                    .opacity(uploading || error != nil ? r.scalar("tile.dim") : .one)
                    .metalAnimation(.settle, value: uploading || error != nil)
                    .onTapGesture { open?() }
                if uploading {
                    disc { MetalProgress("Uploading \(name)", value: progress, shape: .ring, size: compact ? .compact : .regular) }
                } else if error != nil, let retry {
                    disc { MetalIconButton("Try again \(name)", icon: .retry, action: retry) }
                }
            }
            .aspectRatio(1, contentMode: .fit)
            if !compact {
                VStack(alignment: .leading, spacing: r.points("tile.caption-gap")) {
                    Text(name).font(.caption).lineLimit(1).truncationMode(.middle)
                    Text(line).font(.caption).monospacedDigit().foregroundStyle(error == nil ? AnyShapeStyle(.tertiary) : AnyShapeStyle(.red)).lineLimit(1)
                }
                .padding([.horizontal, .bottom], r.points("tile.caption-pad"))
            }
        }
        .padding(pad)
        .frame(width: compact ? r.points("compact.size") : nil, height: compact ? r.points("compact.size") : nil)
        .frame(minWidth: compact ? nil : r.points("tile.min-width"))
        .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: plate)
        .overlay(alignment: .topLeading) { if let open { cap { MetalIconButton("Open \(name)", icon: .zoomIn, variant: .mini, action: open) } } }
        .overlay(alignment: .topTrailing) { if let remove { cap { MetalIconButton("Remove \(name)", icon: .close, variant: .mini, action: remove) } } }
        .help(compact ? (line.isEmpty ? name : "\(name) · \(line)") : name)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(name)
        .accessibilityValue(line)
    }

    /// The raised disc in the window's middle: the ring while uploading, Try again once failed.
    private func disc<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .frame(width: r.points("tile.disc"), height: r.points("tile.disc"))
            .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: Circle())
    }

    /// A small raised cap at a top corner, so a key reads on any picture.
    private func cap<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        let side = r.points(compact ? "compact.cap" : "tile.cap")
        return content()
            .frame(width: side, height: side)
            .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: Circle())
            .padding(r.points(compact ? "compact.inset" : "tile.inset"))
    }
}
