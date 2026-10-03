# CaroLab ANFIS Library

- **Name:** anfis-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Adaptive Neuro-Fuzzy Inference](#a-primary-library-for-adaptive-neuro-fuzzy-inference)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab ANFIS Library — Functions List](#carolab-anfis-library--functions-list)
4. [Detail Description](#detail-description)
   - [Module-Level Numeric Helpers](#module-level-numeric-helpers)
   - [ANFIS — Construction & Evaluation](#anfis--construction--evaluation)
   - [ANFIS — Training](#anfis--training)
   - [ANFIS — (De)serialisation](#anfis--deserialisation)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Adaptive Neuro-Fuzzy Inference

`anfis.js` is a dependency-free, UMD-wrapped implementation of **ANFIS** (Adaptive-Network-Based Fuzzy Inference System) — a first-order Sugeno fuzzy system trained by Jang's (1993) **hybrid learning rule**: least-squares for the consequent (linear) parameters, gradient descent for the premise (Gaussian membership) parameters. It is built around a single **`ANFIS`** class implementing the standard 5-layer architecture (fuzzification → rule firing → normalization → consequent → summation), with support for multiple outputs sharing one rule base (one set of firing strengths, only the linear consequent coefficients differing per output — as in a multi-actuator controller).

Every premise-parameter gradient in the training step is verified (per the source file's own comment) against central finite differences in the accompanying test script.

The library covers four broad areas:

| Area | Examples |
|---|---|
| Construction | `new ANFIS({ ranges, nMFs, nOutputs, outputNames, rules, ridge })` |
| Evaluation | `ANFIS.evaluate` |
| Training | `ANFIS.train`, `ANFIS.trainToMatch` |
| (De)serialisation | `ANFIS.toJSON`, `ANFIS.fromJSON` |

It also exports its small numeric toolkit — `solveLinear`, `lstsq`, `gauss` — for standalone use.

The library has no external dependencies, is UMD-wrapped (CommonJS `module.exports`, or an `ANFISLib` global), and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/anfis.js"></script>
<script>
  const { ANFIS } = ANFISLib;
  const net = new ANFIS({ ranges: [[-1, 1], [-1, 1]], nMFs: 3, outputNames: ['y'] });
  net.train([{ x: [0, 0], y: [0] }, { x: [1, 1], y: [2] }], { epochs: 100 });
  console.log(net.evaluate([0.5, 0.5]));
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const { ANFIS } = require('./anfis.js');

const net = new ANFIS({ ranges: [[-1, 1], [-1, 1]], nMFs: 3, outputNames: ['y'] });
net.train([{ x: [0, 0], y: [0] }, { x: [1, 1], y: [2] }], { epochs: 100 });

console.log(net.evaluate([0.5, 0.5]));
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** an `ANFIS` network's structure — input ranges, number of Gaussian terms per input, the rule base (full grid-partition Cartesian product by default, or a caller-supplied subset), and number of outputs — is fixed at construction time; only the membership-function and consequent parameters change during training. `evaluate(x)` takes a single input vector and returns either a plain array (in output-declaration order) or, if `outputNames` was given, an object keyed by those names (e.g. `{ Kp: ..., Ki: ..., Kd: ... }`, matching the servant-robot paper's multi-output setup). `train(data, opts)` runs the hybrid-learning loop over a whole dataset at once; there is no single-sample online-update method.

### Debugging Programs

- The constructor throws `ANFIS: "ranges" (one [lo,hi] per input) is required` if `ranges` is missing, not an array, or empty, and `ANFIS: "nMFs" length must equal the number of inputs` if an array `nMFs` doesn't match `ranges.length`.
- `train`'s internal least-squares solve (`lstsq`, via `solveLinear`) regularizes rather than throws on a (near-)singular design matrix: a pivot below `1e-14` is nudged by `+1e-10` before continuing, and `lstsq` itself always adds a `ridge · I` term (default `1e-6`, set via the constructor's `ridge` option) to the normal-equations matrix before solving, which keeps the consequent solve well-posed even with too little/collinear training data — no explicit "singular system" error is raised.
- Firing strengths are floored: if every rule's product-of-memberships firing strength underflows to (near) zero for a given input, the normalizing sum `S` is floored at `EPS = 1e-9` before dividing, rather than producing `NaN`/`Infinity` outputs.
- Premise widths (`s` in each `{c, s}` term) are floored at `1e-6` both at initialization and after every gradient-descent update, preventing a membership function from collapsing to a zero-width (delta-function) Gaussian during training.
- `static fromJSON` expects the exact shape produced by `toJSON()` (including `mf: [{c, s}, ...]` per input and `p` as nested plain arrays); passing a malformed or hand-edited object will surface as ordinary JavaScript errors (e.g. reading a property of `undefined`) rather than a dedicated validation message — validate structure yourself before calling `fromJSON` on untrusted data.
- `evaluate`/`train` do not separately validate that `x`'s length matches `nIn` or that `y`'s length matches `nOutputs`; mismatched lengths will silently read `undefined` (propagating as `NaN`) rather than throwing — check input/output vector lengths against `net.nIn`/`net.nOutputs` yourself when they aren't guaranteed correct ahead of time.

---

## CaroLab ANFIS Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `gauss` | Gaussian membership function `exp(-0.5·((x−c)/s)²)` |
| 2 | `solveLinear` | Solves a square linear system via Gaussian elimination with partial pivoting |
| 3 | `lstsq` | Ridge-regularized least-squares solve via the normal equations |
| 4 | `new ANFIS` | Constructs a 5-layer first-order-Sugeno ANFIS network |
| 5 | `ANFIS.nRules` | Getter — the number of rules (`Π nMFs[i]`, or the length of a custom `rules` list) |
| 6 | `ANFIS.evaluate` | Forward pass — the network's output(s) for one input vector |
| 7 | `ANFIS.train` | Runs Jang's hybrid-learning loop (LSE consequents + gradient-descent premises) over a dataset |
| 8 | `ANFIS.trainToMatch` | Static — trains an ANFIS to reproduce an existing rule-based function by grid sampling |
| 9 | `ANFIS.toJSON` | Serializes the network's structure and learned parameters to a plain object |
| 10 | `ANFIS.fromJSON` | Static — rebuilds a fully trained `ANFIS` from `toJSON()` output |

*(The internal forward-pass/training-step methods — `_forward`, `_epoch` — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API.)*

---

## Detail Description

### Module-Level Numeric Helpers

- **Function:** `gauss`
  **Description:** Gaussian membership function, evaluated at a point given a center and width — the sole membership-function shape ANFIS uses for its premise (input) terms.
  **Syntax:** `mu = ANFISLib.gauss(x, c, s);`
  **Input Arguments:** `x`: input value; `c`: center; `s`: width (standard deviation)
  **Output Arguments:** `mu`: membership degree in `(0, 1]`
  **Formula:** `mu = exp(-0.5 · ((x − c) / s)²)`

- **Function:** `solveLinear`
  **Description:** Solves a square linear system `A x = b` via Gaussian elimination with partial pivoting, back-substituting for `x`. A near-zero pivot is nudged by a small epsilon rather than treated as an error, so it degrades gracefully on (near-)singular systems.
  **Syntax:** `x = ANFISLib.solveLinear(A, b);`
  **Input Arguments:** `A`: `n × n` array; `b`: length-`n` array
  **Output Arguments:** `x`: length-`n` solution array

- **Function:** `lstsq`
  **Description:** Least-squares solution of the overdetermined (or underdetermined) system `A x ≈ b`, via the ridge-regularized normal equations `(AᵀA + ridge·I) x = Aᵀb`, solved with `solveLinear`. Used internally by `ANFIS.train` for the consequent (linear) parameter fit.
  **Syntax:** `x = ANFISLib.lstsq(A, b, ridge);`
  **Input Arguments:** `A`: `m × n` array (`m` samples, `n` parameters); `b`: length-`m` array; `ridge`: L2 regularization strength
  **Output Arguments:** `x`: length-`n` least-squares solution

---

### ANFIS — Construction & Evaluation

- **Function:** `new ANFIS(options)`
  **Description:** Constructs a first-order-Sugeno ANFIS network. Premise (Gaussian membership) parameters are initialized evenly across each input's range (`s` set from the resulting spacing); the rule base defaults to the full grid-partition Cartesian product of every input's terms (`Π nMFs[i]` rules) unless an explicit `rules` list of antecedent index-tuples is supplied; every rule's consequent (linear coefficients + bias, per output) starts at zero.
  **Syntax:** `net = new ANFIS(options);`
  **Input Arguments:** `options.ranges`: **required** array of `[lo, hi]`, one per input; `options.nMFs`: number of Gaussian membership functions per input — a single number (applied to every input) or an array matching `ranges.length`; **required**; `options.nOutputs`: number of Sugeno (linear) outputs sharing this rule base (default `1`, or `outputNames.length` if given); `options.outputNames`: optional names (e.g. `['Kp','Ki','Kd']`) — if given, `evaluate()` returns a named object instead of a plain array; `options.rules`: optional array of antecedent index-tuples (one term-index per input) to use instead of the full grid-partition product; `options.ridge`: L2 regularization for the least-squares consequent solve (default `1e-6`)
  **Output Arguments:** `net`: `ANFIS` instance, with `net.nIn`, `net.ranges`, `net.nMFs`, `net.nOutputs`, `net.outputNames`, `net.mf` (premise parameters, `mf[i][j] = {c, s}`), `net.rules`, `net.p` (consequent parameters, `p[r][k]` a `Float64Array(nIn+1)`)
  **Errors:** `ANFIS: "ranges" (one [lo,hi] per input) is required`; `ANFIS: "nMFs" length must equal the number of inputs`
  **Coding Example:**
  ```javascript
  const net = new ANFIS({
    ranges: [[-1, 1], [-10, 10]],
    nMFs: [5, 5],
    outputNames: ['Kp', 'Ki', 'Kd']
  });
  ```

- **Function:** `nRules`
  **Description:** Getter — the number of rules in the network (`net.rules.length`).
  **Syntax:** `R = net.nRules;`
  **Output Arguments:** `R`: integer

- **Function:** `evaluate`
  **Description:** Runs the 5-layer forward pass for one input vector: fuzzifies each input against every term (`gauss`), computes each rule's firing strength as the product of its antecedent memberships, normalizes the firing strengths, evaluates each rule's linear consequent, and returns the normalized-firing-strength-weighted sum across rules for every output.
  **Syntax:** `out = net.evaluate(x);`
  **Input Arguments:** `x`: array of `nIn` numbers
  **Output Arguments:** `out`: plain array of `nOutputs` numbers, or `{ outputName: value, ... }` if `outputNames` was given at construction

---

### ANFIS — Training

- **Function:** `train`
  **Description:** Trains the network on `{x, y}` samples via Jang's hybrid learning rule, one full epoch per iteration: (1) a closed-form least-squares solve (`lstsq`, shared design matrix across all outputs) fits every rule's consequent (linear coefficients + bias) given the current premise parameters; (2) one gradient-descent step, using the just-updated consequents, adjusts every premise Gaussian's center and width to reduce the sum-squared error (with each width floored at `1e-6`).
  **Syntax:** `{ history } = net.train(data, opts);`
  **Input Arguments:** `data`: array of `{ x: [...], y: [...] }` samples; `opts.epochs`: number of epochs (default `100`); `opts.lr`: premise-parameter learning rate (default `0.01`); `opts.lrDecay`: multiplier applied to `lr` after every epoch (default `1`, i.e. no decay); `opts.onEpoch(i, rmse)`: optional callback invoked after each epoch — return `true` to stop training early
  **Output Arguments:** `{ history }` — `history`: array of per-epoch RMSE values (length `epochs`, or fewer if stopped early)

- **Function:** `ANFIS.trainToMatch`
  **Description:** Static convenience matching the servant-robot paper's Fig. 4 idea: trains a given `ANFIS` to reproduce an existing rule-based function `fn(x) → y`, by sampling either a regular grid (`samplesPerInput` points per input dimension, Cartesian product) or a caller-supplied point list, then calling `train()` on the resulting `{x, y}` dataset until the error is small.
  **Syntax:** `{ history } = ANFIS.trainToMatch(net, fn, opts);`
  **Input Arguments:** `net`: an `ANFIS` instance to train (in place); `fn(x)`: function taking a length-`nIn` array, returning a length-`nOutputs` array; `opts.samplesPerInput`: grid resolution per input dimension when `opts.points` is not given (default `9`); `opts.points`: explicit array of input vectors to sample instead of a grid; other `opts` passed straight through to `train()`
  **Output Arguments:** `{ history }`: same shape as `train()`'s result

---

### ANFIS — (De)serialisation

- **Function:** `toJSON`
  **Description:** Serializes the network's full structure and current learned parameters — ranges, `nMFs`, `nOutputs`, `outputNames`, rules, `ridge`, every premise `{c, s}` term, and every consequent coefficient array — to a plain JSON-safe object.
  **Syntax:** `obj = net.toJSON();`
  **Output Arguments:** `obj`: plain object suitable for `JSON.stringify`

- **Function:** `ANFIS.fromJSON`
  **Description:** Static — rebuilds a fully configured and trained `ANFIS` from a `toJSON()`-shaped object (or its JSON string form): reconstructs the network via the constructor (so the rule base/consequent arrays are correctly shaped), then overwrites the premise and consequent parameters with the serialized values.
  **Syntax:** `net = ANFIS.fromJSON(json);`
  **Input Arguments:** `json`: object from `toJSON()`, or the equivalent JSON string
  **Output Arguments:** `net`: `ANFIS` instance

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `ANFIS#_forward(x)` | Full forward pass for one input vector; returns everything needed for both `evaluate()` and training: `{ mu, w, S, wbar, z, out }` — per-term memberships, raw and normalized rule firing strengths, per-rule-per-output consequent values, and the final output |
| `ANFIS#_epoch(X, Y, lr)` | One full training epoch: builds the shared LSE design matrix from cached `wbar` values across all samples, solves for every output's consequent coefficients via `lstsq`, then accumulates and applies the premise-parameter gradient-descent step (chain rule through the Gaussian membership functions) across all samples; returns the epoch's RMSE |

---
