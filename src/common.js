// Common utilities for electronics calculators

// Op-amp presets: GBW (Hz), Slew Rate (V/s), Input Noise Density (V/√Hz)
const OPAMP_PRESETS = {
    ideal: { name: 'Ideal', gbw: Infinity, slewRate: Infinity, noiseVoltage: 0 },
    tl072: { name: 'TL072', gbw: 3e6, slewRate: 13e6, noiseVoltage: 18e-9 },
    ne5532: { name: 'NE5532', gbw: 10e6, slewRate: 9e6, noiseVoltage: 5e-9 },
    opa2134: { name: 'OPA2134', gbw: 8e6, slewRate: 20e6, noiseVoltage: 8e-9 },
    lm358: { name: 'LM358', gbw: 1e6, slewRate: 0.5e6, noiseVoltage: 40e-9 },
    ad8066: { name: 'AD8066', gbw: 145e6, slewRate: 180e6, noiseVoltage: 7e-9 }
};

// Thermal voltage at 25°C: V_T = kT/q ≈ 26mV
// Used to calculate intrinsic emitter resistance: r'e = V_T / I_C
const V_T = 0.026;

// BJT transistor presets: beta (hFE), fT (Hz), Vce_sat (V)
const BJT_PRESETS = {
    ideal: { name: 'Ideal', beta: 100000, ft: 1e12, vceSat: 0 },
    '2n2222': { name: '2N2222', beta: 150, ft: 300e6, vceSat: 0.3 },
    '2n3904': { name: '2N3904', beta: 200, ft: 300e6, vceSat: 0.2 },
    'bc547': { name: 'BC547', beta: 300, ft: 300e6, vceSat: 0.25 },
    '2n5551': { name: '2N5551', beta: 120, ft: 100e6, vceSat: 0.4 },
    'mpsa18': { name: 'MPSA18', beta: 1000, ft: 50e6, vceSat: 0.25 }
};

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

// Calculate Chebyshev Type I pole Q values and frequency scaling
// Returns array of { Q, wScale } for each 2nd-order stage
function chebyshevPoles(order, rippleDb) {
    const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    const a = Math.asinh(1 / epsilon) / order;

    const poles = [];
    for (let k = 1; k <= order; k++) {
        const theta = (2 * k - 1) * Math.PI / (2 * order);
        const sigma = -Math.sinh(a) * Math.sin(theta);
        const omega = Math.cosh(a) * Math.cos(theta);
        poles.push({ sigma, omega });
    }

    // Pair complex conjugate poles into 2nd-order sections
    // Poles are symmetric, so we take first half (or middle one for odd order)
    const stages = [];
    const numStages = Math.floor(order / 2);

    for (let i = 0; i < numStages; i++) {
        // Poles are ordered by angle, pair from outside in
        const pole = poles[i];
        const w0 = Math.sqrt(pole.sigma * pole.sigma + pole.omega * pole.omega);
        const Q = w0 / (-2 * pole.sigma);
        stages.push({ Q, w0 });
    }

    // Sort stages by Q (lower Q first for better noise performance)
    stages.sort((a, b) => a.Q - b.Q);

    return stages;
}

// Calculate Chebyshev stage components
function chebyshevStage(fc, stageParams, C) {
    const { Q, w0 } = stageParams;

    // Chebyshev stages have different natural frequencies
    // fc is the passband edge, w0 is normalized to 1 at passband edge
    const stageFC = fc * w0;

    const R = 1 / (2 * Math.PI * stageFC * C);
    const Rround = roundToE24(R);

    // Gain for desired Q: K = 3 - 1/Q
    const K = 3 - (1 / Q);

    const Ra = 10000;
    const Rb = (K - 1) * Ra;
    const RaRound = roundToE24(Ra);
    const RbRound = Rb > 0 ? roundToE24(Rb) : 0;

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
        Q: Qactual,
        targetQ: Q,
        w0: w0
    };
}

// Calculate complete Chebyshev Type I filter
function chebyshevFilter(type, order, fc, C, rippleDb) {
    const poleData = chebyshevPoles(order, rippleDb);

    const stages = [];
    for (let i = 0; i < poleData.length; i++) {
        const stage = chebyshevStage(fc, poleData[i], C);
        stage.type = type;
        stage.stageNum = i + 1;
        stages.push(stage);
    }

    return stages;
}

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
