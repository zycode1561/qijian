import { getExteriorWallSegments,getInteriorWallSegments,doorsForAutomaticWallSegment,splitWallSegmentLocal,structureSegment,getDoorLeafSegments,segmentFrame } from '../geometry.js';
import { zonePoints,pointInPolygon,polygonIntersectionArea } from '../space-geometry.js';
import { effectiveItem } from './model.js';
export const rad=a=>a*Math.PI/180;
export function rectPoints(o,width=o.width,depth=o.depth){const c=Math.cos(rad(o.rotation??0)),s=Math.sin(rad(o.rotation??0));return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:o.x+x*width/2*c-y*depth/2*s,y:o.y+x*width/2*s+y*depth/2*c}));}
export function footprint(item,collision=false){const e=effectiveItem(item),c=collision?item.collision:null;return rectPoints(e,c?.width??e.width,c?.depth??e.depth);}
export function polygonBounds(points){const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,width:Math.max(...points.map(p=>p.x))-x,depth:Math.max(...points.map(p=>p.y))-y};}
export function intersects(a,b,epsilon=.01){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],axis={x:-(q.y-p[i].y),y:q.x-p[i].x},len=Math.hypot(axis.x,axis.y);const aa=a.map(v=>(v.x*axis.x+v.y*axis.y)/len),bb=b.map(v=>(v.x*axis.x+v.y*axis.y)/len);if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=epsilon)return false;}return true;}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function polygonDistance(a,b){if(intersects(a,b,0))return 0;let d=Infinity;for(const [p,q]of[[a,b],[b,a]])for(const v of p)for(let i=0;i<q.length;i++)d=Math.min(d,pointSegmentDistance(v,q[i],q[(i+1)%q.length]));return d;}
export function containsFootprint(poly,zones){const b=polygonBounds(poly),z={...b,points:poly.map(p=>({x:p.x-b.x,y:p.y-b.y}))};const a=Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y;},0))/2;return Math.abs(a-polygonIntersectionArea([z],zones))<.01;}
export const verticalOverlap=(a,b)=>Math.min((a.elevation??0)+a.height,(b.elevation??0)+b.height)-Math.max(a.elevation??0,b.elevation??0)>.01;
function fromSegment(segment,thickness,height,id,name,elevation=0,transparent=false){const f=segmentFrame(segment);return {id,name,x:(f.start.x+f.end.x)/2,y:(f.start.y+f.end.y)/2,width:f.length,depth:thickness,rotation:f.angle,height,elevation,transparent,kind:'wall'};}
// The same upstream wall segmentation and door leaf geometry used by the visible model.
export function barriers(geometry){
 const {zones,structures,wallHeight=270}=geometry;
 const out=[],openings=structures.filter(s=>s.type==='door'||s.type==='window'),walls=structures.filter(s=>s.type==='wall');
 const all=(geometry.automaticWalls===false?[]:[...getExteriorWallSegments(zones),...getInteriorWallSegments(zones)]).map(s=>({s,height:Math.max(wallHeight,...zones.map(z=>z.height??wallHeight)),thickness:6,id:'boundary',name:'墙体'}));
 for(const w of walls)all.push({s:structureSegment(w),height:w.height,thickness:w.thickness??6,id:w.id,name:w.name});
 for(const {s,height,thickness,id,name}of all){
  const os=id==='boundary'?doorsForAutomaticWallSegment(s,openings,walls):openings.filter(o=>o.wallId===id);
  const split=splitWallSegmentLocal(s,os),f=segmentFrame(s);
  for(const span of split.spans)out.push(fromSegment(span,thickness,height,id,name));
  for(const o of split.openings){
   const a={x:f.start.x+f.tangent.x*o.start,y:f.start.y+f.tangent.y*o.start},b={x:f.start.x+f.tangent.x*o.end,y:f.start.y+f.tangent.y*o.end};
   const seg={orientation:'diagonal',x1:a.x,y1:a.y,x2:b.x,y2:b.y};
   const low=Math.min(...o.doors.map(d=>d.type==='window'?(d.sillHeight??90):0));
   const high=Math.min(height,Math.max(...o.doors.map(d=>(d.type==='window'?(d.sillHeight??90):0)+(d.height??205))));
   if(low>0)out.push(fromSegment(seg,thickness,low,id,name));
   if(height>high)out.push(fromSegment(seg,thickness,height-high,id,name,high));
  }
 }
 for(const d of structures.filter(s=>s.type==='door'))for(const leaf of getDoorLeafSegments([d]))out.push({...fromSegment({orientation:'diagonal',x1:leaf.start.x,y1:leaf.start.y,x2:leaf.end.x,y2:leaf.end.y},4,d.height,d.id,d.name,0,!!d.transparent),kind:'door'});
 for(const w of structures.filter(s=>s.type==='window'))out.push({id:w.id,name:w.name,x:w.x,y:w.y,width:w.width,depth:4,rotation:w.angle??(w.orientation==='vertical'?90:0),height:w.height,elevation:w.sillHeight??90,transparent:true,kind:'window'});
 return out;
}
export function compiledGeometry(geometry,{usage=false}={}){
 const obstacles=[...geometry.items.filter(i=>i.type!=='rug').map(i=>{const e=effectiveItem(i);return {...e,width:i.collision?.width??e.width,depth:i.collision?.depth??e.depth};}),...barriers(geometry)];
 if(usage)for(const i of geometry.items)for(const r of usageRegions(i))obstacles.push(r);
 return {zones:geometry.zones.map(zonePoints),obstacles:obstacles.map(o=>({...o,poly:rectPoints(o)}))};
}
export function canStand(compiled,p,radius=22,eyeHeight=165){
 // Circular footprint samples preserve concave room boundaries, walls handle seams.
 for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius};if(!compiled.zones.some(z=>pointInPolygon(q,z)))return false;}
 if(!compiled.zones.some(z=>pointInPolygon(p,z)))return false;
 return !compiled.obstacles.some(o=>{if(o.elevation>eyeHeight+15||o.elevation+o.height<=5)return false;const r=rad(-(o.rotation??0)),dx=p.x-o.x,dy=p.y-o.y,x=dx*Math.cos(r)-dy*Math.sin(r),y=dx*Math.sin(r)+dy*Math.cos(r);return Math.hypot(Math.max(0,Math.abs(x)-o.width/2),Math.max(0,Math.abs(y)-o.depth/2))<radius+.01;});
}
export function nearestStanding(compiled,point,radius=22,eye=165,room=null){
 const valid=p=>(!room||pointInPolygon(p,zonePoints(room)))&&canStand(compiled,p,radius,eye);
 if(valid(point))return point;
 for(let distance=20;distance<=2000;distance+=20)for(let i=0,n=Math.max(12,Math.ceil(distance/8));i<n;i++){const a=i/n*Math.PI*2,p={x:point.x+Math.cos(a)*distance,y:point.y+Math.sin(a)*distance};if(valid(p))return p;}
 return null;
}
export function moveWithCollision(compiled,p,dx,dy,radius,eye){let next={...p};const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,radius/2)));for(let i=0;i<n;i++){const x={x:next.x+dx/n,y:next.y};if(canStand(compiled,x,radius,eye))next=x;const y={x:next.x,y:next.y+dy/n};if(canStand(compiled,y,radius,eye))next=y;}return next;}
export function usageRegions(item){const u=item.useSpace;if(!u||(u.when!=='always'&&item.state!=='inUse'))return [];const e=effectiveItem(item),r=rad(e.rotation??0),regions=[];
 const add=(x,y,w,d)=>{if(w<=0||d<=0)return;regions.push({id:`usage-${item.id}`,ownerId:item.id,name:item.name,x:e.x+x*Math.cos(r)-y*Math.sin(r),y:e.y+x*Math.sin(r)+y*Math.cos(r),width:w,depth:d,rotation:e.rotation,height:180,elevation:0,kind:'usage'});};
 add(0,e.depth/2+(u.front??0)/2,e.width,u.front??0);add(0,-e.depth/2-(u.back??0)/2,e.width,u.back??0);add(-e.width/2-(u.left??0)/2,0,u.left??0,e.depth);add(e.width/2+(u.right??0)/2,0,u.right??0,e.depth);return regions;
}
export function doorSweepRegions(door){if(door.doorType==='sliding')return [];
 const regions=[];for(let angle=0;angle<=Math.max(90,door.openAngle??0);angle+=5)for(const l of getDoorLeafSegments([{...door,openAngle:angle}])){const dx=(l.end.x-l.start.x)/door.width,dy=(l.end.y-l.start.y)/door.width;regions.push({...fromSegment({orientation:'diagonal',x1:l.start.x+dx*5,y1:l.start.y+dy*5,x2:l.end.x-dx*5,y2:l.end.y-dy*5},3,door.height,`usage-${door.id}`,door.name),ownerId:door.id,kind:'usage',doorSweep:true});}return regions;
}
export function findPath(compiled,start,end,diameter=80,gridStep=10){
 const radius=diameter/2,step=Math.max(1,Math.min(20,gridStep)),b=polygonBounds(compiled.zones.flat());
 const cols=Math.ceil(b.width/step)+1,rows=Math.ceil(b.depth/step)+1;
 if(cols*rows>180000)return {supported:false};
 if(!canStand(compiled,start,radius)||!canStand(compiled,end,radius))return {supported:true,found:false,blockedEndpoint:true};
 const key=(x,y)=>y*cols+x,world=(x,y)=>({x:b.x+x*step,y:b.y+y*step});
 const s={x:Math.round((start.x-b.x)/step),y:Math.round((start.y-b.y)/step)},e={x:Math.round((end.x-b.x)/step),y:Math.round((end.y-b.y)/step)};
 // Conservatively account for half a grid diagonal; prevents thin diagonal corner shortcuts.
 const clear=new Int8Array(cols*rows),parent=new Int32Array(cols*rows).fill(-1),queue=new Int32Array(cols*rows);
 const check=(x,y)=>{const k=key(x,y);if(!clear[k])clear[k]=canStand(compiled,world(x,y),radius+Math.SQRT2*step/2)?1:-1;return clear[k]>0;};
 if(!check(s.x,s.y)||!check(e.x,e.y))return {supported:true,found:false,blockedEndpoint:true};
 let head=0,tail=1;queue[0]=key(s.x,s.y);parent[queue[0]]=queue[0];let found=false;
 while(head<tail){const k=queue[head++],x=k%cols,y=Math.floor(k/cols);if(x===e.x&&y===e.y){found=true;break;}
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;const nk=key(xx,yy);if(parent[nk]!==-1||!check(xx,yy))continue;parent[nk]=k;queue[tail++]=nk;}
 }
 const path=[];if(found){let k=key(e.x,e.y);for(;;){path.push(world(k%cols,Math.floor(k/cols)));if(parent[k]===k)break;k=parent[k];}path.reverse();}
 return {supported:true,found,path,length:path.length*step};
}
export function rayHitsBox(start,end,box){
 const a=rad(-(box.rotation??0)),c=Math.cos(a),s=Math.sin(a);
 const local=p=>({x:(p.x-box.x)*c-(p.y-box.y)*s,y:(p.x-box.x)*s+(p.y-box.y)*c,z:p.z-(box.elevation??0)});
 const p=local(start),q=local(end),min={x:-box.width/2,y:-box.depth/2,z:0},max={x:box.width/2,y:box.depth/2,z:box.height};let lo=0,hi=1;
 for(const k of ['x','y','z']){const d=q[k]-p[k];if(Math.abs(d)<1e-10){if(p[k]<min[k]||p[k]>max[k])return false;}else{const t1=(min[k]-p[k])/d,t2=(max[k]-p[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}}
 return hi>.00001&&lo<.99999;
}
export function visibilitySamples(geometry,eye,target,targetHeight=65){
 const obstacles=compiledGeometry(geometry).obstacles.filter(o=>o.id!==target.id&&!o.transparent),r=rad(target.rotation??0),samples=[];let visible=0;
 for(let x=0;x<9;x++)for(let y=0;y<9;y++){const xx=(x/8-.5)*target.width,yy=(y/8-.5)*target.depth,p={x:target.x+xx*Math.cos(r)-yy*Math.sin(r),y:target.y+xx*Math.sin(r)+yy*Math.cos(r),z:targetHeight};const seen=!obstacles.some(o=>rayHitsBox(eye,p,o));if(seen)visible++;samples.push({...p,visible:seen});}
 return {visible,total:81,percentage:visible/81*100,samples};
}
export const horizontalToVerticalFov=(hfov,aspect)=>2*Math.atan(Math.tan(rad(hfov)/2)/aspect)*180/Math.PI;
