// velocity/PrintVec.js
function printVec(label, v, decimals = 4) {
  const width = decimals + 4;
  const formatted = v.map(x => x.toFixed(decimals).padStart(width));
  console.log(label.padEnd(12) + "[" + formatted.join(", ") + "]");
}

function printVecPair(labelA, a, labelB, b, decimals = 4) {
  const width = decimals + 4;
  const fa = a.map(x => x.toFixed(decimals).padStart(width));
  const fb = b.map(x => x.toFixed(decimals).padStart(width));
  const pad = Math.max(labelA.length, labelB.length) + 2;
  console.log(labelA.padEnd(pad) + "[" + fa.join(", ") + "]");
  console.log(labelB.padEnd(pad) + "[" + fb.join(", ") + "]");
}

module.exports = { printVec, printVecPair };