// Feeding the Observer into Impedance Control

const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

// Scenario: patient grabs the tool and applies 15 N along X
const s = {
  q: [0.3, -0.5, 0.7, 0.1, 0.4, -0.2],
  qd: new Array(6).fill(0),
  tau: [/* measured motor torques with patient force included */]
};

// Step 1: estimate external wrench from motors only
const obs = arm.momentumObserver(s, { Ko: 30, dt: 0.005, model });

// Step 2: use the estimate as if it were a real F/T reading
const cmd = arm.impedanceControl(
  {
    q: s.q,
    qd: s.qd,
    xRef: arm._fkPose(model, s.q),   // hold current pose
    Fext: obs.Fext                    // ← estimated, not measured!
  },
  { Md: [5,5,5,0.5,0.5,0.5],
    Dd: [150,150,150,15,15,15],
    Kd: [800,800,800,40,40,40],
    model }
);

console.log("Estimated wrench  :", obs.Fext.map(v => v.toFixed(2)));
console.log("Commanded torques :", cmd.tau.map(v => v.toFixed(3)));