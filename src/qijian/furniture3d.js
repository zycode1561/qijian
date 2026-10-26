import * as THREE from 'three';
function box(group,w,h,d,x,y,z,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8}));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
// Procedural adapters keep the visible external dimensions identical to the project footprint.
export function adaptFurniture(group,item){
 if(item.assetId)return;
 const labels=[];group.traverse(o=>{if(o.userData.type==='furniture-label')labels.push(o);});for(const label of labels){label.removeFromParent();label.material.map?.dispose();label.material.dispose();}
 const w=item.width/100,h=item.height/100,d=item.depth/100;
 if(item.type==='chair'||item.type==='bed'){
  for(const child of [...group.children]){group.remove(child);child.traverse(o=>{o.geometry?.dispose();[o.material].flat().filter(Boolean).forEach(m=>m.dispose());});}
  if(item.type==='chair'){
   box(group,w,.07,d,0,h*.52,0,item.color);box(group,w,h*.4,.045,0,h*.8,-d/2+.025,item.color);
   for(const x of [-1,1])for(const z of [-1,1])box(group,.035,h*.5,.035,x*(w/2-.04),h*.25,z*(d/2-.04),'#9f896c');
  }else{
   const mw=Math.min(w,(item.mattress?.width??item.width*.94)/100),md=Math.min(d-.03,(item.mattress?.depth??item.depth*.94)/100);
   box(group,w,h*.22,d,0,h*.15,0,'#b49c7f');box(group,w,h,.025,0,h/2,-d/2+.013,item.color);
   box(group,mw,h*.23,md,0,h*.37,(d-md)/2,'#f1ede1');box(group,mw*.97,.035,md*.58,0,h*.51,d*.16,item.color);
   for(const side of [-1,1])box(group,mw*.4,.08,Math.min(.35,md*.18),side*mw*.24,h*.55,-d/2+.3,'#faf7ee');
  }
  return;
 }
 const inner=new THREE.Group();for(const child of [...group.children])inner.add(child);group.add(inner);
 inner.updateMatrixWorld(true);const oldPosition=group.position.clone(),oldQuaternion=group.quaternion.clone();group.position.set(0,0,0);group.quaternion.identity();group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(inner),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 inner.scale.set(w/Math.max(.001,size.x),h/Math.max(.001,size.y),d/Math.max(.001,size.z));inner.position.set(-center.x*inner.scale.x,-bounds.min.y*inner.scale.y,-center.z*inner.scale.z);group.position.copy(oldPosition);group.quaternion.copy(oldQuaternion);
}
