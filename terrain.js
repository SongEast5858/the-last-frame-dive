import * as T from './vendor/three.module.js';
import {addBenthicPatches} from './reef-floor.js?v=12';
import {BED_GRID,gridBedHeight,seabedHeight,sedimentMask,sceneStoneVolumes} from './seabed-landforms.mjs?v=12';

// Terrain density, rock-detail texture and layered material adapted from
// Noniv / Abyssal Garden, MIT, at a596354eff400d458bc2aeb9bdf5e0a9734b2bcf:
// https://github.com/Noniv/abyssal-garden/tree/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf
// See vendor/ABYSSAL-GARDEN-MIT.txt. Changes: WGSL to CPU/GLSL, wreck-scale
// density volumes, differently seeded strata, sediment, mobile texture budget.
const sat=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
const fract=n=>n-Math.floor(n);
const ss=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};

// Original W_NOISE tapered hash, interpolated 3-D value noise and octave offset.
function h31(x,y,z){x=fract(x*.1031);y=fract(y*.1030);z=fract(z*.0973);
  const d=x*(y+33.33)+y*(z+33.33)+z*(x+33.33);
  return fract((x+y+2*d)*(z+d));
}
function h33(x,y,z){x=fract(x*.1031);y=fract(y*.1030);z=fract(z*.0973);
  const d=x*(y+33.33)+y*(x+33.33)+z*(z+33.33);x+=d;y+=d;z+=d;
  return [fract((x+y)*z),fract((x+x)*y),fract((y+x)*x)];
}
function noise(x,y,z){
  const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);
  let u=x-i,v=y-j,w=z-k;u=u*u*(3-2*u);v=v*v*(3-2*v);w=w*w*(3-2*w);
  return mix(mix(mix(h31(i,j,k),h31(i+1,j,k),u),mix(h31(i,j+1,k),h31(i+1,j+1,k),u),v),
    mix(mix(h31(i,j,k+1),h31(i+1,j,k+1),u),mix(h31(i,j+1,k+1),h31(i+1,j+1,k+1),u),v),w);
}
function fbm(x,y,z,n){
  let a=.5,s=0;
  for(let i=0;i<n;i++){s+=a*noise(x,y,z);x=x*2.03+17.1;y=y*2.03+31.7;z=z*2.03+5.3;a*=.5;}
  return s/(1-2*a);
}
function wor(x,y,z){
  const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);
  const f=x-i,g=y-j,h=z-k;
  let d=9;
  for(let oz=-1;oz<=1;oz++)for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const c=h33(i+ox,j+oy,k+oz),a=ox+c[0]-f,b=oy+c[1]-g,c0=oz+c[2]-h;
    d=Math.min(d,a*a+b*b+c0*c0);
  }
  return Math.sqrt(d);
}
const smax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*.25;};
const smin=(a,b,k)=>-smax(-a,-b,k);
const seg=(x,z,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az;
  const t=sat(((x-ax)*dx+(z-az)*dz)/Math.max(dx*dx+dz*dz,1e-4));
  return Math.hypot(x-ax-t*dx,z-az-t*dz);
};

const settledSediment=seabedHeight;

// Exposed ridge meshes are true 3-D isosurfaces, not stretched polyhedra.
// Positive density is inside. The capsule mesas (floor flaring, overhang and
// waist) and paired Worley erosion frequencies are adapted directly from W_DENS.
function ridgeDensity(parts,limitX){
  const highest=Math.max(...parts.map(p=>p[5]));
  const boxes=parts.map(([ax,az,bx,bz,r,_t,over])=>{
    const reach=r+Math.max(1.6,over)+3.75;
    return [Math.min(ax,bx)-reach,Math.max(ax,bx)+reach,Math.min(az,bz)-reach,Math.max(az,bz)+reach];
  });
  return (x,y,z)=>{
    if(y>highest+3 || x>limitX+1 || !boxes.some(b=>x>=b[0]&&x<=b[1]&&z>=b[2]&&z<=b[3]))return -3;
    const wX=fbm(x*.12+11,y*.12+11,z*.12+11,3)-.5;
    const wY=fbm(x*.12+47,y*.12+47,z*.12+47,3)-.5;
    const wZ=fbm(x*.12+83,y*.12+83,z*.12+83,3)-.5;
    const qX=x+wX*3.4,qZ=z+wZ*3.4;
    const g=-18.8, topNoise=1.55*(fbm(qX*.35,2,qZ*.35,2)-.5);
    let d=-1000;
    for(const [ax,az,bx,bz,r,top,over,waist] of parts){
      const yr=Math.min(1.25,Math.max(0,(y-g)/(top-g)));
      let e=seg(qX,qZ,ax,az,bx,bz)-r;
      e-=over*ss(.30,.92,yr)+1.6*(1-yr)*(1-yr)-waist*ss(0,.5,yr)*(1-ss(.5,1,yr));
      d=smax(d,smin(-e,top+topNoise-y,1.5),1.3);
    }
    if(d>-1.82 && d<2.05){
      const rk=mix(.31,1,ss(.3,3.1,y-g));
      d+=rk*((.5-wor(x*.37+wX*2,y*.37+wY*2,z*.37+wZ*2))*2.03+
        (.5-wor(x*.83+7,y*.83+7,z*.83+7))*.69+(fbm(x*.56,y*.56,z*.56,3)-.5)*1.48);
      d+=rk*1.27*(Math.abs(fract(y*.37+wY*1.85)-.5)-.25);
    }
    if(Number.isFinite(limitX)){
      // Smooth channel cut: changing contour with height, capped at x=4.95.
      const ledge=Math.min(limitX,limitX-.32+wZ*.86-.20*Math.sin(z*.54+y*.47));
      d=smin(d,ledge-x,.87);
    }
    return d;
  };
}

function surfaceMesh(dens,bounds,step){
  const [lx,ly,lz,hx,hy,hz]=bounds;
  const nx=Math.ceil((hx-lx)/step)+1,ny=Math.ceil((hy-ly)/step)+1,nz=Math.ceil((hz-lz)/step)+1;
  const sy=nx,sz=nx*ny,total=sz*nz,D=new Float32Array(total),cells=new Int32Array(total).fill(-1);
  const corners=[0,1,sy,sy+1,sz,sz+1,sz+sy,sz+sy+1];
  const dx=[0,1,0,1,0,1,0,1],dy=[0,0,1,1,0,0,1,1],dz=[0,0,0,0,1,1,1,1];
  const edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const pos=[],ind=[],colors=[];
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const id=i+j*sy+k*sz;
    if(i===0||j===0||k===0||i===nx-1||j===ny-1||k===nz-1)D[id]=-1;
    else D[id]=dens(lx+i*step,ly+j*step,lz+k*step);
  }
  const connect=(a,b,c,d,out)=>{
    if(b<0||c<0||d<0)return;
    if(out)ind.push(a,b,c,a,c,d); else ind.push(a,d,c,a,c,b);
  };
  for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
    const id=i+j*sy+k*sz, first=D[id]>0;
    let active=false;
    for(let p=1;p<8;p++)if((D[id+corners[p]]>0)!==first){active=true;break;}
    if(!active)continue;
    let px=0,py=0,pz=0,n=0;
    for(const [a,b] of edges){
      const l=D[id+corners[a]],r=D[id+corners[b]];
      if((l>0)===(r>0))continue;
      const t=l/(l-r);
      px+=mix(dx[a],dx[b],t);py+=mix(dy[a],dy[b],t);pz+=mix(dz[a],dz[b],t);n++;
    }
    const a=cells[id]=pos.length/3;
    const x=lx+(i+px/n)*step,y=ly+(j+py/n)*step,z=lz+(k+pz/n)*step;
    pos.push(x,y,z);
    const v=.87+.19*fbm(x*.19,y*.28,z*.21,2);
    colors.push(v,v,v);
    if(j&&k&&(D[id+1]>0)!==first)connect(a,cells[id-sy],cells[id-sy-sz],cells[id-sz],first);
    if(i&&k&&(D[id+sy]>0)!==first)connect(a,cells[id-sz],cells[id-sz-1],cells[id-1],first);
    if(i&&j&&(D[id+sz]>0)!==first)connect(a,cells[id-1],cells[id-1-sy],cells[id-sy],first);
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geo.setIndex(ind);geo.computeVertexNormals();geo.computeBoundingSphere();
  return geo;
}

// W_DETAIL: bake a periodic height/slope/mottling texture once. Periodic
// value noise, warping, two crack scales and sparse Worley pits are retained.
// Two manual mip levels are not needed: WebGL repeat + mipmap handles the fade.
function detailTexture(){
  const SIZE=128, wrap=(x,n)=>x-n*Math.floor(x/n);
  function tn(x,y,p){
    const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;
    u=u*u*(3-2*u);v=v*v*(3-2*v);
    const x0=wrap(i,p),x1=wrap(i+1,p),y0=wrap(j,p),y1=wrap(j+1,p);
    return mix(mix(h31(x0,y0,p),h31(x1,y0,p),u),mix(h31(x0,y1,p),h31(x1,y1,p),u),v);
  }
  function tf(x,y,p,n){let q=.5,s=0;
    for(let i=0;i<n;i++){s+=q*tn(x*p+i*7.3,y*p+i*7.3,p);p*=2;q*=.5;}
    return s/(1-2*q);
  }
  function pit(x,y){
    const p=29,i=Math.floor(x),j=Math.floor(y);let d=9,which=0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      const c=h33(wrap(i+a,p),wrap(j+b,p),p),l=i+a+c[0]-x,m=j+b+c[1]-y,r=l*l+m*m;
      if(r<d){d=r;which=c[2];}
    }
    return which>.62?1-ss(0,.34,Math.sqrt(d)):0;
  }
  const h=new Float32Array(SIZE*SIZE),bytes=new Uint8Array(h.length*4);
  for(let j=0;j<SIZE;j++)for(let i=0;i<SIZE;i++){
    const u=i/SIZE,v=j/SIZE;
    const x=u+.11*(tf(u,v,3,4)-.5),y=v+.11*(tf(u+.5,v+.5,3,4)-.5);
    const f=tf(x,y,3,7),r=1-Math.abs(tf(x+1.7,y+1.7,5,5)*2-1);
    const cr=sat(Math.abs(tf(x+4.1,y+4.1,4,5)*2-1)*7);
    const cr2=sat(Math.abs(tf(y+2.3,x+2.3,9,4)*2-1)*9);
    h[j*SIZE+i]=f*.50+r*r*.24+cr*cr2*.26-pit(x*29,y*29)*.07;
    bytes[(j*SIZE+i)*4+3]=Math.round(255*tf(u+3.7,v+3.7,3,5));
  }
  for(let j=0;j<SIZE;j++)for(let i=0;i<SIZE;i++){
    const k=j*SIZE+i,dx=h[j*SIZE+wrap(i+1,SIZE)]-h[j*SIZE+wrap(i-1,SIZE)];
    const dy=h[wrap(j+1,SIZE)*SIZE+i]-h[wrap(j-1,SIZE)*SIZE+i];
    bytes[k*4]=Math.round(255*sat(.5-dx*SIZE*.01875));
    bytes[k*4+1]=Math.round(255*sat(.5-dy*SIZE*.01875));
    bytes[k*4+2]=Math.round(255*sat(h[k]));
  }
  const tex=new T.DataTexture(bytes,SIZE,SIZE,T.RGBAFormat);
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.LinearFilter;
  tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=2;tex.needsUpdate=true;
  return tex;
}

const terrainCommon=`
uniform sampler2D uAbyssDetail;
varying vec3 vTerrainW, vTerrainN;
float agStrataId(float n) {return fract(sin(n*87.3+1.72)*43758.5453);}
vec4 agY(vec2 p){return texture2D(uAbyssDetail,p);}
`;
const rockGL=`
struct AGTri {float h;float c;vec3 slope;};
AGTri agTri(vec3 p,vec3 n,float s){
  vec3 w=pow(abs(n),vec3(4.)); w/=max(dot(w,vec3(1.)),.001);
  vec4 x=agY(p.zy*s),y=agY(p.xz*s),z=agY(p.xy*s);
  vec2 a=x.rg*2.-1.,b=y.rg*2.-1.,c=z.rg*2.-1.;
  return AGTri(dot(w,vec3(x.b,y.b,z.b)),dot(w,vec3(x.a,y.a,z.a)),
    vec3(0.,a.y,a.x)*w.x+vec3(b.x,0.,b.y)*w.y+vec3(c.x,c.y,0.)*w.z);
}
`;
const rockColor=`
  vec3 agP=vTerrainW,agN=normalize(vTerrainN);
  AGTri agA=agTri(agP,agN,.16),agB=agTri(agP,agN,.62),agC=agTri(agP,agN,2.15);
  float agBig=agY(agP.xz*.026+agP.y*.033).a;
  float agBig2=agY(agP.zx*.073+agP.y*.071+.37).a;
  float agH=dot(vec3(agA.h,agB.h,agC.h),vec3(.50,.35,.15));
  float agSt=agP.y*.72+agA.h*1.6+agBig*5.+agBig2*3.;
  float agBed=agStrataId(floor(agSt)),agSf=fract(agSt),agWall=1.-abs(agN.y);
  float agGroove=(1.-smoothstep(.014,.18,abs(agSf-.06)))*agWall;
  vec3 agAlbedo=mix(vec3(.115,.125,.132),vec3(.33,.305,.25),clamp(agA.c*1.5-.25,0.,1.));
  agAlbedo=mix(agAlbedo,mix(vec3(.26,.19,.10),vec3(.20,.22,.14),agBed),smoothstep(.43,.64,agBig)*.65);
  agAlbedo*=mix(.70,1.16,agBed)*(1.-.56*agGroove);
  float agEnc=smoothstep(.47,.61,agBig2*.6+agB.c*.5)*smoothstep(.36,.65,agH);
  agAlbedo=mix(agAlbedo,mix(vec3(.31,.075,.099),vec3(.39,.235,.067),smoothstep(.44,.62,agA.c))*(.55+.78*agB.h),agEnc*.73);
  agAlbedo=mix(agAlbedo,vec3(.51,.49,.44)*(.5+.7*agC.h),smoothstep(.59,.71,agB.c*.6+agC.c*.5)*.45);
  float agAlg=smoothstep(-.08,.73,agN.y)*smoothstep(.34,.55,agB.c*.55+agBig*.5);
  agAlbedo=mix(agAlbedo,vec3(.048,.162,.073),agAlg*.72)*(.26+1.25*agH);
  // A little dust sits on up-facing talus without coating the side walls.
  agAlbedo=mix(agAlbedo,vec3(.28,.247,.175)*(.62+.55*agB.h),smoothstep(.78,.98,agN.y)*smoothstep(.54,.71,agBig)*.63);
  diffuseColor.rgb*=agAlbedo;
  vec3 agBump=agA.slope*.40+agB.slope*.31+agC.slope*.19+vec3(0.,-.24*agGroove,0.);
`;
const sandColor=`
  vec3 agP=vTerrainW,agN=normalize(vTerrainN);
  vec2 agXZ=agP.xz;
  vec4 agA=agY(agXZ*.061),agB=agY(agXZ*.28+.43),agC=agY(agXZ*2.85);
  float agPatch=agY(agXZ*.019+vec2(.65,.31)).a;
  float agWash=agY(agXZ*vec2(.032,.017)+vec2(.79,.41)).b;
  vec2 agFlow=vec2(.50,.866);
  float agWarp=(agA.a-.5)*2.9+(agB.a-.5)*.67+.20*sin(dot(agXZ,vec2(.19,-.105)));
  float agAxis=dot(agXZ,agFlow)+agWarp;
  float agFreq=3.8+2.7*smoothstep(.14,.88,agPatch);
  float agPhase=agAxis*agFreq+(agB.b-.5)*.26;
  float agBeam=smoothstep(.23,.57,agA.a)*(.64+.36*agB.a);
  // A crest highlights one side and collects granules in the sloping trough.
  float agPrim=sin(agPhase),agSlope2=sin(agPhase*2.-.76);
  float agLee=smoothstep(.11,.93,.72*agPrim+.28*agSlope2);
  float agCrest=smoothstep(.37,.97,-agPrim);
  float agFar=1.-smoothstep(.75,3.3,length(fwidth(agXZ))*agFreq);
  float agShell=vBedMix.x,agShingle=vBedMix.y,agQuiet=vBedMix.z;
  float agBand=agBeam*agFar*(.48+.52*agWash)*(1.-.62*agShingle)*(1.-.38*agQuiet);
  float agLow=sin(agAxis*1.12+.8)*.11+(agWash-.5)*.48;
  float agShade=(1.+agLow+agBand*(.30*agCrest-.28*agLee));
  vec3 agAlbedo=mix(vec3(.164,.153,.115),vec3(.41,.337,.231),smoothstep(.19,.73,agPatch));
  agAlbedo=mix(agAlbedo,vec3(.292,.249,.177),smoothstep(.36,.71,agA.a)*.40);
  // Low-current mud flats and mottled shell-rich sand, plus grain-size sorting.
  float agSilt=smoothstep(.40,.75,agWash);
  agAlbedo=mix(agAlbedo,vec3(.132,.147,.124),agSilt*.43);
  agAlbedo=mix(agAlbedo,vec3(.23,.241,.217),agQuiet*.68);
  agAlbedo=mix(agAlbedo,vec3(.31,.286,.235)*(.83+.37*agB.b),agShingle*.52);
  agAlbedo=mix(agAlbedo,vec3(.42,.390,.311),agShell*.49*(.51+.49*agB.a));
  float agCoarse=smoothstep(.56,.78,agB.a)*smoothstep(.48,.76,agC.b);
  float agGrit=mix(.87,1.13,agB.b)*mix(.94,1.06,agC.b);
  agGrit*=1.-.46*agCoarse*(.32+.68*agLee);
  agGrit+=.18*smoothstep(.71,.95,agC.a)*(1.-agSilt)*agFar;
  float agShellBits=smoothstep(.61,.89,agC.a)*smoothstep(.48,.75,agC.b);
  agGrit+=agShellBits*agShell*agFar*.48;
  agGrit-=agShingle*.42*(1.-smoothstep(.43,.67,agC.b))*agFar;
  diffuseColor.rgb*=agAlbedo*agShade*agGrit;
  float agRidge=cos(agPhase)*.69+cos(agPhase*2.-.76)*.52;
  vec3 agBump=vec3(agFlow.x,0.,agFlow.y)*agRidge*agBand*.51
    +vec3(agC.r-.5,0.,agC.g-.5)*.18+vec3(agB.r-.5,0.,agB.g-.5)*.24;
`;
function terrainMaterial(detail,sand){
  const m=new T.MeshStandardMaterial({color:0xffffff,roughness:sand?.98:.89,vertexColors:true});
  m.name=sand?'Current ripples · sorted shell hash and silt':'Strata · eroded basalt and encrustation';
  m.onBeforeCompile=sh=>{
    sh.uniforms.uAbyssDetail={value:detail};
    sh.vertexShader=(sand?'attribute vec3 aBedMix; varying vec3 vBedMix;\n':'')+'varying vec3 vTerrainW,vTerrainN;\n'+sh.vertexShader;
    sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>',`
      vec4 agW=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        agW=instanceMatrix*agW;
      #endif
      vTerrainW=(modelMatrix*agW).xyz;
      vTerrainN=inverseTransformDirection(transformedNormal,viewMatrix);
      ${sand?'vBedMix=aBedMix;':''}
      #include <project_vertex>`);
    sh.fragmentShader=terrainCommon+(sand?'varying vec3 vBedMix;\n':rockGL)+sh.fragmentShader;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n'+(sand?sandColor:rockColor));
    sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      vec3 agBumpView=(viewMatrix*vec4(agBump,0.)).xyz;
      normal=normalize(normal+agBumpView-normal*dot(normal,agBumpView));`);
  };
  m.customProgramCacheKey=()=>sand?'abyss-sediment-v12':'abyss-strata-v4';
  return m;
}

function sandGeometry(){
  // Indexed height field. Fine ripples fade into normal relief instead of
  // becoming moiré at the far end of the route.
  const {w,h,nx,nz,cz}=BED_GRID,g=new T.PlaneGeometry(w,h,nx,nz);
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position,colors=new Float32Array(p.count*3),masks=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i)+cz,v=.84+.23*noise(x*.073,2,z*.1);
    p.setXYZ(i,x,gridBedHeight(i%(nx+1),Math.floor(i/(nx+1))),z);colors.fill(v,i*3,i*3+3);
    const m=sedimentMask(x,z);masks.set([m.shell,m.rubble,m.lee],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  g.setAttribute('aBedMix',new T.BufferAttribute(masks,3));
  g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

// Intersect the vertical support ray with the same triangle vertices drawn by
// the renderer. Smooth shader normals/analytic rock proxies are not anchors.
function triangleAt(a,i,j,k,x,z){
  i*=3;j*=3;k*=3;
  const ax=a[i],ay=a[i+1],az=a[i+2];
  const bx=a[j]-ax,by=a[j+1]-ay,bz=a[j+2]-az;
  const cx=a[k]-ax,cy=a[k+1]-ay,cz=a[k+2]-az;
  const det=bx*cz-bz*cx;
  if(Math.abs(det)<1e-7)return null;
  const x0=x-ax,z0=z-az;
  const u=(x0*cz-z0*cx)/det,v=(bx*z0-bz*x0)/det;
  if(u<-.00001||v<-.00001||u+v>1.00001)return null;
  const ny=-det,orientation=ny<0?-1:1;
  return {y:ay+by*u+cy*v,normal:new T.Vector3(orientation*(by*cz-bz*cy),orientation*ny,
    orientation*(bx*cy-by*cx)).normalize()};
}
function sampleSand(floor){
  const g=floor.geometry,{widthSegments:nx,heightSegments:nz}=g.parameters;
  const a=g.attributes.position.array,idx=g.index.array;
  const fx=a[0],fz=a[2],dx=(a[nx*3]-fx)/nx,dz=(a[(nx+1)*nz*3+2]-fz)/nz;
  return (x,z)=>{
    const ix=Math.min(nx-1,Math.floor((x-fx)/dx)),iz=Math.min(nz-1,Math.floor((z-fz)/dz));
    if(ix<0||iz<0)return {y:settledSediment(x,z),normal:new T.Vector3(0,1,0),kind:'sand',name:'off-mesh sediment'};
    const o=(iz*nx+ix)*6;
    const h=triangleAt(a,idx[o],idx[o+1],idx[o+2],x,z)||triangleAt(a,idx[o+3],idx[o+4],idx[o+5],x,z);
    return {...(h||{y:settledSediment(x,z),normal:new T.Vector3(0,1,0)}),kind:'sand',name:floor.name};
  };
}
function makeSupport(floor,rocks){
  const sandAt=sampleSand(floor),stride=3,origin=105,bins=new Map(),store=[];
  const hash=(x,z)=>Math.floor(x/stride+origin)+256*Math.floor(z/stride+origin);
  for(const mesh of rocks){
    const a=mesh.geometry.attributes.position.array,ix=mesh.geometry.index.array,tag=mesh.name;
    for(let n=0;n<ix.length;n+=3){
      const v=ix[n],w=ix[n+1],q=ix[n+2],i=v*3,j=w*3,k=q*3;
      const A=a[i],B=a[j],C=a[k],U=a[i+2],V=a[j+2],W=a[k+2];
      if(Math.abs((B-A)*(W-U)-(C-A)*(V-U))<1e-7)continue;
      const here=store.length;store.push({a,v,w,q,tag});
      const lx=Math.floor(Math.min(A,B,C)/stride),hx=Math.floor(Math.max(A,B,C)/stride);
      const lz=Math.floor(Math.min(U,V,W)/stride),hz=Math.floor(Math.max(U,V,W)/stride);
      for(let z=lz;z<=hz;z++)for(let x=lx;x<=hx;x++){
        const h=x+origin+256*(z+origin);
        let row=bins.get(h);
        if(!row){row=[];bins.set(h,row);}
        row.push(here);
      }
    }
  }
  return (x,z,{sandOnly=false,minNormal=.10}={})=>{
    let best=sandAt(x,z);
    if(sandOnly)return best;
    const row=bins.get(hash(x,z))??[];
    for(const t of row){
      const {a,v,w,q,tag}=store[t];
      const h=triangleAt(a,v,w,q,x,z);
      if(h&&h.y>=best.y&&h.normal.y>=minNormal)best={...h,kind:'rock',name:tag};
    }
    return best;
  };
}

function cobble(seed){
  const g=new T.IcosahedronGeometry(1,1);
  const p=g.attributes.position,normal=g.attributes.normal;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=seed*8.7;
    const f=fbm(x*2.5+k,y*2.5+k,z*2.5+k,3);
    const r=.91+(f-.5)*.76+(.5-wor(x*2.66+k,y*2.66+k,z*2.66+k))*.21;
    let h=y*r;if(h>0)h*=.80+.19*Math.sin(x*3+k-z*1.7);else h*=.83;
    p.setXYZ(i,x*r+.09*Math.sin(y*4+k),h,z*r+.12*Math.sin(x*2-y));
    normal.setXYZ(i,x,y*.69,z);
  }
  const c=new Float32Array(p.count*3).fill(1);
  g.setAttribute('color',new T.BufferAttribute(c,3));
  return g;
}
const randFn=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

export function buildTerrain(scene,reefFormations=[]){
  const root=new T.Group();root.name='Abyssal sediments, rock ledges and talus';
  scene.add(root);
  const detail=detailTexture(),sand=terrainMaterial(detail,true),rock=terrainMaterial(detail,false);
  const floor=new T.Mesh(sandGeometry(),sand);
  floor.name='Current-scoured sand field'; root.add(floor);
  const largeParts=[
    [-7.8,59.9,-5.05,62.4,4.3,-3.55,1.3,1.1],
    [-8.7,61.8,-11.5,66,4.43,-6.85,1.48,1.28],
    [-4.7,56.8,-2.46,59.55,3.53,-6.10,.97,1.09],
    [-5.50,63,-3.25,66.4,4.2,-9.75,1.36,.72],
    [-13.7,64.2,-16.8,63.25,3.4,-11.8,.95,.69]
  ];
  const ridge=ridgeDensity(largeParts,4.94);
  const hero=new T.Mesh(surfaceMesh(ridge,[-24,-21,50,5.1,-1,75],.43),rock);
  hero.name='West search escarpment';root.add(hero);
  const supportRockMeshes=[hero];
  const reefs=reefFormations.filter(f=>f.id!=='west-talus').concat([
    {id:'port-break',x:-23.3,y:-13.1,z:29.5,sx:7.8,sy:4.4,sz:8.1},
    {id:'south-west',x:-19,y:-15,z:-31.5,sx:5.2,sy:2.9,sz:7.2},
    {id:'outer-east-wall',x:28.4,y:-13.0,z:-45.6,sx:9.4,sy:5.8,sz:7.9},
    {id:'offshore-lip',x:32.4,y:-13.8,z:72.7,sx:10.4,sy:5.6,sz:9.2},
    {id:'north-drop',x:-27.4,y:-14.1,z:93.2,sx:10.6,sy:4.4,sz:11.8}
  ]);
  for(let i=0;i<reefs.length;i++){
    const {x,y,z,sx,sy,sz,id}=reefs[i],top=y+sy-.26,r=sx*.74;
    const parts=[
      [x-.16*sx,z-.28*sz,x+.08*sx,z+.44*sz,r,top,Math.min(1.04,sx*.13),.66],
      [x+.33*sx,z+.3*sz,x+.44*sx,z+.63*sz,r*.66,top-1.5,.71,.57],
      [x-.45*sx,z-.47*sz,x-.12*sx,z-.61*sz,r*.57,top-2.10,.54,.41]
    ];
    const g=surfaceMesh(ridgeDensity(parts,Infinity),[x-sx-4,-21,z-sz-4,x+sx+4,top+2,z+sz+4],i>5?.65:.51);
    const m=new T.Mesh(g,rock);m.name=id;root.add(m);supportRockMeshes.push(m);
  }
  // These foreground cobble islands are rendered from the very same explicit
  // faces as the lightweight renderer and included in the physical support ray.
  for(const v of sceneStoneVolumes()){
    const pos=[],col=[],indices=[];
    for(const f of v.faces){
      const albedo=.85+.12*noise(f.x*.63,9.1,f.z*.71);
      for(const {x,y,z} of [f.a,f.b,f.c]){
        indices.push(pos.length/3);pos.push(x,y,z);
        col.push(albedo*1.04,albedo*.99,albedo*.92);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
    const o=new T.Mesh(g,rock);o.name=v.id;root.add(o);supportRockMeshes.push(o);
  }
  const supportAt=makeSupport(floor,supportRockMeshes);
  const scatterUp=new T.Vector3(0,1,0);
  const rand=randFn(583792),dummy=new T.Object3D(),rocks=Array.from({length:3},()=>[]);
  const edgeClumps=[{x:-5,z:64,sx:11,sz:6},...reefs];
  for(let i=0;i<570;i++){
    const cluster=i<447?edgeClumps[i%edgeClumps.length]:null;
    const a=rand()*Math.PI*2;
    const x=cluster?cluster.x+Math.cos(a)*cluster.sx*(.68+rand()*.82):-60+rand()*120;
    const z=cluster?cluster.z+Math.sin(a)*cluster.sz*(.61+rand()*.95):-70+rand()*205;
    const v=(cluster?.11:.064)+(cluster?1.14:.61)*Math.pow(rand(),3.3);
    if(x>4.4 && x<9.6&&z>49&&z<80&&v>.58)continue;
    if(!cluster&&noise(x*.16,8,z*.16)<.25)continue;
    rocks[i%3].push({x,z,v});
  }
  rocks.forEach((items,j)=>{
    const m=new T.InstancedMesh(cobble(j),rock,items.length);
    m.name='Gravel / scattered broken slabs';
    items.forEach(({x,z,v},i)=>{
      const surface=supportAt(x,z,{sandOnly:true});
      dummy.position.set(x,surface.y+v*.080,z);
      const roll=(rand()-.5)*.48,yaw=rand()*6.283,pitch=(rand()-.5)*.54;
      dummy.quaternion.setFromUnitVectors(scatterUp,surface.normal);
      dummy.rotateY(yaw);dummy.rotateX(roll);dummy.rotateZ(pitch);
      dummy.scale.set(v*(.61+rand()*1.23),v*(.40+rand()*.42),v*(.66+rand()*.75));
      dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
    });
    m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();root.add(m);
  });
  const benthic=addBenthicPatches(root,supportAt,reefs);
  return {root,floor,hero,heightAt:settledSediment,supportAt,supportHeightAt:(x,z)=>supportAt(x,z).y,ridgeDensity:ridge,benthic};
}
