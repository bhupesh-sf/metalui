'use client';

import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Field as BaseField } from '@base-ui/react/field';
import { InheritColorway, useColorwayAnchor } from '../../theme/colorway';
import { menuParts, ListGlide } from '../menu/menu';
import { Field } from '../field/field';
import { FormField } from '../form-field/form-field';
import { Row } from '../row/row';
import { buttonParts } from '../button/button';
import { comboboxParts as cb, comboboxOffset, ComboboxFit, ComboboxMatched } from '../combobox/combobox';
import { CheckIcon, CloseIcon } from '../../icons/components.generated';
import { MorphPair } from '../../icons/MorphIcon';
import { chevronMorph, searchMorph } from '../../icons/morph.generated';
import { useIsoLayoutEffect } from '../../motion/layout-effect';

/* ─────────────────────────────────────────────────────────
 * PHONE INPUT, a number the way you'd say it, with its country; the value is E.164
 *
 *   rest      one field well: the country key (its flag and a chevron, the field's mini key widened)
 *             leads, the dial code is engraved after it ("+44", Field.Prefix), then the number
 *   type      digits group as you type in the country's way ("7700 900123", "(415) 555-0132"); the
 *             caret is kept by digits, so it never jumps; Backspace beside a space or dash takes the
 *             digit beyond it; letters are not taken. A trunk 0 reads as typed and goes on leaving
 *   paste     "+44 (0)7700-900-123", "0044 7700 900123", "011 44…": the code moves into the prefix and
 *             the key changes country. Typing "+" does the same as you go; while the code is unfinished
 *             the prefix steps aside and the input shows "+3" as typed
 *   shared    +1, +44, +7…: the area code picks the country (+1 416 Canada), else the chosen country
 *             keeps it, else the code's main country
 *   choose    the key opens Combobox's plate from a button: the search well at its top (name, dial code
 *             or ISO code), Recent, then every country under its flag with its code in the trail; it is
 *             anchored to the whole well; choosing regroups the number and puts the caret back in it
 *   value     E.164 once the number is complete, null while empty or incomplete; `name` sends it
 *   wrong     too short or too long for the country, an unfinished "+", a country not in `only`:
 *             said through the input's validity once you leave (FormField.Error), with the invalid ring
 *   readback  once complete, FormField.Readback says the country and "mobile" when the rules know
 *   sizes     large 44 / regular 32 / compact 28, the field's; disabled 40 %
 * Reduce Motion: the field's, the plate's and the keys' own. Everything drawn is Field's and Combobox's;
 * the phone-input recipe adds the key's padding, the flag's size and the well's least width.
 * ───────────────────────────────────────────────────────── */

/** A country's numbering rules. Ours cover ~245 regions (dial codes) and 52 in detail; `countries` adds or overrides. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2: "GB". */
  code: string;
  /** The dial code's digits: "44". */
  dial: string;
  /** Leading national digits that send a shared dial code here (+1 416 is Canada). */
  areas?: string[];
  /** The national trunk prefix, dropped from the value ("0"; "" for none). Default the main country's, else "0". */
  trunk?: string;
  /** How many digits a national number has, without the trunk: [least, most]. */
  length?: [number, number];
  /** Leading national digits of mobile numbers ("7"): the readback says "mobile". */
  mobile?: string[];
  /** Groupings by leading digits: [["7", "#### ######"], ["", "## #### ####"]]; the first that fits the digits typed. */
  formats?: [lead: string, pattern: string][];
}

export interface PhoneDetails {
  /** The country the number is in (ISO), even while incomplete. */
  country: string;
  /** The number is complete for its country (and allowed by `only`). */
  valid: boolean;
  /** "mobile" when the country's rules say so. */
  kind?: 'mobile';
}

export interface PhoneInputProps {
  /** The number as E.164 ("+447700900123"), or null while empty or incomplete. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, details: PhoneDetails) => void;
  /** The country to start in (ISO). Default the locale's region, else US. */
  defaultCountry?: string;
  /** Countries offered first, under Recent (ISO codes); picks made in this field join them. */
  recent?: string[];
  /** Only these countries (ISO codes) are listed and accepted. */
  only?: string[];
  /** Rules merged over ours by ISO code: a market we don't format, or a correction. */
  countries?: PhoneCountry[];
  /** Country names come from this locale (Intl.DisplayNames). Default the reader's. */
  locale?: string;
  /** large (44), regular (32, the default) or compact (28). */
  size?: 'large' | 'regular' | 'compact';
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Sends the E.164 value with a form, in a hidden input. */
  name?: string;
  id?: string;
  /** Names the number when there is no visible label. */
  'aria-label'?: string;
  /** Default the country's grouping in zeros ("0000 000000"). */
  placeholder?: string;
  /** Say the country (and "mobile") under the field once the number is complete. Default true. */
  readback?: boolean;
  className?: string;
}

/* ── the table ──────────────────────────────────────────
 * ponytail: lengths and groupings, not number-plan validity (libphonenumber's job, 40+ KB gzip); a
 * host adds or corrects a country with `countries`. MetalPhoneInput.swift holds the same two strings;
 * e2e/phone-input.spec.ts fails if they differ.
 * DIALS: ISO, dial code, (area codes that send a shared code here). The first entry of a code without
 * areas is its main country. RULES: ISO, trunk ("-" none), least-most digits, mobile leads ("-" none),
 * groupings lead:pattern ("_" a space). A country without rules takes its main country's. */

const DIALS = 'AC247 AD376 AE971 AF93 AG1(268) AI1(264) AL355 AM374 AO244 AR54 AS1(684) AT43 AU61 AW297 AX358(18) AZ994 BA387 BB1(246) BD880 BE32 BF226 BG359 BH973 BI257 BJ229 BM1(441) BN673 BO591 BQ599(3 4 7) BR55 BS1(242) BT975 BW267 BY375 BZ501 CA1(204 226 236 249 250 257 263 273 289 306 343 354 365 367 368 382 387 403 416 418 428 431 437 438 450 460 468 474 506 514 519 548 579 581 584 587 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 867 873 879 902 905 942) CC61(89162) CD243 CF236 CG242 CH41 CI225 CK682 CL56 CM237 CN86 CO57 CR506 CU53 CV238 CW599(9) CX61(89164) CY357 CZ420 DE49 DJ253 DK45 DM1(767) DO1(809 829 849) DZ213 EC593 EE372 EG20 EH212(5288 5289) ER291 ES34 ET251 FI358 FJ679 FK500 FM691 FO298 FR33 GA241 GB44 GD1(473) GE995 GF594 GG44(1481 7781 7839 7911) GH233 GI350 GL299 GM220 GN224 GP590 BL590 MF590 GQ240 GR30 GT502 GU1(671) GW245 GY592 HK852 HN504 HR385 HT509 HU36 ID62 IE353 IL972 IM44(1624 7524 7624 7924) IN91 IO246 IQ964 IR98 IS354 IT39 JE44(1534 7509 77003 77007 77008 7797 7829 7937) JM1(876 658) JO962 JP81 KE254 KG996 KH855 KI686 KM269 KN1(869) KP850 KR82 KW965 KY1(345) KZ7(6 7) LA856 LB961 LC1(758) LI423 LK94 LR231 LS266 LT370 LU352 LV371 LY218 MA212 MC377 MD373 ME382 MG261 MH692 MK389 ML223 MM95 MN976 MO853 MP1(670) MQ596 MR222 MS1(664) MT356 MU230 MV960 MW265 MX52 MY60 MZ258 NA264 NC687 NE227 NF672 NG234 NI505 NL31 NO47 NP977 NR674 NU683 NZ64 OM968 PA507 PE51 PF689 PG675 PH63 PK92 PL48 PM508 PR1(787 939) PS970 PT351 PW680 PY595 QA974 RE262 RO40 RS381 RU7 RW250 SA966 SB677 SC248 SD249 SE46 SG65 SH290 SI386 SJ47(79) SK421 SL232 SM378 SN221 SO252 SR597 SS211 ST239 SV503 SX1(721) SY963 SZ268 TC1(649) TD235 TG228 TH66 TJ992 TK690 TL670 TM993 TN216 TO676 TR90 TT1(868) TV688 TW886 TZ255 UA380 UG256 US1 UY598 UZ998 VA39(06698) VC1(784) VE58 VG1(284) VI1(340) VN84 VU678 WF681 WS685 XK383 YE967 YT262(269 639) ZA27 ZM260 ZW263';

const RULES = `
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
`;

type Country = Required<PhoneCountry>;
interface Table { byCode: Map<string, Country>; byDial: Map<string, Country[]>; list: Country[] }

const GENERIC: [string, string][] = [['', '### ### ####'], ['', '#### #### #######']];
let base: Map<string, PhoneCountry> | undefined;

/** Our table, parsed once on first use (module values stay literals, so an app that doesn't use it drops it). */
function ours() {
  if (base) return base;
  const out = new Map<string, PhoneCountry>();
  for (const m of DIALS.matchAll(/([A-Z]{2})(\d+)(?:\(([\d ]+)\))?/g)) {
    out.set(m[1], { code: m[1], dial: m[2], areas: m[3] ? m[3].split(' ') : undefined });
  }
  for (const line of RULES.trim().split('\n')) {
    const [code, trunk, len, mobile, formats] = line.trim().split(' ');
    const [lo, hi] = len.split('-').map(Number);
    const c = out.get(code);
    if (!c) continue;
    Object.assign(c, {
      trunk: trunk === '-' ? '' : trunk,
      length: [lo, hi],
      mobile: mobile === '-' ? [] : mobile.split(','),
      formats: formats.split(',').map((f) => { const at = f.indexOf(':'); return [f.slice(0, at), f.slice(at + 1).replace(/_/g, ' ')]; }),
    });
  }
  base = out;
  return out;
}

/** Ours with the host's merged over by code; a country without rules takes its main country's. */
function tableOf(extra?: PhoneCountry[], only?: string[]): Table {
  const raw = new Map(ours());
  for (const c of extra ?? []) raw.set(c.code, { ...raw.get(c.code), ...c });
  const mains = new Map<string, PhoneCountry>();
  for (const c of raw.values()) if (!c.areas?.length && !mains.has(c.dial)) mains.set(c.dial, c);
  const byCode = new Map<string, Country>();
  const byDial = new Map<string, Country[]>();
  for (const c of raw.values()) {
    const main = mains.get(c.dial) ?? c;
    const full: Country = {
      code: c.code,
      dial: c.dial,
      areas: c.areas ?? [],
      trunk: c.trunk ?? main.trunk ?? '0',
      length: c.length ?? main.length ?? [4, 15 - c.dial.length],
      mobile: c.mobile ?? main.mobile ?? [],
      formats: c.formats ?? main.formats ?? GENERIC,
    };
    byCode.set(c.code, full);
    byDial.set(c.dial, [...(byDial.get(c.dial) ?? []), full]);
  }
  const list = [...byCode.values()].filter((c) => !only || only.includes(c.code));
  return { byCode, byDial, list };
}

/* ── reading and writing a number ───────────────────── */

const digitsOf = (s: string) => s.replace(/\D/g, '');

interface Reading {
  country: Country;
  /** The national significant number: no trunk, no dial code. */
  nsn: string;
  /** The trunk as typed ("0"), shown until leaving. */
  trunk: string;
  /** A "+" whose code isn't finished: the input shows it as typed. */
  pending: boolean;
  /** Leading digits that moved out of the input (00, the dial code, a trunk after it). */
  consumed: number;
}

/** Which of the countries sharing a code: the one whose area matches, else the current one, else the main one. */
function pick(siblings: Country[], nsn: string, current: Country) {
  return siblings.find((c) => c.areas.some((a) => nsn.startsWith(a)))
    ?? siblings.find((c) => c.code === current.code)
    ?? siblings.find((c) => !c.areas.length)
    ?? siblings[0];
}

/** Reads typed or pasted text in the current country: international ("+44…", "0044…", "011…") or national. */
function read(text: string, current: Country, table: Table): Reading {
  const digits = digitsOf(text);
  const plus = /^\s*\+/.test(text);
  const idd = plus ? 0 : digits.startsWith('00') ? 2 : current.dial === '1' && digits.startsWith('011') ? 3 : -1;
  if (idd >= 0) {
    const rest = digits.slice(idd);
    // Dial codes are prefix-free: the first that matches is the one.
    for (let len = 1; len <= 3 && len <= rest.length; len++) {
      const siblings = table.byDial.get(rest.slice(0, len));
      if (!siblings) continue;
      let nsn = rest.slice(len);
      const country = pick(siblings, nsn, current);
      // "+44 (0)7700…": a trunk after the code is a habit, not part of the number.
      const t = country.trunk && nsn.startsWith(country.trunk) ? country.trunk.length : 0;
      nsn = nsn.slice(t);
      return { country, nsn, trunk: '', pending: false, consumed: idd + len + t };
    }
    return { country: current, nsn: rest, trunk: '', pending: true, consumed: 0 };
  }
  const trunk = current.trunk && digits.startsWith(current.trunk) ? current.trunk : '';
  const nsn = digits.slice(trunk.length);
  // An area code that belongs to a sibling moves there (416 is Canada's, typed in the US).
  return { country: pick(table.byDial.get(current.dial) ?? [current], nsn, current), nsn, trunk, pending: false, consumed: 0 };
}

const capacity = (pattern: string) => pattern.split('#').length - 1;

/** The national number grouped by the country's patterns: the first whose lead matches and that holds the digits. */
function group(country: Country, nsn: string) {
  const fits = country.formats.filter(([lead]) => nsn.startsWith(lead));
  const pattern = (fits.find(([, p]) => capacity(p) >= nsn.length) ?? fits.at(-1) ?? GENERIC[1])[1];
  let out = '';
  let i = 0;
  // A separator is written only when a digit follows it, so "(415" never reads "(415) ".
  for (const ch of pattern) {
    if (i >= nsn.length) break;
    out += ch === '#' ? nsn[i++] : ch;
  }
  return out + nsn.slice(i);
}

function show(r: Reading) {
  if (r.pending) return r.nsn || r.consumed ? `+${r.nsn}` : '+';
  const rest = group(r.country, r.nsn);
  if (!r.trunk) return rest;
  return r.trunk === '0' || !rest ? r.trunk + rest : `${r.trunk} ${rest}`;
}

const e164 = (r: Reading) => `+${r.country.dial}${r.nsn}`;
const fits = (r: Reading) => r.nsn.length >= r.country.length[0] && r.nsn.length <= r.country.length[1];

/** Where the caret goes: after the nth digit (after a leading "+" when n is 0). */
function caretAt(text: string, n: number) {
  if (n <= 0) return text.startsWith('+') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i]) && ++seen === n) return i + 1;
  return text.length;
}

const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
const fold = (s: string) => s.toLocaleLowerCase();

function localeRegion(locale?: string) {
  try {
    return new Intl.Locale(locale ?? (typeof navigator === 'undefined' ? 'en-US' : navigator.language)).maximize().region;
  } catch {
    return undefined;
  }
}

/* ── looks ─────────────────────────────────────────────── */

const ROOT = 'mu-phone-input min-w-phone-input-min-width';
const KEY = `${buttonParts.FRAME} mu-phone-input-country mu-icon-trigger relative flex-none gap-phone-input-key-gap h-field-key-size px-phone-input-key-pad rounded-pill text-ink2 hover:text-ink recipe-button-compact transition-button-compact field-key-hit [&_svg]:size-field-key-glyph not-disabled:active:translate-y-button-travel not-disabled:active:duration-button-press not-disabled:active:ease-linear not-disabled:active:recipe-button-compact-pressed data-popup-open:translate-y-button-travel data-popup-open:recipe-button-compact-pressed disabled:cursor-default disabled:opacity-button-disabled`;
const FLAG = 'mu-phone-input-flag phone-input-flag';
const ROW_FLAG = 'mu-phone-input-row-flag phone-input-row-flag';
const DIAL = 'mu-phone-input-dial type-meta tabular-nums text-ink3';
const CHECK = 'inline-grid flex-none text-ink2 [&>svg]:size-menu-row-glyph';
const SEARCH = { search: searchMorph };
const CHEVRON = { chevron: chevronMorph };

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

type ViewRow = Country & { name: string };
type ViewGroup = { value: string; label?: string; items: ViewRow[] };

function Option({ row, query }: { row: ViewRow; query: string }) {
  return (
    <BaseCombobox.Item value={row.code} className={cx(cb.ROW, 'mu-phone-input-row')}>
      <Row.Lead aria-hidden className={cx(cb.LEAD, ROW_FLAG)}>{flagOf(row.code)}</Row.Lead>
      <Row.Text className={cb.TEXT}>
        <span className={menuParts.LABEL}><ComboboxMatched label={row.name} query={/^\+?\d+$/.test(query) ? '' : query} /></span>
      </Row.Text>
      <Row.Trail className={DIAL}>+{row.dial}</Row.Trail>
      <BaseCombobox.ItemIndicator className={CHECK}><CheckIcon /></BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  );
}

/** A phone number the way you'd say it, with its country; the value is E.164. */
export function PhoneInput(props: PhoneInputProps) {
  const { only, countries, locale, size = 'regular', invalid, disabled, required, name, id, readback = true, className } = props;
  const table = React.useMemo(() => tableOf(countries, only), [countries, only]);
  const names = React.useMemo(() => {
    let dn: Intl.DisplayNames | undefined;
    try { dn = new Intl.DisplayNames(locale ? [locale] : undefined, { type: 'region' }); } catch { /* no names: the codes stand in */ }
    return (code: string) => dn?.of(code) ?? code;
  }, [locale]);
  const fallback = () => {
    const want = [props.defaultCountry, localeRegion(locale), 'US', table.list[0]?.code];
    return table.byCode.get(want.find((c) => c && table.byCode.has(c) && (!only || only.includes(c))) ?? 'US') as Country;
  };

  const controlled = props.value !== undefined;
  const [start] = React.useState(() => {
    const v = (controlled ? props.value : props.defaultValue) ?? null;
    const c = fallback();
    return v ? read(v, c, table) : { country: c, nsn: '', trunk: '', pending: false, consumed: 0 };
  });
  const [code, setCode] = React.useState(start.country.code);
  const [text, setText] = React.useState(() => show(start));
  const country = table.byCode.get(code) ?? fallback();
  const reading = read(text, country, table);
  const allowed = !only || only.includes(reading.country.code);
  const valid = !!text && !reading.pending && fits(reading) && allowed;
  const value = valid ? e164(reading) : null;
  const last = React.useRef(value);

  const input = React.useRef<HTMLInputElement>(null);
  const caret = React.useRef<number | null>(null);
  // A refused key (a letter) leaves the text as it was: render anyway, so the caret is put back.
  const [, refresh] = React.useReducer((n: number) => n + 1, 0);
  const [left, setLeft] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [picked, setPicked] = React.useState<string[]>([]);

  const detailsOf = (r: Reading, ok: boolean): PhoneDetails => ({
    country: r.country.code, valid: ok, kind: ok && r.country.mobile.some((m) => r.nsn.startsWith(m)) ? 'mobile' : undefined,
  });

  /** Writes new text in a country, keeps the caret by digits, and tells the host when the value changes. */
  const write = (raw: string, current: Country, digitsBefore: number | null) => {
    const r = read(raw, current, table);
    const next = show(r);
    setText(next);
    if (next === text) refresh();
    setCode(r.country.code);
    caret.current = digitsBefore == null ? null : caretAt(next, digitsBefore - r.consumed);
    const ok = !!next && !r.pending && fits(r) && (!only || only.includes(r.country.code));
    const v = ok ? e164(r) : null;
    if (v !== last.current) {
      last.current = v;
      props.onValueChange?.(v, detailsOf(r, ok));
    }
  };

  // A value set from outside (a different number, or none) rewrites the field.
  React.useEffect(() => {
    if (!controlled || props.value === last.current) return;
    last.current = props.value ?? null;
    if (!props.value) { setText(''); return; }
    const r = read(props.value, country, table);
    setCode(r.country.code);
    setText(show(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  // The caret follows the digits it was after.
  useIsoLayoutEffect(() => {
    const el = input.current;
    const at = caret.current;
    caret.current = null;
    if (at == null || !el || document.activeElement !== el) return;
    el.setSelectionRange(at, at);
  });

  const label = names(reading.country.code);
  const [lo, hi] = reading.country.length;
  let message = '';
  if (text) {
    if (reading.pending) message = 'Type the country code after +, or choose a country';
    else if (!allowed) message = `Numbers in ${label} aren’t accepted here`;
    else if (!fits(reading)) message = `${label} numbers have ${lo === hi ? lo : `${lo} to ${hi}`} digits`;
  }
  useIsoLayoutEffect(() => { input.current?.setCustomValidity(message); }, [message]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    setLeft(false);
    write(el.value, country, digitsOf(el.value.slice(0, el.selectionStart ?? el.value.length)).length);
  };
  // Backspace or Delete beside a separator takes the digit beyond it (the separator alone would come straight back).
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const at = el.selectionStart ?? 0;
    if (at !== el.selectionEnd || (e.key !== 'Backspace' && e.key !== 'Delete') || e.metaKey || e.altKey || e.ctrlKey) return;
    const back = e.key === 'Backspace';
    const beside = back ? text[at - 1] : text[at];
    if (beside === undefined || /[\d+]/.test(beside)) return;
    let j = at + (back ? -1 : 0);
    while (j >= 0 && j < text.length && !/\d/.test(text[j])) j += back ? -1 : 1;
    if (j < 0 || j >= text.length) return;
    e.preventDefault();
    setLeft(false);
    write(text.slice(0, j) + text.slice(j + 1), country, digitsOf(text.slice(0, j)).length);
  };
  const onBlur = () => {
    // Leaving drops a typed trunk: the engraved dial code already says it.
    if (reading.trunk && !reading.pending) setText(group(reading.country, reading.nsn));
    setLeft(!!message);
  };
  const choose = (next: string | null) => {
    const c = next ? table.byCode.get(next) : undefined;
    if (!c) return;
    setPicked((p) => [c.code, ...p.filter((x) => x !== c.code)].slice(0, 3));
    setLeft(false);
    write(reading.pending ? '' : show({ ...reading, country: c, trunk: '' }), c, null);
  };

  // The plate: Recent before anything is typed, then every country (or the matches), names first that start with the query.
  const view = React.useMemo<ViewGroup[]>(() => {
    const rows = table.list.map((c) => ({ ...c, name: names(c.code) }));
    const collator = new Intl.Collator(locale);
    rows.sort((a, b) => collator.compare(a.name, b.name));
    const q = query.trim();
    if (q) {
      const digits = /^\+?\d+$/.test(q) ? q.replace('+', '') : '';
      const hit = (r: ViewRow) => (digits ? r.dial.startsWith(digits) : fold(r.name).includes(fold(q)) || fold(r.code) === fold(q));
      const first = (r: ViewRow) => (digits ? r.dial === digits : fold(r.name).startsWith(fold(q)) || fold(r.code) === fold(q));
      const found = rows.filter(hit);
      return [{ value: 'found', items: [...found.filter(first), ...found.filter((r) => !first(r))] }];
    }
    const byCode = new Map(rows.map((r) => [r.code, r]));
    const recent = [...new Set([...picked, ...(props.recent ?? [])])].map((c) => byCode.get(c)).filter((r): r is ViewRow => !!r).slice(0, 3);
    return recent.length
      ? [{ value: 'recent', label: 'Recent', items: recent }, { value: 'all', label: 'All countries', items: rows.filter((r) => !recent.includes(r)) }]
      : [{ value: 'all', items: rows }];
  }, [table, names, locale, query, picked, props.recent]);
  const matched = view.some((g) => g.items.length > 0);

  const well = React.useRef<HTMLElement | null>(null);
  const at = useColorwayAnchor();
  const setWell = React.useCallback((el: HTMLElement | null) => { at.ref(el); well.current = el; }, [at]);
  const placeholder = props.placeholder ?? (country.formats[0] ?? GENERIC[0])[1].replace(/#/g, '0');

  return (
    <>
      <Field ref={setWell} size={size} invalid={invalid || (left && !!message)} disabled={disabled} className={cx(ROOT, className)}>
        {/* Its own field root: Base UI's trigger and search would otherwise take the form field's label and validity. */}
        <BaseField.Root render={<span className="contents" />} disabled={disabled}>
          <BaseCombobox.Root<string, false, ViewRow>
            filteredItems={view}
            value={reading.country.code}
            onValueChange={choose}
            inputValue={query}
            onInputValueChange={setQuery}
            open={open}
            onOpenChange={(next) => { setOpen(next); if (next) setQuery(''); }}
            itemToStringLabel={(c: string) => names(c)}
            disabled={disabled}
          >
            <BaseCombobox.Trigger
              className={KEY}
              aria-label={`Country, ${label} +${reading.country.dial}`}
            >
              <span aria-hidden className={FLAG}>{flagOf(reading.country.code)}</span>
              <MorphPair glyphs={CHEVRON} name="chevron" turn={open ? 180 : 0} aria-hidden />
            </BaseCombobox.Trigger>
            <BaseCombobox.Portal>
              <InheritColorway anchor={at} />
              <BaseCombobox.Positioner className={cb.POSITIONER} anchor={well} sideOffset={comboboxOffset()} align="start" collisionPadding={8}>
                <BaseCombobox.Popup className={cx(cb.POP, 'mu-phone-input-pop combobox-pop-button')} finalFocus={input}>
                  <div className={cx(cb.GROUP, cb.SIZE.regular, 'mu-phone-input-search mb-menu-pad')}>
                    <Field.Icon><MorphPair glyphs={SEARCH} name="search" /></Field.Icon>
                    <BaseCombobox.Input className={cb.INPUT} placeholder="Country or code" aria-label="Search countries" />
                    <Field.Trail><Field.Key label="Clear" icon={<CloseIcon />} shown={query.length > 0} onClick={() => setQuery('')} /></Field.Trail>
                  </div>
                  <ComboboxFit>
                    <div className={cb.SCROLL}>
                      <ListGlide />
                      {!matched && <div role="status" className={cb.QUIET}>No countries match “{query.trim()}”</div>}
                      <BaseCombobox.List className={cb.LIST}>
                        {(g: ViewGroup) => (
                          <BaseCombobox.Group key={g.value} items={g.items} data-group={g.value}>
                            {g.label && <BaseCombobox.GroupLabel className={cb.LABEL}>{g.label}</BaseCombobox.GroupLabel>}
                            <BaseCombobox.Collection>{(row: ViewRow) => <Option key={`${g.value}:${row.code}`} row={row} query={query.trim()} />}</BaseCombobox.Collection>
                          </BaseCombobox.Group>
                        )}
                      </BaseCombobox.List>
                    </div>
                  </ComboboxFit>
                </BaseCombobox.Popup>
              </BaseCombobox.Positioner>
            </BaseCombobox.Portal>
          </BaseCombobox.Root>
        </BaseField.Root>
        {!reading.pending && <Field.Prefix>+{reading.country.dial}</Field.Prefix>}
        <Field.Input
          ref={input}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={text}
          placeholder={placeholder}
          aria-label={props['aria-label']}
          required={required}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        <Field.Trail><Field.Clear icon={<CloseIcon />} /></Field.Trail>
      </Field>
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      {readback && <FormField.Readback>{value ? `${label}${detailsOf(reading, true).kind ? ' · mobile' : ''}` : ''}</FormField.Readback>}
    </>
  );
}
