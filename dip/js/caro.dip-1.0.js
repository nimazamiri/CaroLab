// caro.dip.js
// Digital Image Processing library — Image class
//
// Structured the same way as caro.matrix.js (Matrix class):
//   - constructor normalizes/validates input and stores plain fields
//   - most algorithms live as instance methods and return a NEW Image
//     (originals are never mutated), mirroring Matrix's add/subtract/scale/...
//   - algorithms that don't map to a single pixel buffer (two-image ops,
//     dimension-based constructors, accumulator-based detectors) are static,
//     mirroring Matrix.rotate / Matrix.translate / Matrix.concat / Matrix.eigenvalues
//   - a couple of convenience getters exist, mirroring Matrix's `get T()`
//
// NOTE ON THE NAME: this class is called `Image`, so `new Image()` no longer
// refers to the browser's built-in <img>-backed constructor in any scope where
// this class has been declared. Internally this file always uses
// `document.createElement('img')` instead of `new Image()` to build actual
// <img> elements, to avoid colliding with itself.

class Image {
    // ===== CONSTRUCTOR =====
    // Accepts:
    //   - nothing                         -> empty 0x0 image
    //   - a browser ImageData             -> copied in
    //   - a plain {data, width, height}   -> copied in (data: Uint8ClampedArray-like)
    //   - an HTMLCanvasElement            -> pixels read out via getContext('2d')
    //   - an HTMLImageElement             -> drawn to an offscreen canvas first
    constructor(source) {
        if (source == null) {
            this.data = new Uint8ClampedArray(0);
            this.width = 0;
            this.height = 0;
            return;
        }

        if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
            const ctx = source.getContext('2d');
            const id = ctx.getImageData(0, 0, source.width, source.height);
            this.data = new Uint8ClampedArray(id.data);
            this.width = id.width;
            this.height = id.height;
            return;
        }

        if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
            const w = source.naturalWidth || source.width;
            const h = source.naturalHeight || source.height;
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            c.getContext('2d').drawImage(source, 0, 0, w, h);
            const id = c.getContext('2d').getImageData(0, 0, w, h);
            this.data = new Uint8ClampedArray(id.data);
            this.width = w;
            this.height = h;
            return;
        }

        // ImageData or plain {data, width, height}
        if (source && source.data && source.width !== undefined && source.height !== undefined) {
            this.data = new Uint8ClampedArray(source.data);
            this.width = source.width;
            this.height = source.height;
            return;
        }

        throw new Error('Unsupported Image source');
    }

    // Fast internal constructor: wraps fields WITHOUT copying.
    // Used by algorithms below once they've already built a fresh buffer.
    static _wrap(width, height, data) {
        const img = Object.create(Image.prototype);
        img.width = width;
        img.height = height;
        img.data = data;
        return img;
    }

    // Resolve any accepted "image-like" argument (Image, ImageData, plain
    // object) into a fresh {data, width, height} the algorithms can mutate
    // freely without touching the caller's original object.
    static _resolve(target) {
        if (target instanceof Image) {
            return { data: new Uint8ClampedArray(target.data), width: target.width, height: target.height };
        }
        if (target && target.data && target.width !== undefined && target.height !== undefined) {
            return { data: new Uint8ClampedArray(target.data), width: target.width, height: target.height };
        }
        throw new Error('Expected an Image, ImageData, or {data,width,height} object');
    }

    // ===== FACTORIES =====
    static fromImageData(imageData) {
        return new Image(imageData);
    }

    static fromCanvas(canvas) {
        return new Image(canvas);
    }

    static fromImageElement(imgEl) {
        return new Image(imgEl);
    }

    // Loads an image file/URL asynchronously and returns an Image.
    static fromURL(url) {
        return new Promise((resolve, reject) => {
            const el = document.createElement('img');
            el.crossOrigin = 'anonymous';
            el.onload = () => resolve(new Image(el));
            el.onerror = (e) => reject(e);
            el.src = url;
        });
    }

    // Blank canvas of given size (useful as an accumulator/output target).
    static zeros(width, height) {
        return Image._wrap(width, height, new Uint8ClampedArray(width * height * 4).fill(0));
    }

    // ===== CORE / CONVERSION =====
    clone() {
        return Image._wrap(this.width, this.height, new Uint8ClampedArray(this.data));
    }

    toImageData() {
        return new ImageData(new Uint8ClampedArray(this.data), this.width, this.height);
    }

    // Draws this Image onto a <canvas>, resizing it to fit.
    draw(canvas) {
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.getContext('2d').putImageData(this.toImageData(), 0, 0);
        return this;
    }

    // Offscreen canvas backed by this Image's pixels (used internally by
    // canvas-native ops like pyramidDown/pyramidUp, which rely on the
    // browser's own resampling/blur).
    toCanvas() {
        const c = document.createElement('canvas');
        this.draw(c);
        return c;
    }

    toString() {
        return `Image(${this.width}x${this.height})`;
    }

    // ===== POINT OPERATIONS =====
    // (each takes an optional `target` image-like argument, defaulting to
    // `this` — so both `img.invert()` and `img.invert(otherImg)` work)

    rgb2gray(target = this) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = d[i + 1] = d[i + 2] = gray;
        }
        return Image._wrap(im.width, im.height, d);
    }

    gray2bw(target = this, threshold = 128) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = d[i]; // already grayscale
            const bw = v >= threshold ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = bw;
        }
        return Image._wrap(im.width, im.height, d);
    }

    rgb2bw(target = this, threshold = 128) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const bw = gray >= threshold ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = bw;
        }
        return Image._wrap(im.width, im.height, d);
    }

    invert(target = this) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
        }
        return Image._wrap(im.width, im.height, d);
    }

    brightness(target = this, value = 0) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] += value;
            d[i + 1] += value;
            d[i + 2] += value;
        }
        return Image._wrap(im.width, im.height, d);
    }

    histEqualization(target = this) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const d = im.data;

        const hist = new Array(256).fill(0);
        for (let i = 0; i < d.length; i += 4) hist[d[i]]++; // assume grayscale

        const cdf = new Array(256).fill(0);
        cdf[0] = hist[0];
        for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

        const cdfMin = cdf.find(v => v > 0);
        const total = w * h;
        const map = new Array(256);
        for (let i = 0; i < 256; i++) {
            map[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
        }

        for (let i = 0; i < d.length; i += 4) {
            const eq = map[d[i]];
            d[i] = d[i + 1] = d[i + 2] = eq;
        }
        return Image._wrap(w, h, d);
    }

    adjustIntensity(target = this, value = 20) {
        const im = Image._resolve(target);
        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, Math.max(0, d[i] + value));
            d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + value));
            d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + value));
        }
        return Image._wrap(im.width, im.height, d);
    }

    adjustContrast(target = this, factor = 1.2) {
        const im = Image._resolve(target);
        const d = im.data;
        const midpoint = 128;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.min(255, Math.max(0, (d[i] - midpoint) * factor + midpoint));
            d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - midpoint) * factor + midpoint));
            d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - midpoint) * factor + midpoint));
        }
        return Image._wrap(im.width, im.height, d);
    }

    // ===== GEOMETRIC OPERATIONS =====

    rotate(target = this, angle = 90) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;

        let newW = w, newH = h;
        if (angle % 180 !== 0) { newW = h; newH = w; }

        const dst = new Uint8ClampedArray(newW * newH * 4);
        const a = ((angle % 360) + 360) % 360;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIdx = (y * w + x) * 4;
                let nx, ny;
                if (a === 0) { nx = x; ny = y; }
                else if (a === 90) { nx = h - 1 - y; ny = x; }
                else if (a === 180) { nx = w - 1 - x; ny = h - 1 - y; }
                else if (a === 270) { nx = y; ny = w - 1 - x; }
                else { nx = x; ny = y; }

                const dstIdx = (ny * newW + nx) * 4;
                dst[dstIdx] = src[srcIdx];
                dst[dstIdx + 1] = src[srcIdx + 1];
                dst[dstIdx + 2] = src[srcIdx + 2];
                dst[dstIdx + 3] = src[srcIdx + 3];
            }
        }
        return Image._wrap(newW, newH, dst);
    }

    flipH(target = this) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;
        const dst = new Uint8ClampedArray(src.length);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIdx = (y * w + x) * 4;
                const nx = w - 1 - x;
                const dstIdx = (y * w + nx) * 4;
                dst[dstIdx] = src[srcIdx];
                dst[dstIdx + 1] = src[srcIdx + 1];
                dst[dstIdx + 2] = src[srcIdx + 2];
                dst[dstIdx + 3] = src[srcIdx + 3];
            }
        }
        return Image._wrap(w, h, dst);
    }

    flipV(target = this) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;
        const dst = new Uint8ClampedArray(src.length);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcIdx = (y * w + x) * 4;
                const ny = h - 1 - y;
                const dstIdx = (ny * w + x) * 4;
                dst[dstIdx] = src[srcIdx];
                dst[dstIdx + 1] = src[srcIdx + 1];
                dst[dstIdx + 2] = src[srcIdx + 2];
                dst[dstIdx + 3] = src[srcIdx + 3];
            }
        }
        return Image._wrap(w, h, dst);
    }

    resize(target = this, newW, newH) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;
        const dst = new Uint8ClampedArray(newW * newH * 4);

        for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
                const srcX = Math.floor(x * w / newW);
                const srcY = Math.floor(y * h / newH);
                const srcIdx = (srcY * w + srcX) * 4;
                const dstIdx = (y * newW + x) * 4;
                dst[dstIdx] = src[srcIdx];
                dst[dstIdx + 1] = src[srcIdx + 1];
                dst[dstIdx + 2] = src[srcIdx + 2];
                dst[dstIdx + 3] = src[srcIdx + 3];
            }
        }
        return Image._wrap(newW, newH, dst);
    }

    // Pure pixel-array crop (no canvas dependency, unlike the original
    // canvas-based helper): copies the (x,y,w,h) sub-rectangle out.
    crop(target = this, x = 0, y = 0, w = this.width, h = this.height) {
        const im = Image._resolve(target);
        const sw = im.width;
        const src = im.data;
        const dst = new Uint8ClampedArray(w * h * 4);

        for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
                const srcIdx = ((y + yy) * sw + (x + xx)) * 4;
                const dstIdx = (yy * w + xx) * 4;
                dst[dstIdx] = src[srcIdx];
                dst[dstIdx + 1] = src[srcIdx + 1];
                dst[dstIdx + 2] = src[srcIdx + 2];
                dst[dstIdx + 3] = src[srcIdx + 3];
            }
        }
        return Image._wrap(w, h, dst);
    }

    // Canvas-native pyramids (rely on the browser's own blur/resampling,
    // same as the original functions).
    pyramidDown(target = this) {
        const canvas = (target instanceof Image ? target : new Image(target)).toCanvas();
        const ctx = canvas.getContext('2d');

        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tctx = temp.getContext('2d');
        tctx.filter = 'blur(1px)';
        tctx.drawImage(canvas, 0, 0);

        const newW = Math.floor(canvas.width / 2);
        const newH = Math.floor(canvas.height / 2);
        const out = document.createElement('canvas');
        out.width = newW;
        out.height = newH;
        out.getContext('2d').drawImage(temp, 0, 0, newW, newH);

        return Image.fromCanvas(out);
    }

    pyramidUp(target = this) {
        const canvas = (target instanceof Image ? target : new Image(target)).toCanvas();

        const newW = canvas.width * 2;
        const newH = canvas.height * 2;
        const temp = document.createElement('canvas');
        temp.width = newW;
        temp.height = newH;
        const tctx = temp.getContext('2d');
        tctx.drawImage(canvas, 0, 0, newW, newH);
        tctx.filter = 'blur(1px)';
        tctx.drawImage(temp, 0, 0);

        return Image.fromCanvas(temp);
    }

    // ===== FILTERING / CONVOLUTION =====

    // Internal, allocation-light convolution used by convolve/edgeSobel/edgeCanny.
    static _convolve(im, kernel, divisor = 1, bias = 0) {
        const w = im.width, h = im.height;
        const src = im.data;
        const out = new Uint8ClampedArray(src.length);
        const kSize = Math.sqrt(kernel.length);
        const half = Math.floor(kSize / 2);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let r = 0, g = 0, b = 0;
                for (let ky = -half; ky <= half; ky++) {
                    for (let kx = -half; kx <= half; kx++) {
                        const px = Math.min(w - 1, Math.max(0, x + kx));
                        const py = Math.min(h - 1, Math.max(0, y + ky));
                        const idx = (py * w + px) * 4;
                        const kval = kernel[(ky + half) * kSize + (kx + half)];
                        r += src[idx] * kval;
                        g += src[idx + 1] * kval;
                        b += src[idx + 2] * kval;
                    }
                }
                const i = (y * w + x) * 4;
                out[i] = r / divisor + bias;
                out[i + 1] = g / divisor + bias;
                out[i + 2] = b / divisor + bias;
                out[i + 3] = 255;
            }
        }
        return { data: out, width: w, height: h };
    }

    convolve(target = this, kernel, divisor = 1, bias = 0) {
        const im = Image._resolve(target);
        const { data, width, height } = Image._convolve(im, kernel, divisor, bias);
        return Image._wrap(width, height, data);
    }

    edgeSobel(target = this) {
        const im = Image._resolve(target);
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        const gx = Image._convolve(im, sobelX);
        const gy = Image._convolve(im, sobelY);

        const d = im.data;
        for (let i = 0; i < d.length; i += 4) {
            const mag = Math.sqrt(gx.data[i] ** 2 + gy.data[i] ** 2);
            d[i] = d[i + 1] = d[i + 2] = mag;
        }
        return Image._wrap(im.width, im.height, d);
    }

    edgeCanny(target = this, lowThreshold = 50, highThreshold = 100) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;

        const gaussianKernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        let blurred = Image._convolve(im, gaussianKernel, 16);

        const gx = Image._convolve(blurred, [-1, 0, 1, -2, 0, 2, -1, 0, 1]);
        const gy = Image._convolve(blurred, [-1, -2, -1, 0, 0, 0, 1, 2, 1]);

        const gradMag = new Float32Array(w * h);
        const gradDir = new Float32Array(w * h);
        for (let i = 0; i < blurred.data.length; i += 4) {
            const idx = i / 4;
            gradMag[idx] = Math.sqrt(gx.data[i] ** 2 + gy.data[i] ** 2);
            gradDir[idx] = Math.atan2(gy.data[i], gx.data[i]);
        }

        const suppressed = new Uint8ClampedArray(blurred.data.length);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = y * w + x;
                const angle = gradDir[idx] * 180 / Math.PI;
                const mag = gradMag[idx];

                let q = 255, r = 255;
                if ((angle >= -22.5 && angle < 22.5) || angle <= -157.5 || angle > 157.5) {
                    q = gradMag[idx + 1]; r = gradMag[idx - 1];
                } else if (angle >= 22.5 && angle < 67.5) {
                    q = gradMag[idx + w + 1]; r = gradMag[idx - w - 1];
                } else if (angle >= 67.5 && angle < 112.5) {
                    q = gradMag[idx + w]; r = gradMag[idx - w];
                } else if (angle >= 112.5 && angle < 157.5) {
                    q = gradMag[idx - w + 1]; r = gradMag[idx + w - 1];
                }

                const i = idx * 4;
                suppressed[i] = suppressed[i + 1] = suppressed[i + 2] = (mag >= q && mag >= r) ? mag : 0;
                suppressed[i + 3] = 255;
            }
        }

        for (let i = 0; i < suppressed.length; i += 4) {
            const v = suppressed[i];
            const out = v >= highThreshold ? 255 : (v >= lowThreshold ? 128 : 0);
            suppressed[i] = suppressed[i + 1] = suppressed[i + 2] = out;
        }

        return Image._wrap(w, h, suppressed);
    }

    // ===== GRAYSCALE MORPHOLOGY (3x3) =====

    dilate(target = this) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const d = im.data;
        const out = new Uint8ClampedArray(d.length);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let max = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const px = Math.min(w - 1, Math.max(0, x + kx));
                        const py = Math.min(h - 1, Math.max(0, y + ky));
                        max = Math.max(max, d[(py * w + px) * 4]);
                    }
                }
                const i = (y * w + x) * 4;
                out[i] = out[i + 1] = out[i + 2] = max;
                out[i + 3] = 255;
            }
        }
        return Image._wrap(w, h, out);
    }

    erode(target = this) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const d = im.data;
        const out = new Uint8ClampedArray(d.length);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let min = 255;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const px = Math.min(w - 1, Math.max(0, x + kx));
                        const py = Math.min(h - 1, Math.max(0, y + ky));
                        min = Math.min(min, d[(py * w + px) * 4]);
                    }
                }
                const i = (y * w + x) * 4;
                out[i] = out[i + 1] = out[i + 2] = min;
                out[i + 3] = 255;
            }
        }
        return Image._wrap(w, h, out);
    }

    close(target = this) {
        return this.erode(this.dilate(target));
    }

    open(target = this) {
        return this.dilate(this.erode(target));
    }

    // ===== TWO-IMAGE ARITHMETIC =====
    // `this` is the first operand, the argument is the second — mirrors
    // Matrix's add(other)/subtract(other).

    add(other) {
        const a = Image._resolve(this), b = Image._resolve(other);
        const out = new Uint8ClampedArray(a.data.length);
        for (let i = 0; i < a.data.length; i += 4) {
            out[i] = Math.min(255, a.data[i] + b.data[i]);
            out[i + 1] = Math.min(255, a.data[i + 1] + b.data[i + 1]);
            out[i + 2] = Math.min(255, a.data[i + 2] + b.data[i + 2]);
            out[i + 3] = 255;
        }
        return Image._wrap(a.width, a.height, out);
    }

    subtract(other) {
        const a = Image._resolve(this), b = Image._resolve(other);
        const out = new Uint8ClampedArray(a.data.length);
        for (let i = 0; i < a.data.length; i += 4) {
            out[i] = Math.max(0, a.data[i] - b.data[i]);
            out[i + 1] = Math.max(0, a.data[i + 1] - b.data[i + 1]);
            out[i + 2] = Math.max(0, a.data[i + 2] - b.data[i + 2]);
            out[i + 3] = 255;
        }
        return Image._wrap(a.width, a.height, out);
    }

    multiply(other) {
        const a = Image._resolve(this), b = Image._resolve(other);
        const out = new Uint8ClampedArray(a.data.length);
        for (let i = 0; i < a.data.length; i += 4) {
            out[i] = Math.min(255, (a.data[i] * b.data[i]) / 255);
            out[i + 1] = Math.min(255, (a.data[i + 1] * b.data[i + 1]) / 255);
            out[i + 2] = Math.min(255, (a.data[i + 2] * b.data[i + 2]) / 255);
            out[i + 3] = 255;
        }
        return Image._wrap(a.width, a.height, out);
    }

    // ===== COLOR SPACE / COLOR OPS =====

    rgb2hsv(target = this) {
        const im = Image._resolve(target);
        const d = im.data;
        const out = new Uint8ClampedArray(d.length);

        for (let i = 0; i < d.length; i += 4) {
            let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const delta = max - min;
            let h = 0, s = 0, v = max;

            if (delta !== 0) {
                s = max === 0 ? 0 : delta / max;
                switch (max) {
                    case r: h = ((g - b) / delta) % 6; break;
                    case g: h = (b - r) / delta + 2; break;
                    case b: h = (r - g) / delta + 4; break;
                }
                h *= 60;
                if (h < 0) h += 360;
            }

            out[i] = h / 360 * 255;
            out[i + 1] = s * 255;
            out[i + 2] = v * 255;
            out[i + 3] = d[i + 3];
        }
        return Image._wrap(im.width, im.height, out);
    }

    // Common hue ranges on the 0-255 scale used by rgb2hsv() above
    // (h*255/360). Pass your own `ranges`/`range` to colorSegmentation /
    // colorFilterRange for anything more precise.
    static get HSV_COLORS() {
        return {
            red1: { hmin: 0, hmax: 7, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            red2: { hmin: 248, hmax: 255, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            orange: { hmin: 7, hmax: 18, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            yellow: { hmin: 18, hmax: 25, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            green: { hmin: 25, hmax: 60, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            cyan: { hmin: 60, hmax: 71, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            blue: { hmin: 71, hmax: 96, smin: 60, smax: 255, vmin: 40, vmax: 255 },
            purple: { hmin: 96, hmax: 113, smin: 60, smax: 255, vmin: 40, vmax: 255 }
        };
    }

    // K-means color reduction. `target` should be an RGB image.
    colorReduction(target = this, ncolors = 8) {
        const im = Image._resolve(target);
        const data = im.data, w = im.width, h = im.height;

        let centers = [];
        for (let i = 0; i < ncolors; i++) {
            const idx = (Math.random() * (data.length / 4) | 0) * 4;
            centers.push([data[idx], data[idx + 1], data[idx + 2]]);
        }

        for (let iter = 0; iter < 5; iter++) {
            const sums = Array.from({ length: ncolors }, () => [0, 0, 0, 0]);
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                let best = 0, bestDist = Infinity;
                for (let c = 0; c < ncolors; c++) {
                    const dr = r - centers[c][0], dg = g - centers[c][1], db = b - centers[c][2];
                    const dist = dr * dr + dg * dg + db * db;
                    if (dist < bestDist) { bestDist = dist; best = c; }
                }
                sums[best][0] += r; sums[best][1] += g; sums[best][2] += b; sums[best][3] += 1;
            }
            for (let c = 0; c < ncolors; c++) {
                if (sums[c][3] > 0) {
                    centers[c][0] = sums[c][0] / sums[c][3];
                    centers[c][1] = sums[c][1] / sums[c][3];
                    centers[c][2] = sums[c][2] / sums[c][3];
                }
            }
        }

        const out = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            let best = 0, bestDist = Infinity;
            for (let c = 0; c < ncolors; c++) {
                const dr = r - centers[c][0], dg = g - centers[c][1], db = b - centers[c][2];
                const dist = dr * dr + dg * dg + db * db;
                if (dist < bestDist) { bestDist = dist; best = c; }
            }
            out[i] = centers[best][0]; out[i + 1] = centers[best][1]; out[i + 2] = centers[best][2];
            out[i + 3] = data[i + 3];
        }
        return Image._wrap(w, h, out);
    }

    // `target` should already be HSV-encoded (see rgb2hsv()).
    // ranges = [{hmin,hmax,smin,smax,vmin,vmax}, ...]
    colorSegmentation(target = this, ranges) {
        const im = Image._resolve(target);
        const data = im.data, w = im.width, h = im.height;
        const out = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const H = data[i], S = data[i + 1], V = data[i + 2];
            let hit = false;
            for (const R of ranges) {
                if (R.hmin <= R.hmax) {
                    if (H >= R.hmin && H <= R.hmax && S >= R.smin && S <= R.smax && V >= R.vmin && V <= R.vmax) { hit = true; break; }
                } else {
                    if ((H >= R.hmin || H <= R.hmax) && S >= R.smin && S <= R.smax && V >= R.vmin && V <= R.vmax) { hit = true; break; }
                }
            }
            const v = hit ? 255 : 0;
            out[i] = out[i + 1] = out[i + 2] = v;
            out[i + 3] = 255;
        }
        return Image._wrap(w, h, out);
    }

    // `target` should already be HSV-encoded. `color` is a key into
    // Image.HSV_COLORS (or pass a table via the 3rd arg).
    colorFilter(target = this, color, table = Image.HSV_COLORS) {
        const im = Image._resolve(target);
        const data = im.data, w = im.width, h = im.height;
        const out = new Uint8ClampedArray(data.length);

        if (!table[color]) {
            console.warn('Unknown color:', color);
            return Image._wrap(w, h, out);
        }
        const ranges = (color === 'red') ? [table.red1, table.red2] : [table[color]];

        for (let i = 0; i < data.length; i += 4) {
            const H = data[i], S = data[i + 1], V = data[i + 2];
            let hit = false;
            for (const R of ranges) {
                if (R.hmin <= R.hmax) {
                    if (H >= R.hmin && H <= R.hmax && S >= R.smin && S <= R.smax && V >= R.vmin && V <= R.vmax) { hit = true; break; }
                } else {
                    if ((H >= R.hmin || H <= R.hmax) && S >= R.smin && S <= R.smax && V >= R.vmin && V <= R.vmax) { hit = true; break; }
                }
            }
            out[i] = out[i + 1] = out[i + 2] = hit ? 255 : 0;
            out[i + 3] = 255;
        }
        return Image._wrap(w, h, out);
    }

    // `target` should already be HSV-encoded. range = {hmin,hmax,smin,smax,vmin,vmax}
    colorFilterRange(target = this, range) {
        const im = Image._resolve(target);
        const data = im.data, w = im.width, h = im.height;
        const out = new Uint8ClampedArray(data.length);

        for (let i = 0; i < data.length; i += 4) {
            const H = data[i], S = data[i + 1], V = data[i + 2];
            let hit;
            if (range.hmin <= range.hmax) {
                hit = H >= range.hmin && H <= range.hmax && S >= range.smin && S <= range.smax && V >= range.vmin && V <= range.vmax;
            } else {
                hit = (H >= range.hmin || H <= range.hmax) && S >= range.smin && S <= range.smax && V >= range.vmin && V <= range.vmax;
            }
            out[i] = out[i + 1] = out[i + 2] = hit ? 255 : 0;
            out[i + 3] = 255;
        }
        return Image._wrap(w, h, out);
    }

    // ===== BINARY MASK MORPHOLOGY (arbitrary kernel size) =====
    // Named *Mask to distinguish from the fixed-3x3 grayscale erode/dilate
    // above (these correspond to erode_color/dilate_color in the original).

    erodeMask(target = this, kernelSize = 3) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;
        const out = new Uint8ClampedArray(src.length);
        const r = Math.floor(kernelSize / 2);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let ok = true;
                for (let ky = -r; ky <= r && ok; ky++) {
                    for (let kx = -r; kx <= r && ok; kx++) {
                        const yy = y + ky, xx = x + kx;
                        if (yy < 0 || yy >= h || xx < 0 || xx >= w || src[(yy * w + xx) * 4] === 0) ok = false;
                    }
                }
                const idx = (y * w + x) * 4;
                out[idx] = out[idx + 1] = out[idx + 2] = ok ? 255 : 0;
                out[idx + 3] = 255;
            }
        }
        return Image._wrap(w, h, out);
    }

    dilateMask(target = this, kernelSize = 3) {
        const im = Image._resolve(target);
        const w = im.width, h = im.height;
        const src = im.data;
        const out = new Uint8ClampedArray(src.length);
        const r = Math.floor(kernelSize / 2);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let ok = false;
                for (let ky = -r; ky <= r && !ok; ky++) {
                    for (let kx = -r; kx <= r && !ok; kx++) {
                        const yy = y + ky, xx = x + kx;
                        if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
                        if (src[(yy * w + xx) * 4] === 255) ok = true;
                    }
                }
                const idx = (y * w + x) * 4;
                out[idx] = out[idx + 1] = out[idx + 2] = ok ? 255 : 0;
                out[idx + 3] = 255;
            }
        }
        return Image._wrap(w, h, out);
    }

    morphOpen(target = this, kernelSize = 3) {
        return this.dilateMask(this.erodeMask(target, kernelSize), kernelSize);
    }

    morphClose(target = this, kernelSize = 3) {
        return this.erodeMask(this.dilateMask(target, kernelSize), kernelSize);
    }

    // ===== BW PLANE HELPER (for Hough / contour algorithms) =====
    // The Hough & contour algorithms below work on a flat single-channel
    // 0/255 plane (not RGBA), matching the original functions. Build one
    // from a black & white image (see rgb2bw/gray2bw) with this helper.
    toBWPlane(target = this) {
        const im = Image._resolve(target);
        const d = im.data;
        const plane = new Uint8ClampedArray(im.width * im.height);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) plane[p] = d[i];
        return plane;
    }

    // ===== HOUGH LINE TRANSFORM =====

    static houghTransform(bwPlane, width, height, thetaStep = 1, rhoStep = 1) {
        const diag = Math.sqrt(width * width + height * height);
        const rhoMax = Math.ceil(diag);
        const rhos = Math.floor((2 * rhoMax) / rhoStep);
        const thetas = Math.floor(180 / thetaStep);
        const acc = new Array(rhos).fill(0).map(() => new Array(thetas).fill(0));

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (bwPlane[y * width + x] === 255) {
                    for (let t = 0; t < thetas; t++) {
                        const theta = t * thetaStep * Math.PI / 180;
                        const rho = Math.round((x * Math.cos(theta) + y * Math.sin(theta)) / rhoStep);
                        const rIndex = rho + Math.floor(rhos / 2);
                        if (rIndex >= 0 && rIndex < rhos) acc[rIndex][t]++;
                    }
                }
            }
        }
        return { accumulator: acc, rhoMax, rhoStep, thetaStep, rhos, thetas };
    }

    static houghPeaks(accObj, numPeaks = 10, threshold = 50, nhoodSize = { rho: 15, theta: 15 }) {
        const { accumulator, rhos, thetas } = accObj;
        const peaks = [];
        const accCopy = accumulator.map(row => row.slice());

        for (let k = 0; k < numPeaks; k++) {
            let maxVal = 0, maxR = -1, maxT = -1;
            for (let r = 0; r < rhos; r++) {
                for (let t = 0; t < thetas; t++) {
                    if (accCopy[r][t] > maxVal) { maxVal = accCopy[r][t]; maxR = r; maxT = t; }
                }
            }
            if (maxVal < threshold) break;
            peaks.push({ r: maxR, t: maxT, votes: maxVal });

            const rStart = Math.max(0, maxR - Math.floor(nhoodSize.rho / 2));
            const rEnd = Math.min(rhos - 1, maxR + Math.floor(nhoodSize.rho / 2));
            const tStart = Math.max(0, maxT - Math.floor(nhoodSize.theta / 2));
            const tEnd = Math.min(thetas - 1, maxT + Math.floor(nhoodSize.theta / 2));
            for (let rr = rStart; rr <= rEnd; rr++) for (let tt = tStart; tt <= tEnd; tt++) accCopy[rr][tt] = 0;
        }
        return peaks;
    }

    static houghLinesFromPeaks(accObj, peaks, width, height) {
        const { rhoStep, thetaStep, rhos } = accObj;
        const lines = [];
        const clip = (x, y) => ({ x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) });

        for (const p of peaks) {
            const rho = (p.r - rhos / 2) * rhoStep;
            const theta = p.t * thetaStep * Math.PI / 180;
            let x0, y0, x1, y1;

            if (Math.sin(theta) !== 0) {
                y0 = (rho - 0 * Math.cos(theta)) / Math.sin(theta);
                y1 = (rho - width * Math.cos(theta)) / Math.sin(theta);
                x0 = 0; x1 = width;
            } else {
                x0 = rho / Math.cos(theta); x1 = x0;
                y0 = 0; y1 = height;
            }
            lines.push({ rho, theta, point1: clip(x0, y0), point2: clip(x1, y1), votes: p.votes });
        }
        return lines;
    }

    // Convenience: bwImage -> lines, running the whole pipeline in one call.
    houghLines(target = this, { thetaStep = 1, rhoStep = 1, numPeaks = 10, threshold = 50, nhoodSize } = {}) {
        const plane = this.toBWPlane(target);
        const im = Image._resolve(target);
        const acc = Image.houghTransform(plane, im.width, im.height, thetaStep, rhoStep);
        const peaks = Image.houghPeaks(acc, numPeaks, threshold, nhoodSize || { rho: 15, theta: 15 });
        return Image.houghLinesFromPeaks(acc, peaks, im.width, im.height);
    }

    // ===== HOUGH CIRCLE TRANSFORM =====

    static houghCircles(bwPlane, width, height, minR = 10, maxR = 80, rStep = 1) {
        const radii = Math.floor((maxR - minR) / rStep) + 1;
        const acc = new Array(radii).fill(0).map(() =>
            new Array(width).fill(0).map(() => new Array(height).fill(0))
        );

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (bwPlane[y * width + x] === 255) {
                    for (let ri = 0; ri < radii; ri++) {
                        const r = minR + ri * rStep;
                        for (let theta = 0; theta < 360; theta += 5) {
                            const rad = theta * Math.PI / 180;
                            const a = Math.round(x - r * Math.cos(rad));
                            const b = Math.round(y - r * Math.sin(rad));
                            if (a >= 0 && a < width && b >= 0 && b < height) acc[ri][a][b]++;
                        }
                    }
                }
            }
        }
        return { accumulator: acc, width, height, minR, maxR, rStep, radii };
    }

    static houghCirclePeaks(accObj, numPeaks = 10, threshold = 40, nhood = { r: 2, a: 20, b: 20 }) {
        const { accumulator, radii, width, height } = accObj;
        const peaks = [];
        const accCopy = accumulator.map(r => r.map(a => a.slice()));

        for (let k = 0; k < numPeaks; k++) {
            let maxVal = 0, maxR = -1, maxA = -1, maxB = -1;
            for (let ri = 0; ri < radii; ri++) {
                for (let a = 0; a < width; a++) {
                    for (let b = 0; b < height; b++) {
                        if (accCopy[ri][a][b] > maxVal) { maxVal = accCopy[ri][a][b]; maxR = ri; maxA = a; maxB = b; }
                    }
                }
            }
            if (maxVal < threshold) break;
            peaks.push({ ri: maxR, a: maxA, b: maxB, votes: maxVal });

            const rStart = Math.max(0, maxR - nhood.r), rEnd = Math.min(radii - 1, maxR + nhood.r);
            const aStart = Math.max(0, maxA - nhood.a), aEnd = Math.min(width - 1, maxA + nhood.a);
            const bStart = Math.max(0, maxB - nhood.b), bEnd = Math.min(height - 1, maxB + nhood.b);
            for (let ri = rStart; ri <= rEnd; ri++)
                for (let a = aStart; a <= aEnd; a++)
                    for (let b = bStart; b <= bEnd; b++) accCopy[ri][a][b] = 0;
        }
        return peaks;
    }

    static houghCirclesFromPeaks(accObj, peaks) {
        const { minR, rStep } = accObj;
        return peaks.map(p => ({ x: p.a, y: p.b, r: minR + p.ri * rStep, votes: p.votes }));
    }

    // Convenience: bwImage -> circles, running the whole pipeline in one call.
    houghCircles(target = this, { minR = 10, maxR = 80, rStep = 1, numPeaks = 10, threshold = 40, nhood } = {}) {
        const plane = this.toBWPlane(target);
        const im = Image._resolve(target);
        const acc = Image.houghCircles(plane, im.width, im.height, minR, maxR, rStep);
        const peaks = Image.houghCirclePeaks(acc, numPeaks, threshold, nhood || { r: 2, a: 20, b: 20 });
        return Image.houghCirclesFromPeaks(acc, peaks);
    }

    // ===== CONTOURS =====

    static isOn(bwPlane, x, y, width, height) {
        if (x < 0 || y < 0 || x >= width || y >= height) return false;
        return bwPlane[y * width + x] === 255;
    }

    static traceContour(bwPlane, width, height, sx, sy) {
        const contour = [];
        let x = sx, y = sy;
        const dirs = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];
        let dir = 0;
        contour.push({ x, y });

        while (true) {
            let found = false;
            for (let i = 0; i < 4; i++) {
                const nd = (dir + i) % 4;
                const nx = x + dirs[nd].dx, ny = y + dirs[nd].dy;
                if (Image.isOn(bwPlane, nx, ny, width, height)) {
                    x = nx; y = ny; dir = nd;
                    contour.push({ x, y });
                    found = true;
                    break;
                }
            }
            if (!found) break;
            if (x === sx && y === sy) break;
        }
        return contour;
    }

    static findContours(bwPlane, width, height) {
        const visited = new Uint8Array(width * height);
        const contours = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (bwPlane[idx] === 255 && !visited[idx]) {
                    const contour = Image.traceContour(bwPlane, width, height, x, y);
                    for (const p of contour) visited[p.y * width + p.x] = 1;
                    contours.push(contour);
                }
            }
        }
        return contours;
    }

    // Convenience: run findContours directly against a (black & white) Image.
    findContours(target = this) {
        const plane = this.toBWPlane(target);
        const im = Image._resolve(target);
        return Image.findContours(plane, im.width, im.height);
    }
}

module.exports = Image;
