const Manipulator = require("../caro.manipulator-1.0");
const arm = new Manipulator();

function pickAndPlace(arm, pickPose, placePose) {
  const log = [];

  // 1. Move to just above the pick point
  const above = [pickPose[0], pickPose[1], pickPose[2] + 0.05];
  const approachPath = arm.pathTracking(above, pickPose, "line", { steps: 5 });
  log.push({ phase: "approach", waypoints: approachPath });

  // 2. Descend, "grip" (open/close not modeled), then lift
  const liftPath = arm.pathTracking(pickPose, above, "line", { steps: 5 });
  log.push({ phase: "lift", waypoints: liftPath });

  // 3. Arc across to above the place point
  const abovePlace = [placePose[0], placePose[1], placePose[2] + 0.05];
  const arcPath = arm.pathTracking(above, abovePlace, "arc", {
    steps: 12,
    arcHeight: 0.10
  });
  log.push({ phase: "transfer", waypoints: arcPath });

  // 4. Descend to place, release, retract
  const placePath = arm.pathTracking(abovePlace, placePose, "line", { steps: 5 });
  const retractPath = arm.pathTracking(placePose, abovePlace, "line", { steps: 5 });
  log.push({ phase: "place", waypoints: placePath });
  log.push({ phase: "retract", waypoints: retractPath });

  return log;
}

const mission = pickAndPlace(
  arm,
  [0.35, -0.10, 0.35],   // pick
  [0.40,  0.15, 0.40]    // place
);

mission.forEach(phase =>
  console.log(`${phase.phase}: ${phase.waypoints.length} waypoints`)
);