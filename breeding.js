'use strict';
let breedingCurrentFacts=null;
function costumeInheritanceActive(){return Date.now()<Date.parse(D.breedingRules.costumeInheritance.endsAtUtc);}
function breedingOptions(){
 const allowed=new Set(D.breedingRules.species.map(p=>p.slug));
 return D.species.filter(p=>allowed.has(p.slug));
}
function costumeOptions(slug,selected=''){
 return '<option value="">None</option>'+D.species.filter(p=>p.entryKind==='costume'&&p.base===slug).map(p=>`<option value="${p.slug}" ${p.slug===selected?'selected':''}>${esc(p.name)}</option>`).join('');
}
function natureOptions(selected='Hardy'){
 return D.natures.map(n=>`<option value="${esc(n.name)}" ${n.name===selected?'selected':''}>${esc(n.name)}</option>`).join('');
}
function parentCard(i,slug,costume='',alpha=false){
 return `<section class="article-section parent-card"><div class="parent-heading"><span class="card-icon">${i+1}</span><h2>Parent ${i+1}</h2></div><label class="builder-label">Pokémon<input id="breed-mon-${i}" list="breeding-options" value="${esc(mon(slug).name)}" autocomplete="off" aria-label="Parent ${i+1} Pokémon"></label><div id="breed-preview-${i}" class="parent-preview"></div><div class="trait-choices">${['shiny','umbral','prismana','perfect','alpha','spectral'].map(t=>`<label title="${t==='perfect'?'Use the game’s Perfect badge; high IVs alone do not add the parent bonus.':nice(t)}"><input id="breed-${t}-${i}" type="checkbox" ${t==='alpha'&&alpha?'checked':''}>${nice(t)}</label>`).join('')}</div><div class="filters"><label>Costume<select id="breed-costume-${i}" data-species="${slug}">${costumeOptions(slug,costume)}</select></label><label>Caught on<select id="breed-island-${i}"><option value="missing">Not recorded</option>${D.regions.map(r=>`<option value="${r.id}" ${r.id==='town'?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><label>Nature<select id="breed-nature-${i}">${natureOptions()}</select></label><label>Held item<select id="breed-item-${i}"><option value="">None</option>${D.heldItems.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label></div></section>`;
}
function breedingBuilderUI(){
 return `<div id="breeding-builders"><div class="note-band"><div><h3>Your parents, your egg odds</h3><p>Starts with an example: Ghost-sheet Charmander + Alpha Charizard. Change both cards to match your pair. These are ordinary gameplay probabilities, not a forecast for a particular egg.</p></div></div><datalist id="breeding-options">${breedingOptions().map(p=>`<option value="${esc(p.name)}">#${p.number} · ${p.types.map(nice).join(' / ')}</option>`).join('')}</datalist><div class="button-row variation-controls"><button class="btn secondary" data-breed-preset="costume">Costume + Alpha example</button><button class="btn secondary" data-breed-preset="ditto">Shiny Ditto example</button><button class="btn secondary" data-breed-preset="plain">Ordinary pair</button></div><div class="details-grid">${parentCard(0,'charmander','charmander-ghost')}${parentCard(1,'charizard','',true)}</div><div class="filters variation-controls"><label>Egg warming<select id="breed-warmer"><option value="1">No warmer · ×1</option><option value="1.5">Fire-type warmer · ×1.5</option><option value="2">Flame Body / Magma Armor / Steam Engine · ×2</option></select></label></div><p class="small-note">Use the game’s Perfect badge for the Perfect checkbox. Gender, level and language do not change pairing or trait chances. Set each parent’s nature; an Everstone guarantees its holder’s nature for every baby. If both parents hold Everstones with different natures, the game notes do not specify the tie-breaker. Catch islands are the parents’ recorded origins. Warmers do not stack.</p><div id="breeding-pair" aria-live="polite"></div></div>`;
}
function readBreedingParent(i){
 const q=$('#breed-mon-'+i).value.trim().toLowerCase();
 const p=breedingOptions().find(p=>p.slug===q||p.name.toLowerCase()===q);
 if(!p)return null;
 const costume=$('#breed-costume-'+i);
 if(costume.dataset.species!==p.slug){costume.innerHTML=costumeOptions(p.slug);costume.dataset.species=p.slug;}
 return {p,costume:costume.value,island:$('#breed-island-'+i).value,item:$('#breed-item-'+i).value,nature:$('#breed-nature-'+i).value,...Object.fromEntries(['shiny','umbral','prismana','perfect','alpha','spectral'].map(t=>[t,$(`#breed-${t}-${i}`).checked]))};
}
function natureInheritance(a,b){
 const holders=[a,b].filter(p=>p.item==='everstone');
 const names=[...new Set(holders.map(p=>p.nature))];
 if(!names.length)return {kind:'none',text:'No Everstone guarantee is selected; the builder does not assign a parent nature to the baby.'};
 if(names.length===1)return {kind:'guaranteed',text:`Guaranteed baby nature: ${names[0]} (Everstone).`};
 return {kind:'conflict',text:`Both parents hold Everstones with different natures (${names.join(' / ')}). The update notes do not specify which nature wins.`};
}
function pairFacts(a,b){
 const map=new Map(D.breedingRules.species.map(p=>[p.slug,p]));
 const ra=map.get(a.p.slug),rb=map.get(b.p.slug);
 if(!ra.canBreed||!rb.canBreed)return {ok:false,reason:'A Legendary or Mythical evolution family cannot breed in this version of Tallgrass.'};
 const da=a.p.slug==='ditto',db=b.p.slug==='ditto';
 if(da&&db)return {ok:false,reason:'Ditto + Ditto cannot produce eggs.'};
 const same=ra.babySlug===rb.babySlug,shared=a.p.types.filter(t=>b.p.types.includes(t));
 if(!da&&!db&&!same&&!shared.length)return {ok:false,reason:'These parents share neither an evolution family nor a type, and neither is Ditto.'};
 const roots=da?[rb.babySlug]:db?[ra.babySlug]:same?[ra.babySlug]:[ra.babySlug,rb.babySlug];
 const halloween=new Set(D.breedingRules.costumes.filter(c=>c.halloween).map(c=>c.slug));
 const eventActive=costumeInheritanceActive();
 const babies=roots.map(slug=>({slug,share:1/roots.length,costume:eventActive?[a,b].map(p=>mon(p.costume)).find(c=>c&&halloween.has(c.slug)&&c.base===slug)?.slug:null}));
 return {ok:true,encounters:same&&!da&&!db?D.breedingRules.production.sameFamilyEncountersPerEgg:D.breedingRules.production.normalEncountersPerEgg,babies,costume:babies.reduce((n,b)=>n+(b.costume?b.share:0),0),eventActive,nature:natureInheritance(a,b),reason:da||db?'Ditto follows the other parent’s family.':same?'Same-family pair.':`Shared type: ${shared.map(nice).join(' / ')}. Each parent family is equally likely.`};
}
function syncBreeding(){
 const parents=[readBreedingParent(0),readBreedingParent(1)];
 parents.forEach((p,i)=>{$('#breed-preview-'+i).innerHTML=p?`${babySprite({slug:p.p.slug,costume:p.costume},['shiny','umbral','prismana','spectral'].filter(t=>p[t]))}<div><h3>${esc(mon(p.costume)?.name||p.p.name)}</h3>${types(p.p.types)}</div>`:'<p>Choose a Pokémon from the list, or enter its full name.</p>';});
 const facts=parents.every(Boolean)?pairFacts(...parents):{ok:false,reason:'Choose a valid Pokémon for each parent to calculate an egg.'};breedingCurrentFacts=facts;
 $('#breeding-pair').innerHTML=facts.ok?`<section class="article-section"><h2>Compatible pair</h2><p>${esc(facts.reason)} Base production: one egg per ${facts.encounters} wild encounters, while the basket has room (before any live Hatch Rush speed bonus). Babies hatch at level 5.</p><p class="meta"><span class="pill">${esc(facts.nature.text)}</span></p><div class="catalog-grid baby-grid">${facts.babies.map(b=>`<div class="entry-card"><h3>${esc(mon(b.slug)?.name||nice(b.slug))}</h3><span class="pill">${num(b.share*100)}% of eggs</span><p>${b.costume?esc(mon(b.costume).name)+' costume inherited.':'No inherited costume for this family.'}</p><p class="small-note">${esc(facts.nature.text)}</p><p class="small-note">Base egg warmth: ${D.breedingRules.species.find(p=>p.slug===b.slug)?.hatchEncounters||'—'} wild encounters. About ${Math.ceil((D.breedingRules.species.find(p=>p.slug===b.slug)?.hatchEncounters||0)/+$('#breed-warmer').value)} with this warmer, before warmth already gained.</p>${monLink(b.slug)}</div>`).join('')}</div><p class="small-note">${facts.eventActive?'Halloween costume inheritance ends November 9, 2026 at 18:00 UTC by the installed build schedule; check the in-game countdown for server overrides. Only the three matching Halloween costumes pass down in this event.':'Halloween costume inheritance has ended for this version; newly created eggs have no inherited costume.'} Costume odds below are across all eggs from this pair.</p></section>`:`<div class="note-band"><div><h3>This pair cannot produce an egg</h3><p>${esc(facts.reason)}</p></div></div>`;
 $('#odds-source').value='daycare';
 if(facts.ok){
  for(const t of ['shiny','umbral','prismana','perfect','alpha','spectral'])$('#parents-'+t).value=String(parents.filter(p=>p[t]).length);
  $('#parents-islands').value=String(parents[0].island!==parents[1].island);
  $('#parents-knot').value=String(parents.some(p=>p.item==='destiny_knot'));
  $('#parents-costume').value=String(facts.costume);
 }
 $('#breeding-pair').insertAdjacentHTML('beforeend','<div id="breeding-results"></div>');updateOdds();
 $('#odds-results').hidden=!facts.ok;$('#selected-odds').hidden=!facts.ok;
 $('#all-six').disabled=!facts.ok;
 const regionText=facts.ok?parents[0].island!==parents[1].island?'Different catch islands: ×2 to the base look chances.':'Same catch island: no extra island multiplier.':'';
 $('#breeding-pair').insertAdjacentHTML('beforeend',facts.ok?`<div class="meta pair-bonuses"><span class="pill">${regionText}</span><span class="pill">${parents.some(p=>p.item==='destiny_knot')?'Destiny Knot: ×3 Perfect chance; does not stack.':'No Destiny Knot bonus.'}</span><span class="pill">${esc(facts.nature.text)}</span></div>`:'');
}
function setupBreeding(){
 $('#breeding-builders').querySelectorAll('input,select').forEach(e=>e.addEventListener(e.tagName==='INPUT'?'input':'change',syncBreeding));
 $('#breeding-builders').querySelectorAll('[data-breed-preset]').forEach(button=>button.onclick=()=>{
  for(let i=0;i<2;i++)for(const t of ['shiny','umbral','prismana','perfect','alpha','spectral'])$(`#breed-${t}-${i}`).checked=false;
  const preset=button.dataset.breedPreset;
  $('#breed-mon-0').value=preset==='ditto'?'Ditto':'Charmander';$('#breed-mon-1').value='Charizard';
  [0,1].forEach(i=>{$('#breed-costume-'+i).dataset.species='';$('#breed-island-'+i).value='town';$('#breed-item-'+i).value='';$('#breed-nature-'+i).value='Hardy';});
  syncBreeding();
  if(preset==='costume'){$('#breed-costume-0').value='charmander-ghost';$('#breed-alpha-1').checked=true;}
  if(preset==='ditto')$('#breed-shiny-0').checked=true;
  syncBreeding();
 });
 syncBreeding();
}
function zeroExplanation(trait,st){
 if(st.p[trait]>0)return '';
 if(trait==='spectral')return st.source==='founder'?'The Founder reward fixes its traits.':'New Spectral rolls need an active Spooky season and an eligible server-issued roll. Use the season selector to preview the active-season chance.';
 if(trait==='alpha')return st.source==='daycare'?'Neither parent is Alpha. Each Alpha parent adds a 1-in-64 chance.':'This source does not roll Alpha. Alpha bosses can join after victory; Alpha parents can produce Alpha babies.';
 if(trait==='costume')return st.source==='daycare'?(!costumeInheritanceActive()?'Halloween inheritance has ended for this build.':'No eligible matching Halloween costume in this setup. Non-Halloween costumes do not inherit here.'):'No costume is assigned by this source. Try a costume prize, Costume Egg, costume outbreak, guest, or eligible Halloween breeding.';
 if(st.source==='founder')return 'The Founder reward fixes its traits; it does not use ordinary starter rolls.';
 if(trait==='perfect')return 'No dedicated Perfect bonus roll for this source. This does not estimate naturally perfect IV spreads.';
 return 'Not rolled by this source.';
}
function babySprite(b,looks=[]){
 const p=mon(b.costume)||mon(b.slug),shiny=looks.includes('shiny');
 const src=shiny?(p.shinyImage||p.image):p.image;
 const rare=looks.includes('umbral')||looks.includes('prismana');
 return src?`<div class="baby-sprite ${shiny?'baby-shiny':''} ${looks.includes('umbral')?'baby-umbral':''} ${looks.includes('prismana')?'baby-prismana':''} ${looks.includes('spectral')?'baby-spectral':''}" style="--baby-mask:url('${src}')"><img src="${src}" alt="${esc([...looks.map(nice),p.name].join(' '))}" loading="lazy">${rare?'<span class="baby-facets" aria-hidden="true"></span><span class="baby-sheen" aria-hidden="true"></span>':''}${looks.includes('prismana')?Array.from({length:4},(_,i)=>`<span class="baby-shard" style="--shard:${i}" aria-hidden="true"></span>`).join(''):''}${shiny?Array.from({length:3},(_,i)=>`<span class="baby-sparkle" style="--spark:${i}" aria-hidden="true">✦</span>`).join(''):''}</div>`:'<div class="baby-sprite">◇</div>';
}
function spectralPreviewDefinitions(){
 return D.odds.lookDefinitions.flatMap(d=>[false,true].map(spectral=>({...d,id:d.id+(spectral?'_spectral':''),label:(d.id==='normal'?(spectral?'Spectral':'Normal'):d.label+(spectral?' + Spectral':'')),requires:[...d.requires,...spectral?['spectral']:[]],excludes:[...d.excludes,...spectral?[]:['spectral']]})));
}
function babyLookChance(b,def,st){
 const spectral=$('#require-spectral').value;
 if(spectral==='yes'&&!def.requires.includes('spectral')||spectral==='no'&&def.requires.includes('spectral'))return 0;
 let p=def.requires.reduce((n,t)=>n*st.p[t],1);
 def.excludes.forEach(t=>p*=1-st.p[t]);
 for(const t of ['perfect','alpha']){const req=$('#require-'+t).value;if(req==='yes')p*=st.p[t];if(req==='no')p*=1-st.p[t];}
 const costume=$('#require-costume').value;
 if(costume==='yes'&&!b.costume||costume==='no'&&b.costume)p=0;
 return p*b.share;
}
function renderBreedingResults(st){
 const el=$('#breeding-results'),facts=breedingCurrentFacts;
 if(!el||!facts?.ok){if(el)el.innerHTML='';return;}
 const open=new Map([...el.querySelectorAll('details')].map(d=>[d.dataset.baby,d.open]));
 const required=['perfect','alpha'].filter(t=>$('#require-'+t).value==='yes');
 el.innerHTML=`<section class="article-section baby-results"><div class="section-head"><h2>Possible baby Pokémon</h2><span class="pill">Level 5</span></div><p>The species and inherited costume are shown below. Rare looks still roll independently. Each preview is a possible result, not a promised hatch.</p>${facts.babies.map(b=>{
  const p=mon(b.costume)||mon(b.slug);
  const preview=D.odds.lookDefinitions.find(d=>d.id===$('#odds-target').value);
  return `<article class="baby-outcome"><div class="baby-result-heading">${babySprite(b)}<div><span class="eyebrow">${num(b.share*100)}% species chance</span><h3>${esc(p.name)}</h3>${types(mon(b.slug).types)}<div class="related">${b.costume?'<span class="pill">Costume inherited</span>':''}<span class="pill">Hatches at Lv. 5</span></div></div></div><div class="baby-trait-chances">${['shiny','umbral','prismana','perfect','alpha','spectral'].map(t=>`<div><span>${nice(t)}</span><strong>${probability(st.p[t])}</strong></div>`).join('')}</div><details data-baby="${b.slug}" ${open.get(b.slug)!==false?'open':''}><summary>Sprite previews · all 16 looks</summary><p class="small-note">Exact Shiny / Void / Prismatic / Spectral combinations. The chances below are per egg from this pair, including this baby’s species chance and your Perfect, Alpha and Costume filters. Alpha and Perfect are marked with badges.</p><div class="baby-looks">${spectralPreviewDefinitions().map(d=>{
   const chance=babyLookChance(b,d,st);
   return `<div class="baby-look ${d.id===preview.id?'chosen-look':''} ${chance===0?'unavailable-look':''}">${babySprite(b,d.requires)}<h4>${esc(d.label)}</h4><div class="look-badges">${required.map(t=>`<span class="pill">${nice(t)}</span>`).join('')}${b.costume?'<span class="pill">Costume</span>':''}</div><div class="baby-look-chance">${probability(chance)}</div></div>`;
  }).join('')}</div></details><div class="related">${monLink(b.costume||b.slug)}</div></article>`;
 }).join('')}<p class="small-note">Trait percentages above are within each baby family. Sprite previews use the game’s regular, shiny and costume artwork; Void, Prismatic and Spectral use illustrative appearance effects. Spectral does not change combat stats.</p></section>`;
}
