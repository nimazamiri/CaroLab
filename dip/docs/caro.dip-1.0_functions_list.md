# CaroLab Digital Image Processing Library

- **Name:** caro.dip-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Digital Image Processing](#a-primary-library-for-digital-image-processing)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
   - [Debugging Programs](#debugging-programs)
3. [CaroLab DIP Library — Functions List](#carolab-dip-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction & Factories](#construction--factories)
   - [Core / Conversion](#core--conversion)
   - [Point Operations](#point-operations)
   - [Geometric Operations](#geometric-operations)
   - [Filtering & Convolution](#filtering--convolution)
   - [Grayscale Morphology](#grayscale-morphology)
   - [Two-Image Arithmetic](#two-image-arithmetic)
   - [Color Space & Color Operations](#color-space--color-operations)
   - [Binary Mask Morphology](#binary-mask-morphology)
   - [BW Plane Helper](#bw-plane-helper)
   - [Hough Line Transform](#hough-line-transform)
   - [Hough Circle Transform](#hough-circle-transform)
   - [Contours](#contours)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Digital Image Processing

`caro.dip-1.0.js` is a single-class JavaScript library built around the **`Image`** object — a wrapper around a flat RGBA pixel buffer (`Uint8ClampedArray`) plus `width`/`height` bookkeeping. It is structured the same way as `caro.matrix-1.0.js`'s `Matrix` class:

- The constructor normalizes/validates the input source and stores plain fields (`data`, `width`, `height`).
- Most algorithms live as **instance methods** and return a **new `Image`** — originals are never mutated — mirroring `Matrix`'s `add`/`subtract`/`scale`/... pattern.
- Algorithms that don't map onto a single pixel buffer (two-image operations, dimension-based constructors, accumulator-based detectors such as Hough transforms) are exposed as **static** `Image.*` methods, mirroring `Matrix.rotate` / `Matrix.translate` / `Matrix.concat` / `Matrix.eigenvalues`.
- A couple of convenience patterns mirror `Matrix` further: most point/geometric/filter methods take an optional `target` argument (default `this`), so both `img.invert()` and `img.invert(otherImg)` work.

The library covers the following broad areas:

| Area | Examples |
|---|---|
| Construction & conversion | `constructor`, `Image.fromCanvas`, `Image.fromURL`, `clone`, `toImageData`, `toCanvas` |
| Point operations | `rgb2gray`, `invert`, `brightness`, `histEqualization`, `adjustContrast` |
| Geometric operations | `rotate`, `flipH`, `flipV`, `resize`, `crop`, `pyramidDown`, `pyramidUp` |
| Filtering & edges | `convolve`, `edgeSobel`, `edgeCanny` |
| Morphology | `dilate`, `erode`, `close`, `open`, `erodeMask`, `dilateMask`, `morphOpen`, `morphClose` |
| Color | `rgb2hsv`, `colorReduction`, `colorSegmentation`, `colorFilter`, `colorFilterRange` |
| Shape detection | `houghLines`, `houghCircles`, `findContours` |

**Important — browser dependency:** unlike `caro.statistics-1.0.js` and `caro.matrix-1.0.js`, this library is **not** environment-agnostic. Several methods depend on browser-only globals — `HTMLCanvasElement`, `HTMLImageElement`, `ImageData`, and `document.createElement('canvas'/'img')` — specifically the constructor's canvas/image-element branches, `toImageData`, `draw`, `toCanvas`, `Image.fromURL`, and the canvas-native `pyramidDown`/`pyramidUp`. Everything else (pixel-buffer point/geometric/filter/morphology/color/Hough/contour operations, once you already have a `{data, width, height}` source) works on a plain `Uint8ClampedArray` and has no DOM dependency, so it can run under Node.js with a canvas-polyfill package (e.g. `node-canvas`) providing `ImageData`/`HTMLCanvasElement`-like globals, or by feeding `Image._resolve`-compatible `{data, width, height}` objects directly.

**Note on the class name:** the class is called `Image`, so once this file's `class Image { ... }` has been declared in a scope, `new Image()` refers to *this* class, not the browser's built-in `<img>`-backed constructor. Internally, this file always uses `document.createElement('img')` instead of `new Image()` to build actual `<img>` elements, to avoid colliding with itself.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.dip-1.0.js"></script>
<script>
  const canvas = document.getElementById('myCanvas');
  const img = Image.fromCanvas(canvas);
  const gray = img.rgb2gray();
  gray.draw(canvas);
</script>
```

Loading from a URL (asynchronous):

```html
<script>
  Image.fromURL('photo.png').then(img => {
    const edges = img.rgb2gray().edgeSobel();
    document.body.appendChild(edges.toCanvas());
  });
</script>
```

### Node.js

`caro.dip-1.0.js` is written against browser globals (`document`, `HTMLCanvasElement`, `HTMLImageElement`, `ImageData`), so plain Node.js requires a DOM/canvas polyfill (e.g. `node-canvas`) registered as `document`/`ImageData`/etc. before the library is loaded, or a bundler/JSDOM environment. Once such globals exist:

```javascript
const Image = require('./caro.dip-1.0.js');

// Assuming `data`, `width`, `height` came from a decoded image buffer:
const img = new Image({ data, width, height });
const bw = img.rgb2gray().rgb2bw(undefined, 128);

console.log(bw.toString()); // Image(WxH)
```

> **Note on usage:** like `Matrix`, data is supplied once — to the constructor, or picked up implicitly via `this` — and most methods then take **no separate data argument**. Where an algorithm needs a second image (`add`, `subtract`, `multiply`) or an explicit target different from `this` (the optional `target` parameter on point/geometric/filter/morphology/color methods), that is passed as an argument, following the same convention as `Matrix.add(other)`.

### Debugging Programs

- The constructor throws `Unsupported Image source` if given anything other than `null`/`undefined`, an `HTMLCanvasElement`, an `HTMLImageElement`, or a plain `ImageData`-shaped object (`{data, width, height}`).
- `Image._resolve(target)` — used internally by nearly every instance method to accept an `Image`, `ImageData`, or plain `{data, width, height}` and return a **fresh, mutable copy** — throws `Expected an Image, ImageData, or {data,width,height} object` for anything else.
- Square/shape-specific methods requiring a particular structure fail via `console.warn` rather than throwing in some cases (e.g. `colorFilter` with an unknown color key logs `Unknown color: ...` and returns a blank image) — check return values when input is not guaranteed valid.
- `Image.fromURL` returns a `Promise` that rejects with the underlying `<img>` `onerror` event if the URL fails to load.
- Most transforms return a **new `Image`**; use `.toString()` (`Image(WxH)`) for a quick shape check, or `.toImageData()` / `.draw(canvas)` to inspect visually. `.data` is directly available as a plain `Uint8ClampedArray` (RGBA, length `width*height*4`).
- Hough and contour algorithms operate on a flat **single-channel** 0/255 plane, not RGBA — build one from a black & white `Image` via `toBWPlane()` before calling the static `Image.houghTransform`/`Image.findContours` forms directly; the instance convenience methods (`houghLines`, `houghCircles`, `findContours`) do this conversion for you.

---

## CaroLab DIP Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new Image` | Builds an `Image` from a canvas, image element, `ImageData`, plain `{data,width,height}`, or nothing |
| 2 | `Image.fromImageData` | Static factory from an `ImageData` object |
| 3 | `Image.fromCanvas` | Static factory from an `HTMLCanvasElement` |
| 4 | `Image.fromImageElement` | Static factory from an `HTMLImageElement` |
| 5 | `Image.fromURL` | Async static factory — loads an image URL and resolves to an `Image` |
| 6 | `Image.zeros` | Blank (all-zero) `Image` of a given size |
| 7 | `clone` | Independent copy of the image |
| 8 | `toImageData` | Converts to a browser `ImageData` object |
| 9 | `draw` | Draws the image onto a `<canvas>`, resizing it to fit |
| 10 | `toCanvas` | Returns an offscreen `<canvas>` backed by this image's pixels |
| 11 | `toString` | Formats as `Image(WxH)` |
| 12 | `rgb2gray` | Converts to grayscale (luminosity method) |
| 13 | `gray2bw` | Thresholds an already-grayscale image to black & white |
| 14 | `rgb2bw` | Converts RGB directly to black & white via a luminosity threshold |
| 15 | `invert` | Inverts RGB channels |
| 16 | `brightness` | Adds a constant offset to each RGB channel |
| 17 | `histEqualization` | Histogram equalization (grayscale) |
| 18 | `adjustIntensity` | Clamped additive brightness adjustment |
| 19 | `adjustContrast` | Linear contrast adjustment around a midpoint |
| 20 | `rotate` | Rotates the image by a multiple of 90° |
| 21 | `flipH` | Horizontal flip (mirror) |
| 22 | `flipV` | Vertical flip |
| 23 | `resize` | Nearest-neighbor resize to arbitrary dimensions |
| 24 | `crop` | Extracts a rectangular sub-region |
| 25 | `pyramidDown` | Canvas-native half-size Gaussian pyramid step (downsample) |
| 26 | `pyramidUp` | Canvas-native double-size Gaussian pyramid step (upsample) |
| 27 | `convolve` | Generic square-kernel 2D convolution |
| 28 | `edgeSobel` | Sobel gradient-magnitude edge detector |
| 29 | `edgeCanny` | Canny edge detector (blur → gradient → non-max suppression → double threshold) |
| 30 | `dilate` | Grayscale morphological dilation (fixed 3×3, max filter) |
| 31 | `erode` | Grayscale morphological erosion (fixed 3×3, min filter) |
| 32 | `close` | Morphological closing (`erode(dilate(x))`), fixed 3×3 |
| 33 | `open` | Morphological opening (`dilate(erode(x))`), fixed 3×3 |
| 34 | `add` | Two-image saturating RGB addition |
| 35 | `subtract` | Two-image clamped RGB subtraction |
| 36 | `multiply` | Two-image RGB multiplication (normalized by 255) |
| 37 | `rgb2hsv` | Converts RGB to HSV, packed into RGBA channels (`H,S,V` on a 0–255 scale) |
| 38 | `Image.HSV_COLORS` | Static getter — table of common hue ranges on the 0–255 `rgb2hsv` scale |
| 39 | `colorReduction` | K-means color quantization to `n` colors |
| 40 | `colorSegmentation` | Binary mask from multiple HSV ranges (OR'd together) |
| 41 | `colorFilter` | Binary mask from a named color in an `HSV_COLORS`-shaped table |
| 42 | `colorFilterRange` | Binary mask from a single explicit HSV range |
| 43 | `erodeMask` | Binary-mask erosion with an arbitrary odd kernel size |
| 44 | `dilateMask` | Binary-mask dilation with an arbitrary odd kernel size |
| 45 | `morphOpen` | Binary-mask opening (`dilateMask(erodeMask(x))`), arbitrary kernel size |
| 46 | `morphClose` | Binary-mask closing (`erodeMask(dilateMask(x))`), arbitrary kernel size |
| 47 | `toBWPlane` | Extracts a flat single-channel 0/255 plane from a black & white image |
| 48 | `Image.houghTransform` | Static — builds the Hough accumulator for line detection |
| 49 | `Image.houghPeaks` | Static — extracts local-maxima peaks from a line Hough accumulator |
| 50 | `Image.houghLinesFromPeaks` | Static — converts line-Hough peaks to endpoint line segments |
| 51 | `houghLines` | Convenience — full BW-image → line-segments pipeline |
| 52 | `Image.houghCircles` | Static — builds the 3D Hough accumulator for circle detection |
| 53 | `Image.houghCirclePeaks` | Static — extracts local-maxima peaks from a circle Hough accumulator |
| 54 | `Image.houghCirclesFromPeaks` | Static — converts circle-Hough peaks to `{x,y,r}` circles |
| 55 | `houghCircles` | Convenience — full BW-image → circles pipeline |
| 56 | `Image.isOn` | Static — bounds-checked pixel test against a BW plane |
| 57 | `Image.traceContour` | Static — boundary-following trace of a single connected contour |
| 58 | `Image.findContours` | Static — finds all contours in a BW plane |
| 59 | `findContours` | Convenience — runs `Image.findContours` against `this`/a target image |

*(Internal-only helpers — `_wrap`, `_resolve`, `_convolve` — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API.)*

---

## Detail Description

### Construction & Factories

- **Function:** `constructor` / `new Image(source)`
  **Description:** Creates a new `Image`. Accepts no argument (empty 0×0 image), an `HTMLCanvasElement` (pixels read via `getContext('2d').getImageData`), an `HTMLImageElement` (drawn to an offscreen canvas first), or a plain `ImageData`/`{data,width,height}`-shaped object (copied in).
  **Syntax:** `const img = new Image(source);`
  **Input Arguments:** `source`: `undefined`/`null`, `HTMLCanvasElement`, `HTMLImageElement`, or `{data, width, height}`
  **Output Arguments:** `img`: `Image` instance, with `img.data` (`Uint8ClampedArray`, RGBA), `img.width`, `img.height`
  **Errors:** `Unsupported Image source`

- **Function:** `Image.fromImageData`
  **Description:** Static factory — equivalent to `new Image(imageData)`.
  **Syntax:** `img = Image.fromImageData(imageData);`
  **Input Arguments:** `imageData`: browser `ImageData` object
  **Output Arguments:** `img`: `Image` instance

- **Function:** `Image.fromCanvas`
  **Description:** Static factory — equivalent to `new Image(canvas)`; reads the canvas's current pixels.
  **Syntax:** `img = Image.fromCanvas(canvas);`
  **Input Arguments:** `canvas`: `HTMLCanvasElement`
  **Output Arguments:** `img`: `Image` instance

- **Function:** `Image.fromImageElement`
  **Description:** Static factory — equivalent to `new Image(imgEl)`; draws the `<img>` to an offscreen canvas first to read its pixels.
  **Syntax:** `img = Image.fromImageElement(imgEl);`
  **Input Arguments:** `imgEl`: `HTMLImageElement`
  **Output Arguments:** `img`: `Image` instance

- **Function:** `Image.fromURL`
  **Description:** Asynchronously loads an image from a URL (using a `crossOrigin="anonymous"` `<img>` element) and resolves to an `Image` once loaded.
  **Syntax:** `Image.fromURL(url).then(img => { ... });`
  **Input Arguments:** `url`: string
  **Output Arguments:** `Promise<img>`: resolves to an `Image` instance; rejects with the load error event on failure

- **Function:** `Image.zeros`
  **Description:** Static constructor for a blank (all-zero, i.e. fully transparent black) `width×height` image — useful as an accumulator/output target.
  **Syntax:** `img = Image.zeros(width, height);`
  **Input Arguments:** `width`, `height`: integers
  **Output Arguments:** `img`: `Image` instance

---

### Core / Conversion

- **Function:** `clone`
  **Description:** Returns an independent copy of the image (deep-copies the pixel buffer).
  **Syntax:** `copy = img.clone();`
  **Output Arguments:** `copy`: `Image` instance

- **Function:** `toImageData`
  **Description:** Converts the image's pixel buffer to a browser `ImageData` object.
  **Syntax:** `id = img.toImageData();`
  **Output Arguments:** `id`: `ImageData`

- **Function:** `draw`
  **Description:** Draws this image onto a `<canvas>` element, resizing the canvas to the image's dimensions first.
  **Syntax:** `img.draw(canvas);`
  **Input Arguments:** `canvas`: `HTMLCanvasElement`
  **Output Arguments:** returns `img` itself (for chaining)

- **Function:** `toCanvas`
  **Description:** Returns a new offscreen `<canvas>` backed by this image's pixels. Used internally by canvas-native operations (`pyramidDown`, `pyramidUp`) that rely on the browser's own resampling/blur.
  **Syntax:** `canvas = img.toCanvas();`
  **Output Arguments:** `canvas`: `HTMLCanvasElement`

- **Function:** `toString`
  **Description:** Formats the image as `Image(WxH)`.
  **Syntax:** `str = img.toString();`
  **Output Arguments:** `str`: string

---

### Point Operations

Each point operation takes an optional `target` image-like argument (default `this`), so both `img.invert()` and `img.invert(otherImg)` work; all return a **new `Image`**.

- **Function:** `rgb2gray`
  **Description:** Converts to grayscale using the standard luminosity weights, writing the result into all three RGB channels.
  **Syntax:** `gray = img.rgb2gray(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `gray`: `Image` instance
  **Formula:** `gray = 0.299R + 0.587G + 0.114B`

- **Function:** `gray2bw`
  **Description:** Thresholds an already-grayscale image to pure black & white.
  **Syntax:** `bw = img.gray2bw(target, threshold);`
  **Input Arguments:** `target`: image-like (default `this`); `threshold`: 0–255 (default `128`)
  **Output Arguments:** `bw`: `Image` instance (0 or 255 in every channel)

- **Function:** `rgb2bw`
  **Description:** Converts RGB directly to black & white in one step (grayscale luminosity, then threshold), without requiring a separate `rgb2gray` call.
  **Syntax:** `bw = img.rgb2bw(target, threshold);`
  **Input Arguments:** `target`: image-like (default `this`); `threshold`: 0–255 (default `128`)
  **Output Arguments:** `bw`: `Image` instance

- **Function:** `invert`
  **Description:** Inverts the R, G, B channels (`255 - v`); alpha is left unchanged.
  **Syntax:** `inv = img.invert(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `inv`: `Image` instance

- **Function:** `brightness`
  **Description:** Adds a constant offset to each RGB channel (values are clamped automatically by `Uint8ClampedArray` semantics).
  **Syntax:** `out = img.brightness(target, value);`
  **Input Arguments:** `target`: image-like (default `this`); `value`: number to add (default `0`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `histEqualization`
  **Description:** Histogram equalization on a grayscale image: builds the intensity histogram, its CDF, and remaps each pixel through the normalized CDF to spread out the intensity distribution.
  **Syntax:** `eq = img.histEqualization(target);`
  **Input Arguments:** `target`: image-like (default `this`); assumes the image is already grayscale (reads only the R channel)
  **Output Arguments:** `eq`: `Image` instance
  **Formula:** `map[i] = round((cdf[i] − cdf_min) / (total − cdf_min) × 255)`

- **Function:** `adjustIntensity`
  **Description:** Clamped additive brightness adjustment — adds `value` to each RGB channel and clamps explicitly to `[0, 255]`.
  **Syntax:** `out = img.adjustIntensity(target, value);`
  **Input Arguments:** `target`: image-like (default `this`); `value`: number to add (default `20`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `adjustContrast`
  **Description:** Linear contrast scaling around a fixed midpoint (128).
  **Syntax:** `out = img.adjustContrast(target, factor);`
  **Input Arguments:** `target`: image-like (default `this`); `factor`: contrast multiplier (default `1.2`)
  **Output Arguments:** `out`: `Image` instance
  **Formula:** `v' = clamp((v − 128) × factor + 128, 0, 255)`

---

### Geometric Operations

- **Function:** `rotate`
  **Description:** Rotates the image by a multiple of 90° (0/90/180/270). For 90°/270°, width and height are swapped in the output.
  **Syntax:** `out = img.rotate(target, angle);`
  **Input Arguments:** `target`: image-like (default `this`); `angle`: degrees, normalized mod 360 (default `90`)
  **Output Arguments:** `out`: `Image` instance, `newW×newH` (swapped for 90°/270°)

- **Function:** `flipH`
  **Description:** Horizontal flip (mirror left-right).
  **Syntax:** `out = img.flipH(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance, same dimensions

- **Function:** `flipV`
  **Description:** Vertical flip (mirror top-bottom).
  **Syntax:** `out = img.flipV(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance, same dimensions

- **Function:** `resize`
  **Description:** Nearest-neighbor resize to arbitrary output dimensions.
  **Syntax:** `out = img.resize(target, newW, newH);`
  **Input Arguments:** `target`: image-like (default `this`); `newW`, `newH`: integer output dimensions
  **Output Arguments:** `out`: `Image` instance, `newW×newH`

- **Function:** `crop`
  **Description:** Pure pixel-array crop (no canvas dependency) — copies out the `(x, y, w, h)` sub-rectangle.
  **Syntax:** `out = img.crop(target, x, y, w, h);`
  **Input Arguments:** `target`: image-like (default `this`); `x`, `y`: top-left corner (default `0, 0`); `w`, `h`: crop size (default `this.width, this.height`)
  **Output Arguments:** `out`: `Image` instance, `w×h`

- **Function:** `pyramidDown`
  **Description:** Canvas-native Gaussian-pyramid downsample step: applies a 1px CSS blur, then draws to a canvas at half the width/height, relying on the browser's own resampling/blur.
  **Syntax:** `out = img.pyramidDown(target);`
  **Input Arguments:** `target`: image-like or `Image` (default `this`)
  **Output Arguments:** `out`: `Image` instance, roughly half-size
  **Note:** requires a canvas-capable environment (browser or canvas polyfill)

- **Function:** `pyramidUp`
  **Description:** Canvas-native Gaussian-pyramid upsample step: draws to double the width/height, then applies a 1px CSS blur.
  **Syntax:** `out = img.pyramidUp(target);`
  **Input Arguments:** `target`: image-like or `Image` (default `this`)
  **Output Arguments:** `out`: `Image` instance, double-size
  **Note:** requires a canvas-capable environment (browser or canvas polyfill)

---

### Filtering & Convolution

- **Function:** `convolve`
  **Description:** Generic 2D convolution with a square kernel (edge pixels clamped to the border, i.e. replicate-padding). Applies to R, G, B identically; alpha is set to opaque (255).
  **Syntax:** `out = img.convolve(target, kernel, divisor, bias);`
  **Input Arguments:** `target`: image-like (default `this`); `kernel`: flat array of length `k²` (odd `k`); `divisor`: normalization divisor (default `1`); `bias`: additive offset (default `0`)
  **Output Arguments:** `out`: `Image` instance, same dimensions

- **Function:** `edgeSobel`
  **Description:** Sobel gradient-magnitude edge detector: convolves with the horizontal and vertical Sobel kernels and combines them as a Euclidean magnitude.
  **Syntax:** `edges = img.edgeSobel(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `edges`: `Image` instance
  **Formula:** `mag = √(Gx² + Gy²)`

- **Function:** `edgeCanny`
  **Description:** Canny edge detector: Gaussian blur (3×3, divisor 16) → Sobel gradients (magnitude + direction) → non-maximum suppression along the gradient direction → double thresholding into strong (255) / weak (128) / non-edges (0).
  **Syntax:** `edges = img.edgeCanny(target, lowThreshold, highThreshold);`
  **Input Arguments:** `target`: image-like (default `this`); `lowThreshold`, `highThreshold`: 0–255 (defaults `50`, `100`)
  **Output Arguments:** `edges`: `Image` instance (values 0 / 128 / 255)
  **Note:** performs non-max suppression and thresholding but does **not** perform hysteresis edge-tracking/linking on the weak (128) pixels — that step is left to the caller if needed.

---

### Grayscale Morphology

Fixed 3×3 structuring element, operating on already-grayscale/BW images.

- **Function:** `dilate`
  **Description:** Grayscale morphological dilation — replaces each pixel with the max value in its 3×3 neighborhood (border pixels clamped).
  **Syntax:** `out = img.dilate(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `erode`
  **Description:** Grayscale morphological erosion — replaces each pixel with the min value in its 3×3 neighborhood (border pixels clamped).
  **Syntax:** `out = img.erode(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `close`
  **Description:** Morphological closing — dilation followed by erosion (`erode(dilate(target))`); fills small dark gaps/holes.
  **Syntax:** `out = img.close(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `open`
  **Description:** Morphological opening — erosion followed by dilation (`dilate(erode(target))`); removes small bright specks.
  **Syntax:** `out = img.open(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `out`: `Image` instance

---

### Two-Image Arithmetic

`this` is always the first operand, the argument the second — mirrors `Matrix.add(other)`/`Matrix.subtract(other)`.

- **Function:** `add`
  **Description:** Element-wise RGB addition of two images, saturating at 255 (alpha forced opaque).
  **Syntax:** `out = imgA.add(imgB);`
  **Input Arguments:** `other`: image-like, same shape as `this`
  **Output Arguments:** `out`: `Image` instance
  **Formula:** `out = min(255, a + b)`

- **Function:** `subtract`
  **Description:** Element-wise RGB subtraction of two images, clamped at 0 (alpha forced opaque).
  **Syntax:** `out = imgA.subtract(imgB);`
  **Input Arguments:** `other`: image-like, same shape as `this`
  **Output Arguments:** `out`: `Image` instance
  **Formula:** `out = max(0, a − b)`

- **Function:** `multiply`
  **Description:** Element-wise RGB multiplication of two images, normalized by 255 (alpha forced opaque).
  **Syntax:** `out = imgA.multiply(imgB);`
  **Input Arguments:** `other`: image-like, same shape as `this`
  **Output Arguments:** `out`: `Image` instance
  **Formula:** `out = min(255, (a · b) / 255)`

---

### Color Space & Color Operations

- **Function:** `rgb2hsv`
  **Description:** Converts each RGB pixel to HSV, and packs `H, S, V` back into the R, G, B channels respectively, each scaled to 0–255 (`H` as `h/360×255`).
  **Syntax:** `hsv = img.rgb2hsv(target);`
  **Input Arguments:** `target`: image-like (default `this`)
  **Output Arguments:** `hsv`: `Image` instance, HSV-encoded in RGB channels

- **Function:** `Image.HSV_COLORS`
  **Description:** Static getter returning a lookup table of common hue ranges (`{hmin,hmax,smin,smax,vmin,vmax}`) on the same 0–255 scale used by `rgb2hsv` — covers `red1`, `red2` (red wraps around hue 0), `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`. Pass a custom `ranges`/`range` to `colorSegmentation`/`colorFilterRange` for anything more precise.
  **Syntax:** `table = Image.HSV_COLORS;`
  **Output Arguments:** `table`: object of named `{hmin,hmax,smin,smax,vmin,vmax}` ranges

- **Function:** `colorReduction`
  **Description:** K-means color quantization — clusters RGB pixels into `ncolors` clusters (5 Lloyd iterations, randomly seeded centers) and replaces each pixel with its cluster's mean color.
  **Syntax:** `out = img.colorReduction(target, ncolors);`
  **Input Arguments:** `target`: RGB image-like (default `this`); `ncolors`: number of clusters/colors (default `8`)
  **Output Arguments:** `out`: `Image` instance
  **Note:** uses `Math.random()` for initial centers, so results vary between calls.

- **Function:** `colorSegmentation`
  **Description:** Binary mask from an HSV-encoded image: a pixel is set to 255 if it falls inside **any** of the supplied HSV ranges (OR combination), else 0. Handles hue ranges that wrap around 0/255 (`hmin > hmax`).
  **Syntax:** `mask = img.colorSegmentation(target, ranges);`
  **Input Arguments:** `target`: HSV-encoded image-like (default `this`, see `rgb2hsv`); `ranges`: array of `{hmin,hmax,smin,smax,vmin,vmax}`
  **Output Arguments:** `mask`: `Image` instance (0 or 255 in every channel)

- **Function:** `colorFilter`
  **Description:** Binary mask for a single named color, looked up in an `HSV_COLORS`-shaped table. The key `'red'` is special-cased to OR together `table.red1` and `table.red2` (since red wraps around hue 0). Logs `Unknown color: ...` and returns a blank mask for an unrecognized key.
  **Syntax:** `mask = img.colorFilter(target, color, table);`
  **Input Arguments:** `target`: HSV-encoded image-like (default `this`); `color`: string key (e.g. `'red'`, `'blue'`); `table`: ranges table (default `Image.HSV_COLORS`)
  **Output Arguments:** `mask`: `Image` instance

- **Function:** `colorFilterRange`
  **Description:** Binary mask from a single explicit HSV range (no lookup table). Handles a wrap-around hue range (`hmin > hmax`).
  **Syntax:** `mask = img.colorFilterRange(target, range);`
  **Input Arguments:** `target`: HSV-encoded image-like (default `this`); `range`: `{hmin,hmax,smin,smax,vmin,vmax}`
  **Output Arguments:** `mask`: `Image` instance

---

### Binary Mask Morphology

Arbitrary-kernel-size morphology on 0/255 binary masks (named `*Mask` to distinguish from the fixed-3×3 grayscale `erode`/`dilate` above — corresponds to `erode_color`/`dilate_color` in the original functions).

- **Function:** `erodeMask`
  **Description:** Binary erosion with an odd `kernelSize × kernelSize` structuring element: a pixel stays 255 only if **every** neighbor in the window (including out-of-bounds treated as off) is 255.
  **Syntax:** `out = img.erodeMask(target, kernelSize);`
  **Input Arguments:** `target`: binary (0/255) image-like (default `this`); `kernelSize`: odd integer (default `3`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `dilateMask`
  **Description:** Binary dilation with an odd `kernelSize × kernelSize` structuring element: a pixel becomes 255 if **any** in-bounds neighbor in the window is 255.
  **Syntax:** `out = img.dilateMask(target, kernelSize);`
  **Input Arguments:** `target`: binary (0/255) image-like (default `this`); `kernelSize`: odd integer (default `3`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `morphOpen`
  **Description:** Binary-mask opening (`dilateMask(erodeMask(target))`), with an arbitrary kernel size.
  **Syntax:** `out = img.morphOpen(target, kernelSize);`
  **Input Arguments:** `target`: binary image-like (default `this`); `kernelSize`: odd integer (default `3`)
  **Output Arguments:** `out`: `Image` instance

- **Function:** `morphClose`
  **Description:** Binary-mask closing (`erodeMask(dilateMask(target))`), with an arbitrary kernel size.
  **Syntax:** `out = img.morphClose(target, kernelSize);`
  **Input Arguments:** `target`: binary image-like (default `this`); `kernelSize`: odd integer (default `3`)
  **Output Arguments:** `out`: `Image` instance

---

### BW Plane Helper

- **Function:** `toBWPlane`
  **Description:** Extracts a flat, single-channel `Uint8ClampedArray` plane (length `width×height`, values 0/255) from a black & white image's R channel — the format required by the Hough and contour algorithms below (as opposed to their RGBA `Image` buffers). Build the source image with `rgb2bw`/`gray2bw` first.
  **Syntax:** `plane = img.toBWPlane(target);`
  **Input Arguments:** `target`: black & white image-like (default `this`)
  **Output Arguments:** `plane`: `Uint8ClampedArray` of length `width*height`

---

### Hough Line Transform

- **Function:** `Image.houghTransform`
  **Description:** Static — builds the polar-form (`ρ, θ`) Hough accumulator for line detection over a flat BW plane: for every on-pixel, votes for every candidate `θ` bin at the corresponding `ρ = x·cosθ + y·sinθ`.
  **Syntax:** `accObj = Image.houghTransform(bwPlane, width, height, thetaStep, rhoStep);`
  **Input Arguments:** `bwPlane`: flat 0/255 array (see `toBWPlane`); `width`, `height`: plane dimensions; `thetaStep`: degrees per θ bin (default `1`); `rhoStep`: units per ρ bin (default `1`)
  **Output Arguments:** `accObj`: `{ accumulator, rhoMax, rhoStep, thetaStep, rhos, thetas }` — `accumulator`: 2D vote array (`rhos × thetas`)

- **Function:** `Image.houghPeaks`
  **Description:** Static — greedily extracts the top local-maxima peaks from a line-Hough accumulator, zeroing out a neighborhood around each found peak before searching for the next (non-maximum suppression).
  **Syntax:** `peaks = Image.houghPeaks(accObj, numPeaks, threshold, nhoodSize);`
  **Input Arguments:** `accObj`: result of `Image.houghTransform`; `numPeaks`: max peaks to return (default `10`); `threshold`: minimum vote count (default `50`); `nhoodSize`: `{rho, theta}` suppression window (default `{rho: 15, theta: 15}`)
  **Output Arguments:** `peaks`: array of `{ r, t, votes }` (accumulator indices and vote count), stops early once a candidate falls below `threshold`

- **Function:** `Image.houghLinesFromPeaks`
  **Description:** Static — converts `(ρ, θ)` peaks into clipped line-segment endpoints spanning the image.
  **Syntax:** `lines = Image.houghLinesFromPeaks(accObj, peaks, width, height);`
  **Input Arguments:** `accObj`: result of `Image.houghTransform`; `peaks`: result of `Image.houghPeaks`; `width`, `height`: plane dimensions
  **Output Arguments:** `lines`: array of `{ rho, theta, point1: {x,y}, point2: {x,y}, votes }`

- **Function:** `houghLines`
  **Description:** Convenience — runs the whole BW-image → line-segments pipeline in one call (`toBWPlane` → `Image.houghTransform` → `Image.houghPeaks` → `Image.houghLinesFromPeaks`).
  **Syntax:** `lines = img.houghLines(target, { thetaStep, rhoStep, numPeaks, threshold, nhoodSize });`
  **Input Arguments:** `target`: black & white image-like (default `this`); options object as above (defaults: `thetaStep=1, rhoStep=1, numPeaks=10, threshold=50, nhoodSize={rho:15,theta:15}`)
  **Output Arguments:** `lines`: array of `{ rho, theta, point1, point2, votes }`

---

### Hough Circle Transform

- **Function:** `Image.houghCircles`
  **Description:** Static — builds a 3D `(radius, a, b)` Hough accumulator for circle detection: for every on-pixel and candidate radius, votes for candidate circle centers `(a, b)` around the parametric circle (sampled every 5° of `θ`).
  **Syntax:** `accObj = Image.houghCircles(bwPlane, width, height, minR, maxR, rStep);`
  **Input Arguments:** `bwPlane`: flat 0/255 array; `width`, `height`: plane dimensions; `minR`, `maxR`: radius search range (defaults `10`, `80`); `rStep`: radius step (default `1`)
  **Output Arguments:** `accObj`: `{ accumulator, width, height, minR, maxR, rStep, radii }` — `accumulator`: 3D vote array (`radii × width × height`)

- **Function:** `Image.houghCirclePeaks`
  **Description:** Static — greedily extracts the top local-maxima peaks from a circle-Hough accumulator, zeroing a 3D neighborhood around each found peak before continuing.
  **Syntax:** `peaks = Image.houghCirclePeaks(accObj, numPeaks, threshold, nhood);`
  **Input Arguments:** `accObj`: result of `Image.houghCircles`; `numPeaks`: max peaks (default `10`); `threshold`: minimum vote count (default `40`); `nhood`: `{r, a, b}` suppression window (default `{r:2, a:20, b:20}`)
  **Output Arguments:** `peaks`: array of `{ ri, a, b, votes }` (radius index + center coordinates), stops early once a candidate falls below `threshold`

- **Function:** `Image.houghCirclesFromPeaks`
  **Description:** Static — converts `(ri, a, b)` peaks into `{x, y, r}` circle descriptors.
  **Syntax:** `circles = Image.houghCirclesFromPeaks(accObj, peaks);`
  **Input Arguments:** `accObj`: result of `Image.houghCircles`; `peaks`: result of `Image.houghCirclePeaks`
  **Output Arguments:** `circles`: array of `{ x, y, r, votes }`

- **Function:** `houghCircles`
  **Description:** Convenience — runs the whole BW-image → circles pipeline in one call (`toBWPlane` → `Image.houghCircles` → `Image.houghCirclePeaks` → `Image.houghCirclesFromPeaks`).
  **Syntax:** `circles = img.houghCircles(target, { minR, maxR, rStep, numPeaks, threshold, nhood });`
  **Input Arguments:** `target`: black & white image-like (default `this`); options object as above (defaults: `minR=10, maxR=80, rStep=1, numPeaks=10, threshold=40, nhood={r:2,a:20,b:20}`)
  **Output Arguments:** `circles`: array of `{ x, y, r, votes }`
  **Note:** the instance method `houghCircles` and the static `Image.houghCircles` coexist under the same name without conflict — one lives on the prototype, the other on the class itself.

---

### Contours

- **Function:** `Image.isOn`
  **Description:** Static — bounds-checked test of whether a given `(x, y)` pixel in a BW plane is "on" (255); out-of-bounds coordinates return `false`.
  **Syntax:** `on = Image.isOn(bwPlane, x, y, width, height);`
  **Input Arguments:** `bwPlane`: flat 0/255 array; `x`, `y`: pixel coordinates; `width`, `height`: plane dimensions
  **Output Arguments:** `on`: boolean

- **Function:** `Image.traceContour`
  **Description:** Static — traces a single connected contour starting at `(sx, sy)` by walking to the next "on" neighbor in a fixed clockwise direction order (right, down, left, up), turning to follow the boundary (Moore-neighbor-style boundary following) until it returns to the start pixel or no further neighbor is found.
  **Syntax:** `contour = Image.traceContour(bwPlane, width, height, sx, sy);`
  **Input Arguments:** `bwPlane`: flat 0/255 array; `width`, `height`: plane dimensions; `sx`, `sy`: starting pixel (must be "on")
  **Output Arguments:** `contour`: array of `{ x, y }` points along the traced boundary

- **Function:** `Image.findContours`
  **Description:** Static — scans the whole BW plane and traces every distinct connected contour (via `Image.traceContour`), marking traced pixels as visited so each contour is only found once.
  **Syntax:** `contours = Image.findContours(bwPlane, width, height);`
  **Input Arguments:** `bwPlane`: flat 0/255 array; `width`, `height`: plane dimensions
  **Output Arguments:** `contours`: array of contours, each an array of `{ x, y }` points

- **Function:** `findContours`
  **Description:** Convenience instance method — converts a target black & white image to a BW plane (via `toBWPlane`) and runs `Image.findContours` against it in one call.
  **Syntax:** `contours = img.findContours(target);`
  **Input Arguments:** `target`: black & white image-like (default `this`)
  **Output Arguments:** `contours`: array of contours, each an array of `{ x, y }` points

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `Image._wrap(width, height, data)` | Fast internal constructor — wraps already-built fields **without copying**; used by every algorithm once it has produced a fresh output buffer, to avoid an extra defensive copy |
| `Image._resolve(target)` | Resolves any accepted "image-like" argument (`Image`, `ImageData`, or plain object) into a **fresh** `{data, width, height}` that algorithms can mutate freely without touching the caller's original object; throws `Expected an Image, ImageData, or {data,width,height} object` otherwise |
| `Image._convolve(im, kernel, divisor, bias)` | Allocation-light 2D convolution core shared by `convolve`, `edgeSobel`, and `edgeCanny`; operates on a resolved `{data,width,height}` and returns a plain `{data,width,height}` (not wrapped as an `Image`) |

---
