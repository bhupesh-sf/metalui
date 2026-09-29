import SwiftUI

// WIP: MetalSheet is a placeholder that keeps the React API's shape (presented flag, title,
// description, content). It uses the system sheet, not yet the plate, the inner-edge radius, the grip,
// or the surface/settle/release motion from sheet.agent.md. Web is the reference.

public extension View {
    /// A panel from an edge. Work in progress: see sheet.agent.md.
    func metalSheet<Content: View>(isPresented: Binding<Bool>, @ViewBuilder content: @escaping () -> Content) -> some View {
        sheet(isPresented: isPresented) {
            content()
                .presentationDetents([.fraction(0.5), .large])
                .presentationDragIndicator(.visible)
        }
    }
}

/// The sheet as a type, for the registry and parity checks.
public enum MetalSheet {}
