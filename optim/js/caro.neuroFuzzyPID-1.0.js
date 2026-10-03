/* =========================================================
 *  CaroLab - Neuro Fuzzy Library  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * caro.neuroFuzzyPID-1.0.js v0.1.0 — a PID controller whose Kp/Ki/Kd gain-scheduling
 * surface is a trainable ANFIS on (e, edot), instead of a fixed rule table.
 *
 *   Kp, Ki, Kd = ANFIS(e, edot)          (trained, not hand-tuned)
 *   u = Kp*e + Ki*∫e dt + Kd*edot
 *
 * This is the neuro-fuzzy-PID idea in [Hong et al. 2012] (an ANFIS front end
 * feeding a PID, their Fig. 3/Eqs. 1-7) — here the ANFIS directly outputs the
 * three gains rather than a setpoint correction, which is the more common
 * "neuro-fuzzy gain scheduler" variant and is what plugs straight into our
 * existing fuzzy-PID code.
 *
 * [Budiharto et al. 2010] (the servant-robot paper) is used only as a
 * worked *evidence* case in neuroFuzzyPID_demo.js — showing that
 * anfis.js's training loop really does learn a hand-written rule table
 * and drive the same input->action mapping the paper trains for. It has
 * no PID in it, so nothing from it is used in this file.
 *
 * Requires anfis.js in the same folder. Independent of fuzzy.js, ga.js
 * and fuzzyPID.js — but see NeuroFuzzyPID.trainFromGainSchedule() below,
 * which is designed to take exactly an AdaptiveFuzzyPID/SimplestFuzzyPID
 * instance (from fuzzyPID.js) as its "teacher".
 *
 * Quick start:
 *   const { NeuroFuzzyPID } = require('./caro.neuroFuzzyPID-1.0.js');
 *   const pid = new NeuroFuzzyPID({ eRange: [-3,3], ecRange: [-3,3], dt: 0.01 });
 *   pid.train([{ e: 1, ec: 0, Kp: 4, Ki: 0.5, Kd: 1 }, ...], { epochs: 200 });
 *   const u = pid.step(error);
 *
 *   // or: learn to imitate an existing fuzzy PID (AdaptiveFuzzyPID) by sampling it:
 *   const { AdaptiveFuzzyPID } = require('./caro.fuzzyPID-1.0.js');
 *   const teacher = new AdaptiveFuzzyPID({ Kp0: 1, Ki0: 0.5, Kd0: 0.03 });
 *   const { student } = NeuroFuzzyPID.trainFromGainSchedule(teacher, { epochs: 150 });
 *
 * ========================================================= */
 
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./caro.anfis-1.0.js'));
  else root.NeuroFuzzyPIDLib = factory(root.ANFISLib);
})(typeof self !== 'undefined' ? self : this, function (ANFISLib) {
  'use strict';

  const { ANFIS } = ANFISLib;
  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

  class NeuroFuzzyPID {
    /**
     * @param {object} o
     *  eRange, ecRange: physical universes for (error, error-rate) fed to the ANFIS (default [-3,3])
     *  eTerms, ecTerms: number of Gaussian terms per input (default 5 each)
     *  anfis: pass your own ANFIS (2 inputs, outputNames ['Kp','Ki','Kd']) instead of building one
     *  Kp0, Ki0, Kd0: optional — if given, every rule's consequent bias is initialized to these,
     *                 so an UNTRAINED controller already behaves like a fixed PID at these gains
     *                 (rather than doing nothing / being all zero) — training then refines it.
     *  dt, outLimits, integralLimit, derivativeTau: as in a normal PID
     */
    constructor(o = {}) {
      this.dt = o.dt;
      this.outLimits = o.outLimits || [-Infinity, Infinity];
      this.integralLimit = o.integralLimit === undefined ? Infinity : o.integralLimit;
      this.derivativeTau = o.derivativeTau || 0;
      this.anfis = o.anfis || new ANFIS({
        ranges: [o.eRange || [-3, 3], o.ecRange || [-3, 3]],
        nMFs: [o.eTerms || 5, o.ecTerms || 5],
        outputNames: ['Kp', 'Ki', 'Kd'],
      });
      if (o.Kp0 !== undefined || o.Ki0 !== undefined || o.Kd0 !== undefined) {
        this.setBiasGains({ Kp0: o.Kp0 || 0, Ki0: o.Ki0 || 0, Kd0: o.Kd0 || 0 });
      }
      this.reset();
    }

    /** Set every rule's consequent bias term (the "at x=0" part) to these gains, coefficients left at 0. */
    setBiasGains({ Kp0 = 0, Ki0 = 0, Kd0 = 0 } = {}) {
      const bias = [Kp0, Ki0, Kd0], nIn = this.anfis.nIn;
      for (const pr of this.anfis.p) for (let k = 0; k < 3; k++) { pr[k].fill(0); pr[k][nIn] = bias[k]; }
      return this;
    }

    reset() { this._int = 0; this._prevE = 0; this._de = 0; this._first = true; this.last = null; return this; }

    /** Gains at a given (e, ec) without touching controller state. */
    gains(e, ec) {
      const out = this.anfis.evaluate([e, ec]);
      return Array.isArray(out) ? { Kp: out[0], Ki: out[1], Kd: out[2] } : out;
    }

    _core(e, ec, dt) {
      const g = this.gains(e, ec);
      const lim = this.integralLimit, inc = e * dt;
      this._int = clamp(this._int + inc, -lim, lim);
      const u = g.Kp * e + g.Ki * this._int + g.Kd * ec;
      const us = clamp(u, this.outLimits[0], this.outLimits[1]);
      if (us !== u && e * u > 0) this._int -= inc; // conditional integration (anti-windup)
      this.last = { u: us, e, ec, integral: this._int, gains: g };
      return us;
    }

    /** One controller update. e = ref - measurement. */
    step(e, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('NeuroFuzzyPID.step needs dt > 0 (pass it or set options.dt)');
      let ec = this._first ? 0 : (e - this._prevE) / dt;
      if (this.derivativeTau > 0) ec = this._de + (dt / (this.derivativeTau + dt)) * (ec - this._de);
      this._de = ec; this._prevE = e; this._first = false;
      return this._core(e, ec, dt);
    }

    /** Like step(), but with a pre-computed error-rate (e.g. to share one e/ec history with another controller). */
    stepWithEC(e, ec, dt) {
      dt = dt || this.dt;
      if (!(dt > 0)) throw new Error('NeuroFuzzyPID.stepWithEC needs dt > 0 (pass it or set options.dt)');
      this._prevE = e; this._first = false;
      return this._core(e, ec, dt);
    }

    /**
     * Train the internal ANFIS on samples of the form {e, ec (or edot), Kp, Ki, Kd}
     * or {e, ec, target:[Kp,Ki,Kd]}. Returns the ANFIS train() result: { history: [rmse,...] }.
     */
    train(samples, opts = {}) {
      const data = samples.map(s => ({
        x: [s.e, s.ec !== undefined ? s.ec : s.edot],
        y: s.target || [s.Kp, s.Ki, s.Kd],
      }));
      return this.anfis.train(data, opts);
    }

    /**
     * Build training data by sampling an existing gain-scheduling controller — anything with
     * a .gains(e, ec) method, e.g. AdaptiveFuzzyPID from fuzzyPID.js — on a grid, then train a
     * NeuroFuzzyPID (new by default, or `student` if supplied) to reproduce it. This is the
     * "train the neuro-fuzzy net to behave like our previous fuzzy PID controller" workflow.
     *
     * @param {{gains:(e:number,ec:number)=>{Kp,Ki,Kd}}} teacher
     * @param {object} o  eRange, ecRange (default [-3,3]), gridE, gridEC (default 15x15),
     *                     student (an existing NeuroFuzzyPID to keep training),
     *                     trainOpts passed straight to ANFIS.train (epochs, lr, ...), seed
     * @returns {{student:NeuroFuzzyPID, data, history}}
     */
    static trainFromGainSchedule(teacher, o = {}) {
      const eR = o.eRange || [-3, 3], ecR = o.ecRange || [-3, 3];
      const nE = o.gridE || 15, nEC = o.gridEC || 15;
      const data = [];
      for (let i = 0; i < nE; i++) for (let j = 0; j < nEC; j++) {
        const e = eR[0] + (eR[1] - eR[0]) * i / (nE - 1);
        const ec = ecR[0] + (ecR[1] - ecR[0]) * j / (nEC - 1);
        const g = teacher.gains(e, ec);
        data.push({ x: [e, ec], y: [g.Kp, g.Ki, g.Kd] });
      }
      const student = o.student || new NeuroFuzzyPID(Object.assign({ eRange: eR, ecRange: ecR }, o));
      const trainOpts = o.trainOpts || { epochs: o.epochs || 150, lr: o.lr };
      const history = student.anfis.train(data, trainOpts).history;
      return { student, data, history };
    }
  }

  return { version: '0.1.0', NeuroFuzzyPID };
});
