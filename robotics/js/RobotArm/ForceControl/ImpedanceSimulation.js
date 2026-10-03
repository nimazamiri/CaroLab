const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function simulateImpedance(arm, seconds = 5, dt = 0.005) {
  const model = arm.DH_Lib.puma01;

  // --- reference path: move 10 cm in X with a sinusoid in Z ---
  const waypoints = arm.pathTracking([0.35,0,0.35], [0.45,0,0.35], "line", {steps: 5});
  const traj = arm.timeParameterize(waypoints, { method: "quintic", dt, vMax: 0.8, aMax: 4 });

  // --- initial state ---
  let q  = [0.3, -0.5, 0.7, 0.1, 0.4, -0.2];
  let qd = new Array(6).fill(0);
  //const M  = arm.dynamics ?? model.map(() => ({ m: 5, r: [0,0,0], I: arm._diag3(0.05,0.05,0.05) }));
  const M = arm.dynamics != null 
	  ? arm.dynamics 
	  : model.map(() => ({ m: 5, r: [0,0,0], I: arm._diag3(0.05,0.05,0.05) }));
  const MinvDiag = M.map(l => 1 / l.m);   // crude diagonal joint-space inertia

  const log = [];

  for (let k = 0; k < Math.floor(seconds / dt) && k < traj.length; k++) {
    const ref = traj[k];
    const xRef = arm._fkPose(model, ref.q);
    const xdRef = arm._mat_vec(arm.jacobian(model, ref.q), ref.qd);

    // --- external disturbance: 5 N bump for 1 s, starting at t=2 s ---
    const t = k * dt;
    const Fext = (t > 2 && t < 3) ? [5, 0, 0, 0, 0, 0] : [0,0,0,0,0,0];

    // --- controller ---
    const cmd = arm.impedanceControl(
      { q, qd, xRef, xdRef, Fext },
      { Md: [5,5,5,0.5,0.5,0.5],
        Dd: [150,150,150,15,15,15],
        Kd: [800,800,800,40,40,40],
        model }
    );

    // --- fake plant: q̈ = τ / M + noise ---
    const qdd = cmd.tau.map((T, i) => T * MinvDiag[i] + 0.001 * (Math.random() - 0.5));

    qd = qd.map((v, i) => v + qdd[i] * dt);
    q  = q .map((v, i) => v + qd[i]  * dt);

    if (k % 50 === 0) {
      const xNow = arm._fkPose(model, q);
      log.push({ t, xErr: xRef[0] - xNow[0], x: xNow[0], xRef: xRef[0] });
    }
  }

  return log;
}

const log = simulateImpedance(new Manipulator());
console.log("  t     xRef    x       error");
log.forEach(r =>
  console.log(`${r.t.toFixed(2)}  ${r.xRef.toFixed(3)}  ${r.x.toFixed(3)}  ${r.xErr.toFixed(4)}`)
);






