# CaroLab DSP Library — Examples Manual

- **Name:** caro.dsp-1.0.js
- **Release Date:** 30 September 2026
- **Document Name:** DSP Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Signal Construction and Access (`dspExample1`)](#example-1--signal-construction-and-access-dspexample1)
4. [Example 2 — Signal Addition and Subtraction (`dspExample2`)](#example-2--signal-addition-and-subtraction-dspexample2)
5. [Example 3 — Moving Average and Peaks (`dspExample3`)](#example-3--moving-average-and-peaks-dspexample3)
6. [Example 4 — findPeaks with Constraints (`dspExample4`)](#example-4--findpeaks-with-constraints-dspexample4)
7. [Example 5 — FFT and Dominant Frequency (`dspExample5`)](#example-5--fft-and-dominant-frequency-dspexample5)
8. [Example 6 — Two-Tone Signal and Spectral Analysis (`dspExample6`)](#example-6--two-tone-signal-and-spectral-analysis-dspexample6)
9. [Example 7 — Butterworth Low-Pass Filter (`dspExample7`)](#example-7--butterworth-low-pass-filter-dspexample7)
10. [Example 8 — Butterworth High-Pass and Band-Pass (`dspExample8`)](#example-8--butterworth-high-pass-and-band-pass-dspexample8)
11. [Example 9 — Windowing and RMS (`dspExample9`)](#example-9--windowing-and-rms-dspexample9)
12. [Example 10 — Padding for FFT (`dspExample10`)](#example-10--padding-for-fft-dspexample10)
13. [Example 11 — Full Pipeline (`dspExample11`)](#example-11--full-pipeline-dspexample11)
14. [Example 12 — Spectrum Peak Detection (`dspExample12`)](#example-12--spectrum-peak-detection-dspexample12)
15. [What the Twelve Examples Prove Together](#what-the-twelve-examples-prove-together)
16. [Extending the Examples](#extending-the-examples)
17. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the `caro.dsp-1.0.js` library — a **dependency-free digital signal processing toolkit** built around a single `Signal` class.

Where `caro.statistics-1.0.js` handles statistical analysis of 1-D data, `caro.dsp-1.0.js` handles **time-domain and frequency-domain signal processing**: waveform generation, filtering, spectral analysis, and peak detection.

The twelve examples in this manual cover the entire public API:

| Group | Methods |
|---|---|
| Construction | `new Signal(data, fs)`, `Signal.sineWave`, `Signal.zeros`, `Signal.from`, `Signal.of` |
| Access | `get`, `slice`, `clone`, `toArray`, `timeAxis`, `Symbol.iterator` |
| Arithmetic | `add`, `subtract`, `scale`, static `add`/`subtract` |
| Time-domain | `movingAverageCentered`, `peaks`, `findPeaks`, `peak2peak`, `frequencyFromPeaks` |
| Frequency-domain | `fft`, `dominantFrequency`, `spectrum` |
| Filtering | `butterworth` (lowpass, highpass, bandpass) |
| Windows and stats | `hammingWindow`, `Signal.hamming`, `rms`, `power`, `rmsDb` |
| Utilities | `padToPow2`, `info`, `toString` |

### Conventions

| Item | Convention |
|---|---|
| Sample rate | Positive real number; default 1 |
| Length | Number of samples; must be a power of two for FFT |
| Time axis | Seconds, `t[n] = n / sampleRate` |
| Frequency | Hz (cycles per second) |
| Amplitude | Real numbers; typically normalized to `[−1, 1]` |
| Butterworth | Biquad cascade; zero-phase forward–reverse by default |
| FFT output | `{ re, im, mag, phase }` — typed arrays of length N |
| Spectrum | One-sided, `N/2 + 1` bins from 0 to Nyquist |

All examples use **CommonJS** (`require`) and expect the library to be exported as `module.exports = Signal;`.

### Required Files and Layout

```
project/
├── caro.dsp-1.0.js
└── examples/
    └── dsp_examples.js
```

### How to Run the Examples

```
node examples/dsp_examples.js
```

Each of the twelve `dspExampleN()` functions is self-contained and prints its own block.

### Why This Library Matters

Digital signal processing is the layer between raw sensor data and the statistical or control algorithms that consume it. Every practical DSP pipeline needs:

- **Waveform generation** — for testing filters and algorithms.
- **Arithmetic** — to combine and scale signals.
- **Smoothing** — moving averages and windows.
- **Peak detection** — for event timing and frequency estimation.
- **FFT** — for spectral analysis.
- **Filters** — to isolate a band of interest.
- **Metrics** — RMS, power, dB.

Python has `numpy`, `scipy.signal`, and `librosa`. MATLAB has the Signal Processing Toolbox. C has FFTW and hand-rolled biquads. JavaScript has essentially nothing — `caro.dsp-1.0.js` fills that gap for the CaroLab ecosystem.

The library is designed for **real-time and embedded-adjacent use cases**:

- Sensor streams at a few kHz.
- Audio at 8–48 kHz.
- Control loops that need a filter in the loop.

It is **not** a replacement for `scipy.signal`. It does not implement IIR design beyond Butterworth, nor FIR design, nor spectral density estimation, nor filter design by specification. What it does implement is a curated set of primitives that cover the majority of practical needs.

The twelve examples in this manual verify the library against known results: a 440 Hz sine has dominant frequency 440 Hz, a low-pass at 600 Hz attenuates noise above 600 Hz, and the FFT of a two-tone signal shows peaks at the two frequencies.

---

## Examples List

| No. | Function | Purpose |
|---|---|---|
| 1 | `dspExample1` | Construction, access, time axis, factories |
| 2 | `dspExample2` | Signal addition, subtraction, scaling |
| 3 | `dspExample3` | Centered moving average, peaks, frequency from peaks |
| 4 | `dspExample4` | `findPeaks` with distance and height constraints |
| 5 | `dspExample5` | FFT and dominant frequency |
| 6 | `dspExample6` | Two-tone spectrum analysis |
| 7 | `dspExample7` | Butterworth low-pass filter |
| 8 | `dspExample8` | Butterworth high-pass and band-pass |
| 9 | `dspExample9` | Hamming window, RMS, power |
| 10 | `dspExample10` | FFT padding |
| 11 | `dspExample11` | Full pipeline: generate → noise → filter → peaks |
| 12 | `dspExample12` | Spectrum peak detection (from `caro_dsp_ex1.html`) |

---

## Example 1 — Signal Construction and Access (`dspExample1`)

- **Purpose:** Show the four construction patterns — `new Signal`, `Signal.sineWave`, `Signal.zeros`, `Signal.from`, and `Signal.of` — plus `timeAxis`, `toArray`, `info`, and iteration. This is the entry point for every other example.
- **Source:**

```javascript
function dspExample1() {
  console.log('\n=== Example 1: Signal Construction and Access ===');

  const s = Signal.sineWave(440, 0, 8000, 1024, 1.0);

  console.log('info      :', s.info());
  console.log('length    :', s.length);
  console.log('sampleRate:', s.sampleRate);
  console.log('first 5   :', rArr(s.toArray().slice(0, 5)));

  const t = s.timeAxis();
  console.log('time[0..5]:', rArr(t.slice(0, 5), 6));
  console.log('time end  :', r(t[t.length - 1], 6));

  const z = Signal.zeros(8, 100);
  console.log('zeros info:', z.info());

  const f = Signal.from([1, 2, 3, 4, 5], 10);
  console.log('from info :', f.info());

  const o = Signal.of(1, 2, 3, 4);
  console.log('of info   :', o.info());

  console.log('spread    :', [...f]);
}
```

- **Methods invoked:** `Signal.sineWave`, `Signal.zeros`, `Signal.from`, `Signal.of`, `info`, `timeAxis`, `toArray`, `Symbol.iterator` (via spread).
- **Inputs:**
  - `Signal.sineWave(440, 0, 8000, 1024, 1.0)` — a 440 Hz sine, phase 0, at 8 kHz sample rate, 1024 samples, amplitude 1.0.
  - `Signal.zeros(8, 100)` — an 8-sample zero signal at 100 Hz.
  - `Signal.from([1,2,3,4,5], 10)` — a linear ramp at 10 Hz.
  - `Signal.of(1, 2, 3, 4)` — the same data, but variadic.
- **Output:** printed diagnostics for each construction.
- **Expected output (abridged):**

```
=== Example 1: Signal Construction and Access ===
info      : { length: 1024, sampleRate: 8000, duration: 0.128, rms: ~0.7071, peak: 1 }
length    : 1024
sampleRate: 8000
first 5   : [ 0, 0.3387, 0.6375, 0.852, 0.9724 ]
time[0..5]: [ 0, 0.000125, 0.00025, 0.000375, 0.0005 ]
time end  : 0.127875
zeros info: { length: 8, sampleRate: 100, duration: 0.08, rms: 0, peak: 0 }
from info : { length: 5, sampleRate: 10, duration: 0.5, rms: ~3.3166, peak: 5 }
of info   : { length: 4, sampleRate: 1, duration: 4, rms: ~2.7386, peak: 4 }
spread    : [ 1, 2, 3, 4, 5 ]
```

- **Reading the output:**
  - **`info`** — the four key facts about a Signal: `length`, `sampleRate`, `duration = length/sampleRate`, `rms`, and `peak`.
  - **`length`, `sampleRate`** — direct properties. Any Signal has both.
  - **`first 5`** — the first five samples of the sine wave. Because the signal is at 440 Hz sampled at 8 kHz, the phase advances by `2π · 440/8000 ≈ 0.3456` radians per sample, so the values rise smoothly from 0.
  - **`time[0..5]`** — the time axis in seconds, spaced `1/8000 = 0.000125` apart.
  - **`time end`** — the time of the last sample. For a length-1024 signal at 8 kHz, this is `1023/8000 = 0.127875 s`. Note that `duration` is `length/sampleRate = 0.128`, but the last sample *occurs* at `0.127875`. The two conventions are both in use; the library uses `duration` for the total span.
  - **`zeros info`** — a Signal of 8 zeros at 100 Hz. RMS and peak are both zero.
  - **`from info`** — a 5-sample ramp at 10 Hz. RMS is `√(55/5) = √11 ≈ 3.3166`; peak is 5.
  - **`of info`** — same data, default sample rate 1 Hz.
  - **`spread`** — because Signal implements `Symbol.iterator`, it can be spread into a plain array.
- **The five construction patterns:**
  - **`new Signal(data, fs)`** — the primary constructor. Validates finite numbers, positive sample rate.
  - **`Signal.sineWave(f, phi, fs, N, amp)`** — the "signal source" factory. Rounds each sample to three decimals to keep the data clean.
  - **`Signal.zeros(N, fs)`** — a zero signal.
  - **`Signal.from(array, fs)`** — from a plain array, no rounding.
  - **`Signal.of(...values)`** — variadic, default sample rate 1.
- **The `info()` method:**
  - Returns `{ length, sampleRate, duration, rms, peak }`.
  - For an empty Signal, `rms` and `peak` are `null`.
  - `peak` is the maximum absolute value, useful for checking headroom.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`sampleRate` must be positive.** Zero or negative throws.
  - **Data must be finite numbers.** `NaN` and `Infinity` throw.
  - **`sineWave` rounds to 3 decimals.** The rounding is intentional (clean output for demos) but introduces a small quantization error. For high-precision work, use `Signal.from(...)` with a hand-built array.
  - **`duration` vs. last-sample time.** `duration = length/sampleRate`, but the last sample occurs at `(length−1)/sampleRate`. Use `timeAxis()` for the actual time of each sample.
  - **`timeAxis()` returns a new array every call.** For large signals, cache the result.

---

## Example 2 — Signal Addition and Subtraction (`dspExample2`)

- **Purpose:** Combine two signals by adding or subtracting, scale a signal by a constant, and see how RMS changes. This is the arithmetic layer of the DSP library.
- **Source:**

```javascript
function dspExample2() {
  console.log('\n=== Example 2: Signal Addition and Subtraction ===');

  const s1 = Signal.sineWave(10, 0, 1000, 1000, 1.0);
  const s2 = Signal.sineWave(20, 0, 1000, 1000, 0.5);

  const sum = s1.add(s2);
  const diff = s1.subtract(s2);

  console.log('s1 rms:', r(s1.rms()));
  console.log('s2 rms:', r(s2.rms()));
  console.log('sum rms:', r(sum.rms()));
  console.log('diff rms:', r(diff.rms()));

  const same = Signal.add(s1, s2);
  console.log('static add matches instance:', same.rms() === sum.rms());

  const loud = s2.scale(2);
  console.log('loud rms (should be 2× s2):', r(loud.rms()));

  try { s1.add(Signal.zeros(100, 1000)); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `add`, `subtract`, `scale`, `Signal.add`, `rms`.
- **Inputs:**
  - `s1` — a 10 Hz sine at 1 kHz, amplitude 1.0.
  - `s2` — a 20 Hz sine at 1 kHz, amplitude 0.5.
- **Output:** six numeric lines plus a caught error.
- **Expected output:**

```
=== Example 2: Signal Addition and Subtraction ===
s1 rms: 0.7071
s2 rms: 0.3536
sum rms: 0.7906
diff rms: 0.7906
static add matches instance: true
loud rms (should be 2× s2): 0.7071
Error: Signals must have the same non-zero length
```

- **Reading the output:**
  - **`s1 rms = 0.7071`** — the RMS of a unit-amplitude sine is `1/√2 ≈ 0.7071`.
  - **`s2 rms = 0.3536`** — half the amplitude → half the RMS.
  - **`sum rms ≈ 0.7906`** — because the two sines are at different frequencies, they are orthogonal; the RMS of the sum is `√(0.7071² + 0.3536²) ≈ 0.7906`.
  - **`diff rms ≈ 0.7906`** — same magnitude because subtraction of orthogonal signals also gives the quadrature sum.
  - **`static add matches instance: true`** — `Signal.add(a, b)` is equivalent to `a.add(b)`.
  - **`loud rms`** — scaling `s2` by 2 doubles its RMS.
  - **Error message** — length mismatch is caught.
- **The three arithmetic methods:**
  - **`add(other)`** — element-wise sum. Requires equal length.
  - **`subtract(other)`** — element-wise difference. Requires equal length.
  - **`scale(k)`** — multiply every sample by `k`.
- **Why RMS adds in quadrature:**
  - For two uncorrelated signals, `RMS(a + b)² = RMS(a)² + RMS(b)²`. This is the superposition of power, not amplitude.
  - If the signals were correlated (same frequency, same phase), the sum's RMS would be `RMS(a) + RMS(b)` — a linear amplitude addition.
  - This distinction is fundamental to signal processing and is verified here.
- **Static vs. instance form:**
  - `Signal.add(a, b)` and `a.add(b)` are equivalent. The static form mirrors the free-function convention from the original `dsp.txt`; the instance form is more idiomatic in JavaScript.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Lengths must match.** Adding signals of different lengths throws.
  - **Empty signals throw.** `_requireSameLength` also checks that `length > 0`.
  - **Sample rates are not checked.** Adding a signal at 8 kHz to one at 16 kHz will succeed if lengths match, but the result is meaningless. The library does not enforce sample-rate consistency.
  - **No broadcasting.** `add` is strictly element-wise. To add a scalar, use `scale` (multiply) or construct a constant signal.
  - **The output preserves the first signal's sample rate.** This is correct for same-rate additions but again, the library does not check.

---

## Example 3 — Moving Average and Peaks (`dspExample3`)

- **Purpose:** Smooth a signal with a centered moving average, then find its peaks and estimate the fundamental frequency. This is the classic time-domain period-detection workflow.
- **Source:**

```javascript
function dspExample3() {
  console.log('\n=== Example 3: Moving Average and Peaks ===');

  const s1 = Signal.sineWave(10, 0, 1000, 1000, 1.0);
  const s2 = Signal.sineWave(100, 0, 1000, 1000, 0.3);
  const mixed = s1.add(s2);

  const smoothed = mixed.movingAverageCentered(11);
  console.log('smoothed rms:', r(smoothed.rms()));

  const p1 = smoothed.peaks(5);
  console.log('peaks found:', p1.length);
  console.log('first 3   :', p1.slice(0, 3));

  const deltas = Signal.peak2peak(p1);
  console.log('deltas (s):', rArr(deltas.slice(0, 5), 4));

  const fEst = Signal.frequencyFromPeaks(p1);
  console.log('estimated f:', r(fEst, 2), 'Hz');
}
```

- **Methods invoked:** `movingAverageCentered`, `peaks`, `Signal.peak2peak`, `Signal.frequencyFromPeaks`, `rms`.
- **Inputs:**
  - `mixed` — a sum of 10 Hz and 100 Hz sines, sampled at 1 kHz.
  - `windowSize = 11` for the moving average.
  - `windowSize = 5` for the peak smoother.
- **Output:** five numeric/array lines.
- **Expected output (abridged):**

```
=== Example 3: Moving Average and Peaks ===
smoothed rms: ~0.71
peaks found: ~10
first 3   : [ { index: ~50, value: ~1 }, { index: ~150, value: ~1 }, { index: ~250, value: ~1 } ]
deltas (s): [ ~0.1, ~0.1, ~0.1, ~0.1, ~0.1 ]
estimated f: ~10 Hz
```

- **Reading the output:**
  - **`smoothed rms`** — the RMS of the smoothed signal. Since the moving average attenuates the 100 Hz component, the RMS is close to the RMS of the 10 Hz component (0.71).
  - **`peaks found`** — approximately 10 peaks across 1 second. At 10 Hz, that's one peak per 0.1 s.
  - **`first 3 peaks`** — the first three peaks with their indices and values.
  - **`deltas`** — the inter-peak time deltas. All approximately 0.1 s, as expected for a 10 Hz sine.
  - **`estimated f`** — the frequency from the peaks: `1/0.1 = 10 Hz`. Matches the true frequency of the slow component.
- **Why smooth before finding peaks:**
  - The raw signal has both a 10 Hz and a 100 Hz component. Local maxima of the raw signal occur at the 100 Hz rate — not the fundamental.
  - Smoothing with an 11-sample window attenuates the 100 Hz component (which has period 10 samples) and preserves the 10 Hz component (period 100 samples).
  - The peak finder then correctly identifies the 10 Hz peaks.
- **The three methods:**
  - **`movingAverageCentered(windowSize)`** — a symmetric, centered moving average. Preserves the length of the signal. Edge samples are averaged over fewer points (avoids the boundary artifacts of a strict "valid-only" moving average).
  - **`peaks(windowSize)`** — smooths, then finds local maxima. Returns `[{ index, value }, ...]`.
  - **`Signal.peak2peak(peaks)`** — inter-peak time deltas, in seconds.
  - **`Signal.frequencyFromPeaks(peaks)`** — `1 / mean(deltas)`.
- **Coding example:** as shown. The choice of window sizes (11 for smoothing, 5 for the peaks) is a common starting point.
- **Common pitfalls:**
  - **Window size matters.** A window that is too small does not attenuate the high-frequency component. A window that is too large attenuates the fundamental too.
  - **`peaks` finds *local* maxima.** For a noisy signal, this can produce many false peaks. Use `findPeaks` with `minDistance` and `minHeight` for more control.
  - **Even vs. odd window size.** The library handles both; the centered window is `[i − floor(window/2), i + floor(window/2)]`. For even windows, this is slightly asymmetric — prefer odd windows.
  - **`peak2peak` is a static method.** It takes the peaks array, not a Signal.
  - **`frequencyFromPeaks` returns `NaN` for fewer than 2 peaks.** Check `peaks.length` before using.
  - **Peak-to-peak deltas are computed from the smoothed signal.** The peak positions are accurate to ±half the window size, so the frequency estimate has a matching uncertainty.

---

## Example 4 — findPeaks with Constraints (`dspExample4`)

- **Purpose:** Use the constrained peak finder to detect peaks with a minimum separation and a minimum height. This is the right tool for real signals, where noise produces spurious peaks that a simple local-max detector would report.
- **Source:**

```javascript
function dspExample4() {
  console.log('\n=== Example 4: findPeaks with Constraints ===');

  const s = Signal.from(
    Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 1000))
  );

  const peaks = s.findPeaks({
    smoothWindow: 11,
    minDistance: 0.05,
    minHeight: 0.2
  });
  console.log('peaks found:', peaks.length);
  console.log('first 5   :', peaks.slice(0, 5));

  console.log('f from peaks:', r(Signal.frequencyFromPeaks(peaks), 2), 'Hz');
}
```

- **Methods invoked:** `findPeaks`, `Signal.frequencyFromPeaks`.
- **Inputs:**
  - `s` — a 5 Hz sine wave at 1 kHz sample rate, 1000 samples (1 second).
  - `smoothWindow = 11` — smooth over 11 samples before finding peaks.
  - `minDistance = 0.05` — minimum separation between peaks, in seconds (50 ms).
  - `minHeight = 0.2` — minimum peak height.
- **Output:** three lines.
- **Expected output:**

```
=== Example 4: findPeaks with Constraints ===
peaks found: 5
first 5   : [ { index: ~100, t: ~0.1, value: ~1 }, { index: ~300, t: ~0.3, value: ~1 }, ... ]
f from peaks: 5 Hz
```

- **Reading the output:**
  - **`peaks found`** — 5 peaks across 1 second, corresponding to the 5 Hz sine.
  - **`first 5 peaks`** — each peak has `index` (sample number), `t` (time in seconds), and `value` (smoothed amplitude).
  - **`f from peaks`** — the frequency estimate, `1/mean(deltas) = 5 Hz`.
- **The three constraints:**
  - **`smoothWindow`** — the moving average window size before peak detection. Larger = smoother, fewer false peaks, but slower.
  - **`minDistance`** — the minimum time between peaks, in seconds. Any pair of local maxima closer than this is collapsed to the larger one.
  - **`minHeight`** — the minimum amplitude. Peaks below this are discarded.
- **The algorithm:**
  1. Smooth the signal with a centered moving average of size `smoothWindow`.
  2. Walk through the smoothed samples. A sample is a peak if it is strictly greater than its predecessor and greater than or equal to its successor.
  3. Apply `minHeight` and `minDistance` filters to the candidate peaks.
  4. Return the surviving peaks with `{ index, t, value }`.
- **`findPeaks` vs. `peaks`:**
  - **`peaks(windowSize)`** — the simple version. Only takes a window size, returns `{ index, value }` (no time).
  - **`findPeaks({ smoothWindow, minDistance, minHeight })`** — the constrained version. Adds `t` (time) and the constraints.
  - Use `peaks` for clean, well-behaved signals. Use `findPeaks` for noisy or real-world signals.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`minDistance` is in seconds, not samples.** The library converts internally using the signal's `sampleRate`.
  - **`minHeight` defaults to `-Infinity`.** Every peak passes if you don't set it.
  - **`minDistance` uses "keep the larger" logic.** If two peaks are closer than `minDistance`, the one with larger `value` is kept. This can cause the earlier peak to be discarded.
  - **The smoothing window affects peak positions.** A large `smoothWindow` shifts the peak location slightly. For precise timing, use a smaller window.
  - **No sub-sample interpolation.** Peak times are integer sample counts divided by `sampleRate`. For higher precision, fit a parabola to the three samples around each peak.

---

## Example 5 — FFT and Dominant Frequency (`dspExample5`)

- **Purpose:** Compute the discrete Fourier transform of a signal and extract its dominant frequency. This is the entry point for frequency-domain analysis.
- **Source:**

```javascript
function dspExample5() {
  console.log('\n=== Example 5: FFT and Dominant Frequency ===');

  const fs = 1024;
  const N = 1024;
  const s = Signal.sineWave(100, 0, fs, N, 1.0);

  const { re, im, mag, phase } = s.fft();
  console.log('re length  :', re.length);
  console.log('mag peak   :', r(Math.max(...mag), 2));

  console.log('dominant f :', s.dominantFrequency(), 'Hz');

  const sp = s.spectrum();
  console.log('freqs[0..5]:', rArr(sp.freqs.slice(0, 5)));
  console.log('amps[0..5] :', rArr(sp.amps.slice(0, 5)));
}
```

- **Methods invoked:** `fft`, `dominantFrequency`, `spectrum`.
- **Inputs:** a 100 Hz sine at 1024 Hz sample rate, 1024 samples.
- **Output:** five lines.
- **Expected output:**

```
=== Example 5: FFT and Dominant Frequency ===
re length  : 1024
mag peak   : 512
dominant f : 100 Hz
freqs[0..5]: [ 0, 1, 2, 3, 4 ]
amps[0..5] : [ 0, 0, 0, 0, 0 ]
```

- **Reading the output:**
  - **`re length`** — the FFT output length equals the input length. The transform is 1024-point.
  - **`mag peak`** — the maximum magnitude in the spectrum. For a unit-amplitude sine, the peak magnitude is `N/2 = 512` (since the energy is split between positive and negative frequencies).
  - **`dominant f`** — the frequency of the maximum magnitude bin. For a 100 Hz sine sampled at 1024 Hz with 1024 samples, the bin resolution is `fs/N = 1 Hz`, so the 100th bin is exactly 100 Hz.
  - **`freqs[0..5]`** — the one-sided frequency axis, 0 to 5 Hz.
  - **`amps[0..5]`** — the amplitudes at those bins. The 100 Hz peak is further along the array (at index 100).
- **The three methods:**
  - **`fft()`** — full complex FFT. Returns `{ re, im, mag, phase }`, each a `Float64Array` of length N.
  - **`dominantFrequency()`** — the frequency of the largest magnitude bin in the positive-frequency half.
  - **`spectrum()`** — a one-sided amplitude spectrum. Returns `{ freqs, amps }`, each of length `N/2 + 1`.
- **The FFT algorithm:**
  - Radix-2 Cooley–Tukey. Requires N to be a power of two.
  - O(N log N) time.
  - Bit-reversal permutation followed by butterflies.
- **The one-sided spectrum:**
  - For real input, the spectrum is conjugate-symmetric: `X[N−k] = conj(X[k])`.
  - The one-sided spectrum keeps bins 0 to N/2 (DC to Nyquist).
  - Interior bins are multiplied by 2 to preserve total power.
- **Why the FFT matters:**
  - **Frequency analysis.** Find the dominant frequencies in a signal.
  - **Filtering.** Design frequency-selective filters by manipulating the spectrum.
  - **Convolution.** Fast convolution via `FFT → multiply → IFFT`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **N must be a power of two.** Lengths like 1000 or 1024 are fine; 1001 or 500 are not. Use `padToPow2()` to fix.
  - **Bin resolution is `fs/N`.** For finer frequency resolution, use a longer signal or a lower sample rate.
  - **Spectral leakage.** A signal with a non-integer number of cycles causes energy to spread into adjacent bins. Apply a window (Hamming, Hann) to mitigate.
  - **`dominantFrequency` scans only the positive-frequency half.** This is correct for real input but ignores the mirror at negative frequencies.
  - **The magnitude peak is `N/2` for a unit sine.** To recover the original amplitude, divide by `N/2`. The `spectrum()` method does this automatically.
  - **No zero-padding.** The library uses the input length as-is. For interpolated spectra, pad to a longer power of two before the FFT.

---

## Example 6 — Two-Tone Signal and Spectral Analysis (`dspExample6`)

- **Purpose:** Build a signal with two tones, compute its spectrum, and identify both peaks. This is the canonical test of a spectral analysis pipeline.
- **Source:**

```javascript
function dspExample6() {
  console.log('\n=== Example 6: Two-Tone Signal and Spectral Analysis ===');

  const Fs = 1024;
  const N = 1024;

  const x1 = Signal.sineWave(100, 0, Fs, N, 0.5);
  const x2 = Signal.sineWave(250, 0, Fs, N, 0.3);
  const x = x1.add(x2);

  const { freqs, amps } = x.spectrum();

  const peakBins = [];
  for (let k = 1; k <= N / 2; k++) {
    if (amps[k] > 0.1) peakBins.push(k);
  }
  console.log('peak bins:', peakBins.map(k => `${k} → ${r(k * Fs / N, 1)} Hz`));

  console.log('expected: 100 Hz and 250 Hz');
}
```

- **Methods invoked:** `Signal.sineWave`, `add`, `spectrum`.
- **Inputs:**
  - `x1` — a 100 Hz sine at 1024 Hz, amplitude 0.5.
  - `x2` — a 250 Hz sine at 1024 Hz, amplitude 0.3.
  - `x` — their sum.
- **Output:** the detected peak bins.
- **Expected output:**

```
=== Example 6: Two-Tone Signal and Spectral Analysis ===
peak bins: [ '100 → 100 Hz', '250 → 250 Hz' ]
expected: 100 Hz and 250 Hz
```

- **Reading the output:**
  - **Peak bins** — the indices of the spectrum bins with magnitude above the threshold `0.1`. Each bin is reported with its corresponding frequency.
  - **Two peaks** — exactly what we expect: one at 100 Hz (from `x1`), one at 250 Hz (from `x2`).
  - **Bin frequencies** — because `N = Fs = 1024`, the bin resolution is `Fs/N = 1 Hz`, so bin `k` corresponds to `k Hz`.
- **Why the peak threshold matters:**
  - The spectrum of a two-tone signal has two strong peaks and many small ripple bins (from spectral leakage and rounding).
  - A threshold (0.1 in this example) filters out the ripple and keeps only the true peaks.
  - The threshold should be chosen based on the expected amplitude of the tones. `0.1` is a reasonable default for amplitudes around 0.5.
- **What the example demonstrates:**
  - **Additivity in the time domain.** The sum of two sines is just their sample-wise sum.
  - **Superposition in the frequency domain.** The spectrum of the sum is the sum of the spectra — but only because the two tones are at distinct frequencies.
  - **Peak detection.** Simple thresholding of the spectrum recovers the frequencies.
- **Coding example:** as shown. The threshold `0.1` and the frequency mapping `k * Fs / N` are the key details.
- **Common pitfalls:**
  - **The threshold is empirical.** For different amplitudes, you need a different threshold. A relative threshold (e.g. 10% of the max magnitude) is often more robust.
  - **Bin resolution limits accuracy.** Frequencies between bins appear as energy spread across adjacent bins. To distinguish tones closer than `Fs/N` Hz, use a longer signal.
  - **Leakage causes false peaks.** A signal with a non-integer number of cycles spreads its energy. Apply a Hamming or Hann window before the FFT to reduce leakage.
  - **The spectrum is real-valued amplitude.** For phase information, use the full `fft()` output, not `spectrum()`.
  - **Peak picking does not return the peak value.** The example returns only the bin indices. Add `amps[k].toFixed(2)` to see the values.
  - **Two-tone signals are not the same as a signal with two harmonics.** Two unrelated tones add linearly in the spectrum; harmonics of a single tone are also additive but relate to the fundamental.

---

## Example 7 — Butterworth Low-Pass Filter (`dspExample7`)

- **Purpose:** Apply a Butterworth low-pass filter to a noisy sine wave, demonstrating the library's filtering capability. This is the most common DSP operation: isolate a signal from noise above a certain frequency.
- **Source:**

```javascript
function dspExample7() {
  console.log('\n=== Example 7: Butterworth Low-Pass Filter ===');

  const fs = 8000;
  const s = Signal.sineWave(440, 0, fs, 1024, 1.0);

  const noise = Signal.from(
    Array.from({ length: 1024 }, () => (Math.random() - 0.5) * 0.2)
  );
  const noisy = s.add(noise);
  console.log('rms noisy  :', r(noisy.rms()));

  const clean = noisy.butterworth({ type: 'lowpass', cutoff: 600, order: 4 });
  console.log('rms clean  :', r(clean.rms()));

  console.log('dominant f :', clean.dominantFrequency(), 'Hz');

  console.log('rms noisy dB:', r(noisy.rmsDb(), 2));
  console.log('rms clean dB:', r(clean.rmsDb(), 2));
}
```

- **Methods invoked:** `butterworth`, `rms`, `dominantFrequency`, `rmsDb`.
- **Inputs:**
  - `s` — a 440 Hz sine at 8 kHz, 1024 samples, amplitude 1.0.
  - `noise` — uniform random in `[−0.1, 0.1]`.
  - `noisy` — the sum.
  - Filter: low-pass at 600 Hz, order 4.
- **Output:** five lines.
- **Expected output:**

```
=== Example 7: Butterworth Low-Pass Filter ===
rms noisy  : 0.7147
rms clean  : 0.7074
dominant f : 440 Hz
rms noisy dB: -2.91
rms clean dB: -3.01
```

- **Reading the output:**
  - **`rms noisy ≈ 0.7147`** — the noisy signal's RMS. Slightly higher than the clean sine's RMS (0.7071) because the noise adds power.
  - **`rms clean ≈ 0.7074`** — after filtering, the RMS is close to the pure sine's RMS. The filter has removed most of the noise power.
  - **`dominant f = 440 Hz`** — the filter did not affect the signal's dominant frequency.
  - **`rms noisy dB ≈ −2.91`** — the noisy RMS in dBFS (`20·log10(0.7147)`).
  - **`rms clean dB ≈ −3.01`** — very close to the ideal `20·log10(1/√2) = −3.0103`.
- **The Butterworth filter:**
  - A maximally-flat magnitude response. No ripple in either band; monotonic roll-off.
  - The `order` parameter controls the steepness of the roll-off. Higher order = steeper transition, more phase distortion, more numerical sensitivity.
  - The library implements it as a cascade of biquad sections (second-order IIR filters).
- **The `butterworth` API:**
  - **`type`** — `'lowpass'`, `'highpass'`, or `'bandpass'`.
  - **`cutoff`** — for lowpass and highpass, the `−3 dB` frequency.
  - **`lowCutoff`, `highCutoff`** — for bandpass.
  - **`order`** — the filter order.
  - **`zeroPhase`** — if `true` (default), filters forward then backward, producing zero phase distortion. If `false`, filters forward only, producing a causal filter with phase delay.
- **Zero-phase forward-reverse filtering:**
  - Applied forward: the signal passes through the filter with phase delay.
  - Reversed: the phase delay becomes a phase lead.
  - Re-applied forward: the delays cancel, giving zero net phase shift.
  - Cost: effective filter order is doubled, and edge transients appear at both ends.
  - Benefit: the filtered signal is time-aligned with the input.
- **Why the RMS drops after filtering:**
  - The noise is broadband (uniform white noise has energy across all frequencies).
  - The low-pass filter removes the noise above 600 Hz.
  - The remaining noise below 600 Hz contributes less power than the full-band noise.
  - The signal (440 Hz) is unaffected (below the cutoff).
  - So the filtered RMS is closer to the pure sine's RMS.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Cutoff must be positive and less than `fs/2`.** Above Nyquist, the filter design breaks down.
  - **Order affects numerical stability.** High orders (>8) can cause ill-conditioned biquad sections and unstable IIR recursion.
  - **Zero-phase introduces edge transients.** The forward-reverse approach creates a "startup" and "shutdown" transient at the ends. Trim the first and last few samples if this matters.
  - **The filter is IIR, not FIR.** It is computationally cheap (a few multiplies per sample) but has a nonlinear phase response when used causally.
  - **The library does not implement filter design by specification.** If you need a specific transition width, you have to choose the order manually.
  - **Rounding.** The library rounds sine wave samples to 3 decimals. This introduces a tiny quantization error, visible in the `0.7147` vs. `0.7146` difference.

---

## Example 8 — Butterworth High-Pass and Band-Pass (`dspExample8`)

- **Purpose:** Exercise the high-pass and band-pass variants of the Butterworth filter. The examples are chosen so you can predict the output from the filter's frequency response.
- **Source:**

```javascript
function dspExample8() {
  console.log('\n=== Example 8: Butterworth High-Pass and Band-Pass ===');

  const fs = 8000;
  const s = Signal.sineWave(1000, 0, fs, 1024, 1.0);

  const hp = s.butterworth({ type: 'highpass', cutoff: 500, order: 4 });
  console.log('HP rms     :', r(hp.rms()));

  const hp2 = s.butterworth({ type: 'highpass', cutoff: 2000, order: 4 });
  console.log('HP2 rms    :', r(hp2.rms()));

  const bp = s.butterworth({
    type: 'bandpass',
    lowCutoff: 800,
    highCutoff: 1200,
    order: 4
  });
  console.log('BP rms     :', r(bp.rms()));
}
```

- **Methods invoked:** `butterworth` (highpass and bandpass variants), `rms`.
- **Inputs:** a 1000 Hz sine at 8 kHz, 1024 samples, amplitude 1.0.
- **Output:** three lines.
- **Expected output (abridged):**

```
=== Example 8: Butterworth High-Pass and Band-Pass ===
HP rms     : ~0.71    (passes: 1000 > 500)
HP2 rms    : ~0.03    (attenuates: 1000 < 2000)
BP rms     : ~0.71    (passes: 800 < 1000 < 1200)
```

- **Reading the output:**
  - **`HP rms ≈ 0.71`** — the high-pass with cutoff 500 Hz passes the 1000 Hz signal essentially unchanged. RMS ≈ `1/√2`.
  - **`HP2 rms ≈ 0.03`** — the high-pass with cutoff 2000 Hz attenuates the 1000 Hz signal. The filter's stop-band attenuation at 1 octave below the cutoff is significant.
  - **`BP rms ≈ 0.71`** — the band-pass from 800 to 1200 Hz passes 1000 Hz. RMS ≈ `1/√2`.
- **High-pass behavior:**
  - Frequencies above the cutoff pass with gain ≈ 1.
  - Frequencies below the cutoff are attenuated by `−20·order dB` per decade.
  - For a 4th-order filter, one octave below cutoff gives about `−24 dB`, i.e. a factor of 16 attenuation.
- **Band-pass behavior:**
  - The band is `[lowCutoff, highCutoff]`.
  - Frequencies inside the band pass with gain ≈ 1.
  - Frequencies outside the band are attenuated.
  - The center frequency is `√(lowCutoff · highCutoff)`, the geometric mean. For 800–1200 Hz, the center is `√960000 ≈ 980 Hz`.
- **The three filter types:**
  - **Low-pass** — passes frequencies below `cutoff`.
  - **High-pass** — passes frequencies above `cutoff`.
  - **Band-pass** — passes frequencies between `lowCutoff` and `highCutoff`.
- **The `Q` parameter:**
  - The library computes `Q` automatically from the Butterworth poles.
  - For a band-pass, the effective `Q` is `center / bandwidth · Qb`, where `Qb` is the Butterworth pole's `Q`.
  - Higher `Q` = narrower band, sharper roll-off.
- **Coding example:** as shown. The three filters are applied to the same 1000 Hz signal, so the RMS differences reflect the filter's frequency response at that frequency.
- **Common pitfalls:**
  - **Band-pass requires `lowCutoff < highCutoff`.** Otherwise, it throws.
  - **Cutoffs must be less than Nyquist.** At `fs = 8000`, the Nyquist frequency is 4000 Hz. A cutoff above 4000 Hz causes filter design to fail.
  - **The transition band is not sharp.** Butterworth filters have a smooth roll-off, not a brick wall. Frequencies near the cutoff are partially attenuated.
  - **Attenuation is measured in decades, not octaves.** A 4th-order high-pass reduces a signal one decade below the cutoff by `−80 dB`. One octave below, the attenuation is about `−24 dB`.
  - **Band-pass is a cascade of lowpass sections with different Q.** The library implements it as a series of lowpass biquads centered at the geometric mean, each with a `Q` scaled by the bandwidth ratio.
  - **Zero-phase doubles the effective order.** A 4th-order forward-reverse filter behaves like an 8th-order filter in magnitude.

---

## Example 9 — Windowing and RMS (`dspExample9`)

- **Purpose:** Apply a Hamming window to a signal and compute its RMS, power, and dBFS. Windowing is essential before an FFT to reduce spectral leakage.
- **Source:**

```javascript
function dspExample9() {
  console.log('\n=== Example 9: Windowing and RMS ===');

  const s = Signal.sineWave(100, 0, 8000, 1024, 1.0);

  const windowed = s.hammingWindow();
  console.log('rms windowed:', r(windowed.rms()));

  const w = Signal.hamming(8);
  console.log('hamming(8)  :', rArr(w));

  console.log('rms         :', r(s.rms()));
  console.log('power       :', r(s.power()));
  console.log('rms²        :', r(s.rms() ** 2));
}
```

- **Methods invoked:** `hammingWindow`, `Signal.hamming`, `rms`, `power`.
- **Inputs:** a 100 Hz sine at 8 kHz, 1024 samples.
- **Output:** five lines.
- **Expected output:**

```
=== Example 9: Windowing and RMS ===
rms windowed: ~0.397
hamming(8)  : [ 0.08, 0.2531, 0.6424, 0.9544, 0.9544, 0.6424, 0.2531, 0.08 ]
rms         : 0.7071
power       : 0.5
rms²        : 0.5
```

- **Reading the output:**
  - **`rms windowed ≈ 0.397`** — the RMS of the windowed signal. It is lower than the unwindowed RMS because the window attenuates the edges.
  - **`hamming(8)`** — the 8-sample Hamming window coefficients. They rise from 0.08 at the edges to 0.9544 in the middle, then fall symmetrically.
  - **`rms ≈ 0.7071`** — the unwindowed RMS of a unit-amplitude sine.
  - **`power = 0.5`** — the mean-square of the signal. Since RMS = `√power`, `0.7071² = 0.5`.
  - **`rms² = 0.5`** — equal to `power`, as expected.
- **The Hamming window:**
  - `w[n] = 0.54 − 0.46·cos(2πn/(N−1))` for `n = 0, 1, ..., N−1`.
  - The window tapers smoothly to a nonzero value at the edges (0.08).
  - Compare with the Hann window, which goes to exactly 0 at the edges.
- **Why windowing matters:**
  - A finite-length signal is implicitly multiplied by a rectangular window (values 1 everywhere).
  - The rectangular window's spectrum has large sidelobes, which cause leakage — energy from one frequency spreads into adjacent bins.
  - Tapered windows (Hamming, Hann, Blackman) have smaller sidelobes, reducing leakage.
  - The trade-off: windowing attenuates the signal edges, reducing effective signal power and slightly broadening the main lobe.
- **The three metrics:**
  - **`rms`** — root-mean-square. For a sine of amplitude A, `RMS = A/√2`.
  - **`power`** — mean-square. For a sine of amplitude A, `power = A²/2`.
  - **`rmsDb`** — `20·log10(rms)`. For a unit sine, `20·log10(0.7071) ≈ −3.01 dB`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Windowing reduces RMS.** The windowed signal has less total energy. If you need to preserve RMS, divide by the window's RMS gain.
  - **The window is applied in the time domain.** To use it before an FFT, multiply sample-by-sample and then transform.
  - **`hamming(N)` requires `N ≥ 2`.** A single-sample window throws.
  - **The library does not provide other windows.** Hann, Blackman, Kaiser, and Hamming are all common; only Hamming is implemented.
  - **`power` is mean-square, not "power" in watts.** In signal processing, "power" conventionally means mean-square. To get physical power, multiply by the load resistance.
  - **`rmsDb` uses `20·log10`.** This is the amplitude form, appropriate for signals. For power in dB, use `10·log10(power)`.

---

## Example 10 — Padding for FFT (`dspExample10`)

- **Purpose:** Zero-pad a signal to the next power of two so it can be passed to the FFT. This is the standard preprocessing step for signals whose length is not a power of two.
- **Source:**

```javascript
function dspExample10() {
  console.log('\n=== Example 10: Padding for FFT ===');

  const s = new Signal([1, 2, 3, 4, 5, 6, 7], 100);
  console.log('original length:', s.length);

  const padded = s.padToPow2();
  console.log('padded length  :', padded.length);
  console.log('last few zeros :', rArr(padded.toArray().slice(-3)));

  const { mag } = padded.fft();
  console.log('mag length     :', mag.length);
}
```

- **Methods invoked:** `new Signal`, `padToPow2`, `fft`, `toArray`.
- **Inputs:** a 7-sample signal at 100 Hz.
- **Output:** four lines.
- **Expected output:**

```
=== Example 10: Padding for FFT ===
original length: 7
padded length  : 8
last few zeros : [ 5, 6, 7 ]
mag length     : 8
```

- **Reading the output:**
  - **`original length`** — 7 samples.
  - **`padded length`** — 8 samples. The next power of two ≥ 7 is 8.
  - **`last few zeros`** — the padding region, filled with zeros. Since the original signal's last sample was 7, the extra sample is 0.
  - **`mag length`** — the FFT output has 8 bins (matching the padded length).
- **Why padding matters:**
  - The library's FFT uses radix-2 Cooley–Tukey, which requires `N` to be a power of two.
  - Zero-padding extends the signal to the next power of two without changing its spectrum shape (only its resolution).
  - Longer padding (e.g. to 16 or 32 samples) gives a finer frequency grid but does not add information.
- **Effect on the spectrum:**
  - Zero-padding interpolates the spectrum. The true spectral peaks are still at the same frequencies, but the bin spacing is finer.
  - Spectral leakage from the rectangular window remains. Padding does not eliminate it.
  - For the best spectral estimate, use a tapered window and padding together.
- **The `padToPow2` method:**
  - Returns a new Signal with the same sample rate and length `2^ceil(log2(originalLength))`.
  - If the length is already a power of two, returns a clone.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Padding does not add information.** Zero-padding interpolates the existing spectrum; it does not increase resolution.
  - **Padding changes bin spacing.** The new bin spacing is `fs/N_padded`. Peak locations are unchanged, but adjacent bins are closer.
  - **Spectral leakage is not removed by padding.** Use a tapered window before padding.
  - **Padding is not the same as windowing.** Padding extends with zeros; windowing multiplies by a taper. They are different operations and serve different purposes.
  - **The library rounds the padding length up to the next power of two.** For a length-1000 signal, the padded length is 1024. For 1025, the padded length is 2048.
  - **Sample rate is preserved.** The padded signal has the same `sampleRate` as the original.

---

## Example 11 — Full Pipeline (`dspExample11`)

- **Purpose:** Run the complete DSP pipeline on a synthetic signal: generate a clean sine, add noise, filter, detect peaks, and estimate frequency. This is the capstone example — it exercises most of the library's API in a single workflow.
- **Source:**

```javascript
function dspExample11() {
  console.log('\n=== Example 11: Full Pipeline ===');

  const fs = 8000;
  const s = Signal.sineWave(440, 0, fs, 1024, 1.0);

  const noise = Signal.from(
    Array.from({ length: 1024 }, () => (Math.random() - 0.5) * 0.2)
  );
  const noisy = s.add(noise);

  const clean = noisy.butterworth({ type: 'lowpass', cutoff: 600, order: 4 });

  const peaks = clean.findPeaks({ smoothWindow: 7, minDistance: 0.0005 });
  console.log('peaks found:', peaks.length);

  const fEst = Signal.frequencyFromPeaks(peaks);
  console.log('estimated f:', r(fEst, 1), 'Hz (true: 440)');

  console.log('rms noisy:', r(noisy.rms()));
  console.log('rms clean:', r(clean.rms()));
}
```

- **Methods invoked:** `Signal.sineWave`, `Signal.from`, `add`, `butterworth`, `findPeaks`, `Signal.frequencyFromPeaks`, `rms`.
- **Inputs:**
  - A 440 Hz sine at 8 kHz, 1024 samples, amplitude 1.0.
  - Uniform noise in `[−0.1, 0.1]`.
  - Low-pass filter at 600 Hz, order 4.
  - Peak detection with `smoothWindow = 7`, `minDistance = 0.0005`.
- **Output:** four lines.
- **Expected output (abridged):**

```
=== Example 11: Full Pipeline ===
peaks found: ~53
estimated f: ~440.0 Hz (true: 440)
rms noisy: ~0.713
rms clean: ~0.708
```

- **Reading the output:**
  - **`peaks found ≈ 53`** — for a 440 Hz sine over 1024 samples at 8 kHz, the signal contains `440 · 1024/8000 ≈ 56` cycles, so about 56 peaks. The exact count depends on smoothing and edge effects.
  - **`estimated f ≈ 440 Hz`** — the frequency estimate from the peaks, which should match the true 440 Hz.
  - **`rms noisy ≈ 0.713`** — higher than the clean sine's RMS due to noise.
  - **`rms clean ≈ 0.708`** — close to the clean sine's RMS (0.7071).
- **The pipeline in words:**
  1. **Generate** a clean signal.
  2. **Add noise** to simulate a real measurement.
  3. **Filter** to remove noise above the signal band.
  4. **Detect peaks** to identify the fundamental period.
  5. **Estimate frequency** from the peak spacing.
  6. **Verify** with RMS.
- **Why this pipeline matters:**
  - This is the archetypal DSP task: recover a periodic signal from noise.
  - It exercises three of the four major DSP capabilities: generation, filtering, and time-domain analysis.
  - The fourth (frequency-domain analysis) is covered by Examples 5 and 6.
- **The effect of smoothing on peak detection:**
  - `smoothWindow = 7` smooths over 7 samples, reducing noise-induced false peaks.
  - `minDistance = 0.0005 s` is much smaller than the period (1/440 ≈ 0.00227 s), so it does not suppress the real peaks.
  - The result is a set of peaks at the true fundamental rate.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Peak count is approximate.** Edge effects, smoothing, and noise can shift the count by a few.
  - **Frequency estimate depends on peak detection.** A bad peak set gives a bad frequency. Inspect the peaks if the estimate is off.
  - **Zero-phase filtering has edge transients.** The first and last few samples are affected by the filter's startup/shutdown.
  - **The `minDistance` is in seconds.** A common mistake is to pass a sample count. Convert to seconds first.
  - **Smoothing reduces the peak amplitude.** The smoothed peaks are lower than the original signal peaks. Use `minHeight` to reject small spurious peaks.

---

## Example 12 — Spectrum Peak Detection (`dspExample12`)

- **Purpose:** Reproduce the analysis from `caro_dsp_ex1.html`: build a signal with two tones and noise, compute the FFT, and find the peaks in the magnitude spectrum.
- **Source:**

```javascript
function dspExample12() {
  console.log('\n=== Example 12: Spectrum Peak Detection ===');

  const Fs = 1024;
  const N = 1024;

  const x1 = Signal.sineWave(10, 0, Fs, N, 0.3);
  const x2 = Signal.from(
    Array.from({ length: N }, () => Math.random() / 10)
  );
  const x3 = x1.add(x2);
  const x4 = Signal.sineWave(20, 0, Fs, N, 0.4);
  const x = x3.add(x4);

  const { mag } = x.fft();

  const threshold = 10;
  const peakBins = [];
  for (let k = 1; k <= N / 2; k++) {
    if (mag[k] > threshold) peakBins.push(k);
  }

  console.log('peak bins:');
  for (const k of peakBins) {
    console.log(`  bin ${k} → ${r(k * Fs / N, 2)} Hz (mag ${r(mag[k], 2)})`);
  }
}
```

- **Methods invoked:** `Signal.sineWave`, `Signal.from`, `add`, `fft`.
- **Inputs:**
  - `x1` — a 10 Hz sine at 1024 Hz, amplitude 0.3.
  - `x2` — uniform noise in `[0, 0.1]`.
  - `x4` — a 20 Hz sine at 1024 Hz, amplitude 0.4.
  - `x` — the sum of all three.
- **Output:** the list of peak bins above threshold.
- **Expected output (abridged):**

```
=== Example 12: Spectrum Peak Detection ===
peak bins:
  bin 10 → 10 Hz (mag ~153.6)
  bin 20 → 20 Hz (mag ~204.8)
```

- **Reading the output:**
  - **Bin 10** — the 10 Hz peak. The magnitude is approximately `0.3 · N/2 = 153.6`, matching the amplitude of the 10 Hz tone.
  - **Bin 20** — the 20 Hz peak. The magnitude is approximately `0.4 · N/2 = 204.8`, matching the amplitude of the 20 Hz tone.
  - **Noise bins** — the random noise (uniform `[0, 0.1]`) produces small magnitudes spread across all frequencies. None exceed the threshold `10`.
- **Why the magnitudes scale as `N/2`:**
  - The DFT of a pure sine of amplitude A and frequency k is `(A·N/2)` at bin k (and its mirror).
  - This is a fundamental property of the DFT — the transform does not preserve amplitude, only relative magnitudes.
  - To recover the original amplitude, divide by `N/2`. The `spectrum()` method does this automatically.
- **The two-tone plus noise setup:**
  - The two tones are at 10 Hz and 20 Hz — distinct, well-separated frequencies.
  - The noise is low amplitude (uniform `[0, 0.1]`, so max 0.1).
  - The threshold `10` is well above the noise floor but well below the tone magnitudes (~150 and ~205).
- **The peak detection loop:**
  - Iterates over the positive-frequency bins `1` to `N/2`.
  - Collects bins where `mag[k] > threshold`.
  - Reports each bin with its corresponding frequency.
- **Coding example:** as shown. This example is the direct Node.js equivalent of the browser-based `caro_dsp_ex1.html` demo.
- **Common pitfalls:**
  - **Threshold is empirical.** For different signal amplitudes, the threshold must be adjusted. A relative threshold (percentage of max magnitude) is more robust.
  - **Spectral leakage spreads energy.** If the tones are not exactly on bin frequencies, their energy spreads into adjacent bins. For this example, `Fs = N = 1024`, so bin `k` corresponds to exactly `k Hz`, and the tones are on-bin.
  - **`dominantFrequency()` returns only one peak.** For a multi-tone signal, use the manual loop over the spectrum.
  - **Peak detection on the magnitude spectrum is not the same as peak detection on the time-domain signal.** The former finds spectral peaks; the latter finds waveform peaks. Both are useful; they answer different questions.
  - **The noise floor depends on the number of samples.** More samples = lower noise floor. The library does not perform any statistical noise analysis.
  - **Zero-padding is not used.** For this example, `N = 1024` is already a power of two. For other lengths, pad first.


---

## What the Twelve Examples Prove Together

Run in sequence, the twelve examples form a complete verification suite for the `Signal` class:

| Step | What it proves |
|---|---|
| 1. `dspExample1` | Construction, iteration, and time axis work correctly. |
| 2. `dspExample2` | Signal arithmetic adds orthogonal RMS in quadrature. |
| 3. `dspExample3` | Moving average and peak detection correctly recover a low-frequency tone. |
| 4. `dspExample4` | `findPeaks` handles distance and height constraints. |
| 5. `dspExample5` | FFT and dominant frequency work for a pure sine. |
| 6. `dspExample6` | Two-tone spectral analysis finds both peaks. |
| 7. `dspExample7` | Low-pass filtering reduces noise RMS while preserving the tone. |
| 8. `dspExample8` | High-pass and band-pass behave as predicted by their frequency response. |
| 9. `dspExample9` | Windowing reduces RMS, power and RMS are consistent. |
| 10. `dspExample10` | Padding to power of two enables FFT on arbitrary lengths. |
| 11. `dspExample11` | The full pipeline recovers the true frequency from noisy data. |
| 12. `dspExample12` | Spectrum peak detection reproduces the browser-based example. |

If all twelve run and produce sensible output, the `Signal` class is verified end-to-end.

---

## Extending the Examples

### 1. Add other windows

The library only provides Hamming. Hann, Blackman, Kaiser, and Tukey windows are common. Add a `window(type)` method that dispatches on a window name.

### 2. Add a spectrogram

A spectrogram is a time-frequency representation: FFT of short overlapping windows. This is the standard tool for analyzing non-stationary signals.

### 3. Add a power spectral density (PSD)

The periodogram is `|FFT|²/N`. A Welch PSD averages periodograms over overlapping segments. Both are standard for noise analysis.

### 4. Add FIR filter design

Butterworth is IIR. FIR filters (windowed-sinc, Parks–McClellan) are linear-phase and always stable. A windowed-sinc design is short and easy to add.

### 5. Add a resampling function

Sample-rate conversion (upsampling, downsampling, polyphase filtering) is a natural extension. The library currently assumes a fixed sample rate.

### 6. Add a Hilbert transform

The analytic signal (Hilbert transform) gives instantaneous amplitude and phase — useful for envelope detection and demodulation.

### 7. Add a peak interpolation

Peak positions are limited to sample resolution. A parabolic fit around each peak gives sub-sample precision, improving frequency estimation.

### 8. Add a decibel conversion utility

`rmsDb` exists, but a general `toDb(x)` and `fromDb(x)` would be convenient.

### 9. Add a signal generator for other waveforms

`Signal.sineWave` is the only generator. Add `square`, `triangle`, `sawtooth`, `chirp`, and `pulse`.

### 10. Add filter design by specification

Rather than asking for cutoff and order, ask for passband and stopband edges and ripple. The library would then choose the order automatically.

### 11. Add integration with the statistics library

Both `Signal` and `Sample` are 1-D numeric containers. A natural bridge would let you call `signal.toSample()` and `sample.toSignal()`.

### 12. Add a plot helper

The HTML examples use `plot.js` and Plotly. A Node-side `toPlotData(signal)` returning `{ x, y }` would make scripting easier.

### 13. Add real-time streaming

The library works on complete signals. A streaming interface (push sample, get filtered sample) would be needed for real-time control.

### 14. Add a Butterworth band-stop filter

The library has lowpass, highpass, bandpass, but no bandstop. Adding it is straightforward (a parallel lowpass + highpass, or a bandpass + subtract).

---

## Troubleshooting

The following issues are the most common when running the twelve examples.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: Signal data must be an array` | Passed a non-array | Wrap in `new Signal([...])` |
| `Error: Signal data must contain only finite numbers` | `NaN`, `Infinity`, or non-numeric | Filter or coerce the data |
| `Error: sampleRate must be a positive number` | `sampleRate ≤ 0` | Use `sampleRate > 0` |
| `Error: Signal is empty` | Called a method on an empty Signal | Check `signal.length > 0` |
| `Error: Signals must have the same non-zero length` | Length mismatch | Ensure both signals have equal length |
| `Error: Expected a Signal instance` | Passed a plain array | Wrap in `new Signal(...)` |
| `Error: windowSize must be a positive integer` | `windowSize < 1` or non-integer | Use integer `windowSize ≥ 1` |
| `Error: FFT length must be a power of two` | Length not a power of 2 | Use `padToPow2()` first |
| `Error: cutoff must be > 0` | Filter cutoff not positive | Use `cutoff > 0` |
| `Error: lowCutoff must be < highCutoff` | Bandpass bounds reversed | Swap `lowCutoff` and `highCutoff` |
| `Error: order must be a positive integer` | Filter order not positive integer | Use `order ≥ 1` |
| `Error: type must be lowpass, highpass, or bandpass` | Unknown filter type | Use one of the three supported strings |
| `NaN` in output | Division by zero or empty input | Check the guard conditions |
| `Infinity` in output | Same | Same |
| `dominantFrequency` returns 0 | Signal is DC or empty | Check the signal's spectrum |
| `frequencyFromPeaks` returns `NaN` | Fewer than 2 peaks | Use a bigger signal or a smaller `minDistance` |
| Filtered signal is unstable | Order too high, or cutoff too close to Nyquist | Reduce order, move cutoff away from Nyquist |
| Peaks are noisy | `smoothWindow` too small | Increase `smoothWindow` |
| Peaks are missing | `minDistance` too large or `minHeight` too high | Reduce the constraints |
| FFT peak is off by one bin | On-bin vs. off-bin frequencies | Use `N = Fs` so bin `k` is exactly `k Hz` |
| Spectrum shows many peaks | Spectral leakage | Apply a Hamming window before the FFT |
| RMS after filtering is higher than expected | Filter resonance at cutoff | Check the filter's frequency response |
| `.T` returns wrong data | Signal class does not have `.T` | Use `.toArray()` for a copy |

If a failure is not listed here, the fastest diagnostic is usually to run the twelve examples in order and identify the first one that fails. Most failures are length mismatches or non-power-of-two FFT lengths.

---

## Closing Notes

The `caro.dsp-1.0.js` library is a single-class DSP toolkit built around the `Signal` class. It covers:

- **Construction** — sine waves, zeros, from arrays, from variadic values.
- **Arithmetic** — add, subtract, scale.
- **Time-domain analysis** — moving average, peak detection, peak spacing.
- **Frequency-domain analysis** — FFT, dominant frequency, one-sided spectrum.
- **Filtering** — Butterworth lowpass, highpass, bandpass.
- **Windows and stats** — Hamming, RMS, power, dB.
- **Utilities** — padding, info, iteration.

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.dsp-1.0.js** — signal generation, filtering, and spectral analysis.
- **caro.compensator-1.0.js** — classical control.
- **caro.manipulator-1.0.js** — robot kinematics, dynamics, control.
- **caro.fuzzy-1.0.js** — fuzzy inference and fuzzy PID.
- **caro.anfis-1.0.js** — adaptive neuro-fuzzy inference.
- **caro.ga-1.0.js** — genetic algorithm.
- **caro.ml-1.0.js** — unsupervised clustering.
- **caro.dip-1.0.js** — digital image processing.

### The Pattern

Each CaroLab manual follows the same discipline:

1. **A single page of prose** describing the library's scope.
2. **One worked example per public class or feature.**
3. **Expected output documented alongside the code**, so a reader knows what to look for.
4. **Common pitfalls** listed honestly, including conventions and limitations.
5. **An Extending section** showing how to go beyond the example.
6. **A Troubleshooting table** covering the most common runtime errors.

### On DSP in JavaScript

Digital signal processing is one of the areas where JavaScript's ecosystem is thinnest. Python has `scipy.signal`, `numpy.fft`, and `librosa`. MATLAB has the Signal Processing Toolbox. C has FFTW and hand-rolled biquads. JavaScript has essentially nothing in the standard library, and the npm packages that do exist are fragmented.

`caro.dsp-1.0.js` is a deliberate attempt to fill that gap for the CaroLab ecosystem. It is not a full DSP library — it does not include FIR design, spectral density estimation, filter design by specification, or real-time streaming. What it does include is a curated set of tools that cover the *majority* of practical needs:

- **Generating** test signals.
- **Filtering** to isolate a band.
- **Analyzing** in the frequency domain.
- **Detecting** peaks and estimating frequency.
- **Measuring** RMS, power, and dB.

The library is small, readable, and dependency-free. It works in Node and in the browser. It does not pretend to be `scipy.signal`, and it does not try to be everything to everyone. It is a foundation.

The twelve examples in this manual are the ground truth. Every method has a documented expected output, and every guard has a documented error message. When the implementation is correct, the tests pass. When the implementation has a bug, the tests fail with a specific message pointing at the responsible method.

That rhythm — small, verifiable examples with honest documentation — is what keeps a DSP library trustworthy over time.

---

*End of document.*


