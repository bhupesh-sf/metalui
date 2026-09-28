import SwiftUI

/* ─────────────────────────────────────────────────────────
 * WEATHER: the SwiftUI twin of blocks/weather/weather.tsx. A raise slab with a dot-matrix sky sunk
 * into a field well, drawn on the dot display.
 *
 *   MetalWeather      header (place, summary, LED, clock) › sky with the reading on its ground
 *                     › the next hours › the week
 *   MetalWeatherTile  the sky alone with the temperature and one word on its ground
 *
 * The sky is a description, not a picture: a `MetalWeatherSky` names the clouds, rain, snow,
 * thunder, mist, wind, heat, birds and the moon's phase; `MetalWeatherSky.of(kind)` holds one per
 * kind. `MetalWeatherScene.dots` draws a frame of it for an hour of the day, dot for dot as
 * `weatherScene` does on the web. Everything that moves steps one frame on the dot clock.
 * ───────────────────────────────────────────────────────── */

public enum MetalWeatherKind: String, Sendable, CaseIterable {
    case clear, partly, cloud, rain, drizzle, storm, snow, sleet, mist, windy, heat
}

/// A cloud: its centre (0–1 across and down to the horizon), its half-width in dots, whether it is dark.
public struct MetalWeatherCloud: Sendable, Equatable {
    public var x: Double
    public var y: Double
    public var size: Double
    public var dark: Bool
    public init(x: Double, y: Double, size: Double, dark: Bool = false) {
        self.x = x; self.y = y; self.size = size; self.dark = dark
    }
}

/// What the sky shows. Amounts run 0–1.
public struct MetalWeatherSky: Sendable, Equatable {
    public var clouds: [MetalWeatherCloud] = []
    /// The clouds hide the sun, the moon and the stars.
    public var overcast = false
    /// Rain under the clouds: 0.3 drizzle, 0.6 rain, 1 a downpour.
    public var rain: Double = 0
    public var snow: Double = 0
    /// Lightning from the clouds every few seconds.
    public var thunder = false
    public var mist: Double = 0
    public var wind: Double = 0
    /// Which way the wind blows: 1 left to right, -1 right to left.
    public var windFrom = 1
    public var heat: Double = 0
    /// Birds crossing a daytime sky.
    public var birds = 0
    /// The moon's age, 0–1 (0 new, 0.5 full). Nil: the phase on the date, or full.
    public var moonPhase: Double?

    public init(clouds: [MetalWeatherCloud] = [], overcast: Bool = false, rain: Double = 0, snow: Double = 0,
                thunder: Bool = false, mist: Double = 0, wind: Double = 0, windFrom: Int = 1, heat: Double = 0,
                birds: Int = 0, moonPhase: Double? = nil) {
        self.clouds = clouds; self.overcast = overcast; self.rain = rain; self.snow = snow; self.thunder = thunder
        self.mist = mist; self.wind = wind; self.windFrom = windFrom; self.heat = heat; self.birds = birds
        self.moonPhase = moonPhase
    }

    /// A sky for each kind (WEATHER_SKIES); change what you need.
    public static func of(_ kind: MetalWeatherKind) -> Self {
        typealias C = MetalWeatherCloud
        switch kind {
        case .clear: return .init(birds: 2)
        case .partly: return .init(clouds: [C(x: 0.18, y: 0.24, size: 3), C(x: 0.62, y: 0.42, size: 5)])
        case .cloud: return .init(clouds: [C(x: 0.1, y: 0.24, size: 4), C(x: 0.45, y: 0.4, size: 5, dark: true),
                                           C(x: 0.8, y: 0.2, size: 4), C(x: 0.65, y: 0.62, size: 3)], overcast: true)
        case .drizzle: return .init(clouds: [C(x: 0.3, y: 0.2, size: 5), C(x: 0.75, y: 0.28, size: 4)],
                                    overcast: true, rain: 0.3)
        case .rain: return .init(clouds: [C(x: 0.22, y: 0.2, size: 5, dark: true), C(x: 0.68, y: 0.3, size: 5, dark: true)],
                                 overcast: true, rain: 0.6)
        case .storm: return .init(clouds: [C(x: 0.12, y: 0.18, size: 6, dark: true), C(x: 0.52, y: 0.24, size: 6, dark: true),
                                           C(x: 0.92, y: 0.14, size: 5, dark: true)],
                                  overcast: true, rain: 1, thunder: true, wind: 0.5)
        case .snow: return .init(clouds: [C(x: 0.25, y: 0.14, size: 5), C(x: 0.72, y: 0.2, size: 4)],
                                 overcast: true, snow: 0.8)
        case .sleet: return .init(clouds: [C(x: 0.25, y: 0.16, size: 5, dark: true), C(x: 0.7, y: 0.22, size: 4)],
                                  overcast: true, rain: 0.4, snow: 0.4)
        case .mist: return .init(mist: 0.8)
        case .windy: return .init(clouds: [C(x: 0.4, y: 0.26, size: 3)], wind: 0.9)
        case .heat: return .init(heat: 1)
        }
    }
}

/// The dot-matrix sky, frame by frame (weatherScene). Dots are layer indices in `layers` order.
public enum MetalWeatherScene {
    public enum Layer: UInt8, CaseIterable, Sendable {
        case off, glow, star, moonDark, moon, sun, ray, heat, bird, snow, rain, bolt, cloud, cloudDark, fog, wind, hill, hz
    }

    static let sunrise = 7.5, sunset = 19.5

    /// The inks, one per layer, with the recipe's dimmer dots (glow, heat, fog, the moon's dark side).
    public static var inks: [MetalDotInk] {
        func alpha(_ key: String) -> Double { MetalRecipes.weather.text("ink.\(key)").flatMap(Double.init) ?? 1 }
        return Layer.allCases.map { layer in
            switch layer {
            case .off: return .init(.off)
            case .glow: return .init(.sun, alpha: alpha("glow-opacity"))
            case .star: return .init(.star)
            case .moonDark: return .init(.moon, alpha: alpha("moon-dark-opacity"))
            case .moon: return .init(.moon)
            case .sun, .ray, .bolt: return .init(.sun)
            case .heat: return .init(.sun, alpha: alpha("heat-opacity"))
            case .bird, .hill: return .init(.hill)
            case .snow: return .init(.snow)
            case .rain: return .init(.rain)
            case .cloud: return .init(.cloud)
            case .cloudDark, .wind: return .init(.cloudDark)
            case .fog: return .init(.cloud, alpha: alpha("fog-opacity"))
            case .hz: return .init(.hz)
            }
        }
    }

    private static func round(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }
    private static func wrap(_ v: Int, _ n: Int) -> Int { ((v % n) + n) % n }
    private static func wrap(_ v: Double, _ n: Double) -> Double {
        let r = v.truncatingRemainder(dividingBy: n)
        return (r + n).truncatingRemainder(dividingBy: n)
    }
    private static func clamp(_ v: Double) -> Double { min(1, max(0, v)) }
    private static func floorDiv(_ v: Int, _ d: Int) -> Int { Int((Double(v) / Double(d)).rounded(.down)) }

    static func isDay(_ hour: Double) -> Bool {
        let h = wrap(hour, 24)
        return h >= sunrise && h <= sunset
    }

    /// One frame: a layer index per dot, row by row, `cols × rows`.
    public static func dots(cols: Int, rows: Int, horizon hz: Int, hour: Double, sky: MetalWeatherSky, tick: Int = 0) -> [UInt8] {
        guard cols > 0, rows > 0, hz > 4 else { return [] }
        var grid = [UInt8](repeating: Layer.off.rawValue, count: cols * rows)
        let big = cols > 30
        func put(_ x: Double, _ y: Double, _ layer: Layer) {
            let x = round(x), y = round(y)
            if x < 0 || y < 0 || x >= cols || y >= hz { return }
            grid[y * cols + x] = layer.rawValue
        }
        func put(_ x: Int, _ y: Int, _ layer: Layer) { put(Double(x), Double(y), layer) }
        let h = wrap(hour, 24)
        let day = h >= sunrise && h <= sunset
        let td = (h - sunrise) / (sunset - sunrise)
        let tn = wrap(h - sunset, 24) / (24 - (sunset - sunrise))
        func arc(_ t: Double) -> (Double, Double) {
            (3 + t * Double(cols - 7), Double(hz - 1) - sin(.pi * t) * Double(hz - (big ? 8 : 6)))
        }
        let rain = clamp(sky.rain), snow = clamp(sky.snow), mist = clamp(sky.mist)
        let wind = clamp(sky.wind), heat = clamp(sky.heat)
        let dir = sky.windFrom < 0 ? -1 : 1
        let covered = sky.overcast

        // Dawn and dusk warm the dots along the horizon.
        if day && (td < 0.1 || td > 0.9) && !covered {
            for y in (hz - 4)..<hz { for x in 0..<cols where (x + y) % 2 == 0 && (y >= hz - 2 || x % 4 == 0) {
                put(x, y, .glow)
            } }
        }
        if !day && !covered {
            for s in 0..<(big ? 14 : 6) where wrap(tick + s * 3, 9) != 0 {
                put(wrap(s * 17 + 5, cols), wrap(s * 7 + 1, hz - 4), .star)
            }
        }
        if !covered {
            if day {
                let r = big ? 3.5 : 2.6
                let p = arc(td), sx = round(p.0), sy = round(p.1)
                for dx in -4...4 { for dy in -4...4 where Double(dx * dx + dy * dy) <= r * r + 0.3 {
                    put(sx + dx, sy + dy, .sun)
                } }
                let dirs: [(Double, Double)] = wrap(tick, 4) < 2
                    ? [(0, -1), (0, 1), (-1, 0), (1, 0)]
                    : [(-0.72, -0.72), (0.72, -0.72), (-0.72, 0.72), (0.72, 0.72)]
                for d in dirs {
                    var k = r + 1.6
                    while k <= r + 2.8 { put(Double(sx) + d.0 * k, Double(sy) + d.1 * k, .ray); k += 1 }
                }
                for b in 0..<min(3, max(0, sky.birds)) where big || b < 1 {
                    let bx = wrap(Int((Double(cols) * 0.55).rounded(.down)) + b * 7 + dir * floorDiv(tick, 2), cols + 4) - 2
                    let by = (big ? 6 : 4) + b * 3
                    let up = wrap(tick, 2) == 0 ? 1 : 0
                    put(bx - 1, by - up, .bird); put(bx, by, .bird); put(bx + 1, by - up, .bird)
                }
            } else {
                // The moon in its phase: lit dots and the faint rest of the disc.
                let r = big ? 3.2 : 2.3
                let age = sky.moonPhase ?? 0.5
                let q = arc(tn), mx = round(q.0), my = round(q.1)
                let lit = (1 - cos(age * 2 * .pi)) / 2
                for dx in -4...4 { for dy in -4...4 where Double(dx * dx + dy * dy) <= r * r + 0.4 {
                    let nx = Double(dx) / r
                    let on = age < 0.5 ? nx >= 1 - 2 * lit : nx <= -(1 - 2 * lit)
                    put(mx + dx, my + dy, on ? .moon : .moonDark)
                } }
            }
        }
        if heat > 0 {
            for x in stride(from: 1, to: cols, by: max(2, round(6 - heat * 2))) {
                for y in (hz - round(3 + heat * 4))..<hz where wrap(y + tick, 3) == 0 { put(x + wrap(y + tick, 2), y, .heat) }
            }
        }
        if snow > 0 {
            for f in 0..<round(snow * (big ? 42 : 15)) {
                let sway = round(sin(Double(tick) / 3 + Double(f))) + dir * round(wind * 3 * Double(floorDiv(tick, 2)) / 2)
                put(wrap(f * 13 + sway, cols), wrap(f * 7 + floorDiv(tick, 2), hz), .snow)
            }
        }

        let drift = Double(dir * tick) * (0.25 + wind * 0.7)
        let clouds: [(cx: Int, cy: Int, w: Int, layer: Layer)] = sky.clouds.map { c in
            let w = max(2, round(c.size * (0.55 + 0.45 * Double(cols) / 46)))
            let cx = wrap(round(c.x * Double(cols) + drift), cols + 2 * w + 4) - w - 2
            return (cx, round(c.y * Double(hz)), w, c.dark ? .cloudDark : .cloud)
        }
        if rain > 0 {
            let step = rain > 0.7 ? 1 : 2, fast = rain > 0.7 ? 2 : 1, gap = rain < 0.4 ? 6 : 4
            let slant = rain > 0.7 || wind > 0.4
            for c in clouds where c.w >= 1 {
                for x in (c.cx - c.w + 1)...(c.cx + c.w - 1) where wrap(x, step) == 0 && c.cy + 2 < hz {
                    for y in (c.cy + 2)..<hz where wrap(y - tick * fast + x * 3, gap) == 0 {
                        put(x - (slant ? dir * wrap(y, 2) : 0), y, .rain)
                    }
                }
            }
        }
        if sky.thunder && !clouds.isEmpty && wrap(tick, 18) < 3 && wrap(tick, 18) != 1 {
            let c0 = clouds.count > 1 ? clouds[1] : clouds[0]
            var lx = c0.cx
            if c0.cy + 2 < hz {
                for (step, y) in ((c0.cy + 2)..<hz).enumerated() {
                    lx += wrap(step, 6) < 3 ? -1 : 1
                    put(lx, y, .bolt); put(lx + 1, y, .bolt)
                }
            }
        }
        for c in clouds {
            let (cx, cy, w, layer) = c
            for x in (cx - w + 1)...(cx + w - 1) { put(x, cy + 1, layer) }
            for x in (cx - w)...(cx + w) { put(x, cy, layer) }
            if w >= 2 { for x in (cx - w + 1)...(cx + w - 2) { put(x, cy - 1, layer) } }
            for x in (cx - 1)...(cx + 2) { put(x, cy - 2, layer) }
            put(cx - w + 2, cy - 2, layer); put(cx - w + 3, cy - 2, layer)
            put(cx, cy - 3, layer); put(cx + 1, cy - 3, layer)
        }
        if mist > 0 {
            let all = big ? [2, 5, 8, 11] : [2, 4, 7]
            let bands = all.prefix(max(1, round(mist * Double(big ? 4 : 3))))
            for (i, d) in bands.enumerated() {
                let way = i % 2 == 1 ? -1 : 1
                for x in 0..<cols where wrap(x + way * floorDiv(tick, 2) + i * 3, 9) < 5 { put(x, hz - d, .fog) }
            }
        }
        if wind > 0.3 {
            for g in 0..<round(wind * Double(big ? 8 : 4)) {
                let wy = 2 + wrap(g * 5, hz - 4), len = 3 + g % 3
                let run = wrap(g * 17 + tick * 2, cols + 8) - 4
                let wx = dir > 0 ? run : cols - run - len
                for k in 0..<len { put(wx + k, wy, .wind) }
                put(dir > 0 ? wx + len : wx - 1, wy - 1, .wind)
            }
        }
        // The hills on the horizon.
        for x in 0..<cols {
            let hill = max(0, round(3 - abs(Double(x) - Double(cols) * 0.8) / 2.4))
                + max(0, round(1.6 - abs(Double(x) - Double(cols) * 0.12) / 2.2))
            for y in max(0, hz - hill)..<hz where y < rows { grid[y * cols + x] = Layer.hill.rawValue }
            if hz < rows { grid[hz * cols + x] = Layer.hz.rawValue }
        }
        return grid
    }

    // 7 × 7 dots. S sun, M moon, C cloud, D dark cloud, R rain, Z bolt, F fog, N snow, W wind.
    private static let glyphs: [String: [String]] = [
        "sun": ["...S...", ".S...S.", "..SSS..", "S.SSS.S", "..SSS..", ".S...S.", "...S..."],
        "moon": ["..MMM..", ".MM....", "MM.....", "MM.....", "MM.....", ".MM....", "..MMM.."],
        "partly": ["S.S....", ".SSS...", "SSSCC..", ".SCCCC.", "CCCCCCC", ".CCCCC.", "......."],
        "partlyNight": ["MM.....", "M......", "M..CC..", "MMCCCC.", "CCCCCCC", ".CCCCC.", "......."],
        "cloud": [".......", "..CC...", ".CCCCC.", "CCCCCCC", "CCCCCCC", ".CCCCC.", "......."],
        "drizzle": ["..CC...", ".CCCCC.", "CCCCCCC", ".CCCCC.", ".......", ".R...R.", "...R..."],
        "rain": ["..DD...", ".DDDDD.", "DDDDDDD", ".DDDDD.", ".......", ".R.R.R.", "R.R.R.."],
        "storm": ["..DD...", ".DDDDD.", "DDDDDDD", "..Z...R", ".ZZ..R.", "..Z....", ".Z....."],
        "snow": ["N..N..N", ".......", ".N..N..", ".......", "N..N..N", ".......", ".N..N.."],
        "sleet": ["..DD...", ".DDDDD.", "DDDDDDD", ".DDDDD.", ".......", ".N.R.N.", "R.N.R.."],
        "mist": ["FFFFF..", ".......", "..FFFFF", ".......", "FFFFF..", ".......", ".FFFFFF"],
        "windy": ["WWWWW..", ".....W.", "WWWWW..", ".......", "WWWWWW.", "......W", "WWWW..."],
        "heat": [".SSS...", "SSSSS..", ".SSS...", ".......", "S.S.S.S", ".S.S.S.", "......."],
    ]
    private static let glyphLayer: [Character: Layer] = [
        "S": .sun, "M": .moon, "C": .cloud, "D": .cloudDark, "R": .rain, "Z": .bolt, "F": .fog, "N": .snow, "W": .wind,
    ]

    /// A 7 × 7 glyph for a kind; a clear or partly cloudy night draws the moon.
    public static func glyph(_ kind: MetalWeatherKind, hour: Double = 12) -> [UInt8] {
        let day = isDay(hour)
        let key = kind == .clear ? (day ? "sun" : "moon") : kind == .partly && !day ? "partlyNight" : kind.rawValue
        var out = [UInt8](repeating: Layer.off.rawValue, count: 49)
        for (y, row) in (glyphs[key] ?? glyphs["cloud"]!).enumerated() {
            for (x, c) in row.enumerated() { if let layer = glyphLayer[c] { out[y * 7 + x] = layer.rawValue } }
        }
        return out
    }

    /// The glyph's inks: fog is a whole cloud dot at this size.
    public static var glyphInks: [MetalDotInk] {
        var inks = inks
        inks[Int(Layer.fog.rawValue)] = .init(.cloud)
        return inks
    }
}

/// The moon's age on a date, 0–1 (0 new, 0.5 full).
public func metalMoonAge(_ date: Date) -> Double {
    let fullMoon = Date(timeIntervalSince1970: 1_790_441_340)  // 2026-09-26 16:49 UTC
    let age = (date.timeIntervalSince(fullMoon) / 86_400 / 29.530589 + 0.5).truncatingRemainder(dividingBy: 1)
    return age < 0 ? age + 1 : age
}

public struct MetalWeatherHour: Sendable {
    /// "Now", "12", "15"…
    public var label: String
    /// The hour of day it stands for (0–24), so night hours draw the moon.
    public var hour: Double
    public var kind: MetalWeatherKind
    /// The temperature as shown: "19°".
    public var temp: String
    public var accessibilityLabel: String
    public init(label: String, hour: Double, kind: MetalWeatherKind, temp: String, accessibilityLabel: String) {
        self.label = label; self.hour = hour; self.kind = kind; self.temp = temp; self.accessibilityLabel = accessibilityLabel
    }
}

public struct MetalWeatherDay: Sendable {
    /// "Today", "Sun", "Mon"…
    public var name: String
    public var kind: MetalWeatherKind
    /// In the unit you show.
    public var low: Int
    public var high: Int
    public var accessibilityLabel: String
    public init(name: String, kind: MetalWeatherKind, low: Int, high: Int, accessibilityLabel: String) {
        self.name = name; self.kind = kind; self.low = low; self.high = high; self.accessibilityLabel = accessibilityLabel
    }
}

/// The sky in its well, stepping on the dot clock (or held on `tick`); children sit on its ground.
private struct WeatherSkyDots: View {
    let cols: Int, rows: Int, horizon: Int
    let hour: Double
    let sky: MetalWeatherSky
    let running: Bool
    let tick: Int?

    var body: some View {
        if let tick {
            frame(tick)
        } else {
            MetalDotClock(running: running) { frame($0) }
        }
    }

    private func frame(_ t: Int) -> some View {
        MetalDotDisplay(cols: cols, rows: rows,
                        dots: MetalWeatherScene.dots(cols: cols, rows: rows, horizon: horizon, hour: hour, sky: sky, tick: t),
                        inks: MetalWeatherScene.inks)
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

/// The temperature in the pixel face on the sky's ground, the condition and one readout beside it.
private struct WeatherNow: View {
    let temp: String
    let condition: String
    let readout: String?
    let tile: Bool
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let r = MetalRecipes.weather, t = colorway.tokens
        HStack(alignment: .bottom, spacing: tile ? .zero : r.points("self.gap")) {
            Text(temp).font(.metal(MetalType.pixel)).foregroundColor(t.ink.color)
            Spacer(minLength: .zero)
            VStack(alignment: .trailing, spacing: r.points("header.gap")) {
                if tile {
                    WeatherEngraved(text: condition)
                } else {
                    Text(condition).font(.metal(MetalType.content)).foregroundColor(t.ink.color)
                }
                if let readout { Text(readout).font(.metal(MetalType.readout)).foregroundColor(t.ink2.color) }
            }
            .padding(.bottom, r.points(tile ? "tile.lift" : "screen.lift"))
        }
        .padding(.horizontal, r.points(tile ? "tile.inset" : "screen.inset"))
        .padding(.bottom, r.points("screen.foot"))
    }
}

/// A small weather tile: the sky with the temperature and one word on its ground.
public struct MetalWeatherTile: View {
    public var sky: MetalWeatherSky
    public var hour: Double
    public var temp: String
    public var name: String
    public var meta: String?
    public var running: Bool
    public var tick: Int?
    public var accessibilityLabel: String

    public init(sky: MetalWeatherSky, hour: Double, temp: String, name: String, meta: String? = nil,
                running: Bool = true, tick: Int? = nil, accessibilityLabel: String) {
        self.sky = sky; self.hour = hour; self.temp = temp; self.name = name; self.meta = meta
        self.running = running; self.tick = tick; self.accessibilityLabel = accessibilityLabel
    }

    public var body: some View {
        let r = MetalRecipes.weather
        MetalSurface(.raise, radius: .card) {
            MetalWell(.field, radius: r.points("screen.radius")) {
                ZStack(alignment: .bottom) {
                    WeatherSkyDots(cols: 21, rows: 21, horizon: 13, hour: hour, sky: sky, running: running, tick: tick)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    WeatherNow(temp: temp, condition: name, readout: meta, tile: true)
                }
                .frame(height: r.points("tile.screen"))
                .clipShape(RoundedRectangle(cornerRadius: r.points("screen.radius"), style: .continuous))
            }
            .padding(r.points("tile.pad"))
            .frame(width: r.points("tile.size"), height: r.points("tile.size"))
        }
        .accessibilityElement(children: .ignore).accessibilityAddTraits(.isImage)
        .accessibilityLabel(accessibilityLabel)
    }
}

/// The large weather widget: a header, the sky, the next hours and the week.
public struct MetalWeather: View {
    public var place: String
    public var summary: String?
    /// The LED beside "Live"; false shows "Paused" on an idle LED; nil hides the status.
    public var live: Bool?
    /// The clock beside the status: "09:00".
    public var clock: String?
    /// The time of day in hours (9.5 is 09:30). Moves the sun and the moon.
    public var hour: Double
    public var sky: MetalWeatherSky
    public var condition: String
    /// The temperature now, as shown: "19°".
    public var temp: String
    /// One line under the condition: "Feels 18° · Rain 0% · 9 km/h".
    public var readout: String?
    /// How the sky reads to a screen reader: "Lisbon: sunny, 19°".
    public var skyLabel: String
    /// Up to six slots, now first.
    public var hours: [MetalWeatherHour]
    /// Up to seven days, today first.
    public var days: [MetalWeatherDay]
    /// The shared scale, one dot a degree (default 10–30; at most 21 degrees fit).
    public var scale: ClosedRange<Int>
    /// The temperature now in the unit shown: a dark dot on today's row.
    public var now: Double?
    public var running: Bool
    public var tick: Int?
    @Environment(\.metalColorway) private var colorway

    public init(place: String, summary: String? = nil, live: Bool? = true, clock: String? = nil, hour: Double,
                sky: MetalWeatherSky, condition: String, temp: String, readout: String? = nil, skyLabel: String,
                hours: [MetalWeatherHour] = [], days: [MetalWeatherDay] = [], scale: ClosedRange<Int> = 10...30,
                now: Double? = nil, running: Bool = true, tick: Int? = nil) {
        self.place = place; self.summary = summary; self.live = live; self.clock = clock; self.hour = hour
        self.sky = sky; self.condition = condition; self.temp = temp; self.readout = readout; self.skyLabel = skyLabel
        self.hours = hours; self.days = days; self.scale = scale; self.now = now; self.running = running; self.tick = tick
    }

    public var body: some View {
        let r = MetalRecipes.weather
        MetalSurface(.raise, radius: .card) {
            VStack(spacing: r.points("self.gap")) {
                header(r)
                skyWell(r)
                if !hours.isEmpty { hourStrip(r) }
                if !days.isEmpty {
                    MetalRule(.horizontal).padding(.horizontal, r.points("header.inset"))
                    week(r)
                }
                Spacer(minLength: .zero)
            }
            .padding(r.points("self.pad"))
            .frame(width: r.points("self.width"), height: r.points("self.height"), alignment: .top)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Weather in \(place)")
    }

    private func header(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        return HStack(alignment: .top, spacing: r.points("self.gap")) {
            VStack(alignment: .leading, spacing: r.points("header.gap")) {
                Text(place).font(.metal(MetalType.display)).foregroundColor(t.ink.color)
                if let summary { Text(summary).font(.metal(MetalType.meta)).foregroundColor(t.ink2.color) }
            }
            Spacer(minLength: .zero)
            if let live {
                HStack(spacing: r.points("header.led-gap")) {
                    MetalLED(live ? .live : .off)
                    Text(live ? "Live" : "Paused").font(.metal(MetalType.meta)).foregroundColor(t.ink2.color)
                    if let clock { Text(clock).font(.metal(MetalType.readout)).foregroundColor(t.ink2.color) }
                }
                .frame(height: r.points("header.height"))
            }
        }
        .padding(.horizontal, r.points("header.inset"))
        .padding(.top, r.points("header.top"))
    }

    private func skyWell(_ r: MetalObjectRecipe) -> some View {
        MetalWell(.field, radius: r.points("screen.radius")) {
            ZStack(alignment: .bottom) {
                WeatherSkyDots(cols: 46, rows: 28, horizon: 21, hour: hour, sky: sky, running: running, tick: tick)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                WeatherNow(temp: temp, condition: condition, readout: readout, tile: false)
            }
            .frame(height: r.points("screen.height"))
            .clipShape(RoundedRectangle(cornerRadius: r.points("screen.radius"), style: .continuous))
        }
        .frame(height: r.points("screen.height"))
        .accessibilityElement(children: .ignore).accessibilityAddTraits(.isImage).accessibilityLabel(skyLabel)
    }

    private func hourStrip(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        let slots = Array(hours.prefix(6))
        return HStack(spacing: .zero) {
            ForEach(slots.indices, id: \.self) { i in
                let slot = slots[i]
                VStack(spacing: r.points("hour.gap")) {
                    WeatherEngraved(text: slot.label)
                    MetalDotDisplay(cols: 7, rows: 7, dots: MetalWeatherScene.glyph(slot.kind, hour: slot.hour),
                                    inks: MetalWeatherScene.glyphInks, size: .mini)
                        .frame(width: r.points("hour.glyph"), height: r.points("hour.glyph"))
                    Text(slot.temp).font(.metal(MetalType.pixelSmall)).foregroundColor(t.ink.color)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityElement(children: .ignore).accessibilityLabel(slot.accessibilityLabel)
            }
            // Six columns, as the web grid, even with fewer slots.
            ForEach(slots.count..<6, id: \.self) { _ in Color.clear.frame(maxWidth: .infinity) }
        }
        .frame(height: r.points("hour.height"))
        .accessibilityElement(children: .contain).accessibilityLabel("Next hours")
    }

    private var span: Int { min(20, max(1, scale.upperBound - scale.lowerBound)) }

    private func degrees(_ n: Double) -> String { "\(Int((n + 0.5).rounded(.down)))°" }

    private func week(_ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        let lo = scale.lowerBound
        return VStack(spacing: r.points("week.gap")) {
            HStack(spacing: r.points("week.col")) {
                WeatherEngraved(text: "\(days.count) days").frame(width: r.points("week.day"), alignment: .leading)
                Color.clear.frame(width: r.points("week.glyph"), height: r.points("week.glyph"))
                WeatherEngraved(text: "Low").frame(width: r.points("week.value"), alignment: .trailing)
                HStack(spacing: .zero) {
                    Text(degrees(Double(lo)))
                    Spacer(minLength: .zero)
                    Text(degrees(Double(lo) + Double(span) / 2))
                    Spacer(minLength: .zero)
                    Text(degrees(Double(lo + span)))
                }
                .font(.metal(MetalType.readout)).foregroundColor(t.ink2.color)
                .frame(width: r.points("week.bar"))
                WeatherEngraved(text: "High").frame(width: r.points("week.value"), alignment: .leading)
            }
            .frame(height: r.points("week.row"))
            .accessibilityHidden(true)
            ForEach(Array(days.prefix(7).enumerated()), id: \.offset) { i, day in weekRow(day, today: i == 0, r) }
        }
        .padding(.horizontal, r.points("header.inset"))
        .accessibilityElement(children: .contain).accessibilityLabel("The week")
    }

    private static func paint(_ kind: MetalWeatherKind) -> MetalDotColour {
        switch kind {
        case .clear, .partly, .heat: .sun
        case .cloud, .mist, .windy: .cloudDark
        case .drizzle, .rain, .storm: .rain
        case .sleet, .snow: .snow
        }
    }

    private func weekRow(_ day: MetalWeatherDay, today: Bool, _ r: MetalObjectRecipe) -> some View {
        let t = colorway.tokens
        let lo = scale.lowerBound
        var dots = [UInt8](repeating: 0, count: span + 1)
        for d in 0...span where lo + d >= day.low && lo + d <= day.high { dots[d] = 1 }
        if today, let now {
            let at = Int((now + 0.5).rounded(.down)) - lo
            if dots.indices.contains(at) { dots[at] = 2 }
        }
        let glyphScale = r.points("week.glyph") / r.points("hour.glyph")
        return HStack(spacing: r.points("week.col")) {
            Text(day.name).font(.metal(today ? MetalType.title : MetalType.ui)).foregroundColor(t.ink.color)
                .frame(width: r.points("week.day"), alignment: .leading)
            MetalDotDisplay(cols: 7, rows: 7, dots: MetalWeatherScene.glyph(day.kind), inks: MetalWeatherScene.glyphInks,
                            size: .mini)
                .scaleEffect(glyphScale)
                .frame(width: r.points("week.glyph"), height: r.points("week.glyph"))
            Text(degrees(Double(day.low))).font(.metal(MetalType.ui)).foregroundColor(t.ink2.color)
                .frame(width: r.points("week.value"), alignment: .trailing)
            MetalDotDisplay(cols: span + 1, rows: 1, dots: dots,
                            inks: [.init(.off), .init(Self.paint(day.kind)), .init(.ink)])
                .frame(width: r.points("week.bar"), height: r.points("week.bar-height"))
            Text(degrees(Double(day.high))).font(.metal(MetalType.title)).foregroundColor(t.ink.color)
                .frame(width: r.points("week.value"), alignment: .leading)
        }
        .frame(height: r.points("week.row"))
        .accessibilityElement(children: .ignore).accessibilityLabel(day.accessibilityLabel)
    }
}
