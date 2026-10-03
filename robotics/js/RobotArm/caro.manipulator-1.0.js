/* =========================================================
 *  CaroLab - Manipulator Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 * ========================================================= */

class Manipulator {
  constructor() {
    // Default DH library entry (PUMA 560-ish, Craig convention)
    this.DH_Lib = {
      puma01: [
        // [theta, a, d, alpha]
        [0,      0.000,   0.000,  Math.PI / 2],  // link 1
        [0,      0.4318,  0.000,  0.000      ],  // link 2
        [0,     -0.02032, 0.14909,-Math.PI / 2], // link 3
        [0,      0.000,   0.43307, Math.PI / 2], // link 4
        [0,      0.000,   0.000, -Math.PI / 2],  // link 5
        [0,      0.000,   0.05625,0.000      ]   // link 6
      ]
    };
	
	// default model used when callers don't specify one
	this.defaultModel = this.DH_Lib.puma01;
	
    this.gravity = [0, 0, -9.81]; // m/s^2
  }

  /* ---------- 1. DH transform ---------- */
  /**
   * Build one homogeneous transform from DH params.
   * @param  {number} theta  joint angle (rad)
   * @param  {number} a      link length
   * @param  {number} d      link offset
   * @param  {number} alpha  link twist
   * @return {number[][]}    4x4 matrix
   */
  DH(theta, a, d, alpha) {
    const ct = Math.cos(theta), st = Math.sin(theta);
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    return [
      [ct, -st * ca,  st * sa, a * ct],
      [st,  ct * ca, -ct * sa, a * st],
      [ 0,       sa,       ca,      d],
      [ 0,        0,        0,      1]
    ];
  }

  /* ---------- 2. Forward kinematics ---------- */
  /**
   * Forward kinematics.
   *   forwardKin(Ai)               -> Ai is an array of 4x4 matrices
   *   forwardKin(robotModel, q)    -> robotModel = DH_Lib entry, q = joint vector
   *
   * Returns the full 4x4 tool transform AND a flattened
   * [nX,oX,aX,pX, nY,oY,aY,pY, nZ,oZ,aZ,pZ] tuple as in the spec.
   */
  forwardKin(arg1, q = null) {
    let T = this._identity4();

    if (Array.isArray(arg1) && Array.isArray(arg1[0]) && Array.isArray(arg1[0][0])) {
      // case A: list of Ai matrices
      for (const Ai of arg1) T = this._mul4(T, Ai);
    } else if (Array.isArray(arg1) && q !== null) {
      // case B: DH_Lib entry + joint angles
      for (let i = 0; i < arg1.length; i++) {
        const [th0, a, d, al] = arg1[i];
        const Ai = this.DH(th0 + q[i], a, d, al);
        T = this._mul4(T, Ai);
      }
    } else {
      throw new Error("forwardKin: supply either Ai[] or (DH_Lib entry, q)");
    }

    // Flatten to n,o,a,p notation matching the file
    const flat = [
      T[0][0], T[1][0], T[2][0], T[0][3],   // nX,oX,aX,pX  (n = col0, o = col1, a = col2, p = col3)
      T[0][1], T[1][1], T[2][1], T[1][3],
      T[0][2], T[1][2], T[2][2], T[2][3]
    ];
    return { T, flat };
  }

  /* ---------- 3. Inverse kinematics (PUMA analytical) ---------- */
  /**
   * Closed-form PUMA-style IK.
   * @param  {number[]} position   [px, py, pz]
   * @param  {number[][]} orientation  3x3 rotation matrix (n,o,a as columns)
   * @return {number[]}  [θ1..θ6]  (config: righty, elbow-up, wrist non-flip)
   */
  inverseKin(position, orientation) {
    const [px, py, pz] = position;

    // Wrist center = p - d6 * a
    const d6 = this.DH_Lib.puma01[5][2];
    const ax = orientation[0][2], ay = orientation[1][2], az = orientation[2][2];
    const wx = px - d6 * ax;
    const wy = py - d6 * ay;
    const wz = pz - d6 * az;

    // ---- θ1 ----
    const r = Math.hypot(wx, wy);
    const theta1 = Math.atan2(wy, wx) + Math.asin(
      Math.min(1, Math.max(-1, this.DH_Lib.puma01[3][2] / r))
    ); // d4 offset

    // ---- θ3 via law of cosines ----
    const a2 = this.DH_Lib.puma01[1][1];
    const a3 = Math.abs(this.DH_Lib.puma01[2][1]);
    const d4 = this.DH_Lib.puma01[3][2];

    const r2 = wx * wx + wy * wy + wz * wz;
    const cos3 = (r2 - a2 * a2 - a3 * a3 - d4 * d4) / (2 * a2 * a3);
    const theta3 = Math.acos(Math.min(1, Math.max(-1, cos3)));

    // ---- θ2 ----
    const k1 = a2 + a3 * Math.cos(theta3);
    const k2 = a3 * Math.sin(theta3);
    const theta2 = Math.atan2(wz, Math.hypot(wx, wy) - k1)
                 - Math.atan2(k2, k1);

    // ---- Wrist: θ4, θ5, θ6 from R3_6 = R0_3^T * R0_6 ----
    const R03 = this._rotZYX(theta1, theta2, theta3);
    const R36 = this._mul3(this._transpose3(R03), orientation);

    const theta5 = Math.acos(Math.min(1, Math.max(-1, R36[2][2])));
    const theta4 = Math.atan2(R36[1][2], R36[0][2]);
    const theta6 = Math.atan2(R36[2][1], -R36[2][0]);

    return [theta1, theta2, theta3, theta4, theta5, theta6];
  }
  
  /* ---------- 3b. Numerical IK fallback (DLS / Levenberg–Marquardt) ---------- */
	/**
	 * Numerical inverse kinematics with damped least squares.
	 *
	 * @param  {number[]}   position     [x, y, z]  desired tool position
	 * @param  {number[][]} orientation  3x3 desired rotation matrix (n,o,a columns)
	 * @param  {object}     opts
	 *          model      : DH_Lib entry (default this.DH_Lib.puma01)
	 *          q0         : initial guess (default zeros)
	 *          maxIter    : iterations (default 200)
	 *          tol        : pose tolerance (default 1e-6)
	 *          lambda     : initial damping (default 0.05)
	 *          lambdaMin  : (default 1e-6)
	 *          lambdaMax  : (default 1e3)
	 *          stepClamp  : max |Δq| per iter (default 0.3 rad)
	 *          qMin, qMax : joint limits (optional arrays)
	 * @return {object} { q, converged, iterations, error, reason }
	 */
	numericalIK(position, orientation, opts = {}) {
	  //const model    = opts.model     ?? this.DH_Lib.puma01;
	  const model    = opts.model == null ? this.DH_Lib.puma01 : opts.model;
	  const n        = model.length;
	  //const maxIter  = opts.maxIter   ?? 200;
	  const maxIter  = opts.maxIter == null ? 200 : opts.maxIter;
	  //const tol      = opts.tol       ?? 1e-6;
	  const tol      = opts.tol == null ? 1e-6 : opts.tol;
	  //const stepClamp= opts.stepClamp ?? 0.3;
	  const stepClamp= opts.stepClamp == null ? 0.3 : opts.stepClamp;
	  //const qMin     = opts.qMin      ?? null;
	  const qMin     = opts.qMin == null ? null : opts.qMin;	  
	  //const qMax     = opts.qMax      ?? null;
	  const qMax     = opts.qMax == null ? null : opts.qMax;
	  
	  let q = (opts.q0 ? [...opts.q0] : new Array(n).fill(0));
	  //let lambda = opts.lambda    ?? 0.05;
	  let lambda = opts.lambda == null ? 0.05 : opts.lambda;
	  //const lambdaMin = opts.lambdaMin ?? 1e-6;
	  const lambdaMin = opts.lambdaMin == null ? 1e-6 : opts.lambdaMin;
	  //const lambdaMax = opts.lambdaMax ?? 1e3;
	  const lambdaMax = opts.lambdaMax == null ? 1e3 : opts.lambdaMax;

	  // Target as homogeneous matrix
	  const Tdes = this._poseToT(position, orientation);
	  const pd   = position;
	  const Rd   = orientation;

	  let lastErr = Infinity;
	  let iter    = 0;

	  for (; iter < maxIter; iter++) {
		const { T } = this.forwardKin(model, q);
		const p = [T[0][3], T[1][3], T[2][3]];
		const R = [
		  [T[0][0], T[0][1], T[0][2]],
		  [T[1][0], T[1][1], T[1][2]],
		  [T[2][0], T[2][1], T[2][2]]
		];

		// --- Pose error ---
		const ep = [pd[0]-p[0], pd[1]-p[1], pd[2]-p[2]];
		const eo = this._orientationError(R, Rd);   // 3-vector, world frame

		const err = Math.hypot(...ep, ...eo);

		if (err < tol) {
		  return { q, converged: true, iterations: iter, error: err, reason: "tol" };
		}

		// --- Jacobian at current q ---
		const J = this.jacobian(model, q);   // 6 x n

		// --- Damped least-squares step: Δq = Jᵀ (J Jᵀ + λ²I)⁻¹ e ---
		const e = [...ep, ...eo];
		const JJt = this._mul6x6(J, J, true);   // J·Jᵀ (6x6)
		for (let i = 0; i < 6; i++) JJt[i][i] += lambda * lambda;

		const y  = this._solveLinear(JJt, e);   // (6)
		let dq  = this._matT_vec(J, y);         // (n)

		// --- Step clamp ---
		const dqNorm = Math.hypot(...dq);
		if (dqNorm > stepClamp) {
		  const s = stepClamp / dqNorm;
		  dq = dq.map(v => v * s);
		}

		// --- Trial step ---
		let qTrial = q.map((v, i) => v + dq[i]);

		// --- Joint limits: clamp + report ---
		if (qMin || qMax) {
		  for (let i = 0; i < n; i++) {
			if (qMin && qTrial[i] < qMin[i]) qTrial[i] = qMin[i];
			if (qMax && qTrial[i] > qMax[i]) qTrial[i] = qMax[i];
		  }
		}

		// --- Evaluate trial error ---
		const { T: Tt } = this.forwardKin(model, qTrial);
		const pt = [Tt[0][3], Tt[1][3], Tt[2][3]];
		const Rt = [
		  [Tt[0][0], Tt[0][1], Tt[0][2]],
		  [Tt[1][0], Tt[1][1], Tt[1][2]],
		  [Tt[2][0], Tt[2][1], Tt[2][2]]
		];
		const et = Math.hypot(
		  pd[0]-pt[0], pd[1]-pt[1], pd[2]-pt[2],
		  ...this._orientationError(Rt, Rd)
		);

		// --- LM λ adaptation ---
		if (et < err) {
		  q = qTrial;
		  lambda = Math.max(lambdaMin, lambda * 0.7);
		  lastErr = et;
		} else {
		  lambda = Math.min(lambdaMax, lambda * 2.0);
		  // retry with bigger λ next iteration (keep current q)
		}
	  }

	  return {
		q,
		converged: false,
		iterations: iter,
		error: lastErr,
		reason: "maxIter"
	  };
	}

	/* ---------- 3c. Smart dispatcher: analytic first, numerical fallback ---------- */
	/**
	 * Tries the closed-form PUMA IK first; if the result is out of joint limits
	 * or the analytic formula fails, falls back to numericalIK.
	 */
	inverseKinSmart(position, orientation, opts = {}) {
	  // --- 1. quick reachability pre-check ---
	  //const reachMax = this._workspaceRadius(opts.model ?? this.DH_Lib.puma01);
	  const reachMax = this._workspaceRadius(opts && opts.model != null ? opts.model : this.DH_Lib.puma01);
	  
	  const dist = Math.hypot(...position);
	  if (dist > reachMax * 1.001) {
		return {
		  q: null,
		  converged: false,
		  reason: "unreachable",
		  error: Infinity
		};
	  }

	  // --- 2. analytic attempt (PUMA only) ---
	  //const model = opts.model ?? this.DH_Lib.puma01;
	  const model = opts.model == null ? this.DH_Lib.puma01 : opts.model;
	  const isPuma = (model === this.DH_Lib.puma01);

	  if (isPuma) {
		try {
		  const qAna = this.inverseKin(position, orientation);
		  if (this._withinLimits(qAna, opts.qMin, opts.qMax)) {
			return { q: qAna, converged: true, method: "analytic", error: 0 };
		  }
		} catch (e) {
		  // fall through to numerical
		}
	  }

	  // --- 3. numerical fallback ---
	  const result = this.numericalIK(position, orientation, {
		...opts,
		q0: opts && opts.q0 != null ? opts.q0 : this._seedFromPosition(position, model)
	  });
	  return { ...result, method: "numerical" };
	}

	/* =========================================================
	 *  Private helpers for numerical IK
	 * ========================================================= */

	/** Convert (position, 3x3 R) -> 4x4 homogeneous matrix. */
	_poseToT(p, R) {
	  return [
		[R[0][0], R[0][1], R[0][2], p[0]],
		[R[1][0], R[1][1], R[1][2], p[1]],
		[R[2][0], R[2][1], R[2][2], p[2]],
		[0, 0, 0, 1]
	  ];
	}

	/**
	 * Orientation error between current R and desired Rd.
	 * Uses the axis-angle of (R · Rdᵀ) so the error is in the WORLD frame.
	 * Returns a small-angle 3-vector.
	 */
	_orientationError(R, Rd) {
	  // Rerr = Rd * Rᵀ  (world-frame error)
	  const Rerr = this._mul3(Rd, this._transpose3(R));
	  // Convert rotation matrix to axis-angle (log map)
	  const trace = Rerr[0][0] + Rerr[1][1] + Rerr[2][2];
	  const cosT  = Math.min(1, Math.max(-1, (trace - 1) / 2));
	  const theta = Math.acos(cosT);

	  if (theta < 1e-9) return [0, 0, 0];

	  // sin(theta) from skew part
	  const k = 1 / (2 * Math.sin(theta));
	  const wx = (Rerr[2][1] - Rerr[1][2]) * k;
	  const wy = (Rerr[0][2] - Rerr[2][0]) * k;
	  const wz = (Rerr[1][0] - Rerr[0][1]) * k;

	  return [theta * wx, theta * wy, theta * wz];
	}

	/** J·Jᵀ (6x6).  Pass transpose=true to get Jᵀ·J (n x n). */
	_mul6x6(J, K, transposeJJt = false) {
	  const m = J.length, n = J[0].length;
	  const out = transposeJJt
		? this._zeros(6, 6)     // J·Jᵀ is 6x6 when J is 6xn
		: this._zeros(n, n);

	  if (transposeJJt) {
		for (let i = 0; i < 6; i++)
		  for (let j = 0; j < 6; j++) {
			let s = 0;
			for (let k = 0; k < n; k++) s += J[i][k] * J[j][k];
			out[i][j] = s;
		  }
	  }
	  return out;
	}

	/** A (6x6) · x (6) -> y (6). */
	_solveLinear(A, b) {
	  const n = A.length;
	  const M = A.map((row, i) => [...row, b[i]]);
	  for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++)
		  if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		[M[c], M[p]] = [M[p], M[c]];
		for (let r = 0; r < n; r++) {
		  if (r === c) continue;
		  const f = M[r][c] / M[c][c];
		  for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
		}
	  }
	  return M.map((row, i) => row[n] / M[i][i]);
	}

	/** Jᵀ · y  (n x 6) · (6) -> (n). */
	_matT_vec(J, y) {
	  const m = J.length, n = J[0].length;
	  const out = new Array(n).fill(0);
	  for (let i = 0; i < n; i++) {
		let s = 0;
		for (let k = 0; k < m; k++) s += J[k][i] * y[k];
		out[i] = s;
	  }
	  return out;
	}

	/** Heuristic seed from target position (helps LM converge). */
	_seedFromPosition(p, model) {
	  const [x, y, z] = p;
	  const baseAngle = Math.atan2(y, x);
	  // Rough shoulder / elbow guesses
	  const a2 = model[1][1];
	  const a3 = Math.abs(model[2][1]);
	  const r  = Math.hypot(x, y);
	  const s  = Math.hypot(r, z);
	  const cos3 = (s*s - a2*a2 - a3*a3) / (2 * a2 * a3);
	  const t3 = Math.acos(Math.min(1, Math.max(-1, cos3)));
	  const t2 = Math.atan2(z, r) - Math.atan2(a3 * Math.sin(t3), a2 + a3 * Math.cos(t3));
	  return [baseAngle, t2, t3, 0, 0, 0];
	}

	/** Check all joints against limits (undefined limits = free). */
	_withinLimits(q, qMin, qMax) {
	  if (!qMin && !qMax) return true;
	  for (let i = 0; i < q.length; i++) {
		if (qMin && q[i] < qMin[i]) return false;
		if (qMax && q[i] > qMax[i]) return false;
	  }
	  return true;
	}

	/** Conservative max reach of the arm along the DH chain. */
	_workspaceRadius(model) {
	  let r = 0;
	  for (const [, a, d] of model) r += Math.abs(a) + Math.abs(d);
	  return r;
	}




  /* ---------- 4. Joint -> servo angles ---------- */
  /**
   * Convert joint radians to servo pulse-like angle tuples.
   * (Kept generic — override per hardware.)
   */
  theta2servoAngles(...theta) {
    return theta.map(t => {
      const deg = (t * 180) / Math.PI;
      // map to 0..180 servo range, clamped
      return Math.max(0, Math.min(180, deg + 90));
    });
  }

  /* ---------- 5. Path tracking ---------- */
  /**
   * Cartesian path interpolation + IK.
   * @param  {number[]} P1   start  [x,y,z]
   * @param  {number[]} P2   end    [x,y,z]
   * @param  {string}   mode 'line' | 'circle' | 'arc' | 'curve'
   * @param  {object}   out  { steps, radius, R0, R1 }  (mode-dependent)
   * @return {Array<{p:number[], q:number[]}>}
   */
  pathTracking(P1, P2, mode = "line", out = {}) {
	  // --- options (no ?? operator) ---
	  const steps        = out.steps        !== undefined ? out.steps        : 20;
	  const useNumerical = out.useNumerical !== undefined ? out.useNumerical : false;
	  const qMin         = out.qMin         !== undefined ? out.qMin         : null;
	  const qMax         = out.qMax         !== undefined ? out.qMax         : null;
	  const model        = out.model        !== undefined ? out.model        : this.defaultModel;

	  const n = model.length;
	  const path = [];
	  let qPrev = out.q0 !== undefined ? out.q0 : new Array(n).fill(0);

	  for (let i = 0; i <= steps; i++) {
		const s = i / steps;
		let p;

		// --- interpolation per mode ---
		switch (mode) {
		  case "line": {
			p = [
			  P1[0] + s * (P2[0] - P1[0]),
			  P1[1] + s * (P2[1] - P1[1]),
			  P1[2] + s * (P2[2] - P1[2])
			];
			break;
		  }

		  case "circle": {
			// full revolution in the XY plane around P1 with radius out.radius
			const R   = out.radius !== undefined ? out.radius : 0.05;
			const ang = 2 * Math.PI * s;
			p = [
			  P1[0] + R * Math.cos(ang),
			  P1[1] + R * Math.sin(ang),
			  P1[2]
			];
			break;
		  }

		  case "arc": {
			// linear interpolation + sinusoidal Z bump
			const arcH = out.arcHeight !== undefined ? out.arcHeight : 0.05;
			p = [
			  P1[0] + s * (P2[0] - P1[0]),
			  P1[1] + s * (P2[1] - P1[1]),
			  P1[2] + s * (P2[2] - P1[2]) + arcH * Math.sin(Math.PI * s)
			];
			break;
		  }

		  case "curve": {
			// cubic Bezier P1 -> C1 -> C2 -> P2
			const C1 = out.C1 !== undefined
			  ? out.C1
			  : [(P1[0] + P2[0]) / 2, P1[1], P1[2]];
			const C2 = out.C2 !== undefined
			  ? out.C2
			  : [(P1[0] + P2[0]) / 2, P2[1], P2[2]];
			const u = s, v = 1 - s;
			p = [0, 1, 2].map(d =>
			  v * v * v * P1[d] +
			  3 * v * v * u * C1[d] +
			  3 * v * u * u * C2[d] +
			  u * u * u * P2[d]
			);
			break;
		  }

		  default:
			throw new Error("pathTracking: unknown mode '" + mode + "'");
		}

		// --- IK per waypoint ---
		let q;
		if (useNumerical) {
		  const res = this.numericalIK(p, this._identity3(), {
			model: model,
			q0:    qPrev,
			qMin:  qMin,
			qMax:  qMax
		  });
		  if (!res.converged) {
			path.push({ p: p, q: qPrev, ok: false, err: res.error });
			continue;
		  }
		  q = res.q;
		} else {
		  try {
			q = this.inverseKin(p, this._identity3());
		  } catch (e) {
			q = qPrev;
		  }
		}

		qPrev = q;
		path.push({ p: p, q: q, ok: true });
	  }

	  return path;
	}


  /* ---------- 6. Jacobian ---------- */
  /**
   * Geometric Jacobian (6 x n).
   *   J = arm.jacobian(Ai_list, q)
   *   or jacobian(DH_Lib_entry, q)
   *
   * Also supports the spatial-velocity form mentioned in the spec:
   *   jacobian(*Xi, Φi) — if Xi and Phi are supplied they are used directly.
   *
   * @return {number[][]} 6 x n Jacobian (rows: vx,vy,vz, wx,wy,wz)
   */
  jacobian(arg1, q = null, Phi = null) {
    // --- Spatial-velocity formulation (Xi, Phi) ---
    if (Array.isArray(arg1) && Phi) {
      // Xi: array of 6-vectors, Phi: array of 6-vectors
      // J = sum over joints of Phi_i * Xi_i^T (outer-product style)
      const n = Phi.length;
      const J = this._zeros(6, n);
      for (let i = 0; i < n; i++) {
        for (let r = 0; r < 6; r++) J[r][i] = Phi[i][r] * arg1[i][r];
      }
      return J;
    }

    // --- Standard geometric Jacobian ---
    const { Ai, model } = this._resolveChain(arg1, q);
    const n = Ai.length;

    // Forward pass: T_0..i, z_i-1, p_i-1
    const Ts = [this._identity4()];
    for (let i = 0; i < n; i++) Ts.push(this._mul4(Ts[i], Ai[i]));

    const pe = [Ts[n][0][3], Ts[n][1][3], Ts[n][2][3]];
    const J = this._zeros(6, n);

    for (let i = 0; i < n; i++) {
      const T_prev = Ts[i];
      const z = [T_prev[0][2], T_prev[1][2], T_prev[2][2]]; // z_{i-1}
      const p = [T_prev[0][3], T_prev[1][3], T_prev[2][3]]; // p_{i-1}

      const d = [pe[0]-p[0], pe[1]-p[1], pe[2]-p[2]];
      const v = this._cross(z, d);

      J[0][i] = v[0]; J[1][i] = v[1]; J[2][i] = v[2];
      J[3][i] = z[0]; J[4][i] = z[1]; J[5][i] = z[2];
    }
    return J;
  }

  /* ---------- 7. Recursive Newton–Euler (torque) ---------- */
  /**
   * Inverse dynamics via RNE.
   * @param  {number[]} q    joint positions
   * @param  {number[]} qd   joint velocities
   * @param  {number[]} qdd  joint accelerations
   * @param  {number[]} g    gravity vector (default [0,0,-9.81])
   * @return {number[]}      joint torques τ
   *
   * Link masses / COM / inertia are stored in this.dynamics (per joint).
   * Default values are placeholders — override for a real robot.
   */
  /* ---------- 7. Recursive Newton–Euler (torque) ---------- */
	rne(q, qd, qdd, g = this.gravity) {
	  const n = q.length;
	  const DH = this.DH_Lib.puma01;

	  const MASSES = [7.0, 10.0, 5.0, 2.0, 1.5, 0.5];
	  const links = this.dynamics == null
		? DH.map((_, i) => ({
			m: MASSES[i] == null ? 1.0 : MASSES[i],
			r: [0, 0, 0],
			I: this._diag3(0.01, 0.01, 0.01)
		  }))
		: this.dynamics;

	  // Forward recursion arrays
	  const w = Array(n + 1).fill([0, 0, 0]);   // angular velocity
	  const dw = Array(n + 1).fill([0, 0, 0]);  // angular acceleration
	  const v = Array(n + 1).fill([0, 0, 0]);   // linear velocity
	  const dv = Array(n + 1).fill([0, 0, 0]);  // linear acceleration

	  const T = [this._identity4()]; // T_0->i

	  // Base conditions
	  w[0] = [0, 0, 0];
	  dw[0] = [0, 0, 0];
	  v[0] = [0, 0, 0];
	  dv[0] = [-g[0], -g[1], -g[2]]; // Gravity trick

	  // --- Forward pass ---
	  for (let i = 1; i <= n; i++) {
		const [th0, aLen, d, al] = DH[i - 1];
		const theta = th0 + q[i - 1];
		const Ai = this.DH(theta, aLen, d, al);
		T.push(this._mul4(T[i - 1], Ai));

		const R_prev_i = this._rotPart(Ai); // R_{i-1->i}
		const R_prev_i_T = this._transpose3(R_prev_i);
		const p_prev_i = [Ai[0][3], Ai[1][3], Ai[2][3]]; // p_{i-1->i}

		// Transform previous frame quantities to current frame i
		const w_prev_in_i = this._mul3v(R_prev_i_T, w[i - 1]);
		const dw_prev_in_i = this._mul3v(R_prev_i_T, dw[i - 1]);
		const v_prev_in_i = this._mul3v(R_prev_i_T, v[i - 1]);
		const dv_prev_in_i = this._mul3v(R_prev_i_T, dv[i - 1]);

		// Angular velocity and acceleration
		w[i] = this._add3(w_prev_in_i, [0, 0, qd[i - 1]]);
		dw[i] = this._add3(
		  this._add3(dw_prev_in_i, this._cross(w_prev_in_i, [0, 0, qd[i - 1]])),
		  [0, 0, qdd[i - 1]]
		);

		// Linear velocity and acceleration
		v[i] = this._add3(v_prev_in_i, this._cross(w_prev_in_i, p_prev_i));
		dv[i] = this._add3(
		  this._add3(dv_prev_in_i, this._cross(dw_prev_in_i, p_prev_i)),
		  this._cross(w_prev_in_i, this._cross(w_prev_in_i, p_prev_i))
		);
	  }

	  // --- Backward pass ---
	  const f = Array(n + 1).fill([0, 0, 0]); // force
	  const t = Array(n + 1).fill([0, 0, 0]); // moment
	  const tau = Array(n).fill(0);

	  for (let i = n; i >= 1; i--) {
		const link = links[i - 1];
		const R_i = this._rotPart(T[i]);
		const R_i_T = this._transpose3(R_i);
		const p_i_0 = [T[i][0][3], T[i][1][3], T[i][2][3]];

		let f_next_in_i = [0, 0, 0];
		let t_next_in_i = [0, 0, 0];
		let p_i_plus_1_in_i = [0, 0, 0];

		// Transform forces and moments from frame i+1 to frame i
		if (i < n) {
		  const R_i_plus_1 = this._rotPart(T[i + 1]);
		  const R_i_plus_1_to_i = this._mul3(this._transpose3(R_i_plus_1), R_i);
		  f_next_in_i = this._mul3v(R_i_plus_1_to_i, f[i + 1]);
		  t_next_in_i = this._mul3v(R_i_plus_1_to_i, t[i + 1]);

		  const p_i_plus_1_0 = [T[i + 1][0][3], T[i + 1][1][3], T[i + 1][2][3]];
		  const diff = this._add3(p_i_plus_1_0, [-p_i_0[0], -p_i_0[1], -p_i_0[2]]);
		  p_i_plus_1_in_i = this._mul3v(R_i_T, diff);
		}

		// Inertial force and moment in frame i
		const m = link.m;
		const F_i = [m * dv[i][0], m * dv[i][1], m * dv[i][2]];
		const I_i = link.I;
		const w_i = w[i];
		const dw_i = dw[i];
		const N_i = this._add3(
		  this._mul3v(I_i, dw_i),
		  this._cross(w_i, this._mul3v(I_i, w_i))
		);

		// Update forces and moments
		f[i] = this._add3(F_i, f_next_in_i);
		const cross_term = this._cross(p_i_plus_1_in_i, f_next_in_i);
		t[i] = this._add3(this._add3(N_i, t_next_in_i), cross_term);

		// Joint torque (z-component of moment)
		tau[i - 1] = t[i][2];
	  }

	  return tau;
	}

  /* =========================================================
   *  Small matrix helpers (kept private by convention)
   * ========================================================= */
  _identity4() { return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]; }
  _identity3() { return [[1,0,0],[0,1,0],[0,0,1]]; }
  _diag3(a,b,c) { return [[a,0,0],[0,b,0],[0,0,c]]; }
  _zeros(r,c) { return Array.from({length:r}, () => new Array(c).fill(0)); }

  _mul4(A, B) {
    const C = this._zeros(4,4);
    for (let i=0;i<4;i++) for (let j=0;j<4;j++) {
      let s = 0;
      for (let k=0;k<4;k++) s += A[i][k]*B[k][j];
      C[i][j] = s;
    }
    return C;
  }
  _mul3(A, B) {
    const C = this._zeros(3,3);
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
      let s = 0;
      for (let k=0;k<3;k++) s += A[i][k]*B[k][j];
      C[i][j] = s;
    }
    return C;
  }
  _mul3v(A, v) {
    return [
      A[0][0]*v[0]+A[0][1]*v[1]+A[0][2]*v[2],
      A[1][0]*v[0]+A[1][1]*v[1]+A[1][2]*v[2],
      A[2][0]*v[0]+A[2][1]*v[1]+A[2][2]*v[2]
    ];
  }
  _transpose3(A) {
    return [[A[0][0],A[1][0],A[2][0]],
            [A[0][1],A[1][1],A[2][1]],
            [A[0][2],A[1][2],A[2][2]]];
  }
  _cross(a, b) {
    return [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0]
    ];
  }
  _add3(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }

  _rotPart(T) {
    return [[T[0][0],T[0][1],T[0][2]],
            [T[1][0],T[1][1],T[1][2]],
            [T[2][0],T[2][1],T[2][2]]];
  }
  _rotZYX(t1, t2, t3) {
    // R = Rz(t1) * Ry(t2) * Rx(t3) — simplified for PUMA forearm
    const c1=Math.cos(t1), s1=Math.sin(t1);
    const c2=Math.cos(t2), s2=Math.sin(t2);
    const c3=Math.cos(t3), s3=Math.sin(t3);
    return [
      [c1*c2, c1*s2*s3 - s1*c3, c1*s2*c3 + s1*s3],
      [s1*c2, s1*s2*s3 + c1*c3, s1*s2*c3 - c1*s3],
      [-s2,   c2*s3,            c2*c3           ]
    ];
  }
  _resolveChain(arg1, q) {
    if (Array.isArray(arg1) && Array.isArray(arg1[0]) && Array.isArray(arg1[0][0])) {
      return { Ai: arg1, model: null };
    }
    // DH_Lib entry + q
    const Ai = arg1.map((row, i) => {
      const [th0, a, d, al] = row;
      return this.DH(th0 + q[i], a, d, al);
    });
    return { Ai, model: arg1 };
  }
  
  
  /* =========================================================
	 *  8. Trajectory time-parameterization (quintic)
	 * ========================================================= */

	
	/**
	 * Turn a list of geometric waypoints into a timed trajectory.
	 *
	 * @param  {Array<{p:number[],q:number[]}>} waypoints  from pathTracking
	 * @param  {object} opts
	 *          method    : "quintic" | "trapezoid" | "linear"  (default quintic)
	 *          dt        : sample period (s, default 0.01)
	 *          vMax      : max joint speed (rad/s, scalar or array)
	 *          aMax      : max joint accel (rad/s^2, scalar or array)
	 * @return {Array<{t, q, qd, qdd, s, seg}>}
	 */
	timeParameterize(waypoints, opts = {}) {
	  const {
		method = "quintic",
		dt     = 0.01,
		vMax:  vMaxOpt = 1.0,
		aMax:  aMaxOpt = 5.0
	  } = opts;

	  const n     = waypoints[0].q.length;
	  const asArr = (v) => Array.isArray(v) ? v : new Array(n).fill(v);
	  const vMax  = asArr(vMaxOpt);   // rad/s
	  const aMax  = asArr(aMaxOpt);   // rad/s^2

	  const traj = [];

	  for (let seg = 0; seg < waypoints.length - 1; seg++) {
		const q0 = waypoints[seg].q;
		const q1 = waypoints[seg + 1].q;
		const dq = q1.map((v, i) => v - q0[i]);

		const T = this._segmentDuration(dq, vMax, aMax, method);
		if (T === 0) continue;

		const samples = Math.max(2, Math.ceil(T / dt));

		for (let k = 0; k <= samples; k++) {
		  const tau = k / samples;
		  const { s, sd, sdd } = this._timeLaw(tau, T, method);

		  traj.push({
			t:   traj.length * dt,
			q:   q0.map((v, i) => v + s * dq[i]),
			qd:  dq.map(v => sd  * v),
			qdd: dq.map(v => sdd * v),
			s, seg
		  });
		}
	  }
	  return traj;
	}

	/** Scalar time law s(tau), ṡ, s̈ for tau in [0,1]. */
	_timeLaw(tau, T, method) {
	  if (method === "linear") {
		return { s: tau, sd: 1 / T, sdd: 0 };
	  }
	  if (method === "trapezoid") {
		// crude: accelerate for 30%, cruise 40%, decelerate 30%
		const ta = 0.3, tc = 0.4;
		if (tau < ta) {
		  const s = tau * tau / (2 * ta);
		  return { s: s, sd: tau / (ta * T), sdd: 1 / (ta * T * T) };
		} else if (tau < ta + tc) {
		  return { s: ta / 2 + (tau - ta), sd: 1 / T, sdd: 0 };
		} else {
		  const u = (tau - ta - tc) / ta;
		  const s = ta / 2 + tc + u - u * u / 2;
		  return { s, sd: (1 - u) / T, sdd: -1 / (ta * T * T) };
		}
	  }
	  // --- quintic (default) ---
	  const t2 = tau * tau, t3 = t2 * tau, t4 = t3 * tau, t5 = t4 * tau;
	  return {
		s:   10 * t3 - 15 * t4 + 6 * t5,
		sd:  (30 * t2 - 60 * t3 + 30 * t4) / T,
		sdd: (60 * tau - 180 * t2 + 120 * t3) / (T * T)
	  };
	}

	/** Pick T such that max|q̇| ≤ vMax and max|q̈| ≤ aMax (quintic bounds). */
	_segmentDuration(dq, vMax, aMax, method) {
	  // quintic peaks: max|ṡ| = 1.875/T, max|s̈| = 5.7735/T²
	  let T = 0;
	  for (let i = 0; i < dq.length; i++) {
		const d = Math.abs(dq[i]);
		const Tv = Math.sqrt(5.7735 * d / aMax[i]);   // from accel bound
		const Tvel = 1.875 * d / vMax[i];             // from velocity bound
		T = Math.max(T, Tv, Tvel);
	  }
	  return T;
	}
  
  
  
  
  
	/* =========================================================
	 *  9. Cartesian impedance / admittance control
	 * ========================================================= */

	/**
	 * One control tick of torque-based Cartesian impedance.
	 *
	 *   τ = Jᵀ ( M_d ẍ_ref + D_d (ẋ_ref − ẋ) + K_d (x_ref − x) − F_ext )
	 *       + τ_gravity(q)                    // compensation
	 *
	 * @param  {object} s   state sample
	 *          q, qd       : measured joint pos / vel
	 *          x, xd       : current Cartesian pose / velocity (from FK+J)
	 *          xRef, xdRef, xddRef : reference trajectory
	 *          Fext        : [Fx,Fy,Fz,Mx,My,Mz] external wrench (or null)
	 *          R           : current 3x3 orientation (for wrench rotation)
	 * @param  {object} gains
	 *          Md, Dd, Kd  : 6x6 or diagonal 6-vector
	 *          model       : DH_Lib entry
	 * @return {object} { tau, Fimp, J, error }
	 */
	impedanceControl(s, gains = {}) {
	  const model = gains.model != null ? gains.model : this.DH_Lib.puma01;

	  // --- default diagonal gains ---
	  const Md = this._diag6(gains.Md != null ? gains.Md : [5,5,5, 0.5,0.5,0.5]);
	  const Dd = this._diag6(gains.Dd != null ? gains.Dd : [150,150,150, 15,15,15]);
	  const Kd = this._diag6(gains.Kd != null ? gains.Kd : [800,800,800, 40,40,40]);

	  // --- current state ---
	  const q   = s.q;
	  const qd  = s.qd;
	  const J   = this.jacobian(model, q);
	  const x   = s.x  != null ? s.x  : this._fkPose(model, q);
	  const xd  = s.xd != null ? s.xd : this._mat_vec(J, qd);

	  // --- reference (default = hold current) ---
	  const xRef   = s.xRef   != null ? s.xRef   : x;
	  const xdRef  = s.xdRef  != null ? s.xdRef  : new Array(6).fill(0);
	  const xddRef = s.xddRef != null ? s.xddRef : new Array(6).fill(0);

	  // --- errors ---
	  const e  = xRef.map((v, i) => v - x[i]);
	  const ed = xdRef.map((v, i) => v - xd[i]);

	  // --- impedance force ---
	  let Fimp = new Array(6).fill(0);
	  for (let i = 0; i < 6; i++) {
		let s1 = 0;
		for (let j = 0; j < 6; j++) {
		  s1 += Md[i][j] * xddRef[j] + Dd[i][j] * ed[j] + Kd[i][j] * e[j];
		}
		Fimp[i] = s1;
	  }

	  // --- subtract external wrench ---
	  const Fext = s.Fext != null ? s.Fext : new Array(6).fill(0);
	  const Fnet = Fimp.map((v, i) => v - Fext[i]);

	  // --- map to joint torques ---
	  let tau = this._matT_vec(J, Fnet);

	  // --- gravity / Coriolis compensation ---
	  if (gains.compensate !== false) {
		const tau_g = this.rne(q, qd, new Array(q.length).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, Fimp, Fext, J, error: e, xd, xRef };
	}

	admittanceControl(s, gains = {}) {
	  const model = gains.model != null ? gains.model : this.DH_Lib.puma01;
	  const dt    = gains.dt    != null ? gains.dt    : 0.005;

	  const Md = gains.Md != null ? gains.Md : [5,5,5, 0.5,0.5,0.5];
	  const Dd = gains.Dd != null ? gains.Dd : [150,150,150, 15,15,15];
	  const Kd = gains.Kd != null ? gains.Kd : [800,800,800, 40,40,40];

	  // Previous modified pose
	  const xMod  = s.xMod  != null ? s.xMod  : (s.x != null ? s.x : this._fkPose(model, s.q));
	  const xdMod = s.xdMod != null ? s.xdMod : new Array(6).fill(0);

	  const xRef = s.xRef != null ? s.xRef : xMod;
	  const Fext = s.Fext != null ? s.Fext : new Array(6).fill(0);

	  // --- integrate ---
	  const xddMod = new Array(6).fill(0);
	  for (let i = 0; i < 6; i++) {
		const rhs = Fext[i]
				  - Dd[i] * xdMod[i]
				  - Kd[i] * (xMod[i] - xRef[i]);
		xddMod[i] = rhs / Md[i];
	  }

	  const newXdMod = xdMod.map((v, i) => v + xddMod[i] * dt);
	  const newXMod  = xMod.map((v, i) => v + newXdMod[i] * dt);

	  // --- IK ---
	  const pDes = newXMod.slice(0, 3);
	  const RDes = this._eulerToR(newXMod.slice(3, 6));

	  const ik = this.inverseKinSmart(pDes, RDes, {
		model,
		q0: s.q,
		qMin: gains.qMin != null ? gains.qMin : null,
		qMax: gains.qMax != null ? gains.qMax : null
	  });

	  return {
		xMod: newXMod,
		xdMod: newXdMod,
		qDes: ik.q,
		converged: ik.converged
	  };
	}
	
	
	
	/* =========================================================
	 *  Matrix helpers used by the force-control methods
	 * ========================================================= */

	/** 6x6 diagonal matrix from a 6-vector. */
	_diag6(d) {
	  const M = this._zeros(6, 6);
	  for (let i = 0; i < 6; i++) M[i][i] = d[i];
	  return M;
	}

	/** n x n identity matrix. */
	_identity(n) {
	  const I = this._zeros(n, n);
	  for (let i = 0; i < n; i++) I[i][i] = 1;
	  return I;
	}

	/** Matrix–vector product:  A (m x n) · v (n)  →  (m). */
	_mat_vec(A, v) {
	  const m = A.length, n = A[0].length;
	  const out = new Array(m).fill(0);
	  for (let i = 0; i < m; i++) {
		let s = 0;
		for (let k = 0; k < n; k++) s += A[i][k] * v[k];
		out[i] = s;
	  }
	  return out;
	}

	/** Transpose-matrix–vector:  Aᵀ · v  where A is (m x n), v is (m)  →  (n). */
	_matT_vec(A, v) {
	  const m = A.length, n = A[0].length;
	  const out = new Array(n).fill(0);
	  for (let i = 0; i < n; i++) {
		let s = 0;
		for (let k = 0; k < m; k++) s += A[k][i] * v[k];
		out[i] = s;
	  }
	  return out;
	}

	/** General matrix–matrix product:  A (m x n) · B (n x p)  →  (m x p). */
	_mat_mul(A, B) {
	  const m = A.length, n = A[0].length, p = B[0].length;
	  const C = this._zeros(m, p);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < p; j++) {
		  let s = 0;
		  for (let k = 0; k < n; k++) s += A[i][k] * B[k][j];
		  C[i][j] = s;
		}
	  return C;
	}

	/** General matrix inverse via Gauss–Jordan (n x n). */
	_invert(A) {
	  const n = A.length;
	  const M = A.map((row, i) =>
		row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
	  );

	  for (let c = 0; c < n; c++) {
		// partial pivot
		let p = c;
		for (let r = c + 1; r < n; r++)
		  if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		const tmp = M[c]; M[c] = M[p]; M[p] = tmp;

		const piv = M[c][c];
		if (Math.abs(piv) < 1e-12)
		  throw new Error("_invert: singular matrix");

		for (let k = 0; k < 2 * n; k++) M[c][k] /= piv;

		for (let r = 0; r < n; r++) {
		  if (r === c) continue;
		  const f = M[r][c];
		  for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
		}
	  }
	  return M.map(row => row.slice(n));
	}

	/** Determinant via LU decomposition (small n). */
	_det(A) {
	  const n = A.length;
	  const M = A.map(r => r.slice());
	  let det = 1;
	  for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++)
		  if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		if (p !== c) { const t = M[c]; M[c] = M[p]; M[p] = t; det = -det; }
		if (Math.abs(M[c][c]) < 1e-12) return 0;
		det *= M[c][c];
		for (let r = c + 1; r < n; r++) {
		  const f = M[r][c] / M[c][c];
		  for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
		}
	  }
	  return det;
	}

	/* ---------- force-control specific helpers ---------- */

	/** Moore–Penrose pseudoinverse of a 6 x n Jacobian. */
	_pseudoInverse(J) {
	  const m = J.length, n = J[0].length;
	  if (m >= n) {
		// J⁺ = (JᵀJ)⁻¹ Jᵀ
		const Jt = J[0].map((_, i) => J.map(r => r[i]));   // n x m
		const JtJ = this._zeros(n, n);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < n; j++)
			for (let k = 0; k < m; k++)
			  JtJ[i][j] += Jt[i][k] * Jt[j][k];
		const inv = this._invert(JtJ);
		const out = this._zeros(n, m);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < n; k++)
			  out[i][j] += inv[i][k] * Jt[k][j];
		return out;
	  } else {
		// J⁺ = Jᵀ(JJᵀ)⁻¹
		const JJt = this._zeros(m, m);
		for (let i = 0; i < m; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < n; k++)
			  JJt[i][j] += J[i][k] * J[j][k];
		const inv = this._invert(JJt);
		const out = this._zeros(n, m);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < m; k++)
			  out[i][j] += J[k][i] * inv[k][j];
		return out;
	  }
	}
	
	/**
	 * Returns J · (Jᵀ J)⁻¹   — the "wrench-from-torque" map for a 6×n Jacobian.
	 * Usage:  F = _mat_vec(_pinvJT(J), tau)
	 */
	_pinvJT(J) {
	  const m = J.length, n = J[0].length;

	  // Jᵀ  (n × m)
	  const Jt = J[0].map((_, i) => J.map(r => r[i]));

	  // JᵀJ  (n × n)
	  const JtJ = this._zeros(n, n);
	  for (let i = 0; i < n; i++)
		for (let j = 0; j < n; j++)
		  for (let k = 0; k < m; k++)
			JtJ[i][j] += Jt[i][k] * Jt[j][k];

	  // (JᵀJ)⁻¹  (n × n)
	  const inv = this._invert(JtJ);

	  // J · inv  (m × n)
	  const out = this._zeros(m, n);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < n; j++)
		  for (let k = 0; k < n; k++)
			out[i][j] += J[i][k] * inv[k][j];

	  return out;
	}

	/** Damped least-squares pseudoinverse:  Jᵀ(JJᵀ + λ²I)⁻¹. */
	_dlsInverse(J, lambda) {
	  const m = J.length, n = J[0].length;
	  const JJt = this._zeros(m, m);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < n; k++)
			JJt[i][j] += J[i][k] * J[j][k];
	  for (let i = 0; i < m; i++) JJt[i][i] += lambda * lambda;
	  const inv = this._invert(JJt);
	  const out = this._zeros(n, m);
	  for (let i = 0; i < n; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < m; k++)
			out[i][j] += J[k][i] * inv[k][j];
	  return out;
	}

	/** Nullspace projector N = I − J⁺J  (n x n). */
	_nullspaceProjector(J, Jpinv) {
	  const n = J[0].length;
	  const N = this._identity(n);
	  for (let i = 0; i < n; i++)
		for (let j = 0; j < n; j++) {
		  let s = 0;
		  for (let k = 0; k < J.length; k++) s += Jpinv[i][k] * J[k][j];
		  N[i][j] -= s;
		}
	  return N;
	}

	/** Yoshikawa manipulability:  w = sqrt(det(J Jᵀ)). */
	_manipulability(J) {
	  const m = J.length, n = J[0].length;
	  const JJt = this._zeros(m, m);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < n; k++)
			JJt[i][j] += J[i][k] * J[j][k];
	  return Math.sqrt(Math.max(0, this._det(JJt)));
	}

	/** 6-vector (or scalar) → 6x6 diagonal matrix. */
	_diag6(d) {
	  const M = this._zeros(6, 6);
	  for (let i = 0; i < 6; i++) M[i][i] = d[i];
	  return M;
	}

	/** Scale vector so max |component / limit| ≤ 1, preserving direction. */
	_saturateVector(v, limit) {
	  const lim = Array.isArray(limit)
		? limit
		: new Array(v.length).fill(limit);
	  let s = 1;
	  for (let i = 0; i < v.length; i++)
		s = Math.max(s, Math.abs(v[i]) / lim[i]);
	  return s > 1 ? v.map(x => x / s) : v.slice();
	}

	/* ---------- pose helpers ---------- */

	/** FK → 6-vector [x, y, z, wx, wy, wz] (axis-angle). */
	_fkPose(model, q) {
	  const fk = this.forwardKin(model, q);
	  const T  = fk.T;
	  const p  = [T[0][3], T[1][3], T[2][3]];
	  const R  = [
		[T[0][0], T[0][1], T[0][2]],
		[T[1][0], T[1][1], T[1][2]],
		[T[2][0], T[2][1], T[2][2]]
	  ];

	  const trace = R[0][0] + R[1][1] + R[2][2];
	  let cosT = (trace - 1) / 2;
	  if (cosT >  1) cosT =  1;
	  if (cosT < -1) cosT = -1;
	  const theta = Math.acos(cosT);

	  let wx = 0, wy = 0, wz = 0;
	  if (theta > 1e-9) {
		const k = 1 / (2 * Math.sin(theta));
		wx = theta * (R[2][1] - R[1][2]) * k;
		wy = theta * (R[0][2] - R[2][0]) * k;
		wz = theta * (R[1][0] - R[0][1]) * k;
	  }
	  return [p[0], p[1], p[2], wx, wy, wz];
	}

	/** Small-angle rotation vector → 3x3 rotation matrix. */
	_eulerToR(w) {
	  const wx = w[0], wy = w[1], wz = w[2];
	  return [
		[ 1,    -wz,   wy  ],
		[ wz,    1,   -wx  ],
		[-wy,   wx,    1   ]
	  ];
	}

	/** Full Rodrigues:  axis-angle vector → 3x3 rotation matrix. */
	_rotVecToR(w) {
	  const th = Math.hypot(w[0], w[1], w[2]);
	  if (th < 1e-9) return [[1,0,0],[0,1,0],[0,0,1]];
	  const kx = w[0]/th, ky = w[1]/th, kz = w[2]/th;
	  const c = Math.cos(th), s = Math.sin(th), v = 1 - c;
	  return [
		[kx*kx*v + c,     kx*ky*v - kz*s, kx*kz*v + ky*s],
		[ky*kx*v + kz*s,  ky*ky*v + c,    ky*kz*v - kx*s],
		[kz*kx*v - ky*s,  kz*ky*v + kx*s, kz*kz*v + c   ]
	  ];
	}

	/** (position p, 3x3 R) → 4x4 homogeneous matrix. */
	_poseToT(p, R) {
	  return [
		[R[0][0], R[0][1], R[0][2], p[0]],
		[R[1][0], R[1][1], R[1][2], p[1]],
		[R[2][0], R[2][1], R[2][2], p[2]],
		[0, 0, 0, 1]
	  ];
	}

	/** Small helper: sum of squares of a vector. */
	_dot(a, b) {
	  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
	}
	
	
	nullspaceProjector(J) {
	  // J⁺ = Jᵀ(JJᵀ)⁻¹  for full-row-rank J
	  const JJt = this._mul6x6(J, J, true);  // 6×6
	  const invJJt = this._invert(JJt);
	  const Jt = J[0].map((_, i) => J.map(r => r[i]));  // n×6

	  // J⁺ = Jᵀ · inv(JJᵀ)   (n×6)
	  const Jpinv = this._zeros(J.length, 6);
	  for (let i = 0; i < J.length; i++)
		for (let j = 0; j < 6; j++)
		  for (let k = 0; k < 6; k++)
			Jpinv[i][j] += Jt[i][k] * invJJt[k][j];

	  // N = I - J⁺J  (n×n)
	  const N = this._identity(J.length);
	  for (let i = 0; i < J.length; i++)
		for (let j = 0; j < J.length; j++) {
		  let s = 0;
		  for (let k = 0; k < 6; k++) s += Jpinv[i][k] * J[k][j];
		  N[i][j] -= s;
		}
	  return { Jpinv, N };
	}

	// Apply secondary objective qd0 through nullspace
	nullspaceControl(J, xdot, qd0) {
	  const { Jpinv, N } = this.nullspaceProjector(J);
	  const qdTask = this._matT_vec(Jpinv, xdot);  // J⁺ ẋ
	  const qdNull = this._mat_vec(N, qd0);        // N · q̇₀
	  return qdTask.map((v, i) => v + qdNull[i]);
	}
	
	/* =========================================================
	 *  10. Explicit force control (direct force regulation)
	 * ========================================================= */
	/**
	 * Direct force control along the tool's approach axis (z of tool frame).
	 * Uses a PI controller on the measured normal force.
	 *
	 *   f_cmd = Kp·(F_ref − F_meas) + Ki·∫(F_ref − F_meas)dt
	 *   τ     = Jᵀ · f_cmd · ẑ_tool
	 *
	 * @param  {object} s    { q, qd, F_meas, F_ref, R (3x3 tool rot), dt }
	 * @param  {object} gains { Kp, Ki, Kd, model, integrate (prev integral) }
	 * @return {object} { tau, F_cmd, integral }
	 */
	forceControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const dt    = (gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005;
	  const Kp    = (gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : 1.0;
	  const Ki    = (gains.Ki !== undefined && gains.Ki !== null) ? gains.Ki : 0.1;
	  const Kd    = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : 0.0;

	  // Force error along tool z-axis only
	  const eF = s.F_ref - s.F_meas;

	  // Integral (caller persists across ticks)
	  const integralNew = ((gains.integral !== undefined && gains.integral !== null) ? gains.integral : 0) + eF * dt;
	  // Anti-windup
	  const clamp = (gains.integralClamp !== undefined && gains.integralClamp !== null) ? gains.integralClamp : 20.0;
	  const integral = Math.max(-clamp, Math.min(clamp, integralNew));

	  // Command force
	  const F_cmd = Kp * eF + Ki * integral;

	  // Tool z-axis in world frame
	  const zTool = [s.R[0][2], s.R[1][2], s.R[2][2]];

	  // F/T wrench: force along z only
	  const wrench = [
		F_cmd * zTool[0], F_cmd * zTool[1], F_cmd * zTool[2],
		0, 0, 0
	  ];

	  // Map to joint torques
	  const J = this.jacobian(model, s.q);
	  let tau = this._matT_vec(J, wrench);

	  // Add gravity compensation
	  if (gains.compensate !== false) {
		const tau_g = this.rne(s.q, s.qd, new Array(s.q.length).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, F_cmd, integral };
	}

	/* =========================================================
	 *  11. Hybrid position/force control (Raibert–Craig)
	 * ========================================================= */
	/**
	 * Split Cartesian task space into position-controlled and force-controlled
	 * directions via a diagonal selection matrix S (6x6, entries 0 or 1).
	 *
	 *    S = 1  → force controlled along that axis
	 *    S = 0  → position controlled along that axis
	 *
	 * @param  {object} s
	 *          q, qd
	 *          x, xRef, xdRef          : Cartesian pose/velocity references
	 *          Fext, Fref              : measured and desired wrench (6)
	 *          R                       : 3x3 tool rotation (for wrench transform)
	 * @param  {object} gains
	 *          S      : 6-vector of 0/1 (diagonal selection matrix)
	 *          Kp, Kd : Cartesian position gains (6)
	 *          Kf, Kfi: force gains (6)
	 *          model, dt, integralF (previous force integral)
	 * @return {object} { tau, wrenchCmd, integralF }
	 */
	hybridControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const dt    = (gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005;

	  const S = (gains.S !== undefined && gains.S !== null) ? gains.S : [0,0,1, 0,0,0];   // default: force along z
	  const Kp = (gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : [400,400,400, 20,20,20];
	  const Kd = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : [ 40, 40, 40,  5,  5,  5];
	  const Kf = (gains.Kf !== undefined && gains.Kf !== null) ? gains.Kf : [  0,  0, 1, 0, 0, 0];
	  const Kfi= (gains.Kfi !== undefined && gains.Kfi !== null) ? gains.Kfi : [  0,  0, 0.1, 0, 0, 0];

	  const q = s.q, qd = s.qd;
	  const J = this.jacobian(model, q);

	  // Current Cartesian pose / velocity
	  const x  = (s.x !== undefined && s.x !== null) ? s.x : this._fkPose(model, q);
	  const xd = (s.xd !== undefined && s.xd !== null) ? s.xd : this._mat_vec(J, qd);

	  const xRef  = (s.xRef !== undefined && s.xRef !== null) ? s.xRef : x;
	  const xdRef = (s.xdRef !== undefined && s.xdRef !== null) ? s.xdRef : new Array(6).fill(0);
	  const Fext  = (s.Fext !== undefined && s.Fext !== null) ? s.Fext : new Array(6).fill(0);
	  const Fref  = (s.Fref !== undefined && s.Fref !== null) ? s.Fref : new Array(6).fill(0);

	  // --- position error part ---
	  const ep  = xRef.map((v, i) => v - x[i]);
	  const ed  = xdRef.map((v, i) => v - xd[i]);

	  // --- force error + integral ---
	  const ef  = Fref.map((v, i) => v - Fext[i]);
	  const integralF = ((gains.integralF !== undefined && gains.integralF !== null) ? gains.integralF : new Array(6).fill(0))
		.map((v, i) => v + ef[i] * dt);

	  // --- combine per axis via S ---
	  const wrenchCmd = new Array(6).fill(0);
	  for (let i = 0; i < 6; i++) {
		if (S[i] > 0.5) {
		  // force-controlled axis
		  wrenchCmd[i] = Kf[i] * ef[i] + Kfi[i] * integralF[i];
		} else {
		  // position-controlled axis -> treat Kp·e + Kd·ė as desired wrench
		  wrenchCmd[i] = Kp[i] * ep[i] + Kd[i] * ed[i];
		}
	  }

	  let tau = this._matT_vec(J, wrenchCmd);

	  if (gains.compensate !== false) {
		const tau_g = this.rne(q, qd, new Array(q.length).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, wrenchCmd, integralF, ep, ef };
	}

	/* =========================================================
	 *  12. Parallel position/force control (Chiaverini–Siciliano)
	 * ========================================================= */
	/**
	 * Unlike hybrid control, BOTH position and force are controlled on every
	 * axis simultaneously. The force loop modifies the position reference:
	 *
	 *    x_modified = x_ref + Kf⁻¹ · (F_ref − F_meas)
	 *
	 * then a position controller drives the arm to x_modified.
	 *
	 * @return {object} { tau, xModified, F_cmd }
	 */
	parallelControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const Kp = (gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : [400,400,400, 20,20,20];
	  const Kd = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : [ 40, 40, 40,  5,  5,  5];
	  const Kf = (gains.Kf !== undefined && gains.Kf !== null) ? gains.Kf : [0.001,0.001,0.001, 0.01,0.01,0.01]; // compliance

	  const q = s.q, qd = s.qd;
	  const J = this.jacobian(model, q);
	  const x = (s.x !== undefined && s.x !== null) ? s.x : this._fkPose(model, q);
	  const xd = (s.xd !== undefined && s.xd !== null) ? s.xd : this._mat_vec(J, qd);

	  const xRef = (s.xRef !== undefined && s.xRef !== null) ? s.xRef : x;
	  const xdRef= (s.xdRef !== undefined && s.xdRef !== null) ? s.xdRef : new Array(6).fill(0);
	  const Fref = (s.Fref !== undefined && s.Fref !== null) ? s.Fref : new Array(6).fill(0);
	  const Fext = (s.Fext !== undefined && s.Fext !== null) ? s.Fext : new Array(6).fill(0);

	  // Force error modifies the reference position
	  const xModified = xRef.map((v, i) =>
		v + Kf[i] * (Fref[i] - Fext[i])
	  );

	  // Now standard Cartesian position control on xModified
	  const ep = xModified.map((v, i) => v - x[i]);
	  const ed = xdRef.map((v, i) => v - xd[i]);

	  const wrenchCmd = ep.map((v, i) => Kp[i] * v + Kd[i] * ed[i]);

	  let tau = this._matT_vec(J, wrenchCmd);
	  if (gains.compensate !== false) {
		const tau_g = this.rne(q, qd, new Array(q.length).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, xModified, F_cmd: Fref.map((v, i) => v - Fext[i]) };
	}

	/* =========================================================
	 *  13. Direct force / torque control (no F/T sensor)
	 * ========================================================= */
	/**
	 * Regulates joint torques directly — the modern approach used by
	 * collaborative arms (Franka, LBR iiwa, Kinova). The tool "feels"
	 * like a specific mass-damper in joint space.
	 *
	 *    τ = τ_ff(q, q̇, q̈_ref) + Kp(q_ref − q) + Kd(q̇_ref − q̇)
	 *
	 * @param  {object} s    { q, qd, qRef, qdRef, qddRef }
	 * @param  {object} gains { Kp, Kd, model, feedforward (bool) }
	 * @return {object} { tau, tauFF, tauFB }
	 */
	directTorqueControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const Kp = (gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : [200,200,200, 50, 50, 50];
	  const Kd = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : [ 20, 20, 20,  5,  5,  5];

	  const qRef   = (s.qRef !== undefined && s.qRef !== null) ? s.qRef : s.q;
	  const qdRef  = (s.qdRef !== undefined && s.qdRef !== null) ? s.qdRef : new Array(s.q.length).fill(0);
	  const qddRef = (s.qddRef !== undefined && s.qddRef !== null) ? s.qddRef : new Array(s.q.length).fill(0);

	  // Feedforward torque (inverse dynamics at the reference)
	  let tauFF = new Array(s.q.length).fill(0);
	  if (gains.feedforward !== false) {
		tauFF = this.rne(qRef, qdRef, qddRef);
	  }

	  // Feedback
	  const tauFB = s.q.map((v, i) =>
		Kp[i] * (qRef[i] - v) + Kd[i] * (qdRef[i] - s.qd[i])
	  );

	  const tau = tauFF.map((v, i) => v + tauFB[i]);
	  return { tau, tauFF, tauFB };
	}

	/* =========================================================
	 *  14. Operational Space Control (Khatib)
	 * ========================================================= */
	/**
	 * Unified torque control in Cartesian space. Includes the dynamically
	 * consistent inverse of the Jacobian and inertia shaping:
	 *
	 *    τ = Jᵀ [ Λ(ẍ_ref + Kp·e + Kd·ė) ] + μ + p
	 *
	 * where Λ is the operational-space inertia matrix, μ is the
	 * Cartesian Coriolis, and p is the gravity vector mapped to task space.
	 *
	 * @param  {object} s    { q, qd, xRef, xdRef, xddRef, Fext }
	 * @param  {object} gains { Kp, Kd, model, Λ (optional override) }
	 * @return {object} { tau, F_cmd, Λ }
	 */
	operationalSpaceControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const Kp = (gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : [400,400,400, 20,20,20];
	  const Kd = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : [ 40, 40, 40,  5,  5,  5];

	  const q = s.q, qd = s.qd;
	  const J = this.jacobian(model, q);
	  const n = q.length;

	  // --- Joint-space inertia matrix M(q) via composite rigid body ---
	  const M = (gains.M !== undefined && gains.M !== null) ? gains.M : this._massMatrix(q);

	  // --- Λ = (J M⁻¹ Jᵀ)⁻¹  (6x6 operational-space inertia) ---
	  const Minv = this._invert(M);
	  // JMiJt = J · M⁻¹ · Jᵀ
	  const JMi = this._zeros(6, n);
	  for (let i = 0; i < 6; i++)
		for (let j = 0; j < n; j++) {
		  let s1 = 0;
		  for (let k = 0; k < n; k++) s1 += J[i][k] * Minv[k][j];
		  JMi[i][j] = s1;
		}
	  const JMiJt = this._zeros(6, 6);
	  for (let i = 0; i < 6; i++)
		for (let j = 0; j < 6; j++) {
		  let s1 = 0;
		  for (let k = 0; k < n; k++) s1 += JMi[i][k] * J[j][k];
		  JMiJt[i][j] = s1;
		}
	  const Λ = this._invert(JMiJt);

	  // --- Cartesian state ---
	  const x  = (s.x !== undefined && s.x !== null) ? s.x : this._fkPose(model, q);
	  const xd = (s.xd !== undefined && s.xd !== null) ? s.xd : this._mat_vec(J, qd);
	  const xRef = (s.xRef !== undefined && s.xRef !== null) ? s.xRef : x;
	  const xdRef = (s.xdRef !== undefined && s.xdRef !== null) ? s.xdRef : new Array(6).fill(0);
	  const xddRef = (s.xddRef !== undefined && s.xddRef !== null) ? s.xddRef : new Array(6).fill(0);

	  const ep = xRef.map((v, i) => v - x[i]);
	  const ed = xdRef.map((v, i) => v - xd[i]);

	  // --- Desired Cartesian acceleration ---
	  const aDes = xddRef.map((v, i) => v + Kp[i] * ep[i] + Kd[i] * ed[i]);

	  // --- F = Λ · aDes ---
	  const Fcmd = this._mat_vec(Λ, aDes);

	  // --- τ = Jᵀ F ---
	  let tau = this._matT_vec(J, Fcmd);

	  // --- Add gravity + Coriolis compensation at the joint level ---
	  if (gains.compensate !== false) {
		const tau_g = this.rne(q, qd, new Array(n).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, F_cmd: Fcmd, Λ };
	}

	/* =========================================================
	 *  15. Assist-as-needed blend (for rehab / cobots)
	 * ========================================================= */
	/**
	 * Smoothly blends between "transparent" and "assistive" based on a
	 * scalar task error or measured human force.
	 *
	 *   alpha = clamp((|e| − e_min) / (e_max − e_min), 0, 1)
	 *   τ = (1−alpha) · τ_transparent + alpha · τ_assist
	 */
	assistAsNeeded(s, gains = {}) {
	  const alpha = this._computeAssistAlpha(s, gains);
	  const tTrans = this.directTorqueControl(s, {
		...gains, Kp: gains.KpTransparent, Kd: gains.KdTransparent,
		feedforward: false
	  });
	  const tAssist = this.directTorqueControl(s, gains);
	  const tau = tTrans.tau.map((v, i) => (1 - alpha) * v + alpha * tAssist.tau[i]);
	  return { tau, alpha, tauTransparent: tTrans.tau, tauAssist: tAssist.tau };
	}

	_computeAssistAlpha(s, gains) {
	  const eMin = (gains.eMin !== undefined && gains.eMin !== null) ? gains.eMin : 0.02;
	  const eMax = (gains.eMax !== undefined && gains.eMax !== null) ? gains.eMax : 0.10;
	  const e = gains.errorMetric
		? gains.errorMetric(s)
		: s.q.map((v, i) => {
			const refVal = (s.qRef !== undefined && s.qRef !== null && s.qRef[i] !== undefined && s.qRef[i] !== null) ? s.qRef[i] : v;
			return Math.abs(refVal - v);
		  })
		  .reduce((a, b) => Math.max(a, b), 0);
	  return Math.max(0, Math.min(1, (e - eMin) / (eMax - eMin)));
	}

	/* =========================================================
	 *  16. Mass matrix via Composite Rigid Body Algorithm (CRBA)
	 * ========================================================= */
	/**
	 * Computes M(q) — the joint-space inertia matrix — required by
	 * operational space control. Simplified CRBA assuming the DH chain
	 * and link inertias are known (this.dynamics).
	 */
	_massMatrix(q) {
	  const n = q.length;
	  const DH = this.DH_Lib.puma01;

	  // Link transforms
	  const T = [this._identity4()];
	  for (let i = 0; i < n; i++) {
		const [th0, a, d, al] = DH[i];
		T.push(this._mul4(T[i], this.DH(th0 + q[i], a, d, al)));
	  }

	  // Aggregate inertia from distal links (simplified diagonal model)
	  const links = (this.dynamics !== undefined && this.dynamics !== null) ? this.dynamics : DH.map(() => ({
		m: 5, r: [0,0,0], I: this._diag3(0.05,0.05,0.05)
	  }));

	  const M = this._zeros(n, n);
	  for (let i = 0; i < n; i++) {
		// z_i in world frame
		const zi = [T[i][0][2], T[i][1][2], T[i][2][2]];
		for (let j = 0; j < n; j++) {
		  const zj = [T[j][0][2], T[j][1][2], T[j][2][2]];
		  // Simplified: only diagonal + symmetric terms from distal links
		  let mij = 0;
		  for (let k = Math.max(i, j); k < n; k++) {
			const pK = [T[k+1][0][3], T[k+1][1][3], T[k+1][2][3]];
			const pI = [T[i][0][3], T[i][1][3], T[i][2][3]];
			const pJ = [T[j][0][3], T[j][1][3], T[j][2][3]];
			const riK = this._cross(zi, pK.map((v,l) => v - pI[l]));
			const rjK = this._cross(zj, pK.map((v,l) => v - pJ[l]));
			mij += links[k].m * this._dot(riK, rjK);
		  }
		  M[i][j] = mij;
		}
	  }
	  // Ensure positive definite
	  for (let i = 0; i < n; i++) if (M[i][i] < 1e-3) M[i][i] = 1e-3;
	  return M;
	}

	/* -------- new small helpers -------- */
	_identity(n) {
	  const I = this._zeros(n, n);
	  for (let i = 0; i < n; i++) I[i][i] = 1;
	  return I;
	}
	_dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

	/** General matrix inverse via Gauss–Jordan (n × n). */
	_invert(A) {
	  const n = A.length;
	  const M = A.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => i === j ? 1 : 0)]);
	  for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		[M[c], M[p]] = [M[p], M[c]];
		const piv = M[c][c];
		for (let k = 0; k < 2 * n; k++) M[c][k] /= piv;
		for (let r = 0; r < n; r++) {
		  if (r === c) continue;
		  const f = M[r][c];
		  for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
		}
	  }
	  return M.map(row => row.slice(n));
	}


	/* =========================================================
	 *  17. Joint velocity control (PI / PID)
	 * ========================================================= */
	/**
	 * Inner-loop joint velocity controller. Most industrial servo drives
	 * accept a velocity command and close this loop in hardware; here we
	 * compute the torque ourselves for direct-drive or research platforms.
	 *
	 *   τ = Kp(q̇_ref − q̇) + Ki∫(q̇_ref − q̇)dt + Kd(q̈_ref − q̈)
	 *       + τ_ff + τ_gravity
	 *
	 * @param  {object} s
	 *          q, qd                : measured joint pos / vel
	 *          qdRef, qddRef        : reference velocity / accel
	 * @param  {object} gains
	 *          Kp, Ki, Kd           : per-joint scalars or arrays
	 *          integral             : previous integral (caller persists)
	 *          tauFF                : optional feedforward torque vector
	 *          compensate           : add gravity (default true)
	 *          model, dt
	 * @return {object} { tau, integral, velError }
	 */
	jointVelocityControl(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const dt    = (gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005;
	  const n     = s.q.length;

	  const arr = v => Array.isArray(v) ? v : new Array(n).fill(v);
	  const Kp = arr((gains.Kp !== undefined && gains.Kp !== null) ? gains.Kp : 20.0);
	  const Ki = arr((gains.Ki !== undefined && gains.Ki !== null) ? gains.Ki :  2.0);
	  const Kd = arr((gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd :  0.5);

	  const qdRef  = (s.qdRef !== undefined && s.qdRef !== null) ? s.qdRef : new Array(n).fill(0);
	  const qddRef = (s.qddRef !== undefined && s.qddRef !== null) ? s.qddRef : new Array(n).fill(0);

	  // Velocity error
	  const ev = qdRef.map((v, i) => v - s.qd[i]);

	  // Integral (with anti-windup clamp)
	  const iClamp = (gains.integralClamp !== undefined && gains.integralClamp !== null) ? gains.integralClamp : 5.0;
	  const integral = ((gains.integral !== undefined && gains.integral !== null) ? gains.integral : new Array(n).fill(0))
		.map((v, i) => Math.max(-iClamp, Math.min(iClamp, v + ev[i] * dt)));

	  // Previous-velocity finite-difference for the D term
	  // (skip when no previous sample is available)
	  const accel = gains.prevQd
		? s.qd.map((v, i) => (v - gains.prevQd[i]) / dt)
		: new Array(n).fill(0);
	  const ea = qddRef.map((v, i) => v - accel[i]);

	  let tau = ev.map((v, i) =>
		Kp[i] * v + Ki[i] * integral[i] + Kd[i] * ea[i]
	  );

	  // Feedforward
	  if (gains.tauFF) tau = tau.map((v, i) => v + gains.tauFF[i]);

	  // Gravity compensation
	  if (gains.compensate !== false) {
		const tau_g = this.rne(s.q, s.qd, new Array(n).fill(0));
		tau = tau.map((v, i) => v + tau_g[i]);
	  }

	  return { tau, integral, velError: ev };
	}

	/* =========================================================
	 *  18. Resolved-rate control (Cartesian velocity → joint velocity)
	 * ========================================================= */
	/**
	 * Given a desired Cartesian twist ẋ = [v; ω], compute joint velocities:
	 *
	 *    q̇ = J⁺ ẋ + (I − J⁺J) q̇₀
	 *
	 * Supports three pseudoinverse flavors:
	 *   "pinv"  : Moore–Penrose (exact when J is full-rank)
	 *   "dls"   : damped least squares (robust near singularities)
	 *   "trans" : transpose (simplest, always stable, poor tracking)
	 *
	 * @param  {object} s    { q, qd (optional), xd, qd0 (nullspace) }
	 * @param  {object} gains { model, method, lambda, qdMax }
	 * @return {object} { qdRef, J, Jpinv, manipulability }
	 */
	resolvedRateControl(s, gains = {}) {
	  const model  = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const method = (gains.method !== undefined && gains.method !== null) ? gains.method : "dls";
	  const lambda = (gains.lambda !== undefined && gains.lambda !== null) ? gains.lambda : 0.05;
	  const n      = s.q.length;

	  const J = this.jacobian(model, s.q);
	  const xd = (s.xd !== undefined && s.xd !== null) ? s.xd : new Array(6).fill(0);

	  let Jpinv;
	  if (method === "trans") {
		Jpinv = J[0].map((_, i) => J.map(r => r[i]));       // Jᵀ
	  } else if (method === "pinv") {
		Jpinv = this._pseudoInverse(J);
	  } else { // dls
		Jpinv = this._dlsInverse(J, lambda);
	  }

	  // Task contribution:  q̇_task = J⁺ ẋ
	  const qdTask = this._matT_vec(Jpinv, xd);

	  // Nullspace:  q̇_null = (I − J⁺J) q̇₀
	  let qdNull = new Array(n).fill(0);
	  if (s.qd0) {
		const N = this._nullspaceProjector(J, Jpinv);
		qdNull = this._mat_vec(N, s.qd0);
	  }

	  let qdRef = qdTask.map((v, i) => v + qdNull[i]);

	  // Optional joint-velocity saturation
	  if (gains.qdMax) {
		qdRef = this._saturateVector(qdRef, gains.qdMax);
	  }

	  return {
		qdRef,
		J, Jpinv,
		manipulability: this._manipulability(J)
	  };
	}

	/* =========================================================
	 *  19. Velocity limiting (per-joint saturation with scaling)
	 * ========================================================= */
	/**
	 * Scale a joint-velocity vector so no component exceeds qdMax, preserving
	 * direction (unlike per-axis clamping, which distorts the path).
	 *
	 * @param  {number[]} qd      raw velocity command
	 * @param  {number[]} qdMax   per-joint limit (scalar → same for all)
	 * @return {number[]}         scaled velocity
	 */
	velocityLimited(qd, qdMax) {
	  const maxArr = Array.isArray(qdMax)
		? qdMax
		: new Array(qd.length).fill(qdMax);
	  let scale = 1;
	  for (let i = 0; i < qd.length; i++) {
		const r = Math.abs(qd[i]) / maxArr[i];
		if (r > scale) scale = r;
	  }
	  return scale > 1 ? qd.map(v => v / scale) : qd.slice();
	}

	/* =========================================================
	 *  20. Acceleration / jerk limiting (S-curve filter)
	 * ========================================================= */
	/**
	 * First-order filter on velocity with explicit acceleration and jerk bounds.
	 * This is the "S-curve" generator that industrial drives run internally.
	 *
	 *   q̇_new = q̇_prev + clip(q̇_ref − q̇_prev, ±aMax·dt)
	 *   then jerk-limited via a secondary filter on the accel command
	 *
	 * @param  {number[]} qdRef     desired velocity (from planner or resolved-rate)
	 * @param  {number[]} qdPrev    previous filtered velocity (caller persists)
	 * @param  {number[]} qddPrev   previous accel (caller persists)
	 * @param  {object}   gains
	 *          aMax, jMax, dt
	 * @return {object} { qd, qdd }
	 */
	accelerationLimited(qdRef, qdPrev, qddPrev, gains = {}) {
	  const dt = (gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005;
	  const n  = qdRef.length;
	  const arr = v => Array.isArray(v) ? v : new Array(n).fill(v);
	  const aMax = arr((gains.aMax !== undefined && gains.aMax !== null) ? gains.aMax : 10.0);
	  const jMax = arr((gains.jMax !== undefined && gains.jMax !== null) ? gains.jMax : 500.0);

	  const qd  = new Array(n);
	  const qdd = new Array(n);

	  for (let i = 0; i < n; i++) {
		// Desired acceleration from velocity error
		let aDes = (qdRef[i] - qdPrev[i]) / dt;
		// Clip to acceleration limit
		aDes = Math.max(-aMax[i], Math.min(aMax[i], aDes));
		// Clip change-of-accel to jerk limit
		const da = aDes - qddPrev[i];
		const daClip = Math.max(-jMax[i] * dt, Math.min(jMax[i] * dt, da));
		const aNew = qddPrev[i] + daClip;

		qdd[i] = aNew;
		qd[i]  = qdPrev[i] + aNew * dt;
	  }
	  return { qd, qdd };
	}

	/* =========================================================
	 *  21. Velocity-based joint trajectory (composable high-level API)
	 * ========================================================= */
	/**
	 * Convenience wrapper that chains the velocity stack:
	 *   planner qdRef  →  velocityLimited  →  accelerationLimited
	 * Returns filtered qd/qdd ready for jointVelocityControl.
	 */
	velocityTrajectory(qdRef, state, gains = {}) {
	  const vLim = this.velocityLimited(qdRef, (gains.qdMax !== undefined && gains.qdMax !== null) ? gains.qdMax : Math.PI);
	  const qdPrev = (state.qdPrev !== undefined && state.qdPrev !== null) ? state.qdPrev : new Array(qdRef.length).fill(0);
	  const qddPrev = (state.qddPrev !== undefined && state.qddPrev !== null) ? state.qddPrev : new Array(qdRef.length).fill(0);
	  const { qd, qdd } = this.accelerationLimited(
		vLim, qdPrev, qddPrev,
		gains
	  );
	  return { qd, qdd };
	}

	/* -------- private helpers for velocity layer -------- */

	/** Moore–Penrose pseudoinverse of a 6×n Jacobian. */
	_pseudoInverse(J) {
	  const m = J.length, n = J[0].length;
	  if (m >= n) {
		// J⁺ = (JᵀJ)⁻¹ Jᵀ
		const Jt = J[0].map((_, i) => J.map(r => r[i]));  // n×m
		const JtJ = this._zeros(n, n);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < n; j++)
			for (let k = 0; k < m; k++)
			  JtJ[i][j] += Jt[i][k] * Jt[j][k];
		const inv = this._invert(JtJ);
		const out = this._zeros(n, m);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < n; k++)
			  out[i][j] += inv[i][k] * Jt[k][j];
		return out;
	  } else {
		// J⁺ = Jᵀ(JJᵀ)⁻¹
		const JJt = this._zeros(m, m);
		for (let i = 0; i < m; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < n; k++)
			  JJt[i][j] += J[i][k] * J[j][k];
		const inv = this._invert(JJt);
		const out = this._zeros(n, m);
		for (let i = 0; i < n; i++)
		  for (let j = 0; j < m; j++)
			for (let k = 0; k < m; k++)
			  out[i][j] += J[k][i] * inv[k][j];
		return out;
	  }
	}

	/** Damped least-squares pseudoinverse:  Jᵀ(JJᵀ + λ²I)⁻¹. */
	_dlsInverse(J, lambda) {
	  const m = J.length, n = J[0].length;
	  const JJt = this._zeros(m, m);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < n; k++)
			JJt[i][j] += J[i][k] * J[j][k];
	  for (let i = 0; i < m; i++) JJt[i][i] += lambda * lambda;
	  const inv = this._invert(JJt);
	  const out = this._zeros(n, m);
	  for (let i = 0; i < n; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < m; k++)
			out[i][j] += J[k][i] * inv[k][j];
	  return out;
	}

	/** Nullspace projector N = I − J⁺J (n×n). */
	_nullspaceProjector(J, Jpinv) {
	  const n = J[0].length;
	  const N = this._identity(n);
	  for (let i = 0; i < n; i++)
		for (let j = 0; j < n; j++) {
		  let s = 0;
		  for (let k = 0; k < J.length; k++) s += Jpinv[i][k] * J[k][j];
		  N[i][j] -= s;
		}
	  return N;
	}

	/** Yoshikawa manipulability:  w = sqrt(det(J Jᵀ)). */
	_manipulability(J) {
	  const m = J.length, n = J[0].length;
	  const JJt = this._zeros(m, m);
	  for (let i = 0; i < m; i++)
		for (let j = 0; j < m; j++)
		  for (let k = 0; k < n; k++)
			JJt[i][j] += J[i][k] * J[j][k];
	  return Math.sqrt(Math.max(0, this._det(JJt)));
	}

	/** Determinant via LU decomposition (small n). */
	_det(A) {
	  const n = A.length;
	  const M = A.map(r => r.slice());
	  let det = 1;
	  for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		if (p !== c) { [M[c], M[p]] = [M[p], M[c]]; det = -det; }
		if (Math.abs(M[c][c]) < 1e-12) return 0;
		det *= M[c][c];
		for (let r = c + 1; r < n; r++) {
		  const f = M[r][c] / M[c][c];
		  for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
		}
	  }
	  return det;
	}

	/** Scale vector so max |component / limit| ≤ 1. */
	_saturateVector(v, limit) {
	  const lim = Array.isArray(limit) ? limit : new Array(v.length).fill(limit);
	  let s = 1;
	  for (let i = 0; i < v.length; i++) s = Math.max(s, Math.abs(v[i]) / lim[i]);
	  return s > 1 ? v.map(x => x / s) : v.slice();
	}


	/* =========================================================
	 *  22. Generalized momentum observer (De Luca & Mattone)
	 * ========================================================= */
	/**
	 * Sensorless external-torque estimation via generalized momentum.
	 *
	 *   Δp      = M(q_k)·q̇_k − M(q_{k−1})·q̇_{k−1}
	 *   r_k     = r_{k−1} + K_o·Δp
	 *             − K_o·Δt·(τ_k + Cᵀ·q̇ − g + r_{k−1})
	 *   τ̂_ext   = r_k
	 *
	 * Requires:
	 *   - Encoders (q) → this.momentumObserver memory
	 *   - Motor currents × torque constants → τ_meas
	 *   - Model: M(q), C(q,q̇), g(q) — provided by _massMatrix, _coriolis, rne
	 *
	 * @param  {object} s
	 *          q         : measured joint angles
	 *          qd        : measured joint velocities
	 *          tau       : measured joint torques (from motor current)
	 * @param  {object} gains
	 *          Ko        : observer bandwidth (scalar or array; default 30)
	 *          dt        : control period (default 0.005)
	 *          model     : DH_Lib entry
	 *          friction  : optional per-joint {tau_c, b, tau_offset}
	 *          memory    : previous observer state (caller persists)
	 * @return {object} { tauExt, r, memory, Fext, p }
	 */
	momentumObserver(s, gains = {}) {
	  const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const n     = s.q.length;
	  const dt    = (gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005;
	  const KoArr = Array.isArray(gains.Ko)
		? gains.Ko
		: new Array(n).fill((gains.Ko !== undefined && gains.Ko !== null) ? gains.Ko : 30.0);

	  // --- first call initializes memory ---
	  const mem = (gains.memory !== undefined && gains.memory !== null) ? gains.memory : {
		qPrev:  s.q.slice(),
		qdPrev: s.qd.slice(),
		pPrev:  this._mat_vec(this._massMatrix(s.q), s.qd),
		rPrev:  new Array(n).fill(0)
	  };

	  // --- current generalized momentum p = M(q)·q̇ ---
	  const M = this._massMatrix(s.q);
	  const p = this._mat_vec(M, s.qd);

	  // --- Δp ---
	  const dp = p.map((v, i) => v - mem.pPrev[i]);

	  // --- Coriolis term Cᵀ·q̇  (uses _coriolis from later) ---
	  const Cqd = this._coriolisTransposeTimesQd(s.q, s.qd);

	  // --- Gravity: rne(q, 0, 0) returns g(q) ---
	  const g = this.rne(s.q, new Array(n).fill(0), new Array(n).fill(0));

	  // --- Friction (if identified) ---
	  const tauFric = gains.friction
		? this.frictionCompensate(s.qd, gains.friction)
		: new Array(n).fill(0);

	  // --- Observer update ---
	  const rNew = new Array(n);
	  for (let i = 0; i < n; i++) {
		const inner = s.tau[i] + Cqd[i] - g[i] - tauFric[i] + mem.rPrev[i];
		rNew[i] = mem.rPrev[i]
			+ KoArr[i] * dp[i]
			- KoArr[i] * dt * inner;
	  }

	  // --- Optional: high-frequency low-pass filter on r for noise suppression ---
	  if (gains.rLPF) {
		const a = gains.rLPF;
		for (let i = 0; i < n; i++) {
		  rNew[i] = a * rNew[i] + (1 - a) * mem.rPrev[i];
		}
	  }

	  // --- Map joint torque to Cartesian wrench ---
	  const J = this.jacobian(model, s.q);
	  const JpinvT = this._pseudoInverse(J);          // J⁺ (n×6)
	  // F_ext = (Jᵀ)⁺ τ_ext = J (Jᵀ J)⁻¹ τ_ext; equivalent to JpinvTᵀ·τ_ext
	  const Fext = new Array(6).fill(0);
	  for (let i = 0; i < 6; i++)
		for (let k = 0; k < n; k++)
		  Fext[i] += JpinvT[k][i] * rNew[k];

	  return {
		tauExt: rNew,
		r: rNew,
		Fext,
		p,
		memory: {
		  qPrev:  s.q.slice(),
		  qdPrev: s.qd.slice(),
		  pPrev:  p,
		  rPrev:  rNew
		}
	  };
	}

	/* =========================================================
	 *  23. Coriolis-transpose-times-qdot via Christoffel symbols
	 * ========================================================= */
	/**
	 * Computes Cᵀ(q,q̇)·q̇ needed by the momentum observer.
	 *
	 *   cᵀᵢ = Σⱼₖ ( ∂Mᵢⱼ/∂qₖ − ½ ∂Mⱼₖ/∂qᵢ ) q̇ⱼ q̇ₖ
	 *
	 * Uses numerical differentiation of M(q) — robust, easy to verify.
	 */
	_coriolisTransposeTimesQd(q, qd) {
	  const n = q.length;
	  const dt = 1e-6;
	  const M0 = this._massMatrix(q);

	  // ∂M/∂qₖ for each k
	  const dM = [];
	  for (let k = 0; k < n; k++) {
		const qP = q.slice(); qP[k] += dt;
		const qM = q.slice(); qM[k] -= dt;
		const MP = this._massMatrix(qP);
		const MM = this._massMatrix(qM);
		dM.push(MP.map((row, i) => row.map((v, j) => (v - MM[i][j]) / (2 * dt))));
	  }

	  const cT = new Array(n).fill(0);
	  for (let i = 0; i < n; i++) {
		let s = 0;
		for (let j = 0; j < n; j++) {
		  for (let k = 0; k < n; k++) {
			const term = dM[k][i][j] - 0.5 * dM[i][j][k];
			s += term * qd[j] * qd[k];
		  }
		}
		cT[i] = s;
	  }
	  return cT;
	}

	/* =========================================================
	 *  24. Observer-based force estimation (full pipeline)
	 * ========================================================= */
	/**
	 * High-level convenience: runs the observer, converts to wrench,
	 * and (optionally) rotates into tool frame.
	 */
	estimateExternalWrench(s, gains = {}) {
	  const out = this.momentumObserver(s, gains);

	  // Rotate wrench from world to tool frame if requested
	  let Fext = out.Fext;
	  if (gains.toToolFrame) {
		const model = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
		const { T } = this.forwardKin(model, s.q);
		const R = [
		  [T[0][0], T[0][1], T[0][2]],
		  [T[1][0], T[1][1], T[1][2]],
		  [T[2][0], T[2][1], T[2][2]]
		];
		const Rt = this._transpose3(R);
		const f = this._mul3v(Rt, Fext.slice(0, 3));
		const m = this._mul3v(Rt, Fext.slice(3, 6));
		Fext = [...f, ...m];
	  }

	  return { ...out, Fext };
	}



	/* =========================================================
	 *  25. Passive admittance control (energy-tank enforced)
	 * ========================================================= */
	/**
	 * Admittance control with time-domain passivity enforcement.
	 *
	 * Pipeline:
	 *   1. ẍ_mod from admittance dynamics (M_d, D_d, K_d)
	 *   2. Compute power flow at the interaction port
	 *   3. Update energy tank; get scaling factor α
	 *   4. Apply α to the admittance output (velocity + pose)
	 *   5. IK to joint targets; feed inner position loop
	 *
	 * @param  {object} s
	 *          q, qd          : joint state (encoders)
	 *          Fext           : external wrench (from F/T or momentum observer)
	 *          xRef           : reference pose (from trajectory or hold)
	 *          dt             : control period
	 * @param  {object} gains
	 *          Md, Dd, Kd     : 6-vectors (diagonal)
	 *          model          : DH_Lib entry
	 *          tank           : EnergyTank instance (caller persists)
	 *          observer       : PassivityObserver instance (caller persists)
	 *          xMod, xdMod    : previous modified pose (caller persists)
	 *          qMin, qMax     : joint limits (for IK)
	 *          innerLoopBW    : inner servo bandwidth (rad/s) — for safety check
	 *          xMax, xMin     : workspace envelope
	 * @return {object}
	 *          { qDes, xMod, xdMod, alpha, tank, observer, safety }
	 */
	passiveAdmittanceControl(s, gains = {}) {
	  const model  = (gains.model !== undefined && gains.model !== null) ? gains.model : this.DH_Lib.puma01;
	  const dt     = (s.dt !== undefined && s.dt !== null) ? s.dt : ((gains.dt !== undefined && gains.dt !== null) ? gains.dt : 0.005);
	  const n      = s.q.length;

	  // --- default gains (comfortable industrial / rehab settings) ---
	  const Md = (gains.Md !== undefined && gains.Md !== null) ? gains.Md : [5,5,5, 0.5,0.5,0.5];
	  const Dd = (gains.Dd !== undefined && gains.Dd !== null) ? gains.Dd : [150,150,150, 15,15,15];
	  const Kd = (gains.Kd !== undefined && gains.Kd !== null) ? gains.Kd : [500,500,500, 30,30,30];

	  // --- persistent state ---
	  const tank = (gains.tank !== undefined && gains.tank !== null) ? gains.tank : new EnergyTank({ T0: 3.0, Tmax: 20.0 });
	  const obs  = (gains.observer !== undefined && gains.observer !== null) ? gains.observer : new PassivityObserver();
	  const xRef = (s.xRef !== undefined && s.xRef !== null) ? s.xRef : this._fkPose(model, s.q);
	  const xModPrev  = (gains.xMod !== undefined && gains.xMod !== null) ? gains.xMod : this._fkPose(model, s.q);
	  const xdModPrev = (gains.xdMod !== undefined && gains.xdMod !== null) ? gains.xdMod : new Array(6).fill(0);

	  const Fext = (s.Fext !== undefined && s.Fext !== null) ? s.Fext : new Array(6).fill(0);

	  // --- 1. admittance dynamics ---
	  const xddMod = new Array(6).fill(0);
	  for (let i = 0; i < 6; i++) {
		const rhs = Fext[i]
			  - Dd[i] * xdModPrev[i]
			  - Kd[i] * (xModPrev[i] - xRef[i]);
		xddMod[i] = rhs / Md[i];
	  }

	  // Candidate update (before passivity scaling)
	  let xdModNew = xdModPrev.map((v, i) => v + xddMod[i] * dt);
	  let xModNew  = xModPrev.map((v, i) => v + xdModNew[i] * dt);

	  // --- 2. power flow at interaction port ---
	  const Pflow = obs.step(xdModPrev, Fext, dt);

	  // --- 3. energy tank ---
	  // Dissipated by damping (always positive)
	  const Pdiss = xdModPrev.reduce((sum, v, i) => sum + Dd[i] * v * v, 0);
	  // Spring power (can be negative — this is what the tank protects)
	  const Pspring = xdModPrev.reduce((sum, v, i) =>
		sum + v * (-Kd[i] * (xModPrev[i] - xRef[i])), 0);

	  // Pin  = power harvested from environment (clamp at 0 — never "negative input")
	  // Pout = dissipative damping + any negative spring power (spring pushing)
	  const Pin  = Math.max(0, Pflow);
	  const Pout = Pdiss + Math.max(0, -Pspring);

	  const alpha = tank.step(Pin, Pout, dt);

	  // --- 4. apply passivity scaling ---
	  // If alpha < 1, scale the *velocity* toward zero (not the pose directly)
	  xdModNew = xdModNew.map(v => v * alpha);
	  // Recompute pose from scaled velocity
	  xModNew  = xModPrev.map((v, i) => v + xdModNew[i] * dt);

	  // --- 5. workspace and joint-limit safety ---
	  const safety = this._safetyCheck(xModNew, s.q, gains);

	  if (!safety.ok) {
		// Freeze admittance — do not command motion beyond the safe envelope
		xModNew  = xModPrev.slice();
		xdModNew = new Array(6).fill(0);
	  }

	  // --- 6. convert to joint target via IK ---
	  const pDes = xModNew.slice(0, 3);
	  const RDes = this._eulerToR(xModNew.slice(3, 6));
	  const ik = this.inverseKinSmart(pDes, RDes, {
		model,
		q0: s.q,
		qMin: (gains.qMin !== undefined && gains.qMin !== null) ? gains.qMin : null,
		qMax: (gains.qMax !== undefined && gains.qMax !== null) ? gains.qMax : null,
		maxIter: 50
	  });

	  return {
		qDes: ik.q,
		xMod: xModNew,
		xdMod: xdModNew,
		alpha,
		tank: tank.T,
		observer: {
		  Pflow,
		  Pdiss,
		  Pspring,
		  cumulative: obs.cumulative,
		  meanPower: obs.recentMeanPower()
		},
		safety,
		ikConverged: ik.converged
	  };
	}

	/* ---------- safety check ---------- */
	_safetyCheck(xMod, q, gains) {
	  const issues = [];

	  // Workspace envelope (if provided)
	  if (gains.xMax && gains.xMin) {
		for (let i = 0; i < 6; i++) {
		  if (xMod[i] > gains.xMax[i] || xMod[i] < gains.xMin[i]) {
			issues.push(`axis ${i} out of envelope`);
		  }
		}
	  }

	  // Inner-loop bandwidth check
	  if (gains.innerLoopBW) {
		const admittanceBW = Math.sqrt(
		  ((gains.Kd !== undefined && gains.Kd !== null && gains.Kd[0] !== undefined && gains.Kd[0] !== null) ? gains.Kd[0] : 500) /
		  ((gains.Md !== undefined && gains.Md !== null && gains.Md[0] !== undefined && gains.Md[0] !== null) ? gains.Md[0] : 5)
		);
		if (admittanceBW > gains.innerLoopBW / 5) {
		  issues.push(`admittance BW ${admittanceBW.toFixed(1)} rad/s exceeds 1/5 of inner loop`);
		}
	  }

	  return { ok: issues.length === 0, issues };
	}






  
}

// End of Manipulator Class

/* =========================================================
 *  Example usage (mirrors the spec's pseudocode)
 * ========================================================= */
if (typeof module !== "undefined") module.exports = Manipulator;

