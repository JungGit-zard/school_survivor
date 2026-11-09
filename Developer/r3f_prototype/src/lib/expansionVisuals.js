// Visual-only original art, t_4d0724ac. No HP, damage, speed, scheduling or save data.
// IDs/codes/gear follow Planner/expansion_20261016/content_data.json.
const V = [0, 0, 0]
const part = (name, shape, size, position, color, rotation = V, emissive = .08) => ({ name, shape, size, position, rotation, color, emissive })
const box = (n,s,p,c,r=V) => part(n,'box',s,p,c,r)
const tube = (n,s,p,c,r=V) => part(n,'cylinder',s,p,c,r)
const orb = (n,s,p,c) => part(n,'orb',s,p,c)
const tip = (n,s,p,c,r=V) => part(n,'cone',s,p,c,r)
const ring = (n,s,p,c,r=V) => part(n,'ring',s,p,c,r)
const group = (name, position, children, motion = '', rotation = V) => ({ name,position,rotation,children,motion })
const palettes = {
  // Stage 6 운동장(spec C-4-5): 파란 체육복 + 노란 줄, 좀비 녹색 피부.
  stage6: { coat:'#2F5FA8', trim:'#F2C94C', skin:'#9CC79A', dark:'#24324A', light:'#FFF4D6' },
  stage7: { coat:'#e4e8d3', trim:'#63e5d3', skin:'#a9c879', dark:'#224352', light:'#b8f9f0' },
  stage8: { coat:'#286455', trim:'#e39cae', skin:'#9fd572', dark:'#163d36', light:'#f5dda6' },
  stage9: { coat:'#733d75', trim:'#eec066', skin:'#c5a6c9', dark:'#382141', light:'#f5e8cf' },
  stage10:{ coat:'#3a526b', trim:'#8fd6f2', skin:'#a4baba', dark:'#23344b', light:'#f4edb4' },
}
function book(name, p, c, r=V, s=[.30,.09,.25]) {
  return group(name,p,[box(`${name}-cover`,s,V,c),box(`${name}-pages`,[s[0]*.88,s[1]*.53,s[2]*1.01],[0,0,.008],'#f3dfac')],'',r)
}
function petals(prefix, color, count=6, radius=.37, y=.9) {
  return Array.from({length:count},(_,i)=>{
    const a=i*Math.PI*2/count
    return orb(`${prefix}-${i}`,[.20,.32,.13],[Math.sin(a)*radius,y+Math.cos(a)*radius,-.08],color)
  })
}
function gear(id,p) {
  const {coat:c,trim:t,dark:d,light:l}=p
  switch(id) {
    // Stage 6 운동장 (spec C-4-5). 조회 줄서기 / 국민체조 / 계주 바통.
    case 'E19': return [box('gear-cap',[.56,.10,.50],[0,1.10,0],t),box('gear-cap-brim',[.30,.04,.22],[0,1.07,.30],t),box('gear-nametag',[.22,.12,.03],[-.12,.36,.24],'#FFFFFF')]
    case 'E20': return [box('gear-headband',[.56,.07,.48],[0,.98,0],'#E04B4B'),box('gear-bib',[.36,.30,.03],[0,.30,.24],'#FFFFFF'),box('gear-bib-number',[.14,.16,.02],[0,.30,.26],d)]
    case 'E21': return [tube('gear-baton',[.09,.42,.09],[.47,.02,.22],'#F2C94C',[1.2,0,0]),box('gear-sash',[.10,.75,.05],[0,.30,.23],'#E04B4B',[0,0,.6]),ring('gear-number-band',[.30,.30,.30],[-.35,.45,0],t)]
    case 'E22': return [tube('gear-culture-tank',[.27,.92,.27],[-.31,.58,-.30],t),tube('gear-tank-fluid',[.28,.40,.28],[-.31,.37,-.30],'#398983'),box('gear-tank-rail',[.06,1.01,.06],[-.49,.58,-.30],d),orb('gear-dropletL',[.25,.32,.25],[-.43,.53,0],t),orb('gear-dropletR',[.25,.26,.25],[.43,.53,0],t)]
    case 'E23': return [box('gear-magnet-base',[.97,.20,.25],[0,1.10,-.13],d),box('gear-magnetL',[.23,.54,.25],[-.38,1.32,-.13],t),box('gear-magnetR',[.23,.54,.25],[.38,1.32,-.13],t),box('gear-pole-red',[.24,.16,.26],[-.38,1.65,-.13],'#ed8387'),box('gear-pole-blue',[.24,.16,.26],[.38,1.65,-.13],'#99cfff')]
    case 'E24': return [box('gear-goggles',[.70,.18,.13],[0,.88,.27],t),box('gear-lensL',[.24,.10,.03],[-.18,.89,.35],l),box('gear-lensR',[.24,.10,.03],[.18,.89,.35],l),tip('gear-shoulderL',[.40,.30,.30],[-.46,.53,0],d,[0,0,.5]),tip('gear-shoulderR',[.40,.30,.30],[.46,.53,0],d,[0,0,-.5])]
    case 'E25': return [...petals('gear-hood-petal',t),tube('gear-sprayer',[.10,.70,.10],[.68,.44,.10],d,[0,0,Math.PI/2]),tube('gear-sprayer-nozzle',[.20,.16,.20],[1.01,.44,.10],t,[0,0,Math.PI/2]),tube('gear-spray-pack',[.35,.61,.35],[0,.43,-.35],t)]
    case 'E26': return [tube('gear-planter',[.81,.49,.81],[0,-.20,0],'#b37b58'),tube('gear-planter-rim',[.91,.12,.91],[0,.04,0],'#d59b6e'),...Array.from({length:5},(_,i)=>tube(`gear-vine-${i}`,[.13,.29,.13],[-.58-Math.sin(i*.9)*.18,.51-i*.19,.1],i%2?t:c,[0,0,Math.sin(i)*.6])),orb('gear-vine-bud',[.27,.30,.18],[-.58,-.39,.13],t)]
    case 'E27': return [orb('gear-seedpod',[.75,1.03,.34],[0,.30,-.30],t),box('gear-pod-seam',[.055,.94,.045],[0,.30,-.49],d),tip('gear-pod-tip',[.22,.36,.20],[0,.98,-.28],t),box('gear-folded-kneeL',[.18,.42,.19],[-.24,-.22,.18],t,[.6,0,.55]),box('gear-folded-kneeR',[.18,.42,.19],[.24,-.22,.18],t,[.6,0,-.55])]
    case 'E28': return [box('gear-spotlight-housing',[.77,.64,.65],[0,.88,-.04],d),tube('gear-spotlight-lens',[.51,.13,.51],[0,.88,.34],t,[Math.PI/2,0,0]),tube('gear-lens-core',[.31,.14,.31],[0,.88,.41],l,[Math.PI/2,0,0]),box('gear-stand-arm',[.11,1.02,.11],[.48,.30,0],t),tip('gear-barn-doorL',[.27,.38,.06],[-.42,.88,.33],c,[0,0,-.5]),tip('gear-barn-doorR',[.27,.38,.06],[.42,.88,.33],c,[0,0,.5])]
    case 'E29': return [tube('gear-pleated-skirt',[.96,.38,.70],[0,-.02,0],c),...Array.from({length:6},(_,i)=>box(`gear-ribbon-${i}`,[.11,.33,.07],[.60+Math.sin(i*.9)*.22,.88-i*.23,.10],t,[0,0,Math.cos(i*.9)*.7]))]
    case 'E30': return [tube('gear-drum',[.85,.48,.85],[0,.28,.36],c,[Math.PI/2,0,0]),tube('gear-drum-skin',[.72,.50,.72],[0,.28,.40],l,[Math.PI/2,0,0]),ring('gear-drum-rim',[.86,.86,.86],[0,.28,.67],t),box('gear-drumstickL',[.055,.70,.055],[-.58,.52,.20],t,[0,0,-.3]),box('gear-drumstickR',[.055,.70,.055],[.58,.52,.20],t,[0,0,.3])]
    case 'E31': return [ring('gear-cable-reel',[.76,.76,.76],[-.17,.34,-.32],t),tube('gear-reel-core',[.49,.15,.49],[-.17,.34,-.32],d,[Math.PI/2,0,0]),tip('gear-bolt-crest',[.25,.60,.15],[0,1.27,0],t,[0,0,-.3]),box('gear-insulated-glove',[.29,.29,.28],[.47,.06,.25],t)]
    case 'E32': return [box('gear-vane-shaft',[1.54,.07,.09],[0,.65,-.12],t),tip('gear-vane-arrow',[.40,.43,.12],[.88,.65,-.12],t,[0,0,-Math.PI/2]),tip('gear-vane-tail',[.40,.38,.10],[-.70,.65,-.12],c,[0,0,Math.PI/2]),tip('gear-wingL',[.52,.40,.25],[-.58,.29,-.04],c,[0,0,.7]),tip('gear-wingR',[.52,.40,.25],[.58,.29,-.04],c,[0,0,-.7])]
    case 'E33': return [-1,1].flatMap(side=>[tube(`gear-capacitor-${side}`,[.35,1.20,.35],[side*.38,.54,-.30],d),tube(`gear-terminal-${side}`,[.17,.15,.17],[side*.38,1.22,-.30],t),ring(`gear-cap-band-${side}`,[.39,.39,.39],[side*.38,.43,-.30],t,[Math.PI/2,0,0])])
    // B05 교장 선생님 좀비: 넓은 정장 어깨, 대머리 + 옆머리 + 동그란 안경, 입가의 손마이크.
    case 'B05': return [box('gear-suit',[.80,.66,.46],[0,.27,0],'#4B4F5A'),box('gear-tie',[.08,.34,.03],[0,.30,.25],'#B23A3A'),orb('gear-bald',[.50,.22,.44],[0,1.06,0],p.skin),box('gear-sidehairL',[.08,.16,.30],[-.27,.86,0],'#E6E6E6'),box('gear-sidehairR',[.08,.16,.30],[.27,.86,0],'#E6E6E6'),ring('gear-glassL',[.14,.14,.03],[-.13,.88,.25],'#1C1C1C'),ring('gear-glassR',[.14,.14,.03],[.13,.88,.25],'#1C1C1C'),tube('gear-mic',[.06,.30,.06],[.30,.70,.30],'#2B2B2B'),orb('gear-mic-head',[.12,.12,.12],[.30,.88,.34],'#9AA0A6'),orb('gear-medal',[.10,.10,.03],[-.20,.40,.25],'#E6BA62')]
    case 'B06': return [-1,1].flatMap(side=>[orb(`gear-reactor-${side}`,[.59,.66,.59],[side*.65,.58,-.03],t),ring(`gear-reactor-band-${side}`,[.66,.66,.66],[side*.65,.58,-.03],d),box(`gear-forceps-${side}`,[.11,.91,.12],[side*.85,-.02,.13],d,[0,0,side*-.3]),tip(`gear-claw-${side}`,[.28,.30,.12],[side*.99,-.48,.15],t,[0,0,Math.PI])])
    case 'B07': return [...petals('gear-bud-crown',t,7,.42,1.12),...Array.from({length:3},(_,i)=>tube(`gear-tiered-pot-${i}`,[1.30-i*.25,.27,1.03-i*.14],[0,-.23+i*.24,-.11],i%2?c:'#a86c55')),tip('gear-leaf-staff',[.31,1.5,.30],[-.91,.32,0],t,[0,0,-.15])]
    case 'B08': return [orb('gear-half-mask',[.36,.50,.11],[.18,.91,.30],l),box('gear-mask-eye',[.13,.06,.03],[.20,.96,.37],d,[0,0,-.2]),...Array.from({length:6},(_,i)=>box(`gear-baton-wing-${i}`,[.09,.88,.08],[.64+Math.sin(i*.5)*.22,.53-Math.cos(i*.5)*.20,-.08],t,[0,0,-.4-i*.38])),tip('gear-coattailL',[.52,.65,.25],[-.35,-.09,-.14],c,[0,0,Math.PI+.25]),tip('gear-coattailR',[.52,.65,.25],[.35,-.09,-.14],c,[0,0,Math.PI-.25])]
    case 'B09': return [...[-1,0,1].map((s,i)=>tip(`gear-lightning-crown-${i}`,[.20,.62-Math.abs(s)*.10,.17],[s*.28,1.43,0],t,[0,0,s*-.28])),...[-1,1].map(side=>tip(`gear-bolt-coat-${side}`,[.66,.90,.28],[side*.45,-.02,-.06],d,[0,0,Math.PI+side*.3])),box('gear-generator-staff',[.10,1.8,.10],[.94,.31,.05],t),ring('gear-generator',[.65,.65,.65],[.94,1.24,.05],t),orb('gear-generator-core',[.27,.27,.27],[.94,1.24,.05],l)]
    default:return []
  }
}
const rows = [
 ['E19',17,'조회 줄서기 좀비','stage6'],['E20',18,'국민체조 좀비','stage6'],['E21',19,'계주 바통 좀비','stage6'],
 ['E22',20,'배양액 좀비','stage7'],['E23',21,'자석실험 좀비','stage7'],['E24',22,'보안경돌격 좀비','stage7'],
 ['E25',23,'분무정원 좀비','stage8'],['E26',24,'덩굴견인 좀비','stage8'],['E27',25,'종자도약 좀비','stage8'],
 ['E28',26,'조명기사 좀비','stage9'],['E29',27,'리본무용 좀비','stage9'],['E30',28,'북채행진 좀비','stage9'],
 ['E31',29,'전선수리 좀비','stage10'],['E32',30,'풍향계질주 좀비','stage10'],['E33',31,'축전지운반 좀비','stage10'],
 ['B05',32,'교장 선생님 좀비','stage6'],['B06',33,'융합과학교사','stage7'],['B07',34,'온실관리장','stage8'],['B08',35,'가면지휘자','stage9'],['B09',36,'폭풍교장','stage10'],
]
const RIG_OVERRIDES = {
 E19:{arm:.62,armLRot:[-1.45,0,-.05],armRRot:[-1.45,0,.05]},
 E20:{width:.62,armLRot:[0,0,-1.45],armRRot:[0,0,1.45]},
 E21:{leg:.44,bodyRot:[.25,0,0]},
 B05:{armRRot:[-1.9,0,.3]},
}
function makeRig(id,stageId) {
 const p=palettes[stageId],boss=id[0]==='B'
 const o=RIG_OVERRIDES[id]??{}
 const broad=['E23','E26','E30','E33'].includes(id)||boss
 const width=o.width??(broad?.71:.55)
 const leg=o.leg??(id==='E20'?.40:.51)
 const arm=o.arm??(id==='E19'?.76:.52)
 return [
   group('head',[0,.83,0],[box('head-shell',[.53,.49,.46],V,p.skin),box('eyeL',[.11,.095,.045],[-.13,.045,.242],'#f9d184'),box('eyeR',[.11,.095,.045],[.13,.045,.242],'#f9d184'),box('browL',[.16,.035,.055],[-.13,.12,.25],p.dark,[0,0,-.17]),box('browR',[.16,.035,.055],[.13,.12,.25],p.dark,[0,0,.16]),box('mouth',[.25,.075,.045],[.015,-.14,.247],p.dark),box('tooth',[.055,.065,.05],[-.06,-.14,.275],p.light)],'head'),
   group('body',[0,.27,0],[box('coat',[width,.61,.42],V,p.coat),box('collar',[width*.88,.085,.045],[0,.21,.235],p.trim),box('belt',[width*1.03,.07,.44],[0,-.18,0],p.dark),box('badge',[.095,.13,.04],[-width*.25,.05,.24],p.trim)],'body',o.bodyRot??V),
   group('armL',[-width*.5-.12,.54,0],[box('sleeveL',[.22,arm,.22],[0,-arm*.5,0],p.coat),box('handL',[.22,.19,.23],[0,-arm-.07,.01],p.skin)],'armL',o.armLRot??[-.80,0,-.10]),
   group('armR',[width*.5+.12,.54,0],[box('sleeveR',[.22,o.arm??.52,.22],[0,-(o.arm??.52)*.5,0],p.coat),box('handR',[.22,.19,.23],[0,-(o.arm??.52)-.07,.01],p.skin)],'armR',o.armRRot??[-.90,0,.10]),
   group('legL',[-.16,-.04,0],[box('trouserL',[.23,leg,.27],[0,-leg*.5,0],p.dark),box('shoeL',[.27,.14,.37],[0,-leg-.045,.07],p.dark)],'legL'),
   group('legR',[.16,-.04,0],[box('trouserR',[.23,.51,.27],[0,-.255,0],p.dark),box('shoeR',[.27,.14,.37],[0,-.555,.07],p.dark)],'legR'),
   group('gear',V,gear(id,p),'gear'),
 ]
}
function deepFreeze(value) {if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value)}return value}
export const EXPANSION_VISUALS = deepFreeze(Object.fromEntries(rows.map(([id,typeCode,label,stageId])=>[id,{id,typeCode,label,stageId,studioItemId:`zombie-${id.toLowerCase()}`,boss:id[0]==='B',rig:makeRig(id,stageId)}])))
export const EXPANSION_NORMAL_CODES = Object.freeze(rows.filter(r=>r[0][0]==='E').map(r=>r[1]))
export function isExpansionNormalCode(code) { return Number.isInteger(code)&&code>=17&&code<=31 }
export function getExpansionVisual(id) {return EXPANSION_VISUALS[id]??null}
export const EXPANSION_STAGE_VISUALS = deepFreeze({
 // Stage 6 운동장 최후의 조회(spec C-12). ambient/canvasBackground는 Game.jsx·GameCanvas.jsx가 읽는 야외 배선이다.
 stage6:{theme:'schoolyard',label:'운동장 최후의 조회',...palettes.stage6,floor:'#D8B57A',accent:'#C9673F',spectacleCount:10,canvasBackground:'#7DBF68',ambient:{intensity:.6,color:'#FFF4DC',rimColor:'#FFF0C8'}},
 stage7:{theme:'laboratory',label:'프리즘 과학실',...palettes.stage7,floor:'#49696d',accent:'#65e6d4',spectacleCount:16},
 stage8:{theme:'greenhouse',label:'월광 유리온실',...palettes.stage8,floor:'#3a675c',accent:'#e9a1c7',spectacleCount:20},
 stage9:{theme:'theater',label:'가면 축제극장',...palettes.stage9,floor:'#5c4262',accent:'#f4cc7b',spectacleCount:12},
 stage10:{theme:'rooftop',label:'폭풍 옥상발전소',...palettes.stage10,floor:'#4f6578',accent:'#93ddff',spectacleCount:16},
})
