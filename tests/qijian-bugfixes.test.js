import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizeFloorplan} from '../src/floorplan-recognition.js';
import {twoRooms} from './fixtures/floorplan-raster.js';
import {candidatesFromRecognition,resizeCandidates,calibratePlan} from '../src/qijian/import-plan.js';
import {zonePoints} from '../src/space-geometry.js';
import {selectionFromHits} from '../src/qijian/selection3d.js';
import {Scene3D} from '../src/qijian/scene3d.js';
const root={};
const mesh=(userData,parent=root,extra={})=>({userData,parent,visible:true,...extra});
const hit=object=>({object,point:{x:1,y:1,z:1},face:{materialIndex:0}});
test('floorplan candidates preserve separate positions, physical scale and plan provenance',()=>{
 const raster=twoRooms(),result=recognizeFloorplan(raster),bg={id:'plan-a',x:35,y:60,width:1200,depth:800};
 const rooms=candidatesFromRecognition(result,bg);assert.equal(rooms.length,2);
 assert.ok(rooms[0].x+rooms[0].width<rooms[1].x);assert.equal(rooms[0].sourcePlanId,bg.id);assert.equal(rooms[0].confirmed,false);
 assert.equal(rooms[0].x,35+22*5);assert.equal(rooms[0].depth,116*5);
 const doubled=resizeCandidates(rooms,bg,2400);
 assert.deepEqual(zonePoints(doubled[0]),zonePoints(rooms[0]).map(p=>({x:35+(p.x-35)*2,y:60+(p.y-60)*2})));
 assert.throws(()=>resizeCandidates(rooms,bg,NaN));
 const calibrated=calibratePlan(bg,{x:35,y:60},{x:635,y:60},1200);assert.equal(calibrated.width,2400);
 assert.deepEqual(candidatesFromRecognition({...result,rooms:[]},bg),[]);
});
test('3D picking distinguishes windows from doors, selects manual walls and floor',()=>{
 const opening=type=>mesh({openingController:{structure:{id:type,type}}});
 assert.deepEqual(selectionFromHits([hit(opening('window'))],root),{kind:'structure',id:'window',door:false});
 assert.deepEqual(selectionFromHits([hit(opening('door'))],root),{kind:'structure',id:'door',door:true});
 assert.deepEqual(selectionFromHits([hit(mesh({},mesh({structureId:'wall-a'})))],root),{kind:'structure',id:'wall-a'});
 assert.deepEqual(selectionFromHits([hit(mesh({type:'floor',id:'room-a'}))],root),{kind:'zone',id:'room-a'});
});
test('hidden and clipped walls do not block picking the furniture behind them',()=>{
 const furniture=mesh({},mesh({type:'furniture',id:'sofa'}));
 const hidden=mesh({structureId:'wall'},mesh({},root,{visible:false}));
 const clipped=mesh({structureId:'wall'},root,{material:{clippingPlanes:[{distanceToPoint:()=>-1}]}});
 assert.deepEqual(selectionFromHits([hit(hidden),hit(clipped),hit(furniture)],root),{kind:'item',id:'sofa'});
});
test('editing clicks select doors for deletion; only walkthrough clicks toggle them',()=>{
 const events=[],callbacks={onDoor:id=>events.push(['toggle',id]),onSelect:(kind,id)=>events.push(['select',kind,id])};
 for(const walking of [false,true]){
  const scene={walking,callbacks,drag:{hit:{kind:'structure',id:'door',door:true},moved:false}};
  Scene3D.prototype.up.call(scene,{shiftKey:false});
 }
 assert.deepEqual(events,[['select','structure','door'],['toggle','door']]);
});
test('cancelled 3D gesture never selects or toggles an opening',()=>{
 const events=[],scene={walking:false,callbacks:{onDoor:()=>events.push(1),onSelect:()=>events.push(2)},drag:{hit:{kind:'structure',id:'door',door:true}}};
 Scene3D.prototype.up.call(scene,{},true);assert.deepEqual(events,[]);
});
