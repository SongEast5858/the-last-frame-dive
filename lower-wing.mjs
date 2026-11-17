// Bounds from the lower-deck drawing shared by the two renderers. The swimming
// clearance is smaller than the door trims, not a wall across the passage.
const deckFloor=-10.25, crown=-6.50;
const wall=(x0,x1,z0,z1,y0=-10.55,y1=-6.66)=>({x0,x1,z0,z1,y0,y1});
const wingWalls=[
  wall(-3.87,-1.28,-1.91,-1.12),wall(1.28,3.87,-1.91,-1.12),
  wall(-1.28,1.28,-1.91,-1.12,-7.20,-6.39), // connector lintel
  wall(-2.17,-1.53,-1.60,2.89),wall(-2.17,-1.53,4.31,12.23),
  wall(-2.17,-1.53,2.89,4.31,-7.35,-6.60),
  wall(1.53,2.17,-1.60,8.09),wall(1.53,2.17,9.56,12.23),
  wall(1.53,2.17,8.09,9.56,-7.35,-6.60),
  wall(-6.58,-1.69,.69,1.32),wall(-6.58,-1.69,5.98,6.62),
  wall(-6.57,-5.93,.69,6.62),
  wall(1.69,6.58,5.23,5.87),wall(1.69,6.58,11.58,12.22),
  wall(5.93,6.57,5.23,12.22),
  wall(-2.10,2.10,11.58,12.24),
];
const inside=(a,l,h)=>a>l&&a<h;
function blocked(x,y,z){
  return wingWalls.some(w=>inside(x,w.x0,w.x1)&&inside(y,w.y0,w.y1)&&inside(z,w.z0,w.z1));
}
// Axis slide for the expanded barriers. Advance in small increments for
// slower clients and test-driven large timesteps as well, avoiding tunneling.
export function slideLowerWing(s,oldX,oldY,oldZ){
  if(Math.max(oldZ,s.z)<-2.18||Math.min(oldZ,s.z)>12.5||
     Math.max(oldY,s.y)<-10.6||Math.min(oldY,s.y)>crown||
     Math.abs(oldX)>7.25&&Math.abs(s.x)>7.25)return;
  const dx=s.x-oldX,dz=s.z-oldZ,dy=s.y-oldY;
  if(!dx&&!dy&&!dz)return;
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))/.18));
  let x=oldX,y=oldY,z=oldZ;
  for(let i=0;i<n;i++){
    const X=x+dx/n,Y=y+dy/n,Z=z+dz/n;
    if(!blocked(x,y,Z))z=Z;
    if(!blocked(X,y,z))x=X;
    if(!blocked(x,Y,z))y=Y;
  }
  s.x=x;s.z=z;s.y=y;
}
export function inLowerWing(x,y,z){
  if(!inside(y,deckFloor-.14,-6.36))return false;
  return (Math.abs(x)<1.85&&inside(z,-2.16,11.91))||
    (inside(x,-6.25,-1.8)&&inside(z,1,6.30))||
    (inside(x,1.8,6.25)&&inside(z,5.55,11.91));
}
