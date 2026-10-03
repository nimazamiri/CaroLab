const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));

// plant 1/(s^2+2s+1)... use G = 10/(s(s+1)(s+5))? start simple
const G = c.tf([1], [1, 3, 2]);
console.log(String(G));
let st = c.step(G); ok('step final ~0.5', near(st.y[st.y.length - 1], 0.5, 1e-2), st.y[st.y.length-1]);
let im = c.impulse(G); ok('impulse peak', near(Math.max(...im.y), 0.25, 1e-2), Math.max(...im.y));

// closed loop
const Cs = c.tf([10], [1]);
const sys = c.closeLoop(G, Cs); ok('closeLoop den', sys.den.join() === '1,3,12', sys.den.join());
const sys2 = c.closeLoop(Cs, G); ok('closeLoop symmetric', sys2.den.join() === sys.den.join());
const ra = c.responseAnalysis(sys, 'step');
ok('overshoot 2nd order', near(ra.overshootPercentage, 100*Math.exp(-Math.PI*(1.5/Math.sqrt(12))/Math.sqrt(1-(1.5/Math.sqrt(12))**2)), 2e-2), ra.overshootPercentage);
console.log(ra);

// stability
const sa = c.stabilityAnalysis(c.tf([1], [1,2,3,4,5]));
ok('unstable classified', sa.classification === 'unstable' && sa.rhpPoleCount === 2, sa.summary);
const sa2 = c.stabilityAnalysis(sys); ok('stable', sa2.stable, sa2.summary);
console.log(sa2.openLoopMargins.phaseMargin);

// margins: G=1/(s(s+1)(s+2)) *K=2 -> known GM: K_max=6 => GM=3 (9.54dB), wpc=sqrt2
const L = c.tf([2],[1,3,2,0]);
const b = c.bodePlot(L);
ok('GM=9.54dB', near(b.margins.gainMarginDb, 20*Math.log10(3), 1e-3), b.margins.gainMarginDb);
ok('wpc=sqrt2', near(b.margins.phaseCrossover, Math.SQRT2, 1e-3), b.margins.phaseCrossover);
console.log('PM', b.margins.phaseMargin, 'wgc', b.margins.gainCrossover);
const w0=b.w[0]; ok('bode phase at w0', near(b.phase[0], -90-Math.atan(w0)*180/Math.PI-Math.atan(w0/2)*180/Math.PI, 1e-6), b.phase[0]);

// root locus
const rl = c.rootLocusPlot(L); ok('rl branches', rl.branches.length === 3, rl.asymptotes.centroid);
const nyq = c.nyquistPlot(L); const nic = c.nicholsPlot(L); ok('nyq/nichols', nyq.real.length > 100 && nic.phase.length > 100);

// ss conversions
for (const form of ['controllable','observable','diagonal']) {
  const num=[1,4], den=[1,3,2,0.5];
  const ss = c.tf2ss(num, den, form + ' canonical');
  const [n2, d2] = c.ss2tf(ss, 1);
  ok('tf2ss/ss2tf '+form, n2.length && near(n2[n2.length-1]/d2[0], 4, 1e-6) && d2.every((v,i)=>near(v, den[i], 1e-6)) && near(n2[n2.length-2]||0,1,1e-6), JSON.stringify(n2.map(v=>+v.toFixed(6)))+' / '+JSON.stringify(d2.map(v=>+v.toFixed(6))));
}
// diagonal with complex poles, biproper
const ssd = c.tf2ss([2,1,3],[1,2,5,0], 'Diagonal Canonical'); 
const [nn,dd] = c.ss2tf(ssd); console.log('diag complex', nn.map(v=>+v.toFixed(5)), dd.map(v=>+v.toFixed(5)));
const ssb = c.tf2ss([3,1,3],[1,2,5], 'controllable'); const [nb,db]=c.ss2tf(ssb); console.log('biproper', nb.map(v=>+v.toFixed(5)), db);
const sysS = c.ss([[0,1],[-2,-3]], [[0],[1]], [[1,0]], 0);
console.log('charEq', String(sysS.characteristicEquation()), sysS.characteristicEquation().polynomialString);
console.log(String(c.ss([[0,1],[-2,-2]],[0,1],[1,0],0).characteristicEquation()));
const [n3,d3] = c.ss2tf(sysS,1); ok('ss2tf', near(n3[n3.length-1],1)&&d3.join()==='1,3,2', n3+' | '+d3);
const ctrb = c.controllability(sysS), obs = c.observability(sysS); ok('ctrb/obs', ctrb.controllable && obs.observable);
const bad = c.ss([[1,0],[0,2]], [[1],[0]], [[1,1]], 0); ok('uncontrollable', !c.controllability(bad).controllable && c.controllability(bad).rank===1);
// step of ss vs tf
const sa3 = c.step(sysS); ok('ss step', near(sa3.y[sa3.y.length-1], 0.5, 1e-2));

// cascade/parallel
const c1 = c.cascade(c.tf([1],[1,1]), c.tf([1],[1,2])); ok('cascade', c1.den.join()==='1,3,2');
const p1 = c.parallel(c.tf([1],[1,1]), c.tf([1],[1,2])); ok('parallel', p1.num.join()==='2,3' && p1.den.join()==='1,3,2', p1.num+'|'+p1.den);
const cs = c.cascade(c.ss([[-1]],[1],[1],0), c.ss([[-2]],[1],[1],0)); const [ncs,dcs]=c.ss2tf(cs); ok('ss cascade', dcs.join()==='1,3,2' , dcs);
const ps = c.parallel(c.ss([[-1]],[1],[1],0), c.ss([[-2]],[1],[1],0)); const [nps,dps]=c.ss2tf(ps); ok('ss parallel', nps.map(v=>+v.toFixed(6)).join()==='2,3', nps);

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
