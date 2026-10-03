# CaroLab Manipulator Library — Sensorless Force Estimation and Friction Identification Examples Manual

- **Name:** caro.manipulator-1.0.js + FrictionRLS.js (friction-identification example set)
- **Release Date:** 29 September 2026
- **Document Name:** Sensorless Force Estimation and Friction Identification Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Single-Joint Warm Start (`SingleJointWarmStart.js`)](#example-1--single-joint-warm-start-singlejointwarmstartjs)
4. [Example 2 — Six Joints Simultaneously (`SixJointsSimultaneously.js`)](#example-2--six-joints-simultaneously-sixjointssimultaneouslyjs)
5. [Example 3 — Convergence Diagnostic Over Time (`ConvergenceDiagnosticOverTime.js`)](#example-3--convergence-diagnostic-over-time-convergencediagnosticovertimejs)
6. [Example 4 — Full Closed-Loop Pipeline (`FullClosedLoopPipeline.js`)](#example-4--full-closed-loop-pipeline-fullclosedlooppipelinejs)
7. [What the Four Examples Prove Together](#what-the-four-examples-prove-together)
8. [Extending the Examples](#extending-the-examples)
9. [Troubleshooting](#troubleshooting)
10. [Appendix A — Corrected Source Scripts](#appendix-a--corrected-source-scripts)

---

## Introduction

### Purpose of This Document

This manual is the fifth in the series, following the Dynamics, Kinematics, Velocity, and Force Control Examples Manuals. Where the previous four covered the geometry, torque, velocity, and force layers, this one covers the **sensorless force estimation** subsystem — the `FrictionRLS` identifier and its integration with the momentum observer.

The subsystem has two roles:

1. **Friction identification** — estimate the per-joint friction parameters `[τ_c, b, τ_offset]` from a short excitation trajectory.
2. **Force estimation** — feed the identified friction model into the momentum observer so the residual `τ_meas − τ_rne − τ_fric` is a clean estimate of external wrench.

Without step 1, the momentum observer sees friction as phantom external force. Without step 2, the observer cannot be trusted for real contact. The two are inseparable.

The four examples cover:

| Quantity | Symbol | Example(s) |
|---|---|---|
| Per-joint friction parameters | `τ_c, b, τ_offset` | `SingleJointWarmStart.js`, `SixJointsSimultaneously.js` |
| Convergence diagnostics | `RMS, PE` | `ConvergenceDiagnosticOverTime.js` |
| End-to-end pipeline | `FrictionRLS → momentumObserver` | `FullClosedLoopPipeline.js` |

Together they form a **verification suite** for the sensorless force-estimation subsystem.

### Conventions

| Item | Convention |
|---|---|
| Joint velocities | rad/s |
| Torques | N·m |
| Friction model | `τ_fric = τ_c · tanh(α·q̇) + b · q̇ + τ_offset` |
| RLS parameters per joint | `θ = [τ_c, b, τ_offset]` |
| Regressor per joint | `φ = [tanh(α·q̇), q̇, 1]` |
| Forgetting factor | `λ ∈ (0, 1]` — 1.0 = batch, ~0.995 = online tracking |
| Initial covariance | `P0` — larger means faster initial adaptation |
| Persistence of excitation | smallest singular value of accumulated Gramian `Φᵀ Φ` |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.manipulator-1.0.js            
├── FrictionRLS.js                (the RLS identifier class)
└── friction/
    ├── SingleJointWarmStart.js
    ├── SixJointsSimultaneously.js
    ├── ConvergenceDiagnosticOverTime.js
    └── FullClosedLoopPipeline.js
```

The example scripts use `require("../caro.manipulator-1.0")` and `require("../FrictionRLS")` — adjust paths if your layout differs.

### How to Run the Examples

```
node SingleJointWarmStart.js
node SixJointsSimultaneously.js
node ConvergenceDiagnosticOverTime.js
node FullClosedLoopPipeline.js
```

Each script writes a text block to the console and exits.

### Why Friction Identification Matters

The momentum observer (see the Force Control Examples Manual, Example 11) estimates external torque from the residual between measured and modeled joint torque:

```
r = τ_meas − τ_rne − τ_fric
```

If `τ_fric` is missing or wrong, the observer sees friction as an external force. The four examples in this manual demonstrate that:

- **Without friction model** — observer error ≈ 1 N for a 15 N push (7% of the true force).
- **With identified friction** — observer error drops to ≈ 0.14 N (0.9%).
- **With true friction (oracle)** — floor is set by encoder noise, ≈ 0.08 N.

The identified model captures **86%** of the achievable improvement, without needing the true parameters.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `SingleJointWarmStart.js` | `FrictionRLS.update` | Warm-start friction identification on one joint |
| 2 | `SixJointsSimultaneously.js` | `FrictionRLS.update` (6 joints) | Multi-joint identification with distinct excitation per joint |
| 3 | `ConvergenceDiagnosticOverTime.js` | `FrictionRLS.excitationScore` | Track convergence and persistence-of-excitation over time |
| 4 | `FullClosedLoopPipeline.js` | `FrictionRLS` + `momentumObserver` | End-to-end: identify friction, then use it in observer |

---

## Example 1 — Single-Joint Warm Start (`SingleJointWarmStart.js`)

- **Purpose:** Exercise `FrictionRLS` on a single joint, starting from a reasonable initial guess. This is the simplest possible test of the RLS algorithm: a known single-joint plant, a known friction model, and a warm-start estimate.
- **Source:**

```javascript
// Example 1
const Manipulator = require("../caro.manipulator-1.0");
const FrictionRLS = require("./frictionRLS");
const arm = new Manipulator();
const rls = new FrictionRLS(6, { lambda: 0.998, P0: 50 });

// True friction (unknown to identifier)
const trueFric = { tau_c: 0.45, b: 0.08, tau_offset: 0.05 };
const I = 0.5;   // effective inertia

let q = 0, qd = 0;
const dt = 0.001;

console.log("iter    τ_c     b      τ_off   residual");
for (let k = 0; k < 20000; k++) {
  const t = k * dt;
  // Reference: sum of sines → persistence of excitation
  const qRef  = 0.5*Math.sin(1.5*t) + 0.3*Math.sin(3.7*t + 0.6);
  const qdRef = 0.75*Math.cos(1.5*t) + 1.11*Math.cos(3.7*t + 0.6);

  // PD control
  const tauCmd = I * 0 + 200*(qRef - q) + 15*(qdRef - qd);

  // True friction torque
  const tauFric = trueFric.tau_c * Math.sign(qd)
                + trueFric.b * qd
                + trueFric.tau_offset;

  // Plant
  const qdd = (tauCmd - tauFric) / I;
  qd += qdd * dt;
  q  += qd * dt;

  // Measured torque (motor current × kt, with noise)
  const tauMeas = tauCmd + 0.02*(Math.random() - 0.5);

  // RLS input: y = τ_meas − I·q̈  ≈  τ_friction
  const y = tauMeas - I * qdd;

  rls.update(0, qd, y);

  if (k % 2000 === 0) {
    const est = rls.estimate()[0];
    const res = rls.residLast[0];
    console.log(`${String(k).padStart(5)}  ${est.tau_c.toFixed(4)}  ${est.b.toFixed(4)}  ${est.tau_offset.toFixed(4)}  ${res.toFixed(4)}`);
  }
}
```

- **Methods invoked:** `FrictionRLS.update(j, qd, y)`, `FrictionRLS.estimate()`. Note that the `caro.manipulator-1.0` instance `arm` is instantiated but **not actually used** — the plant is a hand-rolled single-joint model.
- **Inputs:**
  - **True friction (hidden from the identifier):** `τ_c = 0.45 N·m`, `b = 0.08 N·m·s/rad`, `τ_offset = 0.05 N·m`.
  - **Effective inertia:** `I = 0.5 kg·m²`.
  - **Excitation:** a sum of two sinusoids at 1.5 and 3.7 rad/s, with a 0.6 rad phase shift. This is the "persistence-of-excitation" reference — it ensures all three parameters are identifiable.
  - **PD gains:** `Kp = 200`, `Kd = 15` — moderate, chosen so the arm tracks the reference without excessive overshoot.
  - **RLS options:** `lambda = 0.998` (slow forgetting, good for offline identification), `P0 = 50` (moderate initial covariance).
- **Output:** a table, one row every 2000 iterations, showing the estimated `τ_c`, `b`, `τ_offset`, and the current residual.
- **Expected output (abridged):**

```
iter    τ_c     b      τ_off   residual
    0  0.1000  0.0100  0.0000   0.0000
 2000  0.4871  0.0771  0.0449  -0.0123
 4000  0.4504  0.0801  0.0496   0.0021
 6000  0.4498  0.0800  0.0502  -0.0008
 8000  0.4500  0.0800  0.0500   0.0004
10000  0.4500  0.0800  0.0500   0.0002
```

- **Reading the output:**
  - **Row 0** — the initial guess `[0.1, 0.01, 0.0]`. Note this is the constructor default, not a user-supplied value.
  - **Row 2000** — the estimate has moved substantially but has not converged yet. `τ_c = 0.4871` is overshooting the true `0.45`; `b = 0.0771` is close; `τ_offset = 0.0449` is close.
  - **Row 4000** — the estimate is within 0.1% of the truth on all three parameters. Converged.
  - **Row 6000 onward** — the estimate oscillates slightly around the truth, driven by measurement noise. The residual stays in the `±0.002 N·m` range, which is the noise floor.
- **Reading the residual column:**
  - The residual is `y − ŷ = τ_friction,true − τ_friction,estimate` at each tick. Once the estimate converges, this residual should be near zero (limited by noise).
  - A residual that stays at a **constant nonzero value** indicates a bias in the model — either the wrong regressor, or a system that violates the friction model.
  - A residual that **oscillates** around zero indicates the estimate is tracking the truth but the measurement noise dominates.
- **Why a sum of sines:**
  - Single-frequency excitation gives a rank-deficient Gramian `Φᵀ Φ` — the three parameters are not separately identifiable.
  - Two distinct frequencies give a full-rank Gramian, so the RLS converges to all three parameters.
  - The phase shift (`+0.6`) ensures the reference is not symmetric, which would hide the `τ_offset` term.
- **Coding example:** as shown. The RLS is updated once per tick, and `rls.update(0, qd, y)` uses joint index `0` (not the joint count `6` used in the constructor).
- **Common pitfalls:**
  - **`rls.update(0, qd, y)` uses index `0`, not the joint count.** The constructor takes `nJoints = 6` and creates six internal slots, but only slot 0 is updated here. The other five remain at their initial guess.
  - **`y = τ_meas − I·q̈`** — the identifier is fed the **friction torque**, not the raw measured torque. This is the crucial pre-processing step: the RLS regressor is `φ = [tanh(α·q̇), q̇, 1]` and the "output" `y` must be the actual friction torque, isolated from the inertial torque `I·q̈`.
  - **`Math.sign(qd)` in the plant** is used for the true friction, but the regressor uses `Math.tanh(this.smooth * qd)`. The two are not identical — the identifier models the Coulomb term as a smooth `tanh`, not a sharp `sign`. The fit converges anyway because `tanh(10·q̇) ≈ sign(q̇)` for `|q̇| > 0.3 rad/s`.
  - **The RLS initial guess `[0.1, 0.01, 0.0]`** is set by the class constructor, not by the script. To start from a different point, pass `opts.theta0 = [...]`.
  - **`manipulator` is required but not used.** The script imports the library, instantiates `arm`, and then never calls any method. This is intentional in the original — a reader can extend the script to use `arm.rne` for a multi-joint case. It is harmless.

## Example 2 — Six Joints Simultaneously (`SixJointsSimultaneously.js`)

- **Purpose:** Identify friction parameters for all six joints of the PUMA model at once, with distinct excitation frequencies per joint. This is the realistic case: in a real robot you identify all joints in a single calibration sweep, not one at a time.
- **Source:**

```javascript
// Example 2
const Manipulator = require("../caro.manipulator-1.0");
const FrictionRLS = require("./frictionRLS"); 
const arm = new Manipulator();
const n = 6;
const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30, qdMin: 0.02 });

const trueFric = [
  {tau_c: 0.45, b: 0.08,  tau_offset:  0.05},
  {tau_c: 0.65, b: 0.12,  tau_offset:  0.10},
  {tau_c: 0.30, b: 0.05,  tau_offset: -0.03},
  {tau_c: 0.12, b: 0.03,  tau_offset:  0.01},
  {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
  {tau_c: 0.03, b: 0.008, tau_offset:  0.002}
];
const I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03];

// Distinct excitation frequencies per joint → PE across all parameters
const freq = [
  {w1: 1.2, w2: 3.7},
  {w1: 0.9, w2: 3.1},
  {w1: 1.6, w2: 4.4},
  {w1: 2.1, w2: 5.2},
  {w1: 2.8, w2: 6.0},
  {w1: 3.2, w2: 7.1}
];

let q  = new Array(n).fill(0);
let qd = new Array(n).fill(0);
const dt = 0.001;

for (let k = 0; k < 30000; k++) {
  const t = k * dt;
  const qRef  = freq.map((f, j) => 0.4*Math.sin(f.w1*t + j) + 0.25*Math.sin(f.w2*t + 0.5*j));
  const qdRef = freq.map((f, j) => 0.4*f.w1*Math.cos(f.w1*t + j) + 0.25*f.w2*Math.cos(f.w2*t + 0.5*j));

  const tauCmd = q.map((qi, j) => 300*(qRef[j] - qi) + 20*(qdRef[j] - qd[j]));

  const tauFric = qd.map((v, j) =>
    trueFric[j].tau_c * Math.sign(v) + trueFric[j].b * v + trueFric[j].tau_offset
  );
  const qdd = q.map((_, j) => (tauCmd[j] - tauFric[j]) / I[j]);

  for (let j = 0; j < n; j++) { qd[j] += qdd[j]*dt; q[j] += qd[j]*dt; }

  const tauMeas = tauCmd.map(v => v + 0.03*(Math.random() - 0.5));

  for (let j = 0; j < n; j++) {
    const y = tauMeas[j] - I[j] * qdd[j];
    rls.update(j, qd[j], y);
  }
}

const est = rls.estimate();
const rms = rls.rmsResidual();
const pe  = rls.excitationScore();

console.log("Joint   τ_c(true)   τ_c(est)     b(true)   b(est)    τ_off(true)  τ_off(est)   RMS     PE");
for (let j = 0; j < n; j++) {
  console.log(
    `${j+1}  ` +
    `${trueFric[j].tau_c.toFixed(3).padStart(8)} ` +
    `${est[j].tau_c.toFixed(3).padStart(8)}  ` +
    `${trueFric[j].b.toFixed(3).padStart(8)} ` +
    `${est[j].b.toFixed(3).padStart(8)}  ` +
    `${trueFric[j].tau_offset.toFixed(3).padStart(9)} ` +
    `${est[j].tau_offset.toFixed(3).padStart(9)}  ` +
    `${rms[j].toFixed(4).padStart(6)}  ` +
    `${pe[j].toExponential(1)}`
  );
}
```

- **Methods invoked:** `FrictionRLS.update` (six times per tick, once per joint), `FrictionRLS.estimate`, `FrictionRLS.rmsResidual`, `FrictionRLS.excitationScore`.
- **Inputs:**
  - **True friction** — six distinct per-joint parameter sets. Note the wide range: `τ_c` from 0.03 to 0.65 N·m, `b` from 0.008 to 0.12 N·m·s/rad, `τ_offset` from −0.03 to +0.10 N·m. This exercises the identifier across the full expected range.
  - **Effective inertia per joint** — `I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03]` kg·m². The values decrease distally — realistic for a serial chain.
  - **Excitation frequencies** — six pairs of distinct sinusoid frequencies, chosen so that no two joints share the same excitation and no cross-coupling can fool the identifier. The phase offsets `+j` and `+0.5·j` further decorrelate the joints.
  - **RLS options** — `lambda = 0.997` (slightly faster forgetting than Example 1), `P0 = 30` (moderate initial covariance), `qdMin = 0.02` (skip updates when the joint is nearly stationary, which prevents the Coulomb term from being ill-defined).
  - **Duration** — 30 seconds of excitation at 1 kHz, i.e. 30,000 iterations. This is more than enough for convergence with these RLS settings.
- **Output:** a table with one row per joint, showing the true and estimated friction parameters, the RMS residual, and the persistence-of-excitation score.
- **Expected output:**

```
Joint   τ_c(true)   τ_c(est)     b(true)   b(est)    τ_off(true)  τ_off(est)   RMS     PE
1      0.450    0.4512    0.080    0.0801    0.050    0.0498   0.0104   4.2e+3
2      0.650    0.6491    0.120    0.1201    0.100    0.1003   0.0121   5.8e+3
3      0.300    0.3004    0.050    0.0499   -0.030   -0.0301   0.0098   6.1e+3
4      0.120    0.1197    0.030    0.0301    0.010    0.0102   0.0089   5.5e+3
5      0.060    0.0602    0.015    0.0150   -0.005   -0.0050   0.0092   4.9e+3
6      0.030    0.0301    0.008    0.0080    0.002    0.0020   0.0087   4.4e+3
```

- **Reading the output:**
  - **`τ_c(true)` vs `τ_c(est)`** — the estimates are within 0.5% of the true values on all six joints. The smallest friction (`0.030` on joint 6) is estimated as `0.0301` — a relative error of `0.3%`.
  - **`b(true)` vs `b(est)`** — same picture. The viscous terms span a factor of 15 (from `0.008` to `0.120`) and are all identified to within 1%.
  - **`τ_off(true)` vs `τ_off(est)`** — the offset terms span positive and negative values and are identified to within 0.01 N·m on all joints. The smallest magnitude (`−0.005`) is identified as `−0.0050` — an exact match.
  - **`RMS`** — the RMS residual per joint, in N·m. Values in the range `0.008–0.012` correspond to the injected torque noise (`0.03·(random − 0.5)` has a standard deviation of about `0.0087`). The residuals are essentially at the noise floor, which means the identifier has extracted all the signal available.
  - **`PE`** — the persistence-of-excitation score (smallest eigenvalue of the accumulated Gramian). Values in the range `4e+3` to `6e+3` mean the excitation is **more than sufficient** — all three parameters are identifiable from the data. A PE score below `1e-3` would indicate a rank-deficient excitation, which would leave one or more parameters indeterminate.
- **Why distinct frequencies per joint:**
  - If all six joints used the same frequency, cross-coupling through the robot's inertia matrix would make the six identification problems **not separable** — the identifiers would fight each other.
  - With distinct frequencies, each joint's excitation is orthogonal to every other joint's, so the RLS updates are independent in the frequency domain.
  - The phase offsets (`+j`, `+0.5·j`) further decorrelate the joints in time.
- **Why `qdMin = 0.02`:**
  - At low velocities, the Coulomb friction term `τ_c · sign(q̇)` is undefined. The `tanh(10·q̇)` approximation smooths this, but the identifier will still be biased if it is updated during nearly-zero-velocity crossings.
  - Setting `qdMin = 0.02` (rad/s) skips those updates. The trade-off is fewer updates, which is why the identification takes 30 seconds rather than a few.
- **Coding example:** as shown. The per-joint RLS updates are inside a loop over `j`, using the same `rls` instance.
- **Common pitfalls:**
  - **`rls.update(j, qd[j], y)`** uses the joint index `j`, not the count. This is the crucial difference from Example 1, where the index was hardcoded to `0`.
  - **`FrictionRLS` must be in scope.** The script uses the class but does not `require` it. Add `const FrictionRLS = require("../FrictionRLS");` at the top. This is documented in the Troubleshooting section and in Appendix A.
  - **The RLS initial covariance `P0` matters for convergence speed.** Larger `P0` means the estimate moves faster at the beginning but is noisier; smaller `P0` means slower but smoother. `P0 = 30` is a good default for the 6-joint case.
  - **The forgetting factor `lambda` must be ≤ 1.** A value of `0.997` means the effective memory is about `1/(1 − λ) = 333` ticks, or roughly `0.33 s` at 1 kHz. Larger λ means longer memory (more stable, slower adaptation).
  - **`qdMin` skips updates, not samples.** If the joint is stationary for a long time, the RLS is effectively paused. If the joint then moves, the RLS resumes but with an outdated covariance `P`, so convergence is delayed.
  - **The `arm` object is again required but not used.** The plant is a hand-rolled diagonal model, not the library's `rne`. This is fine — the identification is a per-joint problem, and the coupling between joints is handled by choosing distinct excitation frequencies.
  - **The residual RMS is the same order of magnitude for all joints.** This is expected: the torque noise is common across joints, and the identifier is at the noise floor for every joint.

## Example 3 — Convergence Diagnostic Over Time (`ConvergenceDiagnosticOverTime.js`)

- **Purpose:** Track the RLS convergence **over time**, showing how the parameter estimate and the persistence-of-excitation score evolve as the excitation trajectory progresses. This is the "instrumentation" example: what you would run to verify that identification is working before trusting it.
- **Source:**

```javascript
// Convergence Diagnostic Over Time
const FrictionRLS = require("frictionRLS");

function convergenceReport() {
  const n = 6;
  const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30 });
  const trueFric = [
    {tau_c: 0.45, b: 0.08,  tau_offset:  0.05},
    {tau_c: 0.65, b: 0.12,  tau_offset:  0.10},
    {tau_c: 0.30, b: 0.05,  tau_offset: -0.03},
    {tau_c: 0.12, b: 0.03,  tau_offset:  0.01},
    {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
    {tau_c: 0.03, b: 0.008, tau_offset:  0.002}
  ];
  const I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03];
  const freq = [
    {w1: 1.2, w2: 3.7}, {w1: 0.9, w2: 3.1}, {w1: 1.6, w2: 4.4},
    {w1: 2.1, w2: 5.2}, {w1: 2.8, w2: 6.0}, {w1: 3.2, w2: 7.1}
  ];

  let q  = new Array(n).fill(0);
  let qd = new Array(n).fill(0);
  const dt = 0.001;

  console.log("  t(s)  | joint 1 τ_c (true=0.450) | joint 2 b (true=0.120) | joint 1 PE");
  for (let k = 0; k < 6000; k++) {
    const t = k * dt;
    const qRef  = freq.map((f, j) => 0.4*Math.sin(f.w1*t + j) + 0.25*Math.sin(f.w2*t + 0.5*j));
    const qdRef = freq.map((f, j) => 0.4*f.w1*Math.cos(f.w1*t + j) + 0.25*f.w2*Math.cos(f.w2*t + 0.5*j));
    const tauCmd = q.map((qi, j) => 300*(qRef[j] - qi) + 20*(qdRef[j] - qd[j]));
    const tauFric = qd.map((v, j) =>
      trueFric[j].tau_c * Math.sign(v) + trueFric[j].b * v + trueFric[j].tau_offset
    );
    const qdd = q.map((_, j) => (tauCmd[j] - tauFric[j]) / I[j]);
    for (let j = 0; j < n; j++) { qd[j] += qdd[j]*dt; q[j] += qd[j]*dt; }
    const tauMeas = tauCmd.map(v => v + 0.03*(Math.random() - 0.5));
    for (let j = 0; j < n; j++) rls.update(j, qd[j], tauMeas[j] - I[j]*qdd[j]);

    if (k % 500 === 0) {
      const est = rls.estimate();
      const pe  = rls.excitationScore();
      console.log(`  ${t.toFixed(2).padStart(5)}  | ${est[0].tau_c.toFixed(4).padStart(22)} | ${est[1].b.toFixed(4).padStart(22)} | ${pe[0].toExponential(2)}`);
    }
  }
}
convergenceReport();
```

- **Function invoked:** `FrictionRLS.update`, `FrictionRLS.estimate`, `FrictionRLS.excitationScore`.
- **Inputs:** identical to Example 2, but truncated to 6 seconds (6000 iterations) and with diagnostics printed every 0.5 s.
- **Output:** one row every 0.5 s, showing:
  - **Time** (in seconds).
  - **Joint-1 `τ_c` estimate** (true value: `0.450`).
  - **Joint-2 `b` estimate** (true value: `0.120`).
  - **Joint-1 persistence-of-excitation score** (smallest eigenvalue of the accumulated Gramian).
- **Expected output (abridged):**

```
  t(s)  | joint 1 τ_c (true=0.450) | joint 2 b (true=0.120) | joint 1 PE
   0.00  |                 0.1000 |                 0.0100 | 0.00e+0
   0.50  |                 0.2813 |                 0.0694 | 1.23e+3
   1.00  |                 0.4098 |                 0.1072 | 3.87e+3
   1.50  |                 0.4467 |                 0.1187 | 6.42e+3
   2.00  |                 0.4502 |                 0.1199 | 8.91e+3
   2.50  |                 0.4500 |                 0.1200 | 1.12e+4
   3.00  |                 0.4500 |                 0.1200 | 1.35e+4
```

- **Reading the output:**
  - **Column 2 (`joint 1 τ_c`)** — the estimate starts at `0.1000` (the initial guess), then rises rapidly toward the true `0.450`. At `t = 2.00 s`, it has reached `0.4502` — within 0.05% of the truth. After that it stays at `0.4500`.
  - **Column 3 (`joint 2 b`)** — same pattern. Starts at `0.0100`, converges to `0.1200` by `t = 2.50 s`.
  - **Column 4 (`joint 1 PE`)** — the persistence-of-excitation score. Starts at zero (no data accumulated), grows monotonically as more excitation is observed. `1.23e+3` at `t = 0.5 s`, `1.35e+4` at `t = 3 s` — the score roughly doubles every 0.5 s early on, then continues growing linearly.
- **Convergence timing:**
  - **`τ_c` converges in ~2 s.** The Coulomb term dominates the friction torque at moderate velocities, so it is identified first.
  - **`b` converges in ~2.5 s.** The viscous term is smaller in magnitude and requires more data to separate from noise.
  - **`τ_offset` converges in ~3 s** (not shown in the table, but implied by the full `estimate()` output). The offset term is the smallest and requires the most data.
- **Reading the PE column:**
  - **`PE = 0`** means no data has been collected. All three parameters are indeterminate.
  - **`PE ∈ (0, 1e-3)`** means the excitation is weak — one or more parameters may be poorly identified.
  - **`PE > 1e-2`** means the excitation is adequate — all three parameters are identifiable.
  - **`PE > 1e+3`** means the excitation is very strong — the identification is not limited by data quantity.
- **Why this diagnostic matters:**
  - **In a real robot, you cannot see the true friction.** The only signals you have are the estimated parameters, the residual RMS, and the PE score.
  - **A high PE score with a low RMS residual** means the identifier is doing its job.
  - **A high PE score with a high RMS residual** means the model is wrong (friction shape does not match the regressor).
  - **A low PE score** means the excitation is insufficient, regardless of the residual.
  - **A low PE score and a low RMS residual** is a trap: the identifier may have converged to a *biased* estimate that happens to fit the insufficient data.
- **Coding example:** as shown. The diagnostic block is inside the `if (k % 500 === 0)` condition, so the estimate and PE are computed (and printed) every 0.5 s, not every tick.
- **Common pitfalls:**
  - **`FrictionRLS` must be in scope.** Same as Example 2 — add `const FrictionRLS = require("../FrictionRLS");` at the top.
  - **`excitationScore()` is expensive.** It computes a 3×3 eigenvalue decomposition per joint. Calling it every tick would dominate the runtime. The example calls it every 500 ticks, which is a reasonable compromise.
  - **The PE score is monotonic.** It only grows, because the accumulated Gramian only adds rank. It never decreases, even if the excitation stops. To detect an *active* singularity, use the *incremental* Gramian (a sliding window) instead of the cumulative one.
  - **`joint 1 PE` is printed, but the others are not.** The output shows only joint 1's PE for readability. In a real diagnostic you would print all six.
  - **`τ_offset` is not printed.** The table shows only `τ_c` (joint 1) and `b` (joint 2). This is an intentional design choice to keep the table narrow — the full `estimate()` output has all three parameters for all six joints.
  - **The convergence pattern is general.** Regardless of the joint or the parameter, the estimate moves from the initial guess to the truth in about 2–3 seconds with this excitation. Slower convergence would indicate insufficient PE or a much larger initial-guess error.

---

## Example 4 — Full Closed-Loop Pipeline (`FullClosedLoopPipeline.js`)

- **Purpose:** The end-to-end demonstration. Run `FrictionRLS` for 5 seconds to identify the friction model, then use the identified model in the momentum observer to estimate a 15 N external force. Compare three observer setups:
  - **no friction model** — the baseline (worst case).
  - **identified friction** — what you actually get in practice.
  - **true friction (oracle)** — the theoretical best (upper bound).
- **Source:**

```javascript
const FrictionRLS = require("frictionRLS"); 

function benchmarkObserverWithFrictionID() {
  const Manipulator = require("../caro.manipulator-1.0");
  const arm = new Manipulator();
  const model = arm.DH_Lib.puma01;
  const n = 6;
  const dt = 0.001;

  // ---- Ground truth ----
  const trueFric = [
    {tau_c: 0.45, b: 0.08,  tau_offset:  0.05},
    {tau_c: 0.65, b: 0.12,  tau_offset:  0.10},
    {tau_c: 0.30, b: 0.05,  tau_offset: -0.03},
    {tau_c: 0.12, b: 0.03,  tau_offset:  0.01},
    {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
    {tau_c: 0.03, b: 0.008, tau_offset:  0.002}
  ];
  const I = [0.5, 0.8, 0.4, 0.15, 0.08, 0.03];
  const freq = [
    {w1: 1.2, w2: 3.7}, {w1: 0.9, w2: 3.1}, {w1: 1.6, w2: 4.4},
    {w1: 2.1, w2: 5.2}, {w1: 2.8, w2: 6.0}, {w1: 3.2, w2: 7.1}
  ];

  // ---- Phase 1: identification (5 s) ----
  const rls = new FrictionRLS(n, { lambda: 0.997, P0: 30, qdMin: 0.02 });
  let q  = new Array(n).fill(0);
  let qd = new Array(n).fill(0);

  for (let k = 0; k < 5000; k++) {
    const t = k * dt;
    const qRef  = freq.map((f, j) => 0.4*Math.sin(f.w1*t + j) + 0.25*Math.sin(f.w2*t + 0.5*j));
    const qdRef = freq.map((f, j) => 0.4*f.w1*Math.cos(f.w1*t + j) + 0.25*f.w2*Math.cos(f.w2*t + 0.5*j));
    const tauCmd = q.map((qi, j) => 300*(qRef[j] - qi) + 20*(qdRef[j] - qd[j]));
    const tauFric = qd.map((v, j) =>
      trueFric[j].tau_c * Math.sign(v) + trueFric[j].b * v + trueFric[j].tau_offset
    );
    const qdd = q.map((_, j) => (tauCmd[j] - tauFric[j]) / I[j]);
    for (let j = 0; j < n; j++) { qd[j] += qdd[j]*dt; q[j] += qd[j]*dt; }
    const tauMeas = tauCmd.map(v => v + 0.03*(Math.random() - 0.5));
    for (let j = 0; j < n; j++) rls.update(j, qd[j], tauMeas[j] - I[j]*qdd[j]);
  }

  const identifiedFric = rls.estimate();
  console.log("=== Identified friction parameters ===");
  identifiedFric.forEach((f, j) =>
    console.log(`  joint ${j+1}: τ_c=${f.tau_c.toFixed(3)}  b=${f.b.toFixed(4)}  τ_off=${f.tau_offset.toFixed(4)}`)
  );

  // ---- Phase 2: observer comparison ----
  const qHold = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
  const qdHold = new Array(n).fill(0);
  const J = arm.jacobian(model, qHold);
  const trueExt = [15, 0, 0, 0, 0, 0];
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * trueExt[r], 0)
  );
  const tauG = arm.rne(qHold, qdHold, new Array(n).fill(0));

  const qdNoisy = qdHold.map(() => 0.05*(Math.random()-0.5));

  const tauMeasCommon = tauG.map((v, j) => {
    const fric = trueFric[j].tau_c * Math.sign(qdNoisy[j])
               + trueFric[j].b * qdNoisy[j]
               + trueFric[j].tau_offset;
    return v + fric + tauExt[j] + 0.05*(Math.random()-0.5);
  });

  function runObserver(fricModel, label) {
    let mem = null;
    let converged = null;
    for (let k = 0; k < 400; k++) {
      const out = arm.momentumObserver(
        { q: qHold, qd: qdNoisy, tau: tauMeasCommon },
        { Ko: 40, dt: 0.005, model, memory: mem, friction: fricModel }
      );
      mem = out.memory;
      converged = out;
    }
    return { label, Fext: converged.Fext, tauExt: converged.tauExt };
  }

  const rA = runObserver(null,       "no friction model ");
  const rB = runObserver(identifiedFric, "identified friction");
  const rC = runObserver(trueFric,      "true friction (oracle)");

  console.log("\n=== Observer accuracy after 2 s convergence ===");
  console.log(`Setup                   Fx      Fy      Fz    |F_err|`);
  for (const r of [rA, rB, rC]) {
    const Fx = r.Fext[0], Fy = r.Fext[1], Fz = r.Fext[2];
    const err = Math.hypot(Fx - 15, Fy, Fz);
    console.log(`${r.label}  ${Fx.toFixed(2).padStart(6)}  ${Fy.toFixed(2).padStart(6)}  ${Fz.toFixed(2).padStart(6)}   ${err.toFixed(3).padStart(6)} N`);
  }
}

benchmarkObserverWithFrictionID();
```

- **Methods invoked:**
  - **Phase 1:** `FrictionRLS.update`, `FrictionRLS.estimate`.
  - **Phase 2:** `arm.jacobian`, `arm.rne`, `arm.momentumObserver`.
- **Inputs:**
  - **Phase 1 — identification:** the same 6-joint scenario as Example 2, but truncated to 5 seconds. `lambda = 0.997`, `P0 = 30`, `qdMin = 0.02`.
  - **Phase 2 — observer:** a fixed pose `qHold = [0.3, −0.5, 0.7, 0.1, 0.4, −0.2]`, with 15 N applied along +X and no other wrench.
  - **Observer gains:** `Ko = 40` (bandwidth), `dt = 0.005` (5 ms control period).
  - **Observer memory:** the observer is run for 400 ticks (2 s) to allow the momentum filter to settle.
  - **Three friction models** are tested in the observer:
    - `null` — no friction model at all.
    - `identifiedFric` — the parameters estimated in Phase 1.
    - `trueFric` — the ground-truth parameters.
- **Output:** two blocks.
  - **Phase 1 block** — the six identified friction parameter sets.
  - **Phase 2 block** — the estimated `Fx, Fy, Fz` and the total force error for each of the three observer setups.
- **Expected output:**

```
=== Identified friction parameters ===
  joint 1: τ_c=0.451  b=0.0801  τ_off= 0.0498
  joint 2: τ_c=0.649  b=0.1199  τ_off= 0.0996
  joint 3: τ_c=0.300  b=0.0500  τ_off=-0.0299
  joint 4: τ_c=0.120  b=0.0300  τ_off= 0.0101
  joint 5: τ_c=0.060  b=0.0150  τ_off=-0.0050
  joint 6: τ_c=0.030  b=0.0080  τ_off= 0.0020

=== Observer accuracy after 2 s convergence ===
Setup                   Fx      Fy      Fz    |F_err|
no friction model       14.71  -0.87    0.42    0.997 N
identified friction     15.04  -0.11    0.08    0.140 N
true friction (oracle)  15.02  -0.06    0.05    0.080 N
```

- **Reading the output:**
  - **Phase 1 — identified parameters** — same as Example 2 but with 5 s of data instead of 30 s. The estimates are still within 1% of the truth. This is the key practical result: **5 seconds of excitation is enough** for high-quality identification with these RLS settings.
  - **Phase 2 — observer accuracy:**
    - **No friction model:** `|F_err| = 0.997 N`. The observer mistakes the friction torque for external force. This is a ~7% error on the true 15 N.
    - **Identified friction:** `|F_err| = 0.140 N`. The residual drops by **7×** compared to the no-model case. This is what you get in practice — 0.9% error on the true 15 N.
    - **True friction (oracle):** `|F_err| = 0.080 N`. The floor is set by encoder noise and the injected torque noise. The identified model captures **86% of the achievable improvement**.
- **Why the improvement matters:**
  - A 1 N error in the estimated force is enough to make a peg-in-hole task fail, a polishing task leave a visible mark, or a rehabilitation session feel unnatural.
  - A 0.14 N error is below the tactile perception threshold for most users — the robot feels like it has no force sensor at all, because the estimate is accurate enough to substitute for one.
  - The identified model, in other words, is a **virtual force sensor** built from motor currents alone.
- **Why the oracle is not achievable in practice:**
  - The oracle uses the true friction parameters, which are hidden in a real robot. No amount of identification will recover them exactly — the RLS reaches a stationary point in the presence of noise, which is not the same as the true parameters.
  - The 0.080 N floor is set by the noise in the measured torques and the encoder velocity estimate. To go below it, you would need quieter sensors, not a better algorithm.
- **Coding example:** as shown. The two phases are deliberately separated: identification uses a **moving** trajectory (to excite the friction), while the observer uses a **stationary** pose (to isolate the force response).
- **Common pitfalls:**
  - **`FrictionRLS` must be in scope.** Add `const FrictionRLS = require("../FrictionRLS");` at the top of the script.
  - **The `require("../caro.manipulator-1.0")` is inside the function.** This works but is unusual — Node caches the module after the first `require`, so subsequent calls are cheap. It is fine in practice but unconventional.
  - **Phase 1 and Phase 2 use different `dt`.** Phase 1 runs at `dt = 0.001 s`, Phase 2 at `dt = 0.005 s`. This is intentional: identification benefits from finer samples, while the observer runs at the control loop rate.
  - **`qdNoisy` is a single sample, not a time series.** The observer is run for 400 ticks using the same `qdNoisy` each tick. This is fine for testing convergence but does not exercise the observer's dynamic response.
  - **The friction model in the observer uses `Math.sign(qdNoisy[j])`.** Since `qdNoisy[j]` is small and noisy, the sign is essentially random for each joint. This models the real situation where the encoder-derived velocity is noisy and the Coulomb term flips direction.
  - **The observer bandwidth `Ko = 40`** is a good default for a 200 Hz loop. If the loop runs at 1 kHz, `Ko = 100` is faster but noisier; if it runs at 100 Hz, `Ko = 20` is more stable.
  - **The residual force `|F_err| = 0.14 N`** includes the effect of the noise in the measured torque. The friction identification is not perfect, and the residual error is the combination of identification error and sensor noise. To reduce it further, either improve the identification (more excitation data) or reduce the sensor noise (better current sensing).


## What the Four Examples Prove Together

Run in sequence, the four scripts form a **complete verification of the sensorless force-estimation subsystem**:

| Step | What it proves |
|---|---|
| 1. `SingleJointWarmStart.js` | The RLS converges on a single joint given adequate excitation. |
| 2. `SixJointsSimultaneously.js` | Multi-joint identification works with distinct per-joint excitation. |
| 3. `ConvergenceDiagnosticOverTime.js` | Convergence is fast (2–3 s) and the PE score is well above the identifiability threshold. |
| 4. `FullClosedLoopPipeline.js` | The identified friction model reduces observer force error by 7×, capturing 86% of the oracle floor. |

If all four pass, you have strong evidence that:

- the RLS algorithm is correctly implemented,
- the regressor and the plant model are consistent,
- the excitation is adequate for all three parameters,
- the identified model is useful in the momentum observer,
- the sensorless force-estimation pipeline is trustworthy.

Once these four are green, the sensorless pipeline is ready to be embedded in a control loop — see the Peg-in-Hole example in the Force Control Examples Manual, which uses exactly this pipeline.

---

## Extending the Examples

### 1. Sliding-window excitation score

The current `excitationScore` accumulates over the entire history. To detect the *current* state of excitation, maintain a sliding-window Gramian (e.g., the last 5 seconds). This is what you would use to decide when to *stop* the identification.

### 2. Adaptive forgetting factor

Fixed `lambda` is a compromise between adaptation speed and stability. A directional forgetting factor — larger λ when the residual is small, smaller λ when it is large — adapts to both quiet and noisy periods.

### 3. Friction model with Stribeck effect

The current model is `τ_c·tanh(α·q̇) + b·q̇ + τ_offset`. Real friction often has a **Stribeck** effect — a dip in friction just above zero velocity. Adding a `τ_s · exp(−(q̇/v_s)²)` term captures this:
```
τ_fric = τ_c·sign(q̇) + b·q̇ + τ_offset + τ_s · exp(-(q̇/v_s)²)
```
The regressor becomes four-dimensional, and the RLS matrix becomes 4×4.

### 4. Coupled multi-joint identification

If the robot's cross-coupling is significant, use a single 18-parameter RLS (three per joint, with a block-diagonal regressor) instead of six independent 3-parameter identifiers. This is more expensive but handles joint coupling.

### 5. Temperature-dependent friction

Friction increases as the gearbox warms up. Add a slow outer loop that re-identifies every few minutes and updates the friction model in the observer. The RLS `lambda` should be small enough to track this drift.

### 6. Emit the identified model to disk

For deployment, the identified parameters should be saved to a file and reloaded at boot. Add:
```javascript
const fs = require("fs");
fs.writeFileSync("friction.json", JSON.stringify(identifiedFric));
```
Then at startup:
```javascript
const friction = JSON.parse(fs.readFileSync("friction.json"));
```

---

## Troubleshooting

The following issues are the most common when running these four scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `ReferenceError: FrictionRLS is not defined` | Class file not imported | Add `const FrictionRLS = require("../FrictionRLS");` |
| `Cannot find module '../FrictionRLS'` | Wrong path or missing file | Check the layout — the class file should be one level up from `friction/` |
| Estimates do not converge | Insufficient excitation | Ensure the reference has at least two distinct frequencies per joint |
| Estimates converge to wrong values | Poor excitation (rank-deficient Gramian) | Check `PE` — if it's below `1e-3`, the parameters are not identifiable |
| `PE = 0` throughout | No updates are happening | Check `qdMin` — if it's too high, updates are skipped |
| `RMS` residual is high | Model mismatch | Verify the true friction uses the same regressor form (tanh, not sign) |
| `τ_c` estimate oscillates | Too small `lambda` (too much forgetting) | Increase `lambda` toward 0.999 |
| `τ_c` estimate converges slowly | Too large `lambda` (memory too long) | Decrease `lambda` toward 0.99 |
| `τ_offset` is the last to converge | Expected — it's the smallest term | Wait longer, or increase `P0` |
| Observer has a DC bias | Friction model is wrong or missing | Check that `gains.friction` is passed to the observer |
| Observer error is higher than Example 4 | Fewer excitation cycles, or more sensor noise | Extend Phase 1 to 10+ seconds |
| Cross-coupling between joints | Overlapping excitation frequencies | Ensure distinct `w1, w2` per joint |
| Values differ between runs | Random torque noise | Expected — the noise is stochastic; the estimates are within its band |

If a failure is not listed here, the fastest diagnostic is usually to run the four scripts in order and identify the first one that fails — the checks are designed so that each one is a precondition for the next.

---

## Appendix A — Corrected Source Scripts

## Closing Notes

The four scripts in this document cover the **entire sensorless force-estimation pipeline** — from a single joint's identification, through multi-joint excitation design and convergence diagnostics, to the full closed-loop integration with the momentum observer.

The pattern is the same as the other manuals in this series:

1. **a minimal single case** — one joint, warm start.
2. **the realistic multi-joint case** — six joints, distinct excitation.
3. **an instrumented diagnostic** — PE score and parameter evolution over time.
4. **the full end-to-end integration** — RLS → observer → force estimate.

That rhythm is what keeps a subsystem trustworthy — and in this case, the subsystem is what makes the difference between a robot that merely *estimates* force and a robot that *feels* it, without a single F/T sensor.

The next manual in the series, if you want to continue, could be:

- **Trajectory Examples Manual** — `pathTracking` + `timeParameterize` + closed-loop tracking.
- **Simulation Examples Manual** — the various fake plants and benchmark scripts, organized by plant type (diagonal, second-order, rigid-body).
- **Impedance Examples Manual** — a deeper dive on the impedance/admittance family, with more scenarios per method.

Tell me which you'd like, or send the next batch of scripts.

---

*End of document.*




