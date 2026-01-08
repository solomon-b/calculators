// graph.js - Reusable SVG graph generation for frequency response plots

class Graph {
    constructor(options = {}) {
        this.width = options.width || 600;
        this.height = options.height || 300;
        this.margin = options.margin || { top: 20, right: 30, bottom: 40, left: 50 };
        this.plotW = this.width - this.margin.left - this.margin.right;
        this.plotH = this.height - this.margin.top - this.margin.bottom;

        // Axis ranges
        this.xMin = options.xMin || 1;
        this.xMax = options.xMax || 100000;
        this.yMin = options.yMin || -60;
        this.yMax = options.yMax || 20;

        // Axis types
        this.xLog = options.xLog !== false; // Default to log scale for frequency
        this.yLog = options.yLog || false;

        // Labels
        this.xLabel = options.xLabel || 'Frequency';
        this.yLabel = options.yLabel || 'Gain (dB)';

        // Stored elements
        this.curves = [];
        this.hLines = [];
        this.vLines = [];
        this.legendItems = [];
    }

    // Coordinate transforms
    xScale(val) {
        if (this.xLog) {
            return this.margin.left + this.plotW *
                (Math.log10(val) - Math.log10(this.xMin)) /
                (Math.log10(this.xMax) - Math.log10(this.xMin));
        }
        return this.margin.left + this.plotW * (val - this.xMin) / (this.xMax - this.xMin);
    }

    yScale(val) {
        return this.margin.top + this.plotH * (this.yMax - val) / (this.yMax - this.yMin);
    }

    // Add a curve (array of {x, y} points)
    addCurve(points, options = {}) {
        this.curves.push({
            points,
            color: options.color || '#2266cc',
            width: options.width || 2,
            dashed: options.dashed || false,
            label: options.label || null
        });
        if (options.label) {
            this.legendItems.push({ label: options.label, color: options.color || '#2266cc', dashed: options.dashed });
        }
        return this;
    }

    // Add horizontal reference line
    addHLine(y, options = {}) {
        this.hLines.push({
            y,
            color: options.color || '#f88',
            label: options.label || null,
            dashed: options.dashed !== false
        });
        if (options.label) {
            this.legendItems.push({ label: options.label, color: options.color || '#f88', dashed: true });
        }
        return this;
    }

    // Add vertical reference line
    addVLine(x, options = {}) {
        this.vLines.push({
            x,
            color: options.color || '#88f',
            label: options.label || null,
            dashed: options.dashed !== false
        });
        if (options.label) {
            this.legendItems.push({ label: options.label, color: options.color || '#88f', dashed: true });
        }
        return this;
    }

    // Generate SVG
    toSVG() {
        let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; max-width: ${this.width}px; height: auto; font-family: monospace; font-size: 11px;">`;

        // Background
        svg += `<rect x="${this.margin.left}" y="${this.margin.top}" width="${this.plotW}" height="${this.plotH}" fill="#fafafa" stroke="#ccc"/>`;

        // Grid lines - vertical (x-axis)
        if (this.xLog) {
            for (let decade = Math.ceil(Math.log10(this.xMin)); decade <= Math.floor(Math.log10(this.xMax)); decade++) {
                const x = Math.pow(10, decade);
                const xPos = this.xScale(x);
                svg += `<line x1="${xPos}" y1="${this.margin.top}" x2="${xPos}" y2="${this.margin.top + this.plotH}" stroke="#ddd" stroke-width="1"/>`;
                svg += `<text x="${xPos}" y="${this.height - 5}" text-anchor="middle">${this._formatFreq(x)}</text>`;
            }
        }

        // Grid lines - horizontal (y-axis)
        const yStep = this._niceStep(this.yMax - this.yMin, 8);
        for (let y = Math.ceil(this.yMin / yStep) * yStep; y <= this.yMax; y += yStep) {
            const yPos = this.yScale(y);
            svg += `<line x1="${this.margin.left}" y1="${yPos}" x2="${this.margin.left + this.plotW}" y2="${yPos}" stroke="#ddd" stroke-width="1"/>`;
            svg += `<text x="${this.margin.left - 5}" y="${yPos + 4}" text-anchor="end">${y}</text>`;
        }

        // Horizontal reference lines
        for (const line of this.hLines) {
            const yPos = this.yScale(line.y);
            const dash = line.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${this.margin.left}" y1="${yPos}" x2="${this.margin.left + this.plotW}" y2="${yPos}" stroke="${line.color}" stroke-width="1"${dash}/>`;
        }

        // Vertical reference lines
        for (const line of this.vLines) {
            const xPos = this.xScale(line.x);
            const dash = line.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${xPos}" y1="${this.margin.top}" x2="${xPos}" y2="${this.margin.top + this.plotH}" stroke="${line.color}" stroke-width="1"${dash}/>`;
        }

        // Curves
        for (const curve of this.curves) {
            if (curve.points.length === 0) continue;
            const dash = curve.dashed ? ' stroke-dasharray="4,2"' : '';
            let pathD = `M ${this.xScale(curve.points[0].x)} ${this.yScale(this._clampY(curve.points[0].y))}`;
            for (let i = 1; i < curve.points.length; i++) {
                pathD += ` L ${this.xScale(curve.points[i].x)} ${this.yScale(this._clampY(curve.points[i].y))}`;
            }
            svg += `<path d="${pathD}" fill="none" stroke="${curve.color}" stroke-width="${curve.width}"${dash}/>`;
        }

        // Axis labels
        svg += `<text x="${this.width / 2}" y="${this.height - 22}" text-anchor="middle">${this.xLabel}</text>`;
        svg += `<text x="15" y="${this.height / 2}" text-anchor="middle" transform="rotate(-90, 15, ${this.height / 2})">${this.yLabel}</text>`;

        // Legend
        let legendX = this.margin.left + 10;
        for (const item of this.legendItems) {
            const dash = item.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${legendX}" y1="${this.margin.top + 12}" x2="${legendX + 20}" y2="${this.margin.top + 12}" stroke="${item.color}" stroke-width="2"${dash}/>`;
            svg += `<text x="${legendX + 25}" y="${this.margin.top + 16}">${item.label}</text>`;
            legendX += 25 + item.label.length * 7 + 15;
        }

        svg += '</svg>';
        return svg;
    }

    _clampY(y) {
        return Math.max(this.yMin, Math.min(this.yMax, y));
    }

    _formatFreq(f) {
        if (f >= 1e6) return (f / 1e6) + 'M';
        if (f >= 1e3) return (f / 1e3) + 'k';
        return f + '';
    }

    _niceStep(range, targetSteps) {
        const rough = range / targetSteps;
        const mag = Math.pow(10, Math.floor(Math.log10(rough)));
        const norm = rough / mag;
        if (norm < 2) return 1 * mag;
        if (norm < 5) return 2 * mag;
        return 5 * mag;
    }
}

// Helper: Generate frequency response points
// magFn(f) should return magnitude (linear, not dB)
function generateResponseCurve(fMin, fMax, magFn, options = {}) {
    const numPoints = options.numPoints || 200;
    const normalize = options.normalize || false;

    const points = [];

    // First pass: collect points and find max if normalizing
    let maxMag = 0;
    for (let i = 0; i <= numPoints; i++) {
        const logF = Math.log10(fMin) + (Math.log10(fMax) - Math.log10(fMin)) * i / numPoints;
        const f = Math.pow(10, logF);
        const mag = magFn(f);
        points.push({ f, mag });
        if (mag > maxMag) maxMag = mag;
    }

    // Normalize if requested
    const normFactor = (normalize && maxMag > 0) ? maxMag : 1;

    // Convert to dB
    return points.map(p => ({
        x: p.f,
        y: 20 * Math.log10(p.mag / normFactor)
    }));
}
