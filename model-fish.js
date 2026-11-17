import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {fishPose,makeFishPopulation} from './reef.js';

// Each source is embedded locally, already centered with the nose +X.
// All visible members of a species use the same material and textured geometry.
const assets=[
  {file:'fish-sardine.glb', name:'Sardina pilchardus', rate:8.9, flex:.14},
  {file:'fish-patrol.glb', name:'Pollock – NTNU FishSim specimen', rate:4.95, flex:.12},
  {file:'fish-haddock.glb', name:'Haddock – NTNU FishSim specimen', rate:5.65, flex:.11},
  {file:'fish-mackerel.glb', name:'Atlantic mackerel – Scomber scombrus', rate:10.25, flex:.126},
  {file:'fish-cod.glb', name:'Atlantic cod – NTNU FishSim specimen', rate:4.36, flex:.108},
];
const loader=new GLTFLoader();
function makeFishModels(group,time,motion,populations,load=loader){
  const models=Array.from(assets,()=>null);
  for(let kind=0;kind<assets.length;kind++){
    const a=assets[kind],capacity=populations[kind]?.length;
    if(!capacity)continue;
    load.load(new URL('./media/'+a.file+'?v=7',import.meta.url).href,gltf=>{
      gltf.scene.updateMatrixWorld(true);
      let source=null;
      gltf.scene.traverse(o=>{if(o.isMesh&&!source)source=o;});
      if(!source||Array.isArray(source.material)||!source.material.map)return;
      const geom=source.geometry.clone().applyMatrix4(source.matrixWorld);
      geom.computeBoundingBox();
      const {min,max}=geom.boundingBox, length=max.x-min.x;
      if(!Number.isFinite(length)||length<.001)return;
      // The shared swimmer's pivot is mid-body and its rest length is 1.16.
      const mid=new T.Vector3().addVectors(min,max).multiplyScalar(.5);
      geom.translate(-mid.x,-mid.y,-mid.z).scale(1.16/length,1.16/length,1.16/length);
      const phase=new T.InstancedBufferAttribute(new Float32Array(capacity),1);
      phase.setUsage(T.DynamicDrawUsage);geom.setAttribute('aFishBeat',phase);
      const mat=source.material.clone();
      mat.roughness=kind===1||kind===4?.68:kind===0||kind===3?.55:.60;
      mat.metalness=kind===0||kind===3?.065:.028;
      mat.side=T.DoubleSide;
      // Alpha-cut edges preserve the fin silhouette and write per-pixel depth for schools.
      mat.alphaTest=.30;mat.transparent=false;mat.depthWrite=true;
      if(mat.map){mat.map.anisotropy=4;mat.map.needsUpdate=true;}
      mat.onBeforeCompile=shader=>{
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(luma),${kind===2?'.19':'.12'});`);
        shader.uniforms.fishTime=time;shader.uniforms.fishMotion=motion;
        shader.vertexShader=shader.vertexShader
          .replace('#include <common>',`#include <common>
            attribute float aFishBeat;
            uniform float fishTime,fishMotion;
            float curve(float x){
              float tail=clamp((.27-x)/.85,0.0,1.0);
              float kick=fishTime*${a.rate.toFixed(3)}+aFishBeat*2.3+5.5*x;
              return sin(kick)*tail*tail*${a.flex.toFixed(3)}*fishMotion;
            }`)
          .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
            float slope=(curve(position.x+.003)-curve(position.x-.003))/.006;
            objectNormal=normalize(vec3(objectNormal.x-slope*objectNormal.z,objectNormal.yz));`)
          .replace('#include <begin_vertex>',`#include <begin_vertex>
            transformed.z+=curve(position.x);
            transformed.y+=curve(position.x)*.075;`);
      };
      mat.customProgramCacheKey=()=>`fish-specimen-v7-${kind}`;
      const mesh=new T.InstancedMesh(geom,mat,capacity);
      mesh.name=a.name;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled=false;mesh.count=0;
      for(let i=0;i<capacity;i++)mesh.setColorAt(i,new T.Color(1,1,1));
      mesh.instanceColor.setUsage(T.DynamicDrawUsage);
      group.add(mesh);
      models[kind]={mesh,phase};
    },undefined,error=>console.warn('Fish asset unavailable:',a.file,error?.message??error));
  }
  return models;
}

// Visibility culling never substitutes a cheaper material or a pale solid fish.
export function buildFishSchools(populations=makeFishPopulation(), assetLoader=undefined){
  const mesh=new T.Group();
  mesh.name='North Atlantic shoals · five persistent textured species';
  const time={value:0},motion={value:1};
  const models=makeFishModels(mesh,time,motion,populations,assetLoader);
  const tint=new T.Color(), transform=new T.Object3D(),
    bounds=new T.Sphere(new T.Vector3(),.8), pose={};
  function tick(t,reduced,eye=null,frustum=null){
    time.value=reduced?0:t; motion.value=reduced?0:1;
    for(let kind=0;kind<populations.length;kind++){
      const model=models[kind];
      if(!model)continue; // No geometry is better than flashing paper-colored replacements.
      const {mesh:school,phase}=model;
      let visible=0;
      for(const fish of populations[kind]){
        fishPose(fish,t,reduced,pose);
        bounds.center.set(pose.x,pose.y,pose.z);bounds.radius=Math.max(.40,fish.scale*.84);
        if(frustum&&!frustum.intersectsSphere(bounds))continue;
        const distance=eye?bounds.center.distanceTo(eye):3;
        if(distance>85)continue; // Beyond visible water haze, independent of population size.
        const safeScale=T.MathUtils.smoothstep(distance,.33,kind===1?1.05:.64);
        if(safeScale<=.001)continue;
        transform.position.copy(bounds.center);
        transform.rotation.set(pose.roll,Math.atan2(-pose.dz,pose.dx),Math.atan(pose.dy),'YXZ');
        transform.scale.setScalar(fish.scale*safeScale);
        transform.updateMatrix();
        school.setMatrixAt(visible,transform.matrix);
        phase.setX(visible,fish.phase);
        const tone=.88+.12*fish.tint;
        school.setColorAt(visible,tint.setRGB(tone*.94,tone,tone));
        visible++;
      }
      school.count=visible;
      phase.needsUpdate=true;
      school.instanceColor.needsUpdate=true;
      school.instanceMatrix.needsUpdate=true;
    }
  }
  return {mesh,tick};
}
