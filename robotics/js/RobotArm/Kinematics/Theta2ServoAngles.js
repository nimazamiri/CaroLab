const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

const q = [0.0, Math.PI/2, -Math.PI/4, 0.0, Math.PI/3, 0.0];
const servo = arm.theta2servoAngles(...q);

console.log("Joint rad :", q.map(x => x.toFixed(2)));
console.log("Servo deg :", servo.map(x => x.toFixed(1)));

const P1 = [0.35, 0.00, 0.35];
const P2 = [0.45, 0.10, 0.45];

const linePath = arm.pathTracking(P1, P2, "line", { steps: 5 });

linePath.forEach((wp, i) => {
  console.log(`step ${i}: p=[${wp.p.map(x => x.toFixed(3)).join(", ")}]  q=[${wp.q.map(x => x.toFixed(2)).join(", ")}]`);
});
