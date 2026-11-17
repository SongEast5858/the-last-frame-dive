import * as T from './vendor/three.module.js';
import {buildCapsule,paintLiteCapsule} from './capsule.js?v=10';
import {buildWreck} from './wreck.js?v=10';
import {buildLife} from './life.js?v=9';
import {buildWater} from './water.js?v=7';
import {paintLiteWreck} from './lite-wreck.js?v=10';
import {paintWater,paintLife,paintSearchRidge,liteContactHeight} from './lite-water.js?v=9';
import {makeCanvasFish} from './lite-fish.js?v=9';
import {buildTerrain} from './terrain.js?v=7';
import {SURFACE_Y,DEFAULT_TARGETS as targets} from './mission.mjs?v=10';
import {REEF_FORMATIONS} from './reef.js?v=9';
import {makeSeabedProps,CHAIN_MOUNT} from './seabed-props.mjs';

const clamp=(v,a,b)=>Math.max(a, Math.min(b,v));
const mix=(a,b,k)=>a+(b-a)*k;
const liteChainPoints=chain=>chain.slice(1).flatMap((b,j)=>Array.from({length:6},(_,i)=>({
  x:mix(chain[j].x,b.x,i/6),y:mix(chain[j].y,b.y,i/6),z:mix(chain[j].z,b.z,i/6)
})));

// Shared, original textured evidence used by WebGL and the portable renderer.
function evidenceArt(){
  let seed=19612571;
  const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)|0)>>>0)/4294967296;
  const R=(a,b)=>a+(b-a)*rnd();
  const plaque=document.createElement('canvas');plaque.width=448;plaque.height=192;
  const pg=plaque.getContext('2d');
  const brass=pg.createLinearGradient(0,0,448,192);brass.addColorStop(0,'#554931');brass.addColorStop(.43,'#9b8560');brass.addColorStop(1,'#464535');
  pg.fillStyle=brass;pg.fillRect(0,0,448,192);
  for(let k=0;k<1350;k++){pg.fillStyle=k%3?'#241e1c30':'#b9b89a32';pg.fillRect(R(0,448),R(0,192),R(.4,12),R(.2,2.1));}
  pg.strokeStyle='#b4a17b';pg.lineWidth=3;pg.strokeRect(17,16,414,160);
  pg.textAlign='center';pg.fillStyle='#eee0ae';pg.font='bold 47px sans-serif';pg.fillText('S.S. SEA MIST',224,86);pg.fillStyle='#2e2924';pg.font='bold 27px monospace';pg.fillText('REG.  07 – 61',224,131);
  return {plaque};
}

export function createOcean(canvas) {
  let renderer;
  try {
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  } catch (e) {
    return fallback(canvas);
  }
  renderer.setClearColor(0x061e2b);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches?1.1:1.28));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.16;
  const s=new T.Scene();
  s.background=new T.Color(0x0d293b);
  s.fog=new T.FogExp2(0x102e43,.032);
  const camera=new T.PerspectiveCamera(62,1,.08,212);
  camera.rotation.order='YXZ';
  const point=new T.Vector3(), fwd=new T.Vector3(), right=new T.Vector3(), up=new T.Vector3();
  const fishFrustum=new T.Frustum(),cameraClip=new T.Matrix4();
  let w=0,h=0,t=0,lampStrength=0;
  const hemi=new T.HemisphereLight(0x92b8d1,0x343b41,1.46);
  s.add(hemi);
  const sun=new T.DirectionalLight(0xa7cce0,2.35);
  sun.position.set(-36,81,61);sun.target.position.set(0,-9,13);s.add(sun,sun.target);
  // Bake directional occlusion for static ship/rocks; depth postprocessing works without a shadow.
  const shadowed=renderer.capabilities.isWebGL2;
  const roomy=!matchMedia('(pointer:coarse)').matches && shadowed;
  if(shadowed){
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;
  }
  if(roomy){
    sun.castShadow=true;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.10;sun.shadow.bias=-.00017;
    Object.assign(sun.shadow.camera,{left:-68,right:68,top:61,bottom:-61,near:20,far:185});
    sun.shadow.camera.updateProjectionMatrix();
  }
  const sunny=new T.Color(0xe5edf0),deepSun=new T.Color(0x8db3cd);
  const skyNear=new T.Color(0xafcbdc),skyDeep=new T.Color(0x759dbb);
  // Opaque bulkheads must not transmit decorative point lights.
  // The only movable source inside is a warm-white handheld torch.
  const light=new T.SpotLight(0xf5ebd6,0,22,.248,.73,1.65);
  light.target=new T.Object3D();s.add(light,light.target);
  const shadowEye=new T.Vector3(1e8,0,0),shadowDir=new T.Vector3(0,1,0);
  if(shadowed){
    light.castShadow=true;light.shadow.autoUpdate=false;
    const shadowSize=roomy?512:256;light.shadow.mapSize.set(shadowSize,shadowSize);
    light.shadow.bias=-.00024;light.shadow.normalBias=.020;
    light.shadow.camera.near=.12;light.shadow.camera.far=22;
    light.shadow.camera.updateProjectionMatrix();
  }

  let seed=19820311;
  const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)|0)>>>0)/4294967296;
  const R=(a,b)=>a+(b-a)*rnd();
  const makeTexture=(type)=>{
    const c=document.createElement('canvas'); c.width=c.height=128;
    const g=c.getContext('2d');
    g.fillStyle=type==='wood'?'#85817a':type==='sand'?'#887f65':'#858985';g.fillRect(0,0,128,128);
    for(let i=0;i<3500;i++){
      const v=Math.floor(R(25,212));
      g.fillStyle='rgba('+v+','+Math.floor(v*.94)+','+Math.floor(v*.82)+','+R(.055,.34)+')';
      if(type==='wood')g.fillRect(R(0,128),R(0,128),R(3,54),R(.3,1.8));else g.fillRect(R(0,128),R(0,128),R(.6,5),R(.6,4));
    }
    for(let i=0;i<type.length*10;i++){
      const x=R(0,128),y=R(0,128),rx=R(.5,type==='metal'?7:4),ry=R(.5,4);
      g.fillStyle=type==='metal'?'#4f493d77':'#16161757';
      g.beginPath();g.ellipse(x,y,rx,ry,R(0,6),0,6.283);g.fill();
    }
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=2;
    return tx;
  };
  const woodTx=makeTexture('wood'),steelTx=makeTexture('metal');
  const standard=(color,map,metalness=0,roughness=.83)=>new T.MeshStandardMaterial({color,map,metalness,roughness});
  const steels=[standard(0x465656,steelTx,.25),standard(0x5a5041,steelTx,.24),standard(0x3b5e5b,steelTx,.29),standard(0x5e554a,steelTx,.22),standard(0x304c50,steelTx,.34)];
  const timbers=[standard(0x695747,woodTx),standard(0x5e503c,woodTx),standard(0x655d4b,woodTx),standard(0x857050,woodTx),standard(0x586960,woodTx)];
  const rim=standard(0x809085,steelTx,.42,.63), copper=standard(0x8c6d4f,steelTx,.35), black=standard(0x20393c,steelTx,.24);
  const boxG=new T.BoxGeometry(1,1,1), cylG=new T.CylinderGeometry(1,1,1,9), nutG=new T.IcosahedronGeometry(1,0);
  const grp=new T.Group();s.add(grp);
  function obj(geo,mat,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent=grp){
    const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);parent.add(o);return o;
  }
  const box=(mat,x,y,z,sx,sy,sz,rx,ry,rz,p)=>obj(boxG,mat,x,y,z,sx,sy,sz,rx,ry,rz,p);
  const terrain=buildTerrain(s,REEF_FORMATIONS);
  const wreck=buildWreck(s,{detail:roomy?1:.66});
  const dummy=new T.Object3D();
  const supportAt=(x,z)=>terrain.supportAt?.(x,z)?.y??terrain.heightAt(x,z);
  const {chain:chainFloor,steel}=makeSeabedProps(supportAt);
  const chainPath=chainFloor.map(v=>new T.Vector3(v.x,v.y,v.z));
  box(steels[1],CHAIN_MOUNT.x-.29,CHAIN_MOUNT.y,CHAIN_MOUNT.z,.64,.28,.35,0,0,0);
  if(shadowed){
    terrain.root?.traverse(o=>{if(o.isMesh){o.receiveShadow=true;if(roomy&&!o.isInstancedMesh&&!/sand|seabed|sediment/i.test(o.name))o.castShadow=true;}});
    wreck.root?.traverse(o=>{if(o.isMesh){o.receiveShadow=true;if(!o.isInstancedMesh&&!/glass|window|light/i.test(o.name))o.castShadow=true;}});
  }
  const chainCurve=new T.CatmullRomCurve3(chainPath), chainGeo=new T.TorusGeometry(.19,.045,7,12);
  const chain=new T.InstancedMesh(chainGeo,steels[1],Math.round(chainCurve.getLength()/.32));
  const zAxis=new T.Vector3(0,0,1),chainAxis=new T.Vector3();
  for(let i=0;i<chain.count;i++){
    const frac=i/(chain.count-1);
    dummy.position.copy(chainCurve.getPointAt(frac));chainAxis.copy(chainCurve.getTangentAt(frac));
    const contact=chainFloor[chainFloor.length-4];
    if(dummy.position.z>=contact.z)dummy.position.y=supportAt(dummy.position.x,dummy.position.z)+.065;
    dummy.quaternion.setFromUnitVectors(zAxis,chainAxis);dummy.rotateY(Math.PI/2);dummy.rotateX(i%2?Math.PI*.49:.13);
    dummy.scale.set(1.38,.78,.89);dummy.updateMatrix();chain.setMatrixAt(i,dummy.matrix);
  }
  chain.computeBoundingSphere();grp.add(chain);
  const metalG=new T.BoxGeometry(1,1,1);
  obj(metalG,steels[3],steel.x,steel.y,steel.z,1.75,.16,.26,-steel.pitch,.63,steel.roll);
  const {plaque}=evidenceArt();
  // A ship identification plate is the first mission subject.
  const fr=new T.Group();fr.position.set(targets.frame.x,targets.frame.y,targets.frame.z);fr.rotation.set(-.10,Math.PI*.5,-.055);grp.add(fr);
  for(let z=-1;z<=1;z+=2){
    box(copper,z*.528,0,0,.099,.62,.10,0,0,z*.04,fr);
    box(copper,0,z*.273,.02,1.06,.078,.107,0,0,z*.025,fr);
  }
  box(timbers[1],.015,-.012,-.034,1.108,.48,.067,0,0,.029,fr);
  box(steels[1],.02,-.5,-.22,1.34,.23,.72,0,0,0,fr);

  const plaqueTx=new T.CanvasTexture(plaque);plaqueTx.colorSpace=T.SRGBColorSpace;
  const plaqueM=new T.MeshStandardMaterial({map:plaqueTx,metalness:.19,roughness:.75,emissive:0x4f3822,emissiveIntensity:.045});
  obj(new T.PlaneGeometry(.998,.425),plaqueM,0,-.012,.055,1,1,1,0,0,0,fr);

  const underwaterLife=buildLife(s,{surfaceY:SURFACE_Y,heightAt:supportAt});
  const waterTime={value:0};
  const capsule=buildCapsule(s);
  const water=buildWater(s,waterTime,{sunLight:sun,torchLight:light,surfaceY:SURFACE_Y});
  water.applyCaustics(grp);
  if(shadowed)grp.traverse(o=>{if(o.isMesh&&!o.material?.transparent)o.receiveShadow=true;});
  if(terrain?.root)water.applyCaustics(terrain.root);
  if(wreck?.root)water.applyCaustics(wreck.root);
  if(capsule?.root)water.applyCaustics(capsule.root);
  if(roomy)renderer.shadowMap.needsUpdate=true;

  const particleG=new T.BufferGeometry(), n=roomy?1850:1360;
  const pP=new Float32Array(n*3),pA=new Float32Array(n);
  for(let i=0;i<n;i++){pP[i*3]=R(-37,37);pP[i*3+1]=R(-17,SURFACE_Y);pP[i*3+2]=R(-82,126);pA[i]=R(0,1);}
  particleG.setAttribute('position',new T.BufferAttribute(pP,3));particleG.setAttribute('aSeed',new T.BufferAttribute(pA,1));
  const lampUniform={value:0}, eyeUniform={value:new T.Vector3()}, dirUniform={value:new T.Vector3(0,0,-1)};
  const plankton=new T.Points(particleG,new T.ShaderMaterial({
    uniforms:{uTime:waterTime,uLamp:lampUniform,uEye:eyeUniform,uDir:dirUniform,uPixel:{value:renderer.getPixelRatio()}},
    vertexShader:`attribute float aSeed; uniform float uTime,uLamp,uPixel; uniform vec3 uEye,uDir; varying float vAlpha,vLamp;
      void main(){vec3 p=position;p.y=-17.+mod(position.y+17.+uTime*mix(.012,.078,aSeed),42.);p.x+=sin(p.z*.22+uTime*.12)*.27+uTime*.018;p.z+=sin(p.y*.36+uTime*.10)*.17;
      vec4 v=modelViewMatrix*vec4(p,1.);float dist=length(v.xyz);vLamp=smoothstep(.961,.995,dot(normalize(p-uEye),uDir))*uLamp*exp(-dist*.141);
      gl_Position=projectionMatrix*v;gl_PointSize=clamp((mix(1.0,15.,aSeed)*uPixel)/max(1.65,-v.z),1.,4.7);vAlpha=mix(.016,.235,aSeed)*exp(-dist*.092)*smoothstep(.46,2.2,dist);}`,
    fragmentShader:`varying float vAlpha,vLamp;void main(){float d=distance(gl_PointCoord,vec2(.5));float k=1.-smoothstep(.04,.49,d);gl_FragColor=vec4(mix(vec3(.29,.39,.41),vec3(.71,.74,.67),vLamp),k*(vAlpha+vLamp*.43));}`,
    transparent:true,depthWrite:false,blending:T.AdditiveBlending
  }));
  plankton.frustumCulled=false;s.add(plankton);
  function project(p){
    const p0=point.set(p.x,p.y,p.z);
    const front=p0.clone().sub(camera.position).dot(fwd)>0;
    p0.project(camera);
    return {x:(p0.x*.5+.5)*w,y:(.5-p0.y*.5)*h,visible:front&&Math.abs(p0.x)<1.06&&Math.abs(p0.y)<1.06,z:p0.z};
  }
  let useComposite=typeof water.render==='function';
  function draw(state={},dt=0){
    const cw=canvas.clientWidth||window.innerWidth,ch=canvas.clientHeight||window.innerHeight;
    if(cw!==w||ch!==h){w=cw;h=ch;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();}
    const minimal=!!state.reducedMotion;
    if(!minimal)t+=Math.min(.08,Math.max(0,dt||0));
    camera.position.set(state.x??targets.start.x,(state.y??targets.start.y)+(minimal?0:.021*Math.sin(t*1.21)),state.z??targets.start.z);
    camera.rotation.set(state.pitch??targets.start.pitch,state.yaw??0,minimal?0:.0037*Math.sin(t*.77),'YXZ');
    camera.updateMatrixWorld();camera.getWorldDirection(fwd);
    fishFrustum.setFromProjectionMatrix(cameraClip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    lampStrength+=(!!state.lamp?1-lampStrength:-lampStrength)*Math.min(1,(dt||.018)*9);
    const pulse=clamp(Number(state.pulse)||0,0,1);
    right.set(1,0,0).applyQuaternion(camera.quaternion);
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    light.position.copy(camera.position).addScaledVector(right,.11).addScaledVector(up,-.10).addScaledVector(fwd,-.20);
    light.target.position.copy(light.position).addScaledVector(fwd,12);
    light.target.updateMatrixWorld();
    const depth=SURFACE_Y-camera.position.y;
    const chamber=(Math.abs(camera.position.x)<7.7&&camera.position.y<-3.3&&camera.position.z<13.85&&camera.position.z>-17.2);
    hemi.intensity=(chamber?.91:1.51)*Math.exp(-Math.max(0,depth-18)*.018);
    const oceanDepth=clamp((depth-2)/31,0,1);
    hemi.color.copy(skyNear).lerp(skyDeep,oceanDepth);
    sun.color.copy(sunny).lerp(deepSun,oceanDepth);
    // On the low tier without a baked sun map, cabin light remains diffuse.
    sun.intensity=(chamber&&!roomy?.03:2.62)*Math.exp(-Math.max(0,depth-6)*.035);
    light.intensity=(chamber?56:104)*lampStrength+23*pulse;
    if(shadowed&&light.intensity>1.2&&
      (!(light.shadow.map)||light.position.distanceToSquared(shadowEye)>(roomy?.008:.029)||fwd.dot(shadowDir)<(roomy?.99991:.99972))){
      shadowEye.copy(light.position);shadowDir.copy(fwd);
      light.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
    }
    lampUniform.value=lampStrength;eyeUniform.value.copy(camera.position);dirUniform.value.copy(fwd);
    waterTime.value=t;underwaterLife.tick(t,minimal,camera.position,fwd,state.scene==='intro'?NaN:state.elapsed,fishFrustum);
    capsule.tick(t,minimal);
    const ahead=state.z??targets.start.z;
    const searchHaze=1-clamp((66-ahead)/11,0,1);
    s.fog.density=.031+.023*searchHaze;
    water.setMedium({torch:lampStrength,pulse,position:light.position,direction:fwd,search:searchHaze,chamber});
    if(useComposite){
      try{water.render(renderer,camera,minimal);}
      catch(error){useComposite=false;renderer.setRenderTarget(null);console.warn('使用基础海水渲染',error);renderer.render(s,camera);}
    }else renderer.render(s,camera);
  }
  draw(targets.start,0);
  return {targets,project,draw,heightAt:terrain.heightAt,shipDetail:roomy?1:.64,available:true,camera,dispose(){water.dispose?.();renderer.dispose();}};
}

function fallback(canvas){
  let g=null;try{g=canvas.getContext('2d');}catch(e){}
  if(!g){canvas.style.background='linear-gradient(145deg,#256477 0%,#0c3442 46%,#061622 78%)';}
  const cover=new Image();cover.src=new URL('./media/water-ambient-v4.webp',import.meta.url).href;
  let w=0,h=0,time=0;
  const view={...targets.start};
  const chainLite=liteChainPoints(makeSeabedProps(liteContactHeight).chain);
  const art=g?evidenceArt():null;
  const fishSprites=g?makeCanvasFish({patrol:'fish-patrol-side',school:'fish-school-side',reef:'fish-reef-side'}):null;
  const foreFish=[];
  function project(p){
    const dx=p.x-view.x,dy=p.y-view.y,dz=p.z-view.z,yaw=view.yaw,pitch=view.pitch;
    const forward=-(dz*Math.cos(yaw)+dx*Math.sin(yaw));
    const x=dx*Math.cos(yaw)-dz*Math.sin(yaw),y=dy*Math.cos(pitch)-forward*Math.sin(pitch),z=dy*Math.sin(pitch)+forward*Math.cos(pitch);
    return {x:w/2+x*h*.84/Math.max(.01,z),y:h/2-y*h*.84/Math.max(.01,z),z,visible:z>.2};
  }
  function draw(state,dt){
    Object.assign(view,state||{});
    w=canvas.clientWidth||innerWidth;h=canvas.clientHeight||innerHeight;
    if(!g)return;
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if(!state?.reducedMotion)time+=dt||0;
    paintWater(g,project,view,w,h,time,cover);
    foreFish.length=0;
    paintLife(g,project,view,w,h,time,(ctx,entry,state,...o)=>{
      const sameExposedSide=state.x>7.5&&entry.v.x>7.5 || state.x< -7.5&&entry.v.x< -7.5 ||
        state.x>5.05 && entry.v.x>5.05 && Math.min(state.z,entry.v.z)>69 && entry.v.y> -7.4;
      if(fishSprites&&entry.d.kind===1&&entry.p.z<22&&sameExposedSide){
        foreFish.push(entry);return true;
      }
      return fishSprites?.paint(ctx,entry,state,...o);
    });
    if(view.z<66){
      g.save();g.globalAlpha=clamp((66-view.z)/11,0,1);
      paintLiteWreck(g,project,view,{w,h,t:time});g.restore();
    }
    if(view.z>39){
      g.save();
      for(let i=chainLite.length-1;i>0;i--){
        const a=project(chainLite[i]),b=project(chainLite[i-1]);
        if(a.z<.3||b.z<.3||a.z>37||a.x<-100||a.x>w+100||a.y>h+80)continue;
        const r=clamp(h*.26/a.z,1.6,25),steel=clamp(1-a.z/52,.12,.79);
        g.lineWidth=Math.max(1,r*(i%2?.27:.30));g.strokeStyle='rgba(131,126,97,'+steel+')';
        g.beginPath();g.ellipse(a.x,a.y,r,r*(i%2?.26:.46),Math.atan2(b.y-a.y,b.x-a.x),0,Math.PI*2);g.stroke();
        g.lineWidth=Math.max(.5,r*.1);g.strokeStyle='rgba(185,171,127,'+steel*.52+')';g.beginPath();g.ellipse(a.x,a.y-1,r,r*.38,Math.atan2(b.y-a.y,b.x-a.x),3.6,5.6);g.stroke();
      }
      g.restore();
    }
    paintSearchRidge(g,project,view,w,h);
    for(const entry of foreFish)fishSprites.paint(g,entry,view,w,h,time);
    paintLiteCapsule(g,project,view,w,h,time);
    function localGlow(point,size,color){
      const m=project(point);if(!m.visible||m.x<-90||m.x>w+90||m.y<-90||m.y>h+90)return null;
      const d=clamp(size/Math.max(.65,m.z),4,92),ell=g.createRadialGradient(m.x,m.y,0,m.x,m.y,d*2.35);
      ell.addColorStop(0,color);ell.addColorStop(1,'#6bbba700');
      g.fillStyle=ell;g.fillRect(m.x-d*2.35,m.y-d*2.35,d*4.7,d*4.7);return {...m,d};
    }
    const stage=state?.phase;
    const target=targets.frame;
    if(view.x>7.8&&view.z>11&&view.z<38){
      const marker=localGlow(target,125,view.guide?'#b6aa6855':view.lamp?'#a59a7322':'#00000000');
      if(marker&&marker.z>.43&&marker.z<12&&art){
        const halfW=.54,halfH=.235,facing=view.x>8.30;
        const p=(u,v)=>project({x:target.x+.062,y:target.y+v,z:target.z-u});
        const a=p(-halfW,halfH),b=p(halfW,halfH),c=p(-halfW,-halfH),source=art.plaque;
        if(facing&&Math.min(a.z,b.z,c.z)>.26){
          g.save();g.transform((b.x-a.x)/source.width,(b.y-a.y)/source.width,(c.x-a.x)/source.height,(c.y-a.y)/source.height,a.x,a.y);
          g.globalAlpha=state.lamp?.86:.58;g.fillStyle='#514f3d';g.fillRect(-14,-15,source.width+28,source.height+30);
          g.drawImage(source,0,0);g.restore();
        }
      }
    }
    if(['landing','passage','bonus','turn','portgate'].includes(stage)&&Math.abs(view.x)<5.3&&view.y<-6.2){
      const dark=g.createRadialGradient(w*.49,h*.50,h*.12,w*.50,h*.51,h*.91);
      dark.addColorStop(0,'#061f2800');dark.addColorStop(.72,'#0019202c');dark.addColorStop(1,'#00162075');
      g.fillStyle=dark;g.fillRect(0,0,w,h);
    }
    const vignette=g.createRadialGradient(w*.54,h*.46,h*.16,w*.52,h*.50,w*.64);vignette.addColorStop(0,'#001c2100');vignette.addColorStop(1,'#001018ca');g.fillStyle=vignette;g.fillRect(0,0,w,h);
    if(state?.lamp){const light=g.createRadialGradient(w*.53,h*.54,0,w*.53,h*.54,h*.48);light.addColorStop(0,'#ceebc949');light.addColorStop(.39,'#bee5cc16');light.addColorStop(1,'#baead400');g.fillStyle=light;g.fillRect(0,0,w,h);}
    for(let i=0;i<139;i++){const x=(i*103.51+Math.sin(time*.44+i)*8)%w,y=(i*79.7-time*(1+i%3)+h*100)%h;g.fillStyle='rgba(190,237,228,'+(.10+(i%4)*.05)+')';g.fillRect(x,y,i%4<1?2:1,i%4<1?2:1);}
  }
  draw(view,0);
  return {targets,project,draw,available:false,fallback:true,shipDetail:.64,dispose(){fishSprites?.dispose();}};
}
