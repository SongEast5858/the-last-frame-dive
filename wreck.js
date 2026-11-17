import * as T from './vendor/three.module.js';
import {getLinerBlueprint, LINER_POINTS, LINER_COLORS} from './lite-wreck.js?v=8';

const metal=new Set(['hull','hullDark','band','boot','galv','rib','deckEdge','railing','bronze','brass','goldLeaf','rust','oxide','soot','piped','black','ironWorn','ironOxide','ironUnderpaint','ironPits','brassTarnish','verdigrisDark']);
const timber=new Set(['wood','teak','fabric','red','plate','mahogany','marquetry','carpet','rugBorder','waterloggedOak','saltWood']);
const pale=new Set(['cream','white','wall','bone','panelMint','paintChip']);
const clear=new Set(['glass','window','crystal','enamelTeal','enamelGold','enamelRuby','enamelIvory','enamelBlue']);
function group(k){return metal.has(k)?'metal':timber.has(k)?'grain':pale.has(k)?'paint':clear.has(k)?'none':'floor';}
function weather(type,bump=false){
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  if(!g)return null;
  // Height and pigment align; independent random bump islands made the older material look painted on.
  let n=206534715+type.length*3777;
  const random=()=>((n=(Math.imul(1664525,n)+1013904223)|0)>>>0)/4294967296;
  const r=(a,b)=>a+(b-a)*random(), st=type==='metal', wood=type==='grain', pt=type==='paint';
  g.fillStyle=bump?'#8f8f8f':pt?'#acb3a4':st?'#939d97':wood?'#9d9480':'#939c88';g.fillRect(0,0,512,512);
  const sw=(p,a)=>'rgba('+p+','+(bump?p:p*.98|0)+','+(bump?p:p*.88|0)+','+a+')';
  const ls=g.createLinearGradient(0,0,0,512);
  ls.addColorStop(0,bump?'#2d2d2d40':'#152d3064');ls.addColorStop(.064,bump?'#d2d2d224':'#c9bb9b58');
  ls.addColorStop(.42,'#67676712');ls.addColorStop(.46,'#1111111b');ls.addColorStop(.47,'#ebebeb24');
  ls.addColorStop(.87,bump?'#25252534':'#b9875d46');ls.addColorStop(1,bump?'#dddddd24':'#263f3a60');
  g.fillStyle=ls;g.fillRect(0,0,512,512);
  for(let i=0;i<15800;i++){
    const x=r(0,512),y=r(0,512),tone=r(22,230)|0,a=r(.014,.22),ww=wood?r(8,57):r(.58,6.9),hh=wood?r(.24,1.22):r(.52,4.2);
    g.fillStyle=sw(tone,a);g.fillRect(x,y,ww,hh);
  }
  for(let i=0;i<115;i++){
    const x=r(-24,530),y=r(-24,530),s=r(3,63),a=random()<.58;
    const m=g.createRadialGradient(x,y,0,x,y,s);
    m.addColorStop(0,bump?'#3030306b':a?'#8353377f':'#345c4985');
    m.addColorStop(.39,bump?'#70707063':a?'#6c513b82':'#47665075');
    m.addColorStop(.83,bump?'#b3b3b34a':a?'#66543632':'#1a38373d');m.addColorStop(1,'#55555500');
    g.fillStyle=m;g.fillRect(x-s,y-s,s*2,s*2);
    const n0=(s/1.9)|0;
    for(let i=0;i<n0;i++){
      const a0=r(-s*.72,s*.76),b0=r(-s*.68,s*.61),S=r(.5,4.8),V=r(.25,3.4);
      g.beginPath();g.ellipse(x+a0,y+b0,S,V,wood?r(-.35,.45):r(0,6.28),0,6.283);
      g.fillStyle=bump?(i%2?'#c4c4c452':'#2e2e2e4f'):a?(i%2?'#d3875059':'#42372b52'):(i%2?'#adc1a454':'#1f483846');g.fill();
    }
    if(st||pt){const h=r(8,115),p=g.createLinearGradient(x,y,x,y+h);p.addColorStop(0,bump?'#1a1a1a57':a?'#69482c74':'#21433884');p.addColorStop(1,'#33333300');g.fillStyle=p;g.fillRect(x-s*.085,y,r(.55,s*.17),h);}
  }
  for(let i=0;i<89;i++){
    const x=r(8,512),y=r(0,512),d=r(5,108);g.strokeStyle=bump?(i%2?'#c7c7c737':'#2b2b2b5c'):(i%2?'#b7bcaa44':'#203b3872');
    g.lineWidth=r(.33,1.65);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+d*.4,y+r(-5,4),x+d,y+r(-10,12));g.stroke();
  }
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;
  if(!bump)t.colorSpace=T.SRGBColorSpace;
  return t;
}

function projectUV(p,ax,scale,off){
  if(ax===0)return [p.z*scale+off,p.y*scale+off*.53];
  if(ax===1)return [p.x*scale+off,p.z*scale-off*.53];
  return [p.x*scale+off,p.y*scale+off*.43];
}
export function buildWreck(scene,{detail=1}={}){
  const root=new T.Group();root.name='SEA MIST / 海雾号 · fictional two-stack ocean liner';scene.add(root);
  const blueprint=getLinerBlueprint(detail), maps={};
  for(const cat of ['metal','grain','paint','floor'])maps[cat]={map:weather(cat),bumpMap:weather(cat,true)};
  const materials=new Map();
  function material(key,vert){
    const mkey=key+':'+vert;
    let m=materials.get(mkey);if(m)return m;
    const code=LINER_COLORS[key]??LINER_COLORS.galv, color=new T.Color(code), cat=group(key), map=maps[cat];
    const isClear=clear.has(key), isLight=key==='light', isEnamel=key.startsWith('enamel'), crystal=key==='crystal', tint=color.clone().multiplyScalar(.135);
    const furrow=cat==='metal'?key==='bronze'||key==='goldLeaf'?.025:.086:cat==='grain'?.040:.058;
    const deposit=/Barnacle|encrust|coralline|Sponge|sponge|Silt|silt|mussel|greenFilm/.test(key);
    m=new T.MeshStandardMaterial({
      color,
      ...(vert&&map?map:{}),
      emissive:(isLight||isEnamel||crystal)?color:tint,
      emissiveIntensity:isLight?.52:isEnamel?.23:crystal?.18:isClear?.12:.15,
      metalness:deposit?.02:key==='goldLeaf'?.26:cat==='metal'?.16:isClear?.21:.04,
      bumpScale:furrow,
      roughness:deposit?.96:crystal?.23:isClear?.40:key==='goldLeaf'?.66:cat==='metal'?.84:.89,
      side:T.DoubleSide,vertexColors:vert
    });
    materials.set(mkey,m);return m;
  }
  const sets=new Map();
  for(const face of blueprint.faces){
    const {key,p,shade,id,grain}=face;let set=sets.get(key);
    if(!set){set={verts:[],cols:[],uvs:[],idx:[]};sets.set(key,set);}
    const a=p[0],b=p[1],c=p[2],x1=b.x-a.x,y1=b.y-a.y,z1=b.z-a.z,x2=c.x-a.x,y2=c.y-a.y,z2=c.z-a.z;
    const X=Math.abs(y1*z2-y2*z1),Y=Math.abs(z1*x2-z2*x1),Z=Math.abs(x1*y2-x2*y1), ax=X>Y&&X>Z?0:Y>=Z?1:2;
    const v0=set.verts.length/3, off=(id*171%979)/979, hue=1+shade*.010;
    const isShell=/^(hull|hullDark|band|boot)$/.test(key);
    const isStain=/Silt|silt|iron|mussel|greenFilm|sponge|encrust/.test(key);
    const scale=key==='teak'||key==='wood'?.54:ax===1?.63:.45;
    for(const q of p){
      const swell=isShell ? (.89+.112*Math.sin(q.z*.167+q.y*.783)+.061*Math.cos(q.z*.61-q.y*2.29)) :
        isStain ?.94+.079*Math.sin(q.y*.89+q.z*.12+q.x*.342) : 1;
      const tone=Math.max(.46,hue*swell);
      set.verts.push(q.x,q.y,q.z);set.cols.push(tone,Math.max(.51,tone+.012),Math.max(.54,tone+.026));
      const uv=grain?projectUV(q,ax,scale,off):projectUV(q,ax,scale*.3,off);set.uvs.push(...uv);
    }
    // Like manufacture sheets, all faces are convex and share material.
    for(let j=1;j<p.length-1;j++)set.idx.push(v0,v0+j,v0+j+1);
  }
  const cuts=new T.Group();cuts.name='Shaped panels and clear breachways';root.add(cuts);
  for(const [k,{verts,cols,uvs,idx}] of sets){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
    const o=new T.Mesh(g,material(k,true));o.name=k;cuts.add(o);
  }
  const rods=new Map(),bG=new T.CylinderGeometry(1,1,1,detail>=1?7:5),yaxis=new T.Vector3(0,1,0);
  const item=new T.Object3D(),up=new T.Vector3(), len=new T.Vector3(),temp=new T.Vector3();
  for(const bar of blueprint.bars){
    const [a,b]=bar.p;let set=rods.get(bar.key);if(!set){set=[];rods.set(bar.key,set);}
    len.set(b.x-a.x,b.y-a.y,b.z-a.z);
    const d=len.length();if(d<.006)continue;
    item.position.set(a.x+len.x*.5,a.y+len.y*.5,a.z+len.z*.5);
    up.copy(len).normalize();item.quaternion.setFromUnitVectors(yaxis,up);
    item.scale.set(bar.r,d,bar.r);item.updateMatrix();set.push(item.matrix.clone());
  }
  const hardware=new T.Group();hardware.name='Funnel caps, davits, rails, riveted fittings';root.add(hardware);
  for(const [key,ar] of rods){
    const m=new T.InstancedMesh(bG,material(key,false),ar.length);m.name=key;
    ar.forEach((t,i)=>m.setMatrixAt(i,t));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();hardware.add(m);
  }
  return {root,points:LINER_POINTS,blueprint};
}
