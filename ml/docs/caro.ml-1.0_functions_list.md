# CaroLab Machine Learning Library

- **Name:** caro.ml-1.0.js
- **Release Date:** 27 September 2026
- **Document Name:** Fuctions List

---

## Table of Contents

1. [Introduction](#introduction)
   - [A Primary Library for Unsupervised Clustering](#a-primary-library-for-unsupervised-clustering)
2. [Programming JavaScript Methods](#programming-javaScript-methods)
   - [HTML Scripting](#html-scripting)
   - [Node.js](#nodejs)
3. [CaroLab ML Library — Functions List](#carolab-ml-library--functions-list)
4. [Detail Description](#detail-description)
   - [Construction](#construction)
   - [Clustering Algorithms](#clustering-algorithms)
   - [Utilities](#utilities)
   - [Internal Helpers](#internal-helpers)

---

## Introduction

### A Primary Library for Unsupervised Clustering

`caro.ml-1.0.js` is a single-class JavaScript library built around the **`ML`** object — a lightweight, stateless wrapper offering several unsupervised clustering algorithms. Unlike `caro.statistics-1.0.js`'s `Sample` or `caro.matrix-1.0.js`'s `Matrix`, an `ML` instance does not wrap a particular dataset: `new ML()` takes no arguments, and every clustering method is called directly with its own `data` argument each time, much like the plain-function style of `caro.linear-1.0.js` (just packaged as instance methods on a shared object instead of free functions).

The library covers four broad clustering approaches, all operating on the same `data` shape — an array of points, each point itself an array of numeric feature values (`n` samples × `d` features):

| Area | Examples |
|---|---|
| Centroid-based clustering | `kmeans` |
| Neighbor-vote refinement | `knn` |
| Kernel / spectral clustering | `svm` |
| Ensemble / proximity clustering | `randomForest` |

The library has no external dependencies and runs unmodified in a browser `<script>` tag or under Node.js.

---

## Programming JavaScript Methods

### HTML Scripting

```html
<script type="text/javascript" src="js/caro.ml-1.0.js"></script>
<script>
  const ml = new ML();
  const data = ml.generateSampleData(150);
  const result = ml.kmeans(data, 3);
  console.log('Cluster labels:', result.clusters);
</script>
```

### Node.js

Create a javascript program, for example `program1.js`:

```javascript
const ML = require('./caro.ml-1.0.js');

const ml = new ML();
const data = ml.generateSampleData(150);
const result = ml.kmeans(data, 3);

console.log('Cluster labels:', result.clusters);
```

Then run it by node.js:

```
node program1.js
```

> **Note on usage:** unlike `Sample`/`Matrix`, `new ML()` does not take or store any dataset — `this.data` is initialized but unused by the clustering methods. Every method (`kmeans`, `knn`, `svm`, `randomForest`, `generateSampleData`) takes its own `data` argument directly on each call, in the style of `caro.linear-1.0.js`'s plain functions. `knn`, `svm`, and `randomForest` all build on `kmeans` internally rather than being independent implementations.

---

## CaroLab ML Library — Functions List

| No. | Function | Description |
|---|---|---|
| 1 | `constructor` / `new ML` | Creates an `ML` instance (no dataset stored; methods take `data` directly) |
| 2 | `kmeans` | K-Means clustering with K-Means++ centroid initialization |
| 3 | `knn` | K-Nearest-Neighbors vote-based refinement of an initial K-Means clustering |
| 4 | `svm` | SVM-style clustering — binary linear split (2 clusters) or spectral clustering (k > 2) |
| 5 | `randomForest` | Proximity-based clustering via an ensemble of random unsupervised trees |
| 6 | `generateSampleData` | Generates synthetic 2D sample data around three fixed centers, for demos/testing |

*(Internal-only helpers — `_euclideanDistance`, `_initializeCentroids`, `_findKNearest`, `_kernelFunction`, `_mean`, `_variance`, `_binarySVMClustering`, `_spectralClustering`, `_buildRandomTree`, `_getLeafId` — are listed separately under [Internal Helpers](#internal-helpers), as they are not part of the public API.)*

---

## Detail Description

### Construction

- **Function:** `constructor` / `new ML()`
  **Description:** Creates a new `ML` instance. Takes no arguments; initializes an unused `this.data = []` field. All clustering methods are called on the instance but take their dataset as an explicit argument rather than reading from `this`.
  **Syntax:** `const ml = new ML();`
  **Output Arguments:** `ml`: `ML` instance

---

### Clustering Algorithms

- **Function:** `kmeans`
  **Description:** Standard K-Means clustering: initializes centroids with K-Means++ (`_initializeCentroids`), then iteratively assigns each point to its nearest centroid and recomputes centroids as cluster means, until centroid movement falls below `tolerance` or `maxIterations` is reached.
  **Syntax:** `result = ml.kmeans(data, k, maxIterations, tolerance);`
  **Input Arguments:** `data`: array of `n` points, each an array of `d` feature values; `k`: number of clusters (default `3`); `maxIterations`: iteration cap (default `100`); `tolerance`: convergence threshold on max centroid shift (default `0.001`)
  **Output Arguments:** `result`: `{ clusters, centroids, groups }` — `clusters`: array of length `n`, the cluster index (`0..k-1`) assigned to each input point; `centroids`: array of `k` centroid points; `groups`: array of `k` arrays, each holding the actual data points assigned to that cluster
  **Notes:** Returns `{ clusters: [], centroids: [] }` immediately for empty `data`. A cluster that receives no points keeps its previous centroid unchanged for that iteration.

- **Function:** `knn`
  **Description:** Refines an initial `kmeans` clustering using K-Nearest-Neighbors majority voting: for each point, finds its `k` nearest neighbors in the full dataset (`_findKNearest`) and reassigns it to whichever cluster (from the initial K-Means result) is most common among those neighbors.
  **Syntax:** `result = ml.knn(data, k, numClusters);`
  **Input Arguments:** `data`: array of `n` points; `k`: number of nearest neighbors to vote among (default `3`); `numClusters`: number of clusters to seed via `kmeans` (default `3`)
  **Output Arguments:** `result`: `{ clusters, groups }` — `clusters`: array of length `n`, the vote-refined cluster index for each point; `groups`: object keyed by cluster index, each value an array of the points assigned to that cluster
  **Method:** Ties in the neighbor vote keep the point's original K-Means cluster (first cluster reaching the max vote count wins, and the original assignment is the initial `bestCluster`).

- **Function:** `svm`
  **Description:** SVM-inspired clustering. For `numClusters === 2`, performs a binary split via `_binarySVMClustering` (power-iteration principal-component projection, split at the median). For `numClusters > 2`, falls back to `_spectralClustering` (RBF-kernel affinity → normalized Laplacian → power-iteration eigenvectors → embed → `kmeans`).
  **Syntax:** `result = ml.svm(data, numClusters, kernel, gamma, C);`
  **Input Arguments:** `data`: array of `n` points; `numClusters`: number of clusters — `2` selects the binary path, anything else selects spectral clustering (default `2`); `kernel`: `'linear'`, `'poly'`, or `'rbf'` — passed through to `_binarySVMClustering`'s kernel-matrix computation (default `'rbf'`); `gamma`: RBF kernel bandwidth, used by the binary kernel matrix and by `_spectralClustering`'s affinity matrix (default `1`); `C`: accepted for API symmetry with a conventional SVM signature (not used in either clustering path) (default `1`)
  **Output Arguments:** `result`: `{ clusters, groups }` (binary path) or the `{ clusters, centroids, groups }` shape from `kmeans` (spectral path, `numClusters > 2`)
  **Notes:** The binary path's actual split uses the first principal component direction (via power iteration on the centered data) rather than the computed kernel matrix `K` — `K` is built but not used to determine the split.

- **Function:** `randomForest`
  **Description:** Proximity-based clustering via an ensemble of `numTrees` random unsupervised decision trees (`_buildRandomTree`, bootstrap-sampled, random-feature/random-threshold splits scored by balance × variance reduction). Builds an `n × n` co-occurrence (proximity) matrix from how often each pair of points lands in the same leaf, converts it to a distance matrix, and clusters the resulting per-point distance-feature vectors with `kmeans`.
  **Syntax:** `result = ml.randomForest(data, numClusters, numTrees, maxDepth);`
  **Input Arguments:** `data`: array of `n` points; `numClusters`: number of clusters passed to the final `kmeans` step (default `3`); `numTrees`: number of random trees in the ensemble (default `10`); `maxDepth`: maximum depth of each random tree (default `5`)
  **Output Arguments:** `result`: `{ clusters, centroids, groups }` — the `kmeans` result computed on the `n × n` proximity-distance embedding
  **Method:** Each tree is grown on a bootstrap sample of point indices, splitting on `√d` randomly chosen features (5 random threshold attempts per feature, scored by `balance × (parentVariance − weightedChildVariance)`); leaf co-occurrence across all `numTrees` trees is normalized to `[0, 1]` and converted to distance via `1 − proximity`.

---

### Utilities

- **Function:** `generateSampleData`
  **Description:** Generates synthetic 2D data points scattered (±1 uniform jitter) around three fixed centers — `[2, 2]`, `[8, 8]`, `[2, 8]` — cycling through them in order. Useful for demoing/testing the clustering methods above.
  **Syntax:** `data = ml.generateSampleData(n);`
  **Input Arguments:** `n`: number of points to generate (default `100`)
  **Output Arguments:** `data`: array of `n` two-element `[x, y]` points

---

### Internal Helpers

These are implementation details, not part of the public API, but documented here for maintainers extending the library:

| Function | Description |
|---|---|
| `_euclideanDistance(a, b)` | Euclidean distance between two equal-length points; used throughout `kmeans`, `knn`, `svm`, and `randomForest` |
| `_initializeCentroids(data, k)` | K-Means++ centroid initialization — picks the first centroid randomly, then each subsequent centroid with probability proportional to squared distance from the nearest existing centroid |
| `_findKNearest(data, point, k, excludeIdx)` | Returns the indices of the `k` nearest points to `point` in `data`, optionally excluding one index (its own position) from consideration |
| `_kernelFunction(a, b, kernel, gamma)` | Computes a kernel similarity between two points — `'linear'` (dot product), `'poly'` (degree-3 polynomial), or `'rbf'` (Gaussian, default); used to build the (unused) kernel matrix in `_binarySVMClustering` |
| `_mean(data)` | Column-wise mean vector of an array of points |
| `_variance(values)` | Population variance of a flat array of numbers; used by `_buildRandomTree`'s split-scoring |
| `_binarySVMClustering(data, kernel, gamma, C)` | Two-cluster split: builds an (unused) RBF/linear/poly kernel matrix, then actually splits via power-iteration first-principal-component projection, thresholded at the median projection value |
| `_spectralClustering(data, k, gamma)` | RBF affinity matrix → degree matrix → normalized Laplacian → top-`k` eigenvectors via deflating power iteration → embeds points in eigenspace → clusters the embedding with `kmeans` |
| `_buildRandomTree(data, indices, maxDepth, depth, leafCounter)` | Recursively builds one random unsupervised decision tree over a bootstrap index sample, splitting on a random feature subset (`√d` features) at a randomly sampled threshold, scored by `balance × variance reduction` |
| `_getLeafId(tree, point)` | Walks a tree built by `_buildRandomTree` to find the leaf id a given point falls into |

---
