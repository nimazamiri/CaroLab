# CaroLab DSP Library

- **Name:** caro.dsp-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Digital Signal Processing](#a-primary-library-for-digital-signal-processing)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
3. [CaroLab DSP Library — Functions List](#carolab-dsp-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Access](#construction--access)
   - [Signal Arithmetic](#signal-arithmetic)
   - [Smoothing & Peak Detection](#smoothing--peak-detection)
   - [Frequency Domain](#frequency-domain)
   - [Filtering](#filtering)
   - [Windowing](#windowing)
   - [Signal Metrics](#signal-metrics)
   - [Utilities & Display](#utilities--display)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Digital Signal Processing

`caro.dsp-1.0.js` is a single-class JavaScript library built around the **`Signal`** object — an immutable-by-convention wrapper around a 1-D waveform (an array of finite numbers plus a `sampleRate`). All filtering, spectral analysis, peak-detection and metric methods operate on a `Signal` instance, and every transform-style method (e.g. `movingAverageCentered`, `butterworth`, `hammingWindow`, `scale`) returns a **new `Signal`** of the same length and sample rate, so calls can be chained.

> **Note on naming:** `Signal` represents a waveform (a time series with a sampling rate), distinct from `caro.statistics-1.0.js`'s `Sample` class, which represents a set of observations for statistical/forecasting analysis. The two are not interchangeable, though both follow the same "construct once, call methods with no data argument" pattern.

The library covers five broad areas:

| Area | Examples |
|---|---|
| Construction & signal sources | `Signal.sineWave`, `Signal.zeros`, `Signal.from`, `Signal.of` |
| Signal arithmetic | `add`, `subtract`, `scale` |
| Peak detection | `peaks`, `findPeaks`, `Signal.peak2peak`, `Signal.frequencyFromPeaks` |
| Frequency domain | `fft`, `dominantFrequency`, `spectrum` |
| Filtering & windowing | `butterworth`, `movingAverageCentered`, `hammingWindow`, `Signal.hamming` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.dsp-1.0.js"></script>
<script>
  const sig = Signal.sineWave(5, 0, 100, 200);
  const freq = sig.dominantFrequency();
  console.log('Dominant frequency:', freq);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const Signal = require('./caro.dsp-1.0.js');

const sig = Signal.sineWave(5, 0, 100, 200);
const freq = sig.dominantFrequency();

console.log('Dominant frequency:', freq);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** data is supplied once, either to the `Signal` **constructor** (`new Signal(data, sampleRate)`) or via one of the static factories (`Signal.sineWave(...)`, `Signal.from(...)`, `Signal.of(...)`, `Signal.zeros(...)`). Instance methods such as `dominantFrequency()` or `butterworth(...)` then take **no data argument** — they operate on the waveform already stored in the instance (`this.data`, `this.sampleRate`). Two-Signal operations (`add`, `subtract`) take the second `Signal` as an explicit argument, mirroring `Sample.covariance(other)` / `Sample.correlation(other)`.

---

## CaroLab DSP Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new Signal` | Builds a Signal from an array of finite numbers and a sample rate |
| 2 | `Signal.sineWave` | Generates a sine-wave Signal from frequency, phase, sample rate and length |
| 3 | `Signal.zeros` | Generates a zero-filled Signal of length `N` |
| 4 | `Signal.from` | Wraps a plain array (+ sample rate) as a Signal |
| 5 | `Signal.of` | Builds a Signal from individual arguments instead of an array |
| 6 | `get` | Returns the value at index `i` |
| 7 | `slice` | Returns a new Signal over `[a, b)` |
| 8 | `clone` | Returns an independent copy of the Signal |
| 9 | `toArray` | Returns the Signal's data as a plain array |
| 10 | `timeAxis` | Returns the time (in seconds) of every sample |
| 11 | `add` | Element-wise addition of two equal-length Signals |
| 12 | `subtract` | Element-wise subtraction of two equal-length Signals |
| 13 | `Signal.add` | Static form of `add` — mirrors `a.add(b)` |
| 14 | `Signal.subtract` | Static form of `subtract` — mirrors `a.subtract(b)` |
| 15 | `scale` | Multiplies every sample by a scalar |
| 16 | `movingAverageCentered` | Symmetric (centered), edge-handled, length-preserving moving average |
| 17 | `peaks` | Local maxima of a smoothed copy of the Signal (no distance/height constraints) |
| 18 | `findPeaks` | Local maxima with minimum distance / minimum height constraints |
| 19 | `Signal.peak2peak` | Inter-peak time deltas from a `findPeaks`/`peaks` result |
| 20 | `Signal.frequencyFromPeaks` | Estimates fundamental frequency from mean inter-peak period |
| 21 | `fft` | Radix-2 Cooley–Tukey Fast Fourier Transform |
| 22 | `dominantFrequency` | Frequency of the highest-magnitude positive-frequency FFT bin |
| 23 | `spectrum` | One-sided amplitude spectrum derived from `fft` |
| 24 | `butterworth` | Butterworth low-pass/high-pass/band-pass filter, optionally zero-phase |
| 25 | `hammingWindow` | Applies a Hamming window to the Signal, returning a new Signal |
| 26 | `Signal.hamming` | Returns the raw Hamming window coefficients for a given length |
| 27 | `rms` | Root-mean-square value of the Signal |
| 28 | `power` | Mean-square (average power) of the Signal |
| 29 | `rmsDb` | RMS expressed in dBFS relative to full scale `1.0` |
| 30 | `padToPow2` | Zero-pads the Signal up to the next power of two (for FFT) |
| 31 | `toString` | Formats the Signal's values as a bracketed, fixed-precision string |
| 32 | `info` | Summary object: length, sample rate, duration, RMS, peak |

*(Construction and access helpers — `constructor`, `Signal.sineWave`, `Signal.zeros`, `Signal.from`, `Signal.of`, `get`, `slice`, `clone`, `toArray`, `timeAxis` — are listed separately under [Construction & Access](#construction--access), as they are not DSP functions in their own right.)*

---

## Detail Description

### Construction & Access

- **Function:** `constructor` / `new Signal(data, sampleRate)`
  **Description:** Creates a new `Signal` from an array of finite numbers and a positive sample rate. Throws if `data` is not an array, contains any non-finite/non-numeric value, or if `sampleRate` is not a positive number.
  **Syntax:** `const sig = new Signal(data, sampleRate);`
  **Input Arguments:** `data`: array of numbers (default `[]`); `sampleRate`: samples per unit time, must be `> 0` (default `1`)
  **Output Arguments:** `sig`: `Signal` instance, with `sig.data`, `sig.length`, `sig.sampleRate`
  **Coding Example:**
  ```javascript
  const sig = new Signal([0, 1, 0, -1, 0], 4);
  ```

- **Function:** `Signal.sineWave`
  **Description:** Generates a pure sine wave as a new Signal, rounded to 3 decimal places.
  **Syntax:** `sig = Signal.sineWave(f, phi, sampleRate, N, amplitude);`
  **Input Arguments:** `f`: frequency (Hz); `phi`: phase offset (radians); `sampleRate`: samples per second (`> 0`); `N`: positive integer sample count; `amplitude`: peak amplitude (default `1`)
  **Output Arguments:** `sig`: `Signal` instance
  **Formula:** `x[n] = amplitude · sin(2π·f·(n / sampleRate) + φ)`
  **Coding Example:**
  ```javascript
  const sig = Signal.sineWave(5, 0, 100, 200); // 5 Hz tone, 100 Hz sample rate, 200 samples
  ```

- **Function:** `Signal.zeros`
  **Description:** Convenience factory for a zero-filled Signal of a given length.
  **Syntax:** `sig = Signal.zeros(N, sampleRate);`
  **Input Arguments:** `N`: positive integer length; `sampleRate`: samples per unit time (default `1`)
  **Output Arguments:** `sig`: `Signal` instance

- **Function:** `Signal.from`
  **Description:** Convenience factory wrapping a plain array (and optional sample rate) as a Signal — equivalent to the constructor.
  **Syntax:** `sig = Signal.from(array, sampleRate);`
  **Input Arguments:** `array`: array of numbers; `sampleRate`: samples per unit time (default `1`)
  **Output Arguments:** `sig`: `Signal` instance

- **Function:** `Signal.of`
  **Description:** Convenience static constructor — builds a Signal from individual arguments instead of an array. Uses the default `sampleRate = 1`.
  **Syntax:** `sig = Signal.of(...values);`
  **Input Arguments:** `values`: numbers, given as separate arguments
  **Output Arguments:** `sig`: `Signal` instance

- **Function:** `get`
  **Description:** Returns the value at index `i`.
  **Syntax:** `v = sig.get(i);`
  **Input Arguments:** `i`: integer index
  **Output Arguments:** `v`: float value

- **Function:** `slice`
  **Description:** Returns a new Signal over the range `[a, b)`, following standard `Array.slice` semantics, preserving `sampleRate`.
  **Syntax:** `sub = sig.slice(a, b);`
  **Input Arguments:** `a`: start index; `b`: end index (exclusive)
  **Output Arguments:** `sub`: `Signal` instance

- **Function:** `clone`
  **Description:** Returns an independent copy of the Signal.
  **Syntax:** `copy = sig.clone();`
  **Output Arguments:** `copy`: `Signal` instance

- **Function:** `toArray`
  **Description:** Returns the Signal's data as a plain array.
  **Syntax:** `arr = sig.toArray();`
  **Output Arguments:** `arr`: array of floats

- **Function:** `timeAxis`
  **Description:** Returns the time, in seconds (or `1/sampleRate` units), of every sample.
  **Syntax:** `t = sig.timeAxis();`
  **Output Arguments:** `t`: array of length `n`
  **Formula:** `t[n] = n / sampleRate`

---

### Signal Arithmetic

- **Function:** `add`
  **Description:** Element-wise addition of this Signal and another Signal of equal length (and, implicitly, comparable sample rate — the result keeps `this.sampleRate`).
  **Syntax:** `c = a.add(b);`
  **Input Arguments:** `other`: `Signal` of the same length
  **Output Arguments:** `c`: `Signal` instance
  **Formula:** `c[i] = a[i] + b[i]`

- **Function:** `subtract`
  **Description:** Element-wise subtraction of this Signal and another Signal of equal length.
  **Syntax:** `c = a.subtract(b);`
  **Input Arguments:** `other`: `Signal` of the same length
  **Output Arguments:** `c`: `Signal` instance
  **Formula:** `c[i] = a[i] - b[i]`

- **Function:** `Signal.add`
  **Description:** Static form of `add` — `Signal.add(a, b)` is equivalent to `a.add(b)`.
  **Syntax:** `c = Signal.add(a, b);`
  **Input Arguments:** `a`, `b`: `Signal` instances of equal length
  **Output Arguments:** `c`: `Signal` instance

- **Function:** `Signal.subtract`
  **Description:** Static form of `subtract` — `Signal.subtract(a, b)` is equivalent to `a.subtract(b)`.
  **Syntax:** `c = Signal.subtract(a, b);`
  **Input Arguments:** `a`, `b`: `Signal` instances of equal length
  **Output Arguments:** `c`: `Signal` instance

- **Function:** `scale`
  **Description:** Multiplies every sample by a scalar. Not part of the original `dsp.txt` list, but a natural companion to `add`/`subtract`.
  **Syntax:** `c = sig.scale(k);`
  **Input Arguments:** `k`: number
  **Output Arguments:** `c`: `Signal` instance
  **Formula:** `c[i] = k · x[i]`

---

### Smoothing & Peak Detection

- **Function:** `movingAverageCentered`
  **Description:** Symmetric (centered), edge-handled, length-preserving moving average — distinct from `Sample.movingAverage`/`movingAverageCausal` in `caro.statistics-1.0.js`, which are causal and either shorten the output or warm up with `null`. Values are rounded to 3 decimal places.
  **Syntax:** `ma = sig.movingAverageCentered(windowSize);`
  **Input Arguments:** `windowSize`: positive integer
  **Output Arguments:** `ma`: `Signal` instance, same length as `sig`
  **Method:** For each index `i`, averages all in-range samples in `[i − half, i + half]` (`half = ⌊windowSize / 2⌋`), where out-of-range indices near the edges are simply omitted from both the sum and the count.

- **Function:** `peaks`
  **Description:** Finds local maxima of a smoothed copy of the Signal (smoothed via `movingAverageCentered`). No minimum-distance or minimum-height constraint — use `findPeaks` for those.
  **Syntax:** `p = sig.peaks(windowSize);`
  **Input Arguments:** `windowSize`: smoothing window size passed to `movingAverageCentered` (default `5`)
  **Output Arguments:** `p`: plain array of `{ index, value }`

- **Function:** `findPeaks`
  **Description:** Finds local maxima of a smoothed copy of the Signal, with a minimum time distance between accepted peaks and a minimum height threshold. Each returned peak also carries its time in seconds.
  **Syntax:** `p = sig.findPeaks({ smoothWindow, minDistance, minHeight });`
  **Input Arguments:** `smoothWindow`: smoothing window size (default `11`); `minDistance`: minimum time between accepted peaks, in seconds (default `0.05`); `minHeight`: minimum accepted peak value (default `-Infinity`)
  **Output Arguments:** `p`: plain array of `{ index, t, value }`, ordered by index

- **Function:** `Signal.peak2peak`
  **Description:** Computes the inter-peak time deltas (in seconds) from a `peaks`/`findPeaks`-shaped array.
  **Syntax:** `deltas = Signal.peak2peak(peaks);`
  **Input Arguments:** `peaks`: array of `{ t, ... }` objects, e.g. from `findPeaks`
  **Output Arguments:** `deltas`: array of length `peaks.length − 1`

- **Function:** `Signal.frequencyFromPeaks`
  **Description:** Estimates the fundamental frequency of a Signal from the mean inter-peak period of a `peaks`/`findPeaks`-shaped array.
  **Syntax:** `f = Signal.frequencyFromPeaks(peaks);`
  **Input Arguments:** `peaks`: array of `{ t, ... }` objects, e.g. from `findPeaks`
  **Output Arguments:** `f`: float value (Hz), or `NaN` if fewer than 2 peaks are supplied
  **Formula:** `f = 1 / mean(Δt between consecutive peaks)`

---

### Frequency Domain

- **Function:** `fft`
  **Description:** Radix-2 Cooley–Tukey Fast Fourier Transform. Requires the Signal length to be a power of two (see `padToPow2`). Returns typed arrays.
  **Syntax:** `result = sig.fft();`
  **Output Arguments:** `result`: `{ re, im, mag, phase }` — each a `Float64Array` of length `N` (full complex spectrum, conjugate-symmetric for real input)

- **Function:** `dominantFrequency`
  **Description:** Finds the frequency of the highest-magnitude bin among the positive frequencies (`k = 1 .. N/2`) of the FFT.
  **Syntax:** `f = sig.dominantFrequency();`
  **Output Arguments:** `f`: float value (Hz)
  **Formula:** `f = argmax_k(mag[k]) · sampleRate / N`, for `1 ≤ k ≤ N/2`

- **Function:** `spectrum`
  **Description:** One-sided amplitude spectrum derived from `fft`, with frequencies in Hz (scaled by `sampleRate`). Interior bins are doubled to preserve total power, matching the output of a typical spectrum analyzer on real input.
  **Syntax:** `result = sig.spectrum();`
  **Output Arguments:** `result`: `{ freqs, amps }` — arrays of length `N/2 + 1`

---

### Filtering

- **Function:** `butterworth`
  **Description:** Butterworth IIR filter — low-pass, high-pass, or band-pass — built from cascaded biquad sections, with optional zero-phase (forward–reverse) filtering to cancel phase distortion. Returns a new Signal of the same length and `sampleRate`.
  **Syntax:** `y = sig.butterworth({ type, cutoff, lowCutoff, highCutoff, order, zeroPhase });`
  **Input Arguments:** `type`: `'lowpass'` (default), `'highpass'`, or `'bandpass'`; `cutoff`: cutoff frequency in Hz, required for `lowpass`/`highpass`; `lowCutoff`, `highCutoff`: band edges in Hz, required for `bandpass` (`lowCutoff < highCutoff`); `order`: filter order, positive integer (default `4`); `zeroPhase`: apply the filter forward then reverse-forward to cancel phase shift (default `true`)
  **Output Arguments:** `y`: `Signal` instance
  **Errors:** `order must be a positive integer`; `lowCutoff must be < highCutoff`; `cutoff must be > 0`; `type must be lowpass, highpass, or bandpass` (from the internal section designer); `Unknown filter type` (from the internal biquad designer)
  **Method:** Designs `⌊order/2⌋` (lowpass/highpass) or `order` (bandpass, centered at `√(lowCutoff·highCutoff)`) cascaded biquad sections via the analog-prototype Butterworth `Q` values, applies each section in sequence (`Signal._applyBiquad`), and — if `zeroPhase` is set — reapplies the whole cascade to the time-reversed output and reverses the result again to cancel phase.

---

### Windowing

- **Function:** `hammingWindow`
  **Description:** Applies a Hamming window to the Signal, returning a new (same-length) windowed Signal — useful before `fft`/`spectrum` to reduce spectral leakage.
  **Syntax:** `y = sig.hammingWindow();`
  **Output Arguments:** `y`: `Signal` instance
  **Formula:** `y[n] = x[n] · (0.54 − 0.46·cos(2πn / (N − 1)))`

- **Function:** `Signal.hamming`
  **Description:** Static windowing helper that returns just the raw Hamming window coefficients (not applied to any Signal).
  **Syntax:** `w = Signal.hamming(N);`
  **Input Arguments:** `N`: integer, `≥ 2`
  **Output Arguments:** `w`: array of length `N`
  **Errors:** `N must be an integer ≥ 2`

---

### Signal Metrics

- **Function:** `rms`
  **Description:** Root-mean-square value of the Signal.
  **Syntax:** `v = sig.rms();`
  **Output Arguments:** `v`: float value
  **Formula:** `rms = √( (Σxᵢ²) / n )`

- **Function:** `power`
  **Description:** Mean-square (average power) of the Signal.
  **Syntax:** `v = sig.power();`
  **Output Arguments:** `v`: float value
  **Formula:** `power = (Σxᵢ²) / n`

- **Function:** `rmsDb`
  **Description:** RMS level expressed in dBFS, relative to full scale `1.0`. Not part of the original `dsp.txt` list, but a natural companion to `rms`.
  **Syntax:** `db = sig.rmsDb();`
  **Output Arguments:** `db`: float value, or `-Infinity` if `rms() === 0`
  **Formula:** `db = 20 · log₁₀(rms)`

---

### Utilities & Display

- **Function:** `padToPow2`
  **Description:** Zero-pads the Signal at the end so its length becomes the next power of two — useful for feeding an arbitrary-length Signal into `fft`/`spectrum`/`dominantFrequency`. Returns a clone unmodified if the length is already a power of two.
  **Syntax:** `padded = sig.padToPow2();`
  **Output Arguments:** `padded`: `Signal` instance, `sampleRate` unchanged

- **Function:** `toString`
  **Description:** Formats the Signal's values as a bracketed, fixed-precision string, e.g. `[1.0000, 0.8000, ...]`.
  **Syntax:** `str = sig.toString(precision);`
  **Input Arguments:** `precision`: decimal places (default `4`)
  **Output Arguments:** `str`: string

- **Function:** `info`
  **Description:** Summary object describing the Signal — handy for quick inspection/logging.
  **Syntax:** `summary = sig.info();`
  **Output Arguments:** `summary`: `{ length, sampleRate, duration, rms, peak }` — `duration`: `length / sampleRate`; `rms`/`peak`: `null` for an empty Signal, otherwise `rms()` and `max(|xᵢ|)` respectively

---

### Internal Helpers

These are implementation details, not part of the public DSP API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `_requireNonEmpty` | Throws `Signal is empty` if the Signal has zero length |
| `_requireSameLength(other)` | Throws `Expected a Signal instance` / `Signals must have the same non-zero length` for two-Signal operations (`add`, `subtract`) |
| `_designButterworthSections({ type, cutoff, lowCutoff, highCutoff, order })` | Builds the cascaded biquad section list for `butterworth`, choosing section count/Q values by filter type and order |
| `Signal._butterworthQ(k, n)` | Computes the analog-prototype Butterworth pole `Q` for section `k` of an order-`n` filter |
| `Signal._designBiquad(type, f1, Q, sampleRate)` | Designs a single RBJ-style biquad (`lowpass`/`highpass`) section's `{ b0, b1, b2, a1, a2 }` coefficients |
| `Signal._applyBiquad(x, c)` | Applies a single biquad section (direct-form difference equation) to a plain array, used by `butterworth`'s forward/reverse passes |

---
