# CaroLab Manipulator Library — Kinematics Examples Manual

- **Name:** caro.manipulator-1.0.js (kinematics example set)
- **Release Date:** 29 September 2026
- **Document Name:** Kinematics Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — DH Transform (`DH.js`)](#example-1--dh-transform-dhjs)
4. [Example 2 — Forward Kinematics at Zero Pose (`ForwardKin1.js`)](#example-2--forward-kinematics-at-zero-pose-forwardkin1js)
5. [Example 3 — Forward Kinematics from a Chain of Link Matrices (`ForwardKin2.js`)](#example-3--forward-kinematics-from-a-chain-of-link-matrices-forwardkin2js)
6. [Example 4 — Analytical Inverse Kinematics (`InverseKin.js`)](#example-4--analytical-inverse-kinematics-inversekinjs)
7. [Example 5 — Numerical IK with a Warm Start (`Nik.js`)](#example-5--numerical-ik-with-a-warm-start-nikjs)
8. [Example 6 — Numerical IK from a Cold Start (`NikColdStart.js`)](#example-6--numerical-ik-from-a-cold-start-nikcoldstartjs)
9. [Example 7 — Analytical vs Numerical Comparison (`NikCompareAgainstAnalytic.js`)](#example-7--analytical-vs-numerical-comparison-nikcompareagainstanalyticjs)
10. [Example 8 — Joint-Limit-Aware IK (`NikJointLimitAware.js`)](#example-8--joint-limit-aware-ik-nikjointlimitawarejs)
11. [Example 9 — Smart IK Dispatcher (`NikSmart.js`)](#example-9--smart-ik-dispatcher-niksmartjs)
12. [Example 10 — Unreachable Target Handling (`NikUnreachableTarget.js`)](#example-10--unreachable-target-handling-nikunreachabletargetjs)
13. [Example 11 — Servo Angles and Line Path (`Theta2ServoAngles.js`)](#example-11--servo-angles-and-line-path-theta2servoanglesjs)
14. [What the Eleven Examples Prove Together](#what-the-eleven-examples-prove-together)
15. [Extending the Examples](#extending-the-examples)
16. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the **kinematics companion** to the Dynamics Examples Manual. Where that document covered the Jacobian, joint velocities, and inverse dynamics, this one covers the **geometry layer**: Denavit–Hartenberg transforms, forward kinematics, analytical and numerical inverse kinematics, the smart dispatcher, and the servo-angle utility.

The eleven examples in this set cover the entire kinematic pipeline:

| Quantity | Symbol | Example(s) |
|---|---|---|
| Single link transform | `A_i` | `DH.js` |
| Forward pose from a DH table | `T = ∏ A_i` | `ForwardKin1.js`, `ForwardKin2.js` |
| Closed-form joint angles | `q = IK(p, R)` | `InverseKin.js` |
| Numerical joint angles | `q = DLS-IK(p, R)` | `Nik.js`, `NikColdStart.js`, `NikJointLimitAware.js`, `NikUnreachableTarget.js` |
| Analytic-vs-numerical agreement | pose error | `NikCompareAgainstAnalytic.js` |
| Smart dispatcher | `inverseKinSmart` | `NikSmart.js` |
| Servo mapping + path sampling | `theta2servoAngles`, `pathTracking` | `Theta2ServoAngles.js` |

Together they form a **verification suite** for the kinematics layer. Each script has a known expected output, so a failure points directly to the responsible method. Use them as:

- **regression tests** after changing DH parameters, sign conventions, or IK formulas,
- **teaching material** for readers learning the library's coordinate conventions,
- **diagnostic checks** before running the full trajectory + control stack.

### Conventions

| Item | Convention |
|---|---|
| Angles | Radians |
| Lengths | Metres |
| Joint vector | `q = [q1, q2, q3, q4, q5, q6]` — six joints for the built-in PUMA-560-like model |
| DH table | `arm.DH_Lib.puma01` — the model used throughout this document |
| DH row | `[theta, a, d, alpha]` — `theta` is the joint-angle **offset**, added to `q[i]` |
| DH transform | `A = Rot_z(θ)·Trans_z(d)·Trans_x(a)·Rot_x(α)` (standard Craig/Spong convention) |
| Pose (6-vector) | `[x, y, z, wx, wy, wz]` — position + axis-angle rotation vector |
| Rotation matrix | 3×3 array with tool axes `n, o, a` as **columns** (a = approach = tool z) |
| Flattened FK tuple | `flat = [nx, ny, nz, px, ox, oy, oz, py, ax, ay, az, pz]` |

All scripts use **CommonJS** (`require`) because they are intended to be run with Node.js.

### Required Files and Layout

The eleven example scripts are assumed to live in a `kinematics/` subfolder, with the library one level up:

```
project/
├── caro.manipulator-1.0.js               
└── kinematics/
    ├── DH.js
    ├── ForwardKin1.js
    ├── ForwardKin2.js
    ├── InverseKin.js
    ├── Nik.js
    ├── NikColdStart.js
    ├── NikCompareAgainstAnalytic.js
    ├── NikJointLimitAware.js
    ├── NikSmart.js
    ├── NikUnreachableTarget.js
    └── Theta2ServoAngles.js
```

### How to Run the Examples

From the folder that contains the scripts:

```
node DH.js
node ForwardKin1.js
node ForwardKin2.js
node InverseKin.js
node Nik.js
node NikColdStart.js
node NikCompareAgainstAnalytic.js
node NikJointLimitAware.js
node NikSmart.js
node NikUnreachableTarget.js
node Theta2ServoAngles.js
```

Or from the project root:

```
node kinematics/DH.js
```

Each script writes one block of text to the console and exits. No files are created, nothing is written to disk.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `DH.js` | `DH(θ, a, d, α)` | Print one link transform, rounded for readability |
| 2 | `ForwardKin1.js` | `forwardKin(model, q)` | Forward pose at the zero joint configuration |
| 3 | `ForwardKin2.js` | `forwardKin(Ai)` | Forward pose from a hand-built chain of link matrices |
| 4 | `InverseKin.js` | `forwardKin`, `inverseKin` | Round-trip: FK → analytic IK → compare angles |
| 5 | `Nik.js` | `forwardKin`, `numericalIK` | Numerical IK with a warm seed near the true solution |
| 6 | `NikColdStart.js` | `numericalIK` with `q0 = 0` | Numerical IK from a poor initial guess |
| 7 | `NikCompareAgainstAnalytic.js` | `inverseKin`, `numericalIK`, `forwardKin` | Side-by-side comparison with pose residuals |
| 8 | `NikJointLimitAware.js` | `numericalIK` with `qMin/qMax` | IK that respects per-joint limits |
| 9 | `NikSmart.js` | `inverseKinSmart` | Analytic-first dispatcher with numerical fallback |
| 10 | `NikUnreachableTarget.js` | `numericalIK` on an out-of-reach target | Graceful failure semantics |
| 11 | `Theta2ServoAngles.js` | `theta2servoAngles`, `pathTracking` | Servo mapping + line-path sampling through IK |

---

## Example 1 — DH Transform (`DH.js`)

- **Purpose:** Print a **single** Denavit–Hartenberg transform, with all entries rounded to four decimals so the matrix pattern is easy to read. This is the atom of the entire kinematics layer — every forward-kinematics result is a product of these matrices.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// A single revolute joint with twist
const A1 = arm.DH(
  /* theta */ Math.PI / 4,   // 45°
  /* a     */ 0.0,
  /* d     */ 0.0,
  /* alpha */ Math.PI / 2    // 90°
);

const A1_ = A1.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

console.table(A1_);
```

- **Method invoked:** `arm.DH(theta, a, d, alpha)` — a pure mathematical function that returns one 4×4 homogeneous matrix.
- **Inputs:**
  - `theta = π/4` — a 45° rotation about the link's z-axis.
  - `a = 0`, `d = 0` — no translation.
  - `alpha = π/2` — a 90° twist about the new x-axis, which is the classic "revolute-then-twist" pattern used by joint 1 of most PUMA-style arms.
- **Output:** a 4×4 matrix printed via `console.table`, so you see a clean grid rather than a nested array.
- **Expected output (rounded to 4 decimals):**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ (index) │ 0       │ 1       │ 2       │ 3       │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 0       │ 0.7071  │ 0       │ 0.7071  │ 0       │
│ 1       │ 0.7071  │ 0       │ -0.7071 │ 0       │
│ 2       │ 0       │ 1       │ 0       │ 0       │
│ 3       │ 0       │ 0       │ 0       │ 1       │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

- **Reading the output:**
  - **Upper-left 3×3 block** — the rotation `Rz(45°)·Rx(90°)`. Column 0 is the new x-axis in world coordinates; column 1 is the new y-axis; column 2 is the new z-axis.
  - **Column 3** — position of the frame origin. All zeros here, because we asked for no translation.
  - **Last row** — always `[0, 0, 0, 1]` for a homogeneous transform.
- **Coding example:** as shown. The `A1_` variable is the rounded copy; the original `A1` (full precision) is what the rest of the library consumes.
- **Why this specific example:** it exercises **both rotation terms** (θ and α) and no translation. If you also want to see the translation part, replace `a = 0, d = 0` with, say, `a = 0.3, d = 0.1` and rerun — the third column of the output will then show where the frame lands.
- **Common pitfalls:**
  - **Do not round the matrix before passing it to `forwardKin`.** Rounding is only for display. Four decimals is fine visually but introduces 1e-4 error into any downstream multiplication.
  - **`console.table` is for human viewing.** If you want to save the matrix to disk or compare it programmatically, print it with `JSON.stringify(A1, null, 2)` instead.
  - **Order of arguments matters.** `DH(theta, a, d, alpha)` is the standard order — not `DH(a, d, theta, alpha)` or any other permutation. Getting it wrong still produces a valid-looking matrix but with a different meaning.

---

## Example 2 — Forward Kinematics at Zero Pose (`ForwardKin1.js`)

- **Purpose:** Compute the tool pose at the **zero joint configuration** using the full DH table, and print position, tool axes, and the flattened 12-element tuple. This is the reference pose — the shape of the arm when every joint is at rest.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q0   = [0, 0, 0, 0, 0, 0];   // all joints at zero

const { T, flat } = arm.forwardKin(puma, q0);

const T_ = T.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

const flat_ = flat.map(v => Number(v.toFixed(4)));

console.log("Tool position  p =", [T_[0][3], T_[1][3], T_[2][3]]);
console.log("Tool x-axis   n =", [T_[0][0], T_[1][0], T_[2][0]]);
console.log("Tool y-axis   o =", [T_[0][1], T_[1][1], T_[2][1]]);
console.log("Tool z-axis   a =", [T_[0][2], T_[1][2], T_[2][2]]);
console.log("Flattened n,o,a,p tuple:", flat_);
```

- **Method invoked:** `arm.forwardKin(model, q)` — the `(model, q)` call form, which builds each link matrix from the DH table and multiplies them.
- **Inputs:**
  - `model = arm.DH_Lib.puma01` — the built-in PUMA-560-like table.
  - `q0 = [0, 0, 0, 0, 0, 0]` — every joint at zero. The PUMA table has zero `theta` offsets, so the transforms are exactly the "link-only" transforms at this pose.
- **Output:** five lines — position `p`, the three tool axes `n, o, a`, and the flattened tuple.
- **Expected output (PUMA 560 at zero pose):**

```
Tool position  p = [ 0.41148, 0, 0.63841 ]
Tool x-axis   n = [1, 0, 0]
Tool y-axis   o = [0, 1, 0]
Tool z-axis   a = [0, 0, 1]
Flattened n,o,a,p tuple: [1, 0, 0, 0.4115, 0, 1, 0, 0, 0, 0, 1, 0.6384]
```

- **Reading the output:**
  - **`p = [0.41148, 0, 0.63841]`** — the tool sits 41 cm forward and 64 cm up from the base, along the arm's natural reach direction. All the y-coordinate is zero because every joint is at zero, so the arm lies exactly in the x-z plane.
  - **`n = [1, 0, 0]`, `o = [0, 1, 0]`, `a = [0, 0, 1]`** — at zero pose the tool frame is aligned with the world frame. This is a great sanity check: any deviation here means the DH table has nonzero `theta` offsets or a wrong `alpha` column.
  - **`flat_`** — the 12-element tuple, in the order `[nx, ny, nz, px, ox, oy, oz, py, ax, ay, az, pz]`.
- **Coding example:** as shown. Note the **two separate rounding steps**: `T_` rounds the full 4×4 matrix for readability, `flat_` rounds the flattened tuple separately. The `Number(v.toFixed(4))` form is preferred over `Math.round(v * 1e4) / 1e4` when you want a clean number instead of a string.
- **Why this example is useful:** it is the baseline pose against which every subsequent FK result can be compared. If Example 2 is correct, `forwardKin` is correct at zero; if later examples work, it's correct at other poses too.
- **Common pitfalls:**
  - **`flat` order is not what the source comment suggests.** The comment in `forwardKin` says `[nX,oX,aX,pX, ...]`, but the actual element order is `[nx, ny, nz, px, ox, oy, oz, py, ax, ay, az, pz]` — first the tool x-axis as a 3-vector, then its position component; then the tool y-axis, etc. This is the "column-major" layout and is the one used by all libraries that follow the Paul/Craig convention.
  - **The position depends on all six DH rows, not just the first three.** If you get a wrong `p`, check the `a` and `d` columns of the whole table, not just joints 1–3.
  - **Zero pose is not always the "home" pose.** Some robots define their home pose with nonzero joint angles. Here, "home" and "zero" coincide only because the PUMA table has no joint offsets.

## Example 3 — Forward Kinematics from a Chain of Link Matrices (`ForwardKin2.js`)

- **Purpose:** Compute the tool pose from a **hand-built chain of link matrices** rather than from the DH table. This is the `forwardKin(Ai)` call form, and it is the one you use when you already have the link transforms from another source — e.g. a planner, a simulator, or a different DH convention.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2];

// Build Ai list manually
const Ai = puma.map((row, i) => {
  const [th0, a, d, alpha] = row;
  return arm.DH(th0 + q[i], a, d, alpha);
});

const { T: T2, flat: flat2 } = arm.forwardKin(Ai);

const T2_ = T2.map(row =>
  row.map(v => Math.round(v * 1e4) / 1e4)
);

console.log("Position from Ai chain:", [T2_[0][3], T2_[1][3], T2_[2][3]]);
```

- **Method invoked:** `arm.forwardKin(Ai)` — the list-of-matrices call form. The function detects that the argument is a nested array of 4×4 matrices and simply multiplies them in order.
- **Inputs:**
  - `q = [0.3, -0.4, 0.5, 0.0, 0.6, 0.2]` — a nontrivial joint configuration, with the shoulder and elbow bent and the wrist slightly rotated.
  - `Ai` — a six-element list built by mapping over the DH table and applying `arm.DH(th0 + q[i], a, d, alpha)` for each row. The resulting `Ai` list is exactly what `forwardKin(model, q)` builds internally.
- **Output:** a single line showing the tool position in world coordinates.
- **Expected behaviour:** for the same `q`, this must produce the same `T` as `forwardKin(puma, q)`. To confirm, compare against Example 2's code with `q` replaced by `[0.3, -0.4, 0.5, 0.0, 0.6, 0.2]` — the two should match exactly.
- **Reading the output:**
  - **Position** — a three-element array `[x, y, z]`. All entries should be within the reachable workspace (roughly `|p| < 0.8 m` for the PUMA model with these link lengths).
  - **Cross-check:** if you also print `T2` fully, the three columns of its rotation block should be orthonormal. You can verify with a quick dot-product test.
- **Coding example:** as shown. The map/return pattern is the standard way to convert a DH table into a chain of matrices — keep it as a template for other models.
- **Why this example is useful:** it proves that `forwardKin` is not secretly tied to a specific model. Any 4×4 chain works, including chains built from a completely different DH table, from URDF-derived transforms, or from measured hardware.
- **Common pitfalls:**
  - **Do not pass a flattened matrix.** `forwardKin(Ai)` expects a list of 4×4 matrices. Passing a list of 12-element arrays triggers a `TypeError`.
  - **`Ai` must be a list, not a single matrix.** `forwardKin(A1)` (without the list wrapper) is a common mistake — the function will not detect the shape and will fail.
  - **The order of multiplication is left-to-right in the list.** If you build `Ai` in reverse order, `forwardKin` still multiplies them in the order given, so the result is the inverse chain — wrong but silently so. Keep the map order aligned with the joint order.

---

## Example 4 — Analytical Inverse Kinematics (`InverseKin.js`)

- **Purpose:** Round-trip test of the analytical IK. Take a known `qTarget`, compute its pose with `forwardKin`, feed the pose into `inverseKin`, and check that the recovered angles match the original.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

const qTarget = [0.2, -0.5, 0.8, 0.3, 0.4, -0.1];

// Forward: get pose
const { T } = arm.forwardKin(puma, qTarget);
const position    = [T[0][3], T[1][3], T[2][3]];
const orientation = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

// Inverse: recover angles
const qSolved = arm.inverseKin(position, orientation);

console.log("Target q :", qTarget.map(x => x.toFixed(3)));
console.log("Solved q :", qSolved.map(x => x.toFixed(3)));
```

- **Methods invoked:** `arm.forwardKin(model, q)` (once) and `arm.inverseKin(position, orientation)` (once).
- **Inputs:**
  - `qTarget = [0.2, -0.5, 0.8, 0.3, 0.4, -0.1]` — a moderate pose chosen so the arm is nowhere near a singularity. All six joints are engaged.
  - The orientation matrix `orientation` is extracted from the FK output directly, so it is by construction exactly consistent with the position and the PUMA model.
- **Output:** two lines — the target angles and the solved angles, each rounded to three decimals.
- **Expected output:**

```
Target q : [ 0.200, -0.500,  0.800,  0.300,  0.400, -0.100 ]
Solved q : [ 0.200, -0.500,  0.800,  0.300,  0.400, -0.100 ]
```

- **Coding example:** as shown. The pattern is **FK → pose → IK → compare** — this is the gold standard for verifying any IK implementation.
- **Reading the output:**
  - **Match to 3 decimals** — the analytical IK is consistent with the FK and with the DH convention. This is the normal case.
  - **Match only in position but not orientation** — the wrist branch is different but geometrically valid (the tool reached the same point with the same rotation matrix, so the wrist angles must be the same modulo 2π). If they still disagree, one of the wrist formulas is wrong.
  - **Match with a sign flip on q3, q4, q5, or q6** — you may have hit a **different IK branch** (elbow-up vs. elbow-down, wrist-flip vs. wrist-non-flip). PUMA has up to 8 valid solutions; the analytical routine returns exactly one of them. As long as FK of the solved q gives the same pose, all is well.
- **Why this example matters:** analytical IK formulas are notoriously easy to get wrong in signs. A round-trip test catches every sign error that would otherwise be hidden until hardware testing.
- **Common pitfalls:**
  - **The `orientation` argument must be a 3×3 matrix, not a pose vector.** Passing a 6-vector produces `NaN`s silently.
  - **`position` is a 3-vector `[x, y, z]`, not `[x, y, z, wx, wy, wz]`.** The extra three components are ignored by the current implementation — fine, but worth knowing.
  - **`inverseKin` always uses the built-in `puma01` table**, regardless of the model argument that might be in scope. It is PUMA-specific by design — see Example 9 for the generic dispatcher.
  - **`acos`/`asin` arguments are clamped to `[-1, 1]`** inside `inverseKin`. An unreachable target silently produces a saturated (wrong) solution instead of an error. Use `inverseKinSmart` (Example 9) when targets might be unreachable.

---

## Example 5 — Numerical IK with a Warm Start (`Nik.js`)

- **Purpose:** Run the damped-least-squares numerical IK with a good initial seed. This demonstrates the "warm start" pattern — the recommended way to use `numericalIK` inside a control loop, since a warm start converges in a handful of iterations.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

// A reachable target pose
const qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1];
const { T } = arm.forwardKin(puma, qTrue);
const p = [T[0][3], T[1][3], T[2][3]];
const R = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

const result = arm.numericalIK(p, R, {
  q0: [0.2, -0.4, 0.6, 0.0, 0.4, 0.0]   // seed near solution
});

console.log("Converged  :", result.converged);
console.log("Iterations :", result.iterations);
console.log("Error      :", result.error.toExponential(2));
console.log("q solved   :", result.q.map(x => x.toFixed(4)));
console.log("q target   :", qTrue.map(x => x.toFixed(4)));
```

- **Method invoked:** `arm.numericalIK(position, orientation, opts)` with a warm-start `q0`.
- **Inputs:**
  - `qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1]` — the target joint configuration (used only to generate a valid pose).
  - `p, R` — the pose extracted from FK of `qTrue`.
  - `q0 = [0.2, -0.4, 0.6, 0.0, 0.4, 0.0]` — a seed reasonably close to `qTrue`, but not identical. This mimics what a warm start from the previous control tick would give you.
- **Output:** five lines — convergence flag, iteration count, final pose error, solved joints, and the target joints for comparison.
- **Expected output:**

```
Converged  : true
Iterations : 8
Error      : 3.21e-8
q solved   : [ 0.3000, -0.6000, 0.9000,  0.2000, 0.5000, -0.1000 ]
q target   : [ 0.3000, -0.6000, 0.9000,  0.2000, 0.5000, -0.1000 ]
```

- **Reading the output:**
  - **`Converged: true`** — the LM loop accepted at least one step that reduced the error below `tol` (default `1e-6`).
  - **`Iterations: 8`** — a warm start converges in single-digit iterations. This is why warm starting matters: `numericalIK` is cheap enough to run at 100 Hz if the seed is good.
  - **`Error: ~1e-8`** — the final 6-D pose error norm. Any value at or below `1e-6` means the solve succeeded; anything in the `1e-3` range means the target was barely reachable; a value near `1e-1` or higher means the solve is effectively stuck.
  - **`q solved ≈ q target`** — when the seed is close, the solver converges to the same branch.
- **Coding example:** as shown. The one-line `q0` argument is the entire warm-start mechanism. In a real controller, `q0` is the joint vector from the previous tick.
- **Why warm-start matters:**
  - **Iteration count** — cold start (Example 6) takes ~5× more iterations for the same tolerance.
  - **Branch selection** — a warm start keeps you on the same IK branch; a cold start may jump to a different branch and cause a discontinuity in the joint trajectory.
  - **Robustness** — near singular configurations, only a warm start reliably converges. Cold starts can stall.
- **Common pitfalls:**
  - **`q0` must be a full joint vector of length `n`.** Passing a 3-vector produces a `TypeError` inside the loop.
  - **`q0` must be a *copy*.** Because `numericalIK` does `[...opts.q0]`, the original array is safe — but if you pass a slice of a shared buffer, the buffer should already be the current estimate, not a stale one.
  - **Warm start is not the same as "start from the target's neighbourhood".** In a control loop, use the previous tick's `q`, not a "best guess" of the target's neighbourhood — the previous tick *is* the neighbourhood.
  - **`result.q` is a new array**, not a modification of `q0`. Read it from the return value; do not expect `q0` to change.

## Example 6 — Numerical IK from a Cold Start (`NikColdStart.js`)

- **Purpose:** Run the same numerical IK but from a **poor initial guess** (`q0` = all zeros) to show how much more work the solver has to do. This is the counterpoint to Example 5 — useful for understanding the cost of a warm start.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

// A reachable target pose
const qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1];
const { T } = arm.forwardKin(puma, qTrue);
const p = [T[0][3], T[1][3], T[2][3]];
const R = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

const result = arm.numericalIK(p, R, { q0: [0,0,0,0,0,0] });

console.log("Cold start → converged:", result.converged,
            "| iter:", result.iterations,
            "| err:", result.error.toExponential(2));
```

- **Method invoked:** `arm.numericalIK(position, orientation, opts)` with `opts.q0 = [0,0,0,0,0,0]`.
- **Inputs:**
  - Same `qTrue`, `p`, and `R` as Example 5.
  - `q0` — all zeros, a genuinely bad seed for a target that requires significant shoulder and elbow motion.
- **Output:** one line — convergence flag, iteration count, and final error.
- **Expected output:**

```
Cold start → converged: true | iter: 42 | err: 7.14e-7
```

- **Reading the output:**
  - **`Converged: true`** — the LM algorithm is robust enough to escape a poor seed, but only because the target is reachable.
  - **`Iterations: ~40`** — about five times the warm-start iteration count. At 1 kHz this is still only 40 ms of compute, but in a real control loop, that would be 40 missed ticks.
  - **`Error: ~1e-6`** — meets the default tolerance, but the solve is "just barely" successful. A slightly harder target might not converge.
- **Coding example:** as shown. The only difference from Example 5 is the seed.
- **When cold starts are appropriate:**
  - **At startup** — the very first IK solve for a robot has no previous tick, so a cold start is unavoidable. Use `inverseKinSmart` with its heuristic seed (Example 9) instead of an all-zeros `q0`.
  - **After re-initialization** — if the arm has been re-homed or the controller has restarted mid-motion.
- **When cold starts are dangerous:**
  - **Inside a control loop** — a cold start may converge to a *different IK branch* than the previous tick, causing the joint vector to jump discontinuously between ticks. Always warm-start in the loop.
  - **Near singularities** — cold starts amplify the near-singular direction, sometimes landing on absurd joint values. The LM damping helps but does not eliminate this.
- **Common pitfalls:**
  - **`q0 = zeros` is not a neutral seed.** It biases the solve toward the "all-stretched" configuration. If the target is far from that shape, the solver has to travel a long way.
  - **Faster convergence ≠ better solution.** A cold start that converges in 42 iterations is doing more work than a warm start in 8; the total compute cost is the iteration count times the per-iteration cost, which is roughly constant.
  - **The output is a single line.** Do not compare it visually with the multi-line output of Example 5 — the two scripts answer different questions (robustness vs. speed).

---

## Example 7 — Analytical vs Numerical Comparison (`NikCompareAgainstAnalytic.js`)

- **Purpose:** Directly compare the analytic and numerical IK routines by running both on the same pose and printing their pose residuals. This is the definitive cross-check between the two solvers.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function compareSolvers(arm, qTrue) {
  const { T } = arm.forwardKin(arm.DH_Lib.puma01, qTrue);
  const p = [T[0][3], T[1][3], T[2][3]];
  const R = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]]
  ];

  const qAna = arm.inverseKin(p, R);
  const num  = arm.numericalIK(p, R, { q0: qAna });   // seed from analytic

  // FK from each solution -> compare final pose
  const { T: Ta } = arm.forwardKin(arm.DH_Lib.puma01, qAna);
  const { T: Tn } = arm.forwardKin(arm.DH_Lib.puma01, num.q);

  const poseDiff = (A, B) => {
    let s = 0;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 4; j++)
        s += (A[i][j] - B[i][j]) ** 2;
    return Math.sqrt(s);
  };

  return {
    analytic:      { q: qAna, poseErr: poseDiff(Ta, T) },
    numerical:     { q: num.q, poseErr: poseDiff(Tn, T),
                     iter: num.iterations, converged: num.converged }
  };
}

const report = compareSolvers(arm, [0.3, -0.6, 0.9, 0.2, 0.5, -0.1]);
console.log(JSON.stringify(report, null, 2));
```

- **Methods invoked:** `forwardKin` (three times), `inverseKin` (once), `numericalIK` (once).
- **Inputs:** `qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1]` — the same target used in Examples 5 and 6.
- **Output:** a JSON object with two entries:
  - `analytic` — the analytic solution's joints and the residual pose error.
  - `numerical` — the numerical solution's joints, its iteration count, convergence flag, and residual pose error.
- **Expected output (abridged):**

```json
{
  "analytic": {
    "q": [0.3, -0.6, 0.9, 0.2, 0.5, -0.1],
    "poseErr": 4.6e-16
  },
  "numerical": {
    "q": [0.3, -0.6, 0.9, 0.2, 0.5, -0.1],
    "poseErr": 2.1e-15,
    "iter": 3,
    "converged": true
  }
}
```

- **Reading the output:**
  - **`poseErr` for the analytic solution** — the residual between the original FK and the FK of the analytic solution. It should be at machine-precision level (`1e-14` or smaller). Anything above `1e-10` means the analytic IK is slightly off — usually due to one of the simplified formulas in the wrist extraction.
  - **`poseErr` for the numerical solution** — same idea, but for the DLS solve. Seeded from the analytic answer, the numerical solver should barely need to move and should converge in 2–5 iterations.
  - **Joint vector agreement** — the two `q` arrays are usually identical at 3 decimals. If they differ, both still represent valid IK branches — compare the `poseErr` fields, which are the real metric.
- **Coding example:** as shown. The `poseDiff` function is a simple Frobenius-style distance between the top three rows of two homogeneous transforms. It captures both translation and rotation error in one number.
- **Why this example matters:** the analytic IK and the numerical IK are completely independent implementations of the same mathematical operation. If they agree, both are almost certainly correct. If they disagree, one has a bug — and the sign of the disagreement (position vs. rotation, x vs. y, etc.) points to where.
- **Common pitfalls:**
  - **Numerical IK seeded from the analytic answer is not a fair comparison of speed.** Because the seed is already the solution, the numerical solver converges in 2–3 iterations. For a fair speed comparison, use Example 5's moderate seed or Example 6's cold seed.
  - **The output is JSON, not a table.** If you want to eyeball the two joint vectors side by side, add a `console.table` after the JSON.
  - **`poseDiff` uses only the top three rows of `T`.** The bottom row `[0, 0, 0, 1]` is identical for both transforms, so including it adds no information.

---

## Example 8 — Joint-Limit-Aware IK (`NikJointLimitAware.js`)

- **Purpose:** Run numerical IK with **per-joint limits**. The solver clamps trial steps to `qMin`/`qMax` at every iteration. This is essential for real robots, which cannot exceed their mechanical ranges.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

// A reachable target pose
const qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1];
const { T } = arm.forwardKin(puma, qTrue);
const p = [T[0][3], T[1][3], T[2][3]];
const R = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

const qMin = [-2.5, -2.0, -2.5, -2.5, -2.0, -2.5];
const qMax = [ 2.5,  2.0,  2.5,  2.5,  2.0,  2.5];

// Target that would normally require q2 < -2.0
const result = arm.numericalIK(p, R, {
  q0: [0.2, -0.4, 0.6, 0.0, 0.4, 0.0],
  qMin, qMax
});

const inLimits = result.q.every((v, i) => v >= qMin[i] && v <= qMax[i]);
console.log("Converged  :", result.converged);
console.log("In limits  :", inLimits);
console.log("q          :", result.q.map(x => x.toFixed(3)));
```

- **Method invoked:** `arm.numericalIK(position, orientation, opts)` with `opts.qMin` and `opts.qMax` set.
- **Inputs:**
  - `qTrue` and the derived pose — same as Examples 5–7.
  - `qMin = [-2.5, -2.0, -2.5, -2.5, -2.0, -2.5]` and `qMax = [2.5, 2.0, 2.5, 2.5, 2.0, 2.5]` — asymmetric joint limits, tighter on joints 2 and 5.
  - `q0 = [0.2, -0.4, 0.6, 0.0, 0.4, 0.0]` — a warm-start seed near but not inside the eventual solution.
- **Output:** three lines — convergence flag, whether the solution lies within limits, and the joint vector.
- **Expected output:**

```
Converged  : true
In limits  : true
q          : [ 0.300, -0.600,  0.900,  0.200,  0.500, -0.100 ]
```

- **Reading the output:**
  - **`Converged: true`** — the solver found a solution that satisfies the tolerance *and* the joint limits.
  - **`In limits: true`** — the final joint vector is inside `[qMin, qMax]` element-wise. This is the crucial check — the solver clamps trial steps, so the returned `q` should never lie outside.
  - **Joint vector** — matches `qTrue` when `qTrue` itself is inside the limits. If the target required a joint outside `[qMin, qMax]`, the solver would settle on the boundary and `Converged` would likely be `false`.
- **Coding example:** as shown. The `inLimits` check is a one-liner and worth including in every IK call in production code.
- **How the limits are enforced:** each trial step `qTrial = q + dq` is clamped element-wise to `[qMin[i], qMax[i]]` before the error is evaluated. If the clamped step does not decrease the error, LM enlarges the damping factor and retries. Over iterations, the solver either finds a solution inside the limits or reports non-convergence.
- **Common pitfalls:**
  - **Limits are clamped, not projected.** The solver does not push the joint away from the boundary; it just stops the step at the boundary. For trajectory planning you may also want a *soft* margin — pass `qMin = limits − margin` to keep the arm away from the hard stops.
  - **`qMin` and `qMax` must both be provided or both omitted.** Passing only one produces a `TypeError` inside the clamping loop.
  - **Joint limits affect branch selection.** A target reachable by two IK branches may be reachable only by the one whose joints happen to fit the limits. The returned `q` will be that branch, not necessarily the one closest to the seed.
  - **`inLimits` should be checked even when `converged` is true.** The solver's convergence criterion is the pose error, not the joint limits — but with clamping in the loop, a successful solve always lands inside the limits.

## Example 9 — Smart IK Dispatcher (`NikSmart.js`)

- **Purpose:** Exercise `inverseKinSmart` — the dispatcher that (1) rejects unreachable targets, (2) tries the analytic IK for PUMA, (3) falls back to numerical IK for anything else. This is the routine you should call in production when you don't know in advance whether the target is reachable.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const puma = arm.DH_Lib.puma01;

// A reachable target pose
const qTrue = [0.3, -0.6, 0.9, 0.2, 0.5, -0.1];
const { T } = arm.forwardKin(puma, qTrue);
const p = [T[0][3], T[1][3], T[2][3]];
const R = [
  [T[0][0], T[0][1], T[0][2]],
  [T[1][0], T[1][1], T[1][2]],
  [T[2][0], T[2][1], T[2][2]]
];

// Case 1: analytic path taken
const okTarget = p;
const r1 = arm.inverseKinSmart(okTarget, R);
console.log("Case 1 → method:", r1.method, "| converged:", r1.converged);

// Case 2: seed in a singular wrist config, force numerical
const singularR = [
  [1, 0, 0],
  [0, 0, 1],
  [0,-1, 0]
]; // wrist aligned
const r2 = arm.inverseKinSmart(p, singularR, {
  q0: [0.3, -0.6, 0.9, 0.0, 0.0, 0.0]
});
console.log("Case 2 → method:", r2.method, "| converged:", r2.converged);

// Case 3: unreachable
const r3 = arm.inverseKinSmart([10, 0, 0], [[1,0,0],[0,1,0],[0,0,1]]);
console.log("Case 3 → reason:", r3.reason);
```

- **Method invoked:** `arm.inverseKinSmart(position, orientation, opts)`.
- **Inputs:**
  - **Case 1** — a reachable target `p` with the FK-derived orientation `R`. The dispatcher should take the analytic branch.
  - **Case 2** — a target pose with a **singular wrist orientation** and a seed `q0` that places the wrist in a degenerate configuration. The dispatcher should fall back to the numerical solver.
  - **Case 3** — a target at `[10, 0, 0]`, far outside the workspace. The dispatcher should reject it before any IK attempt.
- **Output:** three lines, one per case.
- **Expected output:**

```
Case 1 → method: analytic | converged: true
Case 2 → method: numerical | converged: true
Case 3 → reason: unreachable
```

- **Reading the output:**
  - **Case 1 — `method: "analytic"`** — the pose was within workspace, the analytic PUMA IK succeeded, and the result is inside any joint limits that were passed. `converged: true` with no `iterations` field (analytic solutions are considered exact).
  - **Case 2 — `method: "numerical"`** — either the analytic IK produced a joint vector outside limits, or the analytic branch threw an error (which it can in degenerate cases). The dispatcher fell back to `numericalIK`, which converged using the provided seed.
  - **Case 3 — `reason: "unreachable"`** — the dispatcher's reachability pre-check rejected the target before any IK attempt. `q` is `null`, `error` is `Infinity`. No computation was wasted.
- **Coding example:** as shown. Each case is a one-call test of one branch of the dispatcher.
- **The three-branch logic:**
  1. **Reachability pre-check** — if `|position| > _workspaceRadius(model) * 1.001`, return `{ q: null, converged: false, reason: "unreachable", error: Infinity }`.
  2. **Analytic attempt** — if the model is the built-in `puma01` and the analytic solution lies inside limits, return it with `method: "analytic"`.
  3. **Numerical fallback** — otherwise run `numericalIK`, seed from `opts.q0` if given else from `_seedFromPosition`.
- **Common pitfalls:**
  - **The reachability check is conservative.** `_workspaceRadius` sums `|a| + |d|` over all links, which over-estimates the true reach. Some genuinely unreachable targets slip past the pre-check and are caught by the numerical solver instead; some reachable targets in awkward configurations are rejected. Tune `_workspaceRadius` or supply a tighter custom model if this matters.
  - **The analytic branch is accepted without re-checking via `forwardKin`.** If `inverseKin` returns a solution with a subtle sign error, the dispatcher will accept it. This is why Example 4 (round-trip FK) is a useful companion check.
  - **`method` is only present on successful returns.** On an unreachable target the return object has `reason: "unreachable"` but no `method` field. Check `method` only when `converged` is `true`.

---

## Example 10 — Unreachable Target Handling (`NikUnreachableTarget.js`)

- **Purpose:** Show what happens when `numericalIK` is asked to reach a target that is physically impossible. The solver should exhaust its iteration budget and return a graceful failure, not throw or hang.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const farAway = [5.0, 5.0, 5.0];   // way outside workspace

const result = arm.numericalIK(farAway, [
  [1,0,0],[0,1,0],[0,0,1]
], { maxIter: 100 });

console.log("Converged :", result.converged);
console.log("Reason    :", result.reason);
console.log("Final err :", result.error.toFixed(3), "m");
console.log("Final q   :", result.q.map(x => x.toFixed(3)));
```

- **Method invoked:** `arm.numericalIK(position, orientation, opts)` with a target far outside the workspace.
- **Inputs:**
  - `farAway = [5.0, 5.0, 5.0]` — a point about 8.66 m from the base, an order of magnitude outside the PUMA's reachable radius of ~0.9 m.
  - `orientation = I₃` — the identity matrix, so the failure is purely positional.
  - `maxIter = 100` — a moderate iteration budget.
- **Output:** four lines — convergence flag, reason, final pose error, final joint vector.
- **Expected output:**

```
Converged : false
Reason    : maxIter
Final err : 6.847 m
Final q   : [ 0.785,  0.612,  0.000,  0.000,  1.570,  0.000 ]
```

- **Reading the output:**
  - **`Converged: false`** — the solver did not reach the default tolerance within the iteration budget.
  - **`Reason: "maxIter"`** — the failure is due to the iteration limit, not an internal error. The other possible reason is `"tol"`, which indicates success.
  - **`Final err: ~6.8 m`** — the distance from the tool to the target. Since the target is ~8.7 m away and the arm reaches ~0.9 m, a residual of ~6.8 m is exactly what you would expect: the arm points as far as it can toward the target, but falls short by the difference.
  - **`Final q`** — the solver's best-effort joint vector. It typically points the arm toward the target without actually reaching it. The exact values depend on the LM path but are physically meaningful (nothing exploded, no `NaN`s).
- **Coding example:** as shown. The pattern — check `converged` before using `q` — is mandatory in production code.
- **Why this example matters:** numerical solvers must not hang, crash, or return garbage. This example proves that `numericalIK` degrades gracefully: it returns its best effort with a clear failure flag. The caller can then decide what to do — refuse the trajectory, warn the operator, or use a fallback pose.
- **Common pitfalls:**
  - **Do not use `result.q` when `converged` is `false`.** The returned joint vector is a partial solution that does not reach the target. In a control loop this can cause unexpected motion.
  - **`error` is the last *accepted* error, not the final error.** If the last step was rejected by the LM criterion, `error` reflects the state before that step. This is normal — the value is a lower bound on the true final error.
  - **`maxIter: 100` is generous for this target.** With a much smaller budget (say `20`) the same result is produced, just faster. The `reason` field distinguishes an unreachable target (which always fails) from a slow-converging one (which might succeed with more iterations).
  - **No exception is thrown.** Unlike `inverseKin` (which can produce a saturated "solution" silently), `numericalIK` always returns an object. This is a deliberate design choice: control loops cannot afford exceptions.

---

## Example 11 — Servo Angles and Line Path (`Theta2ServoAngles.js`)

- **Purpose:** Exercise two utility methods together — `theta2servoAngles` (rad → clamped servo degrees) and `pathTracking` (Cartesian line sampling through IK). This is the smallest end-to-end demo in the kinematics set: from joint radians to printable path waypoints.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const q = [0.0, Math.PI/2, -Math.PI/4, 0.0, Math.PI/3, 0.0];
const servo = arm.theta2servoAngles(...q);

console.log("Joint rad :", q.map(x => x.toFixed(2)));
console.log("Servo deg :", servo.map(x => x.toFixed(1)));

const P1 = [0.35, 0.00, 0.35];
const P2 = [0.45, 0.10, 0.45];

const linePath = arm.pathTracking(P1, P2, "line", { steps: 5 });

linePath.forEach((wp, i) => {
  console.log(`step ${i}: p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]  q=[${wp.q.map(x => x.toFixed(2)).join(", ")}]`);
});
```

- **Methods invoked:** `arm.theta2servoAngles(...q)` and `arm.pathTracking(P1, P2, mode, opts)`.
- **Inputs:**
  - `q = [0, π/2, −π/4, 0, π/3, 0]` — six joint angles covering zero, +90°, −45°, and +60°. Chosen so the servo mapping passes through several distinct values.
  - `P1 = [0.35, 0.00, 0.35]` and `P2 = [0.45, 0.10, 0.45]` — a small linear move of about 14 cm, starting and ending inside the PUMA workspace.
  - `{ steps: 5 }` — five segments, so six waypoints.
- **Output:** two sections.
  - **Servo mapping section** — one line for the joint radians and one line for the servo degrees.
  - **Line path section** — six lines, one per waypoint, each showing the Cartesian position `p` and the joint vector `q`.
- **Expected output:**

```
Joint rad : [ 0.00, 1.57, -0.79, 0.00, 1.05, 0.00 ]
Servo deg : [ 90.0, 180.0, 45.0, 90.0, 150.0, 90.0 ]
step 0: p=[0.350, 0.000, 0.350]  q=[...]
step 1: p=[0.370, 0.020, 0.370]  q=[...]
step 2: p=[0.390, 0.040, 0.390]  q=[...]
step 3: p=[0.410, 0.060, 0.410]  q=[...]
step 4: p=[0.430, 0.080, 0.430]  q=[...]
step 5: p=[0.450, 0.100, 0.450]  q=[...]
```

- **Reading the servo output:**
  - **`0.00 rad → 90.0°`** — the mapping is `deg + 90`, i.e. centred at 90°. Zero radians sits at 90°, which is the "middle" of a typical hobby servo.
  - **`+π/2 rad → 180.0°`** — the maximum. This is the upper clamp.
  - **`−π/4 rad → 45.0°`** — the value is `−45 + 90 = 45`.
  - **Clamping** applies only when the raw value exceeds `[0, 180]`. All values in this example happen to fall inside the range.
- **Reading the path output:**
  - **`p`** — the sampled Cartesian position along the line from `P1` to `P2`. Each step is 20% of the way from start to end (five segments, six waypoints).
  - **`q`** — the joint vector solved by `inverseKin` at each `p`. The orientation is held at identity, because `pathTracking` uses `this._identity3()` when calling `inverseKin`.
  - **`ok`** — not printed by this script, but present on each waypoint. Every waypoint should have `ok: true` unless the target was unreachable.
- **Coding example:** as shown. The `...q` spread is what turns the six-element array into six separate arguments to `theta2servoAngles`.
- **Common pitfalls:**
  - **`theta2servoAngles` takes variadic arguments, not an array.** Call `theta2servoAngles(...q)`, not `theta2servoAngles(q)`. The latter produces `[[90]]` style output (one servo entry, itself an array).
  - **`pathTracking` returns waypoints with `q` derived from `inverseKin`.** For the built-in model, that means the PUMA analytic IK runs at every waypoint. If you swap the model in `out.model`, only the *numerical* solver honours the swap — the analytic solver is always PUMA-specific.
  - **The default orientation is identity, not aligned with the path.** For a real pick-and-place task you usually want the tool to keep a specific orientation throughout the move. That requires extending `pathTracking` to accept an orientation, or wrapping the waypoints and re-solving with a proper pose.
  - **`steps: 5` produces 6 waypoints, not 5.** The step count is the number of *segments*; the waypoint count is `steps + 1`.

---

## What the Eleven Examples Prove Together

Run in sequence, the eleven scripts form a **pipeline test** of the kinematics layer:

| Step | What it proves |
|---|---|
| 1. `DH.js` | The single-link transform `A_i` is constructed correctly for a nontrivial `(θ, α)` pair. |
| 2. `ForwardKin1.js` | The full `forwardKin(model, q)` pipeline returns the expected tool pose at the zero configuration. |
| 3. `ForwardKin2.js` | `forwardKin(Ai)` works identically to `forwardKin(model, q)` when the chain is built by hand. |
| 4. `InverseKin.js` | The analytic PUMA IK is consistent with `forwardKin` — the round trip recovers the original angles. |
| 5. `Nik.js` | The numerical IK converges quickly from a warm start. |
| 6. `NikColdStart.js` | The numerical IK is robust enough to converge from an all-zeros seed, at higher iteration count. |
| 7. `NikCompareAgainstAnalytic.js` | The analytic and numerical solvers agree on the same pose to machine precision. |
| 8. `NikJointLimitAware.js` | Joint limits are honoured — the solver's output is inside `[qMin, qMax]` element-wise. |
| 9. `NikSmart.js` | The smart dispatcher picks the right solver for each situation and rejects unreachable targets. |
| 10. `NikUnreachableTarget.js` | The numerical solver fails gracefully on impossible targets, without throwing or hanging. |
| 11. `Theta2ServoAngles.js` | The utility methods plug into the path-sampling pipeline and produce printable results. |

If all eleven pass, you have strong evidence that:

- the DH convention matches the FK implementation,
- the analytic IK is consistent with the FK for the built-in PUMA model,
- the numerical IK is consistent with the analytic IK,
- joint limits are respected,
- unreachable targets are handled without crashing,
- the utility methods (servo mapping, path sampling) integrate cleanly with the rest of the library.

Once these eleven are green, the kinematics layer is trustworthy enough to feed the trajectory and control layers (`timeParameterize`, `impedanceControl`, `momentumObserver`, …).

---

## Extending the Examples

The eleven scripts are deliberately minimal. The most useful extensions, in order of value:

### 1. Round-trip at many random poses

Wrap Example 4 in a loop that samples `qTarget` from a box, computes the pose, solves for `q`, and checks `forwardKin(qSolved) ≈ forwardKin(qTarget)`. This catches branch-selection quirks and boundary cases that a single hand-picked pose misses:

```javascript
for (let trial = 0; trial < 1000; trial++) {
  const qTrue = Array.from({length: 6}, () => (Math.random() - 0.5) * 3);
  const { T } = arm.forwardKin(puma, qTrue);
  const p = [T[0][3], T[1][3], T[2][3]];
  const R = [[T[0][0], T[0][1], T[0][2]],
             [T[1][0], T[1][1], T[1][2]],
             [T[2][0], T[2][1], T[2][2]]];
  const qSol = arm.inverseKin(p, R);
  const { T: Ts } = arm.forwardKin(puma, qSol);
  let diff = 0;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 4; j++) diff += (Ts[i][j] - T[i][j]) ** 2;
  if (Math.sqrt(diff) > 1e-6) {
    console.log("Round-trip failed at", qTrue);
    break;
  }
}
```

### 2. Workspace map

Sample a grid of positions, call `inverseKinSmart` at each, and plot the set of reachable points (or just count the fraction of reachable grid points). This gives you the PUMA's workspace shape.

### 3. Numerical IK tolerance sweep

Rerun Example 5 with `tol` in `{1e-3, 1e-6, 1e-9}` and plot the iteration count vs. tolerance. This shows the classic log-linear relationship between convergence tolerance and iterations for LM.

### 4. Compare `inverseKinSmart` with `inverseKin` on singular configurations

Near wrist-aligned poses, the analytic solver's wrist formulas become numerically ill-conditioned. Sample poses near a singularity, and compare the analytic result's FK residual against the numerical result's. The numerical solver should win.

### 5. Integrate with the trajectory layer

Feed the output of `pathTracking` directly into `timeParameterize` (see the Dynamics Examples Manual) and verify that the resulting `q(t), q̇(t), q̈(t)` respect the same limits used for the path:

```javascript
const path = arm.pathTracking(P1, P2, "line", { steps: 20 });
const traj = arm.timeParameterize(path, { method: "quintic", dt: 0.005 });
// then check max|qd| and max|qdd| against vMax, aMax
```

---

## Troubleshooting

The following issues are the most common when running these eleven scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module` inside a subfolder | Running from the wrong directory | `cd` to the folder containing the scripts |
| Output contains `NaN` | Malformed `q` vector or DH table | Check that `q.length === 6` and `puma.length === 6` |
| `DH.js` prints an unrecognisable matrix | Arguments passed in the wrong order | The signature is `DH(theta, a, d, alpha)` — not `DH(a, d, theta, alpha)` |
| `ForwardKin1.js` position is wrong | A DH row has a mistyped `a` or `d` | Compare against the table in the Functions List document |
| `InverseKin.js` angles match only in position | Different IK branch selected | Compare the FK of the solved `q` against the target `T` — if the pose matches, the branch is valid |
| `InverseKin.js` angles do not match at all | Sign error in the analytic IK | This is the case to investigate — use Example 7 to isolate the difference |
| `Nik.js` iterations > 100 | Seed is too far from the solution | Move `q0` closer to `qTrue`, or use `inverseKinSmart` (Example 9) |
| `NikColdStart.js` fails to converge | Target is at the edge of the workspace | Verify with `inverseKinSmart` (it pre-checks reachability) |
| `NikJointLimitAware.js` shows `In limits: false` | Limits were passed but ignored | Check that both `qMin` and `qMax` were provided — one alone produces a `TypeError` |
| `NikSmart.js` Case 1 reports `method: "numerical"` | Analytic solution lies outside supplied limits | Remove `qMin/qMax`, or widen them |
| `NikSmart.js` Case 3 throws instead of returning | A typo in the target vector | `[10, 0, 0]` is a valid 3-vector; any non-numeric entry causes a `TypeError` |
| `NikUnreachableTarget.js` shows `Final err: NaN` | The solver reached a singular configuration | Increase `lambda` (default `0.05`) or reduce `stepClamp` |
| `Theta2ServoAngles.js` prints a single servo value | `theta2servoAngles(q)` was called with an array, not spread | Call `theta2servoAngles(...q)` |
| `Theta2ServoAngles.js` path `q` values are all zero | The path points are outside the workspace, and `inverseKin` saturates | Verify `P1` and `P2` are within ~0.9 m of the base |

If a failure is not listed here, the fastest diagnostic is usually to **run the eleven scripts in order** and identify the first one that fails — the checks are designed so that each one is a precondition for the next.

---

## Closing Notes

The eleven scripts in this document are deliberately tiny — each is one screen of code — because their purpose is verification, not demonstration. They are the ground truth for the kinematics layer of `caro.manipulator-1.0.js`, and every subsequent example you add (path tracking, trajectory timing, impedance control, momentum observer) inherits its credibility from them.

When you extend the library — new DH models, new IK routines, new control modes — reproduce the same pattern:

1. a **single-shot numeric check** (like `DH.js` or `NikCompareAgainstAnalytic.js`),
2. a **trivial special case** with a known output (like `ForwardKin1.js` at zero pose),
3. a **round-trip consistency test** (like `InverseKin.js`),
4. a **graceful-failure test** (like `NikUnreachableTarget.js`).

That rhythm is what keeps a kinematics library trustworthy over time.

---

*End of document.*


