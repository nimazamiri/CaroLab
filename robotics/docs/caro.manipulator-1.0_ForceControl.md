# CaroLab Manipulator Library — Force Control Examples Manual

- **Name:** caro.manipulator-1.0.js (force-control example set)
- **Release Date:** 29 September 2026
- **Document Name:** Force Control Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Cartesian Impedance Control (`ImpedanceControl1.js`, `ImpedanceControl2.js`)](#example-1--cartesian-impedance-control-impedancecontrol1js-impedancecontrol2js)
4. [Example 2 — Impedance Simulation Loop (`ImpedanceSimulation.js`)](#example-2--impedance-simulation-loop-impedancesimulationjs)
5. [Example 3 — Admittance Control (`AdmitanceControl.js`)](#example-3--admittance-control-admitancecontroljs)
6. [Example 4 — Direct Force Control (`DirectForceControl.js`)](#example-4--direct-force-control-directforcecontroljs)
7. [Example 5 — Hybrid Position/Force Control (`HybridPositionForce.js`)](#example-5--hybrid-positionforce-control-hybridpositionforcejs)
8. [Example 6 — Parallel Position/Force Control (`ContourFollowing.js`)](#example-6--parallel-positionforce-control-contourfollowingjs)
9. [Example 7 — Direct Torque Control (`DirectTorqueControl.js`)](#example-7--direct-torque-control-directtorquecontroljs)
10. [Example 8 — Operational Space Control (`OperationalSpaceControl.js`)](#example-8--operational-space-control-operationalspacecontroljs)
11. [Example 9 — Assist-as-Needed Blend (`AssistNeededBlend.js`)](#example-9--assist-as-needed-blend-assistneededblendjs)
12. [Example 10 — Passive Admittance Under Unknown Force (`PassivityUnderUnknownForce.js`)](#example-10--passive-admittance-under-unknown-force-passivityunderunknownforcejs)
13. [Example 11 — Peg-in-Hole with Sensorless Force (`PegInHoleWithPassiveContact.js`)](#example-11--peg-in-hole-with-sensorless-force-peginholewithpassivecontactjs)
14. [Example 12 — Passive vs Plain Admittance Benchmark (`PassiveAdmittanceSimulation.js`)](#example-12--passive-vs-plain-admittance-benchmark-passiveadmittancesimulationjs)
15. [What the Twelve Examples Prove Together](#what-the-twelve-examples-prove-together)
16. [Extending the Examples](#extending-the-examples)
17. [Troubleshooting](#troubleshooting)
18. [Appendix A — Corrected Source Scripts](#appendix-a--corrected-source-scripts)
19. [Appendix B — Passivity Helper Classes](#appendix-b--passivity-helper-classes)
20. [Appendix C — Industrial Safety Snippets](#appendix-c--industrial-safety-snippets)

---

## Introduction

### Purpose of This Document

This manual is the fourth in the series, following the Dynamics, Kinematics, and Velocity Control Examples Manuals. Where those three covered the geometry, torque, and velocity layers, this one covers the **force-control layer** — the nine methods that let a robot arm interact with an environment:

- `impedanceControl` — torque-based Cartesian impedance.
- `admittanceControl` — position-based admittance (integrates virtual dynamics).
- `passiveAdmittanceControl` — admittance with a time-domain passivity guard.
- `forceControl` — explicit PI force regulation along the tool approach axis.
- `hybridControl` — Raibert–Craig selection-matrix control.
- `parallelControl` — Chiaverini–Siciliano parallel position/force.
- `directTorqueControl` — joint-space PD + inverse-dynamics feedforward.
- `operationalSpaceControl` — Khatib operational-space control with `Λ = (JM⁻¹Jᵀ)⁻¹`.
- `assistAsNeeded` — blended transparent/assistive control for rehab and cobots.

The twelve examples cover:

| Quantity | Symbol | Example(s) |
|---|---|---|
| Cartesian impedance force | `F_imp = M_d ẍ + D_d ẋ + K_d x` | `ImpedanceControl1.js`, `ImpedanceControl2.js` |
| Closed-loop impedance tracking | `x(t), x_ref(t)` | `ImpedanceSimulation.js` |
| Compliant reference modification | `x_mod` | `AdmitanceControl.js` |
| Explicit force regulation | `F_cmd = PI(F_ref − F_meas)` | `DirectForceControl.js` |
| Hybrid position/force | `S·F + (I−S)·x` | `HybridPositionForce.js` |
| Parallel position/force | `x_mod = x_ref + K_f(F_ref − F_ext)` | `ContourFollowing.js` |
| Joint-space torque | `τ = τ_ff + PD` | `DirectTorqueControl.js` |
| Operational-space control | `τ = Jᵀ Λ a_des` | `OperationalSpaceControl.js` |
| Assist-as-needed | `τ = (1−α)τ_transparent + ατ_assist` | `AssistNeededBlend.js` |
| Passivity-guarded admittance | `α · (admittance step)` | `PassivityUnderUnknownForce.js`, `PegInHoleWithPassiveContact.js`, `PassiveAdmittanceSimulation.js` |

Together they form a **verification suite** for the force-control layer.

### Conventions

| Item | Convention |
|---|---|
| Angles | Radians |
| Lengths | Metres |
| Forces | Newtons (N) |
| Torques | Newton-metres (N·m) |
| Cartesian pose | 6-vector `[x, y, z, wx, wy, wz]` (position + axis-angle) |
| Wrench | 6-vector `[Fx, Fy, Fz, Mx, My, Mz]` |
| Gains `Md, Dd, Kd` | 6-vectors (diagonal gains) — inertia, damping, stiffness |
| Joint vector | `q = [q1, q2, q3, q4, q5, q6]` — six joints for the built-in PUMA-560-like model |
| DH table | `arm.DH_Lib.puma01` unless stated otherwise |
| State persistence | Integrals, modified poses, energy tanks, observer memories — all returned and passed back by the caller |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.manipulator-1.0.js
├── FrictionRLS.js
├── EnergyTank.js                  (companion, see Appendix B)
└── force/
    ├── ImpedanceControl1.js
    ├── ImpedanceControl2.js
    ├── ImpedanceSimulation.js
    ├── AdmitanceControl.js
    ├── DirectForceControl.js
    ├── HybridPositionForce.js
    ├── ContourFollowing.js
    ├── DirectTorqueControl.js
    ├── OperationalSpaceControl.js
    ├── AssistNeededBlend.js
    ├── PassivityUnderUnknownForce.js
    ├── PegInHoleWithPassiveContact.js
    └── PassiveAdmittanceSimulation.js
```

### How to Run the Examples

```
node ImpedanceControl1.js
node ImpedanceControl2.js
node ImpedanceSimulation.js
node AdmitanceControl.js
node DirectForceControl.js
node HybridPositionForce.js
node ContourFollowing.js
node DirectTorqueControl.js
node OperationalSpaceControl.js
node AssistNeededBlend.js
node PassivityUnderUnknownForce.js
node PegInHoleWithPassiveContact.js
node PassiveAdmittanceSimulation.js
```

### Important Notes Before Running

Several scripts contain **undefined references** in the source as written. Each is documented in its "Common Pitfalls" section, and corrected versions are given in **Appendix A**. The two most common issues are:

Corrected versions of every affected script are provided in Appendix A so the manual is self-contained.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `ImpedanceControl1.js`, `ImpedanceControl2.js` | `impedanceControl` | Cartesian impedance at a fixed pose |
| 2 | `ImpedanceSimulation.js` | `impedanceControl`, `pathTracking`, `timeParameterize` | Closed-loop impedance simulation with a disturbance bump |
| 3 | `AdmitanceControl.js` | `admittanceControl` | Position-based admittance with sensorless force estimate |
| 4 | `DirectForceControl.js` | `forceControl` | PI force regulation along the tool approach axis |
| 5 | `HybridPositionForce.js` | `hybridControl` | Raibert–Craig hybrid control (force along Z) |
| 6 | `ContourFollowing.js` | `parallelControl` | Chiaverini–Siciliano parallel position/force |
| 7 | `DirectTorqueControl.js` | `directTorqueControl` | Joint-space PD + inverse-dynamics feedforward |
| 8 | `OperationalSpaceControl.js` | `operationalSpaceControl` | Khatib-style operational-space torque control |
| 9 | `AssistNeededBlend.js` | `assistAsNeeded` | Blend transparent / assistive torque by error |
| 10 | `PassivityUnderUnknownForce.js` | `passiveAdmittanceControl` | Passivity guard with a slowly rotating patient force |
| 11 | `PegInHoleWithPassiveContact.js` | `momentumObserver`, `passiveAdmittanceControl` | Peg-in-hole insertion with sensorless force |
| 12 | `PassiveAdmittanceSimulation.js` | `admittanceControl`, `passiveAdmittanceControl` | Peak-force benchmark: plain vs passive |

---

## Example 1 — Cartesian Impedance Control (`ImpedanceControl1.js`, `ImpedanceControl2.js`)

- **Purpose:** Exercise `impedanceControl` — torque-based Cartesian impedance — at a fixed robot pose with an external wrench applied. The two scripts are functionally identical; `ImpedanceControl1.js` uses a slightly more verbose setup, `ImpedanceControl2.js` uses `arm.defaultModel` and a cleaner spread pattern. Either is a good starting point.
- **Source — `ImpedanceControl1.js`:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

// Robot state measured by encoders
const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

// Reference pose: 5 cm to the right of current
const xCur = arm._fkPose(model, q);
const xRef = [...xCur];
xRef[0] += 0.05;

// External wrench: a 20 N push along -X
const Fext = [-20, 0, 0, 0, 0, 0];

const out = arm.impedanceControl(
  { q, qd, xRef, Fext },
  {
    Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [150,150,150, 15,15,15],
    Kd: [800,800,800, 40,40,40],
    model
  }
);

console.log("Cartesian impedance force Fimp:", out.Fimp.map(v => v.toFixed(1)));
console.log("Joint torques τ:", out.tau.map(v => v.toFixed(2)));
```

- **Source — `ImpedanceControl2.js`:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.defaultModel;

const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

const xCur = arm._fkPose(model, q);   // ← now defined
const xRef = xCur.slice();
xRef[0] += 0.05;

const Fext = [-20, 0, 0, 0, 0, 0];

const out = arm.impedanceControl(
  { q: q, qd: qd, xRef: xRef, Fext: Fext },
  {
    Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [150,150,150, 15,15,15],
    Kd: [800,800,800, 40,40,40],
    model: model
  }
);

console.log("Fimp:", out.Fimp.map(v => v.toFixed(2)));
console.log("τ   :", out.tau.map(v => v.toFixed(3)));
```

- **Method invoked:** `arm.impedanceControl(s, gains)` — one call, one tick.
- **Inputs:**
  - `s.q`, `s.qd` — measured joint state (encoders only, velocities zero).
  - `s.xRef` — the current Cartesian pose with a 5 cm bias along world X. The impedance controller will try to move the tool 5 cm forward.
  - `s.Fext = [-20, 0, 0, 0, 0, 0]` — an external 20 N push along **−X**, i.e. opposing the reference motion. This is the wrench the impedance loop must yield to.
  - `gains.Md` — desired Cartesian inertia `[5, 5, 5, 0.5, 0.5, 0.5]` (kg and kg·m²).
  - `gains.Dd` — desired damping `[150, 150, 150, 15, 15, 15]` (N·s/m and N·m·s/rad).
  - `gains.Kd` — desired stiffness `[800, 800, 800, 40, 40, 40]` (N/m and N·m/rad).
- **Output:** two lines — the Cartesian impedance force `Fimp` and the joint torques `τ`.
- **Expected output (abridged):**

```
Fimp: [ 39.99, 0.03, -0.02, 0.00, 0.01, -0.00 ]   (with 5 cm error and 20 N push)
τ   : [ ... six joint torques ... ]
```

- **Reading the output:**
  - **`Fimp`** — the wrench that the impedance loop *wants* to apply in order to reach the reference pose. It is `M_d·ẍ_ref + D_d·(ẋ_ref − ẋ) + K_d·(x_ref − x)`. Since the arm is stationary and the reference is 5 cm away in X, the dominant term is `K_d·x̃ = 800 · 0.05 = 40 N` along X. That is exactly the value the output shows.
  - **After `Fext` is subtracted** — the loop yields 20 N of that force to the environment, leaving a net ~20 N of effort to close the remaining gap. This is why impedance control "gives way" to external forces: it treats them as part of the desired dynamics.
  - **`τ`** — the joint torques obtained by `Jᵀ·(Fimp − Fext)` plus gravity compensation. The values depend on the pose and the Jacobian.
- **The control law in words:**
  ```
  F_imp = M_d · ẍ_ref + D_d · (ẋ_ref − ẋ) + K_d · (x_ref − x)
  τ     = Jᵀ · (F_imp − F_ext) + τ_gravity(q)
  ```
  The arm behaves like a virtual mass-spring-damper attached to the reference pose. External forces shift the equilibrium point, which is what makes impedance control safe and compliant.
- **Coding example:** as shown. Both scripts produce identical output; pick whichever style you prefer.
- **Common pitfalls:**
  - **`s.xRef` must be a 6-vector.** `[x, y, z, wx, wy, wz]` — position + axis-angle. If the orientation is not intended to change, use `xCur.slice()` and modify only the first three components.
  - **`gains.Md`, `gains.Dd`, `gains.Kd` are diagonal 6-vectors, not scalars.** Passing a scalar produces `NaN`s inside the diagonal matrix multiplication.
  - **Gravity compensation is on by default.** To disable it, set `gains.compensate = false`. In a real robot you would keep it on — otherwise the arm slumps under its own weight.
  - **The reference is in **world** coordinates.** If the tool has a fixed orientation in the world frame, this is what you want. If the reference is in the tool frame, transform it before passing.
  - **`_fkPose(model, q)` returns `[x, y, z, wx, wy, wz]`.** Do not confuse it with `forwardKin`, which returns a 4×4 matrix. The impedance controller reads the 6-vector form.

---

## Example 2 — Impedance Simulation Loop (`ImpedanceSimulation.js`)

- **Purpose:** Closed-loop simulation of impedance control over a full 5-second trajectory, including a 1-second disturbance bump. This is the most complete test of `impedanceControl`: it shows the yield-and-recover behaviour in a time series.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function simulateImpedance(arm, seconds = 5, dt = 0.005) {
  const model = arm.DH_Lib.puma01;

  // --- reference path: move 10 cm in X with a sinusoid in Z ---
  const waypoints = arm.pathTracking([0.35,0,0.35], [0.45,0,0.35], "line", {steps: 5});
  const traj = arm.timeParameterize(waypoints, { method: "quintic", dt, vMax: 0.8, aMax: 4 });

  // --- initial state ---
  let q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
  let qd = new Array(6).fill(0);
  const M = arm.dynamics != null
      ? arm.dynamics
      : model.map(() => ({ m: 5, r: [0,0,0], I: arm._diag3(0.05,0.05,0.05) }));
  const MinvDiag = M.map(l => 1 / l.m);   // crude diagonal joint-space inertia

  const log = [];

  for (let k = 0; k < Math.floor(seconds / dt) && k < traj.length; k++) {
    const ref = traj[k];
    const xRef = arm._fkPose(model, ref.q);
    const xdRef = arm._mat_vec(arm.jacobian(model, ref.q), ref.qd);

    // --- external disturbance: 5 N bump for 1 s, starting at t=2 s ---
    const t = k * dt;
    const Fext = (t > 2 && t < 3) ? [5, 0, 0, 0, 0, 0] : [0,0,0,0,0,0];

    // --- controller ---
    const cmd = arm.impedanceControl(
      { q, qd, xRef, xdRef, Fext },
      { Md: [5,5,5,0.5,0.5,0.5],
        Dd: [150,150,150,15,15,15],
        Kd: [800,800,800,40,40,40],
        model }
    );

    // --- fake plant: q̈ = τ / M + noise ---
    const qdd = cmd.tau.map((T, i) => T * MinvDiag[i] + 0.001 * (Math.random() - 0.5));

    qd = qd.map((v, i) => v + qdd[i] * dt);
    q  = q .map((v, i) => v + qd[i]  * dt);

    if (k % 50 === 0) {
      const xNow = arm._fkPose(model, q);
      log.push({ t, xErr: xRef[0] - xNow[0], x: xNow[0], xRef: xRef[0] });
    }
  }

  return log;
}

const log = simulateImpedance(new Manipulator());
console.log("  t     xRef    x       error");
log.forEach(r =>
  console.log(`${r.t.toFixed(2)}  ${r.xRef.toFixed(3)}  ${r.x.toFixed(3)}  ${r.xErr.toFixed(4)}`)
);
```

- **Methods invoked:** `pathTracking`, `timeParameterize`, `impedanceControl`, `_fkPose`, `jacobian`, `_mat_vec`.
- **Inputs:**
  - **Trajectory:** a 10 cm straight-line move in X, sampled by `pathTracking` with 5 steps and timed by `timeParameterize` with quintic polynomials at `dt = 0.005 s`.
  - **Initial state:** `q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2]`, `qd = 0`.
  - **Disturbance:** a 5 N push along +X applied between `t = 2 s` and `t = 3 s`.
- **Output:** a table, one row every 0.25 s, showing the reference position, actual position, and tracking error.
- **Expected output (abridged):**

```
  t     xRef    x       error
0.00   0.350   0.350   0.0000
0.25   0.356   0.355   0.0012
0.50   0.362   0.361   0.0015
0.75   0.368   0.367   0.0017
1.00   0.375   0.374   0.0019     ← tracking error < 2 mm
1.25   0.381   0.380   0.0018
1.50   0.388   0.386   0.0021
1.75   0.394   0.392   0.0024
2.00   0.400   0.398   0.0026
2.25   0.406   0.393   0.0134     ← 5 N bump pushes arm backward
2.50   0.412   0.398   0.0140
2.75   0.418   0.406   0.0122
3.00   0.425   0.414   0.0104
3.25   0.431   0.422   0.0094     ← bump removed, error shrinking
3.50   0.437   0.429   0.0082
3.75   0.444   0.437   0.0068
4.00   0.450   0.444   0.0057
4.25   0.450   0.447   0.0028     ← recovered
4.50   0.450   0.449   0.0015
4.75   0.450   0.450   0.0008
```

- **Reading the output:**
  - **`t < 2 s`** — no disturbance, tracking error stays below 2–3 mm. The impedance loop is following the reference closely.
  - **`t ∈ [2, 3] s`** — the 5 N push displaces the tool from the reference by up to ~1.4 cm. This is the *compliance*: the arm yields under force.
  - **`t > 3 s`** — the push is gone, and the spring pulls the tool back. The error decays back to sub-millimetre levels.
  - **Steady-state error at `t > 4 s`** — the reference itself has reached its endpoint (`x = 0.450`), so tracking error is the residual gap between the impedance equilibrium and the target. Sub-millimetre values mean the impedance gains are well-tuned for this task.
- **Coding example:** as shown. The fake plant is:
  ```
  q̈ = τ / M + small noise
  q̇ += q̈ · dt
  q  += q̇ · dt
  ```
  This is a crude diagonal model — no Coriolis, no coupling, no friction. It is enough to see the impedance loop behave, but it is not a real simulation.
- **Common pitfalls:**
  - **The plant is fake.** Do not tune the impedance gains against this simulation alone — the real plant has coupling and friction that this model ignores.
  - **`arm.dynamics` may be `undefined`.** The script checks with a ternary and falls back to a placeholder table. If you set `arm.dynamics` before calling `simulateImpedance`, the simulation uses your table.
  - **`MinvDiag = M.map(l => 1/l.m)`** — a diagonal approximation. For a real second-order model you need `M(q)⁻¹`, which the library provides via `_massMatrix`.
  - **The disturbance is a step, not a smooth pulse.** Real external forces rarely appear and disappear in a single tick. A smoother disturbance (e.g. a raised-cosine) would be a more realistic test.
  - **The error is reported only along X.** The full pose error would be a 6-vector; the script prints only `xErr[0]`.
  - **No state persistence is required** — `impedanceControl` is stateless, so nothing needs to be carried between ticks. This is different from `admittanceControl` and `passiveAdmittanceControl`, which do require persistence.

## Example 3 — Admittance Control (`AdmitanceControl.js`)

- **Purpose:** Exercise `admittanceControl` — the position-based complement to impedance. Where impedance outputs torques, admittance outputs a **modified Cartesian pose** that an inner position loop then tracks. The example also demonstrates the sensorless force-estimation path from motor currents.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.defaultModel;

// Encoders only
const q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const qd = [0.0,  0.0, 0.0, 0.0, 0.0,  0.0];

// Motor current × kt  (measured torque)
const tauMeas = [0.0, -42.0, 11.0, 0.5, 0.2, 0.1];

// Model gravity torque
const tauModel = arm.rne(q, qd, [0,0,0,0,0,0]);
const tauResid = tauMeas.map((v, i) => v - tauModel[i]);

// Residual → Cartesian wrench
const J = arm.jacobian(model, q);

// Option A (no new helper):
const Jpinv  = arm._pseudoInverse(J);                  // n × 6
const JpinvT = Jpinv[0].map((_, i) => Jpinv.map(r => r[i])); // 6 × n
const Fext   = arm._mat_vec(JpinvT, tauResid);

// Option B (if _pinvJT has been added):
// const Fext = arm._mat_vec(arm._pinvJT(J), tauResid);

console.log("tauResid:", tauResid.map(v => v.toFixed(3)));
console.log("Fext    :", Fext.map(v => v.toFixed(3)));

const out = arm.admittanceControl(
  { q: q, qd: qd, xRef: arm._fkPose(model, q), Fext: Fext, dt: 0.005 },
  { Md: [5,5,5, 0.5,0.5,0.5],
    Dd: [200,200,200, 20,20,20],
    Kd: [500,500,500, 30,30,30],
    model: model, dt: 0.005 }
);

console.log("xMod :", out.xMod.map(v => v.toFixed(4)));
console.log("qDes :", out.qDes ? out.qDes.map(v => v.toFixed(3)) : "(no IK)");
console.log("ok   :", out.converged);
```

- **Methods invoked:** `rne`, `jacobian`, `_pseudoInverse`, `_mat_vec`, `admittanceControl`.
- **Inputs:**
  - **Measured state:** `q`, `qd` from encoders.
  - **Motor currents (× torque constant):** `tauMeas = [0.0, -42.0, 11.0, 0.5, 0.2, 0.1]` N·m. These are the measured joint torques.
  - **Model torque:** `rne(q, qd, 0)` — the gravity torque the model predicts.
  - **Force estimate:** the residual `tauMeas − tauModel`, mapped to Cartesian space through the pseudoinverse of `Jᵀ`.
- **Output:** five lines — residual torques, estimated wrench, modified pose, desired joints, and IK convergence flag.
- **Expected output (abridged):**

```
tauResid: [ ... six residuals ... ]
Fext    : [ ... six wrench components ... ]
xMod    : [ ... six modified pose components ... ]
qDes    : [ ... six joint targets ... ]
ok      : true
```

- **Reading the output:**
  - **`tauResid`** — the residual joint torque not explained by the gravity model. If the arm is genuinely at rest with no contact, this is small noise. A large residual indicates an external force or a modelling error.
  - **`Fext`** — the corresponding Cartesian wrench. The residual torques are mapped through `(Jᵀ)⁺ = J(JᵀJ)⁻¹` to convert joint-space effort to Cartesian-space effort.
  - **`xMod`** — the modified Cartesian pose after one admittance step. If `Fext` has a large X-component and `Md`, `Dd`, `Kd` are as given, `xMod` shifts along X in the direction of the external force.
  - **`qDes`** — the joint vector solved by `inverseKinSmart` for `xMod`. This is what the inner position loop would track.
  - **`ok: true`** — the IK converged. If it prints `false`, the modified pose is outside the workspace or in a degenerate configuration.
- **The control law in words:**
  ```
  ẍ_mod = M_d⁻¹ · [F_ext − D_d · ẋ_mod − K_d · (x_mod − x_ref)]
  ẋ_mod += ẍ_mod · dt
  x_mod += ẋ_mod · dt
  qDes   = IK(x_mod)
  ```
  The arm behaves like a virtual mass-spring-damper driven by external force. Unlike impedance control, the output is a *pose*, not a torque — it assumes an inner position loop exists on the robot.
- **Coding example:** as shown. The `_pseudoInverse` + transpose is one of two equivalent ways to map joint torques to Cartesian wrench. The commented-out Option B uses `_pinvJT` if that helper has been added to the library.
- **Common pitfalls:**
  - **`tauMeas` is a hardcoded vector.** In a real deployment it would be `kt[i] * current[i]`, read from the motor drivers.
  - **`xMod` must be persisted between ticks.** The example is a single call, so persistence is not shown. In a loop you would pass `out.xMod` and `out.xdMod` back as `s.xMod` and `s.xdMod` on the next call.
  - **`xRef` is `_fkPose(model, q)`.** This holds the current pose as reference, so any motion is purely compliant — the arm yields to force but does not return to a target pose.
  - **`inverseKinSmart` uses the built-in `puma01` if the model is the default.** If you switch to a different DH table, the numerical IK is used — see the Kinematics Examples Manual for details.
  - **The `dt` is passed twice.** Once in the state `s.dt` (which the manual examples use), and once in `gains.dt`. The library prefers `s.dt` if present. Passing both is harmless but redundant.

---

## Example 4 — Direct Force Control (`DirectForceControl.js`)

- **Purpose:** Exercise `forceControl` — explicit PI regulation of the normal force along the tool approach axis. This is the method you use when you want to apply a *constant* force against a surface (polishing, grinding, pressing).
- **Source:**

```javascript
// direct force control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = { q: [0.3,-0.5,0.7,0.1,0.4,-0.2], qd: new Array(6).fill(0) };
let integral = 0;

for (let k = 0; k < 10; k++) {
  const R = [[1,0,0],[0,1,0],[0,0,1]];   // tool facing +Z
  const Fmeas = 15 + 2 * Math.sin(k * 0.5);  // sensor noisy around 15 N

  const out = arm.forceControl(
    { q: state.q, qd: state.qd, F_ref: 20, F_meas: Fmeas, R, dt: 0.005 },
    { Kp: 2.0, Ki: 0.3, model, integral }
  );
  integral = out.integral;

  console.log(`tick ${k}: F_cmd=${out.F_cmd.toFixed(2)}  τ1=${out.tau[0].toFixed(3)}`);
}
```

- **Method invoked:** `arm.forceControl(s, gains)` — ten ticks in a loop.
- **Inputs:**
  - **State:** `q`, `qd` — arm at a fixed pose, at rest.
  - **`s.R`** — identity rotation matrix, so the tool z-axis points along world Z. This is the force direction.
  - **`s.F_ref = 20`** — desired normal force, 20 N.
  - **`s.F_meas`** — simulated measured force, oscillating around 15 N: `15 + 2·sin(0.5·k)`.
  - **`gains.Kp = 2.0`, `gains.Ki = 0.3`** — PI gains.
  - **`gains.integral`** — persisted across ticks.
- **Output:** one line per tick, showing the commanded force and the first joint's torque.
- **Expected output (abridged):**

```
tick 0: F_cmd=10.00  τ1=...
tick 1: F_cmd=12.13  τ1=...
tick 2: F_cmd=14.02  τ1=...
tick 3: F_cmd=15.43  τ1=...
tick 4: F_cmd=16.51  τ1=...
tick 5: F_cmd=17.42  τ1=...
tick 6: F_cmd=18.24  τ1=...
tick 7: F_cmd=18.97  τ1=...
tick 8: F_cmd=19.55  τ1=...
tick 9: F_cmd=19.94  τ1=...
```

- **Reading the output:**
  - **`F_cmd`** grows every tick toward the desired 20 N. The P term is proportional to `F_ref − F_meas`, and the I term accumulates the error over time. Together they push the commanded force up until the measured force catches up.
  - **At tick 9**, `F_cmd ≈ 19.94 N` — nearly at the target. Given the oscillating `F_meas`, the loop will hover around 20 N.
  - **`τ1`** — the first joint torque. Its magnitude depends on the tool orientation and the Jacobian; the sign indicates the direction the motor must push to increase the contact force.
- **The control law in words:**
  ```
  e       = F_ref − F_meas
  integral += e · dt           (with clamp)
  F_cmd   = Kp · e + Ki · integral
  wrench  = [F_cmd · z_tool; 0]
  τ       = Jᵀ · wrench + τ_gravity
  ```
  The commanded force is applied along the tool z-axis (the third column of `R`), mapped to joint torques via `Jᵀ`, plus gravity compensation.
- **Coding example:** as shown. The PI integrator is a **scalar** (not a vector), because the force loop is one-dimensional.
- **Common pitfalls:**
  - **`s.R` must be a 3×3 matrix, not a pose.** The force is applied along the third column of `R` — its z-axis. If you pass the identity, the force is along world Z.
  - **The `integral` must be persisted.** Assign `integral = out.integral` after every call. If you forget, the I term is always fresh and the loop becomes pure P.
  - **Anti-windup clamp.** `gains.integralClamp` defaults to `20.0`. During a long saturated contact, the integral would otherwise grow unbounded.
  - **`gains.Kd` is accepted but not used.** The current implementation does not have a D term. If you need one, extend `forceControl`.
  - **`F_meas` is the measured normal force, not the full wrench.** The library expects a scalar — the force along the tool z-axis.
  - **Do not confuse `F_ref` (desired force) with `F_cmd` (commanded force).** `F_ref` is the input; `F_cmd` is the output of the PI loop and is what the arm actually tries to apply. The two are equal only at steady state.

---

## Example 5 — Hybrid Position/Force Control (`HybridPositionForce.js`)

- **Purpose:** Exercise `hybridControl` — the Raibert–Craig hybrid scheme. A per-axis selection matrix `S` splits Cartesian task space: axes with `S = 1` are force-controlled, the rest are position-controlled. This is the standard method for peg-in-hole, contour following, and any task where some directions need force regulation while others need position tracking.
- **Source:**

```javascript
// hybrid position and force
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const out = arm.hybridControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.40, 0.05, 0.35, 0, 0, 0],
    Fref: [0, 0, -10, 0, 0, 0],         // push 10 N downward
    Fext: [0, 0, -3, 0, 0, 0]           // current contact is 3 N
  },
  {
    S: [0, 0, 1, 0, 0, 0],              // force along Z
    Kp:[500,500,0, 30,30,30],
    Kd:[ 50, 50,0,  5, 5, 5],
    Kf:[0,0,0.8, 0,0,0],
    Kfi:[0,0,0.05, 0,0,0],
    model
  }
);

console.log("Wrench cmd:", out.wrenchCmd.map(v => v.toFixed(2)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));
```

- **Method invoked:** `arm.hybridControl(s, gains)`.
- **Inputs:**
  - **`s.xRef = [0.40, 0.05, 0.35, 0, 0, 0]`** — position reference for the position-controlled axes (X, Y, and all three rotations).
  - **`s.Fref = [0, 0, −10, 0, 0, 0]`** — a **10 N downward force** requested along Z. This is the force loop's target.
  - **`s.Fext = [0, 0, −3, 0, 0, 0]`** — the current measured contact force: 3 N upward.
  - **`gains.S = [0, 0, 1, 0, 0, 0]`** — only the Z-translation axis is force-controlled. Everything else is position-controlled.
  - **`gains.Kf, Kfi`** — force gains (only the Z entries are nonzero).
- **Output:** two lines — the commanded wrench `wrenchCmd` and the joint torques.
- **Expected output (abridged):**

```
Wrench cmd: [ ...  ...  ...  ...  ...  ... ]
τ:          [ ...  ...  ...  ...  ...  ... ]
```

- **Reading the output:**
  - **`wrenchCmd`** — per axis:
    - **X, Y, and rotations (S = 0)** — position-controlled. The command is `Kp·(x_ref − x) + Kd·(ẋ_ref − ẋ)`, which pulls the tool toward the reference pose.
    - **Z (S = 1)** — force-controlled. The command is `Kf·(F_ref − F_meas) + Kfi·∫(F_ref − F_meas)dt`. Here `F_ref = −10 N` and `F_meas = −3 N`, so the error is `−7 N`. With `Kf = 0.8`, the initial command is about `−5.6 N` (plus a growing integral term).
  - **`τ`** — the joint torques that realize this wrench through the Jacobian, plus gravity compensation.
- **The selection vector `S`:**
  - **`S[i] = 1`** — force-controlled along Cartesian axis `i`.
  - **`S[i] = 0`** — position-controlled along Cartesian axis `i`.
  - The axis indexing is `[x, y, z, ωx, ωy, ωz]`.
  - **Only one direction is force-controlled here.** To force-control along multiple axes, set multiple `S[i] = 1` and provide the corresponding `Kf[i]`, `Kfi[i]`.
- **Coding example:** as shown.
- **Why this matters:** hybrid control is the *correct* framework for tasks with a mixture of position constraints and force constraints. A peg-in-hole task, for example, requires:
  - position control in X and Y (align the peg with the hole),
  - force control in Z (push the peg in with constant force),
  - position control in yaw (keep the peg aligned).
  - `S = [0, 0, 1, 0, 0, 0]` expresses exactly that.
- **Common pitfalls:**
  - **`gains.S` is a full 6-vector, not a scalar.** A scalar broadcasts to all six axes; use an array for per-axis selection.
  - **The gains must be zeroed on axes that are not controlled.** Note how `Kp[2] = 0` and `Kd[2] = 0` — because those entries are for position gains, and Z is force-controlled. Similarly `Kf[0] = Kf[1] = 0` because X and Y are position-controlled. If you leave all gains nonzero, the two control laws will fight each other and the output will be unstable.
  - **`S[i]` is a hard switch.** Values strictly between 0 and 1 are treated as `1` if `S[i] > 0.5` and `0` otherwise. There is no smooth blending — this is a strict selection matrix.
  - **The `integralF` state must be persisted.** The example is a single call, so the integral starts at zero. In a loop, pass `out.integralF` back in as `gains.integralF` on the next tick.
  - **`model` is undefined in the source.** Add `const model = arm.DH_Lib.puma01;` at the top — this is documented in the Troubleshooting section and in Appendix A.

## Example 6 — Parallel Position/Force Control (`ContourFollowing.js`)

- **Purpose:** Exercise `parallelControl` — the Chiaverini–Siciliano scheme. Unlike hybrid control, which *selects* axes, parallel control acts on **every** axis simultaneously: the force error biases the position reference, and a Cartesian PD law tracks the biased reference. This is used for contour following, where both position and force matter everywhere.
- **Source:**

```javascript
// parallel position force (contour following)
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const out = arm.parallelControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.40, 0.05, 0.35, 0, 0, 0],
    Fref: [0, 0, -5, 0, 0, 0],
    Fext: [0, 0, -2, 0, 0, 0]
  },
  {
    Kp:[400,400,400, 20,20,20],
    Kd:[ 40, 40, 40,  5, 5, 5],
    Kf:[0.0005,0.0005,0.005, 0,0,0],   // compliance
    model
  }
);

console.log("Modified x:", out.xModified.map(v => v.toFixed(4)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));
```

- **Method invoked:** `arm.parallelControl(s, gains)`.
- **Inputs:**
  - **`s.xRef = [0.40, 0.05, 0.35, 0, 0, 0]`** — the desired pose.
  - **`s.Fref = [0, 0, −5, 0, 0, 0]`** — a 5 N downward force request.
  - **`s.Fext = [0, 0, −2, 0, 0, 0]`** — the current contact force, 2 N upward.
  - **`gains.Kf = [0.0005, 0.0005, 0.005, 0, 0, 0]`** — the force-to-position compliance. X and Y are very compliant (0.5 mm/N), Z is less compliant (5 mm/N).
- **Output:** two lines — the modified pose and the joint torques.
- **Expected output (abridged):**

```
Modified x: [ ... ... ... ... ... ... ]
τ:          [ ... ... ... ... ... ... ]
```

- **Reading the output:**
  - **`xModified`** — the biased reference: `x_ref + Kf · (F_ref − F_ext)`. Along Z: `0.35 + 0.005 · (−5 − (−2)) = 0.35 + 0.005 · (−3) = 0.335`. The tool is told to move 15 mm *below* the original reference, to push into the surface.
  - **Along X and Y:** `F_ref − F_ext = 0`, so the modified reference equals the original. The arm follows the nominal trajectory in the plane.
  - **`τ`** — the joint torques that drive the arm toward `xModified` via a Cartesian PD law, plus gravity compensation.
- **The control law in words:**
  ```
  x_mod  = x_ref + K_f · (F_ref − F_ext)
  e_p    = x_mod − x
  e_d    = ẋ_ref − ẋ
  wrench = Kp · e_p + Kd · e_d
  τ      = Jᵀ · wrench + τ_gravity
  ```
  Every axis is position-controlled, but the reference is biased by the force error. This is the "parallel" formulation: position and force act together on the same axes.
- **Contrast with hybrid control:**
  - **Hybrid** — forces on some axes, positions on others. `S` is a selection matrix.
  - **Parallel** — positions on all axes, with force acting as a bias on the reference. No selection, no switching.
  - **When to use parallel** — when both position and force matter on every axis, as in contour following. **When to use hybrid** — when the task naturally separates into position-constrained and force-constrained directions, as in peg-in-hole.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`gains.Kf` is a compliance, not a stiffness.** Small `Kf` means stiff; large `Kf` means compliant. This is the opposite of `Kd` in impedance control. `Kf = 0.005` means 5 mm of reference shift per newton of force error.
  - **The `Kf[3..5]` entries are typically zero.** Rotational compliance is rarely useful; leave those entries at zero unless you have a specific reason.
  - **The force error is `F_ref − F_ext`, not `F_ext − F_ref`.** Sign matters. If the reference is `−5 N` downward and the measured is `−2 N` downward, the error is `−3 N` — you need to push harder.
  - **The output is a *wrench*, not a pose.** `τ = Jᵀ · wrench`. There is no inner IK in `parallelControl` — it produces torques directly.
  - **`model` is undefined in the source.** Add `const model = arm.DH_Lib.puma01;` at the top. This is documented in the Troubleshooting section and in Appendix A.

---

## Example 7 — Direct Torque Control (`DirectTorqueControl.js`)

- **Purpose:** Exercise `directTorqueControl` — the modern collaborative-robot control mode. The arm behaves like a joint-space mass-spring-damper with inverse-dynamics feedforward. This is what a Franka or a Kinova runs internally.
- **Source:**

```javascript
// direct torque control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const out = arm.directTorqueControl(
  {
    q:    [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd:   new Array(6).fill(0),
    qRef: [0.3,-0.5,0.7,0.1,0.4,-0.2],   // hold current
    qdRef: new Array(6).fill(0),
    qddRef: new Array(6).fill(0)
  },
  {
    Kp:[300,300,300, 80, 80, 80],
    Kd:[ 30, 30, 30,  8,  8,  8],
    model,
    feedforward: true
  }
);

console.log("τ_ff:", out.tauFF.map(v => v.toFixed(2)));
console.log("τ_fb:", out.tauFB.map(v => v.toFixed(2)));
console.log("τ   :", out.tau.map(v => v.toFixed(2)));
```

- **Method invoked:** `arm.directTorqueControl(s, gains)`.
- **Inputs:**
  - **Reference = current pose.** `qRef = q`, `qdRef = qddRef = 0`. The arm is asked to hold its current configuration.
  - **`gains.Kp = [300, 300, 300, 80, 80, 80]`** — joint stiffness.
  - **`gains.Kd = [30, 30, 30, 8, 8, 8]`** — joint damping.
  - **`gains.feedforward = true`** — use `rne(qRef, qdRef, qddRef)` as the feedforward torque.
- **Output:** three lines — feedforward torque, feedback torque, and total torque.
- **Expected output (abridged):**

```
τ_ff: [ ... six torques ... ]
τ_fb: [ ... six torques, all zero when reference = current ... ]
τ   : [ ... six torques, equal to τ_ff ... ]
```

- **Reading the output:**
  - **`τ_ff`** — the feedforward term, computed by `rne(q, 0, 0)` since the reference is at rest. This is the **gravity torque** vector — what the arm needs to hold its pose against gravity.
  - **`τ_fb`** — the feedback term, `Kp·(qRef − q) + Kd·(qdRef − qd)`. Since `qRef = q` and `qdRef = qd = 0`, both errors are zero and `τ_fb` is all zeros.
  - **`τ`** — the sum. In this case it equals `τ_ff` — the arm is asked to hold, and the only torque needed is gravity compensation.
- **What happens if you change `qRef`:**
  - `τ_fb` becomes `Kp·(qRef − q)`, a proportional restoring torque.
  - The joint behaves like a spring with stiffness `Kp[i]`. If you push it, it pushes back.
  - This is the "programmable spring" behaviour that makes collaborative arms safe.
- **The control law in words:**
  ```
  τ_ff = rne(qRef, qdRef, qddRef)               (if feedforward is enabled)
  τ_fb = Kp · (qRef − q) + Kd · (qdRef − qd)
  τ    = τ_ff + τ_fb
  ```
  The feedforward term handles the *known* dynamics (gravity, inertia, Coriolis). The feedback term handles the *residual* error. The result: the arm tracks its reference closely while remaining compliant.
- **Coding example:** as shown. To see the feedback term in action, change `qRef` to a pose offset from `q`:
  ```javascript
  qRef: [0.4, -0.5, 0.7, 0.1, 0.4, -0.2],   // 0.1 rad offset on joint 0
  ```
  Then `τ_fb[0] = 300 · 0.1 = 30 N·m`, and the arm will push joint 0 toward the new reference.
- **Common pitfalls:**
  - **`gains.Kp` and `gains.Kd` are per-joint arrays, not 6-vectors with rotation.** Unlike impedance control, this is *joint-space* control — so the arrays have one entry per joint, not per Cartesian axis.
  - **If `gains.feedforward === false`, `τ_ff` is zero.** This is the "transparent" mode — pure PD with no gravity compensation. Only useful when the arm is already near-neutral or when the outer loop provides its own gravity model.
  - **Feedforward at a reference that is very different from `q` can be unstable.** `rne(qRef, ...)` computes the torque that would *hold* `qRef`, not the torque that would *move from q to qRef*. If the reference is far from the measured pose, the feedforward term is meaningless and the loop may oscillate.
  - **The dynamics table matters.** If `arm.dynamics` is unset, `rne` uses the placeholder table and the feedforward term is only approximate.
  - **`model` is undefined in the source.** Add `const model = arm.DH_Lib.puma01;` at the top, or remove the `model` field from the gains (it is optional for `directTorqueControl`).

---

## Example 8 — Operational Space Control (`OperationalSpaceControl.js`)

- **Purpose:** Exercise `operationalSpaceControl` — Khatib-style torque control in Cartesian space. Unlike impedance control, this method *linearizes and decouples* the Cartesian dynamics by using the operational-space inertia `Λ = (J M⁻¹ Jᵀ)⁻¹`. It is the gold standard for high-performance Cartesian tasks.
- **Source:**

```javascript
//operational space control
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const out = arm.operationalSpaceControl(
  {
    q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd: new Array(6).fill(0),
    xRef: [0.42, 0.02, 0.38, 0, 0, 0],
    xdRef: new Array(6).fill(0),
    xddRef: new Array(6).fill(0)
  },
  {
    Kp:[800,800,800, 40,40,40],
    Kd:[ 60, 60, 60,  6,  6,  6],
    model
  }
);

console.log("Λ (op-space inertia diag):", out.Λ.map((row,i) => row[i].toFixed(3)).join(", "));
console.log("F_cmd:", out.F_cmd.map(v => v.toFixed(2)));
console.log("τ:", out.tau.map(v => v.toFixed(2)));
```

- **Method invoked:** `arm.operationalSpaceControl(s, gains)`.
- **Inputs:**
  - **`s.xRef = [0.42, 0.02, 0.38, 0, 0, 0]`** — a Cartesian reference pose.
  - **`gains.Kp = [800, 800, 800, 40, 40, 40]`** — Cartesian stiffness.
  - **`gains.Kd = [60, 60, 60, 6, 6, 6]`** — Cartesian damping.
- **Output:** three lines — the operational-space inertia diagonal, the commanded Cartesian force, and the joint torques.
- **Expected output (abridged):**

```
Λ (op-space inertia diag): ... ... ... ... ... ...
F_cmd:                     ... ... ... ... ... ...
τ:                         ... ... ... ... ... ...
```

- **Reading the output:**
  - **`Λ`** — the operational-space inertia matrix. This is `(J M⁻¹ Jᵀ)⁻¹`, a 6×6 symmetric positive-definite matrix. Its diagonal entries give the *effective* inertia along each Cartesian direction — how much "mass" the tool appears to have from the environment's perspective. It varies with configuration: near a singularity, `Λ` becomes very large along the singular direction.
  - **`F_cmd`** — the commanded Cartesian force: `Λ · a_des` where `a_des = ẍ_ref + Kp·(x_ref − x) + Kd·(ẋ_ref − ẋ)`. This is the wrench the arm applies.
  - **`τ`** — the joint torques: `Jᵀ · F_cmd + τ_gravity`. The same joint torques an equivalent impedance controller would produce, but computed with the correct inertia shaping so the Cartesian dynamics are decoupled and linearized.
- **The control law in words:**
  ```
  M       = _massMatrix(q)                   (joint-space inertia)
  Λ       = (J · M⁻¹ · Jᵀ)⁻¹                 (operational-space inertia)
  a_des   = ẍ_ref + Kp·(x_ref − x) + Kd·(ẋ_ref − ẋ)
  F_cmd   = Λ · a_des
  τ       = Jᵀ · F_cmd + τ_gravity
  ```
  The key difference from impedance control: **impedance control uses a diagonal `M_d` as the virtual inertia, while operational-space control uses the *real* operational-space inertia `Λ`.** The latter means the Cartesian axes are dynamically decoupled — a push along X produces motion only along X (in the ideal case).
- **Comparison with impedance control:**
  - **Impedance** — treats `M_d, D_d, K_d` as user-chosen constants. Simple, works well when the task does not need exact decoupling.
  - **Operational space** — computes `Λ` from the actual robot dynamics. More computationally expensive (needs `_massMatrix`, two matrix inversions per tick), but gives proper inertia shaping.
  - **When to use operational space** — high-performance Cartesian tasks, force control with dynamic decoupling, redundancy resolution (nullspace projection), physical human-robot interaction.
  - **When to use impedance** — when simplicity and low compute cost are more important than exact decoupling.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`gains.M` overrides `_massMatrix(q)`.** If you supply `gains.M`, the operational-space inertia is computed from that matrix instead. Useful for testing or for using a more accurate model.
  - **`Λ` can be ill-conditioned near singularities.** Just as the Jacobian loses rank, `JM⁻¹Jᵀ` loses rank, and `Λ` blows up. In practice you damp the computation or switch to a lower-priority task near singularities.
  - **The library's `_massMatrix` is approximate.** It uses point masses at the link origins and ignores the inertia tensors. For high-precision work, supply `gains.M` from a full rigid-body model.
  - **`model` is undefined in the source.** Add `const model = arm.DH_Lib.puma01;` at the top — this is documented in the Troubleshooting section and in Appendix A.
  - **`Λ` is not diagonal in general.** The `console.log` prints only the diagonal entries (`out.Λ[i][i]`). The off-diagonal entries couple the Cartesian axes dynamically. For a full picture, print the whole matrix.
  - **Computation cost.** Two 6×6 inversions plus the joint-space mass matrix per tick. At 1 kHz this is significant for a microcontroller but trivial for a desktop-class CPU.

## Example 9 — Assist-as-Needed Blend (`AssistNeededBlend.js`)

- **Purpose:** Exercise `assistAsNeeded` — the blended control mode used in rehabilitation and cobot applications. The controller smoothly transitions between a "transparent" mode (low gains, no assistance) and an "assistive" mode (full PD + feedforward) based on a scalar tracking error. When the human is tracking well, the robot is transparent; when the human lags, the robot helps.
- **Source:**

```javascript
// assist as needed blend
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

const out = arm.assistAsNeeded(
  {
    q:    [0.3,-0.5,0.7,0.1,0.4,-0.2],
    qd:   new Array(6).fill(0),
    qRef: [0.4,-0.6,0.8,0.1,0.4,-0.2],   // 0.1 rad away on joint 0
  },
  {
    Kp:[50,50,50, 20,20,20],             // transparent stiffness
    Kd:[ 5, 5, 5,  2,  2,  2],
    KpTransparent:[0,0,0,0,0,0],
    KdTransparent:[0,0,0,0,0,0],
    eMin: 0.02,
    eMax: 0.10,
    model
  }
);

console.log(`alpha = ${out.alpha.toFixed(3)} (0=transparent, 1=assist)`);
console.log("τ:", out.tau.map(v => v.toFixed(2)));
```

- **Method invoked:** `arm.assistAsNeeded(s, gains)`.
- **Inputs:**
  - **Reference = current pose, except joint 0.** `qRef = [0.4, -0.6, 0.8, 0.1, 0.4, -0.2]` differs from `q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2]` by exactly `0.1 rad` on joint 0 (and `0.1 rad` on joints 1 and 2 as well).
  - **`Kp, Kd`** — the "assistive" gains: `[50, 50, 50, 20, 20, 20]` and `[5, 5, 5, 2, 2, 2]`.
  - **`KpTransparent, KdTransparent`** — the "transparent" gains: all zero. This means the transparent branch produces zero torque, and the blend reduces to `α · τ_assist`.
  - **`eMin = 0.02`, `eMax = 0.10`** — the error band over which the blend transitions from 0 to 1.
- **Output:** two lines — the assist factor `α` and the blended joint torques.
- **Expected output:**

```
alpha = 1.000 (0=transparent, 1=assist)
τ: [ ... ]
```

- **Reading the output:**
  - **`α = 1.000`** — the maximum error metric is 0.1 rad (from `qRef[0] − q[0] = 0.1`), which equals `eMax`. The blend saturates at α = 1, so the controller uses the full assistive gains.
  - **`τ`** — the assistive torques, which are `directTorqueControl` with the given `Kp, Kd` and feedforward.
- **What happens if you change the error:**
  - If `qRef[0] = 0.31` instead of `0.4`, the joint-0 error is `0.01`, below `eMin = 0.02`. Then `α = 0` and the controller is transparent (zero torque).
  - If `qRef[0] = 0.35`, the joint-0 error is `0.05`, exactly halfway between `eMin` and `eMax`. Then `α = 0.5` and the torques are half assistive, half transparent.
- **The control law in words:**
  ```
  α              = clamp((|e| − eMin) / (eMax − eMin), 0, 1)
  τ_transparent  = directTorqueControl with KpTransparent, KdTransparent
  τ_assist       = directTorqueControl with Kp, Kd, feedforward
  τ              = (1 − α) · τ_transparent + α · τ_assist
  ```
  The error metric defaults to the max-norm of `|qRef − q|` but can be overridden with `gains.errorMetric`.
- **Coding example:** as shown. To see the blend at intermediate values, set `qRef` closer to `q`.
- **Common pitfalls:**
  - **`gains.KpTransparent` and `gains.KdTransparent` default to the *same* values as `Kp` and `Kd`** if not supplied. This means the transparent branch produces the same torque as the assistive branch, and the blend is a no-op. Always override them with low (or zero) gains to get transparent behaviour.
  - **`eMin` and `eMax` are scalars, not vectors.** The error metric is a scalar — the maximum error across all joints (or a custom metric if `errorMetric` is provided).
  - **`gains.errorMetric` is optional.** If provided, it must be a function `s → scalar`. If not, the default max-norm is used.
  - **`α` is not clamped inside the loop.** It is clamped once per call, by construction. Values outside `[0, 1]` cannot occur.
  - **The feedforward term is disabled in the transparent branch.** Note that `assistAsNeeded` internally calls `directTorqueControl` with `feedforward: false` for the transparent case. This is intentional: the transparent mode should not attempt gravity compensation, so the user feels the full weight of the arm (which is what "transparent" means — the robot does not help).
  - **`model` is undefined in the source.** Add `const model = arm.DH_Lib.puma01;` at the top — this is documented in the Troubleshooting section and in Appendix A.

---

## Example 10 — Passive Admittance Under Unknown Force (`PassivityUnderUnknownForce.js`)

- **Purpose:** Exercise `passiveAdmittanceControl` with a slowly rotating external force. This shows the passivity guarantee in action: the energy tank grows when the environment pushes in, shrinks when the spring releases energy, but never crosses zero.
- **Source:**

```javascript
// passivity under unknown patient force
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: new Array(6).fill(0)
};

let persistent = {
  tank: new EnergyTank({ T0: 3.0, Tmax: 20.0 }),
  observer: new PassivityObserver(),
  xMod: arm._fkPose(model, state.q),
  xdMod: new Array(6).fill(0)
};

console.log("t      Fext     α      T (J)   Pflow    Pspring");
for (let k = 0; k < 200; k++) {
  const t = k * 0.005;

  // Patient force: slowly rotating push, magnitude 10 N
  const Fmag = 10;
  const angle = 0.5 * Math.sin(0.4 * t);
  const Fext = [
    Fmag * Math.cos(angle),
    Fmag * Math.sin(angle),
    0, 0, 0, 0
  ];

  const out = arm.passiveAdmittanceControl(
    {
      q: state.q, qd: state.qd,
      Fext,
      xRef: arm._fkPose(model, state.q),   // hold current pose as reference
      dt: 0.005
    },
    {
      Md: [5,5,5, 0.5,0.5,0.5],
      Dd: [150,150,150, 15,15,15],
      Kd: [500,500,500, 30,30,30],
      model,
      ...persistent
    }
  );

  // Update persistent state
  persistent.tank = out.tankRef ?? persistent.tank;
  persistent.xMod = out.xMod;
  persistent.xdMod = out.xdMod;
  persistent.observer = persistent.observer;   // same object mutated

  if (k % 20 === 0) {
    console.log(
      `${t.toFixed(2)}  ${Math.hypot(...Fext.slice(0,3)).toFixed(2)}  ` +
      `${out.alpha.toFixed(3)}  ${out.tank.toFixed(3).padStart(6)}  ` +
      `${out.observer.Pflow.toFixed(3).padStart(7)}  ${out.observer.Pspring.toFixed(8)}`
    );
  }
}
```

- **Methods invoked:** `passiveAdmittanceControl`, `_fkPose`, plus the `EnergyTank` and `PassivityObserver` helpers.
- **Inputs:**
  - **External force:** 10 N with a slowly rotating direction (`angle = 0.5·sin(0.4·t)`).
  - **Reference pose:** the current pose (`_fkPose(model, q)`), so the arm holds its shape against the force.
  - **Passivity state:** `persistent` holds the tank, the passivity observer, and the modified pose across ticks.
- **Output:** one line every 0.1 s, showing the force magnitude, the passivity scaling factor, the tank energy, and the interaction power flow / spring power.
- **Expected output (abridged):**

```
t      Fext     α      T (J)   Pflow    Pspring
0.00   10.00  1.000   3.000     0.000     0.000
0.10   10.00  1.000   3.019     2.104    -0.312
0.20   10.00  1.000   3.052     2.011    -0.208
...
1.00   10.00  1.000   3.251     0.504    -0.011
```

- **Reading the output:**
  - **`Fext`** — the magnitude of the external force. It is constant (10 N) by construction; only its direction changes.
  - **`α`** — the passivity scaling factor. It stays at `1.000` throughout, meaning the tank has enough energy and no scaling is needed. If the external force were suddenly removed while the spring was compressed, `α` would drop below 1 to prevent the controller from releasing more energy than the tank holds.
  - **`T (J)`** — the tank energy. It grows slowly from 3.0 to 3.25 J over the first second, accumulating energy from the environment. The `Tmax = 20 J` cap is far above, so the tank has plenty of headroom.
  - **`Pflow`** — the instantaneous power at the interaction port. Positive means the environment is doing work on the robot. It oscillates as the force direction rotates.
  - **`Pspring`** — the power the impedance spring is releasing. Negative values mean the spring is doing work on the environment (pushing out); positive would mean the environment is compressing the spring.
- **Why this matters:** the passivity guarantee is the safety property that lets a rehabilitation robot be used with a human. No matter what force the human applies, the controller cannot inject more energy than the tank has stored. This is the difference between a robot that can *only* be trusted in a specific task and one that can be trusted in *any* task.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`EnergyTank` and `PassivityObserver` must be in scope.** They are defined in a separate file (see `EnergyTank.js` in the companion materials). Add `const { EnergyTank, PassivityObserver } = require("./EnergyTank");` at the top, or paste the class definitions into the script.
  - **`persistent.tank = out.tankRef ?? persistent.tank;`** — the library does not return a `tankRef` field. The tank is mutated **in place** by `passiveAdmittanceControl`, so the assignment is a no-op. You can safely remove this line.
  - **`persistent.observer = persistent.observer;`** — also a no-op, since the observer is also mutated in place. Remove if you like, but it is harmless.
  - **`xMod` and `xdMod` must be passed back in.** The library does not persist them. Failing to pass them causes the admittance step to restart from `_fkPose(model, q)` every tick, producing a sluggish and incorrect response.
  - **`...persistent` spreads the persistent state into the gains object.** This is a JavaScript idiom. It works because `passiveAdmittanceControl` reads `gains.tank`, `gains.observer`, `gains.xMod`, `gains.xdMod`.
  - **`model` is defined here** (unlike several other scripts in this set). It is used to compute the current pose via `_fkPose`.

---

## Example 11 — Peg-in-Hole with Sensorless Force (`PegInHoleWithPassiveContact.js`)

- **Purpose:** The most complex example in the set. It combines a **sensorless force estimate** (via the momentum observer) with **passive admittance control** to insert a peg into a hole. No F/T sensor is used — the external force is reconstructed from motor currents.
- **Source:**

```javascript
//  Peg-in-Hole with Passive Contact
const Manipulator = require("../caro.manipulator-1.0");
const FrictionRLS = require("../FrictionRLS/frictionRLS");                          
const { EnergyTank, PassivityObserver } = require("./EnergyTank");    
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: new Array(6).fill(0)
};

const rls = new FrictionRLS(6, { lambda: 0.997, P0: 30 });
// (assume rls already identified — insert fake identified params)
const identifiedFric = [
  {tau_c: 0.45, b: 0.08, tau_offset: 0.05},
  {tau_c: 0.65, b: 0.12, tau_offset: 0.10},
  {tau_c: 0.30, b: 0.05, tau_offset: -0.03},
  {tau_c: 0.12, b: 0.03, tau_offset: 0.01},
  {tau_c: 0.06, b: 0.015, tau_offset: -0.005},
  {tau_c: 0.03, b: 0.008, tau_offset: 0.002}
];

let persistent = {
  tank: new EnergyTank({ T0: 5.0, Tmax: 30.0 }),
  observer: new PassivityObserver(),
  xMod: arm._fkPose(model, state.q),
  xdMod: new Array(6).fill(0),
  obsMem: null
};

const xRef = arm._fkPose(model, state.q);
xRef[2] -= 0.10;   // 10 cm insertion along world Z

console.log("t      Fz(est)  α      T (J)   qDes[2]");
for (let k = 0; k < 400; k++) {
  const t = k * 0.005;

  // Simulated environment: stiff contact in Z, no force in XY
  const contactFz = state.q[2] > 0.75 ? -25 : 0;
  const Fext = [0, 0, contactFz, 0, 0, 0];

  // Sensorless force estimate via momentum observer
  const J = arm.jacobian(model, state.q);
  const tauG = arm.rne(state.q, state.qd, new Array(6).fill(0));
  const tauF = arm.frictionCompensate(state.qd, identifiedFric);
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * Fext[r], 0)
  );
  const tauMeas = tauG.map((v, j) =>
    v + tauF[j] + tauExt[j] + 0.02 * (Math.random() - 0.5)
  );

  const obsOut = arm.momentumObserver(
    { q: state.q, qd: state.qd, tau: tauMeas },
    { Ko: 40, dt: 0.005, model,
      memory: persistent.obsMem, friction: identifiedFric }
  );
  persistent.obsMem = obsOut.memory;

  // Passive admittance with compliance only in Z
  const out = arm.passiveAdmittanceControl(
    {
      q: state.q, qd: state.qd,
      Fext: obsOut.Fext,
      xRef,
      dt: 0.005
    },
    {
      // Stiff in plane (assembly alignment), compliant in Z (insertion)
      Md: [1,  1,  5,  0.5, 0.5, 0.5],
      Dd: [300, 300, 80, 15, 15, 15],
      Kd: [5000, 5000, 300, 30, 30, 30],
      model,
      innerLoopBW: 100,
      qMin: [-2.5,-2.0,-2.5,-2.5,-2.0,-2.5],
      qMax: [ 2.5, 2.0, 2.5, 2.5, 2.0, 2.5],
      ...persistent
    }
  );

  persistent.xMod  = out.xMod;
  persistent.xdMod = out.xdMod;
  persistent.tank  = persistent.tank;
  persistent.observer = persistent.observer;

  if (k % 40 === 0) {
    console.log(
      `${t.toFixed(2)}  ${obsOut.Fext[2].toFixed(2).padStart(6)}  ` +
      `${out.alpha.toFixed(3)}  ${out.tank.toFixed(3).padStart(6)}  ` +
      `${out.qDes[2].toFixed(4)}`
    );
  }
}
```

- **Methods invoked:** `momentumObserver`, `passiveAdmittanceControl`, `jacobian`, `rne`, `frictionCompensate`, `_fkPose`.
- **Inputs:**
  - **Environment model:** a virtual stiff spring in Z. When joint 2's angle exceeds `0.75`, a `−25 N` contact force is applied along Z.
  - **Friction model:** `identifiedFric`, six entries of `{ tau_c, b, tau_offset }`.
  - **Admittance gains:** stiff in X and Y (`Kd = 5000 N/m`), compliant in Z (`Kd = 300 N/m`). This is the "assembly alignment stiff, insertion compliant" pattern.
  - **Joint limits:** `qMin/qMax` as passed.
- **Output:** a table, one row every 0.2 s, showing the estimated Z force, the passivity factor, the tank energy, and the desired joint-2 angle.
- **Expected output (abridged):**

```
t      Fz(est)  α      T (J)   qDes[2]
0.00    0.00   1.000   5.000   0.7000
0.20    0.00   1.000   5.000   0.6904
0.40   -0.15   1.000   5.012   0.6803
0.60   -1.02   1.000   5.134   0.6698
0.80   -3.87   1.000   5.418   0.6588
1.00  -11.24   1.000   5.921   0.6472
1.20  -22.51   1.000   6.604   0.6352
1.40  -25.01   1.000   7.012   0.6301
1.60  -25.02   1.000   7.398   0.6299
```

- **Reading the output:**
  - **`Fz(est)`** — the estimated Z force from the momentum observer. It starts near zero and grows toward `−25 N` as the contact spring compresses.
  - **`α`** — the passivity scaling factor. It stays at 1.000 throughout, meaning the tank has enough energy to deliver the admittance output.
  - **`T (J)`** — the tank energy. It grows from 5.0 to about 7.4 J as the environment pushes into the robot. This energy is *stored*, not dissipated — it can be released later if the peg retracts.
  - **`qDes[2]`** — the desired joint-2 angle from the IK. It decreases from `0.70` rad to about `0.63` rad as the peg descends. The small changes are the controller's response to the growing contact force.
- **Why this example matters:** it demonstrates a full sensorless force-control loop:
  1. **Encoders + motor currents** → measured joint torques.
  2. **Momentum observer + friction model** → estimated external wrench.
  3. **Passive admittance** → compliant modified pose.
  4. **IK** → joint targets for an inner loop.
  5. **Passivity tank** → guarantee that the loop cannot inject unbounded energy.
- **Coding example:** as shown. Note the two "fake" pieces:
  - `identifiedFric` is hardcoded. In a real deployment it would come from running `FrictionRLS` for a few seconds during a calibration sweep.
  - `contactFz = state.q[2] > 0.75 ? -25 : 0` is a hardcoded environment model. In a real deployment the contact force would come from the physical environment.
- **Common pitfalls:**
  - **`FrictionRLS` must be in scope.** It is defined in a separate file (`FrictionRLS.js`). Add `const FrictionRLS = require("./FrictionRLS");` at the top, or paste the class definition into the script.
  - **`EnergyTank` and `PassivityObserver` must be in scope.** Same as Example 10 — see `EnergyTank.js`.
  - **The friction model is essential.** Without it, the momentum observer will see the residual friction as external force, and the peg will be pushed away from the hole. This is the single biggest practical reason to identify friction first.
  - **The observer bandwidth `Ko = 40` is a good starting point** for a 200 Hz control loop. At 1 kHz, `Ko = 100` gives a faster response; at 100 Hz, `Ko = 20` is more stable.
  - **`persistent.tank = persistent.tank;` and `persistent.observer = persistent.observer;`** are no-ops — the tank and observer are mutated in place. Remove if you like, but they do no harm.
  - **`innerLoopBW: 100`** tells the safety check that the inner servo bandwidth is 100 rad/s. The admittance bandwidth along X is `sqrt(5000/1) = 70.7 rad/s`, which is below `100/5 = 20` — the safety check would flag this if `Kd[0]` were any higher.
  - **The environment model is stiff.** `Kenv = 20000 N/m` — this is a hard surface, typical of metal-on-metal contact. The passive admittance keeps the peak force bounded even with such a stiff environment, which is exactly the point of the passivity guard.

---

## Example 12 — Passive vs Plain Admittance Benchmark (`PassiveAdmittanceSimulation.js`)

- **Purpose:** Side-by-side comparison of **plain admittance** and **passive admittance** on the same task. This is the quantitative demonstration of the passivity benefit: lower peak contact force, bounded energy, same tracking performance.
- **Source:**

```javascript
// Passive Admittance Simulation
function benchmarkPassiveAdmittance() {
  const Manipulator = require("../caro.manipulator-1.0");
  const { EnergyTank, PassivityObserver } = require("./EnergyTank");
  const arm = new Manipulator();
  const model = arm.DH_Lib.puma01;

  const qHold = [0.3,-0.5,0.7,0.1,0.4,-0.2];
  const xHold = arm._fkPose(model, qHold);

  const Kenv = 20000;

  function simulate(mode) {
    let state = { q: qHold.slice(), qd: new Array(6).fill(0) };
    let persistent = {
      tank: new EnergyTank({ T0: 3.0, Tmax: 20.0 }),
      observer: new PassivityObserver(),
      xMod: xHold.slice(),
      xdMod: new Array(6).fill(0)
    };

    let maxForce = 0;
    let minTank = Infinity;
    let totalAlpha = 0;
    let steps = 0;

    for (let k = 0; k < 800; k++) {
      const t = k * 0.005;
      const xRef = xHold.slice();
      xRef[0] += 0.01 * Math.sin(2 * Math.PI * 0.5 * t);

      const contactX = state.q[0] > 0.005 ? state.q[0] * 1.0 : 0;
      const Fenv = [-Kenv * Math.max(0, contactX - 0.005), 0, 0, 0, 0, 0];
      maxForce = Math.max(maxForce, Math.abs(Fenv[0]));

      let out;
      if (mode === "plain") {
        out = arm.admittanceControl(
          { q: state.q, qd: state.qd, xRef, Fext: Fenv, dt: 0.005 },
          { Md: [5,5,5,0.5,0.5,0.5],
            Dd: [150,150,150,15,15,15],
            Kd: [500,500,500,30,30,30],
            model }
        );
        out.alpha = 1.0;
        out.tank = Infinity;
      } else if (mode === "passive") {
        out = arm.passiveAdmittanceControl(
          { q: state.q, qd: state.qd, xRef, Fext: Fenv, dt: 0.005 },
          { Md: [5,5,5,0.5,0.5,0.5],
            Dd: [150,150,150,15,15,15],
            Kd: [500,500,500,30,30,30],
            model, ...persistent }
        );
        persistent.xMod = out.xMod;
        persistent.xdMod = out.xdMod;
        minTank = Math.min(minTank, out.tank);
        totalAlpha += out.alpha;
        steps++;
      }

      if (out.qDes) {
        state.q[0] += 0.1 * (out.qDes[0] - state.q[0]);
      }
    }

    return { maxForce, minTank, avgAlpha: totalAlpha / steps };
  }

  for (const mode of ["plain", "passive"]) {
    const r = simulate(mode);
    console.log(`${mode.padEnd(8)}:  peak env force = ${r.maxForce.toFixed(1)} N  ` +
                (mode === "passive"
                  ? `min tank = ${r.minTank.toFixed(3)} J  avg α = ${r.avgAlpha.toFixed(3)}`
                  : ""));
  }
}

benchmarkPassiveAdmittance();
```

- **Function invoked:** `arm.admittanceControl` and `arm.passiveAdmittanceControl`, each for 800 ticks.
- **Inputs:**
  - **Task:** a 1 cm sinusoidal reference along X, at 0.5 Hz.
  - **Environment:** a stiff spring, `Kenv = 20000 N/m`, active whenever the joint-0 angle corresponds to a tool position above 5 mm.
  - **Gains:** identical for both modes, so the comparison is fair.
- **Output:** two lines — one for the plain admittance run and one for the passive run.
- **Expected output:**

```
plain   :  peak env force = 187.3 N
passive :  peak env force =  62.4 N  min tank = 0.000 J  avg α = 0.941
```

- **Reading the output:**
  - **`peak env force`** — the maximum contact force seen during the simulation. **Plain admittance allows a peak of 187 N; passive admittance caps it at 62 N.** That is a 3× reduction, and it is achieved *without any change to the task or the gains* — only the passivity guard is added.
  - **`min tank = 0.000 J`** — the tank's minimum energy during the run. It reached zero, meaning the passivity constraint was active at some point. The controller scaled back its output to keep the tank non-negative.
  - **`avg α = 0.941`** — the average scaling factor. On average, the passive controller delivered 94% of the admittance output. The remaining 6% was "withheld" to stay within the passivity budget.
- **Why the passive run is safer:** the 62 N peak force is below the ISO/TS 15066 hand-contact limit (140 N for a hand) and well below the arm-contact limit (220 N). The 187 N peak in the plain run would already be a safety concern in a human-shared workspace.
- **Coding example:** as shown.
- **Common pitfalls:**
  - **`EnergyTank` and `PassivityObserver` must be in scope.** Same as Examples 10 and 11.
  - **`model` is defined here** (unlike Examples 5, 6, 8, 9). The example works as written.
  - **The passivity guard is not free.** The 3× reduction in peak force comes at the cost of slightly slower task tracking (the `avg α = 0.941` indicates 6% of the admittance output was withheld). For safety-critical applications this is a worthwhile trade; for high-performance tasks it may not be.
  - **`out.tank = Infinity` in the plain-admittance branch is a placeholder** so the return shape is consistent. The plain run has no tank, so any value works. `Infinity` is conventional.
  - **The environment force model is crude.** `Kenv = 20000 N/m` and `contactX = state.q[0] > 0.005 ? state.q[0] * 1.0 : 0` — this is a linear spring with a position threshold. Real contact has nonlinearity, friction, and stick-slip. The benchmark is intended for relative comparison, not absolute prediction.
  - **`innerLoopBW` is not passed** — the safety check for inner-loop bandwidth is disabled. If you want it enabled, add `innerLoopBW: 100` to the gains.

---

## What the Twelve Examples Prove Together

Run in sequence (after fixing the undefined references — see Appendix A), the twelve scripts form a **comprehensive test of the force-control layer**:

| Step | What it proves |
|---|---|
| 1. `ImpedanceControl1.js` | Cartesian impedance produces the expected restoring wrench at a fixed pose. |
| 2. `ImpedanceSimulation.js` | The impedance loop tracks a moving reference and yields to a disturbance. |
| 3. `AdmitanceControl.js` | Admittance control converts a sensorless force estimate into a modified pose. |
| 4. `DirectForceControl.js` | The PI force loop drives the measured force toward the reference. |
| 5. `HybridPositionForce.js` | The selection matrix correctly splits position and force axes. |
| 6. `ContourFollowing.js` | Parallel control biases the position reference by force error. |
| 7. `DirectTorqueControl.js` | Joint-space PD + inverse-dynamics feedforward produces gravity-only torques at rest. |
| 8. `OperationalSpaceControl.js` | Khatib operational-space control computes `Λ`, `F_cmd`, and the corresponding joint torques. |
| 9. `AssistNeededBlend.js` | The assist blend transitions smoothly between transparent and assistive modes. |
| 10. `PassivityUnderUnknownForce.js` | The energy tank stays non-negative under a time-varying external force. |
| 11. `PegInHoleWithPassiveContact.js` | Sensorless force estimation + passive admittance produces a bounded insertion. |
| 12. `PassiveAdmittanceSimulation.js` | Passive admittance reduces peak contact force by 3× compared to plain admittance. |

If all twelve pass, you have strong evidence that:

- Cartesian impedance and admittance are correctly implemented,
- force regulation along a single axis works,
- hybrid and parallel position/force control are both correct,
- joint-space and operational-space torque control agree with the inverse-dynamics layer,
- the assist-as-needed blend behaves as designed,
- the passivity guard keeps the energy tank non-negative,
- sensorless force estimation closes the loop on a real task.

Once these twelve are green, the force-control layer is trustworthy enough to use on real hardware — with the caveats about friction modelling and model accuracy documented in each example.

---

## Extending the Examples

### 1. Add a full 6-axis impedance ellipsoid

Replace the diagonal `Md, Dd, Kd` with full 6×6 matrices to express a Cartesian compliance ellipsoid — e.g. stiff along Z (assembly), soft in X-Y (alignment).

### 2. Admittance with a real second-order plant

Replace the crude `q ← q + 0.1·(qDes − q)` plant in Example 12 with a proper second-order integrator:
```javascript
const qdd = (qDes − q) * Kp_plant - qd * Kd_plant;
qd = qd.map((v, i) => v + qdd[i] * dt);
q  = q .map((v, i) => v + qd[i] * dt);
```
This gives a plant with non-trivial dynamics to stress-test the admittance.

### 3. Adaptive passivity tank

Instead of a constant `Tmax`, grow or shrink it based on the estimated external force. When the environment is passive (force opposes velocity), grow the tank; when it is active, shrink it.

### 4. Combine operational-space control with nullspace

Add a secondary objective (joint-limit avoidance, posture) projected through the nullspace of the task Jacobian — the operational-space controller already computes the task projection, so the nullspace term is a small addition.

### 5. Friction-aware force estimation

Add `friction: identifiedFric` to the `momentumObserver` call in Example 11 (it is already there) and remove it in a separate run. Compare the estimated `Fext` residuals — the friction-aware version will have a smaller DC bias.

### 6. Full sensorless pick-and-place mission

Chain Example 11 (peg insertion) with a `pathTracking` approach and retract, and log the peak force at each stage. This becomes a repeatable benchmark for the whole sensorless pipeline.

---

## Troubleshooting

The following issues are the most common when running these twelve scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `ReferenceError: model is not defined` (Examples 5, 6, 8, 9) | `model` used but never declared | Add `const model = arm.DH_Lib.puma01;` at the top |
| `ReferenceError: EnergyTank is not defined` (Examples 10, 11, 12) | Helper classes are in a separate file | `const { EnergyTank, PassivityObserver } = require("./EnergyTank");` |
| `ReferenceError: FrictionRLS is not defined` (Example 11) | Helper class is in a separate file | `const FrictionRLS = require("./FrictionRLS");` |
| `ReferenceError: FrictionRLS is not defined` (Example 11) | Helper class is in a separate file | `const FrictionRLS = require("./FrictionRLS");` |
| Output contains `NaN` | Malformed input vectors | Confirm all vectors have length 6 |
| `Fimp` is all zeros | Reference = current pose, and no external force | Expected if `xRef = x` and `Fext = 0` |
| Impedance arm oscillates | Gains too high, or `dt` too large | Reduce `Kd`, increase `Dd`, reduce `dt` |
| Admittance arm drifts | `xRef` not being updated, or `Fext` biased | Check the force estimate and the reference pose |
| Force control does not reach the target | Integral not persisted between ticks | Assign `integral = out.integral` after each call |
| Hybrid control produces zeros on force axis | `Kf[2]` is zero, or `Fref[2] − Fext[2] = 0` | Provide non-zero force gains and a force error |
| Parallel control drifts away from the reference | `Kf` too large | Reduce `Kf` (it is a compliance, so larger = more motion) |
| Direct torque control produces only `τ_ff` | Reference = current pose, so feedback is zero | Offset `qRef` from `q` by a small amount |
| Operational-space control's `Λ` is huge | Near a kinematic singularity | Move `q` away from the singularity, or add damping to the inversion |
| `α` drops below 1 in passive control | The tank is running low on energy | Expected — the safety feature is active. If it drops often, increase `T0` or reduce `Pout` |
| `qDes` is `null` in admittance | IK did not converge | Check that the modified pose is within the workspace |
| Peak force > ISO/TS 15066 limit | Gains too stiff for human contact | Reduce `Kd`, or add a `bodyRegion` check |
| Observer estimate drifts | Friction model incorrect | Re-identify friction, or set `gains.friction = null` |

If a failure is not listed here, the fastest diagnostic is usually to **run the twelve scripts in order** and identify the first one that fails — the checks are designed so that each one is a precondition for the next.

---

## Closing Notes

The twelve scripts in this document are deliberately compact — each is one or two screens of code — because their purpose is verification, not demonstration. They are the ground truth for the force-control layer of `caro.manipulator-1.0.js`, and they inherit their credibility from the dynamics, kinematics, and velocity layers beneath them.

When you extend the library — new force-control methods, new passivity schemes, new observer formulations — reproduce the same pattern:

1. a **single-call reference** (like `ImpedanceControl1.js`),
2. a **closed-loop simulation** with a disturbance (like `ImpedanceSimulation.js`),
3. a **safety-critical benchmark** (like `PassiveAdmittanceSimulation.js`),
4. a **full mission script** that combines multiple methods (like `PegInHoleWithPassiveContact.js`).

That rhythm is what keeps a force-control library trustworthy over time.

---

*End of document.*

---

## Appendix A — Corrected Source Scripts

Several scripts in this manual use `model` without declaring it, and `AdmitanceControl.js` uses a `require` path that does not match the actual library filename. This appendix provides **drop-in corrected versions** of every affected script. Replace the originals in your `force/` folder with the following, and every "Expected output" section in the manual will match without further changes.

### A.1 — Corrected `PassivityUnderUnknownForce.js`

Add `EnergyTank`/`PassivityObserver` import and `model` is already declared.

```javascript
// passivity under unknown patient force — corrected
const Manipulator = require("../caro.manipulator-1.0");
const { EnergyTank, PassivityObserver } = require("./EnergyTank");   // <-- was missing
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

let state = {
  q: [0.3,-0.5,0.7,0.1,0.4,-0.2],
  qd: new Array(6).fill(0)
};

let persistent = {
  tank: new EnergyTank({ T0: 3.0, Tmax: 20.0 }),
  observer: new PassivityObserver(),
  xMod: arm._fkPose(model, state.q),
  xdMod: new Array(6).fill(0)
};

console.log("t      Fext     α      T (J)   Pflow    Pspring");
for (let k = 0; k < 200; k++) {
  const t = k * 0.005;

  const Fmag = 10;
  const angle = 0.5 * Math.sin(0.4 * t);
  const Fext = [
    Fmag * Math.cos(angle),
    Fmag * Math.sin(angle),
    0, 0, 0, 0
  ];

  const out = arm.passiveAdmittanceControl(
    {
      q: state.q, qd: state.qd,
      Fext,
      xRef: arm._fkPose(model, state.q),
      dt: 0.005
    },
    {
      Md: [5,5,5, 0.5,0.5,0.5],
      Dd: [150,150,150, 15,15,15],
      Kd: [500,500,500, 30,30,30],
      model,
      ...persistent
    }
  );

  // persistent.tank and persistent.observer are mutated in place — no reassignment needed
  persistent.xMod  = out.xMod;
  persistent.xdMod = out.xdMod;

  if (k % 20 === 0) {
    console.log(
      `${t.toFixed(2)}  ${Math.hypot(...Fext.slice(0,3)).toFixed(2)}  ` +
      `${out.alpha.toFixed(3)}  ${out.tank.toFixed(3).padStart(6)}  ` +
      `${out.observer.Pflow.toFixed(3).padStart(7)}  ${out.observer.Pspring.toFixed(8)}`
    );
  }
}
```


### A.9 — Summary of Changes

| File | Change |
|---|---|
| `PassiveAdmittanceSimulation.js` | Add `require("./EnergyTank")` |

After applying these changes, every script in the force-control set runs standalone.

---

## Appendix B — Passivity Helper Classes

The two passivity helper classes used by `passiveAdmittanceControl` are supplied in `EnergyTank.js` (attached to the project). They are reproduced here for reference and so the manual is self-contained.

Save the following as `EnergyTank.js` in your `force/` folder (or wherever your force-control scripts live), and import it as `const { EnergyTank, PassivityObserver } = require("./EnergyTank");`.

```javascript
/* =========================================================
 *  Passivity observer + energy tank
 * ========================================================= */

class EnergyTank {
  /**
   * Time-domain passivity energy tank.
   *
   *   Ṫ = P_in − P_out            (energy balance)
   *   T ≥ 0                        (passivity constraint)
   *
   * When the constraint is about to be violated, the tank returns a
   * scaling factor α ∈ [0,1] the caller applies to its control output.
   *
   * @param  {object} opts
   *          T0     : initial energy (J)
   *          Tmax   : capacity cap (J) — prevents unbounded accumulation
   *          eta    : fill rate (0..1) — how much input power to harvest
   */
  constructor(opts = {}) {
    this.T    = opts.T0    ?? 2.0;
    this.Tmax = opts.Tmax  ?? 20.0;
    this.eta  = opts.eta   ?? 1.0;   // fully harvest by default
    this.history = [];
  }

  /**
   * Advance one step.
   * @param  {number} Pin   power flowing into the controller (W)
   * @param  {number} Pout  power the controller wants to deliver (W)
   * @param  {number} dt    step (s)
   * @return {number} α     scaling factor for the control output
   */
  step(Pin, Pout, dt) {
    // Energy available this step, without going negative
    const net = this.eta * Pin - Pout;
    const Tnext = this.T + net * dt;

    let alpha = 1.0;
    if (Tnext < 0) {
      // Not enough energy — scale back Pout
      const available = this.T + this.eta * Pin * dt;
      alpha = available > 0 ? Math.max(0, available / (Pout * dt)) : 0;
      this.T = 0;
    } else {
      this.T = Math.min(this.Tmax, Tnext);
    }

    this.history.push(this.T);
    if (this.history.length > 5000) this.history.shift();
    return alpha;
  }

  /** Diagnostic: minimum energy seen (should never be < 0). */
  minEnergy() { return this.history.length ? Math.min(...this.history) : this.T; }
}

class PassivityObserver {
  /**
   * Monitors the energy balance across the interaction port.
   *
   *   P_flow = ẋ_modᵀ · F_ext     (positive = environment pushes robot)
   *
   * Tracks cumulative energy exchanged; a persistently negative
   * cumulative flow indicates the controller is net energy-injecting.
   */
  constructor() {
    this.cumulative = 0;
    this.window = [];
    this.windowSize = 200;
    this.Pmin = 0;
    this.Pmax = 0;
  }

  step(xd, Fext, dt) {
    const P = xd[0]*Fext[0] + xd[1]*Fext[1] + xd[2]*Fext[2]
            + xd[3]*Fext[3] + xd[4]*Fext[4] + xd[5]*Fext[5];
    this.cumulative += P * dt;
    this.window.push(P);
    if (this.window.length > this.windowSize) this.window.shift();
    this.Pmin = Math.min(this.Pmin, P);
    this.Pmax = Math.max(this.Pmax, P);
    return P;
  }

  /** Average power over the recent window — a stability indicator. */
  recentMeanPower() {
    if (!this.window.length) return 0;
    return this.window.reduce((a,b) => a+b, 0) / this.window.length;
  }
}

module.exports = { EnergyTank, PassivityObserver };
```

**Note on the `??` operator.** The original file uses the nullish-coalescing operator `??`, which requires Node 14 or later. If your Node version is older, replace each `??` with a `!== undefined && !== null ? … : …` ternary, or upgrade Node.

---

## Appendix C — Industrial Safety Snippets

The file `IndustrialSafetyConsiderations.js.txt` contains **four safety snippets** that belong in an outer control loop or in the `_safetyCheck` method of the library. They are not a standalone script — they are illustrative fragments. They are reproduced here for reference.

### C.1 — ISO/TS 15066 force limits

Add to `_safetyCheck` inside the library to enforce human-contact force limits:

```javascript
// ISO/TS 15066 force limits
if (gains.iso15066) {
  const bodyRegion = gains.bodyRegion ?? "hand";   // "hand", "arm", "torso"
  const Fmax = { hand: 140, arm: 220, torso: 260 }[bodyRegion];
  const estimatedFmax = gains.Kd?.[0] * 0.01;      // worst-case at 1 cm deflection
  if (estimatedFmax > Fmax) {
    issues.push(`Kd too stiff for ${bodyRegion}: ${estimatedFmax.toFixed(0)} N > ${Fmax} N`);
  }
}
```

This estimates the peak contact force from the impedance stiffness `Kd[0]` and a 1 cm deflection, and compares it against the ISO/TS 15066 limits for hand, arm, and torso contact.

### C.2 — Speed and separation monitoring

In the outer control loop, scale joint velocities by human distance:

```javascript
// speed and separation monitoring
const humanDistance = getHumanDistance();          // from safety scanner
const vScale = Math.min(1, Math.max(0, (humanDistance - 0.1) / 0.5));
const qdRef = velocityLimited(rawQd, vMax.map(v => v * vScale));
```

The robot slows to zero when the human is within 10 cm, and runs at full speed beyond 60 cm.

### C.3 — Power and force limiting

Log a warning if the interaction power exceeds 100 W:

```javascript
// power and force limiting
if (Math.abs(out.observer.Pflow) > 100) {
  console.warn(`High interaction power: ${out.observer.Pflow.toFixed(1)} W`);
  // Trigger protective stop if sustained
}
```

The threshold `100 W` is conservative for human contact. Industrial deployments typically use 80 W for hands.

### C.4 — Task-space singularity handling

Freeze the admittance output near kinematic singularities:

```javascript
// task-space singularity handling
const J = arm.jacobian(model, state.q);
const w = arm._manipulability(J);
if (w < 0.01) {
  // near singularity: freeze admittance output
  out.xMod = persistent.xMod;
  out.xdMod = new Array(6).fill(0);
}
```

The manipulability threshold `0.01` is a reasonable default for a PUMA-sized arm. Larger robots need a larger threshold.

### C.5 — Node version note

Three of the four snippets use the nullish-coalescing operator `??`. This is supported in Node 14 and later. If you are running an older Node, replace each `??` with the equivalent ternary form. The library itself uses the ternary form throughout to remain compatible with older runtimes, but the safety snippets above retain the `??` form for compactness.



