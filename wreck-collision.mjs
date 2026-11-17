// Shared visual geometry is authoritative: both renderers use the same deck/shell/portal builder.
import {getLinerBlueprint} from './lite-wreck.js?v=10';
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(p,t)=>({x:p.x*t,y:p.y*t,z:p.z*t});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=(a)=>Math.sqrt(dot(a,a));
const clamp=(t)=>Math.max(0,Math.min(1,t));
const solid=new Set(('hullDark hull band boot oxide galv deck teak deckEdge white cream piped soot bronze black window glass rib rust railing wood fabric sole wall plate bed goldLeaf bone mahogany marquetry panelDark panelMint').split(' '));
const solidBars=new Set(['rib','galv','railing','wood','deckEdge','bone','bronze','rust','oxide','piped']);
const min=(p,k)=>Math.min(...p.map(v=>v[k]));
const max=(p,k)=>Math.max(...p.map(v=>v[k]));
const xyz=['x','y','z'], cell=2.5;
const bucketCoord=n=>Math.floor(n/cell);
const key=(i,j,k)=>i+','+j+','+k;
function nearestSegment(p,a,b){
  const s=sub(b,a),l=dot(s,s);
  return l>0?add(a,mul(s,clamp(dot(sub(p,a),s)/l))):a;
}
function nearestTriangle(p,t){
  // Project onto the face plane, then (if outside) select the nearest boundary edge.
  const ap=sub(p,t.a), proj=sub(p,mul(t.n,dot(ap,t.n))), d=sub(proj,t.a);
  const u=dot(d,t.v),v=dot(d,t.w),s=(t.ww*u-t.vw*v)*t.inv,f=(t.vv*v-t.vw*u)*t.inv;
  if(s>=0&&f>=0&&s+f<=1)return proj;
  let best=null,dist=Infinity;
  for(const [a,b] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]]){
    const q=nearestSegment(p,a,b),d=sub(p,q),l=dot(d,d);
    if(l<dist){dist=l;best=q;}
  }
  return best;
}

export function createWreckCollision({radius=.20,surfaceDetail=.65}={}){
  if(!(radius>.04&&radius<.8))throw new RangeError('Wreck collision requires a radius between .04 and .8m');
  const map=new Map(), primitives=[];
  function store(g,p){
    const halo=g.r??0;
    g.min=Object.fromEntries(xyz.map(k=>[k,min(p,k)-halo]));
    g.max=Object.fromEntries(xyz.map(k=>[k,max(p,k)+halo]));
    const i=primitives.length;primitives.push(g);
    for(let a=bucketCoord(g.min.x);a<=bucketCoord(g.max.x);a++)
      for(let b=bucketCoord(g.min.y);b<=bucketCoord(g.max.y);b++)
        for(let c=bucketCoord(g.min.z);c<=bucketCoord(g.max.z);c++){
          const code=key(a,b,c),list=map.get(code);
          if(list)list.push(i);else map.set(code,[i]);
        }
  }
  function tri(a,b,c){
    const v=sub(b,a),w=sub(c,a),raw=cross(v,w),l=norm(raw);
    if(l<.000005)return;
    store({a,b,c,n:mul(raw,1/l),v,w,vv:dot(v,v),ww:dot(w,w),vw:dot(v,w),inv:1/(l*l)},[a,b,c]);
  }
  const {faces,bars}=getLinerBlueprint(surfaceDetail);
  for(const {p,key:k} of faces){
    if(!solid.has(k))continue;
    for(let i=1;i<p.length-1;i++)tri(p[0],p[i],p[i+1]);
  }
  for(const {p,key:k,r} of bars)if(solidBars.has(k)&&(r>=.045||k==='railing')&&r<=.5)store({a:p[0],b:p[1],r},p);
  const stats=Object.freeze({primitives:primitives.length,cells:map.size,radius});
  const marks=new Uint32Array(primitives.length);let stamp=0;
  function select(p,r){
    if(++stamp===0xffffffff){marks.fill(0);stamp=1;}
    const found=[];
    for(let i=bucketCoord(p.x-r);i<=bucketCoord(p.x+r);i++)
      for(let j=bucketCoord(p.y-r);j<=bucketCoord(p.y+r);j++)
        for(let k=bucketCoord(p.z-r);k<=bucketCoord(p.z+r);k++){
          for(const id of map.get(key(i,j,k))??[]){
            if(marks[id]===stamp)continue;marks[id]=stamp;
            const g=primitives[id];
            if(p.x+r<g.min.x||p.x-r>g.max.x||p.y+r<g.min.y||p.y-r>g.max.y||p.z+r<g.min.z||p.z-r>g.max.z)continue;
            found.push(g);
          }
        }
    return found;
  }
  function contact(p,ref,g){
    const q=g.r?nearestSegment(p,g.a,g.b):nearestTriangle(p,g),dv=sub(p,q),l=norm(dv);
    const depth=radius+(g.r??0)-l;
    if(depth<=1e-6)return null;
    const refDv=sub(ref,q),fallback=norm(refDv)>1e-7?mul(refDv,1/norm(refDv)):{x:0,y:1,z:0};
    if(g.n){
      const d0=dot(sub(ref,g.a),g.n),d1=dot(dv,g.n);
      // An already overlapping legacy center may leave by its original side, not
      // teleport through the sheet. Let the true rounded edge remain navigable.
      if(Math.abs(d0)>1e-6&&d0*d1<0&&Math.abs(Math.abs(d1)-l)<1e-6)
        return {depth:radius+l,n:mul(g.n,Math.sign(d0))};
    }
    const n=l>1e-7?mul(dv,1/l):(g.n?mul(g.n,dot(refDv,g.n)<0?-1:1):fallback);
    return {depth,n};
  }
  const overlaps=p=>select(p,radius).some(g=>contact(p,p,g));
  function resolve(from,to){
    const d=sub(to,from),length=norm(d);
    if(!Number.isFinite(length)||!length)return {...from};
    // Travel at most half the ball radius per sub-step, so a two-sided face cannot
    // slip between frames. Closest point contacts naturally slide along its tangent.
    const count=Math.ceil(length/(radius*.43)),delta=mul(d,1/count);let p={...from};
    for(let step=0;step<count;step++){
      let q=add(p,delta);
      for(let pass=0;pass<10;pass++){
        let hit=null;
        for(const g of select(q,radius)){
          const c=contact(q,p,g);
          if(!c)continue;
          if(!hit||c.depth>hit.depth)hit=c;
        }
        if(!hit)break;
        q=add(q,mul(hit.n,hit.depth+1e-5));
      }
      // At acute corners multiple contacts can fight one another; keep a known
      // valid center rather than taking the unresolved result into an enclosure.
      if(!overlaps(q))p=q;
      else if(overlaps(p)){
        // A legacy save might start inside the margin. Only allow decreasing overlap.
        const pen=a=>select(a,radius).reduce((n,g)=>Math.max(n,contact(a,a,g)?.depth??0),0);
        if(pen(q)<pen(p)-1e-6)p=q;
      }
    }
    return p;
  }
  return {resolve,overlaps,stats};
}
