# CaroLab

**A JavaScript toolkit for robotics, control systems, and applied mathematics.**

CaroLab is a collection of single-file libraries that run unmodified in the browser (`<script>` tag) and under Node.js (CommonJS). No bundler. No build step. No npm install required for the core libraries. Every algorithm is readable in the source, and every public method has a worked example in the accompanying manuals.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen.svg)](https://nodejs.org/)
[![No dependencies](https://img.shields.io/badge/dependencies-none-success.svg)](#dependencies)

---

## Table of Contents

1. [What is CaroLab?](#what-is-carolab)
2. [Repository layout](#repository-layout)
3. [Library catalogue](#library-catalogue)
4. [Quick start](#quick-start)
5. [Documentation](#documentation)
6. [Who is this for?](#who-is-this-for)
7. [Design philosophy](#design-philosophy)
8. [Standalone applications](#standalone-applications)
9. [Installing Node.js and MySQL](#installing-nodejs-and-mysql)
10. [Running the examples](#running-the-examples)
11. [The CaroLab pattern](#the-carolab-pattern)
12. [Dependencies](#dependencies)
13. [Contributing](#contributing)
14. [Roadmap](#roadmap)
15. [License](#license)

---

## What is CaroLab?

CaroLab is a **teaching-and-prototyping toolkit**. It is designed for engineers, students, and researchers who want to:

- **Understand** a robotics or control algorithm end-to-end, from the equations to the code.
- **Prototype** a controller without installing a toolchain the size of MATLAB or ROS.
- **Extend** a library without fighting a framework.
- **Embed** a controller in a webpage or a Raspberry Pi without a native toolchain.

Every library in CaroLab follows the same rules:

- **One file, one class (or a small set of related functions).**
- **No external dependencies** for the core libraries.
- **Immutable by default** — methods return new objects, never modify their inputs.
- **Plain numeric data** — nested arrays, not typed objects. `[[1,2],[3,4]]` is a 2×2 matrix.
- **Readable source** — the algorithm is visible, not hidden behind a compiled kernel.

CaroLab is **not** a replacement for NumPy, SciPy, MATLAB, or OpenCV. It is a curated set of primitives that cover the *majority* of practical needs in control, robotics, signal processing, and applied mathematics — small enough to read in an afternoon, structured enough to trust, and adaptable enough to extend.

---

## Repository layout

```
CaroLab/
├── README.md
├── LICENSE                 (MIT)
├── package.json
│
├── linear/                 matrix, linear algebra, polynomials, fitting, PCA, Kalman
├── statistics/             descriptive statistics, time series, forecasting
├── dsp/                    1-D signal processing, filters, audio
├── dip/                    2-D image processing
│
├── control/                transfer functions, state space, PID, compensators, fuzzy PID
├── robotics/               manipulator kinematics, dynamics, force control, EnergyTank, FrictionRLS
│
├── optim/                  genetic algorithm, ANFIS, neuro-fuzzy PID
├── ml/                     clustering and machine-learning utilities
│
└── hmi/
    └── hmi1/               browser HMI with serial receiver and MySQL
```

Each folder holds single-file libraries (`caro.<name>-1.0.js`) that you can copy on their own.

---

## Library catalogue

### Mathematics and signal foundations

| Library | Purpose | Examples |
|---|---|---|
| **`caro.matrix-1.0.js`** | Matrices, inverses, determinants, rank, QR, SVD, eigenvalues, pseudoinverse, geometric transforms | 8 |
| **`caro.linear-1.0.js`** | Quadratic/cubic/polynomial solvers, Gauss–Jordan, polynomial fitting, linear regression, PCA, Kalman filter | 8 |
| **`caro.statistics-1.0.js`** | Descriptive statistics, moving averages, quantiles, z-scores, detrending, autocorrelation, cross-correlation, FFT, SES/Holt/AR forecasting | 12 |
| **`caro.dsp-1.0.js`** | Sine/zero signal generation, addition, moving average, peak detection, FFT, dominant frequency, Butterworth filters, RMS | 12 |
| **`caro.audio-1.0.js`** | Multichannel audio, biquads, Butterworth, parametric EQ, DC blocking, normalization, FFT, spectrum, stateful streaming | 14 |
| **`caro.dip-1.0.js`** | Point operations, geometric transforms, convolution, Sobel/Canny edges, morphology, HSV color, Hough lines/circles, contours | 13 |

### Control systems

| Library | Purpose | Examples |
|---|---|---|
| **`caro.compensator-1.0.js`** | Transfer functions, state space, stability (Routh), Bode/Nyquist/Nichols/root locus, PID tuning (ZN + loop shaping), lead/lag/lead-lag/parallel compensators | 8 |

### Robotics

| Library | Purpose | Examples |
|---|---|---|
| **`caro.manipulator-1.0.js`** | PUMA-style arm: DH, FK, IK (analytic + numerical), Jacobian, RNE, path tracking, time parameterization, velocity control, resolved-rate, impedance/admittance/hybrid/parallel/operational-space/assist-as-needed force control, momentum observer | 46 |

### Fuzzy and neuro-fuzzy

| Library | Purpose | Examples |
|---|---|---|
| **`caro.fuzzy-1.0.js`** | Mamdani/Sugeno fuzzy inference, six MF types, five defuzz methods, rule tables, `FuzzyPID` | — |
| **`caro.fuzzyPID-1.0.js`** | `SimplestFuzzyPID`, `AdaptiveFuzzyPID`, `SwitchedFuzzyPID` | 3 |
| **`caro.anfis-1.0.js`** | First-order Sugeno ANFIS with Jang hybrid learning | — |
| **`caro.neuroFuzzyPID-1.0.js`** | PID with ANFIS gain scheduler | 1 |

### Optimization and learning

| Library | Purpose | Examples |
|---|---|---|
| **`caro.ga-1.0.js`** | Real-coded genetic algorithm: selection, crossover, mutation, elitism, async runners | 1 |
| **`caro.ml-1.0.js`** | K-means, KNN smoother, spectral/SVM-like clustering, Random Forest proximity clustering | 1 |

### Companion utilities

| Library | Purpose |
|---|---|
| **`EnergyTank.js`** | Time-domain passivity energy tank + observer for safe force control |
| **`FrictionRLS.js`** | Recursive least-squares joint friction identification |
---

## Installation

[#installation](#installation)

CaroLab has no installer. Each library is a single file: copy it, load it, use it.

### Option 1: Copy the file (recommended)

1. Download the library you need from this repository, for example `caro.matrix-1.0.js`.
2. Put it next to your own script or HTML page.
3. Load it.

**Node.js**

```js
const Matrix = require('./caro.matrix-1.0.js');
```

**Browser**

```html
<script src="caro.matrix-1.0.js"></script>
```

Some libraries build on others (see the dependency graph under [Documentation](#documentation)). If a library needs another one, copy that file into the same folder as well.

### Option 2: Clone the whole repository

```
git clone https://github.com/nimazamiri/CaroLab.git
```

Then copy the files you need into your project, or point your `require` paths at the cloned folders.

### Option 3: npm (optional)

```
npm install @nimazamiri/carolab
```

```js
const Matrix = require('@nimazamiri/carolab/linear/caro.matrix-1.0.js');
```

npm is only a convenience. The libraries work the same either way.

### Requirements

- **Node.js 14 or newer**, or any modern browser.
- No other packages. Only the HMI application needs `serialport` and `mysql2`.

## Quick start

### Browser (no install)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <script src="./caro.compensator-1.0.js"></script>
  <script>
    const c = new Compensator();
	const G = c.tf([1], [1, 3, 2]);
	console.log(String(G));
	let st = c.step(G); ok('step final ~0.5', near(st.y[st.y.length - 1], 0.5, 1e-2), st.y[st.y.length-1]);
	let im = c.impulse(G); ok('impulse peak', near(Math.max(...im.y), 0.25, 1e-2), Math.max(...im.y));
  </script>
</body>
</html>
```

### Node.js

```javascript
const Manipulator = require('./caro.manipulator-1.0.js');
const arm = new Manipulator();

const q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
const { T } = arm.forwardKin(arm.DH_Lib.puma01, q);

console.log('Tool position:', [T[0][3], T[1][3], T[2][3]]);
```

Run it with:

```
node program.js
```

---

## Documentation

Every library has its own manual under `docs/`. Each manual follows the same structure: a short introduction, a worked example per public method, expected output, common pitfalls, an Extending section, and a Troubleshooting table.

| Manual | Library | Worked examples |
|---|---|---|
| `caro.manipulator-1.0_Dynamics.md` | Manipulator | 6 |
| `caro.manipulator-1.0_Kinematics.md` | Manipulator | 11 |
| `caro.manipulator-1.0_VelocityControl.md` | Manipulator | 4 |
| `caro.manipulator-1.0_ForceControl.md` | Manipulator | 12 |
| `caro.manipulator-1.0_PathTracking.md` | Manipulator | 4 |
| `caro.compensator-1.0_examples.md` | Compensator | 8 |
| `caro.statistics-1.0_examples.md` | Statistics | 12 |
| `caro.dsp-1.0_examples.md` | DSP | 12 |
| `caro.audio-1.0_examples.md` | Audio | 14 |
| `caro.dip-1.0_examples.md` | DIP | 13 |
| `caro.fuzzy-1.0_examples.md` | Fuzzy | 3 |
| `caro.ml-1.0_examples.md` | ML | 1 |
| `caro.optim-1.0_gafuzzyPID_example.md` | GA | 1 |
| `caro.optim-1.0_neuroFuzzyPID_example.md` | ANFIS + NeuroFuzzyPID | 1 |

Each manual is self-contained. You can read them in any order, but the natural sequence follows the dependency graph:

```
matrix → linear → statistics → dsp → audio → dip
                                  ↓
manipulator ← compensator → fuzzy → fuzzyPID → anfis → neuroFuzzyPID
                                                ↓
                                              ga → ml
```

---

## Who is this for?

**Students.** Read the source alongside the manual. Every algorithm is visible. No magic.

**Engineers.** Prototype a controller on a laptop, then deploy to a Raspberry Pi or a microcontroller-adjacent board without a native toolchain.

**Researchers.** Extend any library by adding one method. No build step, no plugin system.

**Hobbyists.** Build a dial-gauge HMI, plot a sensor stream, filter an audio file — in a webpage or a Node script, with no dependencies.

CaroLab is **not** for:

- Production-grade numerical work at scale (use NumPy/SciPy/C++).
- Real-time control at kHz rates with hard deadlines (use C/C++ or a real-time OS).
- Deep learning (use PyTorch/TensorFlow).
- Image processing of gigapixel datasets (use OpenCV).

For the middle ground — a few hundred points, a few thousand samples, one controller, one webpage — CaroLab is enough.

---

## Design philosophy

### 1. One file, one class

Each library is a single `.js` file. It exports one class (or a small set of related functions). To use a library, load the file. To extend it, add a method. No module graph, no tree-shaking.

### 2. Immutability by default

Every method returns a **new** object. The input is never modified. This makes chainable pipelines safe:

```javascript
const cleaned = audio
  .removeDCOffset()
  .dcBlocker(5)
  .butterworth({ type: 'highpass', cutoff: 20, order: 4 })
  .parametricEQ([{ frequency: 250, gainDb: -1.5, Q: 0.8 }])
  .normalizePeak(-1);
```

The original `audio` is unchanged at every step.

### 3. Plain numeric data

Matrices are nested arrays. Signals are flat arrays. Images are RGBA byte arrays. There are no opaque wrapper types. This makes integration with the rest of JavaScript trivial — you can always drop down to the raw array.

### 4. No external dependencies

The core libraries require nothing — no npm install, no build step, no native modules. They run in any modern browser and any Node ≥ 14.

### 5. Honest documentation

Every manual lists the **pitfalls** of each method, the **assumptions** it makes, and what it **does not** do. Where a method name borrows from a well-known algorithm (e.g. `caro.ml`'s `svm`), the manual says exactly which parts are implemented and which are not.

### 6. Verifiable examples

Every example has a documented expected output. When the implementation is correct, the tests pass. When the implementation has a bug, the test fails with a specific message pointing at the responsible method.

That rhythm is what keeps a library trustworthy over time.

---

## Standalone applications

CaroLab also includes a small set of **complete, runnable applications** that combine several libraries with external services (MySQL, serial ports, browsers).

### HMI + Serial Receiver (`apps/hmi/`)

A complete process-monitoring system:

- **`caro_hmi1.html`** — a browser page with SVG dial gauges, polling a JSON endpoint once per second.
- **`getPV.php`** — a PHP endpoint that returns the latest value per tag from MySQL.
- **`insertPV.js`** — a Node.js helper that inserts process values into MySQL.
- **`rx.js`** — a Node.js serial-port reader that parses packets and calls `insertPV`.

Together they form a small SCADA-like system: a field device sends comma-separated values over a serial port; the Node receiver writes them to MySQL; the browser polls a PHP endpoint and updates the dials.

See `docs/caro_hmi1.md` for the full user manual — parameter tables, packet format, database schema, and troubleshooting.

### Adding your own application

Any application that combines two or more CaroLab libraries belongs in `apps/`. Each application folder should contain:

- A short `README.md` explaining what it does.
- The runnable files (HTML, JS, PHP, SQL).
- A pointer to the relevant library manuals.

---

## Installing Node.js and MySQL

CaroLab's core libraries need **only Node.js** to run. The HMI application additionally needs **MySQL** and **PHP**. Here is the minimal install for each platform.

### Node.js

Download the LTS version from [nodejs.org](https://nodejs.org/). Install it. Verify:

```
node --version
npm --version
```

You should see something like `v20.11.0` and `10.2.4`. CaroLab requires Node ≥ 14 (because of the `??` operator and ES2019 features).

### MySQL / MariaDB

**Windows.** Download MySQL Installer from [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer/). Choose "Server only" or "Developer Default". During setup, set a root password and remember it. Verify:

```
mysql --version
```

**Linux (Debian/Ubuntu).**

```
sudo apt update
sudo apt install mysql-server php php-mysqli
sudo mysql_secure_installation
```

**macOS.** Using Homebrew:

```
brew install mysql php
brew services start mysql
```

### PHP (only for the HMI application)

The HMI's `getPV.php` needs PHP with the `mysqli` extension.

**Windows.** Install XAMPP from [apachefriends.org](https://www.apachefriends.org/). It bundles Apache, PHP, MySQL, and phpMyAdmin in one package — the simplest path for a Windows user.

**Linux.** `sudo apt install php php-mysqli` (already installed above).

**macOS.** `brew install php` (already installed above).

### npm packages for the HMI application only

Inside `apps/hmi/`, run:

```
npm install serialport mysql2
```

The rest of CaroLab needs no npm packages.

---

## Running the examples

The examples are organised by library under `examples/`. Each example is a self-contained Node script that prints its output to the console.

### Run a single example

```
cd examples/kinematics
node ForwardKin1.js
```

### Run a whole set

```
cd examples/dynamics
node Jacobian.js
node JointVelocities.js
node NumericJacobian.js
node Tau.js
node TauStatic.js
node TauZero.js
```

### Run the examples from the project root

```
node examples/kinematics/ForwardKin1.js
```

### What to expect

Every example prints a short block of text — vectors, matrices, or a small table. The manual for each library documents the exact expected output for every example, so you can compare.

If an example throws `Cannot find module '../caro.xxx-1.0.js'`, it means the library is not where the example expects it. Either move the library into the parent folder of `examples/`, or adjust the `require` path in the example's first line.

---

## The CaroLab pattern

Every CaroLab library, every manual, and every application follows the same rhythm. It is what ties the toolkit together.

### For a library

1. **One file.** A single `.js` file that exports one class.
2. **Plain data.** Nested arrays for matrices, flat arrays for signals, byte arrays for images.
3. **Immutability.** Methods return new objects; inputs are never modified.
4. **Guards.** Every method throws a readable error on invalid input (`"Sample is empty"`, `"FFT length must be a power of two"`).
5. **No dependencies** for the core libraries.

### For a manual

1. **A single page of prose** describing the library's scope.
2. **One worked example per public class or feature.**
3. **Expected output documented alongside the code**, so a reader knows what to look for.
4. **Common pitfalls** listed honestly, including conventions, limitations, and simplifications.
5. **An Extending section** showing how to go beyond the example.
6. **A Troubleshooting table** covering the most common runtime errors.

### For an application

1. **A folder under `apps/`** with its own `README.md`.
2. **Runnable files** — HTML, JS, PHP, SQL — no build step.
3. **A pointer to the relevant library manuals** so a reader can understand the components.
4. **A short "how to run"** section: install, configure, launch.

That discipline is what turns a pile of JavaScript files into something a stranger can pick up, run, and trust.

---

## Dependencies

| Library | Node | Browser | npm |
|---|---|---|---|
| `caro.matrix-1.0.js` | ✅ | ✅ | none |
| `caro.linear-1.0.js` | ✅ | ✅ | none |
| `caro.statistics-1.0.js` | ✅ | ✅ | none |
| `caro.dsp-1.0.js` | ✅ | ✅ | none |
| `caro.audio-1.0.js` | ✅ | ✅ | none |
| `caro.dip-1.0.js` | ✅ | ✅ (canvas) | none |
| `caro.compensator-1.0.js` | ✅ | ✅ | none |
| `caro.manipulator-1.0.js` | ✅ | ✅ | none |
| `caro.fuzzy-1.0.js` | ✅ | ✅ | none |
| `caro.fuzzyPID-1.0.js` | ✅ | ✅ | none |
| `caro.anfis-1.0.js` | ✅ | ✅ | none |
| `caro.neuroFuzzyPID-1.0.js` | ✅ | ✅ | none |
| `caro.ga-1.0.js` | ✅ | ✅ | none |
| `caro.ml-1.0.js` | ✅ | ✅ | none |
| `apps/hmi/rx.js` | ✅ | — | `serialport` |
| `apps/hmi/insertPV.js` | ✅ | — | `mysql2` |
| `apps/hmi/getPV.php` | — | — | PHP + `mysqli` |

The **core libraries have zero dependencies**. The HMI application is the only component that requires npm packages, and only because it talks to a real serial port and a real MySQL server.

---

## Contributing

CaroLab is a small, self-contained toolkit. Contributions are welcome if they follow the pattern.

### Adding a new library

1. **One file** named `caro.<name>-1.0.js` in the root.
2. **One class** (or a small set of related functions) exported via `module.exports` and attached to `window` in the browser.
3. **A manual** under `docs/` following the same structure as the existing manuals.
4. **Examples** under `examples/<name>/`, one file per public feature, each with a documented expected output.
5. **No dependencies** unless the library fundamentally cannot work without one (e.g. a real serial port).

### Adding a new example to an existing library

1. Place the example under the library's `examples/` folder.
2. Follow the naming convention (`ForwardKin1.js`, `ForwardKin2.js`, ...).
3. Add a section to the corresponding manual — Purpose, Source, Expected output, Common pitfalls.

### Adding a new application

1. Create a folder under `apps/`.
2. Add a `README.md` that explains what it does, how to install, and how to run.
3. Keep the runnable files small and self-documented.

### Style

- **ES2019+ JavaScript.** No TypeScript, no transpilation.
- **Plain data.** Nested arrays for matrices, flat arrays for signals.
- **Readable over clever.** If a reader can't follow the algorithm in 30 seconds, rewrite it.
- **Honest comments.** If something is a simplification, say so. If a paper's table was garbled, say so. If a formula is approximate, say so.

---

## Roadmap

CaroLab is a work in progress. The following extensions are natural next steps.

### Mathematics

- **`caro.matrix`** — LU decomposition, Cholesky, banded solver, sparse kernels.
- **`caro.linear`** — nonlinear least squares, Gauss–Newton, Levenberg–Marquardt.
- **`caro.statistics`** — PACF, ARIMA, hypothesis tests, histograms, weighted statistics.

### Signals and images

- **`caro.dsp`** — FIR design, spectrogram, Hilbert transform, resampling.
- **`caro.audio`** — shelf filters, STFT, Wiener filtering, LMS/NLMS, WAV/AIFF/FLAC file I/O, resampling, multi-track mixer.
- **`caro.dip`** — median filter, distance transform, connected-component labeling, Douglas–Peucker contour simplification, template matching, HOG, SIFT/ORB, alpha compositing, LAB/YCbCr color spaces.

### Robotics and control

- **`caro.manipulator`** — discrete-time conversion, LQR/H∞ design, Nyquist encirclement check, ZPK representation, root-locus JSON export.
- **`caro.compensator`** — c2d/d2c, discrete PID, state-space LQR, Kalman filter as a class.
- **`caro.legged`** — a new library for legged robots: floating-base RNE, centroidal momentum, ZMP, capture point, whole-body control, gait generation. This is the most substantial extension and is the subject of ongoing work.

### Learning

- **`caro.ml`** — supervised methods (KNN classifier, decision tree, random forest, SVM classifier), dimensionality reduction (PCA, t-SNE), model selection (silhouette, elbow, gap).
- **`caro.ga`** — multi-objective GA (NSGA-II), constraint handling, surrogate models.

### Infrastructure

- **Consolidated cover page.** A single document that ties the fourteen manuals into one indexed volume.
- **CDN distribution.** A single `<script>` tag that loads the whole toolkit.
- **Test suite.** A small Node-based test runner that executes every example and diffs the output against the documented expected output.

If you want to contribute to any of these, open an issue first so we can agree on the interface.

---

## License

MIT. See `LICENSE` for the full text.

You are free to use CaroLab in commercial and non-commercial projects, to modify it, and to redistribute it. Attribution is appreciated but not required.

---

## Acknowledgements

CaroLab draws on decades of published work in control, robotics, signal processing, and machine learning. Where a library implements a specific paper, the paper is cited in the library's header comment and in the corresponding manual. Where a library uses a literature-standard default (e.g. the Zhao/Tomizuka/Isaka fuzzy-PID rule tables), the manual says so explicitly. Where an OCR'd table was too garbled to transcribe, the manual says that too.

Honesty about what is verified and what is estimated is more valuable than the appearance of completeness.

---

*End of document.*

