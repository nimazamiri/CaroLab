// ============================================================================
// AUDIO LIBRARY EXAMPLES (caro.audio-1.0.js)
// ============================================================================
// Extracted from the user guide and the two HTML test files. Each function
// demonstrates one feature group of the AudioDSP class.
//
//   node audio_examples.js
//
// The library is expected to be exported as `module.exports = AudioDSP;`
// (already true in caro.audio-1.0.js).

const AudioDSP = require('../caro.audio-1.0.js');

// Console helper
const r = (v, d = 4) => (typeof v === 'number' ? +v.toFixed(d) : v);
const rArr = (a, d = 4) => Array.from(a, v => r(v, d));

// ============================================================================
// Example 1 — Construction
// ============================================================================
function audioExample1() {
  console.log('\n=== Example 1: Construction ===');

  // Mono from array
  const mono = new AudioDSP([0, 0.2, 0.5, 0.2, 0], 48000);
  console.log('mono channels:', mono.numberOfChannels);
  console.log('mono length  :', mono.length);
  console.log('mono sampleRate:', mono.sampleRate);
  console.log('mono duration:', r(mono.duration(), 6));

  // Stereo from nested arrays
  const stereo = new AudioDSP(
    [
      [0, 0.2, 0.5, 0.2, 0],
      [0, 0.1, 0.4, 0.1, 0]
    ],
    48000
  );
  console.log('stereo channels:', stereo.numberOfChannels);

  // Static factories
  const zeros = AudioDSP.zeros(100, 48000, 2);
  console.log('zeros info:', zeros.info());

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 2);
  console.log('sineWave info:', tone.info());

  const from = AudioDSP.from([0, 1, 0, -1], 44100);
  console.log('from info:', from.info());

  // Iteration
  console.log('spread (first 5):', [...mono].slice(0, 5));

  // Errors
  try { new AudioDSP([1, 2], -1); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 2 — Access and Properties
// ============================================================================
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

  // Mixdown to mono
  const mono = stereo.mixDown();
  console.log('mixDown       :', mono.data);
}

// ============================================================================
// Example 3 — Arithmetic
// ============================================================================
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

  // Shape mismatch throws
  try { a.add(new AudioDSP([1, 2], 48000)); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 4 — DC Offset and Drift
// ============================================================================
function audioExample4() {
  console.log('\n=== Example 4: DC Offset and Drift ===');

  const withDC = new AudioDSP([1.0, 1.1, 0.9, 1.05, 0.95], 48000);
  console.log('mean before:', r(withDC.mean(0)));

  const withoutDC = withDC.removeDCOffset();
  console.log('mean after :', r(withoutDC.mean(0)));
  console.log('data after :', rArr(withoutDC.data[0]));

  // DC blocker for slow drift
  const withDrift = new AudioDSP(
    Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * i / 100) + 0.1 * i / 1000),
    48000
  );
  const blocked = withDrift.dcBlocker(5);
  console.log('mean after dcBlocker:', r(blocked.mean(0)));
}

// ============================================================================
// Example 5 — Custom Biquad
// ============================================================================
function audioExample5() {
  console.log('\n=== Example 5: Custom Biquad ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 1);
  console.log('rms before biquad:', r(tone.rms(0)));

  // A low-pass biquad at ~500 Hz (typical coefficients)
  const filtered = tone.biquad({
    b0: 0.020083,
    b1: 0.040166,
    b2: 0.020083,
    a1: -1.561018,
    a2: 0.641352
  });
  console.log('rms after biquad:', r(filtered.rms(0)));

  // Missing coefficients throw
  try { tone.biquad({ b0: 1 }); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 6 — Butterworth Filters
// ============================================================================
function audioExample6() {
  console.log('\n=== Example 6: Butterworth Filters ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 1024, 0.5, 2);

  // Low-pass: 1000 Hz passes 440 Hz
  const lp = tone.butterworth({
    type: 'lowpass',
    cutoff: 1000,
    order: 4,
    zeroPhase: false
  });
  console.log('LP rms (should ~0.5):', r(lp.rms(0)));

  // High-pass: 20 Hz passes 440 Hz
  const hp = tone.butterworth({
    type: 'highpass',
    cutoff: 20,
    order: 4,
    zeroPhase: false
  });
  console.log('HP rms (should ~0.5):', r(hp.rms(0)));

  // Band-pass: 300–3000 Hz passes 440 Hz
  const bp = tone.butterworth({
    type: 'bandpass',
    lowCutoff: 300,
    highCutoff: 3000,
    order: 4,
    zeroPhase: false
  });
  console.log('BP rms (should ~0.5):', r(bp.rms(0)));

  // Zero-phase variant
  const zp = tone.butterworth({ type: 'lowpass', cutoff: 1000, order: 4, zeroPhase: true });
  console.log('LP zeroPhase rms:', r(zp.rms(0)));

  // Invalid cutoff above Nyquist throws
  try { tone.butterworth({ type: 'lowpass', cutoff: 30000, order: 4 }); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 7 — Parametric EQ
// ============================================================================
function audioExample7() {
  console.log('\n=== Example 7: Parametric EQ ===');

  const tone = AudioDSP.sineWave(1000, 0, 48000, 4096, 0.5, 1);
  console.log('rms before EQ:', r(tone.rms(0)));

  // Boost 1000 Hz by +3 dB
  const boosted = tone.parametricEQ([
    { frequency: 1000, gainDb: 3, Q: 1.0 }
  ]);
  console.log('rms after +3dB boost:', r(boosted.rms(0)));

  // Cut 1000 Hz by -3 dB
  const cut = tone.parametricEQ([
    { frequency: 1000, gainDb: -3, Q: 1.0 }
  ]);
  console.log('rms after -3dB cut :', r(cut.rms(0)));

  // Multi-band EQ (equalizer alias)
  const multi = tone.equalizer([
    { frequency: 100, gainDb: -2, Q: 0.8 },
    { frequency: 1000, gainDb: 1, Q: 1.0 },
    { frequency: 5000, gainDb: -2, Q: 0.9 }
  ]);
  console.log('rms after 3-band EQ:', r(multi.rms(0)));
}

// ============================================================================
// Example 8 — Normalization, Clipping, Peak
// ============================================================================
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

  // Clipped signal
  const clipped = new AudioDSP([0.5, 1.2, -1.1, 0.8], 48000);
  console.log('hasClipping clip :', clipped.hasClipping());
}

// ============================================================================
// Example 9 — Measurements
// ============================================================================
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

// ============================================================================
// Example 10 — FFT and Spectrum
// ============================================================================
function audioExample10() {
  console.log('\n=== Example 10: FFT and Spectrum ===');

  const tone = AudioDSP.sineWave(440, 0, 48000, 4096, 0.5, 1);
  const { re, im, mag, phase } = tone.fft(0);

  console.log('re length  :', re.length);
  console.log('mag[440bin]:', r(mag[440 * 4096 / 48000]));

  // Find peak bin
  let peakBin = 0;
  for (let k = 1; k <= 4096 / 2; k++) if (mag[k] > mag[peakBin]) peakBin = k;
  console.log('peak bin   :', peakBin);
  console.log('peak freq  :', r(peakBin * 48000 / 4096, 2), 'Hz');

  const sp = tone.spectrum(0);
  console.log('freqs[0..5]:', rArr(sp.freqs.slice(0, 5)));
  console.log('amps[0..5] :', rArr(sp.amps.slice(0, 5)));

  // Non-power-of-two throws
  try { AudioDSP.sineWave(440, 0, 48000, 1000, 0.5, 1).fft(0); }
  catch (e) { console.log('Error:', e.message); }

  // Padding to power of two
  const padded = AudioDSP.sineWave(440, 0, 48000, 1000, 0.5, 1).padToPow2();
  console.log('padded length:', padded.length);
}

// ============================================================================
// Example 11 — Windowing, Moving Average, Peaks
// ============================================================================
function audioExample11() {
  console.log('\n=== Example 11: Windowing, MA, Peaks ===');

  const tone = AudioDSP.sineWave(100, 0, 8000, 1024, 1.0, 1);

  // Hamming window
  const windowed = tone.hammingWindow();
  console.log('hamming rms:', r(windowed.rms(0)));

  const w = AudioDSP.hamming(8);
  console.log('hamming(8) :', rArr(w));

  // Moving average
  const smooth = tone.movingAverageCentered(11);
  console.log('MA rms     :', r(smooth.rms(0)));

  // Peaks
  const peaks = tone.peaks(5);
  console.log('peaks found:', peaks.length);

  // findPeaks with constraints
  const constrained = tone.findPeaks({ smoothWindow: 11, minDistance: 0.05, minHeight: 0.2 });
  console.log('constrained:', constrained.length);

  // Frequency from peaks
  console.log('f from peaks:', r(AudioDSP.frequencyFromPeaks(constrained), 1), 'Hz');
}

// ============================================================================
// Example 12 — Stateful Biquad for Streaming
// ============================================================================
function audioExample12() {
  console.log('\n=== Example 12: Stateful Biquad ===');

  // A signal of two blocks
  const coeffs = { b0: 0.020083, b1: 0.040166, b2: 0.020083, a1: -1.561018, a2: 0.641352 };

  const longTone = AudioDSP.sineWave(440, 0, 48000, 2048, 0.5, 1);
  const block1 = longTone.slice(0, 1024);
  const block2 = longTone.slice(1024, 2048);

  // Full-length filter (baseline)
  const full = longTone.biquad(coeffs);

  // Stateful processing
  const processor = longTone.createStatefulBiquad(coeffs);
  const out1 = processor.processBlock(block1);
  const out2 = processor.processBlock(block2);

  // Compare
  const diff1 = out1.data[0].reduce((s, v, i) => s + Math.abs(v - full.data[0][i]), 0);
  const diff2 = out2.data[0].reduce((s, v, i) => s + Math.abs(v - full.data[0][1024 + i]), 0);
  console.log('total diff block1:', r(diff1, 6));
  console.log('total diff block2:', r(diff2, 6));

  // Reset
  processor.reset();
  console.log('after reset: processor state cleared');
}

// ============================================================================
// Example 13 — Full Cleaning Chain
// ============================================================================
function audioExample13() {
  console.log('\n=== Example 13: Full Cleaning Chain ===');

  const sampleRate = 48000;

  // A signal with DC offset, low-frequency drift, and noise
  const clean = AudioDSP.sineWave(440, 0, sampleRate, 4096, 0.5, 1);
  const withDC = clean.add(new AudioDSP(new Array(4096).fill(0.05), sampleRate));
  const noisy = withDC.add(AudioDSP.from(
    Array.from({ length: 4096 }, () => (Math.random() - 0.5) * 0.1),
    sampleRate
  ));

  console.log('noisy rms:', r(noisy.rms(0)));

  // The cleaning chain from the user guide
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

// ============================================================================
// Example 14 — Spectrum Peak Detection
// ============================================================================
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

// ============================================================================
// RUN ALL EXAMPLES (or uncomment the ones you want)
// ============================================================================
audioExample1();
audioExample2();
audioExample3();
audioExample4();
audioExample5();
audioExample6();
audioExample7();
audioExample8();
audioExample9();
audioExample10();
audioExample11();
audioExample12();
audioExample13();
audioExample14();