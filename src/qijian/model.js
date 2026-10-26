import { zonePoints, zoneFromPoints, reconcileZoneOpenings } from '../space-geometry.js';
import { parseProjectFile as parseUpstream } from '../project-file.js';
import { zh as T } from './zh.js';
export const SCHEMA = 2;
export const uid = (prefix = 'id') => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
export const clone = value => structuredClone(value);
export const styles = [
 {id:'warm',name:T.styleWarm,floor:'#d6be99',wall:'#f4eee3',wood:'#bc9470',fabric:'#ccc3ae',accent:'#809287'},
 {id:'calm',name:T.styleCalm,floor:'#c8c5b4',wall:'#edf0e8',wood:'#adac93',fabric:'#9cac9b',accent:'#617a6b'},
 {id:'modern',name:T.styleModern,floor:'#d7d7d2',wall:'#f5f5f0',wood:'#b8ac9c',fabric:'#8b9692',accent:'#596b63'}
];
export const catalog = [
 {key:'bed',name:'双人床',category:'bed',type:'bed',width:158,depth:210,height:90,mattress:{width:150,depth:200},color:'#d6cab7'},
 {key:'single-bed',name:'单人床',category:'bed',type:'bed',width:108,depth:210,height:85,mattress:{width:100,depth:200},color:'#c7c8b6'},
 {key:'sofa',name:'三人沙发',category:'seating',type:'sofa',width:220,depth:88,height:82,color:'#a9b7a7'},
 {key:'desk',name:'书桌',category:'table',type:'desk',width:120,depth:60,height:75,color:'#bc9971',useSpace:{front:75,back:0,left:0,right:0,when:'inUse'}},
 {key:'dining',name:'餐桌',category:'table',type:'table',width:140,depth:80,height:75,color:'#c1a07a'},
 {key:'chair',name:'餐椅',category:'seating',type:'chair',width:45,depth:45,height:82,color:'#9da994',stateOffset:{x:0,y:45},useSpace:{front:35,back:0,left:0,right:0,when:'inUse'}},
 {key:'wardrobe',name:'衣柜',category:'storage',type:'wardrobe',width:160,depth:60,height:235,color:'#c5ac88',useSpace:{front:70,back:0,left:0,right:0,when:'inUse'}},
 {key:'sideboard',name:'餐边柜',category:'storage',type:'wardrobe',width:180,depth:40,height:90,color:'#c2a17e',useSpace:{front:60,back:0,left:0,right:0,when:'inUse'}},
 {key:'bookshelf',name:'书柜',category:'storage',type:'wardrobe',width:80,depth:30,height:200,color:'#bca486'},
 {key:'screen',name:'屏风',category:'partition',type:'custom',width:95,depth:8,height:200,color:'#a8977f'},
 {key:'console',name:'窄桌',category:'table',type:'desk',width:86,depth:24,height:80,color:'#b89a76'},
 {key:'pet',name:'猫砂盆',category:'pet',type:'custom',width:65,depth:45,height:20,color:'#b9b8a6'},
 {key:'plant',name:'绿植',category:'other',type:'plant',width:40,depth:40,height:95,color:'#8d9b78'},
 {key:'toilet',name:'马桶',category:'bath',type:'toilet',width:40,depth:70,height:75,color:'#e3e2dc'},
 {key:'sink',name:'洗手台',category:'bath',type:'washbasin',width:80,depth:50,height:85,color:'#d1c6b3'},
 {key:'drawer',name:'抽屉组件',category:'storage',type:'custom',width:60,depth:45,height:18,color:'#bca382',stateOffset:{x:0,y:35},useSpace:{front:30,back:0,left:0,right:0,when:'inUse'}},
 {key:'custom',name:T.customFurniture,category:'other',type:'custom',width:100,depth:50,height:80,color:'#c3ad8c'},
];
export function itemFrom(template, x=150, y=150) {
 const item={...clone(template),id:uid('item'),x,y,rotation:0,elevation:0,shape:'rect',locked:false,confirmed:false,source:'',notes:'',state:'stored'};
 delete item.key; return item;
}
export function roomFrom(name='空间', x=0,y=0,width=400,depth=400) {
 return {id:uid('room'),name,type:'room',x,y,width,depth,height:270,color:'#e6ddce',confirmed:false,source:'',locked:false};
}
export function emptyGeometry() {return {zones:[],items:[],structures:[],dimensions:[],backgroundPlan:null,wallHeight:270};}
export function defaultRules() { return ['overlap','bounds','usage'].map(type=>({id:uid('rule'),name:({overlap:T.overlaps,bounds:T.bounds,usage:T.usage})[type],type,enabled:true})); }
export function emptyNeeds() { return {residents:1,members:[],purposes:[],entries:[],preferredStyle:'',notes:'',revision:0}; }
export function createProject(name=T.emptyProject,geometry=emptyGeometry()) {
 const option={id:uid('scheme'),name:T.defaultScheme,geometry:clone(geometry),groups:[],rules:defaultRules(),notes:'',pending:[],protected:false};
 return {format:'qijian',schemaVersion:SCHEMA,id:uid('project'),name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),needs:emptyNeeds(),schemes:[option],activeSchemeId:option.id,styles:clone(styles),activeStyleId:'warm',revision:0,walk:{eyeHeight:165,speed:1.5,hfov:75,radius:22}};
}
export const activeScheme = p => p.schemes.find(s=>s.id===p.activeSchemeId) ?? p.schemes[0];
export function effectiveItem(item) {
 const s=item.state==='inUse' ? item.stateOffset : null;
 if(!s) return {...item};
 const r=(item.rotation??0)*Math.PI/180;
 return {...item,x:item.x+(s.x??0)*Math.cos(r)-(s.y??0)*Math.sin(r),y:item.y+(s.x??0)*Math.sin(r)+(s.y??0)*Math.cos(r)};
}
export function transformItems(items,{dx=0,dy=0,angle=0,cx,cy}) {
 const r=angle*Math.PI/180;
 return items.map(item=>({...item,x:cx+(item.x-cx)*Math.cos(r)-(item.y-cy)*Math.sin(r)+dx,y:cy+(item.x-cx)*Math.sin(r)+(item.y-cy)*Math.cos(r)+dy,rotation:((item.rotation??0)+angle+360)%360}));
}
export function groupItems(scheme,ids,name=T.group) {
 const selected=scheme.geometry.items.filter(i=>ids.includes(i.id));
 if(selected.length<2 || selected.some(i=>i.locked)) throw Error(T.chooseFurniture);
 const removed=new Set(scheme.groups.filter(g=>g.itemIds.some(id=>ids.includes(id))).map(g=>g.id));
 scheme.groups=scheme.groups.filter(g=>!removed.has(g.id));
 const g={id:uid('group'),name,itemIds:selected.map(i=>i.id),locked:false};scheme.groups.push(g);return g;
}
export function duplicateItems(scheme,ids,dx=25,dy=25) {
 const selected=scheme.geometry.items.filter(i=>ids.includes(i.id)), map=new Map();
 const copies=selected.map(i=>{const next={...clone(i),id:uid('item'),x:i.x+dx,y:i.y+dy,locked:false};map.set(i.id,next.id);return next;});
 scheme.geometry.items.push(...copies);
 for(const g of [...scheme.groups]) if(g.itemIds.every(id=>map.has(id))) scheme.groups.push({...clone(g),id:uid('group'),itemIds:g.itemIds.map(id=>map.get(id)),locked:false});
 return copies.map(i=>i.id);
}
export function templateFromItems(scheme,ids,name) {
 const selected=scheme.geometry.items.filter(i=>ids.includes(i.id));
 if(!selected.length) throw Error(T.chooseFurniture);
 const cx=selected.reduce((s,i)=>s+i.x,0)/selected.length,cy=selected.reduce((s,i)=>s+i.y,0)/selected.length;
 return {id:uid('template'),name,kind:'group',items:selected.map(i=>({...clone(i),x:i.x-cx,y:i.y-cy,locked:false})),createdAt:new Date().toISOString()};
}
export function insertTemplate(scheme,template,x,y) {
 const items=template.items.map(i=>({...clone(i),id:uid('item'),x:i.x+x,y:i.y+y}));
 scheme.geometry.items.push(...items);if(items.length>1)groupItems(scheme,items.map(i=>i.id),template.name);return items.map(i=>i.id);
}
export function updateRoomGeometry(geometry,roomId,changes) {
 const next=clone(geometry),r=next.zones.find(z=>z.id===roomId);if(!r)return null;
 if(changes.width && r.points) r.points=r.points.map(p=>({...p,x:p.x*changes.width/r.width}));
 if(changes.depth && r.points) r.points=r.points.map(p=>({...p,y:p.y*changes.depth/r.depth}));
 Object.assign(r,changes);return reconcileZoneOpenings(geometry,next);
}
const finite=(v,min=-100000,max=100000)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
function validateGeometry(g) {
 if(!g||!Array.isArray(g.zones)||!Array.isArray(g.items)||!Array.isArray(g.structures))throw Error(T.invalidFile);
 if(g.zones.length>300||g.items.length>3000||g.structures.length>3000)throw Error(T.invalidFile);
 const ids=new Set();
 for(const [kind,arr] of [['zone',g.zones],['item',g.items],['structure',g.structures]])for(const o of arr){
  if(!o||typeof o.id!=='string'||ids.has(o.id)||!finite(o.x)||!finite(o.y)||typeof o.name!=='string')throw Error(T.invalidFile);ids.add(o.id);
  if(!finite(o.height??270,0.1,10000))throw Error(T.invalidFile);
  if(kind==='zone'){if(!finite(o.width,0.1,10000)||!finite(o.depth,0.1,10000))throw Error(T.invalidFile);zonePoints(o);}
  if(kind==='item'&&(!finite(o.width,0.1,10000)||!finite(o.depth,0.1,10000)||!finite(o.rotation??0,-36000,36000)))throw Error(T.invalidFile);
  if(kind==='structure'&&!['wall','door','window'].includes(o.type))throw Error(T.invalidFile);
  if(kind==='structure'&&!finite(o.type==='wall'?o.length:o.width,0.1,10000))throw Error(T.invalidFile);
  if(o.color&&!/^#[0-9a-f]{6}$/i.test(o.color))throw Error(T.invalidFile);
  if(!finite(o.elevation??0,0,10000))throw Error(T.invalidFile);
  if(o.collision&&(!finite(o.collision.width,.1,10000)||!finite(o.collision.depth,.1,10000)))throw Error(T.invalidFile);
  if(o.stateOffset&&(!finite(o.stateOffset.x??0)||!finite(o.stateOffset.y??0)))throw Error(T.invalidFile);
  if(o.useSpace&&['front','back','left','right'].some(k=>!finite(o.useSpace[k]??0,0,10000)))throw Error(T.invalidFile);
 }
 if(g.backgroundPlan){const b=g.backgroundPlan;if(!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(b.dataUrl)||!finite(b.width,0.1,100000)||!finite(b.depth,0.1,100000)||!finite(b.x)||!finite(b.y))throw Error(T.invalidFile);}
 g.dimensions??=[];for(const d of g.dimensions)if(!d||['x1','x2','y1','y2'].some(k=>!finite(d[k])))throw Error(T.invalidFile);g.backgroundPlan??=null;g.wallHeight??=270;if(!finite(g.wallHeight,.1,10000))throw Error(T.invalidFile);return g;
}
export function validateProject(source) {
 const p=clone(source);
 if(p?.format!=='qijian'||(!Number.isInteger(p.schemaVersion)||p.schemaVersion<1))throw Error(T.invalidFile);
 if(p.schemaVersion>SCHEMA)throw Error(T.futureVersion);
 if(!Array.isArray(p.schemes)||!p.schemes.length||p.schemes.length>40)throw Error(T.invalidFile);
 if(typeof p.id!=='string'||typeof p.name!=='string')throw Error(T.invalidFile);
 for(const s of p.schemes){validateGeometry(s.geometry);if(typeof s.name!=='string'||typeof s.id!=='string')throw Error(T.invalidFile);s.groups??=[];s.rules??=defaultRules();s.pending??=[];
  const ids=new Set(s.geometry.items.map(i=>i.id));if(s.groups.some(g=>!Array.isArray(g.itemIds)||g.itemIds.some(id=>!ids.has(id))))throw Error(T.invalidFile);
  for(const r of s.rules){if(typeof r.id!=='string'||typeof r.type!=='string')throw Error(T.invalidFile);if(r.threshold!=null&&!finite(r.threshold,0,10000))throw Error(T.invalidFile);}
 }
 p.schemaVersion=SCHEMA;p.needs={...emptyNeeds(),...p.needs};for(const k of ['members','purposes','entries'])if(!Array.isArray(p.needs[k]))throw Error(T.invalidFile);
 p.styles=Array.isArray(p.styles)&&p.styles.length?p.styles:clone(styles);for(const s of p.styles)if(typeof s.id!=='string'||typeof s.name!=='string'||['floor','wall','wood','fabric'].some(k=>!/^#[0-9a-f]{6}$/i.test(s[k])))throw Error(T.invalidFile);p.activeStyleId??='warm';p.walk={eyeHeight:165,speed:1.5,hfov:75,radius:22,...p.walk};p.revision??=0;
 p.activeSchemeId=activeScheme(p).id;return p;
}
export function importProject(text) {
 if(new TextEncoder().encode(text).length>80*1024*1024)throw Error(T.fileTooLarge);
 let o;try{o=JSON.parse(text);}catch{throw Error(T.invalidFile);}
 if(o.format==='qijian'){const p=validateProject(o);for(const s of p.schemes)if(s.check)s.check.stale=true;return p;}
 if(o.format==='qijian-backup')return o;
 if(o.format==='room-studio'){
  let u;try{u=parseUpstream(text);}catch{throw Error(T.invalidFile);}
  const p=createProject(typeof o.projectName==='string'?o.projectName:u.projectName,normalizeUpstreamGeometry(u.layout));
  if(u.layout.consultation){const c=u.layout.consultation;p.needs.notes=c.requirements??'';const a=c.options[c.activeOption],other=c.activeOption==='A'?'B':'A';p.schemes[0].name=a.label;p.schemes[0].notes=a.recommendation;p.schemes[0].pending=a.nextSteps.split('\n').filter(Boolean);if(c.inactiveGeometry){const n=c.options[other];p.schemes.push({...clone(p.schemes[0]),id:uid('scheme'),name:n.label,notes:n.recommendation,pending:n.nextSteps.split('\n').filter(Boolean),geometry:normalizeUpstreamGeometry(c.inactiveGeometry)});}}
  return validateProject(p);
 }
 throw Error(T.invalidFile);
}
export function normalizeUpstreamGeometry(g) {
 const n=clone(g);delete n.consultation;
 n.zones=(n.zones??[]).map(z=>({...z,confirmed:false,source:T.importedDimensions}));
 n.items=(n.items??[]).map(i=>({...i,confirmed:false,source:T.importedDimensions,category:i.category??'other',state:'stored'}));
 n.structures=(n.structures??[]).map(s=>({...s,confirmed:false,source:T.importedDimensions}));n.dimensions??=[];n.wallHeight??=270;return n;
}
export function serializeProject(p){return JSON.stringify(validateProject(p),null,2);}
export class ProjectHistory {
 constructor(limit=60){this.limit=limit;this.past=[];this.future=[];}
 commit(before,after){if(JSON.stringify(before)===JSON.stringify(after))return false;this.past.push(clone(before));if(this.past.length>this.limit)this.past.shift();this.future=[];return true;}
 undo(current){if(!this.past.length)return null;this.future.push(clone(current));return this.past.pop();}
 redo(current){if(!this.future.length)return null;this.past.push(clone(current));return this.future.pop();}
 clear(){this.past=[];this.future=[];}
}
