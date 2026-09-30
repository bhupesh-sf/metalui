import SwiftUI
import UniformTypeIdentifiers

// WIP: MetalDropZone is a placeholder that keeps the React API's shape (title, description, glyph,
// accepted types, onFiles). It takes drops with dropDestination and picks with fileImporter, but not
// yet the lit edge, the sink or the refusal from drop-zone.agent.md. Web is the reference.

/// A place that receives files, by drop or by picking. Work in progress: see drop-zone.agent.md.
public struct MetalDropZone: View {
    private let title: String
    private let description: String?
    private let systemImage: String
    private let accept: [UTType]
    private let onFiles: ([URL]) -> Void
    @State private var over = false
    @State private var picking = false

    public init(_ title: String = "Drop files here", description: String? = nil, systemImage: String = "tray.and.arrow.down", accept: [UTType] = [.item], onFiles: @escaping ([URL]) -> Void) {
        self.title = title
        self.description = description
        self.systemImage = systemImage
        self.accept = accept
        self.onFiles = onFiles
    }

    public var body: some View {
        Button { picking = true } label: {
            VStack(spacing: MetalRecipes.dropZone.points("self.gap")) {
                Image(systemName: systemImage).font(.title2)
                Text(over ? "Let go to attach" : title)
                if let description { Text(description).font(.caption).foregroundStyle(.secondary) }
            }
            .frame(maxWidth: .infinity, minHeight: MetalRecipes.dropZone.points("self.min-height"))
        }
        .buttonStyle(.plain)
        .background(.quaternary, in: RoundedRectangle(cornerRadius: MetalRecipes.dropZone.points("self.radius"), style: .continuous))
        .dropDestination(for: URL.self) { urls, _ in
            onFiles(urls)
            return true
        } isTargeted: { over = $0 }
        .fileImporter(isPresented: $picking, allowedContentTypes: accept, allowsMultipleSelection: true) { result in
            if case .success(let urls) = result { onFiles(urls) }
        }
    }
}
