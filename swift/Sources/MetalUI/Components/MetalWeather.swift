import SwiftUI

public enum MetalWeatherKind: String, Sendable, CaseIterable {
    case clear, partly, cloud, rain, storm, snow, mist, windy, heat
}

public struct MetalSunHours: Sendable {
    public var rise: Double
    public var set: Double
    public init(rise: Double, set: Double) { self.rise = rise; self.set = set }
    public static let `default` = Self(rise: 7.5, set: 19.5)
}

/// Dot-index translation of weather/sky.ts. Layer order is part of the display contract.
public enum MetalSky {
    private enum L {
        static let off: UInt8 = 0, glow: UInt8 = 1, star: UInt8 = 2, moon: UInt8 = 3
        static let sun: UInt8 = 4, ray: UInt8 = 5, heat: UInt8 = 6, bird: UInt8 = 7
        static let snow: UInt8 = 8, rain: UInt8 = 9, bolt: UInt8 = 10, cloud: UInt8 = 11
        static let cloudDark: UInt8 = 12, fog: UInt8 = 13, wind: UInt8 = 14, hill: UInt8 = 15, hz: UInt8 = 16
    }

    public static let skyInks: [MetalDotInk] = [
        .init(.off), .init(.sun, alpha: 0.32), .init(.star), .init(.moon), .init(.sun),
        .init(.sun), .init(.sun, alpha: 0.5), .init(.hill), .init(.snow), .init(.rain),
        .init(.sun), .init(.cloud), .init(.cloudDark), .init(.cloud, alpha: 0.7),
        .init(.cloudDark), .init(.hill), .init(.hz)
    ]
    public static let miniInks: [MetalDotInk] = skyInks.enumerated().map { index, ink in
        index == Int(L.fog) ? .init(.cloud) : ink
    }

    private static func roundJS(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }
    private static func wrap(_ v: Int, _ n: Int) -> Int { ((v % n) + n) % n }
    private static func wrap(_ v: Double, _ n: Double) -> Double {
        let r = v.truncatingRemainder(dividingBy: n)
        return (r + n).truncatingRemainder(dividingBy: n)
    }

    public static func sky(cols: Int, rows: Int, hz: Int, kind: MetalWeatherKind, clock: Double,
                           tick: Int, sun: MetalSunHours = .default) -> [UInt8] {
        guard cols > 0, rows > 0, hz > 4 else { return [] }
        var grid = [UInt8](repeating: 0, count: cols * rows)
        let big = cols > 30
        func put(_ x: Double, _ y: Double, _ layer: UInt8) {
            let x = roundJS(x), y = roundJS(y)
            if x < 0 || y < 0 || x >= cols || y >= hz { return }
            grid[y * cols + x] = layer
        }
        func put(_ x: Int, _ y: Int, _ layer: UInt8) { put(Double(x), Double(y), layer) }
        let day = clock >= sun.rise && clock <= sun.set
        let td = (clock - sun.rise) / (sun.set - sun.rise)
        let tn = wrap(clock - sun.set, 24) / (24 - (sun.set - sun.rise))
        func arc(_ t: Double) -> (Double, Double) {
            (3 + t * Double(cols - 7), Double(hz - 1) - sin(.pi * t) * Double(hz - (big ? 8 : 6)))
        }
        let covered = kind == .cloud || kind == .rain || kind == .storm || kind == .snow

        if day && (td < 0.1 || td > 0.9) && !covered {
            for gy in (hz - 4)..<hz { for gx in 0..<cols {
                if (gx + gy) % 2 == 0 && (gy >= hz - 2 || gx % 4 == 0) { put(gx, gy, L.glow) }
            } }
        }
        if !day && !covered {
            for s in 0..<(big ? 14 : 6) {
                if wrap(tick + s * 3, 9) == 0 { continue }
                put(wrap(s * 17 + 5, cols), wrap(s * 7 + 1, hz - 4), L.star)
            }
        }
        if !covered {
            let r = big ? 3.5 : 2.6
            if day {
                let p = arc(td), sx = roundJS(p.0), sy = roundJS(p.1)
                for dx in -4...4 { for dy in -4...4 {
                    if Double(dx * dx + dy * dy) <= r * r + 0.3 { put(sx + dx, sy + dy, L.sun) }
                } }
                let orth = wrap(tick, 4) < 2
                let dirs: [(Double, Double)] = orth
                    ? [(0, -1), (0, 1), (-1, 0), (1, 0)]
                    : [(-0.72, -0.72), (0.72, -0.72), (-0.72, 0.72), (0.72, 0.72)]
                for d in dirs {
                    var k = r + 1.6
                    while k <= r + 2.8 { put(Double(sx) + d.0 * k, Double(sy) + d.1 * k, L.ray); k += 1 }
                }
                if kind == .clear {
                    for b in 0..<(big ? 2 : 1) {
                        let bx = wrap(Int((Double(cols) * 0.55).rounded(.down)) + b * 7 + Int((Double(tick) / 2).rounded(.down)), cols + 4) - 2
                        let by = (big ? 6 : 4) + b * 3
                        if wrap(tick, 2) == 0 {
                            put(bx - 1, by - 1, L.bird); put(bx, by, L.bird); put(bx + 1, by - 1, L.bird)
                        } else {
                            put(bx - 1, by, L.bird); put(bx, by, L.bird); put(bx + 1, by, L.bird)
                        }
                    }
                }
            } else {
                let q = arc(tn), mx = roundJS(q.0), my = roundJS(q.1)
                let shape = big
                    ? ["...MMM.", ".MMM...", "MMM....", "MMM....", "MMM....", ".MMM...", "...MMM."]
                    : [".MMM.", "MM...", "MM...", "MM...", ".MMM."]
                let half = (shape.count - 1) / 2
                for (iy, row) in shape.enumerated() {
                    for (ix, c) in row.enumerated() where c == "M" { put(mx + ix - half, my + iy - half, L.moon) }
                }
            }
        }
        if kind == .heat {
            for hx in stride(from: 1, to: cols, by: 4) { for hy in (hz - 7)..<hz {
                if wrap(hy + tick, 3) == 0 { put(hx + wrap(hy + tick, 2), hy, L.heat) }
            } }
        }
        if kind == .snow {
            for f in 0..<(big ? 34 : 12) {
                let fy = wrap(f * 7 + Int((Double(tick) / 2).rounded(.down)), hz)
                let fx = wrap(f * 13 + roundJS(sin(Double(tick) / 3 + Double(f)) * 1), cols)
                put(fx, fy, L.snow)
            }
        }
        let drift = Double(tick) * (kind == .windy ? 0.9 : 0.25)
        func scaleW(_ w: Int) -> Int { max(2, roundJS(Double(w) * (0.55 + 0.45 * Double(cols) / 46))) }
        var clouds: [(Int, Int, Int, UInt8)] = []
        func cloud(_ fx: Double, _ fy: Double, _ width: Int, _ layer: UInt8) {
            let w = scaleW(width), span = cols + 2 * w + 4
            let cx = wrap(roundJS(fx * Double(cols) + drift), span) - w - 2
            clouds.append((cx, roundJS(fy * Double(hz)), w, layer))
        }
        if kind == .partly { cloud(0.18, 0.24, 3, L.cloud); cloud(0.62, 0.42, 5, L.cloud) }
        if kind == .cloud { cloud(0.1, 0.24, 4, L.cloud); cloud(0.45, 0.4, 5, L.cloudDark); cloud(0.8, 0.2, 4, L.cloud); cloud(0.65, 0.62, 3, L.cloud) }
        if kind == .rain { cloud(0.22, 0.2, 5, L.cloudDark); cloud(0.68, 0.3, 5, L.cloudDark) }
        if kind == .storm { cloud(0.12, 0.18, 6, L.cloudDark); cloud(0.52, 0.24, 6, L.cloudDark); cloud(0.92, 0.14, 5, L.cloudDark) }
        if kind == .snow { cloud(0.25, 0.14, 5, L.cloud); cloud(0.72, 0.2, 4, L.cloud) }
        if kind == .windy { cloud(0.4, 0.26, 3, L.cloud) }
        for (cx, cy, w, _) in clouds where kind == .rain || kind == .storm {
            let fast = kind == .storm ? 2 : 1
            for x in (cx - w + 1)...(cx + w - 1) where wrap(x, 2) == 0 {
                if cy + 2 < hz { for y in (cy + 2)..<hz where wrap(y - tick * fast + x * 3, 4) == 0 {
                    put(x - (kind == .storm ? wrap(y, 2) : 0), y, L.rain)
                } }
            }
        }
        if kind == .storm && !clouds.isEmpty && wrap(tick, 18) < 3 && wrap(tick, 18) != 1 {
            let c0 = clouds.count > 1 ? clouds[1] : clouds[0]
            var lx = c0.0
            if c0.1 + 2 < hz { for ly in (c0.1 + 2)..<hz {
                let step = ly - c0.1 - 2
                lx += wrap(step, 6) < 3 ? -1 : 1
                put(lx, ly, L.bolt); put(lx + 1, ly, L.bolt)
            } }
        }
        for (cx, cy, w, layer) in clouds {
            for x in (cx - w + 1)...(cx + w - 1) { put(x, cy + 1, layer) }
            for x in (cx - w)...(cx + w) { put(x, cy, layer) }
            for x in (cx - w + 1)...(cx + w - 2) { put(x, cy - 1, layer) }
            for x in (cx - 1)...(cx + 2) { put(x, cy - 2, layer) }
            put(cx - w + 2, cy - 2, layer); put(cx - w + 3, cy - 2, layer)
            put(cx, cy - 3, layer); put(cx + 1, cy - 3, layer)
        }
        if kind == .mist {
            for (i, d) in (big ? [2, 5, 8, 11] : [2, 4, 7]).enumerated() {
                let dir = i % 2 == 1 ? -1 : 1
                for x in 0..<cols where wrap(x + dir * Int((Double(tick) / 2).rounded(.down)) + i * 3, 9) < 5 {
                    put(x, hz - d, L.fog)
                }
            }
        }
        if kind == .windy {
            for g in 0..<(big ? 7 : 4) {
                let wy = 2 + wrap(g * 5, hz - 4), wx = wrap(g * 17 + tick * 2, cols + 8) - 4, len = 3 + g % 3
                for k in 0..<len { put(wx + k, wy, L.wind) }
                put(wx + len, wy - 1, L.wind)
            }
        }
        for x in 0..<cols {
            let h = max(0, roundJS(3 - abs(Double(x) - Double(cols) * 0.8) / 2.4))
                + max(0, roundJS(1.6 - abs(Double(x) - Double(cols) * 0.12) / 2.2))
            if h > 0 { for y in (hz - h)..<hz { grid[y * cols + x] = L.hill } }
            if hz < rows { grid[hz * cols + x] = L.hz }
        }
        return grid
    }

    private static let glyphs: [String: [String]] = [
        "sun": ["...S...", ".S...S.", "..SSS..", "S.SSS.S", "..SSS..", ".S...S.", "...S..."],
        "moon": ["..MMM..", ".MM....", "MM.....", "MM.....", "MM.....", ".MM....", "..MMM.."],
        "partly": ["S.S....", ".SSS...", "SSSCC..", ".SCCCC.", "CCCCCCC", ".CCCCC.", "......."],
        "partlyNight": ["MM.....", "M......", "M..CC..", "MMCCCC.", "CCCCCCC", ".CCCCC.", "......."],
        "cloud": [".......", "..CC...", ".CCCCC.", "CCCCCCC", "CCCCCCC", ".CCCCC.", "......."],
        "rain": ["..DD...", ".DDDDD.", "DDDDDDD", ".DDDDD.", ".......", ".R.R.R.", "R.R.R.."],
        "storm": ["..DD...", ".DDDDD.", "DDDDDDD", "..Z...R", ".ZZ..R.", "..Z....", ".Z....."],
        "mist": ["FFFFF..", ".......", "..FFFFF", ".......", "FFFFF..", ".......", ".FFFFFF"],
        "snow": ["N..N..N", ".......", ".N..N..", ".......", "N..N..N", ".......", ".N..N.."],
        "windy": ["WWWWW..", ".....W.", "WWWWW..", ".......", "WWWWWW.", "......W", "WWWW..."],
        "heat": [".SSS...", "SSSSS..", ".SSS...", ".......", "S.S.S.S", ".S.S.S.", "......."]
    ]
    private static let miniLayer: [Character: UInt8] = [
        "S": L.sun, "M": L.moon, "C": L.cloud, "D": L.cloudDark, "R": L.rain,
        "Z": L.bolt, "F": L.fog, "N": L.snow, "W": L.wind
    ]
    public static func mini(kind: MetalWeatherKind, day: Bool) -> [UInt8] {
        let key = kind == .clear ? (day ? "sun" : "moon") : kind == .partly && !day ? "partlyNight" : kind.rawValue
        var out = [UInt8](repeating: 0, count: 49)
        for (y, row) in (glyphs[key] ?? glyphs["cloud"]!).enumerated() {
            for (x, c) in row.enumerated() { if let layer = miniLayer[c] { out[y * 7 + x] = layer } }
        }
        return out
    }
}

public struct MetalWeatherHour: Sendable {
    public var label: String
    public var kind: MetalWeatherKind
    public var day: Bool
    public var temp: String
    public var accessibilityLabel: String
    public init(label: String, kind: MetalWeatherKind, day: Bool, temp: String, accessibilityLabel: String) {
        self.label = label; self.kind = kind; self.day = day; self.temp = temp; self.accessibilityLabel = accessibilityLabel
    }
}

public enum MetalWeatherDayKind: String, Sendable { case sun, partly, cloud, rain }

public struct MetalWeatherDay: Sendable {
    public var name: String
    public var kind: MetalWeatherDayKind
    public var lo: Int
    public var hi: Int
    public var accessibilityLabel: String
    public init(name: String, kind: MetalWeatherDayKind, lo: Int, hi: Int, accessibilityLabel: String) {
        self.name = name; self.kind = kind; self.lo = lo; self.hi = hi; self.accessibilityLabel = accessibilityLabel
    }
}

private struct WeatherSky: View {
    let cols: Int, rows: Int, hz: Int
    let kind: MetalWeatherKind
    let clock: Double
    let sun: MetalSunHours
    let phase: Int
    let running: Bool
    let tick: Int?

    var body: some View {
        Group {
            if let tick {
                display(tick + phase)
            } else {
                MetalDotClock(running: running) { frame in display(frame + phase) }
            }
        }
    }

    private func display(_ frame: Int) -> some View {
        MetalDotDisplay(cols: cols, rows: rows,
                        dots: MetalSky.sky(cols: cols, rows: rows, hz: hz, kind: kind, clock: clock, tick: frame, sun: sun),
                        inks: MetalSky.skyInks)
    }
}

private struct WeatherEngraved: View {
    let text: String
    @Environment(\.metalColorway) private var colorway
    var body: some View {
        let lip = MetalRecipes.label.textShadows("engraved", colorway: MetalRecipeColorway(colorway)).first
        Text(text).metalType(MetalType.label)
            .foregroundColor(colorway.tokens.engrave.color)
            .shadow(color: (lip?.color ?? colorway.tokens.lip).color,
                    radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
    }
}

public struct MetalWeatherTile: View {
    public var kind: MetalWeatherKind
    public var temp: String
    public var name: String
    public var meta: String
    public var clock: Double
    public var sun: MetalSunHours
    public var phase: Int
    public var running: Bool
    public var tick: Int?
    public var accessibilityLabel: String
    @Environment(\.metalColorway) private var colorway

    public init(kind: MetalWeatherKind, temp: String, name: String, meta: String, clock: Double,
                sun: MetalSunHours = .default, phase: Int = 0, running: Bool = true, tick: Int? = nil,
                accessibilityLabel: String) {
        self.kind = kind; self.temp = temp; self.name = name; self.meta = meta; self.clock = clock
        self.sun = sun; self.phase = phase; self.running = running; self.tick = tick
        self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        let r = MetalRecipes.weather
        let t = colorway.tokens
        let shape = RoundedRectangle(cornerRadius: r.points("tile.radius"), style: .continuous)
        MetalWell(.field, radius: r.points("tile.well-radius")) {
            ZStack(alignment: .bottomLeading) {
                WeatherSky(cols: Int(r.points("tile.cols")), rows: Int(r.points("tile.rows")),
                           hz: Int(r.points("tile.horizon")), kind: kind, clock: clock, sun: sun,
                           phase: phase, running: running, tick: tick)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                HStack(alignment: .bottom, spacing: .zero) {
                    Text(temp).font(.metal(MetalType.pixel)).foregroundColor(t.ink.color)
                    Spacer(minLength: .zero)
                    VStack(alignment: .trailing, spacing: r.points("tile.meta-gap")) {
                        WeatherEngraved(text: name)
                        Text(meta).font(.metal(MetalType.readout)).foregroundColor(t.ink2.color)
                    }
                    .padding(.bottom, r.points("tile.meta-pad"))
                }
                .padding(.horizontal, r.points("tile.text-x"))
                .padding(.bottom, r.points("tile.text-y"))
            }
            .frame(width: r.points("tile.well"), height: r.points("tile.well"))
            .clipShape(RoundedRectangle(cornerRadius: r.points("tile.well-radius"), style: .continuous))
        }
        .frame(width: r.points("tile.well"), height: r.points("tile.well"))
        .padding(r.points("tile.pad"))
        .frame(width: r.points("tile.size"), height: r.points("tile.size"))
        .metalObjectRecipe(r, part: "self", in: shape)
        .accessibilityElement(children: .ignore).accessibilityAddTraits(.isImage)
        .accessibilityLabel(accessibilityLabel)
    }
}

public struct MetalWeather: View {
    public struct Scale: Sendable {
        public var min: Int
        public var max: Int
        public init(min: Int, max: Int) { self.min = min; self.max = max }
    }

    public var place: String
    public var summary: String
    public var live: Bool
    public var status: String
    public var clockText: String
    public var clock: Double
    public var sun: MetalSunHours
    public var kind: MetalWeatherKind
    public var temp: String
    public var condition: String
    public var detail: String
    public var skyLabel: String
    public var hours: [MetalWeatherHour]
    public var days: [MetalWeatherDay]
    public var scale: Scale?
    public var now: Double?
    public var format: (Double) -> String
    public var running: Bool
    public var tick: Int?
    @Environment(\.metalColorway) private var colorway

    public init(place: String, summary: String, live: Bool = true, status: String, clockText: String,
                clock: Double, sun: MetalSunHours = .default, kind: MetalWeatherKind, temp: String,
                condition: String, detail: String, skyLabel: String, hours: [MetalWeatherHour], days: [MetalWeatherDay],
                scale: Scale? = nil, now: Double? = nil,
                format: @escaping (Double) -> String = { "\(Int(($0 + 0.5).rounded(.down)))°" },
                running: Bool = true, tick: Int? = nil) {
        self.place = place; self.summary = summary; self.live = live; self.status = status; self.clockText = clockText
        self.clock = clock; self.sun = sun; self.kind = kind; self.temp = temp; self.condition = condition
        self.detail = detail; self.skyLabel = skyLabel; self.hours = hours; self.days = days; self.scale = scale
        self.now = now; self.format = format; self.running = running; self.tick = tick
    }

    public var body: some View {
        let r = MetalRecipes.weather
        let shape = RoundedRectangle(cornerRadius: r.points("self.radius"), style: .continuous)
        VStack(spacing: r.points("self.gap")) {
            header(r)
            skyWell(r)
            hourStrip(r)
            MetalRule(.horizontal).padding(.horizontal, r.points("rule.inset"))
            week(r)
            Spacer(minLength: .zero)
        }
        .padding(r.points("self.pad"))
        .frame(width: r.points("self.width"), height: r.points("self.height"), alignment: .top)
        .metalObjectRecipe(r, part: "self", in: shape)
        .accessibilityLabel("Weather in \(place)")
    }

    private func header(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        return HStack(alignment: .top, spacing: r.points("header.gap")) {
            VStack(alignment: .leading, spacing: r.points("header.title-gap")) {
                Text(place).font(.metal(MetalType.display)).foregroundColor(t.ink.color)
                Text(summary).font(.metal(MetalType.meta)).foregroundColor(t.ink2.color)
            }
            Spacer(minLength: .zero)
            HStack(spacing: r.points("header.status-gap")) {
                MetalLED(live ? .live : .off, diameter: r.points("header.led"))
                Text(status).font(.metal(MetalType.meta)).foregroundColor(t.ink2.color)
                Text(clockText).font(.metal(MetalType.readout)).foregroundColor(t.ink2.color)
            }
            .frame(height: r.points("header.status-height"))
        }
        .padding(.top, r.points("header.pad-top"))
        .padding(.horizontal, r.points("header.pad-x"))
    }

    private func skyWell(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        return MetalWell(.field, radius: r.points("sky.radius")) {
            ZStack(alignment: .bottomLeading) {
                WeatherSky(cols: Int(r.points("sky.cols")), rows: Int(r.points("sky.rows")),
                           hz: Int(r.points("sky.horizon")), kind: kind, clock: clock, sun: sun,
                           phase: 0, running: running, tick: tick)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                HStack(alignment: .bottom, spacing: r.points("sky.text-gap")) {
                    Text(temp).font(.metal(MetalType.pixel)).foregroundColor(t.ink.color)
                    Spacer(minLength: .zero)
                    VStack(alignment: .trailing, spacing: r.points("sky.meta-gap")) {
                        Text(condition).font(.metal(MetalType.content)).foregroundColor(t.ink.color)
                        Text(detail).font(.metal(MetalType.readout)).foregroundColor(t.ink2.color)
                    }
                    .padding(.bottom, r.points("sky.meta-pad"))
                }
                .padding(.horizontal, r.points("sky.text-x"))
                .padding(.bottom, r.points("sky.text-y"))
            }
            .frame(height: r.points("sky.height"))
            .clipShape(RoundedRectangle(cornerRadius: r.points("sky.radius"), style: .continuous))
        }
        .frame(height: r.points("sky.height"))
        .accessibilityElement(children: .ignore).accessibilityAddTraits(.isImage).accessibilityLabel(skyLabel)
    }

    private func hourStrip(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        return HStack(spacing: .zero) {
            ForEach(hours.indices, id: \.self) { i in
                let hour = hours[i]
                VStack(spacing: r.points("hours.gap")) {
                    WeatherEngraved(text: hour.label)
                    MetalDotDisplay(cols: 7, rows: 7, dots: MetalSky.mini(kind: hour.kind, day: hour.day),
                                    inks: MetalSky.miniInks, size: .mini)
                    Text(hour.temp).font(.metal(MetalType.pixelSmall)).foregroundColor(t.ink.color)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityElement(children: .ignore).accessibilityLabel(hour.accessibilityLabel)
            }
        }
        .frame(height: r.points("hours.height"))
        .accessibilityElement(children: .contain).accessibilityLabel("Next hours")
    }

    private func week(_ r: MetalObjectRecipe) -> some View {
        VStack(spacing: r.points("week.gap")) {
            weekHeading(r)
            ForEach(days.indices, id: \.self) { i in weekRow(days[i], index: i, recipe: r) }
        }
        .padding(.horizontal, r.points("week.pad-x"))
        .frame(height: r.points("week.height"), alignment: .top)
        .accessibilityElement(children: .contain).accessibilityLabel("Seven-day forecast")
    }

    private func weekHeading(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        return HStack(spacing: r.points("week.col-gap")) {
            WeatherEngraved(text: "\(days.count) days").frame(width: r.points("week.day"), alignment: .leading)
            Color.clear.frame(width: r.points("week.glyph"))
            WeatherEngraved(text: "Low").frame(width: r.points("week.lo"), alignment: .trailing)
            HStack(spacing: .zero) {
                Text(format(Double(activeScale.min)))
                Spacer(minLength: .zero)
                Text(format(Double(activeScale.min + activeScale.max) / 2))
                Spacer(minLength: .zero)
                Text(format(Double(activeScale.max)))
            }
            .font(.metal(MetalType.tick)).foregroundColor(t.ink2.color)
            .frame(width: r.points("week.bar"))
            WeatherEngraved(text: "High").frame(width: r.points("week.hi"), alignment: .leading)
        }
        .frame(height: r.points("week.row"))
    }

    private var activeScale: Scale {
        scale ?? Scale(min: Int(MetalRecipes.weather.points("week.scale-min")),
                       max: Int(MetalRecipes.weather.points("week.scale-max")))
    }

    private func weekRow(_ day: MetalWeatherDay, index: Int, recipe r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        let range = activeScale
        let cols = max(0, range.max - range.min + 1)
        var dots = [UInt8](repeating: 0, count: cols)
        if cols > 0 {
            for c in range.min...range.max where c >= day.lo && c <= day.hi { dots[c - range.min] = 1 }
            if index == 0, let now {
                let at = Int((now + 0.5).rounded(.down)) - range.min
                if at >= 0 && at < cols { dots[at] = 2 }
            }
        }
        let ink: MetalDotColour = switch day.kind {
        case .sun, .partly: .sun
        case .cloud: .cloudDark
        case .rain: .rain
        }
        return HStack(spacing: r.points("week.col-gap")) {
            Text(day.name).font(.metal(MetalType.figure)).fontWeight(index == .zero ? .semibold : .medium)
                .foregroundColor(t.ink.color).frame(width: r.points("week.day"), alignment: .leading)
            WeatherWeekGlyph(kind: day.kind).frame(width: r.points("week.glyph"), height: r.points("week.glyph"))
            Text(format(Double(day.lo))).font(.metal(MetalType.figure)).foregroundColor(t.ink2.color)
                .frame(width: r.points("week.lo"), alignment: .trailing)
            MetalDotDisplay(cols: cols, rows: 1, dots: dots,
                            inks: [.init(.off), .init(ink), .init(.ink)])
                .frame(width: r.points("week.bar"))
            Text(format(Double(day.hi))).font(.metal(MetalType.figure)).fontWeight(.semibold)
                .foregroundColor(t.ink.color).frame(width: r.points("week.hi"), alignment: .leading)
        }
        .frame(height: r.points("week.row"))
        .accessibilityElement(children: .ignore).accessibilityLabel(day.accessibilityLabel)
    }
}

/// The web SVG paths on a 24-grid, rendered at the weather recipe's glyph size.
private struct WeatherWeekGlyph: View {
    let kind: MetalWeatherDayKind
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let r = MetalRecipes.weather
        let size = r.points("week.glyph")
        let stroke = r.points("week.stroke") * size / 24
        let ink = colorway.tokens.icon.color
        Canvas { context, _ in
            var c = context
            c.scaleBy(x: size / 24, y: size / 24)
            c.fill(fillPath, with: .color(ink.opacity(fillOpacity)))
            c.stroke(strokePath, with: .color(ink), style: StrokeStyle(lineWidth: stroke * 24 / size,
                                                                       lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private var fillOpacity: Double { kind == .sun ? 0.24 : kind == .partly ? 0.2 : 0.12 }
    private var fillPath: Path {
        var p = Path()
        switch kind {
        case .sun: p.addEllipse(in: CGRect(x: 8.1, y: 8.1, width: 7.8, height: 7.8))
        case .partly:
            p.addEllipse(in: CGRect(x: 3.8, y: 3.8, width: 5.6, height: 5.6))
            p.addPath(Self.cloud(x: 9.76, y: 15.96, width: 8, factor: 0.8))
        case .cloud: p.addPath(Self.cloud(x: 7.2, y: 16.4, width: 10, factor: 1))
        case .rain: p.addPath(Self.cloud(x: 7.2, y: 14.2, width: 10, factor: 1))
        }
        return p
    }
    private var strokePath: Path {
        var p = fillPath
        if kind == .sun {
            for (x1, y1, x2, y2) in [(12.0,5.6,12.0,3.6),(7.47,7.47,6.06,6.06),(5.6,12.0,3.6,12.0),
                                      (7.47,16.53,6.06,17.94),(12.0,18.4,12.0,20.4),(16.53,16.53,17.94,17.94),
                                      (18.4,12.0,20.4,12.0),(16.53,7.47,17.94,6.06)] {
                p.move(to: CGPoint(x: x1, y: y1)); p.addLine(to: CGPoint(x: x2, y: y2))
            }
        } else if kind == .partly {
            for (x1, y1, x2, y2) in [(6.6,2.3,6.6,1.0),(2.3,6.6,1.0,6.6),
                                      (3.56,3.56,2.64,2.64),(9.64,3.56,10.56,2.64),(3.56,9.64,2.64,10.56)] {
                p.move(to: CGPoint(x: x1, y: y1)); p.addLine(to: CGPoint(x: x2, y: y2))
            }
        } else if kind == .rain {
            for (x1, y1) in [(8.4,17.2),(12.2,17.2),(16.0,17.2)] {
                p.move(to: CGPoint(x: x1, y: y1)); p.addLine(to: CGPoint(x: x1 - 0.8, y: y1 + 1.8))
            }
        }
        return p
    }

    private static func cloud(x: Double, y: Double, width: Double, factor f: Double) -> Path {
        // SVG's circular `a` commands, in order: far lobe, crown, near lobe.
        var p = Path()
        p.move(to: CGPoint(x: x, y: y))
        p.addLine(to: CGPoint(x: x + width, y: y))
        let far = CGPoint(x: x + width + 0.5 * f, y: y - 7.2 * f)
        let crown = CGPoint(x: x + 0.1 * f, y: y - 8.1 * f)
        addSVGArc(&p, from: CGPoint(x: x + width, y: y), to: far, radius: 3.6 * f)
        addSVGArc(&p, from: far, to: crown, radius: 5.4 * f)
        addSVGArc(&p, from: crown, to: CGPoint(x: x, y: y), radius: 4.05 * f)
        p.closeSubpath()
        return p
    }

    private static func addSVGArc(_ path: inout Path, from start: CGPoint, to end: CGPoint, radius requested: Double) {
        let dx = Double(start.x - end.x) / 2, dy = Double(start.y - end.y) / 2
        let d2 = dx * dx + dy * dy
        let radius = max(requested, sqrt(d2))
        let factor = sqrt(max(0, (radius * radius - d2) / d2))
        // SVG flags 0 0 0: small arc, counterclockwise in SVG coordinates.
        let centerX = (Double(start.x + end.x) / 2) - dy * factor
        let centerY = (Double(start.y + end.y) / 2) + dx * factor
        let first = atan2(Double(start.y) - centerY, Double(start.x) - centerX)
        var sweep = atan2(Double(end.y) - centerY, Double(end.x) - centerX) - first
        if sweep > 0 { sweep -= 2 * .pi }
        for step in 1...24 {
            let angle = first + sweep * Double(step) / 24
            path.addLine(to: CGPoint(x: centerX + radius * cos(angle), y: centerY + radius * sin(angle)))
        }
    }
}
