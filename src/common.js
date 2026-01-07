// Common utilities for electronics calculators

// E24 resistor series (24 values per decade)
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
             3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

// Common capacitor values (E6-ish with extras)
const CAPS = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8, 10, 15, 22, 33, 47, 68, 100,
              150, 220, 330, 470, 680, 1000];

// Round to nearest E24 resistor value
function roundToE24(value) {
    if (value <= 0) return 0;
    const decade = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / decade;

    let closest = E24[0];
    let minDiff = Math.abs(normalized - E24[0]);

    for (const e of E24) {
        const diff = Math.abs(normalized - e);
        if (diff < minDiff) {
            minDiff = diff;
            closest = e;
        }
    }

    // Check first value of next decade
    const nextDecadeDiff = Math.abs(normalized - 10);
    if (nextDecadeDiff < minDiff) {
        return 10 * decade;
    }

    return closest * decade;
}

// Round to nearest standard capacitor value
function roundCap(value) {
    if (value <= 0) return 0;
    const pf = value * 1e12;
    const decade = Math.pow(10, Math.floor(Math.log10(pf)));
    const normalized = pf / decade;

    let closest = CAPS[0];
    let minDiff = Math.abs(normalized - CAPS[0]);

    for (const c of CAPS) {
        if (c > 10) continue; // Only use 1-10 range for matching
        const diff = Math.abs(normalized - c);
        if (diff < minDiff) {
            minDiff = diff;
            closest = c;
        }
    }

    const nextDecadeDiff = Math.abs(normalized - 10);
    if (nextDecadeDiff < minDiff) {
        closest = 10;
    }

    return closest * decade * 1e-12; // Back to Farads
}

// Compact format for schematics (no space before unit)
function fmt(value, unit) {
    if (unit === 'Ω') {
        if (value >= 1e6) return (value / 1e6).toFixed(1) + 'MΩ';
        if (value >= 1e3) return (value / 1e3).toFixed(1) + 'kΩ';
        return value.toFixed(0) + 'Ω';
    }
    if (unit === 'F') {
        if (value >= 1e-6) return (value * 1e6).toFixed(1) + 'µF';
        if (value >= 1e-9) return (value * 1e9).toFixed(0) + 'nF';
        return (value * 1e12).toFixed(0) + 'pF';
    }
    if (unit === 'V') {
        const absV = Math.abs(value);
        if (absV >= 1) return value.toFixed(2) + 'V';
        if (absV >= 0.001) return (value * 1000).toFixed(0) + 'mV';
        return (value * 1e6).toFixed(0) + 'µV';
    }
    if (unit === 'A') {
        const absA = Math.abs(value);
        if (absA >= 1) return value.toFixed(2) + 'A';
        if (absA >= 0.001) return (value * 1000).toFixed(2) + 'mA';
        return (value * 1e6).toFixed(0) + 'µA';
    }
    if (unit === 'Hz') {
        if (value >= 1e6) return (value / 1e6).toFixed(2) + 'MHz';
        if (value >= 1e3) return (value / 1e3).toFixed(2) + 'kHz';
        return value.toFixed(1) + 'Hz';
    }
    if (unit === 'mA') return value.toFixed(2) + 'mA';
    return value.toFixed(2) + unit;
}

// Long format for tables (space before unit)
function fmtLong(value, unit) {
    if (unit === 'Ω') {
        if (value >= 1e6) return (value / 1e6).toFixed(2) + ' MΩ';
        if (value >= 1e3) return (value / 1e3).toFixed(2) + ' kΩ';
        return value.toFixed(1) + ' Ω';
    }
    if (unit === 'F') {
        if (value >= 1e-6) return (value * 1e6).toFixed(2) + ' µF';
        if (value >= 1e-9) return (value * 1e9).toFixed(1) + ' nF';
        return (value * 1e12).toFixed(0) + ' pF';
    }
    if (unit === 'V') {
        const absV = Math.abs(value);
        if (absV >= 1) return value.toFixed(2) + ' V';
        if (absV >= 0.001) return (value * 1000).toFixed(0) + ' mV';
        return (value * 1e6).toFixed(0) + ' µV';
    }
    if (unit === 'A') {
        const absA = Math.abs(value);
        if (absA >= 1) return value.toFixed(2) + ' A';
        if (absA >= 0.001) return (value * 1000).toFixed(2) + ' mA';
        return (value * 1e6).toFixed(0) + ' µA';
    }
    if (unit === 'Hz') {
        if (value >= 1e6) return (value / 1e6).toFixed(2) + ' MHz';
        if (value >= 1e3) return (value / 1e3).toFixed(2) + ' kHz';
        return value.toFixed(1) + ' Hz';
    }
    if (unit === 'mA') return value.toFixed(2) + ' mA';
    return value.toFixed(2) + ' ' + unit;
}

// Parallel resistance/impedance
function parallel(...values) {
    return 1 / values.reduce((sum, v) => sum + 1/v, 0);
}
