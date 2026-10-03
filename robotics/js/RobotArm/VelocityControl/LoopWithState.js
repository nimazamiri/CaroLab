// velocity/LoopWithState.js

/**
 * Run a callback repeatedly, managing the persistent state that
 * velocity-stack methods require.
 *
 * @param  {number} ticks    Number of iterations.
 * @param  {number} n        Joint count.
 * @param  {function} step   (tick, state) => { tau, qdRef, qddRef, integral, prevQd, qd, qdd }
 *                            Called each tick. Receives the persistent state.
 *                            Returns the values to store for next tick.
 * @param  {object} initialState  Optional initial persistent values.
 */
function loopWithState(ticks, n, step, initialState = {}) {
  const state = {
    qdPrev:   initialState.qdPrev   || new Array(n).fill(0),
    qddPrev:  initialState.qddPrev  || new Array(n).fill(0),
    integral: initialState.integral || new Array(n).fill(0),
    prevQd:   initialState.prevQd   || new Array(n).fill(0),
    history:  []
  };

  for (let k = 0; k < ticks; k++) {
    const out = step(k, state);

    state.qdPrev   = out.qd       !== undefined ? out.qd       : state.qdPrev;
    state.qddPrev  = out.qdd      !== undefined ? out.qdd      : state.qddPrev;
    state.integral = out.integral !== undefined ? out.integral : state.integral;
    state.prevQd   = out.prevQd   !== undefined ? out.prevQd   : state.prevQd;

    state.history.push({ tick: k, tau: out.tau, qd: out.qd, qdd: out.qdd });
  }

  return state;
}

module.exports = { loopWithState };