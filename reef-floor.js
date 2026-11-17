import * as T from './vendor/three.module.js';
import {sharedClasts} from './seabed-landforms.mjs?v=13';

// Habitat study (visual references, not copied imagery): NOAA Caloosahatchee
// sediment ripples and coral rubble; USGS NBIS49/NBIS51 ripple troughs and shell hash.
const TWO=Math.PI*2;
const randFn=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SAND_FANS=[
  [-3,92,3.8,1.9,41],[7,93,3.1,1.36,29],[3,85,3.9,1.60,39],[9,87,3.8,1.8,30],
  [-12,84,5.6,2.2,22],[13,81,4.7,2.2,25],[-1,74,3.3,1.55,28],[13,69,4.2,2.2,30],
  [-15,70,6.9,3.8,37],[14,57,4.2,2.45,30],[2,54,3.9,2.4,28],[13,44,4.5,3.1,30],
  [15,34,4.1,2.55,27],[-12,21,6.4,4.1,42],[9,10,3.5,1.9,24],[-8,8,5.1,2.65,34],
  [-13,-8,3.7,2.4,28],[10,-17,4.4,2.9,29],[-8,-23,4.0,2.45,29],[16,-36,5.3,2.8,36],
  [-20,-52,5.9,3.75,36],[7,-49,5.4,3.3,36],[10,-67,9.2,4,32],[-22,104,6,3.6,32],
];
const PALE=['#a28d6e','#c1ad8d','#b7a080','#7d795e','#81776f','#e0c7a3','#976d5e'];
const GRAVEL=['#5d6159','#464c48','#747369','#796a5b','#978671','#85796b','#636e62'];
const SPONGE=['#8b7461','#906b4c','#7d5a4d','#837157','#a57953','#7f736e'];
function brokenStone(seed,sides=8){
  const R=randFn(seed),verts=[],idx=[];
  for(let k=0;k<3;k++)for(let j=0;j<sides;j++){
    const a=(j+.29*(k-1))*TWO/sides;
    const r=(k===0?.64:k===1?1:.72)*(.78+.40*R());
    verts.push(Math.cos(a)*r,(k===0?-.30:k===1?.07:.55)+.18*(R()-.5),Math.sin(a)*r);
  }
  const peak=verts.length/3;verts.push(.15,.65,.04);
  for(let k=0;k<2;k++)for(let j=0;j<sides;j++){
    const a=k*sides+j,b=k*sides+(j+1)%sides,c=a+sides,d=b+sides;
    idx.push(a,c,b,b,c,d);
  }
  for(let j=0;j<sides;j++)idx.push(2*sides+j,peak,2*sides+(j+1)%sides);
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
  const n=flat.attributes.position.count,C=new Float32Array(n*3);
  for(let i=0;i<n;i+=3){const c=.70+.29*R();C.fill(c,i*3,i*3+9);}
  flat.setAttribute('color',new T.BufferAttribute(C,3));flat.computeBoundingSphere();return flat;
}
function shell(){
  // Open, broken scallop valve with radiating growth ridges (not a flat disk).
  const nt=15,nr=5,p=[],ix=[],c=[];
  for(let r=0;r<=nr;r++)for(let j=0;j<=nt;j++){
    const a=(j/nt-.5)*2.32,u=.025+.975*r/nr;
    const rib=(.55+.45*Math.cos(j*1.8+u*.34))*.053*u;
    const q=u*(.96+.04*Math.sin(j*1.71)+.025*Math.cos(j*3.1));
    p.push(Math.sin(a)*q,Math.sin(u*2.6)*.27+rib,Math.cos(a)*q-.54);
    const cc=.73+.19*Math.cos(u*15.)+.09*Math.cos(j*1.8);c.push(cc,cc,cc);
  }
  for(let r=0;r<nr;r++)for(let j=0;j<nt;j++){
    const a=r*(nt+1)+j,b=a+nt+1;ix.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);
  g.computeVertexNormals();return g;
}
function skeleton(seed){
  // Broken branching skeletons lie nearly on their sides; no repetitive upright thicket.
  const R=randFn(seed),vs=[],nv=[],colors=[],ix=[];
  function twig(a,b,r0,r1){
    const d=b.clone().sub(a).normalize(),u=new T.Vector3(0,0,1).cross(d).normalize(),v=d.clone().cross(u);
    const h=vs.length/3,n=6;
    for(let k=0;k<2;k++)for(let j=0;j<n;j++){
      const q=(j+k*.18)*TWO/n,A=u.clone().multiplyScalar(Math.cos(q)).addScaledVector(v,Math.sin(q));
      const P=(k?b:a).clone().addScaledVector(A,(k?r1:r0)*(.86+.28*R()));
      vs.push(...P.toArray());nv.push(...A.toArray());
      const c=.73+.27*R();colors.push(c,c,c);
    }
    const end=vs.length/3;vs.push(...b.toArray());nv.push(...d.toArray());colors.push(.69,.69,.69);
    for(let j=0;j<n;j++){
      const a=h+j,b=h+(j+1)%n;ix.push(a,b,a+n,b,b+n,a+n,a+n,b+n,end);
    }
  }
  const a=new T.Vector3(-.76,.09,-.12),b=new T.Vector3(-.29,.18,-.10),c=new T.Vector3(.17,.24,.01),d=new T.Vector3(.67,.27,.19);
  twig(a,b,.127,.112);twig(b,c,.112,.075);twig(c,d,.081,.041);
  twig(b,new T.Vector3(-.47,.42,.42),.081,.041);twig(c,new T.Vector3(.10,.48,-.52),.073,.035);
  twig(d,new T.Vector3(.81,.47,.06),.057,.027);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(nv,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);
  return g;
}
function sponge(seed){
  const R=randFn(seed),p=[],c=[],ix=[];
  for(let k=0;k<4;k++){
    const t=k*TWO/3+R()*.32,d=k?.35+R()*.14:0,x=Math.cos(t)*d,z=Math.sin(t)*d,h=k?.54+R()*.44:1.15;
    const off=p.length/3,n=9;
    for(let l=0;l<5;l++)for(let j=0;j<n;j++){
      const a=j*TWO/n;const rr=[.19,.21,.23,.122,.066][l]*(.92+.19*R());
      p.push(x+Math.cos(a)*rr+.17*l/4*Math.cos(t),h*[0,.52,1.0,.95,.60][l]+(l>=2?(R()-.5)*.07:0),z+Math.sin(a)*rr+.17*l/4*Math.sin(t));
      const v=l>2?.42+R()*.29:.74+R()*.26;c.push(v,v,v);
    }
    for(let l=0;l<4;l++)for(let j=0;j<n;j++){
      const a=off+l*n+j,b=off+l*n+(j+1)%n;ix.push(a,a+n,b,b,a+n,b+n);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeVertexNormals();return g;
}

/* Benthic zoning rather than uniform random decoration: eroded rock sized
   separately from shell hash, reef apron on a few sides, sand lane unblocked. */
export function addBenthicPatches(terrain,supportAt,reefs=[]){
  const R=randFn(1176557),P=()=>R()-.5,d=new T.Object3D(),col=new T.Color(),up=new T.Vector3(0,1,0);
  const mat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,side:T.DoubleSide});
  mat.name='Weathered shell, consolidated rubble and low sponges';
  const specs=[
    {name:'Reef talus · flat broken stone',geo:brokenStone(1291),palette:GRAVEL,items:[]},
    {name:'Carbonate clasts · worn pale gravel',geo:brokenStone(5436,7),palette:PALE,items:[]},
    {name:'Bivalves · scalloped shell debris',geo:shell(),palette:PALE,items:[]},
    {name:'Coral skeleton fragments · storm-deposited tracks',geo:skeleton(6329),palette:PALE,items:[]},
    {name:'Low vase sponges · isolated on rubble',geo:sponge(441),palette:SPONGE,items:[]},
  ];
  const add=(k,x,z,size,tab=0)=>specs[k].items.push({x,z,size,tab});
  const washPatches=SAND_FANS.concat(reefs.flatMap((v,i)=>[
    [v.x+v.sx*.75,v.z+v.sz*.62,v.sx*.69,v.sz*.31,31+i%4*6],
    [v.x-v.sx*.71,v.z-v.sz*.59,v.sx*.57,v.sz*.34,24+i%5*3]
  ]));
  washPatches.forEach(([cx,cz,rx,rz,n],cl)=>{
    const theta=.41+P()*.48,dx=Math.cos(theta),dz=Math.sin(theta);
    for(let i=0;i<n;i++){
      const radius=Math.pow(R(),.7),a=R()*TWO,uu=Math.cos(a)*rx*radius,vv=Math.sin(a)*rz*radius;
      const x=cx+dx*uu-dz*vv,z=cz+dz*uu+dx*vv;
      // No large clasts in the chain-to-bow swim corridor or at the port opening.
      const lane=(x>4.25&&x<10.8&&z>43&&z<87)||(x>-12&&x<-4&&z>-19&&z<-9);
      const c=R(),k=c<.35?0:c<.69?1:c<.83?2:c<.975?3:4;
      if(lane&&(k===4||i<6))continue;
      const v=(k<2?.13:k===2?.11:k===3?.16:.38)+(k<2?.46:k===2?.27:k===3?.86:.46)*Math.pow(R(),1.62);
      add(k,x,z,lane?v*.48:v);
    }
    // Two or three larger, biologically anchored fragments make a grouped island legible
    // at the actual game camera height, while closely spaced chips supply the scale cue.
    if(cl%5!==2){
      for(let j=0;j<(cl%3===0?3:2);j++){
        const x=cx+P()*rx*.66,z=cz+P()*rz*.87;
        if(x>4.25&&x<10.8&&z>43&&z<87)continue;
        add(j===1?1:0,x,z,.74+.85*R(),1);
        if(j===0 && cl%4===0)add(4,x+.41,z-.44,.77+.47*R(),1);
      }
    }
  });
  // Spatially coherent shell/gravel apron: same locations as the Canvas edition.
  for(const c of sharedClasts())add(c.kind==='shell'?2:c.kind==='pale'?1:0,c.x,c.z,c.size,0);
  for(let i=0;i<124;i++){
    const x=-46+92*R(),z=-69+198*R();
    if(Math.abs(x)<11 && R()<.70)continue; // isolated fragments; quiet paths still read as sand.
    add(i%4,x,z,.07+.19*Math.pow(R(),1.65));
  }
  let count=0,large=0;
  const contacts=[];
  for(const [k,{name,geo,palette,items}] of specs.entries()){
    const inst=new T.InstancedMesh(geo,mat,items.length);
    inst.name=name;count+=items.length;
    items.forEach(({x,z,size,tab},i)=>{
      const ground=supportAt(x,z,{sandOnly:k<4,minNormal:.62});
      const roll=P()*.13,yaw=R()*TWO,pitch=P()*.17;
      d.scale.set(size*(.78+R()*.36),size*(k===4?1:k===2?.43:.76+R()*.18),size*(.71+R()*.48));
      // Lay clasts into the bed and seat valves in it; on sponges the
      // stalk mouth stays naturally above the base without a floating offset.
      const burial=(k===0||k===1?-.035:k===2?-.015:k===3?-.091:-.062)*size-.015;
      d.position.set(x,ground.y+burial,z);
      d.quaternion.setFromUnitVectors(up,ground.normal);
      d.rotateY(yaw);d.rotateX(roll);d.rotateZ(pitch);
      if(size>=.77){large++;if(k<2||k===4)contacts.push([x,z,size,yaw,k===4]);}
      d.updateMatrix();
      inst.setMatrixAt(i,d.matrix);
      inst.setColorAt(i,col.set(palette[Math.floor(R()*palette.length)]).multiplyScalar(clamp(.89+R()*.22,.8,1.1)));
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;inst.computeBoundingSphere();terrain.add(inst);
  }
  // Subtle soft contact shade for large clasts, on all graphics tiers. The
  // procedural sheet follows the slope and can leave gaps at uneven edges.
  const sz=32,rgba=new Uint8Array(sz*sz*4);
  for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){
    const j=(y*sz+x)*4,r=Math.hypot((x+.5)/sz*2-1,(y+.5)/sz*2-1);
    rgba[j]=rgba[j+1]=rgba[j+2]=255;rgba[j+3]=Math.round(255*Math.max(0,1-r)**1.55);
  }
  const mask=new T.DataTexture(rgba,sz,sz,T.RGBAFormat);
  mask.minFilter=mask.magFilter=T.LinearFilter;mask.needsUpdate=true;
  const shadeMat=new T.MeshBasicMaterial({color:0x202320,map:mask,opacity:.67,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const contactGeo=new T.PlaneGeometry(2,2);contactGeo.rotateX(-Math.PI/2);
  const shade=new T.InstancedMesh(contactGeo,shadeMat,contacts.length);shade.name='Seabed · low contact shade';
  contacts.forEach(([x,z,v,a,rock],i)=>{
    const h=supportAt(x,z,{sandOnly:!rock,minNormal:.62});
    d.position.set(x,h.y+.027,z);d.quaternion.setFromUnitVectors(up,h.normal);d.rotateY(a);
    d.scale.set(v*1.26,1,v*.96);d.updateMatrix();shade.setMatrixAt(i,d.matrix);
  });
  shade.instanceMatrix.needsUpdate=true;shade.computeBoundingSphere();terrain.add(shade);
  return {count,large,patchCount:washPatches.length,contacts:contacts.length};
}
