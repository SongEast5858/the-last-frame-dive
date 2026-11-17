import * as T from './vendor/three.module.js';

import {DIVE_CAPSULE} from './mission.mjs?v=9';
export const CAPSULE_ANCHOR=DIVE_CAPSULE;
const {x:CX,y:CY,z:CZ}=CAPSULE_ANCHOR;
// Axial radius profile for both renderers: capture ring to stern cable head.
const profile=[[-2.68,1.14],[-2.47,1.37],[-2.15,1.58],[-1.70,1.82],[-1.08,1.92],
  [1.07,1.92],[1.72,1.76],[2.20,1.44],[2.50,1.11],[2.67,.56],[2.70,.08]];
const STEEL='#6c8584', DULL='#3c5354', TRIM='#91aaa3', YELLOW='#ddaa5f';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const W=(x,y,z)=>({x:CX+x,y:CY+y,z:CZ+z});

export function buildCapsule(scene){
  const root=new T.Group();
  root.position.set(CX,CY,CZ);root.name='MERIDIAN · subsea launch and recovery capsule';scene.add(root);
  const body=new T.MeshStandardMaterial({color:STEEL,metalness:.27,roughness:.57});
  const ribs=new T.MeshStandardMaterial({color:TRIM,metalness:.31,roughness:.52});
  const warm=new T.MeshStandardMaterial({color:YELLOW,metalness:.18,roughness:.55});
  const dark=new T.MeshStandardMaterial({color:0x17292a,metalness:.26,roughness:.87});
  const liner=new T.MeshStandardMaterial({color:0x344d4e,metalness:.19,roughness:.79});
  const padding=new T.MeshStandardMaterial({color:0x102226,roughness:.93});
  const white=new T.MeshStandardMaterial({color:0x94dfd2,emissive:0x7bcfc0,emissiveIntensity:.7,roughness:.48});
  const amber=new T.MeshStandardMaterial({color:0xe3b466,emissive:0xd08727,emissiveIntensity:.53,roughness:.51});
  function add(g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;}
  const shell=add(new T.LatheGeometry(profile.map(([z,r])=>new T.Vector2(r,z)),48),body);
  shell.rotation.x=Math.PI/2;shell.name='Pressure hull and bevelled collars';
  const band=(radius,r,z,material)=>add(new T.TorusGeometry(radius,r,9,48),material,0,0,z);
  for(const z of [-1.30,1.08]){
    band(1.91,.041,z,dark);band(1.917,.026,z+.062,ribs);
  }
  band(1.31,.06,-2.49,ribs);band(1.24,.047,-2.59,dark);
  band(1.12,.090,-2.68,warm);band(.998,.062,-2.69,ribs);
  band(.93,.035,-2.56,dark);
  const disc=(radius,z,m)=>add(new T.CircleGeometry(radius,48),m,0,0,z);
  const cover=disc(1.025,-2.60,dark);cover.rotation.y=Math.PI;
  const inner=disc(.897,-2.585,padding);inner.rotation.y=Math.PI;
  const rearRib=band(.81,.053,-2.65,liner);rearRib.scale.y=.983;
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,r=1.121;
    const bolt=add(new T.CylinderGeometry(.026,.030,.03,6),ribs,Math.cos(a)*r,Math.sin(a)*r,-2.767);
    bolt.rotation.x=Math.PI/2;
  }
  for(const side of [-1,1]){
    const tube=add(new T.CapsuleGeometry(.118,3.75,5,10),dark,side*1.99,-.5,.13);
    tube.rotation.x=Math.PI/2;
    for(const z of [-1.60,1.87]){
      const arm=add(new T.BoxGeometry(.36,.24,.29),warm,side*1.91,-.51,z);
      arm.rotation.z=side*.19;
    }
    const box=add(new T.BoxGeometry(.52,.25,.31),dark,side*.74,-.73,-2.755);
    box.rotation.z=-side*.35;
    const lamp=add(new T.BoxGeometry(.105,.34,.026),white,side*.844,-.61,-2.919);
    lamp.rotation.z=-side*.42;
    const lm=add(new T.BoxGeometry(.095,.088,.020),amber,side*.468,.78,-2.762);
    lm.rotation.z=side*.27;
  }
  const tread=add(new T.BoxGeometry(1.52,.10,.26),liner,0,-.915,-2.735);
  const grab=(x,sign)=>{const h=add(new T.TorusGeometry(.24,.047,8,22,Math.PI),ribs,x,.29,-2.46);
    h.rotation.z=Math.PI*.48*sign;};
  grab(-1.13,-1);grab(1.13,1);
  const recoveryDot=add(new T.SphereGeometry(.082,16,12),white,0,1.33,-2.103);
  const glow=new T.PointLight(0x8dfada,4,6,1.64);glow.position.set(0,.60,-2.92);root.add(glow);
  // A low-intensity guide light, not an oversized UI beacon laid over the hatch.
  function tick(t,reduced=false){const phase=reduced?1:.90+.10*Math.sin(t*1.42);
    white.emissiveIntensity=.81*phase;amber.emissiveIntensity=.50*(.86+.14*phase);
    glow.intensity=3.1*phase;
  }
  return {root,tick};
}

const N=24;
function ring(z,r,n=N,cx=0,cy=0){
  return Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n;
    return W(cx+r*Math.cos(a),cy+r*Math.sin(a),z);});
}
const rings=profile.map(([z,r])=>ring(z,r));
function closed(g,points){g.beginPath();g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
  g.closePath();}
function quad(cx,cy,z,w,h){return [W(cx-w/2,cy-h/2,z),W(cx+w/2,cy-h/2,z),
  W(cx+w/2,cy+h/2,z),W(cx-w/2,cy+h/2,z)];}
const rgba=(r,g,b,a)=>'rgba('+r+','+g+','+b+','+a+')';

export function paintLiteCapsule(g,project,state,w,h,time){
  const dz=CZ-state.z,dx=CX-state.x,dy=CY-state.y;
  const distance=Math.hypot(dx,dy,dz);
  if(distance>90||distance<1.2)return;
  const origin=project(W(0,0,0)),front=project(W(0,0,-2.69));
  if(!origin.visible&&!front.visible)return;
  if(origin.x<-w*.48||origin.x>w*1.48||origin.y < -h*.65||origin.y>h*1.65)return;
  const HAZE=clamp(Math.exp(-distance*.027),.14,.99);
  const polys=[];
  const push=(shape,color,depthBias=0)=>{
    const a=shape.map(project);if(a.some(v=>!v.visible||v.z<.17))return;
    if(Math.max(...a.map(v=>v.x))<0||Math.min(...a.map(v=>v.x))>w||
      Math.max(...a.map(v=>v.y))<0||Math.min(...a.map(v=>v.y))>h)return;
    polys.push({pts:a,color,z:a.reduce((acc,v)=>acc+v.z,0)/a.length+depthBias});
  };
  for(let k=0;k<profile.length-1;k++){
    for(let j=0;j<N;j++){
      const jn=(j+1)%N,a=(j+.5)*2*Math.PI/N;
      // Back-face culling preserves thickness and does not depend on screen orientation.
      const atZ=(profile[k][0]+profile[k+1][0])*.5;
      const radius=(profile[k][1]+profile[k+1][1])*.5;
      const nr=(profile[k][1]-profile[k+1][1])/(profile[k+1][0]-profile[k][0]);
      if((state.x-CX-radius*Math.cos(a))*Math.cos(a)+(state.y-CY-radius*Math.sin(a))*Math.sin(a)+
        (state.z-CZ-atZ)*nr<-.04)continue;
      const shade=clamp(.64+Math.sin(a)*.24-Math.cos(a)*.11+nr*.052,.37,.99);
      const m=k===3||k===5?.84:1;
      const c=[19+shade*69*m,38+shade*92*m,44+shade*84*m].map(Math.round);
      push([rings[k][j],rings[k][jn],rings[k+1][jn],rings[k+1][j]],rgba(...c,HAZE));
    }
  }
  for(const side of [-1,1]){
    const z1=-1.65,z2=1.89,x=side*2.02,r=.115;
    for(const [z,m] of [[z1,'#9b784a'],[z2,'#9b784a']]){
      push([W(x-side*.45,-.4,z-.15),W(x+side*.13,-.37,z-.15),
        W(x+side*.14,-.65,z+.15),W(x-side*.35,-.68,z+.15)],m);
    }
    push([W(x-r,-.45,z1-.26),W(x+r,-.42,z1-.26),W(x+r,-.53,z2+.16),
      W(x-r,-.57,z2+.16)],'#2b4145');
  }
  const showHatch=state.z<CZ-2.22 && front.visible&&front.z>.20;
  if(showHatch){
    push(ring(-2.684,1.231),'#394a44');
    push(ring(-2.700,1.172),'#ae8d56');
    push(ring(-2.704,1.093),'#95a699');
    push(ring(-2.708,1.004),'#172e32');
    push(ring(-2.713,.927),'#405654');
    push(ring(-2.718,.863),'#14292f');
    push(ring(-2.720,.713),'#101f29');
    for(let i=0;i<16;i++){
      const a=i*2*Math.PI/16;push(ring(-2.727,.027,6,1.135*Math.cos(a),1.135*Math.sin(a)),i%2?'#4e635c':'#bcaa7e');
    }
    push(quad(0,-.864,-2.74,1.14,.12),'#56716e');
    for(const s of [-1,1]){
      push(quad(s*.851,-.584,-2.79,.158,.32),'#344044');
      push(quad(s*.851,-.584,-2.81,.075,.244),'#9cdecc');
      push(quad(s*.447,.776,-2.753,.080,.077),'#e4b97b');
    }
  }
  polys.sort((a,b)=>b.z-a.z);
  g.save();
  for(const p of polys){
    g.fillStyle=p.color;g.strokeStyle=p.color;g.lineWidth=.46;
    closed(g,p.pts);g.fill();g.stroke();
  }
  if(showHatch && front.z>1.0){
    const r=clamp(h*.14/front.z,3,39);
    const mix=state.reducedMotion?1:.86+.14*Math.sin(time*1.42);
    for(const side of [-1,1]){
      const m=project(W(side*.851,-.584,-2.81));if(!m.visible)continue;
      const grad=g.createRadialGradient(m.x,m.y,0,m.x,m.y,r);
      grad.addColorStop(0,rgba(125,222,188,.26*HAZE*mix));grad.addColorStop(1,'#74dabb00');
      g.fillStyle=grad;g.fillRect(m.x-r,m.y-r,2*r,2*r);
    }
  }
  g.restore();
}
