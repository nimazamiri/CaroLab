# CaroLab Audio DSP Library

- **Name:** caro.audio-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Audio Digital Signal Processing](#a-primary-library-for-audio-digital-signal-processing)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
3. [CaroLab Audio Library — Functions List](#carolab-audio-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Access](#construction--access)
   - [Channel & Level Utilities](#channel--level-utilities)
   - [Filtering](#filtering)
   - [Windowing & Smoothing](#windowing--smoothing)
   - [Peak Detection](#peak-detection)
   - [Signal Metrics](#signal-metrics)
   - [Frequency Domain](#frequency-domain)
   - [Stateful (Real-Time) Filtering](#stateful-real-time-filtering)
   - [Utilities & Display](#utilities--display)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Audio Digital Signal Processing

`caro.audio-1.0.js` is a single-class JavaScript library built around the **`AudioDSP`** object — an immutable-by-convention wrapper around one or more channels of a finite-number audio waveform, plus a `sampleRate`. Every offline transform-style method (e.g. `scale`, `dcBlocker`, `butterworth`, `hammingWindow`, `normalizePeak`) returns a **new `AudioDSP`**, so calls can be chained; a small set of factory methods (`createStatefulBiquad`) instead return a stateful processor object for block-by-block (real-time-style) filtering.

> **Note on naming:** `AudioDSP` is a multichannel sibling of `caro.dsp-1.0.js`'s `Signal` class — both wrap a waveform plus `sampleRate` and share method names/semantics for peaks, FFT, and smoothing — but `AudioDSP` additionally supports **multiple channels** (mono or an array of channel arrays), audio-specific level utilities (`rms`/`peak`/`normalizePeak`/`hasClipping`), a parametric EQ, and a DC blocker, and exposes filtering both as one-shot offline methods (`butterworth`, `biquad`) and as a stateful, block-oriented processor (`createStatefulBiquad`).

The library covers the following broad areas:

| Area | Examples |
|---|---|
| Construction & channel access | `constructor`, `AudioDSP.from`, `AudioDSP.zeros`, `AudioDSP.sineWave`, `AudioDSP.of`, `channel`, `channels`, `mixDown` |
| Mixing & arithmetic | `add`, `subtract`, `scale`, `removeDCOffset`, `dcBlocker` |
| Filtering & EQ | `biquad`, `butterworth`, `parametricEQ`, `equalizer` |
| Windowing & smoothing | `hammingWindow`, `AudioDSP.hamming`, `movingAverageCentered` |
| Peak detection | `peaks`, `findPeaks`, `AudioDSP.peak2peak`, `AudioDSP.frequencyFromPeaks` |
| Signal metrics | `rms`, `power`, `rmsDb`, `peak`, `peakDb`, `normalizePeak`, `hasClipping`, `info` |
| Frequency domain | `fft`, `spectrum` |
| Stateful (real-time) filtering | `createStatefulBiquad` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js (it self-registers as `module.exports` under Node and as `window.AudioDSP` in a browser).

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.audio-1.0.js"></script>
<script>
  const audio = new AudioDSP([0.1, 0.5, -0.3, 0.8, -0.6], 44100);
  const rms = audio.rms();
  console.log('RMS level:', rms);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const AudioDSP = require('./caro.audio-1.0.js');

const audio = new AudioDSP([0.1, 0.5, -0.3, 0.8, -0.6], 44100);
const rms = audio.rms();

console.log('RMS level:', rms);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** data is supplied once, either to the `AudioDSP` **constructor** (`new AudioDSP(data, sampleRate)`) or via one of the static factories (`AudioDSP.from(...)`, `AudioDSP.zeros(...)`, `AudioDSP.sineWave(...)`, `AudioDSP.of(...)`). `data` may be a flat array of samples (mono) or an array of per-channel arrays (multichannel, e.g. `[left, right]`); instance methods such as `rms()`, `butterworth(...)`, or `fft()` then take **no data argument** and operate on the channel(s) already stored in the instance (`this.data`, `this.sampleRate`, `this.numberOfChannels`). Most metric/utility methods accept an optional `channel` index (default `0`) to select which channel to read; transform methods apply to **all** channels at once and return a new multichannel `AudioDSP`. Two-`AudioDSP` operations (`add`, `subtract`) take the second `AudioDSP` as an explicit argument and require matching shape (same length and channel count).

---

## CaroLab Audio Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new AudioDSP` | Builds an AudioDSP from mono or multichannel sample data and a sample rate |
| 2 | `AudioDSP.from` | Convenience factory — equivalent to the constructor |
| 3 | `AudioDSP.zeros` | Generates a zero-filled AudioDSP of given length/channel count |
| 4 | `AudioDSP.sineWave` | Generates a sine-wave AudioDSP from frequency, phase, sample rate and length |
| 5 | `AudioDSP.of` | Builds a mono AudioDSP from individual arguments instead of an array |
| 6 | `get` | Returns the value at index `i` on channel 0 |
| 7 | `channel` | Returns a copy of a single channel's samples as a plain array |
| 8 | `channels` | Returns copies of all channels' samples as an array of arrays |
| 9 | `toArray` | Returns channel 0 as a flat array (mono) or all channels (multichannel) |
| 10 | `clone` | Returns an independent copy of the AudioDSP |
| 11 | `slice` | Returns a new AudioDSP over `[a, b)` on every channel |
| 12 | `duration` | Duration in seconds (`length / sampleRate`) |
| 13 | `timeAxis` | Returns the time (in seconds) of every sample |
| 14 | `mixDown` | Averages all channels down to a single mono channel |
| 15 | `add` | Element-wise addition of two equal-shape AudioDSP objects |
| 16 | `subtract` | Element-wise subtraction of two equal-shape AudioDSP objects |
| 17 | `scale` | Multiplies every sample, on every channel, by a scalar |
| 18 | `mean` | Arithmetic mean of one channel's samples |
| 19 | `removeDCOffset` | Subtracts each channel's own mean from itself |
| 20 | `dcBlocker` | One-pole high-pass DC-blocking filter |
| 21 | `biquad` | Applies a single explicit biquad section to every channel (offline) |
| 22 | `butterworth` | Butterworth low-pass/high-pass/band-pass filter, optionally zero-phase |
| 23 | `parametricEQ` | Cascaded peaking-EQ bands applied in sequence |
| 24 | `equalizer` | Alias of `parametricEQ` |
| 25 | `hammingWindow` | Applies a Hamming window to every channel |
| 26 | `AudioDSP.hamming` | Returns the raw Hamming window coefficients for a given length |
| 27 | `movingAverageCentered` | Symmetric (centered), edge-handled, length-preserving moving average |
| 28 | `peaks` | Local maxima of a smoothed copy of channel 0 (no distance/height constraints) |
| 29 | `findPeaks` | Local maxima of channel 0 with minimum distance / minimum height constraints |
| 30 | `AudioDSP.peak2peak` | Inter-peak time deltas from a `findPeaks`/`peaks` result |
| 31 | `AudioDSP.frequencyFromPeaks` | Estimates fundamental frequency from mean inter-peak period |
| 32 | `rms` | Root-mean-square value of one channel |
| 33 | `power` | Mean-square (average power) of one channel, from `rms` |
| 34 | `rmsDb` | RMS expressed in dBFS relative to full scale `1.0` |
| 35 | `peak` | Peak absolute sample value, across one channel or all channels |
| 36 | `peakDb` | Peak level expressed in dBFS |
| 37 | `normalizePeak` | Scales the AudioDSP so its peak reaches a target dBFS level |
| 38 | `hasClipping` | Whether any sample on any channel meets/exceeds a threshold magnitude |
| 39 | `info` | Summary object: length, sample rate, duration, channel count, RMS, peak |
| 40 | `padToPow2` | Zero-pads every channel up to the next power of two (for FFT) |
| 41 | `toString` | Formats channel 0 as a bracketed string (mono) or a summary tag (multichannel) |
| 42 | `fft` | Radix-2 Cooley–Tukey Fast Fourier Transform of one channel |
| 43 | `spectrum` | One-sided amplitude spectrum of one channel, derived from `fft` |
| 44 | `createStatefulBiquad` | Factory for a stateful, block-oriented biquad processor (`reset`/`processBlock`) |

*(Construction and access helpers — `constructor`, `AudioDSP.from`, `AudioDSP.zeros`, `AudioDSP.sineWave`, `AudioDSP.of`, `get`, `channel`, `channels`, `toArray`, `clone`, `slice`, `duration`, `timeAxis` — are listed separately under [Construction & Access](#construction--access), as they are not DSP functions in their own right.)*

---

## Detail Description

### Construction & Access

- **Function:** `constructor` / `new AudioDSP(data, sampleRate)`
  **Description:** Creates a new `AudioDSP` from mono sample data (a flat array/typed array of finite numbers) or multichannel data (an array of per-channel arrays/typed arrays, e.g. `[left, right]`), plus a positive sample rate. Every channel is copied into a plain array and validated to contain only finite numbers; all channels must share the same length.
  **Syntax:** `const audio = new AudioDSP(data, sampleRate);`
  **Input Arguments:** `data`: flat array/typed array (mono), or array of arrays/typed arrays (multichannel), default `[]`; `sampleRate`: samples per unit time, must be `> 0` (default `1`)
  **Output Arguments:** `audio`: `AudioDSP` instance, with `audio.data` (array of channel arrays), `audio.numberOfChannels`, `audio.length`, `audio.sampleRate`
  **Errors:** `sampleRate must be a positive number`; `AudioDSP data must be an array or typed array`; `AudioDSP must contain at least one channel`; `Each channel must be an array or typed array`; `AudioDSP samples must contain only finite numbers`; `All channels must have equal length`
  **Coding Example:**
  ```javascript
  const mono   = new AudioDSP([0.1, 0.5, -0.3, 0.8], 44100);
  const stereo = new AudioDSP([[0.1, 0.5], [0.05, 0.4]], 44100); // [left, right]
  ```

- **Function:** `AudioDSP.from`
  **Description:** Convenience factory — equivalent to the constructor.
  **Syntax:** `audio = AudioDSP.from(data, sampleRate);`
  **Input Arguments:** `data`: mono or multichannel sample data; `sampleRate`: samples per unit time (default `1`)
  **Output Arguments:** `audio`: `AudioDSP` instance

- **Function:** `AudioDSP.zeros`
  **Description:** Generates a zero-filled `AudioDSP` of a given length and channel count.
  **Syntax:** `audio = AudioDSP.zeros(length, sampleRate, channels);`
  **Input Arguments:** `length`: non-negative integer sample count; `sampleRate`: samples per unit time (default `1`); `channels`: positive integer channel count (default `1`)
  **Output Arguments:** `audio`: `AudioDSP` instance
  **Errors:** `length must be a non-negative integer`; `channels must be a positive integer`

- **Function:** `AudioDSP.sineWave`
  **Description:** Generates a pure sine wave (identical on every requested channel) as a new `AudioDSP`.
  **Syntax:** `audio = AudioDSP.sineWave(frequency, phase, sampleRate, length, amplitude, channels);`
  **Input Arguments:** `frequency`: frequency in Hz (`≥ 0`); `phase`: phase offset in radians; `sampleRate`: samples per second; `length`: positive integer sample count; `amplitude`: peak amplitude (default `1`); `channels`: channel count (default `1`)
  **Output Arguments:** `audio`: `AudioDSP` instance
  **Errors:** `Invalid sine-wave parameters` (thrown for a negative frequency or a non-positive-integer `length`)
  **Formula:** `x[n] = amplitude · sin(2π·frequency·n / sampleRate + phase)`

- **Function:** `AudioDSP.of`
  **Description:** Convenience static constructor — builds a mono `AudioDSP` from individual arguments instead of an array. Uses the default `sampleRate = 1`.
  **Syntax:** `audio = AudioDSP.of(...values);`
  **Input Arguments:** `values`: numbers, given as separate arguments
  **Output Arguments:** `audio`: `AudioDSP` instance

- **Function:** `get`
  **Description:** Returns the value at index `i` on channel `0`.
  **Syntax:** `v = audio.get(i);`
  **Input Arguments:** `i`: integer index
  **Output Arguments:** `v`: float value

- **Function:** `channel`
  **Description:** Returns an independent copy of a single channel's samples.
  **Syntax:** `arr = audio.channel(index);`
  **Input Arguments:** `index`: integer channel index (default `0`)
  **Output Arguments:** `arr`: array of floats
  **Errors:** `Invalid channel index`

- **Function:** `channels`
  **Description:** Returns independent copies of every channel's samples.
  **Syntax:** `arrs = audio.channels();`
  **Output Arguments:** `arrs`: array of channel arrays (`numberOfChannels × length`)

- **Function:** `toArray`
  **Description:** Returns the AudioDSP's data as a plain array — channel `0` flattened for a mono signal, or the full array of channel arrays for a multichannel signal.
  **Syntax:** `arr = audio.toArray();`
  **Output Arguments:** `arr`: array of floats (mono), or array of channel arrays (multichannel)

- **Function:** `clone`
  **Description:** Returns an independent copy of the AudioDSP.
  **Syntax:** `copy = audio.clone();`
  **Output Arguments:** `copy`: `AudioDSP` instance

- **Function:** `slice`
  **Description:** Returns a new AudioDSP over the sample range `[a, b)`, following standard `Array.slice` semantics, applied to every channel and preserving `sampleRate`.
  **Syntax:** `sub = audio.slice(a, b);`
  **Input Arguments:** `a`: start index; `b`: end index (exclusive)
  **Output Arguments:** `sub`: `AudioDSP` instance

- **Function:** `duration`
  **Description:** Duration of the AudioDSP in seconds.
  **Syntax:** `d = audio.duration();`
  **Output Arguments:** `d`: float value
  **Formula:** `duration = length / sampleRate`

- **Function:** `timeAxis`
  **Description:** Returns the time, in seconds, of every sample.
  **Syntax:** `t = audio.timeAxis();`
  **Output Arguments:** `t`: array of length `n`
  **Formula:** `t[n] = n / sampleRate`

---

### Channel & Level Utilities

- **Function:** `mixDown`
  **Description:** Averages all channels down to a single mono channel. Returns an unmodified clone if the AudioDSP is already mono.
  **Syntax:** `mono = audio.mixDown();`
  **Output Arguments:** `mono`: `AudioDSP` instance, `numberOfChannels === 1`
  **Formula:** `mono[n] = (Σᶜ dataᶜ[n]) / numberOfChannels`

- **Function:** `add`
  **Description:** Element-wise addition of this AudioDSP and another AudioDSP of identical shape (same length and channel count).
  **Syntax:** `c = a.add(b);`
  **Input Arguments:** `other`: `AudioDSP` with matching `length` and `numberOfChannels`
  **Output Arguments:** `c`: `AudioDSP` instance
  **Errors:** `Expected an AudioDSP instance`; `AudioDSP objects must have equal shape`
  **Formula:** `c[c][n] = a[c][n] + b[c][n]`

- **Function:** `subtract`
  **Description:** Element-wise subtraction of this AudioDSP and another AudioDSP of identical shape.
  **Syntax:** `c = a.subtract(b);`
  **Input Arguments:** `other`: `AudioDSP` with matching `length` and `numberOfChannels`
  **Output Arguments:** `c`: `AudioDSP` instance
  **Errors:** `Expected an AudioDSP instance`; `AudioDSP objects must have equal shape`
  **Formula:** `c[c][n] = a[c][n] − b[c][n]`

- **Function:** `scale`
  **Description:** Multiplies every sample, on every channel, by a scalar.
  **Syntax:** `c = audio.scale(k);`
  **Input Arguments:** `k`: finite number
  **Output Arguments:** `c`: `AudioDSP` instance
  **Errors:** `Scale must be finite`
  **Formula:** `c[c][n] = k · x[c][n]`

- **Function:** `mean`
  **Description:** Arithmetic mean of one channel's samples.
  **Syntax:** `m = audio.mean(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `m`: float value

- **Function:** `removeDCOffset`
  **Description:** Subtracts each channel's own mean from itself, independently per channel.
  **Syntax:** `out = audio.removeDCOffset();`
  **Output Arguments:** `out`: `AudioDSP` instance

- **Function:** `dcBlocker`
  **Description:** One-pole high-pass DC-blocking filter, applied independently to every channel.
  **Syntax:** `out = audio.dcBlocker(cutoffHz);`
  **Input Arguments:** `cutoffHz`: cutoff frequency in Hz, must lie strictly between `0` and the Nyquist frequency (`sampleRate / 2`) (default `5`)
  **Output Arguments:** `out`: `AudioDSP` instance
  **Errors:** `cutoff must be between 0 and Nyquist`
  **Formula:** `R = e^(−2π·cutoffHz / sampleRate)`, then `y[n] = x[n] − x[n−1] + R·y[n−1]`

---

### Filtering

- **Function:** `biquad`
  **Description:** Applies a single, explicitly supplied biquad section (offline, stateless across the call) to every channel.
  **Syntax:** `out = audio.biquad(coefficients);`
  **Input Arguments:** `coefficients`: `{ b0, b1, b2, a1, a2 }`, all finite
  **Output Arguments:** `out`: `AudioDSP` instance
  **Errors:** `Invalid biquad coefficients`

- **Function:** `butterworth`
  **Description:** Butterworth IIR filter — low-pass, high-pass, or band-pass — built from cascaded biquad (and, for odd orders, one first-order) sections, applied to every channel independently, with optional zero-phase (forward–reverse) filtering to cancel phase distortion.
  **Syntax:** `y = audio.butterworth({ type, cutoff, lowCutoff, highCutoff, order, zeroPhase });`
  **Input Arguments:** `type`: `'lowpass'` (default), `'highpass'`, or `'bandpass'`; `cutoff`: cutoff frequency in Hz, required for `lowpass`/`highpass` (must be between `0` and Nyquist); `lowCutoff`, `highCutoff`: band edges in Hz, required for `bandpass` (`0 < lowCutoff < highCutoff < sampleRate/2`); `order`: filter order, positive integer (default `4`); `zeroPhase`: apply the cascade forward then reverse-forward to cancel phase shift (default `false`)
  **Output Arguments:** `y`: `AudioDSP` instance
  **Errors:** `order must be a positive integer`; `Invalid bandpass cutoffs`; `cutoff must be between 0 and Nyquist`; `type must be lowpass, highpass, or bandpass`; `Unknown filter type`
  **Method:** Designs `⌈order/2⌉` cascaded biquad sections (lowpass/highpass) via the analog-prototype Butterworth `Q` values, or `order` sections centered at `√(lowCutoff·highCutoff)` (bandpass); for an odd order, the first section is replaced with a first-order lowpass/highpass stage so the overall order matches exactly.

- **Function:** `parametricEQ`
  **Description:** Applies a sequence of peaking-EQ bands, one cascaded `biquad` call per band, in the order given.
  **Syntax:** `out = audio.parametricEQ(bands);`
  **Input Arguments:** `bands`: array of `{ frequency, gainDb, Q }` — `gainDb` defaults to `0`, `Q` defaults to `1`
  **Output Arguments:** `out`: `AudioDSP` instance
  **Errors:** `bands must be an array`
  **Formula:** Each band is a peaking biquad with gain `A = 10^(gainDb/40)`, applied via `biquad()`

- **Function:** `equalizer`
  **Description:** Alias of `parametricEQ`.
  **Syntax:** `out = audio.equalizer(bands);`
  **Input Arguments:** `bands`: same as `parametricEQ`
  **Output Arguments:** `out`: `AudioDSP` instance

---

### Windowing & Smoothing

- **Function:** `hammingWindow`
  **Description:** Applies a Hamming window to every channel, returning a new (same-length) windowed AudioDSP — useful before `fft`/`spectrum` to reduce spectral leakage.
  **Syntax:** `y = audio.hammingWindow();`
  **Output Arguments:** `y`: `AudioDSP` instance
  **Formula:** `y[c][n] = x[c][n] · (0.54 − 0.46·cos(2πn / (N − 1)))`

- **Function:** `AudioDSP.hamming`
  **Description:** Static windowing helper that returns just the raw Hamming window coefficients (not applied to any AudioDSP).
  **Syntax:** `w = AudioDSP.hamming(N);`
  **Input Arguments:** `N`: integer, `≥ 2`
  **Output Arguments:** `w`: array of length `N`
  **Errors:** `N must be an integer >= 2`

- **Function:** `movingAverageCentered`
  **Description:** Symmetric (centered), edge-handled, length-preserving moving average, applied independently to every channel.
  **Syntax:** `ma = audio.movingAverageCentered(windowSize);`
  **Input Arguments:** `windowSize`: positive integer
  **Output Arguments:** `ma`: `AudioDSP` instance, same shape as `audio`
  **Errors:** `windowSize must be a positive integer`
  **Method:** For each index `i`, averages all in-range samples in `[i − half, i + half]` (`half = ⌊windowSize / 2⌋`), where out-of-range indices near the edges are simply omitted from both the sum and the count.

---

### Peak Detection

- **Function:** `peaks`
  **Description:** Finds local maxima of a smoothed copy of **channel 0** (smoothed via `movingAverageCentered`). No minimum-distance or minimum-height constraint — use `findPeaks` for those.
  **Syntax:** `p = audio.peaks(windowSize);`
  **Input Arguments:** `windowSize`: smoothing window size passed to `movingAverageCentered` (default `5`)
  **Output Arguments:** `p`: plain array of `{ index, value }`

- **Function:** `findPeaks`
  **Description:** Finds local maxima of a smoothed copy of **channel 0**, with a minimum time distance between accepted peaks and a minimum height threshold. Each returned peak also carries its time in seconds.
  **Syntax:** `p = audio.findPeaks({ smoothWindow, minDistance, minHeight });`
  **Input Arguments:** `smoothWindow`: smoothing window size (default `11`); `minDistance`: minimum time between accepted peaks, in seconds (default `0.05`); `minHeight`: minimum accepted peak value (default `-Infinity`)
  **Output Arguments:** `p`: plain array of `{ index, t, value }`, ordered by index

- **Function:** `AudioDSP.peak2peak`
  **Description:** Computes the inter-peak time deltas (in seconds) from a `peaks`/`findPeaks`-shaped array.
  **Syntax:** `deltas = AudioDSP.peak2peak(peaks);`
  **Input Arguments:** `peaks`: array of `{ t, ... }` objects, e.g. from `findPeaks`
  **Output Arguments:** `deltas`: array of length `peaks.length − 1`

- **Function:** `AudioDSP.frequencyFromPeaks`
  **Description:** Estimates the fundamental frequency from the mean inter-peak period of a `peaks`/`findPeaks`-shaped array.
  **Syntax:** `f = AudioDSP.frequencyFromPeaks(peaks);`
  **Input Arguments:** `peaks`: array of `{ t, ... }` objects, e.g. from `findPeaks`
  **Output Arguments:** `f`: float value (Hz), or `NaN` if fewer than 2 peaks are supplied
  **Formula:** `f = 1 / mean(Δt between consecutive peaks)`, via `AudioDSP.peak2peak`

---

### Signal Metrics

- **Function:** `rms`
  **Description:** Root-mean-square value of one channel.
  **Syntax:** `v = audio.rms(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `v`: float value
  **Formula:** `rms = √( (Σxᵢ²) / n )`

- **Function:** `power`
  **Description:** Mean-square (average power) of one channel, computed as `rms(channel)²`.
  **Syntax:** `v = audio.power(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `v`: float value

- **Function:** `rmsDb`
  **Description:** RMS level of one channel, expressed in dBFS relative to full scale `1.0`.
  **Syntax:** `db = audio.rmsDb(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `db`: float value, or `-Infinity` if `rms(channel) === 0`
  **Formula:** `db = 20 · log₁₀(rms)`

- **Function:** `peak`
  **Description:** Peak absolute sample value — of a single specified channel, or across **all** channels if `channel` is left `null`.
  **Syntax:** `p = audio.peak(channel);`
  **Input Arguments:** `channel`: integer channel index, or `null` for all channels (default `null`)
  **Output Arguments:** `p`: float value

- **Function:** `peakDb`
  **Description:** Peak level expressed in dBFS relative to full scale `1.0`.
  **Syntax:** `db = audio.peakDb(channel);`
  **Input Arguments:** `channel`: integer channel index, or `null` for all channels (default `null`)
  **Output Arguments:** `db`: float value, or `-Infinity` if `peak(channel) === 0`
  **Formula:** `db = 20 · log₁₀(peak)`

- **Function:** `normalizePeak`
  **Description:** Scales the whole AudioDSP (all channels, by a single common gain) so its overall peak reaches a target dBFS level. Returns an unmodified clone if the current peak is `0`.
  **Syntax:** `out = audio.normalizePeak(targetDb);`
  **Input Arguments:** `targetDb`: target peak level in dBFS (default `-1`)
  **Output Arguments:** `out`: `AudioDSP` instance
  **Formula:** `gain = 10^(targetDb/20) / peak()`, then `out = audio.scale(gain)`

- **Function:** `hasClipping`
  **Description:** Whether any sample, on any channel, meets or exceeds a threshold magnitude.
  **Syntax:** `clipped = audio.hasClipping(threshold);`
  **Input Arguments:** `threshold`: magnitude threshold (default `1`)
  **Output Arguments:** `clipped`: boolean

- **Function:** `info`
  **Description:** Summary object describing the AudioDSP — handy for quick inspection/logging.
  **Syntax:** `summary = audio.info();`
  **Output Arguments:** `summary`: `{ length, sampleRate, duration, numberOfChannels, rms, peak }` — `duration`: `length / sampleRate`; `rms`: a single number for a mono signal, or an array of per-channel `rms()` values for multichannel; `peak`: overall peak across all channels

---

### Frequency Domain

- **Function:** `fft`
  **Description:** Radix-2 Cooley–Tukey Fast Fourier Transform of a single channel. Requires that channel's length to be a power of two (see `padToPow2`).
  **Syntax:** `result = audio.fft(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `result`: `{ re, im, mag, phase }` — each a `Float64Array` of length `N` (full complex spectrum, conjugate-symmetric for real input)
  **Errors:** `FFT length must be a power of two`

- **Function:** `spectrum`
  **Description:** One-sided amplitude spectrum of a single channel, derived from `fft`, with frequencies in Hz. Interior bins are doubled to preserve total power, matching the output of a typical spectrum analyzer on real input.
  **Syntax:** `result = audio.spectrum(channel);`
  **Input Arguments:** `channel`: integer channel index (default `0`)
  **Output Arguments:** `result`: `{ freqs, amps }` — arrays of length `N/2 + 1`

---

### Stateful (Real-Time) Filtering

- **Function:** `createStatefulBiquad`
  **Description:** Factory for a stateful, block-oriented biquad processor: unlike `biquad()` (which filters an entire AudioDSP at once, resetting state on every call), the object returned here keeps one `{x1, x2, y1, y2}` state per channel across repeated `processBlock` calls, so a long signal can be streamed through in successive chunks with continuity preserved at chunk boundaries.
  **Syntax:** `proc = audio.createStatefulBiquad(coefficients);`
  **Input Arguments:** `coefficients`: `{ b0, b1, b2, a1, a2 }`, all finite
  **Output Arguments:** `proc`: `{ reset(), processBlock(block) }`
  **Errors:** `Invalid biquad coefficients` (validated at creation time)
  **Method:**
  - `reset()` — zeroes every channel's internal `{x1, x2, y1, y2}` state.
  - `processBlock(block)` — filters one chunk of audio, carrying state forward from the previous call. `block` may be an `AudioDSP` (channel count must match the processor's) or a plain array treated as a single channel; returns a new `AudioDSP` at the original `sampleRate`.
  **Errors (processBlock):** `Channel count mismatch`
  **Note:** the biquad section itself is fixed at creation time — pass a fresh `coefficients` object to `createStatefulBiquad` if the filter needs to be redesigned; only the per-channel `{x1,x2,y1,y2}` history is mutable/reset by `reset()`.

---

### Utilities & Display

- **Function:** `padToPow2`
  **Description:** Zero-pads every channel at the end so the AudioDSP's length becomes the next power of two — useful for feeding an arbitrary-length signal into `fft`/`spectrum`. Returns a clone unmodified if the length is already a power of two.
  **Syntax:** `padded = audio.padToPow2();`
  **Output Arguments:** `padded`: `AudioDSP` instance, `sampleRate` and `numberOfChannels` unchanged

- **Function:** `toString`
  **Description:** For a mono AudioDSP, formats channel 0 as a bracketed, fixed-precision string (e.g. `[1.0000, 0.8000, ...]`); for multichannel, returns a short summary tag instead (`AudioDSP(N channels, M samples)`).
  **Syntax:** `str = audio.toString(precision);`
  **Input Arguments:** `precision`: decimal places, mono only (default `4`)
  **Output Arguments:** `str`: string

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `_requireNonEmpty` | Throws `AudioDSP is empty` if the AudioDSP has zero length |
| `_map(fn)` | Applies `fn(channelArray, channelIndex)` to every channel and wraps the result in a new `AudioDSP`; the shared implementation behind most per-channel transforms (`scale`, `removeDCOffset`, `dcBlocker`, `biquad`, `butterworth`, `hammingWindow`, `movingAverageCentered`) |
| `_checkAudio(other)` | Throws `Expected an AudioDSP instance` unless `other` is an `AudioDSP`; used by `add`/`subtract` before the shape check |
| `AudioDSP._dcBlock(x, sr, cutoff)` | One-pole DC-blocking difference equation for a single channel array; used by `dcBlocker` |
| `AudioDSP._butterQ(k, n)` | Computes the analog-prototype Butterworth pole `Q` for section `k` of an order-`n` filter |
| `AudioDSP._designButterworth({ type, cutoff, lowCutoff, highCutoff, order, sampleRate })` | Builds the cascaded biquad (and, for odd orders, first-order) section list for `butterworth` |
| `AudioDSP._designFirstOrder(type, f, sr)` | Designs a single first-order lowpass/highpass section, used to make up an odd filter order |
| `AudioDSP._designBiquad(type, f, Q, sr)` | Designs a single RBJ-style biquad (`lowpass`/`highpass`/`bandpass`) section's `{ b0, b1, b2, a1, a2 }` coefficients |
| `AudioDSP._normalizeCoefficients(c)` | Validates and copies a `{b0,b1,b2,a1,a2}` coefficients object; throws `Invalid biquad coefficients` if any field is missing/non-finite |
| `AudioDSP._applyBiquad(x, c, state)` | Applies a single biquad section (direct-form difference equation) to a plain array, given/mutating a `{x1,x2,y1,y2}` state object; shared by `biquad`, `butterworth`, `parametricEQ`, and `createStatefulBiquad` |
| `AudioDSP._peaking(f, gainDb, Q, sr)` | Designs a peaking-EQ biquad section at frequency `f` with gain `gainDb` and bandwidth `Q`; used by `parametricEQ` |
| `h(len)` | Module-level helper returning `len / 2`, used inside `fft`'s butterfly loop |

---

**Note on the source header comment:** the file's leading doc-comment states that stateful filters are exposed through `createStatefulBiquad()`, `createStatefulDCBlocker()`, and `createLMS()`. Only `createStatefulBiquad()` is implemented in this version of the file — `createStatefulDCBlocker` and `createLMS` are not yet present as methods.
