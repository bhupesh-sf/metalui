import SwiftUI

// WIP: MetalAttachment is a placeholder that keeps the React API's shape (a name, a size, progress,
// an error). It lays out a type badge, the name, Progress's well and fill (slid in, never resized),
// and a line; not yet the raised plate or the land and leave from attachment.agent.md. Web is the reference.

/// A file someone attached. Work in progress: see attachment.agent.md.
public struct MetalAttachment: View {
    private let name: String
    private let size: Int?
    private let progress: Double?
    private let error: String?

    public init(name: String, size: Int? = nil, progress: Double? = nil, error: String? = nil) {
        self.name = name
        self.size = size
        self.progress = progress
        self.error = error
    }

    public var body: some View {
        HStack(spacing: MetalRecipes.attachment.points("self.gap")) {
            Text((name as NSString).pathExtension.uppercased()).font(.caption2).foregroundStyle(.secondary)
                .frame(width: MetalRecipes.attachment.points("type.size"), height: MetalRecipes.attachment.points("type.size"))
            VStack(alignment: .leading) {
                Text(name).lineLimit(1).truncationMode(.middle)
                if let progress {
                    MetalProgressWell(fill: min(max(progress / 100, .zero), .one), buffer: nil, state: .running)
                        .frame(height: MetalRecipes.attachment.points("track.height"))
                        .metalAnimation(.settle, value: progress)
                        .accessibilityElement()
                        .accessibilityLabel("Uploading")
                        .accessibilityValue("\(Int(progress.rounded())) %")
                }
                if let error { Text(error).font(.caption).foregroundStyle(.red) }
                else if let size { Text(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .decimal)).font(.caption).foregroundStyle(.tertiary) }
            }
        }
        .accessibilityElement(children: .combine)
    }
}
