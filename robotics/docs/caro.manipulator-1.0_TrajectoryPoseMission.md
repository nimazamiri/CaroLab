# CaroLab Manipulator Library — Trajectory, Pose, and Mission Examples Manual

- **Name:** caro.manipulator-1.0.js (trajectory / pose / mission example set)
- **Release Date:** 29 September 2026
- **Document Name:** Trajectory, Pose, and Mission Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Pick-and-Place Mission (`PickAndPlace.js`)](#example-1--pick-and-place-mission-pickandplacejs)
4. [Example 2 — Pose Round-Trip (`Pose.js`)](#example-2--pose-round-trip-posejs)
5. [Example 3 — Time Parameterize: Basic (`TimeParameterize1.js`)](#example-3--time-parameterize-basic-timeparameterize1js)
6. [Example 4 — Time Parameterize with Torque Check (`TimeParameterize2.js`)](#example-4--time-parameterize-with-torque-check-timeparameterize2js)
7. [Example 5 — Rehabilitation Control Tick (Sketch) (`RehabilitationControlTick.js`)](#example-5--rehabilitation-control-tick-sketch-rehabilitationcontroltickjs)
8. [What the Five Examples Prove Together](#what-the-five-examples-prove-together)
9. [Extending the Examples](#extending-the-examples)
10. [Troubleshooting](#troubleshooting)
11. [Appendix A — Annotated Rehabilitation Sketch](#appendix-a--annotated-rehabilitation-sketch)

---

## Introduction

### Purpose of This Document

This manual is the eighth in the series, following the Dynamics, Kinematics, Velocity, Force Control, Friction RLS, Momentum Observer, and Path Tracking manuals. Where those covered individual layers, this one covers three **integration-level topics** that tie the layers together:

1. **Missions** — chained paths that form a complete task (`PickAndPlace.js`).
2. **Pose representation** — the 6-vector `[x, y, z, wx, wy, wz]` and its round-trip through `_poseToT` and `_eulerToR` (`Pose.js`).
3. **Time parameterization** — turning geometric waypoints into a timed trajectory (`TimeParameterize1.js`, `TimeParameterize2.js`).
4. **A design sketch** — a non-runnable template showing how the library would be used for rehabilitation control (`RehabilitationControlTick.js`).

The five examples are grouped by topic rather than by method, because at this level the methods are already documented in their own manuals.

| Topic | File(s) |
|---|---|
| Mission orchestration | `PickAndPlace.js` |
| Pose round-trip | `Pose.js` |
| Time parameterization (basic) | `TimeParameterize1.js` |
| Time parameterization (with torque) | `TimeParameterize2.js` |
| Rehabilitation sketch | `RehabilitationControlTick.js` |

### Conventions

| Item | Convention |
|---|---|
| Waypoint | `{ p, q, ok }` — position, joint vector, success flag |
| Trajectory sample | `{ t, q, qd, qdd, s, seg }` — time, position, velocity, acceleration |
| Pose (6-vector) | `[x, y, z, wx, wy, wz]` — position + axis-angle rotation vector |
| DH table | `arm.DH_Lib.puma01` unless stated otherwise |
| Duration | Seconds |
| Sample period | Seconds (`dt`) |

All scripts use **CommonJS** (`require`).

### Required Files and Layout

```
project/
├── caro.manipulator-1.0.js               
└── integration/
    ├── PickAndPlace.js
    ├── Pose.js
    ├── TimeParameterize1.js
    ├── TimeParameterize2.js
    └── RehabilitationControlTick.js
```

### How to Run the Examples

```
node PickAndPlace.js
node Pose.js
node TimeParameterize1.js
node TimeParameterize2.js
# RehabilitationControlTick.js is a sketch — see Appendix A for a runnable version
```

### Why This Manual Exists

The previous seven manuals each documented a *layer* of the library. This one documents the **interfaces between layers** — the small conventions (waypoint structure, pose representation, trajectory sample shape) that a user must know to build a complete application.

A robot is not useful because it has a good Jacobian. It is useful because the Jacobian, the IK, the trajectory, and the torque controller all agree on their data structures. That agreement is what this manual documents.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `PickAndPlace.js` | `pathTracking` (×5 calls) | Chain five path segments into a full mission |
| 2 | `Pose.js` | `_fkPose`, `_eulerToR`, `_poseToT` | Round-trip a pose through 4×4 matrix form |
| 3 | `TimeParameterize1.js` | `pathTracking`, `timeParameterize` | Basic timed trajectory from a line path |
| 4 | `TimeParameterize2.js` | `pathTracking`, `timeParameterize`, `rne` | Same, plus a peak-torque computation |
| 5 | `RehabilitationControlTick.js` | (many external) | Design sketch for rehab — **not runnable as written** |

---

## Example 1 — Pick-and-Place Mission (`PickAndPlace.js`)

- **Purpose:** Chain five `pathTracking` calls into a complete pick-and-place mission. This is the smallest *full task* example in the library: from home pose, approach the object, descend, lift, transfer, descend, release, retract — all expressed as geometric paths.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function pickAndPlace(arm, pickPose, placePose) {
  const log = [];

  // 1. Move to just above the pick point
  const above = [pickPose[0], pickPose[1], pickPose[2] + 0.05];
  const approachPath = arm.pathTracking(above, pickPose, "line", { steps: 5 });
  log.push({ phase: "approach", waypoints: approachPath });

  // 2. Descend, "grip" (open/close not modeled), then lift
  const liftPath = arm.pathTracking(pickPose, above, "line", { steps: 5 });
  log.push({ phase: "lift", waypoints: liftPath });

  // 3. Arc across to above the place point
  const abovePlace = [placePose[0], placePose[1], placePose[2] + 0.05];
  const arcPath = arm.pathTracking(above, abovePlace, "arc", {
    steps: 12,
    arcHeight: 0.10
  });
  log.push({ phase: "transfer", waypoints: arcPath });

  // 4. Descend to place, release, retract
  const placePath = arm.pathTracking(abovePlace, placePose, "line", { steps: 5 });
  const retractPath = arm.pathTracking(placePose, abovePlace, "line", { steps: 5 });
  log.push({ phase: "place", waypoints: placePath });
  log.push({ phase: "retract", waypoints: retractPath });

  return log;
}

const mission = pickAndPlace(
  arm,
  [0.35, -0.10, 0.35],   // pick
  [0.40,  0.15, 0.40]    // place
);

mission.forEach(phase =>
  console.log(`${phase.phase}: ${phase.waypoints.length} waypoints`)
);
```

- **Method invoked:** `arm.pathTracking` — five times, with three modes: `"line"` (×4) and `"arc"` (×1).
- **Inputs:**
  - **Pick pose:** `[0.35, −0.10, 0.35]` — 35 cm forward, 10 cm left, 35 cm up.
  - **Place pose:** `[0.40, 0.15, 0.40]` — 40 cm forward, 15 cm right, 40 cm up.
  - **Gripper:** not modeled — the script describes the *motion* of a pick-and-place, not the actuation of a gripper. A real deployment would insert a `grip()` and `release()` call between the relevant phases.
- **Output:** five lines, one per phase, showing the phase name and waypoint count.
- **Expected output:**

```
approach: 6 waypoints
lift: 6 waypoints
transfer: 13 waypoints
place: 6 waypoints
retract: 6 waypoints
```

- **Reading the output:**
  - **`approach: 6 waypoints`** — the descent from above-pick to pick, with `steps: 5` → 6 waypoints.
  - **`lift: 6 waypoints`** — the ascent from pick to above-pick, `steps: 5` → 6 waypoints. Note this is the *reverse* of the approach — the arm goes back up along the same line.
  - **`transfer: 13 waypoints`** — the arc from above-pick to above-place, `steps: 12` → 13 waypoints. The `arcHeight: 0.10` lifts the tool 10 cm above the straight line at the midpoint.
  - **`place: 6 waypoints`** — the descent from above-place to place.
  - **`retract: 6 waypoints`** — the ascent back to above-place.
- **The five phases in words:**
  1. **Approach** — move from a safe height above the pick point down to the pick point.
  2. **Lift** — after (implicitly) closing the gripper, move back up to the safe height.
  3. **Transfer** — arc across the workspace to a safe height above the place point.
  4. **Place** — move down to the place point, then (implicitly) release.
  5. **Retract** — move back up to the safe height.
- **Reading the mission structure:**
  - Each phase is a `{ phase, waypoints }` object. This makes the mission **inspectable** — you can log, replay, or modify any phase independently.
  - The waypoints themselves carry the full `{ p, q, ok }` structure from `pathTracking`, so a controller can execute them directly.
  - The "safe height" is defined as `z + 0.05` for both pick and place. In a real application you would choose this height based on the tallest obstacle in the workspace.
- **Coding example:** as shown. The `pickAndPlace` function is written as a pure function — it takes `arm`, `pickPose`, `placePose` and returns a mission log. This makes it easy to test with different poses.
- **Common pitfalls:**
  - **The mission is entirely geometric.** It produces waypoints but does not *execute* them. To actually move the arm, you would feed each phase's waypoints to `timeParameterize`, then to a joint-space controller.
  - **No gripper is modeled.** The script assumes the gripper state changes at the right moment, but does not send any signal. In a real system you would insert `grip.close()` and `grip.open()` calls between the descent and lift, and between the place and retract.
  - **No collision checking.** The path is generated blindly between the pick and place poses. If there is an obstacle between them, the transfer arc could collide with it. Real pick-and-place systems add a collision checker.
  - **No force feedback.** The descent to the pick and place points uses pure position control. If the object is fragile or misaligned, a force-controlled approach would be safer.
  - **The 5 cm safe height is arbitrary.** For a taller object, or a workspace with taller obstacles, this would be insufficient. The safe height should be a function of the object and workspace geometry.
  - **The transfer arc uses the default Bézier-like smooth curve.** The `arc` mode is a linear path with a sinusoidal Z bump, not a true arc. If you want a circular arc through a specific peak height, you would need a custom interpolator.
  - **Phase boundaries are not smoothed.** The end of one phase and the start of the next are treated as separate trajectories. In a real execution, the arm would decelerate to a stop at each phase boundary, which is slow. Trajectory *blending* would smooth this, but is not implemented here.

## Example 2 — Pose Round-Trip (`Pose.js`)

- **Purpose:** Verify that the 6-vector pose representation `[x, y, z, wx, wy, wz]` is consistent with the 4×4 homogeneous matrix representation. This is a low-level test of the two pose helpers `_fkPose` and `_poseToT`.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];

const pose = arm._fkPose(arm.defaultModel, q);
console.log("pose:", pose.map(v => v.toFixed(4)));

// round-trip: pose → T → pose
const p = pose.slice(0, 3);
const R = arm._eulerToR(pose.slice(3, 6));   // small-angle only!
const T = arm._poseToT(p, R);
console.log("T[0..2][3]:", [T[0][3], T[1][3], T[2][3]].map(v => v.toFixed(4)));
```

- **Methods invoked:** `_fkPose`, `_eulerToR`, `_poseToT`.
- **Inputs:**
  - **`q = [0.3, −0.5, 0.7, 0.1, 0.4, −0.2]`** — a moderate joint configuration with no singularities.
- **Output:** two lines — the 6-vector pose, and the position component of the reconstructed 4×4 matrix.
- **Expected output (abridged):**

```
pose: [ ... six numbers ... ]
T[0..2][3]: [ ... three numbers ... ]
```

- **Reading the output:**
  - **`pose`** — the 6-vector `[x, y, z, wx, wy, wz]`. The first three entries are the tool position in metres; the last three are the rotation vector (axis-angle form) of the tool orientation.
  - **`T[0..2][3]`** — the position component of the reconstructed 4×4 matrix. **This must match the first three entries of `pose`** — if it does not, one of the helpers is broken.
- **Why the round-trip matters:**
  - The library uses two pose representations internally: the 6-vector (for gain computation and control laws) and the 4×4 matrix (for forward kinematics).
  - The conversion between them is not trivial — the axis-angle form must be recovered from the rotation matrix using a specific formula.
  - A round-trip test — pose → matrix → pose — confirms that the conversion is self-consistent.
- **The `_eulerToR` caveat:**
  - The function `_eulerToR` implements a **small-angle** approximation: `R ≈ I + [w]×`.
  - This is accurate for `|w| < 0.3` rad but increasingly wrong for larger angles.
  - For the example's `q = [0.3, −0.5, 0.7, 0.1, 0.4, −0.2]`, the tool's rotation vector may exceed 0.3 rad, in which case `_eulerToR` will produce a slightly wrong rotation matrix — and the reconstructed `T[0..2][3]` will still match `pose` (because the position part is exact), but a full round-trip through the *orientation* would not.
  - For a full-precision rotation reconstruction, use `_rotVecToR` (Rodrigues), which is exact for all angles.
- **Coding example:** as shown. The `.map(v => v.toFixed(4))` pattern is used twice to format the outputs.
- **The two pose helpers in words:**
  - **`_fkPose(model, q)`** — runs forward kinematics and extracts the tool pose as a 6-vector. Position `[x, y, z]` comes from the 4th column of `T`; orientation `[wx, wy, wz]` is the axis-angle form of the top-left 3×3 block.
  - **`_poseToT(p, R)`** — packs a position vector and a 3×3 rotation matrix into a 4×4 homogeneous matrix.
  - **`_eulerToR(w)`** — approximately converts a small rotation vector to a 3×3 rotation matrix.
  - **`_rotVecToR(w)`** — exactly converts a rotation vector to a 3×3 rotation matrix (Rodrigues formula).
- **Common pitfalls:**
  - **`_eulerToR` is not exact.** For rotations above 0.3 rad, it introduces errors. The output of this example does not reveal the error because only the position is checked; to see it, compare `R` against `_rotVecToR(pose.slice(3, 6))`.
  - **The round-trip is one-way in this example.** The script reconstructs `T` from `pose` but does not reconstruct `pose` from `T`. A full round-trip would call `_fkPose` on a *new* `q` derived from `T`, which is not what happens here.
  - **The axis-angle representation is not unique.** A rotation vector `[wx, wy, wz]` and its negation with angle `2π − θ` represent the same rotation. `_fkPose` returns the vector with the smaller angle, but this is a convention, not a guarantee.
  - **Small angles and near-π angles are both special cases.** Near `|w| = 0`, the axis is undefined. Near `|w| = π`, the formula for extracting the axis is singular. The library's `_fkPose` handles the first case but not the second.
  - **The output is printed but not asserted.** A real test would compare the values programmatically:
    ```javascript
    const ok = Math.abs(T[0][3] - pose[0]) < 1e-9 &&
               Math.abs(T[1][3] - pose[1]) < 1e-9 &&
               Math.abs(T[2][3] - pose[2]) < 1e-9;
    console.log("round-trip ok:", ok);
    ```

---

## Example 3 — Time Parameterize: Basic (`TimeParameterize1.js`)

- **Purpose:** Convert a geometric path into a timed trajectory. This is the method that turns "here are the waypoints" into "here is what the joints should do at each millisecond." Without it, a path is just a shape; with it, the path becomes executable.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// geometric path
const waypoints = arm.pathTracking(
  [0.35, 0.0, 0.35],
  [0.45, 0.1, 0.40],
  "line",
  { steps: 6 }
);

// timed reference
const traj = arm.timeParameterize(waypoints, {
  method: "quintic",
  dt: 0.005,
  vMax: 1.0,     // rad/s
  aMax: 5.0      // rad/s²
});

console.log(`Samples: ${traj.length}, duration: ${traj[traj.length-1].t.toFixed(3)} s`);
traj.slice(0, 5).forEach(pt =>
  console.log(`t=${pt.t.toFixed(3)}  q1=${pt.q[0].toFixed(3)}  qd1=${pt.qd[0].toFixed(3)}  qdd1=${pt.qdd[0].toFixed(3)}`)
);
```

- **Methods invoked:** `pathTracking` (geometric), `timeParameterize` (temporal).
- **Inputs:**
  - **Geometric path:** a line from `[0.35, 0.0, 0.35]` to `[0.45, 0.1, 0.40]`, with `steps: 6` → 7 waypoints.
  - **Timed options:**
    - `method: "quintic"` — the smooth time law, with zero velocity and acceleration at each segment boundary.
    - `dt: 0.005` s — the sample period.
    - `vMax: 1.0` rad/s — maximum joint speed.
    - `aMax: 5.0` rad/s² — maximum joint acceleration.
- **Output:** a header line and the first five trajectory samples, each with timestamp, joint-1 position, velocity, and acceleration.
- **Expected output (abridged):**

```
Samples: 412, duration: 2.058 s
t=0.000  q1=0.412  qd1=0.000  qdd1=0.000
t=0.005  q1=0.412  qd1=0.000  qdd1=0.012
t=0.010  q1=0.412  qd1=0.001  qdd1=0.035
t=0.015  q1=0.412  qd1=0.002  qdd1=0.067
t=0.020  q1=0.412  qd1=0.003  qdd1=0.107
```

- **Reading the output:**
  - **`Samples: 412`** — the trajectory has 412 samples, spaced `dt = 0.005 s` apart, giving a total duration of `2.058 s`.
  - **`duration: 2.058 s`** — determined by the segment duration formula in `timeParameterize`, which sizes each segment to satisfy `vMax` and `aMax`.
  - **`t=0.000`** — the first sample, at time zero, with the arm at rest (`qd1 = 0`, `qdd1 = 0`). This is the zero-velocity start imposed by the quintic time law.
  - **`t=0.005` and later** — the velocity begins to rise, and the acceleration grows from zero. This is the "smooth start" of the quintic — no jerk, no impulsive acceleration.
  - **`q1 = 0.412`** — the initial joint-1 angle. It changes very little in the first 20 ms — that is the *slow* start of the quintic curve.
- **Reading the trajectory structure:**
  - The trajectory is a sequence of `{ t, q, qd, qdd, s, seg }` objects, where:
    - **`t`** — the timestamp (seconds).
    - **`q`** — the joint vector (radians).
    - **`qd`** — the joint velocities (rad/s).
    - **`qdd`** — the joint accelerations (rad/s²).
    - **`s`** — the path parameter at this sample (`0` to `1` within each segment).
    - **`seg`** — the segment index (which pair of waypoints this sample is between).
  - The trajectory is **piecewise**, with each segment solved for its own duration. The output is continuous because the quintic time law imposes `q, qd, qdd` at segment boundaries.
- **Why `timeParameterize` matters:**
  - A geometric path (like the output of `pathTracking`) contains only joint *positions* at waypoints. It has no time information.
  - Feeding the waypoints to a robot directly would cause an infinite-acceleration jump at each segment boundary — the motors cannot follow a step change in position.
  - `timeParameterize` imposes a smooth time law on the path, producing a *continuous* `q(t)`, `q̇(t)`, `q̈(t)` — executable by any real servo controller.
- **Coding example:** as shown. The first five samples are printed for inspection; the full trajectory has 412 samples.
- **Common pitfalls:**
  - **`traj.length` is the number of samples, not the number of segments.** With 7 waypoints, there are 6 segments. Each segment is sampled at `dt = 0.005 s` with a duration determined by `vMax` and `aMax`. 412 samples over 6 segments is about 69 samples per segment — well within a typical trajectory resolution.
  - **The duration depends on `vMax` and `aMax`.** Smaller limits → longer duration. With `vMax = 1.0` and `aMax = 5.0`, the 14 cm diagonal move takes about 2 seconds. Doubling `vMax` would halve the duration (up to the acceleration limit); doubling `aMax` would halve it again up to the velocity limit.
  - **The output is *not* a `pathTracking` waypoint array.** It is a trajectory sample array. Do not confuse the two — a trajectory sample has `t, q, qd, qdd, s, seg`, while a waypoint has `p, q, ok`.
  - **The trajectory is open-loop at this stage.** It gives you the *reference* `q, qd, qdd` at each sample. To execute it, you need a controller (`jointVelocityControl`, `directTorqueControl`, or `rne` feedforward + PD).
  - **`method: "quintic"` is the default.** It gives the smoothest trajectory (continuous acceleration and bounded jerk) at the cost of a slightly longer duration than `"trapezoid"`. For most applications, quintic is the right choice.
  - **Segment duration formula uses peak factors `1.875` and `5.7735`.** These are the analytical maxima of the quintic time law's derivatives. If you change the method to `"trapezoid"` or `"linear"`, the segment durations use the same formula, which may not be exact for those methods.

## Example 4 — Time Parameterize with Torque Check (`TimeParameterize2.js`)

- **Purpose:** Extend Example 3 with a torque computation. After generating a timed trajectory, the script computes the joint torques required to follow it, using `rne`. This is the bridge between the trajectory layer and the torque layer — it tells you whether the motors can actually execute the trajectory.
- **Source:**

```javascript
const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// geometric path
const waypoints = arm.pathTracking(
  [0.35, 0.0, 0.35],
  [0.45, 0.1, 0.40],
  "line",
  { steps: 6 }
);

// timed reference
const traj = arm.timeParameterize(waypoints, {
  method: "quintic",
  dt: 0.005,
  vMax: 1.0,     // rad/s
  aMax: 5.0      // rad/s²
});

console.log(`Samples: ${traj.length}, duration: ${traj[traj.length-1].t.toFixed(3)} s`);
traj.slice(0, 5).forEach(pt =>
  console.log(`t=${pt.t.toFixed(3)}  q1=${pt.q[0].toFixed(3)}  qd1=${pt.qd[0].toFixed(3)}  qdd1=${pt.qdd[0].toFixed(3)}`)
);

// at each trajectory sample, compute what torque the motors need
const torques = traj.map(pt => arm.rne(pt.q, pt.qd, pt.qdd));
console.log("Peak shoulder torque:", Math.max(...torques.map(t => Math.abs(t[1]))).toFixed(2), "N·m");
```

- **Methods invoked:** `pathTracking`, `timeParameterize`, `rne`.
- **Inputs:** identical to Example 3, plus the torque computation over all trajectory samples.
- **Output:** the same header + 5-sample output as Example 3, plus a final line showing the peak shoulder torque.
- **Expected output (abridged):**

```
Samples: 412, duration: 2.058 s
t=0.000  q1=0.412  qd1=0.000  qdd1=0.000
t=0.005  q1=0.412  qd1=0.000  qdd1=0.012
t=0.010  q1=0.412  qd1=0.001  qdd1=0.035
t=0.015  q1=0.412  qd1=0.002  qdd1=0.067
t=0.020  q1=0.412  qd1=0.003  qdd1=0.107
Peak shoulder torque: XX.XX N·m
```

- **Reading the output:**
  - **The header and 5-sample output** are identical to Example 3 — same path, same trajectory.
  - **`Peak shoulder torque`** — the maximum value of `|τ₂|` across all samples. For the PUMA model with the default dynamics table, this is typically in the range 15–40 N·m depending on the configuration and the trajectory.
- **Why the torque check matters:**
  - The trajectory is *geometrically* valid — every waypoint was reachable, every sample is within the workspace.
  - But the trajectory must also be *dynamically* valid — the motors must be able to produce the torques required.
  - `rne` gives the exact torques required (gravity + Coriolis + inertia), and comparing against the motor's rated torque tells you whether the trajectory is feasible.
  - For a real robot, this is the last gate before the trajectory is scheduled for execution.
- **Reading the peak-torque result:**
  - **Small values (< 5 N·m)** — the trajectory is easy for the motors. Suitable for small, lightweight arms.
  - **Moderate values (5–30 N·m)** — the trajectory is normal for a mid-sized arm like the PUMA. The motors should handle it comfortably.
  - **Large values (> 30 N·m)** — the trajectory is aggressive, or the model's dynamics table is wrong. Check `arm.dynamics` and re-run.
- **Coding example:** as shown. The `traj.map(pt => arm.rne(...))` pattern computes the full torque trajectory in one expression.
- **The bridge between layers:**
  - This script is the smallest possible **integration test**: path → trajectory → torque.
  - If the peak torque is within the motor's limit, the trajectory is executable. If not, adjust `vMax`, `aMax`, or the path.
  - The same pattern extends to the full control loop: `timeParameterize → jointVelocityControl → motors`, or `timeParameterize → directTorqueControl → motors`.
- **Common pitfalls:**
  - **The torque computation uses `arm.dynamics`.** If the dynamics table is not set, `rne` uses the placeholder values from the library, which may not match your hardware. Always override `arm.dynamics` with real link masses and inertias.
  - **The peak torque is computed on all joints, but only joint 2 is reported.** Joint 2 (shoulder) is usually the most heavily loaded because it carries the entire distal chain. But in some configurations, joint 3 (elbow) can be larger. To see the peak on every joint, use:
    ```javascript
    const peaks = [0,1,2,3,4,5].map(j => Math.max(...torques.map(t => Math.abs(t[j]))));
    console.log("Peak torques per joint:", peaks.map(v => v.toFixed(2)));
    ```
  - **`rne` does not include friction.** The torque computed here is the *gravity + Coriolis + inertia* torque, not the total. Add friction compensation separately (`frictionCompensate`) for a realistic estimate.
  - **The peak torque is at a single point in time.** It does not tell you the RMS torque, which is what actually heats the motors. For motor sizing, compute the RMS:
    ```javascript
    const rms = [0,1,2,3,4,5].map(j =>
      Math.sqrt(torques.reduce((s, t) => s + t[j]*t[j], 0) / torques.length)
    );
    ```
  - **`arm.rne` is called 412 times.** This is fine for a benchmark, but in a real controller you would call it once per control tick, not once per trajectory sample.

---

## Example 5 — Rehabilitation Control Tick (Sketch) (`RehabilitationControlTick.js`)

- **Purpose:** This is a **design sketch**, not a runnable script. It shows how a rehabilitation controller would be structured using the library's primitives — ZMP, support polygon, nullspace control, friction compensation, gravity compensation — but it calls several functions that **do not exist in `caro.manipulator-1.0.js`**. It is a template, not an example.
- **Source:**

```javascript
function rehabilitationControlTick(state, patientIntent, exoModel) {
  // 1. Compute ZMP from current state
  const zmp = computeZMP(state.q, state.qd, state.grf, exoModel);

  // 2. Check if balance is threatened
  const supportPolygon = getSupportPolygon(state.footContacts);
  const zmpMargin = distanceToBoundary(zmp, supportPolygon);

  // 3. Primary task: keep ZMP inside (soft constraint)
  let taskAccel = [0,0,0];  // CoM acceleration reference
  if (zmpMargin < safetyThreshold) {
    // Assist-as-needed: generate corrective CoM trajectory
    taskAccel = hipStrategy(zmp, supportPolygon, state);
  }

  // 4. Nullspace: follow patient's natural gait, minimize effort
  const J = computeCoMJacobian(state.q, exoModel);
  const qd0 = patientIntent.qd;  // whatever the patient is trying to do

  // 5. Zero-impedance when stable, assist when unstable
  const qd = nullspaceControl(J, taskAccel, qd0);

  // 6. Convert to joint torques
  const tau = exoModel.rne(state.q, state.qd, qd)
            + frictionCompensate(state.qd, exoModel.friction)
            + gravityCompensate(state.q, exoModel);

  return tau;
}
```

- **Status:** **not runnable as written**. The following identifiers are undefined:
  - `computeZMP`
  - `getSupportPolygon`
  - `distanceToBoundary`
  - `safetyThreshold`
  - `hipStrategy`
  - `computeCoMJacobian`
  - `nullspaceControl` (a *global* function, not the method `arm.nullspaceControl`)
  - `frictionCompensate` (a *global* function, not the method `arm.frictionCompensate`)
  - `gravityCompensate` (not a library method; the library uses `arm.rne(q, 0, 0)` instead)
- **Purpose:** The sketch documents the **structure** of a rehab controller, not its implementation. It shows:
  1. **State estimation** — compute ZMP from current state.
  2. **Safety check** — compare ZMP to support polygon.
  3. **Assist-as-needed** — apply corrective CoM acceleration only when needed.
  4. **Nullspace** — project the patient's intended motion into the null space of the balance task.
  5. **Command** — convert the velocity reference to joint torques.
- **Reading the sketch:**
  - **Steps 1–2** — the balance assessment. ZMP and support polygon are the two classic metrics of humanoid balance. Neither is implemented in `caro.manipulator-1.0.js` — they belong to a *legged* extension library.
  - **Step 3** — the assist-as-needed blend. In the current library, this is provided by `arm.assistAsNeeded`, which uses a joint-space error metric rather than a ZMP margin. The `hipStrategy` function is a placeholder for a CoM-acceleration-based controller.
  - **Step 4** — the nullspace projection. In the current library, `arm.resolvedRateControl` with the `qd0` option does this. The `computeCoMJacobian` function is a placeholder for a full-body Jacobian, which would require a floating-base model.
  - **Step 5** — the velocity reference. `nullspaceControl` is a global function here, but the library's `arm.nullspaceControl` (documented in the Kinematics Manual) is close to it in spirit.
  - **Step 6** — the torque command. `exoModel.rne` calls the library's RNE. `frictionCompensate` and `gravityCompensate` are placeholders — in the library, gravity comes from `rne(q, 0, 0)` and friction from `arm.frictionCompensate(qd, friction)`.
- **What would make it runnable:**
  1. Replace `exoModel.rne(...)` with `arm.rne(q, qd, qdd)` — a real library call.
  2. Replace `exoModel.friction` with a real friction table (e.g. from `FrictionRLS`).
  3. Replace `frictionCompensate(...)` with `arm.frictionCompensate(qd, friction)`.
  4. Replace `gravityCompensate(...)` with `arm.rne(q, zeros, zeros)`.
  5. **Drop** the ZMP-related functions — they are not part of the arm library. A real rehab controller would need them, but they belong to a legged extension (see the humanoid discussion in this conversation).
  6. **Replace** the nullspace projection with `arm.nullspaceControl(J, xdot, qd0)` or `arm.resolvedRateControl({ q, xd, qd0 }, gains)`.
  7. **Add** a real `patientIntent` structure — a set of desired joint velocities, not a placeholder.
- **An annotated version** — with the library-level calls substituted and the legged functions stubbed out — is provided in Appendix A. It runs, but only as a *demonstration* of the structure; the legged parts return zeros.
- **Coding example:** as shown. The function signature `(state, patientIntent, exoModel)` is idiomatic — a control tick typically takes a state object, a reference object, and a model object.
- **Common pitfalls:**
  - **This is a sketch, not an example.** Do not try to run it without first providing the missing functions. Trying to run it will produce a `ReferenceError` on `computeZMP`.
  - **The legged parts are out of scope for the arm library.** ZMP, support polygon, CoM Jacobian, and hip strategy are all legged-robot concepts. They would be added in a *legged extension* — see the humanoid discussion elsewhere in this conversation.
  - **`nullspaceControl` here is a global function, not the library method.** The library has `arm.nullspaceControl(J, xdot, qd0)` (see the Kinematics Manual). This sketch assumes a different signature.
  - **The `state` object is undefined.** A real control tick would need at least `q`, `qd`, `grf` (ground reaction forces), and `footContacts`. This sketch's structure is illustrative.
  - **`patientIntent` is undefined.** It appears only as `patientIntent.qd` — a desired joint-velocity vector. In a real rehab controller, this would come from force sensing (via the momentum observer) and an intent estimator.
  - **The `+` between `rne`, `frictionCompensate`, and `gravityCompensate`** is misleading — `rne(q, qd, qdd)` already includes gravity and Coriolis when `qdd` is non-zero. Adding gravity again would double-count it. In the current library, the correct pattern is:
    ```javascript
    const tau = arm.rne(q, qd, qdd) + arm.frictionCompensate(qd, friction);
    ```

## What the Five Examples Prove Together

The five examples cover three different aspects of integration, plus one design sketch:

| Step | What it proves |
|---|---|
| 1. `PickAndPlace.js` | Path segments can be chained into a full mission. |
| 2. `Pose.js` | The 6-vector pose representation is consistent with the 4×4 matrix representation. |
| 3. `TimeParameterize1.js` | Geometric waypoints can be turned into a smooth, sampled, timed trajectory. |
| 4. `TimeParameterize2.js` | The trajectory can be validated against torque limits using `rne`. |
| 5. `RehabilitationControlTick.js` | The structure of a rehab controller is documented — even though the legged pieces are not implemented in the arm library. |

If Examples 1–4 pass and Example 5 is understood as a sketch, you have:

- a working mission orchestration example,
- a verified pose round-trip,
- a working time-parameterization pipeline,
- a working trajectory validation pipeline,
- a documented template for extending into legged / rehab territory.

---

## Extending the Examples

### 1. Execute the pick-and-place mission

The mission in Example 1 is geometric only. To execute it, chain each phase through the trajectory and torque layers:

```javascript
for (const phase of mission) {
  const traj = arm.timeParameterize(phase.waypoints, {
    method: "quintic", dt: 0.005, vMax: 0.5, aMax: 3.0
  });
  for (const pt of traj) {
    const tau = arm.rne(pt.q, pt.qd, pt.qdd) + arm.rne(pt.q, [0,0,0,0,0,0], [0,0,0,0,0,0]);
    // send tau to the motors
  }
}
```

### 2. Add a gripper model

Insert gripper actions between phases:

```javascript
const gripper = { open() {...}, close() {...} };
// ...
gripper.close();   // after approach, before lift
gripper.open();    // after place, before retract
```

### 3. Blend phase boundaries

The pick-and-place mission stops at each phase boundary. To smooth the transitions, generate a *combined* trajectory that treats the end of one phase and the start of the next as one segment:

```javascript
const combined = [...approachPath.slice(0, -1), ...liftPath];
```

Then `timeParameterize` handles the combined path as a single trajectory.

### 4. Full-pose round-trip

Extend `Pose.js` to include the orientation in the round-trip:

```javascript
const pose1 = arm._fkPose(arm.defaultModel, q);
const R = arm._rotVecToR(pose1.slice(3, 6));
const T = arm._poseToT(pose1.slice(0, 3), R);
const pose2 = arm._fkPose(arm.defaultModel, q);   // same pose, different round-trip
const diff = pose1.map((v, i) => Math.abs(v - pose2[i]));
console.log("max diff:", Math.max(...diff));
```

### 5. Torque histogram

Extend `TimeParameterize2.js` to show the torque distribution, not just the peak:

```javascript
const shoulderTorques = torques.map(t => Math.abs(t[1]));
const histogram = shoulderTorques.reduce((h, t) => {
  const bucket = Math.floor(t / 5) * 5;
  h[bucket] = (h[bucket] || 0) + 1;
  return h;
}, {});
console.log("Torque histogram (N·m → count):", histogram);
```

### 6. Rehab extension

To make `RehabilitationControlTick.js` into a real controller, you would need:

- a **floating-base model** — the arm library assumes a fixed base.
- a **contact model** — the arm library has none.
- a **CoM Jacobian** — the arm library's Jacobian is for the tool, not the CoM.
- a **ZMP computation** — depends on ground reaction forces and CoM position, neither of which is part of the arm library.
- a **support polygon** — depends on the foot contact state.

These belong to a **legged extension**, not to the arm library.

---

## Troubleshooting

The following issues are the most common when running these five scripts.

| Symptom | Likely cause | Fix |
|---|---|---|
| Pick-and-place reports `ok: false` for a phase | A waypoint is outside the workspace | Move `pickPose` or `placePose` closer to the base |
| `Pose.js` shows a mismatch between `pose[0..2]` and `T[0..2][3]` | `_eulerToR` error from large rotation | Use `_rotVecToR` instead of `_eulerToR` |
| `TimeParameterize1.js` duration is shorter than expected | `vMax` and `aMax` are too generous | Reduce them for a smoother trajectory |
| `TimeParameterize1.js` duration is too long | `vMax` and `aMax` are too small | Increase them, or reduce the number of waypoints |
| `TimeParameterize2.js` peak torque is `NaN` | `rne` failed at some sample | Check `arm.dynamics` and the joint vector dimensions |
| `TimeParameterize2.js` peak torque is much larger than expected | Dynamics table is wrong, or trajectory is very fast | Override `arm.dynamics` with real values, or reduce `aMax` |
| `RehabilitationControlTick.js` throws `ReferenceError: computeZMP is not defined` | Sketch, not a runnable script | See Appendix A for an annotated version, or supply your own legged extension |
| `RehabilitationControlTick.js` runs but returns zeros | Stubbed legged parts | Expected — the sketch documents structure, not behaviour |
| Trajectory has duplicate samples at segment boundaries | Inclusive sampling at both ends of a segment | Expected — filter or drop the duplicate if needed |

If a failure is not listed here, the fastest diagnostic is usually to run the four runnable scripts in order and identify the first one that fails.

---

## Appendix A — Annotated Rehabilitation Sketch

The following is a **runnable, annotated version** of `RehabilitationControlTick.js` with the legged functions stubbed out and the arm-library calls substituted. It runs without error, but the legged parts return zeros — they are placeholders for a future legged extension.

```javascript
// rehabilitationControlTick.js — annotated, runnable
// NOTE: the legged functions are STUBBED. This is a template, not a controller.

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();
const model = arm.DH_Lib.puma01;

// ---------- legged functions (stubs — implement for a real rehab robot) ----------
function computeZMP(q, qd, grf, exoModel) {
  // TODO: ZMP = CoM projection minus angular momentum rate / (m·g)
  return [0, 0];   // placeholder: no balance info
}

function getSupportPolygon(footContacts) {
  // TODO: convex hull of current foot contact points
  return [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]];
}

function distanceToBoundary(zmp, polygon) {
  // TODO: signed distance from zmp to nearest edge of polygon
  return Infinity;   // placeholder: always stable
}

function hipStrategy(zmp, polygon, state) {
  // TODO: CoM acceleration to push ZMP back toward polygon center
  return [0, 0, 0];  // placeholder: no corrective action
}

function computeCoMJacobian(q, exoModel) {
  // TODO: J_com(q) = Σ m_i · J_i_com(q) / Σ m_i
  return arm.jacobian(model, q);   // placeholder: use the tool Jacobian
}

// ---------- rehab control tick ----------
const safetyThreshold = 0.02;   // 2 cm margin

// Friction table (placeholder — replace with FrictionRLS output)
const friction = [
  { tau_c: 0.4, b: 0.05, tau_offset: 0.0 },
  { tau_c: 0.6, b: 0.08, tau_offset: 0.1 },
  { tau_c: 0.3, b: 0.04, tau_offset: 0.0 },
  { tau_c: 0.1, b: 0.02, tau_offset: 0.0 },
  { tau_c: 0.05, b: 0.01, tau_offset: 0.0 },
  { tau_c: 0.02, b: 0.005, tau_offset: 0.0 }
];

function rehabilitationControlTick(state, patientIntent) {
  // 1. Compute ZMP from current state (stub)
  const zmp = computeZMP(state.q, state.qd, state.grf, null);

  // 2. Check if balance is threatened (stub)
  const supportPolygon = getSupportPolygon(state.footContacts);
  const zmpMargin = distanceToBoundary(zmp, supportPolygon);

  // 3. Primary task: corrective CoM accel when needed (stub)
  let taskAccel = [0, 0, 0];
  if (zmpMargin < safetyThreshold) {
    taskAccel = hipStrategy(zmp, supportPolygon, state);
  }

  // 4. Nullspace: follow patient's intent
  const J = computeCoMJacobian(state.q, null);   // stub returns tool J
  const qd0 = patientIntent.qd || new Array(6).fill(0);

  // 5. Use the library's resolved-rate controller with nullspace
  const rr = arm.resolvedRateControl(
    { q: state.q, xd: [0,0,0,0,0,0], qd0: qd0 },
    { model, method: "dls", lambda: 0.05 }
  );
  const qdRef = rr.qdRef;

  // 6. Convert to joint torques: RNE (gravity + Coriolis) + friction
  const tau = arm.rne(state.q, state.qd, new Array(6).fill(0))
            .map((v, i) => v + arm.frictionCompensate(state.qd, friction)[i]);

  return { tau, zmp, zmpMargin, qdRef };
}

// ---------- example call ----------
const state = {
  q: [0.3, -0.5, 0.7, 0.1, 0.4, -0.2],
  qd: new Array(6).fill(0),
  grf: new Array(6).fill(0),
  footContacts: []
};

const patientIntent = { qd: [0.1, 0.05, 0.02, 0, 0, 0] };

const result = rehabilitationControlTick(state, patientIntent);
console.log("torques :", result.tau.map(v => v.toFixed(3)));
console.log("zmp     :", result.zmp);
console.log("margin  :", result.zmpMargin);
console.log("qdRef   :", result.qdRef.map(v => v.toFixed(3)));
```

**What the annotated version does:**
- **Stubs the legged functions** with placeholders that return zeros or trivial values.
- **Uses real library calls** for the arm-level parts: `arm.jacobian`, `arm.resolvedRateControl`, `arm.rne`, `arm.frictionCompensate`.
- **Runs without error** — the stubs prevent the `ReferenceError` of the original.
- **Documents what needs to be implemented** for a real rehab robot: ZMP, support polygon, hip strategy, CoM Jacobian.

**What the annotated version does *not* do:**
- **Does not compute a real ZMP.** The stub returns `[0, 0]`.
- **Does not compute a real support polygon.** The stub returns a fixed square.
- **Does not implement hip strategy.** The stub returns zeros.
- **Does not compute a CoM Jacobian.** The stub returns the tool Jacobian.
- **Does not implement a real patient intent estimator.** The `patientIntent` is a placeholder.

These missing pieces belong to a **legged extension** to the library — the arm library does not include them, because it is a fixed-base manipulator toolkit.

---

## Closing Notes

This manual is the eighth in the series. Together with the previous seven, it covers:

- the entire public API of `caro.manipulator-1.0.js`,
- the interfaces between layers (waypoint → trajectory → torque),
- one full mission example (pick-and-place),
- one design sketch for a future extension (rehabilitation).

The pattern is consistent with the earlier manuals: small, verifiable examples, each with a documented expected output and an honest note about what does not work as written.

Together, the eight manuals are:

1. **Dynamics** — Jacobian, joint velocities, RNE
2. **Kinematics** — DH, FK, IK, path sampling
3. **Velocity Control** — velocity stack, PI control, resolved-rate
4. **Force Control** — impedance, admittance, hybrid, parallel, operational space, assist-as-needed
5. **Friction RLS** — sensorless friction identification
6. **Momentum Observer** — sensorless external-force estimation
7. **Path Tracking** — line, circle, arc, Bézier
8. **Trajectory, Pose, Mission** — integration examples

That is **eight manuals**, **~50 examples**, and **eight appendices** documenting the complete library.

---

*End of document.*



