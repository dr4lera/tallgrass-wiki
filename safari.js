'use strict';
// A local probability sandbox, not a connection to a player's Safari save.
function safariSettings(raw={}){
 const clamp=(v,min,max,fallback)=>Number.isFinite(+v)?Math.max(min,Math.min(max,Math.floor(+v))):fallback;
 const rank=D.odds.ranks.find(r=>r.id===+raw.rank)?.id??D.odds.ranks[0].id;
 return {rank,charm:clamp(raw.charm,0,D.odds.charmLevels.at(-1).level,0),ranger:!!raw.ranger,spectral:!!raw.spectral,steps:clamp(raw.steps,1,10000,600),goldenStart:clamp(raw.goldenStart,0,10000,0)};
}
function safariTraitOdds(settings,golden=false){
 const o=D.odds,sf=o.safari,row=o.wildByRankCharm.find(r=>r.rankId===settings.rank&&r.charmLevel===settings.charm);
 const ranger=settings.ranger?sf.rangerMultiplier:1,gold=golden?sf.goldenMultiplier:1;
 const p=Object.fromEntries(['shiny','umbral','prismana'].map(t=>[t,Math.min(1,row.marginal[t].probability*sf.looks*ranger*gold)]));
 p.spectral=settings.spectral?Math.min(1,p.prismana*o.spectral.prismaticChanceFactor):0;
 p.perfect=Math.min(1,row.marginal.perfect.probability*sf.perfect*ranger*gold);
 p.alpha=sf.alpha;p.gilded=0;
 return p;
}
function safariGoldenCount(settings){return settings.goldenStart?Math.max(0,Math.min(D.odds.safari.goldenSteps,settings.steps-settings.goldenStart+1)):0;}
function safariForecast(settings){
 const normal=safariTraitOdds(settings),gold=safariTraitOdds(settings,true),goldSteps=safariGoldenCount(settings),ordinary=settings.steps-goldSteps;
 return Object.keys(normal).map(t=>({trait:t,normal:normal[t],gold:gold[t],expected:ordinary*normal[t]+goldSteps*gold[t],atLeastOne:1-Math.pow(1-normal[t],ordinary)*Math.pow(1-gold[t],goldSteps)}));
}
function safariSimulate(settings,random=Math.random){
 const rows=safariForecast(settings),counts=Object.fromEntries(rows.map(r=>[r.trait,0])),finds=[];
 let multiple=0;
 for(let step=1;step<=settings.steps;step++){
  const golden=settings.goldenStart>0&&step>=settings.goldenStart&&step<settings.goldenStart+D.odds.safari.goldenSteps;
  const p=safariTraitOdds(settings,golden),traits=Object.keys(p).filter(t=>p[t]>0&&random()<p[t]);
  traits.forEach(t=>counts[t]++);if(traits.length>1)multiple++;
  if(traits.length){finds.push({step,golden,traits});if(finds.length>20)finds.shift();}
 }
 return {counts,finds,multiple};
}
function safariPage(){
 const season=D.odds.spectral,active=Date.now()>=Date.parse(season.start)&&Date.now()<Date.parse(season.end);
 return intro('Tools','Safari sandbox','Try a trip, compare ordinary and Golden Hour odds, and roll a practice session. Nothing here changes your game.','<span class="pill">Version '+esc(D.version)+'</span>')+
 `<section class="article-section"><h2>Plan a practice trip</h2><div class="filters"><label>Trainer rank<select id="sf-rank">${D.odds.ranks.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></label><label>Shiny Charm<select id="sf-charm">${D.odds.charmLevels.map(c=>`<option value="${c.level}">Level ${c.level} · ×${c.multiplier}</option>`).join('')}</select></label><label>Ranger Outfit<select id="sf-ranger"><option value="false">Not worn</option><option value="true">Owned and worn · ×1.25</option></select></label><label>Spectral season<select id="sf-season"><option value="false" ${active?'':'selected'}>Inactive</option><option value="true" ${active?'selected':''}>Active / preview</option></select></label><label>Encounters to test<input id="sf-steps" type="number" min="1" max="10000" value="600"></label><label>Golden Hour starts at encounter<input id="sf-golden" type="number" min="0" max="10000" value="0"></label></div><p class="small-note">Set Golden Hour to 0 for none. A chosen start gives up to ${D.odds.safari.goldenSteps} boosted encounters within this test. This is a hypothetical window; your actual start comes from the server. The encounter count is a testing budget, not a claim about your remaining steps. Spectral defaults to this build’s season dates; the server can override them.</p><div class="button-row"><button class="btn" id="sf-roll">Roll a practice trip</button><button class="btn secondary" id="sf-clear">Clear rolls</button></div></section><div id="sf-forecast"></div><div id="sf-results" aria-live="polite"></div>`+
 section('What the sandbox models','<p>Independent Shiny, Void, Prismatic, eligible Spectral, designated Perfect and Alpha rolls for each encounter. Traits can overlap. Safari multiplies rare looks by ×3 and Perfect by ×2; Golden Hour doubles looks and Perfect, while a worn Ranger Outfit adds ×1.25. Alpha stays 1 in 200, and Safari does not roll Gilded. Charm affects rare looks, not Perfect or Alpha.</p><p>This tests trait rolls before catching. It does not simulate species selection, Focus, outbreaks, costumes, catch success, fleeing, Tokens, or Ladder score. Live event multipliers are excluded. A simulated result or an average is never a promise about the next encounter.</p>');
}
function setupSafari(){
 let runs=0,aggregate={};
 const read=()=>safariSettings({rank:$('#sf-rank').value,charm:$('#sf-charm').value,ranger:$('#sf-ranger').value==='true',spectral:$('#sf-season').value==='true',steps:$('#sf-steps').value,goldenStart:$('#sf-golden').value});
 const reset=()=>{runs=0;aggregate={};$('#sf-results').innerHTML='';};
 const update=()=>{
  reset();const settings=read(),rows=safariForecast(settings);
  $('#sf-forecast').innerHTML=section('Your trip odds',`<p>${num(settings.steps)} encounters · ${num(safariGoldenCount(settings))} in Golden Hour. Counts include overlapping traits; they are not distinct Pokémon.</p>`+table(['Trait','Ordinary encounter','Golden Hour encounter','Average per trip','Chance of ≥1 this trip'],rows.map(r=>[esc(nice(r.trait)),probability(r.normal),probability(r.gold),num(r.expected),probability(r.atLeastOne)])));
 };
 $('#content').querySelectorAll('#sf-rank,#sf-charm,#sf-ranger,#sf-season,#sf-steps,#sf-golden').forEach(e=>e.addEventListener(e.tagName==='INPUT'?'input':'change',update));
 $('#sf-roll').onclick=()=>{
  const settings=read(),result=safariSimulate(settings);runs++;
  Object.entries(result.counts).forEach(([t,n])=>aggregate[t]=(aggregate[t]||0)+n);
  $('#sf-results').innerHTML=section('Practice trip results',`<p><strong>${num(runs)} trip${runs===1?'':'s'} rolled</strong> · ${num(runs*settings.steps)} test encounters. This trip had ${num(result.multiple)} encounters with multiple modeled traits.</p>`+table(['Trait','This trip','Total across rolls'],Object.entries(result.counts).map(([t,n])=>[esc(nice(t)),num(n),num(aggregate[t])]))+`<h3>Latest finds in this trip</h3>${result.finds.length?table(['Encounter','Traits'],result.finds.slice().reverse().map(f=>[num(f.step)+(f.golden?' · Golden Hour':''),esc(f.traits.map(nice).join(' + '))])):'<p>No modeled traits rolled this trip. That can happen even when a trait is possible.</p>'}<p class="small-note">Up to 20 latest finds shown. Change settings to clear accumulated results.</p>`);
 };
 $('#sf-clear').onclick=reset;update();
}
