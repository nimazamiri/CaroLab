const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// closed loop
const G = c.tf([1], [1, 3, 2]);
const Cs = c.tf([10], [1]);
const sys = c.closeLoop(G, Cs);

// stability
const sa = c.stabilityAnalysis(c.tf([1], [1,2,3,4,5]));
ok('unstable classified', sa.classification === 'unstable' && sa.rhpPoleCount === 2, sa.summary);
const sa2 = c.stabilityAnalysis(sys); ok('stable', sa2.stable, sa2.summary);
console.log(sa2.openLoopMargins.phaseMargin);