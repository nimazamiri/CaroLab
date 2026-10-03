const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));



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