import {seabedHeight} from './seabed-landforms.mjs?v=13';
// Shared anchor hardware positions for WebGL and Canvas. The bow attachment is
// fixed steel, while the last chain links and loose fragment touch the local bed.
export const CHAIN_MOUNT={x:3.42,y:-7.58,z:42.05};
export const LOOSE_STEEL={x:3.7,z:75.7};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function makeSeabedProps(supportAt){
  const bed=(x,z)=>{const y=supportAt?.(x,z);return Number.isFinite(y)?y:seabedHeight(x,z);};
  const chainTail=[
    {x:4.72,z:47.31},{x:5.04,z:47.88},{x:5.65,z:48.78},{x:6.18,z:49.30}
  ].map(({x,z})=>({x,z,y:bed(x,z)+.065}));
  const landing=chainTail[0].y,first=CHAIN_MOUNT;
  const interpolate=(v)=>first.y+(landing-first.y)*v;
  const chain=[
    {...first},
    {x:3.43,y:interpolate(.14),z:42.26},
    {x:3.53,y:interpolate(.43),z:43.17},
    {x:3.94,y:interpolate(.74),z:44.96},
    {x:4.42,y:interpolate(.92),z:46.29},
    ...chainTail
  ];
  const steel={...LOOSE_STEEL};
  steel.y=bed(steel.x,steel.z)+.05; // A half-buried fragment, not a navigation waypoint.
  steel.pitch=clamp(Math.atan2(bed(steel.x,steel.z+.55)-bed(steel.x,steel.z-.55),1.1),-.35,.35);
  steel.roll=clamp(Math.atan2(bed(steel.x+.55,steel.z)-bed(steel.x-.55,steel.z),1.1),-.35,.35);
  return {chain,steel};
}
