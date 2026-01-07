# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Collection of standalone electronic circuit calculators. Each calculator is an HTML file that loads shared utilities from `common.js`. No build system required.

## Architecture

```
calculators/
├── flake.nix                    # Dev environment (just + serve)
├── justfile                     # just run → starts server on :2000
└── src/
    ├── common.js                # Shared utilities (formatting, rounding)
    ├── ce-amplifier/index.html
    ├── inverting-amplifier/index.html
    ├── non-inverting-amplifier/index.html
    └── sallen-key/index.html
```

### Shared Module (`common.js`)

All calculators load `<script src="../common.js"></script>` which provides:

- `E24` - Standard E24 resistor series array
- `CAPS` - Common capacitor values array
- `roundToE24(value)` - Round to nearest E24 resistor
- `roundCap(value)` - Round to nearest standard capacitor (input/output in Farads)
- `fmt(value, unit)` - Compact format for schematics (no space: "10kΩ")
- `fmtLong(value, unit)` - Table format with space ("10.00 kΩ")
- `parallel(...values)` - Parallel resistance/impedance calculation

Supported units: `'Ω'`, `'F'`, `'V'`, `'A'`, `'Hz'`, `'mA'`

### Calculator Structure

Each calculator follows this pattern:
1. Input table with labeled fields
2. Calculate button calling `calculate()`
3. Results div (hidden until calculated) containing:
   - SVG schematic with dynamic value labels
   - Calculated values table
   - Performance/response table
   - Notes/warnings

## Development

Open any `index.html` directly in a browser. No server required.

## Electronics Domain Knowledge

- Calculations follow standard circuit analysis (Kirchhoff's laws, op-amp ideal assumptions)
- CE amplifier uses voltage divider biasing with AC bypass capacitor
- Op-amp calculators assume dual supply (+/- rails)
- Sallen-Key uses C1=2*C2 ratio for Butterworth Q=0.707
