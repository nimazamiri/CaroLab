/* =========================================================
 *  CaroLab - Statistics Library Examples
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

const Sample = require('../caro.statistics-1.0.js');

// Helper: round numbers for tidy console output
const r = (v, d = 4) => (typeof v === 'number' ? +v.toFixed(d) : v);
const rArr = (a, d = 4) => a.map(v => r(v, d));

// ============================================================================
// Example 1 — Construction and Access
// ============================================================================
function statsExample1() {
  console.log('\n=== Example 1: Construction and Access ===');

  const s = Sample.of(3, 1, 4, 1, 5, 9, 2, 6);
  console.log('Data:', s.toArray());
  console.log('Length:', s.length);
  console.log('First element:', s.get(0));
  console.log('Slice [2..5):', s.slice(2, 5).toArray());

  const c = s.clone();
  c.toArray()[0] = 999;   // mutate the clone's data (careful, toArray copies)
  console.log('Original unchanged:', s.get(0) === 3);

  // Spread works because Sample is iterable
  console.log('Spread:', [...s].slice(0, 3));

  // Empty Sample is allowed but most methods throw
  const empty = new Sample();
  console.log('Empty length:', empty.length);
}

// ============================================================================
// Example 2 — Basic Descriptive Statistics
// ============================================================================
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

// ============================================================================
// Example 3 — Variance and Standard Deviation
// ============================================================================
function statsExample3() {
  console.log('\n=== Example 3: Variance and Standard Deviation ===');

  const s = new Sample([2, 4, 4, 4, 5, 5, 7, 9]);
  console.log('var_p   (population):', r(s.var_p()));
  console.log('var_s   (sample)    :', r(s.var_s()));
  console.log('std_p   (population):', r(s.std_p()));
  console.log('std_s   (sample)    :', r(s.std_s()));

  // Modern aliases with ddof
  console.log('variance(ddof=0)    :', r(s.variance(0)));
  console.log('variance(ddof=1)    :', r(s.variance(1)));

  // Guard: sample variance needs n >= 2
  try { new Sample([5]).var_s(); } catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 4 — Covariance and Correlation
// ============================================================================
function statsExample4() {
  console.log('\n=== Example 4: Covariance and Correlation ===');

  const x = new Sample([1, 2, 3, 4, 5]);
  const y = new Sample([2, 4, 6, 8, 10]);   // perfectly linear in x
  const z = new Sample([5, 3, 4, 2, 1]);    // anti-correlated

  console.log('cov(x, y)   :', r(x.covariance(y)));
  console.log('cov(x, y, 1):', r(x.covariance(y, 1)));
  console.log('corr(x, y)  :', r(x.correlation(y)));   // should be ~1.0
  console.log('corr(x, z)  :', r(x.correlation(z)));   // should be ~ -0.9

  // Mismatched lengths throw
  try { x.covariance(new Sample([1, 2])); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 5 — Moving Averages (Simple and Exponential)
// ============================================================================
function statsExample5() {
  console.log('\n=== Example 5: Moving Averages ===');

  const s = new Sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  console.log('movingAverage(3)        :', s.movingAverage(3).toArray());
  console.log('movingAverageRaw(3)     :', s.movingAverageRaw(3));
  console.log('movingAverageCausal(3)  :', s.movingAverageCausal(3).toArray());
  console.log('exponentialMovingAverage(0.3):', rArr(s.exponentialMovingAverage(0.3).toArray()));
}

// ============================================================================
// Example 6 — Quantiles, Percentiles, IQR
// ============================================================================
function statsExample6() {
  console.log('\n=== Example 6: Quantiles, Percentiles, IQR ===');

  const s = new Sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  console.log('quantile(0.25):', r(s.quantile(0.25)));
  console.log('quantile(0.50):', r(s.quantile(0.50)));
  console.log('quantile(0.75):', r(s.quantile(0.75)));
  console.log('percentile(90):', r(s.percentile(90)));
  console.log('IQR           :', r(s.iqr()));
}

// ============================================================================
// Example 7 — Normalization and Z-Scores
// ============================================================================
function statsExample7() {
  console.log('\n=== Example 7: Normalization and Z-Scores ===');

  const s = new Sample([10, 20, 30, 40, 50]);
  console.log('mean:', r(s.mean()), ' std_s:', r(s.std_s()));

  const z = s.zScore();        // sample z-score, ddof = 1
  console.log('z-score  :', rArr(z.toArray()));
  console.log('mean(z)  :', r(z.mean()));     // ~0
  console.log('std_p(z) :', r(z.std_p()));    // ~1 (population since n small)

  const mn = s.rescale(0, 1);
  console.log('rescaled :', rArr(mn.toArray()));   // 0, 0.25, 0.5, 0.75, 1
  console.log('min/max  :', mn.min(), mn.max());

  // Constant Sample cannot be rescaled
  try { new Sample([5, 5, 5]).rescale(); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 8 — Detrend
// ============================================================================
function statsExample8() {
  console.log('\n=== Example 8: Detrend ===');

  // y = 2 + 3t with a small quadratic wiggle
  const t = Array.from({ length: 10 }, (_, i) => i);
  const y = t.map(i => 2 + 3 * i + 0.1 * i * i);
  const s = new Sample(y);

  const linear = s.detrend(1);
  console.log('original     :', rArr(s.toArray()));
  console.log('detrend(1)   :', rArr(linear.toArray()));

  const quadratic = s.detrend(2);
  console.log('detrend(2)   :', rArr(quadratic.toArray()));   // should be near zero
  console.log('mean(detr(2)):', r(quadratic.mean()));
}

// ============================================================================
// Example 9 — Autocorrelation and ACF
// ============================================================================
function statsExample9() {
  console.log('\n=== Example 9: Autocorrelation and ACF ===');

  // A slow sine wave + noise
  const s = new Sample(
    Array.from({ length: 32 }, (_, i) =>
      Math.sin(2 * Math.PI * i / 16) + 0.1 * (Math.random() - 0.5)
    )
  );

  console.log('autocorr(lag=0):', r(s.autocorrelation(0)));
  console.log('autocorr(lag=1):', r(s.autocorrelation(1)));
  console.log('autocorr(lag=8):', r(s.autocorrelation(8)));  // half period → ~ -1

  const acf = s.acf(5);
  console.log('acf(0..5):', rArr(acf));
}

// ============================================================================
// Example 10 — Cross-Correlation
// ============================================================================
function statsExample10() {
  console.log('\n=== Example 10: Cross-Correlation ===');

  const x = new Sample([0, 0, 1, 1, 1, 0, 0, 0]);
  const y = new Sample([0, 0, 0, 1, 1, 1, 0, 0]);   // y delayed by 1

  const cc = x.crossCorrelation(y, 3);
  console.log('lags :', cc.lags);
  console.log('vals :', rArr(cc.values, 3));
}

// ============================================================================
// Example 11 — FFT and Spectrum
// ============================================================================
function statsExample11() {
  console.log('\n=== Example 11: FFT and Spectrum ===');

  const N = 16;
  const fs = 16;   // sample rate = 16 Hz → bin spacing = 1 Hz
  // A 2 Hz sine sampled at 16 Hz over 16 samples
  const s = new Sample(
    Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 2 * i / fs))
  );

  const sp = s.spectrum(fs);
  console.log('freqs:', rArr(sp.freqs, 3));
  console.log('amps :', rArr(sp.amps, 3));

  // Peak should be at 2 Hz
  let peakIdx = 0;
  for (let i = 1; i < sp.amps.length; i++) if (sp.amps[i] > sp.amps[peakIdx]) peakIdx = i;
  console.log('peak freq:', sp.freqs[peakIdx], 'Hz');

  // FFT length must be a power of two
  try { new Sample([1, 2, 3]).fft(); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 12 — Time-Series Forecasting (SES, Holt, AR)
// ============================================================================
function statsExample12() {
  console.log('\n=== Example 12: Time-Series Forecasting ===');

  // A trending series with a slight wiggle
  const s = new Sample(
    Array.from({ length: 30 }, (_, i) => 10 + 0.5 * i + Math.sin(i / 3))
  );

  // 1. Simple exponential smoothing — flat forecast
  const ses = s.ses(0.3);
  console.log('SES  level        :', r(ses.level));
  console.log('SES  forecast(3)  :', rArr(ses.forecast(3)));

  // 2. Holt's linear method — level + trend
  const holt = s.holt({ alpha: 0.4, beta: 0.2 });
  console.log('Holt level / trend:', r(holt.level), '/', r(holt.trend));
  console.log('Holt forecast(3)  :', rArr(holt.forecast(3)));

  // 3. AR(2)
  const ar = s.ar(2);
  console.log('AR(2) phi         :', rArr(ar.phi));
  console.log('AR(2) intercept   :', r(ar.intercept));
  console.log('AR(2) forecast(3) :', rArr(ar.forecast(3)));

  // 4. Prediction intervals
  const pi = s.predictionInterval(ar, 3);
  console.log('AR(2) PI center   :', rArr(pi.center));
  console.log('AR(2) PI lower    :', rArr(pi.lower));
  console.log('AR(2) PI upper    :', rArr(pi.upper));
}

// ============================================================================
// RUN ALL EXAMPLES (or uncomment the one you want)
// ============================================================================
statsExample1();
statsExample2();
statsExample3();
statsExample4();
statsExample5();
statsExample6();
statsExample7();
statsExample8();
statsExample9();
statsExample10();
statsExample11();
statsExample12();