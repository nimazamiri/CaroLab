/* =========================================================
 *  Passivity observer + energy tank
 * ========================================================= */

class EnergyTank {
  /**
   * Time-domain passivity energy tank.
   *
   *   Ṫ = P_in − P_out            (energy balance)
   *   T ≥ 0                        (passivity constraint)
   *
   * When the constraint is about to be violated, the tank returns a
   * scaling factor α ∈ [0,1] the caller applies to its control output.
   *
   * @param  {object} opts
   *          T0     : initial energy (J)
   *          Tmax   : capacity cap (J) — prevents unbounded accumulation
   *          eta    : fill rate (0..1) — how much input power to harvest
   */
  constructor(opts = {}) {
    this.T    = opts.T0    ?? 2.0;
    this.Tmax = opts.Tmax  ?? 20.0;
    this.eta  = opts.eta   ?? 1.0;   // fully harvest by default
    this.history = [];
  }

  /**
   * Advance one step.
   * @param  {number} Pin   power flowing into the controller (W)
   * @param  {number} Pout  power the controller wants to deliver (W)
   * @param  {number} dt    step (s)
   * @return {number} α     scaling factor for the control output
   */
  step(Pin, Pout, dt) {
    // Energy available this step, without going negative
    const net = this.eta * Pin - Pout;
    const Tnext = this.T + net * dt;

    let alpha = 1.0;
    if (Tnext < 0) {
      // Not enough energy — scale back Pout
      const available = this.T + this.eta * Pin * dt;
      alpha = available > 0 ? Math.max(0, available / (Pout * dt)) : 0;
      this.T = 0;
    } else {
      this.T = Math.min(this.Tmax, Tnext);
    }

    this.history.push(this.T);
    if (this.history.length > 5000) this.history.shift();
    return alpha;
  }

  /** Diagnostic: minimum energy seen (should never be < 0). */
  minEnergy() { return this.history.length ? Math.min(...this.history) : this.T; }
}

class PassivityObserver {
  /**
   * Monitors the energy balance across the interaction port.
   *
   *   P_flow = ẋ_modᵀ · F_ext     (positive = environment pushes robot)
   *
   * Tracks cumulative energy exchanged; a persistently negative
   * cumulative flow indicates the controller is net energy-injecting.
   */
  constructor() {
    this.cumulative = 0;
    this.window = [];
    this.windowSize = 200;
    this.Pmin = 0;
    this.Pmax = 0;
  }

  step(xd, Fext, dt) {
    const P = xd[0]*Fext[0] + xd[1]*Fext[1] + xd[2]*Fext[2]
            + xd[3]*Fext[3] + xd[4]*Fext[4] + xd[5]*Fext[5];
    this.cumulative += P * dt;
    this.window.push(P);
    if (this.window.length > this.windowSize) this.window.shift();
    this.Pmin = Math.min(this.Pmin, P);
    this.Pmax = Math.max(this.Pmax, P);
    return P;
  }

  /** Average power over the recent window — a stability indicator. */
  recentMeanPower() {
    if (!this.window.length) return 0;
    return this.window.reduce((a,b) => a+b, 0) / this.window.length;
  }
}


