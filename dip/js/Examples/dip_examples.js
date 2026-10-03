/* =========================================================
 *  CaroLab - Digital Image Processing Library Examples
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

const Image = require('../caro.dip-1.0.js');

// Environment detection: HTML* constructors only exist in the browser.
const IS_BROWSER =
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLImageElement !== 'undefined';

// ---------------------------------------------------------------------------
// Synthetic image helpers (work in Node, no browser needed)
// ---------------------------------------------------------------------------

// A 64x64 RGB image with a gradient and a solid color square, useful for
// testing all point, geometric, and filtering operations.
function makeTestImage(width = 64, height = 64) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Gradient background
      data[i] = Math.round((x / width) * 255);        // R
      data[i + 1] = Math.round((y / height) * 255);   // G
      data[i + 2] = 128;                              // B
      data[i + 3] = 255;                              // A
      // Solid white square in the top-left quadrant
      if (x < width / 4 && y < height / 4) {
        data[i] = data[i + 1] = data[i + 2] = 255;
      }
      // Solid black square in the bottom-right quadrant
      if (x > (3 * width) / 4 && y > (3 * height) / 4) {
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }
  return new Image({ data, width, height });
}

// Report helper for consistent output across examples
function describe(name, img) {
  console.log(`${name}: ${img.width}x${img.height}, ${img.data.length} bytes`);
}

// Read one sample as `[r,g,b,a]` at a given pixel
function sample(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

// ============================================================================
// Example 1 — Construction
// ============================================================================
function dipExample1() {
  console.log('\n=== Example 1: Construction ===');

  // From a plain {data, width, height} object (works in Node and browser)
  const img = makeTestImage(8, 8);
  describe('from plain object', img);

  // From a blank canvas (same as ImageData shape)
  const zeros = Image.zeros(16, 16);
  describe('Image.zeros(16,16)', zeros);

  // From another Image
  const copy = new Image(img);
  describe('from another Image', copy);

  // Clone — deep copy
  const clone = img.clone();
  clone.data[0] = 42;
  console.log('original[0] unchanged:', img.data[0] !== 42);
  console.log('clone[0] changed    :', clone.data[0] === 42);

  // From an ImageData (browser only)
  if (IS_BROWSER) {
    const imageData = new ImageData(new Uint8ClampedArray(4 * 4 * 4), 4, 4);
    const fromID = Image.fromImageData(imageData);
    describe('from ImageData', fromID);
  } else {
    console.log('(skipping ImageData construction — not a browser env)');
  }

  // Unsupported source throws
  try { new Image(42); }
  catch (e) { console.log('Error:', e.message); }
}

// ============================================================================
// Example 2 — Point Operations
// ============================================================================
function dipExample2() {
  console.log('\n=== Example 2: Point Operations ===');

  const img = makeTestImage(16, 16);
  console.log('original  (0,0):', sample(img, 0, 0));
  console.log('original (15,0):', sample(img, 15, 0));
  console.log('original (15,15):', sample(img, 15, 15));

  // invert
  const inverted = img.invert();
  console.log('inverted  (0,0):', sample(inverted, 0, 0));

  // rgb2gray
  const gray = img.rgb2gray();
  console.log('gray      (0,0):', sample(gray, 0, 0));

  // rgb2bw with threshold
  const bw = img.rgb2bw(img, 128);
  console.log('bw        (0,0):', sample(bw, 0, 0));
  console.log('bw       (15,15):', sample(bw, 15, 15));

  // brightness
  const brighter = img.brightness(img, 30);
  console.log('brighter  (0,0):', sample(brighter, 0, 0));

  // adjustIntensity (clamped)
  const intense = img.adjustIntensity(img, 30);
  console.log('intense   (0,0):', sample(intense, 0, 0));

  // adjustContrast
  const contrast = img.adjustContrast(img, 1.5);
  console.log('contrast  (0,0):', sample(contrast, 0, 0));

  // histEqualization — needs a grayscale source
  const eq = img.histEqualization(gray);
  console.log('hist-eq   (0,0):', sample(eq, 0, 0));
}

// ============================================================================
// Example 3 — Geometric Operations
// ============================================================================
function dipExample3() {
  console.log('\n=== Example 3: Geometric Operations ===');

  const img = makeTestImage(16, 16);
  describe('original', img);

  // Rotate 90 / 180 / 270
  const r90 = img.rotate(img, 90);
  describe('rotate 90', r90);
  console.log('  (0,0) after 90:', sample(r90, 0, 0));

  const r180 = img.rotate(img, 180);
  describe('rotate 180', r180);
  console.log('  (0,0) after 180:', sample(r180, 0, 0));

  const r270 = img.rotate(img, 270);
  describe('rotate 270', r270);

  // Flip H / V
  const fh = img.flipH(img);
  describe('flipH', fh);
  console.log('  (0,0) after flipH:', sample(fh, 0, 0));

  const fv = img.flipV(img);
  describe('flipV', fv);

  // Resize (nearest neighbour)
  const big = img.resize(img, 32, 32);
  describe('resize to 32x32', big);

  // Crop
  const cropped = img.crop(img, 4, 4, 8, 8);
  describe('crop (4,4,8,8)', cropped);
}

// ============================================================================
// Example 4 — Filtering and Edges
// ============================================================================
function dipExample4() {
  console.log('\n=== Example 4: Filtering and Edges ===');

  const img = makeTestImage(32, 32);
  const gray = img.rgb2gray();

  // Sharpen with a 3x3 kernel
  const sharpenKernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const sharp = img.convolve(img, sharpenKernel, 1, 0);
  describe('convolve sharpen', sharp);
  console.log('  (0,0):', sample(sharp, 0, 0));

  // Sobel edge detection
  const sobel = img.edgeSobel(gray);
  describe('edgeSobel', sobel);
  console.log('  (15,15):', sample(sobel, 15, 15));

  // Canny edge detection
  const canny = img.edgeCanny(gray, 50, 100);
  describe('edgeCanny', canny);
  console.log('  (15,15):', sample(canny, 15, 15));
}

// ============================================================================
// Example 5 — Grayscale Morphology
// ============================================================================
function dipExample5() {
  console.log('\n=== Example 5: Grayscale Morphology ===');

  const img = makeTestImage(16, 16);
  const bw = img.rgb2bw(img, 128);

  describe('bw', bw);

  const dilated = img.dilate(bw);
  describe('dilate', dilated);

  const eroded = img.erode(bw);
  describe('erode', eroded);

  const opened = img.open(bw);
  describe('open', opened);

  const closed = img.close(bw);
  describe('close', closed);
}

// ============================================================================
// Example 6 — Two-Image Arithmetic
// ============================================================================
function dipExample6() {
  console.log('\n=== Example 6: Two-Image Arithmetic ===');

  const img = makeTestImage(8, 8);
  const inverted = img.invert();

  const sum = img.add(inverted);
  console.log('add       (0,0):', sample(sum, 0, 0));

  const diff = img.subtract(inverted);
  console.log('subtract  (0,0):', sample(diff, 0, 0));

  const prod = img.multiply(inverted);
  console.log('multiply  (0,0):', sample(prod, 0, 0));
}

// ============================================================================
// Example 7 — Pyramids (browser only)
// ============================================================================
function dipExample7() {
  console.log('\n=== Example 7: Pyramids ===');

  if (!IS_BROWSER) {
    console.log('(skipping pyramidDown/pyramidUp — requires <canvas> and blur)');
    return;
  }

  const img = makeTestImage(16, 16);
  const down = img.pyramidDown(img);
  describe('pyramidDown', down);

  const up = down.pyramidUp(down);
  describe('pyramidUp', up);
}

// ============================================================================
// Example 8 — Color Space and Color Filtering
// ============================================================================
function dipExample8() {
  console.log('\n=== Example 8: Color Space and Color Filtering ===');

  const img = makeTestImage(16, 16);

  // RGB -> HSV
  const hsv = img.rgb2hsv(img);
  describe('hsv', hsv);
  console.log('  (0,0) rgb:', sample(img, 0, 0), ' → hsv:', sample(hsv, 0, 0));

  // K-means color reduction
  const reduced = img.colorReduction(img, 4);
  describe('colorReduction (4 colors)', reduced);
  console.log('  (0,0):', sample(reduced, 0, 0));

  // Color segmentation (manual ranges)
  const seg = img.colorSegmentation(hsv, [
    { hmin: 25, hmax: 60, smin: 60, smax: 255, vmin: 40, vmax: 255 }
  ]);
  describe('colorSegmentation (greens)', seg);
  console.log('  (0,0):', sample(seg, 0, 0));

  // Color filter using HSV_COLORS
  console.log('HSV_COLORS keys:', Object.keys(Image.HSV_COLORS));
  const blue = img.colorFilter(hsv, 'blue');
  describe('colorFilter (blue)', blue);

  // Color filter with a raw range
  const redish = img.colorFilterRange(hsv, {
    hmin: 0, hmax: 7, smin: 60, smax: 255, vmin: 40, vmax: 255
  });
  describe('colorFilterRange (red)', redish);
}

// ============================================================================
// Example 9 — Binary Mask Morphology
// ============================================================================
function dipExample9() {
  console.log('\n=== Example 9: Binary Mask Morphology ===');

  const img = makeTestImage(16, 16);

  // Build a binary mask from a color filter
  const hsv = img.rgb2hsv(img);
  const mask = img.colorFilter(hsv, 'blue');
  describe('mask', mask);

  // Erode / dilate with kernel size
  const erode = img.erodeMask(mask, 3);
  describe('erodeMask(3)', erode);

  const dilate = img.dilateMask(mask, 3);
  describe('dilateMask(3)', dilate);

  // Open / close
  const open = img.morphOpen(mask, 3);
  describe('morphOpen(3)', open);

  const close = img.morphClose(mask, 3);
  describe('morphClose(3)', close);
}

// ============================================================================
// Example 10 — Hough Line Transform
// ============================================================================
function dipExample10() {
  console.log('\n=== Example 10: Hough Line Transform ===');

  // Synthetic BW plane with a single vertical line
  const W = 32, H = 32;
  const plane = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) plane[y * W + 16] = 255;   // vertical line at x=16

  // Static pipeline
  const acc = Image.houghTransform(plane, W, H, 1, 1);
  console.log('accumulator size:', acc.rhos, 'x', acc.thetas);

  const peaks = Image.houghPeaks(acc, 5, 15, { rho: 5, theta: 5 });
  console.log('peaks:', peaks);

  const lines = Image.houghLinesFromPeaks(acc, peaks, W, H);
  console.log('lines:');
  for (const l of lines) {
    console.log(`  rho=${l.rho.toFixed(2)} theta=${(l.theta * 180 / Math.PI).toFixed(1)}° votes=${l.votes}`);
  }

  // Instance method (convenience) — needs an Image wrapped in BW
  const img = new Image({ data: (() => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = plane[i];
      d[i * 4 + 3] = 255;
    }
    return d;
  })(), width: W, height: H });
  const lines2 = img.houghLines(img, { threshold: 15, numPeaks: 5 });
  console.log('instance houghLines returned:', lines2.length, 'lines');
}

// ============================================================================
// Example 11 — Hough Circle Transform
// ============================================================================
function dipExample11() {
  console.log('\n=== Example 11: Hough Circle Transform ===');

  // Synthetic BW plane with a single circle
  const W = 64, H = 64;
  const cx = 32, cy = 32, r = 15;
  const plane = new Uint8ClampedArray(W * H);
  for (let theta = 0; theta < 360; theta += 2) {
    const rad = theta * Math.PI / 180;
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    if (x >= 0 && x < W && y >= 0 && y < H) plane[y * W + x] = 255;
  }

  // Static pipeline
  const acc = Image.houghCircles(plane, W, H, 10, 25, 1);
  console.log('circle accumulator radii:', acc.radii);

  const peaks = Image.houghCirclePeaks(acc, 5, 20, { r: 1, a: 4, b: 4 });
  console.log('peaks:', peaks.length);

  const circles = Image.houghCirclesFromPeaks(acc, peaks);
  console.log('circles:');
  for (const c of circles) {
    console.log(`  center=(${c.x},${c.y}) r=${c.r} votes=${c.votes}`);
  }

  console.log('(true center = 32,32; true r = 15)');
}

// ============================================================================
// Example 12 — Contours
// ============================================================================
function dipExample12() {
  console.log('\n=== Example 12: Contours ===');

  // Synthetic BW plane with a solid square
  const W = 16, H = 16;
  const plane = new Uint8ClampedArray(W * H);
  for (let y = 4; y < 12; y++) {
    for (let x = 4; x < 12; x++) {
      plane[y * W + x] = 255;
    }
  }

  // Static pipeline
  const contours = Image.findContours(plane, W, H);
  console.log('contours found:', contours.length);
  console.log('first contour length:', contours[0] ? contours[0].length : 0);

  // Instance method — wrap the plane in an Image
  const img = new Image({ data: (() => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = plane[i];
      d[i * 4 + 3] = 255;
    }
    return d;
  })(), width: W, height: H });
  const contours2 = img.findContours(img);
  console.log('instance findContours returned:', contours2.length, 'contours');
}

// ============================================================================
// Example 13 — Full Pipeline (browser only)
// ============================================================================
function dipExample13() {
  console.log('\n=== Example 13: Full Pipeline ===');

  if (!IS_BROWSER) {
    console.log('(skipping full pipeline — requires canvas + browser Image class)');
    return;
  }

  // Load the canvas and build the source Image
  const canvas1 = document.getElementById('canvas1');
  const img = Image.fromCanvas(canvas1);
  describe('source', img);

  // Invert → grayscale → binarize
  const inverted = img.invert();
  const gray = img.rgb2gray(inverted);
  const bw = img.gray2bw(gray, 128);
  describe('bw after pipeline', bw);

  // Sobel edges of the grayscale
  const sobel = img.edgeSobel(gray);
  describe('sobel', sobel);

  // Canny edges
  const canny = img.edgeCanny(gray, 50, 100);
  describe('canny', canny);

  // Find contours on the binarized image
  const contours = img.findContours(bw);
  console.log('contours:', contours.length);

  // Draw the result to canvas2
  const canvas2 = document.getElementById('canvas2');
  sobel.draw(canvas2);
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================
dipExample1();
dipExample2();
dipExample3();
dipExample4();
dipExample5();
dipExample6();
dipExample7();
dipExample8();
dipExample9();
dipExample10();
dipExample11();
dipExample12();
dipExample13();