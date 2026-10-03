# CaroLab Baseline Fuzzy PID Library

- **Name:** fuzzyPID-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Baseline-Plus-Fuzzy PID Control](#a-primary-library-for-baseline-plus-fuzzy-pid-control)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab FuzzyPID Library — Functions List](#carolab-fuzzypid-library--functions-list)
4. [Detail Description](#detail-description)
   - [SimplestFuzzyPID](#simplestfuzzypid)
   - [AdaptiveFuzzyPID](#adaptivefuzzypid)
   - [SwitchedFuzzyPID](#switchedfuzzypid)
   - [Module Exports](#module-exports)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Baseline-Plus-Fuzzy PID Control

`fuzzyPID.js` is a dependency-free, UMD-wrapped library of fuzzy PID controllers that start from a **designer-chosen baseline** (`Kp0, Ki0, Kd0` — the gains "at `x(0)`") rather than from a genetic algorithm. It ships three classes, each implementing a different published design:

| Class | Source | Idea |
|---|---|---|
| `SimplestFuzzyPID` | Mohan & Sinha, *"A Simplest Fuzzy PID Controller: Analytical Structure and Stability Analysis,"* INDICON 2004 | Closed-form incremental `Δu(kT)` (Eqs. 10–14) — no `FuzzySystem` inference at run time, just the paper's analytical formulas; reduces to the paper's own static gains `Kps/Kis/Kds` (Eqs. 24–25) at zero error/rate/accel |
| `AdaptiveFuzzyPID` | Lai, Zhou & Hu, *"A New Adaptive Fuzzy PID Control Method and Its Application in FCBTM,"* IJCCC 11(3), 2016 | `Kp = Kp0 + ΔKp`, `Ki = Ki0 + ΔKi`, `Kd = Kd0 + ΔKd` (their Eq. 6); `ΔKp/ΔKi/ΔKd` come from a 2-D `FuzzySystem` on `(e, ec)` |
| `SwitchedFuzzyPID` | Same paper, Figure 2's 3-branch structure | Routes each sample to one of three `AdaptiveFuzzyPID` engines by error magnitude and the sign of the error's 2nd derivative |

> **Honesty note carried from the source file:** `AdaptiveFuzzyPID`'s default rule tables (`DEFAULT_RULES`) are the classic Zhao/Tomizuka/Isaka-style self-tuning fuzzy-PID rule base widely reproduced in this literature — **not** a verified transcription of [LZH16]'s own Table 1, which was too garbled to OCR reliably. Pass your own `rules` to `AdaptiveFuzzyPID`/`SwitchedFuzzyPID` to substitute the exact table once available. `SimplestFuzzyPID`, by contrast, is a direct, internally-verified transcription of [MS04]'s Case (a) closed-form equations; [MS04]'s Case (b) (boundary regions, Eqs. 15–21) is **not** implemented — inputs are instead clamped to `[-l, l]`, keeping every evaluation inside the verified Case (a) region as a conservative simplification.

This library depends on `fuzzy.js` (`FuzzySystem`) being available in the same folder/module scope — it is not needed by `SimplestFuzzyPID`, which uses no `FuzzySystem` at all.

The library is UMD-wrapped (CommonJS `module.exports`, requiring `./fuzzy.js`, or a `FuzzyPIDLib` global built from `root.Fuzzy`) and runs unmodified in a browser `<script>` tag (after `fuzzy.js`) or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/fuzzy.js"></script>
<script type="text/javascript" src="js/fuzzyPID.js"></script>
<script>
  const { AdaptiveFuzzyPID } = FuzzyPIDLib;
  const pid = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03, dt: 0.01 });
  const u = pid.step(error);   // Kp = Kp0 + ΔKp(e, ec), etc.
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const { AdaptiveFuzzyPID } = require('./fuzzyPID.js'); // requires ./fuzzy.js too

const pid = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03, dt: 0.01 });
const u = pid.step(error);

console.log('Control signal:', u);
```

Then run it by node.js:

```
node program1.js
```

Closed-form analytical version ([MS04]-style, no `fuzzy.js` needed):

```javascript
const { SimplestFuzzyPID } = require('./fuzzyPID.js');

const pid = new SimplestFuzzyPID({ l: 1, M: 1900, Nd: 1, Nv: 2.2, Na: 0.41e-4, NDu: 0.71, dt: 0.001 });
const u = pid.step(error);
```

> **Note on usage:** all three controllers follow the same pattern as `FuzzyPID` in `fuzzy.js` and the other PID libraries in this suite — construct once with the required design parameters (each class validates its own required options eagerly), then call `.step(e, dt)` once per sample, which mutates the controller's internal integral/derivative-history state and returns the (saturated) control signal. `.reset()` clears that state; `.last` always holds the most recent `step()`'s full result object for inspection/logging.

### Debugging Programs

- `SimplestFuzzyPID`'s constructor throws `SimplestFuzzyPID: option "<k>" must be a positive number` for any of its six required options (`l`, `M`, `Nd`, `Nv`, `Na`, `NDu`) that is missing or not `> 0`.
- `AdaptiveFuzzyPID`'s constructor throws `AdaptiveFuzzyPID: designer baseline "<k>" (the x(0) gain) is required` if `Kp0`/`Ki0`/`Kd0` is missing or not a finite number.
- `SwitchedFuzzyPID`'s constructor throws `SwitchedFuzzyPID: option "e0" (switching threshold) must be > 0` if `e0` is missing or not positive.
- Every `.step(e, dt)` method throws `<ClassName>.step needs dt > 0 (pass it or set options.dt)` (and `AdaptiveFuzzyPID.stepWithEC` the analogous `AdaptiveFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)`) if no valid sample time is available from either the call or the constructor's `dt` option.
- `SimplestFuzzyPID`'s internal denominator `D` (Eq. 10–14) is guarded against near-zero values (`|D| < 1e-9` is clamped to `±1e-9`) rather than throwing, since `D → 0` can occur legitimately near certain operating points.
- `AdaptiveFuzzyPID`/`SwitchedFuzzyPID` rely on `fuzzy.js`'s `FuzzySystem`, so malformed custom `rules`/`fis` options surface as `FuzzySystem` construction/evaluation errors (see `fuzzy-1.0_functions_list.md`'s Debugging Programs section) rather than errors specific to this file.
- `SimplestFuzzyPID.step`'s three normalized inputs (`dN`, `vN`, `aN`) are unconditionally clamped to `[-l, l]` rather than validated/thrown on — this is the documented, conservative stand-in for [MS04]'s unimplemented Case (b) boundary regions, not an error condition.
- `SwitchedFuzzyPID.reset()` de-duplicates shared engines (e.g. when `fz2`/`fz3` default to `fz1`) via an internal `Set` so a shared engine's state is only reset once per call, not silently skipped or double-reset.

---

## CaroLab FuzzyPID Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `new SimplestFuzzyPID` | Closed-form analytical fuzzy PID (Mohan & Sinha 2004, Case (a)) |
| 2 | `SimplestFuzzyPID.reset` | Clears the controller's displacement/rate/output history |
| 3 | `SimplestFuzzyPID.beta` | Static — the constant β (Eq. 25) relating static gains to normalization factors |
| 4 | `SimplestFuzzyPID.staticGains` | The `x(0)` static gains `Kps, Kis, Kds` (Eqs. 24–25) |
| 5 | `SimplestFuzzyPID.dynamicGains` | Dynamic gains `Kpd, Kid, Kdd` at a given normalized operating point (Eq. 23) |
| 6 | `SimplestFuzzyPID.step` | One controller update (velocity/incremental form) |
| 7 | `new AdaptiveFuzzyPID` | Baseline-plus-fuzzy-correction PID: `Kp = Kp0 + ΔKp(e, ec)`, etc. (Lai/Zhou/Hu 2016) |
| 8 | `AdaptiveFuzzyPID.LABELS` | Static getter — the 7 linguistic labels used by the default rule tables |
| 9 | `AdaptiveFuzzyPID.DEFAULT_RULES` | Static getter — the built-in `dKp`/`dKi`/`dKd` 7×7 rule tables |
| 10 | `AdaptiveFuzzyPID.buildFIS` | Static — builds the default 2-input `(e, ec)` → 3-output `(dKp, dKi, dKd)` fuzzy system |
| 11 | `AdaptiveFuzzyPID.reset` | Clears the controller's integral/derivative-history state |
| 12 | `AdaptiveFuzzyPID.setBaseline` / `getBaseline` | Sets/gets the designer baseline `{Kp0, Ki0, Kd0}` |
| 13 | `AdaptiveFuzzyPID.gains` | Corrected gains at a given `(e, ec)`, without touching controller state |
| 14 | `AdaptiveFuzzyPID.step` | One controller update, computing `ec` from the previous error internally |
| 15 | `AdaptiveFuzzyPID.stepWithEC` | One controller update with a pre-computed error-rate (used by `SwitchedFuzzyPID`) |
| 16 | `new SwitchedFuzzyPID` | 3-branch switched fuzzy PID (large-error / curvature-refined small-error), after Lai/Zhou/Hu 2016 Fig. 2 |
| 17 | `SwitchedFuzzyPID.reset` | Clears all (de-duplicated) underlying `AdaptiveFuzzyPID` engines' state |
| 18 | `SwitchedFuzzyPID.step` | One controller update, routing to `fz1`/`fz2`/`fz3` by error magnitude and curvature sign |

*(Module-level exports and constants — `version`, `LABELS`, `DEFAULT_RULES` — are listed separately under [Module Exports](#module-exports).)*

---

## Detail Description

### SimplestFuzzyPID

Direct transcription of [MS04]'s closed-form Case (a) equations — no `FuzzySystem`/rule inference at run time.

- **Function:** `new SimplestFuzzyPID(options)`
  **Description:** Constructs the controller from the paper's six required design constants. Validates every one is a positive finite number eagerly.
  **Syntax:** `pid = new SimplestFuzzyPID(options);`
  **Input Arguments:** `options.l`: half-width of the input "core" interval `[-l, l]` (Fig. 2); `options.M`: output triangular-MF span (Fig. 3); `options.Nd`, `options.Nv`, `options.Na`: normalization factors for error, error-rate, error-acceleration; `options.NDu`: normalization factor for the incremental output `Δu`; `options.dt`: default sample time `T`; `options.outLimits`: `[lo, hi]` saturation of the absolute, velocity-form control signal (default `[-Infinity, Infinity]`)
  **Output Arguments:** `pid`: `SimplestFuzzyPID` instance
  **Errors:** `SimplestFuzzyPID: option "<k>" must be a positive number` for any of `l, M, Nd, Nv, Na, NDu`

- **Function:** `reset`
  **Description:** Clears the controller's previous displacement/rate history (`d1`, `v1`), accumulated output `u`, and `.last` result.
  **Syntax:** `pid.reset();` *(chainable)*
  **Output Arguments:** `pid`: the same `SimplestFuzzyPID` (for chaining)

- **Function:** `SimplestFuzzyPID.beta`
  **Description:** Static — computes β (Eq. 25), the constant that relates the controller's static gains to its normalization factors.
  **Syntax:** `b = SimplestFuzzyPID.beta(options);`
  **Input Arguments:** `options`: object with `M`, `NDu`, `l` (typically the controller's own `options`)
  **Output Arguments:** `b`: float value
  **Formula:** `β = 14M / (45 · NDu · l)`

- **Function:** `staticGains`
  **Description:** The controller's `x(0)` static gains — what the fuzzy PID reduces to at zero error, rate, and acceleration (Eqs. 24–25).
  **Syntax:** `{ Kps, Kis, Kds, beta } = pid.staticGains();`
  **Output Arguments:** `{ Kps, Kis, Kds, beta }` — `Kps = β·Nv`, `Kis = β·Nd`, `Kds = β·Na`

- **Function:** `dynamicGains`
  **Description:** Computes the dynamic gains `Kpd, Kid, Kdd` (Eq. 23) at a given, already-normalized-and-clamped operating point `(dN, vN, aN)`, without advancing controller state.
  **Syntax:** `{ Kpd, Kid, Kdd, N1, N2, N3, D } = pid.dynamicGains(dN, vN, aN);`
  **Input Arguments:** `dN`, `vN`, `aN`: normalized displacement/rate/acceleration, each in `[-l, l]`
  **Output Arguments:** `{ Kpd, Kid, Kdd, N1, N2, N3, D }` — the three dynamic gains plus the Eq. (10)–(14) intermediate numerator/denominator terms

- **Function:** `step`
  **Description:** One controller update in velocity/incremental form, matching the paper's block diagram. Computes rate `v` and acceleration `a` from the previous two samples' displacement, normalizes and clamps all three to `[-l, l]`, evaluates the closed-form `Δu(kT)` (Eqs. 10–14), and accumulates it into the running absolute output.
  **Syntax:** `u = pid.step(e, dt);`
  **Input Arguments:** `e`: displacement/error (`d(kT)` = `ref − measurement`); `dt`: sample time `T` (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated absolute control signal `u(kT) = u((k−1)T) + Δu(kT)`; also stored on `pid.last` as `{ u, du, d, v, a, dN, vN, aN, N1, N2, N3, D }`
  **Errors:** `SimplestFuzzyPID.step needs dt > 0 (pass it or set options.dt)`
  **Note:** clamping the accumulated output state at saturation is this velocity form's anti-windup mechanism.

---

### AdaptiveFuzzyPID

`Kp = Kp0 + ΔKp(e, ec)`, `Ki = Ki0 + ΔKi(e, ec)`, `Kd = Kd0 + ΔKd(e, ec)` — a `fuzzy.js` `FuzzySystem` supplies the three corrections from a 2-D `(e, ec)` rule base.

- **Function:** `new AdaptiveFuzzyPID(options)`
  **Description:** Constructs the controller from a required designer baseline plus optional scaling, universes, and a custom rule table or `FuzzySystem`.
  **Syntax:** `pid = new AdaptiveFuzzyPID(options);`
  **Input Arguments:** `options.Kp0`, `options.Ki0`, `options.Kd0`: **required** designer baseline gains (the `x(0)` point); `options.eRange`, `options.ecRange`: physical universes for error/error-rate fed to the FIS (default `[-3, 3]` each); `options.dKpRange`, `options.dKiRange`, `options.dKdRange`: physical universes for the three correction outputs (defaults `[-3,3]`, `[-0.06,0.06]`, `[-3,3]`); `options.scale`: `{Ke, Kec, Gp, Gi, Gd}` extra scaling of inputs/outputs (each default `1`); `options.rules`: `{dKp, dKi, dKd}` 7×7 label tables to override `DEFAULT_RULES`; `options.fis`: a caller-supplied `FuzzySystem` (inputs `[e, ec]`, outputs `dKp, dKi, dKd`) instead of `buildFIS`'s default; `options.dt`, `options.outLimits`, `options.integralLimit`, `options.derivativeTau`: as in a normal PID
  **Output Arguments:** `pid`: `AdaptiveFuzzyPID` instance
  **Errors:** `AdaptiveFuzzyPID: designer baseline "<k>" (the x(0) gain) is required` for a missing/non-finite `Kp0`/`Ki0`/`Kd0`

- **Function:** `AdaptiveFuzzyPID.LABELS`
  **Description:** Static getter — a copy of the 7 linguistic labels (`['NB','NM','NS','ZO','PS','PM','PB']`) used by `buildFIS` and `DEFAULT_RULES`.
  **Syntax:** `labels = AdaptiveFuzzyPID.LABELS;`
  **Output Arguments:** `labels`: array of 7 strings

- **Function:** `AdaptiveFuzzyPID.DEFAULT_RULES`
  **Description:** Static getter — the built-in `dKp`/`dKi`/`dKd` 7×7 rule tables (rows = `e`, cols = `ec`); see the module-level honesty note above regarding their provenance.
  **Syntax:** `rules = AdaptiveFuzzyPID.DEFAULT_RULES;`
  **Output Arguments:** `rules`: `{ dKp, dKi, dKd }`, each a `7×7` array of term labels

- **Function:** `AdaptiveFuzzyPID.buildFIS`
  **Description:** Static — builds the default 2-input `(e, ec)` → 3-output `(dKp, dKi, dKd)` `FuzzySystem`: product AND / probabilistic-sum OR / product implication / sum aggregation / centroid defuzzification, with mixed Gaussian-end/triangular-middle input terms (`addMixedTerms`) and triangular output terms, filled via `addRuleTable` from `options.rules || DEFAULT_RULES`.
  **Syntax:** `fis = AdaptiveFuzzyPID.buildFIS(options);`
  **Input Arguments:** `options.eRange`, `options.ecRange`, `options.dKpRange`, `options.dKiRange`, `options.dKdRange`, `options.rules` — as in the constructor
  **Output Arguments:** `fis`: `FuzzySystem` instance

- **Function:** `reset`
  **Description:** Clears the controller's integral accumulator, previous-error, derivative-filter state, and `.last` result.
  **Syntax:** `pid.reset();` *(chainable)*
  **Output Arguments:** `pid`: the same `AdaptiveFuzzyPID` (for chaining)

- **Function:** `setBaseline` / `getBaseline`
  **Description:** Sets (merges into) or reads the designer baseline `{Kp0, Ki0, Kd0}` — lets the "at `x(0)`" operating point be re-tuned (e.g. by hand, Ziegler–Nichols, or an outer loop) without rebuilding the fuzzy correction system.
  **Syntax:** `pid.setBaseline(o);` *(chainable)* / `b = pid.getBaseline();`
  **Input Arguments:** *(setBaseline)* `o`: partial `{Kp0, Ki0, Kd0}` object
  **Output Arguments:** *(setBaseline)* `pid`: the same instance (for chaining); *(getBaseline)* `b`: a copy of `{Kp0, Ki0, Kd0}`

- **Function:** `gains`
  **Description:** Evaluates the corrected gains at a given `(e, ec)` (each scaled by `scale.Ke`/`scale.Kec` before the FIS lookup, each correction scaled by `scale.Gp`/`scale.Gi`/`scale.Gd` before adding to the baseline), without touching controller state.
  **Syntax:** `g = pid.gains(e, ec);`
  **Input Arguments:** `e`: error; `ec`: error rate
  **Output Arguments:** `g`: `{ dKp, dKi, dKd, Kp, Ki, Kd }` — the raw FIS corrections, and the baseline-plus-scaled-correction gains

- **Function:** `step`
  **Description:** One controller update: computes the error-rate `ec` from the previous call (with optional first-order derivative filtering via `derivativeTau`), then delegates to the shared core (gain scheduling, conditional-integration anti-windup, saturation).
  **Syntax:** `u = pid.step(e, dt);`
  **Input Arguments:** `e`: error (`ref − measurement`); `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal; also stored on `pid.last` as `{ u, e, ec, integral, gains }`
  **Errors:** `AdaptiveFuzzyPID.step needs dt > 0 (pass it or set options.dt)`

- **Function:** `stepWithEC`
  **Description:** Like `step`, but takes a pre-computed error-rate directly instead of differencing against the previous call — used by `SwitchedFuzzyPID` so its three branch engines share one `e`/`ec` history rather than each computing their own (inconsistent) rate.
  **Syntax:** `u = pid.stepWithEC(e, ec, dt);`
  **Input Arguments:** `e`: error; `ec`: pre-computed error-rate; `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal; also stored on `pid.last`
  **Errors:** `AdaptiveFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)`

---

### SwitchedFuzzyPID

The 3-branch structure of [LZH16]'s Figure 2, built from three (possibly shared) `AdaptiveFuzzyPID` engines.

- **Function:** `new SwitchedFuzzyPID(options)`
  **Description:** Constructs the switched controller. `fz2`/`fz3` default to `fz1` if not given — i.e. the controller degrades to a plain 2-D `AdaptiveFuzzyPID` unless distinct tuning/rules are supplied for the small-error branches.
  **Syntax:** `pid = new SwitchedFuzzyPID(options);`
  **Input Arguments:** `options.e0`: **required** switching threshold — `|e| ≥ e0` routes to `fz1` (large-error branch); `|e| < e0` routes to `fz2` if the error's 2nd derivative is positive, else `fz3`; `options.fz1`, `options.fz2`, `options.fz3`: each either an `AdaptiveFuzzyPID` instance or an options object to build one (`fz1` defaults to being built from `options` itself if omitted); `options.dt`: default sample time
  **Output Arguments:** `pid`: `SwitchedFuzzyPID` instance
  **Errors:** `SwitchedFuzzyPID: option "e0" (switching threshold) must be > 0`

- **Function:** `reset`
  **Description:** Resets every distinct underlying `AdaptiveFuzzyPID` engine (de-duplicated — a shared `fz1 === fz2` engine is reset once) plus this controller's own error/error-rate history and `.lastBranch`.
  **Syntax:** `pid.reset();` *(chainable)*
  **Output Arguments:** `pid`: the same `SwitchedFuzzyPID` (for chaining)

- **Function:** `step`
  **Description:** One controller update. Computes the error-rate `ec` from the previous sample; if `|e| ≥ e0`, routes to `fz1.stepWithEC`; otherwise computes the error-rate's own derivative `er` and routes to `fz2.stepWithEC` (if `er > 0`) or `fz3.stepWithEC` (otherwise). All three engines share one `(e, ec)` history via `stepWithEC` rather than differencing independently.
  **Syntax:** `u = pid.step(e, dt);`
  **Input Arguments:** `e`: error (`ref − measurement`); `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal from whichever branch fired; the branch name is also recorded on `pid.lastBranch` (`'fz1'` \| `'fz2'` \| `'fz3'`)
  **Errors:** `SwitchedFuzzyPID.step needs dt > 0 (pass it or set options.dt)`

---

### Module Exports

- **Function:** `version`
  **Description:** Library version string.
  **Syntax:** `FuzzyPIDLib.version;`
  **Output Arguments:** `'0.1.0'`

- **Function:** `LABELS`
  **Description:** Module-level export of the same 7 linguistic labels as `AdaptiveFuzzyPID.LABELS`.
  **Syntax:** `FuzzyPIDLib.LABELS;`

- **Function:** `DEFAULT_RULES`
  **Description:** Module-level export of the same default rule tables as `AdaptiveFuzzyPID.DEFAULT_RULES`.
  **Syntax:** `FuzzyPIDLib.DEFAULT_RULES;`

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `clamp(x, lo, hi)` | Simple numeric clamp, used for input normalization clipping and anti-windup |
| `addMixedTerms(fv, labels)` | Adds 7 terms to a `FuzzyVariable` with Gaussian shapes at the two end labels and triangular shapes in between (the paper's Fig. 3 style), used by `AdaptiveFuzzyPID.buildFIS` for the `e`/`ec` inputs |
| `AdaptiveFuzzyPID#_core(e, ec, dt)` | Shared backing implementation for `step`/`stepWithEC`: gain scheduling via `gains()`, integral accumulation with a clamp, conditional-integration anti-windup, and output saturation |

---
