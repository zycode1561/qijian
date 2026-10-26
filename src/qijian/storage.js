import { clone,uid,validateProject } from './model.js';
import { zh as T } from './zh.js';
const DATABASE='qijian-local-v1';
export function openDatabase(indexedDBRef=globalThis.indexedDB){return new Promise((resolve,reject)=>{if(!indexedDBRef){reject(Error(T.storageUnavailable));return;}const request=indexedDBRef.open(DATABASE,1);request.onupgradeneeded=()=>{const db=request.result;for(const name of ['projects','templates','recovery','meta'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error(T.storageUnavailable));request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(new LocalStore(request.result));};});}
export class LocalStore {
 constructor(db){this.db=db;}
 async transaction(stores,mode,work){return new Promise((resolve,reject)=>{let result;const tx=this.db.transaction(stores,mode);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error??Error(T.saveFailed));tx.onabort=()=>reject(tx.error??Error(T.saveFailed));try{result=work(tx);}catch(e){tx.abort();reject(e);}});}
 async all(name){return new Promise((resolve,reject)=>{const tx=this.db.transaction(name,'readonly'),r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async saveProject(project){const snapshot=validateProject(project);await this.transaction(['projects','recovery'],'readwrite',tx=>{const store=tx.objectStore('projects'),r=store.get(snapshot.id);r.onsuccess=()=>{try{if(r.result)tx.objectStore('recovery').put({...r.result,id:snapshot.id});store.put(snapshot);}catch{tx.abort();}};});}
 async put(name,value){await this.transaction([name],'readwrite',tx=>tx.objectStore(name).put(clone(value)));}
 async remove(name,id){await this.transaction([name],'readwrite',tx=>tx.objectStore(name).delete(id));}
 async restoreBackup(backup){
  if(backup?.format!=='qijian-backup'||backup.version!==1||!Array.isArray(backup.projects)||!Array.isArray(backup.templates))throw Error(T.invalidFile);
  const projects=backup.projects.map(p=>({...validateProject(p),id:uid('project')})),templates=backup.templates.map(validateTemplate).map(t=>({...t,id:uid('template')}));
  await this.transaction(['projects','templates'],'readwrite',tx=>{for(const p of projects)tx.objectStore('projects').put(p);for(const t of templates)tx.objectStore('templates').put(t);});return {projects,templates};
 }
 close(){this.db.close();}
}
export function makeBackup(projects,templates){return JSON.stringify({format:'qijian-backup',version:1,exportedAt:new Date().toISOString(),projects:projects.map(validateProject),templates:templates.map(validateTemplate)},null,2);}
export function validateTemplate(t){if(!t||typeof t.name!=='string'||!Array.isArray(t.items)||!t.items.length||t.items.length>500)throw Error(T.invalidFile);const temp={format:'qijian',schemaVersion:2,id:'validation',name:'validation',schemes:[{id:'s',name:'s',geometry:{zones:[],items:clone(t.items),structures:[]},groups:[],rules:[]}],activeSchemeId:'s'};validateProject(temp);return clone(t);}
export function download(content,name,type='application/json'){const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
