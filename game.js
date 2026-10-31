(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const STORE='neonOutpostSave_v1';
const defaultKeys={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',dash:'Space',pause:'Escape'};
let saveData={best:0,games:0,bestWave:0,runs:[],achievements:[],keys:{...defaultKeys},sound:true,effects:true,vibration:true,sensitivity:6,difficulty:2,gems:0,nukes:0,companions:0,unlockedSkins:['default'],activeSkin:'default',unlockedDroneSkins:['drone_scout'],activeDroneSkin:'drone_scout',shipUpgrades:{damage:0,fireRate:0,armor:0,speed:0,piercing:0,critical:0,magnet:0,dash:0,projectile:0},droneUpgrades:{damage:0,fireRate:0,hull:0,range:0,volley:0,agility:0}};
try{const old=JSON.parse(localStorage.getItem(STORE)||'null');if(old)saveData={...saveData,...old,keys:{...defaultKeys,...(old.keys||{})}}}catch(e){}
saveData.shipUpgrades={damage:0,fireRate:0,armor:0,speed:0,piercing:0,critical:0,magnet:0,dash:0,projectile:0,...(saveData.shipUpgrades||{})};saveData.droneUpgrades={damage:0,fireRate:0,hull:0,range:0,volley:0,agility:0,...(saveData.droneUpgrades||{})};for(const g of [saveData.shipUpgrades,saveData.droneUpgrades])for(const k of Object.keys(g))g[k]=Math.max(0,Math.min(3,Math.floor(Number(g[k])||0)));saveData.gems=Math.max(0,Number(saveData.gems)||0);saveData.nukes=Math.max(0,Number(saveData.nukes)||0);saveData.companions=Math.max(0,Number(saveData.companions)||0);saveData.unlockedSkins=Array.isArray(saveData.unlockedSkins)?saveData.unlockedSkins:['default'];if(!saveData.unlockedSkins.includes('default'))saveData.unlockedSkins.unshift('default');saveData.unlockedDroneSkins=Array.isArray(saveData.unlockedDroneSkins)?saveData.unlockedDroneSkins:['drone_scout'];if(!saveData.unlockedDroneSkins.includes('drone_scout'))saveData.unlockedDroneSkins.unshift('drone_scout');
let chosenMode='classic',scoreFilter='all',activePanel=null,controlMode='pc';
let touchVector={x:0,y:0},touchDash=false,touchFiring=false,joystickPointer=null;
let onlineSession=null,rtcPeer=null,rtcConnection=null;
const modes={classic:{label:'CLASSIQUE',spawn:1,health:1,score:1},rush:{label:'RUSH',spawn:1.65,health:.9,score:1.35},survival:{label:'SURVIE',spawn:1.25,health:1.4,score:1.2},multiplayer:{label:'COOP EN LIGNE',spawn:1.12,health:1.08,score:1.3}};
const achievementDefs=[
 {id:'first',icon:'✦',name:'Premier contact',desc:'Élimine ton premier ennemi.',test:s=>s.kills>=1},
 {id:'wave5',icon:'⌁',name:'Toujours debout',desc:'Atteins la vague 5.',test:s=>s.wave>=5},
 {id:'score1k',icon:'◈',name:'Millénaire',desc:'Obtiens 1 000 points en une partie.',test:s=>s.score>=1000},
 {id:'kills25',icon:'ϟ',name:'Nettoyage',desc:'Élimine 25 ennemis en une partie.',test:s=>s.kills>=25},
 {id:'time180',icon:'◷',name:'Endurance',desc:'Survis pendant 3 minutes.',test:s=>s.time>=180},
 {id:'score10k',icon:'⬡',name:'Légende du secteur',desc:'Obtiens 10 000 points en une partie.',test:s=>s.score>=10000}
];
let W=innerWidth,H=innerHeight,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
function hydrateSaveData(raw){const d={best:0,games:0,bestWave:0,runs:[],achievements:[],keys:{...defaultKeys},sound:true,effects:true,vibration:true,sensitivity:6,difficulty:2,gems:0,nukes:0,companions:0,unlockedSkins:['default'],activeSkin:'default',unlockedDroneSkins:['drone_scout'],activeDroneSkin:'drone_scout',shipUpgrades:{damage:0,fireRate:0,armor:0,speed:0,piercing:0,critical:0,magnet:0,dash:0,projectile:0},droneUpgrades:{damage:0,fireRate:0,hull:0,range:0,volley:0,agility:0}};const v=raw||{};const out={...d,...v,keys:{...defaultKeys,...(v.keys||{})},shipUpgrades:{...d.shipUpgrades,...(v.shipUpgrades||{})},droneUpgrades:{...d.droneUpgrades,...(v.droneUpgrades||{})}};out.runs=Array.isArray(out.runs)?out.runs:[];out.achievements=Array.isArray(out.achievements)?out.achievements:[];out.unlockedSkins=Array.isArray(out.unlockedSkins)?out.unlockedSkins:['default'];if(!out.unlockedSkins.includes('default'))out.unlockedSkins.unshift('default');out.unlockedDroneSkins=Array.isArray(out.unlockedDroneSkins)?out.unlockedDroneSkins:['drone_scout'];if(!out.unlockedDroneSkins.includes('drone_scout'))out.unlockedDroneSkins.unshift('drone_scout');for(const g of [out.shipUpgrades,out.droneUpgrades])for(const k of Object.keys(g))g[k]=Math.max(0,Math.min(3,Math.floor(Number(g[k])||0)));if(!out.unlockedSkins.includes(out.activeSkin))out.activeSkin='default';if(!out.unlockedDroneSkins.includes(out.activeDroneSkin))out.activeDroneSkin='drone_scout';return out;}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(saveData));}catch(e){console.warn('Sauvegarde locale impossible',e)}}
function fmt(n){return Math.max(0,Math.floor(n)).toString().padStart(6,'0')}
function modeName(m){return modes[m]?.label||'CLASSIQUE'}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.add('hidden'),2300)}
function showPanel(id){document.querySelectorAll('.side-panel').forEach(p=>p.classList.add('hidden'));activePanel=id;if(id){$(id).classList.remove('hidden');if(id==='scoresPanel')renderFullScores();if(id==='achievementsPanel')renderAchievements();if(id==='settingsPanel')renderKeys();if(id==='shopPanel')renderShop()}updateTouchControls();}
function hidePanels(){showPanel(null)}
function updateDashboard(){
 $('bestScore').textContent=fmt(saveData.best);$('gamesPlayed').textContent=saveData.games;$('bestWave').textContent=saveData.bestWave;$('achievementCount').textContent=`${saveData.achievements.length} / ${achievementDefs.length}`;$('gemsHome').textContent=saveData.gems.toLocaleString('fr-CA');$('nukesHome').textContent=`NUKES : ${saveData.nukes}`;
 const rows=[...saveData.runs].sort((a,b)=>b.score-a.score).slice(0,5);$('homeLeaderboard').innerHTML=rows.length?rows.map((r,i)=>`<div class="score-row"><span class="score-rank">${String(i+1).padStart(2,'0')}</span><span>${modeName(r.mode)}<small class="score-mode">${r.date}</small></span><b class="score-points">${r.score.toLocaleString('fr-CA')}</b></div>`).join(''):'<div class="score-empty">AUCUN SCORE POUR LE MOMENT.<br>LANCE TA PREMIÈRE PARTIE !</div>';
}
function renderFullScores(){
 $('scoreFootnote').textContent='Tes scores sont enregistrés sur cet appareil.';
 let rows=saveData.runs.filter(r=>scoreFilter==='all'||r.mode===scoreFilter).sort((a,b)=>b.score-a.score);
 $('fullLeaderboard').innerHTML=rows.length?rows.map((r,i)=>`<div class="full-score-row"><span class="number">${String(i+1).padStart(2,'0')}</span><span><strong>${modeName(r.mode)}</strong><small>${r.date} · VAGUE ${r.wave} · ${r.kills} ÉLIMINATIONS</small></span><b class="points">${r.score.toLocaleString('fr-CA')}</b></div>`).join(''):'<div class="score-empty">AUCUN SCORE DANS CETTE CATÉGORIE.</div>';
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c]));}

function renderAchievements(){$('achievementList').innerHTML=achievementDefs.map(a=>{let ok=saveData.achievements.includes(a.id);return `<div class="achievement ${ok?'unlocked':''}"><div class="achievement-icon">${a.icon}</div><span><b>${a.name}</b><small>${a.desc}</small></span><span class="achievement-state">${ok?'OBTENU':'VERROUILLÉ'}</span></div>`}).join('')}
function renderKeys(){const labels={up:'Monter',down:'Descendre',left:'Aller à gauche',right:'Aller à droite',dash:'Dash',pause:'Pause'};$('keyBindings').innerHTML=Object.entries(labels).map(([k,v])=>`<div class="key-row"><span>${v}</span><button class="key-button" data-bind="${k}">${keyLabel(saveData.keys[k])}</button></div>`).join('');document.querySelectorAll('[data-bind]').forEach(b=>b.onclick=()=>{b.textContent='…';b.classList.add('waiting');const fn=e=>{e.preventDefault();saveData.keys[b.dataset.bind]=e.code;persist();renderKeys();window.removeEventListener('keydown',fn,true)};window.addEventListener('keydown',fn,true)})}
function keyLabel(code){return ({Space:'ESPACE',Escape:'ÉCHAP',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'})[code]||code.replace('Key','').replace('Digit','')}

const skinDefs=[
 {id:'default',name:'ORBITAL FIGHTER',color:'#63e5e0',cost:0,desc:'Chasseur équilibré · ailes de combat'},
 {id:'ember',name:'EMBER INTERCEPTOR',color:'#ff795e',cost:55,desc:'Intercepteur lourd · ailes blindées'},
 {id:'toxic',name:'TOXIC WASP',color:'#a5f36b',cost:85,desc:'Frelon bio-mécanique · trois ailerons'},
 {id:'violet',name:'NEBULA GHOST',color:'#bd91ff',cost:120,desc:'Vaisseau furtif · silhouette en croissant'},
 {id:'gold',name:'SOLAR ROYAL',color:'#f5ca68',cost:180,desc:'Chasseur royal · ailes et réacteurs doubles'},
 {id:'nova',name:'NOVA LANCER',color:'#80d8ff',cost:230,desc:'Intercepteur à double lance et ailettes ioniques'},
 {id:'wraith',name:'WRAITH STEALTH',color:'#a7a3ff',cost:290,desc:'Chasseur furtif à trois dérives et noyau spectral'},
 {id:'titan',name:'TITAN BREAKER',color:'#ff916e',cost:360,desc:'Croiseur lourd · blindage massif et canons latéraux'},
 {id:'prism',name:'PRISM REAVER',color:'#ff8cce',cost:440,desc:'Ailes cristallines et réacteur prismatique'},
 {id:'eclipse',name:'ECLIPSE ZERO',color:'#d2e2ff',cost:560,desc:'Chasseur d’élite · double croissant et halo énergétique'},
 {id:'aurora',name:'AURORA SWALLOW',color:'#69e7df',cost:680,desc:'Aile manta fluide · longues courbes aérodynamiques'},
 {id:'comet',name:'COMET RANGER',color:'#8bc8ff',cost:760,desc:'Intercepteur effilé · fuselage allongé et ailes balayées'},
 {id:'seraph',name:'SERAPH WING',color:'#f1d5ff',cost:840,desc:'Chasseur céleste · ailes en plumes superposées'},
 {id:'kestrel',name:'KESTREL VEIL',color:'#ffad8a',cost:930,desc:'Prédateur furtif · ailes minces et cockpit profilé'},
 {id:'leviathan',name:'LEVIATHAN',color:'#66b6ca',cost:1040,desc:'Croiseur organique · carapace large et réacteur dorsal'},
 {id:'phoenix',name:'PHOENIX RISE',color:'#ff8b53',cost:1160,desc:'Chasseur flamboyant · ailes recourbées comme des flammes'},
 {id:'raven',name:'RAVEN NIGHT',color:'#9d9aff',cost:1290,desc:'Intercepteur nocturne · longues ailes souples et plumes arrière'},
 {id:'cygnus',name:'CYGNUS PRIME',color:'#f2e7c5',cost:1430,desc:'Vaisseau élégant · ailes en croissant et traîne lumineuse'},
 {id:'orca',name:'ORCA DEEP',color:'#64d7c8',cost:1580,desc:'Chasseur abyssal · coque arrondie et nageoires de propulsion'},
 {id:'dragon',name:'ASTRAL DRAGON',color:'#df8cff',cost:1780,desc:'Vaisseau légendaire · proue de dragon et deux ailes rubanées'}
];
const droneSkinDefs=[
 {id:'drone_scout',name:'SCOUT // LITE',color:'#78e6ff',cost:0,desc:'Drone éclaireur compact · coque légère'},
 {id:'drone_cobalt',name:'COBALT WING',color:'#638cff',cost:85,desc:'Ailes en V et propulseurs jumeaux'},
 {id:'drone_firefly',name:'FIREFLY MK-II',color:'#ffd36e',cost:145,desc:'Drone insectoïde · quatre ailettes lumineuses'},
 {id:'drone_manta',name:'MANTA RAY',color:'#b48cff',cost:230,desc:'Aile volante furtive et noyau violet'},
 {id:'drone_sentinel',name:'SENTINEL A-9',color:'#ff806b',cost:340,desc:'Escorte blindée avec double canon'},
 {id:'drone_abyss',name:'ABYSS ORACLE',color:'#70f0c3',cost:470,desc:'Drone rare à anneau orbital et lames spectrales'}
];
const shopPowerups=[
 {id:'nuke',name:'BOMBE NUCLÉAIRE',symbol:'☢',cost:35,desc:'Appuie sur N pendant une partie pour éliminer tous les ennemis, météorites et projectiles à l’écran.'},
 {id:'escort',name:'DRONE D’ESCORTE',symbol:'✧',cost:90,desc:'Achète une escorte pour ta prochaine partie. Elle combat automatiquement, possède sa propre coque et ne peut pas récupérer les réparations.'}
];
const upgradeDefs=[
 {group:'ship',key:'damage',name:'Canon à plasma',desc:'+1 dégât par projectile',costs:[100,180,300],icon:'✦'},
 {group:'ship',key:'fireRate',name:'Cadence de tir',desc:'Tire 14 % plus rapidement par niveau',costs:[90,160,260],icon:'ϟ'},
 {group:'ship',key:'armor',name:'Blindage renforcé',desc:'+25 PV et 8 % de résistance par niveau',costs:[110,190,290],icon:'⬡'},
 {group:'ship',key:'speed',name:'Réacteurs améliorés',desc:'+7 % de vitesse par niveau',costs:[120,210,320],icon:'➤'},
 {group:'ship',key:'piercing',name:'Munitions perforantes',desc:'+1 cible traversée par niveau',costs:[150,260,390],icon:'➶'},
 {group:'ship',key:'critical',name:'Noyau critique',desc:'+6 % de chance de doubler les dégâts par niveau',costs:[170,290,430],icon:'✹'},
 {group:'ship',key:'magnet',name:'Collecteur magnétique',desc:'+70 px de portée d’attraction des gemmes par niveau',costs:[130,230,350],icon:'⌁'},
 {group:'ship',key:'dash',name:'Condensateur de dash',desc:'-18 % de recharge du dash par niveau',costs:[140,240,360],icon:'ϟ'},
 {group:'ship',key:'projectile',name:'Accélérateur de plasma',desc:'+12 % de vitesse des projectiles par niveau',costs:[125,220,330],icon:'➤'},
 {group:'drone',key:'damage',name:'Canon autonome',desc:'+1 dégât par tir du drone',costs:[110,200,320],icon:'✧'},
 {group:'drone',key:'fireRate',name:'Cadence du drone',desc:'Le drone tire 18 % plus vite par niveau',costs:[100,180,280],icon:'ϟ'},
 {group:'drone',key:'hull',name:'Coque du drone',desc:'+35 PV pour ton drone',costs:[95,175,275],icon:'⬡'},
 {group:'drone',key:'range',name:'Radar longue portée',desc:'+130 px de portée de ciblage par niveau',costs:[115,200,310],icon:'◎'},
 {group:'drone',key:'volley',name:'Salve multi-canon',desc:'+1 projectile par salve et par niveau',costs:[160,280,420],icon:'✣'},
 {group:'drone',key:'agility',name:'Micro-réacteurs',desc:'+20 % de vitesse de suivi par niveau',costs:[105,185,285],icon:'➤'}
];
function skinColor(){return skinDefs.find(s=>s.id===saveData.activeSkin)?.color||skinDefs[0].color}
const skinHullPathData={
 default:'M 35 0 L 20 -5 L 8 -8 L -8 -8 L -21 -23 L -29 -21 L -20 -5 L -13 0 L -20 5 L -29 21 L -21 23 L -8 8 L 8 8 L 20 5 Z',
 ember:'M 32 0 L 22 -7 L 10 -10 L -7 -10 L -21 -22 L -29 -20 L -24 -7 L -15 -3 L -19 0 L -15 3 L -24 7 L -29 20 L -21 22 L -7 10 L 10 10 L 22 7 Z',
 toxic:'M 34 0 L 18 -4 L 7 -7 L -4 -10 L -22 -25 L -28 -22 L -17 -7 L -29 -12 L -25 -2 L -13 0 L -25 2 L -29 12 L -17 7 L -28 22 L -22 25 L -4 10 L 7 7 L 18 4 Z',
 violet:'M 34 0 C 18 -7 -2 -25 -28 -24 C -19 -11 -12 -4 -8 0 C -12 4 -19 11 -28 24 C -2 25 18 7 34 0 Z',
 gold:'M 33 0 L 18 -6 L 7 -9 L -9 -8 L -22 -25 L -28 -23 L -18 -6 L -9 -2 L -24 -3 L -19 0 L -24 3 L -9 2 L -18 6 L -28 23 L -22 25 L -9 8 L 7 9 L 18 6 Z',
 nova:'M 36 0 L 17 -4 L 4 -5 L -13 -12 L -25 -23 L -25 -15 L -17 -4 L -29 -7 L -22 0 L -29 7 L -17 4 L -25 15 L -25 23 L -13 12 L 4 5 L 17 4 Z',
 wraith:'M 34 0 C 19 -8 1 -22 -23 -19 Q -29 -17 -25 -10 L -14 -3 L -20 0 L -14 3 L -25 10 Q -29 17 -23 19 C 1 22 19 8 34 0 Z',
 titan:'M 31 0 L 19 -8 L 6 -11 L -9 -12 L -23 -25 L -31 -23 L -27 -9 L -17 -3 L -23 0 L -17 3 L -27 9 L -31 23 L -23 25 L -9 12 L 6 11 L 19 8 Z',
 prism:'M 36 0 L 18 -5 L 7 -8 L -4 -8 L -23 -26 L -31 -27 L -24 -9 L -14 -3 L -26 -4 L -20 0 L -26 4 L -14 3 L -24 9 L -31 27 L -23 26 L -4 8 L 7 8 L 18 5 Z',
 eclipse:'M 35 0 C 19 -8 2 -24 -24 -22 Q -14 -10 -8 0 Q -14 10 -24 22 C 2 24 19 8 35 0 Z',
 aurora:'M 34 0 C 15 -8 -3 -26 -29 -26 Q -20 -12 -11 0 Q -20 12 -29 26 C -3 26 15 8 34 0 Z',
 comet:'M 38 0 C 17 -3 -1 -9 -21 -18 Q -26 -21 -29 -24 Q -24 -9 -13 0 Q -24 9 -29 24 Q -26 21 -21 18 C -1 9 17 3 38 0 Z',
 seraph:'M 34 0 Q 18 -7 -2 -25 Q -6 -18 1 -9 Q -13 -19 -28 -18 Q -22 -6 -10 0 Q -22 6 -28 18 Q -13 19 1 9 Q -6 18 -2 25 Q 18 7 34 0 Z',
 kestrel:'M 37 0 Q 14 -4 -5 -12 Q -19 -23 -30 -25 Q -26 -10 -13 0 Q -26 10 -30 25 Q -19 23 -5 12 Q 14 4 37 0 Z',
 leviathan:'M 32 0 C 17 -17 -7 -22 -25 -15 Q -34 0 -25 15 C -7 22 17 17 32 0 Z',
 phoenix:'M 36 0 Q 15 -8 -4 -25 Q -1 -12 10 -3 Q -12 -18 -30 -13 Q -20 -2 -7 1 Q -21 8 -30 20 Q -10 17 10 3 Q -1 14 -4 25 Q 15 8 36 0 Z',
 raven:'M 37 0 C 13 -8 -9 -25 -31 -27 Q -25 -12 -11 -3 Q -24 -10 -32 -12 Q -26 -2 -11 1 Q -24 9 -32 17 Q -13 14 -5 8 C 10 14 25 6 37 0 Z',
 cygnus:'M 36 0 C 18 -12 -2 -27 -27 -24 Q -15 -12 -7 -2 Q -22 -7 -31 -3 Q -20 4 -7 4 Q -17 14 -27 24 C -2 27 18 12 36 0 Z',
 orca:'M 33 0 C 18 -18 -8 -21 -25 -12 Q -34 0 -25 12 C -8 21 18 18 33 0 Z',
 dragon:'M 36 0 C 18 -7 1 -21 -20 -28 Q -15 -13 -3 -3 Q -23 -20 -31 -17 Q -25 -4 -10 1 Q -24 10 -31 19 Q -15 16 -3 3 Q -15 13 -20 28 C 1 21 18 7 36 0 Z'
};
const skinHullPathCache={};
function getSkinHullPath(id){const key=skinHullPathData[id]?id:'default';return skinHullPathCache[key]||(skinHullPathCache[key]=new Path2D(skinHullPathData[key]));}
function skinPreviewSVG(id,color){
 const safeId=skinHullPathData[id]?id:'default';
 const uid=`ship-${safeId}`;
 const engineY=['titan','prism','leviathan','orca'].includes(safeId)?13:['comet','nova','wraith'].includes(safeId)?8:11;
 return `<svg viewBox="0 0 86 72" aria-hidden="true" focusable="false">
 <defs><linearGradient id="${uid}-hull" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ffff"/><stop offset=".18" stop-color="${color}"/><stop offset=".72" stop-color="#213b55"/><stop offset="1" stop-color="#0a1426"/></linearGradient><linearGradient id="${uid}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eaffff"/><stop offset=".28" stop-color="#5ad9e9"/><stop offset="1" stop-color="#102b48"/></linearGradient></defs>
 <g transform="translate(43 36)">
  <path d="M-22 0 L-34 -${engineY} L-29 -${Math.max(4,engineY-3)} L-22 0 L-29 ${Math.max(4,engineY-3)} L-34 ${engineY} Z" fill="${color}" opacity=".6"/>
  <path d="${skinHullPathData[safeId]}" fill="url(#${uid}-hull)" stroke="#e8fdff" stroke-width="1.45" stroke-linejoin="round"/>
  <path d="M5 -7 Q-7 -8 -22 -${Math.max(10,engineY+5)} L-15 -7 L-5 -3 Z" fill="#09182a" opacity=".72" stroke="${color}" stroke-opacity=".55" stroke-width=".8"/>
  <path d="M5 7 Q-7 8 -22 ${Math.max(10,engineY+5)} L-15 7 L-5 3 Z" fill="#09182a" opacity=".72" stroke="${color}" stroke-opacity=".55" stroke-width=".8"/>
  <path d="M31 0 Q17 -6 3 -5 Q-8 -4 -15 0 Q-8 4 3 5 Q17 6 31 0Z" fill="#19354b" stroke="${color}" stroke-width="1"/>
  <path d="M19 0 Q12 -4 5 -3.4 Q-2 0 5 3.4 Q12 4 19 0Z" fill="url(#${uid}-glass)" stroke="#eaffff" stroke-width=".9"/>
  <path d="M8 -2.2 Q13 -3 16 -1" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/>
  <path d="M-6 -8 L-19 -${Math.max(9,engineY+1)} M-6 8 L-19 ${Math.max(9,engineY+1)}" stroke="#eaffff" stroke-width="1" opacity=".72" fill="none"/>
  <g fill="#081522" stroke="${color}" stroke-width=".8"><ellipse cx="-19" cy="-${engineY}" rx="5" ry="2.7"/><ellipse cx="-19" cy="${engineY}" rx="5" ry="2.7"/></g>
  <g fill="#a9faff"><ellipse cx="-22" cy="-${engineY}" rx="2.1" ry="1.35"/><ellipse cx="-22" cy="${engineY}" rx="2.1" ry="1.35"/></g>
  <path d="M13 -5 L27 -5 M13 5 L27 5" stroke="#edffff" stroke-width="1.35" stroke-linecap="round"/>
  <circle cx="28" cy="-5" r="1.05" fill="${color}"/><circle cx="28" cy="5" r="1.05" fill="${color}"/>
  <path d="M-5 -1 L-15 -1 M-5 1 L-15 1" stroke="#fff" stroke-width=".7" opacity=".45"/>
  <path d="M-27 -${engineY} l-2 0 M-27 ${engineY} l-2 0" stroke="#fff" stroke-width="1.1"/>
 </g></svg>`;
}
function dronePreviewSVG(id,color){
 const common=`fill="${color}" stroke="#f4fbff" stroke-width="1.5" stroke-linejoin="round"`;
 const shapes={
  drone_scout:`<path ${common} d="M39 7 51 28 68 36 51 44 39 65 27 44 10 36 27 28Z"/><circle cx="39" cy="36" r="6" fill="#fff"/>`,
  drone_cobalt:`<path ${common} d="M39 9 49 29 70 20 59 36 70 52 49 43 39 63 29 43 8 52 19 36 8 20 29 29Z"/><circle cx="39" cy="36" r="5" fill="#eff6ff"/>`,
  drone_firefly:`<path ${common} d="M48 36 36 23 18 10 25 31 9 36 25 41 18 62 36 49Z"/><path ${common} d="M48 36 58 18 73 8 68 31 76 36 68 41 73 64 58 54Z"/><circle cx="47" cy="36" r="6" fill="#fff"/>`,
  drone_manta:`<path ${common} d="M68 36 Q42 2 8 13 L27 36 8 59 Q42 70 68 36Z"/><path ${common} d="M55 36 34 28 21 36 34 44Z"/>`,
  drone_sentinel:`<path ${common} d="M66 36 49 25 29 25 17 9 21 29 7 36 21 43 17 63 29 47 49 47Z"/><path ${common} d="M42 24 34 6 54 25 54 47 34 66 42 48Z"/><path fill="#fff" d="M12 32 26 36 12 40Z"/>`,
  drone_abyss:`<path ${common} d="M69 36 Q45 8 13 17 Q32 36 13 55 Q45 64 69 36Z"/><path ${common} d="M53 36 32 28 20 36 32 44Z"/><circle cx="46" cy="36" r="7" fill="#fff"/><circle cx="46" cy="36" r="12" fill="none" stroke="#fff" stroke-width="1.5"/>`
 };
 return `<svg viewBox="0 0 78 72" aria-hidden="true">${shapes[id]||shapes.drone_scout}</svg>`;
}
function drawDrone(c,id,color,scale=1,glow=14){
 c.save();c.scale(scale,scale);c.shadowBlur=glow;c.shadowColor=color;c.fillStyle=color;c.strokeStyle='#eaf8ff';c.lineWidth=1.2;c.lineJoin='round';
 const poly=pts=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();c.stroke()};
 if(id==='drone_cobalt'){poly([[17,0],[5,-6],[-7,-5],[-17,-14],[-13,-3],[-22,0],[-13,3],[-17,14],[-7,5],[5,6]]);poly([[1,-4],[-9,-16],[-15,-17],[-8,-3]]);poly([[1,4],[-9,16],[-15,17],[-8,3]]);}
 else if(id==='drone_firefly'){poly([[17,0],[6,-5],[-8,-4],[-15,-11],[-11,-2],[-18,0],[-11,2],[-15,11],[-8,4],[6,5]]);poly([[3,-4],[-4,-13],[-18,-17],[-11,-3]]);poly([[3,4],[-4,13],[-18,17],[-11,3]]);c.fillRect(-16,-17,5,4);c.fillRect(-16,13,5,4);}
 else if(id==='drone_manta'){c.beginPath();c.moveTo(20,0);c.quadraticCurveTo(-2,-22,-22,-12);c.quadraticCurveTo(-9,0,-22,12);c.quadraticCurveTo(-2,22,20,0);c.fill();c.stroke();poly([[15,0],[1,-4],[-12,-5],[-7,0],[-12,5],[1,4]]);}
 else if(id==='drone_sentinel'){poly([[19,0],[7,-7],[-10,-7],[-19,-17],[-23,-16],[-17,-4],[-8,0],[-17,4],[-23,16],[-19,17],[-10,7],[7,7]]);poly([[0,-7],[-7,-16],[-15,-19],[-11,-5]]);poly([[0,7],[-7,16],[-15,19],[-11,5]]);c.fillStyle='#f8fdff';c.fillRect(9,-8,8,3);c.fillRect(9,5,8,3);}
 else if(id==='drone_abyss'){c.beginPath();c.moveTo(21,0);c.quadraticCurveTo(-4,-20,-23,-11);c.quadraticCurveTo(-11,0,-23,11);c.quadraticCurveTo(-4,20,21,0);c.fill();c.stroke();poly([[14,0],[2,-4],[-13,-5],[-7,0],[-13,5],[2,4]]);c.strokeStyle='#fff';c.lineWidth=1.8;c.beginPath();c.arc(-1,0,11,-1.25,1.25);c.stroke();}
 else{poly([[17,0],[5,-6],[-8,-6],[-17,-15],[-13,-3],[-22,0],[-13,3],[-17,15],[-8,6],[5,6]]);c.fillStyle='#eafcff';c.beginPath();c.arc(3,0,4.2,0,Math.PI*2);c.fill();}
 c.shadowBlur=0;c.fillStyle='#102033';c.beginPath();c.ellipse(4,0,4.8,2.4,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(12,0,1.4,0,Math.PI*2);c.fill();c.restore();
}
function droneSkinColor(){return droneSkinDefs.find(s=>s.id===saveData.activeDroneSkin)?.color||droneSkinDefs[0].color}
function drawShip(c,id,color,scale=1,glow=18){
 const key=skinHullPathData[id]?id:'default';
 const hull=getSkinHullPath(key);
 const engineY=['titan','prism','leviathan','orca'].includes(key)?13:['comet','nova','wraith'].includes(key)?8:11;
 const engineCount=['titan','leviathan','dragon'].includes(key)?3:2;
 c.save();c.scale(scale,scale);c.lineJoin='round';c.lineCap='round';
 // Twin ion plumes sit behind the hull, so the ship reads as one engineered vehicle.
 c.save();c.globalCompositeOperation='lighter';
 for(const side of [-1,1]){
  c.save();c.translate(-22,side*engineY);
  const plume=c.createLinearGradient(-15,0,3,0);plume.addColorStop(0,'rgba(82,225,255,0)');plume.addColorStop(.55,color);plume.addColorStop(1,'#efffff');
  c.fillStyle=plume;c.globalAlpha=.72;c.shadowColor=color;c.shadowBlur=glow*.85;
  c.beginPath();c.moveTo(2,-2.4);c.lineTo(-12,-1);c.lineTo(-17,0);c.lineTo(-12,1);c.lineTo(2,2.4);c.closePath();c.fill();c.restore();
 }
 if(engineCount===3){c.save();c.translate(-22,0);c.fillStyle=color;c.globalAlpha=.42;c.shadowColor=color;c.shadowBlur=glow*.7;c.beginPath();c.moveTo(2,-2);c.lineTo(-12,-1);c.lineTo(-15,0);c.lineTo(-12,1);c.lineTo(2,2);c.closePath();c.fill();c.restore();}
 c.restore();
 const hullGrad=c.createLinearGradient(-20,-27,25,25);hullGrad.addColorStop(0,'#eaffff');hullGrad.addColorStop(.13,color);hullGrad.addColorStop(.48,'#30465d');hullGrad.addColorStop(.78,'#14283e');hullGrad.addColorStop(1,'#071321');
 c.shadowColor=color;c.shadowBlur=glow;c.fillStyle=hullGrad;c.strokeStyle='#e9fcff';c.lineWidth=1.35;c.fill(hull);c.stroke(hull);c.shadowBlur=0;
 // Recessed wing panels and etched luminous seams give each silhouette a manufactured finish.
 const wingReach={default:[-22,19],ember:[-24,19],toxic:[-23,21],violet:[-23,18],gold:[-23,20],nova:[-21,17],wraith:[-22,15],titan:[-27,20],prism:[-27,22],eclipse:[-23,17],aurora:[-23,21],comet:[-20,15],seraph:[-25,21],kestrel:[-26,21],leviathan:[-23,14],phoenix:[-25,21],raven:[-28,21],cygnus:[-24,19],orca:[-24,14],dragon:[-27,22]}[key]||[-22,18];
 for(const side of [-1,1]){
  c.save();c.scale(1,side);
  const [wx,wy]=wingReach;
  c.beginPath();c.moveTo(5,-7);c.lineTo(-7,-8);c.lineTo(wx, -wy);c.lineTo(wx+6,-Math.max(5,wy-3));c.lineTo(-11,-3);c.closePath();
  c.fillStyle='rgba(5,15,29,.63)';c.fill();c.strokeStyle=color;c.globalAlpha=.7;c.lineWidth=.85;c.stroke();c.globalAlpha=1;
  c.beginPath();c.moveTo(-5,-7);c.quadraticCurveTo(wx+7,-Math.max(5,wy-7),wx+3,-Math.max(4,wy-5));c.strokeStyle='#f2ffff';c.lineWidth=.8;c.globalAlpha=.55;c.stroke();c.globalAlpha=1;
  // Small segmented service panels, not loose geometric add-ons.
  c.beginPath();c.moveTo(-12,-9);c.lineTo(-17,-13);c.lineTo(-21,-13);c.strokeStyle=color;c.lineWidth=1.15;c.globalAlpha=.85;c.stroke();c.globalAlpha=1;
  c.restore();
 }
 // Central armored spine, integrated into the wing roots.
 const spine=c.createLinearGradient(0,-7,28,7);spine.addColorStop(0,'#10243a');spine.addColorStop(.5,'#38536b');spine.addColorStop(1,'#13283d');
 c.beginPath();c.moveTo(33,0);c.quadraticCurveTo(20,-7,7,-6);c.lineTo(-9,-4.5);c.quadraticCurveTo(-15,0,-9,4.5);c.lineTo(7,6);c.quadraticCurveTo(20,7,33,0);c.closePath();c.fillStyle=spine;c.fill();c.strokeStyle=color;c.globalAlpha=.9;c.lineWidth=1;c.stroke();c.globalAlpha=1;
 // Cockpit canopy with a bright glass reflection.
 c.beginPath();c.moveTo(21,0);c.bezierCurveTo(16,-4.8,8,-4.6,2,-2.6);c.quadraticCurveTo(-3,0,2,2.6);c.bezierCurveTo(8,4.6,16,4.8,21,0);c.closePath();
 const glass=c.createLinearGradient(2,-4,19,4);glass.addColorStop(0,'#d9ffff');glass.addColorStop(.22,'#54d9ed');glass.addColorStop(.58,'#164b6b');glass.addColorStop(1,'#08182d');c.fillStyle=glass;c.fill();c.strokeStyle='#eaffff';c.lineWidth=1;c.stroke();
 c.beginPath();c.moveTo(7,-2.1);c.quadraticCurveTo(13,-4,17,-1.5);c.strokeStyle='#fff';c.lineWidth=.9;c.globalAlpha=.88;c.stroke();c.globalAlpha=1;
 // Twin forward cannons are flush with the forward hull.
 c.strokeStyle='#eaffff';c.lineWidth=2.15;
 for(const side of [-1,1]){c.beginPath();c.moveTo(13,side*5.2);c.lineTo(27,side*5.2);c.stroke();c.fillStyle=color;c.shadowColor=color;c.shadowBlur=7;c.beginPath();c.arc(27,side*5.2,1.35,0,Math.PI*2);c.fill();c.shadowBlur=0;}
 // Recessed engine housings and luminous exhaust cores.
 for(const side of [-1,1]){
  c.save();c.translate(-18,side*engineY);
  c.beginPath();c.ellipse(0,0,5.8,3.45,0,0,Math.PI*2);c.fillStyle='#071321';c.fill();c.strokeStyle=color;c.lineWidth=1;c.stroke();
  c.beginPath();c.ellipse(-1.8,0,2.35,1.8,0,0,Math.PI*2);c.fillStyle='#bafcff';c.shadowColor=color;c.shadowBlur=8;c.fill();c.shadowBlur=0;
  c.beginPath();c.moveTo(1,-1.1);c.lineTo(4,-1.1);c.moveTo(1,1.1);c.lineTo(4,1.1);c.strokeStyle='#f1ffff';c.lineWidth=.65;c.stroke();c.restore();
 }
 if(engineCount===3){c.beginPath();c.ellipse(-18,0,4.4,2.25,0,0,Math.PI*2);c.fillStyle='#081526';c.fill();c.strokeStyle=color;c.lineWidth=.8;c.stroke();c.fillStyle='#c6ffff';c.beginPath();c.ellipse(-20,0,1.8,1.1,0,0,Math.PI*2);c.fill();}
 // Sensor, hull markings and tiny running lights finish the 2D top-down design.
 c.fillStyle='#efffff';c.globalAlpha=.85;c.beginPath();c.arc(30,0,1.15,0,Math.PI*2);c.fill();c.globalAlpha=1;
 c.strokeStyle='#f4ffff';c.globalAlpha=.48;c.lineWidth=.7;
 c.beginPath();c.moveTo(-7,-4);c.lineTo(-13,-2);c.moveTo(-7,4);c.lineTo(-13,2);c.moveTo(2,-5);c.lineTo(-2,-7);c.moveTo(2,5);c.lineTo(-2,7);c.stroke();c.globalAlpha=1;
 c.fillStyle=color;c.shadowColor=color;c.shadowBlur=6;
 for(const side of [-1,1]){c.beginPath();c.arc(-7,side*7.2,1.05,0,Math.PI*2);c.fill();}
 c.shadowBlur=0;c.restore();
}
function renderShop(){
 $('shopGems').textContent=saveData.gems.toLocaleString('fr-CA');$('shopNukes').textContent=`NUKES : ${saveData.nukes}  ·  DRONES : ${saveData.companions}`;
 $('shopItems').innerHTML=shopPowerups.map(item=>{const stock=item.id==='nuke'?saveData.nukes:saveData.companions;return `<div class="shop-item"><div class="shop-item-icon ${item.id==='nuke'?'nuke-icon':'escort-icon'}">${item.symbol}</div><div class="shop-item-copy"><b>${item.name}</b><small>${item.desc}</small></div><div class="shop-item-foot"><span>◆ ${item.cost} · EN STOCK : ${stock}</span><button data-buy-item="${item.id}">ACHETER</button></div></div>`}).join('');
 $('shopSkins').innerHTML=skinDefs.map(s=>{let owned=saveData.unlockedSkins.includes(s.id),active=saveData.activeSkin===s.id;return `<div class="skin-card ${active?'active':''}"><div class="skin-preview" style="--skin-color:${s.color}">${skinPreviewSVG(s.id,s.color)}</div><b>${s.name}</b><small>${s.desc}</small><button ${active?'disabled':''} data-skin-action="${s.id}">${active?'ÉQUIPÉ':owned?'ÉQUIPER':`ACHETER · ◆ ${s.cost}`}</button></div>`}).join('');
 $('shopDroneSkins').innerHTML=droneSkinDefs.map(s=>{let owned=saveData.unlockedDroneSkins.includes(s.id),active=saveData.activeDroneSkin===s.id;return `<div class="skin-card drone-skin-card ${active?'active':''}"><div class="skin-preview drone-preview" style="--skin-color:${s.color}">${dronePreviewSVG(s.id,s.color)}</div><b>${s.name}</b><small>${s.desc}</small><button ${active?'disabled':''} data-drone-skin-action="${s.id}">${active?'ÉQUIPÉ':owned?'ÉQUIPER':`ACHETER · ◆ ${s.cost}`}</button></div>`}).join('');
 const upgradeCards=group=>upgradeDefs.filter(u=>u.group===group).map(u=>{const levels=saveData[u.group+'Upgrades'],level=levels[u.key]||0,max=u.costs.length,cost=u.costs[level];const effect=level===0?'NIVEAU DE BASE':`NIVEAU ${level} / ${max}`;return `<div class="upgrade-card"><div class="upgrade-icon">${u.icon}</div><div class="upgrade-copy"><b>${u.name}</b><small>${u.desc}</small><span>${effect}</span><div class="upgrade-track">${Array.from({length:max},(_,i)=>`<i class="${i<level?'filled':''}"></i>`).join('')}</div></div><button data-upgrade-group="${u.group}" data-upgrade-key="${u.key}" ${level>=max||saveData.gems<cost?'disabled':''}>${level>=max?'MAX':`◆ ${cost}`}</button></div>`}).join('');
 $('shopShipUpgrades').innerHTML=upgradeCards('ship');$('shopDroneUpgrades').innerHTML=upgradeCards('drone');
 document.querySelectorAll('[data-buy-item]').forEach(b=>b.onclick=()=>buyShopItem(b.dataset.buyItem));
 document.querySelectorAll('[data-skin-action]').forEach(b=>b.onclick=()=>buyOrEquipSkin(b.dataset.skinAction));
 document.querySelectorAll('[data-drone-skin-action]').forEach(b=>b.onclick=()=>buyOrEquipDroneSkin(b.dataset.droneSkinAction));
 document.querySelectorAll('[data-upgrade-group]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgradeGroup,b.dataset.upgradeKey));
}
function buyShopItem(id){const item=shopPowerups.find(x=>x.id===id);if(!item)return;if(saveData.gems<item.cost){toast('Pas assez de gemmes !');return;}saveData.gems-=item.cost;if(id==='nuke')saveData.nukes++;if(id==='escort')saveData.companions++;persist();renderShop();updateDashboard();toast(id==='escort'?'Drone acheté : il apparaîtra à ta prochaine partie.':`${item.name} acheté !`)}
function buyOrEquipSkin(id){const s=skinDefs.find(x=>x.id===id);if(!s)return;if(!saveData.unlockedSkins.includes(id)){if(saveData.gems<s.cost){toast('Pas assez de gemmes !');return;}saveData.gems-=s.cost;saveData.unlockedSkins.push(id);toast(`Skin ${s.name} débloqué !`)}saveData.activeSkin=id;persist();renderShop();updateDashboard()}
function buyOrEquipDroneSkin(id){const s=droneSkinDefs.find(x=>x.id===id);if(!s)return;if(!saveData.unlockedDroneSkins.includes(id)){if(saveData.gems<s.cost){toast('Pas assez de gemmes !');return;}saveData.gems-=s.cost;saveData.unlockedDroneSkins.push(id);toast(`Skin d’escorte ${s.name} débloqué !`)}saveData.activeDroneSkin=id;persist();renderShop();updateDashboard();playSfx('upgrade')}
function buyUpgrade(group,key){const u=upgradeDefs.find(x=>x.group===group&&x.key===key);if(!u)return;const levels=saveData[group+'Upgrades'];const level=levels[key]||0;if(level>=u.costs.length){toast('Amélioration déjà au maximum.');return;}const cost=u.costs[level];if(saveData.gems<cost){toast('Pas assez de gemmes !');return;}saveData.gems-=cost;levels[key]=level+1;persist();renderShop();updateDashboard();playSfx('upgrade');toast(`${u.name} amélioré · niveau ${level+1}/${u.costs.length}`)}
$('coopButton').onclick=()=>showPanel('coopPanel');$('shopButton').onclick=()=>showPanel('shopPanel');
$('playButton').onclick=()=>{if(chosenMode==='multiplayer'){showPanel('coopPanel')}else startGame()};$('brandHome').onclick=()=>{if(state.running)endToMenu();else{hidePanels();$('homeScreen').classList.remove('hidden')}};
$('topSettings').onclick=()=>showPanel('settingsPanel');$('howButton').onclick=()=>showPanel('howPanel');$('allScoresButton').onclick=()=>showPanel('scoresPanel');$('achievementsButton').onclick=()=>showPanel('achievementsPanel');$('howPlayNow').onclick=()=>{hidePanels();startGame()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=hidePanels);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{chosenMode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b))});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{scoreFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderFullScores()});
$('clearScores').onclick=()=>{if(confirm('Effacer tous tes scores sur cet appareil ?')){saveData.runs=[];saveData.best=0;saveData.games=0;saveData.bestWave=0;persist();updateDashboard();renderFullScores();toast('Scores effacés.')}};
$('controlMode').value=controlMode;updateTouchControls();controlMode=localStorage.getItem('neonOutpostControlMode_v1')||'pc';$('controlMode').value=controlMode;$('soundToggle').checked=saveData.sound;$('effectsToggle').checked=saveData.effects;$('vibrationToggle').checked=saveData.vibration!==false;$('sensitivity').value=saveData.sensitivity;$('difficulty').value=saveData.difficulty;
$('controlMode').onchange=e=>{controlMode=e.target.value;localStorage.setItem('neonOutpostControlMode_v1',controlMode);updateTouchControls();toast(controlMode==='mobile'?'Commandes tactiles activées.':'Commandes PC activées.')};$('soundToggle').onchange=e=>{saveData.sound=e.target.checked;persist()};$('effectsToggle').onchange=e=>{saveData.effects=e.target.checked;persist()};$('vibrationToggle').onchange=e=>{saveData.vibration=e.target.checked;persist()};$('sensitivity').oninput=e=>{saveData.sensitivity=+e.target.value;$('sensitivityValue').textContent=e.target.value;persist()};$('difficulty').oninput=e=>{saveData.difficulty=+e.target.value;$('difficultyValue').textContent=['Facile','Normale','Difficile'][saveData.difficulty-1];persist()};$('difficultyValue').textContent=['Facile','Normale','Difficile'][saveData.difficulty-1];$('sensitivityValue').textContent=saveData.sensitivity;
$('resetSettings').onclick=()=>{saveData.keys={...defaultKeys};saveData.sound=true;saveData.effects=true;saveData.vibration=true;saveData.sensitivity=6;saveData.difficulty=2;persist();$('soundToggle').checked=true;$('effectsToggle').checked=true;$('vibrationToggle').checked=true;$('sensitivity').value=6;$('difficulty').value=2;$('sensitivityValue').textContent='6';$('difficultyValue').textContent='Normale';renderKeys();toast('Paramètres réinitialisés.')};

// Ambient background scene
let stars=Array.from({length:110},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.5+.25,a:Math.random()*.55+.15,phase:Math.random()*6}));let bgTime=0;
function drawAmbient(dt){bgTime+=dt;ctx.clearRect(0,0,W,H);let grad=ctx.createRadialGradient(W*.68,H*.52,10,W*.68,H*.52,Math.max(W,H)*.72);grad.addColorStop(0,'#151c37');grad.addColorStop(.56,'#0b1223');grad.addColorStop(1,'#080b15');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.save();for(let s of stars){let tw=.55+.45*Math.sin(bgTime*1.3+s.phase);ctx.globalAlpha=s.a*tw;ctx.fillStyle='#a9d5ec';ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.strokeStyle='#5a78ad14';ctx.lineWidth=1;let cx=W*.72,cy=H*.53;for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(cx,cy,90+i*85,38+i*39,-.28,0,Math.PI*2);ctx.stroke()}ctx.restore()}
const boostDefs={
 rapid:{label:'TIR RAPIDE',symbol:'ϟ',color:'#63e5e0',duration:9},
 shield:{label:'BOUCLIER',symbol:'◇',color:'#ad91ff',duration:8},
 triple:{label:'TIR TRIPLE',symbol:'✣',color:'#ff9f6e',duration:9},
 double:{label:'SCORE x2',symbol:'×2',color:'#f4ca69',duration:10},
 repair:{label:'RÉPARATION +35',symbol:'+',color:'#77ed9a',duration:0}
};
let state={running:false,paused:false,gameEnded:false,player:null,enemies:[],meteors:[],bullets:[],enemyBullets:[],particles:[],shockwaves:[],pickups:[],boosts:{rapid:0,shield:0,triple:0,double:0},score:0,kills:0,combo:0,comboTimer:0,objective:null,objectives:[],pendingBoss:[],wave:1,waveTimer:0,spawnTimer:0,meteorTimer:4.5,time:0,health:100,dash:0,dashCooldown:0,screenShake:0,mouse:{x:W/2,y:H/2,down:false},keys:{},lastShot:0,lastTime:0,invuln:0,bonus:1};
let audioCtx=null,noiseBuffer=null;
function ensureAudio(){if(!saveData.sound)return null;try{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();const n=Math.floor(audioCtx.sampleRate*.45);noiseBuffer=audioCtx.createBuffer(1,n,audioCtx.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;}if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(e){return null}}
function tone(freq,endFreq,dur,wave='sine',gain=.02,delay=0,filter=5000){const a=ensureAudio();if(!a)return;try{const t=a.currentTime+delay,o=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type=wave;o.frequency.setValueAtTime(Math.max(1,freq),t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),t+dur);f.type='lowpass';f.frequency.setValueAtTime(filter,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f);f.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02)}catch(e){}}
function noiseHit(dur=.12,gain=.025,cutoff=1200,delay=0){const a=ensureAudio();if(!a||!noiseBuffer)return;try{const t=a.currentTime+delay,src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=noiseBuffer;f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f);f.connect(g);g.connect(a.destination);src.start(t);src.stop(t+dur)}catch(e){}}
function playSfx(name){if(!saveData.sound)return;switch(name){
 case 'boss':tone(95,55,.5,'sawtooth',.035);tone(180,90,.38,'triangle',.025,.16);break;
 case 'bossdown':noiseHit(.52,.06,700);tone(120,28,.62,'sawtooth',.05);tone(360,70,.4,'triangle',.03,.09);break;
 case 'bossshot':tone(240,95,.12,'sawtooth',.012,0,900);break;
 case 'launch':tone(210,520,.19,'sawtooth',.025);tone(420,760,.22,'sine',.018,.05);noiseHit(.13,.012,900,.02);break;
 case 'shoot':tone(620,260,.055,'square',.012,0,2400);tone(1350,520,.035,'sine',.006,.005,5000);break;
 case 'allyshot':tone(820,420,.075,'triangle',.009,0,1800);break;
 case 'pickup':tone(520,780,.11,'sine',.018);tone(780,1120,.14,'sine',.018,.09);tone(1040,1420,.17,'triangle',.014,.18);break;
 case 'upgrade':tone(360,540,.12,'triangle',.018);tone(540,810,.15,'sine',.02,.09);tone(810,1210,.2,'triangle',.018,.2);break;
 case 'meteor':noiseHit(.2,.035,850);tone(145,65,.24,'triangle',.025);break;
 case 'explosion':noiseHit(.16,.023,1600);tone(170,55,.19,'sine',.025);break;
 case 'dash':noiseHit(.17,.018,3300);tone(240,720,.16,'sawtooth',.012);break;
 case 'shield':tone(880,520,.12,'sine',.014);tone(1320,880,.09,'triangle',.008,.025);break;
 case 'damage':noiseHit(.18,.025,600);tone(170,75,.2,'sawtooth',.022);break;
 case 'wave':tone(392,520,.18,'triangle',.018);tone(523,700,.2,'triangle',.019,.12);tone(659,880,.24,'sine',.016,.24);break;
 case 'nuke':noiseHit(.4,.065,780);tone(90,32,.48,'sawtooth',.055);tone(190,45,.38,'triangle',.035,.03);tone(660,120,.3,'sine',.014,.12);break;
 case 'gameover':tone(330,230,.24,'triangle',.02);tone(247,165,.28,'triangle',.02,.2);tone(165,70,.48,'sine',.025,.43);break;
 case 'achievement':tone(660,880,.12,'triangle',.018);tone(880,1180,.18,'sine',.018,.1);break;
 case 'escorthit':noiseHit(.09,.015,1800);tone(300,160,.11,'square',.012);break;
 case 'escortdown':noiseHit(.3,.03,950);tone(360,70,.35,'sawtooth',.025);break;
 }}
function startGame(fromNetwork=false){if(chosenMode==='multiplayer'&&(!onlineSession||!onlineSession.channel)){toast('Crée ou rejoins un salon avant de lancer le coop.');showPanel('coopPanel');return;}if(chosenMode==='multiplayer'&&onlineSession.role==='host'&&!onlineSession.peerReady&&!fromNetwork){toast('Attends que le deuxième joueur rejoigne le salon.');return;}hidePanels();$('homeScreen').classList.add('hidden');$('pauseOverlay').classList.add('hidden');$('gameOverOverlay').classList.add('hidden');$('gameScreen').classList.remove('hidden');updateTouchControls();const launchEscort=saveData.companions>0;if(launchEscort){saveData.companions--;persist();}const ship=saveData.shipUpgrades,drone=saveData.droneUpgrades,shipMaxHp=100+ship.armor*25,droneMaxHp=100+drone.hull*35,remoteInitialMaxHp=onlineSession?.role==='guest'?shipMaxHp:100;state={running:true,paused:false,gameEnded:false,player:{x:W/2,y:H/2,r:13,angle:0},playerSkin:saveData.activeSkin,playerColor:skinColor(),remotePlayer:chosenMode==='multiplayer'&&onlineSession?{x:W*.68,y:H*.56,r:13,angle:0,hp:remoteInitialMaxHp,maxHp:remoteInitialMaxHp,armor:onlineSession?.role==='guest'?(ship.armor||0):0,healthInitialized:onlineSession?.role==='guest',invuln:1.3,alive:true,skin:'default',color:'#bd91ff',lastShot:0,dashCooldown:0,respawnTimer:0}:null,coopInput:{dx:0,dy:0,aimX:.75,aimY:.5,shooting:false,dash:false},companion:launchEscort?{x:W/2-36,y:H/2+30,r:10,hp:droneMaxHp,maxHp:droneMaxHp,damage:1+drone.damage,fireInterval:.48*Math.pow(.82,drone.fireRate),angle:0,shootTimer:.35,hitCooldown:0,blink:0,skin:saveData.activeDroneSkin||'drone_scout',color:droneSkinColor()}:null,enemies:[],meteors:[],bullets:[],enemyBullets:[],particles:[],shockwaves:[],pickups:[],boosts:{rapid:0,shield:0,triple:0,double:0},score:0,kills:0,combo:0,comboTimer:0,objective:null,objectives:[],pendingBoss:[],wave:1,waveTimer:0,spawnTimer:.7,meteorTimer:3.5,time:0,health:shipMaxHp,healthMax:shipMaxHp,dash:0,dashCooldown:0,screenShake:0,mouse:{x:W/2+120,y:H/2,down:false},keys:{},lastShot:0,lastTime:performance.now(),invuln:1.3,bonus:1,nukeFlash:0,bossExplosion:null,noHitTimer:0};$('gameHint').textContent=controlMode==='mobile'?'JOYSTICK : BOUGER · TIR AUTOMATIQUE SUR LA CIBLE LA PLUS PROCHE':'W A S D : BOUGER · SOURIS : VISER · CLIC / J : TIRER';$('activeMode').textContent=modeName(chosenMode);$('liveBest').textContent=fmt(saveData.best);$('liveScore').textContent='000000';$('waveNumber').textContent='01';$('waveSub').textContent='PREMIÈRE VAGUE';$('healthFill').style.width='100%';$('healthText').textContent='100%';$('dashStatus').innerHTML='DASH DISPONIBLE <span>⇧</span>';$('boostStatus').innerHTML='ASTÉROÏDES → BOOSTS';updateCompanionUI();updateNukeUI();flashWave(1);$('bossBar').classList.add('hidden');$('comboHud').classList.add('hidden');beginObjective();playSfx('launch');requestAnimationFrame(loop)}
function updateCompanionUI(){const el=$('companionStatus');if(!el)return;if(!state.companion){el.classList.add('hidden');el.textContent='';return;}el.classList.remove('hidden');el.innerHTML=`✧ ESCORTE ${Math.ceil(state.companion.hp/state.companion.maxHp*100)}%`}
function damageCompanion(amount){const c=state.companion;if(!c||c.hitCooldown>0)return;c.hp=Math.max(0,c.hp-amount);c.hitCooldown=.34;c.blink=.16;burst(c.x,c.y,c.color||droneSkinColor(),7,1.8);playSfx('escorthit');updateCompanionUI();if(c.hp<=0){burst(c.x,c.y,c.color||'#dceeff',28,5);state.companion=null;playSfx('escortdown');updateCompanionUI();toast('TON DRONE D’ESCORTE A ÉTÉ DÉTRUIT.')}}
function updateCompanion(dt){const c=state.companion,p=state.player;if(!c||!p)return;c.hitCooldown=Math.max(0,c.hitCooldown-dt);c.blink=Math.max(0,c.blink-dt);const dx=-42,dy=28,followRate=6.5+(saveData.droneUpgrades.agility||0)*1.3;c.x+=(p.x+dx-c.x)*Math.min(1,dt*followRate);c.y+=(p.y+dy-c.y)*Math.min(1,dt*followRate);c.x=Math.max(18,Math.min(W-18,c.x));c.y=Math.max(18,Math.min(H-18,c.y));let target=null,best=480+(saveData.droneUpgrades.range||0)*130;for(const e of state.enemies){const d=Math.hypot(e.x-c.x,e.y-c.y);if(d<best){best=d;target=e;}}c.shootTimer-=dt;if(target&&c.shootTimer<=0){const a=Math.atan2(target.y-c.y,target.x-c.x);c.angle=a;const volleys=1+(saveData.droneUpgrades.volley||0),spread=.13;for(let i=0;i<volleys;i++){const aa=a+(i-(volleys-1)/2)*spread;state.bullets.push({x:c.x+Math.cos(aa)*13,y:c.y+Math.sin(aa)*13,vx:Math.cos(aa)*510,vy:Math.sin(aa)*510,life:1.1,r:2.7,damage:c.damage||1,fromCompanion:true,pierceRemaining:0});}c.shootTimer=c.fireInterval||.48;playSfx('allyshot');}else if(!target)c.angle=p.angle;updateCompanionUI()}
function updateTouchControls(){const el=$('touchControls');if(!el)return;const screenVisible=$('gameScreen')&&!$('gameScreen').classList.contains('hidden');const modalOpen=!$('pauseOverlay').classList.contains('hidden')||!$('gameOverOverlay').classList.contains('hidden');const panelOpen=[...document.querySelectorAll('.side-panel')].some(p=>!p.classList.contains('hidden'));const active=controlMode==='mobile'&&screenVisible&&!modalOpen&&!panelOpen;el.classList.toggle('hidden',!active);if(!active){touchVector={x:0,y:0};touchDash=false;touchFiring=false;$('joystickKnob').style.transform='translate(0,0)';}}
function currentInput(){let k=state.keys||{},keys=saveData.keys;let dx=(k[keys.right]?1:0)-(k[keys.left]?1:0)+(controlMode==='mobile'?touchVector.x:0),dy=(k[keys.down]?1:0)-(k[keys.up]?1:0)+(controlMode==='mobile'?touchVector.y:0);let len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}return {dx,dy,shooting:!!(state.mouse.down||k['KeyJ']||k['Enter']||(controlMode==='mobile'&&touchFiring)),dash:!!(k[keys.dash]||k['ShiftLeft']||k['ShiftRight']||(controlMode==='mobile'&&touchDash))};}
function sendRoomEvent(event,payload={}){
 if(!onlineSession?.channel||onlineSession.transport!=='peerjs'||!rtcConnection?.open)return false;
 try{rtcConnection.send({event,payload});return true;}catch(e){console.warn('Envoi coop impossible',e);return false;}
}
function networkSnapshot(){
 const pick=(o,keys)=>{if(!o)return null;const out={};for(const k of keys)if(o[k]!==undefined)out[k]=o[k];return out;};
 const pack=(arr,keys,max)=>Array.isArray(arr)?arr.slice(-max).map(o=>pick(o,keys)):[];
 const s=state;
 const net={
  player:pick(s.player,['x','y','r','angle']),playerSkin:s.playerSkin,playerColor:s.playerColor,
  remotePlayer:pick(s.remotePlayer,['x','y','r','angle','hp','maxHp','alive','skin','color','blink']),
  companion:pick(s.companion,['x','y','r','angle','blink','skin','color','hp','maxHp']),
  enemies:pack(s.enemies,['x','y','r','angle','kind','hit','hp','maxHp','bossTier','scale','variant'],48),
  meteors:pack(s.meteors,['x','y','r','angle','hit','hp','maxHp','vertices'],20),
  bullets:pack(s.bullets,['x','y','r','fromCompanion','fromRemote'],72),
  enemyBullets:pack(s.enemyBullets,['x','y','vx','vy','boss'],64),
  particles:pack(s.particles,['x','y','r','life','max','color'],16),
  shockwaves:pack(s.shockwaves,['x','y','life','maxLife','color','radius'],8),
  pickups:pack(s.pickups,['x','y','r','phase','type','color','symbol','value'],24),
  boosts:{...(s.boosts||{})},score:s.score,kills:s.kills,combo:s.combo,comboTimer:s.comboTimer,
  objective:pick(s.objective,['type','label','goal','progress','reward','done','wave','targetVariant']),
  objectives:Array.isArray(s.objectives)?s.objectives.map(o=>pick(o,['type','label','goal','progress','reward','done','wave','targetVariant'])):[],
  wave:s.wave,time:s.time,dash:s.dash,invuln:s.invuln,
  screenShake:Math.min(12,s.screenShake||0),nukeFlash:s.nukeFlash,
  bossExplosion:pick(s.bossExplosion,['x','y','t','duration','tier']),
  mouse:pick(s.mouse,['x','y'])
 };
 return {w:W,h:H,state:net};
}
let guestVisualBlend=null,lastGuestSnapshotAt=0;
function captureNetworkPositions(s){
 const out={};
 for(const key of ['player','remotePlayer','companion'])out[key]=s[key]?{x:s[key].x,y:s[key].y}:null;
 for(const key of ['enemies','meteors','bullets','enemyBullets','pickups'])out[key]=Array.isArray(s[key])?s[key].map(o=>({x:o.x,y:o.y})):[];
 return out;
}
function applyGuestInterpolation(now){
 const blend=guestVisualBlend;if(!blend)return;
 const t=Math.max(0,Math.min(1,(now-blend.started)/blend.duration));
 const from=blend.from,to=blend.to;
 for(const key of ['player','remotePlayer','companion']){const obj=state[key],a=from[key],b=to[key];if(obj&&a&&b){obj.x=a.x+(b.x-a.x)*t;obj.y=a.y+(b.y-a.y)*t;}}
 for(const key of ['enemies','meteors','bullets','enemyBullets','pickups']){
  const list=state[key]||[],a=from[key]||[],b=to[key]||[];
  if(list.length!==a.length||list.length!==b.length)continue;
  for(let i=0;i<list.length;i++){list[i].x=a[i].x+(b[i].x-a[i].x)*t;list[i].y=a[i].y+(b[i].y-a[i].y)*t;}
 }
 if(t>=1)guestVisualBlend=null;
}
function applyNetworkSnapshot(payload){
 if(!payload?.state)return;
 const sx=W/(payload.w||W),sy=H/(payload.h||H),sf=Math.min(sx,sy),s=payload.state;
 for(const key of ['player','remotePlayer','companion']){const q=s[key];if(q){q.x*=sx;q.y*=sy;if(q.r)q.r*=sf;}}
 for(const key of ['enemies','meteors','bullets','enemyBullets','particles','shockwaves','pickups'])for(const q of (s[key]||[])){if(q.x!=null)q.x*=sx;if(q.y!=null)q.y*=sy;if(q.r)q.r*=sf;if(q.vx)q.vx*=sx;if(q.vy)q.vy*=sy;if(q.radius)q.radius*=sf;}
 if(Array.isArray(s.meteors))for(const m of s.meteors)if(Array.isArray(m.vertices))m.vertices=m.vertices.map(v=>({x:v.x*sf,y:v.y*sf}));
 const previous=captureNetworkPositions(state),next=captureNetworkPositions(s),now=performance.now();
 const duration=lastGuestSnapshotAt?Math.max(65,Math.min(140,now-lastGuestSnapshotAt)):100;lastGuestSnapshotAt=now;
 const running=state.running,paused=state.paused,mouse=state.mouse||{x:W/2,y:H/2};
 state={...s,running,paused,lastTime:now,keys:{},mouse:{x:mouse.x,y:mouse.y,down:false}};
 guestVisualBlend={from:previous,to:next,started:now,duration};
 $('waveNumber').textContent=String(state.wave).padStart(2,'0');$('liveScore').textContent=fmt(state.score);updateHealthUI();updateObjectiveUI();updateBossUI();updateNukeUI();
}
function applyRemoteInput(dt){const rp=state.remotePlayer,inp=state.coopInput||{};if(!rp)return;rp.invuln=Math.max(0,(rp.invuln||0)-dt);rp.blink=Math.max(0,(rp.blink||0)-dt);if(!rp.alive){rp.respawnTimer=(rp.respawnTimer||0)-dt;if(rp.respawnTimer<=0){rp.alive=true;rp.hp=Math.ceil(rp.maxHp*.45);rp.invuln=1;rp.x=W*.72;rp.y=H*.55;toast('TON COÉQUIPIER EST DE RETOUR !');}return;}const speed=225;rp.x=Math.max(22,Math.min(W-22,rp.x+(inp.dx||0)*speed*dt));rp.y=Math.max(22,Math.min(H-22,rp.y+(inp.dy||0)*speed*dt));const ax=(inp.aimX??.75)*W,ay=(inp.aimY??.5)*H;rp.angle=Math.atan2(ay-rp.y,ax-rp.x);rp.dashCooldown=Math.max(0,(rp.dashCooldown||0)-dt);if(inp.dash&&rp.dashCooldown<=0){rp.x=Math.max(20,Math.min(W-20,rp.x+(inp.dx||0)*95));rp.y=Math.max(20,Math.min(H-20,rp.y+(inp.dy||0)*95));rp.dashCooldown=2;rp.invuln=.25;burst(rp.x,rp.y,rp.color||'#bd91ff',12,3);}rp.lastShot=rp.lastShot||0;if(inp.shooting&&state.time-rp.lastShot>.17){const a=rp.angle;state.bullets.push({x:rp.x+Math.cos(a)*17,y:rp.y+Math.sin(a)*17,vx:Math.cos(a)*610,vy:Math.sin(a)*610,life:1.2,r:3,damage:Math.max(1,Math.min(4,Number(inp.damage)||1)),fromRemote:true});rp.lastShot=state.time;}}
function damageRemotePlayer(amount){const rp=state.remotePlayer;if(!rp||!rp.alive||rp.invuln>0)return;const armor=Math.max(0,Math.min(3,Number(rp.armor)||0));rp.hp=Math.max(0,rp.hp-amount*(1-.08*armor));rp.invuln=.48;rp.blink=.16;burst(rp.x,rp.y,rp.color||'#bd91ff',8,2);if(rp.hp<=0){rp.alive=false;rp.respawnTimer=5;burst(rp.x,rp.y,'#d8c7ff',28,5);toast('TON COÉQUIPIER EST À TERRE — IL REVIENT DANS 5 SECONDES.');}}
function setCoopMode(){chosenMode='multiplayer';document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x.dataset.mode==='multiplayer'));}
function setP2PStatus(text){const el=$('p2pStatus');if(el)el.textContent=text;}
function makePeerWrapper(conn){return {send:({event,payload})=>{if(!conn?.open)return Promise.reject(new Error('Le joueur est déconnecté.'));conn.send({event,payload});return Promise.resolve();}};}
function handlePeerMessage(message){
 if(!message||typeof message!=='object')return;
 const {event,payload={}}=message;
 if(event==='hello'&&onlineSession?.role==='host'){
  onlineSession.peerReady=true;
  onlineSession.peerName='Deuxième joueur';
  sendRoomEvent('welcome',{version:1});
  $('roomStatusText').textContent='Deuxième joueur connecté. Vous pouvez lancer la partie !';
  $('startCoopButton').disabled=false;
  setP2PStatus('Deuxième joueur connecté. Prêt à jouer !');
  return;
 }
 if(event==='welcome'&&onlineSession?.role==='guest'){
  onlineSession.peerReady=true;
  $('roomStatusText').textContent='Connexion confirmée. En attente du lancement…';
  setP2PStatus('Tu as rejoint le salon ! L’hôte peut lancer la partie.');
  return;
 }
 // Receiving START is itself proof that the data channel works. This also
 // keeps compatibility with older lobbies that do not send a WELCOME message.
 if(event==='start'&&onlineSession?.role==='guest'&&!onlineSession.inGame){
  setCoopMode();onlineSession.inGame=true;startGame(true);return;
 }
 if(event==='input'&&onlineSession?.role==='host'&&state.running){
  state.coopInput={...state.coopInput,...payload};
  if(state.remotePlayer){
   if(!state.remotePlayer.healthInitialized){
    const guestMaxHp=Math.max(100,Math.min(175,Number(payload.maxHp)||100));
    state.remotePlayer.maxHp=guestMaxHp;state.remotePlayer.hp=guestMaxHp;state.remotePlayer.healthInitialized=true;
   }
   state.remotePlayer.armor=Math.max(0,Math.min(3,Number(payload.armor)||0));
   state.remotePlayer.color=payload.color||state.remotePlayer.color;
   state.remotePlayer.skin=payload.skin||state.remotePlayer.skin;
  }
  return;
 }
 if(event==='nuke_request'&&onlineSession?.role==='host'&&state.running){useNuke({consumeInventory:false});return;}
 if(event==='state'&&onlineSession?.role==='guest'&&state.running){applyNetworkSnapshot(payload);return;}
 if(event==='shared_gems'&&onlineSession?.role==='guest'&&Number(payload.amount)>0){saveData.gems+=Number(payload.amount);persist();updateDashboard();return;}
 if(event==='game_end'&&onlineSession?.role==='guest'&&state.running){applyNetworkSnapshot(payload.snapshot);gameOver(true);return;}
 if(event==='room_closed'){
  setP2PStatus('Le salon a été fermé par l’hôte.');
  $('roomStatusText').textContent='Le salon a été fermé.';
 }
}
function attachPeerConnection(conn,role,session=onlineSession){
 if(!session||onlineSession!==session){try{conn.close();}catch(e){}return;}
 rtcConnection=conn;hookIceStats(conn);
 session.channel=makePeerWrapper(conn);
 session.transport='peerjs';
 let opened=false;
 const connectionTimeout=setTimeout(()=>{
  if(opened||onlineSession!==session)return;
  const pc=conn.peerConnection;
  const iceState=pc?.iceConnectionState||pc?.connectionState||'non disponible';
  const message=`Le canal réseau ne s’est pas ouvert (${iceState} · ${iceSummary(conn)}). Si relais:0, aucun serveur TURN n’a répondu. Annule, recrée un salon et réessaie.`;
  setP2PStatus(message);
  $('roomStatusText').textContent=message;
 },20000);
 const onOpen=()=>{
  if(opened||onlineSession!==session)return;
  opened=true;
  clearTimeout(connectionTimeout);
  if(role==='guest'){
   setP2PStatus('Canal ouvert. Vérification du salon…');
   $('roomStatusText').textContent='Canal ouvert. Vérification du salon…';
   sendRoomEvent('hello',{});
  }else{
   setP2PStatus('Connexion établie. En attente du deuxième joueur…');
   $('roomStatusText').textContent='Connexion établie. En attente du deuxième joueur…';
  }
 };
 conn.on('open',onOpen);
 conn.on('data',handlePeerMessage);
 conn.on('close',()=>{
  clearTimeout(connectionTimeout);
  if(onlineSession!==session)return;
  session.peerReady=false;session.channel=null;
  if(role==='host')$('startCoopButton').disabled=true;
  setP2PStatus('Connexion interrompue. Le salon est déconnecté.');
  $('roomStatusText').textContent='Connexion interrompue.';
 });
 conn.on('error',e=>{
  clearTimeout(connectionTimeout);
  if(onlineSession!==session)return;
  const detail=e?.message||e?.type||'réseau';
  setP2PStatus('Erreur de connexion : '+detail+'. Réessaie de rejoindre le salon.');
  $('roomStatusText').textContent='Erreur de connexion : '+detail;
 });
 const pc=conn.peerConnection;
 if(pc?.addEventListener){
  pc.addEventListener('iceconnectionstatechange',()=>{
   if(onlineSession!==session||opened)return;
   if(pc.iceConnectionState==='failed'){
    const message=`Le réseau a refusé la connexion WebRTC. (${iceSummary(conn)}) Vérifie aussi qu’aucun des deux appareils ne bloque WebRTC.`;
    setP2PStatus(message);$('roomStatusText').textContent=message;
   }
  });
 }
 // PeerJS may have opened the channel before the handlers were attached.
 if(conn.open)onOpen();
}
function cleanupPeerRoom(){
 try{if(rtcConnection){rtcConnection.close();rtcConnection=null;}}catch(e){}
 try{if(rtcPeer){rtcPeer.destroy();rtcPeer=null;}}catch(e){}
}
function makeRoomCode(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const values=new Uint32Array(6);
 if(window.crypto?.getRandomValues)crypto.getRandomValues(values);
 else for(let i=0;i<6;i++)values[i]=Math.floor(Math.random()*0xFFFFFFFF);
 return Array.from(values,v=>alphabet[v%alphabet.length]).join('');
}
// Config ICE = celle PAR DÉFAUT de PeerJS (STUN Google + TURN peerjs.com) + STUN en plus.
// L'ancien Open Relay (openrelayproject) n'est plus fiable : sans STUN/TURN qui répondent,
// deux appareils sur des réseaux différents ne peuvent jamais ouvrir le canal.
const NEON_ICE_CONFIG={
 iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun.cloudflare.com:3478'},
  {urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}
 ],
 sdpSemantics:'unified-plan'
};
// Compte les types de candidats ICE (host / srflx / relay) pour le diagnostic.
function hookIceStats(conn){
 const stats={host:0,srflx:0,relay:0,prflx:0};conn._neonIce=stats;
 let tries=0;const t=setInterval(()=>{
  const pc=conn.peerConnection;
  if(pc&&pc.addEventListener){clearInterval(t);pc.addEventListener('icecandidate',e=>{const c=e.candidate&&e.candidate.candidate||'';const m=c.match(/ typ (\w+)/);if(m&&stats[m[1]]!==undefined)stats[m[1]]++;});}
  else if(++tries>40)clearInterval(t);
 },100);
}
function iceSummary(conn){const s=conn?._neonIce;return s?`candidats host:${s.host} stun:${s.srflx} relais:${s.relay}`:'candidats inconnus';}
function createQuickRoom(){
 if(!window.Peer){setP2PStatus('La bibliothèque multijoueur n’a pas chargé. Recharge la page et réessaie.');return;}
 cleanupPeerRoom();
 setCoopMode();
 const code=makeRoomCode(),peerId='neonoutpost-'+code.toLowerCase();
 const session=onlineSession={role:'host',transport:'peerjs',roomCode:code,peerId,peerName:'',channel:null,peerReady:false,inGame:false,lastInputAt:0,lastStateAt:0};
 $('roomLobby').classList.remove('hidden');
 $('roomCodeDisplay').textContent='…';
 $('roomStatusText').textContent='Création du salon…';
 $('startCoopButton').disabled=true;
 $('startCoopButton').classList.remove('hidden');
 $('startCoopButton').onclick=()=>{
  if(onlineSession!==session||!session.peerReady||!rtcConnection?.open)return;
  if(!sendRoomEvent('start',{mode:'multiplayer'})){setP2PStatus('Impossible de lancer : connexion perdue.');return;}
  session.inGame=true;startGame(true);
 };
 $('cancelRoomButton').onclick=cancelRoom;
 setP2PStatus('Connexion au service de salons…');
 try{
  rtcPeer=new window.Peer(peerId,{debug:1,config:NEON_ICE_CONFIG});
  rtcPeer.on('open',id=>{
   if(onlineSession!==session)return;
   const short=String(id).replace(/^neonoutpost-/,'').toUpperCase();
   session.roomCode=short;
   $('roomCodeDisplay').textContent=short;
   $('roomStatusText').textContent='Salon créé. Partage le code au deuxième joueur.';
   setP2PStatus('Salon prêt. Partage le code à 6 caractères.');
  });
  rtcPeer.on('disconnected',()=>{
   if(onlineSession!==session||rtcPeer?.destroyed)return;
   setP2PStatus('Salon déconnecté du serveur, reconnexion…');
   try{rtcPeer.reconnect();}catch(e){}
  });
  rtcPeer.on('connection',conn=>{
   if(onlineSession!==session){conn.close();return;}
   if(rtcConnection&&rtcConnection!==conn&&rtcConnection.open){conn.close();return;}
   attachPeerConnection(conn,'host',session);
  });
  rtcPeer.on('error',err=>{
   if(onlineSession!==session)return;
   const msg=err?.type==='unavailable-id'?'Ce code est déjà utilisé. Annule et crée un nouveau salon.':
    err?.type==='peer-unavailable'?'Salon introuvable. Vérifie le code.':
    (err?.message||err?.type||'Connexion impossible');
   setP2PStatus('Erreur : '+msg);
   $('roomStatusText').textContent=msg;
  });
 }catch(e){setP2PStatus('Impossible de créer le salon : '+(e?.message||e));}
}
function joinQuickRoom(){
 if(!window.Peer){setP2PStatus('La bibliothèque multijoueur n’a pas chargé. Recharge la page et réessaie.');return;}
 const code=$('quickJoinCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!==6){setP2PStatus('Entre le code de 6 caractères fourni par l’hôte.');return;}
 cleanupPeerRoom();
 setCoopMode();
 const session=onlineSession={role:'guest',transport:'peerjs',roomCode:code,peerId:null,peerName:'Deuxième joueur',channel:null,peerReady:false,inGame:false,lastInputAt:0,lastStateAt:0};
 $('roomLobby').classList.remove('hidden');
 $('roomCodeDisplay').textContent=code;
 $('roomStatusText').textContent='Connexion au salon…';
 $('startCoopButton').classList.add('hidden');
 $('cancelRoomButton').onclick=cancelRoom;
 setP2PStatus('Connexion au service de salons…');
 try{
  const openTimer=setTimeout(()=>{if(onlineSession===session&&!rtcConnection){const m='Impossible de joindre le serveur de salons PeerJS (0.peerjs.com). Vérifie ta connexion / bloqueur de pub, puis réessaie.';setP2PStatus(m);$('roomStatusText').textContent=m;}},12000);
  rtcPeer=new window.Peer({debug:1,config:NEON_ICE_CONFIG});
  rtcPeer.on('open',()=>{
   clearTimeout(openTimer);
   if(onlineSession!==session)return;
   const peerId='neonoutpost-'+code.toLowerCase();
   $('roomStatusText').textContent='Connexion au salon en cours…';
   setP2PStatus('Ouverture du canal réseau…');
   rtcConnection=rtcPeer.connect(peerId,{reliable:true,serialization:'json'});
   attachPeerConnection(rtcConnection,'guest',session);
   $('quickJoinCode').value='';
  });
  rtcPeer.on('error',err=>{
   if(onlineSession!==session)return;
   const msg=err?.type==='peer-unavailable'?'Aucun salon trouvé avec ce code. Vérifie qu’il est toujours ouvert.':
    (err?.message||err?.type||'Connexion impossible');
   setP2PStatus('Erreur : '+msg);
   $('roomStatusText').textContent=msg;
  });
 }catch(e){setP2PStatus('Impossible de rejoindre le salon : '+(e?.message||e));}
}
$('quickCreateRoom').onclick=createQuickRoom;
$('quickJoinRoom').onclick=joinQuickRoom;
$('quickJoinCode').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);});
$('copyRoomCodeButton').onclick=async()=>{const code=$('roomCodeDisplay').textContent;if(!code||code==='------'||code==='…')return;try{const invite=new URL(location.href);invite.searchParams.set('join',code);await navigator.clipboard.writeText(invite.toString());setP2PStatus('Lien copié ! Envoie-le au deuxième joueur : il pourra rejoindre le salon automatiquement.');toast('Lien d’invitation copié !');}catch(e){setP2PStatus('Code du salon : '+code+' — copie-le manuellement.');}};

async function cancelRoom(){if(onlineSession?.transport==='peerjs'&&onlineSession.role==='host')sendRoomEvent('room_closed',{});if(onlineSession)onlineSession.failed=true;cleanupPeerRoom();onlineSession=null;guestVisualBlend=null;lastGuestSnapshotAt=0;$('roomLobby').classList.add('hidden');$('startCoopButton').classList.remove('hidden');$('startCoopButton').disabled=true;setP2PStatus('Prêt à créer ou rejoindre un salon.');toast('Salon fermé.');}
function endToMenu(){state.running=false;state.paused=false;if(onlineSession)onlineSession.inGame=false;state.mouse.down=false;$('gameScreen').classList.add('hidden');$('pauseOverlay').classList.add('hidden');$('gameOverOverlay').classList.add('hidden');$('homeScreen').classList.remove('hidden');updateTouchControls();updateDashboard();requestAnimationFrame(globalFrame)}
function pauseGame(){if(!state.running||state.gameEnded)return;state.paused=!state.paused;$('pauseOverlay').classList.toggle('hidden',!state.paused);updateTouchControls();if(!state.paused){state.lastTime=performance.now();requestAnimationFrame(loop)}}
$('pauseGame').onclick=pauseGame;$('resumeButton').onclick=pauseGame;$('exitGame').onclick=()=>{if(confirm('Quitter cette partie ? Ton score actuel ne sera pas enregistré.'))endToMenu()};$('restartPause').onclick=startGame;$('quitPause').onclick=endToMenu;$('retryButton').onclick=startGame;$('gameOverMenu').onclick=endToMenu;
function flashWave(n){$('flashWave').textContent=String(n).padStart(2,'0');$('levelFlash').classList.remove('hidden');clearTimeout(flashWave.t);flashWave.t=setTimeout(()=>$('levelFlash').classList.add('hidden'),1050)}
function spawnEnemy(){let edge=Math.floor(Math.random()*4),x=edge===0?Math.random()*W:edge===1?W+25:edge===2?Math.random()*W:-25,y=edge===0?-25:edge===1?Math.random()*H:edge===2?H+25:Math.random()*H;let wave=state.wave;let roll=Math.random(),kind=wave>=4&&roll<.17?'shooter':wave>=3&&roll<.38?'runner':'chaser';let diff=[.78,1,1.3][saveData.difficulty-1];let base=kind==='runner'?1.8:kind==='shooter'?1.05:1.2;state.enemies.push({x,y,r:kind==='runner'?9:kind==='shooter'?13:12,hp:kind==='shooter'?3:kind==='runner'?1:2,speed:(base+wave*.055)*diff*(modes[chosenMode].health===1.4?.9:1),kind,hit:0,shot:1+Math.random()*1.5,angle:0})}
const bossVariants=[
 {id:'manta',name:'TITAN MANTA',color:'#ff704d',accent:'#ffd0a1',shape:0},
 {id:'spider',name:'ARACHNIDE NOIR',color:'#d77aff',accent:'#f1c8ff',shape:1},
 {id:'fortress',name:'FORTERESSE VIVANTE',color:'#e4a84f',accent:'#fff0b7',shape:2},
 {id:'prism',name:'PRISME DU NÉANT',color:'#67c9ff',accent:'#d8f8ff',shape:3},
 {id:'seraph',name:'SÉRAPHIN DE GUERRE',color:'#f06d9c',accent:'#ffd8ee',shape:4},
 {id:'reaper',name:'FAUCHEUR COSMIQUE',color:'#89edca',accent:'#e0fff1',shape:5},
 {id:'twinfang',name:'CROCS JUMEAUX',color:'#ff984b',accent:'#ffe1a6',shape:6},
 {id:'monolith',name:'MONOLITHE ROUGE',color:'#fa5669',accent:'#ffe2dd',shape:7}
];
function bossVariantForWave(wave){return bossVariants[(Math.max(0,Math.floor((wave-5)/5)))%bossVariants.length];}
function bossTitle(tier,variant=null){return tier==='final'?'☠ LE COLOSSE — BOSS FINAL':tier==='giant'?(variant?.name||'⚠ TITAN DE GUERRE'):(variant?.name||'VAISSEAU COMMANDANT');}
function spawnBoss(tier='commander',bossWave=state.wave){if(state.enemies.some(e=>e.kind==='boss')){if(!Array.isArray(state.pendingBoss))state.pendingBoss=[];state.pendingBoss.push({tier,wave:bossWave});return;}let hp,scale,r,speed,shot;if(tier==='final'){hp=10000;scale=3.35;r=148;speed=.52;shot=.78;}else if(tier==='giant'){hp=430+bossWave*25;scale=2.55;r=100;speed=.78;shot=1.02;}else{const normalHp=32+bossWave*7;hp=bossWave===5?Math.max(20,Math.round(normalHp/3)):normalHp;scale=1.65;r=51;speed=1.15;shot=1.1;}const variant=tier==='final'?{id:'colossus',name:'LE COLOSSE',color:'#ff5368',accent:'#ffe2dd',shape:8}:bossVariantForWave(bossWave);const bossY=tier==='final'?180:tier==='giant'?Math.max(110,Math.min(145,H*.19)):64;const boss={x:W/2,y:bossY,r,hp,maxHp:hp,speed,kind:'boss',bossTier:tier,variant,scale,hit:0,shot,angle:Math.PI/2,attackPhase:0,wave:bossWave};state.enemies.push(boss);state.screenShake=tier==='final'?28:tier==='giant'?17:8;playSfx('boss');deviceVibrate(tier==='final'?[100,45,120,45,180]:tier==='giant'?[65,35,100]:[45,35,70]);$('waveSub').textContent=tier==='final'?'ULTIME MENACE — LE COLOSSE':tier==='giant'?'BOSS GÉANT — '+variant.name:'BOSS — '+variant.name;toast(`${bossTitle(tier,variant)} · VAGUE ${bossWave}`);}
function spawnMilestoneBoss(wave){const tier=wave===100?'final':wave%10===0?'giant':'commander';spawnBoss(tier,wave);}
function makeQuest(type,w){const scale=1+Math.min(2.4,w*.018),reward=18+w*2+Math.floor(w*w*.035);const defs={
 kill:{goal:Math.round((7+Math.floor(w*.7))*scale),label:'ÉLIMINE DES VAISSEAUX'},meteor:{goal:1+Math.min(8,Math.floor(w/14)),label:'DÉTRUIS DES MÉTÉORITES'},boost:{goal:1+Math.min(3,Math.floor(w/32)),label:'RÉCUPÈRE DES BOOSTS'},survive:{goal:Math.round(8+Math.min(10,w*.1)),label:'SURVIS SANS ABANDONNER'},combo:{goal:Math.min(30,5+Math.floor(w*.42)),label:'ENCHAÎNE DES ÉLIMINATIONS'},dash:{goal:2+Math.min(10,Math.floor(w/11)),label:'UTILISE TON DASH'},score:{goal:Math.round((650+w*135)*Math.pow(1+w*.012,.55)),label:'MARQUE DES POINTS'},shooter:{goal:2+Math.min(10,Math.floor(w/12)),label:'DÉTRUIS LES FRÉGATES ROSES'},runner:{goal:3+Math.min(12,Math.floor(w/10)),label:'INTERCEPTE LES CHASSEURS ORANGE'},boss:{goal:1,label:'VAINCS UN BOSS'},wave:{goal:1+Math.min(4,Math.floor(w/16)),label:'SURVIS AUX VAGUES'},gem:{goal:6+Math.min(24,Math.floor(w/4)),label:'RAMASSE DES GEMMES'},nohit:{goal:7+Math.min(20,Math.floor(w/5)),label:'SURVIS SANS PRENDRE DE DÉGÂTS'}};const d=defs[type];return {type,goal:d.goal,label:type==='wave'?`${d.label} (${d.goal})`:`${d.label} ${d.goal}`,reward,progress:0,done:false,wave:type==='boss'?w:null};}
function beginObjective(){const w=state.wave,carry=(state.objectives||[]).filter(o=>o.type==='boss'&&!o.done);const pool=['meteor','boost','survive','combo','dash','score','wave','gem','nohit',...(w>=4?['shooter']:[]),...(w>=3?['runner']:[]),...(w>=5?['boss']:[])];const chosen=[];if(w%10===0&&w>=10)chosen.push('boss');if(carry.length+chosen.length<3)chosen.push('kill');while(carry.length+chosen.length<3){const pick=pool[Math.floor(Math.random()*pool.length)];if(!chosen.includes(pick))chosen.push(pick);}state.objectives=[...carry,...chosen.map(type=>makeQuest(type,w))].slice(0,3);state.objective=state.objectives[0]||null;updateObjectiveUI();}
function questPercent(o){return Math.max(0,Math.min(100,o.progress/o.goal*100));}
function updateObjectiveUI(){const list=state.objectives&&state.objectives.length?state.objectives:(state.objective?[state.objective]:[]);if(!list.length)return;const first=list[0];$('missionTitle').textContent=first.done?'✓ '+first.label:first.label;$('missionProgress').textContent=first.done?`+${first.reward} GEMMES AJOUTÉES`:`${Math.min(first.goal,Math.floor(first.progress))} / ${first.goal} · +${first.reward} GEMMES`;$('missionFill').style.width=`${questPercent(first)}%`;$('missionExtra').innerHTML=list.slice(1).map(o=>`<div class="quest-mini ${o.done?'done':''}"><div><b>${o.done?'✓ ':''}${o.label}</b><span>${o.done?'TERMINÉ':`${Math.min(o.goal,Math.floor(o.progress))}/${o.goal} · +${o.reward} ◆`}</span></div><i><em style="width:${questPercent(o)}%"></em></i></div>`).join('');}
function progressObjective(type,amount=1,meta=null){const list=state.objectives&&state.objectives.length?state.objectives:(state.objective?[state.objective]:[]);let completed=[];for(const o of list){if(o.done||o.type!==type||(type==='boss'&&(meta?.wave!==o.wave||(o.targetVariant&&meta?.variant!==o.targetVariant))))continue;o.progress=Math.min(o.goal,o.progress+amount);if(o.progress>=o.goal){o.done=true;completed.push(o);}}if(!list.length)return;updateObjectiveUI();for(const o of completed){saveData.gems+=o.reward;if(onlineSession?.role==='host'&&chosenMode==='multiplayer')sendRoomEvent('shared_gems',{amount:o.reward});persist();updateDashboard();state.screenShake=Math.max(state.screenShake,5);burst(state.player.x,state.player.y,'#f4ca69',32,5);playSfx('achievement');deviceVibrate([25,35,25]);toast(`CONTRAT TERMINÉ : +${o.reward} GEMMES`);}}
function deviceVibrate(pattern){if(saveData.vibration!==false&&navigator.vibrate){try{navigator.vibrate(pattern)}catch(e){}}}


function spawnMeteor(){
 if(state.meteors.length>=5)return;
 const edge=Math.floor(Math.random()*4),r=20+Math.random()*13;
 const x=edge===0?Math.random()*W:edge===1?W+ r+12:edge===2?Math.random()*W:-r-12;
 const y=edge===0?-r-12:edge===1?Math.random()*H:edge===2?H+r+12:Math.random()*H;
 const targetX=W*(.28+Math.random()*.44),targetY=H*(.25+Math.random()*.5);
 const angle=Math.atan2(targetY-y,targetX-x)+(Math.random()-.5)*.65;
 const speed=75+Math.random()*55+state.wave*2.2;
 const sides=8+Math.floor(Math.random()*4),vertices=[];
 for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,rr=r*(.76+Math.random()*.28);vertices.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr})}
 state.meteors.push({x,y,r,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle:Math.random()*6,spin:(Math.random()-.5)*1.8,hp:3,maxHp:3,hit:0,vertices});
}
function dropBoost(x,y,type){
 const key=type||['rapid','shield','triple','double','repair'][Math.floor(Math.random()*5)],def=boostDefs[key];
 state.pickups.push({x,y,r:11,life:12,type:key,color:def.color,symbol:def.symbol,phase:Math.random()*6});
}
function updateBoostUI(){
 const active=[];
 for(const key of ['rapid','shield','triple','double'])if(state.boosts[key]>0)active.push(`<span class="boost-pill" style="--boost-color:${boostDefs[key].color}">${boostDefs[key].symbol} ${boostDefs[key].label} ${state.boosts[key].toFixed(1)}s</span>`);
 $('boostStatus').innerHTML=active.length?active.join(''):'ASTÉROÏDES → BOOSTS';
}
function spawnBossGemBurst(x,y,tier,total){const count=tier==='final'?88:tier==='giant'?36:14;const value=Math.max(1,Math.floor(total/count));let left=total;for(let i=0;i<count;i++){const v=i===count-1?left:value;left-=v;const a=Math.PI*2*i/count+(Math.random()-.5)*.22,s=90+Math.random()*230;state.pickups.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:tier==='final'?9:8,life:38,type:'gem',value:v,color:'#f5cf68',symbol:'◆',phase:Math.random()*6});}state.bossExplosion={x,y,t:0,duration:tier==='final'?2.5:1.9,tier};state.screenShake=Math.max(state.screenShake,tier==='final'?38:tier==='giant'?27:18);burst(x,y,'#fff0c6',tier==='final'?240:tier==='giant'?150:90,tier==='final'?18:12);for(let i=0;i<5;i++)state.shockwaves.push({x,y,radius:4+i*5,maxRadius:(tier==='final'?400:260)+i*45,life:.9+i*.22,maxLife:.9+i*.22,color:i%2?'#ffd879':'#fff3cf'});playSfx('bossdown');deviceVibrate(tier==='final'?[130,45,160,45,240,55,180]:[90,35,120,45,90]);}
function collectBoost(c,target=state.player){
 if(c.type==='gem'){saveData.gems+=c.value||1;if(onlineSession?.role==='host')sendRoomEvent('shared_gems',{amount:c.value||1});progressObjective('gem',c.value||1);persist();updateDashboard();playSfx('pickup');burst(c.x,c.y,'#ffe08c',6,1.5);return;}
 const key=c.type,def=boostDefs[key];
 if(key==='repair'){if(target===state.remotePlayer){target.hp=Math.min(target.maxHp||100,(target.hp||0)+35);}else{state.health=Math.min(state.healthMax,state.health+35);}updateHealthUI();}
 else state.boosts[key]=Math.max(state.boosts[key],def.duration);
 state.score+=Math.round(25*(state.boosts.double>0?2:1));
 burst(c.x,c.y,def.color,18,3.6);progressObjective('boost');playSfx('pickup');toast(`BOOST OBTENU : ${def.label}`);updateBoostUI();
}
function destroyMeteor(m,drop=true){
 if(m.dead)return;m.dead=true;const meteorPoints=Math.round(45*modes[chosenMode].score*state.bonus*(state.boosts.double>0?2:1));state.score+=meteorPoints;progressObjective('score',meteorPoints);
 burst(m.x,m.y,'#f4b66b',22,4.2);burst(m.x,m.y,'#8e9bb2',12,2.8);state.screenShake=Math.max(state.screenShake,3);playSfx('meteor');
 progressObjective('meteor');if(drop&&Math.random()<.88)dropBoost(m.x,m.y);
}

function updateHealthUI(){const guestLocal=onlineSession?.role==='guest'&&chosenMode==='multiplayer'&&state.remotePlayer;const hp=guestLocal?state.remotePlayer.hp:state.health;const maxHp=Math.max(1,guestLocal?(state.remotePlayer.maxHp||100):(state.healthMax||100));const percent=Math.max(0,Math.min(100,hp/maxHp*100));$('healthText').textContent=Math.ceil(percent)+'%';$('healthFill').style.width=percent+'%';}
function updateNukeUI(){if($('nukeStatus'))$('nukeStatus').innerHTML=`NUKE × ${saveData.nukes} <kbd>N</kbd>`;}
function requestNuke(){if(onlineSession?.role==='guest'&&chosenMode==='multiplayer'){if(saveData.nukes<=0){toast('Aucune nuke en stock. Achète-en au marché avec tes gemmes.');return;}if(!sendRoomEvent('nuke_request',{})){toast('Connexion au salon perdue : la NUKE n’a pas été utilisée.');return;}saveData.nukes--;persist();updateDashboard();updateNukeUI();toast('Ta NUKE a été déclenchée !');return;}useNuke();}
function useNuke({consumeInventory=true}={}){
 if(!state.running||state.paused||state.gameEnded)return;
 if(consumeInventory&&saveData.nukes<=0){toast('Aucune nuke en stock. Achète-en au marché avec tes gemmes.');return;}
 if(consumeInventory)saveData.nukes--;let count=0;const survivors=[];
 for(const e of state.enemies){
  if(e.kind==='boss'&&(e.bossTier==='giant'||e.bossTier==='final')){
   const fraction=e.bossTier==='final'?.16:.34,damage=Math.ceil(e.maxHp*fraction);e.hp=Math.max(1,e.hp-damage);e.hit=.45;burst(e.x,e.y,'#ffb14f',e.bossTier==='final'?65:42,e.bossTier==='final'?10:7);count++;
   survivors.push(e);continue;
  }
  const base=e.kind==='boss'?650:e.kind==='shooter'?85:e.kind==='runner'?65:55,points=Math.round(base*modes[chosenMode].score*state.bonus*(state.boosts.double>0?2:1));state.score+=points;progressObjective('score',points);state.kills++;progressObjective('kill');if(e.kind==='shooter')progressObjective('shooter');if(e.kind==='runner')progressObjective('runner');if(e.kind==='boss'){progressObjective('boss',1,{wave:e.wave,variant:e.variant?.id});const bossGems=20+e.wave;spawnBossGemBurst(e.x,e.y,e.bossTier,bossGems);burst(e.x,e.y,'#ffb14f',72,8);}else{burst(e.x,e.y,e.kind==='runner'?'#ff9a3d':e.kind==='shooter'?'#ff679c':'#ad88ff',20,5);}count++;
 }
 state.enemies=survivors;
 for(const m of state.meteors){destroyMeteor(m,false);count++;}
 state.meteors=[];state.enemyBullets=[];state.nukeFlash=.72;state.screenShake=24;burst(state.player.x,state.player.y,'#e8ffff',90,14);deviceVibrate([80,40,110]);playSfx('nuke');checkAchievements();persist();updateDashboard();updateNukeUI();$('liveScore').textContent=fmt(state.score);toast(`☢ NUKE ! ${count} cibles touchées · LES TITANS ENCAISSENT LE CHOC`);
}
function burst(x,y,color,count=9,power=2.8){if(!saveData.effects)return;if(!Array.isArray(state.particles))state.particles=[];if(!Array.isArray(state.shockwaves))state.shockwaves=[];const coop=chosenMode==='multiplayer',limit=coop?150:1200,emit=coop?Math.min(count,96):count;if(count>=12&&state.shockwaves.length<(coop?10:40))state.shockwaves.push({x,y,radius:3,maxRadius:power*13,life:.34,maxLife:.34,color});if(state.particles.length+emit>limit)state.particles.splice(0,state.particles.length+emit-limit);for(let i=0;i<emit;i++){let a=Math.random()*Math.PI*2,v=Math.random()*power+.5;state.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.55,max:.85,r:Math.random()*3.2+.9,color})}}
function shoot(){
 let p=state.player,now=state.time,level=saveData.shipUpgrades.fireRate||0,cooldown=state.boosts.rapid>0?.065:.16*Math.pow(.86,level);
 if(now-state.lastShot<cooldown)return;state.lastShot=now;
 let a=Math.atan2(state.mouse.y-p.y,state.mouse.x-p.x);p.angle=a;
 const angles=state.boosts.triple>0?[a-.22,a,a+.22]:[a],pierce=saveData.shipUpgrades.piercing||0,critChance=(saveData.shipUpgrades.critical||0)*.06,projectileSpeed=620*(1+(saveData.shipUpgrades.projectile||0)*.12);
 for(const shotAngle of angles){const crit=Math.random()<critChance;state.bullets.push({x:p.x+Math.cos(shotAngle)*17,y:p.y+Math.sin(shotAngle)*17,vx:Math.cos(shotAngle)*projectileSpeed,vy:Math.sin(shotAngle)*projectileSpeed,life:1.2,r:3,damage:(1+(saveData.shipUpgrades.damage||0))*(crit?2:1),critical:crit,pierceRemaining:pierce});}
 playSfx('shoot')
}
function damagePlayer(amount){if(state.invuln>0)return;state.noHitTimer=0;for(const o of (state.objectives||[]))if(o.type==='nohit'&&!o.done)o.progress=0;updateObjectiveUI();if(state.boosts.shield>0){burst(state.player.x,state.player.y,'#ad91ff',10,2.4);playSfx('shield');return;}const armor=saveData.shipUpgrades.armor||0;state.health=Math.max(0,state.health-amount*(1-.08*armor));state.invuln=.48;state.screenShake=8;burst(state.player.x,state.player.y,'#ff6b9d',12,3);playSfx('damage');updateHealthUI();if(state.health<=0)gameOver()}
function gameOver(fromNetwork=false){if(state.gameEnded)return;if(!fromNetwork&&onlineSession?.role==='host'){sendRoomEvent('game_end',{snapshot:networkSnapshot()});}state.gameEnded=true;state.running=false;state.mouse.down=false;let wasRecord=state.score>saveData.best;saveData.games++;if(wasRecord)saveData.best=state.score;saveData.bestWave=Math.max(saveData.bestWave,state.wave);saveData.runs.push({score:state.score,mode:chosenMode,wave:state.wave,kills:state.kills,date:new Date().toLocaleDateString('fr-CA')});saveData.runs.sort((a,b)=>b.score-a.score);saveData.runs=saveData.runs.slice(0,50);const gemReward=Math.max(5,Math.floor(state.score/200)+state.wave*2+Math.floor(state.kills/4));saveData.gems+=gemReward;checkAchievements(true);persist();$('finalScore').textContent=fmt(state.score);$('finalWave').textContent=state.wave;$('finalKills').textContent=state.kills;$('finalTime').textContent=formatTime(state.time);$('finalGems').textContent=`+${gemReward}`;$('newRecord').classList.toggle('hidden',!wasRecord);$('gameOverOverlay').classList.remove('hidden');$('gameScreen').classList.add('hidden');updateTouchControls();updateDashboard();updateNukeUI();playSfx('gameover')}
function formatTime(t){let s=Math.floor(t);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function checkAchievements(final=false){for(let a of achievementDefs){if(!saveData.achievements.includes(a.id)&&a.test(state)){saveData.achievements.push(a.id);toast('SUCCÈS DÉBLOQUÉ : '+a.name.toUpperCase());playSfx('achievement')}}if(final)persist()}
function updateBossUI(){const boss=state.enemies.find(e=>e.kind==='boss');if(!boss){$('bossBar').classList.add('hidden');return;}$('bossBar').classList.remove('hidden');$('bossName').textContent=bossTitle(boss.bossTier,boss.variant);$('bossFill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;}
function sendGuestInput(){if(!onlineSession?.channel||!state.running)return;const now=performance.now();if(now-(onlineSession.lastInputAt||0)<50)return;onlineSession.lastInputAt=now;const inp=currentInput();let aimX=state.mouse.x,aimY=state.mouse.y;if(controlMode==='mobile'&&state.enemies.length){const origin=state.remotePlayer||state.player;let target=state.enemies.reduce((best,e)=>!best||Math.hypot(e.x-origin.x,e.y-origin.y)<Math.hypot(best.x-origin.x,best.y-origin.y)?e:best,null);if(target){aimX=target.x;aimY=target.y;}}sendRoomEvent('input',{...inp,aimX:aimX/W,aimY:aimY/H,color:skinColor(),skin:saveData.activeSkin,damage:1+(saveData.shipUpgrades.damage||0),maxHp:100+(saveData.shipUpgrades.armor||0)*25,armor:saveData.shipUpgrades.armor||0});}
function sendHostSnapshot(now){if(onlineSession?.role!=='host'||!rtcConnection?.open||!state.running)return;if(now-(onlineSession.lastStateAt||0)<100)return;const queued=rtcConnection._dc?.bufferedAmount||0;if(queued>24000)return;onlineSession.lastStateAt=now;sendRoomEvent('state',networkSnapshot());}
function update(dt){if(!state.running||state.paused)return;if(onlineSession?.role==='guest'&&chosenMode==='multiplayer'){sendGuestInput();return;}state.time+=dt;progressObjective('survive',dt);progressObjective('nohit',dt);state.noHitTimer=(state.noHitTimer||0)+dt;state.comboTimer=Math.max(0,state.comboTimer-dt);if(state.comboTimer<=0)state.combo=0;state.invuln=Math.max(0,state.invuln-dt);state.dashCooldown=Math.max(0,state.dashCooldown-dt);state.dash=Math.max(0,state.dash-dt);state.screenShake=Math.max(0,state.screenShake-dt*25);state.nukeFlash=Math.max(0,(state.nukeFlash||0)-dt);for(const key of Object.keys(state.boosts))state.boosts[key]=Math.max(0,state.boosts[key]-dt);let p=state.player;applyRemoteInput(dt);
 const k=state.keys,keys=saveData.keys;let inp=currentInput(),dx=inp.dx,dy=inp.dy;let mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;let accel=state.dash>0?740:380;let speed=(state.dash>0?600:245)*(1+(saveData.shipUpgrades.speed||0)*.07); if(dx||dy){p.x+=dx*speed*dt;p.y+=dy*speed*dt;}
 p.x=Math.max(22,Math.min(W-22,p.x));p.y=Math.max(22,Math.min(H-22,p.y));
 if(inp.dash&&state.dashCooldown<=0){state.dash=.19;state.dashCooldown=2.1*Math.pow(.82,saveData.shipUpgrades.dash||0);state.invuln=.34;progressObjective('dash');burst(p.x,p.y,'#63e5e0',22,4);deviceVibrate(18);playSfx('dash')}
 if(controlMode==='mobile'&&state.enemies.length){let target=state.enemies.reduce((best,e)=>!best||Math.hypot(e.x-p.x,e.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?e:best,null);if(target){state.mouse.x=target.x;state.mouse.y=target.y;}}if(inp.shooting)shoot();
 const rate=modes[chosenMode].spawn;state.spawnTimer-=dt;if(state.spawnTimer<=0){spawnEnemy();if(state.wave>=5&&Math.random()<.2)spawnEnemy();state.spawnTimer=(1.18/(1+state.wave*.08))/rate*(.78+Math.random()*.6)}
 state.waveTimer+=dt;if(state.waveTimer>=20){state.waveTimer=0;state.wave++;progressObjective('wave',1);state.bonus+=.12;$('waveNumber').textContent=String(state.wave).padStart(2,'0');$('waveSub').textContent='MENACE EN AUGMENTATION';flashWave(state.wave);playSfx('wave');beginObjective();if(state.wave%5===0)spawnMilestoneBoss(state.wave)}
 // Astéroïdes : ils traversent l'arène et peuvent être détruits pour obtenir des boosts.
 state.meteorTimer-=dt;if(state.meteorTimer<=0){spawnMeteor();state.meteorTimer=Math.max(3.4,7.2-state.wave*.16)*(0.8+Math.random()*.45)}
 for(const m of state.meteors){m.x+=m.vx*dt;m.y+=m.vy*dt;m.hit=Math.max(0,m.hit-dt);if(Math.hypot(p.x-m.x,p.y-m.y)<p.r+m.r*.72){if(state.dash<=0)damagePlayer(18);destroyMeteor(m,true)}else if(state.companion&&!m.dead&&Math.hypot(state.companion.x-m.x,state.companion.y-m.y)<state.companion.r+m.r*.72){damageCompanion(24);destroyMeteor(m,true)}}
 state.meteors=state.meteors.filter(m=>!m.dead&&m.x>-m.r-50&&m.x<W+m.r+50&&m.y>-m.r-50&&m.y<H+m.r+50);
 // Player bullets
 for(let b of state.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}state.bullets=state.bullets.filter(b=>b.life>0&&b.x>-40&&b.x<W+40&&b.y>-40&&b.y<H+40);
 // Enemies and enemy projectiles
 for(let e of state.enemies){const target=(state.remotePlayer?.alive&&Math.hypot(state.remotePlayer.x-e.x,state.remotePlayer.y-e.y)<Math.hypot(p.x-e.x,p.y-e.y))?state.remotePlayer:p;let a=Math.atan2(target.y-e.y,target.x-e.x),dist=Math.hypot(target.x-e.x,target.y-e.y);e.angle=a;e.hit=Math.max(0,e.hit-dt);if(e.kind==='boss'){const tier=e.bossTier||'commander',preferred=tier==='final'?365:tier==='giant'?325:285;if(dist>preferred){e.x+=Math.cos(a)*e.speed*48*dt;e.y+=Math.sin(a)*e.speed*48*dt;}else{e.x+=Math.sin(a)*Math.sin(state.time*(tier==='final'?2.1:1.4))*((tier==='final'?38:24))*dt;e.y+=Math.cos(a)*Math.sin(state.time*1.1)*((tier==='final'?22:12))*dt;}e.shot-=dt;if(e.shot<=0&&dist<850){const ratio=e.hp/e.maxHp;let spreads=tier==='final'?[-.72,-.54,-.36,-.18,0,.18,.36,.54,.72]:tier==='giant'?[-.5,-.34,-.17,0,.17,.34,.5]:[-.28,-.14,0,.14,.28];if(tier==='final'&&ratio<.55&&e.attackPhase%2===1)spreads=[0,.785,1.57,2.356,3.142,3.927,4.712,5.498];for(const spread of spreads){const aa=(tier==='final'&&ratio<.55&&e.attackPhase%2===1)?spread:a+spread;const velocity=tier==='final'?320:tier==='giant'?290:265;state.enemyBullets.push({x:e.x+Math.cos(aa)*(e.r*.72),y:e.y+Math.sin(aa)*(e.r*.72),vx:Math.cos(aa)*velocity,vy:Math.sin(aa)*velocity,life:4,r:tier==='final'?7:tier==='giant'?6:5,boss:true});}e.attackPhase++;e.shot=tier==='final'?(ratio<.4?.58:.82):tier==='giant'?.98:1.35;playSfx('bossshot');}}else if(e.kind==='shooter'){let preferred=255;if(dist>preferred+30){e.x+=Math.cos(a)*e.speed*55*dt;e.y+=Math.sin(a)*e.speed*55*dt}else if(dist<preferred-40){e.x-=Math.cos(a)*e.speed*45*dt;e.y-=Math.sin(a)*e.speed*45*dt}e.shot-=dt;if(e.shot<=0&&dist<470){state.enemyBullets.push({x:e.x+Math.cos(a)*16,y:e.y+Math.sin(a)*16,vx:Math.cos(a)*220,vy:Math.sin(a)*220,life:3,r:4});e.shot=1.8+Math.random()*.6}}else{e.x+=Math.cos(a)*e.speed*68*dt;e.y+=Math.sin(a)*e.speed*68*dt}if(dist<e.r+target.r+2){if(target===p){if(state.dash<=0)damagePlayer(e.kind==='runner'?13:e.kind==='boss'?(e.bossTier==='final'?48:e.bossTier==='giant'?36:26):17)}else if(state.remotePlayer&&state.remotePlayer.alive)damageRemotePlayer(e.kind==='runner'?13:e.kind==='boss'?(e.bossTier==='final'?48:e.bossTier==='giant'?36:26):17)}}
 for(let b of state.enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r) {b.life=0;damagePlayer(9)}else if(state.remotePlayer?.alive&&Math.hypot(b.x-state.remotePlayer.x,b.y-state.remotePlayer.y)<state.remotePlayer.r+b.r){b.life=0;damageRemotePlayer(9)}else if(state.companion&&Math.hypot(b.x-state.companion.x,b.y-state.companion.y)<state.companion.r+b.r){b.life=0;damageCompanion(13)}}state.enemyBullets=state.enemyBullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
 if(state.companion){for(const e of state.enemies){const ally=state.companion;if(!ally)break;if(Math.hypot(e.x-ally.x,e.y-ally.y)<e.r+ally.r+1)damageCompanion(14);}}
 updateCompanion(dt);
 // Bullet collisions
 for(let b of state.bullets){
  if(b.life<=0)continue;let hitTarget=false;
  for(let e of state.enemies){if(e.hp<=0)continue;if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){if((b.pierceRemaining||0)<=0){b.life=0;hitTarget=true;}else{b.pierceRemaining--;b.x+=b.vx*.012;b.y+=b.vy*.012;}e.hp-=Math.max(1,b.damage||1);e.hit=.09;burst(b.x,b.y,b.critical?'#ffe08a':'#a8fff0',b.critical?7:3,b.critical?2:1.1);if(e.hp<=0){state.kills++;progressObjective('kill');if(e.kind==='shooter')progressObjective('shooter');if(e.kind==='runner')progressObjective('runner');state.combo=state.comboTimer>0?state.combo+1:1;progressObjective('combo');state.comboTimer=2.6;let chain=1+Math.min(.8,Math.floor(state.combo/4)*.12);playSfx(e.kind==='boss'?'bossdown':'explosion');let baseValue=e.kind==='boss'?(e.bossTier==='final'?12000:e.bossTier==='giant'?2400:650):e.kind==='shooter'?85:e.kind==='runner'?65:55;let value=baseValue*modes[chosenMode].score*state.bonus*chain*(state.boosts.double>0?2:1);state.score+=Math.round(value);progressObjective('score',Math.round(value));burst(e.x,e.y,e.kind==='boss'?'#ffb14f':e.kind==='shooter'?'#ff679c':e.kind==='runner'?'#ff9a3d':'#63e5e0',e.kind==='boss'?72:24,e.kind==='boss'?8:4.6);state.screenShake=Math.max(state.screenShake,e.kind==='boss'?(e.bossTier==='final'?30:e.bossTier==='giant'?20:15):4);if(e.kind==='boss'){progressObjective('boss',1,{wave:e.wave,variant:e.variant?.id});const bossGems=e.bossTier==='final'?1800:e.bossTier==='giant'?100+state.wave*4:20+state.wave;spawnBossGemBurst(e.x,e.y,e.bossTier,bossGems);toast(`${bossTitle(e.bossTier,e.variant)} DÉTRUIT · RAMASSE ${bossGems} GEMMES !`);}else if(Math.random()<.12)dropBoost(e.x,e.y,'repair');if(state.kills%10===0)checkAchievements()}break}}
  if(hitTarget)continue;
  for(let m of state.meteors){if(m.dead)continue;if(Math.hypot(b.x-m.x,b.y-m.y)<m.r+b.r){b.life=0;m.hp--;m.hit=.12;burst(b.x,b.y,'#ffd19a',4,1.4);if(m.hp<=0)destroyMeteor(m,true);break}}
 }
 state.enemies=state.enemies.filter(e=>e.hp>0);state.meteors=state.meteors.filter(m=>!m.dead);if(Array.isArray(state.pendingBoss)&&state.pendingBoss.length&&!state.enemies.some(e=>e.kind==='boss')){const pending=state.pendingBoss.shift();spawnBoss(pending.tier,pending.wave);}
 for(let c of state.pickups){c.life-=dt;c.phase+=dt*3;if(c.vx||c.vy){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=Math.pow(.09,dt);c.vy*=Math.pow(.09,dt);}let targets=[p];if(state.remotePlayer?.alive)targets.push(state.remotePlayer);let target=targets.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];let d=Math.hypot(target.x-c.x,target.y-c.y);const magnetLevel=saveData.shipUpgrades.magnet||0;if(d<(c.type==='gem'?190+magnetLevel*70:115)){let pull=c.type==='gem'?5.5+magnetLevel*1.7:2.1;c.x+=(target.x-c.x)*Math.min(1,dt*pull);c.y+=(target.y-c.y)*Math.min(1,dt*pull);}if(d<target.r+c.r+5){c.life=0;collectBoost(c,target)}}state.pickups=state.pickups.filter(c=>c.life>0);
 for(let q of state.particles){q.x+=q.vx*dt*45;q.y+=q.vy*dt*45;q.vx*=.97;q.vy*=.97;q.life-=dt}state.particles=state.particles.filter(q=>q.life>0);for(const r of state.shockwaves){r.life-=dt;r.radius+=(r.maxRadius-r.radius)*dt*8;}state.shockwaves=state.shockwaves.filter(r=>r.life>0);
 if(state.kills>=1)checkAchievements();if(state.combo>=2){$('comboHud').classList.remove('hidden');$('comboValue').textContent=`x${(1+Math.min(.8,Math.floor(state.combo/4)*.12)).toFixed(2)}`;}else $('comboHud').classList.add('hidden');updateBossUI();$('liveScore').textContent=fmt(state.score);$('liveBest').textContent=fmt(saveData.best);$('dashStatus').innerHTML=state.dashCooldown<=0?'DASH DISPONIBLE <span>⇧</span>':`DASH ${state.dashCooldown.toFixed(1)}s`;updateBoostUI();
}
function drawArena(){ctx.save();if(state.screenShake>0){ctx.translate((Math.random()-.5)*state.screenShake,(Math.random()-.5)*state.screenShake)}ctx.clearRect(-20,-20,W+40,H+40);let bg=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,Math.max(W,H)*.75);bg.addColorStop(0,'#111a32');bg.addColorStop(1,'#080c18');ctx.fillStyle=bg;ctx.fillRect(-20,-20,W+40,H+40);
 ctx.strokeStyle='#7a90bd12';ctx.lineWidth=1;let grid=44,off=0;for(let x=0;x<W;x+=grid){ctx.beginPath();ctx.moveTo(x+off,0);ctx.lineTo(x+off,H);ctx.stroke()}for(let y=0;y<H;y+=grid){ctx.beginPath();ctx.moveTo(0,y+off);ctx.lineTo(W,y+off);ctx.stroke()}
 // perimeter + subtle radial markers
 ctx.strokeStyle='#63e5e027';ctx.lineWidth=1;ctx.strokeRect(15,15,W-30,H-30);ctx.fillStyle='#63e5e0';for(let i=0;i<4;i++){let x=i%2?W-15:15,y=i>1?H-15:15;ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill()}
 for(let m of state.meteors){ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.angle);ctx.shadowBlur=m.hit?25:14;ctx.shadowColor=m.hit?'#fff':'#d28c5d';let rock=ctx.createLinearGradient(-m.r,-m.r,m.r,m.r);rock.addColorStop(0,m.hit?'#fff1d7':'#b68a6c');rock.addColorStop(.55,'#625a69');rock.addColorStop(1,'#302f43');ctx.fillStyle=rock;ctx.beginPath();m.vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#f6c49a99';ctx.lineWidth=1.4;ctx.stroke();ctx.strokeStyle='#242334';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-m.r*.35,-m.r*.35);ctx.lineTo(-m.r*.05,-m.r*.02);ctx.lineTo(m.r*.18,-m.r*.1);ctx.moveTo(m.r*.2,m.r*.25);ctx.lineTo(m.r*.42,m.r*.43);ctx.stroke();if(m.hp<m.maxHp){ctx.fillStyle='#ffffff40';ctx.fillRect(-m.r,-m.r-8,m.r*2,3);ctx.fillStyle='#ffbf83';ctx.fillRect(-m.r,-m.r-8,m.r*2*(m.hp/m.maxHp),3)}ctx.restore()}
 for(let c of state.pickups){ctx.save();ctx.translate(c.x,c.y);let pulse=1+Math.sin(c.phase)*.12;ctx.scale(pulse,pulse);ctx.shadowBlur=c.type==='gem'?25:19;ctx.shadowColor=c.color;ctx.fillStyle=c.color;ctx.beginPath();if(c.type==='gem'){ctx.moveTo(0,-c.r);ctx.lineTo(c.r*.48,-c.r*.38);ctx.lineTo(c.r*.55,c.r*.2);ctx.lineTo(0,c.r);ctx.lineTo(-c.r*.55,c.r*.2);ctx.lineTo(-c.r*.48,-c.r*.38);ctx.closePath();}else{ctx.moveTo(0,-c.r);ctx.lineTo(c.r*.78,0);ctx.lineTo(0,c.r);ctx.lineTo(-c.r*.78,0);ctx.closePath()}ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#09111f';ctx.font=`bold ${c.type==='gem'?10:12}px Manrope`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.symbol,0,1);if(c.type==='gem'){ctx.fillStyle='#fff2b9';ctx.font='7px DM Mono';ctx.fillText('+'+(c.value||1),0,c.r+8)}ctx.restore()}
 for(let b of state.bullets){const bc=b.fromCompanion?droneSkinColor():b.fromRemote?'#bd91ff':'#63e5e0';ctx.shadowBlur=13;ctx.shadowColor=bc;ctx.fillStyle=b.fromCompanion||b.fromRemote?bc:'#cafff8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;
 for(let b of state.enemyBullets){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.shadowBlur=14;ctx.shadowColor=b.boss?'#ffad52':'#ff679c';ctx.fillStyle=b.boss?'#ffe0a4':'#ff8db4';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-3);ctx.lineTo(-7,0);ctx.lineTo(-4,3);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0f6';ctx.fillRect(-2,-1,6,2);ctx.restore()}ctx.shadowBlur=0;
 for(let e of state.enemies){
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
  let col=e.kind==='boss'?(e.variant?.color||(e.bossTier==='final'?'#ff5368':e.bossTier==='giant'?'#ff7838':'#ffb14f')):e.kind==='shooter'?'#ff679c':e.kind==='runner'?'#f3a85a':'#ad88ff';
  ctx.shadowBlur=e.hit?26:e.kind==='boss'?32:15;ctx.shadowColor=col;ctx.fillStyle=e.hit?'#fff':col;
  ctx.strokeStyle=e.kind==='shooter'?'#ffe0ec':e.kind==='runner'?'#ffe0a8':e.kind==='boss'?'#fff0c6':'#ffffffaa';ctx.lineWidth=e.kind==='shooter'||e.kind==='runner'||e.kind==='boss'?1.5:1.3;ctx.lineJoin='round';ctx.beginPath();
  if(e.kind==='boss'){
   const sc=e.scale||1.65;ctx.scale(sc,sc);const shape=e.variant?.shape??0,accent=e.variant?.accent||'#fff0b7';
   if(shape===0){ctx.moveTo(34,0);ctx.lineTo(8,-7);ctx.lineTo(-7,-8);ctx.lineTo(-39,-27);ctx.lineTo(-42,-18);ctx.lineTo(-22,-2);ctx.lineTo(-34,0);ctx.lineTo(-22,2);ctx.lineTo(-42,18);ctx.lineTo(-39,27);ctx.lineTo(-7,8);ctx.lineTo(8,7);ctx.closePath();}
   else if(shape===1){ctx.moveTo(29,0);ctx.lineTo(8,-7);ctx.lineTo(-5,-8);ctx.lineTo(-20,-29);ctx.lineTo(-26,-27);ctx.lineTo(-17,-8);ctx.lineTo(-37,-16);ctx.lineTo(-40,-10);ctx.lineTo(-23,0);ctx.lineTo(-40,10);ctx.lineTo(-37,16);ctx.lineTo(-17,8);ctx.lineTo(-26,27);ctx.lineTo(-20,29);ctx.lineTo(-5,8);ctx.lineTo(8,7);ctx.closePath();}
   else if(shape===2){ctx.moveTo(32,0);ctx.lineTo(18,-12);ctx.lineTo(-16,-12);ctx.lineTo(-32,-29);ctx.lineTo(-39,-27);ctx.lineTo(-34,-7);ctx.lineTo(-42,0);ctx.lineTo(-34,7);ctx.lineTo(-39,27);ctx.lineTo(-32,29);ctx.lineTo(-16,12);ctx.lineTo(18,12);ctx.closePath();}
   else if(shape===3){ctx.moveTo(31,0);ctx.lineTo(12,-10);ctx.lineTo(2,-35);ctx.lineTo(-8,-16);ctx.lineTo(-34,-24);ctx.lineTo(-24,-4);ctx.lineTo(-39,0);ctx.lineTo(-24,4);ctx.lineTo(-34,24);ctx.lineTo(-8,16);ctx.lineTo(2,35);ctx.lineTo(12,10);ctx.closePath();}
   else if(shape===4){ctx.moveTo(33,0);ctx.lineTo(11,-7);ctx.lineTo(-1,-8);ctx.lineTo(-18,-34);ctx.lineTo(-24,-32);ctx.lineTo(-18,-9);ctx.lineTo(-38,-20);ctx.lineTo(-42,-14);ctx.lineTo(-25,0);ctx.lineTo(-42,14);ctx.lineTo(-38,20);ctx.lineTo(-18,9);ctx.lineTo(-24,32);ctx.lineTo(-18,34);ctx.lineTo(-1,8);ctx.lineTo(11,7);ctx.closePath();}
   else if(shape===5){ctx.moveTo(33,0);ctx.lineTo(12,-6);ctx.lineTo(1,-19);ctx.lineTo(-13,-17);ctx.lineTo(-6,-5);ctx.lineTo(-40,-20);ctx.lineTo(-32,-2);ctx.lineTo(-22,0);ctx.lineTo(-32,2);ctx.lineTo(-40,20);ctx.lineTo(-6,5);ctx.lineTo(-13,17);ctx.lineTo(1,19);ctx.lineTo(12,6);ctx.closePath();}
   else if(shape===6){ctx.moveTo(36,0);ctx.lineTo(15,-8);ctx.lineTo(-8,-9);ctx.lineTo(-38,-28);ctx.lineTo(-40,-19);ctx.lineTo(-19,-3);ctx.lineTo(-28,0);ctx.lineTo(-19,3);ctx.lineTo(-40,19);ctx.lineTo(-38,28);ctx.lineTo(-8,9);ctx.lineTo(15,8);ctx.closePath();}
   else if(shape===7){ctx.moveTo(27,0);ctx.lineTo(10,-12);ctx.lineTo(-18,-13);ctx.lineTo(-27,-28);ctx.lineTo(-35,-24);ctx.lineTo(-31,-6);ctx.lineTo(-43,0);ctx.lineTo(-31,6);ctx.lineTo(-35,24);ctx.lineTo(-27,28);ctx.lineTo(-18,13);ctx.lineTo(10,12);ctx.closePath();}
   else {ctx.moveTo(26,0);ctx.lineTo(12,-8);ctx.lineTo(3,-8);ctx.lineTo(-8,-22);ctx.lineTo(-15,-21);ctx.lineTo(-12,-7);ctx.lineTo(-25,-13);ctx.lineTo(-31,-10);ctx.lineTo(-20,0);ctx.lineTo(-31,10);ctx.lineTo(-25,13);ctx.lineTo(-12,7);ctx.lineTo(-15,21);ctx.lineTo(-8,22);ctx.lineTo(3,8);ctx.lineTo(12,8);ctx.closePath();}
   ctx.fill();ctx.stroke();ctx.fillStyle=accent;ctx.beginPath();ctx.ellipse(7,0,9,4.8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=accent;ctx.fillRect(-25,-13,9,3);ctx.fillRect(-25,10,9,3);
   if(e.bossTier==='giant'||e.bossTier==='final'){
    ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-15,-21);ctx.lineTo(-34,-31);ctx.lineTo(-39,-26);ctx.lineTo(-27,-7);ctx.moveTo(-15,21);ctx.lineTo(-34,31);ctx.lineTo(-39,26);ctx.lineTo(-27,7);ctx.stroke();
    ctx.fillStyle='#ffdc9e';ctx.fillRect(-29,-23,8,4);ctx.fillRect(-29,19,8,4);ctx.fillStyle='#fff3d5';ctx.fillRect(-4,-3,17,6);
   }
   if(e.bossTier==='final'){
    ctx.strokeStyle='#ff7b70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#ff5148';ctx.fillRect(-43,-2,12,4);ctx.fillRect(-43,-11,7,3);ctx.fillRect(-43,8,7,3);
    ctx.strokeStyle='#ffe1c5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(14,-8);ctx.lineTo(38,-20);ctx.lineTo(44,-14);ctx.moveTo(14,8);ctx.lineTo(38,20);ctx.lineTo(44,14);ctx.stroke();
   }
  }else if(e.kind==='shooter'){
   // Chasseur rose : ailes courtes et fuselage lumineux.
   ctx.moveTo(18,0);ctx.lineTo(5,-5);ctx.lineTo(-7,-6);ctx.lineTo(-17,-15);ctx.lineTo(-21,-14);ctx.lineTo(-15,-3);ctx.lineTo(-10,0);ctx.lineTo(-15,3);ctx.lineTo(-21,14);ctx.lineTo(-17,15);ctx.lineTo(-7,6);ctx.lineTo(5,5);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff0f6';ctx.beginPath();ctx.ellipse(3,0,5,2.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffb3ca';ctx.fillRect(-18,-11,5,2);ctx.fillRect(-18,9,5,2);
  }else if(e.kind==='runner'){
   // Chasseur orange rapide : fuselage fin, ailes delta et double moteur.
   ctx.moveTo(23,0);ctx.lineTo(7,-5);ctx.lineTo(-1,-7);ctx.lineTo(-13,-19);ctx.lineTo(-19,-17);ctx.lineTo(-13,-5);ctx.lineTo(-8,0);ctx.lineTo(-13,5);ctx.lineTo(-19,17);ctx.lineTo(-13,19);ctx.lineTo(-1,7);ctx.lineTo(7,5);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff2cf';ctx.beginPath();ctx.ellipse(6,0,5.5,2.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffdf8b';ctx.fillRect(-18,-12,6,3);ctx.fillRect(-18,9,6,3);ctx.fillStyle='#ff6a29';ctx.fillRect(-21,-8,5,3);ctx.fillRect(-21,5,5,3);
  }else{
   // Sentinelle mauve : cristal alien à noyau, pointes et anneau d'énergie.
   ctx.save();ctx.rotate(Math.sin(state.time*2.4+e.x*.01)*.12);
   ctx.moveTo(e.r+5,0);ctx.lineTo(e.r*.52,-e.r*.32);ctx.lineTo(e.r*.18,-e.r*.98);ctx.lineTo(-e.r*.22,-e.r*.66);ctx.lineTo(-e.r,-e.r*.35);ctx.lineTo(-e.r*.72,0);ctx.lineTo(-e.r,e.r*.35);ctx.lineTo(-e.r*.22,e.r*.66);ctx.lineTo(e.r*.18,e.r*.98);ctx.lineTo(e.r*.52,e.r*.32);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#e7d6ffbb';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-e.r*.62,-e.r*.25);ctx.lineTo(-e.r*.12,0);ctx.lineTo(-e.r*.62,e.r*.25);ctx.moveTo(e.r*.18,-e.r*.58);ctx.lineTo(e.r*.55,0);ctx.lineTo(e.r*.18,e.r*.58);ctx.stroke();
   ctx.fillStyle='#f7eaff';ctx.shadowBlur=17;ctx.shadowColor='#e1baff';ctx.beginPath();ctx.ellipse(e.r*.18,0,e.r*.28,e.r*.22,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   ctx.strokeStyle='#e7aaffcc';ctx.lineWidth=1.6;ctx.setLineDash([3,4]);ctx.beginPath();ctx.ellipse(0,0,e.r*1.23,e.r*.72,state.time*.7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }
  ctx.restore();
  if(e.kind==='boss'){
   ctx.save();const bw=e.bossTier==='final'?210:e.bossTier==='giant'?150:72,bh=e.bossTier==='final'?7:5;
   ctx.fillStyle='#ffffff38';ctx.fillRect(e.x-bw/2,e.y-e.r-13,bw,bh);
   ctx.fillStyle=e.bossTier==='final'?'#ff5368':e.bossTier==='giant'?'#ff7a38':'#ffb14f';ctx.fillRect(e.x-bw/2,e.y-e.r-13,bw*Math.max(0,e.hp/e.maxHp),bh);ctx.restore();
  }
 }

 if(state.bossExplosion){const ex=state.bossExplosion;ex.t+=.016;const q=Math.min(1,ex.t/ex.duration),pulse=Math.sin(q*Math.PI);ctx.save();ctx.globalAlpha=(1-q)*.48;const flash=ctx.createRadialGradient(ex.x,ex.y,0,ex.x,ex.y,(ex.t/ex.duration)*(ex.tier==='final'?600:390));flash.addColorStop(0,'#fff9df');flash.addColorStop(.18,'#ffd26e');flash.addColorStop(.48,'#ff7838');flash.addColorStop(1,'#ff4c7800');ctx.fillStyle=flash;ctx.beginPath();ctx.arc(ex.x,ex.y,(ex.t/ex.duration)*(ex.tier==='final'?600:390),0,Math.PI*2);ctx.fill();ctx.globalAlpha=(1-q)*.85;ctx.strokeStyle='#fff0ba';ctx.lineWidth=ex.tier==='final'?8:5;ctx.shadowBlur=30;ctx.shadowColor='#ffbd68';ctx.beginPath();ctx.arc(ex.x,ex.y,(ex.t/ex.duration)*(ex.tier==='final'?500:300),0,Math.PI*2);ctx.stroke();ctx.restore();if(q>=1)state.bossExplosion=null;}
 for(const r of state.shockwaves||[]){ctx.save();ctx.globalAlpha=Math.max(0,r.life/r.maxLife);ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.shadowBlur=18;ctx.shadowColor=r.color;ctx.beginPath();ctx.arc(r.x,r.y,r.radius,0,Math.PI*2);ctx.stroke();ctx.restore()}
 for(let q of state.particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 let p=state.player;if(p){const shipColor=skinColor();if(state.companion){const c=state.companion;ctx.save();ctx.globalAlpha=c.blink>0?.55:.94;ctx.translate(c.x,c.y);ctx.rotate(c.angle);drawDrone(ctx,c.skin||saveData.activeDroneSkin||'drone_scout',c.color||droneSkinColor(),.82,17);ctx.restore();ctx.save();ctx.fillStyle='#07101d';ctx.fillRect(c.x-13,c.y-23,26,3);ctx.fillStyle=c.color||droneSkinColor();ctx.fillRect(c.x-13,c.y-23,26*(c.hp/c.maxHp),3);ctx.restore();}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=state.invuln>0&&Math.floor(state.time*18)%2===0?.38:1;drawShip(ctx,state.playerSkin||saveData.activeSkin,state.playerColor||shipColor,1,24);if(state.boosts.shield>0){ctx.strokeStyle='#ad91ffcc';ctx.lineWidth=2.4;ctx.shadowBlur=20;ctx.shadowColor='#ad91ff';ctx.beginPath();ctx.arc(0,0,28+Math.sin(state.time*8)*2,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0}if(state.dash>0){ctx.fillStyle=shipColor+'99';ctx.beginPath();ctx.moveTo(-13,-5);ctx.lineTo(-29,0);ctx.lineTo(-13,5);ctx.fill()}ctx.restore();
 if(state.remotePlayer&&state.remotePlayer.alive){const rp=state.remotePlayer;ctx.save();ctx.translate(rp.x,rp.y);ctx.rotate(rp.angle||0);ctx.globalAlpha=rp.blink>0?.5:.92;drawShip(ctx,rp.skin||'default',rp.color||'#bd91ff',.92,23);ctx.restore();ctx.save();ctx.fillStyle='#07101d';ctx.fillRect(rp.x-15,rp.y-24,30,3);ctx.fillStyle=rp.color||'#bd91ff';ctx.fillRect(rp.x-15,rp.y-24,30*Math.max(0,rp.hp/rp.maxHp),3);ctx.restore();}
 // Aim reticle
 let m=state.mouse;ctx.strokeStyle='#c7fff7aa';ctx.lineWidth=1;ctx.beginPath();ctx.arc(m.x,m.y,8,0,Math.PI*2);ctx.moveTo(m.x-13,m.y);ctx.lineTo(m.x-5,m.y);ctx.moveTo(m.x+5,m.y);ctx.lineTo(m.x+13,m.y);ctx.moveTo(m.x,m.y-13);ctx.lineTo(m.x,m.y-5);ctx.moveTo(m.x,m.y+5);ctx.lineTo(m.x,m.y+13);ctx.stroke()
 }if(state.nukeFlash>0){ctx.globalAlpha=Math.min(.58,state.nukeFlash*1.25);ctx.fillStyle='#e8ffff';ctx.fillRect(-20,-20,W+40,H+40);ctx.globalAlpha=1;}ctx.restore()}
let raf=0;function loop(now){if(!state.running||state.paused)return;let dt=Math.min(.033,Math.max(0,(now-state.lastTime)/1000));state.lastTime=now;update(dt);if(onlineSession?.role==='guest'&&chosenMode==='multiplayer')applyGuestInterpolation(now);drawArena();sendHostSnapshot(now);raf=requestAnimationFrame(loop)}
function globalFrame(now){if(!state.running){drawAmbient(.016);requestAnimationFrame(globalFrame)}}requestAnimationFrame(globalFrame);
function getPoint(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointermove',e=>{let p=getPoint(e);state.mouse.x=p.x;state.mouse.y=p.y;if(state.player)state.player.angle=Math.atan2(p.y-state.player.y,p.x-state.player.x)});canvas.addEventListener('pointerdown',e=>{if(e.button===0){state.mouse.down=true;let p=getPoint(e);state.mouse.x=p.x;state.mouse.y=p.y;canvas.setPointerCapture?.(e.pointerId)}});addEventListener('pointerup',e=>{if(e.button===0)state.mouse.down=false});
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(state.running&&!state.paused){state.keys[e.code]=true;if(e.code==='KeyN'&&!e.repeat){e.preventDefault();requestNuke();}if(e.code===saveData.keys.pause){e.preventDefault();pauseGame()}}else if(e.code==='Escape'&&state.paused)pauseGame()});addEventListener('keyup',e=>{state.keys[e.code]=false});addEventListener('blur',()=>{state.keys={};state.mouse.down=false;if(state.running&&!state.paused)pauseGame()});
// Touch joystick and action buttons — selectable in Settings (PC / Mobile).
const joystick=$('joystickBase'),knob=$('joystickKnob');function setJoystick(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.34;let dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max;}touchVector={x:dx/max,y:dy/max};knob.style.transform=`translate(${dx}px,${dy}px)`;}
joystick.addEventListener('pointerdown',e=>{if(controlMode!=='mobile')return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture?.(e.pointerId);setJoystick(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)setJoystick(e)});function releaseJoystick(e){if(e.pointerId!==joystickPointer)return;joystickPointer=null;touchVector={x:0,y:0};knob.style.transform='translate(0,0)';}joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);
$('touchFire').addEventListener('pointerdown',e=>{e.preventDefault();touchFiring=true;state.mouse.down=true;$('touchFire').setPointerCapture?.(e.pointerId);});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('touchFire').addEventListener(ev,()=>{touchFiring=false;state.mouse.down=false;}));$('touchDash').addEventListener('pointerdown',e=>{e.preventDefault();touchDash=true;$('touchDash').setPointerCapture?.(e.pointerId);});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('touchDash').addEventListener(ev,()=>touchDash=false));$('touchNuke').addEventListener('pointerdown',e=>{e.preventDefault();requestNuke();});
updateDashboard();updateNukeUI();controlMode=localStorage.getItem('neonOutpostControlMode_v1')||'pc';$('controlMode').value=controlMode;updateTouchControls();
try{const inviteCode=new URL(location.href).searchParams.get('join');if(inviteCode&&/^[A-Z0-9]{6}$/i.test(inviteCode)){$('quickJoinCode').value=inviteCode.toUpperCase();setCoopMode();showPanel('coopPanel');setTimeout(joinQuickRoom,450);}}catch(e){}
})();
