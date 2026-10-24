'use strict';
function breedingOptions(){
 const allowed=new Set(D.breedingRules.species.map(p=>p.slug));
 return D.species.filter(p=>allowed.has(p.slug));
}
function costumeOptions(slug,selected=''){
 return '<option value="">None</option>'+D.species.filter(p=>p.entryKind==='costume'&&p.base===slug).map(p=>`<option value="${p.slug}" ${p.slug===selected?'selected':''}>${esc(p.name)}</option>`).join('');
}
function parentCard(i,slug,costume='',alpha=false){
 return `<section class="article-section parent-card"><div class="parent-heading"><span class="card-icon">${i+1}</span><h2>Parent ${i+1}</h2></div><label class="builder-label">Pokémon<input id="breed-mon-${i}" list="breeding-options" value="${esc(mon(slug).name)}" autocomplete="off" aria-label="Parent ${i+1} Pokémon"></label><div id="breed-preview-${i}" class="parent-preview"></div><div class="trait-choices">${['shiny','umbral','prismana','perfect','alpha'].map(t=>`<label title="${t==='perfect'?'Use the game’s Perfect badge; high IVs alone do not add the parent bonus.':nice(t)}"><input id="breed-${t}-${i}" type="checkbox" ${t==='alpha'&&alpha?'checked':''}>${nice(t)}</label>`).join('')}</div><div class="filters"><label>Costume<select id="breed-costume-${i}" data-species="${slug}">${costumeOptions(slug,costume)}</select></label><label>Caught on<select id="breed-island-${i}"><option value="missing">Not recorded</option>${D.regions.map(r=>`<option value="${r.id}" ${r.id==='town'?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label><label>Held item<select id="breed-item-${i}"><option value="">None</option>${D.heldItems.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label></div></section>`;
}
function breedingBuilderUI(){
 return `<div id="breeding-builders"><div class="note-band"><div><h3>Your parents, your egg odds</h3><p>Starts with an example: Ghost-sheet Charmander + Alpha Charizard. Change both cards to match your pair. These are ordinary gameplay probabilities, not a forecast for a particular egg.</p></div></div><datalist id="breeding-options">${breedingOptions().map(p=>`<option value="${esc(p.name)}">#${p.number} · ${p.types.map(nice).join(' / ')}</option>`).join('')}</datalist><div class="button-row variation-controls"><button class="btn secondary" data-breed-preset="costume">Costume + Alpha example</button><button class="btn secondary" data-breed-preset="ditto">Shiny Ditto example</button><button class="btn secondary" data-breed-preset="plain">Ordinary pair</button></div><div class="details-grid">${parentCard(0,'charmander','charmander-ghost')}${parentCard(1,'charizard','',true)}</div><div class="filters variation-controls"><label>Egg warming<select id="breed-warmer"><option value="1">No warmer · ×1</option><option value="1.5">Fire-type warmer · ×1.5</option><option value="2">Flame Body / Magma Armor / Steam Engine · ×2</option></select></label></div><p class="small-note">Use the game’s Perfect badge for the Perfect checkbox. Gender, level, nature and language do not change pairing or these trait chances. Catch islands are the parents’ recorded origins, not where their species usually appears. Warmers do not stack.</p><div id="breeding-pair" aria-live="polite"></div></div>`;
}
function readBreedingParent(i){
 const q=$('#breed-mon-'+i).value.trim().toLowerCase();
 const p=breedingOptions().find(p=>p.slug===q||p.name.toLowerCase()===q);
 if(!p)return null;
 const costume=$('#breed-costume-'+i);
 if(costume.dataset.species!==p.slug){costume.innerHTML=costumeOptions(p.slug);costume.dataset.species=p.slug;}
 return {p,costume:costume.value,island:$('#breed-island-'+i).value,item:$('#breed-item-'+i).value,...Object.fromEntries(['shiny','umbral','prismana','perfect','alpha'].map(t=>[t,$(`#breed-${t}-${i}`).checked]))};
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
 const halloween=new Set(['charmander-ghost','squirtle-shades','bulbasaur-pumpkin']);
 const eventActive=Date.now()<Date.parse('2026-11-01T00:00:00Z');
 const babies=roots.map(slug=>({slug,share:1/roots.length,costume:eventActive?[a,b].map(p=>mon(p.costume)).find(c=>c&&halloween.has(c.slug)&&c.base===slug)?.slug:null}));
 return {ok:true,encounters:same&&!da&&!db?50:100,babies,costume:babies.reduce((n,b)=>n+(b.costume?b.share:0),0),eventActive,reason:da||db?'Ditto follows the other parent’s family.':same?'Same-family pair.':`Shared type: ${shared.map(nice).join(' / ')}. Each parent family is equally likely.`};
}
function syncBreeding(){
 const parents=[readBreedingParent(0),readBreedingParent(1)];
 parents.forEach((p,i)=>{$('#breed-preview-'+i).innerHTML=p?`${(mon(p.costume)?.image||p.p.image)?`<img src="${mon(p.costume)?.image||p.p.image}" class="pokemon-portrait" alt="${esc(p.p.name)}">`:''}<div><h3>${esc(mon(p.costume)?.name||p.p.name)}</h3>${types(p.p.types)}</div>`:'<p>Choose a Pokémon from the list, or enter its full name.</p>';});
 const facts=parents.every(Boolean)?pairFacts(...parents):{ok:false,reason:'Choose a valid Pokémon for each parent to calculate an egg.'};
 $('#breeding-pair').innerHTML=facts.ok?`<section class="article-section"><h2>Compatible pair</h2><p>${esc(facts.reason)} One egg per ${facts.encounters} wild encounters, while the basket has room. Babies hatch at level 5.</p><div class="catalog-grid baby-grid">${facts.babies.map(b=>`<div class="entry-card"><h3>${esc(mon(b.slug)?.name||nice(b.slug))}</h3><span class="pill">${num(b.share*100)}% of eggs</span><p>${b.costume?esc(mon(b.costume).name)+' costume inherited.':'No inherited costume for this family.'}</p><p class="small-note">Base egg warmth: ${D.breedingRules.species.find(p=>p.slug===b.slug)?.hatchEncounters||'—'} wild encounters. About ${Math.ceil((D.breedingRules.species.find(p=>p.slug===b.slug)?.hatchEncounters||0)/+$('#breed-warmer').value)} with this warmer, before warmth already gained.</p>${monLink(b.slug)}</div>`).join('')}</div><p class="small-note">${facts.eventActive?'Halloween costume inheritance ends November 1, 2026 at 00:00 UTC. Only the three matching Halloween costumes pass down in this event.':'Halloween costume inheritance has ended for this version; newly created eggs have no inherited costume.'} Costume odds below are across all eggs from this pair.</p></section>`:`<div class="note-band"><div><h3>This pair cannot produce an egg</h3><p>${esc(facts.reason)}</p></div></div>`;
 $('#odds-source').value='daycare';
 if(facts.ok){
  for(const t of ['shiny','umbral','prismana','perfect','alpha'])$('#parents-'+t).value=String(parents.filter(p=>p[t]).length);
  $('#parents-islands').value=String(parents[0].island!==parents[1].island);
  $('#parents-knot').value=String(parents.some(p=>p.item==='destiny_knot'));
  $('#parents-costume').value=String(facts.costume);
 }
 updateOdds();
 $('#odds-results').hidden=!facts.ok;$('#selected-odds').hidden=!facts.ok;
 $('#all-six').disabled=!facts.ok;
 const regionText=facts.ok?parents[0].island!==parents[1].island?'Different catch islands: ×2 to the base look chances.':'Same catch island: no extra island multiplier.':'';
 $('#breeding-pair').insertAdjacentHTML('beforeend',facts.ok?`<div class="meta pair-bonuses"><span class="pill">${regionText}</span><span class="pill">${parents.some(p=>p.item==='destiny_knot')?'Destiny Knot: ×3 Perfect chance; does not stack.':'No Destiny Knot bonus.'}</span></div>`:'');
}
function setupBreeding(){
 $('#breeding-builders').querySelectorAll('input,select').forEach(e=>e.addEventListener(e.tagName==='INPUT'?'input':'change',syncBreeding));
 $('#breeding-builders').querySelectorAll('[data-breed-preset]').forEach(button=>button.onclick=()=>{
  for(let i=0;i<2;i++)for(const t of ['shiny','umbral','prismana','perfect','alpha'])$(`#breed-${t}-${i}`).checked=false;
  const preset=button.dataset.breedPreset;
  $('#breed-mon-0').value=preset==='ditto'?'Ditto':'Charmander';$('#breed-mon-1').value='Charizard';
  [0,1].forEach(i=>{$('#breed-costume-'+i).dataset.species='';$('#breed-island-'+i).value='town';$('#breed-item-'+i).value='';});
  syncBreeding();
  if(preset==='costume'){$('#breed-costume-0').value='charmander-ghost';$('#breed-alpha-1').checked=true;}
  if(preset==='ditto')$('#breed-shiny-0').checked=true;
  syncBreeding();
 });
 syncBreeding();
}
function zeroExplanation(trait,st){
 if(st.p[trait]>0)return '';
 if(trait==='alpha')return st.source==='daycare'?'Neither parent is Alpha. Each Alpha parent adds a 1-in-64 chance.':'This source does not roll Alpha. Alpha bosses can join after victory; Alpha parents can produce Alpha babies.';
 if(trait==='costume')return st.source==='daycare'?(Date.now()>=Date.parse('2026-11-01T00:00:00Z')?'Halloween inheritance has ended for this build.':'No eligible matching Halloween costume in this setup. Non-Halloween costumes do not inherit here.'):'No costume is assigned by this source. Try a costume prize, Costume Egg, costume outbreak, guest, or eligible Halloween breeding.';
 if(st.source==='founder')return 'The Founder reward fixes its traits; it does not use ordinary starter rolls.';
 if(trait==='perfect')return 'No dedicated Perfect bonus roll for this source. This does not estimate naturally perfect IV spreads.';
 return 'Not rolled by this source.';
}
