// SEA MIST outer hull stations: [z, half-beam, sheer y, keel-lip y].
// Shared by the hull and the underlying bed so the steel meets sediment.
export const LINER_STATIONS=[
    [-50,.14,-6.83,-10.98],[-47.8,1.53,-6.47,-11.52],[-45.4,3.01,-6.38,-11.94],
    [-42.8,4.61,-6.33,-12.21],[-38,5.98,-6.34,-12.65],[-34,6.81,-6.38,-13.0],[-29,7.75,-6.4,-13.56],[-24,8.02,-6.4,-13.82],
    [-18,8.02,-6.4,-14.12],[-12,8.01,-6.4,-14.21],[-5,8.04,-6.4,-14.23],
    [4,8.04,-6.4,-14.23],[12,8.03,-6.4,-14.11],[18,8.0,-6.4,-13.84],
    [24,7.99,-6.4,-13.79],[29.5,7.3,-6.4,-13.21],[34,6.03,-6.4,-12.62],
    [39.8,4.40,-6.4,-12.11],[43.3,2.54,-6.4,-11.5],[46.2,1.12,-6.4,-10.92],[48,.09,-6.4,-10.5]
  ];
export function linerHullSection(z){
    const stations=LINER_STATIONS;
    let ix=0;while(ix<stations.length-2&&z>stations[ix+1][0])ix++;
    const A=stations[ix],B=stations[ix+1],j=Math.max(0,Math.min(1,(z-A[0])/(B[0]-A[0])));
    return [A[1]+(B[1]-A[1])*j,A[2]+(B[2]-A[2])*j,A[3]+(B[3]-A[3])*j];
  }
