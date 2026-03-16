#!/usr/bin/env python3
"""
BaseNative Font Generator

Takes open-source fonts (SIL Open Font License) and rebrands them as the
BaseNative family with font-stretch-based style switching:
  - Sans (Inter)          → font-stretch: normal
  - Serif (Source Serif 4) → font-stretch: expanded
  - Mono (JetBrains Mono)  → font-stretch: ultra-condensed

This eliminates the Google Fonts CDN dependency while preserving
professional-quality typography.

All source fonts are SIL OFL licensed and may be freely modified/redistributed.

Usage:  python3 packages/fonts/generate.py
Output: packages/fonts/src/BaseNative-{Sans,Serif,Mono}.woff2
"""

import os
from fontTools.ttLib import TTFont

# Golden ratio metrics (used for documentation, not glyph generation)
PHI = 1.6180339887

SRC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')

# Source font files and their target configurations
CONFIGS = [
    {
        'source': 'inter-latin.woff2',
        'output': 'BaseNative-Sans.woff2',
        'label': 'Sans',
        'family': 'BaseNative',
        'subfamily': 'Sans',
        'ps_name': 'BaseNative-Sans',
        'full_name': 'BaseNative Sans',
        'width_class': 5,  # normal → font-stretch: normal
    },
    {
        'source': 'source-serif-4-latin-variable.woff2',
        'output': 'BaseNative-Serif.woff2',
        'label': 'Serif',
        'family': 'BaseNative',
        'subfamily': 'Serif',
        'ps_name': 'BaseNative-Serif',
        'full_name': 'BaseNative Serif',
        'width_class': 7,  # expanded → font-stretch: expanded
    },
    {
        'source': 'jetbrains-mono-latin-variable.woff2',
        'output': 'BaseNative-Mono.woff2',
        'label': 'Mono',
        'family': 'BaseNative',
        'subfamily': 'Mono',
        'ps_name': 'BaseNative-Mono',
        'full_name': 'BaseNative Mono',
        'width_class': 3,  # ultra-condensed → font-stretch: ultra-condensed
    },
]


def rebrand_font(config):
    """Open a source font, rename it to BaseNative, adjust OS/2 width class, save as woff2."""
    src_path = os.path.join(SRC_DIR, config['source'])
    out_path = os.path.join(SRC_DIR, config['output'])

    print(f"  Reading {config['source']}...")
    font = TTFont(src_path)

    # Update name table
    name_table = font['name']
    for record in name_table.names:
        pid = record.platformID
        enc = record.platEncID
        lang = record.langID

        if record.nameID == 1:  # Family name
            name_table.setName(config['family'], 1, pid, enc, lang)
        elif record.nameID == 2:  # Subfamily name
            name_table.setName(config['subfamily'], 2, pid, enc, lang)
        elif record.nameID == 4:  # Full name
            name_table.setName(config['full_name'], 4, pid, enc, lang)
        elif record.nameID == 6:  # PostScript name
            name_table.setName(config['ps_name'], 6, pid, enc, lang)
        elif record.nameID == 16:  # Typographic family
            name_table.setName(config['family'], 16, pid, enc, lang)
        elif record.nameID == 17:  # Typographic subfamily
            name_table.setName(config['subfamily'], 17, pid, enc, lang)

    # Update OS/2 width class for font-stretch matching
    os2 = font['OS/2']
    os2.usWidthClass = config['width_class']

    # Save as woff2
    font.flavor = 'woff2'
    font.save(out_path)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  Wrote {out_path} ({size_kb:.1f} KB)")

    font.close()


def main():
    os.makedirs(SRC_DIR, exist_ok=True)
    print("BaseNative Font Generator")
    print("=" * 40)

    for config in CONFIGS:
        print(f"\nBuilding BaseNative {config['label']}...")
        src_path = os.path.join(SRC_DIR, config['source'])
        if not os.path.exists(src_path):
            print(f"  ERROR: Source font not found: {src_path}")
            print(f"  Please ensure {config['source']} is in packages/fonts/src/")
            continue
        rebrand_font(config)

    print("\n" + "=" * 40)
    print("Font-stretch mapping:")
    print("  normal         → Sans  (Inter)")
    print("  expanded       → Serif (Source Serif 4)")
    print("  ultra-condensed → Mono  (JetBrains Mono)")
    print("\nAll source fonts are SIL Open Font License.")
    print("Done!")


if __name__ == '__main__':
    main()
