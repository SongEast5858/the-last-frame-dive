import {createWreckCollision} from './wreck-collision.mjs?v=8';
import {inLowerWing,slideLowerWing} from './lower-wing.mjs';
// Shared playable world coordinates. +Z is the bow, +X starboard.
// HUD readings are game-world distances, not a real-world dive plan.
export const SURFACE_Y=25;
export const WORLD={minX:-54,maxX:54,minZ:-78,maxZ:136,floor:-18.3,surface:SURFACE_Y};
export const DEFAULT_TARGETS = Object.freeze({
  start:{x:3,y:-3.2,z:92,yaw:-.045,pitch:-.10},
  survey:{x:5.7,y:-6.3,z:78},
  chain:{x:6.9,y:-7.3,z:67},
  ridge:{x:7.8,y:-6,z:53},
  bow:{x:5.9,y:-5.5,z:49.25},
  flank:{x:11.2,y:-6.7,z:31.5},
  frame:{x:8.22,y:-7.4,z:23},
  boarding:{x:11,y:-4.8,z:17},
  promenade:{x:2.05,y:-4.8,z:15.6},
  doorway:{x:1.65,y:-4.8,z:11},
  ballroom:{x:0,y:-4.8,z:4},
  stairs:{x:0,y:-4.8,z:-3.8},
  landing:{x:0,y:-8.6,z:-6.8},
  passage:{x:0,y:-8.7,z:-10.9},
  photo:{x:0,y:-6.77,z:-15.50},
  turn:{x:0,y:-8.65,z:-13.5},
  portgate:{x:-5.25,y:-8.65,z:-14.45},
  exit:{x:-11.2,y:-8.5,z:-14.45},
  quarter:{x:-13.2,y:-7.1,z:-32.4},
  aft:{x:-13.8,y:-5.5,z:-53.6},
  retreat:{x:11.9,y:-5,z:8.6},
  starboard:{x:12.4,y:-4.7,z:-22.2},
  stern:{x:10.2,y:-4.55,z:-54.4},
  cross:{x:-4.4,y:-3.6,z:-58.4},
  rise:{x:-17.4,y:5.4,z:-61.35},
  surface:{x:-20,y:23.15,z:-62.3},
});
const stage=(code,title,status,type,name,fields)=>({code,title,status,type,name,...fields});
export const STAGES={
  survey:stage('01 / 06 · 搜索海床','朝前方的礁脊下潜','离开下潜舱','gate','礁脊外侧',{next:'chain',radius:3.1,search:true}),
  chain:stage('01 / 06 · 搜索海床','礁脊右侧水域更开阔','观察礁脊','gate','礁脊边缘',{next:'ridge',radius:3.55,search:true}),
  ridge:stage('01 / 06 · 搜索海床','绕过礁脊继续目视搜索','礁脊后方','gate','礁脊转角',{next:'bow',radius:3.95,search:true}),
  bow:stage('02 / 06 · 巨轮现身','靠近海雾号的船头，从右侧绕行','目视接触','gate','巨轮船艏',{next:'flank',radius:3.85}),
  flank:stage('02 / 06 · 绕看船体','沿右舷寻找铭牌','右舷勘察','gate','右舷外侧',{next:'primary',radius:3.25}),
  primary:stage('03 / 06 · 识别船体','开灯并拍下右舷铭牌','取证中','photo','海雾号铭牌',{key:'frame',range:5.3,minX:8.6}),
  decision:stage('03 / 06 · 下潜决定','决定进舱还是沿船外返航','等待指令'),
  boarding:stage('04 / 06 · 进入客轮','沿右舷上浮，找到断开的散步甲板','寻找入口','gate','甲板外侧',{next:'promenade',radius:2.6}),
  promenade:stage('04 / 06 · 进入客轮','从断开的栏杆游上散步甲板','穿过栏杆','gate','散步甲板',{next:'doorway',radius:.72}),
  doorway:stage('04 / 06 · 进入客轮','穿过舱门，进入船中的大厅','穿过舱门','gate','大厅入口',{next:'ballroom',radius:1.52}),
  ballroom:stage('05 / 06 · 舱内取证','穿过倾斜的大厅，寻找大楼梯','客轮大厅','gate','大厅中央',{next:'stairs',radius:1.9}),
  stairs:stage('05 / 06 · 舱内取证','到楼梯上方，准备往下一层','大厅后部','gate','大楼梯',{next:'landing',radius:1.62}),
  landing:stage('05 / 06 · 舱内取证','沿楼梯口下潜一层','正在下潜','gate','楼梯底部',{next:'passage',radius:1.45}),
  passage:stage('05 / 06 · 舱内取证','沿客舱走廊找没被带走的照片','客舱层','gate','客舱走廊',{next:'bonus',radius:1.55}),
  bonus:stage('05 / 06 · 舱内取证','拍下客舱尽头的星海彩窗','追加取证','photo','星海彩窗',{key:'photo',range:6.1,minRange:2.65}),
  turn:stage('06 / 06 · 离船返航','向走廊后方游，找到左转的横廊','寻找横廊','gate','左舷转角',{next:'portgate',radius:1.17}),
  portgate:stage('06 / 06 · 离船返航','沿横廊向左舷的破口前进','寻找破口','gate','左舷横廊',{next:'exit',radius:1.5}),
  exit:stage('06 / 06 · 离船返航','穿过左舷裂口，游回开阔水域','正在出船','gate','船壳破口外侧',{next:'quarter',radius:2.28}),
  quarter:stage('06 / 06 · 离船返航','沿着左舷外侧游向船尾','船外返航','gate','左舷尾段',{next:'aft',radius:3.25}),
  aft:stage('06 / 06 · 离船返航','绕开船尾残片，找回收浮标','船外返航','gate','船尾外侧',{next:'rise',radius:3.4}),
  retreat:stage('06 / 06 · 船外返航','不进舱，沿右舷继续向船尾游','右舷返航','gate','右舷前段',{next:'starboard',radius:3.35}),
  starboard:stage('06 / 06 · 船外返航','保持在船外，沿右舷游向船尾','右舷返航','gate','右舷尾段',{next:'stern',radius:3.65}),
  stern:stage('06 / 06 · 船外返航','绕过船尾，向浮标一侧转弯','船尾外侧','gate','船尾返航点',{next:'cross',radius:3.2}),
  cross:stage('06 / 06 · 船外返航','远离螺旋桨，横穿船尾后方','船尾返航','gate','船尾外侧航线',{next:'rise',radius:3.5}),
  rise:stage('06 / 06 · 离船返航','在船外向上，找回收浮标的灯','接近回收点','gate','上浮水域',{next:'return',radius:3.0}),
  return:stage('06 / 06 · 离船返航','上浮靠近回收浮标，结束潜航','正在回收','return','回收浮标',{key:'surface',radius:1.70}),
};
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const turnAngle=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
export const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
const INDOORS=new Set(['doorway','ballroom','stairs','landing','passage','bonus','turn','portgate','exit']);
const between=(n,a,b)=>n>a&&n<b;
const mix=(a,b,k)=>a+(b-a)*k;
export function introPose(progress,targets=DEFAULT_TARGETS){
  const p=clamp(progress,0,1), k=p*p*(3-2*p), s=targets.start;
  if(p===1)return {...s,lamp:false,phase:'survey'};
  return {...s,x:s.x-2.1*(1-k),y:mix(SURFACE_Y-1.15,s.y,k),z:mix(s.z+12,s.z,k),
    pitch:mix(-.28,s.pitch,k),yaw:mix(-.14,s.yaw,k),lamp:false,phase:'survey'};
}
export function newDive(targets=DEFAULT_TARGETS){
  const s=targets.start;
  return {x:s.x,y:s.y,z:s.z,yaw:s.yaw??0,pitch:s.pitch??-.1,phase:'survey',discovered:false,stageElapsed:0,oxygen:100,lamp:false,pulse:0,elapsed:0,photos:0,end:null,exitPrompt:false};
}
export function objective(state,targets=DEFAULT_TARGETS){
  const step=STAGES[state.phase];
  if(!step?.type)return null;
  const key=step.key??state.phase;
  return {...(targets[key]??DEFAULT_TARGETS[key]),...step,key};
}
export function getGuide(s,t){
  if(!t)return null;
  const dx=t.x-s.x,dy=t.y-s.y,dz=t.z-s.z,flat=Math.hypot(dx,dz);
  const d=Math.hypot(flat,dy);
  const az=flat<.01?s.yaw:Math.atan2(-dx,-dz),alt=Math.atan2(dy,flat);
  const dot=d<.01?1:(-Math.sin(s.yaw)*Math.cos(s.pitch)*dx+Math.sin(s.pitch)*dy-Math.cos(s.yaw)*Math.cos(s.pitch)*dz)/d;
  const angle=Math.acos(clamp(dot,-1,1));
  const approach=(t.minX===undefined||s.x>=t.minX)&&(t.key!=='photo'||s.y<-6.65&&s.y>-10.1&&s.z>-14.8&&s.z<-7.55&&Math.abs(s.x)<2.2),tooClose=d<(t.minRange??0),inRange=d<=(t.range??5.3)&&!tooClose&&approach;
  return {d,az,alt,relative:turnAngle(az-s.yaw),angle,inRange,approach,tooClose,focused:angle<=.40,ready:t.type==='photo'&&inRange&&angle<=.40&&s.lamp};
}
export function captureTarget(s,targets=DEFAULT_TARGETS){
  const current=objective(s,targets);
  if(current?.type==='photo')return current;
  const initial=(s.photos===0&&['survey','chain','ridge','bow','flank'].includes(s.phase));
  const optional=(s.photos===1&&['boarding','promenade','doorway','ballroom','stairs','landing','passage'].includes(s.phase));
  if(!initial&&!optional)return null;
  const phase=initial?'primary':'bonus',step=STAGES[phase],key=step.key;
  const target={...(targets[key]??DEFAULT_TARGETS[key]),...step,key};
  const guide=getGuide(s,target);
  return guide.approach&&guide.d<target.range+2.8?target:null;
}
function change(s,next){s.phase=next;s.stageElapsed=0;if(next==='bow')s.discovered=true;}
export function takePhoto(s,targets=DEFAULT_TARGETS){
  const t=captureTarget(s,targets),g=getGuide(s,t);
  if(!t)return 'no-target';
  if(!s.lamp)return 'lamp';
  if(!g.approach)return t.key==='frame'?'side':'inside';
  if(g.tooClose)return 'close';
  if(!g.inRange)return 'distance';
  if(!g.focused)return 'aim';
  s.photos++;s.pulse=1;
  if(t.key==='frame'){s.discovered=true;change(s,'decision');s.exitPrompt=true;return 'decision';}
  change(s,'turn');return 'return';
}
export function choose(s,extend){
  if(s.phase!=='decision')return false;
  s.exitPrompt=false;change(s,extend?'boarding':'retreat');return true;
}
export function hullWidth(z){
  // Linear transverse stations, shared with the main collision envelope.
  const stations=[[-50,.14],[-47.8,1.53],[-45.4,3.01],[-42.8,4.61],[-38,5.98],[-34,6.81],[-24,8],[24,8],[29,7.22],[34,6.03],[39.8,4.40],[43.3,2.54],[46.2,1.12],[48,.09]];
  for(let i=1;i<stations.length;i++)if(z<=stations[i][0]&&z>=stations[i-1][0]){
    const [a,b]=stations[i-1],[c,d]=stations[i];return mix(b,d,(z-a)/(c-a));
  }
  return 0;
}
const cross=(a,b,line)=>(a<line&&b>=line)||(a>=line&&b<line);
// Eye clearance at the deck edge must cover physical thickness and near-plane corners.
const MAIN_DECK={high:-6.10,low:-6.87,center:-6.42};
const throughShaft=(x,z)=>Math.abs(x)<2.79&&
  (between(z,-7.72,-2.04)||between(z,-16.23,-12.75));

const shipMeshes=new Map();
function intersectsShipRegion(x,y,z){
  return Math.abs(x)<13.5&&y>-17&&y<7&&z>-56&&z<52;
}
export function updateDive(s,dt,keys,targets=DEFAULT_TARGETS,heightAt=null,shipDetail=.64){
  s.pulse=Math.max(0,s.pulse-dt*3);
  const obj=objective(s,targets);
  if(!obj)return null;
  s.elapsed+=dt;s.stageElapsed+=dt;
  s.oxygen=Math.max(0,s.oxygen-dt*(INDOORS.has(s.phase)?.34:.23));
  if(!s.oxygen){s.end='oxygen';change(s,'ended');return 'oxygen';}
  const yes=(k)=>keys[k]?1:0;
  s.yaw=turnAngle(s.yaw+dt*(yes('ArrowLeft')-yes('ArrowRight'))*1.58);
  s.pitch=clamp(s.pitch+dt*(yes('ArrowUp')-yes('ArrowDown'))*1.27,-1.21,1.21);
  const f=yes('KeyW')-yes('KeyS'),side=yes('KeyD')-yes('KeyA');
  const up=yes('KeyE')-yes('KeyQ');
  const pace=(INDOORS.has(s.phase)?2.12:2.77)*(keys.ShiftLeft||keys.ShiftRight?1.32:1)*dt;
  // Keep the game responsive, but separate the slower vertical trim from swimming.
  const vertical=up>0?1.82:2.10;
  const h=Math.max(1,Math.hypot(f,side)),oldX=s.x,oldY=s.y,oldZ=s.z;
  s.x=clamp(s.x+pace*(-Math.sin(s.yaw)*f+Math.cos(s.yaw)*side)/h,WORLD.minX,WORLD.maxX);
  s.z=clamp(s.z+pace*(-Math.cos(s.yaw)*f-Math.sin(s.yaw)*side)/h,WORLD.minZ,WORLD.maxZ);
  s.y=clamp(s.y+dt*up*vertical+pace*Math.sin(s.pitch)*f*.33,WORLD.floor,SURFACE_Y-.9);
  if(typeof heightAt==='function' && s.y<-13.2)s.y=Math.max(s.y,heightAt(s.x,s.z)+.30);
  // The route skirts the stone berm on its open starboard side.
  if(s.y<-2.65&&s.y>-15.4&&s.x<4.95&&s.x>-12&&between(s.z,57.3,65.0)){
    if(oldZ>=65||oldZ<=57.3)s.z=oldZ;else s.x=oldX;
  }
  const nowW=hullWidth(s.z), oldW=hullWidth(oldZ);
  const inHull=(x,w)=>w>.24&&Math.abs(x)<w;
  const lo=s.y<-6.53, upperSill=s.y>-6.05&&s.y<-3.24;
  if(lo&&s.y>-14.2&&inHull(oldX,oldW)!==inHull(s.x,nowW)){
    const opening=(s.x<0||oldX<0)&&between(s.z,-16.32,-12.75)&&between(s.y,-9.87,-6.74);
    if(!opening){s.x=oldX;s.z=oldZ;}
  }
  if(upperSill&&between(s.z,14.0,25.5)&&cross(oldX,s.x,7.95)&&!between(s.z,15.1,18.95))s.x=oldX;
  const through=throughShaft(s.x,s.z);
  const withinDeck=inHull(s.x,nowW)&&s.y> -10.35;
  if(withinDeck&&!through){
    const wasInGap=throughShaft(oldX,oldZ),dzInDeck=between(s.y,MAIN_DECK.low,MAIN_DECK.high);
    if(wasInGap&&between(oldY,MAIN_DECK.low,MAIN_DECK.high)&&dzInDeck){
      // At deck height the opening has four solid lips; do not let the view ride through an edge.
      s.x=oldX;s.z=oldZ;
    }else if(dzInDeck||cross(oldY,s.y,MAIN_DECK.center)){
      s.y=oldY>=MAIN_DECK.center?MAIN_DECK.high:MAIN_DECK.low;
    }
  }
  if(withinDeck&&s.y<MAIN_DECK.center&&(INDOORS.has(s.phase)||inLowerWing(oldX,oldY,oldZ)||Math.abs(s.x)<3.20&&between(s.z,-8.12,-2.05)))s.y=Math.max(s.y,-9.96);
  if(between(s.y,-10.32,MAIN_DECK.low+.12)){
    // Lower atrium now has a real forward bulkhead and joined side partitions.
    // Matching eyespace bounds leave the lower hall open behind the staircase.
    if(between(oldZ,-8.09,-1.65)&&Math.abs(oldX)<3.27){

      if(between(s.z,-8.09,-1.65)&&Math.abs(s.x)>3.16)s.x=Math.sign(s.x)*3.16;
    }
  }
  if(s.y>-6.12&&s.y<-3.07){
    if(cross(oldZ,s.z,13)&&Math.abs(s.x)<3.7&&!between(s.x,.46,2.94))s.z=oldZ;
    if(cross(oldZ,s.z,-5.9)&&Math.abs(s.x)<3.7&&Math.abs(s.x)>1.7)s.z=oldZ;
    if(between(s.z,-1.72,12.9)&&cross(Math.abs(oldX),Math.abs(s.x),2.91)){
      s.x=oldX;
    }
  }
  if(between(s.y,-10,-6.53)){
    if(between(s.z,-12.65,-7.98)&&cross(Math.abs(oldX),Math.abs(s.x),2.72)){
      const lounge=(s.x>0||oldX>0)&&between(s.z,-12.02,-9.88);
      if(!lounge)s.x=oldX;
    }
    if(s.x>2.72&&between(s.z,-15.3,-8.02)){
      if(cross(oldZ,s.z,-13.58)||cross(oldZ,s.z,-8.24))s.z=oldZ;
      if(cross(oldX,s.x,6.54))s.x=oldX;
    }
    if(cross(oldZ,s.z,-15.36)&&Math.abs(s.x)<7.90)s.z=oldZ;
    if(oldZ>-16.31&&s.z<-16.31&&s.x>-7.68&&s.x<-2.92)s.z=-16.31;
    if(cross(oldZ,s.z,-12.38)&&s.x< -2.06&&s.x>-7.90)s.z=oldZ;
  }
  slideLowerWing(s,oldX,oldY,oldZ);
  if((s.x!==oldX||s.y!==oldY||s.z!==oldZ)&&
     (intersectsShipRegion(oldX,oldY,oldZ)||intersectsShipRegion(s.x,s.y,s.z))){
    const variant=shipDetail>=1?1:.64;
    if(!shipMeshes.has(variant))shipMeshes.set(variant,createWreckCollision({radius:.21,surfaceDetail:variant}));
    const contact=shipMeshes.get(variant).resolve({x:oldX,y:oldY,z:oldZ},s);
    s.x=contact.x;s.y=contact.y;s.z=contact.z;
  }
  // Landmark volumes accept freely chosen approaches. The anchor is set dressing,
  // not an invisible waypoint that the player must approach to unlock the wreck.
  if(obj.search&&s.z<62&&(s.x>4.95||s.x< -12||s.y> -2.65)){
    change(s,s.z<39&&s.x>8.5?'primary':'bow');s.discovered=true;return null;
  }
  if(['bow','flank'].includes(s.phase)&&s.x>8.65&&s.x<18&&s.z<36&&s.z>17&&s.y<-3.25&&s.y>-11.3){
    change(s,'primary');return null;
  }
  if(length(s,obj)<(obj.radius??0)){
    if(obj.type==='gate'){
      // The staircase's lower checkpoint must be reached from the stairwell, not its ceiling.
      if(s.phase!=='landing'||s.y< -7.4)change(s,obj.next);
    }
    if(obj.type==='return'){s.end=s.photos>1?'both':'one';change(s,'ended');return s.end;}
  }
  return null;
}
