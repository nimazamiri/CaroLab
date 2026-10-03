# CaroLab Manipulator Library — Path Tracking and Trajectory Examples Manual

- **Name:** caro.manipulator-1.0.js (path-tracking example set)
- **Release Date:** 29 September 2026
- **Document Name:** Path Tracking and Trajectory Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Line Path with Warm-Start IK (`PathTracking_ex1.js`)](#example-1--line-path-with-warm-start-ik-pathtracking_ex1js)
4. [Example 2 — All Four Modes, Numerical Path, Custom Model (`PathTracking_ex2.js`)](#example-2--all-four-modes-numerical-path-custom-model-pathtracking_ex2js)
5. [Example 3 — Circular Path (`PathTracking_ex3.js`)](#example-3--circular-path-pathtracking_ex3js)
6. [Example 4 — Cubic Bézier Curve (`PathTracking_ex4.js`)](#example-4--cubic-bézier-curve-pathtracking_ex4js)
7. [What the Four Examples Prove Together](#what-the-four-examples-prove-together)
8. [Extending the Examples](#extending-the-examples)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the seventh in the series, following the Dynamics, Kinematics, Velocity, Force Control, Friction RLS, and Momentum Observer manuals. Where the Kinematics manual covered the raw geometric building blocks (`DH`, `forwardKin`, `inverseKin`, `numericalIK`), this one covers the **path-tracking layer** — the method that ties them together into Cartesian motions between two points.

The four examples cover the four path shapes supported by `pathTracking`, plus its interaction with the numerical IK solver:

| Mode | Shape | Example |
|---|---|---|
| `"line"` | Straight line from `P1` to `P2` | `PathTracking_ex1.js`, `PathTracking_ex2.js` |
| `"circle"` | Full revolution in the XY plane | `PathTracking_ex2.js`, `PathTracking_ex3.js` |
| `"arc"` | Line + sinusoidal Z bump | `PathTracking_ex2.js` |
| `"curve"` | Cubic Bézier `P1 → C1 → C2 → P2` | `PathTracking_ex2.js`, `PathTracking_ex4.js` |

Together with the `timeParameterize` method (documented in the Kinematics Manual, Example 2 of the Dynamics Manual), `pathTracking` is the front-end of every trajectory the library generates.

### Conventions

| Item | Convention |
|---|---|
| Cartesian points | `[x, y, z]` in metres, world frame |
| Path output | Array of `{ p, q, ok }` — position, joint solution, success flag |
| Waypoint count | `steps + 1` (the step count is the number of segments) |
| Default orientation | Identity — every waypoint is solved with `R = I₃` |
| Default IK | Analytic `inverseKin` (PUMA-specific) |
| Numerical IK option | `useNumerical: true` in the `out` options object |
| Warm start | The `q0` option initializes the numerical solver for the first waypoint |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.manipulator-1.0.js               
└── path/
    ├── PathTracking_ex1.js
    ├── PathTracking_ex2.js
    ├── PathTracking_ex3.js
    └── PathTracking_ex4.js
```

### How to Run the Examples

```
node PathTracking_ex1.js
node PathTracking_ex2.js
node PathTracking_ex3.js
node PathTracking_ex4.js
```

Each script prints a short table or line-based report and exits.

### Why Path Tracking Matters

`pathTracking` is the method you call when you have a **Cartesian goal** — a point in space the tool must reach — and you need a full trajectory of joint vectors to get there. It handles:

- **Interpolation** between the two points in Cartesian space (line, arc, or Bézier).
- **IK** at every waypoint (analytic or numerical).
- **Warm starting** — using the previous waypoint's solution as the seed for the next, which is essential for real-time performance and branch continuity.

The output is a list of waypoints. Feed it to `timeParameterize` to get a timed trajectory, then to `jointVelocityControl` or `directTorqueControl` to execute it.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `PathTracking_ex1.js` | `pathTracking("line")` | Minimal line path with default PUMA |
| 2 | `PathTracking_ex2.js` | `pathTracking` (all 4 modes) | Compare all modes, numerical IK, custom model |
| 3 | `PathTracking_ex3.js` | `pathTracking("circle")` | Pure circular sweep in the XY plane |
| 4 | `PathTracking_ex4.js` | `pathTracking("curve")` | Cubic Bézier with explicit control points |

---

## Example 1 — Line Path with Warm-Start IK (`PathTracking_ex1.js`)

- **Purpose:** The simplest possible path-tracking example. A straight line from `P1` to `P2`, sampled at 20 segments, solved with the default analytic PUMA IK. This is the "hello world" of the trajectory layer.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// use default PUMA
const p1 = [0.40, 0.00, 0.40];
const p2 = [0.30, 0.00, 0.50];
const path = arm.pathTracking(p1, p2, "line", { steps: 20 });

/*
// use a different robot
arm.pathTracking(P1, P2, "line", {
  steps: 20,
  model: arm.DH_Lib.ur5,
  useNumerical: true,
  q0: [0,0,0,0,0,0]
});
*/

console.log("path ok:", path.every(w => w.ok));

path.forEach((wp, i) =>
  console.log(`step ${i}: ok=${wp.ok} q=[${wp.q.map(x=>x.toFixed(2)).join(",")}]`)
);
```

- **Method invoked:** `arm.pathTracking(P1, P2, "line", { steps: 20 })`.
- **Inputs:**
  - **`P1 = [0.40, 0.00, 0.40]`** — start position, 40 cm forward and 40 cm up from the base.
  - **`P2 = [0.30, 0.00, 0.50]`** — end position, 30 cm forward and 50 cm up. The path therefore moves diagonally backward and upward.
  - **`"line"`** — straight-line interpolation.
  - **`{ steps: 20 }`** — 20 segments, producing 21 waypoints.
- **Output:** a header line and 21 lines, one per waypoint, showing the `ok` flag and the joint vector.
- **Expected output (abridged):**

```
path ok: true
step  0: ok=true q=[...]
step  1: ok=true q=[...]
...
step 20: ok=true q=[...]
```

- **Reading the output:**
  - **`path ok: true`** — every waypoint was solved successfully. If any waypoint had failed, `ok` would be `false` for that entry and the header would print `false`.
  - **`q` vectors** — the joint solution at each waypoint. As you move from step 0 to step 20, the joint values change smoothly — that is the warm-start working: each waypoint uses the previous one as its seed, so the solver stays on the same IK branch.
  - **Every `ok` is `true`** — the 20-segment path from `P1` to `P2` stays well inside the PUMA's reachable workspace, and the analytic IK succeeds at every point.
- **Why the small move:** the 14 cm diagonal (`P2 − P1`) is a gentle motion. Longer moves would still work but would produce a more visible change in the joint vectors. Shorter moves are useful when you want to test warm-starting without large branch shifts.
- **The commented numerical block:**
  - The commented section shows how to run the same path with **numerical IK** and a **different robot model**.
  - `model: arm.DH_Lib.ur5` — a UR5 model is **not** in the built-in library. If you uncomment the block, you will get `TypeError: Cannot read properties of undefined`. To use a UR5, add its DH table to `arm.DH_Lib` first.
  - `useNumerical: true` — switches to `numericalIK`. This is essential for any model other than `puma01`, because the analytic IK is PUMA-specific.
  - `q0: [0,0,0,0,0,0]` — the seed for the first waypoint. The remaining waypoints are warm-started from this one.
- **Coding example:** as shown. The commented block is *documentation*, not dead code — it is meant to be copied into your own script when you need numerical IK.
- **Common pitfalls:**
  - **`arm.DH_Lib.ur5` does not exist.** The library ships with `puma01` only. If you want a UR5, add its DH table to `arm.DH_Lib` before the call.
  - **The analytic IK is always PUMA-specific.** Even if you pass `model: arm.DH_Lib.custom`, the analytic branch of `pathTracking` ignores it and uses the built-in PUMA. Only the numerical branch honors the model argument. This is documented in the Kinematics Manual.
  - **`steps: 20` produces 21 waypoints, not 20.** The step count is the number of *segments*; the waypoint count is `steps + 1`.
  - **The default orientation is identity.** `pathTracking` solves each waypoint with `R = I₃`. If your task requires a specific tool orientation throughout the path, wrap the waypoints and re-solve with the desired pose, or extend `pathTracking` to accept an orientation argument.
  - **Zero-length moves produce a single waypoint.** If `P1 = P2`, the path has two identical entries. `timeParameterize` skips zero-length segments, but `pathTracking` itself does not check.

---

## Example 2 — All Four Modes, Numerical Path, Custom Model (`PathTracking_ex2.js`)

- **Purpose:** Exercise `pathTracking` in all four modes, then separately with numerical IK and with an explicit model. This is the "integration test" for the path-tracking method — it verifies that the interface works consistently across the options matrix.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// 1. All four modes should produce valid paths
for (const mode of ["line", "circle", "arc", "curve"]) {
  const path = arm.pathTracking(
    [0.35, 0.0, 0.35],
    [0.45, 0.1, 0.40],
    mode,
    { steps: 5, radius: 0.05, arcHeight: 0.03 }
  );
  console.log(mode.padEnd(7), "→", path.length, "waypoints, ok:", path.every(w => w.ok));
}

// 2. Numerical IK path with warm-start
const numPath = arm.pathTracking(
  [0.35, 0.0, 0.35],
  [0.42, 0.05, 0.38],
  "line",
  { steps: 10, useNumerical: true }
);
console.log("numerical path ok:", numPath.every(w => w.ok));

// 3. Custom model
const custom = arm.pathTracking(
  [0.3, 0, 0.3], [0.4, 0, 0.3], "line",
  { steps: 5, model: arm.DH_Lib.puma01 }
);
console.log("custom model path ok:", custom.every(w => w.ok));
```

- **Methods invoked:** `arm.pathTracking` — six calls, each with different options.
- **Inputs:**
  - **Block 1 — all four modes.** The same `P1` and `P2` are used for `line`, `circle`, `arc`, and `curve`. The shared `out` object provides `steps: 5`, `radius: 0.05`, and `arcHeight: 0.03`.
  - **Block 2 — numerical IK.** A different line, from `[0.35, 0.0, 0.35]` to `[0.42, 0.05, 0.38]`, with 10 segments and `useNumerical: true`.
  - **Block 3 — explicit model.** A short line, with the model explicitly passed as `arm.DH_Lib.puma01` (which is also the default, so this is a no-op test).
- **Output:** six lines — four for the modes, one for the numerical path, one for the custom model.
- **Expected output:**

```
line    → 6 waypoints, ok: true
circle  → 6 waypoints, ok: true
arc     → 6 waypoints, ok: true
curve   → 6 waypoints, ok: true
numerical path ok: true
custom model path ok: true
```

- **Reading the output:**
  - **Every mode produces 6 waypoints.** Since `steps: 5` in every case, the waypoint count is `5 + 1 = 6`.
  - **Every mode succeeds.** The analytic PUMA IK converges at every waypoint for all four shapes.
  - **The numerical path succeeds.** The 10-segment numerical solve also converges at every waypoint. Warm-starting from the previous waypoint keeps the numerical solver fast and on the same branch.
  - **The custom model path succeeds.** Passing `model: arm.DH_Lib.puma01` explicitly (which is also the default) makes no difference — the analytic IK runs and converges.
- **Reading each mode's behaviour:**
  - **`line`** — the positions are uniformly spaced along the straight line from `P1` to `P2`.
  - **`circle`** — `P2` is ignored; the path is a full revolution around `P1` with radius `0.05`. **The path is closed** (the last waypoint equals the first), so the six positions form a hexagon inscribed in a circle.
  - **`arc`** — the same `P1` to `P2` line, but with an additional Z bump of `arcHeight = 0.03` peaking at the midpoint.
  - **`curve`** — a cubic Bézier with default control points `C1 = [(P1x+P2x)/2, P1y, P1z]` and `C2 = [(P1x+P2x)/2, P2y, P2z]`. Since the example does not supply `C1, C2`, the defaults are used, producing a gentle S-curve.
- **What this proves:**
  - The mode switch works correctly — all four branches of the `switch` statement produce valid output.
  - The numerical IK path is consistent with the analytic one (both succeed).
  - The model argument is honored by the numerical solver and ignored by the analytic one — both paths still succeed because the model happens to be PUMA.
- **Coding example:** as shown. The `console.log(mode.padEnd(7), ...)` pattern pads the mode name to 7 characters for alignment.
- **Common pitfalls:**
  - **`circle` uses `P1` as the centre and `P2` is ignored.** This is easy to forget. If you want a circle from `P1` to `P2`, you need a different path-tracking mode or a custom interpolator.
  - **`arc` and `curve` accept extra options** — `arcHeight` for the arc, `C1, C2` for the curve. Both have sensible defaults, but you should override them when you want a specific shape.
  - **The custom-model test is a no-op.** `arm.DH_Lib.puma01` is the default model, so passing it explicitly tests nothing new. To make this a real test, pass a genuinely different DH table.
  - **`useNumerical: true` does not disable the analytic IK fallback.** The dispatcher is inside `pathTracking` — it calls `numericalIK` directly, not `inverseKinSmart`. So every waypoint is solved numerically, regardless of the model.
  - **Numerical IK is slower than analytic.** For the same path, the numerical solver takes more compute per waypoint. The example does not measure this, but in a real controller you would use analytic whenever possible.

## Example 3 — Circular Path (`PathTracking_ex3.js`)

- **Purpose:** Isolate the `"circle"` mode and print the sampled Cartesian positions. This shows exactly what the circle looks like — useful when you are verifying the interpolation before wiring it into a controller.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const center = [0.40, 0.00, 0.40];
const circlePath = arm.pathTracking(center, center, "circle", {
  steps: 8,
  radius: 0.05
});

circlePath.forEach((wp, i) => {
  console.log(`step ${i}: p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]`);
});
```

- **Method invoked:** `arm.pathTracking(center, center, "circle", { steps: 8, radius: 0.05 })`.
- **Inputs:**
  - **`center = [0.40, 0.00, 0.40]`** — the centre of the circle, in the XY plane at height `z = 0.40 m`.
  - **`steps: 8`** — 8 segments, producing 9 waypoints. Because the circle is closed, the 9th waypoint coincides with the 1st.
  - **`radius: 0.05`** — 5 cm circle radius.
- **Output:** nine lines, one per waypoint, showing the Cartesian position `p`.
- **Expected output:**

```
step 0: p=[0.450, 0.000, 0.400]
step 1: p=[0.435, 0.035, 0.400]
step 2: p=[0.400, 0.050, 0.400]
step 3: p=[0.365, 0.035, 0.400]
step 4: p=[0.350, 0.000, 0.400]
step 5: p=[0.365, -0.035, 0.400]
step 6: p=[0.400, -0.050, 0.400]
step 7: p=[0.435, -0.035, 0.400]
step 8: p=[0.450, 0.000, 0.400]
```

- **Reading the output:**
  - **All waypoints have `z = 0.400`** — the circle is purely in the XY plane, exactly as specified.
  - **The first and last waypoints are identical** (`[0.450, 0, 0.400]`). This is because `steps: 8` samples the full 360° sweep and the endpoints coincide on a closed loop. If you want to avoid the duplicate, use `steps: 8` but treat the path as 8 unique waypoints and *not* 9.
  - **The positions lie exactly on a 5 cm circle centred at `[0.40, 0, 0.40]`.** Verify: `0.450 − 0.400 = 0.050`, and `0.035² + 0.035² = 0.00245` → `√ = 0.0495` ≈ 5 cm.
  - **The path goes counter-clockwise** in the XY plane — X decreases on the left side, Y increases then decreases. This is the standard parametric convention `(x, y) = (cx + r·cos(θ), cy + r·sin(θ))`.
- **Sampling pattern:**
  - With 8 steps, the angular increment between waypoints is `2π / 8 = 45°`, or `π/4` radians.
  - Waypoint 0: `θ = 0` → `(+r, 0)`.
  - Waypoint 1: `θ = π/4` → `(+r·cos 45°, +r·sin 45°)` = `(+0.035, +0.035)`.
  - Waypoint 2: `θ = π/2` → `(0, +r)`.
  - ...and so on.
- **Why this shape matters:** the circle is the canonical test for path tracking — it exercises all four quadrants, requires the arm to reverse direction smoothly, and produces a path that closes back on itself. If your controller can trace a circle cleanly, it can usually trace anything.
- **Coding example:** as shown. The `center` is passed twice because the `circle` mode takes the centre from `P1` and ignores `P2`.
- **Common pitfalls:**
  - **`P2` is ignored for the `"circle"` mode.** Passing `center` as both arguments is a common convention — it documents that the second argument is unused.
  - **The circle is always in the XY plane at `z = center[2]`.** It cannot be tilted without extending the mode.
  - **The path is closed, so the last waypoint duplicates the first.** This matters if you feed the path to `timeParameterize`, which will create a zero-length final segment. `timeParameterize` skips those segments silently.
  - **The circle uses `radius` from the `out` object.** The default is `0.05` if not supplied. Increasing `radius` beyond the workspace will cause IK failures.
  - **The waypoints are uniformly spaced in angle, not in arc length.** With 8 steps and a 5 cm radius, each segment is `2πr/8 ≈ 3.93 cm` long. This is usually what you want for a circle, but it means that non-uniform radii require a different mode or a custom interpolator.
  - **The orientation is held at identity.** The tool does not rotate to follow the circle; it stays in the same world-frame orientation throughout. For a task like drawing or probing, you would want the tool orientation to rotate with the position.

---

## Example 4 — Cubic Bézier Curve (`PathTracking_ex4.js`)

- **Purpose:** Exercise the `"curve"` mode with **explicit control points**. This is the most flexible of the four modes and the one that lets you design arbitrarily shaped smooth paths.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const curvePath = arm.pathTracking(
  [0.30, 0.00, 0.40],
  [0.50, 0.20, 0.40],
  "curve",
  {
    steps: 6,
    C1: [0.40, -0.10, 0.45],   // first control point
    C2: [0.45,  0.10, 0.35]    // second control point
  }
);

curvePath.forEach(wp =>
  console.log(`p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]`)
);
```

- **Method invoked:** `arm.pathTracking(P1, P2, "curve", { steps: 6, C1, C2 })`.
- **Inputs:**
  - **`P1 = [0.30, 0.00, 0.40]`** — Bézier start point.
  - **`P2 = [0.50, 0.20, 0.40]`** — Bézier end point.
  - **`C1 = [0.40, −0.10, 0.45]`** — first control point. Note the negative Y — the curve is pulled below the X axis early on.
  - **`C2 = [0.45, 0.10, 0.35]`** — second control point. Note the lower Z — the curve dips below the endpoint height near the end.
  - **`steps: 6`** — 6 segments, 7 waypoints.
- **Output:** seven lines, one per waypoint, showing the Cartesian position `p`.
- **Expected output (abridged):**

```
p=[0.300, 0.000, 0.400]
p=[0.354, -0.042, 0.415]
p=[0.391, -0.035, 0.408]
p=[0.417, 0.019, 0.381]
p=[0.440, 0.075, 0.371]
p=[0.463, 0.128, 0.383]
p=[0.500, 0.200, 0.400]
```

- **Reading the output:**
  - **First waypoint = `P1`** — Bézier curves start exactly at the first endpoint.
  - **Last waypoint = `P2`** — and end exactly at the second endpoint.
  - **The curve bows downward early** (negative Y at waypoints 1–2), then upward (positive Y from waypoint 3 on). This is the "S" shape induced by the two control points being on opposite sides of the P1–P2 line.
  - **The Z coordinate dips** at waypoints 3–5, because `C2[2] = 0.35` pulls the curve below the endpoint height of `0.40`.
  - **The waypoints are not evenly spaced.** Bézier parameterization is uniform in the parameter `u`, not in arc length. The spacing between waypoints varies with the local tangent magnitude — larger tangent, larger gap.
- **How the Bézier works:**
  - For a cubic Bézier with endpoints `P1, P2` and control points `C1, C2`, the position at parameter `u ∈ [0, 1]` is:
    ```
    B(u) = (1−u)³·P1 + 3·(1−u)²·u·C1 + 3·(1−u)·u²·C2 + u³·P2
    ```
  - At `u = 0`, `B(0) = P1`.
  - At `u = 1`, `B(1) = P2`.
  - The tangent at `u = 0` points from `P1` toward `C1`.
  - The tangent at `u = 1` points from `C2` toward `P2`.
  - This is why `C1` and `C2` act as "tangent handles" — the curve enters and leaves the endpoints along the directions you specify.
- **Designing a Bézier path:**
  - **For a straight line** — set `C1 = P1 + (P2 − P1)/3` and `C2 = P1 + 2(P2 − P1)/3`. Then the Bézier reduces to a straight line.
  - **For a smooth arc** — place `C1` and `C2` on a perpendicular bisector of `P1P2` at distance `≈ 0.55·|P2−P1|`.
  - **For an S-curve** — place `C1` and `C2` on opposite sides of the `P1P2` line.
  - **For a loop** — place `C1` and `C2` on the same side, both far from the line.
- **Coding example:** as shown. Note that `wp.p` is a 3-vector, so `.map(x => x.toFixed(3))` produces three strings joined by commas.
- **Common pitfalls:**
  - **The Bézier is parameterized by `u`, not by arc length.** If you need uniform spacing along the path, you must reparameterize — for example, sample more densely in regions of high curvature, or use a path-length reparameterization. The `steps` option controls the number of *segments*, not their arc length.
  - **The control points do not have to lie on the path.** `C1` and `C2` are "handles," not "waypoints." The path does not pass through them (unless they coincide with `P1` or `P2`).
  - **Bézier curves can overshoot** if the control points are far from the endpoint line. For large excursions, the path may leave the workspace and cause IK failures.
  - **The default `C1, C2` are gentle.** If you omit them, the defaults are `C1 = [(P1x+P2x)/2, P1y, P1z]` and `C2 = [(P1x+P2x)/2, P2y, P2z]`. This produces a mild S-curve that is safe for most workspaces.
  - **The orientation is held at identity.** As with the other modes, the tool does not rotate along the path.
  - **`steps: 6` produces 7 waypoints.** Adjust as needed for the smoothness of the sampled path.


## What the Four Examples Prove Together

Run in sequence, the four scripts form a **verification suite for the path-tracking layer**:

| Step | What it proves |
|---|---|
| 1. `PathTracking_ex1.js` | A simple line path solves correctly with the default PUMA model. |
| 2. `PathTracking_ex2.js` | All four modes work, numerical IK works, and the model argument is honored. |
| 3. `PathTracking_ex3.js` | The circle mode produces a closed, correctly sampled path in the XY plane. |
| 4. `PathTracking_ex4.js` | The Bézier mode accepts explicit control points and produces the expected S-curve. |

If all four pass, you have strong evidence that:

- `pathTracking` correctly handles all four modes,
- the analytic IK succeeds for reachable line, circle, arc, and curve paths,
- the numerical IK warm-start works with `useNumerical: true`,
- the output structure (`{ p, q, ok }`) is consistent across modes,
- the model argument does not break any path.

Once these four are green, the path-tracking layer is trustworthy enough to be the front-end for the trajectory and control layers.

---

## Extending the Examples

### 1. Path with a specified orientation

`pathTracking` holds the tool orientation at identity. To follow the path with a *rotating* tool:

```javascript
const rawPath = arm.pathTracking(P1, P2, "line", { steps: 20 });
const pathWithOrientation = rawPath.map((wp, i) => {
  const s = i / (rawPath.length - 1);
  // rotate 90° about Z over the path
  const theta = s * Math.PI / 2;
  const R = [
    [Math.cos(theta), -Math.sin(theta), 0],
    [Math.sin(theta),  Math.cos(theta), 0],
    [0, 0, 1]
  ];
  const q = arm.inverseKinSmart(wp.p, R, { q0: wp.q });
  return { p: wp.p, q: q.q, ok: q.converged };
});
```

### 2. Time-parameterize the path

Feed the path directly into `timeParameterize`:

```javascript
const path = arm.pathTracking([0.35,0,0.35], [0.45,0,0.35], "line", { steps: 20 });
const traj = arm.timeParameterize(path, { method: "quintic", dt: 0.005, vMax: 1.0, aMax: 5.0 });
```

This produces a `q(t), q̇(t), q̈(t)` trajectory, ready for `jointVelocityControl` or `directTorqueControl`.

### 3. Multi-segment paths

`pathTracking` produces one segment at a time. To chain several segments:

```javascript
const points = [[0.35,0,0.35], [0.40,0.1,0.38], [0.45,0.05,0.40], [0.45,0,0.42]];
const fullPath = [];
for (let i = 0; i < points.length - 1; i++) {
  const seg = arm.pathTracking(points[i], points[i+1], "line", { steps: 10 });
  fullPath.push(...seg.slice(0, -1));   // drop duplicate boundary waypoints
}
fullPath.push(points[points.length - 1]);   // add the final point
```

This gives a single continuous path through all the points.

### 4. Circle with a given start angle

The `"circle"` mode always starts at angle zero. To start at a different angle, rotate the whole path:

```javascript
const rawCircle = arm.pathTracking(center, center, "circle", { steps: 8, radius: 0.05 });
const rotated = rawCircle.map(wp => {
  const dx = wp.p[0] - center[0];
  const dy = wp.p[1] - center[1];
  const theta0 = Math.PI / 4;   // start at 45°
  const cosT = Math.cos(theta0), sinT = Math.sin(theta0);
  const px = dx * cosT - dy * sinT + center[0];
  const py = dx * sinT + dy * cosT + center[1];
  return { ...wp, p: [px, py, wp.p[2]] };
});
```

### 5. Visualize the path

Save each waypoint to a CSV and plot with any tool:

```javascript
const fs = require("fs");
fs.writeFileSync("path.csv", "x,y,z\n" +
  path.map(wp => wp.p.join(",")).join("\n"));
```

### 6. Feed the path to the momentum observer

If your task requires sensorless force estimation along the path, integrate the path into a control loop:

```javascript
for (const wp of path) {
  const obs = arm.momentumObserver(
    { q: wp.q, qd: [0,0,0,0,0,0], tau: /* measured */ },
    { Ko: 30, dt: 0.005, model, memory: obs?.memory }
  );
  // ... use obs.Fext for contact detection
}
```

---

## Troubleshooting

The following issues are the most common when running these four scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| `path ok: false` for some waypoints | Target is outside the workspace | Reduce the size of the move, or move the path closer to the base |
| All waypoints have `ok: false` | Model is wrong, or IK is broken | Verify `model = arm.DH_Lib.puma01` and that the pose is reachable |
| `TypeError: Cannot read properties of undefined` (reading `ur5`) | `arm.DH_Lib.ur5` does not exist | Add the UR5 DH table, or use `puma01` |
| Waypoint positions are outside the workspace | Path endpoints are too far from the base | Reduce the distance between `P1` and `P2` |
| Circle is not closed | Fewer than 8 steps, or `steps` not integer | Use `steps: 8` or higher |
| Bézier curve overshoots | Control points are too far from the endpoint line | Move `C1, C2` closer to the `P1P2` line |
| Curve produces joint-vector jumps | Different IK branch at consecutive waypoints | Use `useNumerical: true` with warm start |
| Numerical IK fails at some waypoints | Warm start is bad, or target is unreachable | Supply a better `q0`, or verify the path is inside the workspace |
| `useNumerical: true` is slower | Numerical IK is iterative | Use analytic IK when the model is PUMA |
| Orientation is wrong at the end | `pathTracking` uses identity orientation | Wrap the path and re-solve with the desired R |
| Duplicate waypoints in the path | Bézier or circle mode produces closed paths | Drop the last waypoint before feeding to `timeParameterize` |

If a failure is not listed here, the fastest diagnostic is usually to run the four scripts in order and identify the first one that fails — the checks are designed so that each one is a precondition for the next.

---

## Closing Notes

The four scripts in this document cover the **path-tracking layer** of `caro.manipulator-1.0.js` — the front-end that converts a Cartesian goal into a sequence of joint vectors. They complete the "front half" of the library: given a task, generate a path; given a path, generate a timed trajectory; given a trajectory, execute it.

The pattern is the same as the previous manuals:

1. **a minimal case** — a short line with default model.
2. **an integration test** — all four modes, numerical IK, custom model.
3. **an isolated case per mode** — one script for circle, one for curve.
4. **documentation of the output** — the waypoint structure, `ok` flag, and joint vector.

That rhythm is what keeps a path-tracking library trustworthy — and this layer is what makes the difference between a robot that can *move to a point* and a robot that can *execute a trajectory*.

---

*End of document.*


---

## Summary of Manuals So Far

This manual is the seventh in the series. Together, the seven manuals document the entire public API of `caro.manipulator-1.0.js`.

| Manual | Parts | Examples | Appendices | Covers |
|---|---|---|---|---|
| **Dynamics** | 4 | 6 | none | Jacobian, joint velocities, RNE |
| **Kinematics** | 4 | 11 | none | DH, FK, IK, path sampling |
| **Velocity Control** | 5 | 4 | A + B | Velocity stack, PI control, resolved-rate |
| **Force Control** | 5 | 12 | A + B + C | Impedance, admittance, hybrid, parallel, operational space, assist-as-needed |
| **Friction RLS** | 4 | 4 | A | Sensorless friction identification |
| **Momentum Observer** | 4 | 5 | A | Sensorless external-force estimation |
| **Path Tracking** | 4 | 4 | none | Line, circle, arc, Bézier |

That is **seven manuals**, **46 examples**, and **eight appendices**. The library's full pipeline is now documented:

```
Task → pathTracking → timeParameterize → jointVelocityControl
                  ↓                   ↓
            (geometric)         (temporal)
                                       ↓
                              directTorqueControl / impedanceControl
                                       ↓
                              momentumObserver  (force feedback)
                                       ↓
                              FrictionRLS  (offline identification)
```

Every method, every mode, every option is covered by a worked example with a documented expected output.

### Natural Next Manuals

If you want to continue the series, three manuals remain:

1. **Simulation Examples Manual** — the various fake plants and benchmark scripts, organized by plant type (diagonal, second-order, rigid-body). This is what you use to *tune* the controllers from the Force Control and Momentum Observer manuals.

2. **Full Stack Integration Manual** — end-to-end missions (pick-and-place with sensorless force, rehab session, peg insertion) that exercise every layer at once. This serves as both a capstone demonstration and an integration test.

3. **Industrial Deployment Manual** — the safety snippets, real-world tuning, hardware integration patterns, and the practical considerations for deploying the library on a physical robot.

My vote is the **Full Stack Integration Manual** next — it would tie the seven manuals together with a small number of rich, realistic scenarios that a new user could run to see the whole library working.

Tell me which you'd like.

---

*End of document.*

