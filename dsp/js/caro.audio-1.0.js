 /* =========================================================
 *  CaroLab - AudioDSP — immutable multichannel audio waveform with DSP methods.  
 *  Version: 1.0
 *  Last Update: 29 Sep 2026
 *
 * Mono input:      new AudioDSP(samples, sampleRate)
 * Multichannel:    new AudioDSP([left, right], sampleRate)
 *
 * ========================================================= */
class AudioDSP {
    constructor(data = [], sampleRate = 1) {
        if (!(sampleRate > 0) || !Number.isFinite(sampleRate)) {
            throw new Error('sampleRate must be a positive number');
        }
        if (!Array.isArray(data) && !ArrayBuffer.isView(data)) {
            throw new Error('AudioDSP data must be an array or typed array');
        }
        const mono = data.length === 0 || typeof data[0] === 'number';
        const channels = mono ? [data] : data;
        if (!Array.isArray(channels) || channels.length < 1) {
            throw new Error('AudioDSP must contain at least one channel');
        }
        const arrays = channels.map(ch => {
            if (!Array.isArray(ch) && !ArrayBuffer.isView(ch)) {
                throw new Error('Each channel must be an array or typed array');
            }
            if (!Array.from(ch).every(v => typeof v === 'number' && Number.isFinite(v))) {
                throw new Error('AudioDSP samples must contain only finite numbers');
            }
            return Array.from(ch);
        });
        const length = arrays[0].length;
        if (!arrays.every(ch => ch.length === length)) {
            throw new Error('All channels must have equal length');
        }
        this.data = arrays.map(ch => [...ch]);
        this.numberOfChannels = this.data.length;
        this.length = length;
        this.sampleRate = sampleRate;
    }

    static from(data, sampleRate = 1) { return new AudioDSP(data, sampleRate); }
    static zeros(length, sampleRate = 1, channels = 1) {
        if (!Number.isInteger(length) || length < 0) throw new Error('length must be a non-negative integer');
        if (!Number.isInteger(channels) || channels < 1) throw new Error('channels must be a positive integer');
        return new AudioDSP(Array.from({length: channels}, () => new Array(length).fill(0)), sampleRate);
    }
    static sineWave(frequency, phase, sampleRate, length, amplitude = 1, channels = 1) {
        if (!(frequency >= 0) || !Number.isInteger(length) || length < 1) throw new Error('Invalid sine-wave parameters');
        const x = Array.from({length: channels}, () => Array.from({length}, (_, n) => amplitude * Math.sin(2 * Math.PI * frequency * n / sampleRate + phase)));
        return new AudioDSP(x, sampleRate);
    }
    static of(...values) { return new AudioDSP(values); }
    [Symbol.iterator]() { return this.data[0][Symbol.iterator](); }
    get(i) { return this.data[0][i]; }
    channel(index = 0) { if (!Number.isInteger(index) || index < 0 || index >= this.numberOfChannels) throw new Error('Invalid channel index'); return [...this.data[index]]; }
    channels() { return this.data.map(ch => [...ch]); }
    toArray() { return this.numberOfChannels === 1 ? [...this.data[0]] : this.channels(); }
    clone() { return new AudioDSP(this.data, this.sampleRate); }
    slice(a, b) { return new AudioDSP(this.data.map(ch => ch.slice(a, b)), this.sampleRate); }
    duration() { return this.length / this.sampleRate; }
    timeAxis() { return Array.from({length: this.length}, (_, n) => n / this.sampleRate); }
    _requireNonEmpty() { if (this.length === 0) throw new Error('AudioDSP is empty'); }
    _map(fn) { return new AudioDSP(this.data.map((ch, c) => fn(ch, c)), this.sampleRate); }
    mixDown() { if (this.numberOfChannels === 1) return this.clone(); return new AudioDSP(Array.from({length: this.length}, (_, n) => this.data.reduce((s, ch) => s + ch[n], 0) / this.numberOfChannels), this.sampleRate); }
    add(other) { this._checkAudio(other); if (this.length !== other.length || this.numberOfChannels !== other.numberOfChannels) throw new Error('AudioDSP objects must have equal shape'); return new AudioDSP(this.data.map((ch,c) => ch.map((v,n) => v + other.data[c][n])), this.sampleRate); }
    subtract(other) { this._checkAudio(other); if (this.length !== other.length || this.numberOfChannels !== other.numberOfChannels) throw new Error('AudioDSP objects must have equal shape'); return new AudioDSP(this.data.map((ch,c) => ch.map((v,n) => v - other.data[c][n])), this.sampleRate); }
    scale(k) { if (!Number.isFinite(k)) throw new Error('Scale must be finite'); return this._map(ch => ch.map(v => v * k)); }
    _checkAudio(other) { if (!(other instanceof AudioDSP)) throw new Error('Expected an AudioDSP instance'); }

    mean(channel = 0) { this._requireNonEmpty(); const x = this.data[channel]; return x.reduce((s,v) => s + v, 0) / x.length; }
    removeDCOffset() { return this._map(ch => { const m = ch.reduce((s,v) => s + v, 0) / ch.length; return ch.map(v => v - m); }); }
    dcBlocker(cutoffHz = 5) { return this._map(ch => AudioDSP._dcBlock(ch, this.sampleRate, cutoffHz)); }
    static _dcBlock(x, sr, cutoff) { if (!(cutoff > 0 && cutoff < sr / 2)) throw new Error('cutoff must be between 0 and Nyquist'); const R = Math.exp(-2 * Math.PI * cutoff / sr); const y = new Array(x.length); let xp=0, yp=0; for (let n=0;n<x.length;n++){ const yn=x[n]-xp+R*yp; y[n]=yn; xp=x[n]; yp=yn; } return y; }

    biquad(coefficients) { const c = AudioDSP._normalizeCoefficients(coefficients); return this._map(ch => AudioDSP._applyBiquad(ch, c)); }
    butterworth({type='lowpass', cutoff, lowCutoff, highCutoff, order=4, zeroPhase=false}={}) { this._requireNonEmpty(); if (!Number.isInteger(order) || order < 1) throw new Error('order must be a positive integer'); const sections = AudioDSP._designButterworth({type, cutoff, lowCutoff, highCutoff, order, sampleRate:this.sampleRate}); const run = x => sections.reduce((y,c) => AudioDSP._applyBiquad(y,c), x); return this._map(ch => { let y=run(ch); if(zeroPhase) y=run([...y].reverse()).reverse(); return y; }); }
    static _butterQ(k,n) { return 1 / (2 * Math.cos(Math.PI * (2*k-1)/(2*n))); }
    static _designButterworth({type, cutoff, lowCutoff, highCutoff, order, sampleRate}) { if(type==='bandpass'){ if(!(lowCutoff>0 && lowCutoff<highCutoff && highCutoff<sampleRate/2)) throw new Error('Invalid bandpass cutoffs'); const center=Math.sqrt(lowCutoff*highCutoff), bw=highCutoff-lowCutoff; return Array.from({length:order},(_,i)=>AudioDSP._designBiquad('bandpass',center,center/bw*AudioDSP._butterQ(i+1,order),sampleRate)); } if(!(cutoff>0 && cutoff<sampleRate/2)) throw new Error('cutoff must be between 0 and Nyquist'); const count=Math.ceil(order/2); const sections=[]; for(let k=1;k<=count;k++) sections.push(AudioDSP._designBiquad(type,cutoff,AudioDSP._butterQ(k,order),sampleRate)); if(order%2){ sections[0]=AudioDSP._designFirstOrder(type,cutoff,sampleRate); } return sections; }
    static _designFirstOrder(type, f, sr) { const K=Math.tan(Math.PI*f/sr); let b0,b1,a0,a1; if(type==='lowpass'){b0=K;b1=K;a0=1+K;a1=1-K;} else if(type==='highpass'){b0=1;b1=-1;a0=1+K;a1=1-K;} else throw new Error('type must be lowpass, highpass, or bandpass'); return {b0:b0/a0,b1:b1/a0,b2:0,a1:a1/a0,a2:0}; }
    static _designBiquad(type, f, Q, sr) { const w=2*Math.PI*f/sr, c=Math.cos(w), s=Math.sin(w), alpha=s/(2*Q); let b0,b1,b2,a0,a1,a2; if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;} else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;} else if(type==='bandpass'){b0=alpha;b1=0;b2=-alpha;a0=1+alpha;a1=-2*c;a2=1-alpha;} else throw new Error('Unknown filter type'); return {b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0}; }
    static _normalizeCoefficients(c) { if(!c || ![c.b0,c.b1,c.b2,c.a1,c.a2].every(Number.isFinite)) throw new Error('Invalid biquad coefficients'); return {b0:c.b0,b1:c.b1,b2:c.b2,a1:c.a1,a2:c.a2}; }
    static _applyBiquad(x,c,state={x1:0,x2:0,y1:0,y2:0}) { const y=new Array(x.length); for(let n=0;n<x.length;n++){const x0=x[n], y0=c.b0*x0+c.b1*state.x1+c.b2*state.x2-c.a1*state.y1-c.a2*state.y2; y[n]=y0; state.x2=state.x1;state.x1=x0;state.y2=state.y1;state.y1=y0;} return y; }
    static _peaking(f,gainDb,Q,sr) { const A=10**(gainDb/40), w=2*Math.PI*f/sr, c=Math.cos(w), s=Math.sin(w), alpha=s/(2*Q); const b0=1+alpha*A,b1=-2*c,b2=1-alpha*A,a0=1+alpha/A,a1=-2*c,a2=1-alpha/A; return {b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0}; }
    parametricEQ(bands=[]) { if(!Array.isArray(bands)) throw new Error('bands must be an array'); return bands.reduce((audio,band) => audio.biquad(AudioDSP._peaking(band.frequency,band.gainDb||0,band.Q||1,audio.sampleRate)), this); }
    equalizer(bands=[]) { return this.parametricEQ(bands); }

    hammingWindow() { return this._map(ch => ch.map((v,n) => v * (0.54 - 0.46*Math.cos(2*Math.PI*n/(this.length-1))))); }
    static hamming(N) { if(!Number.isInteger(N)||N<2) throw new Error('N must be an integer >= 2'); return Array.from({length:N},(_,n)=>0.54-0.46*Math.cos(2*Math.PI*n/(N-1))); }
    movingAverageCentered(windowSize) { if(!Number.isInteger(windowSize)||windowSize<1) throw new Error('windowSize must be a positive integer'); const h=Math.floor(windowSize/2); return this._map(x => x.map((_,i)=>{let s=0,c=0;for(let j=i-h;j<=i+h;j++)if(j>=0&&j<x.length){s+=x[j];c++;}return s/c;})); }
    peaks(windowSize=5) { const x=this.movingAverageCentered(windowSize).data[0], p=[]; for(let i=1;i<x.length-1;i++)if(x[i]>x[i-1]&&x[i]>=x[i+1])p.push({index:i,value:x[i]}); return p; }
    findPeaks({smoothWindow=11,minDistance=.05,minHeight=-Infinity}={}) { const x=this.movingAverageCentered(smoothWindow).data[0], p=[], d=Math.round(minDistance*this.sampleRate); for(let i=1;i<x.length-1;i++)if(x[i]>x[i-1]&&x[i]>=x[i+1]&&x[i]>=minHeight&&(p.length===0||i-p[p.length-1].index>=d))p.push({index:i,t:i/this.sampleRate,value:x[i]}); return p; }
    static peak2peak(peaks) { return peaks.slice(1).map((p,i)=>p.t-peaks[i].t); }
    static frequencyFromPeaks(peaks) { if(peaks.length<2)return NaN; return 1/(AudioDSP.peak2peak(peaks).reduce((s,v)=>s+v,0)/(peaks.length-1)); }

    rms(channel=0) { this._requireNonEmpty(); const x=this.data[channel]; return Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length); }
    power(channel=0) { const r=this.rms(channel); return r*r; }
    rmsDb(channel=0) { const r=this.rms(channel); return r>0?20*Math.log10(r):-Infinity; }
    peak(channel=null) { const xs=channel===null?this.data.flat():[this.data[channel]]; return Math.max(...xs.flat().map(Math.abs)); }
    peakDb(channel=null) { const p=this.peak(channel); return p>0?20*Math.log10(p):-Infinity; }
    normalizePeak(targetDb=-1) { const p=this.peak(); if(p===0)return this.clone(); const gain=10**(targetDb/20)/p; return this.scale(gain); }
    hasClipping(threshold=1) { return this.data.some(ch=>ch.some(v=>Math.abs(v)>=threshold)); }
    info() { return {length:this.length,sampleRate:this.sampleRate,duration:this.duration(),numberOfChannels:this.numberOfChannels,rms:this.numberOfChannels===1?this.rms():this.data.map((_,i)=>this.rms(i)),peak:this.peak()}; }
    padToPow2() { let n=1;while(n<this.length)n<<=1;return n===this.length?this.clone():new AudioDSP(this.data.map(ch=>[...ch,...new Array(n-this.length).fill(0)]),this.sampleRate); }
    toString(precision=4) { return this.numberOfChannels===1?'['+this.data[0].map(v=>v.toFixed(precision)).join(', ')+']':`AudioDSP(${this.numberOfChannels} channels, ${this.length} samples)`; }

    fft(channel=0) { const x=this.data[channel]; if(!x.length||(x.length&(x.length-1))) throw new Error('FFT length must be a power of two'); const N=x.length,re=new Float64Array(x),im=new Float64Array(N); for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}} for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len,wr0=Math.cos(a),wi0=Math.sin(a);for(let i=0;i<N;i+=len){let wr=1,wi=0;for(let k=0;k<len/2;k++){const j=i+k+h(len),uR=re[j-len/2],uI=im[j-len/2],vR=re[j]*wr-im[j]*wi,vI=re[j]*wi+im[j]*wr;re[j-len/2]=uR+vR;im[j-len/2]=uI+vI;re[j]=uR-vR;im[j]=uI-vI;const nr=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=nr;}}} const mag=new Float64Array(N),phase=new Float64Array(N);for(let i=0;i<N;i++){mag[i]=Math.hypot(re[i],im[i]);phase[i]=Math.atan2(im[i],re[i]);}return {re,im,mag,phase}; }
    spectrum(channel=0) { const {mag}=this.fft(channel),N=this.length,half=N/2; return {freqs:Array.from({length:half+1},(_,k)=>k*this.sampleRate/N),amps:Array.from({length:half+1},(_,k)=>(k===0||k===half?1:2)*mag[k]/N)}; }

    createStatefulBiquad(coefficients) { const c=AudioDSP._normalizeCoefficients(coefficients); const states=Array.from({length:this.numberOfChannels},()=>({x1:0,x2:0,y1:0,y2:0})); return { reset(){states.forEach(s=>Object.assign(s,{x1:0,x2:0,y1:0,y2:0}));}, processBlock: block => { const a=block instanceof AudioDSP ? block.data : [block]; if (a.length !== states.length) throw new Error('Channel count mismatch'); return new AudioDSP(a.map((ch,c) => AudioDSP._applyBiquad(Array.from(ch), coefficients, states[c])), this.sampleRate); } }; }
}
function h(len){ return len/2; }
if(typeof module!=='undefined' && module.exports) module.exports=AudioDSP;
if(typeof window!=='undefined') window.AudioDSP=AudioDSP;
