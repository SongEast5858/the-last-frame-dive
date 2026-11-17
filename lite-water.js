import {fishPose, kelpPlaces, makeFishPopulation, REEF_FORMATIONS, SPECIES, fieldRand, kelpSway, reefVents, bubblePose, benthicColonies, COLONY_PALETTES} from './reef.js?v=12';
import {seabedHeight as bedY,sedimentMask,sceneStoneVolumes,sharedClasts} from './seabed-landforms.mjs?v=12';

// Perspective Canvas rendering for devices without WebGL. This is not a static ship photo.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(i,k=1)=>((Math.imul(i+491,k*17239+7177)>>>0)%953)/953;
const fish=makeFishPopulation().flat();
function path(ctx,points){ctx.beginPath();for(let i=0;i<points.length;i++) i?ctx.lineTo(points[i].x,points[i].y):ctx.moveTo(points[i].x,points[i].y);}
// Sand/stone fixes are placed on the seabed, not painted at fixed screen pixels.
const SURFACE_RADII=[1,.81,.46,.18];
const ROCK_SECTIONS=9;
function volumeFaces(form,i){
  const ring=[],faces=[];
  const ground=bedY(form.x,form.z),top=Math.max(ground+.70,form.y+form.sy*.90);
  const shift=hash(i,117)*.37;
  for(let q=0;q<SURFACE_RADII.length;q++){
    const row=[],rad=SURFACE_RADII[q];ring.push(row);
    for(let j=0;j<ROCK_SECTIONS;j++){
      const a=j/ROCK_SECTIONS*Math.PI*2+shift,rough=.90+hash(i*31+j,121)*.22;
      const x=form.x+form.sx*rad*rough*Math.cos(a)+form.sx*q*.061,
        z=form.z+form.sz*rad*rough*Math.sin(a)+form.sz*q*.037;
      const bottom=bedY(x,z)-.08-.09*hash(i*24+j,25);
      const y=q===0?bottom:(ground+(top-ground)*[0,.46,.79,.98][q]+
        (hash(i*219+j*13+q,91)-.44)*form.sy*.255);
      row.push({x,y,z});
    }
  }
  const add=(a,b,c)=>{
    const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const x=(a.x+b.x+c.x)/3,y=(a.y+b.y+c.y)/3,z=(a.z+b.z+c.z)/3;
    const sign=ny<0?-1:1,len=Math.hypot(nx,ny,nz)||1;
    faces.push({a,b,c,x,y,z,nx:sign*nx/len,ny:sign*ny/len,nz:sign*nz/len});
  };
  for(let q=0;q<ring.length-1;q++)for(let j=0;j<ROCK_SECTIONS;j++){
    const k=(j+1)%ROCK_SECTIONS,a=ring[q][j],b=ring[q][k],c=ring[q+1][k],d=ring[q+1][j];
    add(a,b,c);add(a,c,d);
  }
  const hub={x:form.x+form.sx*.201,y:top,z:form.z+form.sz*.127};
  for(let j=0;j<ROCK_SECTIONS;j++)add(ring.at(-1)[j],ring.at(-1)[(j+1)%ROCK_SECTIONS],hub);
  return {...form,faces,top};
}
const liteLedges=(()=>{
  const forms=REEF_FORMATIONS.slice();
  for(let i=0;i<24;i++){
    const z=-49+hash(i,2)*139,x=(i%2?-1:1)*(14+hash(i,6)*37);
    forms.push({x,y:-15.8,z,sx:1.45+hash(i,83)*4.3,sy:.95+hash(i,61)*3.9,sz:1.2+hash(i,7)*2.6});
  }
  return forms.map(volumeFaces).concat(sceneStoneVolumes());
})();
function faceHeight(x,z,f){
  const {a,b,c}=f,den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
  if(Math.abs(den)<1e-5)return -100;
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,
    v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,w=1-u-v;
  return Math.min(u,v,w)<-1e-5?-100:u*a.y+v*b.y+w*c.y;
}
export function liteContactHeight(x,z){
  let y=bedY(x,z);
  for(const rock of liteLedges){
    if(Math.abs(x-rock.x)>rock.sx*1.3||Math.abs(z-rock.z)>rock.sz*1.3)continue;
    for(const f of rock.faces)y=Math.max(y,faceHeight(x,z,f));
  }
  return y;
}
const seabedObjects=(()=>{
  const rng=fieldRand(7152439), out=[];
  const colonies=[
    [-21,32,9,12],[17,55,8,10],[-13,67,8,12],[22,17,11,14],[-15,-17,9,11],[27,-44,10,14],
    [-18,99,11,16],[32,82,9,10],[20,-26,10,11],[-22,-46,10,13],
    [10.7,70,2.7,4.5],[-.7,81,3.3,5.7],[13.3,64,3.9,4.8],
  ];
  for(let i=0;i<1095;i++){
    const c=i<780?colonies[i%colonies.length]:null,az=rng(0,6.283);
    const x=c?c[0]+Math.cos(az)*c[2]*rng(.5,1.34):rng(-72,72),
      z=c?c[1]+Math.sin(az)*c[3]*rng(.5,1.34):rng(-85,146);
    const clear=(Math.abs(x)<8.4 && z<43 && z>-32)||(x>4.4&&x<10.2&&z>52&&z<80);
    if(clear&&rng()<.72)continue;
    const wide=((c?.08:.04)+Math.pow(rng(),2.0)*(c?.68:.28))*(clear?.54:1),
      kind=rng(),tone=rng(),a=rng(0,6.283),y=bedY(x,z);
    out.push({x,y,z,wide,kind,tone,a});
  }
  for(const c of sharedClasts()){
    const kind=c.kind==='shell'?.735:c.kind==='pale'?.33:.18;
    const tone=c.kind==='pale'?.83:c.kind==='rough'?.55:.42;
    out.push({x:c.x,y:bedY(c.x,c.z),z:c.z,wide:c.size,kind,tone,a:c.yaw,clast:c.kind});
  }
  return out;
})();
// Inverse camera projection on a downsampled silt image. Texture remains fixed in
// world coordinates, and its small waves naturally converge toward the horizon.
const zNoise=(()=>{const r=fieldRand(126011),a=new Float32Array(128*128);for(let i=0;i<a.length;i++)a[i]=r();return a;})();
const seabedTiles=new WeakMap();
function floorNoise(x,z){
  let i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  i&=127;j&=127;const k=(i+1)&127,d=((j+1)&127)*128,c=j*128;
  const q=zNoise[c+i]+(zNoise[c+k]-zNoise[c+i])*u,r=zNoise[d+i]+(zNoise[d+k]-zNoise[d+i])*u;
  return q+(r-q)*v;
}
function paintSediments(ctx,state,w,h,time){
  let buf=seabedTiles.get(ctx);
  if(!buf){
    const image=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):
      typeof document!=='undefined'?document.createElement('canvas'):null;
    if(!image)return;
    const g=image.getContext('2d');if(!g)return;
    buf={image,g,data:null};seabedTiles.set(ctx,buf);
  }
  const pitch=state.pitch??0,yaw=state.yaw??0;
  // Canvas lacks fragment shaders. 160-256 samples across span the broad geology;
  // filtered bilinear enlargement keeps the high cadence fallback affordable.
  const sw=clamp(Math.round(w*.21),132,238),sh=clamp(Math.round(h*sw/w),81,163);
  if(buf.image.width!==sw||buf.image.height!==sh||!buf.data){
    buf.image.width=sw;buf.image.height=sh;buf.data=buf.g.createImageData(sw,sh);buf.last=null;
  }
  const D=buf.data.data,cx=state.x??0,cy=state.y??0,cz=state.z??0;
  const draw=()=>{ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(buf.image,0,0,w,h);ctx.restore();};
  // Keep aim/depth updates fully responsive. Only the slow caustic shimmer can
  // be cached between frames when the diver has actually stopped moving.
  const frameT=state.reducedMotion?0:time;
  if(buf.last&&Math.abs(frameT-buf.last[0])<.08&&buf.last[1]===cx&&buf.last[2]===cy&&
    buf.last[3]===cz&&buf.last[4]===pitch&&buf.last[5]===yaw){draw();return;}
  buf.last=[frameT,cx,cy,cz,pitch,yaw];
  const cp=Math.cos(pitch),sp=Math.sin(pitch),ca=Math.cos(yaw),sa=Math.sin(yaw),aspect=w/h;
  const df=Math.max(.08,cy+17.6);
  const anim=state.reducedMotion?0:time*.32;
  for(let j=0;j<sh;j++){
    const vy=(.5-(j+.5)/sh)/.84,dy=sp+vy*cp,f=cp-vy*sp;
    const dist=-df/dy;
    if(dy>-.026||dist>95){D.fill(0,j*sw*4,(j+1)*sw*4);continue;}
    const haze=Math.exp(-dist*.031);
    const fade=clamp((87-dist)/22,0,1)*.94;
    const gritFade=clamp((30-dist)/22,0,1);
    for(let i=0;i<sw;i++){
      const v=((i+.5)/sw-.5)*aspect/.84;
      const wx=v*ca-f*sa,wz=-v*sa-f*ca;
      const dBed=(bedY(cx+dist*wx,cz+dist*wz)-cy)/dy;
      const d=clamp(dBed,dist-3,dist+3);
      const x=cx+d*wx,z=cz+d*wz;
      const macro=floorNoise(x*.077,z*.066),seam=floorNoise(x*.21+9,z*.24+17);
      const bent=floorNoise(x*.246+27,z*.271+7),bed=sedimentMask(x,z);
      const mask=clamp((macro-.26)*1.58+seam*.19,.02,1);
      const breakwater=clamp((floorNoise(x*.39+81,z*.37+15)-.15)*1.74,.04,1);
      // Repeated currents make roughly parallel ridges, softly weaving and
      // forking with basin-scale phase, never perfect diagonal lines.
      const phase=x*1.73+z*3.14+3.80*macro+2.89*seam+1.20*bent;
      const crossPhase=x*3.39-z*1.39+4.31*bent+1.66*seam;
      const shape=.69*Math.sin(phase)+.27*Math.sin(phase*2.0-1.13);
      const cross=.42*Math.sin(crossPhase)+.23*Math.sin(crossPhase*2.0);
      const ripple=(shape*mask*.67*breakwater+cross*(1-mask)*.75)*clamp((46-dist)/28,0,1)*(1-bed.rubble*.72)*(1-bed.lee*.42);
      const sharp=.65*(floorNoise(x*2.19+38,z*2.47+48)-.5)+.35*(floorNoise(x*4.97+19,z*5.89+35)-.5);
      const foam=(Math.sin(x*.53+z*.33+Math.sin(z*.55)*1.83+anim)+
        Math.cos(x*.63-z*.62+Math.sin(x*.44)*1.68-anim*.6));
      const caustic=Math.pow(Math.max(0,1-Math.abs(foam)*1.8),4)*.12;
      const hashGrain=clamp((sharp-.06)*4.5,0,1);
      const sand=.77+.35*macro+.18*seam+.36*ripple+.28*sharp*gritFade+caustic+
        (.125+.22*hashGrain*gritFade)*bed.shell - .17*bed.rubble*(.27+.73*seam) - .13*bed.lee;
      const darkPatch=clamp((seam*.51+bent*.49-.63)*3.15,0,.47);
      const j4=(j*sw+i)*4;
      D[j4]=(29+(96-29)*haze+bed.shell*8*haze)*sand*(1-darkPatch*.38);
      D[j4+1]=(69+(108-69)*haze)*sand*(1-darkPatch*.23);
      D[j4+2]=(78+(70-78)*haze)*sand*(1-darkPatch*.24);
      D[j4+3]=255*fade;
    }
  }
  buf.g.putImageData(buf.data,0,0);
  draw();
}

function paintSeabed(ctx,project,state,w,h,time){
  paintSediments(ctx,state,w,h,time);
  const visible=[];
  for(const item of seabedObjects){
    if(Math.abs(item.x-state.x)>50||Math.abs(item.z-state.z)>62)continue;
    const q=project(item);
    if(q.visible&&q.z>1.3&&q.z<49&&q.y>-20&&q.y<h+25&&q.x>-28&&q.x<w+28&&h*item.wide/q.z>.58)visible.push({item,q});
  }
  visible.sort((a,b)=>b.q.z-a.q.z);
  for(const {item:d,q} of visible){
    const scale=h*.84*d.wide/q.z;
    if(scale<.58)continue;
    const dark=clamp(Math.exp(-q.z*.048),.08,.90);
    ctx.save();ctx.translate(q.x,q.y);
    ctx.rotate(.73*Math.sin(d.a)+(state.yaw??0)*.16);
    ctx.globalAlpha=dark*.68;ctx.fillStyle='#132f29';
    ctx.beginPath();ctx.ellipse(scale*.12,scale*.12,scale*1.22,scale*.45,0,0,6.283);ctx.fill();
    if(d.kind<.53){
      // Angular rubble, slate flats and broken sand dollar fragments in talus patches.
      ctx.globalAlpha=dark;
      ctx.fillStyle=d.clast==='pale'?'#a29a77':d.tone<.24?'#665e42':d.tone<.65?'#536455':'#786e50';
      ctx.beginPath();ctx.moveTo(-scale,-.03*scale);ctx.lineTo(-.49*scale,-.59*scale);
      ctx.lineTo(.26*scale,-.65*scale);ctx.lineTo(.99*scale,-.15*scale);
      ctx.lineTo(.68*scale,.27*scale);ctx.lineTo(-.33*scale,.34*scale);ctx.closePath();ctx.fill();
      if(scale>2.8){
        ctx.strokeStyle=d.tone<.58?'#9a9e72':'#99926b';
        ctx.globalAlpha=dark*.64;ctx.lineWidth=clamp(scale*.054,.54,1.9);
        ctx.beginPath();ctx.moveTo(-.54*scale,-.52*scale);ctx.lineTo(.22*scale,-.54*scale);ctx.lineTo(.62*scale,-.31*scale);ctx.stroke();
        ctx.strokeStyle='#243a30';ctx.beginPath();ctx.moveTo(-.72*scale,-.13*scale);ctx.lineTo(.24*scale,-.20*scale);ctx.lineTo(.57*scale,.02*scale);ctx.stroke();
      }
    }else if(d.kind<.80){
      ctx.globalAlpha=dark*.81;ctx.fillStyle=d.clast==='shell'?'#b1a28b':d.tone<.5?'#ab926d':'#879078';
      ctx.beginPath();ctx.ellipse(0,-.23*scale,scale*.84,scale*.49,.15,0,6.283);ctx.fill();
      if(scale>1.9){
        ctx.globalAlpha=dark*.61;ctx.strokeStyle='#4a5745';ctx.lineWidth=clamp(scale*.08,.42,1.2);
        for(let k=-1;k<=1;k++){
          ctx.beginPath();ctx.moveTo(-.38*scale,.02*scale);
          ctx.quadraticCurveTo(.12*scale,k*.44*scale,(.31+k*.10)*scale,(k-.37)*.32*scale);ctx.stroke();
        }
      }
    }else{
      // Windrow-like benthic growth is kept around rocks, below the navigation corridor.
      const sway=Math.sin(time*.55+d.a);
      ctx.globalAlpha=dark*.95;ctx.strokeStyle=d.tone<.48?'#8f8d51':'#6a8656';
      ctx.lineWidth=clamp(scale*.18,.58,3.2);ctx.lineCap='round';
      for(let k=-1;k<=1;k++){
        ctx.beginPath();ctx.moveTo(scale*k*.26,0);
        ctx.quadraticCurveTo(scale*k*.54,scale*-.57,scale*(k*.75+sway*.21),scale*(-1.28-.42*(k===0)));ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

const surfaceSamples=new WeakMap();
function paintCeiling(ctx,state,w,h,time){
  const pitch=state.pitch??0,yaw=state.yaw??0,alt=25-(state.y??0);
  if(alt<=.13||pitch<-.59||alt>47)return;
  let c=surfaceSamples.get(ctx);
  if(!c){
    const image=typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):
      typeof document!=='undefined'?document.createElement('canvas'):null;
    if(!image)return;
    const g=image.getContext('2d');if(!g)return;
    c={image,g,data:null};surfaceSamples.set(ctx,c);
  }
  const W=clamp(Math.round(w*.129),104,152),H=clamp(Math.round(h*W/w),62,110);
  if(c.image.width!==W||c.image.height!==H||!c.data){
    c.image.width=W;c.image.height=H;c.data=c.g.createImageData(W,H);
  }
  const out=c.data.data,cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),aspect=w/h;
  const frame=state.reducedMotion?0:time,ox=state.x??0,oz=state.z??0;
  for(let j=0;j<H;j++){
    const v=(.5-(j+.5)/H)/.84,dy=sp+v*cp,forward=cp-v*sp,depth=alt/dy;
    if(dy<.05||depth>155){out.fill(0,j*W*4,(j+1)*W*4);continue;}
    for(let i=0;i<W;i++){
      const u=((i+.5)/W-.5)*aspect/.84;
      const wx=(u*cy-forward*sy),wz=(-u*sy-forward*cy),x=ox+wx*depth,z=oz+wz*depth;
      const rip1=x*.41+z*.66+frame*.62,rip2=x*.82-z*.27-frame*.47;
      const roll=.72*Math.sin(rip1)+.28*Math.sin(rip2);
      const normal=.055*Math.cos(rip1)+.044*Math.cos(rip2)+.019*Math.cos(rip2*1.55+rip1*.38);
      const nadir=dy/Math.sqrt(1+u*u+v*v);
      // 1 / 1.333 is the critical sine for water-air incidence; zenith goes bright.
      const crit=clamp(((nadir+normal)-.624)/.09,0,1),window=crit*crit*(3-2*crit);
      const deep=Math.exp(-depth*.014),glint=Math.pow(clamp(.54+.58*roll,0,1),4.8);
      const texture=floorNoise(x*.31+22,z*.30+12)-.47;
      const sheen=Math.pow(clamp(1-2.2*Math.abs(Math.sin(rip1*1.39+.42*Math.sin(rip2))+
        .52*Math.sin(rip2*1.22-.34*Math.sin(rip1))),0,1),2.35)*(.38+.62*window);
      const solar=Math.pow(clamp((-.23*wx+.91*dy+.3*wz)/Math.sqrt(1+u*u+v*v),0,1),28)*window;
      const p=(j*W+i)*4;
      out[p]=20+deep*(9+77*window+glint*22+texture*15+sheen*34+solar*39);
      out[p+1]=64+deep*(16+119*window+glint*34+texture*26+sheen*39+solar*31);
      out[p+2]=76+deep*(17+101*window+glint*34+texture*24+sheen*29+solar*20);
      out[p+3]=deep*(31+155*window+41*glint);
    }
  }
  c.g.putImageData(c.data,0,0);ctx.drawImage(c.image,0,0,w,h);
}

function paintRockLedges(ctx,project,state,w,h){
  const ledges=liteLedges.map((rock,i)=>({rock,i,at:project({x:rock.x,y:rock.y,z:rock.z})}))
    .filter(({rock,at})=>at.z>-rock.sz*.65&&at.z<82&&at.x>-w*.38&&at.x<w*1.38)
    .sort((a,b)=>b.at.z-a.at.z);
  // Ground-projected contact shadows for newly added clasts. Draw them before
  // rock faces, so a visual contact cannot obscure the actual surface.
  for(const {rock,at} of ledges){
    if(!rock.site||at.z<1.3||at.z>48)continue;
    const x=rock.x+.31,z=rock.z-.24;
    const onBed=(a,b)=>project({x:a,y:bedY(a,b)+.018,z:b});
    const a=onBed(x,z),b=onBed(x+rock.sx*1.03,z),c=onBed(x,z+rock.sz*.97);
    if(Math.min(a.z,b.z,c.z)<1.0||!a.visible||a.y>h+140||a.y< -110)continue;
    const xx=b.x-a.x,xy=b.y-a.y,yx=c.x-a.x,yy=c.y-a.y;
    if(Math.abs(xx*yy-xy*yx)<6||Math.max(Math.hypot(xx,xy),Math.hypot(yx,yy))>w*.86)continue;
    const opacity=.31*Math.exp(-at.z*.039);
    ctx.save();ctx.transform(xx,xy,yx,yy,a.x,a.y);
    const shade=ctx.createRadialGradient(0,0,.16,0,0,1.22);
    shade.addColorStop(0,'rgba(1,13,17,'+opacity+')');
    shade.addColorStop(.55,'rgba(1,13,17,'+(opacity*.72)+')');
    shade.addColorStop(1,'rgba(1,13,17,0)');
    ctx.fillStyle=shade;ctx.fillRect(-1.23,-1.23,2.46,2.46);ctx.restore();
  }
  for(const {rock,i,at} of ledges){
    const alpha=clamp(Math.exp(-Math.max(1,at.z)*.023),.13,.96);
    const list=[];
    for(const f of rock.faces){
      if(f.nx*(state.x-f.x)+f.ny*(state.y-f.y)+f.nz*(state.z-f.z)<-.08)continue;
      const a=project(f.a),b=project(f.b),c=project(f.c);
      if(Math.min(a.z,b.z,c.z)<.62||Math.max(a.x,b.x,c.x)<-10||Math.min(a.x,b.x,c.x)>w+10||
         Math.min(a.y,b.y,c.y)>h+12||Math.max(a.y,b.y,c.y)<-13)continue;
      list.push({f,pts:[a,b,c],z:(a.z+b.z+c.z)/3});
    }
    list.sort((a,b)=>b.z-a.z);
    for(const {f,pts} of list){
      const slope=clamp(f.ny*.74-f.nx*.20+f.nz*.20,.06,.96);
      const hRel=clamp((f.y-bedY(f.x,f.z))/Math.max(1,rock.top+17.5),0,1);
      const tonal=.67+.30*slope+.11*hRel,green=.89+.16*hash(i*38+Math.floor(f.y*3),17);
      // Pre-tint the volume toward water color rather than giving every face
      // partial alpha. Otherwise overlapping antialiased edges read as wireframe.
      const cold=rock.site?1.07:1,mist=(1-alpha)*.91;
      const R=54*tonal*green*cold,G=83*tonal*green*(rock.site?.97:1),B=84*tonal*(rock.site?.90:1);
      ctx.fillStyle=`rgb(${Math.round(R+(24-R)*mist)},${Math.round(G+(61-G)*mist)},${Math.round(B+(69-B)*mist)})`;
      ctx.strokeStyle=ctx.fillStyle;ctx.globalAlpha=.98;ctx.lineWidth=.55;
      path(ctx,pts);ctx.closePath();ctx.fill();ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
}

export function paintWater(ctx,project,state,w,h,t,plate) {
  const pitch=state.pitch??0,yaw=state.yaw??0;
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#2d797f');bg.addColorStop(.30,'#155764');bg.addColorStop(.66,'#0a3949');bg.addColorStop(1,'#041d2a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  if(plate?.naturalWidth){
    const zoom=Math.max(w/plate.naturalWidth,h/plate.naturalHeight)*1.34;
    const dw=plate.naturalWidth*zoom,dh=plate.naturalHeight*zoom;
    ctx.globalAlpha=.64;
    ctx.drawImage(plate,(w-dw)/2+Math.sin(yaw)*w*.12,(h-dh)/2+pitch*h*.22,dw,dh);
    ctx.globalAlpha=1;
  }
  paintCeiling(ctx,state,w,h,t);
  paintSeabed(ctx,project,state,w,h,t);
  paintRockLedges(ctx,project,state,w,h);
  // Soft forward-scattered shafts. Lateral opacity fades to zero rather
  // than leaving the hard polygon sides from the first canvas version.
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<7;i++){
    const x=w*(.13+i*.105)+Math.sin(i*2.2+t*.33)*w*.012+ Math.sin(yaw)*w*.18;
    const target=x+w*(.12+(i%4)*.063),height=h*(1.35+hash(i,21)*.32);
    const a=(.033+hash(i,4)*.059)*clamp(1+pitch*.70,.08,1.48);
    ctx.save();ctx.translate((x+target)*.5,h*.27);
    ctx.rotate(Math.atan2(x-target,height));
    ctx.scale(w*(.027+hash(i,5)*.035),height*.5);
    const c=ctx.createRadialGradient(0,-.18,0,0,-.18,1);
    c.addColorStop(0,'rgba(135,236,207,'+a+')');c.addColorStop(.39,'rgba(97,181,169,'+a*.53+')');
    c.addColorStop(1,'rgba(69,142,151,0)');
    ctx.fillStyle=c;ctx.fillRect(-1.3,-1.3,2.6,2.6);ctx.restore();
  }
  ctx.globalCompositeOperation='source-over';
}
// Plan-view slice of Abyssal Garden's helical kelp and circular blade model.
const blades=[];
for(const [i,place] of kelpPlaces(liteContactHeight).entries()){
  const p={...place,y:liteContactHeight(place.x,place.z)-.09};
  const r=fieldRand(5451+i*575),strands=p.near?1+(r()<.66?1:0):1;
  const short=i%7===2||i%9===3, ribbon=i%5===1||short;
  const H=short?p.h*r(.15,.36):p.h*r(.58,1.01);
  const ph=r(0,Math.PI*2),tw=r(.08,.30),sr=r(.17,.49),sc=r(.68,1.14),la=r(0,Math.PI*2),lm=r(.006,.12);
  const stem=(s,h)=>{
    const a=ph+s*Math.PI*2/strands+h*tw,r=sr*(1-.6*h/H),ln=lm*h*h/H;
    return [p.x+Math.cos(a)*r+Math.cos(la)*ln,p.z+Math.sin(a)*r+Math.sin(la)*ln];
  };
  const stems=[];
  for(let s=0;s<strands;s++){
    const samples=[];for(let ht=0;ht<H;ht+=1.55){const [x,z]=stem(s,ht);samples.push({x,y:p.y+ht,z,ht});}
    stems.push(samples);
  }
  const leaves=[];
  const count=Math.max(6,Math.round(H*(p.near?1.44:.92)));
  for(let j=0;j<count;j++){
    const t=.06+.89*Math.pow(r(),short?1.35:.70),ht=t*H,[x,z]=stem(Math.floor(r(0,strands)),ht),dir=r(0,Math.PI*2);
    const L=((.36+.79*r()*r())*(1-.40*t*t)*sc+.30)*r(short?.67:1.24,short?1.66:2.25);
    const tilt=(1-t)*r(.48,1.19)+t*r(.20,.69),k=r(.23,1.11)-.27;
    leaves.push({x,y:p.y+ht,z,ht,dir,L,tilt,k,width:L*r(ribbon?.083:.15,ribbon?.14:.28)+.025,
      j,ribbon,notch:r(.20,.82),damage:r(),bladder:!ribbon&&r()<.31});
  }
  blades.push({p:{...p,h:H},stems,leaves,amber:r()<.44});
}
const vents=reefVents(),colonies=benthicColonies(liteContactHeight);
function paintBenthic(ctx,project,w,h){
  const visible=[];
  for(const a of colonies){
    const base=project(a);
    if(!base.visible||base.z<.85||base.z>46||base.x<-26||base.x>w+26||base.y<-28||base.y>h+26)continue;
    if(a.scale*h*.84/base.z<.56)continue;
    visible.push({a,base});
  }
  visible.sort((A,B)=>B.base.z-A.base.z);
  ctx.lineCap='round';
  for(const {a,base} of visible){
    const {scale:s,type}=a, sc=s*h*.84/base.z,rng=fieldRand(a.seed), colors=COLONY_PALETTES[type];
    const gain=clamp(.92*Math.exp(-base.z*.039),.09,.86);
    ctx.globalAlpha=gain*.69;ctx.fillStyle='#23302e';ctx.beginPath();
    ctx.ellipse(base.x,base.y+.21*sc,.90*sc,.25*sc,a.tilt,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=gain;
    if(type===0){
      const apex=project({x:a.x+s*.16,y:a.y+s*.95,z:a.z}),r=sc*.81;
      ctx.strokeStyle=colors[0];ctx.lineWidth=Math.max(.45,sc*.65);ctx.beginPath();
      ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(base.x+.07*sc,base.y-.64*sc,apex.x,apex.y);ctx.stroke();
      ctx.fillStyle=colors[1];ctx.beginPath();ctx.ellipse(apex.x,apex.y,r,r*.43,.04,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=Math.max(.42,r*.16);ctx.strokeStyle=colors[2];
      const m=sc>5?14:7;
      for(let k=0;k<m;k++){
        const t=rng(-.12,.12)+k*Math.PI*2/m,x=Math.cos(t),y=Math.sin(t),l=rng(.68,1.08);
        ctx.beginPath();ctx.moveTo(apex.x+x*.30*r,apex.y+y*.15*r);
        ctx.quadraticCurveTo(apex.x+x*.75*r,apex.y+y*.38*r-.22*r,apex.x+x*r*l,apex.y+y*r*.53*l);ctx.stroke();
      }
    }else if(type===1){
      ctx.save();ctx.translate(base.x,base.y-sc*.07);ctx.rotate(.64*Math.sin(a.u));
      ctx.fillStyle=colors[1];ctx.strokeStyle=colors[2];ctx.lineWidth=Math.max(.4,.06*sc);
      ctx.beginPath();ctx.moveTo(-sc*.82,0);
      ctx.bezierCurveTo(-sc*.52,-sc*.24,-sc*.02,-sc*.54,sc*.69,-sc*.37);
      ctx.bezierCurveTo(sc*.94,-sc*.20,sc*.77,sc*.20,-sc*.82,0);ctx.fill();if(sc>2.4)ctx.stroke();
      ctx.restore();
    }else{
      for(let k=0;k<3;k++){
        const p=.59*sc,q=rng(.41,.64)*sc,x=base.x+Math.cos(a.u+k*2.1)*p,y=base.y+Math.sin(a.u+k*2.1)*p*.36-q*.30;
        ctx.fillStyle=k===1?colors[2]:colors[1];
        ctx.beginPath();ctx.ellipse(x,y,q,q*.66,rng(-.36,.36),0,Math.PI*2);ctx.fill();
        if(sc>1.6){ctx.fillStyle=colors[0];ctx.beginPath();ctx.ellipse(x+q*.12,y-q*.23,q*.26,q*.14,.05,0,Math.PI*2);ctx.fill();}
      }
    }
  }
  ctx.globalAlpha=1;ctx.lineCap='butt';
}
function paintVentBubbles(ctx,project,w,h,time,reduced){
  const b={};
  for(const v of vents){
    bubblePose(v,time,reduced,b);
    const q=project(b);
    if(!q.visible||q.z<.84||q.z>51||q.x<-8||q.x>w+8||q.y<-8||q.y>h+8)continue;
    const natural=h/q.z*.81*b.radius*(v.radius>.10?.37:.68);
    if(natural<.31)continue;
    const r=Math.min(natural,5.2),film=Math.sin(time*5+v.phase*40);
    const wet=clamp(Math.exp(-q.z*.044),.12,.87)*clamp((9.2-natural)/5.2,.22,1);
    const wide=r*(.99+film*.14),tall=r*(.82-film*.10),roll=film*.32;
    if(r<.96){
      ctx.fillStyle='#c6f4df';ctx.globalAlpha=wet*.47;
      ctx.beginPath();ctx.arc(q.x,q.y,r*.66,0,6.283);ctx.fill();continue;
    }
    ctx.globalAlpha=wet*.5;ctx.fillStyle='#173c43';
    ctx.beginPath();ctx.ellipse(q.x+.03*r,q.y+.04*r,wide*.91,tall*.93,roll,0,6.283);ctx.fill();
    ctx.strokeStyle='#98cab9';ctx.lineWidth=clamp(r*.17,.38,.88);
    // Upper glint (surface light) and a dim secondary reflected caustic below.
    ctx.globalAlpha=wet*.77;
    ctx.beginPath();ctx.ellipse(q.x,q.y,wide,tall,roll,3.49,5.07);ctx.stroke();
    ctx.strokeStyle='#72b8ad';ctx.globalAlpha=wet*.44;
    ctx.beginPath();ctx.ellipse(q.x,q.y,wide,tall,roll,.40,1.61);ctx.stroke();
    if(r>2.2){
      ctx.globalAlpha=wet*.65;ctx.fillStyle='#e0ffed';
      ctx.beginPath();ctx.ellipse(q.x-r*.41,q.y-r*.35,r*.16,r*.093,-.54,0,6.283);ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

export function paintLife(ctx,project,state,w,h,t,fishPainter){
  const reduced=!!state.reducedMotion,time=reduced?0:t;
  const near=blades.map((item,index)=>({item,index,q:project({
    x:item.p.x,y:item.p.y+item.p.h*.56,z:item.p.z})}))
    .filter(({q})=>q.visible&&q.z>1.8&&q.x>-w*.35&&q.x<w*1.35&&q.y>-h*.86&&q.y<h*1.60)
    .sort((a,b)=>b.q.z-a.q.z);
  const sw={};
  for(const {item,index,q} of near){
    const {p,stems,leaves,amber}=item;
    const a=clamp((p.near?.84:.61)*Math.exp(-q.z*.028),.08,.78);
    ctx.globalAlpha=a*.72;ctx.strokeStyle=amber?'#566745':'#41644c';ctx.lineWidth=clamp(h/q.z*.019,.49,2.21);
    for(const stem of stems){
      const points=[];
      for(const {x,y,z,ht} of stem){
        kelpSway(x,z,ht,time,reduced,sw);const r=project({x:x+sw.x,y,z:z+sw.z});
        if(r.visible&&r.z>1.5)points.push(r);
      }
      if(points.length>1){path(ctx,points);ctx.stroke();}
    }
    const far=q.z>37?3:q.z>22?2:1;
    for(let j=0;j<leaves.length;j+=far){
      const A=leaves[j],{x,y,z,ht,dir,L,tilt,k,width}=A;
      const dx=Math.sin(tilt)*Math.cos(dir),dy=Math.cos(tilt),dz=Math.sin(tilt)*Math.sin(dir);
      const nx=Math.cos(tilt)*Math.cos(dir),ny=-Math.sin(tilt),nz=Math.cos(tilt)*Math.sin(dir);
      const bend=Math.max(.065,k*1.57+.08*Math.sin(time*.78+index*.83+j));
      const bladePoint=(v)=>{
        const straight=Math.sin(bend*v)/bend,
          curl=(1-Math.cos(bend*v))/bend+.09*Math.sin(v*6+j+time)*v;
        const u={x:x+L*(dx*straight+nx*curl),y:y+L*(dy*straight+ny*curl),z:z+L*(dz*straight+nz*curl)};
        kelpSway(x,z,ht+u.y-y,time,reduced,sw);
        return project({x:u.x+sw.x,y:u.y,z:u.z+sw.z});
      };
      const first=bladePoint(0),middle=bladePoint(.49),end=bladePoint(1);
      if(!first.visible||!middle.visible||!end.visible||first.z<1.6)continue;
      const vx=end.x-first.x,vy=end.y-first.y,len=Math.hypot(vx,vy);
      if(len<2.5||len>Math.max(w,h)*.75||middle.x<-55||middle.x>w+55||middle.y<-60||middle.y>h+60)continue;
      const edge=.29+.71*Math.abs(Math.cos(dir-(state.yaw??0)+Math.sin(time*.44+j)*.27));
      const broad=clamp(h/q.z*.83*width*edge,.55,A.ribbon?13:25);
      const sx=-vy/len*broad,sy=vx/len*broad;
      const leaf=ctx.createLinearGradient(first.x,first.y,end.x+.01,end.y+.01);
      if(amber){leaf.addColorStop(0,'#324036');leaf.addColorStop(.53,'#66764b');leaf.addColorStop(.87,'#889359');leaf.addColorStop(1,'#a49b5b');}
      else{leaf.addColorStop(0,'#1e4636');leaf.addColorStop(.60,'#48734f');leaf.addColorStop(.85,'#648956');leaf.addColorStop(1,'#7c9b64');}
      ctx.fillStyle=leaf;ctx.globalAlpha=a*(.70+.22*hash(index*33+j,23));
      const distal=q.z<29&&len>13?bladePoint(.76):middle;
      const proximal=q.z<29&&len>13?bladePoint(.24):middle;
      ctx.beginPath();ctx.moveTo(first.x,first.y);
      if(q.z>28||len<10){ctx.quadraticCurveTo(middle.x+sx*.70,middle.y+sy*.70,end.x,end.y);
        ctx.quadraticCurveTo(middle.x-sx*.76,middle.y-sy*.76,first.x,first.y);}
      else{
        // Fronds are asymmetric webbing. Small bites and splits interrupt
        // their silhouettes instead of drawing the same smooth oval.
        ctx.quadraticCurveTo(proximal.x+sx*.38,proximal.y+sy*.38,middle.x+sx*.56,middle.y+sy*.56);
        if(A.damage>.53)ctx.lineTo(middle.x+sx*.20+vx*.02,middle.y+sy*.20+vy*.02);
        ctx.quadraticCurveTo(distal.x+sx*A.notch,distal.y+sy*A.notch,end.x,end.y);
        ctx.quadraticCurveTo(distal.x-sx*.30,distal.y-sy*.30,middle.x-sx*.78,middle.y-sy*.78);
        if(A.damage>.80)ctx.lineTo(middle.x-sx*.36-vx*.066,middle.y-sy*.36-vy*.066);
        ctx.quadraticCurveTo(proximal.x-sx*.37,proximal.y-sy*.37,first.x,first.y);
      }
      ctx.fill();
      if(q.z<19&&len>8){
        ctx.globalAlpha=a*.35;ctx.strokeStyle=amber?'#b0a76c':'#94a16e';ctx.lineWidth=.47;
        ctx.beginPath();ctx.moveTo(first.x,first.y);ctx.quadraticCurveTo(middle.x,middle.y,distal.x,distal.y);ctx.stroke();
        if(A.bladder&&broad>2.2){
          ctx.globalAlpha=a*.68;ctx.fillStyle='#707944';
          ctx.beginPath();ctx.ellipse(first.x+vx*.08,first.y+vy*.08,Math.min(3.0,broad*.26),Math.min(4.1,broad*.41),Math.atan2(vy,vx)+1.57,0,6.283);ctx.fill();
        }
      }
    }
  }
  paintBenthic(ctx,project,w,h);
  paintVentBubbles(ctx,project,w,h,time,reduced);

  const school=[];
  for(const d of fish){
    const v=fishPose(d,time,state.reducedMotion,{});
    const p=project(v), look=project({x:v.x+v.dx*.39,y:v.y+v.dy*.39,z:v.z+v.dz*.39});
    if(!p.visible||!look.visible||p.z<1.65||p.x<-65||p.x>w+65||p.y<-50||p.y>h+53)continue;
    school.push({d,p,look,v});
  }
  school.sort((a,b)=>b.p.z-a.p.z);
  for(const entry of school){
    if(fishPainter?.(ctx,entry,state,w,h,time))continue;
    const {d,p,look,v}=entry;
    const k=d.kind,spec=SPECIES[k];
    const span=Math.hypot(look.x-p.x,look.y-p.y);
    const angle=Math.atan2(look.y-p.y,look.x-p.x);
    const px=clamp(h/p.z*.83*d.scale,1.25,k===1?130:47);
    const len=clamp(span/(h/p.z*.32),.42,1.05)*px, tall=px*(k===1?.33:k===2?.30:.20);
    const sweep=state.reducedMotion?0:Math.sin(time*[9,3.5,8.6,10.25,4.36][k]+d.phase);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
    ctx.globalAlpha=clamp((k===0?1:.86)*Math.exp(-p.z*.034),.12,k===0?.91:.80);
    const g=ctx.createLinearGradient(0,-tall,0,tall);
    g.addColorStop(0,spec.colors[0]);g.addColorStop(.48,spec.colors[2]);g.addColorStop(.68,spec.colors[1]);g.addColorStop(1,spec.colors[3]);
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(len*.53,-tall*.03);
    ctx.bezierCurveTo(len*.39,-tall*.91,len*.04,-tall*1.22,-len*.44,-tall*.18);
    ctx.lineTo(-len*.56,-tall*.16);
    if(k===1) {
      ctx.quadraticCurveTo(-len*.92,tall*(-.76+sweep*.19),-len*.85,tall*.05);
      ctx.quadraticCurveTo(-len*.92,tall*(.92+sweep*.19),-len*.56,tall*.19);
    }else{
      ctx.lineTo(-len*.85,tall*(-.84+sweep*.19));ctx.lineTo(-len*.74,tall*sweep*.12);
      ctx.lineTo(-len*.84,tall*(.84+sweep*.19));ctx.lineTo(-len*.56,tall*.19);
    }
    ctx.bezierCurveTo(-len*.04,tall*1.08,len*.36,tall*.58,len*.53,-tall*.03);ctx.fill();
    if(k!==0||px>3){
      ctx.globalAlpha*=.69;ctx.fillStyle=spec.colors[4];ctx.beginPath();
      ctx.moveTo(len*.20,-tall*.74);ctx.lineTo(-len*.06,-tall*(k===1?1.56:1.25));ctx.lineTo(-len*.36,-tall*.55);ctx.fill();
      if(k===2||k===1){
        ctx.lineWidth=clamp(px*.07,.70,4.5);ctx.strokeStyle=spec.colors[0];
        for(let j=0;j<3;j++){
          const x=len*(.26-j*.19);ctx.beginPath();ctx.moveTo(x,-tall*.65);ctx.quadraticCurveTo(x-len*.08,0,x-len*.09,tall*.57);ctx.stroke();
        }
      }
      if(px>5){
        ctx.fillStyle='#19363a';ctx.beginPath();ctx.arc(len*.34,-tall*.22,Math.max(.65,tall*.19),0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

// The liner lies beyond this foreground ledge, so the Canvas painter should
// call this immediately after the distant hull. The open side is right of x=5.
export function paintSearchRidge(ctx,project,state,w,h){
  if((state.z??0)<61.7)return;
  const raw=[
    [-12.2,bedY(-12.2,62.9)-.10,62.9],[-12,-9.4,61.7],[-10.4,-6.1,61.1],
    [-7.7,-3.7,60.5],[-4.8,-2.84,60.7],[-2.7,-3.34,61.3],
    [-.35,-3.1,61.8],[1.6,-5.9,61.1],[3.65,-6.55,62.0],
    [4.42,-11.7,61.7],[3.65,bedY(3.65,62.5)-.10,62.5],[-3.5,bedY(-3.5,63.6)-.10,63.6]
  ];
  const edge=raw.map(([x,y,z])=>project({x,y,z}));
  if(edge.some(p=>!p.visible||p.z<.48))return;
  const top=edge[4],base=edge[11];
  if(top.y>h*1.55||base.y<0||Math.min(...edge.map(p=>p.x))>w||Math.max(...edge.map(p=>p.x))<0)return;
  const paint=ctx.createLinearGradient(top.x,top.y,base.x,base.y);
  paint.addColorStop(0,'#405952');paint.addColorStop(.33,'#335152');paint.addColorStop(1,'#0b2630');
  ctx.save();
  const opacity=clamp(Math.exp(-top.z*.015),.38,.94);
  ctx.globalAlpha=opacity;ctx.fillStyle=paint;
  const silhouette=[];
  for(let i=0;i<raw.length;i++){
    const a=raw[i],b=raw[(i+1)%raw.length];silhouette.push(edge[i]);
    const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),parts=Math.ceil(len/.67);
    for(let j=1;j<parts;j++){
      const u=j/parts,x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,z=a[2]+(b[2]-a[2])*u;
      const phase=Math.sin(i*8.23+j*10.28),fade=Math.sin(u*Math.PI);
      const q=project({x:x-.18*phase*fade,y:y+(.22*phase+.13*Math.sin(j*3.88))*fade,z:z+.14*phase*fade});
      if(q.visible)silhouette.push(q);
    }
  }
  path(ctx,silhouette);ctx.closePath();ctx.fill();
  ctx.save();path(ctx,silhouette);ctx.closePath();ctx.clip();
  const ribs=[[[1,0],[3,1],[4,0]],[[3,0],[4,0],[7,1]],[[4,0],[6,0],[9,1]],[[8,0],[7,0],[10,1]]];
  for(let i=0;i<ribs.length;i++){
    const points=ribs[i].map(([j,ext])=>ext?{x:edge[j].x+(base.x-edge[j].x)*.37,y:base.y}:edge[j]);
    ctx.globalAlpha*=.88;ctx.fillStyle=(i%2?'#51746a59':'#0a262a52');
    path(ctx,points);ctx.closePath();ctx.fill();
  }
  // Crumbling sedimentary edges follow their elevation in the world. Layer
  // positions don't swim as the camera pans.
  for(let k=0;k<26;k++){
    const pts=[],zBias=61.1+.23*hash(k,17),y=-15.7+k*.43+.16*hash(k,55);
    for(let j=0;j<26;j++){
      const x=-12.3+j*.65,y0=y+.23*Math.sin(x*.55+k*.171)+.12*Math.sin(x*4.1+k*.88)+.24*Math.sin(x*.18);
      const q=project({x,y:y0,z:zBias+.16*Math.cos(x*.7+k)});
      if(q.visible&&q.z>.62)pts.push(q);
    }
    if(pts.length<2)continue;
    const width=clamp(h/Math.max(2,pts[0].z)*.046,.48,3.65);
    ctx.globalAlpha=opacity*(.14+.15*hash(k,14));ctx.strokeStyle=k%3?'#192d2a':'#8c8972';
    ctx.lineWidth=width;path(ctx,pts);ctx.stroke();
    if(k%4===0){ctx.globalAlpha=opacity*.13;ctx.strokeStyle='#a19c73';ctx.lineWidth=width*.36;
      path(ctx,pts.map(q=>({x:q.x,y:q.y+width*1.1})));ctx.stroke();}
  }
  for(let k=0;k<118;k++){
    const x=-12.2+16.7*hash(k,131),y=-16.5+13.9*hash(k,193),z=61.3+.5*hash(k,37);
    const q=project({x,y,z});if(!q.visible||q.z<1.1||q.z>39||q.x<-8||q.x>w+8||q.y<-8||q.y>h+8)continue;
    const d=clamp(h/q.z*(.015+.074*hash(k,90)),.36,5.55);
    ctx.globalAlpha=opacity*.13;ctx.fillStyle=k%3?'#789381':'#afb199';
    ctx.beginPath();ctx.ellipse(q.x,q.y,d,d*.42,.7*hash(k,11),0,6.283);ctx.fill();
  }
  ctx.restore();ctx.restore();
}
