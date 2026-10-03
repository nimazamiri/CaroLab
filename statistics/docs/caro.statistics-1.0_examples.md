# CaroLab Statistics Library — Examples Manual

- **Name:** caro.statistics-1.0.js
- **Release Date:** 30 September 2026
- **Document Name:** Statistics Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Construction and Access (`statsExample1`)](#example-1--construction-and-access-statsexample1)
4. [Example 2 — Basic Descriptive Statistics (`statsExample2`)](#example-2--basic-descriptive-statistics-statsexample2)
5. [Example 3 — Variance and Standard Deviation (`statsExample3`)](#example-3--variance-and-standard-deviation-statsexample3)
6. [Example 4 — Covariance and Correlation (`statsExample4`)](#example-4--covariance-and-correlation-statsexample4)
7. [Example 5 — Moving Averages (`statsExample5`)](#example-5--moving-averages-statsexample5)
8. [Example 6 — Quantiles, Percentiles, IQR (`statsExample6`)](#example-6--quantiles-percentiles-iqr-statsexample6)
9. [Example 7 — Normalization and Z-Scores (`statsExample7`)](#example-7--normalization-and-z-scores-statsexample7)
10. [Example 8 — Detrend (`statsExample8`)](#example-8--detrend-statsexample8)
11. [Example 9 — Autocorrelation and ACF (`statsExample9`)](#example-9--autocorrelation-and-acf-statsexample9)
12. [Example 10 — Cross-Correlation (`statsExample10`)](#example-10--cross-correlation-statsexample10)
13. [Example 11 — FFT and Spectrum (`statsExample11`)](#example-11--fft-and-spectrum-statsexample11)
14. [Example 12 — Time-Series Forecasting (`statsExample12`)](#example-12--time-series-forecasting-statsexample12)
15. [What the Twelve Examples Prove Together](#what-the-twelve-examples-prove-together)
16. [Extending the Examples](#extending-the-examples)
17. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the `caro.statistics-1.0.js` library — a **dependency-free statistics and time-series toolkit** built around a single `Sample` class.

Where `caro.matrix-1.0.js` handles linear algebra and `caro.linear-1.0.js` handles polynomial roots and fitting, `caro.statistics-1.0.js` handles **descriptive statistics, signal analysis, and forecasting** on 1-D numeric data.

The twelve examples in this manual cover the entire public API:

| Group | Methods |
|---|---|
| Construction | `new Sample(data)`, `Sample.of(...)`, `Symbol.iterator` |
| Access | `get`, `slice`, `clone`, `toArray` |
| Descriptive | `min`, `max`, `sum`, `mean`, `median` |
| Spread | `var_p`, `var_s`, `std_p`, `std_s`, `variance`, `std` |
| Relationship | `covariance`, `correlation` |
| Smoothing | `movingAverage`, `movingAverageRaw`, `movingAverageCausal`, `exponentialMovingAverage` |
| Quantiles | `quantile`, `percentile`, `iqr` |
| Transforms | `normalize`, `zScore`, `rescale`, `detrend` |
| Signal analysis | `autocorrelation`, `acf`, `crossCorrelation`, `fft`, `spectrum` |
| Forecasting | `ses`, `holt`, `ar`, `predictionInterval` |

### Conventions

| Item | Convention |
|---|---|
| Data | Flat array of finite numbers |
| Empty Sample | Allowed at construction, but most methods throw |
| Population variance | `var_p` — divides by `n` |
| Sample variance | `var_s` — divides by `n − 1` |
| ddof | Degrees of freedom correction; `ddof = 0` → population, `ddof = 1` → sample |
| Correlation | Pearson correlation coefficient, in `[−1, 1]` |
| Autocorrelation lag | `lag = 0` gives 1; increasing lag measures self-similarity |
| FFT length | Must be a power of two (radix-2 Cooley–Tukey) |
| Forecast horizon | Integer `k ≥ 1` |
| Prediction interval | Confidence level via `z`-score (default 1.96 for 95%) |

All examples use **CommonJS** (`require`) and expect the library to be exported as `module.exports = Sample;`.

### Required Files and Layout

```
project/
├── caro.statistics-1.0.js
└── examples/
    └── statistics_examples.js
```

### How to Run the Examples

```
node examples/statistics_examples.js
```

Each of the twelve `statsExampleN()` functions is self-contained and prints its own block.

### Why This Library Matters

Time-series analysis and descriptive statistics are the bread and butter of signal processing, control tuning, and machine learning preprocessing. Every serious analysis pipeline needs:

- **Basic statistics** — mean, median, variance, quantiles.
- **Smoothing** — moving averages, exponential smoothing.
- **Signal analysis** — autocorrelation, cross-correlation, FFT.
- **Forecasting** — SES, Holt, AR models.

Python has `numpy`, `pandas`, and `statsmodels` for these tasks. JavaScript has nothing in the standard library. `caro.statistics-1.0.js` fills that gap for the CaroLab ecosystem.

The library is **not** a replacement for `statsmodels`. It does not include ARIMA, GARCH, VAR, or state-space models. It implements a curated set of primitives that are:

- **Small** — one class, ~900 lines.
- **Readable** — every algorithm is visible in the source.
- **Dependency-free** — no `numpy`, no linear algebra library, no FFT library.
- **Adequate for real work** — enough to smooth sensor data, fit a trend, analyze a signal, and forecast a series.

The twelve examples in this manual verify the library against known analytical results: the mean of `[2,4,4,4,5,5,7,9]` is `5`, the autocorrelation of a sine wave peaks at zero lag and dips at half-period, the FFT of a 2 Hz sine wave has its peak at 2 Hz, and so on.

---

## Examples List

| No. | Function | Purpose |
|---|---|---|
| 1 | `statsExample1` | Construction, access, iterability |
| 2 | `statsExample2` | `min`, `max`, `sum`, `mean`, `median` |
| 3 | `statsExample3` | `var_p`, `var_s`, `std_p`, `std_s`, `variance`, `std` |
| 4 | `statsExample4` | `covariance`, `correlation` |
| 5 | `statsExample5` | Simple and exponential moving averages |
| 6 | `statsExample6` | `quantile`, `percentile`, `iqr` |
| 7 | `statsExample7` | `normalize`, `zScore`, `rescale` |
| 8 | `statsExample8` | `detrend` (linear and quadratic) |
| 9 | `statsExample9` | `autocorrelation`, `acf` |
| 10 | `statsExample10` | `crossCorrelation` with a known delay |
| 11 | `statsExample11` | `fft`, `spectrum` |
| 12 | `statsExample12` | `ses`, `holt`, `ar`, `predictionInterval` |

---

## Example 1 — Construction and Access (`statsExample1`)

- **Purpose:** Show how to construct a `Sample`, iterate it, slice it, clone it, and inspect its length. This is the entry point for every other example.
- **Source:**

```javascript
function statsExample1() {
  console.log('\n=== Example 1: Construction and Access ===');

  const s = Sample.of(3, 1, 4, 1, 5, 9, 2, 6);
  console.log('Data:', s.toArray());
  console.log('Length:', s.length);
  console.log('First element:', s.get(0));
  console.log('Slice [2..5):', s.slice(2, 5).toArray());

  const c = s.clone();
  c.toArray()[0] = 999;
  console.log('Original unchanged:', s.get(0) === 3);

  console.log('Spread:', [...s].slice(0, 3));

  const empty = new Sample();
  console.log('Empty length:', empty.length);
}
```

- **Methods invoked:** `Sample.of`, `toArray`, `get`, `slice`, `clone`, `Symbol.iterator` (via spread).
- **Inputs:** `Sample.of(3, 1, 4, 1, 5, 9, 2, 6)` — an 8-element sample.
- **Output:** printed diagnostics of data, length, and slice.
- **Expected output:**

```
=== Example 1: Construction and Access ===
Data: [ 3, 1, 4, 1, 5, 9, 2, 6 ]
Length: 8
First element: 3
Slice [2..5): [ 4, 1, 5 ]
Original unchanged: true
Spread: [ 3, 1, 4 ]
Empty length: 0
```

- **Reading the output:**
  - **`Sample.of(...)`** — variadic constructor. Equivalent to `new Sample([...])`.
  - **`toArray()`** — a *copy* of the internal data. Mutating the result does not affect the sample.
  - **`length`** — the number of elements. Zero for an empty Sample.
  - **`get(0)`** — direct element access without copying.
  - **`slice(2, 5)`** — returns a *new* `Sample` containing elements at indices 2, 3, 4. Follows the same convention as `Array.prototype.slice`.
  - **`clone()`** — deep copy. Since `toArray()` also copies, the mutation-on-clone test is slightly redundant here, but it demonstrates that `Sample` data is not shared.
  - **Spread `[...s]`** — because `Sample` implements `Symbol.iterator`, it can be spread into an array or used in `for...of`.
  - **Empty Sample** — allowed. Most methods will throw on it, but `length` is safe.
- **The three construction patterns:**
  - **`new Sample([1, 2, 3])`** — from an array. Validates that all entries are finite numbers.
  - **`Sample.of(1, 2, 3)`** — variadic convenience.
  - **`new Sample()`** — an empty Sample. Useful as a placeholder.
- **Why each pattern matters:**
  - The array form is what you use when you already have data (e.g. from a CSV parse).
  - The variadic form is convenient for small literal samples in tests.
  - The empty form is useful as an initial value or default.
- **Coding example:** as shown. The `toArray()` call after every construction is a common pattern when you want to check what the Sample contains without triggering a statistical method.
- **Common pitfalls:**
  - **Non-numeric data throws.** Passing `[1, "two", 3]` throws a construction error.
  - **`NaN` and `Infinity` throw.** Only finite numbers are allowed.
  - **`toArray()` returns a copy.** To read a single element without copying, use `get(i)`.
  - **`slice` returns a Sample, not an array.** If you need an array, call `.toArray()` on the result.
  - **Spread and `toArray()` are equivalent.** Both copy the internal data; neither is faster.

---

## Example 2 — Basic Descriptive Statistics (`statsExample2`)

- **Purpose:** Compute the five standard descriptive statistics — minimum, maximum, sum, mean, and median — on a small dataset. This is the foundation of every statistical analysis.
- **Source:**

```javascript
function statsExample2() {
  console.log('\n=== Example 2: Basic Descriptive Statistics ===');

  const s = new Sample([2, 4, 4, 4, 5, 5, 7, 9]);
  console.log('Data:', s.toArray());
  console.log('min     :', s.min());
  console.log('max     :', s.max());
  console.log('sum     :', s.sum());
  console.log('mean    :', s.mean());
  console.log('median  :', s.median());
}
```

- **Methods invoked:** `min`, `max`, `sum`, `mean`, `median`.
- **Inputs:** `[2, 4, 4, 4, 5, 5, 7, 9]` — a small sample with a skewed distribution.
- **Output:** six printed lines.
- **Expected output:**

```
=== Example 2: Basic Descriptive Statistics ===
Data: [ 2, 4, 4, 4, 5, 5, 7, 9 ]
min     : 2
max     : 9
sum     : 40
mean    : 5
median  : 4.5
```

- **Reading the output:**
  - **`min`** — the smallest element, `2`.
  - **`max`** — the largest element, `9`.
  - **`sum`** — the total, `2+4+4+4+5+5+7+9 = 40`.
  - **`mean`** — `40/8 = 5`.
  - **`median`** — the middle value of the sorted sample. For even-length samples, the average of the two middle values: `(4+5)/2 = 4.5`.
- **Why median differs from mean:**
  - The sample has many small values and a few large ones — it is right-skewed.
  - The mean is pulled up by the large values to `5`.
  - The median is more robust: it splits the sorted sample in half and lands between the two middle values at `4.5`.
  - This difference is the classic motivation for using median as a robust statistic.
- **The five methods in words:**
  - **`min`, `max`** — scan the sample, return the extremum.
  - **`sum`** — fold over the sample, adding each element.
  - **`mean`** — `sum / length`.
  - **`median`** — sort a copy of the sample, then return the middle element or the average of the two middle elements.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **All five methods throw on an empty Sample.** The `_requireNonEmpty()` guard is enforced.
  - **`median` sorts a copy.** The original sample is not modified. This is intentional — some users prefer non-mutating operations.
  - **`sum` is not in the original spec** but is a natural addition. It is used internally by `mean`.
  - **Precision.** `min`, `max`, and `sum` are exact. `mean` may have floating-point rounding; use `r()` if you want to see a rounded value.
  - **Large samples.** `Math.min(...data)` and `Math.max(...data)` are used for `min` and `max`. For very large samples (millions of elements), spread syntax can overflow the call stack. A loop would be more robust.

---

## Example 3 — Variance and Standard Deviation (`statsExample3`)

- **Purpose:** Compute both population and sample variance/standard deviation, and demonstrate the modern `ddof` API. This example clarifies the distinction between the two conventions.
- **Source:**

```javascript
function statsExample3() {
  console.log('\n=== Example 3: Variance and Standard Deviation ===');

  const s = new Sample([2, 4, 4, 4, 5, 5, 7, 9]);
  console.log('var_p   (population):', r(s.var_p()));
  console.log('var_s   (sample)    :', r(s.var_s()));
  console.log('std_p   (population):', r(s.std_p()));
  console.log('std_s   (sample)    :', r(s.std_s()));

  console.log('variance(ddof=0)    :', r(s.variance(0)));
  console.log('variance(ddof=1)    :', r(s.variance(1)));

  try { new Sample([5]).var_s(); } catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `var_p`, `var_s`, `std_p`, `std_s`, `variance(ddof)`, `std(ddof)`.
- **Inputs:** `[2, 4, 4, 4, 5, 5, 7, 9]` — the same skewed sample as Example 2.
- **Output:** six numeric lines plus a caught error message.
- **Expected output:**

```
=== Example 3: Variance and Standard Deviation ===
var_p   (population): 4.5
var_s   (sample)    : 5.1429
std_p   (population): 2.1213
std_s   (sample)    : 2.2678
variance(ddof=0)    : 4.5
variance(ddof=1)    : 5.1429
Error: Sample variance requires n ≥ 2
```

- **Reading the output:**
  - **`var_p`** — the population variance. Sum of squared deviations divided by `n`: `(9 + 1 + 1 + 1 + 0 + 0 + 4 + 16)/8 = 36/8 = 4.5`.
  - **`var_s`** — the sample variance. Same numerator, divided by `n − 1 = 7`: `36/7 ≈ 5.1429`.
  - **`std_p`** — the population standard deviation, `√4.5 ≈ 2.1213`.
  - **`std_s`** — the sample standard deviation, `√5.1429 ≈ 2.2678`.
  - **`variance(ddof=0)`** — alias for `var_p`. `ddof = 0` means "zero degrees of freedom correction", i.e. divide by `n`.
  - **`variance(ddof=1)`** — alias for `var_s`. `ddof = 1` means "one degree of freedom correction", i.e. divide by `n − 1`.
  - **`Error: Sample variance requires n ≥ 2`** — a guard prevents computing sample variance on a single-element Sample.
- **Population vs. sample variance:**
  - **Population variance** — used when the sample *is* the entire population (rare in practice). Divides by `n`.
  - **Sample variance** — used when the sample is a *subset* of a larger population. Divides by `n − 1`. The extra degree of freedom corrects for the bias introduced by estimating the mean from the same data.
  - For large `n`, the two converge. For small `n`, the difference is significant — in this example, `4.5` vs. `5.14`, a 14% difference.
- **The `ddof` API:**
  - The `variance(ddof)` and `std(ddof)` aliases let you pick the convention with a single parameter.
  - `ddof = 0` → population → matches `var_p`, `std_p`.
  - `ddof = 1` → sample → matches `var_s`, `std_s`.
  - This matches the naming convention of NumPy's `np.var(x, ddof=...)`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Sample variance requires `n ≥ 2`.** A Sample with one element throws. Population variance is defined for `n ≥ 1`.
  - **Guard messages are informative.** The library throws with a readable message rather than producing `NaN` or `Infinity`.
  - **Which convention to use?** For engineering data, sample variance (`var_s`) is usually correct. For a fixed finite population, use `var_p`.
  - **Numerical stability.** The naive formula `Σ(x − μ)² / n` loses precision for samples with a large mean and small variance (catastrophic cancellation). A two-pass algorithm would be more stable but is not implemented.
  - **Units.** Variance has squared units; standard deviation has the original units. Prefer `std` when interpreting results.
---

## Example 4 — Covariance and Correlation (`statsExample4`)

- **Purpose:** Measure the linear relationship between two samples. Covariance tells you whether they move together; correlation normalizes it to `[−1, 1]` so different units and scales become comparable.
- **Source:**

```javascript
function statsExample4() {
  console.log('\n=== Example 4: Covariance and Correlation ===');

  const x = new Sample([1, 2, 3, 4, 5]);
  const y = new Sample([2, 4, 6, 8, 10]);   // perfectly linear in x
  const z = new Sample([5, 3, 4, 2, 1]);    // anti-correlated

  console.log('cov(x, y)   :', r(x.covariance(y)));
  console.log('cov(x, y, 1):', r(x.covariance(y, 1)));
  console.log('corr(x, y)  :', r(x.correlation(y)));   // should be ~1.0
  console.log('corr(x, z)  :', r(x.correlation(z)));   // should be ~ -0.9

  try { x.covariance(new Sample([1, 2])); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `covariance(other, ddof)`, `correlation(other)`.
- **Inputs:**
  - `x = [1, 2, 3, 4, 5]` — a linearly increasing sequence.
  - `y = [2, 4, 6, 8, 10]` — exactly `2x`, perfectly correlated with `x`.
  - `z = [5, 3, 4, 2, 1]` — a decreasing sequence, anti-correlated with `x`.
- **Output:** four numeric lines plus a caught error.
- **Expected output:**

```
=== Example 4: Covariance and Correlation ===
cov(x, y)   : 5
cov(x, y, 1): 6.25
corr(x, y)  : 1
corr(x, z)  : -0.9
Error: Samples must have the same non-zero length
```

- **Reading the output:**
  - **`cov(x, y) = 5`** — population covariance, divided by `n`. Since `y = 2x`, every deviation pairs up perfectly: `Cov(x, 2x) = 2·Var(x) = 2·2.5 = 5`.
  - **`cov(x, y, 1) = 6.25`** — sample covariance, divided by `n − 1`. Same numerator, but divided by 4 instead of 5: `5·(5/4) = 6.25`.
  - **`corr(x, y) = 1`** — Pearson correlation coefficient. Since `y` is a positive linear function of `x`, the correlation is exactly 1.
  - **`corr(x, z) ≈ −0.9`** — `z` is roughly `−x + 6`, so it is anti-correlated with `x`. The exact value depends on the specific values: `−0.9` for this sample.
  - **`Error: Samples must have the same non-zero length`** — the length mismatch is caught by the guard.
- **The two methods in words:**
  - **Covariance:** `Cov(x, y) = Σ(xᵢ − μₓ)(yᵢ − μᵧ) / (n − ddof)`.
  - **Correlation:** `Corr(x, y) = Cov(x, y) / (σₓ · σᵧ)`, where `σ` uses the population standard deviation.
- **Interpreting correlation:**
  - **`+1`** — perfect positive linear relationship.
  - **`0`** — no linear relationship (not the same as "independent").
  - **`−1`** — perfect negative linear relationship.
  - Values in between are weaker relationships.
- **Why correlation is preferred over covariance:**
  - Covariance depends on the units. `Cov(x, y) = 5` when `y = 2x`; if we measured `y` in different units, the covariance would change by that factor.
  - Correlation is unit-free. It always lies in `[−1, 1]` regardless of the units.
  - This makes correlation the right tool for comparing the strength of relationships across different datasets.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The two samples must have the same length.** The guard enforces this.
  - **Zero-variance samples make correlation undefined.** If either `x` or `y` is constant, `σ = 0`, and the division blows up. The guard throws.
  - **Correlation is not causation.** A high correlation between two samples does not imply one causes the other. It only says they move together linearly.
  - **Correlation detects linear relationships only.** If `y = x²`, the correlation is not 1, even though `y` is a deterministic function of `x`. This is a fundamental limitation of Pearson correlation.
  - **`correlation` uses population std internally.** The `covariance(other, 0)` call uses population covariance; the divisor `σₓ · σᵧ` also uses population std. Both numerator and denominator use the same `ddof`, so the ratio is consistent.

---

## Example 5 — Moving Averages (`statsExample5`)

- **Purpose:** Demonstrate the three simple moving average variants (full-window, raw, causal) and the exponential moving average. These are the workhorse smoothing methods for sensor data and time-series preprocessing.
- **Source:**

```javascript
function statsExample5() {
  console.log('\n=== Example 5: Moving Averages ===');

  const s = new Sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  console.log('movingAverage(3)        :', s.movingAverage(3).toArray());
  console.log('movingAverageRaw(3)     :', s.movingAverageRaw(3));
  console.log('movingAverageCausal(3)  :', s.movingAverageCausal(3).toArray());
  console.log('exponentialMovingAverage(0.3):', rArr(s.exponentialMovingAverage(0.3).toArray()));
}
```

- **Methods invoked:** `movingAverage`, `movingAverageRaw`, `movingAverageCausal`, `exponentialMovingAverage`.
- **Inputs:** `[1, 2, ..., 10]` — a monotonic ramp, chosen so the smoothed values are easy to interpret.
- **Output:** four printed lines.
- **Expected output:**

```
=== Example 5: Moving Averages ===
movingAverage(3)        : [ 2, 3, 4, 5, 6, 7, 8, 9 ]
movingAverageRaw(3)     : [ null, null, 2, 3, 4, 5, 6, 7, 8, 9 ]
movingAverageCausal(3)  : [ 2, 3, 4, 5, 6, 7, 8, 9 ]
exponentialMovingAverage(0.3): [ 1, 1.3, 1.81, 2.467, 3.2269, 4.0588, 4.9412, 5.8588, 6.8012, 7.7608 ]
```

- **Reading the output:**
  - **`movingAverage(3)`** — windowed average of length `n − window + 1 = 8`. Each value is the mean of three consecutive samples: `(1+2+3)/3 = 2`, `(2+3+4)/3 = 3`, etc.
  - **`movingAverageRaw(3)`** — the same averages, but returned as a **plain array** of length `n = 10`, with `null` in the first `window − 1 = 2` positions. This preserves the index alignment with the original data — useful when you want to plot the smoothed series against the original without offsetting.
  - **`movingAverageCausal(3)`** — a `Sample` with the same values as `movingAverage(3)`. This is the "chainable" form: you get a `Sample` back, so you can call `.std_p()` or `.detrend()` on it.
  - **`exponentialMovingAverage(0.3)`** — an EMA with `α = 0.3`. Starts at the first value and evolves: `x̂ₜ = 0.3·xₜ + 0.7·x̂ₜ₋₁`. The result lags the input, with the lag depending on `α`.
- **The four variants:**
  - **`movingAverage(window)`** — returns a `Sample` of length `n − window + 1`. This is the most common convention.
  - **`movingAverageRaw(window)`** — returns a plain array of length `n` with `null` in the warm-up region.
  - **`movingAverageCausal(window)`** — returns a `Sample` of length `n − window + 1`. Functionally identical to `movingAverage`, but the name emphasizes its causal nature.
  - **`exponentialMovingAverage(alpha)`** — returns a `Sample` of length `n`. The first value is the first input; subsequent values are exponentially weighted.
- **Choosing a window/alpha:**
  - **Moving average:** larger window → smoother output, more lag. Window size is the number of samples averaged.
  - **EMA:** smaller `α` → smoother output, more lag. `α = 1` means "no smoothing"; `α = 0.1` means "heavily smoothed".
  - A common rule of thumb: for a moving average of window `W`, the equivalent EMA `α` is approximately `2/(W+1)`.
- **Why three moving average variants?**
  - The original library only had `movingAverage` (returning a `Sample`) and a `movingAverage_` variant (returning an array with `null`s).
  - Since the `Sample` class rejects `null`, the raw variant cannot return a `Sample`.
  - The library offers all three conventions so you can pick the one that fits your downstream code.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`window` must satisfy `0 < window ≤ n`.** Larger windows throw.
  - **`alpha` must be in `(0, 1]`.** `alpha = 0` throws (no smoothing makes no sense).
  - **The three variants return different types.** `movingAverage` and `movingAverageCausal` return `Sample`; `movingAverageRaw` returns a plain array.
  - **EMA start value.** The EMA starts at `data[0]`, not at `mean(data)`. This is a convention; some implementations start at the mean of the first few samples.
  - **Lag.** All smoothing methods introduce lag. For real-time control, the lag must be accounted for; otherwise the smoothed signal may be useless for feedback.

---

## Example 6 — Quantiles, Percentiles, IQR (`statsExample6`)

- **Purpose:** Compute quantiles, percentiles, and the interquartile range (IQR). These are robust alternatives to mean and standard deviation, and they are the building blocks of box plots and outlier detection.
- **Source:**

```javascript
function statsExample6() {
  console.log('\n=== Example 6: Quantiles, Percentiles, IQR ===');

  const s = new Sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  console.log('quantile(0.25):', r(s.quantile(0.25)));
  console.log('quantile(0.50):', r(s.quantile(0.50)));
  console.log('quantile(0.75):', r(s.quantile(0.75)));
  console.log('percentile(90):', r(s.percentile(90)));
  console.log('IQR           :', r(s.iqr()));
}
```

- **Methods invoked:** `quantile(q)`, `percentile(p)`, `iqr()`.
- **Inputs:** `[1, 2, ..., 10]` — a simple monotonic sample.
- **Output:** five numeric lines.
- **Expected output:**

```
=== Example 6: Quantiles, Percentiles, IQR ===
quantile(0.25): 3.25
quantile(0.50): 5.5
quantile(0.75): 7.75
percentile(90): 9.1
IQR           : 4.5
```

- **Reading the output:**
  - **`quantile(0.25) = 3.25`** — the 25th percentile. Using linear interpolation between order statistics: position `0.25·(10−1) = 2.25`, so the value is `sorted[2] + 0.25·(sorted[3] − sorted[2]) = 3 + 0.25·1 = 3.25`.
  - **`quantile(0.50) = 5.5`** — the median. Position `4.5`, between `sorted[4] = 5` and `sorted[5] = 6`. Interpolated: `5.5`.
  - **`quantile(0.75) = 7.75`** — the 75th percentile. Position `6.75`, interpolated between `7` and `8`.
  - **`percentile(90) = 9.1`** — the 90th percentile. `quantile(0.9)`: position `8.1`, interpolated between `9` and `10`.
  - **`IQR = 4.5`** — the interquartile range, `Q3 − Q1 = 7.75 − 3.25 = 4.5`.
- **The interpolation convention:**
  - The library uses **linear interpolation between order statistics** with position `q·(n − 1)`. This is the NumPy default (`method='linear'`) and matches most statistical software.
  - Other conventions (e.g. Hazen, Weibull, Excel's `PERCENTILE.INC`) use different position formulas. The differences matter for small `n`.
- **Why quantiles matter:**
  - **Robustness.** Quantiles are less affected by outliers than mean and standard deviation.
  - **Distribution-free.** No assumption of normality is required.
  - **Interpretability.** The median, quartiles, and 90th percentile are directly meaningful to non-statisticians.
- **The IQR and outlier detection:**
  - The IQR is the spread of the middle 50% of the data.
  - A common outlier-detection rule (Tukey's fences) flags any point below `Q1 − 1.5·IQR` or above `Q3 + 1.5·IQR` as a potential outlier.
  - For this sample: `Q1 − 1.5·IQR = 3.25 − 6.75 = −3.5` and `Q3 + 1.5·IQR = 7.75 + 6.75 = 14.5`. No points are outliers.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`quantile(0)` returns the minimum, `quantile(1)` returns the maximum.** These are defined and useful.
  - **`percentile(p)` takes 0–100, not 0–1.** So `percentile(90)` = `quantile(0.9)`.
  - **Interpolation method matters for small `n`.** For `n = 10`, the difference between interpolation conventions can be visible. If you need exact agreement with a specific software package, check its convention.
  - **`quantile` sorts a copy.** The original Sample is not modified.
  - **Single-element samples.** `quantile(q)` returns the only element for any `q`. This is correct behaviour.

---

## Example 7 — Normalization and Z-Scores (`statsExample7`)

- **Purpose:** Standardize a Sample to zero mean and unit variance (z-score), or rescale it to `[0, 1]`. These are the two most common preprocessing steps for machine learning and control.
- **Source:**

```javascript
function statsExample7() {
  console.log('\n=== Example 7: Normalization and Z-Scores ===');

  const s = new Sample([10, 20, 30, 40, 50]);
  console.log('mean:', r(s.mean()), ' std_s:', r(s.std_s()));

  const z = s.zScore();        // sample z-score, ddof = 1
  console.log('z-score  :', rArr(z.toArray()));
  console.log('mean(z)  :', r(z.mean()));
  console.log('std_p(z) :', r(z.std_p()));

  const mn = s.rescale(0, 1);
  console.log('rescaled :', rArr(mn.toArray()));
  console.log('min/max  :', mn.min(), mn.max());

  try { new Sample([5, 5, 5]).rescale(); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `mean`, `std_s`, `zScore`, `std_p`, `rescale`, `min`, `max`.
- **Inputs:** `[10, 20, 30, 40, 50]` — an evenly spaced sample.
- **Output:** six numeric lines plus a caught error.
- **Expected output:**

```
=== Example 7: Normalization and Z-Scores ===
mean: 30  std_s: 15.8114
z-score  : [ -1.2649, -0.6325, 0, 0.6325, 1.2649 ]
mean(z)  : 0
std_p(z) : 1
rescaled : [ 0, 0.25, 0.5, 0.75, 1 ]
min/max  : 0 1
Error: Cannot rescale a constant Sample
```

- **Reading the output:**
  - **`mean = 30, std_s ≈ 15.81`** — the sample's mean and sample standard deviation.
  - **`z-score`** — the standardized sample. Each value is `(xᵢ − μ) / σ` where σ is the sample standard deviation (`ddof = 1`). The results are symmetric around 0.
  - **`mean(z) = 0`** — the mean of the z-scores is always exactly 0 (up to floating-point).
  - **`std_p(z) = 1`** — the *population* standard deviation of the z-scores is 1. (Because the sample std was used for normalization, the population std of the result is exactly 1.) The sample std would be slightly different.
  - **`rescaled`** — the min–max scaled sample. Values map linearly to `[0, 1]`, with the minimum at 0 and the maximum at 1. Intermediate values are evenly spaced.
  - **`min/max`** — the rescaled sample's extremes are exactly 0 and 1.
  - **`Error: Cannot rescale a constant Sample`** — a constant sample has `mx − mn = 0`, so the rescale would divide by zero. The guard throws.
- **Z-score vs. min-max scaling:**
  - **Z-score** — preserves the shape of the distribution (skewness, kurtosis). The result has mean 0 and unit std. Values are not bounded.
  - **Min-max scaling** — squashes the range to `[0, 1]`. The shape is preserved in the sense of linear mapping, but relative distances are compressed if the data has outliers.
  - **When to use which:** z-score for algorithms that assume Gaussian input (PCA, SVM, neural nets). Min-max for algorithms that expect bounded input (image processing, some neural nets).
- **The two methods in words:**
  - **`normalize(ddof)`** — general method, `ddof` selects population or sample std. `zScore()` is an alias for `normalize(1)`.
  - **`rescale(lo, hi)`** — maps to `[lo, hi]` linearly. Default is `[0, 1]`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`zScore` uses sample std (ddof = 1).** This is the conventional choice for z-scores, matching `scipy.stats.zscore`.
  - **`normalize` with `ddof = 0` uses population std.** The two variants give slightly different results for small samples.
  - **Zero-variance samples cannot be normalized.** Both `normalize` and `zScore` throw.
  - **Min-max rescaling is sensitive to outliers.** A single outlier at the top of the range squashes all other values toward 0.
  - **Rescaled data is a new Sample.** The original is not modified. This is consistent with the rest of the library's non-mutating philosophy.
  - **`rescale` accepts any `[lo, hi]` range.** Passing `[-1, 1]` is common for machine learning. The library supports it directly.

---

## Example 8 — Detrend (`statsExample8`)

- **Purpose:** Remove a polynomial trend from a Sample. This is a common preprocessing step for time-series analysis and signal processing — you often want to analyze the fluctuations around a trend, not the trend itself.
- **Source:**

```javascript
function statsExample8() {
  console.log('\n=== Example 8: Detrend ===');

  const t = Array.from({ length: 10 }, (_, i) => i);
  const y = t.map(i => 2 + 3 * i + 0.1 * i * i);
  const s = new Sample(y);

  const linear = s.detrend(1);
  console.log('original     :', rArr(s.toArray()));
  console.log('detrend(1)   :', rArr(linear.toArray()));

  const quadratic = s.detrend(2);
  console.log('detrend(2)   :', rArr(quadratic.toArray()));
  console.log('mean(detr(2)):', r(quadratic.mean()));
}
```

- **Methods invoked:** `detrend(order)`, `mean`, `toArray`.
- **Inputs:** a quadratic signal `y = 2 + 3t + 0.1t²` for `t = 0, 1, ..., 9`.
- **Output:** three lines showing the original, the linearly detrended signal, and the quadratically detrended signal.
- **Expected output (abridged):**

```
=== Example 8: Detrend ===
original     : [ 2, 5.1, 8.4, 11.9, 15.6, 19.5, 23.6, 27.9, 32.4, 37.1 ]
detrend(1)   : [ ... residuals after linear fit ... ]
detrend(2)   : [ ~0, ~0, ~0, ~0, ~0, ~0, ~0, ~0, ~0, ~0 ]
mean(detr(2)): ~0
```

- **Reading the output:**
  - **`original`** — the quadratic signal.
  - **`detrend(1)`** — subtracts a fitted linear trend (a line). The residuals show the quadratic curvature that remains.
  - **`detrend(2)`** — subtracts a fitted quadratic trend. The residuals are essentially zero (up to floating-point) because the underlying signal is exactly quadratic.
  - **`mean(detr(2))`** — the mean of the residuals. Near zero, confirming the detrending worked.
- **The algorithm:**
  1. Build the design matrix `Φ` where `Φ[i][k] = i^k` for `k = 0, 1, ..., order`.
  2. Solve the normal equations `ΦᵀΦ · β = Φᵀ · y` for the coefficients `β` via Gaussian elimination.
  3. Compute the fitted trend `ŷᵢ = Σₖ βₖ · i^k`.
  4. Return `y − ŷ` as a new Sample.
- **Why detrending matters:**
  - **Time-series analysis.** Most models (AR, MA, ARIMA) assume a stationary mean. Detrending makes the series approximately stationary.
  - **Signal processing.** Extracting the underlying oscillation from a trending signal.
  - **Machine learning.** Removing the dominant trend so the model learns the pattern, not the offset.
- **Order of the trend:**
  - **`order = 0`** — subtract the mean. Removes the constant offset.
  - **`order = 1`** — subtract a fitted line. Removes a constant slope.
  - **`order = 2`** — subtract a fitted parabola. Removes quadratic curvature.
  - **`order = k`** — subtract a fitted degree-`k` polynomial.
- **Coding example:** as shown. The example uses `order = 1` and `order = 2` to show the difference.
- **Common pitfalls:**
  - **`order` must be less than `n`.** A `detrend(10)` on a 10-element sample throws (the fit would be exact and the solution singular).
  - **High orders can overfit.** Using `order = 5` on a short sample fits noise, not trend. Choose based on prior knowledge of the signal.
  - **The fit is in the index domain.** `detrend` assumes the independent variable is `t = 0, 1, ..., n − 1`. If your independent variable is different (e.g. actual time with non-uniform spacing), you need a custom fit.
  - **Numerical conditioning.** For high orders, the design matrix `ΦᵀΦ` becomes ill-conditioned. Orthogonal polynomials (Legendre, Chebyshev) would be more robust but are not implemented.
  - **Singular matrix guard.** The internal solver throws `Singular system in detrend (try a lower order)` if the normal equations cannot be solved.
  - **Detrend does not modify the original.** The result is a new Sample.

---

## Example 9 — Autocorrelation and ACF (`statsExample9`)

- **Purpose:** Measure the self-similarity of a Sample at various lags. Autocorrelation is the primary tool for detecting periodicity, identifying AR model order, and understanding the memory of a time series.
- **Source:**

```javascript
function statsExample9() {
  console.log('\n=== Example 9: Autocorrelation and ACF ===');

  const s = new Sample(
    Array.from({ length: 32 }, (_, i) =>
      Math.sin(2 * Math.PI * i / 16) + 0.1 * (Math.random() - 0.5)
    )
  );

  console.log('autocorr(lag=0):', r(s.autocorrelation(0)));
  console.log('autocorr(lag=1):', r(s.autocorrelation(1)));
  console.log('autocorr(lag=8):', r(s.autocorrelation(8)));

  const acf = s.acf(5);
  console.log('acf(0..5):', rArr(acf));
}
```

- **Methods invoked:** `autocorrelation(lag)`, `acf(maxLag)`.
- **Inputs:** a 32-sample sine wave at half-period 16 samples, plus 10% noise.
- **Output:** four numeric lines.
- **Expected output (abridged):**

```
=== Example 9: Autocorrelation and ACF ===
autocorr(lag=0): 1
autocorr(lag=1): ~0.98
autocorr(lag=8): ~ -1
acf(0..5): [ 1, ~0.98, ~0.92, ~0.83, ~0.70, ~0.55 ]
```

- **Reading the output:**
  - **`autocorr(lag=0) = 1`** — by definition, the autocorrelation at zero lag is 1. The sample is perfectly correlated with itself.
  - **`autocorr(lag=1) ≈ 0.98`** — adjacent samples are nearly identical (the sine wave changes slowly).
  - **`autocorr(lag=8) ≈ −1`** — at half the period (16/2 = 8 samples), the sine wave has completed half an oscillation, so it is anti-correlated with itself. The autocorrelation is close to −1.
  - **`acf(0..5)`** — the first six autocorrelation values. They decay smoothly from 1.
- **What autocorrelation measures:**
  - `ACF(k) = Corr(x[t], x[t+k])` — the correlation between the sample and a lagged version of itself.
  - For a periodic signal, the ACF is also periodic, with the same period.
  - For white noise, the ACF is 1 at lag 0 and approximately 0 at all other lags.
  - For a trending series, the ACF decays slowly (the trend makes consecutive points similar).
- **The two methods:**
  - **`autocorrelation(lag)`** — the autocorrelation at a single lag. Uses Pearson correlation between `x[0..n−lag]` and `x[lag..n]`.
  - **`acf(maxLag)`** — returns an array of autocorrelations from lag 0 to `maxLag` inclusive.
- **Why autocorrelation matters:**
  - **Detecting periodicity.** A peak in the ACF at lag `k` suggests period `k`.
  - **AR model order selection.** The partial autocorrelation function (PACF) cuts off at the AR order; the ACF decays gradually.
  - **Stationarity check.** A slowly decaying ACF indicates non-stationarity (a trend).
  - **Model diagnostics.** The residuals of a good model should have an ACF near zero at all nonzero lags.
- **Coding example:** as shown. The choice of sine wave period (16) and length (32) is deliberate — the sample contains exactly two periods, so the ACF at half-period lag is near −1.
- **Common pitfalls:**
  - **`lag` must satisfy `0 ≤ lag < n`.** Lag 0 is trivially 1; larger lags are less reliable as fewer samples overlap.
  - **Small-sample bias.** The autocorrelation at large lags is biased toward zero because fewer overlapping samples are averaged.
  - **The ACF is not the PACF.** The autocorrelation includes the effect of intermediate lags. The partial autocorrelation removes them. The library does not provide PACF.
  - **Non-stationary data.** For trending data, the ACF decays slowly and is not meaningful as a measure of periodicity. Detrend first.
  - **Zero variance.** A constant Sample has zero variance and undefined correlation. The guard throws.
  - **`acf(maxLag)` returns a plain array, not a Sample.** This makes it easy to plot but not to chain further methods.

---

## Example 10 — Cross-Correlation (`statsExample10`)

- **Purpose:** Measure the similarity between two different samples as a function of lag. Cross-correlation is used in system identification, time-delay estimation, and template matching.
- **Source:**

```javascript
function statsExample10() {
  console.log('\n=== Example 10: Cross-Correlation ===');

  const x = new Sample([0, 0, 1, 1, 1, 0, 0, 0]);
  const y = new Sample([0, 0, 0, 1, 1, 1, 0, 0]);

  const cc = x.crossCorrelation(y, 3);
  console.log('lags :', cc.lags);
  console.log('vals :', rArr(cc.values, 3));
}
```

- **Methods invoked:** `crossCorrelation(other, maxLag)`.
- **Inputs:**
  - `x = [0, 0, 1, 1, 1, 0, 0, 0]` — a pulse centered at index 2.
  - `y = [0, 0, 0, 1, 1, 1, 0, 0]` — a pulse centered at index 3 (delayed by 1).
- **Output:** the lag axis and the corresponding cross-correlation values.
- **Expected output (abridged):**

```
=== Example 10: Cross-Correlation ===
lags : [ -3, -2, -1, 0, 1, 2, 3 ]
vals : [ 0, 0, 0, ~0.5, ~1, ~0.5, 0 ]
```

- **Reading the output:**
  - **`lags`** — the lag axis, symmetric around zero. The library returns lags from `−maxLag` to `+maxLag`.
  - **`vals`** — the normalized cross-correlation at each lag.
  - **Peak at lag +1** — the two pulses are aligned when `x` is shifted by +1 relative to `y`. This means `x[t+1]` matches `y[t]`, i.e. `x` leads `y` by one sample. Equivalently, `y` is a delayed version of `x` by one sample.
  - **The peak value is ~1** — because the pulses have the same shape, the correlation at the correct lag is nearly perfect.
- **What cross-correlation measures:**
  - `CC(lag) = Corr(x[t+lag], y[t])` — the correlation between `x` (shifted) and `y` at a given lag.
  - A peak at lag `k` means `x` and `y` are most similar when `x` is shifted forward by `k`.
  - The sign convention: positive lag = `x` leads `y`; negative lag = `y` leads `x`.
- **The algorithm:**
  - Center both samples.
  - For each lag in `[−maxLag, maxLag]`, compute the dot product of the overlapping portions.
  - Normalize by `√(Σx² · Σy²)` so the result is in `[−1, 1]` (or close to it, depending on the overlap).
- **Why cross-correlation matters:**
  - **Time-delay estimation.** The lag at which the peak occurs is the delay between the two signals.
  - **System identification.** The impulse response of a linear system can be estimated by cross-correlating the input and output.
  - **Template matching.** Finding where a template matches within a longer signal.
  - **Radar and sonar.** Measuring distances from signal round-trip time.
- **Coding example:** as shown. The two pulses are chosen with a known delay of 1, so the peak's location is verifiable by inspection.
- **Common pitfalls:**
  - **Length mismatch throws.** The two samples must be the same length.
  - **Zero variance throws.** If either sample is constant, the denominator is zero, and the correlation is undefined.
  - **Edge effects.** At large lags, only a few samples overlap, and the normalized correlation becomes noisy. Restrict `maxLag` to a small fraction of the sample length.
  - **The normalization is not the same as Pearson correlation.** The library normalizes by `√(Σx² · Σy²)` rather than by the standard deviations of the overlapping portions. This means the peak value can slightly exceed 1 for short samples.
  - **Sign convention.** The library uses the convention `y[t] aligned with x[t+lag]`, so a positive peak means `x` leads `y`. Different tools may use the opposite convention.
  - **`crossCorrelation` returns `{ lags, values }`, not a single number.** This is different from `autocorrelation`, which returns a number.

---

## Example 11 — FFT and Spectrum (`statsExample11`)

- **Purpose:** Compute the discrete Fourier transform of a Sample and extract its one-sided amplitude spectrum. This is the standard tool for frequency-domain analysis.
- **Source:**

```javascript
function statsExample11() {
  console.log('\n=== Example 11: FFT and Spectrum ===');

  const N = 16;
  const fs = 16;   // sample rate = 16 Hz → bin spacing = 1 Hz
  const s = new Sample(
    Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 2 * i / fs))
  );

  const sp = s.spectrum(fs);
  console.log('freqs:', rArr(sp.freqs, 3));
  console.log('amps :', rArr(sp.amps, 3));

  let peakIdx = 0;
  for (let i = 1; i < sp.amps.length; i++) if (sp.amps[i] > sp.amps[peakIdx]) peakIdx = i;
  console.log('peak freq:', sp.freqs[peakIdx], 'Hz');

  try { new Sample([1, 2, 3]).fft(); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `fft()`, `spectrum(sampleRate)`.
- **Inputs:** a 16-sample sine wave at 2 Hz, sampled at 16 Hz.
- **Output:** the frequency axis, the amplitude spectrum, the detected peak, and a caught error.
- **Expected output (abridged):**

```
=== Example 11: FFT and Spectrum ===
freqs: [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ]
amps : [ 0, 0, 0.5, 0, 0, 0, 0, 0, 0 ]
peak freq: 2 Hz
Error: FFT length must be a power of two
```

- **Reading the output:**
  - **`freqs`** — the frequency axis, from 0 to `fs/2 = 8` Hz. There are `n/2 + 1 = 9` bins.
  - **`amps`** — the one-sided amplitude spectrum. The value at 2 Hz is 0.5, which is the amplitude of the sine wave. All other bins are essentially zero (up to floating-point noise).
  - **`peak freq: 2`** — the detected peak frequency. The sine wave was generated at 2 Hz, and the spectrum finds it.
  - **`Error: FFT length must be a power of two`** — the guard correctly flags a non-power-of-two length.
- **What the FFT computes:**
  - The discrete Fourier transform: `X[k] = Σₙ x[n] · exp(−2πi·k·n/N)`.
  - For real input, the spectrum is conjugate-symmetric: `X[N−k] = conj(X[k])`.
  - The one-sided spectrum (via `spectrum`) returns the first `N/2 + 1` bins.
- **The two methods:**
  - **`fft()`** — returns `{ re, im, mag, phase }`, four arrays of length `n`. `re` and `im` are the complex coefficients; `mag` and `phase` are their polar forms.
  - **`spectrum(sampleRate)`** — returns `{ freqs, amps }`, the one-sided amplitude spectrum. Interior bins are scaled by 2 to preserve total power.
- **Why the FFT matters:**
  - **Frequency-domain analysis.** Find the dominant frequencies in a signal.
  - **Filtering.** Design and apply frequency-selective filters.
  - **Convolution.** Fast convolution via `FFT → pointwise multiply → IFFT`.
  - **Spectral estimation.** Power spectral density, periodograms, and their variants.
- **Coding example:** as shown. The example uses a pure sine wave so the spectrum is trivially interpretable.
- **Common pitfalls:**
  - **Length must be a power of two.** The library uses radix-2 Cooley–Tukey. Lengths like 12, 100, or 1000 throw. Zero-pad to the next power of two if needed.
  - **Amplitude scaling.** The spectrum's interior bins are scaled by 2 to account for the negative-frequency mirror. The DC and Nyquist bins are not scaled.
  - **Frequency resolution.** The bin spacing is `fs/N` Hz. For finer resolution, use a longer sample or a lower sample rate.
  - **Spectral leakage.** A non-integer number of cycles in the sample causes energy to leak into adjacent bins. Window functions (Hamming, Hann, Blackman) mitigate this but are not implemented.
  - **No windowing.** The library applies no window by default. For most applications, a Hann window before the FFT reduces leakage.
  - **Real input only.** The library assumes real input. Complex-input FFTs are not supported.

---

## Example 12 — Time-Series Forecasting (`statsExample12`)

- **Purpose:** Fit three different time-series models — simple exponential smoothing (SES), Holt's linear method, and an AR(2) autoregression — and compute prediction intervals. This is the most advanced example in the manual and the capstone of the `Sample` class.
- **Source:**

```javascript
function statsExample12() {
  console.log('\n=== Example 12: Time-Series Forecasting ===');

  const s = new Sample(
    Array.from({ length: 30 }, (_, i) => 10 + 0.5 * i + Math.sin(i / 3))
  );

  const ses = s.ses(0.3);
  console.log('SES  level        :', r(ses.level));
  console.log('SES  forecast(3)  :', rArr(ses.forecast(3)));

  const holt = s.holt({ alpha: 0.4, beta: 0.2 });
  console.log('Holt level / trend:', r(holt.level), '/', r(holt.trend));
  console.log('Holt forecast(3)  :', rArr(holt.forecast(3)));

  const ar = s.ar(2);
  console.log('AR(2) phi         :', rArr(ar.phi));
  console.log('AR(2) intercept   :', r(ar.intercept));
  console.log('AR(2) forecast(3) :', rArr(ar.forecast(3)));

  const pi = s.predictionInterval(ar, 3);
  console.log('AR(2) PI center   :', rArr(pi.center));
  console.log('AR(2) PI lower    :', rArr(pi.lower));
  console.log('AR(2) PI upper    :', rArr(pi.upper));
}
```

- **Methods invoked:** `ses(alpha)`, `holt({alpha, beta})`, `ar(p)`, `predictionInterval(model, k, z)`.
- **Inputs:** a 30-sample series with a linear trend plus a sine wave wiggle: `y(t) = 10 + 0.5t + sin(t/3)`.
- **Output:** several lines showing the fitted parameters and forecasts from each model, plus a prediction interval for the AR(2) model.
- **Expected output (abridged):**

```
=== Example 12: Time-Series Forecasting ===
SES  level        : ~28.5
SES  forecast(3)  : [ ~28.5, ~28.5, ~28.5 ]
Holt level / trend: ~34 / ~0.5
Holt forecast(3)  : [ ~34.5, ~35, ~35.5 ]
AR(2) phi         : [ ~1.6, ~ -0.6 ]
AR(2) intercept   : ~5
AR(2) forecast(3) : [ ~35.1, ~35.6, ~36.0 ]
AR(2) PI center   : [ ~35.1, ~35.6, ~36.0 ]
AR(2) PI lower    : [ ~34.8, ~34.8, ~34.7 ]
AR(2) PI upper    : [ ~35.4, ~36.4, ~37.3 ]
```

- **Reading the output:**
  - **SES level** — the smoothed final level. It lags the actual final value because of the exponential smoothing.
  - **SES forecast(3)** — a flat forecast of length 3. SES assumes no trend, so the forecast is constant at the level.
  - **Holt level / trend** — the estimated current level and slope. For a series with a linear trend of 0.5, the trend parameter should be near 0.5.
  - **Holt forecast(3)** — a linear forecast: `level + k·trend` for `k = 1, 2, 3`. The values increase by approximately the trend each step.
  - **AR(2) phi** — the AR coefficients. For a trending series, `φ₁` is large and positive, and `φ₂` is negative. This is characteristic of a series with a slowly varying trend.
  - **AR(2) intercept** — the constant term, computed so that the model's long-run mean matches the sample mean.
  - **AR(2) forecast(3)** — the first three steps of the AR forecast. Each step uses the previous forecast as input.
  - **Prediction intervals** — the center is the forecast, and the lower/upper bounds are ±`z·σ` where `σ` is the residual standard deviation. For AR models, the interval widens with the horizon because the k-step forecast variance grows.
- **The three forecasting models:**
  - **SES** — a weighted average of past values with exponentially decaying weights. Suitable for series with no trend and no seasonality. Produces a flat forecast.
  - **Holt** — SES with a separate trend component. Suitable for series with a linear trend. Produces a linear forecast.
  - **AR(p)** — a linear regression on the previous `p` values. Suitable for stationary series with autocorrelation. Produces a forecast that decays toward the series mean.
- **The `forecast` API:**
  - Each model returns an object with a `forecast(k)` closure. Calling `forecast(5)` returns an array of length 5 with the projected values.
  - Each model also returns a `forecastOne()` (single value) and a `forecastSample(k)` (returns a Sample).
  - The closures capture the fitted parameters, so they are stable across calls.
- **The prediction interval:**
  - `predictionInterval(model, k, z)` — computes the ±z·σ band around a `k`-step forecast.
  - For AR models, the variance grows as `σ²·(1 + ψ₁² + ... + ψ_{k−1}²)` where the ψ are the MA(∞) coefficients implied by the AR polynomial.
  - For SES and Holt, the interval widens heuristically (variance grows linearly with horizon).
  - Default `z = 1.96` gives a 95% interval.
- **Why forecasting matters:**
  - **Control.** Predictive control uses forecasts to anticipate disturbances.
  - **Anomaly detection.** Deviations from a forecast indicate anomalies.
  - **Planning.** Inventory, scheduling, resource allocation.
  - **Signal denoising.** The fitted values from a model are a smoothed version of the original.
- **Coding example:** as shown. The three models are applied to the same series, so their outputs are directly comparable.
- **Common pitfalls:**
  - **SES is too simple for trending data.** For a series with a clear trend, SES lags behind. Use Holt instead.
  - **Holt assumes a linear trend.** For series with a curved trend, neither SES nor Holt is appropriate. Use AR(2) or higher.
  - **AR requires stationary input.** The series must have constant mean and variance. Detrend first if necessary.
  - **AR order selection.** The library does not provide PACF or AIC for choosing `p`. Inspect the ACF for guidance, or try several `p` values.
  - **Numerical stability.** The Yule–Walker equations are solved via Gaussian elimination with a tolerance of `1e-12`. For ill-conditioned autocorrelation matrices, the solution may be inaccurate.
  - **Forecast horizon limits.** `forecast(k)` accepts any positive integer `k`, but the reliability decreases with `k`. For AR models, forecasts eventually decay to the mean; for Holt, they grow linearly and can become unrealistic.
  - **Prediction interval for SES/Holt is heuristic.** The library widens the interval heuristically rather than from theory. For a rigorous interval, use an ARIMA-based method.

---

## What the Twelve Examples Prove Together

Run in sequence, the twelve examples form a complete verification suite for the `Sample` class:

| Step | What it proves |
|---|---|
| 1. `statsExample1` | Construction, iteration, slicing, cloning all work correctly. |
| 2. `statsExample2` | The five basic descriptive statistics return correct values. |
| 3. `statsExample3` | Population vs. sample variance, and the `ddof` API, behave correctly. |
| 4. `statsExample4` | Covariance and correlation give the expected results on linear and anti-linear samples. |
| 5. `statsExample5` | All three moving-average variants and the EMA return the expected smoothed data. |
| 6. `statsExample6` | Quantile, percentile, and IQR match the standard interpolation convention. |
| 7. `statsExample7` | Z-score standardization and min-max rescaling produce the expected transforms. |
| 8. `statsExample8` | Detrending removes the specified polynomial trend. |
| 9. `statsExample9` | Autocorrelation and ACF detect the periodicity in a sine wave. |
| 10. `statsExample10` | Cross-correlation recovers the known delay between two pulses. |
| 11. `statsExample11` | The FFT and one-sided spectrum place the peak at the expected frequency. |
| 12. `statsExample12` | SES, Holt, and AR all produce sensible forecasts, and prediction intervals widen with horizon. |

If all twelve run and produce sensible output, the `Sample` class is verified end-to-end.

---

## Extending the Examples

### 1. Add a PACF (partial autocorrelation)

The ACF is provided, but the PACF is missing. It is the primary tool for AR order selection: the PACF cuts off at the AR order. Add a method `pacf(maxLag)` that computes partial autocorrelations via the Durbin–Levinson recursion.

### 2. Add ARIMA

The three forecasting models (SES, Holt, AR) each handle a specific case. ARIMA generalizes all three: `ARIMA(p, d, q)` includes differencing (`d`), autoregression (`p`), and moving average (`q`). A natural extension of the library.

### 3. Add a Hann/Hamming window

The FFT has no windowing. Add a `window(type)` method that returns a windowed Sample:

```javascript
hann() { return new Sample(this.data.map((v, i) => v * 0.5 * (1 - Math.cos(2 * Math.PI * i / (this.length - 1))))); }
```

### 4. Add a periodogram

A periodogram is the squared magnitude of the FFT, scaled by the sample length. It is the standard tool for power spectral density estimation.

### 5. Add robust statistics

The mean and variance are not robust to outliers. Add median absolute deviation (MAD), trimmed mean, and winsorized variance.

### 6. Add histograms

A `histogram(bins)` method would return bin edges and counts, useful for distribution analysis and plotting.

### 7. Add a correlation matrix

Given a 2-D array (rows = samples, columns = features), compute the full correlation matrix. This is what `numpy.corrcoef` does.

### 8. Add a two-sample test

Add Welch's t-test, Mann–Whitney U, and Kolmogorov–Smirnov for comparing two samples.

### 9. Add weighted statistics

Some applications (e.g. weighted regression, importance sampling) need weighted means and variances. Add a `weightedMean(weights)` method.

### 10. Add a linear regression

Given two samples `x` and `y`, fit `y = a + bx` and return the coefficients plus R². This duplicates the `caro.linear-1.0.js` function but with a Sample-friendly API.

### 11. Add cross-validation for forecasting

The forecasting models do not include a holdout set. Add a `backtest(model, k)` method that fits on the first `n − k` samples and evaluates on the last `k`.

### 12. Integrate with the control libraries

The most natural extension: feed a `Sample` of control errors into the statistics library to compute tracking metrics (RMS error, ISE, ITAE), then use `pca` or `ar` to analyze the error's structure.

### 13. Add a plot helper

The library returns arrays and Samples. Add a helper that converts a Sample to SVG or Chart.js traces.

### 14. Add multi-dimensional samples

The `Sample` class handles 1-D data. A natural extension is `Matrix`-like samples for multivariate statistics (covariance matrices, PCA, multivariate AR).

---

## Troubleshooting

The following issues are the most common when running the twelve examples.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: Sample data must be an array` | Passed a non-array | Wrap in `new Sample([...])` |
| `Error: Sample data must contain only finite numbers` | `NaN`, `Infinity`, or non-numeric | Filter or coerce the data |
| `Error: Sample is empty` | Called a method on an empty Sample | Check `sample.length > 0` first |
| `Error: Samples must have the same non-zero length` | Length mismatch in `covariance` or `correlation` | Ensure both samples have equal length |
| `Error: Sample variance requires n ≥ 2` | Sample of length 1 | Use `var_p` or add more data |
| `Error: Correlation undefined for zero-variance Sample` | Constant sample | Check `std_p() > 0` |
| `Error: Invalid window size` | `window ≤ 0` or `window > n` | Use `0 < window ≤ length` |
| `Error: Alpha must be in (0, 1]` | `alpha ≤ 0` or `alpha > 1` | Use `0 < alpha ≤ 1` |
| `Error: Invalid lag` | `lag < 0` or `lag ≥ n` | Use `0 ≤ lag < length` |
| `Error: Invalid maxLag` | Same as above | Same |
| `Error: q must be in [0, 1]` | `quantile(q)` with `q` out of range | Use `0 ≤ q ≤ 1` |
| `Error: p must be in [0, 100]` | `percentile(p)` with `p` out of range | Use `0 ≤ p ≤ 100` |
| `Error: Cannot normalize a zero-variance Sample` | Constant sample | Check `std_p() > 0` |
| `Error: Cannot rescale a constant Sample` | Constant sample | Same |
| `Error: Order must be a non-negative integer` | Non-integer or negative order | Use `order ∈ {0, 1, 2, ...}` |
| `Error: Order must be less than Sample length` | `order ≥ n` | Use smaller order |
| `Error: Singular system in detrend` | Rank-deficient design matrix | Use smaller order |
| `Error: Cross-correlation undefined for zero-variance Sample` | Constant sample | Check `std_p() > 0` |
| `Error: FFT length must be a power of two` | Length not a power of 2 | Zero-pad to next power of two |
| `Error: p must be a positive integer` | `ar(0)` or `ar(1.5)` | Use integer `p ≥ 1` |
| `Error: p must be less than Sample length` | `ar(p)` with `p ≥ n` | Use `p < n` |
| `Error: Horizon k must be a positive integer` | `forecast(0)` or `forecast(1.5)` | Use integer `k ≥ 1` |
| `Error: Sample has zero variance` | Constant sample in AR | Check variance first |
| `NaN` in output | Shape mismatch deep inside | Check all input lengths |
| `Infinity` in output | Division by zero not caught | Check the guard conditions |

If a failure is not listed here, the fastest diagnostic is usually to run the twelve examples in order and identify the first one that fails. Most failures are length mismatches or empty-sample guards.

---

## Closing Notes

The `caro.statistics-1.0.js` library is a single-class statistics toolkit built around the `Sample` class. It covers:

- **Descriptive statistics** — min, max, sum, mean, median, variance, standard deviation, quantiles, percentiles.
- **Relationships** — covariance, correlation.
- **Smoothing** — moving averages, exponential moving averages.
- **Transforms** — normalization, z-scoring, rescaling, detrending.
- **Signal analysis** — autocorrelation, ACF, cross-correlation, FFT, spectrum.
- **Forecasting** — SES, Holt, AR, prediction intervals.

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.compensator-1.0.js** — classical control.
- **caro.manipulator-1.0.js** — robot kinematics, dynamics, control.
- **caro.fuzzy-1.0.js** — fuzzy inference and fuzzy PID.
- **caro.anfis-1.0.js** — adaptive neuro-fuzzy inference.
- **caro.ga-1.0.js** — genetic algorithm.
- **caro.ml-1.0.js** — unsupervised clustering.

### The Pattern

Each CaroLab manual follows the same discipline:

1. **A single page of prose** describing the library's scope.
2. **One worked example per public class or feature.**
3. **Expected output documented alongside the code**, so a reader knows what to look for.
4. **Common pitfalls** listed honestly, including limitations and conventions.
5. **An Extending section** showing how to go beyond the example.
6. **A Troubleshooting table** covering the most common runtime errors.

### On Statistics in JavaScript

Statistics is one of the areas where JavaScript's ecosystem is thinnest. Python has `numpy`, `scipy`, `statsmodels`, and `pandas`. R is built for statistics. Julia has `Statistics`, `Distributions`, and `TimeSeries`. JavaScript has essentially nothing in the standard library, and the npm packages that do exist are fragmented and often unmaintained.

`caro.statistics-1.0.js` is a deliberate attempt to fill that gap for the CaroLab ecosystem. It is not a full statistical package — it does not include hypothesis testing, regression diagnostics, ARIMA, or state-space models. What it does include is a curated set of tools that cover the *majority* of practical needs:

- **Smoothing** noisy sensor data.
- **Standardizing** features for machine learning.
- **Analyzing** signals in the frequency domain.
- **Forecasting** simple time series.
- **Detecting** outliers and periodicity.

The library is small, readable, and dependency-free. It works in Node and in the browser. It does not pretend to be `statsmodels`, and it does not try to be everything to everyone. It is a foundation.

The twelve examples in this manual are the ground truth. Every method has a documented expected output, and every guard has a documented error message. When the implementation is correct, the tests pass. When the implementation has a bug, the tests fail with a specific message pointing at the responsible method.

That rhythm — small, verifiable examples with honest documentation — is what keeps a statistics library trustworthy over time.

---

*End of document.*

