import {SCENE_ROCKS,seabedHeight} from './seabed-landforms.mjs?v=13';
// Shared world geometry anchors and biological motion for WebGL and Canvas.
// Rock dimensions are radii around each mound. Fish only shelter on its sides.
export const REEF_FORMATIONS = [
  {id:'west-talus',x:-7.3,y:-11.3,z:62,sx:4.6,sy:4.3,sz:5.4,height:14},
  {id:'east-shelf',x:17,y:-15,z:52,sx:4.2,sy:2.6,sz:5.5,height:17.5},
  {id:'starboard-rocks',x:20,y:-15,z:24,sx:5,sy:2.9,sz:7.1,height:16.9},
  {id:'west-reef',x:-14,y:-15,z:-11,sx:4.4,sy:3.1,sz:6,height:17.8},
  {id:'south-reef',x:16,y:-15,z:-30,sx:5.7,sy:3.3,sz:6.6,height:17},
];

export function fieldRand(seed) {
  return (min=0,max=1)=>{
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    return min+(max-min)*(seed/4294967296);
  };
}

export const SPECIES=[
  {name:'Silver schooling fish',style:'silver', colors:['#4f8189','#cce0d2','#a0c6bf','#668f91','#7ca6ae'],shape:[1,1,.99]},
  {name:'Patrolling pollock',style:'hull', colors:['#334d53','#6e8d79','#577870','#3d6269','#487470'],shape:[.93,1.45,1.54]},
  {name:'Rockside haddock',style:'reef', colors:['#465b55','#a3b5a3','#6e8791','#687a7a','#75877e'],shape:[.93,1.08,1.04]},
  {name:'Atlantic mackerel',style:'pelagic',colors:['#3c5659','#b7c4b6','#678d87','#597b7a','#586776'],shape:[1,.92,.93]},
  {name:'Atlantic cod',style:'shelf',colors:['#424a42','#9eab91','#6d796a','#637366','#5a5c54'],shape:[1,1.09,1.13]},
  {name:'Golden redfish',style:'rockfish',colors:['#69574a','#a88f7a','#927065','#785e51','#656557'],shape:[.93,1.18,1.15]},
  {name:'Thornback ray',style:'ray',colors:['#48483e','#a39478','#717566','#606658','#565d55'],shape:[1,.30,1.75]},
];
const WAVE=Math.PI*2, GOLDEN=2.3999632297;
// Midwater sardines lead the bow approach; the stronger mackerel school
// passes parallel to the hull, with independent schools on both beams and aft.
// Reduced-motion/diver direction never changes species or asset assignment.
const tracks=[
  {kind:0,n:34,x:3.7,y:-4.6,z:77,r:6.45,dz:3.68,rate:.164,phase:1.45,dy:.68,slip:.096},
  {kind:0,n:33,x:6.8,y:-5.4,z:55,r:6.05,dz:3.33,rate:-.15,phase:1.25,dy:.68,slip:.089},
  {kind:0,n:27,x:13.35,y:-4.65,z:27,r:2.15,dz:6.1,rate:.142,phase:-.85,dy:.72,slip:.10},
  {kind:0,n:20,x:-13.0,y:-5.16,z:10,r:2.1,dz:7.6,rate:.111,phase:-1.9,dy:.68,slip:.115},
  {kind:0,n:24,x:12.4,y:-5.5,z:-35,r:2.18,dz:8.9,rate:-.125,phase:2.0,dy:.60,slip:.11},
  {kind:0,n:23,x:1.2,y:-5.5,z:-60,r:6.3,dz:3.6,rate:.125,phase:2.78,dy:.64,slip:.12},
  {kind:3,n:14,x:-3.2,y:-3.75,z:57,r:6.6,dz:3.2,rate:.205,phase:2.15,dy:.73,slip:.128},
  {kind:3,n:15,x:13.2,y:-3.15,z:7,r:2.6,dz:11.7,rate:-.205,phase:1.51,dy:.55,slip:.108},
  {kind:3,n:14,x:-13.6,y:-3.65,z:30,r:2.8,dz:9.4,rate:.19,phase:-.38,dy:.55,slip:.13},
  {kind:3,n:12,x:-12.5,y:-3.65,z:-36,r:2.4,dz:12.6,rate:-.172,phase:-.15,dy:.45,slip:.12},
  {kind:3,n:10,x:5.1,y:-3.95,z:-62,r:7.2,dz:5.3,rate:.146,phase:1.96,dy:.68,slip:.125},
  {kind:4,n:5,x:10.5,y:-9.2,z:43.6,r:1.4,dz:4.1,rate:-.106,phase:-.12,dy:.32,slip:.205},
  {kind:4,n:5,x:12.6,y:-9.0,z:14,r:1.25,dz:8.3,rate:.084,phase:-1.6,dy:.43,slip:.205},
  {kind:4,n:5,x:-12.5,y:-9.3,z:-17,r:1.43,dz:9.5,rate:-.074,phase:.65,dy:.42,slip:.205},
  {kind:4,n:4,x:2.2,y:-9.35,z:-58,r:4.3,dz:3.8,rate:.091,phase:.22,dy:.36,slip:.245},
  {kind:0,n:22,x:3.2,y:-5.3,z:54.9,r:5.5,dz:2.75,rate:.201,phase:-.6,dy:.47,slip:.109},
  {kind:0,n:18,x:13.4,y:-5.0,z:1.2,r:1.9,dz:8.9,rate:.137,phase:-.7,dy:.68,slip:.110},
  {kind:3,n:16,x:13.9,y:-4.3,z:41.3,r:2.03,dz:6.5,rate:.227,phase:1.95,dy:.55,slip:.114},
  {kind:3,n:14,x:13.1,y:-3.45,z:-18,r:2.22,dz:8.9,rate:-.165,phase:2.1,dy:.56,slip:.10},
  {kind:5,n:7,x:10.4,y:-7.8,z:49.2,r:1.44,dz:4.25,rate:.099,phase:-1.55,dy:.49,slip:.25},
  {kind:5,n:8,x:12.2,y:-7.5,z:22.4,r:1.35,dz:5.5,rate:.088,phase:1.38,dy:.36,slip:.26},
  {kind:5,n:7,x:-12.6,y:-8.3,z:12.2,r:1.56,dz:9.7,rate:-.095,phase:.71,dy:.45,slip:.29},
  {kind:5,n:7,x:-11.3,y:-8.8,z:-35,r:1.45,dz:8.9,rate:-.076,phase:-1.0,dy:.41,slip:.22},
  {kind:5,n:6,x:2.6,y:-9.7,z:-57,r:4.0,dz:3.1,rate:.092,phase:-.6,dy:.41,slip:.23},
  {kind:6,n:1,x:10.8,y:-10.7,z:59.1,r:2.45,dz:6.4,rate:-.102,phase:-.7,dy:.20,slip:0},
  {kind:6,n:1,x:12.0,y:-11.0,z:31.8,r:1.01,dz:8.5,rate:-.075,phase:-.38,dy:.30,slip:0},
  {kind:6,n:1,x:-12.4,y:-11.3,z:-7.3,r:1.1,dz:12.2,rate:.069,phase:1.58,dy:.27,slip:0},
  {kind:6,n:1,x:0.6,y:-11.4,z:-60.3,r:5.5,dz:4.4,rate:.077,phase:1.7,dy:.26,slip:0},
];

export function makeFishPopulation(){
  const rand=fieldRand(5871544),pop=SPECIES.map(()=>[]);
  function addTracks(items){
  for(const track of items){
    const {kind}=track, m=kind===3,cod=kind===4,red=kind===5,ray=kind===6;
    for(let i=0;i<track.n;i++){
      const phi=i*GOLDEN,rad=Math.sqrt((i+.5)/track.n);
      pop[kind].push({kind,track,phase:rand(0,WAVE),slip:rand(-track.slip,track.slip),
        fore:ray?0:rand(cod?-2.4:m?-2.05:-1.87,cod?2.4:m?2.05:1.87),
        side:Math.cos(phi)*rad*rand(.48,cod?1.07:m?.87:1.0),
        down:Math.sin(phi)*rad*rand(.36,cod?.81:m?.76:.69),
        scale:ray?rand(.79,1.02):red?rand(.35,.54):cod?rand(.48,.73):m?rand(.31,.46):rand(.25,.38),tint:rand(.83,1)});
    }
  }
  }
  addTracks(tracks.slice(0,15));
  const hull=[
    {x:6.1,y:-5.54,z:73.0,r:2.10,dz:5.1,rate:.139,phase:.86},
    {x:9.3,y:-5.78,z:36,r:1.22,dz:7.6,rate:.152,phase:1.16},
    {x:10.1,y:-5.07,z:14,r:1.22,dz:11.2,rate:-.105,phase:1.72},
    {x:-10.6,y:-6.54,z:-5.2,r:1.24,dz:13.8,rate:.096,phase:2.86},
    {x:6.5,y:-6.07,z:-53.4,r:2.18,dz:3.6,rate:-.116,phase:1.8},
  ];
  for(const track of hull) pop[1].push({kind:1,track,phase:rand(0,WAVE),scale:rand(.55,.65),tint:rand(.74,.98)});
  for(const feature of REEF_FORMATIONS){
    for(let i=0;i<4;i++) {
      const side=feature.x>0?1:-1;
      pop[2].push({kind:2,feature,phase:rand(0,WAVE),shift:rand(-.45,.64),
        y:feature.y+feature.sy*rand(.88,1.65),z:feature.z+rand(-1.61,1.73),
        x:side*Math.max(10.45,Math.abs(feature.x)-feature.sx*rand(.56,.91)),
        rate:rand(.17,.42)*(i%3?1:-1),r:rand(.73,1.65),dz:rand(.67,1.47),
        scale:rand(.36,.52),tint:rand(.72,1)});
    }
  }
  addTracks(tracks.slice(15));
  return pop;
}

export function fishPose(f,t,reduced,out) {
  if(reduced)t=0;
  const k=f.kind;
  if(k===0||k===3||k===4||k===5||k===6){
    const a=t*f.track.rate+f.track.phase+f.slip;
    const {x,y,z,r,dz,rate,dy}=f.track;
    // Adapted from Abyssal Garden W_ANIM.vsFish: ellipse plus triple-frequency
    // vertical swell, signed tangent, then two shoal offsets in that frame.
    const sn=Math.sin(a),cs=Math.cos(a),ph=f.track.phase*4.8;
    const ups=k===6?1:k===4||k===5?2:3;
    const sy=Math.sin(a*ups+ph),cy=Math.cos(a*ups+ph);
    const ax=-sn*r*rate,az=cs*dz*rate,ay=ups*cy*dy*rate,len=Math.hypot(ax,az),full=Math.hypot(ax,ay,az);
    const hx=ax/len,hz=az/len,ty=ay/full,th=len/full;
    const side=k===6?0:f.side+.23*Math.sin(t*.6+f.phase*8),lift=k===6?0:f.down+.16*Math.cos(t*.5+f.phase*5.5);
    out.x=x+cs*r+hx*(f.fore*th-lift*ty)-hz*side;
    out.y=y+sy*dy+f.fore*ty+th*lift;
    out.z=z+sn*dz+hz*(f.fore*th-lift*ty)+hx*side;
    out.dx=hx;out.dz=hz;out.dy=ay/len;
    out.roll=-(k===6?.115:k===4||k===5?.075:k===3?.23:.15)*Math.sign(rate)+.095*Math.sin(t*1.9+f.phase)+.12*ty;
  }else if(k===1){
    const {x,y,z,r,dz,rate,phase}=f.track;
    const a=t*rate+phase, sn=Math.sin(a),cs=Math.cos(a);
    const ax=-sn*r*rate, az=cs*dz*rate,len=Math.hypot(ax,az);
    out.x=x+cs*r; out.y=y+.45*Math.sin(a*1.7); out.z=z+sn*dz;
    out.dx=ax/len; out.dz=az/len; out.dy=.765*Math.cos(a*1.7)*rate/len;
    out.roll=.035*Math.sin(a*3);
  }else{
    // The quick outward half of the loop is a dart; the return is slower
    // and stays in a small territory rather than following the open-water shoal.
    const p=t*f.rate*.49+f.phase;
    const a=p+.39*Math.sin(p+f.shift), sn=Math.sin(a),cs=Math.cos(a);
    const side=f.feature.x<0 ? 1 : -1;
    const x=f.x+side*f.r*cs,z=f.z+f.dz*sn;
    const ax=-side*f.r*sn*f.rate, az=f.dz*cs*f.rate, len=Math.hypot(ax,az);
    out.x=x;out.y=f.y+.22*Math.sin(a*1.1);out.z=z;
    out.dx=ax/len;out.dz=az/len;out.dy=.16*Math.cos(a*1.1);out.roll=.11*Math.sin(a*1.5);
  }
  if(reduced)out.roll=0;
  return out;
}

// Kelp is limited to the higher hard ridges, not a forest rooted in sand.
// Depth and local relief are checked against each renderer's actual support.
export function kelpPlaces(heightAt){
  const rand=fieldRand(92123),plants=[];
  const clumps=[[-9.5,-8,67,2.0,8.0],[-7.1,-7,60,1.6,9.3],[-11,-8,62,2.3,9.0],
    [-3.8,-8,58,1.5,7.8],[16,-11,53,1.5,6.8],[-19,-11,30,1.1,6.1],
    [28.5,-10,-44,1.7,7.2],[-27,-10,94,1.8,7.1]];
  for(const [cx,cy,cz,r,h] of clumps)for(let j=0;j<6;j++){
    const a=j*GOLDEN+rand(-.23,.23), rr=r*Math.sqrt((j+.2)/6),x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr;
    const y=heightAt?.(x,z)??cy;
    if(!(y>-13.4))continue;
    if(heightAt&&y-Math.min(heightAt(x-2.2,z),heightAt(x+2.2,z),heightAt(x,z-2.2),heightAt(x,z+2.2))<.28)continue;
    plants.push({x,y,z,h:h*rand(.54,1.12),near:true});
  }
  return plants;
}

// Direct adaptations from Noniv's Abyssal Garden (MIT), commit
// a596354eff400d458bc2aeb9bdf5e0a9734b2bcf:
// source/src/shaders.js W_LEAF.sway and W_SPR.vsBub;
// source/src/world.js column's helical stems and localized vent emitter sizing.
export function kelpSway(x,z,h,t,reduced,out){
  const ph=x*.031+z*.017, a=reduced?0:.024*Math.pow(Math.max(h,0),1.25);
  out.x=a*(Math.sin(t*.5+ph+h*.09)+.35*Math.sin(t*1.3+ph*3+h*.3));
  out.z=a*(Math.cos(t*.37+ph*1.3+h*.07)+.35*Math.cos(t*1.1+ph*2+h*.23));
  return out;
}
export function reefVents(surface=25){
  const rand=fieldRand(639017);
  const vents=[[-3,-14.6,78],[11.0,-14.7,65],[18,-12.9,51],[-7.4,-8,60],
    [13.3,-13.9,31],[17.6,-11.8,24],[14.6,-15.6,14],[-12,-13.1,-11],[16,-12.2,-30]];
  const particles=[];
  for(const [x,y,z] of vents)
    for(let i=0;i<16;i++){
      const radius=rand()<.24?rand(.096,.235):rand(.023,.070);
      particles.push({x:x+rand(-.3,.3),y,z:z+rand(-.3,.3),radius,phase:rand(),
        speed:rand(1.1,2.4)*(.6+radius*3),distance:surface-y-.2,wob:rand(.05,.16)});
    }
  return particles;
}
const clamp01=x=>Math.min(Math.max(x,0),1);
const ease=(a,b,x)=>{const v=clamp01((x-a)/(b-a));return v*v*(3-2*v);};
export function bubblePose(b,t,reduced,out){
  if(reduced)t=0;
  const q=t*b.speed/b.distance+b.phase,life=q-Math.floor(q),h=life*b.distance;
  const wob=b.wob*(.3+h*.035);
  out.x=b.x+Math.sin(t*1.7+b.phase*50+h*.6)*wob+Math.sin(h*.13+b.phase*9)*b.wob*2;
  out.y=b.y+h;
  out.z=b.z+Math.cos(t*1.3+b.phase*33+h*.5)*wob+Math.cos(h*.11+b.phase*7)*b.wob*2;
  out.radius=b.radius*(.55+.7*life)*ease(0,.03,life)*ease(0,-1.2,h-b.distance-.2);
  return out;
}
// Beckoning pale/frilled Metridium, overlapping dark mussel valves, and
// irregular low sponges. Major colonies settle on hard shoulders and isolated
// stones, not evenly across sand. NOAA Stellwagen Portland ROV is a visual reference.
export const COLONY_PALETTES=[
  ['#70614d','#bbaa89','#cbc0a2'], // anemone trunk, crown, pale lobes
  ['#252c30','#454b4a','#77735b'], // wet mussel valves and eroded margins
  ['#5e5542','#8c805f','#b0a27b'], // dirty yellow-gray sponge with darker oscula
  ['#5d5750','#9e927b','#bdb49e'], // subdued ivory horn-coral branches and polyps
];
export function benthicColonies(heightAt){
  const rand=fieldRand(671683),all=[];
  const sites=[
    [-3.8,-17,90,.58,2,10],[6.6,-17,87,.53,1,8],[-3.5,-16,81,.63,0,9],
    [8.9,-16,76,.65,2,10],[-1.9,-15,72,.69,1,9],[9.2,-15,67,.66,0,10],
    [-1.65,-13,63,.62,0,12],[-5.4,-10,65,.74,1,12],[-5.3,-9,57,.60,2,9],
    [10.8,-16,53,.63,2,10],[13.8,-15,47,.71,1,10],[13.7,-15,37,.72,0,8],
    [14.2,-14,28,.73,2,11],[15.8,-16,17,.69,1,10],[13.5,-16,6,.67,0,7],
    [-12.2,-16,34,.72,0,7],[-15.7,-16,18,.76,2,9],[-10.6,-16,4,.70,1,10],
    [-12.5,-14,-14,.91,0,10],[12.8,-15,-28,.79,2,11],[11.2,-16,-41,.75,1,10],
    [-10.5,-16,-37,.71,1,9],[-3.5,-16,-57,.81,0,7],
    // The same generated rock footprints are rendered in both paths. New
    // wreck gardens use separated lee-side patches, with open ridges in between.
    ...SCENE_ROCKS.flatMap((r,i)=>{
      if(!r.site.startsWith('wreck-garden'))return [[r.x+.11*r.sx,-15,r.z-.12*r.sz,.63+(i%3)*.11,i%3,9+i%4]];
      const a=r.angle + (i%3)*.34,dx=Math.cos(a)*r.sx*.28,dz=Math.sin(a)*r.sz*.28;
      const bias=i%4,other=(i+1+Math.floor(i/4)%3)%4;
      return [
        [r.x+dx,-15,r.z+dz,.47+(i%3)*.10,bias,10+i%5],
        [r.x-dx*.71,-15,r.z-dz*.71,.37+(i%5)*.061,other,5+i%4],
      ];
    })
  ];
  for(const [clump,[cx,y,cz,r,dominant,count]] of sites.entries()){
    const phase=rand(0,WAVE),stretch=rand(.35,.77);
    for(let i=0;i<count;i++){
      const a=i*GOLDEN+phase+rand(-.3,.3),f=Math.sqrt((i+.4)/count),u=rand(0,WAVE);
      const rx=Math.cos(a)*r*f,rz=Math.sin(a)*r*f*stretch;
      const x=cx+rx*Math.cos(phase)-rz*Math.sin(phase),z=cz+rx*Math.sin(phase)+rz*Math.cos(phase);
      const ground=heightAt?.(x,z)??y;
      const type=rand()<.84?dominant:(dominant+1+Math.floor(rand(0,3)))%4;
      const scale=(type===0?rand(.11,.26):type===1?rand(.081,.155):type===2?rand(.11,.27):rand(.15,.30))*rand(.91,1.08);
      const seed=Math.floor(rand(1,42947)),tone=rand(),tilt=rand(-.14,.22);
      if(heightAt&&(!Number.isFinite(ground)||ground<seabedHeight(x,z)+.20))continue;
      if(type===3 && ground> -8.2)continue; // low-light hard-bottom coral, not the upper kelp ridge
      all.push({x,y:ground,z,type,scale,u,clump,cx,cz,seed,tone,tilt});
    }
  }
  return all;
}

// Tapered, recursive coral skeleton from Abyssal Garden world.js meshCoral.
// Same perturbed heading + recursive branch law, smaller geometry budgets.
export function coralBranches(seed,fan){
  const rand=fieldRand(seed+200+(fan?1:0)), out=[];
  const nrm=v=>{const l=Math.hypot(...v)||1;return v.map(c=>c/l);};
  function branch(p,d,r,len,depth){
    const pts=[p];let q=p;
    for(let i=0;i<3;i++){
      d=nrm([d[0]+rand(-.3,.3),d[1]+rand(-.1,.3),d[2]+(fan?rand(-.05,.05):rand(-.3,.3))]);
      q=q.map((v,k)=>v+d[k]*len/3);pts.push(q);
    }
    if(!depth)pts.push(q.map((v,k)=>v+d[k]*r*1.6));
    out.push({pts,r,depth});
    if(depth>0){
      const count=2+(rand()<.5?1:0);
      for(let i=0;i<count;i++)branch(q,nrm([d[0]+rand(-.8,.8),d[1]+rand(-.1,.5),d[2]+(fan?rand(-.08,.08):rand(-.8,.8))]),r*.78,len*.8,depth-1);
    }
  }
  const count=fan?1:2;
  for(let i=0;i<count;i++)branch([rand(-.08,.08),0,rand(-.08,.08)],
    nrm([rand(-.5,.5),1,fan?0:rand(-.5,.5)]),fan?.06:.08,fan?.56:.45,fan?3:2);
  return out;
}

// Source: Abyssal Garden world.js meshTubes: bent centers grow into lip and dark throat.
export function spongeTubes(seed){
  const rand=fieldRand(seed+210),out=[];
  for(let i=0;i<8;i++){
    const a=rand(0,WAVE),r0=rand(0,.28),h=rand(.45,1.1),rad=rand(.068,.115),lean=rand(.05,.3),pts=[];
    for(let k=0;k<=4;k++){
      const rn=r0+lean*k/4*h;
      pts.push([Math.cos(a)*rn,h*k/4,Math.sin(a)*rn]);
    }
    out.push({pts,r:rad});
  }
  return out;
}

// One small horn-coral colony: asymmetric slender radial sweep and sparse
// forked tips; IMR Norway 2021-39 describes white horn coral below ~30m.
export function coldCoral(seed){
  const r=fieldRand(seed^0xba109), paths=[],h=r(.65,1.04),bend=r(.06,.20);
  paths.push({pts:[[0,-.16,0],[bend*.24,h*.36,0],[bend,h*.72,.03],[bend*1.78,h*1.09,.07]],r:.088});
  for(let j=0;j<5;j++){
    const side=j%2===1?-1:1,y=h*(.24+j*.12),x=bend*(y/h),z=r(-.12,.12),w=side*r(.23,.54)*(1-j*.045),b=r(.28,.51);
    paths.push({pts:[[x,y,0],[x+w*.53,y+b*.45,z*.57],[x+w,y+b,z]],r:r(.036,.059)});
    if(j%3!==1)paths.push({pts:[[x+w*.53,y+b*.45,z*.57],[x+w*.42,y+b*.82,z*.81],[x+w*.62,y+b*1.17,z*.98]],r:r(.025,.037)});
  }
  return paths;
}
