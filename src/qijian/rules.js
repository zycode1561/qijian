import { zh as T,labels } from './zh.js';
import { effectiveItem } from './model.js';
import { footprint,rectPoints,intersects,verticalOverlap,containsFootprint,polygonDistance,usageRegions,doorSweepRegions,compiledGeometry,findPath,visibilitySamples } from './spatial.js';
export const ruleTypes=['overlap','bounds','clearance','usage','path','visibility'];
const amount=(n,s='')=>`${Math.round(n*10)/10}${s}`;
export function runRule(rule,geometry){
 const result={id:rule.id,name:rule.name,type:rule.type,status:'pending',value:'—',target:'—',objectIds:[],conditions:'',detail:'',location:null};
 if(!rule.enabled)return {...result,status:'disabled',detail:T.disabled};
 if(!ruleTypes.includes(rule.type))return {...result,status:'unsupported',detail:T.unsupportedRule};
 const items=geometry.items.filter(i=>!rule.objectIds?.length||rule.objectIds.includes(i.id)),zones=rule.roomId?geometry.zones.filter(z=>z.id===rule.roomId):geometry.zones;
 const all=compiledGeometry(geometry).obstacles;
 const doorConditions=geometry.structures.filter(o=>o.type==='door').map(o=>`${o.name} ${o.doorType==='sliding'?(o.openRatio??0)+'%':(o.openAngle??0)+'°'}`).join('、');
 const resolve=(id)=>geometry.items.find(i=>i.id===id)??geometry.structures.find(i=>i.id===id);
 let relevant=[...items,...zones],conflict=false;
 if(!zones.length)return {...result,detail:T.noGeometry};
 if(rule.type==='overlap'){
  const pairs=[];for(let i=0;i<items.length;i++){const a=items[i];if(a.type==='rug')continue;for(let j=i+1;j<items.length;j++){const b=items[j];if(b.type==='rug')continue;if(geometry.groups?.some(g=>g.allowInternalOverlap&&g.itemIds.includes(a.id)&&g.itemIds.includes(b.id)))continue;if(verticalOverlap(a,b)&&intersects(footprint(a,true),footprint(b,true)))pairs.push([a,b]);}
   for(const b of all.filter(o=>o.kind==='wall'||o.kind==='door'))if(verticalOverlap(a,b)&&intersects(footprint(a,true),b.poly))pairs.push([a,b]);}
  result.objectIds=[...new Set(pairs.flatMap(p=>p.map(i=>i.id)).filter(id=>id!=='boundary'))];result.value=`${pairs.length} ${T.collisionsCount}`;result.target='0';result.conditions=T.approximation;result.detail=pairs.length?pairs.slice(0,12).map(p=>p.map(i=>i.name).join(' ↔ ')).join('；'):T.geometryOk;conflict=pairs.length>0;relevant.push(...geometry.structures);
 }else if(rule.type==='bounds'){
  const out=items.filter(i=>!containsFootprint(footprint(i,true),zones)||!containsFootprint(footprint(i,true),zones.filter(z=>(z.height??geometry.wallHeight)>=(i.elevation??0)+i.height)));
  result.objectIds=out.map(i=>i.id);result.value=`${out.length} ${T.outsideCount}`;result.target='0';result.conditions=T.approximation;result.detail=out.length?out.map(i=>i.name).join('、'):T.outsideOk;conflict=out.length>0;
 }else if(rule.type==='clearance'){
  const a=resolve(rule.objectA),b=resolve(rule.objectB);if(!a||!b||a.id===b.id||!Number.isFinite(rule.threshold))return {...result,detail:T.missingData};
  const polys=id=>all.filter(o=>o.id===id).map(o=>o.poly);
  const aa=geometry.items.includes(a)?[footprint(a,true)]:polys(a.id),bb=geometry.items.includes(b)?[footprint(b,true)]:polys(b.id);
  if(!aa.length||!bb.length)return {...result,status:'unsupported',detail:T.missingData};
  const d=Math.min(...aa.flatMap(p=>bb.map(q=>polygonDistance(p,q))));result.value=amount(d,` ${T.centimeters}`);result.target=`≥ ${rule.threshold} ${T.centimeters}`;result.objectIds=[a.id,b.id];result.conditions=T.clearanceConditions;conflict=d+1e-5<rule.threshold;relevant=[a,b,...zones];
 }else if(rule.type==='usage'){
  const regions=[...items.flatMap(usageRegions),...geometry.structures.filter(s=>s.type==='door').flatMap(doorSweepRegions)],pairs=new Map();if(!regions.length)return {...result,detail:T.noUsage};
  for(const u of regions){if(!u.doorSweep&&!containsFootprint(rectPoints(u),zones))pairs.set(`${u.ownerId}:outside`,[u,{id:'boundary',name:T.bounds}]);for(const o of all)if(o.id!==u.ownerId&&verticalOverlap(u,o)&&intersects(rectPoints(u),o.poly))pairs.set(`${u.ownerId}:${o.id}`,[u,o]);}
  result.objectIds=[...new Set([...pairs.values()].flatMap(p=>p.map(i=>i.ownerId??i.id)).filter(id=>id!=='boundary'))];result.value=`${pairs.size} ${T.usageCount}`;result.target='0';result.conditions=T.useHint+' '+T.approximation;result.detail=pairs.size?[...pairs.values()].slice(0,12).map(p=>p.map(i=>i.name).join(' ↔ ')).join('；'):T.usageOk;conflict=pairs.size>0;relevant.push(...geometry.structures);
 }else if(rule.type==='path'){
  if(!validPoint(rule.start)||!validPoint(rule.end)||!(rule.threshold>0))return {...result,detail:T.missingData};
  const data=findPath(compiledGeometry({...geometry,zones},{usage:!!rule.includeUsage}),rule.start,rule.end,rule.threshold,rule.gridStep??10);
  if(!data.supported)return {...result,status:'unsupported',detail:T.routeLarge};
  result.value=data.found?T.routeFound:T.routeBlocked;result.target=`Ø ${rule.threshold} ${T.centimeters}`;result.conditions=T.routeApprox.replace('10',String(rule.gridStep??10))+(rule.includeUsage?` · ${T.useSpace}`:'');result.conditions+=` · ${T.pathEndpoints} (${rule.start.x}, ${rule.start.y}) → (${rule.end.x}, ${rule.end.y}) · ${T.doorStates} ${doorConditions}`;result.path=data.path;result.location=rule.start;result.detail=data.blockedEndpoint?T.invalidPoint:T.routeApprox;conflict=!data.found;relevant=[...geometry.items,...geometry.structures,...zones];
 }else if(rule.type==='visibility'){
  const target=rule.targetMode==='area'?{id:'target-area',name:T.targetArea,...rule.targetArea}:resolve(rule.targetId);if(!target||!Number.isFinite(target.width)||!Number.isFinite(target.depth)||!validPoint(target)||!validPoint(rule.eye)||!Number.isFinite(rule.eyeHeight)||!Number.isFinite(rule.targetHeight)||!Number.isFinite(rule.threshold))return {...result,detail:T.missingData};
  const data=visibilitySamples(geometry,{...rule.eye,z:rule.eyeHeight},effectiveItem(target),rule.targetHeight);
  result.value=`${amount(data.percentage)}% (${data.visible}/81)`;result.target=`≤ ${rule.threshold}%`;result.conditions=`${T.eyeHeight} ${rule.eyeHeight} · ${T.targetHeight} ${rule.targetHeight} · ${T.visibilityApprox}`;result.conditions+=` · ${T.eyeCoordinates} (${rule.eye.x}, ${rule.eye.y}) · ${T.doorStates} ${doorConditions}`;result.detail=T.visibilityApprox;result.objectIds=rule.targetMode==='area'?[]:[target.id];result.location=rule.eye;result.samples=data.samples;conflict=data.percentage>rule.threshold+1e-6;relevant=[...geometry.items,...geometry.structures,...zones];
 }
 if(!items.length&&['overlap','bounds'].includes(rule.type))return {...result,detail:T.noGeometry};
 const uncertain=relevant.some(o=>o.confirmed!==true);
 result.status=uncertain?'pending':conflict?'conflict':'pass';if(uncertain)result.detail=T.unconfirmed+' · '+result.detail;
 if(!result.location&&result.objectIds.length){const o=resolve(result.objectIds[0]);if(o)result.location={x:o.x,y:o.y};}
 return result;
}
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function runChecks(project,scheme){return {revision:project.revision,needsRevision:project.needs.revision,checkedAt:new Date().toISOString(),results:scheme.rules.map(r=>runRule(r,{...scheme.geometry,groups:scheme.groups}))};}
export function requirementStatus(entry,check){if(entry.priority==='pending')return {status:'pending',detail:T.pending};if(!entry.ruleId)return {status:'pending',detail:T.textPending};const r=check?.results.find(r=>r.id===entry.ruleId);return r?{status:r.status,detail:r.status==='disabled'?T.ruleDisabled:r.name}:{status:'pending',detail:T.unchecked};}
export function newRule(type='clearance'){return {id:globalThis.crypto.randomUUID(),name:labels.rules[type]??type,type,enabled:true,threshold:type==='visibility'?0:80,eyeHeight:165,targetHeight:65,includeUsage:false};}
