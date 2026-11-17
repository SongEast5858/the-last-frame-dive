import * as T from './vendor/three.module.js';

// Adapted from Noniv / Abyssal Garden (MIT), a596354.
// Direct GLSL ports: W_WATER, cuv/caus, fogIn, W_SURF, W_RAYS, W_RBLUR and W_POST ray upsample.
// Adaptations: Three's conventional depth, scaled meters, color/contrast, material and shadow integration.
export const SURFACE_Y=25;

const gridVert=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
`;

const waveBake=`
uniform float uTime;
varying vec2 vUv;
const float TAU=6.2831853;
float caus(vec2 uv,float t){
  vec2 p=uv*TAU;vec2 i=p;float c=0.;
  for(int n=1;n<=5;n++){
    float tt=t*(1.-3.5/float(n));
    i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    float s=sin(i.x+tt),k=cos(i.y+tt);
    c+=abs(s*k)/(1.25*sqrt(s*s+k*k)+1e-4);
  }
  c=1.17-pow(c/5.,1.4);
  return pow(abs(c),8.);
}
vec3 wk(int i){
  if(i==0)return vec3(1.,2.,1.);
  if(i==1)return vec3(-2.,1.,.9);
  if(i==2)return vec3(3.,1.,.6);
  if(i==3)return vec3(1.,-4.,.5);
  if(i==4)return vec3(4.,3.,.4);
  if(i==5)return vec3(-3.,5.,.32);
  if(i==6)return vec3(6.,-2.,.28);
  if(i==7)return vec3(5.,7.,.2);
  if(i==8)return vec3(-8.,3.,.18);
  return vec3(2.,11.,.14);
}
void main(){
  float t=uTime;
  float c=caus(vUv,t*.45+23.);
  vec2 wu=vUv+.02*vec2(sin(TAU*(vUv.y*2.+.1*t)),cos(TAU*(vUv.x*3.-.07*t)));
  vec2 s=vec2(0.);
  for(int i=0;i<10;i++){
    vec3 k=wk(i);
    float angle=dot(k.xy,wu)*TAU+t*(.5+.35*sqrt(length(k.xy)))*(1.-2.*mod(float(i),2.))+float(i)*1.7;
    s+=k.xy*k.z*cos(angle);
  }
  // Packed signed slopes in BA so the same mipmapped bake works on ordinary RGBA8.
  gl_FragColor=vec4(min(c*.27,1.),min(c*.27,1.),s*.06*.30+.5);
}
`;

const optics=`
uniform sampler2D uDiveWaves;
uniform float uSurfaceY;
uniform vec3 uDiveSun;
const vec3 AG_SIG=vec3(.056,.029,.021);
const vec3 AG_KD=vec3(.067,.029,.018);
const vec3 AG_WC=vec3(.078,.32,.49);
const vec3 AG_SUNC=vec3(1.70,1.60,1.45);
float agSat(float a){return clamp(a,0.,1.);}
float agIgn(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
vec2 agProject(vec3 p){return p.xz-uDiveSun.xz*((p.y-uSurfaceY)/uDiveSun.y);}
float agNet(vec2 p){return texture2D(uDiveWaves,p).r/.27;}
vec2 agSlope(vec2 p){return (texture2D(uDiveWaves,p).ba-.5)/.30;}
vec3 agBend(vec3 ro,vec3 rd,float d){
  vec3 a=AG_SIG-AG_KD*rd.y;
  // Stable limit for a = 0 (choose its positive limiting integral).
  a=sign(a+1e-7)*max(abs(a),vec3(1e-4));
  vec3 i=(1.-exp(clamp(-a*d,-26.,9.)))/a;
  float mu=max(dot(rd,uDiveSun),0.);
  return AG_WC*AG_SIG*exp(AG_KD*(ro.y-uSurfaceY))*i*(1.22+.3*pow(mu,4.));
}
`;

const surfaceVert=`
uniform float uTime;
varying vec3 vWorld;
void main(){
  vec3 p=(modelMatrix*vec4(position,1.)).xyz;
  p.y+=sin(.19*p.x+.23*p.z+uTime*.72)*.19+sin(.47*p.x-.41*p.z-uTime*.63)*.08+sin(.81*p.z+uTime*1.24)*.035;
  vWorld=p;
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}
`;
const surfaceFrag=`
varying vec3 vWorld;
uniform float uOpticalComposite;
${optics}
void main(){
  vec3 v=vWorld-cameraPosition;float d=length(v);vec3 V=v/max(d,1e-3);
  float fl=1.-smoothstep(60.,190.,d);
  vec2 p=vWorld.xz;
  vec2 s=(agSlope(p/13.)+agSlope(p.yx/4.7+.2)*.7+agSlope(p/37.+.6)*.8)*fl;
  vec3 n=normalize(vec3(-s.x*.8,-1.,-s.y*.8));
  float ci=agSat(dot(V,-n));
  float k=1.-1.769*(1.-ci*ci);
  float win=smoothstep(0.,.22,k);
  vec3 rr=refract(V,n,1.33),R=reflect(V,n);
  float sd=max(dot(rr,uDiveSun),0.);
  float fr=pow(1.-sqrt(max(k,0.)),5.);
  vec3 sky=(vec3(.40,.70,.94)*1.05*clamp(1.+3.8*(s.x*.6-s.y*.8),.25,3.)+
     vec3(1.,.95,.85)*(pow(sd,60.)*.98+pow(sd,500.)*7.6))*(1.-fr);
  vec3 reflected=agBend(vWorld,R,75.)*.90;
  vec3 radiance=mix(reflected,sky,win);
  vec3 c=mix(radiance*exp(-AG_SIG*d)+agBend(cameraPosition,V,d)*.51,radiance,uOpticalComposite);
  gl_FragColor=vec4(max(c,vec3(0.)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
const rayFrag=`
varying vec2 vUv;
uniform sampler2D uDepth,uSunDepth,uTorchDepth;
uniform mat4 uProjectionInverse,uCameraWorld,uSunShadowMatrix,uTorchShadowMatrix;
uniform vec3 uCameraPos;
uniform float uRaySteps,uUseSunShadow,uUseTorchShadow,uRayStrength,uCameraFar,uLamp,uPulse;
uniform vec3 uTorchPos,uTorchDir;
#include <packing>
${optics}
uniform highp sampler3D uMist;
float agSunVis(vec3 p){
  if(uUseSunShadow<.5)return 1.;
  vec4 q=uSunShadowMatrix*vec4(p,1.);
  vec3 s=q.xyz/q.w;
  if(min(s.x,s.y)<0.||max(s.x,s.y)>1.||s.z<0.||s.z>1.)return 1.;
  return mix(.09,1.,step(s.z-.00065,unpackRGBAToDepth(texture2D(uSunDepth,s.xy))));
}
float agTorchVis(vec3 p){
  if(uUseTorchShadow<.5)return 1.;
  vec4 q=uTorchShadowMatrix*vec4(p,1.);
  vec3 s=q.xyz/q.w;
  if(q.w<=0.||min(s.x,s.y)<0.||max(s.x,s.y)>1.||s.z<0.||s.z>1.)return 0.;
  return step(s.z-.0011,unpackRGBAToDepth(texture2D(uTorchDepth,s.xy)));
}
void main(){
  float dp=texture2D(uDepth,vUv).r;
  vec4 v=uProjectionInverse*vec4(vUv*2.-1.,dp*2.-1.,1.);
  vec3 eye=v.xyz/v.w;
  float zl=abs(eye.z);
  vec3 rd=normalize(mat3(uCameraWorld)*eye);
  float tm=min(length(eye),120.);
  if(rd.y>1e-4)tm=min(tm,max(0.,(uSurfaceY-uCameraPos.y)/rd.y));
  float dt=tm/uRaySteps;
  float j=agIgn(gl_FragCoord.xy);
  vec3 acc=vec3(0.);
  for(int n=0;n<24;n++){
    if(float(n)>=uRaySteps)break;
    float t=(float(n)+j)*dt;
    vec3 p=uCameraPos+rd*t;
    vec2 q=agProject(p);
    float a=texture2D(uDiveWaves,q/27.,3.2).r/.27;
    float b=texture2D(uDiveWaves,q.yx/11.+.3,2.8).r/.27;
    // Pinned two-band projected optics, with tighter thresholds for this shallower wreck volume.
    float pat=smoothstep(.48,1.26,a)*smoothstep(.38,.99,b);
    float o=texture(uMist,(p-vec3(-96.,-30.,-112.))/vec3(192.,58.,224.)).r;
    float mist=agSat(1.-(o-.5)*3.4);
    float vis=agSunVis(p);
    acc+=exp(-AG_SIG*t+AG_KD*((p.y-uSurfaceY)/uDiveSun.y))*(vis*(.012+pat*6.)*(1.+1.2*mist*mist));
  }
  float mu=max(dot(rd,uDiveSun),0.);
  vec3 shafts=acc*dt*AG_SIG*(AG_WC+vec3(.035,.065,.065))*AG_SUNC*(.13+2.16*mu*mu*mu)*uRayStrength;
  // A small, off-axis torch adds local backscatter. The depth texture caps
  // both the sun and torch integration so neither cone crosses cabin walls.
  if(uLamp>.015||uPulse>.015){
    float maxT=min(tm,15.),ld=maxT/8.,mote=0.;
    for(int n=0;n<8;n++){
      float t=(float(n)+.55)*ld;
      vec3 p=uCameraPos+rd*t,fromLamp=p-uTorchPos;
      float d=length(fromLamp),co=dot(fromLamp/max(d,.001),uTorchDir);
      float aim=smoothstep(.970,.994,co);
      float born=smoothstep(.28,2.8,t);
      if(aim>.001)mote+=born*aim*agTorchVis(p)*exp(-.108*(t+d))/(1.+.26*d*d);
    }
    shafts+=vec3(.22,.227,.224)*mote*ld*(.066*uLamp+.037*uPulse);
  }
  gl_FragColor=vec4(min(shafts,vec3(.84)),min(zl/uCameraFar,1.));
}
`;

const blurFrag=`
varying vec2 vUv;
uniform sampler2D uRays;
uniform vec2 uRayTexel;
void main(){
  vec4 center=texture2D(uRays,vUv);
  vec3 acc=vec3(0.);float ws=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec4 r=texture2D(uRays,vUv+vec2(float(x),float(y))*uRayTexel);
    float w=1./(.032+abs(r.a-center.a)/max(center.a,.012));
    acc+=r.rgb*w;ws+=w;
  }
  gl_FragColor=vec4(acc/ws,center.a);
}
`;

const compositeFrag=`
varying vec2 vUv;
uniform sampler2D uColor,uDepth,uRays;
uniform vec2 uRayTexel;
uniform float uCameraNear,uCameraFar,uSurfaceY,uWaterTurbidity,uCabin;
uniform mat4 uProjectionInverse,uCameraWorld;
uniform vec3 uCameraPos;
void main(){
  float dp=texture2D(uDepth,vUv).r;
  float zf=(uCameraNear*uCameraFar)/(uCameraFar-(uCameraFar-uCameraNear)*dp)/uCameraFar;
  vec2 h=vUv/uRayTexel-.5,b=floor(h),f=fract(h);
  vec3 acc=vec3(0.);float ws=0.;
  for(int y=0;y<2;y++)for(int x=0;x<2;x++){
    vec2 ij=vec2(float(x),float(y));
    vec4 r=texture2D(uRays,(b+ij+.5)*uRayTexel);
    vec2 bW=mix(1.-f,f,ij);
    float w=(bW.x*bW.y+.02)/(.021+abs(r.a-zf)/max(zf,.012));
    acc+=r.rgb*w;ws+=w;
  }
  vec4 viewData=uProjectionInverse*vec4(vUv*2.-1.,dp*2.-1.,1.);
  vec3 eye=viewData.xyz/viewData.w;
  float dist=min(length(eye),150.);
  vec3 rd=normalize(mat3(uCameraWorld)*eye);
  float depth=max(0.,uSurfaceY-uCameraPos.y);
  // Not a universal depth-to-color chart: this fictional clear coastal site
  // attenuates red fastest, while scattered blue/green fills long sight lines.
  // Reference: National Ocean Service noaa.gov/facts/oceanblue.html.
  float shallow=exp(-depth*.049),above=max(0.,rd.y);
  vec3 veil=mix(vec3(.0033,.026,.050),vec3(.013,.072,.110),shallow);
  veil*=mix(.75,1.32,smoothstep(-.65,.65,rd.y))*mix(1.,.43,uCabin);
  veil+=vec3(.003,.009,.012)*above*shallow;
  vec3 k=vec3(.053,.025,.016)+uWaterTurbidity*vec3(.012,.010,.010);
  vec3 transmit=exp(-k*dist);
  vec3 c=mix(veil,texture2D(uColor,vUv).rgb,transmit);
  gl_FragColor=vec4(c+acc/ws,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function flat(material){
  const scene=new T.Scene(),mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);
  mesh.frustumCulled=false;
  scene.add(mesh);
  return {scene,mesh,material};
}
function shader(fragmentShader,uniforms,toneMapped=false){
  return new T.ShaderMaterial({uniforms,vertexShader:gridVert,fragmentShader,depthTest:false,depthWrite:false,toneMapped});
}
function makeColorTarget(w,h,type=T.UnsignedByteType){
  return new T.WebGLRenderTarget(w,h,{type,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false,generateMipmaps:false});
}

// Upstream W_NOISE hash/value noise, precomputed once as a tiny, trilinearly sampled 3D mist density.
function makeMistVolume(){
  const wx=40,wy=16,wz=48,data=new Uint8Array(wx*wy*wz);
  const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
  function hash(x,y,z){
    let a=fract(x*.1031),b=fract(y*.1030),c=fract(z*.0973);
    const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);
    a+=d;b+=d;c+=d;
    return fract((a+b)*c);
  }
  function value(x,y,z){
    const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);
    let a=x-i,b=y-j,c=z-k;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);
    return mix(mix(mix(hash(i,j,k),hash(i+1,j,k),a),mix(hash(i,j+1,k),hash(i+1,j+1,k),a),b),
               mix(mix(hash(i,j,k+1),hash(i+1,j,k+1),a),mix(hash(i,j+1,k+1),hash(i+1,j+1,k+1),a),b),c);
  }
  for(let k=0;k<wz;k++)for(let j=0;j<wy;j++)for(let i=0;i<wx;i++){
    const x=(-96+192*(i+.5)/wx)*.046,y=(-30+58*(j+.5)/wy)*.046,z=(-112+224*(k+.5)/wz)*.046;
    const n=.77*value(x,y,z)+.23*value(x*2+17.1,y*2+31.7,z*2+5.3);
    data[(k*wy+j)*wx+i]=Math.round(n*255);
  }
  const texture=new T.Data3DTexture(data,wx,wy,wz);
  texture.format=T.RedFormat;
  texture.minFilter=texture.magFilter=T.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

export function buildWater(scene,clock,{sunLight,torchLight,surfaceY=SURFACE_Y}={}){
  const sun=new T.Vector3(-.39,.84,.37).normalize();
  if(sunLight) sun.copy(sunLight.position).sub(sunLight.target.position).normalize();
  const shared={
    uDiveWaves:{value:null},uSurfaceY:{value:surfaceY},uDiveSun:{value:sun}
  };
  const quadCamera=new T.Camera();
  const waves=new T.WebGLRenderTarget(256,256,{
    minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,wrapS:T.RepeatWrapping,wrapT:T.RepeatWrapping,
    depthBuffer:false,generateMipmaps:true
  });
  shared.uDiveWaves.value=waves.texture;
  const bake=flat(shader(waveBake,{uTime:clock}));
  const surfMat=new T.ShaderMaterial({
    uniforms:{...shared,uTime:clock,uOpticalComposite:{value:0}},vertexShader:surfaceVert,fragmentShader:surfaceFrag,
    side:T.DoubleSide,toneMapped:true
  });
  const surface=new T.Mesh(new T.PlaneGeometry(340,340,100,100),surfMat);
  surface.rotation.x=-Math.PI/2;surface.position.set(0,surfaceY,31);scene.add(surface);

  const decorated=new WeakSet();
  function applyCaustics(root){
    root.traverse(o=>{
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!m?.isMeshStandardMaterial||decorated.has(m))continue;
        decorated.add(m);
        const prev=m.onBeforeCompile.bind(m);
        const key=m.customProgramCacheKey();
        m.onBeforeCompile=(sh,renderer)=>{
          prev(sh,renderer);
          Object.assign(sh.uniforms,shared);
          sh.vertexShader='varying vec3 vDiveW;varying vec3 vDiveN;\n'+sh.vertexShader;
          sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>',`
            vec4 dw=vec4(transformed,1.);
            #ifdef USE_INSTANCING
              dw=instanceMatrix*dw;
            #endif
            vDiveW=(modelMatrix*dw).xyz;
            vDiveN=normalize(inverseTransformDirection(transformedNormal,viewMatrix));
            #include <project_vertex>`);
          sh.fragmentShader='varying vec3 vDiveW;varying vec3 vDiveN;\n'+optics+'\n'+sh.fragmentShader;
          sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`
            vec2 diveP=agProject(vDiveW);
            vec2 diveOffset=vec2(.004,.0025);
            float diveD=length(vDiveW-cameraPosition);
            vec2 diveUv=diveP/3.3;
            vec3 diveLine=vec3(agNet(diveUv+diveOffset),agNet(diveUv),agNet(diveUv-diveOffset));
            float diveWide=agNet(diveP.yx/6.9+.37);
            vec3 diveCaustic=min(pow(diveLine,vec3(2.3))*5.*(.45+diveWide*1.3),vec3(4.));
            diveCaustic=mix(diveCaustic,vec3(.33),smoothstep(34.,94.,diveD));
            float diveY=min(vDiveW.y-uSurfaceY,0.);
            vec3 diveAtt=exp(AG_KD*(diveY/uDiveSun.y));
            float diveFace=.12+.88*max(dot(normalize(vDiveN),uDiveSun),0.);
            // Wreck interior is intentionally sheltered even without a directional shadow map.
            float diveShelter=1.-.71*(1.-smoothstep(1.2,4.2,abs(vDiveW.x)))*smoothstep(0.,5.,-vDiveW.z)*(1.-smoothstep(-2.,1.,vDiveW.y));
            outgoingLight+=vec3(.23,.74,.86)*diveCaustic*diveAtt*diveFace*diveShelter*(.034+.16*dot(diffuseColor.rgb,vec3(.25,.55,.20)));
            #include <opaque_fragment>`);
        };
        m.customProgramCacheKey=()=> key+'|abyss-caustics-v4';
        m.needsUpdate=true;
      }
    });
  }

  const mist=makeMistVolume();
  const ray=flat(shader(rayFrag,{
    ...shared,uDepth:{value:null},uSunDepth:{value:null},uUseSunShadow:{value:0},
    uTorchDepth:{value:null},uTorchShadowMatrix:{value:new T.Matrix4()},uUseTorchShadow:{value:0},
    uProjectionInverse:{value:new T.Matrix4()},uCameraWorld:{value:new T.Matrix4()},uCameraPos:{value:new T.Vector3()},
    uSunShadowMatrix:{value:new T.Matrix4()},uRaySteps:{value:20},uRayStrength:{value:.24},uMist:{value:mist},uCameraFar:{value:212},
    uTorchPos:{value:new T.Vector3()},uTorchDir:{value:new T.Vector3(0,0,-1)},uLamp:{value:0},uPulse:{value:0}
  }));
  const texel=new T.Vector2();
  const blur=flat(shader(blurFrag,{uRays:{value:null},uRayTexel:{value:texel}}));
  const output=flat(shader(compositeFrag,{
    uColor:{value:null},uDepth:{value:null},uRays:{value:null},uRayTexel:{value:texel},
    uCameraNear:{value:.045},uCameraFar:{value:153},uSurfaceY:shared.uSurfaceY,
    uProjectionInverse:ray.material.uniforms.uProjectionInverse,uCameraWorld:ray.material.uniforms.uCameraWorld,
    uCameraPos:ray.material.uniforms.uCameraPos,uWaterTurbidity:{value:0},uCabin:{value:0}
  },true));
  const size=new T.Vector2();
  let image,shafts,filtered,lastBake=NaN,lastW=0,lastH=0;
  function setMedium({torch=0,pulse=0,position,direction,search=0,chamber=false}={}){
    const u=ray.material.uniforms,o=output.material.uniforms;
    u.uLamp.value=torch;u.uPulse.value=pulse;u.uRayStrength.value=chamber?.088:.245;
    if(position)u.uTorchPos.value.copy(position);
    if(direction)u.uTorchDir.value.copy(direction);
    o.uWaterTurbidity.value=search;
    o.uCabin.value=chamber?1:0;
  }
  function render(renderer,camera,reducedMotion=false){
    const old=renderer.getRenderTarget();
    if(!renderer.capabilities.isWebGL2){
      if(lastBake!==clock.value){renderer.setRenderTarget(waves);renderer.render(bake.scene,quadCamera);lastBake=clock.value;}
      renderer.setRenderTarget(old);
      renderer.render(scene,camera);
      return;
    }
    const fogDensity=scene.fog?.isFogExp2?scene.fog.density:null;
    try{
      if(lastBake!==clock.value){
        renderer.setRenderTarget(waves);renderer.render(bake.scene,quadCamera);
        lastBake=clock.value;
      }
      renderer.getDrawingBufferSize(size);
      const w=Math.max(2,size.x|0),h=Math.max(2,size.y|0);
      if(!image){
        const type=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
        image=makeColorTarget(w,h,type);image.depthBuffer=true;image.depthTexture=new T.DepthTexture(w,h,T.UnsignedIntType);
        shafts=makeColorTarget(2,2,type);filtered=makeColorTarget(2,2,type);
        ray.material.uniforms.uDepth.value=image.depthTexture;
        blur.material.uniforms.uRays.value=shafts.texture;
        output.material.uniforms.uDepth.value=image.depthTexture;
        output.material.uniforms.uColor.value=image.texture;
        output.material.uniforms.uRays.value=filtered.texture;
      }
      if(w!==lastW||h!==lastH){
        image.setSize(w,h);
        // Cap light pass independently of scene resolution for high-DPI and mobile.
        const rw=Math.min(860,Math.ceil(w*.5)),rh=Math.min(640,Math.ceil(h*.5));
        shafts.setSize(rw,rh);filtered.setSize(rw,rh);texel.set(1/rw,1/rh);
        lastW=w;lastH=h;
      }
      // Replace, don't stack, the WebGL1 distance fog in the optical pass.
      if(fogDensity!==null)scene.fog.density=0;
      surfMat.uniforms.uOpticalComposite.value=1;
      renderer.setRenderTarget(image);renderer.render(scene,camera);
      surfMat.uniforms.uOpticalComposite.value=0;
      if(fogDensity!==null)scene.fog.density=fogDensity;
      const u=ray.material.uniforms;
      u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);
      u.uCameraWorld.value.copy(camera.matrixWorld);u.uCameraPos.value.setFromMatrixPosition(camera.matrixWorld);
      u.uCameraFar.value=camera.far;
      u.uRaySteps.value=reducedMotion?14:(w*h>1550000?18:22);
      const shadow=renderer.shadowMap.enabled&&renderer.shadowMap.type!==T.VSMShadowMap&&sunLight?.castShadow&&sunLight.shadow?.map;
      u.uUseSunShadow.value=shadow?1:0;
      if(shadow){u.uSunDepth.value=shadow.texture;u.uSunShadowMatrix.value.copy(sunLight.shadow.matrix);}
      const torchMap=renderer.shadowMap.enabled&&renderer.shadowMap.type!==T.VSMShadowMap&&torchLight?.castShadow&&torchLight.shadow?.map;
      u.uUseTorchShadow.value=torchMap?1:0;
      if(torchMap){u.uTorchDepth.value=torchMap.texture;u.uTorchShadowMatrix.value.copy(torchLight.shadow.matrix);}
      renderer.setRenderTarget(shafts);renderer.render(ray.scene,quadCamera);
      renderer.setRenderTarget(filtered);renderer.render(blur.scene,quadCamera);
      output.material.uniforms.uCameraNear.value=camera.near;
      output.material.uniforms.uCameraFar.value=camera.far;
      renderer.setRenderTarget(old);renderer.render(output.scene,quadCamera);
    }finally{
      surfMat.uniforms.uOpticalComposite.value=0;
      if(fogDensity!==null)scene.fog.density=fogDensity;
      renderer.setRenderTarget(old);
    }
  }
  function dispose(){
    for(const target of [waves,image,shafts,filtered])target?.dispose();
    mist.dispose();surface.geometry.dispose();surfMat.dispose();scene.remove(surface);
    for(const pass of [bake,ray,blur,output]){pass.mesh.geometry.dispose();pass.material.dispose();}
  }
  return {applyCaustics,surfaceY,render,setMedium,dispose};
}
