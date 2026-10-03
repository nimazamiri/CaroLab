const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));



// controllers
const Gp = c.tf([4],[1,2,0]);   // 4/(s(s+2)) : PM ~ 51.8 
console.log('base PM', c.bodePlot(Gp).margins.phaseMargin);
const Gm = c.tf([10],[1,1,0]);
console.log('Gm base PM', c.bodePlot(Gm).margins.phaseMargin);
const lead = c.controller(Gm, 'Lead', {phaseMargin: 50});
console.log('lead', {alpha:lead.alpha.toFixed(3), T:lead.T.toFixed(3), ach:lead.achieved, w:lead.warnings});
const lag = c.controller(c.tf([1],[1,1,0]), 'Lag', {phaseMargin: 50, K: 5});
console.log('lag', {beta:lag.beta, T:lag.T, ach:lag.achieved, w:lag.warnings});
const ll = c.controller(Gm, 'Lead-Lag', {phaseMargin: 50, Kss: 100});
console.log('leadlag', JSON.stringify({lead:ll.lead, lag:ll.lag, ach:ll.achieved, w:ll.warnings}));
const par = c.controller(Gm, 'Parallel', {phaseMargin: 50, Kss: 100});
const Cll = c.comp2tf(ll), Cpar = c.comp2tf(par);
const f1 = require('../caro.compensator-1.0.js').utils.makeFR(Cll), f2 = require('../caro.compensator-1.0.js').utils.makeFR(Cpar);
ok('parallel == lead-lag freq resp', [0.1,1,10,100].every(w=>near(f1.mag(w), f2.mag(w), 1e-6) && near(f1.phase(w), f2.phase(w),1e-4)), JSON.stringify(par.branches)+' Kinf='+par.Kinf);
const cl = c.closeLoop(c.comp2tf(lead), Gm); console.log('lead CL', c.responseAnalysis(cl,'step').overshootPercentage);
try { const bigLead = c.controller(c.tf([1],[1,0,0]), 'Lead', {phaseMargin:60}); console.log('double integrator lead', bigLead.achieved, bigLead.warnings); } catch(e) { console.log('err', e.message); }
console.log('pid2tf', String(c.pid2tf([2,1,0.5])), '|', String(c.pid2tf([2,1,0.5],{N:10})));
// ramp / impulse analysis
console.log(c.responseAnalysis(cl,'ramp'), c.responseAnalysis(cl,'impulse').peakValue);
