const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));


// PID
const P = c.tf([1],[1,3,3,1]);
let t0=Date.now();
const zn = c.pid(P, 'zigler_nichols'); console.log('ZN', zn, zn.info.method);
const gen = c.pid(P, 'general'); console.log('general', gen, (Date.now()-t0)+'ms');
for (const [nm,k] of [['zn',zn],['gen',gen]]) { const T=c.closeLoop(P, c.pid2tf(k)); const r=c.responseAnalysis(T,'step'); console.log(nm, 'OS',r.overshootPercentage.toFixed(1),'ts',r.settlingTime.toFixed(2),'ess',r.steadyStateError.toExponential(1)); }
// reaction curve on 1/((s+1)(s+2)(s+3)... ) plant w/o -180 crossover: 1/((s+1)(s+2))
try { console.log('ZN rc', c.pid(c.tf([1],[1,3,2]), 'ziegler_nichols')); } catch(e){ console.log('ZN 2nd order:', e.message); }
try { console.log('ZN 1st', c.pid(c.tf([1],[1,1]), 'ziegler_nichols')); } catch(e){ console.log('ZN 1st:', e.message); }
console.log('general 1st order', c.pid(c.tf([1],[1,1]),'general'));
console.log('general integrator', c.pid(c.tf([1],[1,1,0]),'general'));