import Charts
import SwiftUI

// Chart: an instrument's graph of a person's numbers. Mirrors components/chart (chart.agent.md) from the
// chart recipe, on Swift Charts:
//   kinds     line (LineMark), area (AreaMark from zero under the line), bar (BarMark, grouped by series)
//   well      the field well behind the plot; hairlines at nice steps, the zero line stronger; y figures
//             before the plot, x labels under it, thinned to fit
//   readout   over the plot: the category and each series' value turning (numericText); at rest the
//             latest point; it follows the pointer (chartXSelection) and ←/→ when focused. A crosshair
//             and markers (line, area) or a plate behind the category (bar) mark the point
//   series    lines differ by dash and symbol (circle, square, diamond, ring); bars by tone (Swift
//             Charts has no hatching: solid, then lighter steps of the same ink). One signal series in
//             the intent green
//   missing   nil breaks the line (each run is its own series) and leaves no bar; the readout says "—"
//   states    loading (skeleton bars in the well), empty and error (a sentence in the well)
//   arrive    data after nothing rises from zero once on the settle spring; Reduce Motion: no rise

public enum MetalChartKind: Sendable { case line, area, bar }

/// One series of a `MetalChart`: a value per category, `nil` where there is none.
public struct MetalChartSeries: Identifiable, Sendable, Equatable {
    public var id: String
    public var label: String
    public var values: [Double?]
    /// The one series to look at, in the intent green.
    public var signal: Bool

    public init(id: String, _ label: String, values: [Double?], signal: Bool = false) {
        self.id = id
        self.label = label
        self.values = values
        self.signal = signal
    }
}

/// An instrument's graph: line, area or bars on a sunk well, read off a readout that follows the pointer and the keys.
public struct MetalChart: View {
    let series: [MetalChartSeries]
    let categories: [String]
    let label: String
    let kind: MetalChartKind
    let format: (Double) -> String
    let zero: Bool
    let loading: Bool
    let empty: String
    let error: String?
    let height: Double?

    @State private var selected: String?
    @State private var rise: Double = 0
    @FocusState private var focused: Bool
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `label` names the chart ("API requests per day"). `format` reads a value with its unit.
    public init(_ series: [MetalChartSeries], categories: [String], label: String, kind: MetalChartKind = .line,
                format: @escaping (Double) -> String = MetalChart.number, zero: Bool = true, loading: Bool = false,
                empty: String = "No data yet", error: String? = nil, height: Double? = nil) {
        self.series = Array(series.prefix(MetalChart.shapes.count))
        self.categories = categories
        self.label = label
        self.kind = kind
        self.format = format
        self.zero = zero
        self.loading = loading
        self.empty = empty
        self.error = error
        self.height = height
    }

    /// The locale's number, one decimal at most, a real minus.
    public static func number(_ v: Double) -> String {
        v.formatted(.number.precision(.fractionLength(0...1))).replacingOccurrences(of: "-", with: "\u{2212}")
    }

    static let shapes: [MetalChartShape] = [.circle, .square, .diamond, .ring]

    private var recipe: MetalObjectRecipe { MetalRecipes.chart }
    private var values: [Double] { series.flatMap { $0.values.compactMap { $0 } } }
    private var hasData: Bool { !values.isEmpty && !loading && error == nil }
    private var signal: Int? { series.firstIndex { $0.signal } }

    private var ticks: [Double] {
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let withZero = zero || kind != .line
        return MetalChart.niceTicks(withZero ? min(0, lo) : lo, withZero ? max(0, hi) : hi,
                                    count: Int(recipe.scalar("axis.y-ticks")))
    }

    /// The latest category with a value: what the readout reads at rest.
    private var latest: Int {
        categories.indices.last { i in series.contains { i < $0.values.count && $0.values[i] != nil } } ?? max(0, categories.count - 1)
    }
    private var at: Int { selected.flatMap { categories.firstIndex(of: $0) } ?? latest }

    public var body: some View {
        VStack(alignment: .leading, spacing: recipe.points("head.gap")) {
            readout
            plot
        }
        .onAppear { arrive(hasData) }
        .onChange(of: hasData) { _, now in arrive(now) }
    }

    private func arrive(_ now: Bool) {
        guard now else { rise = 0; return }
        rise = reduceMotion ? 1 : 0
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { rise = 1 }
    }

    // MARK: readout

    private var readout: some View {
        let t = colorway.tokens
        return HStack(spacing: recipe.points("head.item-gap")) {
            Text((hasData && at < categories.count ? categories[at] : "\u{2014}").uppercased())
                .metalType(MetalType.readout).foregroundColor(t.ink2.color)
                .contentTransition(.numericText())
            ForEach(Array(series.enumerated()), id: \.element.id) { i, s in
                HStack(spacing: recipe.points("head.key-gap")) {
                    swatch(i)
                    Text(s.label).metalType(MetalType.meta).foregroundColor(t.ink2.color)
                    Text(hasData ? read(value(s, at)) : "\u{2014}")
                        .metalType(MetalType.readout).monospacedDigit().foregroundColor(t.ink.color)
                        .contentTransition(.numericText())
                }
            }
        }
        .metalAnimation(.settle, value: at)
        .accessibilityHidden(true)
    }

    @ViewBuilder private func swatch(_ i: Int) -> some View {
        let w = recipe.points("head.swatch-width"), h = recipe.points("head.swatch-height")
        if kind == .bar {
            RoundedRectangle(cornerRadius: recipe.points("bar.radius"), style: .continuous)
                .fill(ink(i)).frame(width: h, height: h)
        } else {
            ZStack {
                Path { p in p.move(to: CGPoint(x: .zero, y: h / 2)); p.addLine(to: CGPoint(x: w, y: h / 2)) }
                    .stroke(ink(i), style: stroke(i))
                MetalChart.shapes[pattern(i)].view(size: recipe.points("marker.size"), ring: recipe.points("marker.ring"),
                                                    ink: ink(i), surface: colorway.tokens.sHi.color)
            }
            .frame(width: w, height: h)
        }
    }

    // MARK: plot

    private var plot: some View {
        let shape = RoundedRectangle(cornerRadius: recipe.points("plot.radius"), style: .continuous)
        let lo = ticks.first ?? 0, hi = ticks.last ?? 1
        return Chart {
            marks
        }
        .chartYScale(domain: lo...hi, range: .plotDimension(startPadding: recipe.points("plot.pad-bottom"), endPadding: recipe.points("plot.pad-top")))
        .chartXScale(domain: categories, range: .plotDimension(padding: recipe.points("plot.pad-x")))
        .chartXSelection(value: $selected)
        .chartLegend(.hidden)
        .chartYAxis { yAxis }
        .chartXAxis { xAxis }
        .chartPlotStyle { area in
            area.background { MetalWell(.field, radius: recipe.points("plot.radius")) { Color.clear } }
                .overlay { states }
        }
        .frame(height: height ?? recipe.points("plot.height"))
        .focusable()
        .focused($focused)
        .onKeyPress(.leftArrow) { step(-1) }
        .onKeyPress(.rightArrow) { step(1) }
        .onKeyPress(.home) { jump(0) }
        .onKeyPress(.end) { jump(categories.count - 1) }
        .onChange(of: focused) { _, now in if !now { selected = nil } }
        .contentShape(shape)
        .accessibilityLabel(label)
    }

    private func step(_ by: Int) -> KeyPress.Result { jump(at + by) }
    private func jump(_ i: Int) -> KeyPress.Result {
        guard hasData, !categories.isEmpty else { return .ignored }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { selected = categories[min(categories.count - 1, max(0, i))] }
        return .handled
    }

    @ChartContentBuilder private var marks: some ChartContent {
        let zeroLine = min(ticks.last ?? 0, max(ticks.first ?? 0, 0))
        // The hairlines at the ticks (Table's row rule) and the zero line stronger, over the well.
        ForEach(hasData ? ticks : [zeroLine], id: \.self) { t in
            RuleMark(y: .value("Tick", t))
                .foregroundStyle(t == zeroLine ? colorway.tokens.ink3.color.opacity(recipe.scalar("cross.opacity")) : colorway.tokens.rule.color)
                .lineStyle(StrokeStyle(lineWidth: MetalRecipes.rule.points("self.thickness")))
        }
        if kind == .bar, hasData, let pick = selected {
            RectangleMark(x: .value("Category", pick))
                .foregroundStyle(colorway.tokens.menuRowHover.color)
                .clipShape(RoundedRectangle(cornerRadius: recipe.points("bar.radius"), style: .continuous))
        }
        ForEach(plotted) { p in mark(p, zeroLine: zeroLine) }
        if kind != .bar, hasData, at < categories.count {
            if selected != nil {
                RuleMark(x: .value("Category", categories[at]))
                    .foregroundStyle(colorway.tokens.ink3.color.opacity(recipe.scalar("cross.opacity")))
                    .lineStyle(StrokeStyle(lineWidth: recipe.points("cross.width")))
            }
            ForEach(Array(series.enumerated()), id: \.element.id) { i, s in
                if let v = value(s, at) {
                    PointMark(x: .value("Category", categories[at]), y: .value("Value", zeroLine + (v - zeroLine) * rise))
                        .symbol {
                            MetalChart.shapes[pattern(i)].view(size: recipe.points("marker.size"), ring: recipe.points("marker.ring"),
                                                                ink: ink(i), surface: colorway.tokens.sHi.color)
                        }
                }
            }
        }
    }

    /// One value to draw: its series, the run it belongs to (a missing value starts a new run), where and what.
    private struct Plotted: Identifiable {
        let series: Int
        let run: String
        let index: Int
        let value: Double
        var id: String { "\(run)/\(index)" }
    }

    private var plotted: [Plotted] {
        guard hasData else { return [] }
        return series.enumerated().flatMap { i, s in
            MetalChart.runs(s.values).enumerated().flatMap { r, run in
                run.map { Plotted(series: i, run: "\(s.id)-\(r)", index: $0.0, value: $0.1) }
            }
        }
    }

    @ChartContentBuilder private func mark(_ p: Plotted, zeroLine: Double) -> some ChartContent {
        let x = PlottableValue.value("Category", categories[p.index])
        let y = PlottableValue.value("Value", zeroLine + (p.value - zeroLine) * rise)
        let color = ink(p.series)
        switch kind {
        case .bar:
            let radius = recipe.points("bar.radius")
            BarMark(x: x, y: y, width: .ratio(1 - recipe.scalar("bar.inset")))
                .position(by: .value("Series", series[p.series].id), span: .ratio(1))
                .foregroundStyle(color.opacity(MetalChart.tone(pattern(p.series))))
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: radius, topTrailingRadius: radius, style: .continuous))
        case .area:
            AreaMark(x: x, yStart: .value("Zero", zeroLine), yEnd: y, series: .value("Run", p.run))
                .foregroundStyle(color.opacity(recipe.scalar("area.opacity")))
            LineMark(x: x, y: y, series: .value("Run", p.run))
                .foregroundStyle(color).lineStyle(stroke(p.series))
        case .line:
            LineMark(x: x, y: y, series: .value("Run", p.run))
                .foregroundStyle(color).lineStyle(stroke(p.series))
        }
    }

    private var yAxis: some AxisContent {
        AxisMarks(position: .leading, values: hasData ? ticks : [0]) { mark in
            let v = mark.as(Double.self) ?? 0
            if hasData {
                AxisValueLabel {
                    Text(format(v)).metalType(MetalType.readout).monospacedDigit().foregroundColor(colorway.tokens.ink3.color)
                }
            }
        }
    }

    private var xAxis: some AxisContent {
        AxisMarks(values: shownCategories) { mark in
            AxisValueLabel(centered: true) {
                Text(mark.as(String.self) ?? "").metalType(MetalType.readout).foregroundColor(colorway.tokens.ink3.color)
            }
        }
    }

    /// Every step-th label counted back from the latest, so each has axis.x-min and the latest shows.
    private var shownCategories: [String] {
        // ponytail: thinned for the recipe's plot width guess (the chart's own width needs a GeometryReader
        // around Swift Charts); pass fewer categories for a narrow chart.
        let fit = max(1, Int(MetalChart.typicalWidth / recipe.points("axis.x-min")))
        let step = max(1, Int((Double(categories.count) / Double(fit)).rounded(.up)))
        return categories.indices.filter { (categories.count - 1 - $0) % step == 0 }.map { categories[$0] }
    }
    private static let typicalWidth: Double = 560

    @ViewBuilder private var states: some View {
        let t = colorway.tokens
        if loading {
            HStack(alignment: .bottom, spacing: recipe.points("bar.gap") * 4) {
                ForEach(Array(MetalChart.ghosts.enumerated()), id: \.offset) { _, g in
                    GeometryReader { geo in
                        MetalSkeleton(height: geo.size.height * g).frame(maxHeight: .infinity, alignment: .bottom)
                    }
                }
            }
            .accessibilityLabel("Loading")
        } else if !hasData {
            Text(error ?? empty).metalType(MetalType.body).foregroundColor(t.ink2.color).multilineTextAlignment(.center)
        }
    }
    private static let ghosts: [Double] = [0.42, 0.58, 0.5, 0.7, 0.62, 0.8, 0.68, 0.88]

    // MARK: helpers

    private func value(_ s: MetalChartSeries, _ i: Int) -> Double? { i < s.values.count ? s.values[i] : nil }
    private func read(_ v: Double?) -> String { v.map(format) ?? "\u{2014}" }

    /// The pattern slot: the signal series takes the first (solid), the rest follow in order.
    private func pattern(_ i: Int) -> Int {
        guard let s = signal else { return i % MetalChart.shapes.count }
        return (i == s ? 0 : i > s ? i : i + 1) % MetalChart.shapes.count
    }

    private func ink(_ i: Int) -> Color {
        if i == signal { return (recipe.color("signal.color", colorway: MetalRecipeColorway(colorway)) ?? MetalShared.greenDeep).color }
        return (kind == .bar ? colorway.tokens.ink2 : colorway.tokens.ink).color
    }

    private func stroke(_ i: Int) -> StrokeStyle {
        let names = ["", "line.dash", "line.dot", "line.dashdot"]
        let dash = (recipe.text(names[pattern(i)]) ?? "").split(separator: " ").compactMap { Double($0) }.map { CGFloat($0) }
        return StrokeStyle(lineWidth: recipe.points(i == signal ? "line.signal-width" : "line.width"),
                           lineCap: .round, lineJoin: .round, dash: dash)
    }

    /// Bars' tones in place of hatching: solid, then lighter steps of the same ink.
    static func tone(_ slot: Int) -> Double { [1, 0.55, 0.3, 0.75][slot % 4] }

    static func runs(_ values: [Double?]) -> [[(Int, Double)]] {
        var out: [[(Int, Double)]] = []
        var open = false
        for (i, v) in values.enumerated() {
            guard let v, v.isFinite else { open = false; continue }
            if !open { out.append([]); open = true }
            out[out.count - 1].append((i, v))
        }
        return out
    }

    /// Ticks at a nice step (1, 2, 2.5 or 5 × 10ⁿ) covering lo...hi in about `count` steps.
    static func niceTicks(_ lo: Double, _ hi: Double, count: Int) -> [Double] {
        let hi = hi > lo ? hi : lo + 1
        let raw = (hi - lo) / Double(max(1, count))
        let mag = pow(10, floor(log10(raw)))
        let step = [1, 2, 2.5, 5, 10].map { $0 * mag }.first { $0 >= raw * (1 - 1e-9) } ?? 10 * mag
        let first = floor(lo / step), last = ceil(hi / step)
        return stride(from: first, through: last, by: 1).map { ($0 * step * 1e9).rounded() / 1e9 }
    }
}

/// A series' marker shape, the second thing (after the dash) that tells series apart.
enum MetalChartShape: Sendable {
    case circle, square, diamond, ring

    /// A diamond is a square turned a quarter: scaled so its corners sit inside the others' box (the web's 0.85).
    static let diamondScale: Double = 0.85

    @ViewBuilder func view(size: Double, ring: Double, ink: Color, surface: Color) -> some View {
        switch self {
        case .circle:
            Circle().fill(ink).frame(width: size, height: size).background(Circle().fill(surface).padding(-ring))
        case .square:
            RoundedRectangle(cornerRadius: ring, style: .continuous).fill(ink).frame(width: size, height: size)
                .background(RoundedRectangle(cornerRadius: ring + ring, style: .continuous).fill(surface).padding(-ring))
        case .diamond:
            let side = size * MetalChartShape.diamondScale
            RoundedRectangle(cornerRadius: ring, style: .continuous).fill(ink).frame(width: side, height: side)
                .background(RoundedRectangle(cornerRadius: ring + ring, style: .continuous).fill(surface).padding(-ring))
                .rotationEffect(.degrees(45))
        case .ring:
            Circle().strokeBorder(ink, lineWidth: ring).background(Circle().fill(surface))
                .frame(width: size, height: size).background(Circle().fill(surface).padding(-ring))
        }
    }
}
