/* =========================================================
 *  CaroLab - Machine Learning Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

class ML {
  constructor() {
    this.data = [];
  }

  // ==================== K-MEANS CLUSTERING ====================
  kmeans(data, k = 3, maxIterations = 100, tolerance = 0.001) {
    if (data.length === 0) return { clusters: [], centroids: [] };
    
    // Initialize centroids randomly
    let centroids = this._initializeCentroids(data, k);
    let clusters = [];
    let oldCentroids = [];
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      clusters = Array.from({ length: k }, () => []);
      
      for (const point of data) {
        let minDist = Infinity;
        let closestCentroid = 0;
        
        for (let i = 0; i < centroids.length; i++) {
          const dist = this._euclideanDistance(point, centroids[i]);
          if (dist < minDist) {
            minDist = dist;
            closestCentroid = i;
          }
        }
        
        clusters[closestCentroid].push(point);
      }
      
      // Update centroids
      oldCentroids = centroids.map(c => [...c]);
      centroids = clusters.map((cluster, i) => {
        if (cluster.length === 0) return oldCentroids[i];
        const dims = cluster[0].length;
        const newCentroid = Array(dims).fill(0);
        
        for (const point of cluster) {
          for (let d = 0; d < dims; d++) {
            newCentroid[d] += point[d];
          }
        }
        
        return newCentroid.map(v => v / cluster.length);
      });
      
      // Check convergence
      let maxShift = 0;
      for (let i = 0; i < k; i++) {
        maxShift = Math.max(maxShift, this._euclideanDistance(oldCentroids[i], centroids[i]));
      }
      
      if (maxShift < tolerance) break;
    }
    
    // Return cluster labels for each point
    const labels = data.map(point => {
      let minDist = Infinity;
      let closest = 0;
      for (let i = 0; i < centroids.length; i++) {
        const dist = this._euclideanDistance(point, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    });
    
    return { clusters: labels, centroids, groups: clusters };
  }

  // ==================== K-NEAREST NEIGHBORS ====================
  knn(data, k = 3, numClusters = 3) {
    // KNN for clustering: use KNN to smooth cluster assignments
    // First, get initial clusters using K-Means
    const { clusters } = this.kmeans(data, numClusters);
    
    // Refine clusters using KNN voting
    const refinedClusters = data.map((point, idx) => {
      const neighbors = this._findKNearest(data, point, k, idx);
      
      // Vote among neighbors
      const votes = {};
      for (const neighborIdx of neighbors) {
        const cluster = clusters[neighborIdx];
        votes[cluster] = (votes[cluster] || 0) + 1;
      }
      
      // Return most voted cluster
      let maxVotes = 0;
      let bestCluster = clusters[idx];
      for (const [cluster, count] of Object.entries(votes)) {
        if (count > maxVotes) {
          maxVotes = count;
          bestCluster = parseInt(cluster);
        }
      }
      
      return bestCluster;
    });
    
    // Group points by cluster
    const groups = {};
    refinedClusters.forEach((cluster, idx) => {
      if (!groups[cluster]) groups[cluster] = [];
      groups[cluster].push(data[idx]);
    });
    
    return { clusters: refinedClusters, groups };
  }

  // ==================== SUPPORT VECTOR MACHINE ====================
  svm(data, numClusters = 2, kernel = 'rbf', gamma = 1, C = 1) {
    // For clustering, use One-Class SVM approach or spectral-like clustering
    // Simplified: Use RBF kernel similarity to build affinity matrix, then cluster
    
    if (numClusters === 2) {
      return this._binarySVMClustering(data, kernel, gamma, C);
    }
    
    // Multi-cluster: use spectral clustering with SVM-like kernel
    return this._spectralClustering(data, numClusters, gamma);
  }

  _binarySVMClustering(data, kernel, gamma, C) {
    const n = data.length;
    
    // Build kernel matrix
    const K = Array.from({ length: n }, () => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = this._kernelFunction(data[i], data[j], kernel, gamma);
      }
    }
    
    // Simple heuristic: split by first principal component direction
    const mean = this._mean(data);
    const centered = data.map(p => p.map((v, i) => v - mean[i]));
    
    // Power iteration for first principal component
    let pc = Array(data[0].length).fill(1).map(() => Math.random());
    
    for (let iter = 0; iter < 50; iter++) {
      const newPc = Array(pc.length).fill(0);
      for (const point of centered) {
        const dot = point.reduce((s, v, i) => s + v * pc[i], 0);
        for (let i = 0; i < point.length; i++) {
          newPc[i] += dot * point[i];
        }
      }
      const norm = Math.sqrt(newPc.reduce((s, v) => s + v * v, 0)) || 1;
      pc = newPc.map(v => v / norm);
    }
    
    // Project and split at median
    const projections = centered.map(point => 
      point.reduce((s, v, i) => s + v * pc[i], 0)
    );
    
    const sorted = [...projections].sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length / 2)];
    
    const clusters = projections.map(p => p < threshold ? 0 : 1);
    
    const groups = { 0: [], 1: [] };
    clusters.forEach((c, i) => groups[c].push(data[i]));
    
    return { clusters, groups };
  }

  _spectralClustering(data, k, gamma) {
    const n = data.length;
    
    // Build similarity matrix (RBF kernel)
    const W = Array.from({ length: n }, () => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        W[i][j] = Math.exp(-gamma * Math.pow(this._euclideanDistance(data[i], data[j]), 2));
      }
    }
    
    // Degree matrix
    const D = W.map(row => row.reduce((s, v) => s + v, 0));
    
    // Normalized Laplacian: L = I - D^(-1/2) W D^(-1/2)
    const L = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        L[i][j] = (i === j ? 1 : 0) - W[i][j] / Math.sqrt(D[i] * D[j] || 1);
      }
    }
    
    // Find first k eigenvectors (simplified power iteration on L)
    const eigenvectors = [];
    let Lcopy = L.map(row => [...row]);
    
    for (let e = 0; e < k; e++) {
      let v = Array(n).fill(0).map(() => Math.random());
      
      for (let iter = 0; iter < 100; iter++) {
        const newV = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            newV[i] += Lcopy[i][j] * v[j];
          }
        }
        const norm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0)) || 1;
        v = newV.map(x => x / norm);
      }
      
      eigenvectors.push(v);
      
      // Deflate
      const eigenvalue = v.reduce((s, x, i) => {
        let Lv = 0;
        for (let j = 0; j < n; j++) Lv += Lcopy[i][j] * v[j];
        return s + x * Lv;
      }, 0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Lcopy[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }
    
    // Embed points in eigenspace
    const embedded = data.map((_, i) => eigenvectors.map(ev => ev[i]));
    
    // Run K-Means on embedded points
    return this.kmeans(embedded, k);
  }

  // ==================== RANDOM FOREST ====================
  randomForest(data, numClusters = 3, numTrees = 10, maxDepth = 5) {
    // Random Forest for clustering: use proximity-based clustering
    // Build random trees that partition the data, then cluster based on co-occurrence
    
    const n = data.length;
    const proximity = Array.from({ length: n }, () => Array(n).fill(0));
    
    for (let t = 0; t < numTrees; t++) {
      // Bootstrap sample
      const bootstrapIndices = [];
      for (let i = 0; i < n; i++) {
        bootstrapIndices.push(Math.floor(Math.random() * n));
      }
      
      // Build a random tree (unsupervised splitting)
      const tree = this._buildRandomTree(data, bootstrapIndices, maxDepth);
      
      // Get leaf assignments
      const leafAssignments = data.map(point => this._getLeafId(tree, point));
      
      // Update proximity matrix
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (leafAssignments[i] === leafAssignments[j]) {
            proximity[i][j]++;
            proximity[j][i]++;
          }
        }
      }
    }
    
    // Normalize proximity
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        proximity[i][j] /= numTrees;
      }
    }
    
    // Convert proximity to distance
    const distances = proximity.map(row => row.map(p => 1 - p));
    
    // Cluster using proximity-based features
    const embedded = distances.map((row, i) => {
      // Use proximity to all other points as features
      return row;
    });
    
    return this.kmeans(embedded, numClusters);
  }

  _buildRandomTree(data, indices, maxDepth, depth = 0, leafCounter = { id: 0 }) {
    if (depth >= maxDepth || indices.length <= 1) {
      return { type: 'leaf', id: leafCounter.id++ };
    }
    
    const dims = data[0].length;
    const numFeatures = Math.max(1, Math.floor(Math.sqrt(dims)));
    
    // Random feature selection
    const features = [];
    while (features.length < numFeatures) {
      const f = Math.floor(Math.random() * dims);
      if (!features.includes(f)) features.push(f);
    }
    
    // Find best random split
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestScore = -Infinity;
    
    for (const feature of features) {
      const values = indices.map(i => data[i][feature]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      for (let attempt = 0; attempt < 5; attempt++) {
        const threshold = min + Math.random() * (max - min);
        
        const left = indices.filter(i => data[i][feature] < threshold);
        const right = indices.filter(i => data[i][feature] >= threshold);
        
        if (left.length === 0 || right.length === 0) continue;
        
        // Score: balance + variance reduction
        const balance = Math.min(left.length, right.length) / indices.length;
        const variance = this._variance(indices.map(i => data[i][feature]));
        const leftVar = this._variance(left.map(i => data[i][feature]));
        const rightVar = this._variance(right.map(i => data[i][feature]));
        const weightedVar = (left.length * leftVar + right.length * rightVar) / indices.length;
        
        const score = balance * (variance - weightedVar);
        
        if (score > bestScore) {
          bestScore = score;
          bestFeature = feature;
          bestThreshold = threshold;
        }
      }
    }
    
    const leftIndices = indices.filter(i => data[i][bestFeature] < bestThreshold);
    const rightIndices = indices.filter(i => data[i][bestFeature] >= bestThreshold);
    
    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return { type: 'leaf', id: leafCounter.id++ };
    }
    
    return {
      type: 'node',
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildRandomTree(data, leftIndices, maxDepth, depth + 1, leafCounter),
      right: this._buildRandomTree(data, rightIndices, maxDepth, depth + 1, leafCounter)
    };
  }

  _getLeafId(tree, point) {
    if (tree.type === 'leaf') return tree.id;
    if (point[tree.feature] < tree.threshold) {
      return this._getLeafId(tree.left, point);
    }
    return this._getLeafId(tree.right, point);
  }

  // ==================== HELPER METHODS ====================
  _euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  _initializeCentroids(data, k) {
    const centroids = [];
    const used = new Set();
    
    // K-Means++ initialization
    centroids.push([...data[Math.floor(Math.random() * data.length)]]);
    
    for (let i = 1; i < k; i++) {
      const distances = data.map(point => {
        let minDist = Infinity;
        for (const c of centroids) {
          minDist = Math.min(minDist, this._euclideanDistance(point, c));
        }
        return minDist * minDist;
      });
      
      const totalDist = distances.reduce((s, d) => s + d, 0);
      let r = Math.random() * totalDist;
      
      for (let j = 0; j < data.length; j++) {
        r -= distances[j];
        if (r <= 0) {
          centroids.push([...data[j]]);
          break;
        }
      }
      
      if (centroids.length <= i) {
        centroids.push([...data[Math.floor(Math.random() * data.length)]]);
      }
    }
    
    return centroids;
  }

  _findKNearest(data, point, k, excludeIdx = -1) {
    const distances = data.map((p, i) => ({
      index: i,
      distance: i === excludeIdx ? Infinity : this._euclideanDistance(point, p)
    }));
    
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, k).map(d => d.index);
  }

  _kernelFunction(a, b, kernel, gamma) {
    switch (kernel) {
      case 'linear':
        return a.reduce((s, v, i) => s + v * b[i], 0);
      case 'poly':
        return Math.pow(a.reduce((s, v, i) => s + v * b[i], 0) + 1, 3);
      case 'rbf':
      default:
        return Math.exp(-gamma * Math.pow(this._euclideanDistance(a, b), 2));
    }
  }

  _mean(data) {
    const dims = data[0].length;
    const mean = Array(dims).fill(0);
    for (const point of data) {
      for (let i = 0; i < dims; i++) {
        mean[i] += point[i];
      }
    }
    return mean.map(v => v / data.length);
  }

  _variance(values) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  }

  // Utility: generate sample 2D data
  generateSampleData(n = 100) {
    const data = [];
    const centers = [[2, 2], [8, 8], [2, 8]];
    
    for (let i = 0; i < n; i++) {
      const center = centers[i % centers.length];
      data.push([
        center[0] + (Math.random() - 0.5) * 2,
        center[1] + (Math.random() - 0.5) * 2
      ]);
    }
    
    return data;
  }
}

module.exports =  ML;



