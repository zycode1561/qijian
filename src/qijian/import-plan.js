import { resizeRecognitionImage } from './recognition-raster.js';
import { zoneFromPoints,zonePoints } from '../space-geometry.js';
import { uid } from './model.js';
import { zh as T } from './zh.js';
export function chooseFile(accept='.json'){
 return new Promise(resolve=>{
  const input=document.createElement('input');input.type='file';input.accept=accept;input.hidden=true;
  const finish=file=>{input.remove();resolve(file);};
  input.addEventListener('change',()=>finish(input.files?.[0]??null),{once:true});
  input.addEventListener('cancel',()=>finish(null),{once:true});
  // Keep the chooser's input alive until it resolves, including embedded browsers.
  document.body.append(input);input.click();
 });
}

export async function readPlanImage(file){
 if(file.size>20*1024*1024)throw Error(T.imageTooLarge);
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');
  // JPEG has no alpha: transparent floor plans must be flattened onto white.
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return {id:uid('plan'),dataUrl:canvas.toDataURL('image/jpeg',.9),name:file.name,pixelWidth:canvas.width,pixelHeight:canvas.height,width:600,depth:600*canvas.height/canvas.width,x:0,y:0,opacity:.4,locked:true,visible:true,confirmed:false};
 }finally{URL.revokeObjectURL(url);}
}

export function candidatesFromRecognition(result,background){
 return result.rooms.map((r,i)=>zoneFromPoints({id:uid('room'),sourcePlanId:background.id,name:`${T.candidate} ${i+1}`,type:'room',height:270,color:'#e5d9c4',confirmed:false,source:T.candidateHint,locked:false},r.points.map(p=>({x:background.x+p.x/result.width*background.width,y:background.y+p.y/result.height*background.depth}))));
}
export function resizeCandidates(rooms,background,width){
 if(!Number.isFinite(width)||width<=0)throw Error(T.invalidNumber);
 const ratio=width/background.width;
 return rooms.map(r=>zoneFromPoints(r,zonePoints(r).map(p=>({x:background.x+(p.x-background.x)*ratio,y:background.y+(p.y-background.y)*ratio}))));
}

export function recognizePixels(image,{signal}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
  const worker=new Worker(new URL('../floorplan-recognition.worker.js',import.meta.url),{type:'module'});
  const finish=(error,result)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();error?reject(error):resolve(result);};
  const cancel=()=>finish(new DOMException('Cancelled','AbortError'));
  const timer=setTimeout(()=>finish(Error(T.recognizeFailed)),30000);
  signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>finish(data.error?Error(data.error):null,data.result);
  worker.onerror=()=>finish(Error(T.recognizeFailed));
  worker.postMessage({image});
 });
}
export async function recognizeCandidates(background,{signal}={}){
 const image=new Image();image.src=background.dataUrl;await image.decode();
 const canvas=document.createElement('canvas');
 canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const result=await recognizePixels(resizeRecognitionImage(ctx.getImageData(0,0,canvas.width,canvas.height)),{signal});
 return candidatesFromRecognition(result,background);
}
export function calibratePlan(background,a,b,length){const pixels=Math.hypot(a.x-b.x,a.y-b.y);if(!Number.isFinite(length)||length<=0||pixels<1)throw Error(T.invalidNumber);const ratio=length/pixels;return {...background,width:background.width*ratio,depth:background.depth*ratio,x:a.x+(background.x-a.x)*ratio,y:a.y+(background.y-a.y)*ratio,calibration:{start:a,end:b,length,unit:'cm'},confirmed:true};}
