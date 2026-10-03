const Compensator = require('../caro.compensator-1.0.js');
const c = new Compensator();
const ok = (name, cond, extra) => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : ''));
const near = (a, b, t = 1e-3) => Math.abs(a - b) <= t * (1 + Math.abs(b));


// margins: G=1/(s(s+1)(s+2)) *K=2 -> known GM: K_max=6 => GM=3 (9.54dB), wpc=sqrt2
const L = c.tf([2],[1,3,2,0]);
const b = c.bodePlot(L);
ok('GM=9.54dB', near(b.margins.gainMarginDb, 20*Math.log10(3), 1e-3), b.margins.gainMarginDb);
ok('wpc=sqrt2', near(b.margins.phaseCrossover, Math.SQRT2, 1e-3), b.margins.phaseCrossover);
console.log('PM', b.margins.phaseMargin, 'wgc', b.margins.gainCrossover);
const w0=b.w[0]; ok('bode phase at w0', near(b.phase[0], -90-Math.atan(w0)*180/Math.PI-Math.atan(w0/2)*180/Math.PI, 1e-6), b.phase[0]);

// root locus
const rl = c.rootLocusPlot(L); ok('rl branches', rl.branches.length === 3, rl.asymptotes.centroid);
//
const nyq = c.nyquistPlot(L); 
//
const nic = c.nicholsPlot(L); ok('nyq/nichols', nyq.real.length > 100 && nic.phase.length > 100);
