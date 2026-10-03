const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// plant 1/(s^2+2s+1)... use G = 10/(s(s+1)(s+5))? start simple
const G = c.tf([1], [1, 3, 2]);
console.log('Gs: ', String(G));
let st = c.step(G); //ok('step final ~0.5', near(st.y[st.y.length - 1], 0.5, 1e-2), st.y[st.y.length-1]);
let im = c.impulse(G); //ok('impulse peak', near(Math.max(...im.y), 0.25, 1e-2), Math.max(...im.y));


// closed loop
const Cs = c.tf([10], [1]);
const sys = c.closeLoop(G, Cs); ok('closeLoop den', sys.den.join() === '1,3,12', sys.den.join());
const sys2 = c.closeLoop(Cs, G); ok('closeLoop symmetric', sys2.den.join() === sys.den.join());
const ra = c.responseAnalysis(sys, 'step');
ok('overshoot 2nd order', near(ra.overshootPercentage, 100*Math.exp(-Math.PI*(1.5/Math.sqrt(12))/Math.sqrt(1-(1.5/Math.sqrt(12))**2)), 2e-2), ra.overshootPercentage);
console.log(ra);
