import { catalog,itemFrom,roomFrom,createProject,activeScheme,clone,uid,groupItems,templateFromItems } from './model.js';
import { newRule } from './rules.js';
import { zh as T } from './zh.js';
export const sampleBasis='示例设定尺寸（非现场实测）';
const confirmed=o=>({...o,confirmed:true,source:sampleBasis});
const item=(key,x,y,changes={})=>confirmed({...itemFrom(catalog.find(c=>c.key===key),x,y),...changes});
const room=(name,x,y,w,d)=>confirmed(roomFrom(name,x,y,w,d));
const door=(name,x,y,width=90,angle=0)=>confirmed({id:uid('door'),name,type:'door',doorType:'swing',x,y,width,height:210,angle,orientation:angle===90?'vertical':'horizontal',hinge:'start',openSide:-1,openAngle:90,locked:false});
const windowAt=(name,x,y,width,angle=0)=>confirmed({id:uid('window'),name,type:'window',x,y,width,height:130,sillHeight:90,angle,orientation:angle===90?'vertical':'horizontal',openRatio:0,locked:false});
const entry=(text,kind,priority='prefer',ruleId='')=>({id:uid('need'),text,kind,priority,ruleId});
export const examples=[{id:'solo',name:T.exampleSolo,description:T.exampleSoloDesc,icon:'solo'},{id:'family',name:T.exampleFamily,description:T.exampleFamilyDesc,icon:'family'},{id:'cats',name:T.exampleCats,description:T.exampleCatsDesc,icon:'cats'}];
export function exampleProject(key='solo'){
 const p=createProject(examples.find(e=>e.id===key)?.name),s=activeScheme(p),g=s.geometry;
 if(key==='solo'){
  const r=room('卧室 · 办公',0,0,420,480);g.zones=[r];
  const bed=item('single-bed',85,150),desk=item('desk',320,40),chair=item('chair',320,105,{rotation:180}),wardrobe=item('wardrobe',200,440,{width:140,rotation:180});
  g.items=[bed,desk,chair,wardrobe,item('plant',380,420)];g.structures=[door('房门',50,480,90),windowAt('采光窗',270,0,180)];
  const gap={...newRule('clearance'),name:'床与书桌的侧向净距',objectA:bed.id,objectB:desk.id,threshold:70};s.rules.push(gap);
  s.rules.push({...newRule('path'),name:'房门到书桌旁',start:{x:60,y:390},end:{x:230,y:160},threshold:70});
  p.needs.residents=1;p.needs.members=[{id:uid('member'),name:'居住者',traits:'居家办公'}];p.needs.purposes=[{id:uid('purpose'),roomId:r.id,text:'睡眠、专注工作'}];p.needs.entries=[entry('保留独立办公桌面','work','must'),entry('床与书桌之间预留 70 厘米','comfort','must',gap.id),entry('衣物与书籍分区收纳','storage')];
 }else if(key==='family'){
  g.zones=[room('客餐厅',0,0,650,560),room('多功能房',650,0,360,560)];
  const table=item('dining',390,180),side=item('sideboard',590,180,{rotation:270}),sofa=item('sofa',200,470,{rotation:180});
  g.items=[table,side,sofa,item('chair',350,100),item('chair',430,100),item('chair',350,260,{rotation:180}),item('chair',430,260,{rotation:180}),item('single-bed',735,160),item('desk',920,40),item('bookshelf',970,430,{rotation:270}),item('plant',40,180)];
  g.structures=[{...door('入户门',120,0,100),openSide:1},door('多功能房门',650,350,100,90),windowAt('客厅窗',250,560,280)];
  const gap={...newRule('clearance'),name:'餐桌与餐边柜之间',objectA:table.id,objectB:side.id,threshold:80};s.rules.push(gap,{...newRule('path'),name:'入户到起居区',start:{x:120,y:100},end:{x:450,y:390},threshold:80});
  p.needs.residents=4;p.needs.members=[{id:uid('member'),name:'成人成员',traits:'两位'},{id:uid('member'),name:'其他家庭成员',traits:'两位，按需要调整'}];p.needs.purposes=[{id:uid('purpose'),roomId:g.zones[1].id,text:'客卧、学习与弹性收纳'}];p.needs.entries=[entry('四人一起用餐','dining','must'),entry('餐边柜前预留 80 厘米','comfort','must',gap.id),entry('为访客提供临时留宿空间','social')];
 }else{
  g.zones=[room('起居与用餐',0,0,400,500),room('卧室与收纳',400,0,500,500)];
  const bed=item('bed',630,360,{name:'1.8 米床 · 含床架',width:188,depth:205,mattress:{width:180,depth:200}});
  const arm1=item('wardrobe',790,35,{name:'转角柜 · 横段',width:180,depth:60}),arm2=item('wardrobe',866,135,{name:'转角柜 · 竖段',width:60,depth:140}),vanity=item('desk',856,250,{name:'内嵌梳妆位',width:60,depth:80,height:75,rotation:90});
  const screen=item('screen',500,260,{rotation:90,width:150}),console=item('console',520,260,{rotation:90,width:136});
  g.items=[bed,arm1,arm2,vanity,screen,console,item('dining',180,100,{width:130,depth:75}),item('sideboard',25,120,{rotation:270}),item('sofa',180,450,{width:220,rotation:180}),item('pet',40,310),item('pet',850,440)];
  g.structures=[{...door('卧室入口',400,240,110,90),openSide:1},{...door('入户门',330,0,90),openSide:1},windowAt('卧室窗',650,500,240)];
  groupItems(s,[arm1.id,arm2.id,vanity.id],'L 形柜与梳妆位');groupItems(s,[screen.id,console.id],'屏风与窄桌');
  const visibility={...newRule('visibility'),name:'指定用餐视点到床区',eye:{x:200,y:240},eyeHeight:120,targetId:bed.id,targetHeight:65,threshold:0};
  const path={...newRule('path'),name:'卧室入口到床侧',start:{x:440,y:240},end:{x:840,y:370},threshold:70};s.rules.push(visibility,path);
  p.needs.residents=2;p.needs.members=[{id:uid('member'),name:'家庭成员',traits:'两位成人'},{id:uid('member'),name:'宠物',traits:'两只猫'}];p.needs.entries=[entry('保留 180 × 200 厘米床垫','retained','must'),entry('转角组合柜与梳妆位','storage','must'),entry('指定用餐视点尽量看不到床面','other','prefer',visibility.id),entry('卧室入口至床侧预留 70 厘米包络','comfort','must',path.id),entry('两个猫砂位置需观察实际接受情况','pet','pending')];
 }
 s.notes='可编辑示例。所有尺寸为示例设定，可以按自己的房间修改。';
 p.needs.preferredStyle=T.styleWarm;
 const baseline={...clone(s),id:uid('scheme'),name:T.baseline,protected:true,groups:[],rules:[],notes:'受保护的原始空间参考。复制后可继续编辑。'};baseline.geometry.items=[];
 p.schemes.push(baseline);return p;
}
export function builtInTemplates(){
 const p=exampleProject('cats'),s=activeScheme(p),groups=s.groups.map(g=>templateFromItems(s,g.itemIds,g.name));
 const a=item('desk',0,-30),b=item('bookshelf',-75,-30),c=item('chair',0,45,{rotation:180});
 return [...groups,{id:'work-combo',name:'书桌 · 书柜 · 座椅',kind:'group',items:[a,b,c]}];
}
export const needPresets=[
 {id:'work',name:'居家办公',entries:[{text:'可独立工作的桌面与照明',kind:'work',priority:'must'},{text:'视频会议时的背景与隐私',kind:'other',priority:'prefer'}]},
 {id:'storage',name:'家庭收纳',entries:[{text:'保留现有柜体及尺寸',kind:'retained',priority:'must'},{text:'餐桌附近设置日常收纳',kind:'storage',priority:'prefer'}]},
 {id:'pet',name:'与宠物共居',entries:[{text:'宠物饮水、休息与排泄位置分开安排',kind:'pet',priority:'prefer'},{text:'确认门关闭时宠物能否到达资源点',kind:'pet',priority:'pending'}]},
];
