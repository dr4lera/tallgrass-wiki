'use strict';
let teamDraft;
const blankTeamSlot=()=>({slug:'',costume:'',preview:'',shiny:false,umbral:false,prismana:false,spectral:false,alpha:false,perfect:false,nature:'Hardy',ability:'',item:'',moves:[]});
function teamSpecies(){return D.species.filter(p=>p.entryKind!=='transformation'&&p.entryKind!=='costume');}
function teamMovePool(p){return [...new Set([...p.learnset.map(m=>m.moveId),...p.tutorMoves])].map(id=>byId(D.moves,id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));}
function cleanTeam(raw){
 const value={name:String(raw?.name||'My dream squad').slice(0,60),slots:[]};
 for(let i=0;i<4;i++){
  const incoming=raw?.slots?.[i]||{},p=teamSpecies().find(p=>p.slug===incoming.slug),s=blankTeamSlot();
  if(p){
   s.slug=p.slug;s.costume=D.species.some(c=>c.slug===incoming.costume&&c.entryKind==='costume'&&c.base===p.slug)?incoming.costume:'';
   s.preview=D.species.some(c=>c.slug===incoming.preview&&c.entryKind==='transformation'&&c.base===p.slug)?incoming.preview:'';
   for(const t of ['shiny','umbral','prismana','spectral','alpha','perfect'])s[t]=incoming[t]===true;
   s.nature=D.natures.some(n=>n.name===incoming.nature)?incoming.nature:'Hardy';
   s.ability=p.abilities.includes(incoming.ability)?incoming.ability:p.abilities[0]||'';
   s.item=D.heldItems.some(x=>x.id===incoming.item)||D.megaStones[incoming.item]?.base===p.slug?incoming.item:'';
   const pool=new Set(teamMovePool(p).map(m=>m.id));const used=new Set();s.moves=Array.isArray(incoming.moves)?incoming.moves.slice(0,4).map(id=>{const n=Number(id);if(id===null||id===''||!pool.has(n)||used.has(n))return null;used.add(n);return n;}):[];
  }
  value.slots.push(s);
 }
 return value;
}
function exampleTeam(){return cleanTeam({name:'My dream squad',slots:['charizard','garchomp','umbreon','togekiss'].map(slug=>({slug}))});}
function teamBuilderPage(){
 return intro('Squad planner','Build your dream Tallgrass team.','Choose four Pokémon, style every sprite, and plan your moves, held items and slot-1 Leader skill.')+`<div class="note-band"><div><h3>Four slots. Your own strategy.</h3><p>Classic squads have four Pokémon. Slot 1 supplies the Leader skill, while shared starting types activate synergies. Spectral is a permanent cosmetic look and adds no battle-stat bonus. Form previews are visual; starting-squad analysis uses each selected Pokémon’s base form.</p></div><a class="btn secondary" href="#/guide/squad-building">Squad guide ↗</a></div><div class="team-toolbar"><label class="builder-label">Squad name<input id="team-name" maxlength="60" aria-label="Squad name"></label><div class="button-row"><button class="btn secondary" id="team-example">Example squad</button><button class="btn secondary" id="team-clear">Clear squad</button><button class="btn" id="team-share">Share squad ↗</button></div></div><p id="team-save-status" class="small-note" aria-live="polite"></p><div id="team-share-panel" hidden><label class="builder-label">Share this squad<input id="team-share-url" readonly aria-label="Squad share URL"></label></div><datalist id="team-species-options">${teamSpecies().map(p=>`<option value="${esc(p.name)}">#${p.number} · ${p.types.map(nice).join(' / ')} · ${esc(D.roles[p.role]?.name||nice(p.role))}</option>`).join('')}</datalist><div id="team-slots" class="team-slots"></div><div id="team-analysis" aria-live="polite"></div>${related(['leader-skills','type-synergies','combat-roles','held-items','mega-dynamax-gigantamax','natures-and-ivs'])}`;
}
function teamSlotHTML(s,i){
 const p=mon(s.slug),shown=mon(s.costume)||mon(s.preview)||p;
 const formOptions=p?D.species.filter(c=>c.entryKind==='transformation'&&c.base===p.slug):[];
 const pool=p?teamMovePool(p):[];
 return `<section class="article-section team-slot"><div class="team-slot-head"><span class="pill">${i===0?'★ Leader · Slot 1':'Slot '+(i+1)}</span><div><button class="team-small" data-team-action="up" data-slot="${i}" ${i===0?'disabled':''} aria-label="Move slot ${i+1} up">↑</button><button class="team-small" data-team-action="down" data-slot="${i}" ${i===3?'disabled':''} aria-label="Move slot ${i+1} down">↓</button>${i>0?`<button class="team-small" data-team-action="leader" data-slot="${i}">Make Leader</button>`:''}<button class="team-small" data-team-action="clear" data-slot="${i}">Clear</button></div></div><label class="builder-label">Pokémon<input list="team-species-options" value="${esc(p?.name||'')}" placeholder="Search a Pokémon…" data-slot="${i}" data-team-field="species" aria-label="Slot ${i+1} Pokémon"></label>${p?`<div class="team-mon-preview">${babySprite({slug:shown.slug},['shiny','umbral','prismana','spectral'].filter(t=>s[t]))}<div><h2>${esc(shown.name)}</h2>${types(shown.types)}<div class="look-badges"><span class="pill">${esc(D.roles[p.role]?.name||nice(p.role))}</span>${s.alpha?'<span class="pill">Alpha</span>':''}${s.perfect?'<span class="pill">Perfect</span>':''}${s.costume?'<span class="pill">Costume</span>':''}</div></div></div><div class="trait-choices">${['shiny','umbral','prismana','spectral','alpha','perfect'].map(t=>`<label><input type="checkbox" data-slot="${i}" data-team-field="${t}" ${s[t]?'checked':''}>${nice(t)}</label>`).join('')}</div><div class="filters team-settings"><label>Costume<select data-slot="${i}" data-team-field="costume" aria-label="Slot ${i+1} costume">${costumeOptions(p.slug,s.costume)}</select></label><label>Temporary form preview<select data-slot="${i}" data-team-field="preview" aria-label="Slot ${i+1} form"><option value="">Starting form</option>${formOptions.map(f=>`<option value="${f.slug}" ${s.preview===f.slug?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><label>Nature<select data-slot="${i}" data-team-field="nature" aria-label="Slot ${i+1} nature">${D.natures.map(n=>`<option ${s.nature===n.name?'selected':''}>${esc(n.name)}</option>`).join('')}</select></label><label>Ability<select data-slot="${i}" data-team-field="ability" aria-label="Slot ${i+1} ability">${p.abilities.map(id=>`<option value="${id}" ${s.ability===id?'selected':''}>${esc(byId(D.abilities,id)?.name||nice(id))}</option>`).join('')}</select></label><label>Held item / Mega Stone<select data-slot="${i}" data-team-field="item" aria-label="Slot ${i+1} held item"><option value="">None</option>${D.heldItems.map(x=>`<option value="${x.id}" ${s.item===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}${Object.entries(D.megaStones).filter(([,x])=>x.base===p.slug).map(([id,x])=>`<option value="${id}" ${s.item===id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div><div class="team-base-stats"><strong>Preview base stats</strong><span>${Object.entries(shown.stats).map(([k,v])=>`${k.toUpperCase()} ${v}`).join(' · ')}</span></div><details class="team-moves" open><summary>Plan four moves</summary><p class="small-note">Choose from this species’ level-up and Tutor move pool.</p><div class="team-move-grid">${Array.from({length:4},(_,m)=>`<label>Move ${m+1}<select data-slot="${i}" data-team-field="move" data-move="${m}" aria-label="Slot ${i+1} move ${m+1}"><option value="">None</option>${pool.map(x=>`<option value="${x.id}" ${s.moves[m]===x.id?'selected':''}>${esc(x.name)} · ${nice(x.type)} · ${x.power||'Status'}</option>`).join('')}</select></label>`).join('')}</div></details><div class="related">${monLink(p.slug)}</div>`:`<div class="team-empty"><span>＋</span><h3>Your next squad member</h3><p>Pick a Pokémon above to start planning this slot.</p></div>`}</section>`;
}
function teamAnalysis(){
 const mons=teamDraft.slots.map(s=>mon(s.slug)).filter(Boolean),lead=mon(teamDraft.slots[0].slug);
 const leader=lead&&D.leaders.find(l=>l.pokemon===lead.slug);
 const counts={};for(const p of mons)for(const type of p.types)counts[type]=(counts[type]||0)+1;
 const rows=byId(D.guides,'type-synergies').sections.find(s=>s.table)?.table.rows||[];
 const active=rows.filter(r=>(counts[r[0].toLowerCase()]||0)>=2);
 const coverage=[...new Set(teamDraft.slots.flatMap(s=>s.moves.map(id=>byId(D.moves,id)).filter(m=>m&&m.power>0).map(m=>m.type)))];
 return `<div class="details-grid team-analysis-grid">${section('Slot-1 Leader',leader?`<h3>${esc(leader.ability)}</h3><p>${esc(lead.name)} · ${esc(leader.description)}</p>`:lead?`<p>${esc(lead.name)} has no signature squad Leader skill in the current reference.</p>`:'<p>Choose slot 1 to see its signature Leader skill.</p>')}${section('Role balance',`<div class="team-role-counts">${Object.entries(D.roles).map(([id,r])=>`<div><strong>${mons.filter(p=>p.role===id).length}</strong><span>${esc(r.name)}</span></div>`).join('')}</div><p class="small-note">DPS strengthens attacks; Break helps crack guards and shields; Support heals from the bench. ${guideLink('combat-roles')}</p>`)}</div>${section('Starting-squad type synergies',active.length?table(['Type','Members','Synergy','Effect'],active.map(r=>[types([r[0].toLowerCase()]),counts[r[0].toLowerCase()],esc(r[1]),esc(r[2])])):'<p>No type pairs yet. Two starting squad members sharing a type activate that synergy.</p>')}${section('Selected attacking move types',coverage.length?types(coverage):'<p>Choose attacking moves to see your coverage here.</p>')}${section('Forms and equipment',`<p>Only one Pokémon can Mega Evolve per fight. Temporary form previews show that form’s artwork, types and base stats; starting-squad synergies and roles above use the starting species.</p>${teamDraft.slots.filter(s=>s.item).map(s=>`<p><strong>${esc(mon(s.slug)?.name)}</strong> · ${esc(byId(D.heldItems,s.item)?.name||D.megaStones[s.item]?.name)}${byId(D.heldItems,s.item)?.desc?' — '+esc(byId(D.heldItems,s.item).desc):''}</p>`).join('')}`)}`;
}
function saveTeam(){if($('#team-share-panel'))$('#team-share-panel').hidden=true;try{localStorage.setItem('tg-wiki-team-v1',JSON.stringify(teamDraft));$('#team-save-status').textContent='Squad saved in this browser. Share a link to use it elsewhere.';}catch{$('#team-save-status').textContent='Squad changes are kept for this page. Use Share squad to keep a link.';}}
function renderTeam(){
 $('#team-slots').innerHTML=teamDraft.slots.map(teamSlotHTML).join('');$('#team-analysis').innerHTML=teamAnalysis();
 $('#team-slots').querySelectorAll('[data-team-field]').forEach(el=>el.onchange=()=>{
  const i=+el.dataset.slot,s=teamDraft.slots[i],field=el.dataset.teamField;
  if(field==='species'){
   const q=el.value.trim().toLowerCase(),p=teamSpecies().find(p=>p.name.toLowerCase()===q||p.slug===q);
   if(!p&&q){el.setCustomValidity('Choose a Pokémon from the list.');el.reportValidity();return;}
   teamDraft.slots[i]=blankTeamSlot();if(p){teamDraft.slots[i].slug=p.slug;teamDraft.slots[i].ability=p.abilities[0]||'';}
  }else if(field==='move')s.moves[+el.dataset.move]=el.value===''?null:+el.value;
  else if(el.type==='checkbox')s[field]=el.checked;
  else{s[field]=el.value;if(field==='costume'&&el.value)s.preview='';if(field==='preview'&&el.value){s.costume='';const stone=Object.entries(D.megaStones).find(([,x])=>x.form===el.value);if(stone)s.item=stone[0];}}
  teamDraft=cleanTeam(teamDraft);saveTeam();renderTeam();
 });
 $('#team-slots').querySelectorAll('[data-team-action]').forEach(b=>b.onclick=()=>{
  const i=+b.dataset.slot,a=b.dataset.teamAction;
  if(a==='clear')teamDraft.slots[i]=blankTeamSlot();else{const j=a==='leader'?0:a==='up'?i-1:i+1;if(j>=0&&j<4)[teamDraft.slots[i],teamDraft.slots[j]]=[teamDraft.slots[j],teamDraft.slots[i]];}
  saveTeam();renderTeam();
 });
}
function setupTeamBuilder(encoded){
 let raw;
 if(encoded&&encoded.length<16000)try{raw=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));}catch{}
 if(!raw)try{raw=JSON.parse(localStorage.getItem('tg-wiki-team-v1'));}catch{}
 teamDraft=raw?cleanTeam(raw):exampleTeam();$('#team-name').value=teamDraft.name;
 $('#team-name').oninput=()=>{teamDraft.name=$('#team-name').value.slice(0,60);saveTeam();};
 $('#team-clear').onclick=()=>{teamDraft=cleanTeam({name:teamDraft.name});saveTeam();renderTeam();};
 $('#team-example').onclick=()=>{teamDraft=exampleTeam();$('#team-name').value=teamDraft.name;saveTeam();renderTeam();};
 $('#team-share').onclick=async()=>{
  const packed=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(teamDraft))));
  const url=location.href.split('#')[0]+'#/team-builder/'+encodeURIComponent(packed);
  $('#team-share-panel').hidden=false;$('#team-share-url').value=url;
  try{await navigator.clipboard.writeText(url);$('#team-save-status').textContent='Squad link copied.';}catch{$('#team-share-url').select();$('#team-save-status').textContent='Copy the squad link above.';}
 };
 renderTeam();saveTeam();
}
