#!/usr/bin/env python3
"""Instance + subset the self-hosted fonts (plan section 3.1).

Sources are the Fontsource packages in node_modules (OFL-1.1). Output goes to
src/fonts/*.woff2 (web) and src/og-fonts/*.ttf (static instances for Satori),
plus src/styles/fonts.css with @font-face rules and metric-matched fallbacks.

The outputs are committed, so CI does not need Python. Re-run after a
Fontsource upgrade:   python3 scripts/fonts.py
Requires: fonttools + brotli  (pip install fonttools brotli)
"""
from __future__ import annotations

import io
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules"
OUT = ROOT / "src" / "fonts"
OG = ROOT / "src" / "og-fonts"
CSS = ROOT / "src" / "styles" / "fonts.css"

ARCHIVO = NM / "@fontsource-variable/archivo/files"
MONO = NM / "@fontsource-variable/jetbrains-mono/files"
SERIF = NM / "@fontsource/instrument-serif/files"

# Basic Latin + Latin-1 (covers ä ö ü ß ç Ç Ö Ü), general punctuation, arrows.
LATIN = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC]
    + list(range(0x2010, 0x2028))  # dashes, quotes, bullet, ellipsis
    + [0x2030, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2122]
    + [0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x2212, 0x00D7, 0x231C, 0x231D, 0x231E, 0x231F]
)
# Turkish extras that live in the latin-ext files: ş Ş ğ Ğ İ (ı is in latin).
TURKISH = [0x15E, 0x15F, 0x11E, 0x11F, 0x130]
HERO = list(range(0x41, 0x5B)) + [0x20]  # A–Z + space

LATIN_RANGE = "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2193,U+2197,U+2212,U+231C-231F"
TURKISH_RANGE = "U+011E-011F,U+0130,U+015E-015F"


def kb(p: pathlib.Path) -> str:
    return f"{p.stat().st_size / 1024:.1f} KB"


def subset_font(font: TTFont, unicodes, out: pathlib.Path, flavor="woff2", features=None):
    opts = subset.Options()
    opts.flavor = flavor
    opts.layout_features = features or ["kern", "liga", "calt", "tnum", "lnum", "case", "ccmp", "locl", "mark", "mkmk"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    if flavor is None:
        font.flavor = None
    font.save(out)
    print(f"  {out.relative_to(ROOT)}  {kb(out)}")


def load(p: pathlib.Path) -> TTFont:
    f = TTFont(io.BytesIO(p.read_bytes()), lazy=False)
    f.ensureDecompiled()
    return f


def roundtrip(f: TTFont) -> TTFont:
    """Serialise and reload: the instancer can leave a lazy gvar that the subsetter trips over."""
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return TTFont(buf)


def limit(p: pathlib.Path, axes: dict) -> TTFont:
    return roundtrip(instancer.instantiateVariableFont(load(p), axes))


def fallback_metrics(src: TTFont, ref_path: pathlib.Path, sample="the quick brown fox jumps over the lazy dog ETAOINSHRDLU 0123456789"):
    """size-adjust / ascent / descent overrides so a local fallback matches the web font."""
    ref = load(ref_path)

    def avg(f: TTFont):
        cm, hm, upm = f.getBestCmap(), f["hmtx"].metrics, f["head"].unitsPerEm
        w = [hm[cm[ord(c)]][0] / upm for c in sample if ord(c) in cm]
        return sum(w) / len(w)

    size_adjust = avg(src) / avg(ref)
    upm = src["head"].unitsPerEm
    hhea = src["hhea"]
    asc = hhea.ascent / upm / size_adjust
    desc = abs(hhea.descent) / upm / size_adjust
    gap = hhea.lineGap / upm / size_adjust
    return size_adjust, asc, desc, gap


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    OG.mkdir(parents=True, exist_ok=True)
    print("web fonts:")

    # Archivo: wdth 72–110, wght 400–700 (body 100/400, display 72/700, index hover 85→100)
    a_latin = OUT / "archivo-latin.woff2"
    subset_font(limit(ARCHIVO / "archivo-latin-standard-normal.woff2", {"wdth": (72, 110), "wght": (400, 700)}), LATIN, a_latin)
    a_tr = OUT / "archivo-tr.woff2"
    subset_font(limit(ARCHIVO / "archivo-latin-ext-standard-normal.woff2", {"wdth": (72, 110), "wght": (400, 700)}), TURKISH, a_tr)

    # Hero subset: uppercase only, wght pinned at 700, wdth 72–100 for the settle (section 4.4 #2)
    a_hero = OUT / "archivo-hero.woff2"
    subset_font(limit(ARCHIVO / "archivo-latin-standard-normal.woff2", {"wdth": (72, 100), "wght": 700}), HERO, a_hero, features=["kern"])

    # JetBrains Mono: wght 400–500
    m_latin = OUT / "jetbrains-mono-latin.woff2"
    subset_font(limit(MONO / "jetbrains-mono-latin-wght-normal.woff2", {"wght": (400, 500)}), LATIN, m_latin)
    m_tr = OUT / "jetbrains-mono-tr.woff2"
    subset_font(limit(MONO / "jetbrains-mono-latin-ext-wght-normal.woff2", {"wght": (400, 500)}), TURKISH, m_tr)

    # Instrument Serif Italic (static)
    s_latin = OUT / "instrument-serif-italic-latin.woff2"
    subset_font(load(SERIF / "instrument-serif-latin-400-italic.woff2"), LATIN, s_latin)
    s_tr = OUT / "instrument-serif-italic-tr.woff2"
    subset_font(load(SERIF / "instrument-serif-latin-ext-400-italic.woff2"), TURKISH, s_tr)

    total = sum(p.stat().st_size for p in OUT.glob("*.woff2"))
    print(f"  total {total / 1024:.1f} KB (budget 130 KB)")

    print("og fonts (static TTF for Satori):")
    og_a = instancer.instantiateVariableFont(load(ARCHIVO / "archivo-latin-standard-normal.woff2"), {"wdth": 72, "wght": 700})
    subset_font(og_a, LATIN, OG / "Archivo-Bold-wdth72.ttf", flavor=None)
    og_m = instancer.instantiateVariableFont(load(MONO / "jetbrains-mono-latin-wght-normal.woff2"), {"wght": 400})
    subset_font(og_m, LATIN, OG / "JetBrainsMono-Regular.ttf", flavor=None)

    # Metric-matched fallbacks (Liberation Sans/Mono/Serif are metric-compatible with Arial/Courier New/Times New Roman)
    lib = pathlib.Path("/usr/share/fonts/truetype/liberation")
    body = instancer.instantiateVariableFont(load(ARCHIVO / "archivo-latin-standard-normal.woff2"), {"wdth": 100, "wght": 400})
    mono = instancer.instantiateVariableFont(load(MONO / "jetbrains-mono-latin-wght-normal.woff2"), {"wght": 400})
    serif = load(SERIF / "instrument-serif-latin-400-italic.woff2")
    fb = {}
    for key, f, ref in [
        ("sans", body, lib / "LiberationSans-Regular.ttf"),
        ("mono", mono, lib / "LiberationMono-Regular.ttf"),
        ("serif", serif, lib / "LiberationSerif-Italic.ttf"),
    ]:
        fb[key] = fallback_metrics(f, ref) if ref.exists() else (1.0, 0.9, 0.22, 0.0)

    def fbface(name, local, m):
        sa, asc, desc, gap = m
        return (
            f"@font-face {{\n  font-family: '{name}';\n  src: {local};\n"
            f"  size-adjust: {sa * 100:.2f}%;\n  ascent-override: {asc * 100:.2f}%;\n"
            f"  descent-override: {desc * 100:.2f}%;\n  line-gap-override: {gap * 100:.2f}%;\n}}\n"
        )

    css = f"""/* GENERATED by scripts/fonts.py. Do not edit by hand.
   Self-hosted, instanced and subset (OFL-1.1): Archivo, JetBrains Mono, Instrument Serif.
   Zero runtime third-party requests. */

/* Archivo: wdth 72–110, wght 400–700 */
@font-face {{
  font-family: 'Archivo';
  font-style: normal;
  font-display: swap;
  font-weight: 400 700;
  font-stretch: 72% 110%;
  src: url('../fonts/archivo-latin.woff2') format('woff2');
  unicode-range: {LATIN_RANGE};
}}
@font-face {{
  font-family: 'Archivo';
  font-style: normal;
  font-display: swap;
  font-weight: 400 700;
  font-stretch: 72% 110%;
  src: url('../fonts/archivo-tr.woff2') format('woff2');
  unicode-range: {TURKISH_RANGE};
}}

/* Hero subset: A–Z + space, wght 700, wdth 72–100. The only preloaded file. */
@font-face {{
  font-family: 'Archivo Hero';
  font-style: normal;
  font-display: optional;
  font-weight: 700;
  font-stretch: 72% 100%;
  src: url('../fonts/archivo-hero.woff2') format('woff2');
}}

/* JetBrains Mono: wght 400–500 */
@font-face {{
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-display: swap;
  font-weight: 400 500;
  src: url('../fonts/jetbrains-mono-latin.woff2') format('woff2');
  unicode-range: {LATIN_RANGE};
}}
@font-face {{
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-display: swap;
  font-weight: 400 500;
  src: url('../fonts/jetbrains-mono-tr.woff2') format('woff2');
  unicode-range: {TURKISH_RANGE};
}}

/* Instrument Serif Italic (accent, 1–3 words per screen) */
@font-face {{
  font-family: 'Instrument Serif';
  font-style: italic;
  font-display: swap;
  font-weight: 400;
  src: url('../fonts/instrument-serif-italic-latin.woff2') format('woff2');
  unicode-range: {LATIN_RANGE};
}}
@font-face {{
  font-family: 'Instrument Serif';
  font-style: italic;
  font-display: swap;
  font-weight: 400;
  src: url('../fonts/instrument-serif-italic-tr.woff2') format('woff2');
  unicode-range: {TURKISH_RANGE};
}}

/* Metric-matched local fallbacks: the swap causes no layout shift. */
{fbface('Archivo Fallback', "local('Arial'), local('Liberation Sans'), local('Helvetica Neue'), local('Helvetica')", fb['sans'])}{fbface('JetBrains Mono Fallback', "local('Courier New'), local('Liberation Mono'), local('Menlo')", fb['mono'])}{fbface('Instrument Serif Fallback', "local('Times New Roman Italic'), local('Liberation Serif Italic'), local('Georgia Italic'), local('Times New Roman')", fb['serif'])}"""
    CSS.parent.mkdir(parents=True, exist_ok=True)
    CSS.write_text(css)
    print(f"  {CSS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
