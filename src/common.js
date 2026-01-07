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

// Butterworth Q values for cascaded 2nd-order stages
// Each stage in an Nth-order filter needs a specific Q
const BUTTERWORTH_Q = {
    2: [0.7071],                           // 1 stage
    4: [0.5412, 1.3065],                   // 2 stages
    6: [0.5176, 0.7071, 1.9319],           // 3 stages
    8: [0.5098, 0.6013, 0.8999, 2.5628]    // 4 stages
};

// Calculate Sallen-Key stage components
// Uses equal-R, equal-C design with gain to set Q
// Returns: { R, C, K, Ra, Rb, fcActual, Q }
function sallenKeyStage(fc, Q, C) {
    // For equal-R, equal-C Sallen-Key:
    // fc = 1 / (2 * pi * R * C)
    // Q = 1 / (3 - K)  where K is the gain

    // Calculate R for desired cutoff
    const R = 1 / (2 * Math.PI * fc * C);
    const Rround = roundToE24(R);

    // Calculate gain needed for desired Q
    // Q = 1 / (3 - K)  =>  K = 3 - 1/Q
    const K = 3 - (1 / Q);

    // Gain is set by Ra, Rb: K = 1 + Rb/Ra
    // Choose Ra = 10k as reference, calculate Rb
    const Ra = 10000;
    const Rb = (K - 1) * Ra;
    const RaRound = roundToE24(Ra);
    const RbRound = Rb > 0 ? roundToE24(Rb) : 0;

    // Actual values with rounded components
    const Kactual = RbRound > 0 ? 1 + RbRound / RaRound : 1;
    const fcActual = 1 / (2 * Math.PI * Rround * C);
    const Qactual = 1 / (3 - Kactual);

    return {
        R: Rround,
        C: C,
        K: Kactual,
        Ra: RaRound,
        Rb: RbRound,
        fcActual: fcActual,
        Q: Qactual
    };
}

// Calculate complete Butterworth filter
// Returns array of stage objects
function butterworthFilter(type, order, fc, C) {
    const qValues = BUTTERWORTH_Q[order];
    if (!qValues) return null;

    const stages = [];
    for (let i = 0; i < qValues.length; i++) {
        const stage = sallenKeyStage(fc, qValues[i], C);
        stage.type = type;
        stage.stageNum = i + 1;
        stage.targetQ = qValues[i];
        stages.push(stage);
    }

    return stages;
}
