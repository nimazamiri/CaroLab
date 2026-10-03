/* =========================================================
 *  CaroLab - ML Library Examples
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

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
