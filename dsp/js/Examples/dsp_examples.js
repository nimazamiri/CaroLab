// ============================================================================
// DSP LIBRARY EXAMPLES (caro.dsp-1.0.js)
// ============================================================================
// Extracted from the three HTML demos and consolidated into runnable Node
// examples. Each function demonstrates one feature group of the Signal class.
//
//   node dsp_examples.js
//
// The library is expected to be exported as `module.exports = Signal;`
// (add this line at the end of caro.dsp-1.0.js if it is not already there).

const Signal = require('../caro.dsp-1.0.js');

// Console helper — prints arrays with controlled precision
const r = (v, d = 4) => (typeof v === 'number' ? +v.toFixed(d) : v);
const rArr = (a, d = 4) => Array.from(a, v => r(v, d));

// ============================================================================
// Example 1 — Signal Construction and Access
// ============================================================================
function dspExample1() {
  console.log('\n=== Example 1: Signal Construction and Access ===');

  // A 440 Hz sine at 8 kHz, 1024 samples
  const s = Signal.sineWave(440, 0, 8000, 1024, 1.0);

  console.log('info      :', s.info());
  console.log('length    :', s.length);
  console.log('sampleRate:', s.sampleRate);
  console.log('first 5   :', rArr(s.toArray().slice(0, 5)));

  // Time axis in seconds
  const t = s.timeAxis();
  console.log('time[0..5]:', rArr(t.slice(0, 5), 6));
  console.log('time end  :', r(t[t.length - 1], 6));

  // Static factories
  const z = Signal.zeros(8, 100);
  console.log('zeros info:', z.info());

  const f = Signal.from([1, 2, 3, 4, 5], 10);
  console.log('from info :', f.info());

  const o = Signal.of(1, 2, 3, 4);
  console.log('of info   :', o.info());

  // Iteration
  console.log('spread    :', [...f]);
}

// ============================================================================
// Example 2 — Signal Addition and Subtraction
// ============================================================================
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

  // Static form
  const same = Signal.add(s1, s2);
  console.log('static add matches instance:', same.rms() === sum.rms());

  // Scalar scale
  const loud = s2.scale(2);
  console.log('loud rms (should be 2× s2):', r(loud.rms()));

  // Mismatched lengths throw
  try { s1.add(Signal.zeros(100, 1000)); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 3 — Moving Average and Peaks
// ============================================================================
function dspExample3() {
  console.log('\n=== Example 3: Moving Average and Peaks ===');

  // A 10 Hz sine with a 100 Hz component, sampled at 1000 Hz
  const s1 = Signal.sineWave(10, 0, 1000, 1000, 1.0);
  const s2 = Signal.sineWave(100, 0, 1000, 1000, 0.3);
  const mixed = s1.add(s2);

  // Centered moving average smooths the mixed signal
  const smoothed = mixed.movingAverageCentered(11);
  console.log('smoothed rms:', r(smoothed.rms()));

  // Peaks — simple version (smooths then finds local maxima)
  const p1 = smoothed.peaks(5);
  console.log('peaks found:', p1.length);
  console.log('first 3   :', p1.slice(0, 3));

  // Peak-to-peak time deltas
  const deltas = Signal.peak2peak(p1);
  console.log('deltas (s):', rArr(deltas.slice(0, 5), 4));

  // Frequency from peaks
  const fEst = Signal.frequencyFromPeaks(p1);
  console.log('estimated f:', r(fEst, 2), 'Hz');
}

// ============================================================================
// Example 4 — findPeaks with Constraints
// ============================================================================
function dspExample4() {
  console.log('\n=== Example 4: findPeaks with Constraints ===');

  // A pulse train: 5 Hz square-like pulses, sampled at 1000 Hz
  const s = Signal.from(
    Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 1000))
  );

  // findPeaks with minDistance and minHeight
  const peaks = s.findPeaks({
    smoothWindow: 11,
    minDistance: 0.05,     // 50 ms between peaks
    minHeight: 0.2         // at least 0.2 amplitude
  });
  console.log('peaks found:', peaks.length);
  console.log('first 5   :', peaks.slice(0, 5));

  // Frequency from peaks
  console.log('f from peaks:', r(Signal.frequencyFromPeaks(peaks), 2), 'Hz');
}

// ============================================================================
// Example 5 — FFT and Dominant Frequency
// ============================================================================
function dspExample5() {
  console.log('\n=== Example 5: FFT and Dominant Frequency ===');

  const fs = 1024;
  const N = 1024;
  const s = Signal.sineWave(100, 0, fs, N, 1.0);

  // FFT
  const { re, im, mag, phase } = s.fft();
  console.log('re length  :', re.length);
  console.log('mag peak   :', r(Math.max(...mag), 2));

  // Dominant frequency
  console.log('dominant f :', s.dominantFrequency(), 'Hz');

  // One-sided amplitude spectrum
  const sp = s.spectrum();
  console.log('freqs[0..5]:', rArr(sp.freqs.slice(0, 5)));
  console.log('amps[0..5] :', rArr(sp.amps.slice(0, 5)));
}

// ============================================================================
// Example 6 — Two-Tone Signal and Spectral Analysis
// ============================================================================
function dspExample6() {
  console.log('\n=== Example 6: Two-Tone Signal and Spectral Analysis ===');

  const Fs = 1024;
  const N = 1024;

  // Two tones: 100 Hz and 250 Hz
  const x1 = Signal.sineWave(100, 0, Fs, N, 0.5);
  const x2 = Signal.sineWave(250, 0, Fs, N, 0.3);
  const x = x1.add(x2);

  // Spectrum
  const { freqs, amps } = x.spectrum();

  // Find peaks in the spectrum
  const peakBins = [];
  for (let k = 1; k <= N / 2; k++) {
    if (amps[k] > 0.1) peakBins.push(k);
  }
  console.log('peak bins:', peakBins.map(k => `${k} → ${r(k * Fs / N, 1)} Hz`));

  // Should find two peaks: 100 Hz and 250 Hz
  console.log('expected: 100 Hz and 250 Hz');
}

// ============================================================================
// Example 7 — Butterworth Low-Pass Filter
// ============================================================================
function dspExample7() {
  console.log('\n=== Example 7: Butterworth Low-Pass Filter ===');

  const fs = 8000;
  const s = Signal.sineWave(440, 0, fs, 1024, 1.0);

  // Add noise
  const noise = Signal.from(
    Array.from({ length: 1024 }, () => (Math.random() - 0.5) * 0.2)
  );
  const noisy = s.add(noise);
  console.log('rms noisy  :', r(noisy.rms()));

  // Low-pass at 600 Hz, order 4
  const clean = noisy.butterworth({ type: 'lowpass', cutoff: 600, order: 4 });
  console.log('rms clean  :', r(clean.rms()));

  // Dominant frequency should still be ~440
  console.log('dominant f :', clean.dominantFrequency(), 'Hz');

  // rmsDb
  console.log('rms noisy dB:', r(noisy.rmsDb(), 2));
  console.log('rms clean dB:', r(clean.rmsDb(), 2));
}

// ============================================================================
// Example 8 — Butterworth High-Pass and Band-Pass
// ============================================================================
function dspExample8() {
  console.log('\n=== Example 8: Butterworth High-Pass and Band-Pass ===');

  const fs = 8000;
  const s = Signal.sineWave(1000, 0, fs, 1024, 1.0);

  // High-pass at 500 Hz — should pass 1000 Hz
  const hp = s.butterworth({ type: 'highpass', cutoff: 500, order: 4 });
  console.log('HP rms     :', r(hp.rms()));

  // High-pass at 2000 Hz — should attenuate 1000 Hz
  const hp2 = s.butterworth({ type: 'highpass', cutoff: 2000, order: 4 });
  console.log('HP2 rms    :', r(hp2.rms()));

  // Band-pass from 800 to 1200 Hz — should pass 1000 Hz
  const bp = s.butterworth({
    type: 'bandpass',
    lowCutoff: 800,
    highCutoff: 1200,
    order: 4
  });
  console.log('BP rms     :', r(bp.rms()));
}

// ============================================================================
// Example 9 — Windowing and RMS
// ============================================================================
function dspExample9() {
  console.log('\n=== Example 9: Windowing and RMS ===');

  const s = Signal.sineWave(100, 0, 8000, 1024, 1.0);

  // Hamming window
  const windowed = s.hammingWindow();
  console.log('rms windowed:', r(windowed.rms()));

  // Static Hamming coefficients
  const w = Signal.hamming(8);
  console.log('hamming(8)  :', rArr(w));

  // Power
  console.log('rms         :', r(s.rms()));
  console.log('power       :', r(s.power()));
  console.log('rms²        :', r(s.rms() ** 2));   // equal to power
}

// ============================================================================
// Example 10 — Padding for FFT
// ============================================================================
function dspExample10() {
  console.log('\n=== Example 10: Padding for FFT ===');

  const s = new Signal([1, 2, 3, 4, 5, 6, 7], 100);
  console.log('original length:', s.length);

  const padded = s.padToPow2();
  console.log('padded length  :', padded.length);   // 8
  console.log('last few zeros :', rArr(padded.toArray().slice(-3)));

  // FFT can now be applied
  const { mag } = padded.fft();
  console.log('mag length     :', mag.length);
}

// ============================================================================
// Example 11 — Full Pipeline: Generate → Noise → Filter → Peaks → Frequency
// ============================================================================
function dspExample11() {
  console.log('\n=== Example 11: Full Pipeline ===');

  const fs = 8000;
  const s = Signal.sineWave(440, 0, fs, 1024, 1.0);

  // Add noise
  const noise = Signal.from(
    Array.from({ length: 1024 }, () => (Math.random() - 0.5) * 0.2)
  );
  const noisy = s.add(noise);

  // Low-pass filter
  const clean = noisy.butterworth({ type: 'lowpass', cutoff: 600, order: 4 });

  // Peaks
  const peaks = clean.findPeaks({ smoothWindow: 7, minDistance: 0.0005 });
  console.log('peaks found:', peaks.length);

  // Frequency from peaks
  const fEst = Signal.frequencyFromPeaks(peaks);
  console.log('estimated f:', r(fEst, 1), 'Hz (true: 440)');

  // RMS before/after
  console.log('rms noisy:', r(noisy.rms()));
  console.log('rms clean:', r(clean.rms()));
}

// ============================================================================
// Example 12 — Spectrum Peak Detection (from caro_dsp_ex1.html)
// ============================================================================
function dspExample12() {
  console.log('\n=== Example 12: Spectrum Peak Detection ===');

  const Fs = 1024;
  const N = 1024;

  // Build a signal with two tones plus noise
  const x1 = Signal.sineWave(10, 0, Fs, N, 0.3);
  const x2 = Signal.from(
    Array.from({ length: N }, () => Math.random() / 10)
  );
  const x3 = x1.add(x2);
  const x4 = Signal.sineWave(20, 0, Fs, N, 0.4);
  const x = x3.add(x4);

  // FFT
  const { mag } = x.fft();

  // Peak detection in magnitude spectrum
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

// ============================================================================
// RUN ALL EXAMPLES (or uncomment the ones you want)
// ============================================================================
dspExample1();
dspExample2();
dspExample3();
dspExample4();
dspExample5();
dspExample6();
dspExample7();
dspExample8();
dspExample9();
dspExample10();
dspExample11();
dspExample12();