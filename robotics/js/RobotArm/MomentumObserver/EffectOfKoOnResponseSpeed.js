//Effect of K_o on response speed

function convergenceTest(Ko) {
  const Manipulator = require("../caro.manipulator-1.0");
  const arm = new Manipulator();
  const model = arm.DH_Lib.puma01;
  const q = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
  const qd = new Array(6).fill(0);
  const J = arm.jacobian(model, q);
  const trueForce = [15, 0, 0, 0, 0, 0];
  const tauG = arm.rne(q, qd, new Array(6).fill(0));
  const tauExt = J[0].map((_, i) =>
    J.reduce((s, row, r) => s + row[i] * trueForce[r], 0)
  );
  const tauMeas = tauG.map((v, i) => v + tauExt[i]);

  let mem = null;
  for (let k = 0; k < 200; k++) {
    const out = arm.momentumObserver(
      { q, qd, tau: tauMeas },
      { Ko, dt: 0.005, model, memory: mem }
    );
    mem = out.memory;
    if (out.Fext[0] > 13.5) return k * 0.005;   // time to reach 90%
  }
  return null;
}

for (const Ko of [5, 10, 30, 60, 120]) {
  const t = convergenceTest(Ko);
  console.log(`Ko = ${String(Ko).padStart(3)}  → 90% in ${t ? t.toFixed(3) : ">1.0"} s`);
}


/*
Ko =   5  → 90% in 0.590 s
Ko =  10  → 90% in 0.300 s
Ko =  30  → 90% in 0.105 s
Ko =  60  → 90% in 0.055 s
Ko = 120  → 90% in 0.030 s
*/