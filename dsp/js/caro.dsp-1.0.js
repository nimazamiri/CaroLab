/* =========================================================
 *  CaroLab - DSP Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

class Signal {
    // =========================================================
    //  Construction
    // =========================================================
    constructor(data = [], sampleRate = 1) {
        if (!Array.isArray(data)) {
            throw new Error('Signal data must be an array');
        }
        if (!data.every(v => typeof v === 'number' && Number.isFinite(v))) {
            throw new Error('Signal data must contain only finite numbers');
        }
        if (typeof sampleRate !== 'number' || !(sampleRate > 0)) {
            throw new Error('sampleRate must be a positive number');
        }
        this.data = [...data];
        this.length = this.data.length;
        this.sampleRate = sampleRate;
    }

    // =========================================================
    //  Static factories — the "signal sources"
    // =========================================================

    // dsp.txt: sineWave(f, phi, sampleRate, N, amplitude)
    static sineWave(f, phi, sampleRate, N, amplitude = 1) {
        if (!(sampleRate > 0)) throw new Error('sampleRate must be > 0');
        if (!Number.isInteger(N) || N < 1) throw new Error('N must be a positive integer');
        const x = new Array(N);
        for (let n = 0; n < N; n++) {
            const t = n / sampleRate;
            x[n] = Math.round(amplitude * Math.sin(2 * Math.PI * f * t + phi) * 1000) / 1000;
        }
        return new Signal(x, sampleRate);
    }

    // Convenience: zero signal
    static zeros(N, sampleRate = 1) {
        if (!Number.isInteger(N) || N < 1) throw new Error('N must be a positive integer');
        return new Signal(new Array(N).fill(0), sampleRate);
    }

    // Convenience: from a plain array + sampleRate
    static from(array, sampleRate = 1) {
        return new Signal(array, sampleRate);
    }

    static of(...values) {
        return new Signal(values);
    }

    // Iterator — lets you `for (const v of signal)` and spread
    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }

    // =========================================================
    //  Access
    // =========================================================
    get(i)      { return this.data[i]; }
    slice(a, b) { return new Signal(this.data.slice(a, b), this.sampleRate); }
    clone()     { return new Signal(this.data, this.sampleRate); }
    toArray()   { return [...this.data]; }

    // Time axis in seconds (or 1/sampleRate units)
    timeAxis() {
        return Array.from({ length: this.length }, (_, n) => n / this.sampleRate);
    }

    // =========================================================
    //  Internal guards
    // =========================================================
    _requireNonEmpty() {
        if (this.length === 0) throw new Error('Signal is empty');
    }

    _requireSameLength(other) {
        if (!(other instanceof Signal)) {
            throw new Error('Expected a Signal instance');
        }
        if (this.length !== other.length || this.length === 0) {
            throw new Error('Signals must have the same non-zero length');
        }
    }

    // =========================================================
    //  dsp.txt: sigAdd / sigSub
    //  Instance form:  a.add(b)  ≡  sigAdd(a.data, b.data)
    //  Static form:    Signal.add(a, b)  (mirrors the free function)
    // =========================================================
    add(other) {
        this._requireSameLength(other);
        const out = new Array(this.length);
        for (let i = 0; i < this.length; i++) out[i] = this.data[i] + other.data[i];
        return new Signal(out, this.sampleRate);
    }

    subtract(other) {
        this._requireSameLength(other);
        const out = new Array(this.length);
        for (let i = 0; i < this.length; i++) out[i] = this.data[i] - other.data[i];
        return new Signal(out, this.sampleRate);
    }

    static add(a, b)      { return a.add(b); }
    static subtract(a, b) { return a.subtract(b); }

    // Scalar helpers — natural companions, not in dsp.txt
    scale(k) {
        return new Signal(this.data.map(v => v * k), this.sampleRate);
    }

    // =========================================================
    //  dsp.txt: movingAverage_dsp
    //  Symmetric (centered), edge-handled, length-preserving.
    //  Note: this is the *centered* MA — distinct from Sample.movingAverage,
    //  which is causal and valid-only. Here we keep the original semantics.
    // =========================================================
    movingAverageCentered(windowSize) {
        this._requireNonEmpty();
        if (!Number.isInteger(windowSize) || windowSize < 1) {
            throw new Error('windowSize must be a positive integer');
        }
        const y = new Array(this.length);
        const half = Math.floor(windowSize / 2);

        for (let i = 0; i < this.length; i++) {
            let sum = 0;
            let count = 0;
            for (let j = i - half; j <= i + half; j++) {
                if (j >= 0 && j < this.length) {
                    sum += this.data[j];
                    count++;
                }
            }
            y[i] = Math.round((sum / count) * 1000) / 1000;
        }
        return new Signal(y, this.sampleRate);
    }

    // =========================================================
    //  dsp.txt: peaks  (no distance/height constraints; smooths first)
    //  Returns plain array of { index, value } — a function of position,
    //  not a waveform, so it's not a Signal.
    // =========================================================
    peaks(windowSize = 5) {
        const smooth = this.movingAverageCentered(windowSize).data;
        const p = [];
        for (let i = 1; i < smooth.length - 1; i++) {
            if (smooth[i] > smooth[i - 1] && smooth[i] >= smooth[i + 1]) {
                p.push({ index: i, value: smooth[i] });
            }
        }
        return p;
    }

    // =========================================================
    //  dsp.txt: findPeaks  (with minDistance / minHeight)
    //  Adds `t` (seconds) to each peak.
    // =========================================================
    findPeaks({
        smoothWindow = 11,
        minDistance  = 0.05,
        minHeight    = -Infinity
    } = {}) {
        const smooth = this.movingAverageCentered(smoothWindow).data;
        const peaks  = [];
        const minSamples = Math.round(minDistance * this.sampleRate);

        for (let i = 1; i < smooth.length - 1; i++) {
            if (smooth[i] > smooth[i - 1] &&
                smooth[i] >= smooth[i + 1] &&
                smooth[i] >= minHeight) {

                if (peaks.length === 0 ||
                    i - peaks[peaks.length - 1].index >= minSamples) {

                    peaks.push({
                        index: i,
                        t: i / this.sampleRate,
                        value: smooth[i]
                    });
                }
            }
        }
        return peaks;
    }

    // =========================================================
    //  dsp.txt: peak2peak
    //  Inter-peak time deltas, in seconds.
    // =========================================================
    static peak2peak(peaks) {
        const delta = [];
        for (let i = 1; i < peaks.length; i++) {
            delta.push(peaks[i].t - peaks[i - 1].t);
        }
        return delta;
    }

    // =========================================================
    //  dsp.txt: frequencyFromPeaks
    //  Estimates fundamental frequency from mean inter-peak period.
    // =========================================================
    static frequencyFromPeaks(peaks) {
        if (peaks.length < 2) return NaN;
        let sum = 0;
        for (let i = 1; i < peaks.length; i++) {
            sum += peaks[i].t - peaks[i - 1].t;
        }
        const meanPeriod = sum / (peaks.length - 1);
        return 1 / meanPeriod;
    }

    // =========================================================
    //  dsp.txt: fft
    //  Radix-2 Cooley–Tukey. Returns { re, im, mag, phase } (typed arrays).
    //  Length must be a power of two.
    // =========================================================
    fft() {
        this._requireNonEmpty();
        const N = this.length;
        if ((N & (N - 1)) !== 0) {
            throw new Error('FFT length must be a power of two');
        }

        const re = new Float64Array(this.data);
        const im = new Float64Array(N);

        // Bit-reversal permutation
        for (let i = 1, j = 0; i < N; i++) {
            let bit = N >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [re[i], re[j]] = [re[j], re[i]];
                [im[i], im[j]] = [im[j], im[i]];
            }
        }

        // Butterflies
        for (let len = 2; len <= N; len <<= 1) {
            const ang = (-2 * Math.PI) / len;
            const wRe = Math.cos(ang);
            const wIm = Math.sin(ang);
            for (let i = 0; i < N; i += len) {
                let curRe = 1, curIm = 0;
                for (let k = 0; k < len / 2; k++) {
                    const uRe = re[i + k], uIm = im[i + k];
                    const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
                    const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;

                    re[i + k]             = uRe + vRe;
                    im[i + k]             = uIm + vIm;
                    re[i + k + len / 2]   = uRe - vRe;
                    im[i + k + len / 2]   = uIm - vIm;

                    const nextRe = curRe * wRe - curIm * wIm;
                    const nextIm = curRe * wIm + curIm * wRe;
                    curRe = nextRe;
                    curIm = nextIm;
                }
            }
        }

        const mag   = new Float64Array(N);
        const phase = new Float64Array(N);
        for (let i = 0; i < N; i++) {
            mag[i]   = Math.hypot(re[i], im[i]);
            phase[i] = Math.atan2(im[i], re[i]);
        }

        return { re, im, mag, phase };
    }

    // =========================================================
    //  dsp.txt: dominantFrequency
    //  Highest-magnitude positive-frequency bin.
    // =========================================================
    dominantFrequency() {
        const { mag } = this.fft();
        const N = this.length;
        let maxMag = 0, maxIndex = 0;
        for (let k = 1; k <= N / 2; k++) {
            if (mag[k] > maxMag) {
                maxMag = mag[k];
                maxIndex = k;
            }
        }
        return maxIndex * this.sampleRate / N;
    }

    // One-sided amplitude spectrum — pairs with dominantFrequency nicely
    spectrum() {
        const { mag } = this.fft();
        const N = this.length;
        const half = N / 2;
        const freqs = new Array(half + 1);
        const amps  = new Array(half + 1);
        for (let k = 0; k <= half; k++) {
            freqs[k] = k * this.sampleRate / N;
            const scale = (k === 0 || k === half) ? 1 : 2;
            amps[k] = scale * mag[k] / N;
        }
        return { freqs, amps };
    }

    // =========================================================
    //  dsp.txt: butterworthFilter
    //  type: 'lowpass' | 'highpass' | 'bandpass'
    //  Zero-phase by default (forward–reverse).
    //  Returns a new Signal of the same length and sampleRate.
    // =========================================================
    butterworth({
        type = 'lowpass',
        cutoff,
        lowCutoff,
        highCutoff,
        order = 4,
        zeroPhase = true
    } = {}) {
        this._requireNonEmpty();
        if (order < 1 || !Number.isInteger(order)) {
            throw new Error('order must be a positive integer');
        }
        if (type === 'bandpass') {
            if (!(lowCutoff < highCutoff)) {
                throw new Error('lowCutoff must be < highCutoff');
            }
        } else {
            if (!(cutoff > 0)) throw new Error('cutoff must be > 0');
        }

        const sections = this._designButterworthSections({
            type, cutoff, lowCutoff, highCutoff, order
        });

        const filterForward = (arr) => {
            let y = arr;
            for (const sec of sections) y = Signal._applyBiquad(y, sec);
            return y;
        };

        let y = filterForward(this.data);
        if (zeroPhase) {
            y = filterForward([...y].reverse()).reverse();
        }
        return new Signal(y, this.sampleRate);
    }

    // --- Butterworth internals ---

    _designButterworthSections({ type, cutoff, lowCutoff, highCutoff, order }) {
        const sr = this.sampleRate;
        const sections = [];

        if (type === 'lowpass' || type === 'highpass') {
            const nSec = Math.floor(order / 2);
            for (let k = 1; k <= nSec; k++) {
                const Q = Signal._butterworthQ(k, order);
                sections.push(Signal._designBiquad(type, cutoff, Q, sr));
            }
        } else if (type === 'bandpass') {
            const center = Math.sqrt(lowCutoff * highCutoff);
            const bandwidth = highCutoff - lowCutoff;
            const nSec = order;
            for (let k = 1; k <= nSec; k++) {
                const Qb = Signal._butterworthQ(k, order);
                const Q = center / bandwidth * Qb;
                sections.push(Signal._designBiquad('lowpass', center, Q, sr));
            }
        } else {
            throw new Error('type must be lowpass, highpass, or bandpass');
        }
        return sections;
    }

    static _butterworthQ(k, n) {
        return 1 / (2 * Math.cos(Math.PI * (2 * k - 1) / (2 * n)));
    }

    static _designBiquad(type, f1, Q, sampleRate) {
        const w1 = 2 * Math.PI * f1 / sampleRate;
        const cosw = Math.cos(w1);
        const sinw = Math.sin(w1);
        const alpha = sinw / (2 * Q);

        let b0, b1, b2, a0, a1, a2;
        if (type === 'lowpass') {
            b0 = (1 - cosw) / 2;
            b1 =  1 - cosw;
            b2 = (1 - cosw) / 2;
            a0 = 1 + alpha;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
        } else if (type === 'highpass') {
            b0 =  (1 + cosw) / 2;
            b1 = -(1 + cosw);
            b2 =  (1 + cosw) / 2;
            a0 = 1 + alpha;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
        } else {
            throw new Error('Unknown filter type');
        }
        return {
            b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
            a1: a1 / a0, a2: a2 / a0
        };
    }

    static _applyBiquad(x, c) {
        const y = new Array(x.length);
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (let i = 0; i < x.length; i++) {
            const x0 = x[i];
            const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
            y[i] = y0;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
        }
        return y;
    }

    // =========================================================
    //  dsp.txt: hammingWindow
    //  Windowed copy of the signal (same length).
    // =========================================================
    hammingWindow() {
        this._requireNonEmpty();
        const N = this.length;
        const y = new Array(N);
        for (let n = 0; n < N; n++) {
            const w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
            y[n] = this.data[n] * w;
        }
        return new Signal(y, this.sampleRate);
    }

    // Static windowing helper — returns just the window coefficients
    static hamming(N) {
        if (!Number.isInteger(N) || N < 2) throw new Error('N must be an integer ≥ 2');
        const w = new Array(N);
        for (let n = 0; n < N; n++) {
            w[n] = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
        }
        return w;
    }

    // =========================================================
    //  dsp.txt: rms
    // =========================================================
    rms() {
        this._requireNonEmpty();
        let sum = 0;
        for (const v of this.data) sum += v * v;
        return Math.sqrt(sum / this.length);
    }

    // =========================================================
    //  dsp.txt: power
    //  Mean-square (average power) — as in the original.
    // =========================================================
    power() {
        this._requireNonEmpty();
        let sum = 0;
        for (const v of this.data) sum += v * v;
        return sum / this.length;
    }

    // dBFS relative to full scale 1.0 — natural companion
    rmsDb() {
        const r = this.rms();
        return r > 0 ? 20 * Math.log10(r) : -Infinity;
    }

    // =========================================================
    //  Padding helper — useful for FFT on arbitrary lengths
    // =========================================================
    padToPow2() {
        let n = 1;
        while (n < this.length) n <<= 1;
        if (n === this.length) return this.clone();
        return new Signal(
            [...this.data, ...new Array(n - this.length).fill(0)],
            this.sampleRate
        );
    }

    // =========================================================
    //  Display
    // =========================================================
    toString(precision = 4) {
        return '[' + this.data.map(v => v.toFixed(precision)).join(', ') + ']';
    }

    info() {
        return {
            length: this.length,
            sampleRate: this.sampleRate,
            duration: this.length / this.sampleRate,
            rms: this.length ? this.rms() : null,
            peak: this.length ? Math.max(...this.data.map(Math.abs)) : null
        };
    }
}

module.exports = Signal;