# CaroLab Machine Learning Library — Examples Manual

- **Name:** caro.ml-1.0.js
- **Release Date:** 30 September 2026
- **Document Name:** Machine Learning Examples Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [Examples List](#examples-list)
3. [Example 1 — Four Clustering Algorithms on Synthetic 2-D Data (`ml_examples.js`)](#example-1--four-clustering-algorithms-on-synthetic-2-d-data-ml_examplesjs)
4. [What the Example Proves](#what-the-example-proves)
5. [Extending the Example](#extending-the-example)
6. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Document

This manual is the first for the **CaroLab machine learning library** — `caro.ml-1.0.js`, a dependency-free collection of clustering algorithms. It is the unsupervised-learning companion to the CaroLab control libraries: when you have a dataset but no labels, these algorithms group the points for you.

The library covers four algorithms:

| Algorithm | Method | Strengths |
|---|---|---|
| **K-Means** | Centroid-based, iterative assignment / update | Fast, simple, well-understood; requires `k` upfront |
| **K-Nearest Neighbors (as smoother)** | Refines K-Means assignments by neighborhood voting | Smooths cluster boundaries; robust to noise |
| **SVM (RBF kernel)** | PCA split (2 clusters) or spectral clustering (k clusters) | Handles non-spherical clusters |
| **Random Forest (as proximity)** | Unsupervised trees + proximity matrix + K-Means on proximity | Handles complex cluster shapes |

Each algorithm returns a `{ clusters, ... }` object. The `clusters` array assigns a cluster index to every input point.

The single example in this manual runs all four algorithms on the same synthetic dataset and compares their cluster distributions.

### Conventions

| Item | Convention |
|---|---|
| Data | Array of points; each point is an array of numbers (typically 2-D or higher) |
| Cluster labels | Integers `0..k-1` |
| Cluster count | Passed as `k` or `numClusters` depending on the method |
| Randomness | Unseeded; different runs give different results |
| Distance | Euclidean, unless the method says otherwise |
| Return | Object with `clusters` (labels per point) and method-specific extras |

The library is **CommonJS** (`module.exports = ML`).

### Required Files and Layout

```
project/
├── caro.ml-1.0.js
└── demo/
    └── ml_examples.js
```

The demo uses `require('../caro.ml-1.0.js')`.

### How to Run the Demo

```
node demo/ml_examples.js
```

The demo generates 150 synthetic 2-D points arranged in three well-separated groups, then runs all four clustering algorithms on the same data. It prints the per-point cluster assignments for each algorithm, followed by a histogram showing how many points fell into each cluster.

### Why This Library

Clustering is the canonical unsupervised-learning problem: given a set of points, group them into subsets such that points in the same subset are more similar to each other than to points in other subsets. It appears everywhere — market segmentation, image compression, anomaly detection, document clustering, spatial analysis.

The four algorithms in this library cover the three main clustering philosophies:

1. **Centroid-based** — K-Means. Fast, simple, assumes clusters are roughly spherical and equally sized.
2. **Graph-based** — spectral clustering with an RBF kernel. Handles clusters of arbitrary shape, at the cost of a matrix eigendecomposition.
3. **Ensemble-based** — Random Forest with a proximity matrix. Handles complex cluster shapes and provides a built-in similarity measure.

And a fourth hybrid — KNN-based refinement — that smooths the K-Means result by voting among neighbours.

All four are implemented from scratch, in plain JavaScript, with no external dependencies. They are intended for small to medium datasets (hundreds to a few thousand points), where the O(n²) or O(n² log n) cost is acceptable.

### The Dataset

The demo uses a built-in `generateSampleData(n)` method that produces `n` 2-D points around three well-separated centers:

```
centers = [[2, 2], [8, 8], [2, 8]]
```

Each point is placed near one of these centers with a small amount of Gaussian-like noise:

```javascript
data.push([
  center[0] + (Math.random() - 0.5) * 2,
  center[1] + (Math.random() - 0.5) * 2
]);
```

Points are assigned to centers cyclically (`i % centers.length`), so the data has three well-balanced clusters. This is a "textbook" clustering problem — all four algorithms should produce similar results.

---

## Examples List

| No. | File | Function(s) exercised | Purpose |
|---|---|---|---|
| 1 | `ml_examples.js` | `generateSampleData`, `svm`, `knn`, `kmeans`, `randomForest` | Compare four clustering algorithms on the same synthetic data |

---

## Example 1 — Four Clustering Algorithms on Synthetic 2-D Data (`ml_examples.js`)

- **Purpose:** Run all four clustering algorithms on the same 150-point dataset and compare their cluster assignments. This is an integration test of the library and a sanity check that each algorithm produces sensible groupings.
- **Source:** The full script is `ml_examples.js`:

```javascript
const ML = require('../caro.ml-1.0.js');
const ml = new ML();
const data_points = ml.generateSampleData(150);

const svm_clusters = ml.svm(data_points, 3);
const knn_clusters = ml.knn(data_points, 5, 3);
const kmeans_clusters = ml.kmeans(data_points, 3);
const rf_clusters = ml.randomForest(data_points, 3, 10, 5);

console.log('SVM Clusters:', svm_clusters.clusters);
console.log('KNN Clusters:', knn_clusters.clusters);
console.log('K-Means Clusters:', kmeans_clusters.clusters);
console.log('Random Forest Clusters:', rf_clusters.clusters);

// Visualize cluster distribution
console.log('\n=== Cluster Distribution ===');
console.log('SVM:', svm_clusters.clusters.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}));
console.log('KNN:', knn_clusters.clusters.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}));
console.log('K-Means:', kmeans_clusters.clusters.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}));
console.log('Random Forest:', rf_clusters.clusters.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}));
```

- **Class and methods invoked:**
  - `new ML()` — constructor (initializes an empty `this.data` array, which is not used by these methods).
  - `ml.generateSampleData(150)` — produces 150 points around three centers.
  - `ml.svm(data, 3)` — SVM clustering. Because `numClusters === 3` (not 2), the method dispatches to `_spectralClustering` with an RBF kernel.
  - `ml.knn(data, 5, 3)` — KNN-refined clustering. First runs `kmeans(data, 3)`, then smooths the assignments by 5-nearest-neighbor voting.
  - `ml.kmeans(data, 3)` — standard K-Means with k-means++ initialization.
  - `ml.randomForest(data, 3, 10, 5)` — 10 unsupervised trees of depth 5, then K-Means on the proximity matrix.

- **Inputs:**
  - **Dataset:** 150 points, 2-D, arranged around the three centers `(2, 2)`, `(8, 8)`, and `(2, 8)` with ±1 uniform noise.
  - **`k = 3`** for all four algorithms.
  - **KNN:** 5 neighbours per point.
  - **Random Forest:** 10 trees, max depth 5.

- **Output:** two blocks.
  - The first block prints the raw `clusters` array for each algorithm — 150 integers between 0 and 2.
  - The second block reduces each array into a histogram `{0: n₀, 1: n₁, 2: n₂}`, showing how many points ended up in each cluster.

- **Expected output (abridged):**

```
SVM Clusters: [ 0, 1, 2, 0, 1, 2, ... ] (150 integers)
KNN Clusters: [ 0, 1, 2, 0, 1, 2, ... ]
K-Means Clusters: [ 0, 1, 2, 0, 1, 2, ... ]
Random Forest Clusters: [ 0, 0, 2, 0, 0, 2, ... ]

=== Cluster Distribution ===
SVM: { 0: ~50, 1: ~50, 2: ~50 }
KNN: { 0: ~50, 1: ~50, 2: ~50 }
K-Means: { 0: ~50, 1: ~50, 2: ~50 }
Random Forest: { 0: ~50, 1: ~50, 2: ~50 }
```

- **Reading the output:**
  - **`Clusters` arrays** — each entry is a cluster index for the corresponding data point. Because the dataset has 150 points divided evenly among three centers, each cluster should contain roughly 50 points.
  - **`Cluster Distribution` histograms** — the exact counts. For well-separated data, all three counts should be close to 50, with small variation because of the random noise.
  - **Agreement between algorithms** — since the data is trivially separable, all four algorithms should produce essentially the same partition. The cluster *labels* may differ (one algorithm may call the "center A" group cluster 0, another may call it cluster 2), but the *grouping* should be identical up to relabeling.
  - **K-Nearest Neighbors** — the KNN result is a *smoothed* version of the K-Means result. It should be nearly identical to K-Means on this clean dataset. On noisy data, the difference would be visible.
  - **Random Forest** — may produce slightly less balanced clusters because the proximity matrix is a non-parametric similarity, not a geometric one. On clean data, the difference is small.

- **Reading the individual algorithms:**

  - **K-Means:**
    - Initializes centroids with k-means++ (probabilistic seeding spread out across the data).
    - Iterates assignment / update up to 100 times, with a convergence tolerance of 0.001 (centroid shift).
    - Handles empty clusters by keeping the old centroid.
    - Returns `{ clusters, centroids, groups }` — `groups` is the array of points per cluster.

  - **KNN:**
    - First runs `kmeans(data, numClusters)`.
    - For each point, finds its `k` nearest neighbors and takes a majority vote of their K-Means labels.
    - Returns `{ clusters, groups }`.
    - This is not standard KNN classification — it's a label-smoothing step. It is useful when the K-Means boundaries are jagged due to noise.

  - **SVM (kernel method):**
    - For `numClusters === 2`, dispatches to `_binarySVMClustering` — a PCA-based split.
    - For `numClusters > 2`, dispatches to `_spectralClustering` — an RBF kernel similarity + normalized Laplacian + power-iteration eigenvectors + K-Means on the embedded points.
    - Returns `{ clusters, groups }`.

  - **Random Forest:**
    - Builds `numTrees` unsupervised trees on bootstrap samples.
    - Each tree splits on random features with random thresholds, chosen to maximize a balance × variance-reduction score.
    - Records leaf co-occurrence in a proximity matrix.
    - Runs K-Means on the proximity matrix (as a feature vector per point).
    - Returns `{ clusters, centroids, groups }`.

- **Coding example:** as shown. The demo prints both the raw cluster arrays and the histograms.

- **Common pitfalls:**
  - **The SVM method is not an actual SVM.** It does not train a classifier or find a maximal-margin hyperplane. It is an *SVM-like* clustering routine: for 2 clusters it uses a PCA split (a heuristic), and for more clusters it uses spectral clustering with an RBF kernel (which is what an RBF SVM would implicitly do in feature space). The method name reflects the kernel choice, not the algorithm.
  - **The KNN method is not standard KNN classification.** It does not classify new points. It refines existing K-Means cluster labels by neighbor voting. Use it as a post-processing step, not as a standalone classifier.
  - **The Random Forest is unsupervised.** It does not predict labels; it builds trees that partition the data, then uses the co-occurrence in leaves as a similarity. This is *not* the standard supervised Random Forest. It is closer to the Random Forest proximity method used in Anomaly Detection (e.g. Isolation Forest).
  - **Randomness everywhere.** None of the four methods takes a seed. Different runs will produce different cluster assignments, especially when the data is not well-separated. To make the demo reproducible, wrap it with a seeded RNG or average over multiple runs.
  - **`k = 3` is chosen upfront.** All four methods require the number of clusters as an input. If you don't know the right `k`, you need a model-selection step (elbow method, silhouette score, gap statistic). The library does not provide these.
  - **The output is only meaningful if the data is clusterable.** On random uniform data, all four methods will produce arbitrary partitions. The demo uses three well-separated centers, so clustering is meaningful.
  - **The demo's console output is long.** Each cluster assignment array has 150 numbers. In a real application you would write the results to a file or plot them, not print them.

## What the Example Proves

The single example in this manual exercises all four clustering algorithms on the same dataset:

| Step | What it proves |
|---|---|
| 1. `generateSampleData` | The synthetic data generator produces well-separated clusters. |
| 2. `kmeans(data, 3)` | K-Means converges and produces balanced clusters. |
| 3. `knn(data, 5, 3)` | KNN refinement runs on top of K-Means and produces a similar partition. |
| 4. `svm(data, 3)` | The SVM method dispatches to spectral clustering and produces a partition. |
| 5. `randomForest(data, 3, 10, 5)` | The Random Forest proximity method produces a partition. |
| 6. Histogram comparison | All four partitions are balanced on the synthetic data. |

If the demo runs and produces balanced histograms, the ML library is verified for its intended use — clustering on small, well-separated datasets.

---

## Extending the Example

### 1. Vary the number of clusters

The demo hard-codes `k = 3`. Try different values:

```javascript
for (const k of [2, 3, 4, 5]) {
  const kmeans = ml.kmeans(data, k);
  const hist = kmeans.clusters.reduce((a, c) => { a[c] = (a[c] || 0) + 1; return a; }, {});
  console.log(`k=${k}:`, hist);
}
```

This is the beginning of the **elbow method** — plot the within-cluster sum of squared errors against `k` and look for the "elbow".

### 2. Use your own data

The library is agnostic to where the data comes from. To cluster real data:

```javascript
const myData = [
  [1.2, 3.4],
  [1.1, 3.3],
  [8.5, 9.1],
  // ...
];
const { clusters } = ml.kmeans(myData, 2);
```

Points can have any number of dimensions, not just 2.

### 3. Add a silhouette score

The library does not provide cluster-quality metrics. A silhouette score measures how well each point fits its assigned cluster:

```javascript
function silhouette(data, clusters) {
  const n = data.length;
  const scores = [];
  for (let i = 0; i < n; i++) {
    const sameCluster = [];
    const otherClusters = {};
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = ml._euclideanDistance(data[i], data[j]);
      if (clusters[j] === clusters[i]) sameCluster.push(d);
      else (otherClusters[clusters[j]] = otherClusters[clusters[j]] || []).push(d);
    }
    const a = sameCluster.reduce((s, v) => s + v, 0) / (sameCluster.length || 1);
    const b = Math.min(...Object.values(otherClusters).map(arr => arr.reduce((s, v) => s + v, 0) / arr.length));
    scores.push((b - a) / Math.max(a, b));
  }
  return scores.reduce((s, v) => s + v, 0) / n;
}
```

Values near +1 mean good clustering; near 0 means overlapping clusters; negative means misassignment.

### 4. Seed the RNG for reproducibility

The library uses `Math.random()` directly. To make runs reproducible, temporarily override `Math.random`:

```javascript
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const origRandom = Math.random;
Math.random = rand;
try {
  // ... run the clustering ...
} finally {
  Math.random = origRandom;
}
```

This is a hack, but it works. A cleaner version would add a seed option to each method.

### 5. Compare with an external library

To validate the CaroLab implementations, compare against `ml-kmeans`, `ml-knn`, or `scikit-learn` (via Python subprocess). The cluster assignments should agree up to relabeling.

### 6. Visualize the clusters

The data is 2-D, so it can be plotted directly. Use any plotting library (Chart.js, Plotly, D3) to scatter the points with colors indicating cluster assignment. This is the fastest way to spot whether the algorithms are working.

### 7. Speed up the SVM and RF paths

The spectral clustering in `_spectralClustering` builds an `n × n` matrix and runs `k` power iterations on it. For `n = 150`, this is fast. For `n = 5000`, it is slow and memory-intensive. Options:

- **Sparse kernels:** Only keep the `k` largest entries per row.
- **Nyström approximation:** Sample a subset of columns of the kernel matrix.
- **Landmark-based spectral clustering:** Use a small subset of points to build the Laplacian.

None of these are in the current library; they would be natural extensions.

### 8. Handle high-dimensional data

The library's distance metric is Euclidean. For very high-dimensional data (e.g. text embeddings), Euclidean distance loses discriminative power. Consider:

- **Cosine distance** for normalized vectors.
- **Mahalanobis distance** when the covariance is known.
- **Dimensionality reduction** (PCA, t-SNE, UMAP) before clustering.

The library does not provide these; they would be straightforward additions.

### 9. Add supervised methods

The library is entirely unsupervised. To extend it to supervised learning, you would add:

- **KNN classifier** — predict a label by majority vote among the `k` nearest labelled points.
- **Decision tree classifier** — recursive split with a purity criterion.
- **Random Forest classifier** — bag of decision trees with majority vote.
- **SVM classifier** — quadratic program with hinge loss.

None are in the library. The Random Forest method is *unsupervised* — a different (and simpler) algorithm.

### 10. Pipeline with CaroLab control libraries

The ML library naturally pairs with the control libraries. Two examples:

- **Anomaly detection on telemetry.** Use `kmeans` to cluster normal operating states, then flag points that are far from any centroid as anomalies.
- **Fuzzy rule learning.** Cluster input-output data, then use the cluster centroids as initial membership function centers for a `FuzzySystem`.

Both would be short scripts combining two CaroLab libraries.

### 11. Parallelize the Random Forest

`randomForest(data, k, numTrees, maxDepth)` is embarrassingly parallel — each tree is independent. In Node, use worker threads or `Promise.all` with `setImmediate` to overlap tree building.

### 12. Add a confusion matrix

The library does not have labels, so a confusion matrix is not applicable. But you can compare two clusterings with a contingency table:

```javascript
function contingency(clustersA, clustersB) {
  const table = {};
  for (let i = 0; i < clustersA.length; i++) {
    const a = clustersA[i], b = clustersB[i];
    table[a] = table[a] || {};
    table[a][b] = (table[a][b] || 0) + 1;
  }
  return table;
}
```

This shows which clusters in algorithm A correspond to which clusters in algorithm B.

---

## Troubleshooting

The following issues are the most common when running the demo.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '../caro.ml-1.0.js'` | Demo not in a subfolder, or wrong relative path | Move the demo into a subfolder next to the library, or adjust the path |
| All points assigned to one cluster | Data is not clusterable, or `k = 1` | Check the data; ensure `k >= 2` |
| Two algorithms give different cluster labels | Expected — cluster labels are arbitrary | Compare the *partition* (which points are together), not the labels |
| Empty clusters in the output | K-Means centroid unlucky initialization | The library keeps old centroid on empty cluster; retry with a different seed |
| `kmeans` never converges | Tolerance too small, or iteration limit too low | Increase `maxIterations`, or relax `tolerance` |
| `randomForest` takes a long time | `n²` proximity matrix | Reduce `n` or `numTrees` |
| `svm` fails on `numClusters = 2` | Unexpected data shape | Check that data is a non-empty array of equal-length arrays |
| All four algorithms produce random-looking results | Data is uniformly random, not clustered | Use `generateSampleData` for testing, or provide structured data |
| `Cannot read property 'reduce' of undefined` | The clustering method returned `undefined` | Check the method signature; `svm` and `knn` accept `(data, k, numClusters)` and `(data, k, numClusters)` respectively — verify the call |
| `_spectralClustering` produces NaN | Zero-degree nodes in the Laplacian | Add a small epsilon to the degree, or filter isolated points |
| Memory error on large `n` | `n × n` matrices in SVM/RF paths | Subsample, or use a sparse implementation |
| `ml_examples.js` crashes at `ml.svm(data_points, 3)` | Signature expects `(data, numClusters, kernel, gamma, C)` — `3` is the number of clusters | This is correct; `svm` with 3 clusters dispatches to `_spectralClustering` |
| `ml.svm(data_points, 2, 'rbf', 1, 1)` produces only 2 clusters | Correct — 2-cluster path uses PCA split | Use `numClusters > 2` for spectral clustering |

If a failure is not listed here, the fastest diagnostic is usually to run the demo and check which clustering algorithm fails first.

---

## Closing Notes

The `caro.ml-1.0.js` library is a dependency-free collection of four clustering algorithms, each implemented from scratch. It fits the same design philosophy as the rest of the CaroLab toolkit: small, readable, works in Node and the browser.

The single example in this manual demonstrates all four algorithms on the same synthetic dataset. On well-separated data, all four produce balanced clusters.

The library is intended for small to medium datasets where the O(n²) or O(n² log n) cost of spectral clustering and proximity-based clustering is acceptable. For larger datasets, subsample or use a specialized library.

The ML library is a natural complement to the control libraries: wherever you have unlabelled data (system identification, fault detection, state clustering), the ML library gives you a first-pass grouping.

The library fits alongside the rest of the CaroLab ecosystem:

- **caro.matrix-1.0.js** — matrices and linear algebra.
- **caro.linear-1.0.js** — polynomial roots and fitting.
- **caro.statistics-1.0.js** — descriptive statistics and time series.
- **caro.dsp-1.0.js** — signal generation, filtering, and spectral analysis.
- **caro.compensator-1.0.js** — classical control.
- **caro.manipulator-1.0.js** — robot kinematics, dynamics, control.
- **caro.fuzzy-1.0.js** — fuzzy inference and fuzzy PID.
- **caro.anfis-1.0.js** — adaptive neuro-fuzzy inference.
- **caro.ga-1.0.js** — genetic algorithm.
- **caro.dip-1.0.js** — digital image processing.

---

*End of document.*
