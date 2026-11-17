import * as T from './vendor/three.module.js';
import { buildFishSchools } from './model-fish.js?v=9';
import { fieldRand as sampler, kelpPlaces, benthicColonies, COLONY_PALETTES, coldCoral } from './reef.js?v=13';

// Adapted from Abyssal Garden by Maksymilian Dendura / Noniv (MIT).
// https://github.com/Noniv/abyssal-garden/tree/a596354eff400d458bc2aeb9bdf5e0a9734b2bcf
// License: vendor/ABYSSAL-GARDEN-MIT.txt.
const TAU = Math.PI * 2;
// WGSL -> GLSL adaptation of source/src/shaders.js W_LEAF. The helix,
// height exponent, two flow harmonics, arc/taper and transmission weighting
// are adapted from Abyssal Garden, then fit to this wreck's world scale.
// The secondary formations use artist seed coordinates only for XZ placement.
// Resolve all vertical attachments on the rendered rock/sand surface at build time.
function substrateY(heightAt,x,z,fallback){
  const y=heightAt?.(x,z);
  return Number.isFinite(y)?y:fallback;
}
function makeKelp(surface,heightAt) {
  const rand = sampler(951237);
  const anchor = [], blade = [], props = [], pigment = [];
  const gold=new T.Color('#79673b'),olive=new T.Color('#4b5030'),
    jade=new T.Color('#4d6345'),sage=new T.Color('#697154'),
    umber=new T.Color('#675334'),stemColor=new T.Color('#504934');
  const pick=(a,b,k)=>a.clone().lerp(b,k);
  function leaf(x,y,z,len,angle,tilt,width,height,s1,s2,curvature,kind,color){
    anchor.push(x,y,z,len);blade.push(angle,tilt,width,height);
    props.push(s1,s2,curvature,kind);pigment.push(color.r,color.g,color.b);
  }
  const beds=kelpPlaces(heightAt), clumpField=(x,z)=>Math.sin(x*.17+z*.24)+.72*Math.cos(z*.36-x*.21);
  for(const [id,root] of beds.entries()){
    const {x,z,h,near}=root,cover=clumpField(x,z),bed=substrateY(heightAt,x,z,root.y);
    if(cover<-.66 && id%4!==1)continue;
    const H=Math.max(1,Math.min(h,surface-bed-2.1))*rand(.59,1),
      flow=rand(-.32,.32)+.62, aged=rand()<.52;
    const strands=(near&&cover>.1?3:1)+(rand()<.65?1:0),
      ph=rand(0,TAU),tw=rand(.045,.095),sr=rand(.09,.37),sc=rand(.7,1.35),
      lm=rand(.033,.115);
    const stem=(j,v)=>{
      const a=ph+j*TAU/strands+v*tw,r=sr*(1+.6*v/H);
      const lean=lm*v*v/H;
      return [x+Math.cos(a)*r+Math.cos(flow)*lean,z+Math.sin(a)*r+Math.sin(flow)*lean];
    };
    for(let j=0;j<strands;j++){
      let ht=0, len=0;
      const origin=stem(j,0), spread=stem(j,.15);
      const y=Math.min(substrateY(heightAt,origin[0],origin[1],bed),
        substrateY(heightAt,spread[0],spread[1],bed))-.085;
      const maxH=H*(j===0?1:rand(.45,.97));
      while(ht<maxH-.15){
        len=Math.min(1.18,maxH-ht);
        const a=stem(j,ht),b=stem(j,ht+len), dx=b[0]-a[0],dz=b[1]-a[1];
        leaf(a[0],y+ht,a[1],Math.hypot(len,dx,dz)+.026,
          Math.atan2(dz,dx),Math.atan2(Math.hypot(dx,dz),len),.045*rand(.82,1.16),ht,.5,.55,.30,1,stemColor);
        ht+=len;
      }
      let v=rand(.26,.84), k=Math.floor(rand(0,3));
      while(v<maxH){
        const t=v/H,a=stem(j,v), breakPt=rand(), lateral=(k++%2?1:-1);
        const ang=flow+lateral*rand(.45,1.43)+rand(-.34,.34);
        const len=(.49+.75*rand())*(1-.55*t*t)*sc*rand(1.4,2.55)*(breakPt<.15?.50:1);
        const wide=rand(.115,.238)*(aged?.83:1);
        const color=aged?pick(gold,umber,rand()):pick(olive,rand()<.64?jade:sage,rand());
        leaf(a[0],y+v,a[1],len,ang,rand(.38,1.10)+.19*t,len*wide,v,rand(),rand(),rand(.21,.85),aged?2:0,color);
        v+=rand(.35,1.24)*(near?.80:1.22)*(cover>.65?.77:1.1);
        if(rand()<.075)v+=rand(.45,1.5);
      }
    }
    // Low forked holdfast haptera lie against the hard substrate. From the
    // water column they read as irregular darker patches, not planted stalks.
    if(near) for(let k=0;k<9;k++){
      const a=(k/9)*TAU+rand(-.35,.35), r=rand(.03,.13);
      const hx=x+Math.cos(a)*r,hz=z+Math.sin(a)*r,len=rand(.16,.66);
      const front=substrateY(heightAt,hx,hz,bed),
        tip=substrateY(heightAt,hx+Math.cos(a)*len*.72,hz+Math.sin(a)*len*.72,front);
      // Start below the visible surface and follow the local grade: a
      // holdfast passing over a steep rock lip must not hover over the drop.
      const gentle=Math.abs(front-tip)<.32;
      leaf(hx,front-.052,hz,gentle?len:Math.min(.19,len),a,
        gentle?Math.max(.82,Math.min(2.28,Math.atan2(len*.80,tip-front+.015))):1.15,
        rand(.035,.08),0,.5,.5,rand(.22,.63),3,stemColor);
    }
  }
  const positions=[],uv=[],index=[],rows=11,across=3;
  for(let a=0;a<rows;a++)for(let b=0;b<across;b++){
    const v=Math.sin(a/(rows-1)*Math.PI*.5);
    positions.push(2*b/(across-1)-1,v,0);uv.push(b/(across-1),v);
    if(a+1<rows&&b+1<across){
      const j=a*across+b;index.push(j,j+across,j+1,j+1,j+across,j+across+1);
    }
  }
  const geometry=new T.InstancedBufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  for(const [name,data,size] of [['base',anchor,4],['blade',blade,4],['props',props,4],['pigment',pigment,3]])
    geometry.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(data),size));
  geometry.setIndex(index);
  geometry.instanceCount=anchor.length/4;
  const time={value:0},breathing={value:1};
  const material=new T.ShaderMaterial({
    side:T.DoubleSide,fog:true,
    uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),time,breathing,waterCeiling:{value:surface-.05}},
    vertexShader:`
      attribute vec4 base,blade,props; attribute vec3 pigment;
      uniform float time,breathing,waterCeiling;
      varying vec2 foliage; varying vec3 vPigment,vN,vWorld; varying float leafKind,leafSeed;
      #include <fog_pars_vertex>
      vec2 sway(vec2 p,float h,float t){
        float ph=dot(p,vec2(.014,.011)),a=.014*pow(max(h,0.),1.22);
        float wave=sin(t*.54+ph+h*.055)+.19*sin(t*1.33+ph*2.1+h*.20);
        return a*(vec2(.9,.49)*wave+.22*vec2(-.49,.9)*cos(t*.47+ph+h*.063));
      }
      void main(){
        float u=position.x,v=position.y,ty=props.w,s1=props.x,s2=props.y;
        float len=base.w,hA=blade.w,rigid=step(abs(ty-1.),.1)+step(abs(ty-3.),.1);
        float wav=.78*(1.-rigid),fls=1.-rigid;
        float cy=cos(blade.x),sy=sin(blade.x),ct=cos(blade.y),st=sin(blade.y);
        vec3 d=vec3(st*cy,ct,st*sy),pe=vec3(ct*cy,-st,ct*sy),sd=vec3(-sy,0.,cy);
        float k=(props.z-.3)*2.+sin(time*.71+s2*5.+hA*.12)*.13*fls*breathing;
        float kq=k*1.7,ka=abs(kq)<.06?.06:kq;
        float wph=v*(3.+5.*s2)+s1*30.+time*1.1,wv=sin(wph)*.12*wav;
        float sK=sin(ka*v),cK=cos(ka*v);
        vec3 c=base.xyz+len*(d*(sK/ka)+pe*((1.-cK)/ka+wv*v));
        float sl=sK+wv+cos(wph)*.10*wav*v*(3.+5.*s2);
        vec3 N=normalize(pe*cK-d*sl),Q=normalize(d*cK+pe*sl);
        float tw=(s1-.5)*2.4*v+sin(time*.9+s2*20.)*.25*v*breathing;
        vec3 S=sd*cos(tw)+N*sin(tw),N2=N*cos(tw)-sd*sin(tw);
        float broad=pow(max(sin(3.14159*pow(v,.72+s1*.29)),0.),.53+s2*.54);
        float edgeFray=sin(21.*v+s2*44.+7.*sign(u))*.083
          +sin(43.*v+s1*40.+2.*sign(u))*.045;
        float torn=1.-(.19+.4*s2)*smoothstep(.49,.55,v)*(1.-smoothstep(.59,.66,v))
          *step(.6,s1)*step(.0,u);
        float shape=mix(broad*(1.+edgeFray*abs(u))*torn,mix(1.,.38,v),rigid);
        float nearK=1.-smoothstep(26.,48.,distance(base.xyz,cameraPosition));
        float ruf=sin(v*15.+s2*30.+time*.7)*blade.z*.18*u*sin(3.14159*v)*nearK*fls;
        ruf+=blade.z*.11*(1.-abs(u))*broad*fls;
        vec3 p=c+S*(u*blade.z*.5*shape)+N2*ruf;
        p.xz+=sway(base.xz,hA+p.y-base.y,time)*breathing;
        p.y=min(p.y,waterCeiling);
        foliage=vec2(u,v);vPigment=pigment;vWorld=p;leafKind=ty;leafSeed=s2;
        vN=normalize(N2+S*u*.55-Q*cos(v*10.+s2*30.+time*.6)*u*.7*nearK);
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      varying vec2 foliage; varying vec3 vPigment,vN,vWorld; varying float leafKind,leafSeed;
      uniform float time;
      #include <fog_pars_fragment>
      void main(){
        vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
        vec3 V=normalize(cameraPosition-vWorld),L=normalize(vec3(-.44,.83,.33));
        float ndl=dot(n,L),ndv=max(0.,dot(n,V));
        float u=abs(foliage.x), v=foliage.y;
        float striation=sin(v*122.-u*18.+4.*leafSeed);
        float midrib=1.-smoothstep(.025,.100,u);
        float chip=sin(v*31.+leafSeed*37.)*sin(v*54.-u*21.+leafSeed*8.);
        float grain=.90+.055*striation+.14*midrib-.14*smoothstep(.44,.8,chip)*smoothstep(.18,.75,u);
        float rise=smoothstep(-16.,19.,vWorld.y);
        float trans=(leafKind==1.||leafKind==3.)?.09:.78;
        vec3 alb=vPigment*mix(.68,1.01,v)*grain;
        vec3 trc=alb*mix(vec3(1.),vec3(1.5,1.4,.75),trans);
        float tr=(max(-ndl,0.)*.85+.15)*trans;
        vec3 halfV=normalize(V+L);
        float spec=pow(max(0.,dot(n,halfV)),40.)*.115+pow(max(0.,dot(n,halfV)),9.)*.028;
        float stream=.43+.57*pow(.5+.5*sin(vWorld.z*.91+vWorld.x*.64+vWorld.y*.58+time*.41),3.);
        vec3 E=vec3(mix(.32,.86,rise),.92,.83)*mix(.46,1.04,rise)*(.89+.16*stream);
        vec3 ambient=vec3(.41,.54,.48)*mix(.73,1.0,rise);
        vec3 c=E*(alb*max(ndl,0.)+trc*tr)*.85+alb*ambient;
        c+=E*spec*(.22+.78*rise)+E*trc*trans*pow(max(0.,dot(-V,L)),3.)*.58;
        c+=vec3(.018,.047,.038)*pow(1.-ndv,3.)*(.32+.68*rise);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.name='Rock-attached kelp clumps with bent, tattered blade silhouettes';
  mesh.frustumCulled=false;
  return {mesh,time,breathing};
}

function makeBenthic(heightAt) {
  const up=new T.Vector3(0,1,0),normal=new T.Vector3(),tr=new T.Object3D(),group=new T.Group();
  group.name='Clusters · frilled anemones, mussel valves, dull sponges and horn coral';
  function build(kind,seed){
    const rand=sampler(seed), pos=[],rgb=[],idx=[];
    const [dark,mid,tip]=COLONY_PALETTES[kind].map(s=>new T.Color(s)),col=new T.Color();
    function v(x,y,z,k){
      pos.push(x,y,z);col.copy(dark).lerp(mid,Math.min(k,1)).lerp(tip,Math.max(0,k-1));
      rgb.push(col.r,col.g,col.b);return pos.length/3-1;
    }
    function rings(n,l,point){
      const start=pos.length/3;
      for(let j=0;j<l;j++)for(let k=0;k<n;k++){
        const [x,y,z,tone]=point(k*TAU/n,j,k);
        const i=v(x,y,z,tone),next=start+j*n+(k+1)%n;
        if(j<l-1)idx.push(i,i+n,next,next,i+n,next+n);
      }
    }
    if(kind===0){
      const yaw=rand(0,TAU),h=rand(.75,1.12),shape=[.55,.61,.42,.61,.93,.56,.08],levels=[-.31,.08,.48,.76,.99,1.02,1.01];
      rings(11,shape.length,(a,j)=>{
        const r=shape[j]*(1+(.05+.11*(j>=3))*Math.sin(6*a+yaw));
        return [Math.cos(a)*r+.18*levels[j],h*levels[j],Math.sin(a)*r,.19+j*.19];
      });
      // Dense tapered curling frill, not thick symmetrical petals.
      for(let i=0;i<14;i++){
        const a=i*TAU/14+rand(-.014,.023),reach=rand(.88,1.16),c=Math.cos(a),s=Math.sin(a),curl=rand(-.12,.12);
        rings(3,3,(ang,j)=>{
          const k=j/2,r=.50+k*reach*.59,tt=(1-k)*rand(.096,.15)+.009;
          return [.18+c*r+Math.cos(ang)*tt*s,h*(.96+.29*Math.sin(k*2.45)+curl*k)+Math.sin(ang)*tt,-Math.cos(ang)*tt*c+s*r,.95+k*.32];
        });
      }
    }else if(kind===1){
      // Asymmetric, raised twin valve with real radial growth lines.
      rings(10,7,(a,j)=>{
        const k=j/6,x=(k-.49)*1.81,wide=Math.max(.015,Math.pow(Math.sin(k*Math.PI),.83))*(.22+.31*k);
        const ridge=1+.048*Math.sin(a*13+j*.63),c=Math.cos(a),s=Math.sin(a);
        const side=.61+.39*(s>0?1:.05);
        return [x,(c>0?.65:.28)*c*wide+(k*.34)-.11, s*wide*ridge*side, .27+.41*Math.abs(c)+.22*Math.pow(j%3/3,.44)];
      });
    }else if(kind===2){
      // Coalesced lobes rise only centimetres off the surface; grazing light
      // reveals their irregular dimples and porous surface.
      const n=3+(rand()<.57?1:0);
      for(let k=0;k<n;k++){
        const a=k*TAU/n, cx=.55*Math.cos(a),cz=.43*Math.sin(a),rr=rand(.39,.67),hh=rand(.35,.84);
        const rs=[.78,1,.87,.60,.34,.30,.04],ys=[-.30,-.01,.48,.69,.73,.41,.31];
        rings(8,7,(t,j)=>{
          const r=rs[j]*rr*(1+.12*Math.sin(3*t+a)+.07*Math.cos(t*5.));
          return [cx+r*Math.cos(t)+j*.022,ys[j]*hh,cz+r*Math.sin(t),j>=5?.12:.26+.58*j/6+.25*Math.sin(t*2.1+k)];
        });
      }
    }else{
      for(const path of coldCoral(seed)){
        const {pts,r}=path;
        rings(4,pts.length,(a,j)=>{
          const [x,y,z]=pts[j],k=j/(pts.length-1),w=r*(1-k*.67);
          return [x+Math.cos(a)*w,y,z+Math.sin(a)*w,.65+k*.54];
        });
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.setIndex(idx);g.computeVertexNormals();
    return g;
  }
  const data=benthicColonies(heightAt),rand=sampler(248252);
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.89,metalness:.01,side:T.DoubleSide});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vColonySurface;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvColonySurface=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vColonySurface;')
      .replace('#include <color_fragment>', `#include <color_fragment>
       vec3 cells=vColonySurface*28.;
       float grain=sin(cells.x*1.7)*sin(cells.y)*sin(cells.z+cells.x*.46);
       diffuseColor.rgb*=.91+.15*grain-.18*smoothstep(.28,.66,grain);`);
  };
  for(let kind=0;kind<4;kind++)for(let variant=0;variant<3;variant++){
    const sorted=new Map();
    for(const d of data)if(d.type===kind&&d.seed%3===variant){
      const region=Math.floor(d.z/18)+(d.x<0?0:100);
      if(!sorted.has(region))sorted.set(region,[]);
      sorted.get(region).push(d);
    }
    if(!sorted.size)continue;
    const shape=build(kind,2197+variant*1463);
    for(const ds of sorted.values()){
    const inst=new T.InstancedMesh(shape,mat,ds.length);
    for(let i=0;i<ds.length;i++){
      const d=ds[i],r=kind===0?.13:.18;
      const center=substrateY(heightAt,d.x,d.z,d.y), lx=substrateY(heightAt,d.x-r,d.z,center),
        rx=substrateY(heightAt,d.x+r,d.z,center),lz=substrateY(heightAt,d.x,d.z-r,center),
        rz=substrateY(heightAt,d.x,d.z+r,center);
      normal.set(lx-rx,2*r,lz-rz).normalize();
      if(kind===0||kind===3)normal.lerp(up,.37).normalize();
      tr.quaternion.setFromUnitVectors(up,normal);tr.rotateY(d.u);tr.rotateX(d.tilt*.19);
      tr.position.set(d.x,center-(kind===1?.021:.036),d.z);
      tr.scale.set(d.scale*rand(.85,1.14),d.scale*rand(.85,1.11),d.scale*rand(.85,1.13));
      tr.updateMatrix();inst.setMatrixAt(i,tr.matrix);
    }
    inst.computeBoundingSphere();group.add(inst);
    }
  }
  return group;
}

// A few backlit glints from the diver's regulator, not steady columns
// rising from inert sand. One world-space plume per audible exhalation.
function makeVents(surface){
  const rand=sampler(682147),drift=[],bubble=[];
  for(let i=0;i<15;i++){
    drift.push(rand(-1,1),rand(-1,1),rand(.23,.45),i*.063+rand(0,.09));
    bubble.push(i%6===0?rand(.024,.038):rand(.008,.020),rand(0,6.283),rand(.30,.88),rand(.14,.64));
  }
  const geometry=new T.InstancedBufferGeometry();
  geometry.setIndex([0,1,2,2,1,3]);
  geometry.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,-1,1,0,1,1,0],3));
  geometry.setAttribute('bubbleDrift',new T.InstancedBufferAttribute(new Float32Array(drift),4));
  geometry.setAttribute('bubbleShape',new T.InstancedBufferAttribute(new Float32Array(bubble),4));
  geometry.instanceCount=15;
  const age={value:0},origin={value:new T.Vector3()},shove={value:new T.Vector3()};
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,fog:true,toneMapped:false,
    uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),age,origin,shove,waterCeiling:{value:surface}},
    vertexShader:`
      uniform float age,waterCeiling;
      uniform vec3 origin,shove;
      attribute vec4 bubbleDrift,bubbleShape;
      varying vec2 uvB;
      varying float alive,s,phase;
      #include <fog_pars_vertex>
      void main(){
        vec4 a=bubbleDrift,b=bubbleShape;
        float t=max(0.,age-a.w),rise=t*a.z+.17*(1.-exp(-4.3*t));
        vec3 p=origin+shove*(.15+.54*(1.-exp(-2.2*t)))+vec3(
          a.x*(.045+t*.083)+sin(b.y+t*4.0)*.045*t,
          rise,
          a.y*(.044+t*.085)+cos(b.y+t*3.6)*.049*t
        );
        s=b.x*(.70+.23*t);phase=b.y;
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);
        float dist=length(mvPosition.xyz);
        alive=step(a.w,age)*smoothstep(0.,.22,t)*(1.-smoothstep(1.23,2.95+b.z,t))*
          (1.-smoothstep(waterCeiling-.18,waterCeiling,p.y))*smoothstep(.65,1.64,dist)*
          exp(-dist*.23)*(1.-smoothstep(9.,12.,dist));
        uvB=position.xy;
        mvPosition.xy+=uvB*s*vec2(1.22,.90+.13*sin(t*4.+b.y));
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      uniform float age;
      varying vec2 uvB;
      varying float alive,s,phase;
      #include <fog_pars_fragment>
      void main(){
        float ang=atan(uvB.y,uvB.x);
        float w=smoothstep(.017,.042,s);
        float r=length(uvB)/(.89+w*.068*sin(ang*3.+phase+age*3.));
        float aa=max(fwidth(r)*1.2,.028);
        float disc=1.-smoothstep(1.-aa,1.04,r);
        float rim=smoothstep(.62,.95,r)*(1.-smoothstep(.93,1.04,r));
        float glint=exp(-11.*dot(uvB-vec2(-.34,.47),uvB-vec2(-.34,.47)));
        float lower=exp(-18.*dot(uvB-vec2(.46,-.34),uvB-vec2(.46,-.34)));
        float crescent=.12+.30*smoothstep(-.45,.76,-uvB.x+uvB.y*.68);
        vec3 c=mix(vec3(.070,.135,.181),vec3(.51,.62,.67),clamp(glint+.46*lower+rim*crescent,0.,1.));
        gl_FragColor=vec4(c,disc*alive*(.025+rim*crescent+glint*.44+lower*.155));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  const mesh=new T.Mesh(geometry,material);
  mesh.frustumCulled=false;mesh.renderOrder=3;mesh.visible=false;
  mesh.name='Regulator exhale · sparse rising microbubbles';
  let cycle=-1,born=-100,previous=0;
  function tick(elapsed,reduced,eye,heading){
    if(reduced||!eye||!heading||!Number.isFinite(elapsed)){
      mesh.visible=false;return;
    }
    if(elapsed<previous){cycle=-1;born=-100;}
    previous=elapsed;
    const k=Math.floor(elapsed/4.8),q=elapsed-k*4.8;
    if(q>=4.8*.49&&q<4.8*.77&&k!==cycle){
      cycle=k;born=elapsed;
      origin.value.copy(eye).addScaledVector(heading,.71);
      origin.value.x+=heading.z*.24;origin.value.z-=heading.x*.24;
      origin.value.y-=.32;
      shove.value.copy(heading);
    }
    age.value=elapsed-born;
    mesh.visible=age.value<4.4;
  }
  return {mesh,tick};
}

export function buildLife(scene,{surfaceY=25,heightAt}={}) {
  const kelp=makeKelp(surfaceY,heightAt),fish=buildFishSchools(),benthic=makeBenthic(heightAt),vents=makeVents(surfaceY);
  scene.add(kelp.mesh,fish.mesh,benthic,vents.mesh);
  function tick(t,reducedMotion=false,eye=null,heading=null,elapsed=NaN,frustum=null) {
    const time=Number.isFinite(t)?t:0;
    kelp.time.value=reducedMotion?0:time;
    kelp.breathing.value=reducedMotion?0:1;
    vents.tick(elapsed,reducedMotion,eye,heading);
    fish.tick(time,reducedMotion,eye,frustum);
  }
  tick(0);
  return {tick};
}
