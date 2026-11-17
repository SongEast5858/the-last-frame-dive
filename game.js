import {createOcean} from './ocean.js?v=9';
import {newDive,DEFAULT_TARGETS,STAGES,objective,getGuide,captureTarget,takePhoto,choose,updateDive,clamp,turnAngle,introPose,SURFACE_Y,canBoardCapsule,boardCapsule} from './mission.mjs?v=9';

const el=id=>document.getElementById(id);
const canvas=el('ocean');
const screens={home:el('screenHome'),intro:el('screenIntro'),decision:el('screenDecision'),end:el('screenEnd'),pause:el('screenPause')};
const selected=()=>document.activeElement;
const put=(id,t)=>{const node=el(id);if(node&&node.textContent!==String(t))node.textContent=t;};
let ocean;
try{ocean=await createOcean(canvas);}
catch(e){console.error('3D preview:',e);ocean=null;}
const hasFallback=!ocean||ocean.fallback===true;
if(!ocean){
  canvas.hidden=true;
  const note=el('rendererNotice');if(note){note.hidden=false;note.textContent='当前浏览器无法运行这段水下 3D 场景，请用支持 WebGL 的 Chrome 或 Edge。';}
  if(el('startBtn'))el('startBtn').disabled=true;
}
const targets={...DEFAULT_TARGETS,...ocean?.targets};
const beacon=document.createElement('span');
beacon.setAttribute('aria-hidden','true');
beacon.className='world-beacon';beacon.hidden=true;
Object.assign(beacon.style,{position:'fixed',zIndex:'3',pointerEvents:'none',width:'13px',height:'13px',border:'1px solid #c8fff3',background:'#79ead438',boxShadow:'0 0 12px #63f5d2a8',transform:'translate(-50%,-50%) rotate(45deg)',borderRadius:'2px'});
el('hud')?.append(beacon);
let state=newDive(targets);
let mode='home', prev=performance.now(), drag=null, muted=false, toastTime=0, shutterTime=0, lowNotified=false, showGuide=false;
let audioBus=null, pendingShot=null;
let photographs=[], introTime=0, introStage=-1;
const INTRO_SECONDS=9.0;
const keys=Object.create(null);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait=()=>matchMedia('(pointer: coarse)').matches;
function sendToast(content,seconds=2.3){
  put('toast',content);if(el('toast'))el('toast').hidden=false;toastTime=seconds;
}
function setMode(type){
  mode=type;document.body.dataset.mode=type;
  for(const [k,v] of Object.entries(screens))if(v)v.hidden=k!==type;
  if(el('hud'))el('hud').hidden=type==='home'||type==='end'||type==='intro';
  if(el('touchControls'))el('touchControls').hidden=type!=='play';
  updateHelp();
  if(type!=='play')for(const k of Object.keys(keys))keys[k]=false;
  drag=null;
  el('gameRoot')?.classList.toggle('intro-mode',type==='intro');
  if(type==='intro')el('skipIntroBtn')?.focus({preventScroll:true});
  if(type==='decision')el('choiceReturn')?.focus({preventScroll:true});
  if(type==='end')el('endRestart')?.focus({preventScroll:true});
  if(type==='pause')el('resumeBtn')?.focus({preventScroll:true});
  if(type==='home'&&selected() instanceof HTMLElement)selected().blur();
  if(type==='play'&&selected() instanceof HTMLElement)selected().blur();
}
function soundInit(){
  if(muted)return;
  try{
    if(!audioBus){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const ctx=new AC(), master=ctx.createGain(), noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
      master.gain.value=.20;master.connect(ctx.destination);
      const dat=noise.getChannelData(0);let mem=0;
      for(let i=0;i<dat.length;i++){mem=(mem+.045*(Math.random()*2-1))/1.045;dat[i]=mem*3.3;}
      const bed=ctx.createBufferSource(),roll=ctx.createBiquadFilter(),bedGain=ctx.createGain();
      bed.buffer=noise;bed.loop=true;roll.type='lowpass';roll.frequency.value=255;bedGain.gain.value=.62;
      bed.connect(roll).connect(bedGain).connect(master);bed.start();
      // A quiet, periodic regulator envelope, separate from the constant ocean bed.
      const breath=ctx.createBufferSource(), band=ctx.createBiquadFilter(), lungs=ctx.createGain();
      breath.buffer=noise;breath.loop=true;breath.playbackRate.value=1.21;
      band.type='bandpass';band.frequency.value=420;band.Q.value=.53;lungs.gain.value=0;
      breath.connect(band).connect(lungs).connect(master);breath.start();
      audioBus={ctx,master,noise,roll,band,lungs};
    }
    audioBus.ctx.resume().catch(()=>{});
    audioBus.master.gain.setTargetAtTime(.2,audioBus.ctx.currentTime,.15);
  }catch(e){ /* Audio is optional */ }
}
function soundFade(){
  if(audioBus)audioBus.master.gain.setTargetAtTime(0,audioBus.ctx.currentTime,.15);
}
function ping(kind='click'){
  if(!audioBus||muted)return;
  const {ctx,master,noise}=audioBus, at=ctx.currentTime;
  const gain=ctx.createGain(), fil=ctx.createBiquadFilter();
  fil.type='bandpass';fil.frequency.value=kind==='photo'?1100:640;
  const n=ctx.createBufferSource();n.buffer=noise;
  gain.gain.setValueAtTime(kind==='photo'?.78:.4,at);
  gain.gain.exponentialRampToValueAtTime(.008,at+.16);
  n.connect(fil).connect(gain).connect(master);n.start(at);n.stop(at+.18);
}
function audioToggle(){
  muted=!muted;
  if(muted)soundFade();else if(mode==='play'||mode==='intro')soundInit();
  const b=el('audioBtn');if(b){b.setAttribute('aria-pressed',String(!muted));b.dataset.muted=String(muted);b.setAttribute('aria-label',muted?'开启声音':'关闭声音');}
  sendToast(muted?'环境声音已关闭':'环境声音已开启');
}
function lampToggle(){
  if(mode!=='play')return;
  state.lamp=!state.lamp;ping();
  el('flashBtn')?.setAttribute('aria-pressed',String(state.lamp));

}
function finishIntro(){
  if(mode!=='intro')return;
  put('introCaption','');
  setMode('play');soundInit();

}
function updateIntro(){
  const idx=introTime<2.65?0:introTime<5.7?1:2;
  if(idx===introStage)return;
  introStage=idx;
  const intro=el('screenIntro');
  if(intro)intro.dataset.scene=idx<2?'capsule':'arrival';
  const lines=[
    ['潜航记录 01','离开水面','下潜舱穿过浪层。舷窗外的日光开始变暗。','下潜舱 · 向调查区靠近'],
    ['潜航记录 02','接近搜索区','任务简报：先到沉船右舷外侧，拍下写着 SEA MIST 的铜铭牌。','下潜舱 · 减速'],
    ['潜航记录 03','到达下潜点','前方只见海床和礁脊。接下来由你接管。','准备离舱']
  ][idx];
  ['introKicker','introTitle','introText','introCaption'].forEach((id,n)=>put(id,lines[n]));
  if(idx>0)ping();
}
function startDive(){
  if(!ocean)return;
  state=newDive(targets);showGuide=false;lowNotified=false;photographs=[];pendingShot=null;introTime=0;introStage=-1;shutterTime=0;toastTime=0;
  if(el('toast'))el('toast').hidden=true;
  el('flashBtn')?.setAttribute('aria-pressed','false');
  el('aim')?.classList.remove('is-ready');
  setMode('intro');updateIntro();soundInit();
  if(reduced)finishIntro();
}
function shoot(){
  if(mode!=='play')return;
  const result=takePhoto(state,targets);
  if(result==='lamp')return sendToast('先打开潜水灯 · F');
  if(result==='close')return sendToast('向后退一点，把整扇彩窗纳入画面');
  if(result==='distance')return sendToast('再靠近一点，直到取景框亮起');
  if(result==='side')return sendToast('铭牌朝外，请绕到右舷外侧拍摄');
  if(result==='inside')return sendToast('进入客舱走廊，把缺口尽头的星海彩窗对准镜头');
  if(result==='aim')return sendToast('让取证对象落在取景框中央');
  if(result==='no-target')return sendToast(state.photos===0?'第一张：船外右舷的 SEA MIST 铜牌 · 问号可指路':state.photos===1?'第二张：大楼梯底，往船尾走廊找星海彩窗':'本次取证已完成',3);
  ping('photo');shutterTime=.28;pendingShot=state.photos===1?'海雾号 · 右舷铭牌':'海雾号 · 星海彩窗';
  if(result==='decision'){
    put('decisionTitle','船的身份确认了。');
    put('decisionText','通话器里是同伴的声音：「收到右舷铭牌。前面的散步甲板能进去。下到客舱找传说里的星海彩窗，还是直接游回刚才的下潜设备？」');
    setMode('decision');
  }else sendToast('第二张照片已归档',2);
}
function selectBranch(extend){
  if(!choose(state,extend))return;
  setMode('play');
}
function ending(){
  const end=state.end;
  const copy={
    both:['双重记录','两张照片，一次返航。','你带着海雾号的铭牌和星海彩窗的照片回到了下潜设备。那张本来没有计划拍的照片，成了今天的最后一张。'],
    one:['安全返航','一张照片就够了。','你带着铜铭牌的照片回到下潜设备。舱门合上，探照灯从船体上挪开，返程开始了。'],
    oxygen:['任务中止','这次先到这里。','游戏中的气量耗尽，潜水任务中止。可重新下潜；有了识别牌的照片，就可以选择直接返航。'],
  }[end];
  if(!copy)return;
  put('endTag',copy[0]);put('endTitle',copy[1]);put('endText',copy[2]);
  put('endStats',state.photos+' 张照片　·　'+Math.ceil(state.oxygen)+'% 剩余气量');
  const gallery=el('endGallery');
  if(gallery){
    gallery.replaceChildren();
    gallery.hidden=!photographs.length;
    for(const {url,label} of photographs){
      const figure=document.createElement('figure'),image=document.createElement('img'), caption=document.createElement('figcaption');
      image.src=url;image.alt=label;caption.textContent=label;figure.append(image,caption);gallery.append(figure);
    }
  }
  setMode('end');soundFade();
}
function pause(){
  if(mode==='play'){setMode('pause');soundFade();}
  else if(mode==='pause'){setMode('play');soundInit();}
}
function updateHelp(){
  const open=showGuide&&mode==='play';
  for(const id of ['missionHelp','mapHelp','controlHelp']){const n=el(id);if(n)n.hidden=!open;}
  if(el('helpBtn')){
    el('helpBtn').setAttribute('aria-pressed',String(showGuide));
    el('helpBtn').setAttribute('aria-label',showGuide?'隐藏拍摄目标和航线':'显示拍摄目标和航线');
  }
  if(!open){if(el('navArrow'))el('navArrow').hidden=true;if(el('interactionHint'))el('interactionHint').hidden=true;beacon.hidden=true;}
}
function toggleHelp(){if(mode==='play'){showGuide=!showGuide;updateHelp();}}
function wire(id,fn){el(id)?.addEventListener('click',fn);}
wire('skipIntroBtn',finishIntro);wire('startBtn',startDive);wire('restartBtn',startDive);wire('endRestart',startDive);
wire('flashBtn',lampToggle);wire('photoBtn',shoot);wire('audioBtn',audioToggle);
wire('helpBtn',toggleHelp);wire('pauseBtn',pause);wire('resumeBtn',pause);wire('homeBtn',()=>{setMode('home');soundFade();});
wire('choiceContinue',()=>selectBranch(true));wire('choiceReturn',()=>selectBranch(false));
wire('boardCapsuleBtn',()=>{if(mode==='play'&&boardCapsule(state,targets))ending();});
const moves=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',e=>{
  if(mode==='intro'&&e.code==='Escape'){e.preventDefault();finishIntro();return;}
  if(mode==='pause'&&e.code==='Escape'){e.preventDefault();pause();return;}
  if(mode!=='play')return;
  if(moves.has(e.code)){e.preventDefault();keys[e.code]=true;return;}
  if(e.repeat)return;
  if(e.code==='Space'&&e.target===el('boardCapsuleBtn'))return;
  if(['Space','KeyF','Escape','KeyM','KeyH'].includes(e.code))e.preventDefault();
  if(e.code==='Space')shoot();if(e.code==='KeyF')lampToggle();if(e.code==='Escape')pause();if(e.code==='KeyM')audioToggle();if(e.code==='KeyH')toggleHelp();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{for(const k of Object.keys(keys))keys[k]=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause();});
canvas?.addEventListener('pointerdown',e=>{
  if(mode!=='play'||e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);e.preventDefault();
});
canvas?.addEventListener('pointermove',e=>{
  if(mode!=='play'||drag?.id!==e.pointerId)return;
  const rate=e.pointerType==='touch'?.006:.0045;
  state.yaw=turnAngle(state.yaw-(e.clientX-drag.x)*rate);
  state.pitch=clamp(state.pitch-(e.clientY-drag.y)*rate,-1.21,1.21);
  drag.x=e.clientX;drag.y=e.clientY;
});
for(const key of ['pointerup','pointercancel','lostpointercapture'])canvas?.addEventListener(key,e=>{if(e.pointerId===drag?.id)drag=null;});
for(const b of document.querySelectorAll('[data-key]')){
  const code=b.dataset.key;
  b.addEventListener('pointerdown',e=>{if(mode!=='play')return;e.preventDefault();keys[code]=true;b.setPointerCapture?.(e.pointerId);b.classList.add('pressed');});
  for(const k of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(k,()=>{keys[code]=false;b.classList.remove('pressed');});
}
const map=el('navMap'), mapCtx=map?.getContext('2d');
function drawCourse(t){
  if(!showGuide||!mapCtx||!t||mode!=='play')return;
  const c=mapCtx,X=x=>116+x*3.3,Y=z=>105-z*.94;
  c.clearRect(0,0,map.width,map.height);
  c.strokeStyle='#accacf17';c.lineWidth=1;
  for(let i=24;i<230;i+=23){c.beginPath();c.moveTo(i,6);c.lineTo(i,181);c.stroke();}
  for(let i=13;i<185;i+=23){c.beginPath();c.moveTo(3,i);c.lineTo(229,i);c.stroke();}
  if(state.discovered){
    c.strokeStyle='#64aab185';c.fillStyle='#265058a5';c.lineWidth=2;
    c.beginPath();c.moveTo(X(0),Y(48));c.bezierCurveTo(X(5),Y(39),X(8),Y(29),X(8),Y(23));
    c.lineTo(X(8),Y(-25));c.quadraticCurveTo(X(7),Y(-41),X(0),Y(-50));
    c.quadraticCurveTo(X(-7),Y(-41),X(-8),Y(-25));c.lineTo(X(-8),Y(23));
    c.bezierCurveTo(X(-8),Y(29),X(-5),Y(39),X(0),Y(48));c.fill();c.stroke();
    c.strokeStyle='#6aa1a060';c.strokeRect(X(-3.6),Y(14),X(3.6)-X(-3.6),Y(-13)-Y(14));
    c.fillStyle='#e1c690';c.beginPath();c.arc(X(t.x),Y(t.z),3.75,0,6.283);c.fill();
    c.strokeStyle='#b9efe6';c.lineWidth=1.5;const hx=X(targets.return.x),hy=Y(targets.return.z);c.strokeRect(hx-4,hy-4,8,8);
  }else{
    c.fillStyle='#648480a0';c.beginPath();c.ellipse(93,83,36,14,.18,0,6.283);c.fill();
    c.textAlign='center';c.fillStyle='#c0d7c9';c.font='13px sans-serif';c.fillText('礁脊 · 船位未确认',116,36);
    c.strokeStyle='#d7cc896b';c.setLineDash([3,5]);c.beginPath();c.ellipse(116,97,59,41,0,0,6.283);c.stroke();c.setLineDash([]);
  }
  const xx=state.discovered?clamp(X(state.x),9,222):clamp(116+state.x*3.68,10,222), yy=state.discovered?clamp(Y(state.z),9,174):clamp(151-(targets.start.z-state.z)*1.72,12,173);
  const a=-state.yaw;
  c.save();c.translate(xx,yy);c.rotate(a);c.fillStyle='#8dffe4';c.beginPath();c.moveTo(0,-8);c.lineTo(5.4,5);c.lineTo(0,2.2);c.lineTo(-5.4,5);c.closePath();c.fill();c.restore();
}
function renderHUD(){
  const t=objective(state,targets), g=getGuide(state,t);drawCourse(t);
  const dock=el('boardCapsuleBtn');if(dock)dock.hidden=mode!=='play'||!canBoardCapsule(state,targets);
  const h=STAGES[state.phase];
  if(h){put('objectiveKicker',h.code);put('objectiveText',h.title);put('missionStatus',h.status);}
  put('depthValue',Math.max(0,SURFACE_Y-state.y).toFixed(1)+' m');
  put('oxygenValue',Math.ceil(state.oxygen)+'%');
  if(el('oxygenFill')){el('oxygenFill').style.width=state.oxygen+'%';el('oxygenFill').classList.toggle('low',state.oxygen<26);}
  if(el('hud'))el('hud').dataset.oxygen=state.oxygen<16?'critical':state.oxygen<26?'low':'normal';
  if(el('airWarning'))el('airWarning').hidden=state.oxygen>=26;
  const direction=Math.round((-state.yaw*180/Math.PI+360)%360)%360;
  put('headingValue',String(direction).padStart(3,'0')+'°');
  put('photoCount',String(state.photos).padStart(2,'0'));
  const photo=captureTarget(state,targets),p=getGuide(state,photo);
  const a=el('aim');if(a){a.classList.toggle('is-ready',!!p?.ready);a.dataset.ready=String(!!p?.ready);}
  const subject=el('photoSubject');
  if(subject){
    const near=mode==='play'&&p?.approach&&p.d<(photo.range+2.4)&&p.angle<.5;
    subject.hidden=!near||showGuide;
    if(near)put('photoSubject',photo.name+' · '+(p.ready?(portrait()?'点拍照':'空格拍摄'):p.tooClose?'稍退':!state.lamp?(portrait()?'打开手电':'F 开灯'):'靠近取景'));
  }
  const note=el('interactionHint');
  if(note&&g&&showGuide&&mode==='play'){
    note.hidden=false;
    let txt=g.ready?'对准了 · 可以拍摄':t.type!=='photo'?(t.name+' · '+Math.ceil(g.d)+' m'):
      (g.tooClose?'往后退 · 拍下完整彩窗':g.inRange?(!state.lamp?'开启潜水灯':'对准标记'):(t.name+' · '+Math.ceil(g.d)+' m'));
    const dh=t.y-state.y;
    if(t.type!=='photo'&&Math.abs(dh)>1.5&&!g.ready)txt+=' · '+(dh>0?(portrait()?'上浮':'E 上浮'):(portrait()?'下潜':'Q 下潜'));
    if(t.search){
      txt=state.phase==='survey'?'礁脊挡住了视线':state.phase==='chain'?'从礁脊的右侧绕过去':'残骸应当在岩脊后方';
      if(dh< -1.8)txt+=' · '+(portrait()?'略下潜':'Q 略下潜');
      else if(dh>2.2)txt+=' · '+(portrait()?'略上浮':'E 略上浮');
      if(state.stageElapsed>9)txt+=' · '+(Math.abs(g.relative)>1.56?'转身搜索':g.relative>.32?'向左前方':g.relative<-.32?'向右前方':'就在前方');
    }
    put('interactionHint',txt);
  }else if(note)note.hidden=true;
  const marker=t&&ocean?.project?.(t);
  beacon.hidden=!showGuide||mode!=='play'||t?.search||!marker?.visible||marker.x<10||marker.y<10||marker.x>innerWidth-10||marker.y>innerHeight-10||!!g?.ready||g?.d<1;
  if(!beacon.hidden){
    beacon.style.left=marker.x+'px';beacon.style.top=marker.y+'px';
    beacon.style.borderColor=t.type==='return'?'#9abfff':t.type==='gate'?'#bde6ff':'#c8fff3';
  }
  let arrow=el('navArrow');
  if(arrow){
    arrow.hidden=!showGuide||!g||mode!=='play'||(t?.search&&state.stageElapsed<9);
    if(g){
      const rel=g.relative, behind=Math.abs(rel)>1.65;
      arrow.style.setProperty('--nav-rot',(-rel)+'rad');arrow.dataset.behind=String(behind);
      put('navArrow',behind?(rel>0?'←':'→'):(Math.abs(rel)<.18?'↑':(rel>0?'↖':'↗')));
      arrow.title=t.search?'大致搜索方向':'目标：'+t.name+' / '+Math.ceil(g.d)+' m';
    }
  }
}
function animate(now){
  const dt=Math.min(.047,Math.max(0,(now-prev)/1000));prev=now;
  if(mode==='play'){
    const stage=state.phase;
    if(updateDive(state,dt,keys,targets,ocean?.heightAt,ocean?.shipDetail))ending();
    else if(showGuide&&stage!==state.phase&&STAGES[state.phase])sendToast(STAGES[state.phase].title,2);
    if(state.oxygen<24&&!lowNotified){lowNotified=true;sendToast('剩余气量偏低 · 优先考虑返航',3);}
  }
  if(audioBus&&!muted&&mode==='play'){
    const at=audioBus.ctx.currentTime,phase=(state.elapsed/4.8)%1;
    const inhale=phase<.29?Math.sin(phase/.29*Math.PI)**2:0;
    const exhale=phase>.45?Math.sin((phase-.45)/.55*Math.PI)**2:0;
    audioBus.lungs.gain.setTargetAtTime(inhale*.10+exhale*.17,at,.11);
    audioBus.band.frequency.setTargetAtTime(490+inhale*240-exhale*70,at,.12);
  }
  if(mode==='intro'){introTime+=dt;updateIntro();if(introTime>=INTRO_SECONDS)finishIntro();}
  if(toastTime>0){toastTime-=dt;if(toastTime<=0&&el('toast'))el('toast').hidden=true;}
  if(shutterTime>0)shutterTime=Math.max(0,shutterTime-dt);
  if(el('flashFx'))el('flashFx').style.opacity=String(shutterTime*2.9);
  if(ocean){
    const pose=mode==='intro'?introPose(introTime/INTRO_SECONDS,targets):state;
    ocean.draw({...pose,guide:showGuide,reducedMotion:reduced,scene:mode},dt);
    if(pendingShot&&canvas.width&&canvas.height){
      try{
        const frame=document.createElement('canvas');frame.width=608;frame.height=Math.round(608*canvas.height/canvas.width);
        frame.getContext('2d').drawImage(canvas,0,0,frame.width,frame.height);
        photographs.push({label:pendingShot,url:frame.toDataURL('image/jpeg',.84)});
      }catch(e){/* A missing local snapshot doesn't block the dive. */}
      pendingShot=null;
    }
  }
  if(mode==='play'||mode==='pause'||mode==='decision')renderHUD();
  requestAnimationFrame(animate);
}
if(hasFallback&&ocean){const note=el('rendererNotice');if(note){note.hidden=false;note.textContent='当前是轻量画质 · 完整环境需要 WebGL 2';}}
el('audioBtn')?.setAttribute('aria-pressed',String(!muted));
const startButton=el('startBtn');
if(startButton){
  startButton.removeAttribute('aria-busy');startButton.disabled=!ocean;
  startButton.querySelector('span').textContent=ocean?'开始下潜':'无法启动潜航';
}
setMode('home');requestAnimationFrame(animate);
