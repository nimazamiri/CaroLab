# CaroLab Fuzzy Logic Library

- **Name:** fuzzy-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Fuzzy Inference](#a-primary-library-for-fuzzy-inference)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab Fuzzy Library — Functions List](#carolab-fuzzy-library--functions-list)
4. [Detail Description](#detail-description)
   - [Membership Functions](#membership-functions)
   - [FuzzyVariable](#fuzzyvariable)
   - [FuzzySystem — Construction](#fuzzysystem--construction)
   - [FuzzySystem — Evaluation](#fuzzysystem--evaluation)
   - [FuzzySystem — Tuning Support](#fuzzysystem--tuning-support)
   - [FuzzySystem — (De)serialisation](#fuzzysystem--deserialisation)
   - [FuzzyPID](#fuzzypid)
   - [Rule Parsing](#rule-parsing)
   - [Presets](#presets)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Fuzzy Inference

`fuzzy.js` is a dependency-free, UMD-wrapped fuzzy-logic library built around two core classes — **`FuzzyVariable`** (an input or output linguistic variable with named membership-function terms) and **`FuzzySystem`** (a full Mamdani or Sugeno inference engine composed of `FuzzyVariable`s and rules) — plus a ready-made **`FuzzyPID`** controller built on top of `FuzzySystem`.

A `FuzzySystem` is configured once (inputs, outputs, terms, rules) and then compiled lazily on first `evaluate()` call into a flat, allocation-light internal representation (`_compile()`), which is invalidated automatically whenever the configuration changes.

The library covers four broad areas:

| Area | Examples |
|---|---|
| Membership functions | `trimf`, `trapmf`, `gaussmf`, `gbellmf`, `sigmf`, `singleton`, `evalMF` |
| Variable & rule construction | `FuzzyVariable.addTerm`/`addTerms`, `FuzzySystem.addInput`/`addOutput`, `addRule`, `addRuleTable`, `parseRule` |
| Inference | `FuzzySystem.evaluate`, `evaluateScalar`, `controlSurface` (Mamdani: min/max or prod/probsum AND/OR, min/prod implication, max/sum/probsum aggregation, centroid/bisector/mom/som/lom defuzzification; Sugeno: wtaver/wtsum) |
| Ready-made controller | `FuzzyPID` — a 2-input (e, de) → 3-output (Kp, Ki, Kd) gain-scheduled fuzzy PID, after Madebo (IEEE Access 2025) |

The `and:'prod', or:'probsum', implication:'prod', aggregation:'sum', defuzz:'centroid'` combination has an exact closed-form fast path (no numerical sampling of the output universe is needed), used automatically by `FuzzySystem.evaluate` and by `FuzzyPID.buildFIS`.

The library has no external dependencies, is UMD-wrapped (CommonJS `module.exports`, or a `Fuzzy` global), and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/fuzzy.js"></script>
<script>
  const F = Fuzzy;
  const sys = new F.FuzzySystem({ and: 'min', or: 'max', defuzz: 'centroid' });
  sys.addInput('temp', [0, 40]).addTerms(['cold', 'warm', 'hot'], 'trimf');
  sys.addOutput('fan', [0, 100]).addTerms(['low', 'mid', 'high'], 'trimf');
  sys.addRule('IF temp IS cold THEN fan IS low');
  sys.addRule('IF temp IS warm THEN fan IS mid');
  sys.addRule('IF temp IS hot THEN fan IS high');
  console.log(sys.evaluate({ temp: 30 })); // -> { fan: ... }
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const F = require('./fuzzy.js');

const sys = new F.FuzzySystem({ and: 'min', or: 'max', defuzz: 'centroid' });
sys.addInput('temp', [0, 40]).addTerms(['cold', 'warm', 'hot'], 'trimf');
sys.addOutput('fan', [0, 100]).addTerms(['low', 'mid', 'high'], 'trimf');
sys.addRule('IF temp IS cold THEN fan IS low');
sys.addRule('IF temp IS warm THEN fan IS mid');
sys.addRule('IF temp IS hot THEN fan IS high');

console.log(sys.evaluate({ temp: 30 }));
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** `FuzzyVariable`s are never constructed directly — `FuzzySystem.addInput`/`addOutput` create and register them, returning the variable so terms can be chained onto it (`sys.addInput(...).addTerms(...)`). Rules can be added as human-readable strings (`'IF a IS x AND b IS y THEN c IS z'`) or as plain objects (`{ if: {...}, then: {...} }`); a 2-input rule base can also be filled in bulk from tables via `addRuleTable`. Everything (inputs, outputs, rules) is configured once on the `FuzzySystem` instance, and `evaluate()`/`evaluateScalar()` then take **only the input values**, no separate data argument.

### Debugging Programs

- `FuzzyVariable`'s constructor throws `Variable "<name>": range must be [lo, hi] with hi > lo` for an invalid range.
- `addTerm`/`addTerms` throw `Unknown MF type "<type>"`, `<type> needs <n> params` (wrong parameter count for `trimf`/`trapmf`/`gaussmf`/`gbellmf`/`sigmf`/`singleton`), `Duplicate term "<label>" in <variable>`, and `addTerms needs at least 2 labels` / `addTerms: unsupported shape "<shape>"`.
- `FuzzySystem.evaluate` throws `FuzzySystem needs at least one input and one output` (raised lazily, on first `_compile()`), `Expected <n> inputs` (array input of the wrong length), and `Missing/invalid input "<name>"` (object input missing a key or given a non-finite value).
- Rule parsing (`parseRule`, used by `addRule` for string rules) throws `Rule needs exactly one THEN: <rule>`, `Mixed AND/OR in one rule is not supported; split it into rules: <rule>`, `Bad antecedent "<clause>" in rule: <rule>`, and `Bad consequent "<clause>" in rule: <rule>` for malformed syntax.
- `_compile()` (triggered by the first `evaluate()` after any configuration change) throws `Rule <k>: unknown input "<name>"` / `Rule <k>: unknown term "<term>" of <name>` and the output-side equivalents if a rule references a variable or term that hasn't been added; `Input term "<label>" needs a real MF type` and `Mamdani output term "<label>" needs a real MF type` if a term's `type` isn't a real membership function; Sugeno output terms additionally require `Sugeno output term "<label>" must be constant or linear`.
- `addRuleTable` throws `addRuleTable: unknown input variable` if `rows`/`cols` don't name registered inputs.
- `defuzzGrid` (used internally by non-fast-path Mamdani evaluation) throws `Unknown defuzzification "<kind>"` for an unrecognized `defuzz` setting.
- `setParams` throws `setParams: expected <n> values, got <m>` on a length mismatch against `getParams()`.
- Any change to a `FuzzySystem`'s inputs/outputs/terms/rules/options invalidates its compiled cache automatically (`_c = null`); call `invalidate()` yourself only if you mutate a returned `FuzzyVariable`/rule object in place rather than through the documented methods.
- `FuzzyPID.step` throws `FuzzyPID.step needs dt > 0 (pass it or set options.dt)` if no valid sample time is available.

---

## CaroLab Fuzzy Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `MF.trimf` / `MF.trapmf` / `MF.gaussmf` / `MF.gbellmf` / `MF.sigmf` / `MF.singleton` | The six built-in membership-function shapes |
| 2 | `evalMF` | Evaluates a named membership function by type string |
| 3 | `new FuzzyVariable` | Input/output linguistic variable with a range and named terms (normally created via `addInput`/`addOutput`) |
| 4 | `FuzzyVariable.addTerm` | Adds one named membership-function term |
| 5 | `FuzzyVariable.addTerms` | Adds several evenly-spaced terms across the variable's range at once |
| 6 | `FuzzyVariable.termIndex` | Looks up a term's index by label |
| 7 | `FuzzyVariable.fuzzify` | Degree of membership of a value in every term |
| 8 | `new FuzzySystem` | Constructs a Mamdani or Sugeno fuzzy inference system |
| 9 | `FuzzySystem.invalidate` | Clears the compiled-evaluation cache |
| 10 | `FuzzySystem.addInput` | Registers a new input `FuzzyVariable` |
| 11 | `FuzzySystem.addOutput` | Registers a new output `FuzzyVariable` |
| 12 | `FuzzySystem.input` / `FuzzySystem.output` | Looks up a registered input/output variable by name |
| 13 | `FuzzySystem.addRule` | Adds one rule, as a string or a plain object |
| 14 | `FuzzySystem.addRuleTable` | Fills a 2-input rule base in bulk from one or more label tables |
| 15 | `FuzzySystem.evaluate` | Runs inference for a given input and returns every output |
| 16 | `FuzzySystem.evaluateScalar` | Convenience: runs `evaluate` and returns the single output's number |
| 17 | `FuzzySystem.controlSurface` | Grid of one output over two inputs, for surface plots |
| 18 | `FuzzySystem.getParams` | Flat vector of every term's membership-function parameters |
| 19 | `FuzzySystem.paramLayout` | Description of each entry of `getParams()` (variable/term/type/index) |
| 20 | `FuzzySystem.setParams` | Sets every term's parameters from a flat vector |
| 21 | `FuzzySystem.toJSON` | Serializes the system's configuration to a plain object |
| 22 | `FuzzySystem.fromJSON` | Static — rebuilds a `FuzzySystem` from `toJSON()` output |
| 23 | `new FuzzyPID` | Fuzzy gain-scheduled PID controller (inputs e, de → outputs Kp, Ki, Kd) |
| 24 | `FuzzyPID.SCALING_KEYS` | Static getter — the five scaling-factor keys, in order |
| 25 | `FuzzyPID.tables` | Static getter — the built-in 7×7 Kp/Ki/Kd rule tables |
| 26 | `FuzzyPID.buildFIS` | Static — builds the underlying `FuzzySystem` used by `FuzzyPID` |
| 27 | `FuzzyPID.setScaling` | Sets the five input/output scaling factors |
| 28 | `FuzzyPID.getScaling` | Returns the five scaling factors as `[kpe, kde, Gp, Gi, Gd]` |
| 29 | `FuzzyPID.reset` | Clears the controller's integral/derivative state |
| 30 | `FuzzyPID.gains` | Scheduled Kp/Ki/Kd (and scaled Kp/Ki/Kd) for a given error/error-rate |
| 31 | `FuzzyPID.step` | One controller update; returns the saturated control signal |
| 32 | `parseRule` | Parses a rule string into the `{ ants, op, cons, weight }` structure `addRule` stores |
| 33 | `presets.IN_LABELS` / `presets.OUT_LABELS` / `presets.TABLE_KD` / `presets.TABLE_KP_KI` | The 7-label linguistic sets and rule tables used by `FuzzyPID.buildFIS` |

*(Internal-only helpers — `normalizeParams`, `FuzzySystem._compile`, `defuzzGrid` — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API.)*

---

## Detail Description

### Membership Functions

- **Function:** `MF.trimf`
  **Description:** Triangular membership function.
  **Syntax:** `mu = F.MF.trimf(x, [a, b, c]);`
  **Input Arguments:** `x`: number; `p = [a, b, c]`: left foot, peak, right foot (`a ≤ b ≤ c`)
  **Output Arguments:** `mu`: membership degree in `[0, 1]`

- **Function:** `MF.trapmf`
  **Description:** Trapezoidal membership function.
  **Syntax:** `mu = F.MF.trapmf(x, [a, b, c, d]);`
  **Input Arguments:** `x`: number; `p = [a, b, c, d]`: left foot, left shoulder, right shoulder, right foot
  **Output Arguments:** `mu`: membership degree in `[0, 1]`

- **Function:** `MF.gaussmf`
  **Description:** Gaussian membership function.
  **Syntax:** `mu = F.MF.gaussmf(x, [sigma, c]);`
  **Input Arguments:** `x`: number; `p = [sigma, c]`: standard deviation, center
  **Output Arguments:** `mu`: membership degree in `(0, 1]`
  **Formula:** `mu = exp(-0.5 · ((x − c) / sigma)²)`

- **Function:** `MF.gbellmf`
  **Description:** Generalized bell membership function.
  **Syntax:** `mu = F.MF.gbellmf(x, [a, b, c]);`
  **Input Arguments:** `x`: number; `p = [a, b, c]`: width, slope, center
  **Output Arguments:** `mu`: membership degree in `(0, 1]`
  **Formula:** `mu = 1 / (1 + |（x − c) / a|^(2b))`

- **Function:** `MF.sigmf`
  **Description:** Sigmoidal membership function.
  **Syntax:** `mu = F.MF.sigmf(x, [a, c]);`
  **Input Arguments:** `x`: number; `p = [a, c]`: slope, inflection point
  **Output Arguments:** `mu`: membership degree in `(0, 1)`
  **Formula:** `mu = 1 / (1 + exp(-a·(x − c)))`

- **Function:** `MF.singleton`
  **Description:** Crisp (singleton) membership function — `1` only at an exact value.
  **Syntax:** `mu = F.MF.singleton(x, [v]);`
  **Input Arguments:** `x`: number; `p = [v]`: the single crisp value
  **Output Arguments:** `mu`: `1` if `x === v`, else `0`

- **Function:** `evalMF`
  **Description:** Evaluates a membership function by its type name, dispatching to the matching `MF.*` entry.
  **Syntax:** `mu = F.evalMF(type, x, params);`
  **Input Arguments:** `type`: `'trimf'` | `'trapmf'` | `'gaussmf'` | `'gbellmf'` | `'sigmf'` | `'singleton'`; `x`: number; `params`: parameter array matching `type`
  **Output Arguments:** `mu`: membership degree
  **Errors:** `Unknown MF type "<type>"`

---

### FuzzyVariable

- **Function:** `new FuzzyVariable(name, range, kind, sys)`
  **Description:** Creates an input or output linguistic variable over a range, with an initially empty term list. Normally created indirectly via `FuzzySystem.addInput`/`addOutput`, which pass `sys` so the variable can invalidate the parent system's compiled cache when it changes.
  **Syntax:** *(internal — use `sys.addInput(name, range)` / `sys.addOutput(name, range)` instead)*
  **Input Arguments:** `name`: string; `range`: `[lo, hi]` with `hi > lo`; `kind`: `'input'` or `'output'`; `sys`: owning `FuzzySystem` (or `null`)
  **Output Arguments:** `v`: `FuzzyVariable` instance, with `v.name`, `v.range`, `v.kind`, `v.terms`
  **Errors:** `Variable "<name>": range must be [lo, hi] with hi > lo`

- **Function:** `addTerm`
  **Description:** Adds one named membership-function term to the variable. Parameters are normalized per type (`trimf`/`trapmf` sorted ascending; `gaussmf`/`gbellmf` widths forced positive).
  **Syntax:** `v.addTerm(label, type, params);` *(chainable)*
  **Input Arguments:** `label`: string, unique within the variable; `type`: `'trimf'` \| `'trapmf'` \| `'gaussmf'` \| `'gbellmf'` \| `'sigmf'` \| `'singleton'` (or `'constant'`/`'linear'` for a Sugeno output term); `params`: array matching the type's parameter count
  **Output Arguments:** `v`: the same `FuzzyVariable` (for chaining)
  **Errors:** `Unknown MF type "<type>"`; `<type> needs <n> params`; `Duplicate term "<label>" in <name>`

- **Function:** `addTerms`
  **Description:** Adds several evenly-spaced terms across the variable's range in one call — the pattern used for standard linguistic sets such as the paper's 7-label `NB..PB` / `VVS..VVB` sets. Neighbouring `gaussmf` terms are spaced so they cross at membership `0.5`.
  **Syntax:** `v.addTerms(labels, shape);` *(chainable)*
  **Input Arguments:** `labels`: array of ≥ 2 label strings, evenly spaced left-to-right across `v.range`; `shape`: `'trimf'` (default) \| `'gaussmf'` \| `'gbellmf'`
  **Output Arguments:** `v`: the same `FuzzyVariable` (for chaining)
  **Errors:** `addTerms needs at least 2 labels`; `addTerms: unsupported shape "<shape>"`

- **Function:** `termIndex`
  **Description:** Finds a term's position in `v.terms` by its label.
  **Syntax:** `i = v.termIndex(label);`
  **Input Arguments:** `label`: string
  **Output Arguments:** `i`: integer index, or `-1` if not found

- **Function:** `fuzzify`
  **Description:** Computes the degree of membership of a (clamped-to-range) value in every term of the variable.
  **Syntax:** `mus = v.fuzzify(x);`
  **Input Arguments:** `x`: number (clamped to `v.range` first)
  **Output Arguments:** `mus`: object `{ label: mu, ... }`, one entry per term

---

### FuzzySystem — Construction

- **Function:** `new FuzzySystem(options)`
  **Description:** Creates an inference engine. Mamdani options control the AND/OR/implication/aggregation/defuzzification methods used across the sampled output universe; Sugeno systems instead use a weighted-average (or weighted-sum) of each rule's (constant or linear) consequent.
  **Syntax:** `const sys = new F.FuzzySystem(options);`
  **Input Arguments:** `options.type`: `'mamdani'` (default) \| `'sugeno'`; `options.and`: `'min'` (default) \| `'prod'`; `options.or`: `'max'` (default) \| `'probsum'`; `options.implication`: `'min'` (default) \| `'prod'` (Mamdani only); `options.aggregation`: `'max'` (default) \| `'sum'` \| `'probsum'` (Mamdani only); `options.defuzz`: `'centroid'` (Mamdani default) \| `'bisector'` \| `'mom'` \| `'som'` \| `'lom'`, or `'wtaver'` (Sugeno default) \| `'wtsum'`; `options.resolution`: output-universe sample count for non-closed-form defuzzification (default `201`); `options.clampInputs`: clip inputs to each variable's range (default `true`); `options.defaultOutput`: value returned when no rule fires (default: midpoint of the output range)
  **Output Arguments:** `sys`: `FuzzySystem` instance

- **Function:** `invalidate`
  **Description:** Clears the system's compiled-evaluation cache, forcing a rebuild on the next `evaluate()`. Called automatically by every configuration-changing method (`addInput`, `addOutput`, `addRule`, `addTerm`, etc.); call it directly only after mutating a returned object in place.
  **Syntax:** `sys.invalidate();`

- **Function:** `addInput`
  **Description:** Registers a new input `FuzzyVariable` on the system.
  **Syntax:** `v = sys.addInput(name, range);`
  **Input Arguments:** `name`: string; `range`: `[lo, hi]`
  **Output Arguments:** `v`: `FuzzyVariable` instance (chain `.addTerm`/`.addTerms` onto it)

- **Function:** `addOutput`
  **Description:** Registers a new output `FuzzyVariable` on the system.
  **Syntax:** `v = sys.addOutput(name, range);`
  **Input Arguments:** `name`: string; `range`: `[lo, hi]`
  **Output Arguments:** `v`: `FuzzyVariable` instance (chain `.addTerm`/`.addTerms` onto it)

- **Function:** `input` / `output`
  **Description:** Looks up a previously registered input or output variable by name.
  **Syntax:** `v = sys.input(name);` / `v = sys.output(name);`
  **Input Arguments:** `name`: string
  **Output Arguments:** `v`: `FuzzyVariable` instance, or `undefined` if not found

- **Function:** `addRule`
  **Description:** Adds one rule to the system, as a human-readable string (`'IF a IS x AND b IS y THEN c IS z WEIGHT 0.5'`, `AND`/`OR` — not mixed within one rule; `THEN` may list several `var IS term` consequents separated by commas/`AND`) or as a plain object (`{ if: { a: 'x', b: '!y' }, then: { c: 'z' }, op: 'and', weight: 1 }`, where a leading `!` on a term negates it).
  **Syntax:** `sys.addRule(rule);` *(chainable)*
  **Input Arguments:** `rule`: rule string, or `{ if, then, op, weight }` object
  **Output Arguments:** `sys`: the same `FuzzySystem` (for chaining)
  **Errors:** *(string form)* `Rule needs exactly one THEN: <rule>`; `Mixed AND/OR in one rule is not supported; split it into rules: <rule>`; `Bad antecedent "<clause>" in rule: <rule>`; `Bad consequent "<clause>" in rule: <rule>`

- **Function:** `addRuleTable`
  **Description:** Fills a full 2-input rule base at once from one or more label tables, mirroring a paper's rule-table figure (rows = one input's terms, columns = the other's). One rule is added per `(rowLabel, colLabel)` cell, with one consequent per key of `tables`.
  **Syntax:** `sys.addRuleTable({ rows, cols, tables, rowLabels, colLabels, op, weight });` *(chainable)*
  **Input Arguments:** `rows`, `cols`: names of two registered input variables; `tables`: `{ outputName: rowLabels.length × colLabels.length array of term labels, ... }`; `rowLabels`/`colLabels`: optional overrides (default: the input variable's own term order); `op`: `'and'` (default) or `'or'`; `weight`: rule weight (default `1`)
  **Output Arguments:** `sys`: the same `FuzzySystem` (for chaining)
  **Errors:** `addRuleTable: unknown input variable`

---

### FuzzySystem — Evaluation

- **Function:** `evaluate`
  **Description:** Runs one full inference pass: fuzzifies every input, computes each rule's firing strength (AND/OR per `andMethod`/`orMethod`, optionally negated per-antecedent, weighted by the rule's `weight`), then — for Sugeno, a firing-strength-weighted average/sum of each rule's consequent value; for Mamdani, implication + aggregation over the sampled output universe (or the exact closed-form centroid fast path when `and:'prod'/implication:'prod'/aggregation:'sum'/defuzz:'centroid'`), followed by defuzzification per `defuzz`.
  **Syntax:** `out = sys.evaluate(input);`
  **Input Arguments:** `input`: `{ inputName: value, ... }` object, or a plain array/typed array in input-declaration order
  **Output Arguments:** `out`: `{ outputName: value, ... }`, one entry per registered output
  **Errors:** `FuzzySystem needs at least one input and one output`; `Expected <n> inputs` (array form, wrong length); `Missing/invalid input "<name>"` (object form, missing key or non-finite value)

- **Function:** `evaluateScalar`
  **Description:** Convenience wrapper for a single-output system — runs `evaluate` and returns that one output's number directly instead of a wrapper object.
  **Syntax:** `v = sys.evaluateScalar(input);`
  **Input Arguments:** `input`: as in `evaluate`
  **Output Arguments:** `v`: float value (the system's single output)

- **Function:** `controlSurface`
  **Description:** Evaluates one named output over an `n × n` grid of two named inputs, holding any remaining inputs fixed — useful for plotting a control surface.
  **Syntax:** `{ x, y, z } = sys.controlSurface(xName, yName, outName, n, others);`
  **Input Arguments:** `xName`, `yName`: names of two registered inputs; `outName`: name of a registered output; `n`: grid resolution per axis (default `21`); `others`: `{ inputName: value }` for any remaining inputs (default `{}`)
  **Output Arguments:** `{ x, y, z }` — `x`, `y`: length-`n` axis-value arrays; `z`: `n × n` array of the output value at each `(x[i], y[j])`

---

### FuzzySystem — Tuning Support

These let an external optimizer (e.g. a genetic algorithm) treat every membership-function parameter across the whole system as one flat vector.

- **Function:** `getParams`
  **Description:** Flattens every input's and output's every term's membership-function parameters into a single array, inputs first then outputs, in declaration order.
  **Syntax:** `p = sys.getParams();`
  **Output Arguments:** `p`: flat array of numbers

- **Function:** `paramLayout`
  **Description:** Describes what each entry of `getParams()` corresponds to — handy for building per-parameter optimizer bounds.
  **Syntax:** `layout = sys.paramLayout();`
  **Output Arguments:** `layout`: array of `{ variable, kind, term, type, index }`, aligned index-for-index with `getParams()`

- **Function:** `setParams`
  **Description:** Writes a flat parameter vector (as produced/described by `getParams`/`paramLayout`) back into every term, re-normalizing each term's parameters as `addTerm` would (e.g. re-sorting `trimf`/`trapmf` knots). Invalidates the compiled cache.
  **Syntax:** `sys.setParams(vec);` *(chainable)*
  **Input Arguments:** `vec`: flat array of numbers, same length and order as `getParams()`
  **Output Arguments:** `sys`: the same `FuzzySystem` (for chaining)
  **Errors:** `setParams: expected <n> values, got <m>`

---

### FuzzySystem — (De)serialisation

- **Function:** `toJSON`
  **Description:** Serializes the system's full configuration (type, AND/OR/implication/aggregation/defuzz settings, resolution, every input/output's range and terms, and every rule) to a plain JSON-safe object.
  **Syntax:** `obj = sys.toJSON();`
  **Output Arguments:** `obj`: plain object suitable for `JSON.stringify`

- **Function:** `FuzzySystem.fromJSON`
  **Description:** Static — rebuilds a fully configured `FuzzySystem` from a `toJSON()`-shaped object (or its JSON string form).
  **Syntax:** `sys = F.FuzzySystem.fromJSON(json);`
  **Input Arguments:** `json`: object from `toJSON()`, or the equivalent JSON string
  **Output Arguments:** `sys`: `FuzzySystem` instance

---

### FuzzyPID

A ready-made 2-input `(e, de)` → 3-output `(Kp, Ki, Kd)` gain-scheduling fuzzy PID, built on `FuzzySystem` — 7 triangular membership functions per input, 7 Gaussian per output, product AND / probabilistic-sum OR / product implication / sum aggregation / centroid defuzzification, after Madebo (IEEE Access 2025).

- **Function:** `new FuzzyPID(options)`
  **Description:** Builds the controller: its internal `FuzzySystem` (via `buildFIS`, or a caller-supplied `fis`), its five scaling factors, and its integral/derivative filter state.
  **Syntax:** `pid = new F.FuzzyPID(options);`
  **Input Arguments:** `options.eRange` (default `[-1, 1]`), `options.deRange` (default `[-10, 10]`): FIS input universes (after scaling); `options.kpRange` (default `[0.2, 0.7]`), `options.kiRange` (default `[0.001, 0.01]`), `options.kdRange` (default `[0.1, 0.15]`): FIS output universes; `options.scaling`: `{kpe, kde, Gp, Gi, Gd}` (each default `1`); `options.dt`: default sample time; `options.outLimits`: `[lo, hi]` output saturation (default `[-Infinity, Infinity]`), with conditional-integration anti-windup; `options.integralLimit`: `|∫e|` clamp (default `Infinity`); `options.derivativeTau`: first-order filter time constant on `de/dt` (default `0`, i.e. unfiltered); `options.fis`: a caller-supplied `FuzzySystem` (inputs `[e, de]`, outputs `kp, ki, kd`) instead of the paper's default
  **Output Arguments:** `pid`: `FuzzyPID` instance

- **Function:** `FuzzyPID.SCALING_KEYS`
  **Description:** Static getter — the five scaling-factor keys, in the order used by array-form `setScaling`/`getScaling`.
  **Syntax:** `keys = F.FuzzyPID.SCALING_KEYS;`
  **Output Arguments:** `keys`: `['kpe', 'kde', 'Gp', 'Gi', 'Gd']`

- **Function:** `FuzzyPID.tables`
  **Description:** Static getter — the built-in 7×7 rule tables (rows = `de`, cols = `e`) used for `kp`/`ki` (shared) and `kd`.
  **Syntax:** `tables = F.FuzzyPID.tables;`
  **Output Arguments:** `tables`: `{ kp, ki, kd }`, each a `7×7` array of term labels

- **Function:** `FuzzyPID.buildFIS`
  **Description:** Static — constructs the paper's default `FuzzySystem`: 7 triangular MFs on `e`/`de`, 7 Gaussian MFs on `kp`/`ki`/`kd`, filled via `addRuleTable` from `FuzzyPID.tables`.
  **Syntax:** `fis = F.FuzzyPID.buildFIS(options);`
  **Input Arguments:** `options.eRange`, `options.deRange`, `options.kpRange`, `options.kiRange`, `options.kdRange` — as in the constructor
  **Output Arguments:** `fis`: `FuzzySystem` instance

- **Function:** `setScaling`
  **Description:** Sets the five scaling factors, from either an object or a `[kpe, kde, Gp, Gi, Gd]` array (matching `SCALING_KEYS`).
  **Syntax:** `pid.setScaling(s);` *(chainable)*
  **Input Arguments:** `s`: `{kpe, kde, Gp, Gi, Gd}` object, or a length-5 array/typed array
  **Output Arguments:** `pid`: the same `FuzzyPID` (for chaining)

- **Function:** `getScaling`
  **Description:** Returns the current scaling factors as an ordered array.
  **Syntax:** `s = pid.getScaling();`
  **Output Arguments:** `s`: `[kpe, kde, Gp, Gi, Gd]`

- **Function:** `reset`
  **Description:** Clears the controller's integral accumulator, previous-error, derivative-filter state, and `.last` result.
  **Syntax:** `pid.reset();` *(chainable)*
  **Output Arguments:** `pid`: the same `FuzzyPID` (for chaining)

- **Function:** `gains`
  **Description:** Evaluates the scheduled gains for a given error/error-rate, without touching controller state.
  **Syntax:** `g = pid.gains(e, de);`
  **Input Arguments:** `e`: error; `de`: error rate
  **Output Arguments:** `g`: `{ kp, ki, kd, Kp, Ki, Kd }` — the raw FIS outputs, and the same values scaled by `Gp`/`Gi`/`Gd`

- **Function:** `step`
  **Description:** One controller update: computes the error-rate from the previous call (with optional first-order derivative filtering), schedules gains via `gains()`, integrates with conditional-integration anti-windup, and saturates the output to `outLimits`.
  **Syntax:** `u = pid.step(e, dt);`
  **Input Arguments:** `e`: error (`ref − measurement`); `dt`: sample time (falls back to `options.dt`)
  **Output Arguments:** `u`: the saturated control signal; also stored on `pid.last` as `{ u, e, de, integral, gains }`
  **Errors:** `FuzzyPID.step needs dt > 0 (pass it or set options.dt)`

---

### Rule Parsing

- **Function:** `parseRule`
  **Description:** Parses one rule string into the structured `{ ants, op, cons, weight }` form used internally by `addRule`. Strips a leading `IF`, an optional trailing `WEIGHT <n>`, splits on `THEN`, and parses the antecedent clause(s) (`AND`/`OR`, with `NOT` supported per-clause) and consequent clause(s) (`var IS term`, comma- or `AND`-separated).
  **Syntax:** `parsed = F.parseRule(str);`
  **Input Arguments:** `str`: rule string, e.g. `'IF e IS NB AND de IS PS THEN kp IS B, kd IS VB WEIGHT 0.5'`
  **Output Arguments:** `parsed`: `{ ants: [{v, t, not}, ...], op: 'and'|'or', cons: [{v, t}, ...], weight }`
  **Errors:** `Rule needs exactly one THEN: <str>`; `Mixed AND/OR in one rule is not supported; split it into rules: <str>`; `Bad antecedent "<clause>" in rule: <str>`; `Bad consequent "<clause>" in rule: <str>`

---

### Presets

- **Function:** `presets.IN_LABELS` / `presets.OUT_LABELS`
  **Description:** The standard 7-label linguistic sets used by `FuzzyPID` — `IN_LABELS = ['NB','NM','NS','Z','PS','PM','PB']` for the `e`/`de` inputs, `OUT_LABELS = ['VVS','VS','S','M','B','VB','VVB']` for the `kp`/`ki`/`kd` outputs.
  **Syntax:** `F.presets.IN_LABELS; F.presets.OUT_LABELS;`

- **Function:** `presets.TABLE_KD` / `presets.TABLE_KP_KI`
  **Description:** The two 7×7 rule tables (rows = `de`, cols = `e`) `FuzzyPID.buildFIS` fills via `addRuleTable` — `TABLE_KD` for the `kd` output, `TABLE_KP_KI` shared by `kp` and `ki`.
  **Syntax:** `F.presets.TABLE_KD; F.presets.TABLE_KP_KI;`

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library.

| Function | Description |
|---|---|
| `clamp(x, lo, hi)` | Simple numeric clamp, used throughout for input clipping and anti-windup |
| `normalizeParams(type, p)` | Normalizes a term's raw parameter array per MF type — sorts `trimf`/`trapmf` knots, forces `gaussmf`/`gbellmf` widths positive; used by `addTerm`/`setParams` |
| `FuzzySystem._compile()` | Lazily builds the flat, allocation-light internal representation (`c`) `evaluate()` runs against — typed-array membership/firing-strength/aggregation buffers, resolved rule antecedent/consequent index tuples, and (for Mamdani) precomputed per-term output-universe samples plus exact area/centroid (via 2000-point trapezoid integration) for the closed-form fast path |
| `defuzzGrid(kind, grid, y, mid)` | Defuzzifies a sampled output-universe curve — `centroid`, `bisector`, `som`/`lom`/`mom` (first/last/mean of the maximal-membership plateau); returns `mid` if the aggregated curve is (near-)zero everywhere; throws `Unknown defuzzification "<kind>"` otherwise |

---
