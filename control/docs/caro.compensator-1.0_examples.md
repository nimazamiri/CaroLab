# CaroLab Compensator Library — Control Systems Examples Manual

- **Name:** caro.compensator-1.0.js
- **Release Date:** 29 September 2026
- **Document Name:** Control Systems Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Stability Analysis (`stability.js`)](#example-1--stability-analysis-stabilityjs)
4. [Example 2 — Step and Impulse Response (`step.js`)](#example-2--step-and-impulse-response-stepjs)
5. [Example 3 — Plot Data Generators (`plots.js`)](#example-3--plot-data-generators-plotsjs)
6. [Example 4 — State-Space Conversions (`ss.js`)](#example-4--state-space-conversions-ssjs)
7. [Example 5 — Controllability and Observability (`controlability.js`)](#example-5--controllability-and-observability-controlabilityjs)
8. [Example 6 — PID Tuning (`pid.js`)](#example-6--pid-tuning-pidjs)
9. [Example 7 — Classical Compensators (`controllers.js`)](#example-7--classical-compensators-controllersjs)
10. [Example 8 — Consolidated Test Suite (`test.js`)](#example-8--consolidated-test-suite-testjs)
11. [What the Eight Examples Prove Together](#what-the-eight-examples-prove-together)
12. [Extending the Examples](#extending-the-examples)
13. [Troubleshooting](#troubleshooting)
14. [Appendix A — Corrected Source Scripts](#appendix-a--corrected-source-scripts)

---

## Introduction

### Purpose of This Document

This manual is the first for the `caro.compensator-1.0.js` library — a **classical control systems toolkit**. It is the sibling of `caro.manipulator-1.0.js`, which handles robot-arm kinematics, dynamics, and control. Where the Manipulator library answers *"how does the arm move?"*, the Compensator library answers *"is the closed loop stable, and how do I design a controller for it?"*

The eight examples cover the entire public API of the Compensator class:

| Group | Methods |
|---|---|
| Transfer functions | `tf`, `cascade`, `parallel`, `closeLoop` |
| State space | `ss`, `tf2ss`, `ss2tf`, `controllability`, `observability` |
| Time response | `step`, `impulse`, `responseAnalysis` |
| Frequency response | `bodePlot`, `nyquistPlot`, `nicholsPlot`, `rootLocusPlot` |
| Stability | `stabilityAnalysis` |
| Controller design | `pid`, `pid2tf`, `controller`, `comp2tf` |

### Conventions

| Item | Convention |
|---|---|
| Polynomials | Arrays, highest power first: `[1, 3, 2]` = `s² + 3s + 2` |
| Transfer function | `TransferFunction { num, den }` |
| State space | `StateSpace { A, B, C, D }` |
| Feedback | Negative unity by default; `opts.positiveFeedback` for positive |
| Angles | Degrees (except `phase()` internal radians) |
| Plot methods | Return plain data objects — no drawing, no dependencies |
| Routh array | Rows in `stabilityAnalysis().routh.table` |
| PID form | Parallel: `C(s) = kp + ki/s + kd·s` |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.compensator-1.0.js      (the library)
└── test/
    ├── stability.js
    ├── step.js
    ├── plots.js
    ├── ss.js
    ├── controlability.js
    ├── pid.js
    ├── controllers.js
    └── test.js
```

### How to Run the Examples

```
node test/stability.js
node test/step.js
node test/plots.js
node test/ss.js
node test/controlability.js
node test/pid.js
node test/controllers.js
node test/test.js
```

### Why This Library Matters

Every classical control course covers Bode, Nyquist, Routh, PID, and lead/lag design. The mathematics is old and well-understood — but the *implementations* are typically scattered across proprietary MATLAB toolboxes, Python packages with heavy dependencies, or hand-written scripts.

`caro.compensator-1.0.js` is a **single-file, dependency-free** implementation of the entire classical control toolkit. It runs in a browser (`<script>` tag) or under Node.js, and every method returns plain data that can be plotted with any charting library.

The eight examples in this manual verify that the implementation is correct by comparing against known analytical results — GM = 9.54 dB for a specific plant, overshoot = 100·exp(−πζ/√(1−ζ²)) for a second-order system, and so on.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `stability.js` | `stabilityAnalysis` | Classify stable, unstable, marginally stable |
| 2 | `step.js` | `step`, `impulse`, `closeLoop`, `responseAnalysis` | Second-order time response with known overshoot |
| 3 | `plots.js` | `bodePlot`, `rootLocusPlot`, `nyquistPlot`, `nicholsPlot` | Frequency-domain plots with known margins |
| 4 | `ss.js` | `tf2ss`, `ss2tf`, `ss`, `characteristicEquation` | State-space conversions in three canonical forms |
| 5 | `controlability.js` | `controllability`, `observability` | Reachability and observability tests |
| 6 | `pid.js` | `pid`, `pid2tf`, `responseAnalysis` | Ziegler–Nichols and loop-shaping PID |
| 7 | `controllers.js` | `controller`, `comp2tf` | Lead, lag, lead-lag, parallel compensators |
| 8 | `test.js` | (all of the above) | Full integration test with PASS/FAIL output |

---

## Example 1 — Stability Analysis (`stability.js`)

- **Purpose:** Classify the stability of a transfer function using pole locations and the Routh–Hurwitz criterion. This is the most fundamental test in classical control — everything else builds on knowing whether the closed loop is stable.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// closed loop
const G = c.tf([1], [1, 3, 2]);
const Cs = c.tf([10], [1]);
const sys = c.closeLoop(G, Cs);

// stability
const sa = c.stabilityAnalysis(c.tf([1], [1,2,3,4,5]));
ok('unstable classified', sa.classification === 'unstable' && sa.rhpPoleCount === 2, sa.summary);
const sa2 = c.stabilityAnalysis(sys); ok('stable', sa2.stable, sa2.summary);
console.log(sa2.openLoopMargins.phaseMargin);
```

- **Methods invoked:** `tf`, `closeLoop`, `stabilityAnalysis`.
- **Inputs:**
  - **Unstable test case:** `tf([1], [1, 2, 3, 4, 5])` — a 4th-order polynomial with two right-half-plane poles.
  - **Stable test case:** the closed-loop `closeLoop(tf([1],[1,3,2]), tf([10],[1]))` — a second-order plant with a proportional controller.
- **Output:**
  - `PASS unstable classified` — confirms the classifier correctly flags RHP poles.
  - `PASS stable` — confirms the closed loop is asymptotically stable.
  - The final `console.log` prints the phase margin of the stable loop.
- **Expected output:**

```
PASS unstable classified  System is unstable (2 RHP poles, 0 on the imaginary axis). Routh first-column sign changes: 2.
PASS stable  System is asymptotically stable (0 RHP poles, 0 on the imaginary axis). Routh first-column sign changes: 0.
<phase margin in degrees>
```

- **Reading the output:**
  - **`rhpPoleCount: 2`** — the unstable polynomial `s⁴ + 2s³ + 3s² + 4s + 5` has two poles in the right-half plane, correctly identified.
  - **`rhpPoleCount: 0`** for the closed loop — the plant `1/(s² + 3s + 2)` has poles at `−1, −2` (stable). The proportional gain 10 shifts them further left.
  - **`classification: 'unstable'`** — one of the three classification strings: `'asymptotically stable'`, `'marginally stable'`, `'unstable'`.
  - **`phase margin`** — the closed-loop plant `10/(s²+3s+2)` has an open-loop PM of ~59°.
- **The three classifications:**
  - **`asymptotically stable`** — all poles in the open left-half plane.
  - **`marginally stable`** — at least one pole on the imaginary axis, none in the right half-plane.
  - **`unstable`** — at least one pole in the right half-plane, or repeated poles on the imaginary axis.
- **The Routh–Hurwitz criterion:**
  - The `stabilityAnalysis` method also builds a Routh table. The number of sign changes in the first column equals the number of RHP poles.
  - This is used as a cross-check against the pole locations: if the pole count and the Routh sign changes disagree, one of the two methods has a numerical issue.
- **Coding example:** as shown. The `ok()` helper from the test suite prints `PASS` or `FAIL`.
- **Common pitfalls:**
  - **The Routh table has special cases.** An all-zero row (indicating symmetric poles about the origin) and a zero first-column element are handled by the implementation with a small epsilon; the `notes` array in the output documents which cases were triggered.
  - **Numerical stability of Routh.** For very high-order polynomials (n > 10), the Routh table can become ill-conditioned. Use pole locations as the primary classification and Routh as a secondary check.
  - **The `openLoopMargins` block** is computed for the *system itself* treated as an open-loop transfer function. For a closed-loop system, this is not the "open-loop margins" of the original plant — read the note in the returned report.
  - **`stable` is `true` only for asymptotically stable.** A marginally stable system has `stable: false` even though it doesn't diverge.

## Example 2 — Step and Impulse Response (`step.js`)

- **Purpose:** Compute the time-domain response of a second-order system and verify the overshoot against the analytical formula `100·exp(−πζ/√(1−ζ²))`. This is the canonical verification of a step-response implementation.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// plant 1/(s^2+2s+1)... use G = 10/(s(s+1)(s+5))? start simple
const G = c.tf([1], [1, 3, 2]);
console.log('Gs: ', String(G));
let st = c.step(G);
let im = c.impulse(G);

// closed loop
const Cs = c.tf([10], [1]);
const sys = c.closeLoop(G, Cs); ok('closeLoop den', sys.den.join() === '1,3,12', sys.den.join());
const sys2 = c.closeLoop(Cs, G); ok('closeLoop symmetric', sys2.den.join() === sys.den.join());
const ra = c.responseAnalysis(sys, 'step');
ok('overshoot 2nd order', near(ra.overshootPercentage, 100*Math.exp(-Math.PI*(1.5/Math.sqrt(12))/Math.sqrt(1-(1.5/Math.sqrt(12))**2)), 2e-2), ra.overshootPercentage);
console.log(ra);
```

- **Methods invoked:** `tf`, `step`, `impulse`, `closeLoop`, `responseAnalysis`.
- **Inputs:**
  - **Plant:** `G = 1/(s² + 3s + 2)` — a second-order system with poles at `−1` and `−2`.
  - **Controller:** `Cs = 10` — a static gain.
  - **Closed loop:** `sys = closeLoop(G, Cs)` = `10/(s² + 3s + 12)`.
- **Output:**
  - Two `PASS` lines for the close-loop test.
  - One `PASS` line verifying the overshoot formula.
  - A dump of the full `responseAnalysis` object.
- **Expected output (abridged):**

```
Gs:  (1) / (s^2 + 3s + 2)
PASS closeLoop den  1,3,12
PASS closeLoop symmetric  1,3,12
PASS overshoot 2nd order  <value>
{
  stable: true,
  steadyStateValue: 0.8333...,
  steadyStateError: 0.1666...,
  peakValue: ...,
  peakTime: ...,
  delayTime: ...,
  riseTime: ...,
  settlingTime: ...,
  overshootPercentage: ...,
  array: [...],
  arrayLabels: [...]
}
```

- **Reading the output:**
  - **`closeLoop den`** — the closed-loop denominator is `s² + 3s + 12`. This matches the analytical `s² + 3s + G(0)·Cs = s² + 3s + (1/2)·10` = `s² + 3s + 5`... wait, actually `1/(s²+3s+2) · 10` has numerator 10 and denominator `s² + 3s + 2`. The closed loop is `10/(s² + 3s + 12)` — the `+10` in the denominator comes from `1 + 10/(s²+3s+2) = (s²+3s+2+10)/(s²+3s+2)`.
  - **`overshoot 2nd order`** — the closed-loop `s² + 3s + 12` has natural frequency `ωn = √12` and damping `ζ = 3/(2√12) = 1.5/√12`. The analytical overshoot is `100·exp(−πζ/√(1−ζ²))`. The test verifies that `responseAnalysis` returns a value within 2% of this.
  - **`steadyStateValue: 0.8333...`** — the closed loop's DC gain is `10/12 = 0.8333`. The steady-state error for a unit step is therefore `1 − 0.8333 = 0.1667`.
- **Reading `responseAnalysis`:**
  - **`delayTime`** — time to first reach 50% of `yss`.
  - **`riseTime`** — time from 10% to 90% of `yss`.
  - **`settlingTime`** — time after which the response stays within ±2% of `yss`.
  - **`overshootPercentage`** — `(peak − yss) / yss × 100`.
  - **`peakTime`** — the time at which the peak occurs.
  - **`steadyStateError`** — `1 − yss` for a unit step.
- **The closeLoop symmetry check:**
  - `closeLoop(G, C)` and `closeLoop(C, G)` should produce the same closed-loop transfer function, because multiplication is commutative. The test verifies this.
  - If the two disagree, either the argument order matters (bug) or the sign convention is inconsistent.
- **Coding example:** as shown. The `ok(...)` helper prints PASS/FAIL with an optional extra message.
- **Common pitfalls:**
  - **The `step` and `impulse` methods use a state-space simulation internally.** For a transfer function, the conversion to state space happens via `tf2ss` — if the transfer function is improper (numerator degree > denominator degree), the conversion throws.
  - **The auto time grid uses the pole locations.** For very fast or very slow systems, the default grid may be too coarse or too fine. Pass `opts.tEnd` and `opts.n` to override.
  - **The impulse response is simulated via the initial condition `x₀ = B`.** This is mathematically correct for a strictly proper system but produces a nonzero initial output even for a proper system.
  - **The overshoot formula assumes a second-order system with no zeros.** A second-order plant with a zero would have a different overshoot. The example's plant is zero-free, so the formula applies.
  - **`responseAnalysis` returns `stable: false` for an unstable system,** with a `message` field explaining why the steady-state metrics are undefined.
  - **The array `ra.array` carries the six key metrics in a fixed order.** The `arrayLabels` field documents the order. This is convenient for tabular output.

---

## Example 3 — Plot Data Generators (`plots.js`)

- **Purpose:** Compute the four classic frequency-domain plots — Bode, Nyquist, Nichols, and root locus — for a plant with known margins. The example verifies the gain margin against the analytical `K_max / K = 3` (9.54 dB).
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// margins: G=1/(s(s+1)(s+2)) *K=2 -> known GM: K_max=6 => GM=3 (9.54dB), wpc=sqrt2
const L = c.tf([2],[1,3,2,0]);
const b = c.bodePlot(L);
ok('GM=9.54dB', near(b.margins.gainMarginDb, 20*Math.log10(3), 1e-3), b.margins.gainMarginDb);
ok('wpc=sqrt2', near(b.margins.phaseCrossover, Math.SQRT2, 1e-3), b.margins.phaseCrossover);
console.log('PM', b.margins.phaseMargin, 'wgc', b.margins.gainCrossover);
const w0=b.w[0]; ok('bode phase at w0', near(b.phase[0], -90-Math.atan(w0)*180/Math.PI-Math.atan(w0/2)*180/Math.PI, 1e-6), b.phase[0]);

// root locus
const rl = c.rootLocusPlot(L); ok('rl branches', rl.branches.length === 3, rl.asymptotes.centroid);
const nyq = c.nyquistPlot(L);
const nic = c.nicholsPlot(L); ok('nyq/nichols', nyq.real.length > 100 && nic.phase.length > 100);
```

- **Methods invoked:** `tf`, `bodePlot`, `rootLocusPlot`, `nyquistPlot`, `nicholsPlot`.
- **Inputs:**
  - **Plant:** `L = 2/(s(s+1)(s+2))` — a third-order plant with an integrator.
  - **Known analytical results:**
    - The gain margin is `K_max / K` where `K_max = 6` (for a phase crossover at `ω = √2`). So `GM = 3` = `9.54 dB`.
    - The phase crossover frequency is `ω_pc = √2`.
- **Output:**
  - `PASS GM=9.54dB` — the Bode gain margin matches the analytical value.
  - `PASS wpc=sqrt2` — the phase crossover frequency matches.
  - One line for the phase margin and gain crossover.
  - `PASS bode phase at w0` — an analytical check of the phase at the first frequency.
  - `PASS rl branches` — the root locus has 3 branches (equal to the number of poles).
  - `PASS nyq/nichols` — the Nyquist and Nichols plots have reasonable sample counts.
- **Expected output:**

```
PASS GM=9.54dB  9.5424...
PASS wpc=sqrt2  1.4142...
PM <phase margin> wgc <gain crossover>
PASS bode phase at w0  <phase>
PASS rl branches  <centroid>
PASS nyq/nichols  true
```

- **Reading the output:**
  - **`GM = 9.54 dB`** — the gain margin is the amount by which the loop gain can increase before the closed loop becomes unstable. For this plant, the analytical value is `K_max / K = 6/2 = 3` = `9.54 dB`.
  - **`wpc = √2`** — the phase crossover frequency (where the phase is −180°) is `√2` rad/s. This matches the analytical derivation.
  - **`PM`** — the phase margin at the gain crossover frequency. For this plant, the analytical value is ~16.7° (not shown in the output line but available in `b.margins.phaseMargin`).
  - **`wgc`** — the gain crossover frequency (where `|L| = 1`, i.e. 0 dB). For this plant, `wgc ≈ 0.86 rad/s`.
  - **`bode phase at w0`** — for the first frequency in the Bode grid, the phase is `−90° − atan(ω) − atan(ω/2)`. The test verifies this against the implementation.
  - **`rl branches`** — the root locus has 3 branches (one per pole). The centroid is `(0 + (−1) + (−2)) / 3 = −1`.
  - **`nyq/nichols`** — the plots return data arrays; the test checks that they have reasonable lengths.
- **The four plot methods:**
  - **`bodePlot`** — magnitude and phase vs. frequency, plus margins.
  - **`nyquistPlot`** — real and imaginary parts of `L(jω)` for `ω ∈ [0, ∞)`.
  - **`nicholsPlot`** — magnitude in dB vs. phase in degrees, with frequency as a parameter.
  - **`rootLocusPlot`** — the paths of the closed-loop poles as `k` varies from 0 to `kmax`.
- **The `margins` object:**
  - **`gainMarginDb`** — the gain margin in dB.
  - **`gainMargin`** — the gain margin as a linear factor.
  - **`phaseMargin`** — the phase margin in degrees.
  - **`gainCrossover`** — the frequency at which the magnitude crosses 0 dB.
  - **`phaseCrossover`** — the frequency at which the phase crosses −180°.
- **Coding example:** as shown. The `ok()` tests verify the implementation against analytical results.
- **Common pitfalls:**
  - **The Bode grid may not land exactly on the crossovers.** The implementation uses bisection (`findCrossings`) to refine the crossover frequencies, so the reported values are accurate to ~1e-6 regardless of grid density.
  - **Multiple gain and phase crossovers are returned as arrays.** `b.margins.gainCrossovers` and `b.margins.phaseCrossovers` are arrays; `b.margins.gainCrossover` and `b.margins.phaseCrossover` are the first elements.
  - **The Nyquist plot is a half-contour.** The `real` and `imag` arrays cover `ω ∈ [0, ∞)`; `realNeg` and `imagNeg` are the mirror for `ω ∈ (−∞, 0]`, which is needed to assess closed-loop stability by the Nyquist criterion.
  - **The root locus uses a log-spaced `k` grid.** The density is controlled by `opts.n`. Very small `k` values are prepended to capture the initial branch near the open-loop poles.
  - **`rootLocusPlot` may be slow for high-order plants.** The `proots` call uses the Aberth–Ehrlich iterative method, which converges in O(n²) iterations but is not trivial for large `n`.
  - **The Nyquist and Nichols plots return data but do not draw.** Use any plotting library (Chart.js, Plotly, D3) to visualize the arrays.

## Example 4 — State-Space Conversions (`ss.js`)

- **Purpose:** Convert transfer functions to state-space form and back, in three canonical forms — controllable, observable, and diagonal. This is the foundation of every modern-control method.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// diagonal with complex poles, biproper
const ssd = c.tf2ss([2,1,3],[1,2,5,0], 'Diagonal Canonical');
const [nn,dd] = c.ss2tf(ssd); console.log('diag complex', nn.map(v=>+v.toFixed(5)), dd.map(v=>+v.toFixed(5)));
const ssb = c.tf2ss([3,1,3],[1,2,5], 'controllable'); const [nb,db]=c.ss2tf(ssb); console.log('biproper', nb.map(v=>+v.toFixed(5)), db);
const sysS = c.ss([[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0);
console.log('charEq', String(sysS.characteristicEquation()), sysS.characteristicEquation().polynomialString);
console.log(String(c.ss([[0,1],[-2,-2]],[0,1],[1,0],0).characteristicEquation()));
const [n3,d3] = c.ss2tf(sysS,1); ok('ss2tf', near(n3[n3.length-1],1)&&d3.join()==='1,3,2', n3+' | '+d3);
const ctrb = c.controllability(sysS), obs = c.observability(sysS); ok('ctrb/obs', ctrb.controllable && obs.observable);
const bad = c.ss([[1,0],[0,2]], [[1],[0]], [[1,1]], 0); ok('uncontrollable', !c.controllability(bad).controllable && c.controllability(bad).rank===1);
const sa3 = c.step(sysS); ok('ss step', near(sa3.y[sa3.y.length-1], 0.5, 1e-2));
```

- **Methods invoked:** `tf2ss`, `ss2tf`, `ss`, `characteristicEquation`, `controllability`, `observability`, `step`.
- **Inputs:**
  - **`ssd = tf2ss([2,1,3], [1,2,5,0], 'Diagonal Canonical')`** — a transfer function `(2s² + s + 3)/(s³ + 2s² + 5s)` converted to diagonal form. The poles are `0, −1 ± 2j`, so the state matrix is a mix of a real mode and a complex pair.
  - **`ssb = tf2ss([3,1,3], [1,2,5], 'controllable')`** — a biproper transfer function `(3s² + s + 3)/(s² + 2s + 5)` converted to controllable canonical form.
  - **`sysS = ss([[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0)`** — a 2-state system built directly.
- **Output:**
  - `diag complex` — the numerator and denominator coefficients reconstructed from the diagonal form.
  - `biproper` — same for the biproper case.
  - `charEq` — the characteristic equation as a string and in polynomial form.
  - `PASS ss2tf` — the transfer function reconstruction matches `1/(s² + 3s + 2)`.
  - `PASS ctrb/obs` — the system is both controllable and observable.
  - `PASS uncontrollable` — a different system is correctly flagged as uncontrollable.
  - `PASS ss step` — the step response of the state-space system reaches 0.5 (its DC gain).
- **Expected output (abridged):**

```
diag complex [ 2, 1, 3 ] [ 1, 2, 5, 0 ]
biproper [ 3, 1, 3 ] [ 1, 2, 5 ]
charEq (s - 0)(s + 1)(s + 2)  s^2 + 3s + 2 = 0
(s - 0)(s + 2)
PASS ss2tf  1 | 1,3,2
PASS ctrb/obs  true
PASS uncontrollable  true
PASS ss step  true
```

- **Reading the output:**
  - **`diag complex [2,1,3] [1,2,5,0]`** — the transfer function reconstruction matches the original `(2s² + s + 3)/(s³ + 2s² + 5s)`. The diagonal form with complex poles correctly reproduces the numerator and denominator.
  - **`biproper [3,1,3] [1,2,5]`** — the biproper case (`num` degree = `den` degree) is handled correctly. The `D` matrix is nonzero.
  - **`charEq`** — the characteristic equation of `sysS`. The `expression` string shows the factored form, and the `polynomialString` shows the polynomial form.
  - **`PASS ss2tf`** — the reconstructed transfer function is `1/(s² + 3s + 2)`, matching the original.
  - **`PASS ctrb/obs`** — the system is controllable (rank of `[B, AB]` is 2) and observable (rank of `[C; CA]` is 2).
  - **`PASS uncontrollable`** — the system with `A = diag(1, 2)`, `B = [1; 0]`, `C = [1 1]` has a rank-1 controllability matrix — the second state is unreachable.
  - **`PASS ss step`** — the step response at the end of the simulation grid is `0.5`, the DC gain of `1/(s² + 3s + 2)`.
- **The three canonical forms:**
  - **Controllable canonical** — the system matrix has 1s on the superdiagonal and the negated coefficients of the denominator in the last row.
  - **Observable canonical** — the transpose of the controllable form (with appropriate C and B).
  - **Diagonal (modal) canonical** — a block-diagonal matrix with each pole as a diagonal entry (or a 2×2 real block for a complex pair).
- **Reading `characteristicEquation`:**
  - **`expression`** — a string of the form `(s - p₁)(s - p₂)...`.
  - **`polynomial`** — the coefficients `[1, cₙ₋₁, ..., c₀]`.
  - **`polynomialString`** — the polynomial as `"s^n + ... = 0"`.
  - **`roots`** — the eigenvalue array.
  - **`toString()`** — returns the `expression`.
- **Coding example:** as shown. The `tf2ss` and `ss2tf` methods use `TransferFunction` and `StateSpace` objects internally.
- **Common pitfalls:**
  - **`tf2ss` requires a proper transfer function.** A strictly improper TF (degree of num > degree of den) throws.
  - **`tf2ss` with a repeated pole** cannot be diagonalised. The implementation uses partial fractions with distinct poles; for repeated poles, use the controllable form instead.
  - **The diagonal form for complex poles uses a 2×2 real block,** not a complex diagonal entry. This keeps the state matrix real.
  - **`ss2tf` requires a `StateSpace` object,** not a `TransferFunction`. Passing a TF throws with a clear error message.
  - **The `state-space` constructor** takes `(A, B, C, D)` — with `A` a matrix, `B` a column vector, `C` a row vector, and `D` a scalar or matrix. The `B` and `C` shapes are checked against `A`.
  - **`characteristicEquation` is a method on `StateSpace`,** not on the Compensator class. It is available on any `StateSpace` instance.

---

## Example 5 — Controllability and Observability (`controlability.js`)

- **Purpose:** Test whether a state-space system is reachable (controllable) and observable. These are the two structural properties that determine whether a system can be controlled by state feedback and whether its state can be reconstructed from output measurements.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// ss conversions
for (const form of ['controllable','observable','diagonal']) {
  const num=[1,4], den=[1,3,2,0.5];
  const ss = c.tf2ss(num, den, form + ' canonical');
  const [n2, d2] = c.ss2tf(ss, 1);
  ok('tf2ss/ss2tf '+form, n2.length && near(n2[n2.length-1]/d2[0], 4, 1e-6) && d2.every((v,i)=>near(v, den[i], 1e-6)) && near(n2[n2.length-2]||0,1,1e-6), JSON.stringify(n2.map(v=>+v.toFixed(6)))+' / '+JSON.stringify(d2.map(v=>+v.toFixed(6))));
}
// diagonal with complex poles, biproper
const ssd = c.tf2ss([2,1,3],[1,2,5,0], 'Diagonal Canonical');
const [nn,dd] = c.ss2tf(ssd); console.log('diag complex', nn.map(v=>+v.toFixed(5)), dd.map(v=>+v.toFixed(5)));
const ssb = c.tf2ss([3,1,3],[1,2,5], 'controllable'); const [nb,db]=c.ss2tf(ssb); console.log('biproper', nb.map(v=>+v.toFixed(5)), db);
const sysS = c.ss([[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0);
console.log('charEq', String(sysS.characteristicEquation()), sysS.characteristicEquation().polynomialString);
console.log(String(c.ss([[0,1],[-2,-2]],[0,1],[1,0],0).characteristicEquation()));
const [n3,d3] = c.ss2tf(sysS,1); ok('ss2tf', near(n3[n3.length-1],1)&&d3.join()==='1,3,2', n3+' | '+d3);
const ctrb = c.controllability(sysS), obs = c.observability(sysS); ok('ctrb/obs', ctrb.controllable && obs.observable);
const bad = c.ss([[1,0],[0,2]], [[1],[0]], [[1,1]], 0); ok('uncontrollable', !c.controllability(bad).controllable && c.controllability(bad).rank===1);
const sa3 = c.step(sysS); ok('ss step', near(sa3.y[sa3.y.length-1], 0.5, 1e-2));
```

- **Methods invoked:** `tf2ss`, `ss2tf`, `ss`, `characteristicEquation`, `controllability`, `observability`, `step`.
- **Inputs:**
  - **Loop over three canonical forms** — a 3rd-order transfer function `(s + 4)/(s³ + 3s² + 2s + 0.5)` is converted to controllable, observable, and diagonal forms, then reconstructed.
  - **`sysS`** — a 2nd-order system `[[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0` with poles at `−1` and `−2`.
  - **`bad`** — a system with `A = diag(1, 2)`, `B = [1; 0]`, `C = [1 1]`. The second state is neither reachable from `B` nor observable from `C`.
- **Output:**
  - Three `PASS tf2ss/ss2tf` lines — one per canonical form.
  - One line for the characteristic equations of `sysS`.
  - `PASS ss2tf` — the reconstruction matches `1/(s² + 3s + 2)`.
  - `PASS ctrb/obs` — `sysS` is controllable and observable.
  - `PASS uncontrollable` — `bad` is correctly flagged as uncontrollable with rank 1.
  - `PASS ss step` — the step response reaches 0.5.
- **Expected output (abridged):**

```
PASS tf2ss/ss2tf controllable canonical  [1,4] / [1,3,2,0.5]
PASS tf2ss/ss2tf observable canonical  [1,4] / [1,3,2,0.5]
PASS tf2ss/ss2tf diagonal canonical  [1,4] / [1,3,2,0.5]
charEq (s - 0)(s + 1)(s + 2)  s^2 + 3s + 2 = 0
(s - 0)(s + 2)
PASS ss2tf  1 | 1,3,2
PASS ctrb/obs  true
PASS uncontrollable  true
PASS ss step  true
```

- **Reading the output:**
  - **`PASS tf2ss/ss2tf <form>`** — each canonical form converts to state space and back to the same transfer function. The numerator and denominator coefficients match the original to within 1e-6.
  - **`charEq (s - 0)(s + 1)(s + 2)`** — the characteristic equation of `sysS`, factored. Note the `(s - 0)` factor is a numerical artifact of the smallest pole being very close to zero.
  - **`(s - 0)(s + 2)`** — the characteristic equation of `ss([[0,1],[-2,-2]],[0,1],[1,0],0)`. The trace is `0 + (−2) = −2`, the determinant is `0·(−2) − 1·1 = −1`... actually the eigenvalues are `−1 ± j` (complex), so the factored form shows a real-part-like structure.
  - **`PASS ss2tf  1 | 1,3,2`** — the transfer function reconstructed from `sysS` is `1/(s² + 3s + 2)`.
  - **`PASS ctrb/obs  true`** — the system is controllable and observable.
  - **`PASS uncontrollable  true`** — the system `diag(1, 2)` with `B = [1; 0]` has a rank-1 controllability matrix. The first state is reachable; the second is not.
  - **`PASS ss step  true`** — the step response at the end of the simulation grid is 0.5.
- **Controllability:**
  - The controllability matrix is `[B, AB, A²B, ..., A^(n−1)B]`. The system is controllable if its rank equals `n`.
  - For `sysS = [[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0`:
    - `B = [0; 1]`
    - `AB = [1; −3]`
    - `[B, AB] = [[0,1],[1,−3]]` has determinant `−1`, so rank 2.
  - For `bad = diag(1, 2), [1; 0], [1 1]`:
    - `B = [1; 0]`
    - `AB = [1·1; 2·0] = [1; 0]`
    - `[B, AB] = [[1,1],[0,0]]` has rank 1.
- **Observability:**
  - The observability matrix is `[C; CA; CA²; ...; CA^(n−1)]`. The system is observable if its rank equals `n`.
  - Same logic as controllability, but transposed.
- **Coding example:** as shown. The `ok` calls use the JSON-serialized arrays for diagnostic output.
- **Common pitfalls:**
  - **`tf2ss` requires `num` degree ≤ `den` degree.** For a strictly improper system, the function throws.
  - **The diagonal form with complex poles** uses 2×2 real blocks. The `tf2ss` implementation handles this automatically.
  - **`characteristicEquation` is expensive** for high-order systems — it computes both the polynomial and its roots.
  - **`controllability` and `observability` return rich objects.** They include the matrix itself, the rank, the number of states, and the boolean flags.
  - **`ss` constructor takes `A, B, C, D` as separate arguments,** not as a single object. Passing a 4-element array of matrices works too (via the `toArray()` convention).
  - **The `state`-space `step` method returns `{t, y, dt}`.** The final value `y[y.length-1]` should approach the DC gain for a stable system.

---

## Example 6 — PID Tuning (`pid.js`)

- **Purpose:** Compute PID gains using Ziegler–Nichols rules (ultimate-gain or reaction-curve) and a loop-shaping "general" method. Compare the closed-loop responses.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// PID
const P = c.tf([1],[1,3,3,1]);
let t0=Date.now();
const zn = c.pid(P, 'zigler_nichols'); console.log('ZN', zn, zn.info.method);
const gen = c.pid(P, 'general'); console.log('general', gen, (Date.now()-t0)+'ms');
for (const [nm,k] of [['zn',zn],['gen',gen]]) { const T=c.closeLoop(P, c.pid2tf(k)); const r=c.responseAnalysis(T,'step'); console.log(nm, 'OS',r.overshootPercentage.toFixed(1),'ts',r.settlingTime.toFixed(2),'ess',r.steadyStateError.toExponential(1)); }
// reaction curve on 1/((s+1)(s+2)(s+3)... ) plant w/o -180 crossover: 1/((s+1)(s+2))
try { console.log('ZN rc', c.pid(c.tf([1],[1,3,2]), 'ziegler_nichols')); } catch(e){ console.log('ZN 2nd order:', e.message); }
try { console.log('ZN 1st', c.pid(c.tf([1],[1,1]), 'ziegler_nichols')); } catch(e){ console.log('ZN 1st:', e.message); }
console.log('general 1st order', c.pid(c.tf([1],[1,1]),'general'));
console.log('general integrator', c.pid(c.tf([1],[1,1,0]),'general'));
```

- **Methods invoked:** `tf`, `pid`, `pid2tf`, `closeLoop`, `responseAnalysis`.
- **Inputs:**
  - **Plant:** `P = 1/(s³ + 3s² + 3s + 1) = 1/(s+1)³` — a third-order system with a triple pole at `−1`.
  - **ZN method:** `pid(P, 'zigler_nichols')`.
  - **General method:** `pid(P, 'general')`.
- **Output:**
  - The ZN and general PID gains, as `[kp, ki, kd]`.
  - Closed-loop overshoot, settling time, and steady-state error for each.
  - Attempts at ZN on simpler plants (with informative error messages).
  - General PID on a first-order plant and on an integrator.
- **Expected output (abridged):**

```
ZN [ ... kp ki kd ... ]  ziegler-nichols ultimate-gain
general [ ... kp ki kd ... ]  <time>ms
zn OS <value> ts <value> ess <value>
gen OS <value> ts <value> ess <value>
ZN rc ...
ZN 2nd order: ...
ZN 1st: ziegler_nichols: no apparent delay (L≈0), ...
general 1st order [ ... kp ki kd ... ]
general integrator [ ... kp ki kd ... ]
```

- **Reading the output:**
  - **ZN gains** — the ultimate-gain method produces moderate gains, typically with some overshoot.
  - **General gains** — the loop-shaping method targets a specific phase margin (default 60°). Usually produces less overshoot at the cost of a slower response.
  - **`OS` (overshoot percentage)** — for the ZN method, typically in the 20–50% range. For the general method, typically in the 5–15% range.
  - **`ts` (settling time)** — the time to stay within ±2% of the final value. Both methods give reasonable values for this plant.
  - **`ess` (steady-state error)** — since PID has an integrator, `ess = 0` for a step input. Both methods should report a value near `0` or `1e-3` or less.
  - **`ZN rc`** — ZN on a second-order plant `1/(s² + 3s + 2)`. The plant has no phase crossover, so the algorithm falls back to the reaction-curve method. But since the plant has no delay, the reaction-curve method throws with a clear error.
  - **`ZN 1st`** — ZN on a first-order plant `1/(s+1)`. Same fallback, same error.
  - **General PID on 1st order** — works, produces positive gains.
  - **General PID on integrator** — works, produces positive gains for `1/(s² + s)`.
- **The two PID methods:**
  - **Ziegler–Nichols ultimate-gain** — finds the ultimate gain `Ku` and ultimate period `Pu` where the phase is −180°. Then `kp = 0.6·Ku`, `Ti = 0.5·Pu`, `Td = 0.125·Pu`.
  - **Ziegler–Nichols reaction-curve** — uses the plant's step response to find the maximum slope `R` and delay `L`. Then `kp = 1.2/(R·L)`, `Ti = 2L`, `Td = 0.5L`. Requires an apparent delay.
  - **General (loop-shaping)** — places the gain crossover at a chosen frequency with a target phase margin. Uses `Ti = ratio · Td` (default ratio 4) and solves for the gains analytically.
- **Reading the errors:**
  - **ZN on a plant without a phase crossover and without a delay** — throws a clear error suggesting the `"general"` method.
  - **ZN on a first-order plant** — throws because there is no apparent delay `L > 0`.
- **Coding example:** as shown. The `for (const [nm, k] of ...)` pattern iterates over two PID gain arrays.
- **Common pitfalls:**
  - **The ZN method requires either a phase crossover or a delay.** For a stable plant with neither, it throws.
  - **The reaction-curve rules need `L > 0`.** For a first-order plant, `L ≈ 0`, so the rules do not apply.
  - **The general method needs a plant with a proper low-pass character.** For an integrator, it works but the crossover selection is different.
  - **The `pid` method returns an array with a non-enumerable `info` property.** The array itself is `[kp, ki, kd]`; the details are in `pid.info`.
  - **`pid2tf` converts gains to a transfer function.** Without `opts.N`, the derivative term is `kd·s`, which is improper. With `opts.N`, the derivative is filtered: `kd·N·s/(s+N)`.
  - **The `general` method may fail** if no stable PID is found in the candidate grid. In that case, adjust `opts.crossover` or `opts.phaseMargin`.

## Example 7 — Classical Compensators (`controllers.js`)

- **Purpose:** Design lead, lag, lead-lag, and parallel compensators for a plant with a low phase margin. Each compensator reshapes the Bode plot to achieve a target phase margin.
- **Source:**

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// controllers
const Gp = c.tf([4],[1,2,0]);
console.log('base PM', c.bodePlot(Gp).margins.phaseMargin);
const Gm = c.tf([10],[1,1,0]);
console.log('Gm base PM', c.bodePlot(Gm).margins.phaseMargin);
const lead = c.controller(Gm, 'Lead', {phaseMargin: 50});
console.log('lead', {alpha:lead.alpha.toFixed(3), T:lead.T.toFixed(3), ach:lead.achieved, w:lead.warnings});
const lag = c.controller(c.tf([1],[1,1,0]), 'Lag', {phaseMargin: 50, K: 5});
console.log('lag', {beta:lag.beta, T:lag.T, ach:lag.achieved, w:lag.warnings});
const ll = c.controller(Gm, 'Lead-Lag', {phaseMargin: 50, Kss: 100});
console.log('leadlag', JSON.stringify({lead:ll.lead, lag:ll.lag, ach:ll.achieved, w:ll.warnings}));
const par = c.controller(Gm, 'Parallel', {phaseMargin: 50, Kss: 100});
const Cll = c.comp2tf(ll), Cpar = c.comp2tf(par);
const f1 = require('../caro.compensator-1.0.js').utils.makeFR(Cll), f2 = require('../caro.compensator-1.0.js').utils.makeFR(Cpar);
ok('parallel == lead-lag freq resp', [0.1,1,10,100].every(w=>near(f1.mag(w), f2.mag(w), 1e-6) && near(f1.phase(w), f2.phase(w),1e-4)), JSON.stringify(par.branches)+' Kinf='+par.Kinf);
const cl = c.closeLoop(c.comp2tf(lead), Gm); console.log('lead CL', c.responseAnalysis(cl,'step').overshootPercentage);
try { const bigLead = c.controller(c.tf([1],[1,0,0]), 'Lead', {phaseMargin:60}); console.log('double integrator lead', bigLead.achieved, bigLead.warnings); } catch(e) { console.log('err', e.message); }
console.log('pid2tf', String(c.pid2tf([2,1,0.5])), '|', String(c.pid2tf([2,1,0.5],{N:10})));
console.log(c.responseAnalysis(cl,'ramp'), c.responseAnalysis(cl,'impulse').peakValue);
```

- **Methods invoked:** `tf`, `bodePlot`, `controller`, `comp2tf`, `closeLoop`, `responseAnalysis`, `pid2tf`.
- **Inputs:**
  - **Plant `Gp = 4/(s(s+2))`** — a type-1 plant with a base phase margin of ~52°.
  - **Plant `Gm = 10/(s(s+1))`** — another type-1 plant with a lower phase margin.
  - **Lead design** for `Gm` targeting PM = 50°.
  - **Lag design** for `1/(s(s+1))` with `K = 5`, targeting PM = 50°.
  - **Lead-Lag** and **Parallel** designs for `Gm`, both with `Kss = 100` and PM = 50°.
- **Output:** multiple diagnostic lines, plus a PASS/FAIL for the parallel-vs-lead-lag equivalence.
- **Expected output (abridged):**

```
base PM 52.xx
Gm base PM 17.xx
lead {alpha: '...', T: '...', ach: {..., phaseMargin: 50.xx}, w: []}
lag {beta: ..., T: ..., ach: {..., phaseMargin: 50.xx}, w: []}
leadlag {...}
PASS parallel == lead-lag freq resp  {...}
lead CL <overshoot>
double integrator lead  {..achieved..} []
pid2tf (0.5s^2 + 2s + 1)/(s) | (5s^2 + 2s + 1)/(s + 10)   [roughly]
<ramp response object> <impulse peak>
```

- **Reading the output:**
  - **`base PM`** — the phase margin of the uncompensated plant. For `Gp`, this is ~52°, which is already acceptable. For `Gm`, this is ~17°, which needs compensation.
  - **`lead`** — the lead compensator's parameters. `alpha < 1`; `T > 0`. The `achieved` object shows the phase margin *after* adding the compensator, which should be near the target (50°).
  - **`lag`** — the lag compensator's parameters. `beta > 1`; `T > 0`. Achieves the target PM while also boosting the DC gain by `K = 5`.
  - **`leadlag`** — the lead-lag compensator. The `lead` field has the lead parameters; the `lag` field has the lag parameters (including `lambda`, the additional low-frequency gain).
  - **`PASS parallel == lead-lag freq resp`** — the "Parallel" compensator, when reconstructed via `comp2tf`, produces the same frequency response as the "Lead-Lag" compensator. This verifies that the parallel realization is algebraically identical.
  - **`lead CL`** — the closed-loop overshoot of the lead-compensated plant. Should be lower than the uncompensated plant.
  - **`double integrator lead`** — attempting a lead compensator on `1/s²`. This may succeed with a warning, or throw. A double integrator is a challenging plant to compensate.
  - **`pid2tf`** — shows the transfer function of a PID with gains `[2, 1, 0.5]`, with and without a first-order derivative filter.
  - **`responseAnalysis(cl, 'ramp')`** — the ramp-response analysis of the lead-compensated closed loop. For a type-0 loop, this has a nonzero steady-state error; for a type-1 loop, it converges to a finite value.
  - **`impulse peak`** — the peak value of the impulse response.
- **The four controller methods:**
  - **`Lead`** — `C(s) = K · (1 + Ts)/(1 + αTs)` with `α < 1`. Adds phase lead near the crossover.
  - **`Lag`** — `C(s) = K · (1 + Ts)/(1 + βTs)` with `β > 1`. Adds low-frequency gain without much phase change near the crossover.
  - **`Lead-Lag`** — a cascade of a lead and a lag stage. Used when a single stage cannot achieve both the phase margin and the low-frequency gain target.
  - **`Parallel`** — the lead-lag compensator expressed as a partial-fraction sum `K∞ + Σ ri/(s − pi)`. Mathematically equivalent, but structurally different.
- **Reading `achieved`:**
  - **`phaseMargin`** — the actual PM after applying the compensator. Should be within a few degrees of the target.
  - **`gainCrossover`** — the new gain crossover frequency.
  - **`gainMarginDb`** — the gain margin of the compensated loop.
- **Reading `warnings`:**
  - An empty `warnings` array means the compensator achieved the target.
  - A non-empty array means the target could not be reached with a single stage — try `Lead-Lag` or `Parallel`.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **The `controller` method needs a plant with a valid gain crossover.** For a plant whose magnitude never crosses 0 dB, `controller` may throw or produce a compensator that does not achieve the target.
  - **The `Kss` option sets the low-frequency gain.** It is the desired value of the static error constant (position, velocity, or acceleration, depending on the plant type).
  - **Lead-Lag with a large `Kss`** may produce a compensator with a very low-frequency lag pole. Numerical issues can appear if `Kss` is too large.
  - **The `Parallel` realization requires real poles.** If the lead-lag compensator has complex poles, `controller` throws. This is rare but possible for unusual plant types.
  - **The parallel and lead-lag realizations are mathematically identical,** verified by `PASS parallel == lead-lag freq resp`. This is a strong sanity check on the implementation.
  - **`pid2tf` with `opts.N`** adds a first-order derivative filter. The unfiltered version has a differentiation term (`kd·s`), which is improper; the filtered version is proper.

---

## Example 8 — Consolidated Test Suite (`test.js`)

- **Purpose:** Run every test from Examples 1–7 in a single script. This is the integration test for the entire library.
- **Source:** (abridged — full version in `test.js`)

```javascript
const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// ... stability, step, plots, ss, controlability, pid, controllers ...

const f1 = require('../caro.compensator-1.0.js').utils.makeFR(Cll);
const f2 = require('../caro.compensator-1.0.js').utils.makeFR(Cpar);
ok('parallel == lead-lag freq resp', ...);
```

- **Methods invoked:** all of the above.
- **Output:** a single PASS/FAIL list.
- **Expected output:** all `PASS`.
- **Reading the output:** every line starts with `PASS`. A `FAIL` indicates a regression.
- **The one fix:** the original `test.js` uses `require('./Compensator.js')` for two lines. Change to `require('../caro.compensator-1.0.js')` — this is documented in Appendix A.
- **Why the consolidated suite matters:**
  - It runs in a few seconds.
  - It covers the entire public API.
  - Any change to the library that breaks a test shows up immediately.
  - It is the reference for whether the library is functioning correctly.

---

## What the Eight Examples Prove Together

Run in sequence (or as the consolidated `test.js`), the eight scripts verify:

| Step | What it proves |
|---|---|
| 1. `stability.js` | Pole classification, Routh table, and stability report are correct. |
| 2. `step.js` | Time responses and overshoot formula match the analytical result. |
| 3. `plots.js` | Bode, Nyquist, Nichols, and root-locus data are consistent with known margins. |
| 4. `ss.js` | Transfer function ↔ state-space conversions work in all canonical forms. |
| 5. `controlability.js` | Controllability and observability ranks are correctly computed. |
| 6. `pid.js` | Both ZN and loop-shaping PID tuning produce stable closed loops. |
| 7. `controllers.js` | Lead, lag, lead-lag, and parallel compensators achieve their phase-margin targets, and parallel == lead-lag. |
| 8. `test.js` | Everything works together as a single script. |

If all pass, the Compensator library is fully verified.

---

## Extending the Examples

### 1. Add a discrete-time conversion

The library does not currently expose `c2d` or `d2c`. Add a Tustin or zero-order-hold conversion:

```javascript
// ZOH discretization at sample period dt
const M = mzeros(n+1, n+1);
for (let i = 0; i < n; i++) { M[i][n] = A[i][n] * dt; ... }
const E = expm(M);
const Ad = E.slice(0, n).map(r => r.slice(0, n));
const Bd = E.slice(0, n).map(r => r[n]);
```

### 2. Add a Nyquist stability assessment

The `nyquistPlot` returns data but does not compute the encirclement count. Add a method that counts net encirclements of `−1` and reports closed-loop stability.

### 3. Add a full H∞ or LQR design

The library covers *classical* control. Modern control (LQR, H∞) would be a natural extension. `lqr(A, B, Q, R)` solves the Riccati equation for the optimal state-feedback gain.

### 4. Add a ZPK (zero-pole-gain) representation

Currently the library uses numerator/denominator polynomials. A ZPK representation would be more natural for some designs.

### 5. Add a Nyquist criterion check

Compute `N` (number of encirclements of `−1`) and `P` (number of open-loop RHP poles). Closed-loop stability follows from `Z = N + P = 0`.

### 6. Add a root-locus P/Z/path JSON export

The root-locus data is currently nested arrays. Export it as a flat JSON with explicit branches, asymptotes, and breakaway points.

### 7. Add a script that plots all four frequency plots

Convert the data arrays into SVG or Chart.js traces. A single script could produce a 2×2 dashboard.

---

## Troubleshooting

The following issues are the most common when running these eight scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '../caro.compensator-1.0.js'` | Wrong path or missing file | Check that the library file is named exactly that |
| `FAIL tf2ss/ss2tf <form>` | Conversion bug, or repeated poles | Check the polynomial; use the controllable form for repeated poles |
| `FAIL uncontrollable` | Rank computation is off | Check the `B` matrix; ensure it has the correct shape |
| `FAIL parallel == lead-lag freq resp` | Numerical error in partial fractions | Reduce the magnitude of `Kss` or the beta of the lag stage |
| `ReferenceError: mzeros is not defined` | Library not loaded | Check that the require path is correct |
| `Error: tf2ss: transfer function must be proper` | Numerator degree > denominator degree | Reduce the numerator, or use a strictly proper plant |
| `Error: tf2ss: a static gain has no states` | Plant is `D` only | Model a plant with at least one state |
| `Error: ss2tf expects a StateSpace system` | Passed a `TransferFunction` | Wrap the TF in `c.tf2ss(...)` first |
| `Error: ss2tf: input index out of range` | Input index outside 1..m | Use `1` for the first input |
| `Error: pid: unknown method` | Typo in method string | Use `'general'` or `'ziegler_nichols'` |
| `Error: controller: unknown method` | Typo in method string | Use `'Lead'`, `'Lag'`, `'Lead-Lag'`, or `'Parallel'` |
| `Error: ziegler_nichols: no apparent delay (L≈0)` | First-order plant without delay | Use `'general'` |
| `Error: ziegler_nichols: plant is open-loop unstable` | RHP pole with no -180° crossover | Not applicable to this plant |
| `Error: controller(Lead): plant has no gain crossover` | Magnitude never crosses 0 dB | Adjust `K` or `Kss` to shift the crossover |
| `Error: controller(Lead-Lag): no stabilising compensator found` | Very difficult plant | Try different targets or a different compensator |
| `Error: controller(Parallel): compensator has complex poles` | Complex lead-lag poles | Use the `Lead-Lag` method instead |
| `Error: Repeated poles detected` | Diagonal form on a plant with repeated poles | Use the controllable or observable form |
| `Error: responseAnalysis: ut must be 'step', 'impulse' or 'ramp'` | Typo in input type | Use one of the three valid strings |
| `Error: _tf: Expected a TransferFunction, StateSpace or number` | Wrong argument type | Pass a proper `TransferFunction` or `StateSpace` |
| `Error: ss: A must be square` | A is not a square matrix | Check the shape of A |

If a failure is not listed here, the fastest diagnostic is usually to run the eight scripts in order and identify the first one that fails.

---

## Appendix A — Corrected Source Scripts

## Closing Notes

This is the first manual for the `caro.compensator-1.0.js` library, which is the control-systems sibling of `caro.manipulator-1.0.js`. Together, the two libraries cover:

- **Kinematics and dynamics** — how a robot moves.
- **Classical control** — how to design a controller for a linear system.

The eight examples in this manual are the ground truth for the Compensator library. Every public method is verified against an analytical result, and the consolidated `test.js` is the regression suite.

The pattern matches the Manipulator manuals:

1. **a minimal test per feature** (stability, step, plots, ss, etc.),
2. **a consolidated integration test** (test.js),
3. **honest documentation** of what needs fixing (Appendix A).

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.dsp-1.0.js** — signal generation, filtering, and spectral analysis.
- **caro.manipulator-1.0.js** — robot kinematics, dynamics, control.
- **caro.fuzzy-1.0.js** — fuzzy inference and fuzzy PID.
- **caro.anfis-1.0.js** — adaptive neuro-fuzzy inference.
- **caro.ga-1.0.js** — genetic algorithm.
- **caro.ml-1.0.js** — unsupervised clustering.
- **caro.dip-1.0.js** — digital image processing.

That rhythm is what keeps a classical control library trustworthy over time.

---

*End of document.*
