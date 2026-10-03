/*
 * neuroFuzzyPID_demo.js
 *   node neuroFuzzyPID_demo.js
 * Needs anfis.js, fuzzyPID.js and neuroFuzzyPID.js in the same folder.
 */
'use strict';
const { NeuroFuzzyPID } = require('./neuroFuzzyPID.js');
const { AdaptiveFuzzyPID } = require('./fuzzyPID.js');
const { ANFIS } = require('./anfis.js');

/* ============================================================ *
 * 1) Train a NeuroFuzzyPID to imitate an existing AdaptiveFuzzyPID
 *    (fuzzyPID.js), then compare closed-loop behavior.
 * ============================================================ */
function demo1() {
  console.log('=== 1) NeuroFuzzyPID trained from an AdaptiveFuzzyPID "teacher" ===');
  const teacher = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03, dt: 0.01, eRange: [-2, 2], ecRange: [-2, 2] });

  const { student, history } = NeuroFuzzyPID.trainFromGainSchedule(teacher, {
    eRange: [-2, 2], ecRange: [-2, 2], gridE: 12, gridEC: 12, eTerms: 5, ecTerms: 5, dt: 0.01,
    trainOpts: { epochs: 60, lr: 0.02 },
  });
  console.log('training RMSE: epoch 0 =', history[0].toExponential(3), ' epoch', history.length - 1, '=', history[history.length - 1].toExponential(3));

  // 2nd-order plant: G(s) = 1/(s^2 + 0.5 s + 1), forward Euler
  const dt = 0.01, T = 15, N = Math.round(T / dt);
  function mkPlant() { let y = 0, v = 0; return { step(u) { const a = u - 0.5 * v - 1 * y; v += a * dt; y += v * dt; return y; } }; }
  function run(ctrl, disturbAt) {
    const plant = mkPlant(); let y = 0; const ys = [];
    for (let k = 0; k < N; k++) {
      const t = k * dt, ref = 1;
      let e = ref - y;
      if (disturbAt && t >= disturbAt) e -= 0.3;
      const u = ctrl.step(e, dt); y = plant.step(u); ys.push(y);
    }
    return ys;
  }
  teacher.reset(); student.reset();
  const ysTeacher = run(teacher, 8);
  const ysStudent = run(student, 8);
  console.log('teacher error at t=10s (after disturbance):', (1 - ysTeacher[1000]).toFixed(4));
  console.log('student (neuro-fuzzy) error at t=10s        :', (1 - ysStudent[1000]).toFixed(4));
  console.log('(student is a compact, trained stand-in for the teacher\'s gain surface, not necessarily identical closed-loop behavior)');
}

/* ============================================================ *
 * 2) "Evidence": reproduce the training idea of Budiharto et al. 2010 —
 *    an ANFIS trained on a small hand-written rule table (their Table 1,
 *    15 of 45 possible input combinations) learns to reproduce the mapping
 *    from (line position, robot status) to (left wheel, right wheel) speed.
 *    This is NOT a robot simulation — it only checks that anfis.js's
 *    training loop really does learn a rule table, the way their Fig. 9
 *    (error -> ~0 by epoch ~62) illustrates for their own ANFIS.
 * ============================================================ */
function demo2() {
  console.log('\n=== 2) Evidence: anfis.js learning a hand-written rule table (Budiharto et al. 2010, Table 1) ===');
  // encodings: x position TL=-2,L=-1,C=0,R=1,TR=2,S=3 ; z status NL=0,L=1,F=2 (y="face detected" fixed at ND=0 for rules 1-7,10-15; D=1 only in rules 8-9)
  // outputs VL,VR encoded 0 / 0.5(PS) / 1(PB)
  const rows = [
    // x,   y, z,    VL,  VR
    [0, 0, 0, 0, 0],       // 1  C  ND NL -> stop
    [0, 0, 1, 0.5, 0.5],   // 2  C  ND L
    [-1, 0, 1, 0.5, 0],    // 3  L  ND L
    [-2, 0, 1, 1, 0],      // 4  TL ND L
    [1, 0, 1, 0, 0.5],     // 5  R  ND L
    [2, 0, 1, 0, 1],       // 6  TR ND L
    [3, 0, 1, 0, 0],       // 7  S  ND L
    [3, 1, 1, 0, 0],       // 8  S  D  L  (giving order)
    [3, 1, 0, 1, 0],       // 9  S  D  NL (return back)
    [0, 0, 2, 0.5, 0.5],   // 10 C  ND F
    [-1, 0, 2, 0.5, 0],    // 11 L  ND F
    [-2, 0, 2, 1, 0],      // 12 TL ND F
    [1, 0, 2, 0, 0.5],     // 13 R  ND F
    [2, 0, 2, 0, 1],       // 14 TR ND F
    [3, 0, 2, 0, 0],       // 15 S  ND F
  ];
  // Deliberately coarser than a 1-rule-per-row lookup (which the hybrid LSE step would just
  // invert exactly in epoch 0, giving a flat, uninformative curve): 3x2x2 = 12 Gaussian-grid
  // rules have to be shared across the 15 rows, so there is real approximation error for the
  // gradient-descent premise tuning to reduce epoch by epoch, the way their Fig. 9 shows.
  const net = new ANFIS({
    ranges: [[-2, 3], [0, 1], [0, 2]], nMFs: [3, 2, 2],
    outputNames: ['VL', 'VR'],
  });
  const data = rows.map(r => ({ x: [r[0], r[1], r[2]], y: [r[3], r[4]] }));

  const { history } = net.train(data, { epochs: 150, lr: 0.05 });
  const milestones = [0, 9, 19, 39, 61, history.length - 1];
  console.log('epoch : rmse  (their Fig. 9 shows a similar curve, "best error" flattening out around epoch 62)');
  for (const e of milestones) if (history[e] !== undefined) console.log(' ', String(e).padStart(3), ':', history[e].toExponential(3));

  console.log('\nlearned vs. table, a few rules:');
  for (const i of [0, 3, 8, 12]) {
    const [x, y, z, VL, VR] = rows[i];
    const pred = net.evaluate([x, y, z]);
    console.log(`  rule ${i + 1}: table (VL,VR)=(${VL},${VR})  ->  learned (VL,VR)=(${pred.VL.toFixed(3)}, ${pred.VR.toFixed(3)})`);
  }
}

if (require.main === module) { demo1(); demo2(); }
