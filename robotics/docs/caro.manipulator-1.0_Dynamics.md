# CaroLab Manipulator Library — Dynamics Examples Manual

- **Name:** caro.manipulator-1.0.js (dynamics example set)
- **Release Date:** 29 September 2026
- **Document Name:** Dynamics Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Jacobian (`Jacobian.js`)](#example-1--jacobian-jacobianjs)
4. [Example 2 — Joint Velocities (`JointVelocities.js`)](#example-2--joint-velocities-jointvelocitiesjs)
5. [Example 3 — Numerical Jacobian Verification (`NumericJacobian.js`)](#example-3--numerical-jacobian-verification-numericjacobianjs)
6. [Example 4 — Gravity + Coriolis Torques (`Tau.js`)](#example-4--gravity--coriolis-torques-taujs)
7. [Example 5 — Static Holding Torque (`TauStatic.js`)](#example-5--static-holding-torque-taustaticjs)
8. [Example 6 — Zero-Gravity Torque Check (`TauZero.js`)](#example-6--zero-gravity-torque-check-tauzerojs)
9. [What the Six Examples Prove Together](#what-the-six-examples-prove-together)
10. [Extending the Examples](#extending-the-examples)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is a companion to the `caro.manipulator-1.0.js` library **Functions List**. Where the Functions List describes each method in isolation, this document is a **worked-example user manual** for the dynamics side of the library — the Jacobian, joint-velocity mapping, and inverse dynamics.

The six examples in this set cover the three central quantities of robot-arm dynamics:

| Quantity | Symbol | Example(s) |
|---|---|---|
| Geometric Jacobian | `J(q)` | `Jacobian.js`, `NumericJacobian.js` |
| Joint velocities from a Cartesian twist | `q̇ = J⁺ ẋ` | `JointVelocities.js` |
| Joint torques from motion | `τ = rne(q, q̇, q̈, g)` | `Tau.js`, `TauStatic.js`, `TauZero.js` |

Together they form a **minimal verification suite** for the dynamics layer: each example has a known expected output, so a failure points directly to the responsible method. Use them as:

- **regression tests** after editing `caro.manipulator-1.0.js`,
- **teaching material** for anyone learning the library,
- **diagnostic checks** before running the full control stack (`impedanceControl`, `momentumObserver`, …).

### Conventions

| Item | Convention |
|---|---|
| Angles | Radians |
| Lengths | Metres |
| Torques | Newton-metres (N·m) |
| Joint vector | `q = [q1, q2, q3, q4, q5, q6]` — six joints for the built-in PUMA-560-like model |
| DH table | `arm.DH_Lib.puma01` — the model used throughout this document unless stated otherwise |
| Jacobian shape | `6 × n`, rows `[vx, vy, vz, ωx, ωy, ωz]` |
| State persistence | None of these examples carry state between calls — each runs a single-shot computation |

All scripts use **CommonJS** (`require`) because they are intended to be run with Node.js.

### Required Files and Layout

The six example scripts are assumed to live in a `dynamics/` subfolder, with the library one level up:

```
project/
├── caro.manipulator-1.0.js      
└── dynamics/
    ├── Jacobian.js
    ├── JointVelocities.js
    ├── NumericJacobian.js
    ├── Tau.js
    ├── TauStatic.js
    └── TauZero.js
```

Two of the scripts use different `require` paths:

| Script | `require` path | Notes |
|---|---|---|
| `Jacobian.js` | `require("../caro.manipulator-1.0")` | **Preferred** — matches the release name |
| `JointVelocities.js` | `require("../caro.manipulator-1.0")` | Legacy name from earlier development |
| `NumericJacobian.js` | `require("../caro.manipulator-1.0")` | Legacy name |
| `Tau.js` | `require("../caro.manipulator-1.0")` | Legacy name |
| `TauStatic.js` | `require("../caro.manipulator-1.0")` | Legacy name |
| `TauZero.js` | `require("../caro.manipulator-1.0")` | Legacy name |
 

### How to Run the Examples

From the folder that contains the scripts:

```
node Jacobian.js
node JointVelocities.js
node NumericJacobian.js
node Tau.js
node TauStatic.js
node TauZero.js
```

Or from the project root:

```
node dynamics/Jacobian.js
```

Each script writes one block of text to the console and exits. No files are created, nothing is written to disk.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `Jacobian.js` | `jacobian(model, q)` | Print the 6×6 geometric Jacobian at a sample pose |
| 2 | `JointVelocities.js` | `jacobian`, DLS solve (inline) | Turn a Cartesian twist into joint velocities |
| 3 | `NumericJacobian.js` | `jacobian`, `forwardKin` | Verify the analytic Jacobian against finite differences |
| 4 | `Tau.js` | `rne(q, q̇, q̈)` with custom `dynamics` | Gravity + Coriolis torques on a full arm |
| 5 | `TauStatic.js` | `rne` with zero velocity / acceleration | Isolated gravity torques at the zero pose |
| 6 | `TauZero.js` | `rne` with zero **gravity** | Sanity check — should return all zeros |

---

## Example 1 — Jacobian (`Jacobian.js`)

- **Purpose:** Print the full 6×6 geometric Jacobian of the PUMA model at a specific joint configuration. This is the reference table you compare against when you later change the DH parameters, the joint convention, or the Jacobian implementation.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const J = arm.jacobian(puma, q);

console.log("Jacobian (6 x 6):");
J.forEach(row => console.log(row.map(x => x.toFixed(4).padStart(8))));
```

- **Inputs:** `q` — a six-joint vector containing both positive and negative values and one zero, chosen so the arm is not singular.
- **Method invoked:** `arm.jacobian(model, q)` — the standard geometric Jacobian form (see Functions List §Jacobian). `model` is the DH table; `q` is the joint vector.
- **Output:** a six-line, six-column table. Each row corresponds to one of `[vx, vy, vz, ωx, ωy, ωz]`; each column corresponds to one joint.
- **Coding example:** as shown; nothing else is required.
- **Why this q:** the vector `[0.3, -0.4, 0.5, 0, 0.6, 0.2]` is used **consistently across Examples 1, 2, and 3**, so the three scripts can be compared line-by-line. It exercises the shoulder, elbow and both wrist joints and stays far from any kinematic singularity — the arm has meaningful motion in every Cartesian direction.
- **Reading the output:**
  - **Rows 0–2 (`vx, vy, vz`)** — the linear velocity of the tool origin for a unit joint velocity.
  - **Rows 3–5 (`ωx, ωy, ωz`)** — the angular velocity of the tool.
  - **Column i** — the contribution of joint `i` alone. Column 0 (base yaw) typically contributes only horizontal motion; column 2 (forearm) contributes the largest `vz` component.
- **Common pitfalls:**
  - If the script reports `Cannot find module`, check the `require` path — it must point to the library file (with `.js` appended by Node, so `caro.manipulator-1.0` with no extension is the normal form).
  - If the output is a 6×6 grid of `NaN`, the DH table or the joint vector is malformed. Confirm `puma.length === 6` and `q.length === 6`.
  - The printed values depend only on `q` and the DH table — rerunning the script with a different `q` should produce a visibly different table.

---

## Example 2 — Joint Velocities (`JointVelocities.js`)

- **Purpose:** Convert a Cartesian tool velocity (a "twist") into joint velocities using the damped least-squares (DLS) inverse of the Jacobian. This is the first half of any resolved-rate controller.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const J = arm.jacobian(puma, q);

console.log("Jacobian (6 x 6):");
J.forEach(row => console.log(row.map(x => x.toFixed(4).padStart(8))));

const xDot = [0.01, 0, 0, 0, 0, 0];   // 1 cm/s along world X

function dls(J, xDot, lambda = 0.01) {
  const m = J.length, n = J[0].length;
  const A = Array.from({length: m}, (_, i) =>
    Array.from({length: m}, (_, j) => {
      let s = i === j ? lambda * lambda : 0;
      for (let k = 0; k < n; k++) s += J[i][k] * J[j][k];
      return s;
    })
  );
  const y = solveLinear(A, xDot);
  return Array.from({length: n}, (_, k) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += J[i][k] * y[i];
    return s;
  });
}

function solveLinear(A, b) { /* Gauss–Jordan — see source */ }

const qDot = dls(J, xDot);
console.log("Joint velocities:", qDot.map(x => x.toFixed(4)));
```

- **Method invoked:** `arm.jacobian(model, q)` for `J`; the DLS solve is written inline so the reader can see exactly what `resolvedRateControl` with `method: "dls"` does under the hood.
- **Inputs:**
  - `q` — same configuration as Example 1, so the Jacobian printed here matches exactly.
  - `xDot` — a desired twist of `[0.01, 0, 0, 0, 0, 0]` m/s: the tool moves 1 cm/s along the world X-axis, with no rotation.
  - `lambda` — DLS damping factor, `0.01` in this example. Small enough to make the solve nearly exact at a well-conditioned pose; large enough to keep it finite near a singularity.
- **Output:** six joint velocities, in rad/s. Only joints whose motion has an X-component contribute strongly; the others will be small but not exactly zero (because the tool position depends on several joints).
- **Coding example:** as shown. The final `console.log` prints the joint-velocity vector rounded to four decimals.
- **The algorithm in words:**
  1. Build `A = J·Jᵀ + λ²·I` (a 6×6 symmetric matrix).
  2. Solve `A · y = ẋ` for `y` (a 6-vector).
  3. Compute `q̇ = Jᵀ · y` (a 6-vector — the joint velocities).

  This is the standard **Levenberg–Marquardt** form of the pseudoinverse. For `λ = 0` it reduces to `Jᵀ(JJᵀ)⁻¹ ẋ`, the exact Moore–Penrose solution when `J` is full-rank.
- **Expected magnitude:** with `ẋ = 0.01` m/s and link lengths of order `0.4 m`, most entries of `q̇` are in the range `0.005–0.05 rad/s`. If you see values of order 10 or 100, something is wrong — likely a wrong `ẋ` unit or a Jacobian whose linear rows do not match the link lengths.
- **Comparison with `resolvedRateControl`:** once `arm.resolvedRateControl(s, gains)` is wired up, `gains.method: "dls"` and `gains.lambda: 0.01` will produce the same `qdRef`, so this example doubles as a unit test for that method.
- **Common pitfalls:**
  - A missing `lambda` argument means the DLS reduces to the plain pseudoinverse; near a singularity the printed values will be enormous. Always pass `lambda` explicitly.
  - The angle of the twist is not integrated anywhere — the script computes the *instantaneous* joint velocities at the current `q`. If you want joint *angles*, integrate these velocities over time (that is exactly what a resolved-rate controller does).
  - `xDot` is a 6-vector. Passing a 3-vector silently produces `NaN`s in the output; always provide all six entries.

## Example 3 — Numerical Jacobian Verification (`NumericJacobian.js`)

- **Purpose:** Prove that the analytic Jacobian is correct by comparing it against a finite-difference approximation of the same quantity — computed from `forwardKin` alone, with no Jacobian code involved. This is the strongest single check you can run on the kinematics layer.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function numericJacobian(arm, model, q, eps = 1e-6) {
  const { T: T0 } = arm.forwardKin(model, q);
  const p0 = [T0[0][3], T0[1][3], T0[2][3]];
  const J = arm._zeros(3, q.length);

  for (let i = 0; i < q.length; i++) {
    const qP = [...q]; qP[i] += eps;
    const { T: Tp } = arm.forwardKin(model, qP);
    const pp = [Tp[0][3], Tp[1][3], Tp[2][3]];
    for (let r = 0; r < 3; r++) J[r][i] = (pp[r] - p0[r]) / eps;
  }
  return J;
}

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];
const Janal = arm.jacobian(arm.DH_Lib.puma01, q).slice(0, 3);  // linear part
const Jnum  = numericJacobian(arm, arm.DH_Lib.puma01, q);

console.log("Analytical vs numerical (max abs diff):");
for (let r = 0; r < 3; r++) {
  const diff = Janal[r].map((v, i) => Math.abs(v - Jnum[r][i]).toFixed(3));
  console.log(`  row ${r}: max = ${Math.max(...diff).toExponential(2)}`);
}
```

- **Methods invoked:** `arm.forwardKin(model, q)` (twice per joint) and `arm.jacobian(model, q)` (once).
- **Inputs:**
  - `q` — same configuration as Examples 1 and 2, so the analytic Jacobian is identical to the one printed by `Jacobian.js`.
  - `eps` — the finite-difference step, `1e-6` rad. Small enough that the truncation error is negligible, large enough that floating-point round-off does not dominate.
- **Output:** three lines, one per linear row (`vx, vy, vz`), showing the maximum absolute difference between the analytic and numerical columns in that row. Expected values are in the range `1e-10` to `1e-9`.
- **Coding example:** as shown. The `slice(0, 3)` restricts the comparison to the linear part of the Jacobian, because the numerical routine above only perturbs the tool **position** (not the orientation). Extending it to the angular part requires comparing rotation matrices — see "Extending the Examples" below.
- **Why this works:** the Jacobian is, by definition, the matrix of partial derivatives `∂p/∂qᵢ`. The numerical routine computes exactly those derivatives by central-difference (here, forward-difference) approximation, using only `forwardKin` — which is the simplest, most heavily tested function in the library. Any disagreement between the two therefore isolates an error in `jacobian`, not in `forwardKin`.
- **Interpretation of the output:**
  - **`1e-10` … `1e-8`** — the analytic Jacobian is correct. This is the normal result.
  - **`1e-6` … `1e-3`** — one of the two routines has a small bug, or `eps` is badly chosen (too large causes truncation error; too small causes round-off).
  - **Larger than `1e-2`** — a sign error, an axis swap, or a wrong DH convention in the analytic Jacobian. Compare column by column to find which joint disagrees.
- **Common pitfalls:**
  - **Forward vs. central difference.** The current script uses a one-sided difference: `(p(q+eps) − p(q)) / eps`. Replacing it with a central difference `(p(q+eps) − p(q−eps)) / (2*eps)` gives roughly twice the precision. Either works.
  - **Unit of `eps`.** Because `q` is in radians, `eps` is also in radians — `1e-6` rad is about `0.06` millidegrees. Do not set it below `1e-9`, as double-precision arithmetic cannot resolve the difference.
  - **Angular part.** The script only checks rows 0–2. To verify rows 3–5, perturb `q`, take the resulting rotation matrix, compute the small-angle difference and divide by `eps`.

---

## Example 4 — Gravity + Coriolis Torques (`Tau.js`)

- **Purpose:** Compute the joint torques required to move the arm at a constant velocity along a specific joint-space trajectory, using a **custom link-dynamics table**. This is the standard forward use of `rne` — "given the motion, what torques does the controller need to command?"
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

arm.dynamics = [
  { m: 7.0, r: [0, 0, 0], I: arm._diag3(0.05, 0.05, 0.02) },
  { m: 10.0, r: [0, 0, 0], I: arm._diag3(0.20, 0.20, 0.05) },
  { m: 5.0,  r: [0, 0, 0], I: arm._diag3(0.10, 0.10, 0.03) },
  { m: 2.0,  r: [0, 0, 0], I: arm._diag3(0.02, 0.02, 0.01) },
  { m: 1.5,  r: [0, 0, 0], I: arm._diag3(0.01, 0.01, 0.005) },
  { m: 0.5,  r: [0, 0, 0], I: arm._diag3(0.005, 0.005, 0.002) }
];

const q   = [0.0, Math.PI/4, -Math.PI/4, 0.0, 0.0, 0.0];
const qd  = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
const qdd = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

const tau = arm.rne(q, qd, qdd);
console.log("Gravity + Coriolis torques:");
tau.forEach((t, i) => console.log(`  τ${i+1} = ${t.toFixed(3)} N·m`));
```

- **Method invoked:** `arm.rne(q, qd, qdd)` — recursive Newton–Euler. Because `g` is omitted, the instance default `arm.gravity = [0, 0, −9.81]` is used.
- **Inputs:**
  - `arm.dynamics` — a six-entry array; each entry is `{ m, r, I }` (mass in kg, COM vector in the link frame, 3×3 inertia tensor in kg·m²). This override **replaces** the built-in placeholder table used by `rne` and `_massMatrix`.
  - `q` — a straight-arm configuration with the shoulder at +45° and the elbow at −45°. The wrist is centred.
  - `qd` — a uniform joint velocity of `0.1` rad/s on every joint. This deliberately excites both the centrifugal and Coriolis terms, so the output is not pure gravity.
  - `qdd` — all zeros: the arm is moving but not accelerating. The output therefore contains gravity + Coriolis + centrifugal torque, with no inertial term.
- **Output:** six joint torques, in N·m, printed one per line.
- **Coding example:** as shown. The `arm.dynamics` override must be assigned **before** the first call to `rne`, `_massMatrix`, or `momentumObserver`; the library reads the table at call time, so assignment order matters only in that it must precede the call.
- **Interpreting the magnitudes:**
  - **Joint 1 (base yaw)** — typically near zero because gravity acts along the joint axis and Coriolis at low speed is small.
  - **Joint 2 (shoulder)** — the largest magnitude, because it fights gravity of the entire distal chain. Should be tens of N·m for a 7+10+5 kg arm.
  - **Joint 3 (elbow)** — second-largest, with a sign that depends on the arm's geometry. May be negative if the forearm is extended upward.
  - **Joints 4–6 (wrist)** — small, typically under 1 N·m. If any of these is large, the custom inertia table or the joint convention is suspect.
- **Common pitfalls:**
  - `arm.dynamics` entries must have the same **length** as the DH table (`6` here). A shorter array produces a `TypeError` inside `rne`.
  - The `r` field (COM offset in the link frame) is stored but currently **not used** by `rne` — the implementation assumes the COM is at the link origin. If you need physically faithful COM positions, extend `rne` to use `r`.
  - `qdd = 0` is essential if you want a pure gravity + Coriolis result. Any nonzero `qdd` adds a joint-acceleration contribution that is not what this example is checking.
  - The printed magnitudes are only as accurate as `arm.dynamics`. The built-in placeholder table produces qualitatively similar but numerically different torques — always override `dynamics` for a real comparison.


## Example 5 — Static Holding Torque (`TauStatic.js`)

- **Purpose:** Report the pure **gravity torque** — the torque each joint must produce to hold the arm motionless at the zero pose. This is the minimal torque check: any error in the gravity direction, DH sign, or link masses shows up immediately.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const tauStatic = arm.rne([0, 0, 0, 0, 0, 0], [0,0,0,0,0,0], [0,0,0,0,0,0]);
console.log("Holding torque at zero pose:", tauStatic.map(t => t.toFixed(3)));
```

- **Method invoked:** `arm.rne(q, 0, 0)` — with zero velocity and zero acceleration, only the gravity term survives.
- **Inputs:**
  - `q` — all zeros: the arm is in its "home" configuration. Joint 1 is vertical, joint 2 is horizontal, and the rest of the chain lies along the arm.
  - `qd`, `qdd` — all zeros.
  - **No** `arm.dynamics` override, so the built-in placeholder masses (`[7, 10, 5, 2, 1.5, 0.5]` kg, inertia `0.01·I₃`) are used. This makes the example reproducible out of the box — anyone running the script sees the same numbers.
- **Output:** six torques, in N·m, printed in a single array.
- **Coding example:** as shown.
- **Expected pattern:**
  - **`τ1 ≈ 0`** — joint 1 is the vertical base rotation. Gravity acts along its axis and cannot create a moment about it.
  - **`τ2` and `τ3`** — the shoulder and elbow carry the weight of the distal chain. Both should be nonzero with a magnitude of roughly `mass × g × lever_arm`. For the placeholder table, `τ2` is typically the largest in the vector.
  - **`τ4, τ5, τ6`** — the wrist joints are at the end of a horizontal chain. With all zeros in `q`, the wrist axis may still be perpendicular to gravity for some joints, so at least one of these is nonzero.
- **Reading the output:**
  - A **nonzero** `τ1` greater than a few milli-newton-metres signals a modelling error — either the gravity vector is not vertical, or the DH `α` column is wrong.
  - A **negative** `τ2` and positive `τ3` (or vice versa) is normal; the sign indicates the direction the motor must push to hold the arm against gravity.
  - Values that are identical to the previous joint's values suggest the DH table is degenerate — the robot may have been collapsed onto a single link.
- **Common pitfalls:**
  - Running this **after** an `arm.dynamics` override gives different (and equally valid) numbers. If you want the placeholder-default numbers shown above, run the script in a fresh `Manipulator` instance.
  - Some configurations of the PUMA 560 have `τ4 ≠ 0` even at zero pose because the wrist axis is not aligned with gravity. Do not assume every wrist torque is zero.
  - The sign of gravity is `[0, 0, −9.81]` — pointing down in world Z. If you change `arm.gravity` for a simulation, the printed torques change accordingly.

---

## Example 6 — Zero-Gravity Torque Check (`TauZero.js`)

- **Purpose:** The **trivial sanity check** — verify that when gravity is switched off and the arm is at rest, the required torque is zero. Any nonzero output indicates a bug in the gravity-vector sign, the base-condition handling inside `rne`, or the DH table itself.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const tauZero = arm.rne([0,0,0,0,0,0], [0,0,0,0,0,0], [0,0,0,0,0,0], [0,0,0]);
console.log(tauZero); // Should be [0, 0, 0, 0, 0, 0]
```

- **Method invoked:** `arm.rne(q, qd, qdd, g)` — the same routine as Example 5, but with an explicit **zero gravity vector** passed as the fourth argument.
- **Inputs:**
  - `q`, `qd`, `qdd` — all zeros.
  - `g = [0, 0, 0]` — explicitly passed to override the instance's default.
- **Output:** a six-element array. The comment in the script says "Should be `[0, 0, 0, 0, 0, 0]`" — and that is exactly what you should see.
- **Coding example:** as shown. The printed array should look like:

```
[ 0, 0, 0, 0, 0, 0 ]
```

- **Why this matters:** the recursive Newton–Euler algorithm injects gravity as a base-frame linear acceleration `dv[0] = −g`. With `g = 0`, the base acceleration is zero, so the forward pass produces zero velocities and accelerations, the backward pass produces zero forces and moments, and every joint torque is zero. Any nonzero result therefore pinpoints:
  - **A sign error in the base condition.** If `dv[0]` is set to `+g` instead of `−g`, the fourth-argument override does not fully cancel it, and a small residual appears in the output.
  - **A stray Coriolis or centrifugal term.** Even with `qd = 0` and `qdd = 0`, some implementations of RNE introduce cross terms. The library's implementation does not, so the output should be exactly zero.
  - **A DH-table error.** If the DH table contains a link with a `theta` offset, then even at `q = 0` the transform is not the identity, and a nonzero result can appear. For the built-in `puma01`, all offsets are zero.
- **Tolerance:** floating-point arithmetic rarely produces *exact* zeros, but the values should print as `0` (or `-0`) with `toFixed(3)` or plain `console.log`. Anything at `1e-10` or smaller is numerical noise; anything larger is a bug.
- **Common pitfalls:**
  - **Do not omit the fourth argument.** `arm.rne([0,0,0,0,0,0], [0,0,0,0,0,0], [0,0,0,0,0,0])` uses the default gravity `[0, 0, −9.81]` and produces the same nonzero torques as Example 5. The whole point of this example is the explicit `[0, 0, 0]`.
  - **A shifted gravity vector** such as `[0, 0, 1e-6]` will not produce visible zeros. Keep the vector exactly `[0, 0, 0]`.
  - **Combining with `arm.dynamics`:** the check is independent of link masses and inertias — the output is zero regardless of the table. This makes it an ideal first test after editing `rne`.

## What the Six Examples Prove Together

Run in sequence, the six scripts form a **pipeline test** of the dynamics layer:

| Step | What it proves |
|---|---|
| 1. `Jacobian.js` | The Jacobian compiles, has the right shape, and produces finite values at a representative pose. |
| 2. `JointVelocities.js` | The Jacobian can be inverted (with damping) and produces physically plausible joint velocities for a given twist. |
| 3. `NumericJacobian.js` | The analytic Jacobian **matches** a finite-difference reference to at least 8 significant digits. |
| 4. `Tau.js` | The RNE algorithm runs to completion with a custom link table and returns torques of a physically plausible magnitude. |
| 5. `TauStatic.js` | The gravity term is consistent — joint 1 carries no load, the shoulder and elbow carry the arm's weight. |
| 6. `TauZero.js` | The gravity-injection trick inside `rne` is self-consistent — with `g = 0`, the output is exactly zero. |

If all six pass, you have strong evidence that:

- the DH convention is correct,
- `forwardKin`, `jacobian`, and `rne` agree with each other,
- the gravity vector is treated consistently,
- the Jacobian's linear part is differentiable from the forward-kinematics map.

Once these six are green, you can trust the dynamics layer enough to wire up `momentumObserver`, `impedanceControl`, and the rest of the control stack.

---

## Extending the Examples

The six scripts are deliberately minimal. The most useful extensions, in order of value:

### 1. Verify the angular rows of the Jacobian

Example 3 currently checks only rows 0–2. To extend it, perturb `q`, take the rotation matrix from `forwardKin`, compute the small-angle error vector, and divide by `eps`:

```javascript
function numericAngularJacobian(arm, model, q, eps = 1e-6) {
  const { T: T0 } = arm.forwardKin(model, q);
  const R0 = [[T0[0][0], T0[0][1], T0[0][2]],
              [T0[1][0], T0[1][1], T0[1][2]],
              [T0[2][0], T0[2][1], T0[2][2]]];
  const Jw = arm._zeros(3, q.length);
  for (let i = 0; i < q.length; i++) {
    const qP = [...q]; qP[i] += eps;
    const { T: Tp } = arm.forwardKin(model, qP);
    const Rp = [[Tp[0][0], Tp[0][1], Tp[0][2]],
                [Tp[1][0], Tp[1][1], Tp[1][2]],
                [Tp[2][0], Tp[2][1], Tp[2][2]]];
    // ΔR = Rp · R0ᵀ  ≈ I + [ω]×
    const dR = arm._mul3(Rp, arm._transpose3(R0));
    Jw[0][i] = (dR[2][1] - dR[1][2]) / (2 * eps);
    Jw[1][i] = (dR[0][2] - dR[2][0]) / (2 * eps);
    Jw[2][i] = (dR[1][0] - dR[0][1]) / (2 * eps);
  }
  return Jw;
}
```

Then compare with `arm.jacobian(model, q).slice(3, 6)`.

### 2. Sweep the configuration

Wrap Example 1 in a loop over several `q` values, including near-singular poses, and print `arm._manipulability(J)` alongside. This is a quick way to visualise where the arm loses dexterity.

### 3. Compare RNE with a numerical inverse-dynamics reference

For a small `qdd` sweep, verify that `rne(q, qd, qdd)` is linear in `qdd`:

```javascript
const tau0 = arm.rne(q, qd, [0,0,0,0,0,0]);
const tau1 = arm.rne(q, qd, [1,0,0,0,0,0]);
const Mcol0 = tau1.map((v, i) => v - tau0[i]);   // first column of M(q)
```

This gives you the first column of the joint-space mass matrix for free — a useful cross-check against `_massMatrix(q)`.

### 4. Save the Jacobian to disk

Extend `Jacobian.js` to also write a `.csv` file, so you can plot or diff it later:

```javascript
const fs = require("fs");
fs.writeFileSync("J.csv", J.map(r => r.join(",")).join("\n"));
```

---

## Troubleshooting

The following issues are the most common when running these six scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '../caro.manipulator-1.0'` | Running from a different folder | `cd` to the folder containing the scripts, or adjust the relative path |
| Output contains `NaN` | Malformed `q` vector or DH table | Confirm `q.length === 6` and `puma.length === 6` |
| `Jacobian.js` prints a 6×5 or 6×7 grid | Wrong `q.length` | Use exactly six joint angles |
| `NumericJacobian.js` reports diffs of order `1e-3` | `eps` too large or the analytic Jacobian is wrong | Try `eps = 1e-7`; if the diff persists, compare columns individually |
| `TauStatic.js` shows `τ1 ≠ 0` | Gravity vector not `[0, 0, −9.81]`, or wrong DH `α` | Check `arm.gravity`; check `arm.DH_Lib.puma01` |
| `TauZero.js` shows nonzero torques | Fourth argument is not `[0,0,0]` | Pass the zero gravity vector explicitly |
| `Tau.js` produces all zeros | `arm.dynamics` assignment happened *after* the `rne` call | Move the assignment above the call |
| Values differ between runs of `Tau.js` | `arm.dynamics` is not set — the default table is used | Confirm the assignment is actually executed |
| `_manipulability` is tiny at Example 1's pose | The arm is near a singularity | Use a different `q`, or apply DLS with a larger `lambda` |

If a failure is not listed here, the fastest diagnostic is usually to **run the six scripts in order** and identify the first one that fails — the checks are designed so that each one is a precondition for the next.

---

## Closing Notes

When you extend the library — new DH models, new methods, new control modes — reproduce the same pattern:

1. a **single-shot numeric check** (like `NumericJacobian.js`),
2. a **trivial special case** with a known output (like `TauZero.js`),
3. a **representative case** that exercises the full method (like `Tau.js`),
4. a **printed reference table** you can diff against (like `Jacobian.js`).

That rhythm is what keeps a dynamics library trustworthy over time.

---

*End of document.*


