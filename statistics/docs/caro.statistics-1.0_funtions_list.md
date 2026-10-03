# CaroLab Statistics Library

- **Name:** caro.statistics-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Statistics](#a-primary-library-for-statistics)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab Statistics Library — Functions List](#carolab-statistics-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Access](#construction--access)
   - [Descriptive Statistics](#descriptive-statistics)
   - [Two-Sample Statistics](#two-sample-statistics)
   - [Smoothing & Filtering](#smoothing--filtering)
   - [Autocorrelation](#autocorrelation)
   - [Quantiles & Scaling](#quantiles--scaling)
   - [Detrending](#detrending)
   - [Frequency Domain](#frequency-domain)
   - [Forecasting](#forecasting)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Statistics

`caro.statistics-1.0.js` is a single-class JavaScript library built around the **`Sample`** object — an immutable-by-convention wrapper around an array of finite numbers. All statistics, transforms and forecasting models operate as methods on a `Sample` instance, and most transform-style methods (e.g. `movingAverageCausal`, `normalize`, `detrend`) return a **new `Sample`**, so calls can be chained.

The library covers four broad areas:

| Area | Examples |
|---|---|
| Descriptive statistics | `min`, `max`, `mean`, `median`, `var_p`, `var_s`, `std_p`, `std_s` |
| Two-sample statistics | `covariance`, `correlation`, `crossCorrelation` |
| Signal processing | `movingAverage`, `exponentialMovingAverage`, `detrend`, `fft`, `spectrum` |
| Time-series forecasting | `ses` (simple exponential smoothing), `holt` (level + trend), `ar` (Yule–Walker AR(p)), `predictionInterval` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.statistics-1.0.js"></script>
<script>
  const x = [1, 0.8, 1.2, 1.1, 0.9];
  const sample = new Sample(x);
  const std_s = sample.std_s();
  console.log('Sample standard deviation:', std_s);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const Sample = require('./caro.statistics-1.0.js');

const x = [1, 0.8, 1.2, 1.1, 0.9];
const sample = new Sample(x);
const std_s = sample.std_s();

console.log('Sample standard deviation:', std_s);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** data is supplied once, to the `Sample` **constructor** (`new Sample(x)`). Methods such as `std_s()` then take **no data argument** — they operate on the data already stored in the instance. This differs from a plain function-library style (`std_s(x)`) and is the pattern used throughout every example in this document.

### Debugging Programs

- `Sample` validates its input eagerly: the constructor throws `Sample data must be an array` or `Sample data must contain only finite numbers` if given anything else, so bad input surfaces immediately at construction rather than inside a later calculation.
- Most methods call an internal guard first:
  - `_requireNonEmpty()` — throws `Sample is empty` for any statistic that needs at least one value.
  - `_requireSameLength(other)` — throws `Expected a Sample` / `Samples must have the same non-zero length` for two-Sample operations (`covariance`, `correlation`, `crossCorrelation`).
- Domain-specific methods throw descriptive `Error`s for invalid parameters (e.g. `Invalid window size`, `Alpha must be in (0, 1]`, `FFT length must be a power of two`, `Cannot rescale a constant Sample`). Wrap calls in `try { ... } catch (e) { ... }` when input shape/parameters are not guaranteed valid ahead of time.
- Because most transforms return a new `Sample`, use `.toArray()` or `.toString()` at the point of logging to inspect values, e.g. `console.log(sample.normalize().toString())`.

---

## CaroLab Statistics Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `min` | Minimum value of data sample |
| 2 | `max` | Maximum value of data sample |
| 3 | `mean` | Arithmetic mean of data sample |
| 4 | `sum` | Sum of data sample |
| 5 | `var_p` | Population variance |
| 6 | `var_s` | Sample (unbiased) variance |
| 7 | `std_p` | Population standard deviation |
| 8 | `std_s` | Sample standard deviation |
| 9 | `variance` | Variance, population or sample, selected by `ddof` |
| 10 | `std` | Standard deviation, population or sample, selected by `ddof` |
| 11 | `median` | Median value of data sample |
| 12 | `covariance` | Covariance between two Samples |
| 13 | `correlation` | Pearson correlation coefficient between two Samples |
| 14 | `movingAverage` | Simple moving average, shortened output |
| 15 | `movingAverageRaw` | Simple moving average, length-preserving, `null` warm-up |
| 16 | `movingAverageCausal` | Simple moving average, length-preserving valid tail only |
| 17 | `exponentialMovingAverage` | Exponentially weighted moving average |
| 18 | `autocorrelation` | Autocorrelation of the Sample at a given lag |
| 19 | `acf` | Autocorrelation function over a range of lags |
| 20 | `quantile` | Value at a given quantile (0–1), linear interpolation |
| 21 | `percentile` | Value at a given percentile (0–100) |
| 22 | `iqr` | Interquartile range |
| 23 | `normalize` | Standardizes data: `(x − μ) / σ` |
| 24 | `zScore` | Alias of `normalize` using sample standard deviation |
| 25 | `rescale` | Min–max scaling to an arbitrary `[lo, hi]` range |
| 26 | `detrend` | Removes a polynomial trend (order 0, 1, 2, …) |
| 27 | `crossCorrelation` | Normalized cross-correlation between two Samples over a lag range |
| 28 | `fft` | Radix-2 Cooley–Tukey Fast Fourier Transform |
| 29 | `spectrum` | One-sided amplitude spectrum derived from `fft` |
| 30 | `ses` | Simple exponential smoothing (level-only forecast model) |
| 31 | `holt` | Holt's linear exponential smoothing (level + trend model) |
| 32 | `ar` | Yule–Walker AR(p) autoregressive model |
| 33 | `predictionInterval` | ±z·σ forecast interval for an `ses`/`holt`/`ar` model |

*(Construction and access helpers — `constructor`, `Sample.of`, `get`, `slice`, `clone`, `toArray`, `toString` — are listed separately under [Construction & Access](#construction--access), as they are not statistical functions in their own right.)*

---

## Detail Description

### Construction & Access

- **Function:** `constructor` / `new Sample(data)`
  **Description:** Creates a new `Sample` from an array of finite numbers. Throws if `data` is not an array, or contains any non-finite/non-numeric value.
  **Syntax:** `const sample = new Sample(data);`
  **Input Arguments:** `data`: array of numbers (default `[]`)
  **Output Arguments:** `sample`: `Sample` instance
  **Coding Example:**
  ```javascript
  const sample = new Sample([1, 0.8, 1.2, 1.1, 0.9]);
  ```

- **Function:** `Sample.of`
  **Description:** Convenience static constructor — builds a `Sample` from individual arguments instead of an array.
  **Syntax:** `sample = Sample.of(...values);`
  **Input Arguments:** `values`: numbers, given as separate arguments
  **Output Arguments:** `sample`: `Sample` instance
  **Coding Example:**
  ```javascript
  const sample = Sample.of(1, 0.8, 1.2, 1.1, 0.9);
  ```

- **Function:** `get`
  **Description:** Returns the value at index `i`.
  **Syntax:** `v = sample.get(i);`
  **Input Arguments:** `i`: integer index
  **Output Arguments:** `v`: float value

- **Function:** `slice`
  **Description:** Returns a new `Sample` over the range `[a, b)`, following standard `Array.slice` semantics.
  **Syntax:** `sub = sample.slice(a, b);`
  **Input Arguments:** `a`: start index; `b`: end index (exclusive)
  **Output Arguments:** `sub`: `Sample` instance

- **Function:** `clone`
  **Description:** Returns an independent copy of the Sample.
  **Syntax:** `copy = sample.clone();`
  **Output Arguments:** `copy`: `Sample` instance

- **Function:** `toArray`
  **Description:** Returns the Sample's data as a plain array.
  **Syntax:** `arr = sample.toArray();`
  **Output Arguments:** `arr`: array of floats

- **Function:** `toString`
  **Description:** Formats the Sample's values as a bracketed, fixed-precision string, e.g. `[1.0000, 0.8000, ...]`.
  **Syntax:** `str = sample.toString(precision);`
  **Input Arguments:** `precision`: decimal places (default `4`)
  **Output Arguments:** `str`: string

---

### Descriptive Statistics

- **Function:** `min`
  **Description:** Minimum value of data sample.
  **Syntax:** `v = sample.min();`
  **Output Arguments:** `v`: float value

- **Function:** `max`
  **Description:** Maximum value of data sample.
  **Syntax:** `v = sample.max();`
  **Output Arguments:** `v`: float value

- **Function:** `mean`
  **Description:** Arithmetic mean of data sample.
  **Syntax:** `m = sample.mean();`
  **Output Arguments:** `m`: float value
  **Formula:** `μ = (Σxᵢ) / n`

- **Function:** `sum`
  **Description:** Sum of data sample. *(Not in the original functions list — natural addition.)*
  **Syntax:** `s = sample.sum();`
  **Output Arguments:** `s`: float value

- **Function:** `var_p`
  **Description:** Population variance (divides by `n`).
  **Syntax:** `v = sample.var_p();`
  **Output Arguments:** `v`: float value
  **Formula:** `σ² = Σ(xᵢ − μ)² / n`

- **Function:** `var_s`
  **Description:** Sample (unbiased) variance (divides by `n − 1`). Requires at least 2 data points.
  **Syntax:** `v = sample.var_s();`
  **Output Arguments:** `v`: float value
  **Formula:** `s² = Σ(xᵢ − x̄)² / (n − 1)`

- **Function:** `std_p`
  **Description:** Population standard deviation.
  **Syntax:** `sigma = sample.std_p();`
  **Output Arguments:** `sigma`: float value
  **Formula:** `σ = √(σ²)`, using `var_p`

- **Function:** `std_s`
  **Description:** Returns standard deviation value of data sample (sample/unbiased form).
  **Syntax:** `sigma = sample.std_s();`
  **Input Arguments:** Uses the data already held by `sample` (constructed via `new Sample(x)`)
  **Output Arguments:** `sigma`: float value
 **Formula:** `σ = √(σ²)`, using `var_s`

- **Function:** `variance`
  **Description:** Modern alias combining `var_p`/`var_s` via a `ddof` (delta degrees of freedom) flag.
  **Syntax:** `v = sample.variance(ddof);`
  **Input Arguments:** `ddof`: `0` for population (default), non-zero for sample
  **Output Arguments:** `v`: float value

- **Function:** `std`
  **Description:** Modern alias combining `std_p`/`std_s` via `ddof`.
  **Syntax:** `sigma = sample.std(ddof);`
  **Input Arguments:** `ddof`: `0` for population (default), non-zero for sample
  **Output Arguments:** `sigma`: float value

- **Function:** `median`
  **Description:** Median value of data sample (average of the two middle values when `n` is even).
  **Syntax:** `m = sample.median();`
  **Output Arguments:** `m`: float value

---

### Two-Sample Statistics

- **Function:** `covariance`
  **Description:** Covariance between this Sample and another Sample of equal length.
  **Syntax:** `c = sampleX.covariance(sampleY, ddof);`
  **Input Arguments:** `other`: `Sample` of the same length; `ddof`: divisor offset (default `0`, i.e. divide by `n`)
  **Output Arguments:** `c`: float value
  **Formula:** `cov(X,Y) = Σ(xᵢ − x̄)(yᵢ − ȳ) / (n − ddof)`

- **Function:** `correlation`
  **Description:** Pearson correlation coefficient between this Sample and another Sample of equal length.
  **Syntax:** `r = sampleX.correlation(sampleY);`
  **Input Arguments:** `other`: `Sample` of the same length
  **Output Arguments:** `r`: float value in `[-1, 1]`
  **Formula:** `r = cov(X,Y) / (σx · σy)` — throws if either Sample has zero variance

---

### Smoothing & Filtering

- **Function:** `movingAverage`
  **Description:** Simple moving average with a fixed window. Output length is `n − window + 1` (shorter than the input).
  **Syntax:** `ma = sample.movingAverage(window);`
  **Input Arguments:** `window`: positive integer ≤ sample length
  **Output Arguments:** `ma`: `Sample` instance

- **Function:** `movingAverageRaw`
  **Description:** Length-preserving moving average; returns a **plain array** (not a `Sample`, since `Sample` rejects `null`) with `null` in the warm-up region before the window is filled.
  **Syntax:** `arr = sample.movingAverageRaw(window);`
  **Input Arguments:** `window`: positive integer ≤ sample length
  **Output Arguments:** `arr`: array of length `n`, `null`-padded at the start

- **Function:** `movingAverageCausal`
  **Description:** Same values as `movingAverage`, but computed via a running sum; returns only the valid tail (length `n − window + 1`) as a `Sample`, convenient for chaining.
  **Syntax:** `ma = sample.movingAverageCausal(window);`
  **Input Arguments:** `window`: positive integer ≤ sample length
  **Output Arguments:** `ma`: `Sample` instance

- **Function:** `exponentialMovingAverage`
  **Description:** Exponentially weighted moving average; length-preserving, first value equals the first data point.
  **Syntax:** `ema = sample.exponentialMovingAverage(alpha);`
  **Input Arguments:** `alpha`: smoothing factor in `(0, 1]`
  **Output Arguments:** `ema`: `Sample` instance
  **Formula:** `EMAᵢ = α·xᵢ + (1 − α)·EMAᵢ₋₁`

---

### Autocorrelation

- **Function:** `autocorrelation`
  **Description:** Correlation of the Sample with a lagged copy of itself.
  **Syntax:** `r = sample.autocorrelation(lag);`
  **Input Arguments:** `lag`: integer, `0 ≤ lag < n` (default `1`)
  **Output Arguments:** `r`: float value

- **Function:** `acf`
  **Description:** Autocorrelation function evaluated at every lag from `0` to `maxLag`.
  **Syntax:** `arr = sample.acf(maxLag);`
  **Input Arguments:** `maxLag`: integer, `0 ≤ maxLag < n`
  **Output Arguments:** `arr`: plain array of length `maxLag + 1`

---

### Quantiles & Scaling

- **Function:** `quantile`
  **Description:** Value at quantile `q`, via linear interpolation between order statistics (matches NumPy's default).
  **Syntax:** `v = sample.quantile(q);`
  **Input Arguments:** `q`: float in `[0, 1]`
  **Output Arguments:** `v`: float value

- **Function:** `percentile`
  **Description:** Value at percentile `p` — a convenience wrapper over `quantile(p / 100)`.
  **Syntax:** `v = sample.percentile(p);`
  **Input Arguments:** `p`: float in `[0, 100]`
  **Output Arguments:** `v`: float value

- **Function:** `iqr`
  **Description:** Interquartile range — a robust spread measure, useful for outlier detection.
  **Syntax:** `v = sample.iqr();`
  **Output Arguments:** `v`: float value
  **Formula:** `IQR = Q₃ − Q₁ = quantile(0.75) − quantile(0.25)`

- **Function:** `normalize`
  **Description:** Standardizes the Sample: `(x − μ) / σ`. Throws for a zero-variance Sample.
  **Syntax:** `z = sample.normalize(ddof);`
  **Input Arguments:** `ddof`: `0` for population std (default), non-zero for sample std
  **Output Arguments:** `z`: `Sample` instance

- **Function:** `zScore`
  **Description:** Alias of `normalize(1)` — uses sample standard deviation, the conventional choice for z-scores.
  **Syntax:** `z = sample.zScore();`
  **Output Arguments:** `z`: `Sample` instance

- **Function:** `rescale`
  **Description:** Min–max scaling of the Sample to an arbitrary `[lo, hi]` range (default `[0, 1]`). Throws for a constant Sample.
  **Syntax:** `r = sample.rescale(lo, hi);`
  **Input Arguments:** `lo`: lower bound (default `0`); `hi`: upper bound (default `1`)
  **Output Arguments:** `r`: `Sample` instance

---

### Detrending

- **Function:** `detrend`
  **Description:** Removes a polynomial trend of a given order (`0` = mean, `1` = linear, `2` = quadratic, …), fit by ordinary least squares against the index `t = 0, 1, …, n−1`.
  **Syntax:** `residual = sample.detrend(order);`
  **Input Arguments:** `order`: non-negative integer, `< n` (default `1`)
  **Output Arguments:** `residual`: `Sample` instance (detrended series)
  **Method:** Builds the design matrix `Φ` with columns `tᵏ`, solves the normal equations `(ΦᵀΦ)β = Φᵀy` via Gaussian elimination (`Sample._solveSmall`), then subtracts the fitted trend from the data.

---

### Two-Sample Statistics — Cross-Correlation

- **Function:** `crossCorrelation`
  **Description:** Normalized cross-correlation between this Sample and another Sample of equal length, evaluated at every lag from `−maxLag` to `+maxLag`. Useful for system identification — the peak location approximates the delay between the two Samples.
  **Syntax:** `result = sampleX.crossCorrelation(sampleY, maxLag);`
  **Input Arguments:** `other`: `Sample` of the same length; `maxLag`: integer, `0 ≤ maxLag < n` (default: `n − 1`)
  **Output Arguments:** `result`: `{ lags, values }` — `lags`: array of integers from `−maxLag` to `maxLag`; `values`: array of normalized cross-correlation values (`ρ(0) ≈ 1` for aligned Samples)

---

### Frequency Domain

- **Function:** `fft`
  **Description:** Radix-2 Cooley–Tukey Fast Fourier Transform. Requires the Sample length to be a power of two.
  **Syntax:** `result = sample.fft();`
  **Output Arguments:** `result`: `{ re, im, mag, phase }` — each an array of length `n` (full complex spectrum, conjugate-symmetric for real input)

- **Function:** `spectrum`
  **Description:** One-sided amplitude spectrum derived from `fft`, with frequencies in cycles/sample (or in Hz if `sampleRate` is supplied). Interior bins are doubled to preserve total power, matching the output of a typical spectrum analyzer on real input.
  **Syntax:** `result = sample.spectrum(sampleRate);`
  **Input Arguments:** `sampleRate`: samples per unit time (default `1`)
  **Output Arguments:** `result`: `{ freqs, amps }` — arrays of length `n/2 + 1`

---

### Forecasting

- **Function:** `ses`
  **Description:** Simple exponential smoothing — a level-only model producing a flat forecast.
  **Syntax:** `model = sample.ses(alpha);`
  **Input Arguments:** `alpha`: smoothing factor in `(0, 1]` (default `0.3`)
  **Output Arguments:** `model`: `{ order: 0, alpha, level, fitted, residual, forecast(k), forecastOne(), forecastSample(k) }`
  **Notes:** `fitted[0]` and `residual[0]` are `null` (no prior level to predict from).

- **Function:** `holt`
  **Description:** Holt's linear exponential smoothing — a level + trend model producing a linear-in-horizon forecast. Requires at least 2 data points.
  **Syntax:** `model = sample.holt({ alpha, beta, initialLevel, initialTrend });`
  **Input Arguments:** `alpha`: level smoothing factor in `(0, 1]` (default `0.3`); `beta`: trend smoothing factor in `(0, 1]` (default `0.1`); `initialLevel`: optional override (default `x[0]`); `initialTrend`: optional override (default `x[1] − x[0]`)
  **Output Arguments:** `model`: `{ order: 1, alpha, beta, level, trend, fitted, residual, forecast(k), forecastOne(), forecastSample(k) }`

- **Function:** `ar`
  **Description:** Autoregressive model of order `p`, fit via the Yule–Walker equations on the biased autocorrelation of the (mean-centered) data.
  **Syntax:** `model = sample.ar(p);`
  **Input Arguments:** `p`: positive integer, `< n` (default `1`)
  **Output Arguments:** `model`: `{ order: p, phi, intercept, sigma2, fitted, residual, forecast(k), forecastOne(), forecastSample(k) }`
  **Method:** Solves `R·φ = r[1..p]` (`R[i][j] = r[|i−j|]`) via `Sample._solveSmall`; derives the intercept so that `E[x] = μ`; forecasts recursively by feeding each new prediction back into the AR history.

- **Function:** `predictionInterval`
  **Description:** Produces `±z·σ` bands around a fitted model's `forecast(k)`.
  **Syntax:** `bands = sample.predictionInterval(model, k, z);`
  **Input Arguments:** `model`: an object returned by `ses`, `holt`, or `ar`; `k`: forecast horizon (positive integer, default `1`); `z`: number of standard deviations (default `1.96`, i.e. ~95%)
  **Output Arguments:** `bands`: `{ center, lower, upper }` — each an array of length `k`
  **Method:** For an `ar` model, computes the exact k-step forecast variance growth from the MA(∞) ψ-weights implied by the AR polynomial (`Sample._arHalfWidths`). For `ses`/`holt` (no `phi`), uses a heuristic where variance grows linearly with horizon.

---

### Internal Helpers

These are implementation details, not part of the public statistical API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `_requireNonEmpty` | Throws if the Sample has zero length |
| `_requireSameLength(other)` | Throws unless `other` is a `Sample` of the same non-zero length |
| `Sample._solveSmall(A, b, tol)` | Solves a small dense linear system via Gaussian elimination with partial pivoting; used by `detrend` and `ar` |
| `Sample._range(a, b)` | Returns `[a, a+1, ..., b]`; used by `crossCorrelation` |
| `Sample._checkHorizon(k)` | Throws unless `k` is a positive integer; used by all `forecast(k)` closures |
| `Sample._arHalfWidths(phi, sigma, z, k)` | Computes MA(∞) ψ-weights and cumulative-variance half-widths for `predictionInterval` on an `ar` model |

---


