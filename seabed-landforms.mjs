// Landform and sediment station shared by both renderers.
// The ground is a broad sand channel passing between low, stabilized
// cobble aprons and drowned raised glacial-till blocks, not a uniform reef.
// Spatial layout is an original composition for the fictional SEA MIST.
const sat=t=>Math.max(0,Math.min(1,t));
const mix=(a,b,t)=>a+(b-a)*t;
const fract=n=>n-Math.floor(n);
const s=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
const p=(x,y,z)=>({x,y,z});
const R2=2*Math.PI;

export const SILT_POCKETS=Object.freeze([
  // Capsule approach: distinct field and exposed gap, no rocks on the shot line.
  {id:'west-cobble-apron',x:-8.7,z:82.0,rx:11.1,rz:11.4,heading:-.29,n:115,kind:'mixed'},
  {id:'east-shell-drift',x:16.5,z:65.7,rx:8.4,rz:13.1,heading:.32,n:127,kind:'shell'},
  {id:'starboard-boulder-apron',x:23.5,z:34.3,rx:12.4,rz:11.1,heading:.23,n:130,kind:'mixed'},
  {id:'port-lee-drift',x:-11.9,z:10.5,rx:6.8,rz:15.8,heading:-.28,n:72,kind:'shell'}
].map(Object.freeze));
const rockSets=[
  // (x,z,size-X,size-Z,relief,heading), meters. Irregular crowns rise out
  // of sediment on each side of the generous uninterrupted travel lane.
  [-8.8,79.9,4.42,5.72,4.1,.36],[-11.0,86.1,3.75,4.10,3.03,.21],
  [-5.2,76.7,2.83,3.26,2.24,.49],[-13.4,80.4,2.28,2.45,1.83,-.1],[-6.3,87.0,1.83,2.29,1.55,.79],
  [18.7,71.3,4.55,5.90,3.52,.21],[22.3,67.2,3.56,4.59,2.58,.54],
  [16.9,65.6,2.41,2.96,1.56,-.26],[19.8,78.7,2.09,2.29,1.67,.75],[16.1,75.8,2.44,2.52,1.48,-.39],
  [24.9,36.7,4.36,5.76,3.48,.19],[25.2,31.9,3.58,3.74,2.22,-.19],
  [20.0,39.1,2.91,3.59,2.22,.56],[28.4,39.2,2.18,2.50,1.81,.20],[20.4,33.2,2.16,2.49,1.68,.82],
];
export const SCENE_ROCKS=Object.freeze(rockSets.map(([x,z,sx,sz,relief,angle],i)=>
  Object.freeze({id:'till-block-'+i,x,z,sx,sz,relief,angle,site:SILT_POCKETS[Math.floor(i/5)].id})));
const mulberry=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// Coverage is an elliptical drift with locally scalloped toes and no sharp mask edges.
const rotated=SILT_POCKETS.map(c=>({...c,cs:Math.cos(c.heading),sn:Math.sin(c.heading)}));
function patch(c,x,z){
  const dx=x-c.x,dz=z-c.z;
  if(Math.abs(dx)>c.rx+c.rz*.5||Math.abs(dz)>c.rz+c.rx*.5)return 0;
  const u=(dx*c.cs+dz*c.sn)/c.rx,v=(-dx*c.sn+dz*c.cs)/c.rz;
  const e=u*u+v*v+.12*Math.sin(u*8.1+v*3.7)+.08*Math.cos(v*10.4-u*4.2);
  return 1-s(.17,1.23,e);
}
export function clearSandLane(x,z){
  const path=3.15+4.45*(1-s(52,91,z));
  return (z>=47&&z<=98&&Math.abs(x-path)<3.55)||
    (z>=16&&z<47&&x>8&&x<14)||(x>-13&&x<-4&&z>-19&&z<-9);
}
function maskLane(x,z){
  const path=3.15+4.45*(1-s(52,91,z));
  return 1-(1-s(2.85,5.15,Math.abs(x-path)))*s(43,52,z)*(1-s(92,105,z));
}
export function sedimentMask(x,z){
  let shell=0,rubble=0;
  for(const c of rotated){
    const m=patch(c,x,z),pre=c.kind==='shell'?m:m*.71;
    shell=Math.max(shell,pre);rubble=Math.max(rubble,c.kind==='mixed'?m:m*.47);
  }
  const lane=maskLane(x,z);
  // Quiet current lee under/along the steel shell promotes fine settling.
  const hull=(1-s(8.15,12.8,Math.abs(x)))*s(-47,-29,z)*(1-s(32,43,z));
  const wake=s(.18,.68,.48+.18*Math.sin(z*.23+.56*x)+.14*Math.sin(x*.97-z*.049));
  return {shell:shell*lane,rubble:rubble*lane,lee:hull*(.53+wake*.47)};
}
function h31(x,y,z){x=fract(x*.1031);y=fract(y*.1030);z=fract(z*.0973);
  const d=x*(y+33.33)+y*(z+33.33)+z*(x+33.33);
  return fract((x+y+2*d)*(z+d));
}
function noise(x,y,z){
  const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);
  let u=x-i,v=y-j,w=z-k;u=u*u*(3-2*u);v=v*v*(3-2*v);w=w*w*(3-2*w);
  return mix(mix(mix(h31(i,j,k),h31(i+1,j,k),u),mix(h31(i,j+1,k),h31(i+1,j+1,k),u),v),
    mix(mix(h31(i,j,k+1),h31(i+1,j,k+1),u),mix(h31(i,j+1,k+1),h31(i+1,j+1,k+1),u),v),w);
}
function fbm(x,y,z,n){
  let a=.5,total=0;
  for(let i=0;i<n;i++){total+=a*noise(x,y,z);x=x*2.03+17.1;y=y*2.03+31.7;z=z*2.03+5.3;a*=.5;}
  return total/(1-2*a);
}
// Same domain-warped bathymetry as the prior terrain (ported Abyssal Garden,
// MIT; license in vendor). Tiered apron profiles add depth beside the route,
// never underneath the dry-dock, lower hull or navigable escape.
export function rawSeabedHeight(x,z){
  const u=x+(fbm(x*.04,11,z*.04,3)-.5)*13,v=z+(fbm(x*.04,83,z*.04,3)-.5)*13;
  let y=-17.6+2.64*(fbm(u*.021,3,v*.021,4)-.5)+.85*(fbm(u*.095,9,v*.095,3)-.5);
  y+=s(20,56,Math.abs(x))*.51 - s(.70,.34,Math.abs(noise(u*.066,1.2,v*.036)-.47))*.36;
  // Gently embanked aprons and a broad, modest, current-scoured channel.
  const zRun=s(47,59,z)*(1-s(83,97,z)),center=3.15+4.45*(1-s(52,91,z));
  y-=zRun*(1-s(1.6,4.7,Math.abs(x-center)))*(.26+.10*Math.sin(z*.19));
  for(let i=0;i<3;i++){
    const c=rotated[i],m=patch(c,x,z);
    y+=Math.pow(m,1.4)*(i===0?.78:i===1?.58:.65)*maskLane(x,z);
  }
  const fade=s(-34,-22,z)*(1-s(17,27,z));
  if(fade>0&&Math.abs(x)<=5){
    const lateral=Math.abs(x-(.17*Math.sin(z*.13)+.24*Math.sin(z*.057+1.3)));
    const bank=(1-s(1.35,4.36+.29*Math.cos(z*.24),lateral))*fade;
    const crest=-14.11+.13*Math.sin(z*.33)+.10*Math.cos(z*.61);
    y=mix(y,crest,bank);
  }
  return y;
}
// Matches WebGL's actual indexed PlaneGeometry triangles (including Float32).
export const BED_GRID=Object.freeze({w:196,h:247,nx:176,nz:232,cz:31});
let floorCache;
function bedGrid(){
  if(floorCache)return floorCache;
  const {w,h,nx,nz,cz}=BED_GRID,array=new Float32Array((nx+1)*(nz+1));
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=Math.fround(-w*.5+w*i/nx),z=Math.fround(-h*.5+h*j/nz)+cz;
    array[j*(nx+1)+i]=rawSeabedHeight(x,z);
  }
  floorCache=array;
  return array;
}
export function gridBedHeight(i,j){return bedGrid()[j*(BED_GRID.nx+1)+i];}
export function seabedHeight(x,z){
  const {w,h,nx,nz,cz}=BED_GRID,u=(x+w*.5)*nx/w,v=(z-cz+h*.5)*nz/h;
  const i=Math.floor(u),j=Math.floor(v);
  if(i<0||j<0||i>=nx||j>=nz)return rawSeabedHeight(x,z);
  const ux=u-i,vz=v-j,grid=bedGrid(),o=j*(nx+1)+i;
  const a=grid[o],b=grid[o+nx+1],c=grid[o+nx+2],d=grid[o+1];
  return ux+vz<=1?a+(d-a)*ux+(b-a)*vz:c+(b-c)*(1-ux)+(d-c)*(1-vz);
}

function makeStone(form,index){
  const rand=mulberry(63998963+71231*index),N=11,ring=[],faces=[];
  const centerY=seabedHeight(form.x,form.z),cs=Math.cos(form.angle),sn=Math.sin(form.angle);
  const scales=[1,.89,.66,.34],profile=[0,.28,.65,.92];
  const fracture=Array.from({length:N},()=>.76+rand()*.42);
  for(let j=0;j<scales.length;j++){
    const row=[],s=scales[j];ring.push(row);
    const off=.059*j;
    for(let i=0;i<N;i++){
      const a=(i+.046*Math.sin(i*7+index))*R2/N;
      const u=form.sx*(s*Math.cos(a)*fracture[i]+off),v=form.sz*(s*Math.sin(a)*fracture[i]-off*.41);
      const x=form.x+cs*u-sn*v,z=form.z+sn*u+cs*v;
      const under=seabedHeight(x,z)-.21-.13*rand();
      const y=j===0?under:centerY+form.relief*(profile[j]+(rand()-.5)*(.16+j*.036));
      row.push(p(x,y,z));
    }
  }
  const hub=p(form.x+form.sx*.13,centerY+form.relief*(1+.046*rand()),form.z+.11*form.sz);
  function tri(a,b,c){
    const u=p(b.x-a.x,b.y-a.y,b.z-a.z),v=p(c.x-a.x,c.y-a.y,c.z-a.z);
    const ny=u.z*v.x-u.x*v.z,nx=u.y*v.z-u.z*v.y,nz=u.x*v.y-u.y*v.x,sg=ny>=0?1:-1;
    if(sg<0)[b,c]=[c,b];
    const m=Math.hypot(nx,ny,nz)||1;
    faces.push({a,b,c,x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3,z:(a.z+b.z+c.z)/3,nx:sg*nx/m,ny:sg*ny/m,nz:sg*nz/m});
  }
  for(let j=0;j<ring.length-1;j++)for(let i=0;i<N;i++){
    const k=(i+1)%N,a=ring[j][i],b=ring[j][k],c=ring[j+1][k],d=ring[j+1][i];
    tri(a,b,d);tri(b,c,d);
  }
  for(let i=0;i<N;i++)tri(ring.at(-1)[i],ring.at(-1)[(i+1)%N],hub);
  return {...form,faces,top:hub.y,y:centerY+form.relief*.45,sy:form.relief};
}
let stones;
export function sceneStoneVolumes(){return stones??=(SCENE_ROCKS.map(makeStone));}

let clasts;
export function sharedClasts(){
  if(clasts)return clasts;
  const selected=[],rand=mulberry(4574166);
  for(const c of rotated)for(let k=0;k<c.n;k++){
    const a=rand()*R2,r=Math.pow(rand(),.77);
    const u=c.rx*r*Math.cos(a),v=c.rz*r*Math.sin(a);
    const x=c.x+c.cs*u-c.sn*v,z=c.z+c.sn*u+c.cs*v;
    const probability=patch(c,x,z),nearLane=clearSandLane(x,z);
    if(rand()>.39+.61*probability || (nearLane&&rand()<.92))continue;
    const choose=rand(), shell=choose<(c.kind==='shell'?.68:.35), pale=choose>=.82;
    const size=(shell?.055:.13)+Math.pow(rand(),1.82)*(shell?.24:pale?.57:.44);
    selected.push(Object.freeze({x,z,size:size*(nearLane?.48:1),kind:shell?'shell':pale?'pale':'rough',yaw:rand()*R2,site:c.id}));
  }
  return clasts=Object.freeze(selected);
}
