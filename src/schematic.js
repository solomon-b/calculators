// schematic.js - Simple schematic drawing DSL for electronics calculators
// Also supports export to Falstad CircuitJS format

class Schematic {
    constructor(width = 500, height = 300) {
        this.width = width;
        this.height = height;
        this.components = new Map();
        this.wires = [];
        this.nodes = [];
        this.labels = [];
        this.falstadOptions = { vMax: 24 };
    }

    // Set options for Falstad export
    setFalstadOptions(options) {
        Object.assign(this.falstadOptions, options);
        return this;
    }

    // Place a component at (x, y) - coordinates are center of component
    place(type, id, x, y, options = {}) {
        const comp = createComponent(type, id, x, y, options);
        this.components.set(id, comp);
        return this;
    }

    // Connect two pins with a wire
    // Pins can be "componentId.pinName" or {x, y} coordinates
    wire(from, to, options = {}) {
        this.wires.push({ from, to, options });
        return this;
    }

    // Add a junction node (filled circle)
    node(x, y) {
        this.nodes.push({ x, y });
        return this;
    }

    // Add a text label
    label(text, x, y, options = {}) {
        this.labels.push({ text, x, y, ...options });
        return this;
    }

    // Get absolute position of a pin by "componentId.pinName"
    pin(ref) {
        if (typeof ref === 'object') return ref; // Already coordinates
        const [compId, pinName] = ref.split('.');
        const comp = this.components.get(compId);
        if (!comp) throw new Error(`Component not found: ${compId}`);
        const pin = comp.pins[pinName];
        if (!pin) throw new Error(`Pin not found: ${pinName} on ${compId}`);
        return { x: comp.x + pin.x, y: comp.y + pin.y };
    }

    // Get Falstad-adjusted pin position (some components have different geometry in Falstad)
    falstadPin(ref) {
        if (typeof ref === 'object') return ref; // Already coordinates
        const [compId, pinName] = ref.split('.');
        const comp = this.components.get(compId);
        if (!comp) throw new Error(`Component not found: ${compId}`);
        // Use Falstad-specific pins if available, otherwise fall back to regular pins
        const pins = comp.falstadPins || comp.pins;
        const pin = pins[pinName];
        if (!pin) throw new Error(`Pin not found: ${pinName} on ${compId}`);
        return { x: comp.x + pin.x, y: comp.y + pin.y };
    }

    // Generate SVG string
    toSVG() {
        let svg = `<svg width="${this.width}" height="${this.height}" style="font-family: monospace; font-size: 12px;">`;

        // Draw wires first (behind components)
        for (const wire of this.wires) {
            svg += this._drawWire(wire);
        }

        // Draw components
        for (const comp of this.components.values()) {
            svg += comp.render();
        }

        // Draw junction nodes
        for (const n of this.nodes) {
            svg += `<circle cx="${n.x}" cy="${n.y}" r="3" fill="black"/>`;
        }

        // Draw labels
        for (const lbl of this.labels) {
            const anchor = lbl.anchor || 'start';
            const style = lbl.bold ? 'font-weight: bold;' : '';
            svg += `<text x="${lbl.x}" y="${lbl.y}" text-anchor="${anchor}" style="${style}">${lbl.text}</text>`;
        }

        svg += '</svg>';
        return svg;
    }

    // Generate Falstad circuit text format
    toFalstad() {
        const opts = this.falstadOptions;
        const lines = [];

        // Header: $ 1 <timestep> <speed> <voltageRange> <currentSpeed> <flags> <currentMult>
        lines.push(`$ 1 0.000005 10.20027730826997 ${opts.vMax || 24} 5 50 5e-11`);

        // Export each component
        for (const comp of this.components.values()) {
            if (comp.toFalstad) {
                const falstadLine = comp.toFalstad();
                if (falstadLine) {
                    if (Array.isArray(falstadLine)) {
                        lines.push(...falstadLine);
                    } else {
                        lines.push(falstadLine);
                    }
                }
            }
        }

        // Export wires (use falstadPin for adjusted coordinates)
        for (const wire of this.wires) {
            const from = this.falstadPin(wire.from);
            const to = this.falstadPin(wire.to);
            const route = wire.options.route || 'direct';

            if (route === 'direct') {
                lines.push(`w ${from.x} ${from.y} ${to.x} ${to.y} 0`);
            } else if (route === 'h-v') {
                lines.push(`w ${from.x} ${from.y} ${to.x} ${from.y} 0`);
                lines.push(`w ${to.x} ${from.y} ${to.x} ${to.y} 0`);
            } else if (route === 'v-h') {
                lines.push(`w ${from.x} ${from.y} ${from.x} ${to.y} 0`);
                lines.push(`w ${from.x} ${to.y} ${to.x} ${to.y} 0`);
            }
        }

        return lines.join('\n');
    }

    // Open circuit in Falstad simulator
    openInFalstad() {
        if (typeof LZString === 'undefined') {
            console.error('LZString library not loaded');
            alert('LZString library required for Falstad export');
            return;
        }
        const circuitText = this.toFalstad();
        const compressed = LZString.compressToEncodedURIComponent(circuitText);
        const url = `https://www.falstad.com/circuit/circuitjs.html?ctz=${compressed}`;
        window.open(url, '_blank');
    }

    // Get Falstad URL without opening
    getFalstadUrl() {
        if (typeof LZString === 'undefined') {
            console.error('LZString library not loaded');
            return null;
        }
        const circuitText = this.toFalstad();
        const compressed = LZString.compressToEncodedURIComponent(circuitText);
        return `https://www.falstad.com/circuit/circuitjs.html?ctz=${compressed}`;
    }

    _drawWire(wire) {
        const from = this.pin(wire.from);
        const to = this.pin(wire.to);
        const route = wire.options.route || 'direct';
        const dashed = wire.options.dashed ? ' stroke-dasharray="4,2"' : '';

        let points;
        switch (route) {
            case 'direct':
                return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="2"${dashed}/>`;
            case 'h-v': // Horizontal then vertical
                points = `${from.x},${from.y} ${to.x},${from.y} ${to.x},${to.y}`;
                break;
            case 'v-h': // Vertical then horizontal
                points = `${from.x},${from.y} ${from.x},${to.y} ${to.x},${to.y}`;
                break;
            case 'h-v-h': { // Horizontal, vertical, horizontal (with midX)
                const midX = wire.options.midX || (from.x + to.x) / 2;
                points = `${from.x},${from.y} ${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
                break;
            }
            case 'v-h-v': { // Vertical, horizontal, vertical (with midY)
                const midY = wire.options.midY || (from.y + to.y) / 2;
                points = `${from.x},${from.y} ${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`;
                break;
            }
            default:
                return '';
        }
        return `<polyline points="${points}" fill="none" stroke="black" stroke-width="2"${dashed}/>`;
    }
}


// ============ Component Classes ============

class Component {
    constructor(id, x, y, options = {}) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.options = options;
        this.pins = {};
    }
    render() { return ''; }
}

// Op-amp triangle - (x,y) is center of triangle
class OpAmp extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        const flip = options.flip || false; // flip swaps + and - inputs
        // SVG pins use ±20px offset for visual appearance
        this.pins = {
            plus:  { x: -40, y: flip ? -20 : 20 },
            minus: { x: -40, y: flip ? 20 : -20 },
            out:   { x: 40, y: 0 },
            vpos:  { x: 0, y: -30 },
            vneg:  { x: 0, y: 30 },
        };
        // Falstad uses ±16px offset for op-amp inputs
        this.falstadPins = {
            plus:  { x: -40, y: flip ? -16 : 16 },
            minus: { x: -40, y: flip ? 16 : -16 },
            out:   { x: 40, y: 0 },
            vpos:  { x: 0, y: -30 },
            vneg:  { x: 0, y: 30 },
        };
        this.flip = flip;
    }
    render() {
        const { x, y, flip, options } = this;
        let s = `<polygon points="${x-40},${y-40} ${x-40},${y+40} ${x+40},${y}" fill="none" stroke="black" stroke-width="2"/>`;
        // Labels inside triangle
        s += `<text x="${x-30}" y="${y + (flip ? 28 : -12)}">−</text>`;
        s += `<text x="${x-30}" y="${y + (flip ? -12 : 28)}">+</text>`;
        // Power labels if vcc specified
        if (options.vcc) {
            s += `<line x1="${x}" y1="${y-30}" x2="${x}" y2="${y-45}" stroke="black" stroke-width="2"/>`;
            s += `<text x="${x+5}" y="${y-48}">+${options.vcc}V</text>`;
            s += `<line x1="${x}" y1="${y+30}" x2="${x}" y2="${y+45}" stroke="black" stroke-width="2"/>`;
            s += `<text x="${x+5}" y="${y+55}">−${options.vcc}V</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y, options, flip } = this;
        const vcc = options.vcc || 12;
        // Falstad op-amp format: a x1 y1 x2 y2 flags maxOut minOut gbw
        // x1,y1 is input side center, x2,y2 is output
        // Falstad places inputs at y1 ± 16px, but our SVG uses ±20px offset
        const inputX = x - 40;
        const outX = x + 40;
        const flags = flip ? 1 : 0;  // bit 0 swaps + and - inputs
        // gbw=0 means ideal op-amp (infinite bandwidth)
        return `a ${inputX} ${y} ${outX} ${y} ${flags} ${vcc} ${-vcc} 0`;
    }
}

// Simple amplifier/buffer triangle - (x,y) is center, shows gain label inside
class Amplifier extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            in:  { x: -30, y: 0 },
            out: { x: 30, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        let s = `<polygon points="${x-30},${y-25} ${x-30},${y+25} ${x+30},${y}" fill="none" stroke="black" stroke-width="2"/>`;
        // Gain label inside
        if (options.label) {
            s += `<text x="${x-20}" y="${y+5}" font-size="12">${options.label}</text>`;
        }
        return s;
    }
}

// Horizontal resistor - (x,y) is center, 50px wide, 20px tall
class ResistorH extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: -25, y: 0 },
            b: { x: 25, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        let s = `<rect x="${x-25}" y="${y-10}" width="50" height="20" fill="none" stroke="black" stroke-width="2"/>`;
        s += `<text x="${x}" y="${y-15}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // r x1 y1 x2 y2 0 <resistance>
        return `r ${x - 25} ${y} ${x + 25} ${y} 0 ${options.value}`;
    }
}

// Vertical resistor - (x,y) is center, 20px wide, 50px tall
class ResistorV extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: -25 },
            b: { x: 0, y: 25 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        const labelPos = options.labelPos || 'right';
        const dashed = options.dashed ? ' stroke-dasharray="4,2"' : '';
        let s = `<rect x="${x-10}" y="${y-25}" width="20" height="50" fill="none" stroke="black" stroke-width="2"${dashed}/>`;
        if (labelPos === 'right') {
            s += `<text x="${x+15}" y="${y+5}">${label}</text>`;
        } else {
            s += `<text x="${x-15}" y="${y+5}" text-anchor="end">${label}</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // r x1 y1 x2 y2 0 <resistance>
        return `r ${x} ${y - 25} ${x} ${y + 25} 0 ${options.value}`;
    }
}

// Horizontal capacitor (vertical plates) - (x,y) is center
class CapacitorH extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: -4, y: 0 },
            b: { x: 4, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        let s = `<line x1="${x-4}" y1="${y-12}" x2="${x-4}" y2="${y+12}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x+4}" y1="${y-12}" x2="${x+4}" y2="${y+12}" stroke="black" stroke-width="2"/>`;
        s += `<text x="${x}" y="${y-18}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // c x1 y1 x2 y2 0 <capacitance> <initialVoltage>
        return `c ${x - 4} ${y} ${x + 4} ${y} 0 ${options.value} 0`;
    }
}

// Vertical capacitor (horizontal plates) - (x,y) is center
class CapacitorV extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: -4 },
            b: { x: 0, y: 4 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        const labelPos = options.labelPos || 'right';
        let s = `<line x1="${x-12}" y1="${y-4}" x2="${x+12}" y2="${y-4}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x-12}" y1="${y+4}" x2="${x+12}" y2="${y+4}" stroke="black" stroke-width="2"/>`;
        if (labelPos === 'right') {
            s += `<text x="${x+18}" y="${y+5}">${label}</text>`;
        } else {
            s += `<text x="${x-18}" y="${y+5}" text-anchor="end">${label}</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // c x1 y1 x2 y2 0 <capacitance> <initialVoltage>
        return `c ${x} ${y - 4} ${x} ${y + 4} 0 ${options.value} 0`;
    }
}

// Ground symbol - (x,y) is top center connection point
class Ground extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const dashed = options.dashed ? ' stroke-dasharray="4,2"' : '';
        let s = `<line x1="${x-10}" y1="${y}" x2="${x+10}" y2="${y}" stroke="black" stroke-width="2"${dashed}/>`;
        s += `<line x1="${x-6}" y1="${y+5}" x2="${x+6}" y2="${y+5}" stroke="black" stroke-width="1.5"${dashed}/>`;
        s += `<line x1="${x-3}" y1="${y+10}" x2="${x+3}" y2="${y+10}" stroke="black" stroke-width="1"${dashed}/>`;
        return s;
    }
    toFalstad() {
        const { x, y } = this;
        // g x1 y1 x2 y2 0
        return `g ${x} ${y} ${x} ${y + 16} 0`;
    }
}

// Horizontal diode - (x,y) is center, anode left, cathode right (or flipped)
class DiodeH extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        const flip = options.flip || false;
        this.flip = flip;
        this.pins = flip ? {
            a: { x: 15, y: 0 },   // anode on right when flipped
            k: { x: -15, y: 0 },  // cathode on left when flipped
        } : {
            a: { x: -15, y: 0 },  // anode on left
            k: { x: 15, y: 0 },   // cathode on right
        };
    }
    render() {
        const { x, y, options, flip } = this;
        const label = options.label || this.id;
        let s = '';
        if (flip) {
            // Triangle pointing left
            s += `<polygon points="${x+10},${y-10} ${x+10},${y+10} ${x-5},${y}" fill="none" stroke="black" stroke-width="2"/>`;
            // Cathode bar on left
            s += `<line x1="${x-5}" y1="${y-10}" x2="${x-5}" y2="${y+10}" stroke="black" stroke-width="2"/>`;
        } else {
            // Triangle pointing right (default)
            s += `<polygon points="${x-10},${y-10} ${x-10},${y+10} ${x+5},${y}" fill="none" stroke="black" stroke-width="2"/>`;
            // Cathode bar on right
            s += `<line x1="${x+5}" y1="${y-10}" x2="${x+5}" y2="${y+10}" stroke="black" stroke-width="2"/>`;
        }
        // Connection lines
        s += `<line x1="${x-15}" y1="${y}" x2="${x-10}" y2="${y}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x+5}" y1="${y}" x2="${x+15}" y2="${y}" stroke="black" stroke-width="2"/>`;
        // Label
        s += `<text x="${x}" y="${y-15}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, flip, options } = this;
        if (options.value === undefined && options.vf === undefined) return null;
        const vf = options.vf || options.value || 0.7;
        const model = options.led ? 4 : 1; // 4 = LED, 1 = standard diode
        // d x1 y1 x2 y2 <model> <fwdrop>
        // Anode on left, cathode on right (or flipped)
        if (flip) {
            return `d ${x + 15} ${y} ${x - 15} ${y} ${model} ${vf}`;
        } else {
            return `d ${x - 15} ${y} ${x + 15} ${y} ${model} ${vf}`;
        }
    }
}

// Vertical diode - (x,y) is center, anode top, cathode bottom (or flipped)
class DiodeV extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        const flip = options.flip || false;
        this.flip = flip;
        this.pins = flip ? {
            a: { x: 0, y: 15 },   // anode (bottom when flipped)
            k: { x: 0, y: -15 },  // cathode (top when flipped)
        } : {
            a: { x: 0, y: -15 },  // anode (top)
            k: { x: 0, y: 15 },   // cathode (bottom)
        };
    }
    render() {
        const { x, y, flip, options } = this;
        const label = options.label || this.id;
        const labelPos = options.labelPos || 'right';
        let s = '';
        if (flip) {
            // Triangle pointing up (toward cathode at top)
            s += `<polygon points="${x-10},${y+5} ${x+10},${y+5} ${x},${y-10}" fill="none" stroke="black" stroke-width="2"/>`;
            // Cathode bar at top
            s += `<line x1="${x-10}" y1="${y-10}" x2="${x+10}" y2="${y-10}" stroke="black" stroke-width="2"/>`;
            // Connection lines
            s += `<line x1="${x}" y1="${y-15}" x2="${x}" y2="${y-10}" stroke="black" stroke-width="2"/>`;
            s += `<line x1="${x}" y1="${y+5}" x2="${x}" y2="${y+15}" stroke="black" stroke-width="2"/>`;
        } else {
            // Triangle pointing down (toward cathode at bottom)
            s += `<polygon points="${x-10},${y-5} ${x+10},${y-5} ${x},${y+10}" fill="none" stroke="black" stroke-width="2"/>`;
            // Cathode bar at bottom
            s += `<line x1="${x-10}" y1="${y+10}" x2="${x+10}" y2="${y+10}" stroke="black" stroke-width="2"/>`;
            // Connection lines
            s += `<line x1="${x}" y1="${y-15}" x2="${x}" y2="${y-5}" stroke="black" stroke-width="2"/>`;
            s += `<line x1="${x}" y1="${y+10}" x2="${x}" y2="${y+15}" stroke="black" stroke-width="2"/>`;
        }
        // Label
        if (labelPos === 'right') {
            s += `<text x="${x+15}" y="${y+5}">${label}</text>`;
        } else {
            s += `<text x="${x-15}" y="${y+5}" text-anchor="end">${label}</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y, flip, options } = this;
        if (options.value === undefined && options.vf === undefined) return null;
        const vf = options.vf || options.value || 0.7;
        const model = options.led ? 4 : 1; // 4 = LED, 1 = standard diode
        // d x1 y1 x2 y2 <model> <fwdrop>
        // Anode at top, cathode at bottom (or flipped)
        if (flip) {
            return `d ${x} ${y + 15} ${x} ${y - 15} ${model} ${vf}`;
        } else {
            return `d ${x} ${y - 15} ${x} ${y + 15} ${model} ${vf}`;
        }
    }
}

// Horizontal inductor - (x,y) is center, 48px wide
class InductorH extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: -24, y: 0 },
            b: { x: 24, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        let s = `<path d="M${x - 24},${y} a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0" fill="none" stroke="black" stroke-width="2"/>`;
        s += `<text x="${x}" y="${y - 15}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // l x1 y1 x2 y2 0 <inductance> <current>
        return `l ${x - 24} ${y} ${x + 24} ${y} 0 ${options.value} 0`;
    }
}

// Vertical inductor - (x,y) is center, 48px tall
class InductorV extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: -24 },
            b: { x: 0, y: 24 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || this.id;
        const labelPos = options.labelPos || 'right';
        let s = `<path d="M${x},${y - 24} a6,6 0 0 1 0,12 a6,6 0 0 1 0,12 a6,6 0 0 1 0,12 a6,6 0 0 1 0,12" fill="none" stroke="black" stroke-width="2"/>`;
        if (labelPos === 'right') {
            s += `<text x="${x + 15}" y="${y + 5}">${label}</text>`;
        } else {
            s += `<text x="${x - 15}" y="${y + 5}" text-anchor="end">${label}</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        return `l ${x} ${y - 24} ${x} ${y + 24} 0 ${options.value} 0`;
    }
}

// NPN BJT transistor - (x,y) is center of base bar
// Base on left, collector top-right, emitter bottom-right
class NPN extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            base: { x: -15, y: 0 },
            collector: { x: 25, y: -25 },
            emitter: { x: 25, y: 25 },
        };
    }
    render() {
        const { x, y } = this;
        let s = '';
        // Base bar (vertical)
        s += `<line x1="${x}" y1="${y-20}" x2="${x}" y2="${y+20}" stroke="black" stroke-width="3"/>`;
        // Base input line
        s += `<line x1="${x-15}" y1="${y}" x2="${x}" y2="${y}" stroke="black" stroke-width="2"/>`;
        // Collector line (angled up-right)
        s += `<line x1="${x}" y1="${y-10}" x2="${x+25}" y2="${y-25}" stroke="black" stroke-width="2"/>`;
        // Emitter line (angled down-right) with arrow
        s += `<line x1="${x}" y1="${y+10}" x2="${x+25}" y2="${y+25}" stroke="black" stroke-width="2"/>`;
        // Arrow on emitter
        s += `<polygon points="${x+19},${y+18} ${x+25},${y+25} ${x+17},${y+23}" fill="black"/>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        const beta = options.beta || 100;
        // Falstad NPN: t x1 y1 x2 y2 0 1 <vbe> <vbc> <beta>
        // x1,y1 is base terminal, x2,y2 is body center
        // Collector at (x2, y2-16), Emitter at (x2, y2+16)
        const baseX = x - 15;
        const baseY = y;
        const bodyX = x + 25;
        const bodyY = y; // collector will be at y-16, emitter at y+16
        return `t ${baseX} ${baseY} ${bodyX} ${bodyY} 0 1 -0.7 0.7 ${beta}`;
    }
}

// VCC/VDD power rail - (x,y) is bottom connection point
class Power extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || 'V+';
        let s = `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-10}" stroke="black" stroke-width="2"/>`;
        s += `<text x="${x}" y="${y-15}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // DC voltage source pointing up: R x1 y1 x2 y2 0 0 40 <voltage> 0 0 0.5
        return `R ${x} ${y} ${x} ${y - 32} 0 0 40 ${options.value} 0 0 0.5`;
    }
}

// DC Voltage Source - (x,y) is positive terminal, oriented vertically
class DCSource extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            pos: { x: 0, y: 0 },
            neg: { x: 0, y: 50 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || (options.value ? options.value + 'V' : 'Vdc');
        let s = '';
        // Circle
        s += `<circle cx="${x}" cy="${y+25}" r="15" fill="none" stroke="black" stroke-width="2"/>`;
        // Plus/minus signs
        s += `<line x1="${x-5}" y1="${y+20}" x2="${x+5}" y2="${y+20}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x}" y1="${y+15}" x2="${x}" y2="${y+25}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x-5}" y1="${y+32}" x2="${x+5}" y2="${y+32}" stroke="black" stroke-width="2"/>`;
        // Leads
        s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y+10}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x}" y1="${y+40}" x2="${x}" y2="${y+50}" stroke="black" stroke-width="2"/>`;
        // Label
        s += `<text x="${x+20}" y="${y+30}">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        if (options.value === undefined) return null;
        // DC voltage source: R x1 y1 x2 y2 0 0 40 <voltage> 0 0 0.5
        return `R ${x} ${y} ${x} ${y + 50} 0 0 40 ${options.value} 0 0 0.5`;
    }
}

// AC Voltage Source - (x,y) is positive terminal, oriented vertically
class ACSource extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            pos: { x: 0, y: 0 },
            neg: { x: 0, y: 50 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || 'Vac';
        let s = '';
        // Circle
        s += `<circle cx="${x}" cy="${y+25}" r="15" fill="none" stroke="black" stroke-width="2"/>`;
        // Sine wave inside
        s += `<path d="M${x-8},${y+25} Q${x-4},${y+18} ${x},${y+25} T${x+8},${y+25}" fill="none" stroke="black" stroke-width="1.5"/>`;
        // Leads
        s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y+10}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x}" y1="${y+40}" x2="${x}" y2="${y+50}" stroke="black" stroke-width="2"/>`;
        // Label
        s += `<text x="${x+20}" y="${y+30}">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        const amplitude = options.value || 1;
        const freq = options.freq || 1000;
        // AC voltage source: R x1 y1 x2 y2 0 1 <freq> <amplitude> 0 0 0.5
        return `R ${x} ${y} ${x} ${y + 50} 0 1 ${freq} ${amplitude} 0 0 0.5`;
    }
}

// Horizontal AC Source - for inline signal injection
class ACSourceH extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: -25, y: 0 },
            b: { x: 25, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || 'Vin';
        let s = '';
        // Circle
        s += `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="black" stroke-width="2"/>`;
        // Sine wave inside
        s += `<path d="M${x-8},${y} Q${x-4},${y-7} ${x},${y} T${x+8},${y}" fill="none" stroke="black" stroke-width="1.5"/>`;
        // Leads
        s += `<line x1="${x-25}" y1="${y}" x2="${x-15}" y2="${y}" stroke="black" stroke-width="2"/>`;
        s += `<line x1="${x+15}" y1="${y}" x2="${x+25}" y2="${y}" stroke="black" stroke-width="2"/>`;
        // Label
        s += `<text x="${x}" y="${y-20}" text-anchor="middle">${label}</text>`;
        return s;
    }
    toFalstad() {
        const { x, y, options } = this;
        const amplitude = options.value || 1;
        const freq = options.freq || 1000;
        // AC voltage source: R x1 y1 x2 y2 0 1 <freq> <amplitude> 0 0 0.5
        // First coordinate is "hot" terminal (right pin), second is ground (left pin)
        return `R ${x + 25} ${y} ${x - 25} ${y} 0 1 ${freq} ${amplitude} 0 0 0.5`;
    }
}

// Probe/Scope point - (x,y) is connection point
class Probe extends Component {
    constructor(id, x, y, options = {}) {
        super(id, x, y, options);
        this.pins = {
            a: { x: 0, y: 0 },
        };
    }
    render() {
        const { x, y, options } = this;
        const label = options.label || '';
        let s = '';
        // Small filled circle as probe point
        s += `<circle cx="${x}" cy="${y}" r="4" fill="#2266cc" stroke="#2266cc"/>`;
        if (label) {
            s += `<text x="${x+8}" y="${y+4}" fill="#2266cc">${label}</text>`;
        }
        return s;
    }
    toFalstad() {
        const { x, y } = this;
        // Probe: p x1 y1 x2 y2 1 0 0
        return `p ${x} ${y} ${x + 48} ${y} 1 0 0`;
    }
}


// ============ Component Factory ============

const COMPONENT_TYPES = {
    'opamp': OpAmp,
    'amplifier': Amplifier,
    'amp': Amplifier,
    'buffer': Amplifier,
    'resistor': ResistorH,
    'resistor-h': ResistorH,
    'resistor-v': ResistorV,
    'capacitor': CapacitorH,
    'capacitor-h': CapacitorH,
    'capacitor-v': CapacitorV,
    'inductor': InductorH,
    'inductor-h': InductorH,
    'inductor-v': InductorV,
    'diode': DiodeH,
    'diode-h': DiodeH,
    'diode-v': DiodeV,
    'ground': Ground,
    'gnd': Ground,
    'power': Power,
    'vcc': Power,
    'npn': NPN,
    'dc-source': DCSource,
    'dc-source-v': DCSource,
    'ac-source': ACSource,
    'ac-source-v': ACSource,
    'ac-source-h': ACSourceH,
    'probe': Probe,
    'scope': Probe,
};

function createComponent(type, id, x, y, options) {
    const Comp = COMPONENT_TYPES[type];
    if (!Comp) throw new Error(`Unknown component type: ${type}`);
    return new Comp(id, x, y, options);
}
