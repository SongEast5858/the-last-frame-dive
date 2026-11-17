// A single original ship blueprint shared by the WebGL renderer and the portable Canvas renderer.
// x = starboard, +z = bow, up = y. All faces listed here are world-space geometry.
import {addWreckAge,AGE_PALETTE,makeCanvasWearMap,STEEL_KIND,addSillWeather} from './wreck-age.js?v=10';
import {linerHullSection as hull,LINER_STATIONS as stations} from './liner-hull.mjs';
import {seabedHeight} from './seabed-landforms.mjs?v=13';
export const LINER_POINTS=Object.freeze({
  bow:[0,-6.4,48],stern:[0,-6.4,-50],frame:[8.22,-7.4,23],boarding:[8,-4.8,17],
  ballroom:[0,-4.8,4],ballroomDoor:[1.6,-4.8,13],stair:[0,-6,-4.8],
  passage:[0,-8.6,-11],photo:[0,-8.8,-14.8],portExit:[-7.6,-8.5,-14.5],loungeDoor:[2.84,-8.65,-10.95],lounge:[5.10,-8.65,-10.95],forwardPassage:[0,-8.6,0],passengerCabin:[-4.4,-8.65,3.60],crewCabin:[4.35,-8.65,8.82]
});
// Localized structural loss is the exception, not the whole hull silhouette.
export const LINER_DECAY=Object.freeze({
  shell:Object.freeze([
    {sg:1,a:31.12,b:33.87,y:-8.68,w:.161,f:.29},
    {sg:-1,a:-31.63,b:-28.10,y:-9.68,w:.168,f:.55},
    {sg:-1,a:27.58,b:29.67,y:-7.06,w:.143,f:.83},
    {sg:1,a:-23.20,b:-21.05,y:-8.77,w:.122,f:.33},
    {sg:1,a:37.90,b:39.42,y:-10.43,w:.106,f:.92}
  ].map(Object.freeze)),
  rail:Object.freeze([
    {sg: 1,a:26.8,b:30.75,style:'gap'},{sg:1,a:34.65,b:38.55,style:'fold'},
    {sg:-1,a:30.8,b:34.70,style:'fold'},{sg:-1,a:19.2,b:24.38,style:'gap'},
    {sg: 1,a:-37.4,b:-33.48,style:'gap'},{sg:1,a:-26.1,b:-23.55,style:'fold'},
    {sg:-1,a:-35.4,b:-30.38,style:'fold'},{sg:-1,a:-25.82,b:-22.70,style:'gap'}
  ].map(Object.freeze))
});
export const LINER_COLORS={
  hullDark:0x253e48,hull:0x425861,band:0x344e58,boot:0x585347,oxide:0x675342,galv:0x657777,
  deck:0x6e7470,teak:0x85745b,deckEdge:0x929b8d,white:0x98aba6,cream:0xadae94,
  piped:0x9e8076,soot:0x30443f,bronze:0x977d4f,black:0x1c2c32,window:0x0d232b,
  glass:0x284452,rib:0x6d807d,rust:0x775346,railing:0x85948b,wood:0x675747,
  fabric:0x536c64,red:0x73604f,light:0xd6bb83,sole:0x495f60,wall:0x73766b,
  plate:0x776a51,portrait:0x979582,brass:0xab8d5a,bed:0x47686a,coral:0x678370,
  goldLeaf:0xc39f62, bone:0xbec2a4, mahogany:0x76513a, marquetry:0xa38157, cobalt:0x396b88,
  enamelTeal:0x428781, enamelGold:0xcb9c56, enamelRuby:0x90565e, enamelIvory:0xb0b89b, enamelBlue:0x507f99,
  crystal:0xa3cfce, verdigris:0x779974, oxideBloom:0x725b4c, silt:0x68716a, panelDark:0x283c3e,
  panelMint:0x708f83, carpet:0x685a4b, rugBorder:0x9d7a53, ...AGE_PALETTE
};
const P=(x,y,z)=>({x,y,z});
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mixP=(a,b,t)=>P(lerp(a.x,b.x,t),lerp(a.y,b.y,t),lerp(a.z,b.z,t));
const PI2=Math.PI*2;
function buildBlueprint(detail=1){
  const faces=[],bars=[];
  let id=0;
  let seed=1705241991;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)|0)>>>0)/4294967296;
  const R=(a,b)=>lerp(a,b,rand());
  function poly(p,key,shade=0,grain=1,bias=0,inward=false){
    const c=p.reduce((c,e)=>P(c.x+e.x/p.length,c.y+e.y/p.length,c.z+e.z/p.length),P(0,0,0));
    let n=null;
    if(inward){
      const a=p[0],u=P(p[1].x-a.x,p[1].y-a.y,p[1].z-a.z),v=P(p[2].x-a.x,p[2].y-a.y,p[2].z-a.z);
      n=P(u.y*v.z-u.z*v.y,u.z*v.x-u.x*v.z,u.x*v.y-u.y*v.x);
    }
    faces.push({p,key,shade,grain,bias,id:++id,c,n});
  }
  function beam(a,b,key,r=.04,bias=0){
    bars.push({p:[a,b],key,r,bias,id:++id,c:mixP(a,b,.5),shade:4,grain:0});
  }
  function box(x0,x1,y0,y1,z0,z1,c,top=c){
    const a=P(x0,y0,z0),b=P(x1,y0,z0),d=P(x0,y0,z1),e=P(x1,y0,z1),
          ap=P(x0,y1,z0),bp=P(x1,y1,z0),dp=P(x0,y1,z1),ep=P(x1,y1,z1);
    poly([a,b,bp,ap],c,3,1,0,true);poly([d,dp,ep,e],c,-5,1,0,true);
    poly([a,ap,dp,d],c,-4,1,0,true);poly([b,e,ep,bp],c,1,1,0,true);
    poly([ap,bp,ep,dp],top,8,1,0,true);poly([a,d,e,b],c,-18,1,0,true);
  }
  function bulk(z,xa,xb,ya,yb,key,t=.17,sections=1){
    if(xb-xa<=.016||yb-ya<=.016)return;
    for(let i=0;i<sections;i++)box(lerp(xa,xb,(i+.002)/sections),lerp(xa,xb,(i+.998)/sections),ya,yb,z-t*.5,z+t*.5,key);
  }
  function side(x,za,zb,ya,yb,key,t=.17,sections=1){
    if(zb-za<=.016||yb-ya<=.016)return;
    for(let i=0;i<sections;i++)box(x-t*.5,x+t*.5,ya,yb,lerp(za,zb,(i+.002)/sections),lerp(za,zb,(i+.998)/sections),key);
  }
  function floor(xa,xb,za,zb,y,key,segments=3){
    for(let j=0;j<segments;j++){
      const a=lerp(za,zb,j/segments),b=lerp(za,zb,(j+1)/segments);
      poly([P(xa,y,a),P(xb,y,a),P(xb,y,b),P(xa,y,b)],key,(j%2)*4,1);
    }
  }
  function oval(cx,cy,cz,r0,r1,plane,hue,fillKey=null,weight=.039,N=14,bias=0){
    const p=[];
    for(let i=0;i<N;i++){
      const t=PI2*i/N,a=Math.cos(t)*r0,b=Math.sin(t)*r1;
      p.push(plane==='X'?P(cx,cy+a,cz+b):plane==='Y'?P(cx+a,cy,cz+b):P(cx+a,cy+b,cz));
    }
    if(fillKey)poly(p,fillKey,0,0,bias);
    if(hue)for(let i=0;i<N;i++)beam(p[i],p[(i+1)%N],hue,weight,bias+.013);
    return p;
  }
  function taper(x,z,ys,rzs,k,N=18){
    const get=(level,w)=>{
      const u=PI2*w/N,[y,rx,rz,shearX,shearZ]=ys[level];
      return P(x+shearX+Math.cos(u)*rx,y,z+shearZ+Math.sin(u)*rz);
    };
    for(let n=0;n<ys.length-1;n++)for(let j=0;j<N;j++)
      poly([get(n,j),get(n,j+1),get(n+1,j+1),get(n+1,j)],k[n%k.length],(j%3-1)*3,1);
    if(rzs)poly(Array.from({length:N},(_,i)=>get(ys.length-1,i)),rzs,-10,1);
    return get;
  }
  function barframe(top,left,right,z,key='bronze',c=.052){
    beam(P(left,top-.79,z),P(left,top,z),key,c);
    beam(P(left,top,z),P(right,top,z),key,c);
    beam(P(right,top,z),P(right,top-.79,z),key,c);
    beam(P(left,top-.79,z),P(right,top-.79,z),key,c);
  }
  function brokenRim(a,b,c,d,key='rust'){
    for(const [u,v] of [[a,b],[b,c],[c,d]])beam(u,v,key,.071);
  }
  function hx(z,y,sg){
    const [b,d,k]=hull(z),u=clamp((y-k)/(d-k),0,1);
    const blend=u<.42?.12+.83*Math.pow(u/.42,.69):.95+.05*(u-.42)/.58;
    return sg*b*blend;
  }
  function hp(z,y,sg){return P(hx(z,y,sg),y,z);}
  const shellKnots=[0,.116,.245,.447,.590,.746,.892,1],
    lowTeeth=[.046,.70,1.09,.66,.95,.58,.36,.039],
    highTeeth=[.027,.58,.90,.97,.75,.97,.35,.023];
  const shellVector=(c,z)=>{
    const t=clamp((z-c.a)/(c.b-c.a),0,1);
    let i=0;while(i<shellKnots.length-2&&t>shellKnots[i+1])i++;
    const f=(t-shellKnots[i])/(shellKnots[i+1]-shellKnots[i]);
    const d0=Math.sin(i*1.6+c.f*6.28),d1=Math.sin((i+1)*1.6+c.f*6.28);
    const cy=c.y+lerp(d0,d1,f)*.041;
    return [cy-c.w*lerp(lowTeeth[i],lowTeeth[i+1],f),cy+c.w*lerp(highTeeth[i],highTeeth[i+1],f)];
  };
  function obstructedWear(pts){
    return LINER_DECAY.shell.some(c=>{
      // Surface growth may wrap the lip but never bridge empty water.
      if(!pts.some(p=>p.x*c.sg>1&&Math.abs(p.x-hx(p.z,p.y,c.sg))<.23))return false;
      return Math.max(...pts.map(p=>p.z))>=c.a-.064&&Math.min(...pts.map(p=>p.z))<=c.b+.064&&
        Math.max(...pts.map(p=>p.y))>=c.y-c.w-.075&&Math.min(...pts.map(p=>p.y))<=c.y+c.w+.075;
    });
  }
  function tornShell(c,a,b,ta,tb,qa,qb,key,shade){
    const sg=c.sg,[la,ha]=shellVector(c,a),[lb,hb]=shellVector(c,b);
    const A=hp(a,la,sg),B=hp(b,lb,sg),C=hp(b,hb,sg),D=hp(a,ha,sg);
    poly([hp(a,ta,sg),hp(b,tb,sg),B,A],key,shade,1);
    poly([D,C,hp(b,qb,sg),hp(a,qa,sg)],key,shade-1,1);
    const deep=.36+.25*c.f;
    const fold=(p,tip=0)=>P(p.x-sg*(.071+tip),p.y+(tip>.06?.055:-.016),p.z);
    const Ab=fold(A,.04),Bb=fold(B,.02),Cb=fold(C,.10),Db=fold(D,.12);
    // Severed plate thickness on the lips, not a flat painted black shape.
    poly([A,B,Bb,Ab],'galv',-18,1);
    poly([D,Db,Cb,C],'ironWorn',-12,1);
    const off=(v,y)=>P(v.x-sg*deep,v.y+y,v.z);
    // The hole opens onto a real sealed void with an intact offset inner plate.
    // Its aperture is too short vertically for the diver camera; the interior
    // backing is solid even if reached from an unusual angle.
    poly([off(A,-.16),off(B,-.16),off(C,.18),off(D,.18)],'hullDark',-27,1);
    if(Math.sin(a*6.7+c.f*12)>-.35)beam(Ab,Bb,'ironPits',.022,.012);
    if(Math.sin(a*5.1+c.f*13)>.13)beam(Db,Cb,'ironUnderpaint',.020,.01);
    const ribZ=c.a+(c.b-c.a)*(.43+.071*Math.sin(c.f*7));
    if(ribZ>=a&&ribZ<b){
      const [lo,hi]=shellVector(c,ribZ),inside=.17+.12*c.f;
      const x=hx(ribZ,(lo+hi)*.5,sg)-sg*inside;
      beam(P(x,lo-.12,ribZ-.036),P(x-sg*.084,hi+.11,ribZ+.033),'galv',.061);
      beam(P(x-sg*.061,lo-.09,ribZ-.08),P(x-sg*.112,hi+.065,ribZ-.01),'ironWorn',.026);
    }
  }
  function damagedRail(zone,topAt,sg,height=.91,scale=1){
    const {a,b,style}=zone,w=b-a;
    const metalAt=(z,y,d=0)=>{
      const base=topAt(z);
      return P(base.x+sg*d,base.y+y,base.z);
    };
    for(const end of [0,1]){
      const x=end?b:a,along=end?-1:1,y=height*(end?.87:.97),tip=x+along*Math.min(w*.23,end?.70:.59);
      const A=metalAt(x,.038),B=metalAt(x+along*.10,y*.80,end?.086:.139);
      const C=metalAt(x+along*.16,y,end?.12:.21);
      beam(A,B,'galv',.046*scale);beam(B,C,'ironWorn',.038*scale);
      // Remnants stay joined to the nearest bolted shoe. In the gap the middle
      // run has fallen away; neither a floating post nor a full intact line.
      const D=metalAt(tip,y*(style==='gap'?.70:.79),end?.213:.300);
      beam(C,D,'railing',.031*scale);
      beam(metalAt(x,y*.49),metalAt(x+along*.34,y*.39,end?.15:.11),'ironWorn',.019*scale);
      beam(metalAt(x-.08,.048),metalAt(x+.15,.048),'rib',.053*scale);
      if(style==='fold'){
        const m=x+along*w*(end?.50:.36);
        const bend=metalAt(x+along*w*.27,height*.34,end?.38:.27);
        const rest=metalAt(m,height*(end?.105:.20),end?.45:.22);
        beam(D,bend,'ironWorn',.035*scale);beam(bend,rest,'rust',.031*scale);
        if(!end)beam(metalAt(x+along*w*.20,.045),bend,'galv',.036*scale);
      }
    }
  }
  const minXExit=-17,maxXExit=-12;
  const hullY=[-15,-13.61,-12.85,-11.65,-10.78,-10.10,-9.23,-8.17,-7.39,-6.70,-6.40];
  const runs=new Set(stations.map(v=>v[0]));
  for(let z=-50;z<=48;z+=detail>=1?2.63:3.73)runs.add(z);
  for(const z of [-17,-12,13,15,16,18.6,20,21.8,23,25])runs.add(z);
  const railNodes=new Set(runs);
  for(const q of LINER_DECAY.shell)for(const t of shellKnots)runs.add(lerp(q.a,q.b,t));
  for(const q of LINER_DECAY.rail){runs.add(q.a);runs.add(q.b);}
  const zz=[...runs].sort((a,b)=>a-b);
  // Bow, rounded stern and near-full length rolled shell plates. Cut a true six-sided opening on the port side.
  for(const sg of [-1,1])for(let j=0;j<zz.length-1;j++){
    const a=zz[j],b=zz[j+1],mid=(a+b)*.5;
    const [,ya,ka]=hull(a),[,yb,kb]=hull(b);
    const gap=sg<0&&mid>minXExit&&mid<maxXExit;
    for(let i=0;i<hullY.length-1;i++){
      let y=hullY[i],yp=hullY[i+1];
      if(y>Math.max(ya,yb)+.005||yp<Math.min(ka,kb)-.005)continue;
      if(gap&&y>=-10.1&&yp<=-6.70)continue;
      const mayTear=sg>0&&mid<-25&&mid>-31&&y>-9.24&&yp<-6.5&&railNodes.has(a)&&((j+i)%3===0);
      if(mayTear){
        const ta=clamp(y,ka,ya),tb=clamp(y,kb,yb),qa=clamp(y+.23,ka,ya),qb=clamp(y+.08,kb,yb);
        poly([hp(a,ta,sg),hp(b,tb,sg),hp(b,qb,sg),hp(a,qa,sg)],'oxide',-4);
        beam(hp(a,qa,sg),hp(b,qb,sg),'rust',.053);
        // Bent plating is visibly recessed, but unlike the real port breach
        // it still has a structural backing and isn't an entrance to an empty hull.
        const A=hp(a,qa,sg),B=hp(b,qb,sg),C=hp(b,clamp(yp,kb,yb),sg),D=hp(a,clamp(yp,ka,ya),sg);
        poly([A,B,P(C.x-.13*sg,C.y,C.z),P(D.x-.18*sg,D.y,D.z)],'hullDark',-13,1);
        continue;
      }
      const ta=clamp(y,ka,ya),tb=clamp(y,kb,yb),qa=clamp(yp,ka,ya),qb=clamp(yp,kb,yb);
      if(Math.max(qa-ta,qb-tb)<.002)continue;
      const key=yp<-12?'hullDark':yp<-10.78?'boot':yp> -7.4?'band':'hull';
      const tear=LINER_DECAY.shell.find(c=>c.sg===sg&&mid>c.a&&mid<c.b&&c.y>y+.20&&c.y<yp-.15);
      if(tear)tornShell(tear,a,b,ta,tb,qa,qb,key,(j%3-1)*3+(sg>0?2:-2));
      else poly([hp(a,ta,sg),hp(b,tb,sg),hp(b,qb,sg),hp(a,qa,sg)],key,(j%3-1)*3+(sg>0?2:-2),1);
      if(i>2&&i<10&&Math.max(qa-ta,qb-tb)>.10){
        const L=hp(a,qa,sg),R0=hp(b,qb,sg),offset=.017*sg;L.x+=offset;R0.x+=offset;
        if(i===7||i===9||j%3===0)beam(L,R0,i===9?'deckEdge':'rib',i===9?.036:.016,.006);
      }
    }
    // Open aft/fore rails; starboard access at z=17 has no struts or rail in the lane.
    const deckBreak=sg>0&&mid>14.8&&mid<21.85;
    if(!deckBreak&&!gap){
      const rail=LINER_DECAY.rail.find(q=>q.sg===sg&&mid>q.a&&mid<q.b);
      if(rail){
        if(Math.abs(a-rail.a)<1e-6)damagedRail(rail,(z)=>P(hx(z,hull(z)[1],sg)-sg*.12,hull(z)[1],z),sg);
      }else{
        const A=hp(a,ya,sg),B=hp(b,yb,sg),d=sg*.12;
        const ap=P(A.x-d,A.y+.91,A.z),bp=P(B.x-d,B.y+.91,B.z);
        beam(ap,bp,'railing',.049);beam(P(ap.x,A.y+.48,ap.z),P(bp.x,B.y+.48,bp.z),'rust',.023);
        if(railNodes.has(a))beam(P(A.x-d,A.y,A.z),ap,'railing',.050);
      }
    }
    // Two rows of lower-deck portholes, inset glazing and dark rim.
    if(Math.abs(mid)<37&&!gap&&j%2===0&&!(sg>0&&mid>21&&mid<24.5)){
      for(const [k,y] of [[0,-7.75],[1,-9.25],[2,-10.58]]){
        const x=hx(mid,y,sg)+sg*.033;
        if(k===2&&(Math.abs(mid)>31||j%4!==0))continue;
        const rr=k===2?.165:.255;
        if(obstructedWear([P(x,y-rr,mid-rr),P(x,y+rr,mid+rr)]))continue;
        oval(x,y,mid,k===2?.157:.225,rr,'X',k?'bronze':'galv','window',.026,detail>=1?11:7,.012);
        if(k<2)addSillWeather({P,poly,hx},sg,y,mid,rr,j*3+k);
        if(k===0&&j%4===0)oval(x+sg*.015,y+.004,mid,.155,.176,'X','oxide',null,.015,8,.016);
      }
    }
  }
  // Both curved shell halves ended at a nonzero keel breadth; bridge
  // those lips with solid bottom plates instead of leaving a 2 m camera slot.
  for(let i=0;i<zz.length-1;i++){
    const a=zz[i],b=zz[i+1],ka=hull(a)[2],kb=hull(b)[2];
    const centerA=P(0,ka-.035,a), centerB=P(0,kb-.035,b);
    for(const sg of [-1,1]){
      poly([hp(a,ka,sg),hp(b,kb,sg),centerB,centerA],'hullDark',-9+(i%4),1);
    }
  }
  for(const z of [zz[0],zz.at(-1)]){
    const [,t,k]=hull(z), levels=[k,...hullY.filter(y=>y>k&&y<t),t];
    for(let i=0;i<levels.length-1;i++){
      const a=levels[i],b=levels[i+1];
      poly([hp(z,a,-1),hp(z,a,1),hp(z,b,1),hp(z,b,-1)],'hullDark',-8,1);
    }
    poly([hp(z,k,-1),P(0,k-.035,z),hp(z,k,1)],'hullDark',-9,1);
  }
  // Bent torn steel edges and laid-bare edge framing; no decorative model fills the opening.
  for(const z of [minXExit,maxXExit]){
    const p=[[-10.38,.04],[-10.10,-.13],[-9.40,-.24],[-8.61,-.06],[-7.73,-.24],[-6.64,.04]];
    for(let k=0;k<p.length-1;k++){
      const [y,d]=p[k],[Y,D]=p[k+1],direction=z===minXExit?-1:1;
      beam(P(hx(z,y,-1)-.036,y,z+Math.abs(d)*direction),P(hx(z,Y,-1)-.036,Y,z+Math.abs(D)*direction),k%2?'rim' in LINER_COLORS?'rim':'galv':'oxide',.105);
    }
  }
  beam(hp(minXExit,-10.19,-1),hp(maxXExit,-10.19,-1),'oxide',.094);
  beam(hp(minXExit,-6.62,-1),hp(maxXExit,-6.62,-1),'rim' in LINER_COLORS?'rim':'galv',.071);
  for(let t=0;t<8;t++){
    const z=-18.9+t*.575;
    if(z>minXExit-.3&&z<maxXExit+.25)continue;
    beam(hp(z,-13.58,-1),hp(z,-6.55,-1),'rib',.125);
  }

  // Main deck flooring follows the actual bow and stern widths. Leave a walkable shaft and separate gallery roof.
  const deckZ=[...new Set([...zz,-16.55,-12.47,-8,-1.65])].sort((a,b)=>a-b), laneX=[-8.2,-7,-5.67,-4.35,-3.08,-2.25,-1.15,0,1.15,2.25,3.08,4.35,5.67,7,8.2];
  for(let i=0;i<deckZ.length-1;i++){
    const a=deckZ[i],b=deckZ[i+1],mid=(a+b)*.5,[wa,ya]=hull(a),[wb,yb]=hull(b);
    const opening=mid>-8&&mid<-1.65, memorial=mid>-16.55&&mid<-12.47;
    for(let n=0;n<laneX.length-1;n++){
      const l=laneX[n],r=laneX[n+1],quad=[P(clamp(l,-wa,wa),ya,a),P(clamp(r,-wa,wa),ya,a),P(clamp(r,-wb,wb),yb,b),P(clamp(l,-wb,wb),yb,b)];
      if((opening||memorial)&&l>=-3.08&&r<=3.08)continue;
      if(quad[1].x-quad[0].x<.004&&quad[2].x-quad[3].x<.004)continue;
      if((i+n)%9===3&&Math.abs(l)>5.5&&mid>-22&&mid<-17){poly(quad,'deck',-12,1);continue;}
      poly(quad,Math.abs(mid)<20?'teak':'deck',(i%5-2)*2+(n%3-1)*2,1);
      if((i+n)%3===1&&Math.abs(mid)<35)beam(quad[0],quad[3],'wood',.014,.01);
    }
  }
  // Double-curving grand stair and upstairs gallery, with intact open water through the center.
  const grandLo=-10.25,grandHi=-6.4, stairFront=-1.40, stairAft=-7.98;
  for(const sg of [-1,1]){
    const xInner=sg*3.08,xOuter=sg*4.63,x1=Math.min(xInner,xOuter),x2=Math.max(xInner,xOuter);
    floor(x1,x2,-8.11,-1.45,-3.06,'teak',5);
    beam(P(xInner,-3.06,-8.14),P(xInner,-3.06,-1.42),'marquetry',.094);
    for(let j=0;j<7;j++){
      const z=-8.05+j*1.04;
      if(j!==4||sg>0){
        beam(P(xInner,-3.10,z),P(xInner,-2.25,z),'goldLeaf',.041);
        beam(P(xInner,-3.05,z+.37),P(xInner,-2.28,z+.17),'bronze',.025);
      }
      if(j!==0&&j!==4){
        beam(P(xInner,-2.24,z-1.04),P(xInner,-2.225,z),'goldLeaf',.044);
        beam(P(xInner,-2.61,z-1.04),P(xInner,-2.61,z),'bronze',.027);
      }
    }
    for(const z of [-7.91,-5.36,-2.17]){
      const x=sg*3.47;
      box(x-.23,x+.23,grandLo,grandLo+.21,z-.23,z+.23,'panelMint','bone');
      taper(x,z,[[grandLo+.20,.16,.16,0,0],[grandLo+.55,.135,.135,0,0],[-2.73,.11,.11,0,0],[-2.41,.23,.23,0,0]],'goldLeaf',['marquetry','cream','bronze'],10);
      for(const y of [-8.33,-6.42,-3.22]){
        box(x-.21,x+.21,y-.078,y+.075,z-.21,z+.21,'bronze','goldLeaf');
      }
    }
    // Broken inlaid hand rail follows the original curved staircase. Leave the center entirely open.
    let old=null,oldOuter=null;
    for(let i=0;i<12;i++){
      const u=i/11,z=-1.93-u*5.75,y=-6.43-u*3.62;
      const center=sg*(2.00+Math.sin(u*Math.PI*.84)*.55), min=Math.min(center-.54,center+.54),max=Math.max(center-.54,center+.54);
      const inside=P(center-sg*.60,y+.78,z+.11),outside=P(center+sg*.58,y+.83,z+.09);
      if(!(sg>0&&i===8||sg<0&&i===4)){
        box(min,max,y-.085,y,z-.25,z+.262,i%4?'mahogany':'marquetry','bone');
        beam(P(min,y+.026,z+.254),P(max,y+.026,z+.254),i%3?'goldLeaf':'bronze',.029);
      }
      if(i%2===0){
        beam(P(inside.x,y-.02,inside.z),inside,'bronze',.039);
        beam(P(outside.x,y, outside.z),outside,'goldLeaf',.041);
      }
      if(i!==4&&i!==8&&old){beam(old,inside,'goldLeaf',.046);beam(oldOuter,outside,'bronze',.052);}
      old=inside;oldOuter=outside;
    }
    const guardX=sg*3.12;
    for(let j=0;j<4;j++){
      const z=-7.62+j*1.69,x=sg*(3.39+j*.038),high=-6.46+R(-.05,.40);
      if(j!==2){
        const a=P(guardX,-10.19,z-.23),b=P(x,-10.18,z+.85);
        const A=P(guardX,high-.72,z-.18),B=P(x,high+.019,z+.83);
        poly([a,b,B,A],j%2?'mahogany':'panelDark',-9,1);
        beam(A,B,'verdigris',.042);
      }else{
        const B=P(x+.12*sg,-6.86,z+.81);
        beam(P(guardX,-10.15,z-.12),B,'rust',.054);
      }
    }
    for(const z of [-7.84,-5.57,-3.52,-1.70]){
      beam(P(guardX,-6.38,z),P(guardX,-5.53,z),'bronze',.058);
      beam(P(guardX,-5.55,z-1.72),P(guardX,-5.53,z),'goldLeaf',.047);
    }
  }
  // The open shaft is bounded by real deck structure, not one-sided floor planes.
  // The grand stair's lower landing leads into a cabin wing, through a genuine open bulkhead.
  bulk(-1.48,-3.62,-1.57,-10.34,-6.40,'wall',.18);
  bulk(-1.48,1.57,3.62,-10.34,-6.40,'wall',.18);
  bulk(-1.48,-1.57,1.57,-6.92,-6.40,'rib',.18);
  box(-3.63,3.63,-10.43,-10.265,-8.11,-1.29,'hull');
  for(const sg of [-1,1]){
    const x=sg*3.50;
    side(x,-8.05,-1.48,-10.33,-6.40,'wall',.22,4);
    side(x,-8.05,-1.48,-10.31,-9.67,'wood',.29,4);
    box(Math.min(sg*3.08,sg*3.69),Math.max(sg*3.08,sg*3.69),-6.62,-6.415,-8.02,-1.64,'rib');
    beam(P(sg*3.45,-9.65,-8.02),P(sg*3.45,-9.65,-1.61),'bronze',.047);
    for(const z of [-7.84,-6.35,-4.88,-3.40,-1.82]){
      beam(P(sg*3.44,-10.25,z),P(sg*3.44,-6.55,z),'rib',.064);
      beam(P(sg*3.45,-6.67,z),P(sg*3.20,-6.65,z),'rib',.078);
    }
  }
  for(const x of [-2.76,-1.69,1.69,2.76]){
    beam(P(x,-10.24,-1.65),P(x,-6.57,-1.65),'rib',.057);
  }
  beam(P(-3.52,-6.66,-1.66),P(3.52,-6.66,-1.66),'galv',.091);
  // Worn mosaic tile and runner at the bottom of the atrium joins both wall and corridor floors.
  floor(-3.53,3.53,-8.024,-1.63,grandLo,'panelMint',5);
  floor(-.74,.74,-7.98,-1.72,grandLo+.012,'carpet',5);
  for(const shift of [-1,1])beam(P(shift*.73,-10.225,-7.95),P(shift*.73,-10.225,-1.83),'rugBorder',.023);
  // Berthing deck. Paneled passenger cabin on port; practical steward's cabin on starboard.
  // All cuts have a threshold, jambs and header, not a decal or a hidden wall.
  const wingLo=-10.25,wingHi=-6.61,wingFore=11.9;
  function wingDeck(xa,xb,za,zb,key){
    box(xa,xb,wingLo-.19,wingLo-.019,za,zb,'hull');
    floor(xa,xb,za,zb,wingLo,key,Math.ceil((zb-za)/1.62));
    box(xa,xb,wingHi,-6.403,za,zb,'galv');
  }
  wingDeck(-1.925,1.925,-1.63,wingFore,'sole');
  wingDeck(-6.34,-1.925,1.0,6.3,'teak');
  wingDeck(1.925,6.34,5.55,wingFore,'sole');
  function cabinPortal(x,a,b){
    side(x,a,b,-7.08,wingHi,'rib',.18);
    for(const z of [a-.047,b+.047])beam(P(x,wingLo,z),P(x,-7.04,z),'bronze',.047);
    beam(P(x,-7.05,a),P(x,-7.05,b),'bronze',.046);
    box(x-.16,x+.16,wingLo+.005,wingLo+.034,a,b,'deckEdge');
  }
  function wingWall(x,a,b,ribs){
    side(x,a,b,wingLo,wingHi,'wall',.18);
    const toward=x>0?-1:1;
    if(ribs)for(const y of [-10.12,-9.43,-6.88])beam(P(x+toward*.097,y,a),P(x+toward*.097,y,b),y===-9.43?'mahogany':'rib',.038);
  }
  wingWall(-1.85,-1.48,2.65,true); wingWall(-1.85,4.55,wingFore,true); cabinPortal(-1.85,2.65,4.55);
  wingWall(1.85,-1.48,7.85,true); wingWall(1.85,9.80,wingFore,true); cabinPortal(1.85,7.85,9.80);
  wingWall(-6.25,1.0,6.30,false); wingWall(6.25,5.55,wingFore,false);
  bulk(1.0,-6.25,-1.85,wingLo,wingHi,'wall',.18);
  bulk(6.30,-6.25,-1.85,wingLo,wingHi,'wall',.18);
  bulk(5.55,1.85,6.25,wingLo,wingHi,'wall',.18);
  bulk(wingFore,-1.85,6.25,wingLo,wingHi,'wall',.18);
  for(const x of [-1.61,1.61])beam(P(x,wingLo,-1.575),P(x,-6.92,-1.575),'bronze',.046);
  beam(P(-1.61,-6.88,-1.60),P(1.61,-6.88,-1.60),'bronze',.042);
  // Small enamel signage. Real raised, unlit strokes are shared by the 3D and Canvas views.
  const glyph={
    A:[[0,0,1,2],[1,2,2,0],[.45,.9,1.55,.9]],B:[[0,0,0,2],[0,2,1.5,2],[1.5,2,2,1.5],[2,1.5,1.5,1],[1.5,1,0,1],[1.5,1,2,.5],[2,.5,1.5,0],[1.5,0,0,0]],
    C:[[2,2,.4,2],[.4,2,0,1.6],[0,1.6,0,.4],[0,.4,.4,0],[.4,0,2,0]],D:[[0,0,0,2],[0,2,1.4,2],[1.4,2,2,1.5],[2,1.5,2,.5],[2,.5,1.4,0],[1.4,0,0,0]],
    E:[[2,2,0,2],[0,2,0,0],[0,1,1.65,1],[0,0,2,0]],I:[[.25,2,1.75,2],[1,2,1,0],[.25,0,1.75,0]],
    K:[[0,0,0,2],[0,1,2,2],[0,1,2,0]],L:[[0,2,0,0],[0,0,2,0]],
    M:[[0,0,0,2],[0,2,1,.9],[1,.9,2,2],[2,2,2,0]],N:[[0,0,0,2],[0,2,2,0],[2,0,2,2]],
    O:[[0,0,0,2],[0,2,2,2],[2,2,2,0],[2,0,0,0]],P:[[0,0,0,2],[0,2,2,2],[2,2,2,1],[2,1,0,1]],
    R:[[0,0,0,2],[0,2,2,2],[2,2,2,1],[2,1,0,1],[.75,1,2,0]],S:[[2,2,0,2],[0,2,0,1],[0,1,2,1],[2,1,2,0],[2,0,0,0]],
    T:[[0,2,2,2],[1,2,1,0]],W:[[0,2,.4,0],[.4,0,1,1],[1,1,1.6,0],[1.6,0,2,2]]
  };
  function enamelLabel(str,x,y,z,ux,uz,scale){
    const ww=(str.length*2.75-.75)*scale*.5+.066;
    const h=.08+scale,ax=x-ux*ww,bx=x+ux*ww,az=z-uz*ww,bz=z+uz*ww;
    if(ux)box(Math.min(ax,bx),Math.max(ax,bx),y-h,y+h,z-.019,z+.019,'panelDark');
    else box(x-.019,x+.019,y-h,y+h,Math.min(az,bz),Math.max(az,bz),'panelDark');
    const nx=-uz*.026,nz=ux*.026;
    [...str].forEach((ch,i)=>{
      for(const [a,b,c,d] of glyph[ch]??[]){
        const j=(i*2.75-(str.length*2.75-.75)*.5);
        beam(P(x+nx+ux*(a+j)*scale,y+(b-1)*scale,z+nz+uz*(a+j)*scale),
          P(x+nx+ux*(c+j)*scale,y+(d-1)*scale,z+nz+uz*(c+j)*scale),'bone',.012);
      }
    });
  }
  enamelLabel('LOWER DECK',0,-6.72,-1.593,-1,0,.073);
  enamelLabel('MEMORIAL',0,-6.72,-1.365,1,0,.074);
  enamelLabel('PASSENGER',-1.737,-6.875,3.60,0,-1,.061);
  enamelLabel('CREW',1.737,-6.875,8.825,0,1,.072);
  // Ceiling beams and original conduit; fittings stay tucked against walls above the swim corridor.
  for(let j=0;j<7;j++){
    const z=-.57+j*1.85;
    beam(P(-1.79,-6.71,z),P(1.79,-6.71,z),'rib',.071);
    for(const x of [-1.71,1.70])beam(P(x,-7.05,z),P(x,-6.73,z),'rib',.049);
    if(j%2===0){
      box(-1.65,-1.48,-6.90,-6.74,z-.26,z+.28,'rust');
      box(-1.61,-1.53,-6.926,-6.90,z-.19,z+.17,'bone');
    }
  }
  beam(P(1.52,-6.83,-1.41),P(1.54,-6.82,11.72),'piped',.030);
  beam(P(1.67,-6.82,-1.41),P(1.66,-6.82,11.72),'verdigris',.022);
  // Port cabin: sprung berth, vanity, ruptured interior paneling and a tipped suitcase.
  side(-6.127,1.16,6.12,-10.18,-8.94,'mahogany',.065,3);
  for(const z of [1.8,2.7,3.6,4.5,5.4])beam(P(-6.071,-10.19,z),P(-6.071,-8.93,z),'marquetry',.021);
  box(-5.99,-4.94,-9.99,-9.71,1.25,3.27,'wood','fabric');
  box(-5.93,-5.02,-9.71,-9.58,1.32,3.18,'fabric','bone');
  box(-5.99,-4.92,-9.72,-9.08,1.25,1.38,'mahogany');
  for(const x of [-5.9,-5.01])for(const z of [1.39,3.11])beam(P(x,-10.25,z),P(x,-9.97,z),'wood',.032);
  box(-5.98,-5.43,-10.21,-9.50,4.43,5.94,'mahogany','wood');
  for(const z of [4.68,5.24,5.70])beam(P(-5.403,-9.73,z-.13),P(-5.403,-9.73,z+.12),'bronze',.031);
  oval(-6.11,-8.76,5.17,.52,.61,'X','bronze','glass',.034,16);
  beam(P(-6.072,-8.37,4.89),P(-6.072,-9.01,5.56),'bone',.018);
  box(-3.26,-2.45,-10.24,-9.97,1.37,1.88,'wood');
  box(-3.19,-2.53,-9.98,-9.953,1.40,1.86,'fabric');
  // Starboard cabin: twin pipe-frame bunks, lockers, valve and cold utility surfaces.
  for(const y of [-9.74,-8.77]){
    for(const x of [5.19,6.04])beam(P(x,y,6.06),P(x,y,8.06),'galv',.033);
    for(let j=0;j<8;j++)beam(P(5.19,y,6.12+j*.257),P(6.04,y,6.12+j*.257),'verdigris',.02);
    box(5.29,5.99,y+.015,y+.075,6.18,7.58,'fabric');
  }
  for(const x of [5.18,6.06])for(const z of [6.04,8.07])beam(P(x,-10.23,z),P(x,-8.43,z),'rib',.049);
  for(const z of [9.47,10.23,10.99]){
    box(5.68,6.12,-10.23,-7.29,z-.33,z+.34,'galv');
    box(5.645,5.682,-10.16,-7.34,z-.28,z+.28,'rust',z===10.23?'oxide':'galv');
    for(let j=0;j<3;j++)beam(P(5.628,-7.62-j*.09,z-.20),P(5.626,-7.62-j*.09,z+.20),'hullDark',.022);
    beam(P(5.616,-8.69,z-.18),P(5.617,-8.56,z-.17),'bronze',.027);
  }
  beam(P(2.09,-7.83,11.73),P(5.44,-7.86,11.74),'verdigris',.064);
  beam(P(5.44,-7.86,11.74),P(5.44,-9.93,11.74),'piped',.059);
  oval(4.50,-7.85,11.70,.27,.27,'Z','rust',null,.031,10);
  beam(P(4.25,-7.85,11.69),P(4.75,-7.85,11.69),'rust',.025);
  beam(P(4.50,-8.12,11.69),P(4.50,-7.58,11.69),'rust',.025);
  // Thin, irregular deposits on the upper and lower edges of side walls. Nothing in navigation lanes.
  for(const [x,a,b,k] of [[-1.74,-1.32,2.52,'ageFilm'],[-1.74,4.69,11.7,'oxideBloom'],[1.74,-1.31,7.73,'oxideBloom'],[1.74,9.91,11.78,'ageFilm'],[-6.145,1.17,6.12,'oxidizedFlake'],[6.148,5.71,11.71,'oxideBloom']]){
    for(let j=0;j<Math.ceil((b-a)*3);j++){
      const t=(j+.5)/Math.ceil((b-a)*3),z=lerp(a,b,t),y=j%3===0?-6.79:-10.13-j%2*.038;
      const w=.09+(j%5)*.028,h=.05+(j*3%7)*.031;
      poly([P(x,y,z-w),P(x,y+.043,z+w*.66),P(x,y+(j%3===0?-h:h),z+w*.26),P(x,y+(j%3===0?-h*.36:h*.41),z-w*.71)],LINER_COLORS[k]===undefined?'oxideBloom':k,j%9-4,1);
    }
  }
  // Deco fretwork in arches that span above the playable space; a partly shattered central chandelier.
  function arched(riseX,riseY,baseY,z,key,n=17){
    for(let j=0;j<n;j++){
      const a=j*Math.PI/n,b=(j+1)*Math.PI/n;
      beam(P(Math.cos(a)*riseX,baseY+Math.sin(a)*riseY,z),P(Math.cos(b)*riseX,baseY+Math.sin(b)*riseY,z),key,.057);
    }
  }
  for(const z of [-7.83,-5.22,-2.12]){
    arched(3.36,2.05,-2.68,z,'bone');arched(3.28,1.92,-2.68,z+.06,'goldLeaf');
  }
  beam(P(0,-.20,-4.66),P(0,-1.75,-4.66),'bronze',.029);
  oval(0,-1.77,-4.66,1.075,.91,'Y','goldLeaf',null,.045,18);
  oval(0,-2.17,-4.66,.41,.35,'Y','bronze',null,.030,13);
  for(let j=0;j<15;j++){
    if(j===2||j===7||j===8||j===12)continue;
    const a=j*PI2/15,x=Math.cos(a),z=-4.66+Math.sin(a)*.89;
    beam(P(x,-1.77,z),P(x*.43,-2.16,-4.66+(z+4.66)*.43),'goldLeaf',.022);
    const yy=-2.05-R(.0,.32);
    beam(P(x*.94,-1.79,-4.66+(z+4.66)*.92),P(x*.91,yy,z),'crystal',.023);
    if(j%3)box(x*.91-.031,x*.91+.031,yy-.12,yy,z-.032,z+.032,'crystal');
  }

  // Lower passenger hall, usable dogleg and escape bay. Keep this volume open, use the walls only to shape it.
  const lo=-10.25,hi=-6.47;
  floor(-7.88,3.2,-16.7,-8.01,lo,'sole',8);
  // End walls and corridor floor are carried by an enclosed ship deck, including the damaged exit bay.
  box(-7.89,3.27,-10.43,-10.27,-16.74,-8.02,'hull');
  box(-7.61,-3.12,-6.62,-6.425,-16.68,-8.03,'rib');
  box(-3.11,3.08,-6.62,-6.425,-12.47,-8.01,'rib');
  for(let j=0;j<5;j++){
    const z=-8.02-j*1.73;
    beam(P(-2.82,lo+.18,z),P(-2.82,hi-.13,z),'rib',.078);
    beam(P(2.73,lo+.19,z),P(2.73,hi-.13,z),'rib',.084);
    if(j===1)beam(P(-2.82,hi-.21,z),P(2.73,hi-.22,z),'galv',.084);
    if(j>1)for(const sg of [-1,1]){
      beam(P(sg*2.80,hi-.18,z),P(sg*1.92,hi-.19,z),'galv',.079);
      beam(P(sg*2.78,hi-.86,z),P(sg*1.92,hi-.18,z),'bronze',.049);
    }
  }
  side(2.84,-16.63,-12.10,lo,hi,'wall',.14,3);
  side(2.84,-9.74,-8.05,lo,hi,'wall',.14,2);
  side(2.84,-12.1,-9.74,-7.20,hi,'mahogany',.14);
  for(const z of [-12.09,-9.75])beam(P(2.82,lo+.05,z),P(2.82,-7.19,z),'goldLeaf',.065);
  beam(P(2.82,-7.18,-12.08),P(2.82,-7.18,-9.77),'goldLeaf',.069);
  // Forward side partitions terminate before the dogleg. The lamp niche at -15.48 is behind the photo.
  side(-2.83,-11.3,-8.08,lo,hi,'wall',.14,3);
  side(-2.83,-16.70,-16.25,lo,hi,'wall',.14);
  bulk(-16.63,-7.64,2.91,lo,hi,'wall',.18,5);
  bulk(-8.08,-7.57,-2.92,lo,hi,'wall',.17,3);
  side(-6.27,-12,-8.13,lo,hi,'rib',.11,2);
  // Destination: the ship's double-height memorial room. Shell fragments and opaque background panes
  // create a luminous deco sunburst in the water behind the original, reachable photo plinth.
  const chapel=-15.66, floorY=-10.25,fanY=-7.45;
  bulk(chapel,-2.92,2.92,floorY,-7.07,'mahogany',.23,8);
  bulk(chapel,-2.9,2.9,-7.10,-3.59,'panelDark',.22,6);
  bulk(chapel,-2.94,2.94,-3.60,-3.34,'bone',.24,5);
  floor(-2.83,2.81,-15.74,-12.52,-10.235,'panelMint',5);
  floor(-1.15,1.15,-15.51,-12.55,-10.216,'carpet',4);
  for(const q of [-1.0,1.0])beam(P(q,-10.198,-15.51),P(q,-10.201,-12.54),'rugBorder',.029);
  for(const sg of [-1,1]){
    const x=sg*2.32;
    box(x-.32,x+.32,-10.24,-9.93,chapel+.16,chapel+.72,'panelMint','bone');
    taper(x,chapel+.25,[[-9.94,.215,.142,0,0],[-9.68,.155,.13,0,0],[-4.44,.119,.116,0,0],[-4.19,.233,.164,0,0],[-3.69,.153,.142,0,0]],'goldLeaf',['bronze','bone','marquetry','goldLeaf'],10);
    for(const y of [-9.49,-8.27,-7.15])beam(P(x+sg*.20,y,chapel+.14),P(sg*.82,y,chapel+.14),'bronze',.039);
    // Lacquered side panel and geometric golden stepping.
    const x1=sg*.98,x2=sg*1.91,pz=chapel+.117;
    for(let k=0;k<3;k++){
      const ya=-10.0+k*.28;
      beam(P(x1,ya,pz),P(x2,ya,pz),'goldLeaf',.025);
      beam(P(x1+sg*.09,ya+.05,pz+.02),P(x2-sg*.05,ya+.05,pz+.02),'marquetry',.018);
    }
    const sideX=sg*2.77;
    side(sideX,-15.58,-14.01,-6.30,-3.67,'wall',.17,2);
    beam(P(sideX,-6.30,-15.57),P(sideX,-3.67,-15.57),'bronze',.061);
    beam(P(sideX,-6.36,-15.58),P(sideX,-6.36,-12.76),'bronze',.072);
  }
  const fanFront=chapel+.16;
  const shades=['enamelGold','enamelBlue','enamelIvory','enamelTeal','enamelRuby','enamelTeal','enamelIvory','enamelBlue','enamelGold'];
  const N=18;
  for(let i=0;i<N;i++){
    const a=i*Math.PI/N,b=(i+1)*Math.PI/N;
    const v=(r,t)=>P(Math.cos(t)*1.89*r,fanY+Math.sin(t)*2.91*r,fanFront);
    const scaleA=i===2?.83:1,scaleB=i===13?.85:1;
    const v0=v(.17,a),v1=v(.17,b),v2=v(.68,a),v3=v(.68,b),v4=v(scaleA,a),v5=v(scaleB,b);
    if(![1,7,13,16].includes(i))poly([v0,v2,v3,v1],shades[(i+4)%9],3+(i%4)*4,0,.031);
    if(![2,12,13].includes(i))poly([v2,v4,v5,v3],shades[(i+1)%9],5+(i%3)*2,0,.043);
    beam(v0,v2,'goldLeaf',.022,.053);beam(v2,v4,'bronze',.029,.053);
    beam(v2,v3,'bronze',.029,.055);beam(v4,v5,i%5?'goldLeaf':'verdigris',.055,.067);
  }
  oval(0,fanY+.15,fanFront+.025,.285,.242,'Z','goldLeaf','enamelGold',.035,15,.085);
  for(let i=0;i<6;i++){
    const x=-1.74+i*.69;
    beam(P(x,-7.48,fanFront),P(x,-7.02,fanFront),'goldLeaf',.026,.07);
  }
  beam(P(-2.00,-7.51,fanFront),P(2.01,-7.51,fanFront),'bone',.063,.06);
  beam(P(-1.90,-7.03,fanFront),P(1.90,-7.03,fanFront),'goldLeaf',.038,.066);
  // A small bronze-framed niche lined up with the separate UI / physical photo prop.
  bulk(chapel+.130,-1.10,1.10,-9.54,-7.86,'panelDark',.042);
  barframe(-7.78,-1.13,1.13,chapel+.167,'goldLeaf',.064);
  box(-.96,.95,-9.55,-9.31,chapel+.06,-14.91,'mahogany','goldLeaf');
  for(const sg of [-1,1]){
    const xx=sg*1.35,zz=chapel+.29;
    const ped=[[-10.22,.19,.16,0,0],[-10.08,.23,.17,0,0],[-9.74,.12,.13,0,0],[-9.57,.19,.16,0,0]];
    taper(xx,zz,ped,'goldLeaf',['bronze','marquetry','goldLeaf'],10);
    if(sg>0)oval(xx,-9.51,zz,.115,.11,'Y','bronze','enamelTeal',.017,10);
  }
  // Optional starboard observation salon. The arch at x=2.84 leads to a true side room, not a dead facade.
  floor(2.84,6.68,-13.72,-8.09,lo,'teak',5);
  side(6.68,-13.72,-8.09,lo,hi,'panelMint',.14,5);
  bulk(-13.72,2.82,6.72,lo,hi,'mahogany',.21,5);
  bulk(-8.09,2.81,6.70,lo,hi,'panelMint',.19,5);
  for(const z of [-12.89,-11.15,-9.45]){
    const X=6.58;
    oval(X,-8.18,z,.51,.54,'X','bronze','glass',.055,14,.013);
    oval(X-.03,-8.18,z,.39,.40,'X','marquetry','enamelBlue',.019,12,.019);
    for(let i=0;i<4;i++){
      const a=i*PI2/4, x0=X-.06;
      beam(P(x0,-8.18,z),P(x0,-8.18+Math.cos(a)*.385,z+Math.sin(a)*.40),'bronze',.021);
    }
  }
  // Model liner inside its cracked display cabinet. A small story discovery, not a required marker.
  const mx=4.94,mz=-13.09, mY=-8.96;
  box(mx-.84,mx+.84,-10.18,mY,mz-.45,mz+.42,'mahogany','marquetry');
  const modelHull=[P(mx-.68,mY+.05,mz-.08),P(mx+.70,mY+.05,mz-.08),P(mx+.50,mY+.25,mz+.15),P(mx-.54,mY+.25,mz+.15)];
  poly(modelHull,'hullDark',7,1);beam(modelHull[2],modelHull[3],'bone',.033);
  box(mx-.42,mx+.43,mY+.26,mY+.39,mz-.09,mz+.093,'bone');
  for(const x of [mx-.13,mx+.19]){
    taper(x,mz,[[mY+.38,.060,.063,0,0],[mY+.56,.04,.057,.008,0],[mY+.59,.04,.052,.013,0]],'soot',['piped','soot'],8);
  }
  for(const s of [-1,1])beam(P(mx+s*.79,mY+.11,mz+.31),P(mx+s*.79,mY+.81,mz+.31),'bronze',.032);
  beam(P(mx-.80,mY+.81,mz+.31),P(mx+.79,mY+.81,mz+.31),'bronze',.042);
  poly([P(mx-.76,mY+.14,mz+.301),P(mx-.76,mY+.77,mz+.301),P(mx-.18,mY+.77,mz+.302)],'glass',-11,0);
  const chronZ=-8.15;
  oval(5.12,-8.17,chronZ,.53,.53,'Z','goldLeaf','panelDark',.050,18);
  oval(5.12,-8.17,chronZ-.036,.425,.425,'Z','bronze','bone',.024,16,.036);
  for(let i=0;i<12;i++){
    const a=i*PI2/12;beam(P(5.12+Math.cos(a)*.344,-8.17+Math.sin(a)*.344,chronZ-.053),P(5.12+Math.cos(a)*.398,-8.17+Math.sin(a)*.398,chronZ-.053),'mahogany',.016,.041);
  }
  beam(P(5.12,-8.17,chronZ-.067),P(5.13,-7.995,chronZ-.073),'bronze',.028,.063);
  beam(P(5.12,-8.17,chronZ-.067),P(4.86,-8.23,chronZ-.073),'bronze',.020,.063);
  // Broken observation benches and a narrow gilded rail along the lower wall.
  for(const [x,z] of [[6.29,-11.73],[6.29,-9.49]]){
    box(x-.32,x+.25,-9.71,-9.53,z-.58,z+.59,'mahogany','fabric');
    box(x+.16,x+.29,-9.56,-9.01,z-.56,z+.57,'wood','fabric');
    for(const d of [-.47,.46])beam(P(x-.12,-9.69,z+d),P(x-.13,-10.24,z+d),'bronze',.043);
  }
  for(const x of [-2.79,2.78])for(let j=0;j<5;j++){
    const z=-8.85-1.50*j;
    if(x<0&&z< -11.25||x>0&&z< -9.52&&z> -12.42)continue;
    box(x-.033,x+.033,-9.58,-9.46,z-.66,z+.63,'bronze');
    if(j%2===0)box(x-.08,x+.08,-8.11,-7.98,z-.41,z+.35,'rust');
  }

  // Ballroom wall planes, open starboard access and offset forward doorway.
  box(-3.25,.23,-6.4,-2.66,12.94,13.10,'wall');box(3.12,5.90,-6.4,-2.66,12.94,13.10,'wall');
  box(.23,3.12,-3.10,-2.66,12.94,13.10,'galv');
  beam(P(.44,-6.37,13.12),P(.44,-3.04,13.12),'bronze',.085);
  beam(P(2.97,-6.37,13.12),P(2.97,-3.04,13.12),'bronze',.085);
  beam(P(.44,-3.04,13.12),P(2.97,-3.04,13.12),'bronze',.099);
  for(const sg of [-1,1]){
    const x=sg*3.19;
    side(x,-2.15,13,-6.4,-5.51,'wood',.14,7);
    side(x,-2.15,13,-3.36,-2.67,'wall',.14,5);
    for(let j=0;j<7;j++){
      const z=12.29-j*2.15;
      box(x-.082,x+.082,-5.5,-3.35,z-.102,z+.09,'bronze');
      if(j!==2&&j!==5){
        const x0=x+sg*.039;
        poly([P(x0,-5.43,z-.090),P(x0,-5.43,z-1.98),P(x0,-3.49,z-1.98),P(x0,-3.49,z-.091)],'glass',-8,1);
        beam(P(x0,-5.44,z-.091),P(x0,-5.44,z-1.98),'bronze',.041);
      }
    }
    for(const z of [10.6,6.2,1.72,-1.75]){
      for(const y of [-6.27,-3.02])box(x-sg*.34-.18,x-sg*.34+.16,y-.07,y+.078,z-.24,z+.25,'bronze');
      const sign=sg;
      beam(P(x-sign*.30,-6.31,z),P(x-sign*.30,-2.83,z),'cream',.113);
      beam(P(x-sign*.30,-2.91,z),P(sign*1.78,-2.65,z),'rib',.071);
    }
  }
  // High, partial broken ballroom roof plus rounded interrupted arch ribs. Nothing closes the stair or route.
  for(let j=0;j<7;j++){
    const a=-1.6+j*2.08,b=a+1.52;
    if(j===3||j===5)continue;
    for(const sg of [-1,1])floor(sg<0?-3.32:1.34,sg<0?-1.13:3.45,a,b,-2.55,j%2?'cream':'white',1);
  }
  const stairGateZ=-1.73;
  for(const x of [-2.18,2.19])beam(P(x,-6.36,stairGateZ),P(x,-3.54,stairGateZ),'bronze',.08);
  for(const z of [-1.53,1.65,6.04,10.74]){
    const A=P(-2.89,-3.34,z),B=P(-1.68,-2.88,z),C=P(0,-2.75,z),D=P(1.68,-2.88,z),E=P(2.89,-3.34,z);
    brokenRim(A,B,C,D,'bronze');beam(D,E,'bronze',.070);
  }
  // Ballroom wrecked chairs, long decorative flower runner, stanchion fixtures and ceiling lights, to scale.
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const x=side*(2.35+R(-.23,.16)),z=10.5-i*1.92+R(-.28,.36);
    if(side<0&&[2,3,4].includes(i))continue;
    const y=-6.1;
    box(x-.22,x+.26,y-.015,y+.082,z-.20,z+.26,'fabric');
    for(const dz of [-.14,.218])for(const dx of [-.17,.213])beam(P(x+dx,y,z+dz),P(x+dx*1.12,-6.39,z+dz*1.15),'wood',.028);
    beam(P(x-.2,y+.04,z-.20),P(x-.30,y+.53,z-.29),'wood',.041);
    beam(P(x+.21,y+.04,z-.20),P(x+.21,y+.53,z-.29),'wood',.044);
    box(x-.29,x+.24,y+.44,y+.53,z-.31,z-.28,'wood');
  }
  // A damaged rosewood salon piano, parked against the port wall and out of the swim lane.
  box(-3.27,-2.04,-5.58,-5.14,4.89,5.93,'wood','teak');
  box(-2.11,-1.91,-5.555,-5.44,4.88,6.02,'cream','white');
  for(let j=0;j<15;j++){
    const z=4.925+j*.072;
    beam(P(-2.081,-5.432,z),P(-1.917,-5.432,z),'black',.005);
    if(j%7!==1&&j%7!==4)beam(P(-2.076,-5.410,z+.027),P(-1.995,-5.41,z+.027),'black',.014);
  }
  for(const [x,z] of [[-3.12,5.38],[-2.13,5.03],[-2.13,5.81]])
    beam(P(x,-5.59,z),P(x-.07,-6.384,z+.06),'wood',.058);
  poly([P(-3.28,-5.14,5.05),P(-2.11,-4.74,4.9),P(-2.10,-4.68,5.88),P(-3.22,-5.13,5.99)],'teak',12,1);
  beam(P(-2.11,-4.74,4.9),P(-2.10,-4.68,5.88),'bronze',.023);
  beam(P(-2.16,-5.12,5.57),P(-2.12,-4.69,5.66),'wood',.024);
  for(const z of [8.4,4.5,1.1]){
    beam(P(0,-2.79,z),P(0,-3.18,z),'bronze',.027);
    oval(0,-3.18,z,.29,.29,'Y','bronze',null,.029,12);
    oval(0,-3.36,z,.12,.14,'Y','light',null,.038,9);
  }

  // Classic tiered liner superstructure. Promenade window bands sit above the route and remain hollow.
  const tiers=[
    {xa:-6.77,xb:6.77,z0:-31,z1:15.6,y:-5.16,top:-3.40,key:'cream',windows:true},
    {xa:-5.06,xb:5.06,z0:-26.7,z1:10.6,y:-3.37,top:-1.60,key:'white',windows:true},
    {xa:-3.70,xb:3.70,z0:-19.8,z1:6.37,y:-1.47,top:-.52,key:'cream',windows:true},
    {xa:-2.59,xb:2.59,z0:-17.2,z1:4.5,y:-.47,top:.53,key:'bone',windows:false}
  ];
  for(let k=0;k<tiers.length;k++){
    const {xa,xb,z0,z1,y,top,key,windows}=tiers[k];
    // Avoid a permanent roof slab below y=-3.35 across the playable ballroom.
    const num=detail>=1?22:16, short=k===0?z1-2.15:z1;
    for(const sg of [-1,1]){
      const X=sg*(xb-.05);
      for(let i=0;i<num;i++){
        const a=lerp(z0,short,i/num),b=lerp(z0,short,(i+1)/num),z=(a+b)/2;
        const isTorn=(i===4&&sg<0)||(i===12&&sg>0)||(k===0&&sg>0&&z>8.5);
        // Long bands, thin but modeled as actual geometry.
        if(!isTorn){
          side(X,a,b,y,y+(top-y)*.28,key,.09);
          side(X,a,b,top-.30,top,key,.10);
          beam(P(X+sg*.14,top+.032,a),P(X+sg*.14,top+.030,b),'deckEdge',.071);
          if(windows){
            const low=y+.62,high=top-.38,pz=a+(b-a)*.085,qz=b-(b-a)*.085,thick=.063;
            const Xd=X+sg*.028;
            poly([P(Xd,low,pz),P(Xd,low,qz),P(Xd,high,qz),P(Xd,high,pz)],i%4===2?'glass':'window',0,0);
            beam(P(Xd,y+.30,a),P(Xd,top,a),'galv',thick);
            beam(P(Xd,low,pz),P(Xd,low,qz),'bronze',.034);
            if(i%4===2)beam(P(Xd,low,z),P(Xd,high,z),'rib',.027);
          }
        } else {
          beam(P(X,y,a),P(X-sg*.32,top-.19,a+.14),'rust',.059);
          beam(P(X,y,b),P(X+sg*.25,top-.26,b-.13),'rib',.063);
          if((i+k)%2)beam(P(X,y,b),P(X-sg*.15,y+.88,b-.48),'oxide',.047);
          // Two-tier cosmetic damage reveals a buckled inner bulkhead, not a
          // traversable passage into a non-modeled superstructure. Retain the
          // actual lower starboard promenade opening used for boarding.
          if(!(k===0&&sg>0&&z>8.5)){
            const Z=X-sg*.16;
            poly([P(Z,y,a),P(Z,y,b),P(Z,top,b),P(Z,top,a)],'galv',-20,1);
          }
        }
        if(i%3!==1){
          const e=sg*(xb+.10);
          const damaged=(k===1&&sg>0&&z<-9&&z>-12.7)||(k===0&&sg<0&&z>-25.4&&z<-20.0)||
            (k===2&&sg<0&&z>-5.0&&z<-1.3);
          if(damaged)damagedRail({a,b,style:(i+k)%2?'fold':'gap'},z0=>P(e,top+.02,z0),sg,.64,.73);
          else{
            beam(P(e,top+.033,a),P(e,top+.66,a),'railing',.028);
            beam(P(e,top+.61,a),P(e,top+.64,b),'railing',.029);
          }
        }
      }
    }
    // Roof sheets split into bands, some drop away at the pool of light.
    for(let i=0;i<10;i++){
      const a=lerp(z0,z1,i/10),b=lerp(z0,z1,(i+1)/10);
      if(i===3||i===7){beam(P(xa,top,b),P(xb,top+.013,b),'rib',.079);continue;}
      for(const sg of [-1,1]){
        if(k===0&&b>-8.05&&a<13.25&&sg>0)continue;
        if(k<2&&b>-16.5&&a<-12.55)continue;
        if(k===0&&b>-8.10&&a< -1.45&&sg<0)continue;
        floor(sg<0?xa+.073:-.27,sg<0?.23:xb-.063,a,b,top,'deck',1);
      }
    }
  }
  // Forward enclosed wheelhouse above the ballroom, with ten individual bridge lights.
  const bridgeZ=7.99; bulk(bridgeZ,-4.55,4.55,-3.24,-2.82,'cream',.20,7);
  bulk(bridgeZ,-4.52,4.54,-1.86,-1.58,'cream',.23,7);
  for(let i=0;i<=10;i++){
    const x=-4.53+i*.905, z=bridgeZ-Math.abs(x)*.105;
    beam(P(x,-2.81,z),P(x,-1.85,z),'galv',.051);
    if(i===10)continue;
    const x2=x+.905,z2=bridgeZ-Math.abs(x2)*.105;
    if(i!==1&&i!==6)poly([P(x+.073,-2.76,z+.026),P(x2-.08,-2.76,z2+.027),P(x2-.082,-1.91,z2+.027),P(x+.073,-1.91,z+.026)],i%3?'window':'glass',2,0);
    if(i%2){
      beam(P(x,-2.84,z),P(x2,-2.84,z2),'bronze',.033);
      beam(P(x,-1.85,z),P(x2,-1.85,z2),'white',.033);
    }
  }
  box(-4.59,4.59,-1.58,-1.44,5.18,8.13,'white','deck');
  // Original twin oval stacks, angular broken top lips, cream striping and oxidized reddish paint.
  for(const [z,sg] of [[-.94,-1],[-11.42,1]]){
    const h=z> -4?0:-.18;
    const ys=[
      [-1.67,1.82,2.51,0,0],[-1.28,1.76,2.44,.015,-.08],[-.59,1.65,2.34,.019,-.22],
      [2.04+h,1.58,2.16,.024,-.55],[2.52+h,1.54,2.07,.026,-.67],
      [3.20+h,1.49,2.02,.035,-.736],[4.68+h,1.37,1.95,.053,-.91],
      [5.12+h,1.35,1.91,.056,-.95]
    ];
    const N=detail>=1?22:14,get=taper(0,z,ys,'black',['deckEdge','oxide','piped','piped','bone','soot','black'],N);
    for(let i=0;i<N;i++){
      const A=get(ys.length-1,i),B=get(ys.length-1,i+1);
      const A0=get(ys.length-2,i),B0=get(ys.length-2,i+1);
      if((i-3+N)%N<4){A.y+=R(.03,.16)+sg*.049;B.y+=R(.03,.17);beam(A0,A,'rust',.033);}
      beam(A,B,'galv',.043);
      if(i%3===0)beam(A0,B0,'rust',.018);
      if(i%4===0){
        const B1=get(1,i),B4=get(4,i),T0=get(6,i);
        beam(B1,B4,'oxideBloom',.025);
        if(i%8!==0)beam(B4,T0,'marquetry',.022);
      }
    }
    for(const x of [-1.82,1.82]){
      const y=-1.49;
      beam(P(x,y,z-2.12),P(x,y+.83,z-2.12),'railing',.030);
      beam(P(x,y,z+1.91),P(x,y+.83,z+1.91),'railing',.030);
      beam(P(x,y+.83,z-2.12),P(x,y+.83,z+1.91),'railing',.034);
    }
  }
  // Lifeboat station and flared davits deliberately carry the liner silhouette even in the lightweight mode.
  for(const sg of [-1,1]){
    const count=detail>=1?6:5;
    for(let k=0;k<count;k++){
      const z=8.3-k*6.18,x=6.22*sg, lifted=(k===1&&sg===-1)?-.47:0;
      const a=P(x,-3.35,z-1.63),b=P(x+sg*.17,-1.43,z-1.47),c=P(x+sg*.93,-.89,z-1.30);
      const d=P(x,-3.35,z+1.63),e=P(x+sg*.17,-1.43,z+1.55),f=P(x+sg*.93,-.89,z+1.45);
      for(const [A,B,C] of [[a,b,c],[d,e,f]]){
        beam(A,B,'rib',.089);beam(B,C,'cream',.078);beam(C,P(C.x,-2.08+lifted,C.z),'soot',.022);
      }
      if(k===2&&sg>0||k===0&&sg<0)continue;
      const boatX=x+sg*.55,ny=-2.29+lifted, widths=[.04,.38,.51,.49,.32,.035],zs=[-1.79,-1.27,-.42,.47,1.25,1.71];
      for(let i=0;i<zs.length-1;i++)for(const si of [-1,1]){
        const A=P(boatX,ny-.48,z+zs[i]), B=P(boatX,ny-.48,z+zs[i+1]),
              C=P(boatX+si*widths[i],ny,z+zs[i]),D=P(boatX+si*widths[i+1],ny,z+zs[i+1]);
        poly([A,B,D,C],i%3?'cream':'plate',i%2*4,1);beam(C,D,'bronze',.043);
      }
      for(const z0 of [-1.03,-.39,.28,.96])
        beam(P(boatX-.30,ny-.071,z+z0),P(boatX+.34,ny-.071,z+z0),'wood',.047);
    }
  }
  // Tiered quarters above the rear deck. Rail galleries, vents and two large first-class verandas
  // ensure the stern reads differently from the bow and shows a whole ocean liner in profile.
  for(const sg of [-1,1]){
    for(const [y,xa,zb,za] of [[-5.06,5.98,-23.6,-39.2],[-3.28,4.36,-23.8,-35.8],[-1.48,3.05,-22.85,-31.4]]){
      const x=sg*xa;
      const xl=sg<0?x:sg*.06,xh=sg<0?sg*.06:x;
      floor(xl,xh,za,zb,y,'teak',5);
      for(let j=0;j<7;j++){
        const a=lerp(za,zb,j/7),b=lerp(za,zb,(j+1)/7);
        const x0=x*(.73+.27*j/7);
        beam(P(x0,y,a),P(x0,y+.61,a),'railing',.048);
        if(j!==2)beam(P(x0,y+.61,a),P(x*(.73+.27*(j+1)/7),y+.62,b),'bone',.043);
        if(j<6)side(x0,a+.055,b-.025,y-.38,y,'white',.13);
      }
    }
    // Taller vents and plated aft windows under the overhang, never in the return route.
    for(let i=0;i<4;i++){
      const x=sg*(2.6+i*.57),z=-23.88-i*.91;
      taper(x,z,[[-1.66,.19,.19,0,0],[-1.45,.18,.18,0,0],[-.54,.20,.20,0,0],[-.42,.28,.32,0,-.11]],'soot',['galv','cream','bronze'],12);
      oval(x,-.41,z-.16,.20,.27,'Y','brass',null,.023,12);
    }
    // Mark the focal hull band with visible stem framing and short row of twin stacked mooring cleats.
    for(let i=0;i<6;i++){
      const z=29.3+2.09*i,[w,y]=hull(z);const x=sg*(w-.32);
      if(w<1.1)continue;
      beam(P(x,y,z),P(x+sg*.09,y+.54,z),'bronze',.032);
      beam(P(x-sg*.32,y+.485,z),P(x+sg*.22,y+.524,z),'galv',.040);
    }
  }
  for(const z of [-2.1,-15.9]){
    for(const sg of [-1,1]){
      const x=sg*2.36,y=.56;
      taper(x,z,[[y,.18,.19,0,0],[y+.21,.17,.21,0,0],[y+.81,.14,.155,.03,-.06],[y+.99,.215,.21,.043,-.14]],'soot',['galv','bone','bronze'],9);
    }
  }
  // Fore and aft shipwork: mast/davits, anchor eyes, low vents and nested rear decks.
  for(const [z,x,yHi] of [[16.7,-1.86,1.36],[-31.54,1.18,1.72]]){
    beam(P(x,-6.34,z),P(x+.31,yHi,z-.79),'galv',.133);
    beam(P(x-1.5,yHi-1.0,z-.75),P(x+1.91,yHi-1.04,z-.86),'railing',.073);
    for(const [a,b] of [[-5.2,-5.78],[5.2,3.91]]){
      const c=P(x+.30,yHi-.59,z-.79),D=P(a,-5.99,z+b),e=mixP(c,D,.5);
      e.y-=.91;beam(c,e,'soot',.027);beam(e,D,'soot',.023);
    }
  }
  for(const sg of [-1,1]){
    const x=6.12*sg;
    polygonAux(sg,26.7,x,-6.31);
    polygonAux(sg,29.5,x*.91,-6.32);
    polygonAux(sg,-30.4,x,-6.31);
    polygonAux(sg,-36.1,x*.74,-6.30);
    if(sg>0){
      // Raise a few ribs around the boarding break, while the break itself has no transverse obstruction.
      for(const z of [14.1,14.9,18.9,19.7]){
        const x0=8.0,y=-6.4;
        beam(P(x0-.82,y-1.24,z-.08),P(x0+.24,y-.37,z),'rib',.085);
        beam(P(x0+.24,y-.37,z),P(x0+.13,y+.47,z+.16),'railing',.057);
      }
    }
    const anchorZ=42.05,ax=hx(anchorZ,-7.36,sg)+sg*.08;
    oval(ax,-7.52,anchorZ,.63,.58,'X','bronze','window',.071,17);
    beam(P(ax+sg*.05,-7.5,anchorZ-.09),P(ax*1.06,-9.31,anchorZ-.50),'rust',.072);
  }
  function polygonAux(sign,z,x,y){
    taper(x,z,[[y,.54,.72,0,0],[y+.16,.52,.69,0,0],[y+.43,.40,.49,0,0],[y+.59,.54,.57,0,0]],'oxide',['rib','galv','bronze'],10);
    for(let i=0;i<4;i++){
      const p=P(x-sign*.44-i*sign*.24,y+.09,z+i*.23);
      oval(p.x,p.y,p.z,.14,.18,'Y','oxide',null,.024,8);
    }
  }
  // Debris belongs on the floor; the previous scattered flat wafers sat out
  // in clear water, visibly unattached. Genuine plate fragments now occur only at joints.
  const weatherPoly=(p,...o)=>{if(!obstructedWear(p))poly(p,...o);};
  const weatherBeam=(a,b,...o)=>{if(!obstructedWear([a,b]))beam(a,b,...o);};
  addWreckAge({P,poly:weatherPoly,beam:weatherBeam,hull,hx,detail});
  return {faces,bars};
}
let full,lite;
export function getLinerBlueprint(detail=1){
  return detail>=1?(full??=buildBlueprint(1)):(lite??=buildBlueprint(.64));
}

// Canvas paints sediment before the ship, so clip buried shell faces once
// in world space. WebGL gets the same occlusion from the actual terrain mesh.
const visibleLowerShell=new WeakMap();
function liteFaceAboveBed(m){
  if((m.key!=='hullDark'&&m.key!=='boot')||m.c.y>-10.8||Math.abs(m.c.x)>7.5)return m.p;
  if(visibleLowerShell.has(m))return visibleLowerShell.get(m);
  const delta=q=>q.y-seabedHeight(q.x,q.z);
  const path=[];
  for(let i=0;i<m.p.length;i++){
    const a=m.p[i],b=m.p[(i+1)%m.p.length];
    const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.65)||1;
    for(let j=0;j<n;j++)path.push(j?mixP(a,b,j/n):a);
  }
  let a=path.at(-1),da=delta(a),out=[];
  for(const b of path){
    const db=delta(b);
    if((da>=0)!==(db>=0)){
      let l=0,r=1;
      for(let i=0;i<8;i++){
        const mid=(l+r)*.5;
        if((delta(mixP(a,b,mid))>=0)===(da>=0))l=mid;else r=mid;
      }
      out.push(mixP(a,b,(l+r)*.5));
    }
    if(db>=0)out.push(b);
    a=b;da=db;
  }
  const geometry=out.length===path.length&&path.every((p,i)=>p===out[i])?m.p:out;
  visibleLowerShell.set(m,geometry);
  return geometry;
}

// Perspective-clipped, sorted Canvas surfaces. Tint/texture are intentionally stylized to remain readable at 30 FPS.
const near=.135; // keep projection cut behind the collision margin at ordinary aspect ratios
function clip(items,project,isLine){
  if(isLine){
    let a=items[0], b=items[1], pa=project(a), pb=project(b);
    if(pa.z<near&&pb.z<near)return null;
    if(pa.z<near)pa=project(mixP(a,b,(near-pa.z)/(pb.z-pa.z)));
    else if(pb.z<near)pb=project(mixP(a,b,(near-pa.z)/(pb.z-pa.z)));
    return [pa,pb];
  }
  let old=items[items.length-1], oldP=project(old), out=[];
  for(const p of items){
    const q=project(p),va=oldP.z>=near,vb=q.z>=near;
    if(va!==vb)out.push(project(mixP(old,p,(near-oldP.z)/(q.z-oldP.z))));
    if(vb)out.push(q);
    old=p;oldP=q;
  }
  return out.length>=3?out:null;
}
const hash=(i)=>((Math.sin(i*78.233)*43758.5453123)%1+1)%1;
function rgb(c){return [c>>16,(c>>8)&255,c&255];}
const LC=Object.fromEntries(Object.entries(LINER_COLORS).map(([k,v])=>[k,rgb(v)]));
const steelSkin=new Set(['hull','hullDark','band','boot','wall','panelDark','panelMint','oxide','deck','rib','white','cream','bone']);
const woodSkin=new Set(['teak','wood','sole','mahogany','deckSilt','siltShadow','marquetry','fabric']);
const maskFaces=new Set(['ironWorn','ironOxide','ironUnderpaint','ironPits','greenFilm','coralline','waterloggedOak','saltWood','verdigrisDark','paintChip','rustSillDeep','rustSillFaded']);
function mappedPits(ctx,key,m,ps,z,d){
  const k=STEEL_KIND[key]??(steelSkin.has(key)?'steel':woodSkin.has(key)?'timber':key==='bronze'||key==='goldLeaf'?'brass':null);
  if(!k||m.p.length!==4||ps.length!==4||ps.some(p=>p.z<near+.03))return;
  const [a,b,c,e]=ps;
  const Ux=b.x-a.x, Uy=b.y-a.y, Vx=e.x-a.x, Vy=e.y-a.y;
  if(Math.abs(Ux*Vy-Uy*Vx)<(STEEL_KIND[key]?410:1150))return;
  const x2=a.x+Ux+Vx,y2=a.y+Uy+Vy;
  // The affine approximation is bounded to a plausible portion on oblique surfaces, clipped to the actual facet.
  if(Math.hypot(x2-c.x,y2-c.y)>Math.max(STEEL_KIND[key]?188:116,Math.abs(Ux+Vx)*.60))return;
  const map=makeCanvasWearMap(k);if(!map)return;
  ctx.save();ctx.clip();
  ctx.globalAlpha=Math.max(0,(STEEL_KIND[key]?.82:.77)-d*.85);
  ctx.transform(Ux/128, Uy/128, Vx/128, Vy/128, a.x,a.y);
  if(m.id%2)ctx.transform(-1,0,0,1,128,0);
  ctx.drawImage(map,0,0,128,128);
  ctx.restore();
}
function renderLiteWreck(ctx,project,state,view){
  const {w,h,t=0}=view;if(!w||!h)return;
  const {faces,bars}=getLinerBlueprint(.64), draw=[];
  const fogColor=[13,47,55], cam=state??{};
  const camX=cam.x??0,camY=cam.y??-4.8,camZ=cam.z??38;
  function list(items,isBar){
    for(const m of items){
      if(m.n&&(m.n.x*(camX-m.c.x)+m.n.y*(camY-m.c.y)+m.n.z*(camZ-m.c.z)>.00001))continue;
      const c=project(m.c);if(c.z>88||c.z< -4.35)continue;
      const vertices=isBar?m.p:liteFaceAboveBed(m);
      if(vertices.length<(isBar?2:3))continue;
      const ps=clip(vertices,project,isBar);if(!ps)continue;
      let x0=1e8,x1=-1e8,y0=1e8,y1=-1e8,z=0;
      for(const p of ps){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);z+=p.z;}
      if(x0>w+12||x1< -12||y0>h+12||y1< -12)continue;
      z/=ps.length;
      if(isBar&&z>34&&m.r<.03)continue;
      if(!isBar&&((x1-x0)*(y1-y0)<2.1))continue;
      draw.push({m,ps,z,isBar,x0,x1,y0,y1});
    }
  }
  list(faces,false);list(bars,true);
  draw.sort((a,b)=>(b.z-b.m.bias)-(a.z-a.m.bias));
  ctx.save();
  let mapped=0;
  for(const {m,ps,z,isBar,x0,x1,y0,y1} of draw){
    const c=LC[m.key]??LC.galv,bw=x1-x0,bh=y1-y0;
    const d=1-Math.exp(-z*.029), lamp=state?.lamp && z<14?Math.max(0,.21*(1-Math.hypot((x0+x1)*.5-w*.52,(y0+y1)*.5-h*.52)/(h*.78))):0;
    const emissive=m.key.startsWith('enamel')?.057:m.key==='crystal'?.040:0;
    const tex=.77+emissive+(.038*Math.cos(m.id*1.51))+.095*clamp((m.c.y+4.3)/11,-.7,.72)+lamp;
    const col=(sh=0)=>'rgb('+c.map((v,i)=>Math.round(clamp(lerp(v*tex+m.shade+sh,fogColor[i],d),0,255))).join(',')+')';
    ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);
    if(isBar){
      const lw=clamp(h*m.r*1.42/z,.48,19);
      ctx.lineCap='round';ctx.lineWidth=lw;ctx.strokeStyle=col(5);ctx.stroke();
      if(lw>2.8&&z<19){ctx.lineWidth=lw*.39;ctx.strokeStyle=col(30);ctx.stroke();}
      continue;
    }
    ctx.closePath();
    if(m.grain&&z<24&&bw*bh>2600&&bw+bh>26){
      const gr=ctx.createLinearGradient(x0,y0,x1,y1);
      gr.addColorStop(0,col(10));gr.addColorStop(.58,col());gr.addColorStop(1,col(-11));
      ctx.fillStyle=gr;
    }else ctx.fillStyle=col();
    if(maskFaces.has(m.key))ctx.globalAlpha=.58+Math.max(0,1-z/28)*.18;
    ctx.fill();ctx.globalAlpha=1;
    const sideSteel=Boolean(STEEL_KIND[m.key]);
    if(mapped<124&&m.grain&&z<(sideSteel?24:18)&&bw*bh>(sideSteel?1450:5900)&&bw>12&&bh>9){
      mappedPits(ctx,m.key,m,ps,z,d);
      mapped++;
    }
    if(!sideSteel&&m.grain&&bw*bh>2350&&bw>12&&bh>8&&z<23&&m.id%3===0){
      const shift=hash(m.id)*.4+.12, gx=x0+bw*shift, gy=y0+bh*(.52+hash(m.id+3)*.16);
      // A soft rust patch contained inside the projected panel.
      ctx.save();ctx.clip();
      ctx.fillStyle=m.id%2?'#705a3b4a':'#091f2057';
      ctx.beginPath();ctx.ellipse(gx,gy,Math.min(12,bw*.12),Math.min(4,bh*.12),-.16,0,PI2);ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

const layers=new WeakMap();
export function paintLiteWreck(ctx,project,state,view){
  const {w,h,t=0}=view;
  if(!w||!h)return;
  let l=layers.get(ctx);
  if(!l){
    try{
      const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(2,2):globalThis.document?.createElement('canvas');
      const g=c?.getContext('2d');if(!g)throw Error('Canvas layer unavailable');
      l={c,g,pose:null};layers.set(ctx,l);
    }catch{
      return renderLiteWreck(ctx,project,state,view);
    }
  }
  const pose=[state?.x??0,state?.y??0,state?.z??0,state?.yaw??0,state?.pitch??0,!!state?.lamp];
  const same=l.pose?.every((value,index)=>value===pose[index]);
  const quality=w>1000?.77:.88, sw=Math.ceil(w*quality),sh=Math.ceil(h*quality);
  if(!same||l.c.width!==sw||l.c.height!==sh){
    if(l.c.width!==sw||l.c.height!==sh){l.c.width=sw;l.c.height=sh;}
    l.g.clearRect(0,0,sw,sh);
    const projectSmall=(p)=>{const q=project(p);return {x:q.x*(sw/w),y:q.y*(sh/h),z:q.z};};
    renderLiteWreck(l.g,projectSmall,state,{w:sw,h:sh,t});
    l.pose=pose;
  }
  ctx.drawImage(l.c,0,0,w,h);
}
