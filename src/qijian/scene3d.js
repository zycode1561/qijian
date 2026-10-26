import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildScene,createWallPresentation,fitOverviewCamera,overviewSpatialBounds } from '../walkthrough3d.js';
import { createStudioAssets,disposeStudioScene } from '../studio3d-assets.js';
import { compiledGeometry,canStand,nearestStanding,moveWithCollision,horizontalToVerticalFov } from './spatial.js';
import { styledGeometry } from './plan2d.js';
import { zoneInteriorPoint } from '../space-geometry.js';
import { adaptFurniture } from './furniture3d.js';
import { selectionFromHits } from './selection3d.js';
import { zh as T } from './zh.js';
export class Scene3D{
 constructor(container,callbacks){
  this.container=container;this.callbacks=callbacks;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f0eee6');this.camera=new THREE.PerspectiveCamera(48,1,.02,150);this.camera.position.set(8,9,10);this.camera.lookAt(3,0,3);this.keys=new Set();this.walking=false;this.visible=false;this.cutaway=true;this.player={x:100,y:100,yaw:0,pitch:0};this.input={forward:0,right:0};this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.lastFrame=performance.now();
  try{this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{throw Error(T.webglError);}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.localClippingEnabled=true;this.renderer.domElement.setAttribute('aria-label',T.scene3d);this.renderer.domElement.setAttribute('tabindex','0');container.append(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.1;this.controls.minDistance=1;this.controls.maxDistance=80;this.controls.maxPolarAngle=Math.PI*.48;this.controls.target.set(3,0,3);
  this.assets=createStudioAssets(()=>{});this.content=new THREE.Group();this.scene.add(this.content);
  this.scene.add(new THREE.HemisphereLight('#fff7e4','#b9b9a4',2.5));const sun=new THREE.DirectionalLight('#fff5dc',3.2);sun.position.set(8,14,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:60});sun.shadow.bias=-.0003;this.scene.add(sun);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
  this.onKeyDown=e=>{if(!this.walking||e.target.closest('input,textarea,select,[contenteditable]'))return;if(['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){this.keys.add(e.key.toLowerCase());e.preventDefault();}};
  this.onKeyUp=e=>this.keys.delete(e.key.toLowerCase());this.onBlur=()=>{this.keys.clear();this.input={forward:0,right:0};};window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);window.addEventListener('blur',this.onBlur);
  const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',e=>this.up(e,true));this.animate();
 }
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(w<1||h<1)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;if(this.walking)this.camera.fov=horizontalToVerticalFov(this.settings.hfov,this.camera.aspect);this.camera.updateProjectionMatrix();}
 setVisible(v){this.visible=v;this.container.hidden=!v;if(v)this.resize();}
 update(geometry,style,selection=[],settings={}){
  this.geometry=geometry;this.settings={eyeHeight:165,speed:1.5,hfov:75,radius:22,...settings};this.compiled=compiledGeometry(geometry);
  this.presentation?.dispose();this.assets.begin();disposeStudioScene(this.content);this.content.clear();if(this.selectionHelper){this.scene.remove(this.selectionHelper);this.selectionHelper.geometry.dispose();this.selectionHelper.material.dispose();this.selectionHelper=null;}
  const g=styledGeometry(geometry,style);
  this.doorControllers=buildScene(this.content,g.zones,g.items,structuredClone(g.structures),g.wallHeight,{x:0,y:0},this.assets,{automaticWalls:g.automaticWalls!==false});
  this.content.traverse(o=>{
   if(o.userData.openingController?.structure?.transparent&&o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.25;o.material.depthWrite=false;}
   if(o.userData.type==='wall'&&o.material){for(const m of [o.material].flat())m.color?.set(style.wall);}
   if(o.userData.type==='furniture'){const item=g.items.find(i=>i.id===o.userData.id);if(item)adaptFurniture(o,item);if(item?.transparent)o.traverse(m=>{if(m.material){m.material=m.material.clone();m.material.transparent=true;m.material.opacity=.22;m.material.depthWrite=false;}});}
  });
  this.presentation=createWallPresentation(this.content);this.applyMode();this.assets.finish();this.select(selection);
  if(this.walking){const next=nearestStanding(this.compiled,this.player,this.settings.radius,this.settings.eyeHeight);if(next){if(Math.hypot(next.x-this.player.x,next.y-this.player.y)>1)this.callbacks.onNotice?.(T.relocated);Object.assign(this.player,next);this.updateWalkCamera();}else{this.exit();this.callbacks.onNotice?.(T.walkBlocked);this.callbacks.onWalkChange?.(false);}}
 }
 select(selection=[]){if(this.selectionHelper){this.scene.remove(this.selectionHelper);this.selectionHelper.geometry.dispose();this.selectionHelper.material.dispose();this.selectionHelper=null;}
  if(this.walking)return;const b=new THREE.Box3();this.content.traverse(o=>{if(selection.some(s=>s.id===(o.userData.openingController?.structure.id??o.userData.structureId??o.userData.id)))b.union(new THREE.Box3().setFromObject(o));});if(!b.isEmpty()){this.selectionHelper=new THREE.Box3Helper(b,'#577f61');this.scene.add(this.selectionHelper);}}
 applyMode(){this.presentation?.setMode(this.walking?'walk':'dollhouse',this.cutaway,this.camera,this.controls.target);this.content.traverse(o=>{if(['ceiling','ceiling-fixture'].includes(o.userData.type))o.visible=this.walking;});}
 fit(){if(this.walking)return this.jump();const b=overviewSpatialBounds(this.content);if(b.isEmpty())b.set(new THREE.Vector3(0,0,0),new THREE.Vector3(4,2.7,4));fitOverviewCamera(this.camera,b,'dollhouse');b.getCenter(this.controls.target);this.controls.update();}
 focus(point){if(this.walking)return;const t=new THREE.Vector3(point.x/100,.5,point.y/100),delta=t.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(t);this.controls.update();}
 enter(roomId){if(!this.geometry.zones.length){this.callbacks.onNotice?.(T.walkBlocked);return false;}const room=this.geometry.zones.find(r=>r.id===roomId)??this.geometry.zones[0],p=nearestStanding(this.compiled,zoneInteriorPoint(room),this.settings.radius,this.settings.eyeHeight,room);if(!p){this.callbacks.onNotice?.(T.walkBlocked);return false;}
  if(!this.walking)this.previousView={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),target:this.controls.target.clone(),fov:this.camera.fov};
  this.walking=true;this.controls.enabled=false;this.player={...this.player,...p,pitch:0,yaw:this.player.yaw??0};this.applyMode();this.select([]);this.updateWalkCamera();return true;
 }
 jump(roomId){const room=this.geometry.zones.find(r=>r.id===roomId)??this.geometry.zones[0];if(!room)return;const point=nearestStanding(this.compiled,zoneInteriorPoint(room),this.settings.radius,this.settings.eyeHeight,room);if(!point){this.callbacks.onNotice?.(T.walkBlocked);return;}Object.assign(this.player,point);this.player.pitch=0;this.updateWalkCamera();}
 exit(){this.walking=false;this.keys.clear();this.input={forward:0,right:0};this.controls.enabled=true;if(this.previousView){this.camera.position.copy(this.previousView.position);this.camera.quaternion.copy(this.previousView.quaternion);this.camera.fov=this.previousView.fov;this.controls.target.copy(this.previousView.target);this.camera.updateProjectionMatrix();}this.applyMode();this.controls.update();}
 updateWalkCamera(){this.camera.position.set(this.player.x/100,this.settings.eyeHeight/100,this.player.y/100);this.camera.rotation.order='YXZ';this.camera.rotation.set(this.player.pitch,this.player.yaw,0);this.camera.fov=horizontalToVerticalFov(this.settings.hfov,this.camera.aspect);this.camera.updateProjectionMatrix();}
 hit(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);return selectionFromHits(this.raycaster.intersectObjects(this.content.children,true),this.content);}
 ground(e){this.hit(e);const p=new THREE.Vector3();this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p);return{x:p.x*100,y:p.z*100};}
 down(e){if(e.button!==0)return;this.renderer.domElement.focus({preventScroll:true});const hit=this.hit(e);this.drag={sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,hit,moved:false};if(this.walking){this.renderer.domElement.setPointerCapture(e.pointerId);return;}
  if(hit?.kind==='item'){this.callbacks.onSelect?.(hit.kind,hit.id,e.shiftKey);this.controls.enabled=false;this.drag.point=this.ground(e);this.drag.editing=true;this.callbacks.onEdit?.('begin');this.renderer.domElement.setPointerCapture(e.pointerId);}
 }
 move(e){if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;d.x=e.clientX;d.y=e.clientY;if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>5)d.moved=true;
  if(this.walking){this.player.yaw-=dx*.004;this.player.pitch=Math.max(-1.2,Math.min(1.2,this.player.pitch-dy*.004));this.updateWalkCamera();}
  else if(d.editing&&d.moved){const p=this.ground(e);this.callbacks.onEdit?.('preview',{dx:p.x-d.point.x,dy:p.y-d.point.y});}
 }
 up(e,cancel=false){const d=this.drag;if(!d)return;this.drag=null;if(d.editing){this.callbacks.onEdit?.(cancel?'cancel':'commit');this.controls.enabled=!this.walking;}
  else if(!cancel&&!d.moved){if(this.walking&&d.hit?.door)this.callbacks.onDoor?.(d.hit.id);else if(d.hit&&!this.walking)this.callbacks.onSelect?.(d.hit.kind,d.hit.id,e.shiftKey);}}
 animate(){this.frame=requestAnimationFrame(()=>this.animate());const now=performance.now(),dt=Math.min(.04,(now-this.lastFrame)/1000);this.lastFrame=now;if(!this.visible)return;
  if(this.walking){const k=this.keys,forward=(k.has('w')||k.has('arrowup')?1:0)-(k.has('s')||k.has('arrowdown')?1:0)+this.input.forward,right=(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0)+this.input.right;
   this.player.yaw+=((k.has('q')?1:0)-(k.has('e')?1:0))*dt*1.7;
   const speed=this.settings.speed*100*dt/Math.max(1,Math.hypot(forward,right)),dx=(-Math.sin(this.player.yaw)*forward+Math.cos(this.player.yaw)*right)*speed,dy=(-Math.cos(this.player.yaw)*forward-Math.sin(this.player.yaw)*right)*speed;
   Object.assign(this.player,moveWithCollision(this.compiled,this.player,dx,dy,this.settings.radius,this.settings.eyeHeight));this.updateWalkCamera();
  }else{this.controls.update();this.presentation?.setMode('dollhouse',this.cutaway,this.camera,this.controls.target);}
  this.renderer.render(this.scene,this.camera);
 }
 snapshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
 async png(){this.renderer.render(this.scene,this.camera);return new Promise(r=>this.renderer.domElement.toBlob(r,'image/png'));}
 dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);this.controls.dispose();this.presentation?.dispose();this.assets.dispose();disposeStudioScene(this.content);this.renderer.dispose();this.renderer.domElement.remove();}
}
