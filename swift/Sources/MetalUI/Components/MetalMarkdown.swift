import SwiftUI

// Markdown: an answer's text, set as it arrives. Mirrors components/markdown (markdown.agent.md) from the
// markdown recipe:
//   blocks     paragraphs in the content type; # and ## in display, ### and #### in content semibold (#### ink2);
//              bullets and numbers nested by indent, markers in ink3; a quote on a rail; a rule; tables
//   inline     bold, italic, struck, code (the code block's type on its ghost tint), links (the system's
//              Markdown, inline only)
//   fences     every fence is a MetalCodeBlock; an open one streams
//   pace       words a second: what has arrived is revealed a word at a time until caught up
//   caret      while streaming, a green bar after the last word (not in an open fence)
// Reduce Motion: a phrase (10 words) at a time, no caret.

public struct MetalMarkdown: View {
    let source: String
    let streaming: Bool
    let pace: Double?
    @State private var shown: Int
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// - Parameters:
    ///   - streaming: more is still arriving (a caret; an open fence streams; half marks close).
    ///   - pace: words a second to reveal what has arrived; nil shows it as it comes.
    public init(_ source: String, streaming: Bool = false, pace: Double? = nil) {
        self.source = source
        self.streaming = streaming
        self.pace = pace
        _shown = State(initialValue: source.count)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.markdown }
    private var paced: Bool { streaming && pace != nil }
    private var end: Int { paced ? min(shown, source.count) : source.count }
    private static let phrase = 10

    public var body: some View {
        let text = String(source.prefix(end))
        var blocks = MetalMarkdownParser.parse(text)
        if streaming, case .paragraph(let p)? = blocks.last { blocks[blocks.count - 1] = .paragraph(MetalMarkdownParser.closeMarks(p)) }
        let caret = streaming && !reduceMotion && !(blocks.last?.isCode ?? false)
        return VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { i, b in
                block(b, caret: caret && i == blocks.count - 1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        // A stream paces from what was there when it started; when it ends, everything shows (`end`).
        .onChange(of: paced) { shown = source.count }
        .task(id: "\(end)|\(source.count)|\(paced)|\(reduceMotion)") { await step() }
    }

    /// One word (or phrase) more, after the pace's wait; nothing runs once caught up.
    private func step() async {
        guard paced, let pace, end < source.count else { return }
        let wait = reduceMotion ? recipe.durationSeconds("stream.phrase-every") : 1 / pace
        try? await Task.sleep(for: .seconds(wait))
        guard !Task.isCancelled else { return }
        shown = MetalMarkdownParser.words(after: end, in: source, count: reduceMotion ? Self.phrase : 1)
    }

    // MARK: blocks

    @ViewBuilder private func block(_ b: MetalMarkdownBlock, caret: Bool) -> some View {
        let t = colorway.tokens
        switch b {
        case .heading(let level, let s):
            let big = level <= 2
            line(s, caret: caret)
                .font(.metal(big ? MetalType.display : MetalType.content))
                .fontWeight(big ? nil : .semibold)
                .foregroundColor((level >= 4 ? t.ink2 : t.ink).color)
                .padding(.top, recipe.points("heading.gap"))
                .accessibilityAddTraits(.isHeader)
        case .paragraph(let s):
            line(s, caret: caret).font(.metal(MetalType.content)).foregroundColor(t.ink.color)
        case .rule:
            MetalRule(.horizontal)
        case .quote(let inner):
            HStack(alignment: .top, spacing: recipe.points("quote.pad")) {
                Rectangle().fill(t.rule.color).frame(width: recipe.points("quote.rail"))
                MetalMarkdown(inner, streaming: streaming && caret).foregroundColor(t.ink2.color)
            }
            .fixedSize(horizontal: false, vertical: true)
        case .list(let ordered, let start, let items):
            VStack(alignment: .leading, spacing: recipe.points("list.gap")) {
                ForEach(Array(items.enumerated()), id: \.offset) { j, item in
                    HStack(alignment: .firstTextBaseline, spacing: .zero) {
                        Text(ordered ? "\(start + j)." : "•")
                            .font(.metal(MetalType.content)).foregroundColor(t.ink3.color)
                            .frame(width: recipe.points("list.indent"), alignment: .leading)
                        VStack(alignment: .leading, spacing: recipe.points("list.gap")) {
                            line(item.text, caret: caret && j == items.count - 1 && item.sub.isEmpty)
                                .font(.metal(MetalType.content)).foregroundColor(t.ink.color)
                            if !item.sub.isEmpty { MetalMarkdown(item.sub, streaming: streaming && caret && j == items.count - 1) }
                        }
                    }
                }
            }
        case .table(let head, let rows):
            ScrollView(.horizontal, showsIndicators: false) {
                Grid(alignment: .leading, horizontalSpacing: recipe.points("table.pad-x") * 2, verticalSpacing: recipe.points("table.pad-y") * 2) {
                    GridRow { ForEach(Array(head.enumerated()), id: \.offset) { _, c in inline(c).font(.metal(MetalType.ui)).foregroundColor(t.ink2.color) } }
                    Divider().gridCellUnsizedAxes(.horizontal)
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        GridRow { ForEach(Array(head.indices), id: \.self) { j in inline(j < row.count ? row[j] : "").font(.metal(MetalType.body)).monospacedDigit().foregroundColor(t.ink.color) } }
                    }
                }
            }
        case .code(let lang, let code, let open):
            MetalCodeBlock(code, lang: lang, streaming: streaming && open)
        }
    }

    /// A line of inline Markdown, with the caret after it while streaming.
    private func line(_ s: String, caret: Bool) -> Text {
        let text = inline(s)
        guard caret else { return text }
        return text + Text(" ") + Text(Image(systemName: "poweron")).foregroundColor(MetalShared.greenDeep.color)
    }

    private func inline(_ s: String) -> Text {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        guard var attr = try? AttributedString(markdown: s.replacingOccurrences(of: "\n", with: " "), options: options) else { return Text(s) }
        let code = MetalRecipes.codeBlock
        for run in attr.runs where run.inlinePresentationIntent?.contains(.code) == true {
            attr[run.range].font = .metal(code.typeRole("code.font"))
            attr[run.range].backgroundColor = (code.color("ghost.tint", colorway: MetalRecipeColorway(colorway)) ?? MetalRGBA(0, 0, 0, 0)).color
        }
        return Text(attr)
    }
}

// MARK: parsing

enum MetalMarkdownBlock {
    case heading(Int, String)
    case paragraph(String)
    case list(ordered: Bool, start: Int, items: [(text: String, sub: String)])
    case quote(String)
    case table(head: [String], rows: [[String]])
    case rule
    case code(lang: String?, code: String, open: Bool)

    var isCode: Bool { if case .code = self { return true } else { return false } }
}

enum MetalMarkdownParser {
    private static func match(_ s: String, _ pattern: String) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern),
              let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
        return (0..<m.numberOfRanges).map { i in Range(m.range(at: i), in: s).map { String(s[$0]) } ?? "" }
    }

    private static let heading = #"^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$"#
    private static let rule = #"^ {0,3}([-*_])(?:\s*\1){2,}\s*$"#
    private static let quote = #"^ {0,3}>\s?"#
    private static let item = #"^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$"#
    private static let separator = #"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$"#
    private static let fence = #"^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)"#

    private static func blank(_ s: String) -> Bool { s.trimmingCharacters(in: .whitespaces).isEmpty }
    private static func indent(_ s: String) -> Int { s.prefix { $0 == " " || $0 == "\t" }.count }
    private static func cells(_ row: String) -> [String] {
        var r = row.trimmingCharacters(in: .whitespaces)
        if r.hasPrefix("|") { r.removeFirst() }
        if r.hasSuffix("|") { r.removeLast() }
        return r.components(separatedBy: "|").map { $0.trimmingCharacters(in: .whitespaces) }
    }
    private static func isTable(_ lines: [String], _ i: Int) -> Bool {
        lines[i].contains("|") && i + 1 < lines.count && match(lines[i + 1], separator) != nil && lines[i + 1].contains("-")
    }
    private static func starts(_ lines: [String], _ i: Int) -> Bool {
        let l = lines[i]
        return match(l, heading) != nil || match(l, rule) != nil || match(l, quote) != nil || match(l, item) != nil || match(l, fence) != nil || isTable(lines, i)
    }

    static func parse(_ markdown: String) -> [MetalMarkdownBlock] {
        let lines = markdown.components(separatedBy: "\n")
        var out: [MetalMarkdownBlock] = []
        var i = 0
        while i < lines.count {
            let l = lines[i]
            if blank(l) { i += 1; continue }
            if let f = match(l, fence) {
                let mark = f[1]
                var body: [String] = []
                i += 1
                var open = true
                while i < lines.count {
                    let t = lines[i].trimmingCharacters(in: .whitespaces)
                    if t.first == mark.first, t.allSatisfy({ $0 == mark.first }), t.count >= mark.count { open = false; i += 1; break }
                    body.append(lines[i]); i += 1
                }
                out.append(.code(lang: f[2].isEmpty ? nil : f[2], code: body.joined(separator: "\n"), open: open))
                continue
            }
            if let h = match(l, heading) { out.append(.heading(min(4, h[1].count), h[2])); i += 1; continue }
            if match(l, rule) != nil { out.append(.rule); i += 1; continue }
            if match(l, quote) != nil {
                var inner: [String] = []
                while i < lines.count, let q = match(lines[i], quote) { inner.append(String(lines[i].dropFirst(q[0].count))); i += 1 }
                out.append(.quote(inner.joined(separator: "\n")))
                continue
            }
            if isTable(lines, i) {
                let head = cells(l)
                var rows: [[String]] = []
                i += 2
                while i < lines.count, !blank(lines[i]), lines[i].contains("|") { rows.append(cells(lines[i])); i += 1 }
                out.append(.table(head: head, rows: rows))
                continue
            }
            if let first = match(l, item) {
                let base = indent(first[1])
                let ordered = first[2].first?.isNumber ?? false
                var items: [(text: String, sub: [String])] = []
                while i < lines.count {
                    let line = lines[i]
                    if let m = match(line, item), indent(m[1]) <= base + 1 {
                        if (m[2].first?.isNumber ?? false) != ordered { break }
                        items.append((m[3], [])); i += 1; continue
                    }
                    if blank(line) {
                        if i + 1 < lines.count, indent(lines[i + 1]) > base || match(lines[i + 1], item) != nil { items[items.count - 1].sub.append(""); i += 1; continue }
                        break
                    }
                    if indent(line) > base { items[items.count - 1].sub.append(String(line.dropFirst(min(indent(line), base + 2)))); i += 1; continue }
                    if items[items.count - 1].sub.isEmpty, !starts(lines, i) { items[items.count - 1].text += " " + line.trimmingCharacters(in: .whitespaces); i += 1; continue }
                    break
                }
                out.append(.list(ordered: ordered, start: ordered ? Int(first[2].dropLast()) ?? 1 : 1, items: items.map { ($0.text, $0.sub.joined(separator: "\n")) }))
                continue
            }
            var para = [l.trimmingCharacters(in: .whitespaces)]
            i += 1
            while i < lines.count, !blank(lines[i]), !starts(lines, i) { para.append(lines[i].trimmingCharacters(in: .whitespaces)); i += 1 }
            out.append(.paragraph(para.joined(separator: "\n")))
        }
        return out
    }

    /// While streaming: a half-arrived `, ** or * is closed, so it reads marked at once.
    static func closeMarks(_ s: String) -> String {
        if s.filter({ $0 == "`" }).count % 2 == 1 { return s + "`" }
        var t = s
        let stars = s.components(separatedBy: "**").count - 1
        if stars % 2 == 1 { t += "**" }
        if s.replacingOccurrences(of: "**", with: "").filter({ $0 == "*" }).count % 2 == 1 { t += "*" }
        return t
    }

    /// The end (in characters) of `count` words after `at`.
    static func words(after at: Int, in s: String, count: Int) -> Int {
        let chars = Array(s)
        var i = at
        for _ in 0..<count {
            while i < chars.count, chars[i].isWhitespace { i += 1 }
            if i >= chars.count { return chars.count }
            while i < chars.count, !chars[i].isWhitespace { i += 1 }
            while i < chars.count, chars[i].isWhitespace { i += 1 }
        }
        return i
    }
}
