function rehabilitationControlTick(state, patientIntent, exoModel) {
  // 1. Compute ZMP from current state
  const zmp = computeZMP(state.q, state.qd, state.grf, exoModel);

  // 2. Check if balance is threatened
  const supportPolygon = getSupportPolygon(state.footContacts);
  const zmpMargin = distanceToBoundary(zmp, supportPolygon);

  // 3. Primary task: keep ZMP inside (soft constraint)
  let taskAccel = [0,0,0];  // CoM acceleration reference
  if (zmpMargin < safetyThreshold) {
    // Assist-as-needed: generate corrective CoM trajectory
    taskAccel = hipStrategy(zmp, supportPolygon, state);
  }

  // 4. Nullspace: follow patient's natural gait, minimize effort
  const J = computeCoMJacobian(state.q, exoModel);
  const qd0 = patientIntent.qd;  // whatever the patient is trying to do

  // 5. Zero-impedance when stable, assist when unstable
  const qd = nullspaceControl(J, taskAccel, qd0);

  // 6. Convert to joint torques
  const tau = exoModel.rne(state.q, state.qd, qd)
            + frictionCompensate(state.qd, exoModel.friction)
            + gravityCompensate(state.q, exoModel);

  return tau;
}