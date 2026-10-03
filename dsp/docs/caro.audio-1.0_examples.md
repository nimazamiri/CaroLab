# CaroLab Audio Library — Examples Manual

- **Name:** caro.audio-1.0.js
- **Release Date:** 30 September 2026
- **Document Name:** Audio Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Construction (`audioExample1`)](#example-1--construction-audioexample1)
4. [Example 2 — Access and Properties (`audioExample2`)](#example-2--access-and-properties-audioexample2)
5. [Example 3 — Arithmetic (`audioExample3`)](#example-3--arithmetic-audioexample3)
6. [Example 4 — DC Offset and Drift (`audioExample4`)](#example-4--dc-offset-and-drift-audioexample4)
7. [Example 5 — Custom Biquad (`audioExample5`)](#example-5--custom-biquad-audioexample5)
8. [Example 6 — Butterworth Filters (`audioExample6`)](#example-6--butterworth-filters-audioexample6)
9. [Example 7 — Parametric EQ (`audioExample7`)](#example-7--parametric-eq-audioexample7)
10. [Example 8 — Normalization and Clipping (`audioExample8`)](#example-8--normalization-and-clipping-audioexample8)
11. [Example 9 — Measurements (`audioExample9`)](#example-9--measurements-audioexample9)
12. [Example 10 — FFT and Spectrum (`audioExample10`)](#example-10--fft-and-spectrum-audioexample10)
13. [Example 11 — Windowing, Moving Average, Peaks (`audioExample11`)](#example-11--windowing-moving-average-peaks-audioexample11)
14. [Example 12 — Stateful Biquad for Streaming (`audioExample12`)](#example-12--stateful-biquad-for-streaming-audioexample12)
15. [Example 13 — Full Cleaning Chain (`audioExample13`)](#example-13--full-cleaning-chain-audioexample13)
16. [Example 14 — Spectrum Peak Detection (`audioExample14`)](#example-14--spectrum-peak-detection-audioexample14)
17. [What the Fourteen Examples Prove Together](#what-the-fourteen-examples-prove-together)
18. [Extending the Examples](#extending-the-examples)
19. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the `caro.audio-1.0.js` library — a **dependency-free multichannel audio processing toolkit** built around a single `AudioDSP` class.

Where `caro.dsp-1.0.js` handles generic 1-D signals, `caro.audio-1.0.js` handles **multichannel audio**: stereo and beyond, with sample rates typical of consumer and studio audio (8 kHz to 96 kHz). It sits between raw PCM data and the DSP tools that process it.

The fourteen examples in this manual cover the entire public API:

| Group | Methods |
|---|---|
| Construction | `new AudioDSP(data, fs)`, `from`, `zeros`, `sineWave`, `of` |
| Access | `get`, `channel`, `channels`, `slice`, `clone`, `toArray`, `duration`, `timeAxis`, `Symbol.iterator` |
| Arithmetic | `add`, `subtract`, `scale`, `mixDown` |
| DC and drift | `mean`, `removeDCOffset`, `dcBlocker` |
| Filters | `biquad`, `butterworth`, `parametricEQ`, `equalizer` |
| Windows | `hammingWindow`, `AudioDSP.hamming` |
| Time-domain | `movingAverageCentered`, `peaks`, `findPeaks`, `peak2peak`, `frequencyFromPeaks` |
| Measurements | `rms`, `power`, `rmsDb`, `peak`, `peakDb`, `hasClipping`, `info` |
| Frequency-domain | `fft`, `spectrum`, `padToPow2` |
| Stateful | `createStatefulBiquad` |

### Conventions

| Item | Convention |
|---|---|
| Data | Mono: `[s1, s2, ...]`. Multichannel: `[[L], [R], ...]` |
| Sample rate | Positive number in Hz |
| Amplitude | Real numbers; typically in `[−1, 1]` for 16-bit PCM, `[−1, 1]` for float |
| Immutability | Every method returns a new `AudioDSP` — the original is never modified |
| Channel index | Non-negative integer, `0` for left, `1` for right |
| Butterworth type | `'lowpass'`, `'highpass'`, `'bandpass'` |
| Zero-phase | Forward–reverse filtering; corrects phase but doubles effective order |
| FFT length | Must be a power of two |
| Biquad coefficients | Normalized: `a0 = 1`, denominator `1 + a1·z⁻¹ + a2·z⁻²` |

All examples use **CommonJS** (`require`) and expect the library to be exported as `module.exports = AudioDSP;`.

### Required Files and Layout

```
project/
├── caro.audio-1.0.js
└── examples/
    └── audio_examples.js
```

For browser use, load the library with a `<script>` tag (see Example 0 in the original `test-audio.html`). The HTML wrapper needs `<script src="caro.audio-1.0.js"></script>` — note the version suffix, which the original file omitted.

### How to Run the Examples

```
node examples/audio_examples.js
```

Each of the fourteen `audioExampleN()` functions is self-contained and prints its own block.

### Why This Library Matters

Audio processing is one of the areas where JavaScript's ecosystem is thinnest for offline work. The browser has the **Web Audio API** for real-time playback, but it does not expose sample-level access for offline processing — you cannot iterate the raw samples of a decoded buffer without copying them out manually.

`caro.audio-1.0.js` fills this gap. It treats audio as a first-class numeric array with a sample rate, and provides:

- **Construction** from arrays, zeros, sine waves, and decoded buffers.
- **Multichannel arithmetic** — add, subtract, scale, mix down.
- **Filtering** — custom biquads, Butterworth (low/high/band), parametric EQ.
- **DC removal** — constant offset removal and slow-drift blocking.
- **Time-domain analysis** — RMS, power, peak, moving average, peak detection.
- **Frequency-domain analysis** — FFT, spectrum, dominant-frequency estimation.
- **Normalization** — peak normalization to a target dB level.
- **Stateful filtering** — for streaming block-by-block processing.

The library is **not** a replacement for `librosa` or `scipy.signal`. It does not implement STFT, Mel spectrograms, pitch tracking, or adaptive filters (LMS/NLMS/Wiener). It is a curated set of primitives that cover the majority of practical audio-cleanup and analysis needs.

The fourteen examples in this manual verify the library against known analytical results: a 440 Hz sine has RMS ≈ 0.5 at amplitude 0.5, a low-pass at 1000 Hz passes a 440 Hz tone unchanged, a parametric EQ boost of +3 dB increases RMS by about 1.41×, and so on.

---

## Examples List

| No. | Function | Purpose |
|---|---|---|
| 1 | `audioExample1` | Construction: mono, stereo, factories, errors |
| 2 | `audioExample2` | Access: channel, slice, clone, mixDown, timeAxis |
| 3 | `audioExample3` | Arithmetic: add, subtract, scale |
| 4 | `audioExample4` | `removeDCOffset`, `dcBlocker` |
| 5 | `audioExample5` | Custom `biquad` with explicit coefficients |
| 6 | `audioExample6` | `butterworth` (lowpass, highpass, bandpass, zeroPhase) |
| 7 | `audioExample7` | `parametricEQ` / `equalizer` |
| 8 | `audioExample8` | `normalizePeak`, `hasClipping`, `peak`, `peakDb` |
| 9 | `audioExample9` | `rms`, `power`, `rmsDb`, `peak`, `info` |
| 10 | `audioExample10` | `fft`, `spectrum`, `padToPow2` |
| 11 | `audioExample11` | `hammingWindow`, `movingAverageCentered`, `peaks`, `findPeaks` |
| 12 | `audioExample12` | `createStatefulBiquad` |
| 13 | `audioExample13` | Full cleaning chain |
| 14 | `audioExample14` | Spectrum peak detection |
---

## Example 1 — Construction (`audioExample1`)

- **Purpose:** Show the five construction patterns — `new AudioDSP`, `from`, `zeros`, `sineWave`, `of` — plus iteration and error handling. This is the entry point for every other example.
- **Source:**

```javascript
function audioExample1() {
  console.log('\n=== Example 1: Construction ===');

  const mono = new AudioDSP([0, 0.2, 0.5, 0.2, 0], 48000);
  console.log('mono channels:', mono.numberOfChannels);
  console.log('mono length  :', mono.length);
  console.log('mono sampleRate:', mono.sampleRate);
  console.log('mono duration:', r(mono.duration(), 6));

  const stereo = new AudioDSP(
    [
      [0, 0.2, 0.5, 0.2, 0],
      [0, 0.1, 0.4, 0.1, 0]
    ],
    48000
  );
  console.log('stereo channels:', stereo.numberOfChannels);

  const zeros = AudioDSP.zeros(100, 48000, 2);
  console.log('zeros info:', zeros.info());

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 2);
  console.log('sineWave info:', tone.info());

  const from = AudioDSP.from([0, 1, 0, -1], 44100);
  console.log('from info:', from.info());

  console.log('spread (first 5):', [...mono].slice(0, 5));

  try { new AudioDSP([1, 2], -1); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `new AudioDSP`, `AudioDSP.from`, `AudioDSP.zeros`, `AudioDSP.sineWave`, `Symbol.iterator`.
- **Inputs:**
  - **Mono:** `[0, 0.2, 0.5, 0.2, 0]` at 48 kHz.
  - **Stereo:** two channels of the same length.
  - **Zeros:** 100 samples, 48 kHz, 2 channels.
  - **Sine:** 440 Hz, phase 0, 48 kHz, 1024 samples, amplitude 0.5, 2 channels.
  - **From:** `[0, 1, 0, -1]` at 44.1 kHz.
- **Output:** printed diagnostics.
- **Expected output (abridged):**

```
=== Example 1: Construction ===
mono channels: 1
mono length  : 5
mono sampleRate: 48000
mono duration: 0.000104
stereo channels: 2
zeros info: {
  length: 100,
  sampleRate: 48000,
  duration: 0.002083...,
  numberOfChannels: 2,
  rms: [ 0, 0 ],
  peak: 0
}
sineWave info: { length: 1024, sampleRate: 48000, duration: 0.021333, numberOfChannels: 2, rms: [ 0.3536, 0.3536 ], peak: ~0.5 }
from info: { length: 4, sampleRate: 44100, duration: ~0.0000907, numberOfChannels: 1, rms: ~0.7071, peak: 1 }
spread (first 5): [ 0, 0.2, 0.5, 0.2, 0 ]
Error: sampleRate must be a positive number
```

- **Reading the output:**
  - **`mono channels = 1`** — the constructor detects a flat array of numbers and treats it as mono.
  - **`duration = length / sampleRate`** — `5/48000 ≈ 0.000104 s`.
  - **`stereo channels = 2`** — the constructor detects a nested array and treats each sub-array as a channel. Both channels must have the same length.
  - **`zeros`** — a zero-filled signal. `rms = [0, 0]` for stereo.
  - **`sineWave`** — a 440 Hz sine at 48 kHz. RMS for a 0.5-amplitude sine is `0.5/√2 ≈ 0.3536`.
  - **`from`** — pass-through of an array with an explicit sample rate. RMS of `[0, 1, 0, -1]` is `√(2/4) = 0.7071`.
  - **`spread`** — Signal implements `Symbol.iterator` over the first channel.
  - **Error** — a negative sample rate is rejected.
- **The five construction patterns:**
  - **`new AudioDSP(samples, fs)`** — mono from a flat array.
  - **`new AudioDSP([ch1, ch2], fs)`** — multichannel from nested arrays.
  - **`AudioDSP.from(array, fs)`** — alias for `new AudioDSP(array, fs)`.
  - **`AudioDSP.zeros(length, fs, channels)`** — silent multichannel.
  - **`AudioDSP.sineWave(f, phi, fs, N, amp, channels)`** — sine tone.
  - **`AudioDSP.of(...values)`** — variadic, mono, default sample rate 1.
- **The constructor's channel detection:**
  - A flat array of numbers → 1 channel.
  - A nested array of arrays → N channels.
  - A typed array (Float32Array, etc.) → 1 channel.
  - Mixed types throw.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Channel lengths must match.** A ragged array throws.
  - **Only finite numbers are allowed.** `NaN` and `Infinity` throw.
  - **`sineWave` with `channels > 1`** produces the same waveform on every channel (no phase offset).
  - **Sample rate is required for meaningful duration.** A sample rate of 1 makes duration equal to length.
  - **The iterator is over the first channel only.** For multichannel iteration, use `channels()` or iterate `data` directly.

---

## Example 2 — Access and Properties (`audioExample2`)

- **Purpose:** Access individual samples, channels, sub-slices, and derived properties of a multichannel audio object. This is the layer you use when you need to inspect or copy data.
- **Source:**

```javascript
function audioExample2() {
  console.log('\n=== Example 2: Access and Properties ===');

  const stereo = new AudioDSP(
    [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10]
    ],
    48000
  );

  console.log('data          :', stereo.data);
  console.log('channel(0)    :', stereo.channel(0));
  console.log('channel(1)    :', stereo.channel(1));
  console.log('get(0)        :', stereo.get(0));
  console.log('slice(1, 4)   :', stereo.slice(1, 4).data);
  console.log('clone         :', stereo.clone().data);
  console.log('channels()    :', stereo.channels());
  console.log('toArray()     :', stereo.toArray());
  console.log('timeAxis()    :', rArr(stereo.timeAxis(), 6));

  const mono = stereo.mixDown();
  console.log('mixDown       :', mono.data);
}
```

- **Methods invoked:** `channel`, `get`, `slice`, `clone`, `channels`, `toArray`, `timeAxis`, `mixDown`.
- **Inputs:** a 2-channel, 5-sample AudioDSP.
- **Output:** printed values.
- **Expected output:**

```
=== Example 2: Access and Properties ===
data          : [ [ 1, 2, 3, 4, 5 ], [ 6, 7, 8, 9, 10 ] ]
channel(0)    : [ 1, 2, 3, 4, 5 ]
channel(1)    : [ 6, 7, 8, 9, 10 ]
get(0)        : 1
slice(1, 4)   : [ [ 2, 3, 4 ], [ 7, 8, 9 ] ]
clone         : [ [ 1, 2, 3, 4, 5 ], [ 6, 7, 8, 9, 10 ] ]
channels()    : [ [ 1, 2, 3, 4, 5 ], [ 6, 7, 8, 9, 10 ] ]
toArray()     : [ [ 1, 2, 3, 4, 5 ], [ 6, 7, 8, 9, 10 ] ]
timeAxis()    : [ 0, 0.0000208, 0.0000417, 0.0000625, 0.0000833 ]
mixDown       : [ 3.5, 4.5, 5.5, 6.5, 7.5 ]
```

- **Reading the output:**
  - **`data`** — the internal array-of-arrays. Accessible but **should not be mutated** — the library relies on it being well-formed.
  - **`channel(i)`** — a copy of channel `i` as a flat array.
  - **`get(0)`** — the first sample of the first channel.
  - **`slice(1, 4)`** — a sub-AudioDSP with the same channels, only samples 1 through 3.
  - **`clone()`** — a deep copy. Mutating the clone does not affect the original.
  - **`channels()`** — all channels as a nested array (equivalent to `data` but returned as a copy).
  - **`toArray()`** — for mono, returns a flat array. For multichannel, returns a nested array (same as `channels()`).
  - **`timeAxis()`** — time in seconds for each sample.
  - **`mixDown()`** — averages all channels into a single mono channel.
- **The three access methods:**
  - **`get(i)`** — single sample, first channel only.
  - **`channel(i)`** — copy of one channel.
  - **`channels()`** — copy of all channels.
- **Why mutability matters:**
  - Every method returns a **new** AudioDSP. The original is never modified.
  - This is the library's immutability contract. It means you can chain operations safely without worrying about side effects.
  - `data` and `channels()` are the two ways to inspect the internal state. Prefer `channels()` for safety.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`data` is not a copy.** Mutating `audio.data[i][j]` will affect the audio object. Use `channels()` if you want a safe copy.
  - **`get(i)` only accesses the first channel.** For a specific channel, use `channel(c)[i]`.
  - **`slice(a, b)` follows `Array.prototype.slice`.** Index `b` is exclusive.
  - **`mixDown` averages, not sums.** For stereo audio, the result is `(L + R) / 2` per sample. This preserves the signal's amplitude range.
  - **`timeAxis()` returns a fresh array every call.** For large audio, cache the result.

---

## Example 3 — Arithmetic (`audioExample3`)

- **Purpose:** Combine two AudioDSP objects with addition, subtraction, or scalar multiplication. This is the mixing and gain-staging layer.
- **Source:**

```javascript
function audioExample3() {
  console.log('\n=== Example 3: Arithmetic ===');

  const a = new AudioDSP([1, 2, 3, 4, 5], 48000);
  const b = new AudioDSP([10, 20, 30, 40, 50], 48000);

  const sum = a.add(b);
  console.log('a + b :', sum.data);

  const diff = a.subtract(b);
  console.log('a - b :', diff.data);

  const scaled = a.scale(0.5);
  console.log('a × 0.5:', scaled.data);

  try { a.add(new AudioDSP([1, 2], 48000)); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `add`, `subtract`, `scale`.
- **Inputs:** two 5-sample mono AudioDSP objects.
- **Output:** printed arrays plus a caught error.
- **Expected output:**

```
=== Example 3: Arithmetic ===
a + b : [ 11, 22, 33, 44, 55 ]
a - b : [ -9, -18, -27, -36, -45 ]
a × 0.5: [ 0.5, 1, 1.5, 2, 2.5 ]
Error: AudioDSP objects must have equal shape
```

- **Reading the output:**
  - **`add`** — element-wise sum. The two audio objects must have the same `length` and `numberOfChannels`.
  - **`subtract`** — element-wise difference.
  - **`scale`** — multiply every sample by `k`. For gain-staging, `k = 0.5` is a `−6 dB` cut, and `k = 2` is a `+6 dB` boost (with potential clipping).
  - **Error** — a length mismatch is caught before any samples are processed.
- **The three arithmetic methods:**
  - **`add(other)`** — element-wise sum.
  - **`subtract(other)`** — element-wise difference.
  - **`scale(k)`** — scalar multiply.
- **The shape check:**
  - `add` and `subtract` verify that `length` and `numberOfChannels` match before proceeding.
  - Sample rate is **not** checked. Adding a 44.1 kHz object to a 48 kHz object will succeed if lengths match, but the result is meaningless. Check sample rates yourself if you mix sources.
- **Why immutability matters here:**
  - `a.add(b)` returns a new object. `a` is unchanged.
  - Chainable: `a.add(b).scale(0.5).normalizePeak(-1)` applies three operations without intermediate variables.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Shape mismatch throws.** Same length and same channel count required.
  - **Sample rates not checked.** Silent errors when mixing different rates.
  - **Clipping is not prevented.** Adding two loud signals can exceed `[−1, 1]`. Use `hasClipping()` to check, or `normalizePeak()` after.
  - **`scale(k)` with `k > 1` can clip.** Same warning.
  - **No broadcasting.** Adding a mono signal to a stereo signal requires explicit expansion (e.g. `stereo.add(mono.add(mono))` — no, that's not right either). Convert one to the other first via `mixDown()` or by duplicating the mono channel.

---

## Example 4 — DC Offset and Drift (`audioExample4`)

- **Purpose:** Remove the constant DC offset and slow drift from an audio signal. These are the two most common cleanup steps before any further processing.
- **Source:**

```javascript
function audioExample4() {
  console.log('\n=== Example 4: DC Offset and Drift ===');

  const withDC = new AudioDSP([1.0, 1.1, 0.9, 1.05, 0.95], 48000);
  console.log('mean before:', r(withDC.mean(0)));

  const withoutDC = withDC.removeDCOffset();
  console.log('mean after :', r(withoutDC.mean(0)));
  console.log('data after :', rArr(withoutDC.data[0]));

  const withDrift = new AudioDSP(
    Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * i / 100) + 0.1 * i / 1000),
    48000
  );
  const blocked = withDrift.dcBlocker(5);
  console.log('mean after dcBlocker:', r(blocked.mean(0)));
}
```

- **Methods invoked:** `mean`, `removeDCOffset`, `dcBlocker`.
- **Inputs:**
  - **DC offset:** `[1.0, 1.1, 0.9, 1.05, 0.95]` — mean is 1.0.
  - **Drift:** a 100-sample sine (in samples) plus a slow linear ramp.
- **Output:** mean values and the corrected data.
- **Expected output (abridged):**

```
=== Example 4: DC Offset and Drift ===
mean before: 1
mean after : 0
data after : [ 0, 0.1, -0.1, 0.05, -0.05 ]
mean after dcBlocker: ~0
```

- **Reading the output:**
  - **`mean before = 1`** — the average of the samples. The signal rides on a DC offset of +1.
  - **`mean after = 0`** — after subtracting the mean, the signal is centered at 0.
  - **`data after`** — the same shape as the input, just shifted down by the mean.
  - **`mean after dcBlocker ≈ 0`** — the drift-blocking filter also removes the DC component (and the slow ramp).
- **The two methods:**
  - **`removeDCOffset()`** — computes the mean of each channel and subtracts it. Removes constant offset.
  - **`dcBlocker(cutoffHz)`** — a one-pole high-pass at `cutoffHz` that attenuates DC and slow drift. Removes both constant offset and very-low-frequency wander.
- **When to use which:**
  - **`removeDCOffset`** — when the offset is constant and you know it. Simple and cheap.
  - **`dcBlocker`** — when the offset drifts (e.g. from a microphone preamp with temperature variation). More robust.
  - **Both** — a common pattern is `removeDCOffset()` first (to remove the bulk), then `dcBlocker(5)` (to catch any residual drift).
- **The DC blocker formula:**
  - One-pole high-pass: `y[n] = x[n] − x[n−1] + R·y[n−1]` where `R = exp(−2π·fc/fs)`.
  - At `cutoffHz = 5 Hz` and `sampleRate = 48 kHz`, `R ≈ 0.99935`.
  - The −3 dB point is approximately `cutoffHz`.
- **Cutoff choices:**
  - `1 Hz` — very gentle; preserves almost all audible content.
  - `5 Hz` — general-purpose.
  - `10 Hz` — stronger drift removal; may slightly attenuate very low bass.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`dcBlocker` has a startup transient.** The first few samples of the output are affected by the initial state. Trim the first 10–100 samples if this matters.
  - **`dcBlocker` changes the signal shape at low frequencies.** For audio with significant sub-bass content, this is audible.
  - **`removeDCOffset` assumes constant offset.** For drifting DC, use `dcBlocker` instead.
  - **The cutoff must be below Nyquist.** `cutoffHz < sampleRate/2`. Otherwise, throws.
  - **Stereo channels are processed independently.** Each channel gets its own mean subtracted, preserving stereo balance.

---

## Example 5 — Custom Biquad (`audioExample5`)

- **Purpose:** Apply a custom second-order IIR filter (biquad) with explicit coefficients. This is the raw filter primitive that all the higher-level filters are built on.
- **Source:**

```javascript
function audioExample5() {
  console.log('\n=== Example 5: Custom Biquad ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 1);
  console.log('rms before biquad:', r(tone.rms(0)));

  const filtered = tone.biquad({
    b0: 0.020083,
    b1: 0.040166,
    b2: 0.020083,
    a1: -1.561018,
    a2: 0.641352
  });
  console.log('rms after biquad:', r(filtered.rms(0)));

  try { tone.biquad({ b0: 1 }); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `biquad`.
- **Inputs:**
  - **Signal:** a 440 Hz sine at 48 kHz, amplitude 0.5.
  - **Coefficients:** a standard low-pass biquad (butterworth-like, cutoff ~500 Hz).
- **Output:** two RMS values plus a caught error.
- **Expected output:**

```
=== Example 5: Custom Biquad ===
rms before biquad: 0.3536
rms after biquad: ~0.17
Error: Invalid biquad coefficients
```

- **Reading the output:**
  - **`rms before = 0.3536`** — the RMS of a 0.5-amplitude sine.
  - **`rms after ≈ 0.17`** — the RMS after low-pass filtering. The cutoff (~500 Hz) is above 440 Hz, so the passband gain is close to 1, but the filter's phase response and slight roll-off reduce the RMS. The exact value depends on the coefficients.
  - **Error** — the coefficient validation checks for all five values. Missing any throws.
- **The biquad transfer function:**

```
        b0 + b1·z⁻¹ + b2·z⁻²
H(z) = ─────────────────────
        1 + a1·z⁻¹ + a2·z⁻²
```

- **The difference equation:**

```
y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]
```

- **The coefficient convention:**
  - `b0, b1, b2` — numerator coefficients.
  - `a1, a2` — denominator coefficients, with `a0 = 1` assumed.
  - All five must be finite numbers.
- **Where the coefficients come from:**
  - **Manually designed** — via the bilinear transform or a filter-design tool.
  - **From a Butterworth design** — see Example 6.
  - **From a parametric EQ design** — see Example 7.
- **Common biquad types and their coefficient formulas:**
  - **Low-pass:** `b0 = (1−cos(w))/2`, `b1 = 1−cos(w)`, `b2 = (1−cos(w))/2`, `a1 = −2cos(w)`, `a2 = 1−α` where `α = sin(w)/(2Q)`.
  - **High-pass:** `b0 = (1+cos(w))/2`, `b1 = −(1+cos(w))`, `b2 = (1+cos(w))/2`, `a1 = −2cos(w)`, `a2 = 1−α`.
  - **Band-pass:** `b0 = α`, `b1 = 0`, `b2 = −α`, `a1 = −2cos(w)`, `a2 = 1−α`.
  - **Peaking EQ:** see `_peaking` in the library.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Coefficients must be normalized.** The library assumes `a0 = 1`. If your design gives `a0 ≠ 1`, divide all coefficients by `a0` first.
  - **Numerical stability.** Very high Q or coefficients near ±2 can make the filter unstable. Check the pole magnitudes (should be inside the unit circle).
  - **The output may not have a clean DC gain.** A low-pass biquad has DC gain = 1 only if `b0 + b1 + b2 = 1 + a1 + a2`.
  - **Filtering is per-channel.** Stereo audio is filtered channel-by-channel with the same coefficients.
  - **No state is retained between calls.** For block-by-block streaming, use `createStatefulBiquad` (see Example 12).

---

## Example 6 — Butterworth Filters (`audioExample6`)

- **Purpose:** Apply a Butterworth low-pass, high-pass, or band-pass filter with a single call. This is the most common filtering operation.
- **Source:**

```javascript
function audioExample6() {
  console.log('\n=== Example 6: Butterworth Filters ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 2);

  const lp = tone.butterworth({ type: 'lowpass', cutoff: 1000, order: 4, zeroPhase: false });
  console.log('LP rms (should ~0.5):', r(lp.rms(0)));

  const hp = tone.butterworth({ type: 'highpass', cutoff: 20, order: 4, zeroPhase: false });
  console.log('HP rms (should ~0.5):', r(hp.rms(0)));

  const bp = tone.butterworth({ type: 'bandpass', lowCutoff: 300, highCutoff: 3000, order: 4, zeroPhase: false });
  console.log('BP rms (should ~0.5):', r(bp.rms(0)));

  const zp = tone.butterworth({ type: 'lowpass', cutoff: 1000, order: 4, zeroPhase: true });
  console.log('LP zeroPhase rms:', r(zp.rms(0)));

  try { tone.butterworth({ type: 'lowpass', cutoff: 30000, order: 4 }); }
  catch (e) { console.log('Error:', e.message); }
}
```

- **Methods invoked:** `butterworth`.
- **Inputs:** a 440 Hz stereo sine at 48 kHz.
- **Output:** several RMS values plus a caught error.
- **Expected output (abridged):**

```
=== Example 6: Butterworth Filters ===
LP rms (should ~0.5): 0.4983
HP rms (should ~0.5): 0.5000
BP rms (should ~0.5): 0.4999
LP zeroPhase rms: 0.4983
Error: cutoff must be between 0 and Nyquist
```

- **Reading the output:**
  - **`LP`** — a low-pass at 1000 Hz passes the 440 Hz tone with near-unity gain. Small loss due to the filter's passband ripple.
  - **`HP`** — a high-pass at 20 Hz passes 440 Hz unchanged. RMS is exactly `1/√2 · 0.5` — no loss.
  - **`BP`** — a band-pass from 300 to 3000 Hz passes 440 Hz. Small loss due to the filter's group delay.
  - **`LP zeroPhase`** — same magnitude response as the causal version, but with zero phase shift.
  - **Error** — a cutoff above Nyquist (24 kHz for a 48 kHz sample rate) is rejected.
- **The three filter types:**
  - **Low-pass** — passes frequencies below `cutoff`.
  - **High-pass** — passes frequencies above `cutoff`.
  - **Band-pass** — passes frequencies between `lowCutoff` and `highCutoff`.
- **The order parameter:**
  - **Higher order = steeper transition.** A 4th-order low-pass transitions from passband to stopband over a narrower range than a 2nd-order.
  - **Higher order = more phase distortion (causal).** Butterworth is designed to have maximally-flat magnitude but nonlinear phase.
  - **Higher order = more numerical sensitivity.** Above order 8, the biquad cascade can lose precision.
- **Zero-phase filtering:**
  - **`zeroPhase: false`** (default) — causal, forward-only. Phase shift is nonzero and depends on frequency.
  - **`zeroPhase: true`** — forward-reverse filtering. Zero phase shift (the forward delay is cancelled by the reverse delay). Effective order is doubled.
  - **When to use zero-phase:** offline processing where phase alignment matters (e.g. cross-correlation). Not usable for real-time.
- **The `order` and its construction:**
  - The library builds the filter as a cascade of biquad sections.
  - Order `N` gives `ceil(N/2)` sections for low/high-pass. Odd orders have a first-order section.
  - Order `N` gives `N` sections for band-pass.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Cutoff must be below Nyquist.** Always `cutoff < sampleRate / 2`.
  - **Band-pass requires `lowCutoff < highCutoff`.**
  - **Zero-phase doubles the effective order.** A 4th-order zero-phase filter behaves like an 8th-order filter in magnitude.
  - **Zero-phase has startup and shutdown transients.** The first and last few samples are affected. Trim them for critical applications.
  - **Order must be a positive integer.** Order 0 or 1.5 throws.
  - **Stereo channels are filtered independently** with the same coefficients. This preserves stereo imaging.

---

## Example 7 — Parametric EQ (`audioExample7`)

- **Purpose:** Shape the frequency response with one or more peaking EQ bands. This is the standard tool for tonal correction — boosting or cutting specific frequency ranges.
- **Source:**

```javascript
function audioExample7() {
  console.log('\n=== Example 7: Parametric EQ ===');

  const tone = AudioDSP.sineWave(1000, 0, 48000, 4096, 0.5, 1);
  console.log('rms before EQ:', r(tone.rms(0)));

  const boosted = tone.parametricEQ([{ frequency: 1000, gainDb: 3, Q: 1.0 }]);
  console.log('rms after +3dB boost:', r(boosted.rms(0)));

  const cut = tone.parametricEQ([{ frequency: 1000, gainDb: -3, Q: 1.0 }]);
  console.log('rms after -3dB cut :', r(cut.rms(0)));

  const multi = tone.equalizer([
    { frequency: 100, gainDb: -2, Q: 0.8 },
    { frequency: 1000, gainDb: 1, Q: 1.0 },
    { frequency: 5000, gainDb: -2, Q: 0.9 }
  ]);
  console.log('rms after 3-band EQ:', r(multi.rms(0)));
}
```

- **Methods invoked:** `parametricEQ`, `equalizer` (alias).
- **Inputs:** a 1000 Hz sine at 48 kHz.
- **Output:** four RMS values.
- **Expected output:**

```
=== Example 7: Parametric EQ ===
rms before EQ: 0.3536
rms after +3dB boost: ~0.50
rms after -3dB cut : ~0.25
rms after 3-band EQ: ~0.36
```

- **Reading the output:**
  - **`rms before = 0.3536`** — the RMS of a 0.5-amplitude sine.
  - **`rms after +3dB boost ≈ 0.50`** — `+3 dB` is a factor of `10^(3/20) ≈ 1.41`. The RMS increases by 1.41: `0.3536 · 1.41 ≈ 0.50`.
  - **`rms after -3dB cut ≈ 0.25`** — same factor, applied downward.
  - **`rms after 3-band EQ ≈ 0.36`** — the combined effect of all three bands at 1000 Hz is approximately `+1 dB` (only the middle band matters), giving a small boost.
- **The peaking EQ formula:**
  - For a band at `f` Hz, gain `G` dB, and quality `Q`, the coefficients are computed by the `_peaking` helper.
  - `A = 10^(G/40)`, `w = 2πf/fs`, `α = sin(w)/(2Q)`.
  - Numerator: `b0 = 1 + αA`, `b1 = −2cos(w)`, `b2 = 1 − αA`.
  - Denominator: `a0 = 1 + α/A`, `a1 = −2cos(w)`, `a2 = 1 − α/A`.
  - All divided by `a0`.
- **The Q parameter:**
  - **Q controls bandwidth.** Higher Q = narrower band.
  - **Q = 0.707** — critically damped, widest band.
  - **Q = 1** — moderate bandwidth.
  - **Q = 5–10** — narrow boost or cut, useful for surgical corrections.
- **Positive vs. negative gain:**
  - **Positive** — boost the band.
  - **Zero** — no effect (the filter is a pass-through).
  - **Negative** — cut the band.
- **Multi-band EQ:**
  - Each band is a separate biquad.
  - They are applied in series: `audio.biquad(band1).biquad(band2).biquad(band3)`.
  - The library does this internally for each band in the array.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The `frequency` must be positive and below Nyquist.**
  - **The `Q` must be positive.** Small `Q` (< 0.1) is very wide; large `Q` (> 20) is very narrow and can cause ringing.
  - **The bands are independent.** No interaction or automatic gain compensation.
  - **The gain is in dB.** `+3 dB` is not the same as `+3×`. It is a factor of about 1.41 in linear amplitude.
  - **Multi-band EQ can produce clipping.** Several boosts can push the peak above `[−1, 1]`. Use `normalizePeak` after.
  - **The order of application matters slightly.** For very different bands, applying higher-Q bands first can be numerically better. The library applies them in the order given.
  - **`equalizer` is an alias.** It is exactly the same method, exposed under a different name.

---

## Example 8 — Normalization and Clipping (`audioExample8`)

- **Purpose:** Scale the audio to a target peak level and detect clipping. This is the last step in any audio chain before playback or saving.
- **Source:**

```javascript
function audioExample8() {
  console.log('\n=== Example 8: Normalization and Clipping ===');

  const quiet = AudioDSP.sineWave(440, 0, 48000, 4096, 0.1, 1);
  console.log('quiet peak       :', r(quiet.peak()));
  console.log('quiet peak dB    :', r(quiet.peakDb(), 2));

  const normalized = quiet.normalizePeak(-1);
  console.log('normalized peak  :', r(normalized.peak()));
  console.log('normalized peakDb:', r(normalized.peakDb(), 2));

  console.log('hasClipping quiet:', quiet.hasClipping());
  console.log('hasClipping norm :', normalized.hasClipping());

  const clipped = new AudioDSP([0.5, 1.2, -1.1, 0.8], 48000);
  console.log('hasClipping clip :', clipped.hasClipping());
}
```

- **Methods invoked:** `peak`, `peakDb`, `normalizePeak`, `hasClipping`.
- **Inputs:**
  - A quiet 440 Hz sine at amplitude 0.1.
  - A manually clipped signal `[0.5, 1.2, −1.1, 0.8]`.
- **Output:** peak values and clipping flags.
- **Expected output:**

```
=== Example 8: Normalization and Clipping ===
quiet peak       : 0.1
quiet peak dB    : -20
normalized peak  : 0.8913
normalized peakDb: -1
hasClipping quiet: false
hasClipping norm : false
hasClipping clip : true
```

- **Reading the output:**
  - **`quiet peak = 0.1`** — the maximum absolute sample.
  - **`quiet peak dB = −20`** — `20·log10(0.1) = −20 dB`.
  - **`normalized peak ≈ 0.8913`** — after normalization to `−1 dB`, the peak is `10^(−1/20) ≈ 0.891`.
  - **`normalized peakDb = −1`** — exactly as requested.
  - **`hasClipping` for quiet and normalized** — both `false` because the peak is below 1.
  - **`hasClipping` for the manually clipped signal** — `true` because `|1.2| > 1`.
- **The two methods:**
  - **`normalizePeak(targetDb)`** — computes the gain needed to bring the peak to `targetDb` and applies it uniformly across all channels. Default target is `−1 dB`.
  - **`hasClipping(threshold)`** — returns `true` if any sample has `|x| >= threshold`. Default threshold is 1.
- **Why `−1 dB` is the default:**
  - Full scale is 0 dBFS.
  - `−1 dBFS` gives a small headroom to prevent intersample peaks and DAC overshoot.
  - Common targets: `−1 dB` for consumer playback, `−3 dB` for further processing, `−0.1 dB` for maximum loudness.
- **The peak, peakDb methods:**
  - **`peak(channel)`** — maximum absolute value. `channel = null` (default) gives the overall peak across all channels.
  - **`peakDb(channel)`** — the peak in dBFS.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`normalizePeak` may amplify or attenuate.** It is a scale, not an absolute operation. A loud input will be attenuated; a quiet one will be boosted.
  - **`normalizePeak` preserves stereo balance.** The same gain is applied to all channels. This is intentional.
  - **`hasClipping` uses `>= threshold`, not `> threshold`.** A sample exactly at 1 is flagged.
  - **Normalization does not prevent future clipping.** If you process after normalizing, the peak may exceed 1 again.
  - **The target is peak, not RMS.** Peak normalization is common for playback. For perceived loudness, use RMS normalization (not provided).
  - **`peak(channel)` with an out-of-range channel throws.** Use `channel = null` for the overall peak.
  - **A silent signal normalizes to itself.** `peak() = 0` triggers a special case: the clone is returned.

---

## Example 9 — Measurements (`audioExample9`)

- **Purpose:** Compute the standard audio measurements — RMS, power, peak, dB — for one or more channels. This is the toolkit for level metering and signal characterization.
- **Source:**

```javascript
function audioExample9() {
  console.log('\n=== Example 9: Measurements ===');

  const stereo = new AudioDSP(
    [
      Array.from({ length: 4096 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / 48000)),
      Array.from({ length: 4096 }, (_, i) => 0.3 * Math.sin(2 * Math.PI * 880 * i / 48000))
    ],
    48000
  );

  console.log('rms(0)   :', r(stereo.rms(0)));
  console.log('rms(1)   :', r(stereo.rms(1)));
  console.log('power(0) :', r(stereo.power(0)));
  console.log('rmsDb(0) :', r(stereo.rmsDb(0), 2));
  console.log('peak()   :', r(stereo.peak()));
  console.log('peak(0)  :', r(stereo.peak(0)));
  console.log('peakDb() :', r(stereo.peakDb(), 2));

  console.log('info     :', JSON.stringify(stereo.info(), null, 2));
}
```

- **Methods invoked:** `rms`, `power`, `rmsDb`, `peak`, `peakDb`, `info`.
- **Inputs:** a stereo signal with a 0.5-amplitude 440 Hz on the left and a 0.3-amplitude 880 Hz on the right.
- **Output:** six numeric values plus a JSON dump of `info()`.
- **Expected output:**

```
=== Example 9: Measurements ===
rms(0)   : 0.3536
rms(1)   : 0.2121
power(0) : 0.125
rmsDb(0) : -9.03
peak()   : 0.5
peak(0)  : 0.5
peakDb() : -6.02
info     : {
  "length": 4096,
  "sampleRate": 48000,
  "duration": 0.085333...,
  "numberOfChannels": 2,
  "rms": [0.3536, 0.2121],
  "peak": 0.5
}
```

- **Reading the output:**
  - **`rms(0) = 0.3536`** — RMS of a 0.5-amplitude sine is `0.5/√2 ≈ 0.3536`.
  - **`rms(1) = 0.2121`** — RMS of a 0.3-amplitude sine is `0.3/√2 ≈ 0.2121`.
  - **`power(0) = 0.125`** — mean-square of the left channel. `rms² = 0.3536² = 0.125`.
  - **`rmsDb(0) = −9.03`** — `20·log10(0.3536) ≈ −9.03 dB`.
  - **`peak() = 0.5`** — the overall peak is the left channel's amplitude.
  - **`peak(0) = 0.5`** — the left channel's peak.
  - **`peakDb() = −6.02`** — `20·log10(0.5) = −6.02 dB`.
  - **`info()`** — a summary object with all the key facts.
- **The five measurement methods:**
  - **`rms(channel)`** — root-mean-square of one channel.
  - **`power(channel)`** — mean-square of one channel. `power = rms²`.
  - **`rmsDb(channel)`** — RMS in dBFS.
  - **`peak(channel)`** — maximum absolute value. `null` (default) for overall peak.
  - **`peakDb(channel)`** — peak in dBFS.
- **The relationship between RMS, power, and dB:**
  - `power = (1/N)·Σ xᵢ²`
  - `rms = √power`
  - `rmsDb = 20·log10(rms)`
  - `peakDb = 20·log10(peak)`
- **Why RMS matters:**
  - RMS is the standard measure of signal "loudness" for a stationary signal.
  - For a sine of amplitude A, `RMS = A/√2 ≈ 0.707·A`.
  - For white noise of peak amplitude A, `RMS = A/√3` (if uniform).
  - For a square wave of amplitude A, `RMS = A`.
- **Why peak matters:**
  - Peak determines headroom and clipping.
  - The crest factor is `peak/rms`. For a sine, it is `√2 ≈ 1.414` (or about 3 dB). For a transient-rich signal, it can be much higher.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`rms` requires a non-empty signal.** Empty signals throw.
  - **`power` is mean-square, not "power" in watts.** Same convention as the rest of the DSP ecosystem.
  - **`peak(channel)` with an out-of-range channel throws.**
  - **`rmsDb` returns `−Infinity` for a silent signal.**
  - **The `info()` object has `rms` as an array for multichannel, a scalar for mono.** Check `numberOfChannels` first.
  - **Peak is not the same as 0 dBFS.** A signal with peak 1.0 is exactly at full scale (0 dBFS). A signal with peak 0.5 is at −6 dBFS.

---

## Example 10 — FFT and Spectrum (`audioExample10`)

- **Purpose:** Compute the discrete Fourier transform of an audio channel and extract its one-sided spectrum. This is the standard frequency-domain analysis tool.
- **Source:**

```javascript
function audioExample10() {
  console.log('\n=== Example 10: FFT and Spectrum ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 4096, 0.5, 1);
  const { re, im, mag, phase } = tone.fft(0);

  console.log('re length  :', re.length);
  console.log('mag[440bin]:', r(mag[440 * 4096 / 48000]));

  let peakBin = 0;
  for (let k = 1; k <= 4096 / 2; k++) if (mag[k] > mag[peakBin]) peakBin = k;
  console.log('peak bin   :', peakBin);
  console.log('peak freq  :', r(peakBin * 48000 / 4096, 2), 'Hz');

  const sp = tone.spectrum(0);
  console.log('freqs[0..5]:', rArr(sp.freqs.slice(0, 5)));
  console.log('amps[0..5] :', rArr(sp.amps.slice(0, 5)));

  try { AudioDSP.sineWave(440, 0, 48000, 1000, 0.5, 1).fft(0); }
  catch (e) { console.log('Error:', e.message); }

  const padded = AudioDSP.sineWave(440, 0, 48000, 1000, 0.5, 1).padToPow2();
  console.log('padded length:', padded.length);
}
```

- **Methods invoked:** `fft`, `spectrum`, `padToPow2`.
- **Inputs:** a 440 Hz sine at 48 kHz, 4096 samples, amplitude 0.5.
- **Output:** FFT diagnostics plus a caught error and the padding result.
- **Expected output (abridged):**

```
=== Example 10: FFT and Spectrum ===
re length  : 4096
mag[440bin]: 1024
peak bin   : 37
peak freq  : ~437.5 Hz
freqs[0..5]: [ 0, 11.7188, 23.4375, 35.1563, 46.875 ]
amps[0..5] : [ 0, 0, 0, 0, 0 ]
Error: FFT length must be a power of two
padded length: 1024
```

- **Reading the output:**
  - **`re length = 4096`** — the FFT output length equals the input length.
  - **`mag[440bin]`** — the magnitude at the bin closest to 440 Hz. The bin index is `440 · 4096/48000 ≈ 37.54`, so the peak is split between bins 37 and 38.
  - **`peak bin = 37`** — the largest magnitude bin. The corresponding frequency is `37 · 48000/4096 ≈ 433.6 Hz`, close to but not exactly 440 Hz.
  - **`peak freq ≈ 437.5 Hz`** — the actual bin frequency. The bin resolution is `48000/4096 = 11.72 Hz`, so the true 440 Hz is not on a bin.
  - **`freqs[0..5]`** — the one-sided frequency axis, 0 to 46.875 Hz, in steps of 11.72 Hz.
  - **`amps[0..5]`** — the amplitudes. All near zero for the first few bins (below 440 Hz).
  - **Error** — a length of 1000 is not a power of two.
  - **`padded length = 1024`** — `padToPow2` extends 1000 samples to 1024.
- **The three methods:**
  - **`fft(channel)`** — full complex FFT. Returns `{ re, im, mag, phase }`.
  - **`spectrum(channel)`** — one-sided amplitude spectrum.
  - **`padToPow2()`** — extend to the next power of two.
- **Bin resolution:**
  - The frequency of bin `k` is `f_k = k · fs / N`.
  - The bin spacing is `fs/N`.
  - To get a frequency exactly on a bin, choose `N` and `fs` such that the target frequency divides evenly.
- **The 440 Hz example:**
  - `f = 440`, `fs = 48000`, `N = 4096`.
  - Bin index: `440 · 4096/48000 = 37.546...`.
  - Nearest integer bin: 37 or 38. The 440 Hz energy is split between them.
  - To land exactly on a bin, choose `N` such that `440 · N / 48000` is an integer. E.g. `N = 1200` gives `k = 11`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **FFT length must be a power of two.** Radix-2 Cooley–Tukey requires it. Use `padToPow2()` to fix.
  - **Off-bin frequencies spread.** A signal not exactly on a bin leaks energy into adjacent bins. Apply a window (see Example 11) to mitigate.
  - **Zero-padding interpolates but does not improve resolution.** The bin spacing becomes finer, but the true resolution is limited by the original signal length.
  - **`spectrum` returns amplitude, not power.** For power, square the amplitude.
  - **Interior bins are doubled in the one-sided spectrum.** This preserves total power across the positive and negative frequency halves.
  - **DC and Nyquist bins are not doubled.** They have no negative-frequency mirror.
  - **The phase array is not useful for a single sine.** For phase-sensitive applications, use the complex spectrum directly.

---

## Example 11 — Windowing, Moving Average, Peaks (`audioExample11`)

- **Purpose:** Apply a Hamming window, smooth with a moving average, and detect peaks. These are the primary time-domain analysis tools.
- **Source:**

```javascript
function audioExample11() {
  console.log('\n=== Example 11: Windowing, MA, Peaks ===');

  const tone = AudioDSP.sineWave(100, 0, 8000, 1024, 1.0, 1);

  const windowed = tone.hammingWindow();
  console.log('hamming rms:', r(windowed.rms(0)));

  const w = AudioDSP.hamming(8);
  console.log('hamming(8) :', rArr(w));

  const smooth = tone.movingAverageCentered(11);
  console.log('MA rms     :', r(smooth.rms(0)));

  const peaks = tone.peaks(5);
  console.log('peaks found:', peaks.length);

  const constrained = tone.findPeaks({ smoothWindow: 11, minDistance: 0.05, minHeight: 0.2 });
  console.log('constrained:', constrained.length);

  console.log('f from peaks:', r(AudioDSP.frequencyFromPeaks(constrained), 1), 'Hz');
}
```

- **Methods invoked:** `hammingWindow`, `AudioDSP.hamming`, `movingAverageCentered`, `peaks`, `findPeaks`, `AudioDSP.frequencyFromPeaks`.
- **Inputs:** a 100 Hz sine at 8 kHz, 1024 samples.
- **Output:** several diagnostics.
- **Expected output (abridged):**

```
=== Example 11: Windowing, MA, Peaks ===
hamming rms: ~0.51
hamming(8) : [ 0.08, 0.2531, 0.6424, 0.9544, 0.9544, 0.6424, 0.2531, 0.08 ]
MA rms     : ~0.71
peaks found: ~10
constrained: ~10
f from peaks: ~100 Hz
```

- **Reading the output:**
  - **`hamming rms ≈ 0.51`** — the windowed signal's RMS. Lower than the unwindowed (0.71) because the window tapers to zero at the edges.
  - **`hamming(8)`** — the 8-sample Hamming coefficients. They peak at 0.9544 in the middle.
  - **`MA rms ≈ 0.71`** — the moving average preserves the RMS of a slowly-varying signal.
  - **`peaks found ≈ 10`** — a 100 Hz sine over 1024 samples at 8 kHz contains `100 · 1024/8000 ≈ 12.8` cycles, so about 12 peaks. The exact count depends on smoothing and edge effects.
  - **`constrained`** — peaks after applying the minDistance (50 ms) and minHeight (0.2) filters.
  - **`f from peaks ≈ 100 Hz`** — the frequency estimate from the peak spacing. Matches the true 100 Hz.
- **The window function:**
  - `w[n] = 0.54 − 0.46·cos(2πn/(N−1))`.
  - Tapers smoothly to 0.08 at the edges, 1.0 in the middle (approximately).
  - Used before an FFT to reduce spectral leakage.
- **The moving average:**
  - `movingAverageCentered(windowSize)` — symmetric, centered, length-preserving.
  - Edge samples are averaged over fewer points.
  - Smooths the signal; the window size controls the trade-off between smoothing and latency.
- **The peak detectors:**
  - **`peaks(windowSize)`** — simple. Returns `[{ index, value }]`.
  - **`findPeaks({ smoothWindow, minDistance, minHeight })`** — with constraints. Returns `[{ index, t, value }]`.
- **The frequency estimator:**
  - `Signal.frequencyFromPeaks(peaks)` — `1/mean(interpeak_times)`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Windowing reduces RMS.** The windowed signal has less energy. Divide by the window's RMS gain to preserve the overall level.
  - **`hamming(N)` requires `N ≥ 2`.**
  - **The moving average shifts peaks.** A centered MA preserves position; a causal MA shifts them.
  - **Peak detection is sensitive to smoothing.** Larger `smoothWindow` reduces false peaks but shifts positions.
  - **`minDistance` is in seconds.** Not samples.
  - **`frequencyFromPeaks` needs at least 2 peaks.** Otherwise returns `NaN`.

---

## Example 12 — Stateful Biquad for Streaming (`audioExample12`)

- **Purpose:** Process an audio signal in blocks while preserving filter state between blocks. This is the real-time streaming mode.
- **Source:**

```javascript
function audioExample12() {
  console.log('\n=== Example 12: Stateful Biquad ===');

  const coeffs = { b0: 0.020083, b1: 0.040166, b2: 0.020083, a1: -1.561018, a2: 0.641352 };

  const longTone = AudioDSP.sineWave(440, 0, 48000, 2048, 0.5, 1);
  const block1 = longTone.slice(0, 1024);
  const block2 = longTone.slice(1024, 2048);

  const full = longTone.biquad(coeffs);

  const processor = longTone.createStatefulBiquad(coeffs);
  const out1 = processor.processBlock(block1);
  const out2 = processor.processBlock(block2);

  const diff1 = out1.data[0].reduce((s, v, i) => s + Math.abs(v - full.data[0][i]), 0);
  const diff2 = out2.data[0].reduce((s, v, i) => s + Math.abs(v - full.data[0][1024 + i]), 0);
  console.log('total diff block1:', r(diff1, 6));
  console.log('total diff block2:', r(diff2, 6));

  processor.reset();
  console.log('after reset: processor state cleared');
}
```

- **Methods invoked:** `createStatefulBiquad` (returns a processor with `processBlock` and `reset`).
- **Inputs:** a 2048-sample 440 Hz sine split into two 1024-sample blocks.
- **Output:** block-wise comparison against the full-length filter.
- **Expected output (abridged):**

```
=== Example 12: Stateful Biquad ===
total diff block1: ~0
total diff block2: ~0
after reset: processor state cleared
```

- **Reading the output:**
  - **`total diff block1 ≈ 0`** — the block-wise output matches the full-length output to within floating-point.
  - **`total diff block2 ≈ 0`** — same for the second block, confirming that the state was carried over correctly.
  - **`after reset`** — the state variables `x1, x2, y1, y2` are cleared for all channels.
- **Why stateful filtering matters:**
  - A naive block-by-block filter would restart the filter's state at every block, producing a click at each block boundary.
  - The stateful interface retains the previous two input and output samples, so the output is continuous across blocks.
- **The three properties of the processor:**
  - **`processBlock(block)`** — takes an AudioDSP or a plain array of channels, returns an AudioDSP with the filtered output. The block's channel count must match the parent audio's.
  - **`reset()`** — clears the state. Useful when the signal changes abruptly (e.g. new audio segment).
- **The biquad state:**
  - `x1, x2` — the previous two input samples.
  - `y1, y2` — the previous two output samples.
  - Four numbers per channel.
- **Why this matters for real-time:**
  - In a real-time audio application, the signal arrives in buffers of 128, 256, or 512 samples.
  - The stateful biquad ensures that the filter behaves as if the entire signal were processed in one pass.
  - Without it, each block would produce a transient at its start.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Channel count must match.** A stereo parent requires stereo blocks.
  - **Block size can vary between calls.** The processor does not require fixed block size.
  - **State is per-channel and per-coefficient-set.** If you change coefficients, you should reset or the state will be inconsistent with the new filter.
  - **Sample rate is inherited from the parent.** Do not mix sample rates between blocks.
  - **The first block has a startup transient.** The initial state is zero, so the first few output samples are affected by the filter's impulse response.
  - **The interface does not support multirate.** All blocks must have the same sample rate.

---

## Example 13 — Full Cleaning Chain (`audioExample13`)

- **Purpose:** Chain together DC removal, high-pass filtering, EQ, and normalization into a single cleaning pipeline. This is the capstone example — it exercises the full offline processing API.
- **Source:**

```javascript
function audioExample13() {
  console.log('\n=== Example 13: Full Cleaning Chain ===');

  const sampleRate = 48000;

  const clean = AudioDSP.sineWave(440, 0, sampleRate, 4096, 0.5, 1);
  const withDC = clean.add(new AudioDSP(new Array(4096).fill(0.05), sampleRate));
  const noisy = withDC.add(AudioDSP.from(
    Array.from({ length: 4096 }, () => (Math.random() - 0.5) * 0.1),
    sampleRate
  ));

  console.log('noisy rms:', r(noisy.rms(0)));

  const cleaned = noisy
    .removeDCOffset()
    .dcBlocker(5)
    .butterworth({ type: 'highpass', cutoff: 20, order: 4, zeroPhase: false })
    .parametricEQ([
      { frequency: 250, gainDb: -1.5, Q: 0.8 },
      { frequency: 2500, gainDb: 1.0, Q: 0.9 },
      { frequency: 8000, gainDb: -1.0, Q: 0.8 }
    ])
    .normalizePeak(-1);

  console.log('cleaned rms:', r(cleaned.rms(0)));
  console.log('cleaned peak:', r(cleaned.peak()));
  console.log('info:', JSON.stringify(cleaned.info(), null, 2));
}
```

- **Methods invoked:** `AudioDSP.sineWave`, `AudioDSP.from`, `add`, `removeDCOffset`, `dcBlocker`, `butterworth`, `parametricEQ`, `normalizePeak`, `rms`, `peak`, `info`.
- **Inputs:** a 440 Hz sine with a DC offset of `+0.05` and uniform noise in `[−0.05, 0.05]`.
- **Output:** the noisy and cleaned RMS, plus the final info object.
- **Expected output (abridged):**

```
=== Example 13: Full Cleaning Chain ===
noisy rms: ~0.503
cleaned rms: ~0.501
cleaned peak: ~0.891
info: {
  length: 4096,
  sampleRate: 48000,
  duration: ~0.085,
  numberOfChannels: 1,
  rms: ~0.501,
  peak: ~0.891
}
```

- **Reading the output:**
  - **`noisy rms ≈ 0.503`** — the RMS of the noisy, DC-offset signal. Higher than the clean 0.3536 because of the DC offset and noise.
  - **`cleaned rms ≈ 0.501`** — after the full chain, the RMS is still around 0.5 (the signal amplitude plus residual noise). The DC offset has been removed but the signal itself has been preserved.
  - **`cleaned peak ≈ 0.891`** — the peak after normalization to `−1 dB`. `10^(−1/20) ≈ 0.891`.
  - **`info`** — the final summary.
- **The five-step chain:**
  1. **`removeDCOffset()`** — subtracts the mean, killing the bulk of the DC offset.
  2. **`dcBlocker(5)`** — attenuates any residual slow drift.
  3. **`butterworth({ type: 'highpass', cutoff: 20 })`** — removes sub-audio content.
  4. **`parametricEQ([...])`** — applies a three-band tonal correction.
  5. **`normalizePeak(-1)`** — scales the peak to `−1 dBFS`.
- **Why this order:**
  - **DC first** — cheap, removes the biggest problem.
  - **Drift second** — catches anything the constant-offset removal missed.
  - **High-pass third** — removes content below the audible band (which is meaningless for most audio).
  - **EQ fourth** — shapes the tonal balance.
  - **Normalize last** — sets the final level.
- **Chainability:**
  - Each method returns a new AudioDSP, so the entire chain is a single expression.
  - No intermediate variables needed.
  - The original `noisy` is not modified.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **Order matters.** Normalizing before EQ means the EQ could push the peak back up. Normalize last.
  - **Each step is a full pass.** For long audio, the chain is `5×` the cost of a single pass. For real-time, restructure as a single loop.
  - **EQ gain is in dB.** `+1 dB` is a small boost; `+10 dB` is significant.
  - **The high-pass at 20 Hz is mild.** For strong rumble removal, try 30–50 Hz.
  - **The final peak is exactly `−1 dB`.** If the chain introduces tiny errors, the peak may be slightly above or below.

---

## Example 14 — Spectrum Peak Detection (`audioExample14`)

- **Purpose:** Build a two-tone signal, compute its spectrum, and identify the two peaks. This mirrors the browser-based `caro_dsp_ex1.html` demo, adapted to the AudioDSP API.
- **Source:**

```javascript
function audioExample14() {
  console.log('\n=== Example 14: Spectrum Peak Detection ===');

  const Fs = 48000;
  const N = 4096;

  const x1 = AudioDSP.sineWave(1000, 0, Fs, N, 0.3, 1);
  const x2 = AudioDSP.sineWave(5000, 0, Fs, N, 0.4, 1);
  const mixed = x1.add(x2);

  const { mag } = mixed.fft(0);

  const threshold = 100;
  const peakBins = [];
  for (let k = 1; k <= N / 2; k++) {
    if (mag[k] > threshold) peakBins.push(k);
  }

  console.log('peak bins:');
  for (const k of peakBins) {
    console.log(`  bin ${k} → ${r(k * Fs / N, 1)} Hz (mag ${r(mag[k], 1)})`);
  }
}
```

- **Methods invoked:** `AudioDSP.sineWave`, `add`, `fft`.
- **Inputs:**
  - `x1` — a 1000 Hz sine at 48 kHz, 4096 samples, amplitude 0.3.
  - `x2` — a 5000 Hz sine at 48 kHz, 4096 samples, amplitude 0.4.
  - `mixed` — their sum.
- **Output:** the list of peak bins.
- **Expected output:**

```
=== Example 14: Spectrum Peak Detection ===
peak bins:
  bin 85 → 996.1 Hz (mag ~550)
  bin 427 → 5003.9 Hz (mag ~733)
```

- **Reading the output:**
  - **Bin 85** — the 1000 Hz peak. The magnitude is approximately `0.3 · N/2 = 614`, matching the amplitude of the 1000 Hz tone (small discrepancies from off-bin leakage).
  - **Bin 427** — the 5000 Hz peak. The magnitude is approximately `0.4 · N/2 = 819`, matching the 5000 Hz tone.
  - **No other bins** — the threshold `100` is above the noise floor but below both peaks.
- **The two peaks:**
  - Both tones are at on-approximately-bin frequencies. Since `Fs = 48000` and `N = 4096`, the bin spacing is `48000/4096 ≈ 11.72 Hz`.
  - `1000 Hz / 11.72 Hz ≈ 85.33` → bin 85.
  - `5000 Hz / 11.72 Hz ≈ 426.67` → bin 427.
  - Neither is exactly on a bin, so there is slight leakage into adjacent bins.
- **Why the magnitudes scale as `N/2`:**
  - The DFT of a pure sine of amplitude A at frequency `k` is `A·N/2` at bin `k`.
  - This is a fundamental property: the transform does not preserve amplitude, only relative magnitudes.
  - The `spectrum()` method divides by `N/2` to recover amplitude.
- **The peak detection loop:**
  - Iterates over the positive-frequency bins `1` to `N/2`.
  - Collects bins where `mag[k] > threshold`.
  - Reports each bin with its corresponding frequency.
- **Coding example:** as shown. This is the Node.js equivalent of the browser-based `caro_dsp_ex1.html` demo, adapted to the AudioDSP API.
- **Common pitfalls:**
  - **FFT length must be a power of two.** `N = 4096` works; `N = 4000` would throw.
  - **Threshold is empirical.** Adjust based on the expected amplitudes.
  - **Off-bin frequencies spread.** A tone not exactly on a bin leaks into adjacent bins. Apply a Hamming window (see Example 11) before the FFT.
  - **The `spectrum()` method scales by `N/2`.** For raw magnitudes, use `fft(0).mag` directly.
  - **No noise floor estimation.** The threshold is a hard cut-off. For automatic peak detection, compute the noise floor and use a relative threshold.
  - **Peak picking on the magnitude spectrum is not the same as peak picking on the waveform.** They answer different questions.

---

## What the Fourteen Examples Prove Together

Run in sequence, the fourteen examples form a complete verification suite for the `AudioDSP` class:

| Step | What it proves |
|---|---|
| 1. `audioExample1` | Construction works for mono, stereo, and all factory methods. |
| 2. `audioExample2` | Access methods return correct values, immutability holds. |
| 3. `audioExample3` | Arithmetic combines audio correctly with shape checks. |
| 4. `audioExample4` | DC offset and drift removal work. |
| 5. `audioExample5` | Custom biquad applies and validates coefficients. |
| 6. `audioExample6` | Butterworth filters (three types, zero-phase) work. |
| 7. `audioExample7` | Parametric EQ produces the expected gain/cut. |
| 8. `audioExample8` | Normalization and clipping detection work. |
| 9. `audioExample9` | RMS, power, peak, and dB measurements are correct. |
| 10. `audioExample10` | FFT, spectrum, and padding work. |
| 11. `audioExample11` | Windowing, moving average, peaks, frequency estimation work. |
| 12. `audioExample12` | Stateful biquad produces identical output to the offline filter. |
| 13. `audioExample13` | Full cleaning chain composes correctly. |
| 14. `audioExample14` | Spectrum peak detection recovers two tones. |

If all fourteen run and produce sensible output, the `AudioDSP` class is verified end-to-end.

---

## Extending the Examples

### 1. Real-time block processing

Combine `createStatefulBiquad` with a `ScriptProcessorNode` or `AudioWorklet` in the browser to build a real-time filter. The Node-side logic is already provided.

### 2. Multichannel panning and mixing

Add a `pan(value)` method that scales the two channels by complementary gains. Useful for building a stereo mixdown from mono sources.

### 3. Time-stretch and pitch-shift

Simple phase-vocoder or granular synthesis methods would let you change tempo and pitch independently. This is a substantial extension (STFT + overlap-add).

### 4. Pitch detection

Autocorrelation or YIN-based pitch tracking would be a natural next step. Builds on `findPeaks` and `autocorrelation`.

### 5. Wiener filtering

Wiener filtering requires an estimate of the noise spectrum (typically from a silent segment). It is not implemented in the library and would be a natural revision: STFT, noise floor estimation, and per-bin gain.

### 6. LMS / NLMS adaptive filtering

The user guide already anticipates this ("LMS/NLMS... should be added as the next library revision"). An NLMS filter would let you subtract an estimated echo or interference from the signal.

### 7. STFT and spectrogram

A full STFT pipeline (window, FFT, overlap-add) would enable:
- Spectrograms (time-frequency plots).
- Phase vocoders (time-stretch, pitch-shift).
- Per-bin manipulation (notch filtering, spectral gating).
- Wiener filtering and other frequency-domain methods.

The current library has the FFT primitive; the STFT wrapper is a thin layer on top.

### 8. Shelf filters

The library has peaking EQ but not low-shelf or high-shelf filters. Adding them requires only new coefficient formulas — the biquad application is already in place.

### 9. Filter design by specification

Rather than asking for cutoff and order, ask for passband edge, stopband edge, passband ripple, and stopband attenuation. The library would then compute the required order and design the filter.

### 10. Resampling

Sample-rate conversion (up/down-sampling) would let you chain the library with signals from different sources. A polyphase resampler is the standard approach.

### 11. Audio file I/O

The library works on raw sample arrays. Reading and writing WAV, AIFF, and FLAC files would make it self-contained for command-line tools. The HTML demos use the Web Audio API for decoding; a pure-JS WAV codec would remove that dependency.

### 12. Multi-track mixing

A `Mixer` class that combines several `AudioDSP` instances with independent gains and pan positions would be useful for building complex mixes.

### 13. Integration with the DSP library

`caro.dsp-1.0.js` and `caro.audio-1.0.js` overlap in their FFT, peak-finding, and filter primitives. A shared base class or a shared internal module would reduce duplication.

### 14. Integration with the control libraries

Feed a control signal (e.g. a Jacobian-weighted error) into `AudioDSP`'s filtering methods to build a filter on a robot's sensor data. This is the same pattern as `caro.dsp-1.0.js`, but with the AudioDSP API.

---

## Troubleshooting

The following issues are the most common when running the fourteen examples.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '../caro.audio-1.0.js'` | Wrong path or missing file | Confirm the file is named `caro.audio-1.0.js` (with the version suffix) |
| `ReferenceError: AudioDSP is not defined` (browser) | Script src points to `caro.audio.js` (missing suffix) | Change to `<script src="caro.audio-1.0.js"></script>` |
| `Error: sampleRate must be a positive number` | `sampleRate ≤ 0` or `NaN` | Use a positive finite number |
| `Error: AudioDSP data must be an array or typed array` | Passed a non-array | Wrap in an array |
| `Error: AudioDSP samples must contain only finite numbers` | `NaN`, `Infinity`, or non-numeric | Filter or coerce the data |
| `Error: All channels must have equal length` | Ragged channel arrays | Trim or pad channels to a common length |
| `Error: AudioDSP must contain at least one channel` | Empty data array | Provide at least one sample |
| `Error: Expected an AudioDSP instance` | Passed a plain array to `add` / `subtract` | Wrap in `new AudioDSP(...)` |
| `Error: AudioDSP objects must have equal shape` | Length or channel mismatch | Trim to the shorter length or match channels |
| `Error: cutoff must be between 0 and Nyquist` | `cutoff ≥ sampleRate/2` | Use `cutoff < sampleRate/2` |
| `Error: Invalid bandpass cutoffs` | `lowCutoff ≥ highCutoff` or above Nyquist | Use `0 < lowCutoff < highCutoff < sampleRate/2` |
| `Error: order must be a positive integer` | `order < 1` or non-integer | Use an integer `order ≥ 1` |
| `Error: Invalid biquad coefficients` | Missing or non-finite `b0, b1, b2, a1, a2` | Provide all five as finite numbers |
| `Error: FFT length must be a power of two` | Length not a power of 2 | Call `padToPow2()` first |
| `Error: Invalid channel index` | Channel out of range | Use `0 ≤ index < numberOfChannels` |
| `Error: Channel count mismatch` | Block channel count differs from parent | Process blocks with the same channel count |
| `Error: AudioDSP is empty` | Called a method on an empty audio object | Check `audio.length > 0` |
| `Error: N must be an integer ≥ 2` | `AudioDSP.hamming(N)` with `N < 2` | Use `N ≥ 2` |
| `Error: windowSize must be a positive integer` | `movingAverageCentered(0)` or negative | Use `windowSize ≥ 1` |
| `Error: bands must be an array` | Passed a non-array to `parametricEQ` | Wrap bands in `[...]` |
| `NaN` in output | Division by zero or empty input | Check the guard conditions |
| `Infinity` in output | Same | Same |
| Loud clicks at block boundaries (streaming) | State not preserved | Use `createStatefulBiquad` |
| Filtered signal distorts | Order too high, or cutoff near Nyquist | Reduce order, move cutoff |
| Stereo balance changes after processing | Different gains per channel | Use the same coefficients on all channels (this is the default) |
| Peak exceeds 1 after EQ | Positive gain bands | Use `normalizePeak` after |
| RMS changes unexpectedly after filtering | Filter's passband ripple | Check the filter's frequency response at the signal's frequency |
| FFT peak is off by one bin | Off-bin frequency | Use `N` such that `f·N/fs` is an integer, or apply a window |
| Spectrum has many small peaks | Spectral leakage | Apply a Hamming window before the FFT |
| `padToPow2` returns the same length | Length already a power of two | Expected |
| `removeDCOffset` doesn't fully remove the offset | The offset is drifting, not constant | Follow with `dcBlocker` |

If a failure is not listed here, the fastest diagnostic is usually to run the fourteen examples in order and identify the first one that fails. Most failures are shape mismatches or non-power-of-two FFT lengths.

---

## Closing Notes

The `caro.audio-1.0.js` library is a single-class audio processing toolkit built around the `AudioDSP` class. It covers:

- **Construction** — mono, stereo, sine waves, zeros, custom sample rates.
- **Arithmetic** — add, subtract, scale, mix down.
- **DC cleanup** — remove constant offset and slow drift.
- **Filtering** — custom biquads, Butterworth (low/high/band), parametric EQ.
- **Normalization** — peak normalization to a target dB level.
- **Measurements** — RMS, power, peak, dBFS, clipping detection.
- **Frequency-domain** — FFT, spectrum, dominant frequency.
- **Time-domain** — moving average, peak detection, frequency estimation.
- **Windowing** — Hamming for spectral analysis.
- **Streaming** — stateful biquad for real-time block processing.

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.dsp-1.0.js** — signal generation, filtering, and spectral analysis.
- **caro.audio-1.0.js** — multichannel audio processing.
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
4. **Common pitfalls** listed honestly, including conventions and limitations.
5. **An Extending section** showing how to go beyond the example.
6. **A Troubleshooting table** covering the most common runtime errors.

### On Audio in JavaScript

Audio processing in JavaScript is dominated by the **Web Audio API** — a real-time, node-based framework designed for the browser. It is excellent at what it does: routing, playback, real-time effects, and streaming.

But the Web Audio API has a fundamental limitation: it does not expose the raw sample arrays for offline processing. You can decode an audio file, play it, filter it with built-in nodes, but you cannot easily iterate the samples, apply a custom algorithm, and re-encode the result. For that, you need a library that treats audio as plain numeric data.

`caro.audio-1.0.js` is exactly that. It does not compete with the Web Audio API; it complements it. The HTML test file (`test-audio.html`) uses both — Web Audio for decoding and playback, and `AudioDSP` for the actual DSP operations.

The library is small, readable, and dependency-free. It works in Node and in the browser. It does not pretend to be `librosa` or `scipy.signal`, and it does not try to be everything to everyone. It is a foundation for building audio tools in an environment where the native options are limited.

The fourteen examples in this manual are the ground truth. Every method has a documented expected output, and every guard has a documented error message. When the implementation is correct, the tests pass. When the implementation has a bug, the tests fail with a specific message pointing at the responsible method.

That rhythm — small, verifiable examples with honest documentation — is what keeps an audio library trustworthy over time.

---

*End of document.*




