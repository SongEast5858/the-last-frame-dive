import * as T from './vendor/three.module.js';
import { buildFishSchools } from './model-fish.js?v=7';
import { fieldRand as sampler, kelpPlaces, benthicColonies, coralBranches, spongeTubes } from './reef.js';

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
  const beds=kelpPlaces(), clumpField=(x,z)=>Math.sin(x*.17+z*.24)+.72*Math.cos(z*.36-x*.21);
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
  const colors=[
    [new T.Color('#514740'),new T.Color('#827367')],
    [new T.Color('#45464a'),new T.Color('#80716a')],
    [new T.Color('#565749'),new T.Color('#978668')],
    [new T.Color('#403937'),new T.Color('#6a5646')],
  ];
  function geometry(kind,seed){
    const pos=[], rgb=[], idx=[], v=new T.Vector3(), axis=new T.Vector3(), side=new T.Vector3(),
      front=new T.Vector3(), tan=new T.Vector3(), p=new T.Vector3();
    const [dark,tip]=colors[kind];
    function add(x,y,z,c){
      pos.push(x,y,z);rgb.push(c.r,c.g,c.b);return pos.length/3-1;
    }
    const random=sampler(seed+498194);
    if(kind===3){
      const out=[], verts=[], patch=new T.IcosahedronGeometry(1,2),
        p=patch.getAttribute('position');
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        const grain=Math.sin(x*10.+z*5.+seed)*Math.cos(z*9.+y*5.);
        const lobes=.91+.18*Math.sin(x*6.+z*4.+seed)+.10*grain;
        verts.push(x*lobes,y*(.28+.09*grain)+.055*lobes,z*lobes);
        const c=dark.clone().lerp(tip,.37+.27*grain+.20*y);
        out.push(c.r,c.g,c.b);
      }
      // Small coalescing mussels, pale barnacle rims and exposed centers.
      // Reuse one low-poly shell for each local, irregular settlement.
      const shell=new T.IcosahedronGeometry(1,0),q=shell.getAttribute('position');
      const colony=new T.Color(seed%2?'#373d40':'#938a72'), mixed=new T.Color();
      const cx=random(-.38,.38),cz=random(-.35,.35);
      for(let j=0;j<7;j++){
        const x=cx+random(-.41,.41),z=cz+random(-.41,.41),r=random(.043,.11),
          y=.22*Math.sqrt(Math.max(0,1-x*x-z*z)),
          heading=random(0,TAU),co=Math.cos(heading),si=Math.sin(heading);
        for(let k=0;k<q.count;k++){
          const sx=q.getX(k)*r*(seed%2?1.43:1),sy=q.getY(k)*r*.57,sz=q.getZ(k)*r*.76;
          verts.push(x+sx*co-sz*si,y+sy,z+sx*si+sz*co);
          mixed.copy(colony).multiplyScalar(.70+.25*q.getY(k)+.19*random());
          out.push(mixed.r,mixed.g,mixed.b);
        }
      }
      patch.dispose();shell.dispose();
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
      geo.setAttribute('color',new T.Float32BufferAttribute(out,3));
      geo.computeVertexNormals();
      return geo;
    }
    const paths=kind===2?spongeTubes(seed).filter(()=>random()>.20):coralBranches(seed,kind===1);
    const thick=kind===2, seg=thick?8:5;
    for(const {pts,r,depth} of paths){
      const start=pos.length/3;
      for(let i=0;i<pts.length;i++){
        const f=i/(pts.length-1),p0=pts[Math.max(0,i-1)],p1=pts[Math.min(pts.length-1,i+1)];
        p.set(...pts[i]);
        tan.set(...p1).sub(axis.set(...p0)).normalize();
        axis.set(Math.abs(tan.y)>.83?1:0,Math.abs(tan.y)>.83?0:1,0);
        side.crossVectors(tan,axis).normalize();front.crossVectors(side,tan).normalize();
        const rr=thick?r*(.80+.25*f):r*(i===4?.36:1-.22*i/3);
        for(let j=0;j<seg;j++){
          const a=j*TAU/seg,c=Math.cos(a),s=Math.sin(a);
          const uneven=1+.15*Math.sin(3*a+2.3*f)+.09*Math.cos(5*a-3*f+seed);
          v.copy(p).addScaledVector(side,c*rr*uneven).addScaledVector(front,s*rr);
          const tone=thick?.28+f*.58:.32+(3-depth)*.13+f*.14;
          const color=dark.clone().lerp(tip,tone).multiplyScalar(.85+.18*s+.13*f);
          const vi=add(v.x,v.y,v.z,color);
          if(i+1<pts.length){
            const q=start+i*seg+(j+1)%seg;
            idx.push(vi,q,vi+seg,q,q+seg,vi+seg);
          }
        }
      }
      const e=pts.at(-1),base=start+(pts.length-1)*seg;
      const throat=thick?dark.clone().multiplyScalar(.23):tip;
      const nail=add(e[0],e[1]-(thick?r*1.2:0),e[2],throat);
      for(let j=0;j<seg;j++)idx.push(base+j,base+(j+1)%seg,nail);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
    geo.setIndex(idx);geo.computeVertexNormals();
    return geo;
  }
  const data=benthicColonies().filter(d=>d.seed%13!==1), group=new T.Group(), transform=new T.Object3D();
  const rand=sampler(29461245),up=new T.Vector3(0,1,0),normal=new T.Vector3();
  for(const d of data){
    // Broad, discontinuous crusts dominate the minor life. Leave exposed
    // rock; occasional upright sponges and fans emerge from held substrate.
    const onRock=d.seed>0 && d.scale>.59;
    if(!onRock || (d.type<2 && d.tone<.81) || (d.type===2 && d.tone<.54))d.type=3;
  }
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0,side:T.DoubleSide});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vColonySurface;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvColonySurface=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vColonySurface;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cells=vColonySurface*65.;
        float pores=sin(cells.x)*sin(cells.y)*sin(cells.z+cells.x*.46);
        float mottling=sin(cells.x*.12+cells.y*.24)*sin(cells.z*.15-cells.y*.10);
        diffuseColor.rgb*=.91+mottling*.15-smoothstep(.48,.85,pores)*.30;`);
  };
  group.name='Encrusting sponge patches with sporadic fans and irregular oscula';
  for(let kind=0;kind<4;kind++)for(let variant=0;variant<3;variant++){
    const ds=data.filter(d=>d.type===kind && d.seed%3===variant);
    if(!ds.length)continue;
    const inst=new T.InstancedMesh(geometry(kind,2197+variant*1463),mat,ds.length);
    for(let i=0;i<ds.length;i++){
      const d=ds[i];
      const s=d.scale,ground=substrateY(heightAt,d.x,d.z,d.y);
      const radius=kind===3?.64*s:.21*s;
      const left=substrateY(heightAt,d.x-radius,d.z,ground),
        right=substrateY(heightAt,d.x+radius,d.z,ground),
        back=substrateY(heightAt,d.x,d.z-radius,ground),
        front=substrateY(heightAt,d.x,d.z+radius,ground);
      // Large encrusting patches follow a real slope, then seat slightly into
      // the most exposed footprint edge. Steep steps receive thin patches,
      // not sky-blue silhouettes under an unsupported plate.
      const relief=Math.max(left,right,front,back,ground)-Math.min(left,right,front,back,ground);
      const contact=Math.min(ground,...[left,right,back,front].map(y=>Math.max(y,ground-.16)));
      normal.set(left-right,Math.max(.16,radius*2),back-front).normalize();
      if(kind!==3)normal.lerp(up,.68).normalize();
      transform.quaternion.setFromUnitVectors(up,normal);
      transform.rotateY(d.u);transform.rotateX(Math.sin(d.u)*d.tilt*.32);
      const span=kind===3&&relief>.55?.64:1;
      transform.position.set(d.x,contact-(kind===3?.065:.10),d.z);
      transform.scale.set(s*rand(.70,1.16)*span,s*(kind===3?rand(.40,.71):rand(.49,.81)),s*rand(.66,1.29)*span);
      transform.updateMatrix();inst.setMatrixAt(i,transform.matrix);
    }
    inst.computeBoundingSphere();
    group.add(inst);
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
