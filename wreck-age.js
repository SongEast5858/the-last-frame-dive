// Original procedural wreck-weathering adjunct. Close hull, decks and passage differ
// by substrate and shelter; no photo or texture of a named real wreck is reused.
export const AGE_PALETTE=Object.freeze({
  ironWorn:0x4a5554, ironOxide:0x6e5140, ironUnderpaint:0x73736a, ironPits:0x253737,
  greenFilm:0x4e6e59, coralline:0x927867, encrust:0x909481, paleBarnacle:0xa6a292,
  spongeOchre:0xa28f60, spongeGrey:0x748b7c, mussel:0x4f6157,
  brassTarnish:0x61674e, verdigrisDark:0x51766a, waterloggedOak:0x554c43,
  deckSilt:0x777766, siltShadow:0x5f6d66, saltWood:0x797269, tileDebris:0x7b8072, paintChip:0xa1a49a
});
export function addWreckAge({P,poly,beam,hull,hx,detail}){
  let s=0x7db90495;
  const rand=()=>((s=(Math.imul(s,1664525)+1013904223)|0)>>>0)/4294967296;
  const R=(a,b)=>a+(b-a)*rand(), lim=(x,a,b)=>Math.max(a,Math.min(b,x));
  const q1=detail>=1?1:.66;
  const hullAt=(side,y,z,offset=.024)=>P(hx(z,y,side)+side*offset,y,z);
  const support=(a,b,mat,r=.04)=>beam(a,b,mat,r,.021);
  const weathered=['ironWorn','ironOxide','ironUnderpaint','greenFilm','ironPits','coralline'];
  const matNear=(i,a)=>a[(i+(rand()*a.length|0))%a.length];
  function hullOK(side,y,z,wY,wZ){
    const [w,d,k]=hull(z);
    if(w<1.36||y+wY>d-.044||y-wY<k+.10)return false;
    if(side<0&&z+wZ>-17.35&&z-wZ<-11.70&&y+wY>-10.33&&y-wY<-6.59)return false;
    if(side>0&&z+wZ>22.28&&z-wZ<23.74&&y+wY>-7.98&&y-wY<-6.81)return false;
    return Math.abs(z)+wZ<48.0;
  }
  // Spatially stable paint-loss islands and pits follow panels, anode zones, and the current-washed shoulder.
  function skin(side,y,z,ry,rz,key,gain=1,thin=.023){
    if(!hullOK(side,y,z,ry,rz))return;
    const n=6+(rand()*3|0), ring=[];
    for(let j=0;j<n;j++){
      const a=(j+R(-.15,.15))*Math.PI*2/n, w=R(.74,1);
      ring.push(hullAt(side,y+Math.sin(a)*ry*w,z+Math.cos(a)*rz*w,thin+R(0,.011)));
    }
    const c=hullAt(side,y+R(-.19,.20)*ry,z+R(-.16,.17)*rz,thin+.027);
    for(let i=0;i<n;i++){
      const dim=R(-13,10)*gain;
      poly([ring[i],ring[(i+1)%n],c],i%6===0&&key!=='ironPits'&&gain>1.01?'ironUnderpaint':key,dim,1,.019);
    }
  }
  let rows=0;
  for(const side of [-1,1]){
    // Pipe/marine algal marks are clustered around welds, scuppers and cathodically protected surfaces.
    const major=[[-8.47,-32,1.53,5.45],[-7.52,-23,1.18,5.20],[-10.71,-8,1.17,10.27],[-7.70,8,1.12,5.15],[-8.38,18,1.12,4.20],[-7.90,30,1.18,4.60],[-9.22,38,.98,4.58],[-10.70,41,.57,2.94]];
    for(const [Y,Z,RY,RZ] of major){
      const n=Math.round(12*q1);
      for(let i=0;i<n;i++){
        const y=Y+R(-1,1)*RY,z=Z+R(-1,1)*RZ;
        const ry=R(.075,.37)*(i%4===0?1.58:1),rz=R(.168,1.08)*(i%5===0?1.48:1);
        const key=matNear(i,weathered);
        skin(side,y,z,ry,rz,key,i%3?1:1.14);
        if(i%2===0&&hullOK(side,y,z,.06,.057)){
          const a=hullAt(side,y+.035,z,.048), b=hullAt(side,y-R(.11,.22),z+R(-.05,.06),.058);
          support(a,b,i%3?'ironOxide':'ironPits',R(.012,.029));
        }
      }
    }
    // Hull panel butt-straps, individual dark failed bolt seats and rows of dull fasteners casting silhouettes.
    const buttRuns=[-37,-31.5,-26.5,-21,-17.64,-11.65,-7.0,-2.2,2.95,8.6,13.4,18.1,21.6,25.9,30.65,35.36,40.65,44.5];
    for(let j=0;j<buttRuns.length;j++){
      const z=buttRuns[j]+R(-.15,.16), y0=R(-12.65,-11.38), top=R(-7.83,-7.13);
      if(j%4!==1&&hullOK(side,(y0+top)*.5,z,(top-y0)*.48,.10)){
        support(hullAt(side,y0,z,.028),hullAt(side,top,z+R(-.11,.12),.021),'ironPits',.014);
      }
      for(let k=0;k<8;k++){
        const y=y0+k*(top-y0)/8, off=R(.039,.068);
        for(const B of (j%4===1?[-.08]:[-.091,.113])){
          if(rand()<.14||!hullOK(side,y,z+B,.035,.043))continue;
          const a=hullAt(side,y-.025,z+B,off),b=hullAt(side,y+.029,z+B+.018,off);
          support(a,b,rand()<.27?'encrust':'ironOxide',R(.020,.036));
        }
      }
      rows++;
    }
    // A dented shell strake bends around a localized failure, without moving the navigation envelope.
    for(const [z,lo,hi,length] of [[25.35,-9.44,-8.88,3.6],[-27.9,-9.62,-8.92,4.35],[35.45,-8.89,-8.30,2.95]]){
      for(let j=0;j<6;j++){
        const a=z+(j/6-.5)*length,b=z+((j+1)/6-.5)*length, yA=lo+Math.cos(j*.66)*.08,yB=lo+Math.cos((j+1)*.66)*.08;
        if(!hullOK(side,(lo+hi)*.5,(a+b)*.5,(hi-lo)*.55,(b-a)*.63))continue;
        const bottomA=hullAt(side,yA,a,.03),bottomB=hullAt(side,yB,b,.029);
        const swell=Math.sin((j+.5)/6*Math.PI)*.095;
        const upperA=hullAt(side,hi+Math.sin(j*1.79)*.09,a,.05+swell),upperB=hullAt(side,hi+Math.sin((j+1)*1.79)*.09,b,.051+swell);
        poly([bottomA,bottomB,upperB,upperA],j%2?'ironWorn':'ironOxide',j%3*5-4,1,.029);
        support(upperA,upperB,j%3?'ironPits':'ironUnderpaint',.018);
      }
    }
    // Barnacle / tube-worm and sponge colonies grow on seams and the hull's exposed shoulders, not evenly everywhere.
    const bases=[[-8.05,4.9],[-7.43,14.15],[-8.12,18.45],[-8.14,25.60],[-7.58,31.40],[-8.82,34.80],[-8.22,41.7],[-11.20,-22.8],[-9.48,-32.7]];
    const colors=['encrust','greenFilm','paleBarnacle','spongeOchre','mussel','coralline','spongeGrey'];
    for(const [Y,Z] of bases){
      const n=Math.round((Z>10&&Z<37?20:12)*q1);
      for(let j=0;j<n;j++){
        const y=Y+R(-.47,.48), z=Z+R(-1.4,1.45), size=R(.022,.116)*(j%8===0?1.44:1);
        if(!hullOK(side,y,z,size+.055,size+.05))continue;
        const base=hullAt(side,y,z,.026), tip=hullAt(side,y+R(-.038,.04),z+R(-.046,.05),size*.42+.061);
        const c=colors[j%colors.length];
        colony(base,tip,size,c,side);
        if(j===7||j===14)skin(side,y,z,R(.06,.16),R(.14,.39),'greenFilm',.61,.014);
      }
    }
  }
  function colony(a,b,r,key,side){
    const steps=5, rim=[], lip=[];
    for(let i=0;i<steps;i++){
      const q=i/steps*2*Math.PI, ratio=R(.68,1.18);
      rim.push(P(a.x,a.y+Math.cos(q)*r*ratio,a.z+Math.sin(q)*r*ratio));
      lip.push(P(b.x,b.y+Math.cos(q)*r*.48,b.z+Math.sin(q)*r*.48));
    }
    for(let i=0;i<steps;i++){
      const j=(i+1)%steps;
      poly([rim[i],rim[j],lip[j],lip[i]],i===2?'mussel':key,R(-24,12),0,.029);
    }
    poly(lip,r>.080&&key!=='paleBarnacle'?'ironPits':'encrust',-14,0,.042);
  }
  // Quiet internal surfaces collect silt in edges and lee of collapsed structure.
  function floorDrape(x,y,z,rx,rz,key,relief=.047){
    const rim=[],N=7;
    for(let i=0;i<N;i++){
      const a=(i+R(-.22,.17))*Math.PI*2/N,w=R(.63,1.17);
      rim.push(P(x+Math.cos(a)*rx*w,y+.017+R(0,.014),z+Math.sin(a)*rz*w));
    }
    const c=P(x+rx*R(-.16,.14),y+relief,z+rz*.14);
    for(let i=0;i<N;i++)poly([rim[i],rim[(i+1)%N],c],key,R(-12,8),1,.018);
  }
  for(let j=0;j<Math.round(72*q1);j++){
    const sign=j%2===0?1:-1,z=R(-1.32,13),x=sign*R(1.67,3.06);
    floorDrape(x,-6.399,z,R(.084,.39),R(.24,1.16),j%4?'deckSilt':'siltShadow',R(.024,.065));
    if(j%9===0)floorDrape(x*.751,-6.398,z,R(.085,.19),R(.24,.61),'deckSilt',.036);
  }
  for(let i=0;i<Math.round(47*q1);i++){
    const sign=i%2===0?1:-1,z=R(-15.51,-7.98),x=sign*R(.86,2.69);
    floorDrape(x,-10.21,z,R(.10,.36),R(.17,.86),i%4?'siltShadow':'deckSilt',R(.022,.070));
  }
  // Damaged moulding: porous dark timber underneath and isolated rows of surviving tarnished metal.
  for(const side of [-1,1])for(let j=0;j<Math.round(30*q1);j++){
    const x=3.111*side,y=R(-6.07,-5.54),z=R(-1.11,12.52), h=R(.044,.13),len=R(.091,.43);
    const xi=x-.016*side;
    poly([P(xi,y-h,z-len),P(xi,y-h*1.27,z+len*.63),P(xi,y+h*.23,z+len),P(xi,y+h,z-len*.75)],j%3?'waterloggedOak':'saltWood',R(-19,8),1,.029);
    if(j%7===1)support(P(xi,y,z-len),P(xi,y+.012,z+len),'verdigrisDark',.018);
  }
  // A folded, genuinely bowed support and fractured lathe under the starboard balcony, confined outside the swim lane.
  for(const side of [-1,1]){
    const x=side*4.46,z=-5.66+(side>0?.83:0);
    const A=P(x,-9.91,z-.58),M=P(side*3.40,-7.87,z+.34),B=P(side*4.04,-3.05,z-.28);
    support(A,M,'ironOxide',.105);support(M,B,'ironWorn',.103);
    const C=P(x+.13*side,-8.95,z-.08),D=P(side*3.25,-6.67,z+.13),F=P(side*3.50,-6.29,z-.55);
    poly([A,C,D,M], 'ironOxide',-9,1,.041);
    poly([M,D,F], 'ironPits',-12,1,.041);
    support(D,F,'ironUnderpaint',.023);
    for(let j=0;j<5;j++){
      const z=(-6.36+j*.43)+(side>0?.4:0),x=side*R(2.3,3.18);
      const end=P(x+side*R(.1,.61),-10.18+R(.0,.05),z+R(-.28,.43));
      support(P(x,-10.13,z-.21),end,j%2?'ironOxide':'saltWood',R(.016,.043));
      if(j===1||j===4)floorDrape(x,-10.23,z,.23,.44,'tileDebris',.072);
    }
  }
  // Grimy trace behind the old portrait remains dark below; do not obscure the readable plaque/photograph.
  for(const sign of [-1,1])for(let j=0;j<18;j++){
    const x=sign*R(1.24,2.54), y=R(-9.80,-7.83), z=-15.49, rx=R(.019,.135),ry=R(.025,.13);
    poly([P(x-rx,y,z),P(x,y-ry,z+.017),P(x+rx,y,z),P(x+rx*.25,y+ry,z)],j%4?'verdigrisDark':'paintChip',R(-13,7),1,.038);
  }
  return rows;
}

// Low-resolution albedo wear replicated across the portable renderer by world facet UVs.
// No network/assets or additive screen grain: scratches move with the bent steel/planks.
const maps=new Map();
export function makeCanvasWearMap(kind){
  if(maps.has(kind))return maps.get(kind);
  let result=null;
  try{
    const N=128,c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(N,N):globalThis.document?.createElement('canvas');
    if(c){
      c.width=c.height=N;const g=c.getContext('2d'),data=g.createImageData(N,N);
      let seed=1750304893+kind.length*37627;
      const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)|0)>>>0)/4294967296;
      const lerp=(a,b,t)=>a+(b-a)*t, S=t=>t*t*(3-2*t), lim=(t,a=0,b=1)=>Math.max(a,Math.min(b,t));
      const grid=(n)=>{const A=Float32Array.from({length:n*n},rand);return(u,v)=>{
        const x=u*(n-1),y=v*(n-1),i=Math.floor(x),j=Math.floor(y),u0=S(x-i),v0=S(y-j),I=Math.min(n-1,i+1),J=Math.min(n-1,j+1);
        return lerp(lerp(A[n*j+i],A[n*j+I],u0),lerp(A[n*J+i],A[n*J+I],u0),v0);
      };};
      const [coarse,zones,rough,speck]=[grid(5),grid(13),grid(29),grid(66)];
      const metal=kind==='steel', brass=kind==='brass';
      for(let q=0;q<N;q++)for(let p=0;p<N;p++){
        const i=(q*N+p)*4, x=(p+.5)/N,y=(q+.5)/N;
        const Y=metal?lim(.22+y*.61+Math.sin(x*18)*.08):y;
        const p0=coarse(x,y),p1=zones(x,Y),p2=rough(x,y),p3=speck(x,y),fine=rand();
        const cell=.50*p0+.26*p1+.14*p2+.10*p3;
        const corrosion=lim((cell-.43)*2.8);
        const edge=lim((.06-y)*4.8)+lim((y-.94)*3.0);
        const grain=brass?.16:metal?.26:p3*.16+.03;
        const chroma=.56*p1+.44*p0;
        const pit=(p3*.59+fine*.41)<.20&&p2<.49;
        let rgb;
        if(pit)rgb=metal?[18,34,34]:[29,44,38];
        else if(chroma>.62)rgb=metal?[107,75,49]:brass?[90,109,88]:[128,125,101];
        else if(chroma>.44)rgb=metal?[65,83,69]:brass?[100,100,75]:[110,109,87];
        else rgb=metal?[57,75,69]:[52,66,56];
        const strength=lim(.02+corrosion*.72+grain*Math.abs(p3-.46)+edge+(pit?.23:0),.025,.69);
        const sharp=.77+.33*p2+.11*p3+.11*(fine-.5);
        data.data[i]=rgb[0]*sharp;data.data[i+1]=rgb[1]*sharp;data.data[i+2]=rgb[2]*sharp;data.data[i+3]=strength*255;
      }
      g.putImageData(data,0,0);result=c;
    }
  }catch{}
  maps.set(kind,result);return result;
}
