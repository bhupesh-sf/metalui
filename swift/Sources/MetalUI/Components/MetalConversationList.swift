import SwiftUI

// Conversation list: the person's past conversations, in a sidebar. Mirrors components/conversation-list
// (conversation-list.agent.md), with the sidebar's titles and gaps and the conversation-list recipe:
//   groups    by the day last spoken in: Pinned, Today, Yesterday, Previous 7 days, Previous 30 days, months
//   row       a list row, the title on one line; tapping it opens the conversation (current)
//   current   the row's selected plate (the web's sidebar highlight, which doesn't glide here yet)
//   more      a ghost More key at the row's end (on hover and on the current row): Rename, the host's
//             actions, Delete
//   rename    MetalQuickEdit in a popover from the row
//   delete    the row leaves one nest down and the rows close up (settle); a new row lands from above
//   loading   skeleton lines in the rows' places
// Reduce Motion: rows appear and leave with a fade only.

public struct MetalConversation: Identifiable, Sendable, Equatable {
    public let id: String
    public var title: String
    public var time: Date
    public var pinned: Bool

    public init(id: String, title: String, time: Date, pinned: Bool = false) {
        self.id = id
        self.title = title
        self.time = time
        self.pinned = pinned
    }
}

public struct MetalConversationAction {
    let label: String
    let icon: MetalIconName?
    let action: (String) -> Void

    public init(_ label: String, icon: MetalIconName? = nil, action: @escaping (String) -> Void) {
        self.label = label
        self.icon = icon
        self.action = action
    }
}

public struct MetalConversationList<Empty: View>: View {
    let conversations: [MetalConversation]
    @Binding var current: String?
    let onRename: ((String, String) async throws -> Void)?
    let onDelete: ((String) -> Void)?
    let actions: [MetalConversationAction]
    let loading: Bool
    let now: Date
    let label: String
    let empty: Empty
    @State private var menuFor: String?
    @State private var renaming: String?
    @State private var hovered: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ conversations: [MetalConversation], current: Binding<String?>, label: String = "Conversations",
                onRename: ((String, String) async throws -> Void)? = nil, onDelete: ((String) -> Void)? = nil,
                actions: [MetalConversationAction] = [], loading: Bool = false, now: Date = Date(),
                @ViewBuilder empty: () -> Empty) {
        self.conversations = conversations
        self._current = current
        self.label = label
        self.onRename = onRename
        self.onDelete = onDelete
        self.actions = actions
        self.loading = loading
        self.now = now
        self.empty = empty()
    }

    private var sidebar: MetalObjectRecipe { MetalRecipes.sidebar }

    public var body: some View {
        VStack(alignment: .leading, spacing: sidebar.points("self.gap")) {
            if loading {
                VStack(alignment: .leading, spacing: sidebar.points("section.gap")) {
                    ForEach(0..<Int(MetalRecipes.conversationList.scalar("loading.rows")), id: \.self) { _ in
                        MetalSkeleton()
                            .padding(.vertical, MetalRecipes.row.points("list.pad-y"))
                            .padding(.horizontal, MetalRecipes.row.points("list.pad-x"))
                    }
                }
                .accessibilityElement()
                .accessibilityLabel("Loading conversations")
            } else if conversations.isEmpty {
                empty
            } else {
                ForEach(groups, id: \.title) { group in
                    VStack(alignment: .leading, spacing: sidebar.points("section.gap")) {
                        MetalLabel(group.title).padding(.horizontal, sidebar.points("section.title-pad"))
                        ForEach(group.items) { c in row(c) }
                    }
                    .accessibilityElement(children: .contain)
                    .accessibilityLabel(group.title)
                }
            }
        }
        .metalAnimation(.settle, value: conversations.map(\.id))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    private func row(_ c: MetalConversation) -> some View {
        let on = current == c.id
        return MetalRow(.list, selected: on) {
            EmptyView()
        } text: {
            Text(c.title).lineLimit(1).truncationMode(.tail)
        } trail: {
            if onRename != nil || onDelete != nil || !actions.isEmpty {
                MetalIconButton("More for \(c.title)", icon: .more) { menuFor = c.id }
                    .opacity(on || hovered == c.id || menuFor == c.id ? .one : .zero)
                    .metalAnimation(.settle, value: hovered)
                    .metalMenu(isPresented: Binding(get: { menuFor == c.id }, set: { if !$0 { menuFor = nil } }), items: items(c))
                    .popover(isPresented: Binding(get: { renaming == c.id }, set: { if !$0 { renaming = nil } }), arrowEdge: .trailing) {
                        if let onRename {
                            MetalQuickEdit("Conversation title", value: c.title,
                                           onCommit: { try await onRename(c.id, $0) }, onClose: { renaming = nil })
                                .padding(MetalRecipes.popover.points("self.pad"))
                        }
                    }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { current = c.id }
        .onHover { hovered = $0 ? c.id : (hovered == c.id ? nil : hovered) }
        .transition(.asymmetric(
            insertion: reduceMotion ? .opacity : .offset(y: -MetalRadius.nest).combined(with: .opacity),
            removal: reduceMotion ? .opacity : .offset(y: MetalRadius.nest).combined(with: .opacity)))
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
        .accessibilityAction { current = c.id }
    }

    private func items(_ c: MetalConversation) -> [MetalMenuItem] {
        var out: [MetalMenuItem] = []
        if onRename != nil { out.append(MetalMenuItem("Rename…", icon: .pen) { renaming = c.id }) }
        out += actions.map { a in MetalMenuItem(a.label, icon: a.icon) { a.action(c.id) } }
        if let onDelete { out.append(MetalMenuItem("Delete", icon: .trash, danger: true) { onDelete(c.id) }) }
        return out
    }

    private var groups: [(title: String, items: [MetalConversation])] {
        let calendar = Calendar.current
        let sorted = conversations.sorted { a, b in a.pinned != b.pinned ? a.pinned : a.time > b.time }
        var out: [(title: String, items: [MetalConversation])] = []
        for c in sorted {
            let title: String
            if c.pinned {
                title = "Pinned"
            } else {
                let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: c.time), to: calendar.startOfDay(for: now)).day ?? .zero
                switch days {
                case ...0: title = "Today"
                case 1: title = "Yesterday"
                case 2..<7: title = "Previous 7 days"
                case 7..<30: title = "Previous 30 days"
                default: title = c.time.formatted(.dateTime.month(.wide).year())
                }
            }
            if out.last?.title == title { out[out.count - 1].items.append(c) } else { out.append((title, [c])) }
        }
        return out
    }
}

extension MetalConversationList where Empty == EmptyView {
    public init(_ conversations: [MetalConversation], current: Binding<String?>, label: String = "Conversations",
                onRename: ((String, String) async throws -> Void)? = nil, onDelete: ((String) -> Void)? = nil,
                actions: [MetalConversationAction] = [], loading: Bool = false, now: Date = Date()) {
        self.init(conversations, current: current, label: label, onRename: onRename, onDelete: onDelete,
                  actions: actions, loading: loading, now: now) { EmptyView() }
    }
}
