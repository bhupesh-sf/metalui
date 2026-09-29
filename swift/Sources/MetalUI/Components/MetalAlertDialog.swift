import SwiftUI

// WIP: MetalAlertDialog is a placeholder that keeps the React API's shape (a question, what happens,
// Cancel and a confirm action). It uses the system alert, not yet the dialog plate, the rise, or the
// refusal shake from alert-dialog.agent.md. Web is the reference.

public extension View {
    /// A question that must be answered. Work in progress: see alert-dialog.agent.md.
    func metalAlertDialog(
        _ title: String,
        message: String,
        isPresented: Binding<Bool>,
        confirm: String,
        role: ButtonRole? = .destructive,
        cancel: String = "Cancel",
        onConfirm: @escaping () -> Void
    ) -> some View {
        alert(title, isPresented: isPresented) {
            Button(cancel, role: .cancel) {}
            Button(confirm, role: role, action: onConfirm)
        } message: {
            Text(message)
        }
    }
}

/// The alert dialog as a type, for the registry and parity checks.
public enum MetalAlertDialog {}
