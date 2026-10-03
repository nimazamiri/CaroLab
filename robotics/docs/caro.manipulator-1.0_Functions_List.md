# CaroLab Manipulator Library

- **Name:** caro.manipulator-1.0.js
- **Release Date:** 28 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Robot-Arm Kinematics, Dynamics & Control](#a-primary-library-for-robot-arm-kinematics-dynamics--control)
   - [Conventions](#conventions)
2. [Programming JavaScript Methods](#programming-javascript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab Manipulator Library — Functions List](#carolab-manipulator-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Instance Fields](#construction--instance-fields)
   - [Kinematics](#kinematics)
   - [Inverse Kinematics](#inverse-kinematics)
   - [Jacobian](#jacobian)
   - [Joint / Servo Utilities](#joint--servo-utilities)
   - [Path Tracking & Trajectory Generation](#path-tracking--trajectory-generation)
   - [Dynamics](#dynamics)
   - [Cartesian Compliance Control](#cartesian-compliance-control)
   - [Force Control](#force-control)
   - [Redundancy Resolution](#redundancy-resolution)
   - [Joint-Velocity Control Stack](#joint-velocity-control-stack)
   - [Sensorless Force Estimation](#sensorless-force-estimation)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Robot-Arm Kinematics, Dynamics & Control

`caro.manipulator-1.0.js` is a single-class JavaScript library built around the **`Manipulator`** object — a PUMA-560-style serial robot-arm toolkit. The instance holds a **Denavit–Hartenberg (DH) model library** (`DH_Lib`, with one built-in entry `puma01`), a default model, a gravity vector, and an optional link-dynamics table. Every method operates on that instance and takes its arm model and state as arguments; almost all of them are **stateless** — any quantity that must persist between control ticks (integrals, filter memory, modified poses, energy tanks) is *returned* to the caller, who passes it back in on the next call.

The library covers six broad areas:

| Area | Examples |
|---|---|
| Kinematics | `DH`, `forwardKin`, `inverseKin`, `numericalIK`, `inverseKinSmart`, `jacobian` |
| Path & trajectory generation | `pathTracking`, `timeParameterize` |
| Dynamics | `rne` (recursive Newton–Euler), `_massMatrix` (composite-rigid-body approximation) |
| Cartesian compliance & force control | `impedanceControl`, `admittanceControl`, `passiveAdmittanceControl`, `forceControl`, `hybridControl`, `parallelControl`, `operationalSpaceControl`, `assistAsNeeded` |
| Joint-space & velocity control | `directTorqueControl`, `jointVelocityControl`, `resolvedRateControl`, `velocityLimited`, `accelerationLimited`, `velocityTrajectory`, `nullspaceControl` |
| Sensorless force estimation | `momentumObserver`, `estimateExternalWrench` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js (CommonJS `module.exports`). It is a **pure-numeric** library — plain nested arrays throughout; it does **not** use the `Matrix` class from `caro.matrix-1.0.js`.

### Conventions

| Item | Convention |
|---|---|
| Angles / velocities | Radians, rad/s, rad/s² |
| Lengths / forces / torques | Metres, newtons, newton-metres |
| DH row format | `[theta, a, d, alpha]` — `theta` is the joint-angle **offset** added to the joint variable `q[i]` |
| DH transform | The standard (classic) DH matrix `Rot_z(θ)·Trans_z(d)·Trans_x(a)·Rot_x(α)` |
| Joint vector `q` | Array of `n` joint angles (`n = 6` for `puma01`) |
| Pose (6-vector) | `[x, y, z, wx, wy, wz]` — position plus an **axis-angle rotation vector** (see `_fkPose`) |
| Wrench (6-vector) | `[Fx, Fy, Fz, Mx, My, Mz]` |
| Rotation matrix `R` | 3×3 array with the tool's `n, o, a` axes as **columns** (`a` = approach = tool z) |
| Jacobian | Geometric Jacobian, `6 × n`; rows are `vx, vy, vz, wx, wy, wz` |
| Gain arguments | Per-axis **6-vectors** (diagonal gains) unless stated otherwise |
| State persistence | Returned by the method, supplied back by the caller through `gains.*` / `s.*` |

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.manipulator-1.0.js"></script>
<script>
  const arm = new Manipulator();
  const q = [0, Math.PI / 4, -Math.PI / 4, 0, Math.PI / 2, 0];
  const { T, flat } = arm.forwardKin(arm.DH_Lib.puma01, q);
  console.log('Tool position:', T[0][3], T[1][3], T[2][3]);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const Manipulator = require('./caro.manipulator-1.0.js');

const arm = new Manipulator();
const q = [0, Math.PI / 4, -Math.PI / 4, 0, Math.PI / 2, 0];
const { T, flat } = arm.forwardKin(arm.DH_Lib.puma01, q);

console.log('Tool position:', T[0][3], T[1][3], T[2][3]);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** the `Manipulator` constructor takes **no arguments**; the arm model is chosen per call — pass a DH table (e.g. `arm.DH_Lib.puma01`) as `model`, or omit it to use the default. Kinematics methods take positional arguments (`forwardKin(model, q)`); control methods take a **state object** `s` (measured/reference signals) and a **gains object** (`gains`) of options. Control methods return a result object and never mutate the instance, so a control loop is simply: measure → call → apply `result.tau` (or `result.qDes`) → feed the returned persistent fields back in on the next tick.

### Debugging Programs

- The library throws very few explicit errors — the ones that exist are: `forwardKin: supply either Ai[] or (DH_Lib entry, q)` (neither a list of 4×4 matrices nor a `(model, q)` pair was given) and `pathTracking: unknown mode '<mode>'`. Bad input shapes otherwise surface as ordinary JavaScript `TypeError`s (e.g. reading a property of `undefined`); no method validates array lengths.
- **Matrix inversion does not throw.** Several methods invert a matrix through `_invert`. Two definitions of `_invert` exist in the class body; the **later** one (which has no singularity check) is the one in effect, so a singular matrix yields `NaN`/`Infinity` entries instead of an error. Check results with `Number.isFinite` near singular configurations, or prefer the damped methods (`resolvedRateControl` with `method: 'dls'`, `numericalIK`).
- **IK failures are returned, not thrown.** `numericalIK` and `inverseKinSmart` report `converged: false` with a `reason` (`'maxIter'`, `'unreachable'`); `pathTracking` marks such waypoints `ok: false`. Always check `converged` / `ok` before using `q`.
- `inverseKin` clamps the arguments of `acos`/`asin` into `[-1, 1]`, so an unreachable target silently produces a saturated (wrong) solution instead of an error — use `inverseKinSmart`, which pre-checks reachability, when targets are not guaranteed reachable.
- `passiveAdmittanceControl` refers to two classes, **`EnergyTank`** and **`PassivityObserver`**, that are **not defined in this file**. Supply your own instances through `gains.tank` and `gains.observer`, or define those classes globally; otherwise the default-construction path throws a `ReferenceError`. Similarly, `momentumObserver` calls `this.frictionCompensate(...)` when `gains.friction` is given — no such method exists in this file.
- Several helper methods are defined more than once in the class body (`_identity`, `_diag6`, `_invert`, `_dot`, `_poseToT`, `_pseudoInverse`, `_dlsInverse`, `_nullspaceProjector`, `_manipulability`, `_det`, `_saturateVector`, `_matT_vec`). JavaScript keeps the **last** definition; the duplicates are behaviourally identical apart from `_invert` (see above).
- **Known issues in the current source** (documented here so results are interpreted correctly):
  - `resolvedRateControl` and `nullspaceControl` compute the task term as `_matT_vec(Jpinv, ẋ)`, which evaluates `J⁺ᵀ·ẋ` rather than `J⁺·ẋ` (`_mat_vec` would be correct). Results are only right when `J⁺` happens to be symmetric; for `method: 'trans'` the product becomes `J·ẋ` instead of `Jᵀ·ẋ`.
  - `nullspaceProjector(J)` sizes its internal matrices with `J.length` (the row count, 6) where the joint count `n` is intended, so it is only correct for a square `6×6` Jacobian.
  - `timeParameterize` with `method: 'trapezoid'` does not land exactly on `s = 1` (its deceleration branch ends at `s = 1.05`); the source itself labels it "crude". Use `'quintic'` or `'linear'` when exact endpoints matter.
  - `inverseKin`, `rne`, `_massMatrix` always use the built-in `puma01` table regardless of any `model` argument.
  - `forwardKin`'s `flat` array is labelled `nX,oX,aX,pX, …` in the source comment, but the entries are actually ordered `[nx,ny,nz,px, ox,oy,oz,py, ax,ay,az,pz]` (see below).

---

## CaroLab Manipulator Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new Manipulator` | Creates the toolkit with the `puma01` DH library, default model and gravity |
| 2 | `DH` | One 4×4 homogeneous DH link transform |
| 3 | `forwardKin` | Forward kinematics from a list of link transforms, or from a `(model, q)` pair |
| 4 | `inverseKin` | Closed-form PUMA-style analytical inverse kinematics |
| 5 | `numericalIK` | Damped-least-squares (Levenberg–Marquardt) numerical inverse kinematics |
| 6 | `inverseKinSmart` | Reachability check, analytic IK first, numerical fallback |
| 7 | `jacobian` | Geometric Jacobian (`6×n`), or a spatial-velocity product form |
| 8 | `theta2servoAngles` | Joint radians → clamped 0–180° servo angles |
| 9 | `pathTracking` | Cartesian line / circle / arc / Bézier path sampled and solved through IK |
| 10 | `timeParameterize` | Turns geometric waypoints into a timed quintic / trapezoid / linear trajectory |
| 11 | `rne` | Inverse dynamics by recursive Newton–Euler |
| 12 | `impedanceControl` | Torque-based Cartesian impedance control |
| 13 | `admittanceControl` | Position-based Cartesian admittance control |
| 14 | `passiveAdmittanceControl` | Admittance control with an energy-tank passivity guard and safety checks |
| 15 | `forceControl` | PI force regulation along the tool approach axis |
| 16 | `hybridControl` | Hybrid position/force control (Raibert–Craig selection matrix) |
| 17 | `parallelControl` | Parallel position/force control (Chiaverini–Siciliano) |
| 18 | `directTorqueControl` | Joint-space PD + inverse-dynamics feedforward torque control |
| 19 | `operationalSpaceControl` | Khatib operational-space control with operational-space inertia `Λ` |
| 20 | `assistAsNeeded` | Blends transparent and assistive torque control by tracking error |
| 21 | `nullspaceProjector` | Pseudoinverse `J⁺` and null-space projector `N = I − J⁺J` |
| 22 | `nullspaceControl` | Task velocity plus a secondary joint velocity projected into the null space |
| 23 | `jointVelocityControl` | Joint-velocity PI/D loop with feedforward and gravity compensation |
| 24 | `resolvedRateControl` | Cartesian twist → joint velocity (`pinv` / `dls` / `trans`), optional null-space term |
| 25 | `velocityLimited` | Direction-preserving joint-velocity saturation |
| 26 | `accelerationLimited` | Acceleration- and jerk-limited velocity filter (S-curve) |
| 27 | `velocityTrajectory` | Convenience chain: `velocityLimited` → `accelerationLimited` |
| 28 | `momentumObserver` | Sensorless external-torque estimation via generalized momentum |
| 29 | `estimateExternalWrench` | `momentumObserver` plus optional world → tool-frame rotation |

*(Underscore-prefixed helpers — `_mul4`, `_cross`, `_invert`, `_fkPose`, `_massMatrix`, etc. — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API.)*

---

## Detail Description

### Construction & Instance Fields

- **Function:** `constructor` / `new Manipulator()`
  **Description:** Creates a toolkit instance. Registers the built-in `puma01` DH table (a PUMA-560-like 6-joint arm), sets it as the default model, and sets gravity to `[0, 0, -9.81]`.
  **Syntax:** `const arm = new Manipulator();`
  **Input Arguments:** none
  **Output Arguments:** `arm`: `Manipulator` instance
  **Coding Example:**
  ```javascript
  const arm = new Manipulator();
  console.log(arm.DH_Lib.puma01.length); // 6 joints
  ```

**Instance fields**

| Field | Type | Default | Description |
|---|---|---|---|
| `DH_Lib` | object | `{ puma01: [...] }` | Named DH tables. Each table is an array of `[theta, a, d, alpha]` rows — add your own entries here |
| `defaultModel` | array | `DH_Lib.puma01` | Model used by `pathTracking` when `out.model` is not given |
| `gravity` | `[gx, gy, gz]` | `[0, 0, -9.81]` | Gravity vector (m/s²) used by `rne` |
| `dynamics` | array \| `undefined` | `undefined` (not created by the constructor) | Optional per-link dynamics table for `rne` / `_massMatrix`: `[{ m, r, I }, ...]` — mass, COM vector, 3×3 inertia. `r` is stored but not used by the current algorithms. When unset, placeholder values are used (`rne`: masses `[7, 10, 5, 2, 1.5, 0.5]`, inertia `0.01·I₃`; `_massMatrix`: mass `5`, inertia `0.05·I₃`) |

**Built-in `puma01` DH table** (`[theta, a, d, alpha]`)

| Link | theta | a | d | alpha |
|---|---|---|---|---|
| 1 | 0 | 0.000 | 0.000 | π/2 |
| 2 | 0 | 0.4318 | 0.000 | 0 |
| 3 | 0 | −0.02032 | 0.14909 | −π/2 |
| 4 | 0 | 0.000 | 0.43307 | π/2 |
| 5 | 0 | 0.000 | 0.000 | −π/2 |
| 6 | 0 | 0.000 | 0.05625 | 0 |

---

### Kinematics

- **Function:** `DH`
  **Description:** Builds one 4×4 homogeneous transform for a single link from its DH parameters (standard DH matrix).
  **Syntax:** `A = arm.DH(theta, a, d, alpha);`
  **Input Arguments:** `theta`: joint angle (rad); `a`: link length; `d`: link offset; `alpha`: link twist (rad)
  **Output Arguments:** `A`: 4×4 array
  **Formula:** `A = [[cθ, −sθ·cα, sθ·sα, a·cθ], [sθ, cθ·cα, −cθ·sα, a·sθ], [0, sα, cα, d], [0, 0, 0, 1]]`

- **Function:** `forwardKin`
  **Description:** Forward kinematics — multiplies the link transforms from base to tool. Accepts either a ready-made list of 4×4 link matrices, or a DH table plus a joint vector (each joint angle is added to its row's `theta` offset).
  **Syntax:** `{ T, flat } = arm.forwardKin(Ai);` or `{ T, flat } = arm.forwardKin(model, q);`
  **Input Arguments:** see table below
  **Output Arguments:** `{ T, flat }` — `T`: 4×4 tool transform; `flat`: 12-element tuple (layout below)
  **Errors:** `forwardKin: supply either Ai[] or (DH_Lib entry, q)`
  **Coding Example:**
  ```javascript
  const { T, flat } = arm.forwardKin(arm.DH_Lib.puma01, [0, 0.5, -0.5, 0, 0.3, 0]);
  const position = [T[0][3], T[1][3], T[2][3]];
  ```

  | Call form | `arg1` | `q` | Description |
  |---|---|---|---|
  | List of link matrices | array of 4×4 matrices | omitted | Multiplies the matrices in order |
  | Model + joints | DH table (array of `[theta, a, d, alpha]`) | array of `n` joint angles | Builds each `A_i = DH(theta_i + q_i, a_i, d_i, alpha_i)` and multiplies |

  **`flat` layout** (actual element order, `n/o/a` = tool axes, `p` = position):

  | Index | 0–3 | 4–7 | 8–11 |
  |---|---|---|---|
  | Content | `nx, ny, nz, px` | `ox, oy, oz, py` | `ax, ay, az, pz` |

---

### Inverse Kinematics

- **Function:** `inverseKin`
  **Description:** Closed-form, PUMA-style analytical inverse kinematics for the built-in `puma01` geometry. Computes the wrist centre `p − d6·a`, solves `θ1` (with the `d4` offset term), `θ3` by the law of cosines and `θ2` geometrically, then extracts the wrist angles `θ4, θ5, θ6` from `R₃₆ = R₀₃ᵀ·R`. Returns a single configuration (right-handed, elbow-up-type branch, non-flipped wrist). The elbow/shoulder decomposition is simplified (`_rotZYX`), so treat the result as a seed and verify it with `forwardKin` — or use `inverseKinSmart`.
  **Syntax:** `q = arm.inverseKin(position, orientation);`
  **Input Arguments:** `position`: `[px, py, pz]`; `orientation`: 3×3 rotation matrix with `n, o, a` as columns
  **Output Arguments:** `q`: `[θ1, …, θ6]` (rad)

- **Function:** `numericalIK`
  **Description:** Numerical inverse kinematics by damped least squares with Levenberg–Marquardt damping adaptation: each iteration forms the 6-D pose error (position error + world-frame axis-angle orientation error), solves `Δq = Jᵀ(JJᵀ + λ²I)⁻¹·e`, clamps the step length, applies joint limits, and accepts the step only if the error decreases (shrinking `λ`), otherwise enlarges `λ` and retries.
  **Syntax:** `result = arm.numericalIK(position, orientation, opts);`
  **Input Arguments:** `position`: `[x, y, z]`; `orientation`: 3×3 rotation matrix; `opts`: options object (table below)
  **Output Arguments:** `result`: `{ q, converged, iterations, error, reason }` — `reason` is `'tol'` (converged) or `'maxIter'`; `error` is the last accepted pose-error norm (`Infinity` if no step was ever accepted)
  **Coding Example:**
  ```javascript
  const R = [[1,0,0],[0,1,0],[0,0,1]];
  const res = arm.numericalIK([0.4, 0.2, 0.3], R, { maxIter: 300, q0: [0, 0.5, -0.5, 0, 0, 0] });
  if (res.converged) console.log(res.q);
  ```

  | Option | Type | Default | Description |
  |---|---|---|---|
  | `model` | DH table | `DH_Lib.puma01` | Arm model to solve for |
  | `q0` | `number[]` | zeros | Initial joint guess |
  | `maxIter` | integer | `200` | Maximum iterations |
  | `tol` | number | `1e-6` | Convergence threshold on the 6-D pose-error norm |
  | `lambda` | number | `0.05` | Initial damping factor |
  | `lambdaMin` | number | `1e-6` | Lower bound for adapted damping |
  | `lambdaMax` | number | `1e3` | Upper bound for adapted damping |
  | `stepClamp` | number | `0.3` | Maximum joint-step norm per iteration (rad) |
  | `qMin`, `qMax` | `number[]` | `null` | Per-joint limits; trial steps are clamped to them |

- **Function:** `inverseKinSmart`
  **Description:** Dispatcher. (1) Rejects targets farther from the base than a conservative reach bound (`Σ(|a|+|d|)` along the chain, ×1.001) as unreachable; (2) for the built-in `puma01` model, tries `inverseKin` and accepts it if it lies within `qMin`/`qMax` (no limits given = always accepted); (3) otherwise falls back to `numericalIK`, seeded heuristically from the target position unless `q0` is supplied.
  **Syntax:** `result = arm.inverseKinSmart(position, orientation, opts);`
  **Input Arguments:** `position`, `orientation`: as in `inverseKin`; `opts`: same options as `numericalIK` (table above)
  **Output Arguments:** `result` — analytic success: `{ q, converged: true, method: 'analytic', error: 0 }`; numerical: `{ q, converged, iterations, error, reason, method: 'numerical' }`; unreachable: `{ q: null, converged: false, reason: 'unreachable', error: Infinity }`
  **Note:** the analytic branch is accepted without re-checking the pose through `forwardKin`.

---

### Jacobian

- **Function:** `jacobian`
  **Description:** Geometric Jacobian, `6 × n`. Standard form: for each joint, the linear part is `z_{i−1} × (p_e − p_{i−1})` and the angular part is `z_{i−1}`. A second, spatial-velocity product form is also supported.
  **Syntax:** `J = arm.jacobian(Ai, q);` `J = arm.jacobian(model, q);` `J = arm.jacobian(Xi, q, Phi);`
  **Input Arguments:** see table below
  **Output Arguments:** `J`: `6 × n` array (rows: `vx, vy, vz, wx, wy, wz`)
  **Coding Example:**
  ```javascript
  const J = arm.jacobian(arm.DH_Lib.puma01, [0, 0.5, -0.5, 0, 0.3, 0]);
  ```

  | Call form | `arg1` | `q` | `Phi` | Description |
  |---|---|---|---|---|
  | Link matrices | list of 4×4 matrices | ignored | omitted | Standard geometric Jacobian from the given chain |
  | Model + joints | DH table | joint vector | omitted | Standard geometric Jacobian for the DH chain at `q` |
  | Spatial-velocity | array of 6-vectors `Xi` | *(unused)* | array of 6-vectors | `J[r][i] = Phi[i][r] · Xi[i][r]` — element-wise product, used directly with no kinematics |

---

### Joint / Servo Utilities

- **Function:** `theta2servoAngles`
  **Description:** Converts joint angles in radians to hobby-servo-style angles: degrees plus a 90° centre offset, clamped to `[0, 180]`. Generic — override for specific hardware.
  **Syntax:** `servo = arm.theta2servoAngles(t1, t2, ..., tn);`
  **Input Arguments:** `...theta`: joint angles in radians, as separate arguments
  **Output Arguments:** `servo`: array of angles in degrees, one per argument
  **Formula:** `servo = clamp(θ·180/π + 90, 0, 180)`

---

### Path Tracking & Trajectory Generation

- **Function:** `pathTracking`
  **Description:** Samples a Cartesian path between two points (`steps + 1` waypoints) in one of four shapes, and solves inverse kinematics at every waypoint with the tool orientation held at identity. Analytic IK is used by default; numerical IK (warm-started from the previous waypoint) can be selected.
  **Syntax:** `path = arm.pathTracking(P1, P2, mode, out);`
  **Input Arguments:** `P1`, `P2`: `[x, y, z]` start / end points; `mode`: path shape (table below); `out`: options object (table below)
  **Output Arguments:** `path`: array of `{ p, q, ok }` (plus `err` when a numerical solve fails). A failed numerical waypoint is stored with the previous `q`, `ok: false`
  **Errors:** `pathTracking: unknown mode '<mode>'`
  **Coding Example:**
  ```javascript
  const path = arm.pathTracking([0.4, 0, 0.3], [0.4, 0.2, 0.3], 'line', { steps: 40, useNumerical: true });
  const waypoints = path.filter(w => w.ok);
  ```

  | `mode` | Shape |
  |---|---|
  | `'line'` (default) | Straight line `P1 → P2` |
  | `'circle'` | One full revolution in the XY plane around `P1` with radius `out.radius` (`P2` is ignored) |
  | `'arc'` | Straight line plus a sinusoidal Z bump of height `out.arcHeight` |
  | `'curve'` | Cubic Bézier `P1 → C1 → C2 → P2` |

  | Option (`out.*`) | Type | Default | Description |
  |---|---|---|---|
  | `steps` | integer | `20` | Number of path segments (`steps + 1` waypoints) |
  | `radius` | number | `0.05` | Circle radius (`'circle'`) |
  | `arcHeight` | number | `0.05` | Peak Z offset (`'arc'`) |
  | `C1`, `C2` | `[x, y, z]` | `[(P1x+P2x)/2, P1y, P1z]`, `[(P1x+P2x)/2, P2y, P2z]` | Bézier control points (`'curve'`) |
  | `useNumerical` | boolean | `false` | Solve each waypoint with `numericalIK` instead of `inverseKin` |
  | `model` | DH table | `this.defaultModel` | Arm model (only honoured by the numerical solver — `inverseKin` is `puma01`-only) |
  | `q0` | `number[]` | zeros | Initial joint guess for the first waypoint |
  | `qMin`, `qMax` | `number[]` | `null` | Joint limits (numerical solver only) |

- **Function:** `timeParameterize`
  **Description:** Converts geometric waypoints (as returned by `pathTracking`) into a timed joint trajectory. Each segment gets a duration long enough that no joint exceeds its `vMax` / `aMax` (quintic-polynomial bounds), and is then sampled with a scalar time law `s(τ)` so that `q = q0 + s·(q1 − q0)`.
  **Syntax:** `traj = arm.timeParameterize(waypoints, opts);`
  **Input Arguments:** `waypoints`: array of `{ p, q }`; `opts`: options object (table below)
  **Output Arguments:** `traj`: array of `{ t, q, qd, qdd, s, seg }` — timestamp, joint position / velocity / acceleration, path fraction, segment index
  **Notes:** zero-length segments are skipped; each segment is sampled inclusively, so shared boundary waypoints appear twice; the timestamp uses `dt` spacing while the actual in-segment sample spacing is `T / samples ≤ dt`.
  **Coding Example:**
  ```javascript
  const traj = arm.timeParameterize(path, { method: 'quintic', dt: 0.01, vMax: 1.0, aMax: 5.0 });
  ```

  | Option | Type | Default | Description |
  |---|---|---|---|
  | `method` | `'quintic'` \| `'trapezoid'` \| `'linear'` | `'quintic'` | Time law. `'quintic'`: `s = 10τ³ − 15τ⁴ + 6τ⁵` (zero end velocity/acceleration). `'trapezoid'`: 30 % accelerate / 40 % cruise / 30 % decelerate (crude — see Debugging Programs). `'linear'`: constant velocity |
  | `dt` | number | `0.01` | Sample period (s) |
  | `vMax` | number \| `number[]` | `1.0` | Maximum joint speed (rad/s), scalar or per-joint |
  | `aMax` | number \| `number[]` | `5.0` | Maximum joint acceleration (rad/s²), scalar or per-joint |

---

### Dynamics

- **Function:** `rne`
  **Description:** Inverse dynamics by the Recursive Newton–Euler algorithm on the `puma01` chain: a forward pass propagates angular/linear velocity and acceleration (gravity is injected as a base acceleration `−g`), and a backward pass propagates forces and moments to give the joint torques. Link masses and inertias come from `this.dynamics` (placeholders if unset). With `qd = qdd = 0` it returns the gravity torque vector `g(q)`.
  **Syntax:** `tau = arm.rne(q, qd, qdd, g);`
  **Input Arguments:** `q`, `qd`, `qdd`: joint positions / velocities / accelerations; `g`: gravity vector (default `this.gravity`)
  **Output Arguments:** `tau`: array of `n` joint torques (N·m)
  **Coding Example:**
  ```javascript
  const zeros = [0, 0, 0, 0, 0, 0];
  const tauG = arm.rne([0, 0.5, -0.5, 0, 0.3, 0], zeros, zeros); // gravity torques
  ```

---

### Cartesian Compliance Control

Each control method below takes a **state object `s`** and a **gains object**. The tables list the fields each one reads; fields marked *optional* fall back to the shown default.

- **Function:** `impedanceControl`
  **Description:** One tick of torque-based Cartesian impedance control: forms `F_imp = M_d·ẍ_ref + D_d·(ẋ_ref − ẋ) + K_d·(x_ref − x)`, subtracts the external wrench, maps it to joint torques with `Jᵀ`, and (by default) adds `rne(q, qd, 0)` as gravity compensation. Current pose / velocity are taken from `s.x` / `s.xd` or computed from forward kinematics and `J·q̇`.
  **Syntax:** `out = arm.impedanceControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tau, Fimp, Fext, J, error, xd, xRef }`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Measured joint position / velocity |
  | `x`, `xd` | 6-vector | FK pose, `J·qd` | Current Cartesian pose / velocity |
  | `xRef`, `xdRef`, `xddRef` | 6-vector | `x`, zeros, zeros | Reference pose / velocity / acceleration |
  | `Fext` | 6-vector | zeros | Measured external wrench |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Md` | 6-vector | `[5,5,5, 0.5,0.5,0.5]` | Desired inertia (diagonal) |
  | `Dd` | 6-vector | `[150,150,150, 15,15,15]` | Desired damping |
  | `Kd` | 6-vector | `[800,800,800, 40,40,40]` | Desired stiffness |
  | `model` | DH table | `puma01` | Arm model for `J` / FK |
  | `compensate` | boolean | `true` | Add `rne(q, qd, 0)` compensation torque |

- **Function:** `admittanceControl`
  **Description:** One tick of position-based admittance control: integrates the virtual dynamics `M_d·ẍ_mod = F_ext − D_d·ẋ_mod − K_d·(x_mod − x_ref)` (explicit Euler) to get a compliant pose `x_mod`, then converts it to joint targets with `inverseKinSmart` (small-angle rotation via `_eulerToR`).
  **Syntax:** `out = arm.admittanceControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ xMod, xdMod, qDes, converged }` — persist `xMod`, `xdMod` and pass them back as `s.xMod`, `s.xdMod`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q` | `number[]` | *(required)* | Measured joints (IK seed) |
  | `xMod`, `xdMod` | 6-vector | `s.x` or FK pose, zeros | Previous modified pose / velocity (caller persists) |
  | `xRef` | 6-vector | `xMod` | Reference pose |
  | `Fext` | 6-vector | zeros | Measured external wrench |
  | `x` | 6-vector | FK pose | Used only to initialise `xMod` |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Md`, `Dd`, `Kd` | 6-vector | `[5,5,5,0.5,0.5,0.5]`, `[150,150,150,15,15,15]`, `[800,800,800,40,40,40]` | Virtual inertia / damping / stiffness (diagonal) |
  | `dt` | number | `0.005` | Control period (s) |
  | `model` | DH table | `puma01` | Arm model |
  | `qMin`, `qMax` | `number[]` | `null` | Joint limits passed to the IK |

- **Function:** `passiveAdmittanceControl`
  **Description:** Admittance control with time-domain passivity enforcement. The candidate admittance step is scaled by a factor `α` produced by an **energy tank** (input power = positive interaction power; output = damping dissipation + spring power released); an optional workspace / bandwidth safety check freezes motion if violated; the safe pose is then converted to joint targets via `inverseKinSmart` (max 50 iterations). Requires `EnergyTank` and `PassivityObserver` objects — see Debugging Programs.
  **Syntax:** `out = arm.passiveAdmittanceControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ qDes, xMod, xdMod, alpha, tank, observer, safety, ikConverged }` — `tank` is the tank's current energy `tank.T`; `observer` is `{ Pflow, Pdiss, Pspring, cumulative, meanPower }`; `safety` is `{ ok, issues }`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Joint state |
  | `Fext` | 6-vector | zeros | External wrench (F/T sensor or `estimateExternalWrench`) |
  | `xRef` | 6-vector | FK pose | Reference pose |
  | `dt` | number | `gains.dt` or `0.005` | Control period (s) |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Md`, `Dd`, `Kd` | 6-vector | `[5,5,5,0.5,0.5,0.5]`, `[150,150,150,15,15,15]`, `[500,500,500,30,30,30]` | Virtual inertia / damping / stiffness |
  | `tank` | object | `new EnergyTank({ T0: 3.0, Tmax: 20.0 })` | Must expose `step(Pin, Pout, dt) → α` and `T`. Caller persists |
  | `observer` | object | `new PassivityObserver()` | Must expose `step(xd, Fext, dt) → Pflow`, `cumulative`, `recentMeanPower()`. Caller persists |
  | `xMod`, `xdMod` | 6-vector | FK pose, zeros | Previous modified pose / velocity (caller persists) |
  | `xMin`, `xMax` | 6-vector | *(none)* | Workspace envelope (both must be given to be checked) |
  | `innerLoopBW` | number | *(none)* | Inner servo bandwidth (rad/s); flags an admittance bandwidth `√(Kd₀/Md₀) > innerLoopBW/5` |
  | `qMin`, `qMax` | `number[]` | `null` | Joint limits for the IK |
  | `model` | DH table | `puma01` | Arm model |
  | `dt` | number | `0.005` | Control period, used if `s.dt` is absent |

---

### Force Control

- **Function:** `forceControl`
  **Description:** Explicit force regulation along the tool approach axis (tool z): a PI law on the measured normal force gives a commanded force `F_cmd = Kp·e_F + Ki·∫e_F dt`, applied along the tool z-axis, mapped through `Jᵀ`, plus optional gravity compensation. The integral is clamped (anti-windup) and returned for the caller to persist.
  **Syntax:** `out = arm.forceControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tau, F_cmd, integral }`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Joint state |
  | `F_meas`, `F_ref` | number | *(required)* | Measured / desired normal force |
  | `R` | 3×3 | *(required)* | Tool rotation matrix (its third column is the force axis) |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Kp` | number | `1.0` | Proportional gain |
  | `Ki` | number | `0.1` | Integral gain |
  | `Kd` | number | `0.0` | Accepted but **not used** by the current implementation |
  | `integral` | number | `0` | Previous integral (caller persists) |
  | `integralClamp` | number | `20.0` | Anti-windup bound on the integral |
  | `dt` | number | `0.005` | Control period (s) |
  | `compensate` | boolean | `true` | Add gravity compensation |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `hybridControl`
  **Description:** Hybrid position/force control (Raibert–Craig). A per-axis selection vector `S` splits task space: axes with `S > 0.5` are **force-controlled** (`Kf·e_f + Kfi·∫e_f`), the rest **position-controlled** (`Kp·e_p + Kd·ė_p`); the resulting wrench is mapped through `Jᵀ` with optional gravity compensation.
  **Syntax:** `out = arm.hybridControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tau, wrenchCmd, integralF, ep, ef }` — persist `integralF`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Joint state |
  | `x`, `xd` | 6-vector | FK pose, `J·qd` | Current Cartesian pose / velocity |
  | `xRef`, `xdRef` | 6-vector | `x`, zeros | Position references |
  | `Fext`, `Fref` | 6-vector | zeros | Measured / desired wrench |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `S` | 6-vector | `[0,0,1, 0,0,0]` | Selection vector (`1` = force axis, `0` = position axis) |
  | `Kp` | 6-vector | `[400,400,400, 20,20,20]` | Position stiffness gain |
  | `Kd` | 6-vector | `[40,40,40, 5,5,5]` | Position damping gain |
  | `Kf` | 6-vector | `[0,0,1, 0,0,0]` | Force proportional gain |
  | `Kfi` | 6-vector | `[0,0,0.1, 0,0,0]` | Force integral gain |
  | `integralF` | 6-vector | zeros | Previous force integral (caller persists) |
  | `dt` | number | `0.005` | Control period (s) |
  | `compensate` | boolean | `true` | Add gravity compensation |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `parallelControl`
  **Description:** Parallel position/force control (Chiaverini–Siciliano). Both loops act on every axis at once: the force error shifts the position reference, `x_mod = x_ref + K_f·(F_ref − F_ext)`, and a Cartesian PD law tracks `x_mod`; torques via `Jᵀ` plus optional gravity compensation.
  **Syntax:** `out = arm.parallelControl(s, gains);`
  **Input Arguments:** `s`: same fields as `hybridControl`'s state (`q`, `qd`, `x`, `xd`, `xRef`, `xdRef`, `Fext`, `Fref`); `gains`: table below
  **Output Arguments:** `out`: `{ tau, xModified, F_cmd }` — `F_cmd` is the force error `F_ref − F_ext`

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Kp` | 6-vector | `[400,400,400, 20,20,20]` | Position gain |
  | `Kd` | 6-vector | `[40,40,40, 5,5,5]` | Damping gain |
  | `Kf` | 6-vector | `[0.001,0.001,0.001, 0.01,0.01,0.01]` | Force-to-position compliance |
  | `compensate` | boolean | `true` | Add gravity compensation |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `directTorqueControl`
  **Description:** Joint-space torque control without a force/torque sensor: `τ = τ_ff + Kp(q_ref − q) + Kd(q̇_ref − q̇)`, where the feedforward is the inverse dynamics `rne(q_ref, q̇_ref, q̈_ref)`. This is the "joint-space impedance" style used on collaborative arms.
  **Syntax:** `out = arm.directTorqueControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tau, tauFF, tauFB }`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Measured joint state |
  | `qRef`, `qdRef`, `qddRef` | `number[]` | `q`, zeros, zeros | Joint references |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Kp` | `number[]` (length ≥ n) | `[200,200,200, 50,50,50]` | Joint stiffness |
  | `Kd` | `number[]` (length ≥ n) | `[20,20,20, 5,5,5]` | Joint damping |
  | `feedforward` | boolean | `true` | Include the `rne` feedforward term |

- **Function:** `operationalSpaceControl`
  **Description:** Khatib-style operational-space control. Builds the joint-space inertia `M(q)` (via `_massMatrix`), the operational-space inertia `Λ = (J·M⁻¹·Jᵀ)⁻¹`, a desired Cartesian acceleration `ẍ_ref + Kp·e + Kd·ė`, the task force `F = Λ·a_des`, and `τ = Jᵀ·F` (+ optional `rne` compensation).
  **Syntax:** `out = arm.operationalSpaceControl(s, gains);`
  **Input Arguments:** `s`: `q`, `qd`, and optional `x`, `xd`, `xRef`, `xdRef`, `xddRef` (defaults as in `impedanceControl`); `gains`: table below
  **Output Arguments:** `out`: `{ tau, F_cmd, Λ }`

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Kp` | 6-vector | `[400,400,400, 20,20,20]` | Cartesian position gain |
  | `Kd` | 6-vector | `[40,40,40, 5,5,5]` | Cartesian damping gain |
  | `M` | `n×n` matrix | `_massMatrix(q)` | Override the joint-space inertia matrix |
  | `compensate` | boolean | `true` | Add `rne(q, qd, 0)` compensation |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `assistAsNeeded`
  **Description:** Assist-as-needed blend for rehabilitation / cobot use. Computes a scalar `α = clamp((|e| − eMin) / (eMax − eMin), 0, 1)` from a tracking-error metric and blends a "transparent" torque (`directTorqueControl` without feedforward, using the `KpTransparent` / `KdTransparent` gains) with an "assistive" torque (full `directTorqueControl`): `τ = (1 − α)·τ_transparent + α·τ_assist`.
  **Syntax:** `out = arm.assistAsNeeded(s, gains);`
  **Input Arguments:** `s`: as `directTorqueControl`; `gains`: table below (plus `Kp`, `Kd`, `feedforward` of `directTorqueControl`)
  **Output Arguments:** `out`: `{ tau, alpha, tauTransparent, tauAssist }`

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `eMin` | number | `0.02` | Error below which no assistance is applied |
  | `eMax` | number | `0.10` | Error at which full assistance is applied |
  | `errorMetric` | `function(s) → number` | max-norm of `|qRef − q|` | Custom scalar error measure |
  | `KpTransparent`, `KdTransparent` | `number[]` | `directTorqueControl` defaults | Low gains for the transparent mode |
  | `Kp`, `Kd`, `feedforward` | — | as `directTorqueControl` | Used by the assistive branch |

---

### Redundancy Resolution

- **Function:** `nullspaceProjector`
  **Description:** Computes the right pseudoinverse `J⁺ = Jᵀ(JJᵀ)⁻¹` and the null-space projector `N = I − J⁺J` for a full-row-rank Jacobian. See Debugging Programs: correct for a square `6×6` Jacobian only.
  **Syntax:** `{ Jpinv, N } = arm.nullspaceProjector(J);`
  **Input Arguments:** `J`: `6×n` Jacobian
  **Output Arguments:** `{ Jpinv, N }` — `Jpinv`: `n×6`; `N`: `n×n`

- **Function:** `nullspaceControl`
  **Description:** Combines a task-space velocity with a secondary joint velocity acting only in the null space: `q̇ = J⁺·ẋ + N·q̇₀`.
  **Syntax:** `qd = arm.nullspaceControl(J, xdot, qd0);`
  **Input Arguments:** `J`: `6×n` Jacobian; `xdot`: desired 6-D twist; `qd0`: secondary joint-velocity objective
  **Output Arguments:** `qd`: array of `n` joint velocities

---

### Joint-Velocity Control Stack

The velocity layer is designed to be chained: planner → `resolvedRateControl` → `velocityLimited` → `accelerationLimited` (or `velocityTrajectory`) → `jointVelocityControl`.

- **Function:** `jointVelocityControl`
  **Description:** Inner-loop joint-velocity controller: `τ = Kp·(q̇_ref − q̇) + Ki·∫(q̇_ref − q̇)dt + Kd·(q̈_ref − q̈) + τ_ff + τ_gravity`. The measured acceleration is a finite difference against `gains.prevQd` (zero if absent).
  **Syntax:** `out = arm.jointVelocityControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tau, integral, velError }` — persist `integral`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Measured joint position / velocity |
  | `qdRef`, `qddRef` | `number[]` | zeros | Reference velocity / acceleration |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Kp` | number \| `number[]` | `20.0` | Proportional gain (scalar or per-joint) |
  | `Ki` | number \| `number[]` | `2.0` | Integral gain |
  | `Kd` | number \| `number[]` | `0.5` | Acceleration-error gain |
  | `integral` | `number[]` | zeros | Previous integral (caller persists) |
  | `integralClamp` | number | `5.0` | Anti-windup bound per joint |
  | `prevQd` | `number[]` | *(none)* | Previous measured velocity, for the acceleration estimate |
  | `tauFF` | `number[]` | *(none)* | Extra feedforward torque |
  | `dt` | number | `0.005` | Control period (s) |
  | `compensate` | boolean | `true` | Add `rne(q, qd, 0)` compensation |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `resolvedRateControl`
  **Description:** Resolved-rate motion control: maps a desired Cartesian twist to joint velocities with a chosen inverse flavour, optionally adds a null-space secondary velocity, and optionally saturates the result. See Debugging Programs regarding the task-term product.
  **Syntax:** `out = arm.resolvedRateControl(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ qdRef, J, Jpinv, manipulability }` — `manipulability` is Yoshikawa's `√det(JJᵀ)`

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q` | `number[]` | *(required)* | Joint position |
  | `xd` | 6-vector | zeros | Desired Cartesian twist `[v; ω]` |
  | `qd0` | `number[]` | *(none)* | Null-space secondary joint velocity |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `method` | `'pinv'` \| `'dls'` \| `'trans'` | `'dls'` | `'pinv'`: Moore–Penrose (exact, full rank); `'dls'`: damped least squares (robust near singularities); `'trans'`: Jacobian transpose |
  | `lambda` | number | `0.05` | Damping factor for `'dls'` |
  | `qdMax` | number \| `number[]` | *(none)* | If given, saturate `qdRef` (direction-preserving) |
  | `model` | DH table | `puma01` | Arm model |

- **Function:** `velocityLimited`
  **Description:** Scales a joint-velocity vector uniformly so that no joint exceeds its limit, preserving the direction of motion (unlike per-axis clamping).
  **Syntax:** `qdOut = arm.velocityLimited(qd, qdMax);`
  **Input Arguments:** `qd`: raw velocity command; `qdMax`: per-joint limit array, or a scalar applied to every joint
  **Output Arguments:** `qdOut`: `number[]` (a copy when no scaling is needed)

- **Function:** `accelerationLimited`
  **Description:** Acceleration- and jerk-limited velocity filter (S-curve generator): the desired acceleration `(q̇_ref − q̇_prev)/dt` is clipped to `±aMax`, its change from the previous acceleration is clipped to `±jMax·dt`, and the velocity is integrated.
  **Syntax:** `{ qd, qdd } = arm.accelerationLimited(qdRef, qdPrev, qddPrev, gains);`
  **Input Arguments:** `qdRef`: desired velocity; `qdPrev`, `qddPrev`: previous filtered velocity / acceleration (caller persists); `gains`: table below
  **Output Arguments:** `{ qd, qdd }` — filtered velocity and acceleration, each `number[]`

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `aMax` | number \| `number[]` | `10.0` | Acceleration limit (rad/s²) |
  | `jMax` | number \| `number[]` | `500.0` | Jerk limit (rad/s³) |
  | `dt` | number | `0.005` | Control period (s) |

- **Function:** `velocityTrajectory`
  **Description:** Convenience wrapper chaining `velocityLimited` (limit `gains.qdMax`) into `accelerationLimited`, returning a filtered velocity/acceleration ready for `jointVelocityControl`.
  **Syntax:** `{ qd, qdd } = arm.velocityTrajectory(qdRef, state, gains);`
  **Input Arguments:** `qdRef`: planner velocity; `state`: `{ qdPrev, qddPrev }` (each defaults to zeros; caller persists); `gains`: `qdMax` (default `π`, scalar or per-joint) plus the `accelerationLimited` gains (`aMax`, `jMax`, `dt`)
  **Output Arguments:** `{ qd, qdd }`

---

### Sensorless Force Estimation

- **Function:** `momentumObserver`
  **Description:** Sensorless external-torque estimation by the generalized-momentum observer (De Luca & Mattone). Uses the momentum `p = M(q)·q̇`, the Coriolis term `Cᵀq̇` (Christoffel symbols by numerical differentiation of `M`), gravity `g(q) = rne(q, 0, 0)` and the measured joint torque `τ` (motor current × torque constant): `r_k = r_{k−1} + K_o·Δp − K_o·Δt·(τ + Cᵀq̇ − g − τ_fric + r_{k−1})`, with `τ̂_ext = r_k`. The joint-space estimate is mapped to a Cartesian wrench with `J⁺`.
  **Syntax:** `out = arm.momentumObserver(s, gains);`
  **Input Arguments:** `s`, `gains`: see tables
  **Output Arguments:** `out`: `{ tauExt, r, Fext, p, memory }` — pass `out.memory` back as `gains.memory` on the next tick

  | State `s.*` | Type | Default | Description |
  |---|---|---|---|
  | `q`, `qd` | `number[]` | *(required)* | Measured joint position / velocity |
  | `tau` | `number[]` | *(required)* | Measured (commanded/motor) joint torque |

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `Ko` | number \| `number[]` | `30.0` | Observer bandwidth |
  | `dt` | number | `0.005` | Control period (s) |
  | `memory` | object | initialised on first call | `{ qPrev, qdPrev, pPrev, rPrev }` from the previous call (caller persists) |
  | `rLPF` | number in (0, 1] | *(none)* | Optional first-order low-pass coefficient on `r` for noise suppression |
  | `friction` | object | *(none)* | Friction model passed to `this.frictionCompensate` — **not defined in this file** |
  | `model` | DH table | `puma01` | Arm model for the Jacobian |

- **Function:** `estimateExternalWrench`
  **Description:** High-level wrapper: runs `momentumObserver` and, when requested, rotates the estimated wrench from the world frame into the tool frame using the forward-kinematics rotation `Rᵀ`.
  **Syntax:** `out = arm.estimateExternalWrench(s, gains);`
  **Input Arguments:** `s`: as `momentumObserver`; `gains`: all `momentumObserver` gains plus `toToolFrame`
  **Output Arguments:** `out`: same object as `momentumObserver`, with `Fext` in the tool frame when `toToolFrame` is set

  | Gain `gains.*` | Type | Default | Description |
  |---|---|---|---|
  | `toToolFrame` | boolean | `false` | Rotate `Fext` (force and moment) into the tool frame |
  | *(all `momentumObserver` gains)* | — | — | `Ko`, `dt`, `memory`, `rLPF`, `friction`, `model` |

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `_identity4()` / `_identity3()` / `_identity(n)` | 4×4 / 3×3 / `n×n` identity matrices |
| `_diag3(a, b, c)` / `_diag6(d)` | 3×3 / 6×6 diagonal matrix from a vector |
| `_zeros(r, c)` | `r×c` zero matrix |
| `_mul4(A, B)` / `_mul3(A, B)` / `_mat_mul(A, B)` | 4×4 / 3×3 / general matrix product |
| `_mul3v(A, v)` / `_mat_vec(A, v)` | 3×3 / general matrix–vector product |
| `_matT_vec(A, v)` | Transpose-matrix–vector product `Aᵀ·v` |
| `_mul6x6(J, K, transposeJJt)` | Returns `J·Jᵀ` (6×6) when the third argument is `true`; otherwise a zero matrix (`n×n`) |
| `_transpose3(A)` | 3×3 transpose |
| `_cross(a, b)` / `_add3(a, b)` / `_dot(a, b)` | 3-vector cross product / sum / dot product |
| `_rotPart(T)` | 3×3 rotation block of a 4×4 transform |
| `_rotZYX(t1, t2, t3)` | Simplified `Rz·Ry·Rx` rotation used by `inverseKin` for the forearm |
| `_rotVecToR(w)` | Rodrigues formula: axis-angle vector → rotation matrix (currently unused) |
| `_eulerToR(w)` | Small-angle rotation vector → rotation matrix, used by the admittance methods |
| `_poseToT(p, R)` | Position + rotation → 4×4 homogeneous matrix |
| `_fkPose(model, q)` | Forward kinematics → 6-vector `[x, y, z, wx, wy, wz]` (axis-angle) |
| `_orientationError(R, Rd)` | World-frame axis-angle error of `Rd·Rᵀ`, used by `numericalIK` |
| `_resolveChain(arg1, q)` | Normalises a link-matrix list or `(model, q)` pair into a list of link matrices for `jacobian` |
| `_solveLinear(A, b)` | Gauss–Jordan solve of a small dense system, used by `numericalIK` |
| `_invert(A)` | Gauss–Jordan matrix inverse — **no singularity check** (last definition wins) |
| `_det(A)` | Determinant by LU-style elimination |
| `_pseudoInverse(J)` | Moore–Penrose pseudoinverse (`(JᵀJ)⁻¹Jᵀ` or `Jᵀ(JJᵀ)⁻¹` by shape) |
| `_pinvJT(J)` | `J·(JᵀJ)⁻¹` (currently unused) |
| `_dlsInverse(J, lambda)` | Damped least-squares pseudoinverse `Jᵀ(JJᵀ + λ²I)⁻¹` |
| `_nullspaceProjector(J, Jpinv)` | `N = I − J⁺J` (`n×n`), given a precomputed pseudoinverse |
| `_manipulability(J)` | Yoshikawa manipulability `√det(JJᵀ)` |
| `_saturateVector(v, limit)` | Direction-preserving scaling so `max|vᵢ/limitᵢ| ≤ 1` |
| `_seedFromPosition(p, model)` | Heuristic initial joint guess `[base angle, shoulder, elbow, 0, 0, 0]` for `numericalIK` |
| `_withinLimits(q, qMin, qMax)` | Joint-limit check (missing limits = free) |
| `_workspaceRadius(model)` | Conservative maximum reach `Σ(|a| + |d|)` |
| `_timeLaw(tau, T, method)` | Scalar time law `{ s, sd, sdd }` for `timeParameterize` |
| `_segmentDuration(dq, vMax, aMax, method)` | Segment duration satisfying velocity/acceleration bounds (quintic peak factors `1.875/T` and `5.7735/T²`) |
| `_massMatrix(q)` | Simplified joint-space inertia matrix (point masses at the distal frame origins; link inertia tensors and COM offsets are ignored) |
| `_coriolisTransposeTimesQd(q, qd)` | `Cᵀ(q, q̇)·q̇` by Christoffel symbols with central-difference derivatives of `M` (step `1e-6`) |
| `_computeAssistAlpha(s, gains)` | Assistance factor `α` for `assistAsNeeded` |
| `_safetyCheck(xMod, q, gains)` | Workspace-envelope and inner-loop-bandwidth check for `passiveAdmittanceControl`; returns `{ ok, issues }` |

---
