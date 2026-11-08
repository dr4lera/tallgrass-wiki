const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const d=JSON.parse(fs.readFileSync('data.json','utf8')),ctx=vm.createContext({console});vm.runInContext(fs.readFileSync('forge.js','utf8')+';globalThis.F=Forge;',ctx);const F=ctx.F,c=d.forge.defaults,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
assert.equal(F.cost(1,c),25);assert.equal(F.cost(2,c),38);assert.equal(F.cost(4,c),63);assert.equal(F.cost(3,c),135);assert.equal(F.cost(5,c),225);assert.equal(F.cost(6,c),338);assert.equal(F.cost(7,c),0);
for(const [mask,value] of [[1,1],[2,3],[4,8],[3,8],[5,18],[6,22],[7,36]])assert.equal(F.dust(mask,0,false,c),value);
assert.equal(F.dust(3,2,false,c),5,'only forged Void contribution halved');assert.equal(F.dust(0,0,true,c),1);assert.equal(F.dust(1,1,true,c),2,'round only after Perfect bonus');
close(F.chances(1,0,c).v,.06);close(F.chances(1,3,c).v,.096);close(F.chances(3,3,c).p,.024);
for(let mask=1;mask<8;mask++)for(let cats=0;cats<4;cats++)close(F.transitions(mask,cats,c).reduce((s,t)=>s+t.p,0),1);
close(F.forecast(1,'any',1,0,c).probability,.0882);close(F.forecast(1,7,1,0,c).probability,.0018);close(F.forecast(1,'any',10,0,c).probability,1-Math.pow(1-.0882,10));
const triple=F.forecast(1,7,10,0,c);assert.ok(triple.gross>F.forecast(1,'any',10,0,c).gross,'projection updates cost after a hit');close(triple.state.reduce((a,b)=>a+b),1);assert.equal(F.forecast(7,7,100,0,c).gross,0);
let q=F.queue(1500,900,0,1000,7);assert.equal(q.now,100);assert.equal(q.later,1400);assert.equal(q.days,2);assert.equal(F.queue(101,1000,6900,1000,7).fits,false);
assert.ok(d.guides.find(g=>g.id==='prism-altar'));assert.ok(d.guides.find(g=>g.id==='auction-house'));assert.ok(d.guides.find(g=>g.id==='mummy-giratina'));assert.equal(d.version,'0.72.2');
// Corroborate pure cost/chance/Dust equations against the actual bounded shipped code.
const raw=fs.readFileSync('tests/altar-reference.txt','utf8');const extract=(start,end)=>{const a=raw.indexOf(start),b=raw.indexOf(end,a);return raw.slice(a,b<0?undefined:b);};
const reference=vm.createContext({el:()=>({cfg:c}),Wr:e=>F.count(e.mask),zT:e=>F.keys.filter(k=>e.mask&F.bits[k]),tMe:e=>e.forged||0,MD:(e,k)=>!!(e.mask&F.bits[k]),H0:e=>!!e.perfect,F0:['s','v','p'],z0:{s:1,v:2,p:4}});
vm.runInContext(extract('function fc(','const tfe=')+extract('function aZ(','function oZ('),reference);
for(let mask=1;mask<8;mask++){for(let forged=0;forged<8;forged++){const e={mask,forged,perfect:true};assert.equal(reference.fc(e,c),F.dust(mask,forged,true,c));}assert.equal(reference.aZ({mask},c),F.cost(mask,c));for(let cats=0;cats<4;cats++){const a=reference.oMe({mask},cats,c),b=F.chances(mask,cats,c);for(const k of F.keys)assert.equal(a[k],b[k]);}}
const html=fs.readFileSync('index.html','utf8');for(const script of [...html.matchAll(/src="([^"?]+\.js)/g)])assert.ok(fs.existsSync(script[1]));
console.log('PASS: all look prices and sacrifice values; exact shipped formula parity; independent transitions; adaptive forecasts; queue limits; route assets; guide coverage.');
