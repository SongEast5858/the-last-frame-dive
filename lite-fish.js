// Canvas fallback: photograph/orthographic model passes with transparent margins.
// Images must place the nose at the right and be cropped to the fin silhouette.
// Edge-on passes are deliberately omitted if the matching axial image isn't shipped.
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const smooth = (a,b,x)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
const asset=(name)=>{
  if(typeof Image==='undefined')return null;
  const image=new Image(); image.decoding='async';
  image.src=new URL(`./media/${name}.webp`,import.meta.url).href;
  return image;
};
const ready = image=>!!(image?.complete&&image.naturalWidth>2&&image.naturalHeight>2);
const underwaterTint=new WeakMap();
function shaded(source,kind){
  if(underwaterTint.has(source))return underwaterTint.get(source);
  const w=source.naturalWidth,h=source.naturalHeight;
  const painted=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):
    typeof document!=='undefined'?document.createElement('canvas'):null;
  if(!painted)return source;
  painted.width=w;painted.height=h;
  const c=painted.getContext('2d');if(!c)return source;
  if(kind>=1)c.filter='contrast(114%) brightness(92%)';
  c.drawImage(source,0,0,w,h);
  c.filter='none';
  c.globalCompositeOperation='source-atop';
  c.fillStyle=kind===1?'rgba(35,90,80,.20)':kind===2||kind===4?'rgba(42,97,84,.23)':'rgba(55,103,97,.25)';
  c.fillRect(0,0,w,h);
  underwaterTint.set(source,painted);return painted;
}

// Optional atlas keys come from the deployment, so a missing secondary specimen
// does not trigger 404s or replace one species with an unrelated one.
export function makeCanvasFish(files={}){
  const sprites=[
    files.school?{side:asset(files.school),front:files.schoolFront?asset(files.schoolFront):null}:null,
    {side:asset(files.patrol??'fish-patrol-side'),front:files.patrolFront?asset(files.patrolFront):null,
      back:files.patrolBack?asset(files.patrolBack):null},
    files.reef?{side:asset(files.reef),front:files.reefFront?asset(files.reefFront):null}:null,
    {side:asset(files.mackerel??'fish-mackerel-side'),front:files.mackerelFront?asset(files.mackerelFront):null},
    {side:asset(files.cod??'fish-cod-side'),front:files.codFront?asset(files.codFront):null},
  ];
  let disposed=false;
  const paint=(ctx,{d,p,look,v},state,w,h,time)=>{
    const group=sprites[d.kind];
    const perspective=h*.84/p.z;
    const length=d.kind===1?Math.min(.92,d.scale*1.16):d.scale*(d.kind===2?1.09:1.18);
    const width=clamp(length*perspective,0,Math.min(234,w*.39));
    if(disposed)return true;
    const hasSide=ready(group?.side);
    if(!hasSide){
      // No large substitute if an asset is still decoding or failed. Only
      // sub-resolution school marks remain, dim enough not to flash on load.
      if(d.kind===0&&width<3.9&&width>.65&&p.z<74){
        const dots=smooth(.55,1.3,width)*(1-smooth(2.8,3.9,width))*(1-smooth(57,74,p.z));
        if(dots>.015){
          ctx.save();ctx.fillStyle='#587c79';ctx.globalAlpha=dots*.31;
          ctx.beginPath();ctx.ellipse(p.x,p.y,width*.40,Math.max(.28,width*.14),
            Math.atan2(look.y-p.y,look.x-p.x),0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
      return true;
    }
    // A ready school asset is used for the whole distance band: never swap to
    // the pale gradient silhouette on either side of a size/depth threshold.
    const range=d.kind===0||d.kind===3?1-smooth(52,74,p.z):1-smooth(47,60,p.z);
    const visible=range*smooth(.62,1.72,width);
    if(visible<.012)return true;
    const vx=v.x-state.x,vy=v.y-state.y,vz=v.z-state.z;
    const m=Math.hypot(vx,vy,vz)||1,l=Math.hypot(v.dx,v.dy,v.dz)||1;
    const heading=clamp((vx*v.dx+vy*v.dy+vz*v.dz)/(m*l),-1,1);
    const broad=Math.sqrt(Math.max(0,1-heading*heading));
    const axial=heading<0?group.front:group.back;
    const hasAxial=ready(axial);
    const passAlpha=smooth(hasAxial?.14:.32,hasAxial?.66:.67,broad)*smooth(1.22,1.81,p.z);
    if(!hasAxial&&passAlpha<.024)return true;

    const dx=look.x-p.x,dy=look.y-p.y,face=dx>=0?1:-1;
    // Recompute heading after mirroring; the dorsal fin stays above the eye when moving left.
    const pitch=Math.atan2(dy*face,Math.max(.01,Math.abs(dx)))*smooth(.19,.50,broad);
    const freq=[9.3,4.35,7.2,10.25,4.36][d.kind]??6;
    const beat=state.reducedMotion?0:Math.sin(time*freq+(d.phase??0));
    const opacity=clamp(Math.exp(-Math.max(0,p.z-3.5)*.047),.075,1)*visible;
    const tint=d.kind===1 ? .988+.012*(d.tint??.9) : .93+.07*(d.tint??.9);
    const img=group.side,height=width*img.naturalHeight/img.naturalWidth;
    const bodyWidth=width*(.36+.64*broad);
    ctx.save();ctx.translate(p.x,p.y);
    if(hasAxial&&passAlpha<.98){
      ctx.globalAlpha=opacity*(1-passAlpha)*tint;
      const axialWidth=height*axial.naturalWidth/axial.naturalHeight;
      // Height represents the same fish at the same distance on both passes.
      ctx.drawImage(shaded(axial,d.kind),-axialWidth/2,-height/2,axialWidth,height);
    }
    if(passAlpha>.02){
      ctx.rotate(clamp(pitch,-1.22,1.22)+(v.roll??0)*.15 + beat*.025*(1-broad*.6));
      ctx.scale(face,1);
      ctx.globalAlpha=opacity*passAlpha*tint;
      // Keep body aspect measured by the actual source; yaw foreshortens the profile,
      // rather than narrowing to a vertical sliver when swimming toward the viewer.
      ctx.drawImage(shaded(img,d.kind),-bodyWidth*.51,-height*.53,bodyWidth,height);
    }
    ctx.restore();
    return true;
  };
  return {paint,dispose(){disposed=true;}};
}
