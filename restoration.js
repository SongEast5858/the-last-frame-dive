// SEA MIST is fictional. These are interpretive daylight/interior reconstructions,
// not archival photographs. Target-plane placement, orientation and framing follow
// the actual captured camera pose; do not recenter the target to fit the image.
const P=(x,y,z)=>({x,y,z});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mix=(a,b,t)=>a+(b-a)*t;
const lerpP=(a,b,t)=>P(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t));
const W=2*Math.PI;
const floor=-10.235;
const hullStations=[
  [-50,.14,-6.83,-10.98],[-47.8,1.53,-6.47,-11.52],[-45.4,3.01,-6.38,-11.94],
  [-42.8,4.61,-6.33,-12.21],[-38,5.98,-6.34,-12.65],[-34,6.81,-6.38,-13.0],
  [-29,7.75,-6.4,-13.56],[-24,8.02,-6.4,-13.82],[-18,8.02,-6.4,-14.12],[-12,8.01,-6.4,-14.21],
  [-5,8.04,-6.4,-14.23],[4,8.04,-6.4,-14.23],[12,8.03,-6.4,-14.11],[18,8,-6.4,-13.84],
  [24,7.99,-6.4,-13.79],[29.5,7.30,-6.4,-13.21],[34,6.03,-6.4,-12.62],[39.8,4.4,-6.4,-12.11],
  [43.3,2.54,-6.4,-11.5],[46.2,1.12,-6.4,-10.92],[48,.09,-6.4,-10.5]];
const tiers=[[-6.73,6.73,-31,15.6,-5.16,-3.40],[-5.01,5.01,-26.7,10.6,-3.37,-1.60],
  [-3.66,3.66,-19.8,6.37,-1.47,-.52],[-2.56,2.56,-17.2,4.5,-.47,.53]];
const shell=(z,y)=>{
  let i=0;while(i<hullStations.length-2&&hullStations[i+1][0]<z)i++;
  const a=hullStations[i],b=hullStations[i+1],t=clamp((z-a[0])/(b[0]-a[0]),0,1);
  const top=mix(a[2],b[2],t),keel=mix(a[3],b[3],t),u=clamp((y-keel)/(top-keel),0,1);
  return P(mix(a[1],b[1],t)*(u<.42?.12+.83*Math.pow(u/.42,.69):.95+.05*(u-.42)/.58),y,z);
};
function camera(eye,w,h){
  const yaw=eye.yaw,pitch=eye.pitch,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),f=h*(eye.restorationFovScale||.837);
  return p=>{
    const x=p.x-eye.x,y=p.y-eye.y,z=p.z-eye.z,b=-(x*sy+z*cy);
    const depth=y*sp+b*cp;
    return {x:w*.5+f*(x*cy-z*sy)/Math.max(.003,depth),y:h*.5-f*(y*cp-b*sp)/Math.max(.003,depth),z:depth};
  };
}
function nearClip(points,project){
  const out=[];let a=points.at(-1),az=project(a).z;
  for(const b of points){
    const bz=project(b).z;
    if((az>.12)!==(bz>.12))out.push(lerpP(a,b,(.12-az)/(bz-az)));
    if(bz>.12)out.push(b);a=b;az=bz;
  }
  return out.map(project);
}
function path(g,points,close=false){
  if(!points.length)return;
  g.beginPath();g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
  if(close)g.closePath();
}
function onScreen(q,w,h,pad=30){
  return q.length&&q.some(v=>v.x>-pad&&v.x<w+pad&&v.y>-pad&&v.y<h+pad)||
   q.length&&Math.max(...q.map(v=>v.x))>=-pad&&Math.min(...q.map(v=>v.x))<=w+pad&&
    Math.max(...q.map(v=>v.y))>=-pad&&Math.min(...q.map(v=>v.y))<=h+pad;
}
function renderer(g,w,h,project){
  const polys=[];
  function poly(points,color,shade=null,offset=0){
    const q=nearClip(points,project);
    if(q.length<3||!onScreen(q,w,h))return;
    polys.push([q,color,shade,q.reduce((p,v)=>p+v.z,0)/q.length+offset]);
  }
  function panel(points,c1,c2,bias=0){poly(points,c1,c2,bias);}
  function flush(){
    polys.sort((a,b)=>b[3]-a[3]);
    for(const [pts,color,shade] of polys){
      let c=color;
      if(shade){
        const low=Math.max(-h,Math.min(...pts.map(p=>p.y))),hi=Math.min(h*2,Math.max(...pts.map(p=>p.y)));
        if(hi>low+1)c=gradient(g,0,low,0,hi,[[0,color],[1,shade]]);
      }
      g.fillStyle=c;g.strokeStyle=color;g.lineWidth=.38;
      path(g,pts,true);g.fill();g.stroke();
    }
    polys.length=0;
  }
  function line(a,b,c,r=.024,fixed=0){
    let q=project(a),p=project(b);
    if(q.z<=.12&&p.z<=.12)return;
    if(q.z<=.12)q=project(lerpP(a,b,(.12-q.z)/(p.z-q.z)));
    if(p.z<=.12)p=project(lerpP(b,a,(.12-p.z)/(q.z-p.z)));
    if(!onScreen([q,p],w,h))return;
    g.strokeStyle=c;g.lineWidth=fixed||clamp(h*.84*r/(.5*(q.z+p.z)),.45,20);
    g.beginPath();g.moveTo(q.x,q.y);g.lineTo(p.x,p.y);g.stroke();
  }
  return {poly,panel,flush,line};
}
function gradient(g,x,y,X,Y,stops){
  const q=g.createLinearGradient(x,y,X,Y);for(const [p,c] of stops)q.addColorStop(p,c);return q;
}
function disk(g,x,y,rx,ry,color){
  g.fillStyle=color; g.beginPath();g.ellipse(x,y,rx,ry,0,0,W);g.fill();
}
function grain(g,w,h,brown=false){
  let seed=18711153;
  const r=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  g.save();
  for(let i=0;i<Math.floor(w*h*.024);i++){
    g.globalAlpha=(i%3?.022:.037)*r();
    g.fillStyle=i%2?(brown?'#fff1ce':'#f9f3d0'):(brown?'#321a14':'#2f384b');
    g.fillRect(r()*w,r()*h,.55+r()*1.2,.38+r()*.72);
  }
  g.restore();
}
function glow(g,x,y,r,c,edge){
  if(!(r>0))return;const f=g.createRadialGradient(x,y,0,x,y,r);
  f.addColorStop(0,c);f.addColorStop(1,edge);g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2);
}
function person(g,p,project,opts={}){
  const {coat='#294149',hat='#384341',skin='#e4ad81',dress=false,face=1,ry=1.69,lantern=false}=opts;
  const B=project(p),H=project(P(p.x,p.y+ry,p.z));
  const height=Math.hypot(B.x-H.x,B.y-H.y);if(B.z<.2||H.z<.2||height<7||height>620)return;
  g.save();g.translate(B.x,B.y);g.rotate(Math.atan2(H.x-B.x,B.y-H.y)*.99);g.scale(height,height);
  // Tailored interwar silhouettes; heads are overcoat profiles, not modern cut-outs.
  g.globalAlpha=opts.alpha??.91;
  const cloth=gradient(g,-.15,-.37,.105,-.69,[[0,'#2c2624'],[.37,coat],[.81,coat],[1,'#b99b6a']]);
  const complexion=gradient(g,-.032,-.84,.080,-.931,[[0,'#8c5b47'],[.42,skin],[1,'#f0c4a0']]);
  if(dress){
    g.fillStyle=cloth;g.beginPath();g.moveTo(-.117,-.69);g.bezierCurveTo(-.027,-.56,-.071,-.54,-.063,-.48);
    g.quadraticCurveTo(-.10,-.35,-.128,-.12);g.quadraticCurveTo(.043,-.090,.119,-.129);
    g.quadraticCurveTo(.087,-.38,.047,-.51);g.quadraticCurveTo(.058,-.64,.096,-.67);g.closePath();g.fill();
    g.strokeStyle='#40322b';g.lineWidth=.028;g.beginPath();g.moveTo(-.054,-.14);g.lineTo(-.055,-.025);
    g.moveTo(.055,-.14);g.lineTo(.069,-.028);g.stroke();
  }else{
    g.fillStyle='#293134';g.beginPath();g.moveTo(-.091,-.47);g.lineTo(.085,-.47);g.lineTo(.071,-.028);
    g.lineTo(.028,-.022);g.lineTo(.003,-.302);g.lineTo(-.030,-.028);g.lineTo(-.082,-.028);g.closePath();g.fill();
    g.fillStyle=cloth;g.beginPath();g.moveTo(-.059,-.801);g.quadraticCurveTo(-.092,-.762,-.136,-.739);
    g.lineTo(-.099,-.394);g.quadraticCurveTo(.039,-.368,.101,-.403);g.lineTo(.131,-.728);
    g.quadraticCurveTo(.075,-.790,.046,-.806);g.closePath();g.fill();
    g.strokeStyle='#e8d7a9';g.lineWidth=.014;g.beginPath();g.moveTo(-.04,-.768);g.lineTo(.005,-.697);g.lineTo(.058,-.766);g.stroke();
  }
  g.fillStyle=cloth;g.beginPath();g.moveTo(.083*face,-.736);g.lineTo(.149*face,-.693);
  g.lineTo(.178*face,-.592);g.lineTo((lantern?.215:.245)*face,-.638);g.lineTo((lantern?.196:.220)*face,-.676);
  g.lineTo(.153*face,-.655);g.lineTo(.113*face,-.741);g.closePath();g.fill();
  disk(g,.025*face,-.872,.063,.088,complexion);disk(g,.080*face,-.862,.016,.027,skin);
  if(height>34){
    disk(g,.056*face,-.891,.008,.009,'#59463e');
    g.strokeStyle='#4e3326';g.lineWidth=.008;g.beginPath();
    g.moveTo(.038*face,-.845);g.quadraticCurveTo(.059*face,-.841,.069*face,-.851);g.stroke();
    g.globalAlpha*=.45;g.strokeStyle='#e5c48b';g.lineWidth=.010;g.beginPath();
    g.moveTo(-.069,-.727);g.quadraticCurveTo(-.03,-.744,.007,-.725);g.stroke();
    g.globalAlpha=opts.alpha??.91;
  }
  const shade=gradient(g,-.065,-.933,.080,-.975,[[0,'#3e3c3b'],[.45,hat],[1,'#a0926d']]);
  disk(g,.015*face,-.940,.095,.018,hat);disk(g,.016*face,-.961,dress?.073:.052,.025,shade);
  g.restore();
}
function plaque(g,project,target,w,h){
  const z=target.z,y=target.y-.012,x=target.x+.055;
  const A=project(P(x,y+.224,z+.51)),B=project(P(x,y+.224,z-.51)),C=project(P(x,y-.224,z+.51));
  if(Math.min(A.z,B.z,C.z)<.13||!onScreen([A,B,C],w,h,14))return;
  g.save();
  g.transform((B.x-A.x)/448,(B.y-A.y)/448,(C.x-A.x)/192,(C.y-A.y)/192,A.x,A.y);
  g.fillStyle='#483422';g.fillRect(-11,-12,470,216);
  g.fillStyle=gradient(g,0,0,448,192,[[0,'#776442'],[.21,'#ae955d'],[.45,'#d5b982'],[.80,'#a58958'],[1,'#695330']]);
  g.fillRect(0,0,448,192);
  g.lineWidth=4;g.strokeStyle='#554027';g.strokeRect(8,8,432,176);
  g.lineWidth=2;g.strokeStyle='#e4c992';g.strokeRect(15,15,418,162);
  for(const i of [22,426])for(const j of [24,168]){disk(g,i,j,5,5,'#524123');disk(g,i-1,j-1,2,2,'#e7c885');}
  g.fillStyle='#363227';g.font='bold 39px Georgia, serif';g.textAlign='center';g.textBaseline='middle';
  g.fillText('S.S.  SEA MIST',224,77);g.font='21px Georgia, serif';g.fillText('REG.  07 – 61',224,125);
  g.restore();
}
function outside(g,w,h,eye,project,target){
  const r=renderer(g,w,h,project),horizon=clamp(h*.50+h*.837*Math.tan(eye.pitch),-h*.9,h*1.85);
  g.fillStyle=gradient(g,0,0,0,h,[[0,'#557f9a'],[.48,'#9bbac4'],[.82,'#d7d0b7'],[1,'#bcbfae']]);g.fillRect(0,0,w,h);
  const sunX=w*(.67+.14*Math.sin(eye.yaw)),sunY=h*.18;
  glow(g,sunX,sunY,w*.62,'#eee0b4a6','#e7dab000');
  for(let i=0;i<16;i++){
    const n=(i*32.371)%109/109, y=h*(.11+i*.015)+.10*h*Math.cos(i*.82);
    g.globalAlpha=.07+i%5*.012;
    disk(g,w*n,y,w*(.088+(i%7)*.039),h*(.012+(i%3)*.017),'#f8ebce');
  }
  g.globalAlpha=1;
  if(horizon<h){
    const start=Math.max(0,horizon);
    g.fillStyle=gradient(g,0,start,0,h,[[0,'#729c9f'],[.38,'#4f818c'],[1,'#21485e']]);g.fillRect(0,start,w,h-start);
    g.strokeStyle='#d7e9d93c';g.lineWidth=1;
    for(let k=0;k<98;k++){
      const rank=(k/98)**2,base=start+rank*(h-start),x=w*((k*59.27)%197)/197;
      const l=(.016+rank*.088)*w*(.35+(.65*(k%9)/9));
      g.beginPath();g.moveTo(x,base);g.quadraticCurveTo(x+l*.5,base-.8-rank*2.2,x+l,base-.25);g.stroke();
    }
  }
  // Rebuild intact decks with the original ship framing and deck elevations.
  for(const [xa,xb,z0,z1,y,top] of [...tiers].reverse()){
    r.panel([P(xb,y,z0),P(xb,y,z1),P(xb,top,z1),P(xb,top,z0)],'#f3e2bc','#c2aa85');
    r.panel([P(xa,top,z0),P(xa,top,z1),P(xb,top,z1),P(xb,top,z0)],'#ebdbc0','#e0cba5');
    r.panel([P(xa,y,z1),P(xb,y,z1),P(xb,top,z1),P(xa,top,z1)],'#e3cfaf','#a88e6b');
    for(let z=z0+1.01;z<z1-.50;z+=1.44){
      r.panel([P(xb+.011,y+.53,z),P(xb+.011,y+.53,z+.87),P(xb+.011,top-.37,z+.87),P(xb+.011,top-.37,z)],'#637783','#173545',-.02);
    }
  }
  r.flush();
  // Wide dark hull and two clean sheer/boot stripes; attached to projected ship planes.
  for(let i=0;i<hullStations.length-1;i++){
    const [a]=hullStations[i],[b]=hullStations[i+1];
    for(const [y,Y,c,d] of [
      [-12.25,-10.81,'#643c3b','#442628'],[-10.81,-7.36,'#303b47','#1f3442'],
      [-7.36,-6.57,'#ede4c9','#b6b6a3'],[-6.57,-6.4,'#415255','#35444c']
    ])r.panel([shell(a,y),shell(b,y),shell(b,Y),shell(a,Y)],c,d);
    const A=shell(a,-6.4),B=shell(b,-6.4);
    r.panel([P(-A.x,-6.4,a),A,B,P(-B.x,-6.4,b)],'#c8b18a','#a38860',.006);
  }
  r.flush();
  // Soft seam relief from the retained strakes, weld/rivet pairs and sheer cap.
  for(let i=0;i<hullStations.length-1;i++){
    const [a]=hullStations[i],[b]=hullStations[i+1];
    for(const [y,color] of [[-6.50,'#f7f0d15c'],[-7.35,'#65675c80'],[-8.84,'#0e1f2b54'],[-9.96,'#a1a09239']]){
      const u=shell(a,y),v=shell(b,y);u.x+=.024;v.x+=.024;r.line(u,v,color,.015);
    }
    if(a>2&&a<39){
      for(let j=0;j<10;j++){
        const u=shell(a,-7.51-j*.271);u.x+=.031;
        const q=project(u);
        if(q.z>.23&&q.x>0&&q.x<w&&q.y>0&&q.y<h)
          disk(g,q.x,q.y,clamp(h*.011/q.z,.36,1.8),clamp(h*.011/q.z,.36,1.8),'#b1b19a75');
      }
    }
  }
  function port(x,z,y){
    const n=project(P(x,y,z)),a=project(P(x,y+.22,z)),b=project(P(x,y,z+.24));
    if(n.z<.13||n.x<-22||n.x>w+22||n.y<-22||n.y>h+22)return;
    const rx=clamp(Math.hypot(b.x-n.x,b.y-n.y),1.15,33),ry=clamp(Math.hypot(a.x-n.x,a.y-n.y),1.05,40);
    disk(g,n.x,n.y,rx+1.2,ry+1.0,'#bdaf88');disk(g,n.x,n.y,rx*.83,ry*.81,'#1e3441');
    disk(g,n.x-.20*rx,n.y-.24*ry,rx*.39,ry*.18,'#d1e6dd35');
  }
  for(let z=-43.5;z<42;z+=2.38){
    if(z>21.8&&z<24.15)continue;
    for(const y of [-7.76,-9.26]) port(shell(z,y).x+.12,z,y);
  }
  for(const [z,c,d] of [[18.4,'#bd734b',true],[20.2,'#566875',false],[22.3,'#b5926c',true],
    [23.65,'#314a59',false],[25.3,'#b2986b',true],[27.35,'#62544d',false]]){
    const x=shell(z,-6.4).x-.47;
    person(g,P(x,-6.40,z),project,{coat:c,dress:d,face:z>22?1:-1,hat:d?'#7b5947':'#4d534e',ry:d?1.59:1.72});
  }
  for(let z=-47.5;z<45.5;z+=1.61){
    const a=shell(z,-6.4),b=shell(Math.min(z+1.61,47.9),-6.4);
    if(a.x<.48||b.x<.40)continue;
    const A=P(a.x-.12,-6.4,a.z),B=P(b.x-.12,-6.4,b.z);
    for(const y of [.44,.91]){
      const start=P(A.x,A.y+y,A.z),end=P(B.x,B.y+y,B.z);
      r.line(start,end,y>.6?'#dde0cc':'#939b88',y>.6?.044:.028);
      if(y>.6)r.line(P(start.x,start.y+.021,start.z),P(end.x,end.y+.021,end.z),'#f0e4c6',.010);
    }
    r.line(A,P(A.x,A.y+.935,A.z),'#b4baab',.045);
  }
  plaque(g,project,target,w,h);
  glow(g,sunX,sunY,w*.63,'#fff0be23','#fff0be00');
}
function inside(g,w,h,eye,project,target){
  const r=renderer(g,w,h,project),z=target.z;
  g.fillStyle=gradient(g,0,0,0,h,[[0,'#29231e'],[.44,'#79482d'],[1,'#38231e']]);g.fillRect(0,0,w,h);
  const back=z-.17;
  // Same double-height room, backdrop and column stations as in current ship.
  r.panel([P(-2.92,floor,back),P(2.92,floor,back),P(2.92,-3.53,back),P(-2.92,-3.53,back)],'#c39b68','#542b26');
  for(const sg of [-1,1]){
    const x=sg*2.83;
    for(let a=z-.10;a<-8.26;a+=.56){
      const b=a+.56;
      r.panel([P(x,floor,a),P(x,floor,b),P(x,-3.55,b),P(x,-3.55,a)],'#bb8155','#48231d');
      r.panel([P(x-sg*.017,floor+.24,a+.051),P(x-sg*.017,floor+.24,b-.061),P(x-sg*.017,-7.49,b-.061),P(x-sg*.017,-7.49,a+.051)],'#875035','#542e29');
    }
  }
  r.panel([P(-2.83,-3.57,z-.08),P(2.83,-3.57,z-.08),P(2.83,-3.57,-8.25),P(-2.83,-3.57,-8.25)],'#93735c','#c9a36c',.03);
  for(let a=z-.22;a<-8.20;a+=.41){
    r.panel([P(-2.84,floor,a),P(2.84,floor,a),P(2.84,floor,a+.41),P(-2.84,floor,a+.41)],'#8e5e3c','#5d362b');
    r.panel([P(-1.06,floor+.018,a),P(1.06,floor+.018,a),P(1.06,floor+.018,a+.41),P(-1.06,floor+.018,a+.41)],'#86413c','#5d292e',-.02);
  }
  // Retain the corridor through the lounge. Stair-edge guests remain to the sides.
  for(const sg of [-1,1]){
    for(let n=0;n<3;n++){
      const y=floor+n*.12, a=z+.90+n*.26,x=sg*1.94,u=sg*.73;
      r.panel([P(x-u,y,a),P(x+u,y,a),P(x+u,y,a+.25),P(x-u,y,a+.25)],'#975f3a','#71452c');
      r.panel([P(x-u,y-.12,a+.25),P(x+u,y-.12,a+.25),P(x+u,y,a+.25),P(x-u,y,a+.25)],'#5b3426','#40251e');
    }
    const x=sg*2.32;
    r.panel([P(x-.12,floor,z+.232),P(x+.12,floor,z+.232),P(x+.12,-3.73,z+.232),P(x-.12,-3.73,z+.232)],'#d6b071','#825331',-.015);
    for(const y of [-9.49,-8.27,-7.15,-3.98]){
      r.panel([P(x-.205,y-.035,z+.255),P(x+.205,y-.035,z+.255),P(x+.205,y+.056,z+.255),P(x-.205,y+.056,z+.255)],'#d3a353','#855b36',-.020);
    }
  }
  r.flush();
  for(const sg of [-1,1]){
    for(const y of [-9.50,-8.30,-7.15,-3.84])r.line(P(sg*.87,y,back+.056),P(sg*2.28,y,back+.056),'#bd8857',.036);
    for(const x of [sg*.992,sg*1.78])r.line(P(x,-10.16,back+.055),P(x,-7.17,back+.055),'#75492e',.025);
    r.line(P(sg*1.052,floor+.026,z+.23),P(sg*1.052,floor+.026,-8.23),'#bd8859',.045);
    const a=project(P(sg*2.12,-6.09,z+.19));
    if(a.z>.24){
      glow(g,a.x,a.y,clamp(h*.41/a.z,7,h*.65),'#ffd48b6f','#f5ae6100');
      disk(g,a.x,a.y,clamp(h*.056/a.z,2,16),clamp(h*.138/a.z,4,29),'#e2b075');
      disk(g,a.x,a.y-1,clamp(h*.037/a.z,1,11),clamp(h*.10/a.z,3,24),'#ffdf9f');
    }
  }
  const center=P(0,-7.45,z),point=project(center);
  const v=(a,R=1)=>P(Math.cos(a)*1.89*R,center.y+Math.sin(a)*2.91*R,z);
  const palette=['#e7aa4f','#4b8fb7','#f2db9e','#46979c','#b74346','#3c9698','#edcd8f','#407ca6','#db9d46'];
  for(let i=0;i<18;i++){
    const a=i*Math.PI/18,b=(i+1)*Math.PI/18;
    r.panel([v(a,.17),v(a,.68),v(b,.68),v(b,.17)],palette[(i+4)%9],'#9f6844');
    r.panel([v(a,.68),v(a,1),v(b,1),v(b,.68)],palette[(i+1)%9],'#e9a65c');
  }
  r.flush();
  for(let i=0;i<18;i++){
    const a=i*Math.PI/18,b=(i+1)*Math.PI/18;
    for(const [p,q,t] of [[v(a,.15),v(a,1),.027],[v(a,.68),v(b,.68),.029],[v(a,1),v(b,1),.062]]){
      r.line(p,q,'#54362c',t);
      if(i%3===0)r.line(P(p.x,p.y+.014,p.z+.011),P(q.x,q.y+.014,q.z+.011),'#be8b53',.015);
    }
  }
  r.line(P(-1.96,-7.49,z+.031),P(1.96,-7.49,z+.031),'#c79462',.081);
  for(let i=0;i<6;i++){
    const x=-1.72+i*.69;r.line(P(x,-7.48,z+.009),P(x,-7.16,z+.009),'#d5a671',.029);
  }
  if(point.z>.16){
    const rad=clamp(h*.291/point.z,4,37);
    disk(g,point.x,point.y,rad*.84,rad,'#543b2c');
    disk(g,point.x,point.y,rad*.73,rad*.86,'#e0a857');
    glow(g,point.x,point.y,clamp(rad*4.35,14,h*.56),'#ffbb5b66','#ffbc5c00');
  }
  person(g,P(-1.8,floor+.19,z+.8),project,{coat:'#79505a',dress:true,face:1,hat:'#887255',ry:1.66});
  person(g,P(1.73,floor+.15,z+1.07),project,{coat:'#4f4847',hat:'#564a42',face:-1,ry:1.75});
  person(g,P(2.26,floor+.11,z+1.78),project,{coat:'#987051',dress:true,hat:'#9f754f',face:-1,alpha:.76,ry:1.61});
  glow(g,w*.46,h*.35,w*.62,'#f8c88737','#d8944800');
}
export function captureRestoration(kind,pose,width,height,target){
  const fields=['x','y','z','yaw','pitch'];
  if((kind!=='frame'&&kind!=='photo')||!pose||!target||
     !fields.every(k=>Number.isFinite(pose[k]))||!fields.slice(0,3).every(k=>Number.isFinite(target[k]))||
     !Number.isFinite(width)||!Number.isFinite(height)||width<8||height<8||width>4096||height>4096||
     typeof document==='undefined')return null;
  try{
    const w=Math.round(width),h=Math.round(height),c=document.createElement('canvas');
    c.width=w;c.height=h;
    const g=c.getContext('2d');if(!g)return null;g.lineJoin='round';g.lineCap='round';
    const project=camera(pose,w,h);
    if(kind==='frame')outside(g,w,h,pose,project,target);else inside(g,w,h,pose,project,target);
    grain(g,w,h,kind==='photo');
    const v=g.createRadialGradient(w*.51,h*.44,h*.14,w*.50,h*.55,Math.hypot(w,h)*.55);
    v.addColorStop(0,'#4e321c00');v.addColorStop(.64,kind==='frame'?'#485d6820':'#472d1f22');
    v.addColorStop(1,kind==='frame'?'#3b455c4d':'#241216a5');g.fillStyle=v;g.fillRect(0,0,w,h);
    return c.toDataURL('image/jpeg',.92);
  }catch(_){return null;}
}
