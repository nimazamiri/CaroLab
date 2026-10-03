// ISO/TS 15066 force limits
// Add to _safetyCheck:
if (gains.iso15066) {
  const bodyRegion = gains.bodyRegion ?? "hand";   // "hand", "arm", "torso"
  const Fmax = { hand: 140, arm: 220, torso: 260 }[bodyRegion];
  const estimatedFmax = gains.Kd?.[0] * 0.01;      // worst-case at 1 cm deflection
  if (estimatedFmax > Fmax) {
    issues.push(`Kd too stiff for ${bodyRegion}: ${estimatedFmax.toFixed(0)} N > ${Fmax} N`);
  }
}

// speed and separation monitoring
// In the outer control loop:
const humanDistance = getHumanDistance();          // from safety scanner
const vScale = Math.min(1, Math.max(0, (humanDistance - 0.1) / 0.5));
const qdRef = velocityLimited(rawQd, vMax.map(v => v * vScale));

// power and force limitting 
if (Math.abs(out.observer.Pflow) > 100) {   // 100 W threshold
  console.warn(`High interaction power: ${out.observer.Pflow.toFixed(1)} W`);
  // Trigger protective stop if sustained
}

// task-space singularity handling
const J = arm.jacobian(model, state.q);
const w = arm._manipulability(J);
if (w < 0.01) {
  // near singularity: freeze admittance output
  out.xMod = persistent.xMod;
  out.xdMod = new Array(6).fill(0);
}

