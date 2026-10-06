import SwiftUI

// Phone input: a number the way you'd say it, with its country; the value is E.164. Mirrors
// components/phone-input (phone-input.agent.md) on the field, menu, combobox and phone-input recipes:
// one well led by the country key (flag and chevron), the dial code engraved after it, the number grouped
// as you type; "+" and pasted numbers move the country (area codes split shared codes); the readback
// says the country once the number is whole; too short or too long is said on leaving.
// MetalField has no leading slot for a key, so the well is drawn here on the same recipe.

/// A country's numbering rules, merged over ours by `code` (see `MetalPhoneInput(countries:)`).
public struct MetalPhoneCountry: Sendable {
    /// ISO 3166-1 alpha-2: "GB".
    public let code: String
    /// The dial code's digits: "44".
    public let dial: String
    /// Leading national digits that send a shared dial code here (+1 416 is Canada).
    public var areas: [String]
    /// The national trunk prefix ("0"; "" for none). nil: the main country's, else "0".
    public var trunk: String?
    /// How many digits a national number has, without the trunk.
    public var length: ClosedRange<Int>?
    /// Leading national digits of mobile numbers.
    public var mobile: [String]?
    /// Groupings by leading digits, `#` a digit: [("7", "#### ######"), ("", "## #### ####")].
    public var formats: [MetalPhoneFormat]?

    public init(code: String, dial: String, areas: [String] = [], trunk: String? = nil, length: ClosedRange<Int>? = nil,
                mobile: [String]? = nil, formats: [MetalPhoneFormat]? = nil) {
        self.code = code
        self.dial = dial
        self.areas = areas
        self.trunk = trunk
        self.length = length
        self.mobile = mobile
        self.formats = formats
    }
}

/// A grouping for numbers that start with `lead` ("" for any): `#` a digit, anything else written between them.
public struct MetalPhoneFormat: Sendable {
    public let lead: String
    public let pattern: String
    public init(_ lead: String, _ pattern: String) {
        self.lead = lead
        self.pattern = pattern
    }
}

/// Our table and the reading of numbers. React's phone-input.tsx parses the same two strings
/// (e2e/phone-input.spec.ts fails if they differ). ponytail: lengths and groupings, not number-plan validity.
struct MetalPhoneTable {
    struct Rule: Sendable {
        let code: String
        let dial: String
        let areas: [String]
        let trunk: String
        let length: ClosedRange<Int>
        let mobile: [String]
        let formats: [MetalPhoneFormat]
    }

    struct Reading {
        let country: Rule
        /// The national significant number: no trunk, no dial code.
        let nsn: String
        /// The trunk as typed, shown until leaving.
        let trunk: String
        /// A "+" whose code isn't finished.
        let pending: Bool
    }

    static let dials = "AC247 AD376 AE971 AF93 AG1(268) AI1(264) AL355 AM374 AO244 AR54 AS1(684) AT43 AU61 AW297 AX358(18) AZ994 BA387 BB1(246) BD880 BE32 BF226 BG359 BH973 BI257 BJ229 BM1(441) BN673 BO591 BQ599(3 4 7) BR55 BS1(242) BT975 BW267 BY375 BZ501 CA1(204 226 236 249 250 257 263 273 289 306 343 354 365 367 368 382 387 403 416 418 428 431 437 438 450 460 468 474 506 514 519 548 579 581 584 587 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 867 873 879 902 905 942) CC61(89162) CD243 CF236 CG242 CH41 CI225 CK682 CL56 CM237 CN86 CO57 CR506 CU53 CV238 CW599(9) CX61(89164) CY357 CZ420 DE49 DJ253 DK45 DM1(767) DO1(809 829 849) DZ213 EC593 EE372 EG20 EH212(5288 5289) ER291 ES34 ET251 FI358 FJ679 FK500 FM691 FO298 FR33 GA241 GB44 GD1(473) GE995 GF594 GG44(1481 7781 7839 7911) GH233 GI350 GL299 GM220 GN224 GP590 BL590 MF590 GQ240 GR30 GT502 GU1(671) GW245 GY592 HK852 HN504 HR385 HT509 HU36 ID62 IE353 IL972 IM44(1624 7524 7624 7924) IN91 IO246 IQ964 IR98 IS354 IT39 JE44(1534 7509 77003 77007 77008 7797 7829 7937) JM1(876 658) JO962 JP81 KE254 KG996 KH855 KI686 KM269 KN1(869) KP850 KR82 KW965 KY1(345) KZ7(6 7) LA856 LB961 LC1(758) LI423 LK94 LR231 LS266 LT370 LU352 LV371 LY218 MA212 MC377 MD373 ME382 MG261 MH692 MK389 ML223 MM95 MN976 MO853 MP1(670) MQ596 MR222 MS1(664) MT356 MU230 MV960 MW265 MX52 MY60 MZ258 NA264 NC687 NE227 NF672 NG234 NI505 NL31 NO47 NP977 NR674 NU683 NZ64 OM968 PA507 PE51 PF689 PG675 PH63 PK92 PL48 PM508 PR1(787 939) PS970 PT351 PW680 PY595 QA974 RE262 RO40 RS381 RU7 RW250 SA966 SB677 SC248 SD249 SE46 SG65 SH290 SI386 SJ47(79) SK421 SL232 SM378 SN221 SO252 SR597 SS211 ST239 SV503 SX1(721) SY963 SZ268 TC1(649) TD235 TG228 TH66 TJ992 TK690 TL670 TM993 TN216 TO676 TR90 TT1(868) TV688 TW886 TZ255 UA380 UG256 US1 UY598 UZ998 VA39(06698) VC1(784) VE58 VG1(284) VI1(340) VN84 VU678 WF681 WS685 XK383 YE967 YT262(269 639) ZA27 ZM260 ZW263"

    static let rules = """
        US 1 10-10 - :(###)_###-####
        GB 0 9-10 7 7:####_######,2:##_####_####,3:###_###_####,8:###_###_####,:####_######
        DE 0 6-12 15,16,17 15:####_#######,16:###_########,17:###_########,30:##_########,40:##_########,69:##_########,89:##_########,:###_########
        FR 0 9-9 6,7 :#_##_##_##_##
        ES - 9-9 6,7 :###_##_##_##
        IT - 6-11 3 3:###_###_####,0:##_####_####
        PT - 9-9 9 :###_###_###
        NL 0 9-9 6 6:#_########,:##_###_####
        BE 0 8-9 4 4:###_##_##_##,:#_###_##_##
        CH 0 9-9 7 :##_###_##_##
        AT 0 4-13 6 :###_########
        IE 0 7-9 8 8:##_###_####,:#_###_####
        SE 0 7-9 7 7:##_###_##_##,8:#_###_###_##,:##_###_##_##
        NO - 8-8 4,9 4:###_##_###,9:###_##_###,:##_##_##_##
        DK - 8-8 - :##_##_##_##
        FI 0 5-12 4,50 :##_###_####
        PL - 9-9 - :###_###_###
        CZ - 9-9 6,7 :###_###_###
        GR - 10-10 69 :###_###_####
        HU 06 8-9 20,30,31,50,70 :##_###_####
        RO 0 9-9 7 :###_###_###
        RU 8 10-10 9 :###_###-##-##
        UA 0 9-9 - :##_###_##_##
        TR 0 10-10 5 :###_###_##_##
        IL 0 8-9 5 5:##-###-####,:#-###-####
        AE 0 8-9 5 5:##_###_####,:#_###_####
        SA 0 9-9 5 :##_###_####
        EG 0 9-10 1 :###_###_####
        ZA 0 9-9 6,7,8 :##_###_####
        NG 0 8-10 70,80,81,90,91 :###_###_####
        KE 0 9-9 7,1 :###_######
        IN 0 10-10 6,7,8,9 :#####_#####
        PK 0 10-10 3 :###_#######
        BD 0 10-10 1 :####_######
        CN 0 10-11 1 1:###_####_####,:##_####_####
        JP 0 9-10 70,80,90 70:##_####_####,80:##_####_####,90:##_####_####,3:#_####_####,6:#_####_####,:##_####_####
        KR 0 8-10 10 10:##_####_####,2:#_####_####,:##_###_####
        HK - 8-8 5,6,9 :####_####
        SG - 8-8 8,9 :####_####
        MY 0 9-10 1 :##_###_####
        TH 0 8-9 6,8,9 :##_###_####
        VN 0 9-10 3,5,7,8,9 :##_###_##_##
        PH 0 10-10 9 :###_###_####
        ID 0 9-12 8 :###_####_####
        AU 0 9-9 4 4:###_###_###,:#_####_####
        NZ 0 8-10 2 2:##_###_####,:#_###_####
        BR 0 10-11 - :##_####-####,:##_#####-####
        MX - 10-10 - :##_####_####
        AR 0 10-10 - :##_####-####
        CO - 10-10 3 :###_###_####
        CL - 9-9 9 :#_####_####
        PE - 8-9 9 :###_###_###
        """

    static let generic = [MetalPhoneFormat("", "### ### ####"), MetalPhoneFormat("", "#### #### #######")]

    static let ours: [MetalPhoneCountry] = {
        var out: [MetalPhoneCountry] = []
        for m in dials.matches(of: #/([A-Z]{2})(\d+)(?:\(([\d ]+)\))?/#) {
            out.append(MetalPhoneCountry(code: String(m.1), dial: String(m.2), areas: m.3.map { $0.split(separator: " ").map(String.init) } ?? []))
        }
        for line in rules.split(separator: "\n") {
            let f = line.trimmingCharacters(in: .whitespaces).split(separator: " ").map(String.init)
            guard f.count == 5, let at = out.firstIndex(where: { $0.code == f[0] }) else { continue }
            let len = f[2].split(separator: "-").compactMap { Int($0) }
            out[at].trunk = f[1] == "-" ? "" : f[1]
            out[at].length = (len.first ?? .zero)...(len.last ?? .zero)
            out[at].mobile = f[3] == "-" ? [] : f[3].split(separator: ",").map(String.init)
            out[at].formats = f[4].split(separator: ",").map { entry in
                let parts = entry.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
                return MetalPhoneFormat(String(parts.first ?? ""), String(parts.last ?? "").replacingOccurrences(of: "_", with: " "))
            }
        }
        return out
    }()

    let byCode: [String: Rule]
    let byDial: [String: [Rule]]
    let list: [Rule]

    init(extra: [MetalPhoneCountry] = [], only: [String]? = nil) {
        var raw = Self.ours
        for c in extra {
            if let at = raw.firstIndex(where: { $0.code == c.code }) {
                let old = raw[at]
                raw[at] = MetalPhoneCountry(code: c.code, dial: c.dial, areas: c.areas.isEmpty ? old.areas : c.areas, trunk: c.trunk ?? old.trunk,
                                            length: c.length ?? old.length, mobile: c.mobile ?? old.mobile, formats: c.formats ?? old.formats)
            } else { raw.append(c) }
        }
        var mains: [String: MetalPhoneCountry] = [:]
        for c in raw where c.areas.isEmpty && mains[c.dial] == nil { mains[c.dial] = c }
        var byCode: [String: Rule] = [:]
        var byDial: [String: [Rule]] = [:]
        var list: [Rule] = []
        for c in raw {
            let main = mains[c.dial] ?? c
            let rule = Rule(code: c.code, dial: c.dial, areas: c.areas, trunk: c.trunk ?? main.trunk ?? "0",
                            length: c.length ?? main.length ?? 4...(15 - c.dial.count), mobile: c.mobile ?? main.mobile ?? [],
                            formats: c.formats ?? main.formats ?? Self.generic)
            byCode[c.code] = rule
            byDial[c.dial, default: []].append(rule)
            if only?.contains(c.code) ?? true { list.append(rule) }
        }
        self.byCode = byCode
        self.byDial = byDial
        self.list = list
    }

    static func digits(_ s: String) -> String { String(s.filter { $0.isASCII && $0.isNumber }) }

    /// The one sharing a code: the one whose area matches, else the current one, else the main one.
    func pick(_ siblings: [Rule], _ nsn: String, _ current: Rule) -> Rule {
        siblings.first { $0.areas.contains { nsn.hasPrefix($0) } }
            ?? siblings.first { $0.code == current.code }
            ?? siblings.first { $0.areas.isEmpty }
            ?? siblings.first ?? current
    }

    /// Typed or pasted text in the current country: international ("+44…", "0044…", "011…") or national.
    func read(_ text: String, in current: Rule) -> Reading {
        let digits = Self.digits(text)
        let plus = text.trimmingCharacters(in: .whitespaces).hasPrefix("+")
        let idd = plus ? .zero : digits.hasPrefix("00") ? 2 : current.dial == "1" && digits.hasPrefix("011") ? 3 : -1
        if idd >= .zero {
            let rest = String(digits.dropFirst(idd))
            for len in 1...3 where len <= rest.count {
                guard let siblings = byDial[String(rest.prefix(len))] else { continue }
                var nsn = String(rest.dropFirst(len))
                let country = pick(siblings, nsn, current)
                // "+44 (0)7700…": a trunk after the code is a habit, not part of the number.
                if !country.trunk.isEmpty, nsn.hasPrefix(country.trunk) { nsn.removeFirst(country.trunk.count) }
                return Reading(country: country, nsn: nsn, trunk: "", pending: false)
            }
            return Reading(country: current, nsn: rest, trunk: "", pending: true)
        }
        let trunk = !current.trunk.isEmpty && digits.hasPrefix(current.trunk) ? current.trunk : ""
        let nsn = String(digits.dropFirst(trunk.count))
        // An area code that belongs to a sibling moves there (416 is Canada's, typed in the US).
        return Reading(country: pick(byDial[current.dial] ?? [current], nsn, current), nsn: nsn, trunk: trunk, pending: false)
    }

    /// The national number grouped by the first pattern whose lead matches and that holds the digits.
    static func group(_ country: Rule, _ nsn: String) -> String {
        let fits = country.formats.filter { nsn.hasPrefix($0.lead) }
        let pattern = (fits.first { $0.pattern.filter { $0 == "#" }.count >= nsn.count } ?? fits.last ?? generic[1]).pattern
        var out = ""
        var rest = Substring(nsn)
        // A separator is written only when a digit follows it.
        for ch in pattern {
            guard let next = rest.first else { break }
            if ch == "#" { out.append(next); rest = rest.dropFirst() } else { out.append(ch) }
        }
        return out + rest
    }

    static func show(_ r: Reading) -> String {
        if r.pending { return "+" + r.nsn }
        let rest = group(r.country, r.nsn)
        if r.trunk.isEmpty { return rest }
        return r.trunk == "0" || rest.isEmpty ? r.trunk + rest : r.trunk + " " + rest
    }

    /// The flag: the two regional-indicator letters of the ISO code.
    static func flag(_ code: String) -> String {
        let base = Unicode.Scalar("🇦").value - Unicode.Scalar("A").value
        return String(String.UnicodeScalarView(code.uppercased().unicodeScalars.compactMap { Unicode.Scalar(base + $0.value) }))
    }
}

/// A phone number the way you'd say it, with its country. `value` is E.164 once the number is complete, nil before.
public struct MetalPhoneInput: View {
    let label: String
    @Binding var value: String?
    let recent: [String]
    let only: [String]?
    let size: MetalFieldSize
    let readback: Bool
    let invalid: Bool
    let table: MetalPhoneTable
    let fallback: String
    /// Headless captures: ImageRenderer cannot draw a text field, so the number is drawn as text.
    var snapshot = false

    @Environment(\.locale) private var locale
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.metalFormInvalid) private var formInvalid
    @FocusState private var focused: Bool
    @State private var text: String
    @State private var code: String
    @State private var writing: String?
    @State private var left = false
    @State private var open = false
    @State private var query = ""
    @State private var picked: [String] = []
    @State private var hovered: String?

    /// - Parameters:
    ///   - defaultCountry: the country to start in (ISO); nil: the locale's region, else US.
    ///   - recent: countries offered first under Recent; picks made here join them.
    ///   - only: only these countries are listed and accepted.
    ///   - countries: rules merged over ours by ISO code.
    public init(_ label: String, value: Binding<String?>, defaultCountry: String? = nil, recent: [String] = [], only: [String]? = nil,
                countries: [MetalPhoneCountry] = [], size: MetalFieldSize = .regular, readback: Bool = true, invalid: Bool = false) {
        self.label = label
        self._value = value
        self.recent = recent
        self.only = only
        self.size = size
        self.readback = readback
        self.invalid = invalid
        let table = MetalPhoneTable(extra: countries, only: only)
        self.table = table
        let want = [defaultCountry, Locale.current.region?.identifier, "US", table.list.first?.code]
        let fallback = want.compactMap { $0 }.first { table.byCode[$0] != nil && (only?.contains($0) ?? true) } ?? "US"
        self.fallback = fallback
        let start = table.byCode[fallback] ?? table.list[.zero]
        let r = value.wrappedValue.map { table.read($0, in: start) }
        _code = State(initialValue: r?.country.code ?? start.code)
        _text = State(initialValue: r.map(MetalPhoneTable.show) ?? "")
    }

    private var country: MetalPhoneTable.Rule { table.byCode[code] ?? table.byCode[fallback] ?? table.list[.zero] }
    private var reading: MetalPhoneTable.Reading { table.read(text, in: country) }
    private func fits(_ r: MetalPhoneTable.Reading) -> Bool { r.country.length.contains(r.nsn.count) }
    private func allowed(_ r: MetalPhoneTable.Reading) -> Bool { only?.contains(r.country.code) ?? true }
    private func valueOf(_ t: String, _ r: MetalPhoneTable.Reading) -> String? {
        !t.isEmpty && !r.pending && fits(r) && allowed(r) ? "+" + r.country.dial + r.nsn : nil
    }
    private func name(_ code: String) -> String { locale.localizedString(forRegionCode: code) ?? code }

    private var message: String? {
        let r = reading
        guard !text.isEmpty else { return nil }
        if r.pending { return "Type the country code after +, or choose a country" }
        if !allowed(r) { return "Numbers in \(name(r.country.code)) aren’t accepted here" }
        if !fits(r) {
            let l = r.country.length
            return "\(name(r.country.code)) numbers have \(l.lowerBound == l.upperBound ? "\(l.lowerBound)" : "\(l.lowerBound) to \(l.upperBound)") digits"
        }
        return nil
    }

    private var said: String? {
        let r = reading
        guard valueOf(text, r) != nil else { return nil }
        return name(r.country.code) + (r.country.mobile.contains { r.nsn.hasPrefix($0) } ? " · mobile" : "")
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.formField.points("self.gap")) {
            well
            if left, let message {
                Text(message).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.invalid.color)
            } else if readback, let said {
                Text(said).font(.metal(MetalType.readout)).foregroundColor(colorway.tokens.ink2.color)
                    .contentTransition(.numericText())
            }
        }
        .metalAnimation(.settle, value: said)
        .onChange(of: text) { old, new in typed(old, new) }
        .onChange(of: focused) { _, now in if !now { leave() } }
        .onChange(of: value) { _, new in
            guard new != valueOf(text, reading) else { return }
            write(new.map { table.read($0, in: country) })
        }
    }

    // MARK: typing

    /// Regroups what was typed; a deleted separator takes the digit before it (alone it would only come back).
    private func typed(_ old: String, _ new: String) {
        if new == writing { writing = nil; return }
        var raw = Array(new)
        if new.count + 1 == old.count, MetalPhoneTable.digits(new) == MetalPhoneTable.digits(old) {
            let at = zip(old, new).enumerated().first { $0.element.0 != $0.element.1 }?.offset ?? new.count
            if let digit = raw[..<at].lastIndex(where: { $0.isASCII && $0.isNumber }) { raw.remove(at: digit) }
        }
        left = false
        write(table.read(String(raw), in: country))
    }

    private func write(_ r: MetalPhoneTable.Reading?) {
        let next = r.map(MetalPhoneTable.show) ?? ""
        if let r { code = r.country.code }
        if next != text { writing = next; text = next }
        let v = r.flatMap { valueOf(next, $0) }
        if v != value { value = v }
    }

    /// Leaving drops a typed trunk (the engraved code says it), and says what is wrong.
    private func leave() {
        let r = reading
        if !r.trunk.isEmpty, !r.pending {
            let next = MetalPhoneTable.group(r.country, r.nsn)
            writing = next
            text = next
        }
        left = message != nil
    }

    private func choose(_ c: MetalPhoneTable.Rule) {
        picked = Array(([c.code] + picked.filter { $0 != c.code }).prefix(3))
        open = false
        left = false
        let r = reading
        code = c.code
        write(r.pending ? nil : table.read(MetalPhoneTable.group(c, r.nsn), in: c))
        focused = true
    }

    // MARK: the well (the field recipe)

    private var well: some View {
        let field = MetalRecipes.field
        let metric = { (key: String) in field.points("\(size.part).\(key)") }
        let shape = RoundedRectangle(cornerRadius: metric("radius"), style: .continuous)
        let role = size == .large ? field.typeRole("field.font", trackingKey: "field.tracking") : MetalType.ui
        let ink = { (key: String) in field.color("field.\(key)", colorway: MetalRecipeColorway(colorway))?.color ?? .clear }
        let r = reading
        return HStack(spacing: metric("gap")) {
            key
            if !r.pending { affix("+" + r.country.dial) }
            if snapshot {
                Text(text.isEmpty ? placeholder : text).foregroundColor(ink(text.isEmpty ? "hint" : "ink"))
                    .lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
            } else {
                TextField("", text: $text, prompt: Text(placeholder).foregroundColor(ink("hint")))
                    .textFieldStyle(.plain)
                    .foregroundColor(ink("ink"))
                    .tint(field.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                    .focused($focused)
                    .onSubmit { leave() }
                    .accessibilityLabel(label)
                    .accessibilityHint(r.pending ? "" : "+" + r.country.dial)
            }
            MetalFieldKey("Clear", icon: .close) { write(nil); focused = true }
                .metalPresence(!text.isEmpty, pop: field.scalar("key.pop"))
        }
        .font(.metal(role))
        .tracking(role.trackingPoints)
        .padding(.leading, metric("pad-left"))
        .padding(.trailing, metric("pad-right"))
        .frame(height: metric("height"))
        .frame(minWidth: MetalRecipes.phoneInput.points("self.min-width"))
        .contentShape(shape)
        .onTapGesture { focused = true }
        .background { MetalWell(.field, radius: metric("radius")) { Color.clear } }
        .overlay {
            if invalid || formInvalid || (left && message != nil) {
                shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth).allowsHitTesting(false)
            }
            if focused && size != .large && isEnabled {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth).allowsHitTesting(false)
            }
        }
        .opacity(isEnabled ? .one : field.scalar("state.disabled"))
    }

    /// The country's first grouping in zeros.
    private var placeholder: String {
        (country.formats.first ?? MetalPhoneTable.generic[.zero]).pattern.replacingOccurrences(of: "#", with: "0")
    }

    private func affix(_ value: String) -> some View {
        let lip = MetalRecipes.label.textShadows("engraved", colorway: MetalRecipeColorway(colorway)).first
        return Text(value)
            .foregroundColor(colorway.tokens.ink3.color)
            .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
            .lineLimit(1)
            .fixedSize()
            .accessibilityHidden(true)
    }

    /// The country key: the field's mini key widened for the flag and a chevron that turns while the list is open.
    private var key: some View {
        let phone = MetalRecipes.phoneInput
        let field = MetalRecipes.field
        return Button { open = true } label: {
            HStack(spacing: phone.points("key.gap")) {
                Text(MetalPhoneTable.flag(country.code)).font(.system(size: phone.points("flag.size")))
                MetalIcon(.chevron, size: field.points("key.glyph"))
                    .rotationEffect(.degrees(open ? 180 : .zero))
                    .metalAnimation(.settle, value: open)
            }
            .padding(.horizontal, phone.points("key.pad"))
            .frame(height: field.points("key.size"))
        }
        .buttonStyle(MetalPhoneKeyStyle(open: open))
        .focusEffectDisabled()
        .accessibilityLabel("Country, \(name(country.code)) +\(country.dial)")
        .popover(isPresented: $open, arrowEdge: .bottom) { plate }
    }

    // MARK: the list (Combobox's plate)

    private struct Section: Identifiable {
        let id: String
        let label: String?
        let rows: [MetalPhoneTable.Rule]
    }

    private var sections: [Section] {
        let q = query.trimmingCharacters(in: .whitespaces)
        let sorted = table.list.sorted { name($0.code).localizedStandardCompare(name($1.code)) == .orderedAscending }
        if !q.isEmpty {
            let digits = q.hasPrefix("+") ? String(q.dropFirst()) : q
            let byDial = !digits.isEmpty && digits.allSatisfy { $0.isASCII && $0.isNumber }
            let code = { (c: MetalPhoneTable.Rule) in c.code.caseInsensitiveCompare(q) == .orderedSame }
            let hit = { (c: MetalPhoneTable.Rule) in byDial ? c.dial.hasPrefix(digits) : name(c.code).localizedCaseInsensitiveContains(q) || code(c) }
            let first = { (c: MetalPhoneTable.Rule) in byDial ? c.dial == digits : name(c.code).lowercased().hasPrefix(q.lowercased()) || code(c) }
            let found = sorted.filter(hit)
            return [Section(id: "found", label: nil, rows: found.filter(first) + found.filter { !first($0) })]
        }
        var seen = Set<String>()
        let mine = Array((picked + recent).filter { seen.insert($0).inserted }.compactMap { c in table.list.first { $0.code == c } }.prefix(3))
        let rest = sorted.filter { c in !mine.contains { $0.code == c.code } }
        return mine.isEmpty ? [Section(id: "all", label: nil, rows: sorted)]
            : [Section(id: "recent", label: "Recent", rows: mine), Section(id: "all", label: "All countries", rows: rest)]
    }

    private var plate: some View {
        let menu = MetalRecipes.menu
        let combobox = MetalRecipes.combobox
        return VStack(alignment: .leading, spacing: menu.points("self.pad")) {
            MetalField("Search countries", text: $query, prompt: "Country or code", size: .regular, icon: .search, clear: true)
            ScrollView {
                LazyVStack(alignment: .leading, spacing: .zero, pinnedViews: [.sectionHeaders]) {
                    ForEach(sections) { section in
                        SwiftUI.Section {
                            ForEach(section.rows, id: \.code) { row($0) }
                        } header: {
                            if let label = section.label {
                                MetalLabel(label, style: .engraved)
                                    .padding(.top, menu.points("heading.pad-top"))
                                    .padding(.horizontal, menu.points("heading.pad-x"))
                                    .padding(.bottom, menu.points("heading.pad-bottom"))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(colorway.tokens.frostOpaque.color)
                                    .accessibilityAddTraits(.isHeader)
                            }
                        }
                    }
                }
            }
            .frame(height: combobox.scalar("self.max-rows") * menu.points("row.height"))
        }
        .padding(menu.points("self.pad"))
        .frame(width: combobox.points("button.plate"))
    }

    private func row(_ c: MetalPhoneTable.Rule) -> some View {
        let menu = MetalRecipes.menu
        let chosen = c.code == country.code
        return HStack(spacing: menu.points("row.gap")) {
            Text(MetalPhoneTable.flag(c.code)).font(.system(size: MetalRecipes.phoneInput.points("flag.row"))).accessibilityHidden(true)
            Text(name(c.code)).font(menu.font("row.font")).foregroundColor(colorway.tokens.ink.color).lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("+" + c.dial).font(.metal(MetalType.meta)).monospacedDigit().foregroundColor(colorway.tokens.ink3.color)
            if chosen {
                MetalIcon(.check, size: menu.points("row.glyph")).foregroundColor(colorway.tokens.ink2.color)
            }
        }
        .padding(.horizontal, menu.points("row.pad"))
        .frame(minHeight: menu.points("row.height"))
        .background { if hovered == c.code { MetalListGlide() } }
        .contentShape(Rectangle())
        .onHover { if $0 { hovered = c.code } }
        .onTapGesture { choose(c) }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(chosen ? [.isButton, .isSelected] : .isButton)
        .accessibilityAction { choose(c) }
    }
}

/// The country key: a compact button cap in a capsule, down while the list is open.
private struct MetalPhoneKeyStyle: ButtonStyle {
    let open: Bool
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    func makeBody(configuration: Configuration) -> some View {
        let button = MetalRecipes.button
        let down = (configuration.isPressed || open) && isEnabled
        return configuration.label
            .foregroundColor((hovering ? colorway.tokens.ink : colorway.tokens.ink2).color)
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(button, part: "compact", in: Capsule()).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(button, part: "compact", state: "pressed", in: Capsule()).opacity(down ? .one : .zero)
                }
            }
            .offset(y: down && !reduceMotion ? button.points("self.travel") : .zero)
            .animation(down ? nil : MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation, value: down)
            .contentShape(Capsule())
            .onHover { hovering = $0 }
            .opacity(isEnabled ? .one : button.scalar("self.disabled"))
    }
}
