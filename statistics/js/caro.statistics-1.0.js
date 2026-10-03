class Sample {
        // ===== Construction =====
    constructor(data = []) {
        if (!Array.isArray(data)) {
            throw new Error('Sample data must be an array');
        }
        if (!data.every(v => typeof v === 'number' && Number.isFinite(v))) {
            throw new Error('Sample data must contain only finite numbers');
        }
        this.data = [...data];
        this.length = this.data.length;
    }

    static of(...values) {
        return new Sample(values);
    }

    [Symbol.iterator]() {
        return this.data[Symbol.iterator]();
    }

    // ===== Access =====
    get(i)      { return this.data[i]; }
    slice(a, b) { return new Sample(this.data.slice(a, b)); }
    clone()     { return new Sample(this.data); }
    toArray()   { return [...this.data]; }

    // ===== Internal guards =====
    _requireNonEmpty() {
        if (this.length === 0) throw new Error('Sample is empty');
    }

    _requireSameLength(other) {
        if (!(other instanceof Sample)) throw new Error('Expected a Sample');
        if (this.length !== other.length || this.length === 0) {
            throw new Error('Samples must have the same non-zero length');
        }
    }

    // ===== statistics.txt: min, max =====
    min() { this._requireNonEmpty(); return Math.min(...this.data); }
    max() { this._requireNonEmpty(); return Math.max(...this.data); }

    // ===== statistics.txt: mean =====
    mean() {
        this._requireNonEmpty();
        return this.data.reduce((s, v) => s + v, 0) / this.length;
    }

    // Sum is not in statistics.txt but is a natural addition
    sum() {
        this._requireNonEmpty();
        return this.data.reduce((s, v) => s + v, 0);
    }

    // ===== statistics.txt: var_p, var_s =====
    var_p() {
        this._requireNonEmpty();
        const m = this.mean();
        return this.data.reduce((s, v) => s + (v - m) ** 2, 0) / this.length;
    }

    var_s() {
        this._requireNonEmpty();
        if (this.length < 2) throw new Error('Sample variance requires n ≥ 2');
        const m = this.mean();
        return this.data.reduce((s, v) => s + (v - m) ** 2, 0) / (this.length - 1);
    }

    // ===== statistics.txt: std_p, std_s =====
    std_p() { return Math.sqrt(this.var_p()); }
    std_s() { return Math.sqrt(this.var_s()); }

    // Modern aliases (numpy-style)
    variance(ddof = 0) { return ddof === 0 ? this.var_p() : this.var_s(); }
    std(ddof = 0)      { return ddof === 0 ? this.std_p() : this.std_s(); }

    // ===== statistics.txt: median =====
    median() {
        this._requireNonEmpty();
        const sorted = [...this.data].sort((a, b) => a - b);
        const n = sorted.length;
        const mid = Math.floor(n / 2);
        if (n % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
        return sorted[mid];
    }

    // ===== statistics.txt: covariance =====
    // Original signature: covariance(x, y) — population (divide by n)
    covariance(other, ddof = 0) {
        this._requireSameLength(other);
        const mx = this.mean();
        const my = other.mean();
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += (this.data[i] - mx) * (other.data[i] - my);
        }
        return sum / (this.length - ddof);
    }

    // ===== statistics.txt: correlation =====
    correlation(other) {
        this._requireSameLength(other);
        const cov = this.covariance(other, 0);
        const sx = this.std_p();
        const sy = other.std_p();
        if (sx === 0 || sy === 0) {
            throw new Error('Correlation undefined for zero-variance Sample');
        }
        return cov / (sx * sy);
    }

    // ===== statistics.txt: movingAverage =====
    // Original: returns array of length n − window + 1
    movingAverage(window) {
        this._requireNonEmpty();
        if (window <= 0 || window > this.length) {
            throw new Error('Invalid window size');
        }
        const out = [];
        for (let i = 0; i <= this.length - window; i++) {
            let sum = 0;
            for (let j = 0; j < window; j++) sum += this.data[i + j];
            out.push(sum / window);
        }
        return new Sample(out);
    }

    // ===== statistics.txt: movingAverage_ =====
    // Original: length-preserving, null in warm-up region.
    // PROBLEM: Sample rejects nulls. Two options below.
    //
    // Option A (default): return a plain array, exactly like the original.
    movingAverageRaw(window) {
        this._requireNonEmpty();
        if (window <= 0 || window > this.length) {
            throw new Error('Invalid window size');
        }
        const result = new Array(this.length).fill(null);
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += this.data[i];
            if (i >= window) sum -= this.data[i - window];
            if (i >= window - 1) result[i] = sum / window;
        }
        return result;
    }

    // Option B: return a Sample that only contains the valid tail.
    // Length n − window + 1, identical values to movingAverage.
    // This is what most users want when chaining.
    movingAverageCausal(window) {
        this._requireNonEmpty();
        if (window <= 0 || window > this.length) {
            throw new Error('Invalid window size');
        }
        const out = [];
        let sum = 0;
        for (let i = 0; i < this.length; i++) {
            sum += this.data[i];
            if (i >= window) sum -= this.data[i - window];
            if (i >= window - 1) out.push(sum / window);
        }
        return new Sample(out);
    }

    // ===== statistics.txt: exponentialMovingAverage =====
    exponentialMovingAverage(alpha) {
        this._requireNonEmpty();
        if (alpha <= 0 || alpha > 1) {
            throw new Error('Alpha must be in (0, 1]');
        }
        const out = new Array(this.length);
        out[0] = this.data[0];
        for (let i = 1; i < this.length; i++) {
            out[i] = alpha * this.data[i] + (1 - alpha) * out[i - 1];
        }
        return new Sample(out);
    }

    // ===== statistics.txt: autocorrelation =====
    autocorrelation(lag = 1) {
        this._requireNonEmpty();
        if (lag < 0 || lag >= this.length) {
            throw new Error('Invalid lag');
        }
        const x1 = new Sample(this.data.slice(lag));
        const x2 = new Sample(this.data.slice(0, this.length - lag));
        return x1.correlation(x2);
    }

    // ===== statistics.txt: acf =====
    // Original returns a plain array. Keep that.
    acf(maxLag) {
        this._requireNonEmpty();
        if (maxLag < 0 || maxLag >= this.length) {
            throw new Error('Invalid maxLag');
        }
        const out = [];
        for (let lag = 0; lag <= maxLag; lag++) {
            out.push(this.autocorrelation(lag));
        }
        return out;
    }

    // ===== Display =====
    toString(precision = 4) {
        return '[' + this.data.map(v => v.toFixed(precision)).join(', ') + ']';
    }

    // ===== QUANTILE / PERCENTILE =====
    // Linear interpolation between order statistics (matches NumPy default).
    quantile(q) {
        this._requireNonEmpty();
        if (q < 0 || q > 1) {
            throw new Error('q must be in [0, 1]');
        }
        const sorted = [...this.data].sort((a, b) => a - b);
        const n = sorted.length;

        if (n === 1) return sorted[0];

        const pos = q * (n - 1);
        const lo = Math.floor(pos);
        const hi = Math.ceil(pos);
        const frac = pos - lo;

        return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
    }

    percentile(p) {
        if (p < 0 || p > 100) throw new Error('p must be in [0, 100]');
        return this.quantile(p / 100);
    }

    // IQR — a robust spread measure, useful for outlier detection
    iqr() {
        return this.quantile(0.75) - this.quantile(0.25);
    }

    // ===== NORMALIZE / Z-SCORE =====
    // Returns (x - μ) / σ. With ddof = 1 (sample), this is the z-score.
    normalize(ddof = 0) {
        this._requireNonEmpty();
        const m = this.mean();
        const s = this.std(ddof);
        if (s === 0) {
            throw new Error('Cannot normalize a zero-variance Sample');
        }
        return new Sample(this.data.map(v => (v - m) / s));
    }

    zScore() {
        return this.normalize(1);   // sample std is conventional for z-scores
    }

    // Min–max scaling to [0, 1] (or any [lo, hi])
    rescale(lo = 0, hi = 1) {
        this._requireNonEmpty();
        const mn = this.min();
        const mx = this.max();
        if (mx === mn) {
            throw new Error('Cannot rescale a constant Sample');
        }
        const span = mx - mn;
        return new Sample(this.data.map(v => lo + (v - mn) / span * (hi - lo)));
    }

    // ===== DETREND =====
    // Removes a polynomial trend of the given order (0 = mean, 1 = linear, 2 = quadratic).
    // Uses ordinary least squares on the index t = 0, 1, ..., n-1.
    detrend(order = 1) {
        this._requireNonEmpty();
        if (!Number.isInteger(order) || order < 0) {
            throw new Error('Order must be a non-negative integer');
        }
        const n = this.length;
        if (order >= n) {
            throw new Error('Order must be less than Sample length');
        }

        // Build design matrix Φ (n × (order+1)): columns are t^k
        const p = order + 1;
        const Phi = Array.from({ length: n }, (_, i) =>
            Array.from({ length: p }, (_, k) => Math.pow(i, k))
        );

        // Solve normal equations: (ΦᵀΦ) β = Φᵀ y
        // Build ΦᵀΦ and Φᵀy manually to avoid pulling Matrix into Sample
        const PhiTPhi = Array.from({ length: p }, () => Array(p).fill(0));
        const PhiTy  = Array(p).fill(0);
        for (let i = 0; i < n; i++) {
            for (let a = 0; a < p; a++) {
                PhiTy[a] += Phi[i][a] * this.data[i];
                for (let b = 0; b < p; b++) {
                    PhiTPhi[a][b] += Phi[i][a] * Phi[i][b];
                }
            }
        }

        const beta = Sample._solveSmall(PhiTPhi, PhiTy);

        // Subtract fitted trend
        const out = new Array(n);
        for (let i = 0; i < n; i++) {
            let fit = 0;
            for (let k = 0; k < p; k++) fit += beta[k] * Math.pow(i, k);
            out[i] = this.data[i] - fit;
        }
        return new Sample(out);
    }

    // Gaussian elimination for a small dense system (used by detrend)
    static _solveSmall(A, b, tol = 1e-12) {
        const n = A.length;
        const M = A.map((row, i) => [...row, b[i]]);
        for (let col = 0; col < n; col++) {
            let pivot = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
            }
            if (Math.abs(M[pivot][col]) < tol) {
                throw new Error('Singular system in detrend (try a lower order)');
            }
            [M[col], M[pivot]] = [M[pivot], M[col]];
            const pv = M[col][col];
            for (let c = col; c <= n; c++) M[col][c] /= pv;
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const f = M[r][col];
                for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
            }
        }
        return M.map(row => row[n]);
    }

    // ===== CROSS-CORRELATION =====
    // Returns the (normalized) cross-correlation at lags -maxLag .. +maxLag.
    // Useful for system identification: peak location ≈ delay between Samples.
    crossCorrelation(other, maxLag) {
        this._requireSameLength(other);
        if (maxLag == null) maxLag = this.length - 1;
        if (maxLag < 0 || maxLag >= this.length) {
            throw new Error('Invalid maxLag');
        }

        const n = this.length;
        const mx = this.mean();
        const my = other.mean();

        // Center both Samples
        const x = this.data.map(v => v - mx);
        const y = other.data.map(v => v - my);

        // Denominator: sqrt(Σx² · Σy²) — normalization so ρ(0) ≈ 1 for aligned Samples
        const denom = Math.sqrt(
            x.reduce((s, v) => s + v * v, 0) *
            y.reduce((s, v) => s + v * v, 0)
        );
        if (denom === 0) throw new Error('Cross-correlation undefined for zero-variance Sample');

        const out = [];
        for (let lag = -maxLag; lag <= maxLag; lag++) {
            let sum = 0;
            // y[t] aligned with x[t + lag]  →  sum over overlapping range
            const iStart = Math.max(0, -lag);
            const iEnd   = Math.min(n, n - lag);
            for (let i = iStart; i < iEnd; i++) {
                sum += x[i] * y[i + lag];
            }
            out.push(sum / denom);
        }

        // Convention: index 0 ↔ lag = -maxLag, index maxLag ↔ lag = 0
        return { lags: Sample._range(-maxLag, maxLag), values: out };
    }

    static _range(a, b) {
        const out = [];
        for (let i = a; i <= b; i++) out.push(i);
        return out;
    }

    // ===== FFT =====
    // Radix-2 Cooley–Tukey FFT. Length must be a power of two.
    // Returns { re, mag, phase } arrays of length n.
    // For the real-input case, we still return full complex spectrum (conjugate-symmetric).
    fft() {
        this._requireNonEmpty();
        const n = this.length;
        if ((n & (n - 1)) !== 0) {
            throw new Error('FFT length must be a power of two');
        }

        // Interleave re/im
        const re = [...this.data];
        const im = new Array(n).fill(0);

        // Bit-reversal permutation
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [re[i], re[j]] = [re[j], re[i]];
                [im[i], im[j]] = [im[j], im[i]];
            }
        }

        // Butterflies
        for (let len = 2; len <= n; len <<= 1) {
            const ang = -2 * Math.PI / len;
            const wRe = Math.cos(ang);
            const wIm = Math.sin(ang);
            for (let i = 0; i < n; i += len) {
                let curRe = 1, curIm = 0;
                for (let k = 0; k < len / 2; k++) {
                    const uRe = re[i + k];
                    const uIm = im[i + k];
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

        const mag   = new Array(n);
        const phase = new Array(n);
        for (let i = 0; i < n; i++) {
            mag[i]   = Math.hypot(re[i], im[i]);
            phase[i] = Math.atan2(im[i], re[i]);
        }

        return { re, im, mag, phase };
    }

    // One-sided magnitude spectrum (bin 0 .. n/2) with frequencies in cycles/sample.
    // Matches what you'd get from a spectrum analyzer with real input.
    spectrum(sampleRate = 1) {
        const { mag } = this.fft();
        const n = this.length;
        const half = n / 2;
        const freqs = new Array(half + 1);
        const amps  = new Array(half + 1);
        for (let k = 0; k <= half; k++) {
            freqs[k] = k * sampleRate / n;
            // Double the interior bins to preserve total power
            const scale = (k === 0 || k === half) ? 1 : 2;
            amps[k] = scale * mag[k] / n;
        }
        return { freqs, amps };
    }
	
	
	// =========================================================
    //  SES — simple exponential smoothing (level only, flat forecast)
    // =========================================================
    ses(alpha = 0.3) {
        this._requireNonEmpty();
        if (alpha <= 0 || alpha > 1) throw new Error('alpha must be in (0, 1]');

        const n = this.length;
        const x = [...this.data];   // defensive copy — closure-safe
        let level = x[0];

        const fitted   = new Array(n).fill(null);
        const residual = new Array(n).fill(null);

        for (let i = 1; i < n; i++) {
            fitted[i]   = level;
            residual[i] = x[i] - level;
            level = alpha * x[i] + (1 - alpha) * level;
        }

        const forecast = (k = 1) => {
            Sample._checkHorizon(k);
            return new Array(k).fill(level);   // flat
        };

        return {
            order: 0,
            alpha,
            level,
            fitted,
            residual,
            forecast,
            forecastOne: () => level,
            forecastSample: (k = 1) => new Sample(forecast(k))
        };
    }

    // =========================================================
    //  HOLT — linear exponential smoothing (level + trend)
    // =========================================================
    holt({ alpha = 0.3, beta = 0.1, initialLevel = null, initialTrend = null } = {}) {
        this._requireNonEmpty();
        if (this.length < 2) throw new Error('Holt requires at least 2 samples');
        if (alpha <= 0 || alpha > 1) throw new Error('alpha must be in (0, 1]');
        if (beta  <= 0 || beta  > 1) throw new Error('beta must be in (0, 1]');

        const n = this.length;
        const x = [...this.data];

        let level = initialLevel !== null ? initialLevel : x[0];
        let trend = initialTrend !== null ? initialTrend : (x[1] - x[0]);

        const fitted   = new Array(n).fill(null);
        const residual = new Array(n).fill(null);

        for (let i = 1; i < n; i++) {
            const pred = level + trend;
            fitted[i]   = pred;
            residual[i] = x[i] - pred;

            const prevLevel = level;
            level = alpha * x[i] + (1 - alpha) * (level + trend);
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
        }

        // Capture final level/trend so closure is stable even if object is reused
        const finalLevel = level;
        const finalTrend = trend;

        const forecast = (k = 1) => {
            Sample._checkHorizon(k);
            const out = new Array(k);
            for (let i = 0; i < k; i++) out[i] = finalLevel + (i + 1) * finalTrend;
            return out;
        };

        return {
            order: 1,
            alpha,
            beta,
            level: finalLevel,
            trend: finalTrend,
            fitted,
            residual,
            forecast,
            forecastOne: () => forecast(1)[0],
            forecastSample: (k = 1) => new Sample(forecast(k))
        };
    }

    // =========================================================
    //  AR(p) — Yule–Walker autoregression
    // =========================================================
    ar(p = 1) {
        this._requireNonEmpty();
        if (!Number.isInteger(p) || p < 1) throw new Error('p must be a positive integer');
        if (p >= this.length) throw new Error('p must be less than Sample length');

        const n = this.length;
        const x = [...this.data];          // defensive copy
        const mu = this.mean();

        // Center
        const xc = x.map(v => v - mu);

        // Biased autocorrelation r[0..p]
        const r = new Array(p + 1).fill(0);
        for (let k = 0; k <= p; k++) {
            let s = 0;
            for (let i = 0; i < n - k; i++) s += xc[i] * xc[i + k];
            r[k] = s / n;
        }
        if (r[0] === 0) throw new Error('Sample has zero variance');

        // Yule–Walker: R·φ = r[1..p],  R[i][j] = r[|i−j|]
        const R = Array.from({ length: p }, (_, i) =>
            Array.from({ length: p }, (_, j) => r[Math.abs(i - j)])
        );
        const phi = Sample._solveSmall(R, r.slice(1));

        // Intercept so E[x] = μ
        const sumPhi = phi.reduce((s, v) => s + v, 0);
        const intercept = mu * (1 - sumPhi);

        // Fitted / residuals
        const fitted   = new Array(n).fill(null);
        const residual = new Array(n).fill(null);
        for (let t = p; t < n; t++) {
            let pred = intercept;
            for (let k = 1; k <= p; k++) pred += phi[k - 1] * x[t - k];
            fitted[t]   = pred;
            residual[t] = x[t] - pred;
        }

        const validRes = residual.slice(p);
        const sigma2 = validRes.reduce((s, e) => s + e * e, 0) / validRes.length;

        // Capture everything needed by the closure
        const hist0 = x.slice();   // working history, never mutates the caller's data

        const forecast = (k = 1) => {
            Sample._checkHorizon(k);
            const hist = hist0.slice();   // fresh copy per call
            const out  = new Array(k);
            for (let step = 0; step < k; step++) {
                let pred = intercept;
                for (let j = 1; j <= p; j++) pred += phi[j - 1] * hist[hist.length - j];
                hist.push(pred);
                out[step] = pred;
            }
            return out;
        };

        return {
            order: p,
            phi,
            intercept,
            sigma2,
            fitted,
            residual,
            forecast,
            forecastOne: () => forecast(1)[0],
            forecastSample: (k = 1) => new Sample(forecast(k))
        };
    }

    // =========================================================
    //  Helpers
    // =========================================================

    static _checkHorizon(k) {
        if (!Number.isInteger(k) || k < 1) {
            throw new Error('Horizon k must be a positive integer');
        }
    }

    // ... _solveSmall, pacf, etc. unchanged
	
	
	// Given a fitted model, produce ±z·σ bands around forecast(k).
    // For AR(p), the k-step variance grows as σ²·(1 + ψ₁² + … + ψ_{k−1}²),
    // where ψ are the MA(∞) coefficients implied by the AR polynomial.
    predictionInterval(model, k = 1, z = 1.96) {
        Sample._checkHorizon(k);
        const center = model.forecast(k);

        // Residual std from the model
        const res = model.residual.filter(v => v !== null);
        const sigma = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / res.length);

        // AR: compute ψ coefficients for correct k-step variance growth
        let halfWidths;
        if (model.order >= 1 && model.phi) {
            halfWidths = Sample._arHalfWidths(model.phi, sigma, z, k);
        } else {
            // SES / Holt: heuristic — variance grows linearly with horizon
            halfWidths = Array.from({ length: k }, (_, i) =>
                z * sigma * Math.sqrt(1 + i * 0.5)
            );
        }

        return {
            center,
            lower: center.map((c, i) => c - halfWidths[i]),
            upper: center.map((c, i) => c + halfWidths[i])
        };
    }

    // MA(∞) ψ-weights for an AR(p): ψ₀ = 1, ψₖ = Σ φⱼ ψ_{k−j}
    static _arHalfWidths(phi, sigma, z, k) {
        const p = phi.length;
        const psi = new Array(k).fill(0);
        psi[0] = 1;
        for (let i = 1; i < k; i++) {
            let s = 0;
            for (let j = 1; j <= p && j <= i; j++) s += phi[j - 1] * psi[i - j];
            psi[i] = s;
        }
        // Cumulative variance of k-step forecast
        let cumVar = 0;
        return psi.map(w => {
            cumVar += w * w;
            return z * sigma * Math.sqrt(cumVar);
        });
    }
	
	
}

module.exports =  Sample;