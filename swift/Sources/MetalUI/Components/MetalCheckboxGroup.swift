import SwiftUI

// WIP: MetalCheckboxGroup is a placeholder that keeps the React API's shape (options, a selection
// set, an optional "all" row). It uses system toggles, not yet the row-size dimple, the mixed parent,
// or the cascade from checkbox-group.agent.md. Web is the reference.

/// Several independent choices. Work in progress: see checkbox-group.agent.md.
public struct MetalCheckboxGroup: View {
    private let options: [(value: String, label: String)]
    @Binding private var selection: Set<String>
    private let all: String?

    public init(options: [(value: String, label: String)], selection: Binding<Set<String>>, all: String? = nil) {
        self.options = options
        self._selection = selection
        self.all = all
    }

    public var body: some View {
        VStack(alignment: .leading) {
            if let all {
                Toggle(all, isOn: Binding(
                    get: { selection.count == options.count },
                    set: { selection = $0 ? Set(options.map(\.value)) : [] }
                ))
            }
            ForEach(options, id: \.value) { option in
                Toggle(option.label, isOn: Binding(
                    get: { selection.contains(option.value) },
                    set: { if $0 { selection.insert(option.value) } else { selection.remove(option.value) } }
                ))
            }
        }
    }
}
