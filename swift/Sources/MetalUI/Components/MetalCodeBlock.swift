import SwiftUI
#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

// Code block: code to read and copy in the flow. Mirrors components/code-block (code-block.agent.md)
// from the code-block recipe:
//   framed     a stage plate: a 40 head (the label in readout ink3) over a hairline, the keys at its end
//   ghost      no plate, no head: a faint sunk tint; the keys float in the top corner while hovered
//   lines      the code role on the colorway's syntax inks; numbers in syn-line from `start`; `wrap`, or a
//              sideways scroll; `maxLines` stops the body and scrolls it inside itself
//   highlight  a quiet band with a 2 rail in ink3; focus dims the rest until the pointer is in the block
//   pick       a `selection` binding turns the numbers into keys: click picks, ⇧-click extends; the label
//              turns to name the lines and copy copies only them; `onReference` adds the attach key
//   diff       added on a green band with a green sign, removed on red; hunks with numbers: two gutters
//   problems   a lamp in the gutter (red error, amber warning, none for a note), a note row under the line
//   streaming  new rows fade up a nest on settle, a caret blinks after the last character, the body
//              follows the end, copy waits
// Reduce Motion: rows land at once, the caret holds, the label swaps without travel.

public enum MetalCodeBlockLook: Sendable { case framed, ghost }

/// A problem under one line: the word, the message, and one action ("Fix with AI").
public struct MetalCodeDiagnostic {
    public enum Severity: Sendable { case error, warning, note }
    public let line: Int
    public let severity: Severity
    public let message: String
    public let actionLabel: String?
    public let action: (() -> Void)?

    public init(line: Int, severity: Severity, message: String, action actionLabel: String? = nil, perform action: (() -> Void)? = nil) {
        self.line = line
        self.severity = severity
        self.message = message
        self.actionLabel = actionLabel
        self.action = action
    }

    var word: String {
        switch severity {
        case .error: "Error"
        case .warning: "Warning"
        case .note: "Note"
        }
    }

    var lamp: MetalLEDKind? {
        switch severity {
        case .error: .failed
        case .warning: .waiting
        case .note: nil
        }
    }
}

/// One shown line: its number, its text without a diff sign, and a patch's old and new numbers.
struct MetalCodeLine: Identifiable, Equatable {
    let id: Int
    let n: Int
    let text: String
    var sign: String?
    var diff: MetalCodeDiffClass?
    var hunk = false
    var old: Int?
    var next: Int?

    /// The lines of `code` the web's way (code-block.tsx `linesOf`): a diff's sign column, a patch's two gutters.
    static func lines(_ code: String, lang: String?, diff: [MetalCodeDiffClass]?, start: Int) -> (lines: [MetalCodeLine], patch: Bool) {
        let raw = code.components(separatedBy: "\n")
        let isDiff = lang == "diff"
        let classes = diff ?? (isDiff ? MetalCodeFace.diffClasses(code) : nil)
        let patch = classes != nil && raw.contains { $0.hasPrefix("@@") }
        let hunkPattern = try? NSRegularExpression(pattern: "^@@ -(\\d+)(?:,\\d+)? \\+(\\d+)")
        var old = 0, next = 0, inHunk = false
        let lines = raw.enumerated().map { i, l -> MetalCodeLine in
            let d = classes.flatMap { i < $0.count ? $0[i] : nil }
            let signed = d == .add || d == .remove || (isDiff && d == .context && l.hasPrefix(" "))
            var line = MetalCodeLine(id: i, n: start + i, text: signed ? String(l.dropFirst()) : l, diff: d, hunk: patch && l.hasPrefix("@@"))
            if classes != nil { line.sign = signed && !l.hasPrefix(" ") ? (l.hasPrefix("-") ? "−" : String(l.prefix(1))) : "" }
            if line.hunk {
                let m = hunkPattern?.firstMatch(in: l, range: NSRange(location: 0, length: (l as NSString).length))
                old = m.flatMap { Int((l as NSString).substring(with: $0.range(at: 1))) } ?? 0
                next = m.flatMap { Int((l as NSString).substring(with: $0.range(at: 2))) } ?? 0
                inHunk = m != nil
            } else if patch && inHunk && !l.hasPrefix("\\") {
                if d != .add { line.old = old; old += 1 }
                if d != .remove { line.next = next; next += 1 }
            }
            return line
        }
        return (lines, patch)
    }
}

/// Code to read and copy: numbered, tinted lines with a copy key, in a plate or on its own.
public struct MetalCodeBlock: View {
    let code: String
    let lang: String?
    let look: MetalCodeBlockLook
    let label: String?
    let numbers: Bool
    let start: Int
    let wrap: Bool
    let maxLines: Int?
    let highlight: [ClosedRange<Int>]
    let focus: [ClosedRange<Int>]
    let diff: [MetalCodeDiffClass]?
    let diagnostics: [MetalCodeDiagnostic]
    let selection: Binding<ClosedRange<Int>?>?
    let onReference: ((ClosedRange<Int>) -> Void)?
    let streaming: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false
    @State private var copied = false
    @State private var anchor: Int?

    /// - Parameters:
    ///   - selection: a binding turns the numbers into keys that pick lines (shown numbers).
    ///   - highlight, focus: ranges of shown line numbers.
    public init(_ code: String, lang: String? = nil, look: MetalCodeBlockLook = .framed, label: String? = nil,
                numbers: Bool = false, start: Int = 1, wrap: Bool = false, maxLines: Int? = nil,
                highlight: [ClosedRange<Int>] = [], focus: [ClosedRange<Int>] = [], diff: [MetalCodeDiffClass]? = nil,
                diagnostics: [MetalCodeDiagnostic] = [], selection: Binding<ClosedRange<Int>?>? = nil,
                onReference: ((ClosedRange<Int>) -> Void)? = nil, streaming: Bool = false) {
        self.code = code
        self.lang = lang
        self.look = look
        self.label = label
        self.numbers = numbers || selection != nil
        self.start = start
        self.wrap = wrap
        self.maxLines = maxLines
        self.highlight = highlight
        self.focus = focus
        self.diff = diff
        self.diagnostics = diagnostics
        self.selection = selection
        self.onReference = onReference
        self.streaming = streaming
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.codeBlock }
    private var cw: MetalRecipeColorway { MetalRecipeColorway(colorway) }
    private var picked: ClosedRange<Int>? { selection?.wrappedValue }

    private func ink(_ key: String) -> Color { (recipe.color(key, colorway: cw) ?? MetalRGBA(0, 0, 0, 0)).color }
    private static func range(_ r: ClosedRange<Int>) -> String { r.lowerBound == r.upperBound ? "\(r.lowerBound)" : "\(r.lowerBound)–\(r.upperBound)" }

    public var body: some View {
        let (lines, patch) = MetalCodeLine.lines(code, lang: lang, diff: diff, start: start)
        let t = colorway.tokens
        let shape = RoundedRectangle(cornerRadius: look == .framed ? MetalRadius.plate : recipe.points("ghost.radius"), style: .continuous)
        VStack(alignment: .leading, spacing: .zero) {
            if look == .framed {
                head
                Rectangle().fill(t.rule.color).frame(height: MetalRecipes.rule.points("self.thickness"))
            }
            scroller(lines, patch: patch)
        }
        .background {
            if look == .framed {
                Color.clear.metalRecipe(MetalRecipe(fill: MetalGradient(angle: 180, stops: [.init(t.sHi, .zero), .init(t.s, .one)]), shadows: t.stageSh), in: shape)
            } else {
                shape.fill(ink("ghost.tint"))
            }
        }
        .clipShape(shape)
        .overlay(alignment: .topTrailing) {
            if look == .ghost {
                HStack(spacing: .zero) { keys }
                    .background(Capsule().fill(LinearGradient(colors: [t.sHi.color, t.s.color], startPoint: .top, endPoint: .bottom)))
                    .padding(recipe.points("ghost.key-inset"))
                    .opacity(hovering || copied || picked != nil ? .one : .zero)
                    .metalAnimation(hovering ? .settle : .release, value: hovering)
            }
        }
        .onHover { hovering = $0 }
        .accessibilityElement(children: .contain)
    }

    // MARK: Head and keys

    private var head: some View {
        let name = label ?? lang ?? "Code"
        let shown = picked.map { "\(name) · \(Self.range($0))" } ?? name
        return HStack(spacing: recipe.points("head.gap")) {
            Text(shown)
                .font(.metal(MetalType.readout)).tracking(MetalType.readout.trackingPoints)
                .foregroundColor(colorway.tokens.ink3.color)
                .lineLimit(1)
                .contentTransition(reduceMotion ? .opacity : .numericText())
                .metalAnimation(.settle, value: shown)
            Spacer(minLength: .zero)
            HStack(spacing: .zero) { keys }
        }
        .padding(.leading, recipe.points("head.pad-left"))
        .padding(.trailing, recipe.points("head.pad-right"))
        .frame(minHeight: recipe.points("head.height"))
    }

    @ViewBuilder private var keys: some View {
        if let picked, let onReference {
            MetalIconButton("Reference lines \(Self.range(picked))", icon: .attach) { onReference(picked) }
        }
        let name = streaming ? "Still writing" : copied ? "Copied" : picked.map { "Copy lines \(Self.range($0))" } ?? "Copy"
        MetalIconButton(name, action: copy) {
            MetalIcon(copied ? .check : .copy, size: MetalRecipes.iconButton.points("ghost.glyph"))
                .contentTransition(.symbolEffect(.replace))
        }
        .disabled(streaming)
    }

    private func copy() {
        let raw = code.components(separatedBy: "\n")
        let text = picked.map { r in raw[max(.zero, r.lowerBound - start)...min(raw.count - 1, r.upperBound - start)].joined(separator: "\n") } ?? code
        #if canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #elseif canImport(UIKit)
        UIPasteboard.general.string = text
        #endif
        copied = true
        AccessibilityNotification.Announcement("Copied").post()
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("copy.hold")))
            copied = false
        }
    }

    // MARK: Body

    @ViewBuilder private func scroller(_ lines: [MetalCodeLine], patch: Bool) -> some View {
        let rows = self.rows(lines, patch: patch)
        let sideways = Group {
            if wrap { rows } else { ViewThatFits(in: .horizontal) { rows; ScrollView(.horizontal, showsIndicators: false) { rows } } }
        }
        if let maxLines, lines.count > maxLines {
            let lineHeight = recipe.lineHeight("code.font"), padY = recipe.points("body.pad-y")
            ScrollViewReader { proxy in
                ScrollView(.vertical) { sideways }
                    .frame(height: Double(maxLines) * lineHeight + padY + padY)
                    .onChange(of: code) { if streaming { proxy.scrollTo(lines.count - 1, anchor: .bottom) } }
            }
        } else {
            sideways
        }
    }

    private func rows(_ lines: [MetalCodeLine], patch: Bool) -> some View {
        let byLine = Dictionary(diagnostics.map { ($0.line, $0) }, uniquingKeysWith: { a, _ in a })
        let signs = lines.contains { $0.sign != nil }
        let digits = String(patch ? lines.map { max($0.old ?? .zero, $0.next ?? .zero) }.max() ?? .zero : start + lines.count - 1).count
        return VStack(alignment: .leading, spacing: .zero) {
            ForEach(lines) { line in
                row(line, patch: patch, lamps: !byLine.isEmpty, signs: signs, digits: digits, diagnostic: byLine[line.n], last: line.id == lines.count - 1)
                    .id(line.id)
                    .transition(.opacity.combined(with: .offset(y: MetalRadius.nest)))
            }
        }
        .padding(.vertical, recipe.points("body.pad-y"))
        .metalAnimation(.settle, value: streaming ? lines.count : .zero)
    }

    private func row(_ line: MetalCodeLine, patch: Bool, lamps: Bool, signs: Bool, digits: Int, diagnostic: MetalCodeDiagnostic?, last: Bool) -> some View {
        let t = colorway.tokens
        let role = recipe.typeRole("code.font")
        let lineHeight = recipe.lineHeight("code.font")
        let numberWidth = Self.digitWidth(role) * Double(digits)
        let isPicked = picked?.contains(line.n) ?? false
        let dim = !focus.isEmpty && !focus.contains { $0.contains(line.n) } && !hovering
        let gutterGap = recipe.points("gutter.gap")
        func gutter(_ filler: Bool) -> some View {
            HStack(alignment: .top, spacing: .zero) {
                if lamps {
                    Color.clear
                        .frame(width: recipe.points("gutter.lamp"), height: lineHeight)
                        .overlay(alignment: .leading) {
                            if !filler, let kind = diagnostic?.lamp { MetalLED(kind, size: .small) }
                        }
                }
                if numbers && patch {
                    number(filler ? nil : line.old, width: numberWidth, after: gutterGap)
                    number(filler ? nil : line.next, width: numberWidth, after: gutterGap)
                } else if numbers {
                    if selection != nil && !filler {
                        Button { pick(line.n) } label: {
                            number(line.n, width: numberWidth, after: gutterGap, ink: isPicked ? t.ink2.color : nil)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Line \(line.n)")
                        .accessibilityAddTraits(isPicked ? [.isSelected] : [])
                    } else {
                        number(filler ? nil : line.n, width: numberWidth, after: gutterGap)
                    }
                }
                if signs {
                    Text(filler ? "" : line.sign ?? "")
                        .foregroundColor(line.diff == .add ? ink("diff.add-ink") : ink("diff.remove-ink"))
                        .frame(width: recipe.points("sign.width"), height: lineHeight, alignment: .leading)
                }
            }
        }
        let syn = [t.synString, t.synComment, t.synKeyword, t.synType, t.synNumber].map(\.color)
        return VStack(alignment: .leading, spacing: .zero) {
            HStack(alignment: .top, spacing: .zero) {
                gutter(false)
                HStack(alignment: .firstTextBaseline, spacing: .zero) {
                    (line.hunk ? Text(line.text).foregroundColor(t.ink3.color) : MetalCodeFace.tinted(line.text, text: t.synText.color, inks: syn))
                        .fixedSize(horizontal: !wrap, vertical: true)
                    if streaming && last { MetalCodeCaret(height: lineHeight) }
                }
                .frame(minHeight: lineHeight, alignment: .leading)
            }
            .padding(.horizontal, recipe.points("body.pad-x"))
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                if isPicked { ink("pick.tint") }
                else if line.diff == .add { ink("diff.add-bg") }
                else if line.diff == .remove { ink("diff.remove-bg") }
                else if highlight.contains(where: { $0.contains(line.n) }) { ink("mark.tint") }
            }
            .overlay(alignment: .leading) {
                if highlight.contains(where: { $0.contains(line.n) }) {
                    Rectangle().fill(t.ink3.color).frame(width: recipe.points("mark.rail"))
                }
            }
            if let diagnostic {
                HStack(alignment: .top, spacing: .zero) {
                    gutter(true)
                    HStack(spacing: recipe.points("note.gap")) {
                        Text(diagnostic.word).foregroundColor(t.ink.color)
                        Text(diagnostic.message).foregroundColor(t.ink2.color)
                        if let label = diagnostic.actionLabel, let action = diagnostic.action {
                            MetalButton(label, size: .compact, action: action)
                        }
                    }
                    .font(.metal(MetalType.meta))
                    .padding(.vertical, recipe.points("note.pad-y"))
                }
                .padding(.horizontal, recipe.points("body.pad-x"))
                .accessibilityElement(children: .combine)
            }
        }
        .font(.metal(role))
        .opacity(dim ? recipe.scalar("focus.dim") : .one)
        .metalAnimation(.settle, value: dim)
    }

    private func number(_ n: Int?, width: Double, after gap: Double, ink: Color? = nil) -> some View {
        Text(n.map(String.init) ?? "")
            .monospacedDigit()
            .foregroundColor(ink ?? colorway.tokens.synLine.color)
            .frame(minWidth: width, minHeight: recipe.lineHeight("code.font"), alignment: .trailing)
            .padding(.trailing, gap)
            .accessibilityHidden(selection == nil)
    }

    /// A click picks a line (again clears it); ⇧-click extends from the first pick.
    private func pick(_ n: Int) {
        guard let selection else { return }
        #if canImport(AppKit)
        let extend = NSEvent.modifierFlags.contains(.shift)
        #else
        let extend = false
        #endif
        if extend, let anchor {
            selection.wrappedValue = min(anchor, n)...max(anchor, n)
        } else if selection.wrappedValue == n...n {
            anchor = nil
            selection.wrappedValue = nil
        } else {
            anchor = n
            selection.wrappedValue = n...n
        }
    }

    /// One digit's advance in the code font: the gutter is as wide as its widest number.
    static func digitWidth(_ role: MetalTypeRole) -> Double {
        let font = MetalFonts.ctFont(role, size: role.size)
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: "0", attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
        return CTLineGetTypographicBounds(line, nil, nil, nil)
    }
}

/// The caret after the last character while code streams: it blinks on the recipe's beat, and holds under Reduce Motion.
private struct MetalCodeCaret: View {
    let height: Double
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let recipe = MetalRecipes.codeBlock
        let caret = Rectangle().fill(colorway.tokens.ink3.color).frame(width: recipe.points("caret.width"), height: height)
        if reduceMotion {
            caret
        } else {
            caret.phaseAnimator([true, false]) { view, on in view.opacity(on ? .one : .zero) } animation: { _ in
                .linear(duration: .zero).delay(recipe.durationSeconds("caret.blink") / 2)
            }
        }
    }
}
