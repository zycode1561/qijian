import { segmentFrame } from '../geometry.js';

// Raycasts include invisible and clipped surfaces; those must not steal selection.
export function selectionFromHits(hits,root){
 for(const hit of hits){
  const object=hit.object;
  let hidden=false;
  for(let node=object;node&&node!==root;node=node.parent)if(!node.visible)hidden=true;
  if(hidden||['furniture-shadow','furniture-label'].includes(object.userData.type))continue;
  const material=Array.isArray(object.material)?object.material[hit.face?.materialIndex??0]:object.material;
  if(material?.clippingPlanes?.some(p=>p.distanceToPoint(hit.point)<0))continue;
  for(let node=object;node&&node!==root;node=node.parent){
   const data=node.userData;
   if(data.type==='furniture')return{kind:'item',id:data.id};
   if(data.openingController){const structure=data.openingController.structure;return{kind:'structure',id:structure.id,door:structure.type==='door'};}
   if(data.structureId)return{kind:'structure',id:data.structureId};
   if(data.type==='floor')return{kind:'zone',id:data.id};
   if(data.type==='wall'){
    const run=data.wallRuns?.find(run=>{
     const f=segmentFrame(run.segment),x=hit.point.x*100-f.start.x,y=hit.point.z*100-f.start.y;
     const along=x*f.tangent.x+y*f.tangent.y;
     return along>=-1&&along<=f.length+1;
    });
    const zone=run?.positive??run?.negative;
    if(zone)return{kind:'zone',id:zone.id};
   }
  }
 }
 return null;
}
