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


// ============ Waveform Graph ============
// For time-domain waveforms with auto-scaling

class WaveformGraph {
    constructor(options = {}) {
        this.width = options.width || 500;
        this.height = options.height || 200;
        this.margin = options.margin || { top: 30, right: 20, bottom: 30, left: 50 };
        this.plotW = this.width - this.margin.left - this.margin.right;
        this.plotH = this.height - this.margin.top - this.margin.bottom;

        this.xLabel = options.xLabel || '';
        this.yLabel = options.yLabel || '';
        this.yUnit = options.yUnit || 'V';

        this.curves = [];
        this.hLines = [];
        this.legendItems = [];
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
            this.legendItems.push({
                label: options.label,
                color: options.color || '#2266cc',
                dashed: options.dashed || false
            });
        }
        return this;
    }

    // Add horizontal reference line
    addHLine(y, options = {}) {
        this.hLines.push({
            y,
            color: options.color || '#c66',
            label: options.label || null,
            dashed: options.dashed !== false
        });
        return this;
    }

    // Auto-scale and generate SVG
    toSVG() {
        // Calculate ranges from data
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;

        for (const curve of this.curves) {
            for (const pt of curve.points) {
                xMin = Math.min(xMin, pt.x);
                xMax = Math.max(xMax, pt.x);
                yMin = Math.min(yMin, pt.y);
                yMax = Math.max(yMax, pt.y);
            }
        }

        // Include hLines in y range
        for (const line of this.hLines) {
            yMin = Math.min(yMin, line.y);
            yMax = Math.max(yMax, line.y);
        }

        // Symmetric y-axis for waveforms (centered on zero)
        const yAbs = Math.max(Math.abs(yMin), Math.abs(yMax)) * 1.1;
        yMin = -yAbs;
        yMax = yAbs;

        // Scale functions
        const xScale = (v) => this.margin.left + this.plotW * (v - xMin) / (xMax - xMin);
        const yScale = (v) => this.margin.top + this.plotH * (yMax - v) / (yMax - yMin);

        let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; max-width: ${this.width}px; height: auto; font-family: monospace; font-size: 11px;">`;

        // Background
        svg += `<rect x="${this.margin.left}" y="${this.margin.top}" width="${this.plotW}" height="${this.plotH}" fill="#fafafa" stroke="#ccc"/>`;

        // Zero line
        const zeroY = yScale(0);
        svg += `<line x1="${this.margin.left}" y1="${zeroY}" x2="${this.margin.left + this.plotW}" y2="${zeroY}" stroke="#aaa" stroke-width="1"/>`;

        // Horizontal reference lines
        for (const line of this.hLines) {
            const yPos = yScale(line.y);
            const dash = line.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${this.margin.left}" y1="${yPos}" x2="${this.margin.left + this.plotW}" y2="${yPos}" stroke="${line.color}" stroke-width="1"${dash}/>`;
            if (line.label) {
                svg += `<text x="${this.margin.left + this.plotW + 3}" y="${yPos + 4}" fill="${line.color}" font-size="9">${line.label}</text>`;
            }
        }

        // Curves
        for (const curve of this.curves) {
            if (curve.points.length === 0) continue;
            const dash = curve.dashed ? ' stroke-dasharray="4,2"' : '';
            let pathD = `M ${xScale(curve.points[0].x)} ${yScale(curve.points[0].y)}`;
            for (let i = 1; i < curve.points.length; i++) {
                pathD += ` L ${xScale(curve.points[i].x)} ${yScale(curve.points[i].y)}`;
            }
            svg += `<path d="${pathD}" fill="none" stroke="${curve.color}" stroke-width="${curve.width}"${dash}/>`;
        }

        // Y-axis labels
        svg += `<text x="${this.margin.left - 5}" y="${this.margin.top + 5}" text-anchor="end">+${yMax.toFixed(2)}${this.yUnit}</text>`;
        svg += `<text x="${this.margin.left - 5}" y="${zeroY + 4}" text-anchor="end">0</text>`;
        svg += `<text x="${this.margin.left - 5}" y="${this.margin.top + this.plotH}" text-anchor="end">${yMin.toFixed(2)}${this.yUnit}</text>`;

        // X-axis label
        if (this.xLabel) {
            svg += `<text x="${this.margin.left + this.plotW / 2}" y="${this.height - 5}" text-anchor="middle">${this.xLabel}</text>`;
        }

        // Legend
        let legendX = this.margin.left + 10;
        for (const item of this.legendItems) {
            const dash = item.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${legendX}" y1="${this.margin.top - 15}" x2="${legendX + 20}" y2="${this.margin.top - 15}" stroke="${item.color}" stroke-width="2"${dash}/>`;
            svg += `<text x="${legendX + 25}" y="${this.margin.top - 11}">${item.label}</text>`;
            legendX += 30 + item.label.length * 6;
        }

        svg += '</svg>';
        return svg;
    }
}


// ============ Transfer Curve Graph ============
// For Vin vs Vout transfer characteristics

class TransferGraph {
    constructor(options = {}) {
        this.width = options.width || 400;
        this.height = options.height || 300;
        this.margin = options.margin || { top: 20, right: 20, bottom: 40, left: 50 };
        this.plotW = this.width - this.margin.left - this.margin.right;
        this.plotH = this.height - this.margin.top - this.margin.bottom;

        this.xLabel = options.xLabel || 'Vin';
        this.yLabel = options.yLabel || 'Vout';

        this.curves = [];
        this.legendItems = [];
    }

    addCurve(points, options = {}) {
        this.curves.push({
            points,
            color: options.color || '#c33',
            width: options.width || 2,
            dashed: options.dashed || false,
            label: options.label || null
        });
        if (options.label) {
            this.legendItems.push({
                label: options.label,
                color: options.color || '#c33',
                dashed: options.dashed || false
            });
        }
        return this;
    }

    // Add unity gain reference line
    addUnityLine() {
        this._unityLine = true;
        this.legendItems.push({ label: 'Linear', color: '#aaa', dashed: true });
        return this;
    }

    toSVG() {
        // Calculate ranges from data (symmetric around zero, but independent for x and y)
        let xMaxAbs = 0, yMaxAbs = 0;
        for (const curve of this.curves) {
            for (const pt of curve.points) {
                xMaxAbs = Math.max(xMaxAbs, Math.abs(pt.x));
                yMaxAbs = Math.max(yMaxAbs, Math.abs(pt.y));
            }
        }
        xMaxAbs *= 1.1;
        yMaxAbs *= 1.1;

        const xMin = -xMaxAbs, xMax = xMaxAbs;
        const yMin = -yMaxAbs, yMax = yMaxAbs;

        const xScale = (v) => this.margin.left + this.plotW * (v - xMin) / (xMax - xMin);
        const yScale = (v) => this.margin.top + this.plotH * (yMax - v) / (yMax - yMin);

        let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; max-width: ${this.width}px; height: auto; font-family: monospace; font-size: 11px;">`;

        // Background
        svg += `<rect x="${this.margin.left}" y="${this.margin.top}" width="${this.plotW}" height="${this.plotH}" fill="#fafafa" stroke="#ccc"/>`;

        // Grid
        const centerX = xScale(0);
        const centerY = yScale(0);
        svg += `<line x1="${this.margin.left}" y1="${centerY}" x2="${this.margin.left + this.plotW}" y2="${centerY}" stroke="#999"/>`;
        svg += `<line x1="${centerX}" y1="${this.margin.top}" x2="${centerX}" y2="${this.margin.top + this.plotH}" stroke="#999"/>`;

        // Linear reference line (corner to corner, representing linear gain)
        if (this._unityLine) {
            svg += `<line x1="${xScale(xMin)}" y1="${yScale(yMin)}" x2="${xScale(xMax)}" y2="${yScale(yMax)}" stroke="#aaa" stroke-dasharray="4,2"/>`;
        }

        // Curves
        for (const curve of this.curves) {
            if (curve.points.length === 0) continue;
            const dash = curve.dashed ? ' stroke-dasharray="4,2"' : '';
            let pathD = `M ${xScale(curve.points[0].x)} ${yScale(curve.points[0].y)}`;
            for (let i = 1; i < curve.points.length; i++) {
                const yVal = Math.max(yMin, Math.min(yMax, curve.points[i].y));
                pathD += ` L ${xScale(curve.points[i].x)} ${yScale(yVal)}`;
            }
            svg += `<path d="${pathD}" fill="none" stroke="${curve.color}" stroke-width="${curve.width}"${dash}/>`;
        }

        // Axis labels
        svg += `<text x="${this.margin.left - 5}" y="${this.margin.top + 5}" text-anchor="end">+${yMax.toFixed(1)}V</text>`;
        svg += `<text x="${this.margin.left - 5}" y="${centerY + 4}" text-anchor="end">0</text>`;
        svg += `<text x="${this.margin.left - 5}" y="${this.margin.top + this.plotH}" text-anchor="end">${yMin.toFixed(1)}V</text>`;

        svg += `<text x="${this.margin.left}" y="${this.margin.top + this.plotH + 15}">${xMin.toFixed(1)}V</text>`;
        svg += `<text x="${centerX}" y="${this.margin.top + this.plotH + 15}" text-anchor="middle">${this.xLabel}</text>`;
        svg += `<text x="${this.margin.left + this.plotW}" y="${this.margin.top + this.plotH + 15}" text-anchor="end">+${xMax.toFixed(1)}V</text>`;

        svg += `<text x="${this.margin.left + 5}" y="${this.margin.top + 15}">${this.yLabel}</text>`;

        // Legend
        let legendX = this.margin.left + this.plotW - 100;
        let legendY = this.margin.top + 10;
        for (const item of this.legendItems) {
            const dash = item.dashed ? ' stroke-dasharray="4,2"' : '';
            svg += `<line x1="${legendX}" y1="${legendY}" x2="${legendX + 20}" y2="${legendY}" stroke="${item.color}" stroke-width="2"${dash}/>`;
            svg += `<text x="${legendX + 25}" y="${legendY + 4}">${item.label}</text>`;
            legendY += 15;
        }

        svg += '</svg>';
        return svg;
    }
}


// ============ Bar Graph ============
// For harmonic spectrum display

class BarGraph {
    constructor(options = {}) {
        this.width = options.width || 500;
        this.height = options.height || 250;
        this.margin = options.margin || { top: 20, right: 20, bottom: 40, left: 50 };
        this.plotW = this.width - this.margin.left - this.margin.right;
        this.plotH = this.height - this.margin.top - this.margin.bottom;

        this.yMin = options.yMin || -60;
        this.yMax = options.yMax || 0;
        this.xLabel = options.xLabel || '';
        this.yLabel = options.yLabel || 'dB';

        this.bars = [];
        this.legendItems = [];
    }

    // Add a bar: { x (label), y (value), color }
    addBar(x, y, options = {}) {
        this.bars.push({
            x,
            y,
            color: options.color || '#2266cc',
            label: options.label || null
        });
        return this;
    }

    // Add legend item
    addLegend(label, color) {
        this.legendItems.push({ label, color });
        return this;
    }

    toSVG() {
        const yScale = (v) => this.margin.top + this.plotH * (this.yMax - v) / (this.yMax - this.yMin);
        const barWidth = this.plotW / this.bars.length - 4;

        let svg = `<svg viewBox="0 0 ${this.width} ${this.height}" preserveAspectRatio="xMidYMid meet" style="width: 100%; max-width: ${this.width}px; height: auto; font-family: monospace; font-size: 11px;">`;

        // Background
        svg += `<rect x="${this.margin.left}" y="${this.margin.top}" width="${this.plotW}" height="${this.plotH}" fill="#fafafa" stroke="#ccc"/>`;

        // Grid lines
        const yStep = 10;
        for (let y = this.yMax; y >= this.yMin; y -= yStep) {
            const yPos = yScale(y);
            svg += `<line x1="${this.margin.left}" y1="${yPos}" x2="${this.margin.left + this.plotW}" y2="${yPos}" stroke="#ddd"/>`;
            svg += `<text x="${this.margin.left - 5}" y="${yPos + 4}" text-anchor="end">${y}</text>`;
        }

        // Bars
        this.bars.forEach((bar, i) => {
            const x = this.margin.left + (i + 0.5) * (this.plotW / this.bars.length) - barWidth / 2;
            const clampedY = Math.max(this.yMin, Math.min(this.yMax, bar.y));
            const barH = (this.yMax - clampedY) / (this.yMax - this.yMin) * this.plotH;

            svg += `<rect x="${x}" y="${this.margin.top}" width="${barWidth}" height="${barH}" fill="${bar.color}" opacity="0.8"/>`;

            // X label
            svg += `<text x="${x + barWidth/2}" y="${this.margin.top + this.plotH + 15}" text-anchor="middle">${bar.x}</text>`;

            // Value label on bar (if visible)
            if (bar.y > this.yMin + 5) {
                svg += `<text x="${x + barWidth/2}" y="${this.margin.top + barH - 5}" text-anchor="middle" font-size="9">${bar.y.toFixed(1)}</text>`;
            }
        });

        // Y-axis label
        svg += `<text x="${this.margin.left - 35}" y="${this.margin.top + this.plotH/2}" text-anchor="middle" transform="rotate(-90 ${this.margin.left - 35} ${this.margin.top + this.plotH/2})">${this.yLabel}</text>`;

        // X-axis label
        if (this.xLabel) {
            svg += `<text x="${this.margin.left + this.plotW/2}" y="${this.height - 5}" text-anchor="middle">${this.xLabel}</text>`;
        }

        // Legend
        let legendX = this.margin.left + this.plotW - 10;
        for (let i = this.legendItems.length - 1; i >= 0; i--) {
            const item = this.legendItems[i];
            const textW = item.label.length * 6;
            legendX -= textW + 20;
            svg += `<rect x="${legendX}" y="${this.margin.top + 5}" width="12" height="12" fill="${item.color}" opacity="0.8"/>`;
            svg += `<text x="${legendX + 15}" y="${this.margin.top + 15}">${item.label}</text>`;
        }

        svg += '</svg>';
        return svg;
    }
}
