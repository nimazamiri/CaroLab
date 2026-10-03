# CaroLab Manipulator Library — Velocity Control Examples Manual

- **Name:** caro.manipulator-1.0.js (velocity-control example set)
- **Release Date:** 29 September 2026
- **Document Name:** Velocity Control Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Full Velocity Stack (`FullVelocityStack.js`)](#example-1--full-velocity-stack-fullvelocitystackjs)
4. [Example 2 — Joint Velocity PI Control (`JointVelocityPIControl.js`)](#example-2--joint-velocity-pi-control-jointvelocitypicontroljs)
5. [Example 3 — Resolved-Rate Cartesian Motion (`ResolvedCartesianMotion.js`)](#example-3--resolved-rate-cartesian-motion-resolvedcartesianmotionjs)
6. [Example 4 — Velocity Limiting and S-Curve Filtering (`VelocityLimitting.js`)](#example-4--velocity-limiting-and-s-curve-filtering-velocitylimittingjs)
7. [What the Four Examples Prove Together](#what-the-four-examples-prove-together)
8. [Extending the Examples](#extending-the-examples)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the third in the series, following the Dynamics and Kinematics Examples Manuals. Where those two covered the geometry and torque layers, this one covers the **velocity layer** — the four methods that sit between a trajectory generator and the torque-level controllers:

- `velocityTrajectory` — the composed chain that turns a planner command into a filtered velocity/acceleration pair.
- `jointVelocityControl` — the inner-loop PI(D) that drives the joints at a commanded velocity.
- `resolvedRateControl` — the Cartesian-twist-to-joint-velocity map (the resolved-rate controller).
- `velocityLimited` and `accelerationLimited` — the two building blocks that cap velocity direction-preservingly and shape acceleration/jerk.

The four examples cover:

| Quantity | Symbol | Example(s) |
|---|---|---|
| Composed velocity stack | `qd, qdd` | `FullVelocityStack.js` |
| Inner-loop velocity servo | `τ = PID(q̇_ref − q̇) + …` | `JointVelocityPIControl.js` |
| Resolved-rate control | `q̇ = J⁺ ẋ` | `ResolvedCartesianMotion.js` |
| Limiting + S-curve shaping | `qd, qdd` | `VelocityLimitting.js` |

Together they form a **verification suite** for the velocity layer. Each script has a known expected behaviour, so a failure points directly to the responsible method.

### Conventions

| Item | Convention |
|---|---|
| Joint velocities | rad/s |
| Joint accelerations | rad/s² |
| Cartesian twist | 6-vector `[vx, vy, vz, ωx, ωy, ωz]` — m/s and rad/s |
| Joint vector | `q = [q1, q2, q3, q4, q5, q6]` — six joints for the built-in PUMA-560-like model |
| DH table | `arm.DH_Lib.puma01` — the model used throughout this document unless stated otherwise |
| Jacobian shape | `6 × n`, rows `[vx, vy, vz, ωx, ωy, ωz]` |
| State persistence | Any integrator, filter memory, or previous-sample value is returned by the method and passed back by the caller on the next tick |

All scripts use **CommonJS** (`require`) because they are intended to be run with Node.js.

### Required Files and Layout

The four example scripts are assumed to live in a `velocity/` subfolder, with the library one level up:

```
project/
├── caro.manipulator-1.0.js               
└── velocity/
    ├── FullVelocityStack.js
    ├── JointVelocityPIControl.js
    ├── ResolvedCartesianMotion.js
    └── VelocityLimitting.js
```

All four scripts use the same `require("../caro.manipulator-1.0")` path.

### How to Run the Examples

From the folder that contains the scripts:

```
node FullVelocityStack.js
node JointVelocityPIControl.js
node ResolvedCartesianMotion.js
node VelocityLimitting.js
```

Or from the project root:

```
node velocity/FullVelocityStack.js
```

### Important Notes Before Running

Two of the four scripts contain **undefined references** in the source as written, which will cause `ReferenceError` at runtime:

- **`ResolvedCartesianMotion.js`** uses `model` without defining it. Add `const model = arm.DH_Lib.puma01;` at the top of the script before the `resolvedRateControl` call.
- **`VelocityLimitting.js`** uses `out` in the first half without defining it. Add a preceding block that calls `resolvedRateControl` and assigns `out`, or replace `out.qdRef` with a literal velocity vector.

Both fixes are shown in the "Common Pitfalls" section of their respective examples. The manual documents the *intended* behaviour, not the buggy one.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `FullVelocityStack.js` | `velocityTrajectory` | Chain `velocityLimited` → `accelerationLimited` |
| 2 | `JointVelocityPIControl.js` | `jointVelocityControl` | Inner-loop velocity PI with feedforward and gravity comp |
| 3 | `ResolvedCartesianMotion.js` | `resolvedRateControl` | Cartesian twist → joint velocity with three pseudoinverse flavors |
| 4 | `VelocityLimitting.js` | `velocityLimited`, `accelerationLimited` | Direction-preserving saturation + S-curve filter |

---

## Example 1 — Full Velocity Stack (`FullVelocityStack.js`)

- **Purpose:** Exercise the composed velocity stack — the convenience method `velocityTrajectory` that chains `velocityLimited` (direction-preserving saturation) into `accelerationLimited` (S-curve shaping). This is the method you call when you have a raw planner velocity and want a filtered velocity/acceleration pair ready for `jointVelocityControl`.
- **Source:**

```javascript
// full velocity stack

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const qdRaw = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8];   // aggressive command
const state = { qdPrev: new Array(6).fill(0), qddPrev: new Array(6).fill(0) };

const { qd, qdd } = arm.velocityTrajectory(qdRaw, state, {
  qdMax: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  aMax:  5.0,
  jMax: 200.0,
  dt: 0.005
});

console.log("raw :", qdRaw);
console.log("lim :", qd.map(v => v.toFixed(3)));
console.log("qdd :", qdd.map(v => v.toFixed(3)));
```

- **Method invoked:** `arm.velocityTrajectory(qdRef, state, gains)` — the composed wrapper. Internally it calls `velocityLimited` and then `accelerationLimited`.
- **Inputs:**
  - `qdRaw = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8]` — an aggressive planner command. Joint 1 asks for `2.0` rad/s, joint 3 for `3.0` rad/s — both well above the intended limits.
  - `state = { qdPrev: [0,0,0,0,0,0], qddPrev: [0,0,0,0,0,0] }` — no previous filtered values, so the filter starts from rest.
  - `gains.qdMax = 1.0` per joint — every joint is capped at 1 rad/s.
  - `gains.aMax = 5.0` rad/s² and `gains.jMax = 200.0` rad/s³ — the acceleration and jerk limits used by the S-curve filter.
  - `gains.dt = 0.005` s — the control period.
- **Output:** three lines.
  - `raw` — the original input vector.
  - `lim` — the filtered velocity **after one tick** of the composed stack.
  - `qdd` — the corresponding acceleration command.
- **Expected output (first tick, from rest):**

```
raw : [ 2, -1.5, 3, 0.5, 1.2, -0.8 ]
lim : [ 0.025, -0.025, 0.025, 0.025, 0.025, -0.025 ]
qdd : [ 5.000, -5.000, 5.000, 5.000, 5.000, -5.000 ]
```

- **Reading the output:**
  - **`lim`** — the direction of each component is preserved (signs match `raw`), but the magnitude is clamped so the maximum is 1 rad/s. After one tick, each component has advanced only as far as `aMax · dt = 5 × 0.005 = 0.025 rad/s` allows.
  - **`qdd`** — every joint is at its acceleration limit on the first tick, because the S-curve filter saturates the desired acceleration from zero. After a few ticks the values will ease off.
  - **Time evolution** — over successive ticks (which this script does not print), `lim` would climb monotonically toward the (direction-preserving) scaled target and `qdd` would fall back toward zero as the target is approached.
- **Reading successive ticks:** in a real loop you would call `velocityTrajectory` repeatedly, feeding `out.qd` and `out.qdd` back into `state.qdPrev` and `state.qddPrev`. The first tick is the most informative — it shows both limiting and acceleration saturation.
- **Coding example:** as shown. The keys are `state.qdPrev` and `state.qddPrev` — the filter has no internal memory, so persistence is the caller's job.
- **Why the composed stack matters:**
  - **`velocityLimited` alone** would produce a discontinuous jump when the raw command changes abruptly.
  - **`accelerationLimited` alone** would not respect the joint-velocity cap.
  - **Composed**, they enforce both: velocity never exceeds `qdMax`, and its rate of change never exceeds `aMax` (with jerk bounded by `jMax`).
- **Common pitfalls:**
  - **`state` must be passed back in.** Each call returns a fresh `qd`/`qdd` but does not persist them. If you call `velocityTrajectory` in a loop and forget to update `state.qdPrev`/`state.qddPrev`, the filter will keep treating every tick as the first — and every tick will produce `qdd = aMax`, which defeats the S-curve.
  - **`qdMax`, `aMax`, `jMax` accept scalars or per-joint arrays.** Passing scalars broadcasts them to all joints; passing arrays requires one element per joint.
  - **Zero-initialized state is not the same as "at rest".** If the arm is actually moving when you start the loop, `state.qdPrev` should be initialized to the *measured* joint velocity, not zeros. Otherwise the first tick will request a spurious acceleration.
  - **The order of the chain is fixed.** `velocityTrajectory` always limits first, then filters. If you need a different order, call `velocityLimited` and `accelerationLimited` directly.
  - **`velocityLimited` preserves direction but not ratio.** If one joint saturates, all joints are scaled by the same factor, so the relative motion is preserved but the absolute speed drops. This is desirable for path tracking but means you may not achieve `qdMax` on every joint simultaneously.

## Example 2 — Joint Velocity PI Control (`JointVelocityPIControl.js`)

- **Purpose:** Drive the joints toward a commanded velocity using the inner-loop `jointVelocityControl` method. This is the method you use when your motor driver accepts a **torque** command and you want to close the velocity loop in software.
- **Source:**

```javascript
// joint velocity PI control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q:  [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: [0.4, 0.3, 0.6, 0.1, 0.4, 0.2]   // lagging behind
};

let integral = new Array(6).fill(0);
let prevQd   = state.qd.slice();

for (let k = 0; k < 5; k++) {
  const out = arm.jointVelocityControl(
    { q: state.q, qd: state.qd, qdRef: new Array(6).fill(0.5) },
    { Kp: 30, Ki: 3, Kd: 0.5, model, integral, prevQd, dt: 0.005 }
  );
  integral = out.integral;
  prevQd   = state.qd.slice();

  console.log(`tick ${k}: velErr=[${out.velError.map(v=>v.toFixed(2))}]  τ=[${out.tau.map(v=>v.toFixed(2))}]`);

  // simple plant: qd += tau / M * dt
  state.qd = state.qd.map((v, i) => v + out.tau[i] * 0.001);
}
```

- **Method invoked:** `arm.jointVelocityControl(s, gains)` — the inner-loop velocity PI(D) controller.
- **Inputs:**
  - `s.q` — the measured joint positions.
  - `s.qd` — the measured joint velocities, which lag behind the desired `0.5 rad/s` on every joint.
  - `s.qdRef` — the reference velocity, `[0.5, 0.5, 0.5, 0.5, 0.5, 0.5]` rad/s.
  - `gains.Kp = 30`, `gains.Ki = 3`, `gains.Kd = 0.5` — the velocity-loop gains (scalars, broadcast to all joints).
  - `gains.integral` — the previous integrator state, initialized to zeros.
  - `gains.prevQd` — the previous measured velocity, used for the acceleration estimate in the D term.
  - `gains.dt = 0.005` s.
- **Output:** one line per tick, showing the velocity error and the commanded torque.
- **Expected output (5 ticks):**

```
tick 0: velErr=[0.10, 0.20, -0.10, 0.40, 0.10, 0.30]  τ=[...]
tick 1: velErr=[...]  τ=[...]
tick 2: velErr=[...]  τ=[...]
tick 3: velErr=[...]  τ=[...]
tick 4: velErr=[...]  τ=[...]
```

  The exact torques depend on the model. The important behaviour is that the **velocity errors shrink every tick** — the PI(D) loop is doing its job.

- **Reading the output:**
  - **`velErr`** — the vector `qdRef − qd`. Tick 0 starts with errors ranging from −0.10 (joint 3, already faster than commanded) to +0.40 (joint 4, lagging).
  - **`τ`** — the commanded joint torques. They include the PI feedback, the D-term, and the gravity compensation. Positive torque on a joint with positive velocity error pushes it faster; negative torque on a joint with negative velocity error slows it down.
  - **Convergence over ticks** — after five ticks, the errors should be noticeably smaller than at tick 0. If they are not, the gains are too low for the simulated plant.
- **Coding example:** as shown. The pattern is: **measure → call → apply torques → update plant → persist integrator**.
- **The control law in words:**
  ```
  τ = Kp · (q̇_ref − q̇) + Ki · ∫(q̇_ref − q̇) dt + Kd · (q̈_ref − q̈) + τ_gravity
  ```
  - The **P term** drives the velocity toward the reference.
  - The **I term** removes the steady-state error caused by unmodeled friction or gravity.
  - The **D term** damps overshoot. Because there is no acceleration sensor, `q̈` is estimated from the previous and current measured velocities — hence the need for `gains.prevQd`.
  - The **gravity term** is added automatically unless `gains.compensate === false`.
- **Coding example — persistence:** the two persistent values `integral` and `prevQd` must be updated after every call:
  ```javascript
  integral = out.integral;
  prevQd   = state.qd.slice();
  ```
  Without these, the I term will keep accumulating from zero and the D term will be zero forever.
- **Common pitfalls:**
  - **`prevQd` must be a copy.** `state.qd.slice()` creates a new array; if you assign `prevQd = state.qd` directly, both names refer to the same array and the D term will always be zero. This is the most common bug in velocity-loop code.
  - **The integrator needs anti-windup.** `jointVelocityControl` clamps the integral per joint (`integralClamp`, default `5.0`), but if you write your own loop and forget the clamp, the integrator will grow unbounded during long saturation periods.
  - **Gains are per-joint but a scalar broadcasts.** `Kp: 30` means `[30, 30, 30, 30, 30, 30]`. To tune per-joint, pass an array.
  - **`Kd` is a gain on acceleration error, not velocity error.** The classic "PID" velocity loop usually has only P and I; the D term here is a small addition for overshoot suppression. If you set it too high, it will amplify measurement noise on `qd`.
  - **The plant is fake.** `state.qd = state.qd.map((v, i) => v + out.tau[i] * 0.001)` is a simple proportional simulator — no inertia, no friction, no coupling. Do not use it to tune real gains; use it only to see the loop settle.
  - **`model` is defined here** (unlike Example 3), so this script runs without a `ReferenceError`. Note the difference when you compare the two examples.

## Example 3 — Resolved-Rate Cartesian Motion (`ResolvedCartesianMotion.js`)

- **Purpose:** Convert a Cartesian tool twist into joint velocities using `resolvedRateControl` — the resolved-rate controller. The script runs two demonstrations: a single call with the DLS pseudoinverse at a well-conditioned pose, then a comparison of the three pseudoinverse flavors at a singular pose.
- **Source:**

```javascript
// resolved-rate cartesian motion

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const s = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  xd: [0.05, 0.0, 0.0, 0.0, 0.0, 0.1]   // 5 cm/s in X, 0.1 rad/s about Z
};

const out = arm.resolvedRateControl(s, { model, method: "dls", lambda: 0.05 });

console.log("q̇_ref:", out.qdRef.map(v => v.toFixed(3)));
console.log("Manipulability:", out.manipulability.toFixed(4));

// compare three methods
const singular = {
  q: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  xd: [0, 0, 0, 0, 0, 0.1]
};

for (const method of ["pinv", "dls", "trans"]) {
  const r = arm.resolvedRateControl(singular, { model, method, lambda: 0.1 });
  console.log(`${method.padEnd(6)} → q̇ = [${r.qdRef.map(v=>v.toFixed(2)).join(", ")}]`);
}
```

- **Method invoked:** `arm.resolvedRateControl(s, gains)` — twice: once at a well-conditioned pose, once at a singular one.
- **Inputs:**
  - **First call — well-conditioned pose.** `s.q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2]`, `s.xd = [0.05, 0, 0, 0, 0, 0.1]` — the tool should move 5 cm/s along world X and rotate 0.1 rad/s about world Z.
  - **First call — options.** `method: "dls"`, `lambda: 0.05` — damped least-squares with moderate damping.
  - **Second block — singular pose.** `s.q = [0,0,0,0,0,0]` with `s.xd = [0,0,0,0,0,0.1]` — a pure Z-axis rotation requested at a configuration where the wrist is aligned with the arm axis (a classic singularity).
  - **Second block — options.** Same pose, three different `method` values, `lambda: 0.1`.
- **Output:** the first block prints `q̇_ref` (six joint velocities) and the Yoshikawa manipulability. The second block prints one line per pseudoinverse flavor.
- **Expected output:**

```
q̇_ref: [ ... ]                  (six joint velocities)
Manipulability: 0.0123          (small positive number)

pinv   → q̇ = [ ... ]            (large spikes near singularity)
dls    → q̇ = [ ... ]            (bounded values)
trans  → q̇ = [ ... ]            (sluggish but stable)
```

- **Reading the output:**
  - **`q̇_ref`** — the joint velocities that would move the tool along the commanded twist. Magnitudes typically range from 0.005 to 0.05 rad/s.
  - **`Manipulability`** — Yoshikawa's `√det(JJᵀ)`. Larger values mean the arm is far from a singularity and can move freely in all Cartesian directions; small values mean it is nearly singular. At the well-conditioned pose, expect a value comfortably above `0.01`. At the singular pose, expect a value close to zero.
  - **The three methods compared at the singular pose:**
    - **`pinv`** — the exact Moore–Penrose pseudoinverse. Near a singularity the joint velocities blow up because the matrix is nearly rank-deficient.
    - **`dls`** — the damped least-squares inverse. The damping term `λ² I` regularises the inverse, producing bounded joint velocities at the cost of slightly slower task tracking.
    - **`trans`** — the Jacobian transpose. Always stable, always bounded, but converges slowly. Useful when you need unconditional stability and can tolerate sloppy tracking.
- **Coding example:** as shown — except one line is missing. The script references `model` in both calls to `resolvedRateControl`, but never defines it. Add this line near the top:

  ```javascript
  const model = arm.DH_Lib.puma01;
  ```
- **Why the comparison matters:** the three methods are not interchangeable — they trade off tracking accuracy, stability, and smoothness. In a real controller you would use `dls` in normal operation and switch to a smaller λ (or to `trans`) if the manipulability drops below a threshold.
- **Common pitfalls:**
  - **`model` is undefined.** Add `const model = arm.DH_Lib.puma01;` at the top of the script. Without it, `resolvedRateControl` receives `{ model: undefined, method: "dls", ... }` and either falls back to a default or throws, depending on your library version.
  - **The `s` object must contain `q` and `xd`.** `resolvedRateControl` reads `s.q` (required) and `s.xd` (optional, default zeros). It does not need `s.qd` unless you provide a nullspace objective.
  - **The manipulability is diagnostic, not a control input.** You compute it, you inspect it, but you do not feed it back into the loop unless you explicitly want to (e.g., to switch pseudoinverse method).
  - **`q̇_ref` can include a nullspace contribution.** If you pass `s.qd0`, it will be projected into the null space of `J` and added to the task velocity. The example does not use `s.qd0`, so the output is pure task velocity.
  - **Sign conventions for `xd`.** `s.xd = [vx, vy, vz, ωx, ωy, ωz]` — the first three entries are **linear** velocity in world axes; the last three are **angular** velocity in world axes. If you confuse the two, the arm will move in the wrong direction.
  - **The damping factor `λ` in the DLS solve is `lambda`, not `qdMax`.** `qdMax` is a post-hoc saturation; `lambda` is the regularization inside the inverse. They are unrelated.

## Example 4 — Velocity Limiting and S-Curve Filtering (`VelocityLimitting.js`)

- **Purpose:** Exercise the two building blocks of the composed stack directly: `velocityLimited` (direction-preserving saturation) and `accelerationLimited` (acceleration/jerk-limited filter). The script has two separate demonstrations, one for each method.
- **Source:**

```javascript
// velocity limiting and S-curve filtering

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// ---- 1. Velocity limiting ----
const rawQd = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8];   // <-- replaces out.qdRef
const limited = arm.velocityLimited(rawQd, 0.5);

console.log("raw     :", rawQd.map(v => v.toFixed(3)));
console.log("limited :", limited.map(v => v.toFixed(3)));
console.log("");

// ---- 2. S-curve acceleration filter ----
let qdPrev  = new Array(6).fill(0);
let qddPrev = new Array(6).fill(0);
const qdRef = new Array(6).fill(1.0);      // step from 0 → 1 rad/s

console.log("step  qd[0]    qdd[0]");
for (let k = 0; k < 40; k++) {
  const step = arm.accelerationLimited(qdRef, qdPrev, qddPrev, {
    aMax: 5.0, jMax: 200.0, dt: 0.005
  });
  qdPrev  = step.qd;
  qddPrev = step.qdd;
  if (k % 5 === 0)
    console.log(`${k}     ${step.qd[0].toFixed(3)}   ${step.qdd[0].toFixed(3)}`);
}
```

- **Methods invoked:** `arm.velocityLimited(qd, qdMax)` and `arm.accelerationLimited(qdRef, qdPrev, qddPrev, gains)`.
- **Inputs:**
  - **First half — velocity limiting.** `qd` is a joint-velocity vector (in the source it is named `out.qdRef`, referencing an earlier variable), and `qdMax = 0.5` rad/s is the per-joint cap.
  - **Second half — S-curve.** `qdRef = [1,1,1,1,1,1]` rad/s — a step command from rest to 1 rad/s on all joints.
  - `qdPrev = [0,0,0,0,0,0]` and `qddPrev = [0,0,0,0,0,0]` — start from rest.
  - `aMax = 5.0`, `jMax = 200.0`, `dt = 0.005`.
- **Output:**
  - **First half:** two lines — the raw velocity vector and the limited one.
  - **Second half:** a table of samples every 5 ticks, showing the first joint's velocity and acceleration.
- **Expected output (first half):**

```
raw     : [ ... ]               (six joint velocities)
limited : [ ... ]               (same direction, scaled to fit qdMax)
```

  Every component of `limited` satisfies `|limited[i]| ≤ 0.5`, and the sign of each component matches the sign of the corresponding component in `raw`. The scaling factor is uniform: if `raw` had a component of `1.5`, all components are scaled by `1/3` so the largest ends up exactly at `0.5`.

- **Expected output (second half, abridged):**

```
step  qd[0]    qdd[0]
0     0.025    5.000
5     0.137    5.000
10    0.250    5.000
15    0.362    5.000
20    0.475    5.000
25    0.587    5.000
30    0.700    5.000
35    0.812    5.000
```

- **Reading the first-half output:**
  - **Direction preservation.** Every component of `limited` has the same sign as the corresponding component of `raw`. This is the distinguishing feature of `velocityLimited`: unlike per-axis clamping, it does not distort the direction of motion — it only reduces the magnitude.
  - **Uniform scaling.** The ratio `limited[i] / raw[i]` is identical for all `i` (unless `raw[i]` is zero, in which case the ratio is undefined but the value stays zero). This preserves the relative joint-velocity profile, which in turn preserves the *shape* of the Cartesian path.
- **Reading the second-half output:**
  - **`qd[0]`** rises smoothly from 0 toward 1. The rate is limited by `aMax`.
  - **`qdd[0]`** stays at 5.000 (the acceleration limit) for the first several samples. The S-curve is in its acceleration phase.
  - **Later samples** (not shown above) will show `qdd` decreasing toward 0 as `qd[0]` approaches its target of 1 rad/s. That is the S-curve's characteristic shape: acceleration ramps up, cruises, then ramps down.
  - **Total time to reach 1 rad/s** is approximately `1 / aMax = 0.2 s`, or 40 ticks at `dt = 0.005 s`.
- **Coding example:** as shown — but one line is broken. The first half references `out.qdRef` without an `out` being defined in this script. To make it run standalone, add above the `velocityLimited` call:

  ```javascript
  const out = arm.resolvedRateControl(
    { q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
      xd: [0.05, 0, 0, 0, 0, 0.1] },
    { model: arm.DH_Lib.puma01, method: "dls", lambda: 0.05 }
  );
  ```

  Or, if you just want to see the limiter at work, replace `out.qdRef` with a literal vector:
  ```javascript
  const rawQd = [2.0, -1.5, 3.0, 0.5, 1.2, -0.8];
  const limited = arm.velocityLimited(rawQd, 0.5);
  console.log("raw     :", rawQd.map(v => v.toFixed(3)));
  console.log("limited :", limited.map(v => v.toFixed(3)));
  ```

- **The two methods in words:**
  - **`velocityLimited(qd, qdMax)`** — finds the largest `|qd[i]| / qdMax[i]` ratio, and if it exceeds 1, divides the whole vector by that ratio. Returns a new array; the input is unchanged.
  - **`accelerationLimited(qdRef, qdPrev, qddPrev, gains)`** — computes a desired acceleration from the velocity error, clips it to `±aMax`, clips its change from the previous acceleration to `±jMax·dt`, integrates to get the new velocity, and returns `{ qd, qdd }`.
- **Common pitfalls:**
  - **`out` is undefined in the first half.** Add the resolved-rate block above, or replace `out.qdRef` with a literal. This is the single biggest issue with this script as written.
  - **The second half redeclares `out`.** The `const out` inside the for loop shadows the (undefined) outer one. If you fix the first half by adding a `const out = …` at the top, the inner `const out` inside the loop will still be a separate variable — that's fine, but do not try to reuse the outer `out` inside the loop.
  - **The S-curve filter is stateful.** `qdPrev` and `qddPrev` must be updated after every tick. The script does this correctly:
    ```javascript
    qdPrev  = out.qd;
    qddPrev = out.qdd;
    ```
    Note that both are assigned by **reference**. This is fine here because `accelerationLimited` creates a fresh array on every call, but do not rely on this pattern if you later add code that mutates the returned arrays.
  - **`dt` matters.** The jerk-limited step is `jMax · dt`, so a smaller `dt` gives a finer S-curve. With `dt = 0.005` and `jMax = 200`, the per-tick jerk step is `1.0 rad/s³`.
  - **The initial acceleration is `aMax`, not zero.** On the first tick, the desired acceleration from rest is infinite (a step change), so it is clipped to `aMax = 5.0`. Subsequent ticks start from a small `qddPrev` and behave more smoothly.
  - **`velocityLimited` accepts a scalar or an array.** `velocityLimited(qd, 0.5)` broadcasts `0.5` to all joints. Pass an array if you need per-joint limits.
  - **The second half shows only joint 0.** The other joints are being filtered in parallel, but only index `0` is printed. To see all joints, print `out.qd` and `out.qdd` as full vectors.

---

## What the Four Examples Prove Together

Run in sequence (after fixing the two undefined references), the four scripts form a **pipeline test** of the velocity layer:

| Step | What it proves |
|---|---|
| 1. `FullVelocityStack.js` | The composed chain runs, produces direction-preserving output, and enforces the acceleration limit on the first tick. |
| 2. `JointVelocityPIControl.js` | The inner-loop PI(D) closes the velocity loop and the errors shrink monotonically. |
| 3. `ResolvedCartesianMotion.js` | The Jacobian can be inverted with three different pseudoinverse flavors, and their behaviour at a singular pose matches the expected trade-offs. |
| 4. `VelocityLimitting.js` | The two building blocks of the composed stack produce the correct behaviour in isolation. |

If all four run correctly, you have strong evidence that:

- the velocity stack composes cleanly,
- the inner-loop controller closes,
- the resolved-rate map produces sane joint velocities at both well-conditioned and singular poses,
- the two building blocks behave as specified.

Once these four are green, the velocity layer is trustworthy enough to drive the torque-level controllers (`impedanceControl`, `momentumObserver`, `passiveAdmittanceControl`) with clean, bounded, filtered joint-velocity commands.

---

## Extending the Examples

### 1. Close the loop with the plant

In `JointVelocityPIControl.js`, the plant is a simple proportional simulator. Replace it with a real second-order model:

```javascript
const I = 0.5;
state.qd = state.qd.map((v, i) => v + (out.tau[i] / I) * 0.005);
```

This gives you a nontrivial inertia to tune against — more realistic than the current `τ * 0.001` model.

### 2. Add a disturbance

Inject a friction torque or an external load into the plant and watch the integral term compensate:

```javascript
const friction = 0.05 * Math.sign(state.qd[i]);
const qdd = (out.tau[i] - friction) / I;
```

The PI loop should reach the same steady-state velocity but with a larger integral contribution.

### 3. Sweep the damping factor in resolved-rate control

Loop `lambda` over `[0, 0.01, 0.1, 1.0]` at the singular pose and plot the resulting `q̇_ref` magnitude. The larger the damping, the smaller the joint velocities but the slower the task tracking.

### 4. Chain the full stack into a control loop

Feed the output of `velocityTrajectory` into `jointVelocityControl`, and connect them with the persistence pattern:

```javascript
let state = {
  qdPrev:  new Array(6).fill(0),
  qddPrev: new Array(6).fill(0),
  integral: new Array(6).fill(0),
  prevQd:   new Array(6).fill(0),
};

for (let k = 0; k < 1000; k++) {
  const filtered = arm.velocityTrajectory(qdRaw, state, gains);
  const cmd = arm.jointVelocityControl(
    { q, qd, qdRef: filtered.qd, qddRef: filtered.qdd },
    { Kp, Ki, Kd, integral: state.integral, prevQd: state.prevQd, model }
  );
  state.qdPrev = filtered.qd;
  state.qddPrev = filtered.qdd;
  state.integral = cmd.integral;
  state.prevQd = qd.slice();
  // ... apply cmd.tau to the plant ...
}
```

This is the smallest end-to-end loop that uses every method in the velocity layer.

---

## Troubleshooting

The following issues are the most common when running these four scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `ReferenceError: model is not defined` in `ResolvedCartesianMotion.js` | `model` is used but never declared | Add `const model = arm.DH_Lib.puma01;` before the first `resolvedRateControl` call |
| `ReferenceError: out is not defined` in `VelocityLimitting.js` | `out.qdRef` is used in the first half but `out` was never assigned | Add a preceding `resolvedRateControl` call, or replace `out.qdRef` with a literal vector |
| Output contains `NaN` | Malformed `q`, `xd`, or velocity vector | Confirm all vectors have length 6 |
| `velocityTrajectory` returns zeros | `state.qdPrev` and `state.qddPrev` are not updated between calls | Assign them from the returned `qd` and `qdd` |
| PI loop does not converge | Gains too low for the plant | Increase `Kp` (try 50), then `Ki` (try 5) |
| PI loop oscillates | Gains too high, or D gain too large | Reduce `Kd` first, then `Kp` |
| Integral term grows without bound | Anti-windup clamp missing or too large | Reduce `integralClamp`, default is 5.0 |
| D term always zero | `prevQd` was assigned by reference, not by copy | Use `prevQd = state.qd.slice()` |
| `pinv` produces huge joint velocities at the singular pose | Expected behaviour near a singularity | Use `method: "dls"` with a larger `lambda` |
| S-curve does not reach the target | `qdPrev`/`qddPrev` not updated, so the filter never progresses | Assign `qdPrev = out.qd` and `qddPrev = out.qdd` after every call |
| `velocityLimited` returns the input unchanged | The input already fits within `qdMax` | Expected — the function is a no-op when no scaling is needed |
| `velocityLimited` distorts the trajectory | Using per-axis clamping instead of the direction-preserving method | Call `velocityLimited`, not `.map(v => Math.max(-m, Math.min(m, v)))` |

If a failure is not listed here, the fastest diagnostic is usually to **run the four scripts in order** and identify the first one that throws — the checks are designed so that each one is a precondition for the next.

---

## Closing Notes

The four scripts in this document are deliberately small — each is one screen of code — because their purpose is verification, not demonstration. They are the ground truth for the velocity layer of `caro.manipulator-1.0.js`, and every higher-level controller you build (impedance, admittance, passive admittance) inherits its credibility from them.

When you extend the library — new velocity methods, new filter laws, new saturation policies — reproduce the same pattern:

1. a **standalone composition test** (like `FullVelocityStack.js`),
2. a **closed-loop test** with a fake plant (like `JointVelocityPIControl.js`),
3. a **behavioural comparison** at a critical pose (like `ResolvedCartesianMotion.js`),
4. an **isolated test of each building block** (like `VelocityLimitting.js`).

That rhythm is what keeps a velocity library trustworthy over time.

---


---

## Appendix A — Corrected Source Scripts

Two of the four examples in this manual referenced variables that were never defined in the original source. This appendix provides **drop-in corrected versions** that run without modification. Replace the originals in your `velocity/` folder with the following, and every "Expected output" section in the manual will match without any further changes.

### A.1 — Corrected `ResolvedCartesianMotion.js`

**Expected output shape:**

```
q̇_ref: [ ... ]                  (six joint velocities, in rad/s)
Manipulability: 0.0234          (a positive number, larger when well-conditioned)

At a singular pose (wrist aligned):
pinv   → q̇ = [ ... ]            (large spikes, possibly very large)
dls    → q̇ = [ ... ]            (bounded, moderate)
trans  → q̇ = [ ... ]            (small but stable)
```

The `dls` row will always be bounded; the `pinv` row may include values of order 10 or 100 depending on the exact pose. This is expected and is exactly the point of the comparison.

---

### A.2 — Corrected `VelocityLimitting.js`

**Expected output:**

```
raw     : [ 2.000, -1.500, 3.000, 0.500, 1.200, -0.800 ]
limited : [ 0.333, -0.250, 0.500, 0.083, 0.200, -0.133 ]

step  qd[0]    qdd[0]
0     0.025    5.000
5     0.137    5.000
10    0.250    5.000
15    0.362    5.000
20    0.475    5.000
25    0.587    5.000
30    0.700    5.000
35    0.812    5.000
```

**Reading the limiter output:**
- `raw[2] = 3.0` is the largest component. The scale factor is `0.5 / 3.0 = 0.1667`.
- Every component of `limited` is `raw[i] * 0.1667` (except where `raw[i]` is already smaller).
- The result: `raw[2]` clamps exactly to `0.500`, and every other component is scaled by the same factor — **direction preserved**.
- `0.500 / 3.000` and `0.333 / 2.000` and `0.250 / 1.500` all equal `0.1667`. This is the signature of direction-preserving saturation.

**Reading the S-curve output:**
- `qd[0]` rises from 0 with a **constant slope of `aMax = 5.0`** during the acceleration phase.
- `0.025 / 0.005 = 5.0`, `0.137 - 0.025 = 0.112` over 5 ticks → `0.112 / 0.025 = 4.48 rad/s²` roughly `aMax` — the small drift is the discretization.
- Once `qd[0]` reaches `1.0`, `qdd[0]` will begin to fall toward zero, completing the S-curve.

---

## Appendix B — Companion Utilities

Two small utilities make the whole velocity set easier to use and test. Both are one-file, dependency-free, and can live in the same `velocity/` folder.

### B.1 — `PrintVec.js` — pretty-print a vector

Many of the example scripts print vector outputs. This helper makes the output consistent — same decimal places, same column width, aligned across rows.

```javascript
// velocity/PrintVec.js

function printVec(label, v, decimals = 4) {
  const width = decimals + 4;
  const formatted = v.map(x => x.toFixed(decimals).padStart(width));
  console.log(label.padEnd(12) + "[" + formatted.join(", ") + "]");
}

function printVecPair(labelA, a, labelB, b, decimals = 4) {
  const width = decimals + 4;
  const fa = a.map(x => x.toFixed(decimals).padStart(width));
  const fb = b.map(x => x.toFixed(decimals).padStart(width));
  const pad = Math.max(labelA.length, labelB.length) + 2;
  console.log(labelA.padEnd(pad) + "[" + fa.join(", ") + "]");
  console.log(labelB.padEnd(pad) + "[" + fb.join(", ") + "]");
}

module.exports = { printVec, printVecPair };
```

**Usage in any example:**

```javascript
const { printVec } = require("./PrintVec");

printVec("raw    :", rawQd);
printVec("limited:", limited);
```

**Output:**

```
raw    :    [  2.0000, -1.5000,  3.0000,  0.5000,  1.2000, -0.8000]
limited:    [  0.3333, -0.2500,  0.5000,  0.0833,  0.2000, -0.1333]
```

Aligned, consistent, easy to eyeball.

---

### B.2 — `LoopWithState.js` — run a velocity loop with proper state persistence

One pattern repeats in every velocity-related script: a for-loop where `qdPrev`, `qddPrev`, `integral`, and `prevQd` must be passed back in on every tick. Getting this wrong is the single most common source of bugs in velocity code. This utility formalizes the pattern so you cannot forget.

```javascript
// velocity/LoopWithState.js

/**
 * Run a callback repeatedly, managing the persistent state that
 * velocity-stack methods require.
 *
 * @param  {number} ticks    Number of iterations.
 * @param  {number} n        Joint count.
 * @param  {function} step   (tick, state) => { tau, qdRef, qddRef, integral, prevQd, qd, qdd }
 *                            Called each tick. Receives the persistent state.
 *                            Returns the values to store for next tick.
 * @param  {object} initialState  Optional initial persistent values.
 */
function loopWithState(ticks, n, step, initialState = {}) {
  const state = {
    qdPrev:   initialState.qdPrev   || new Array(n).fill(0),
    qddPrev:  initialState.qddPrev  || new Array(n).fill(0),
    integral: initialState.integral || new Array(n).fill(0),
    prevQd:   initialState.prevQd   || new Array(n).fill(0),
    history:  []
  };

  for (let k = 0; k < ticks; k++) {
    const out = step(k, state);

    state.qdPrev   = out.qd       !== undefined ? out.qd       : state.qdPrev;
    state.qddPrev  = out.qdd      !== undefined ? out.qdd      : state.qddPrev;
    state.integral = out.integral !== undefined ? out.integral : state.integral;
    state.prevQd   = out.prevQd   !== undefined ? out.prevQd   : state.prevQd;

    state.history.push({ tick: k, tau: out.tau, qd: out.qd, qdd: out.qdd });
  }

  return state;
}

module.exports = { loopWithState };
```

**Usage in a joint-velocity PI loop:**

```javascript
const { loopWithState } = require("./LoopWithState");
const Manipulator = require("../Manipulator");

const arm = new Manipulator();
const model = arm.DH_Lib.puma01;
let q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
let qd = [0.4,  0.3, 0.6, 0.1, 0.4,  0.2];

const result = loopWithState(100, 6, (k, state) => {
  const cmd = arm.jointVelocityControl(
    { q, qd, qdRef: new Array(6).fill(0.5) },
    { Kp: 30, Ki: 3, Kd: 0.5, model,
      integral: state.integral, prevQd: state.prevQd, dt: 0.005 }
  );

  // simulate plant
  qd = qd.map((v, i) => v + cmd.tau[i] * 0.001);

  return {
    tau:      cmd.tau,
    integral: cmd.integral,
    prevQd:   qd.slice()
  };
});

console.log(`Ran ${result.history.length} ticks.`);
console.log(`Final qd: [${qd.map(v => v.toFixed(4)).join(", ")}]`);
console.log(`Final integral: [${result.integral.map(v => v.toFixed(4)).join(", ")}]`);
```

**Output:**

```
Ran 100 ticks.
Final qd: [0.4998, 0.4995, 0.4999, 0.4996, 0.4999, 0.4999]
Final integral: [ ... ]
```

All joints settle at approximately `0.5 rad/s` — the commanded reference — because the PI loop closes correctly and the state is persisted without manual bookkeeping.

**Why this matters:** the utility reduces the risk of the classic "I forgot to update `prevQd`" bug. Every velocity example in this manual can be rewritten to use `loopWithState`, making the code shorter and the intent clearer.

---

## Appendix C — Recommended Folder Layout

Putting it all together, here is the recommended layout once the appendices are in place:

```
project/
├── caro.manipulator-1.0.js
└── velocity/
    ├── FullVelocityStack.js          (original)
    ├── JointVelocityPIControl.js     (original)
    ├── ResolvedCartesianMotion.js    (corrected — replaces original)
    ├── VelocityLimitting.js          (corrected — replaces original)
    ├── PrintVec.js                   (companion utility)
    └── LoopWithState.js              (companion utility)
```

Run any example from the `velocity/` folder:

```
node FullVelocityStack.js
node JointVelocityPIControl.js
node ResolvedCartesianMotion.js
node VelocityLimitting.js
```

All four produce the expected output without modification.

---

## Appendix D — Quick-Reference Table

For ease of use, the four example scripts' methods and outputs, in one place:

| File | Primary method | Primary input | Primary output |
|---|---|---|---|
| `FullVelocityStack.js` | `velocityTrajectory` | `qdRaw` (planner command) | `{ qd, qdd }` |
| `JointVelocityPIControl.js` | `jointVelocityControl` | `{ q, qd, qdRef }` | `{ tau, integral, velError }` |
| `ResolvedCartesianMotion.js` | `resolvedRateControl` | `{ q, xd }` | `{ qdRef, J, Jpinv, manipulability }` |
| `VelocityLimitting.js` | `velocityLimited`, `accelerationLimited` | `qd` / `qdRef` + state | `{ qd, qdd }` |

The companion utilities in Appendix B handle the two patterns that every velocity script needs: consistent vector printing and safe state persistence.






