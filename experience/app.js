"use strict";

const world = document.getElementById("world");
const effects = document.getElementById("effects");
const ctx = effects.getContext("2d");
const stillnessBar = document.getElementById("stillnessBar");
const calValues = document.getElementById("calValues");
const whisperEl = document.getElementById("whisper");
const reactionEl = document.getElementById("reaction");
const reactionFormulaEl = document.getElementById("reactionFormula");
const reactionNameEl = document.getElementById("reactionName");
const reactionMessageEl = document.getElementById("reactionMessage");
const discoveryEl=document.getElementById("discovery");
let lastDiscovery=null;

const J = { SpineBase:0, SpineMid:1, Neck:2, Head:3, ShoulderLeft:4, ElbowLeft:5, WristLeft:6, HandLeft:7, ShoulderRight:8, ElbowRight:9, WristRight:10, HandRight:11, HipLeft:12, KneeLeft:13, AnkleLeft:14, FootLeft:15, HipRight:16, KneeRight:17, AnkleRight:18, FootRight:19, SpineShoulder:20 };
const PALETTES = ["#56e5ff", "#a66cff", "#ff5b62", "#63f0a8", "#ffc857", "#ff6ec7"];
const ELEMENTS={H:{label:"H",color:"#67e8ff",mass:1},O:{label:"O",color:"#ff686e",mass:16},C:{label:"C",color:"#f1eee7",mass:12},N:{label:"N",color:"#a978ff",mass:14},Na:{label:"Na",color:"#ffc857",mass:23},Cl:{label:"Cl",color:"#63f0a8",mass:35}};
const ELEMENT_POOL=["H","H","O","O","C","C","N","N","Na","Na","Cl","Cl"];
const RECIPES=[
  {need:{H:2,O:1},formula:"2H + O → H₂O",name:"WATER",message:"FLOW EMERGES FROM COMBINATION",type:"water",color:"#56e5ff",secondary:"#3a7cff"},
  {need:{Na:1,Cl:1},formula:"Na + Cl → NaCl",name:"CRYSTAL",message:"ORDER EMERGES FROM OPPOSITES",type:"crystal",color:"#ffc857",secondary:"#63f0a8"},
  {need:{C:1,O:2},formula:"C + 2O → CO₂",name:"CARBON",message:"A CYCLE CONNECTS EVERY SYSTEM",type:"network",color:"#63f0a8",secondary:"#56e5ff"},
  {need:{N:1,H:3},formula:"N + 3H → NH₃",name:"AMMONIA",message:"A NEW GEOMETRY TAKES FORM",type:"gas",color:"#a978ff",secondary:"#67e8ff"},
  {need:{C:1,H:4},formula:"C + 4H → CH₄",name:"METHANE",message:"STORED ENERGY BECOMES VISIBLE",type:"energy",color:"#ff686e",secondary:"#ffc857"},
  {need:{H:2},formula:"H + H → H₂",name:"HYDROGEN",message:"THE LIGHTEST BOND TAKES FORM",type:"energy",color:"#67e8ff",secondary:"#f1eee7"},
  {need:{O:2},formula:"O + O → O₂",name:"OXYGEN",message:"A BREATHING BOND EMERGES",type:"gas",color:"#ff686e",secondary:"#67e8ff"},
  {need:{N:2},formula:"N + N → N₂",name:"NITROGEN",message:"THE ATMOSPHERE BECOMES VISIBLE",type:"network",color:"#a978ff",secondary:"#56e5ff"}
];
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a+(b-a)*t;
const query = new URLSearchParams(location.search);

const savedConfig=(()=>{try{return JSON.parse(localStorage.getItem("livingPortalConfig"))||{}}catch(_){return{}}})();
let config={offsetX:Number(savedConfig.offsetX)||0,offsetY:Number(savedConfig.offsetY)||0,scale:clamp(Number(savedConfig.scale)||1,.72,1.35),mirror:savedConfig.mirror!==false,sound:savedConfig.sound!==false};
let width=innerWidth, height=innerHeight, dpr=1, mirror=config.mirror;
let frame={tracked:false,bodies:[],mask:null,mw:384,mh:318,received:0},textureW=384,textureH=318;
let previousBodies=new Map(), lastVisibleBodies=new Map(), trails=new Map(), memory=[], pulses=[];
const localInstallation=["localhost","127.0.0.1","[::1]"].includes(location.hostname);
let demo=query.has("demo")?query.get("demo")==="1":!localInstallation;
const demoHands={left:{x:.35,y:.45,tx:.35,ty:.45},right:{x:.65,y:.45,tx:.65,ty:.45}};
let selectedHand="left",demoHolding=false,demoCaptured=false,demoRelease=false;
let stillness=0, motionEnergy=0, fusion=0, fused=false, lastBodyCount=0;
let startedAt=performance.now(), lastTime=startedAt;
let calibrationActive=false,audio=null,audioFused=false,lastAudioCount=0;
let lastUploadedMask=null;
let molecules=[],inventories=new Map(),activeReaction=null,reactionCooldown=0,failedMixUntil=0;

const gl = world.getContext("webgl", {antialias:false,alpha:false,powerPreference:"high-performance"});
if(!gl){document.body.innerHTML="<div style='padding:3rem;color:white;font:20px sans-serif'>WebGL is required for the Living Portal.</div>";throw new Error("WebGL unavailable")}

const vertexSource = `
attribute vec2 a_position;
void main(){gl_Position=vec4(a_position,0.0,1.0);}
`;

const fragmentSource = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_presence;
uniform float u_demo;
uniform float u_stillness;
uniform float u_motion;
uniform float u_fusion;
uniform float u_mirror;
uniform vec2 u_offset;
uniform float u_scale;
uniform float u_maskAspect;
uniform sampler2D u_mask;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
vec3 palette(float id){
  if(id<1.5)return vec3(.337,.898,1.0);
  if(id<2.5)return vec3(.651,.424,1.0);
  if(id<3.5)return vec3(1.0,.357,.384);
  if(id<4.5)return vec3(.388,.941,.659);
  if(id<5.5)return vec3(1.0,.784,.341);
  return vec3(1.0,.431,.78);
}
float maskAt(vec2 uv){vec2 q=(uv-vec2(u_offset.x,-u_offset.y)-.5)/u_scale+.5;q.x=(q.x-.5)*(u_resolution.x/u_resolution.y)/u_maskAspect+.5;if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0)return 0.0;vec2 p=vec2(u_mirror>.5?1.0-q.x:q.x,1.0-q.y);return floor(texture2D(u_mask,p).r*255.0+.5);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 p=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.0);
  float t=u_time;
  if(u_demo>.5){
    float haze=.5+.5*sin(p.x*2.0+t*.08)*cos(p.y*3.0-t*.06);
    float vignette=1.0-smoothstep(.2,1.2,length(p));
    gl_FragColor=vec4(vec3(.008,.013,.023)+vec3(.009,.017,.026)*haze*vignette,1.0);
    return;
  }
  float id=maskAt(uv);
  float inside=step(.5,id);

  float n=fbm(p*2.4+vec2(t*.035,-t*.026));
  float gridX=pow(max(0.0,1.0-abs(sin((p.x+n*.055)*34.0))),20.0);
  float gridY=pow(max(0.0,1.0-abs(sin((p.y-n*.04)*34.0))),20.0);
  vec3 bg=vec3(.006,.009,.017);
  bg+=vec3(.025,.04,.065)*(gridX+gridY)*(.25+.75*u_presence);
  float star=step(.9972,hash(floor((p+vec2(t*.004,0.0))*vec2(360.0,205.0))));
  bg+=star*vec3(.3,.55,.7)*(.2+.8*(1.0-u_presence));
  float ambient=fbm(p*1.8-vec2(t*.02,t*.015));
  bg+=vec3(.014,.02,.035)*ambient;

  vec2 px=1.0/u_resolution;
  float nearBody=0.0;
  nearBody=max(nearBody,step(.5,maskAt(uv+vec2(px.x*2.0,0.0))));
  nearBody=max(nearBody,step(.5,maskAt(uv-vec2(px.x*2.0,0.0))));
  nearBody=max(nearBody,step(.5,maskAt(uv+vec2(0.0,px.y*2.0))));
  nearBody=max(nearBody,step(.5,maskAt(uv-vec2(0.0,px.y*2.0))));
  float outer=max(0.0,nearBody-inside);
  float edge=0.0;
  edge=max(edge,abs(id-maskAt(uv+vec2(px.x,0.0))));
  edge=max(edge,abs(id-maskAt(uv-vec2(px.x,0.0))));
  edge=max(edge,abs(id-maskAt(uv+vec2(0.0,px.y))));
  edge=max(edge,abs(id-maskAt(uv-vec2(0.0,px.y))));
  edge=step(.5,edge)*inside;

  vec3 base=palette(id);
  float flow=fbm(p*5.2+vec2(t*.22,-t*.16)+n*1.7);
  float veins=pow(abs(sin((p.x*1.35+p.y*.75+flow*.42+t*.035)*76.0)),18.0);
  float contours=pow(abs(sin((length(p+vec2(n*.1))*17.0-flow*4.0-t*.28))),24.0);
  float cells=pow(max(0.0,1.0-abs(sin((p.x-p.y+flow*.23)*54.0))),16.0);
  float fine=pow(abs(sin((p.x+p.y)*145.0+flow*8.0)),28.0)*u_stillness;
  float sparks=step(.982-u_motion*.006,hash(floor((p+flow*.015)*vec2(310.0,190.0)+t*vec2(7.0,-3.0))));
  vec3 portal=base*(.12+.55*flow);
  portal+=mix(base,vec3(1.0),.65)*(veins*.7+contours*.45+cells*.28);
  portal+=vec3(.95,.98,1.0)*(fine*.75+sparks*(.45+u_motion));
  portal*=.72+u_stillness*.45;
  portal+=base*edge*1.8;

  vec3 color=mix(bg,portal,inside);
  color+=base*outer*.42;
  color+=vec3(.15,.08,.3)*u_fusion*(.08/(.02+abs(p.y+sin(p.x*10.0+t)*.025)))*inside;
  float vignette=smoothstep(1.12,.25,length(p));
  color*=.62+.38*vignette;
  color=1.0-exp(-color*1.45);
  gl_FragColor=vec4(color,1.0);
}
`;

function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader}
const program=gl.createProgram();
gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
const uniforms={};["demo","resolution","time","presence","stillness","motion","fusion","mirror","offset","scale","maskAspect","mask"].forEach(n=>uniforms[n]=gl.getUniformLocation(program,`u_${n}`));
const maskTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,maskTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,textureW,textureH,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array(textureW*textureH));gl.uniform1i(uniforms.mask,0);

function resize(){
  dpr=Math.min(devicePixelRatio||1,1.35);width=innerWidth;height=innerHeight;
  const backgroundDpr=demo?Math.min(1,Math.sqrt(1100000/(width*height))):dpr;
  world.width=Math.floor(width*backgroundDpr);world.height=Math.floor(height*backgroundDpr);
  effects.width=Math.floor(width*dpr);effects.height=Math.floor(height*dpr);
  effects.style.width=world.style.width=width+"px";effects.style.height=world.style.height=height+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);gl.viewport(0,0,world.width,world.height);
}

function saveConfig(){
  config.mirror=mirror;
  try{localStorage.setItem("livingPortalConfig",JSON.stringify(config))}catch(_){}
  calValues.textContent=`X ${config.offsetX.toFixed(3)} · Y ${config.offsetY.toFixed(3)} · SCALE ${config.scale.toFixed(2)} · ${mirror?"MIRRORED":"DIRECT"} · SOUND ${config.sound?"ON":"OFF"}`;
}

function setCalibration(active){
  calibrationActive=active;document.body.classList.toggle("calibrating",active);saveConfig();
}

function resetCalibration(){config.offsetX=0;config.offsetY=0;config.scale=1;mirror=true;saveConfig()}

function syncSoundControl(){
  const button=document.getElementById("demo-sound");
  const playing=config.sound&&audio?.ac.state==="running";
  button.textContent=playing?"Sound: On (S)":config.sound?"Enable sound (S)":"Sound: Off (S)";
  button.setAttribute("aria-pressed",String(!!playing));
}
function initAudio(){
  if(audio||!config.sound)return;
  try{
    const AudioClass=window.AudioContext||window.webkitAudioContext,ac=new AudioClass();
    const master=ac.createGain(),compressor=ac.createDynamicsCompressor();
    master.gain.value=.6;compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=4;
    master.connect(compressor).connect(ac.destination);
    const ambient=ac.createGain(),filter=ac.createBiquadFilter();
    ambient.gain.value=0;filter.type="lowpass";filter.frequency.value=900;
    ambient.connect(filter).connect(master);
    const oscillators=[130.81,196,261.63].map((frequency,i)=>{
      const osc=ac.createOscillator(),gain=ac.createGain();osc.type="sine";osc.frequency.value=frequency;
      gain.gain.value=[.32,.18,.1][i];osc.connect(gain).connect(ambient);osc.start();return{osc,gain};
    });
    const delay=ac.createDelay(1),feedback=ac.createGain(),wet=ac.createGain();
    delay.delayTime.value=.19;feedback.gain.value=.22;wet.gain.value=.18;
    delay.connect(feedback).connect(delay);delay.connect(wet).connect(master);
    audio={ac,master,ambient,filter,oscillators,delay,voices:0};
    ac.onstatechange=syncSoundControl;
  }catch(_){config.sound=false;saveConfig()}
  syncSoundControl();
}
async function unlockAudio(){
  if(!config.sound)return;
  initAudio();
  if(audio&&audio.ac.state!=="running"){
    try{await audio.ac.resume()}catch(_){/* Keep the enable button available for another gesture. */}
  }
  syncSoundControl();
}
async function toggleSound(){
  if(config.sound&&audio?.ac.state==="running"){
    config.sound=false;audio.master.gain.setTargetAtTime(0,audio.ac.currentTime,.04);
  }else{
    config.sound=true;await unlockAudio();
    if(audio){audio.master.gain.setTargetAtTime(.6,audio.ac.currentTime,.04);tone(523.25,.22,.09);tone(783.99,.35,.06,.09)}
  }
  saveConfig();syncSoundControl();
}
function tone(frequency,duration=.8,volume=.07,delay=0,ratio=1,type="sine"){
  if(!config.sound||!audio||audio.voices>=24)return;
  const {ac}=audio,osc=ac.createOscillator(),gain=ac.createGain(),start=ac.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*ratio),start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(audio.master);gain.connect(audio.delay);audio.voices++;
  osc.onended=()=>{osc.disconnect();gain.disconnect();audio.voices--};
  osc.start(start);osc.stop(start+duration+.03);
}
function collectionSound(type){
  const notes={H:523.25,O:659.25,C:392,N:587.33,Na:783.99,Cl:880},note=notes[type]||523.25;
  tone(note,.24,.11);tone(note*2,.16,.035,.035);
}
function releaseSound(){tone(440,.28,.075,0,.5);tone(330,.32,.05,.07,.5)}
function reactionSound(recipe){
  const index=Math.max(0,RECIPES.indexOf(recipe)),root=[261.63,392,196,293.66,164.81,329.63,349.23,220][index];
  const intervals=recipe.type==="crystal"?[1,1.5,2,3]:recipe.type==="water"?[1,1.25,1.5,2]:[1,1.2,1.5,2];
  const step=recipe.type==="energy"?.055:recipe.type==="gas"?.16:.11;
  intervals.forEach((interval,i)=>tone(root*interval,recipe.type==="crystal"?.8:1.35,.095-i*.014,i*step,recipe.type==="gas"?1.12:1));
  tone(root/2,1.6,.085,0,1,"triangle");
}
function updateAudio(bodyCount){
  if(!config.sound||!audio||audio.ac.state!=="running")return;
  const now=audio.ac.currentTime,present=bodyCount>0;
  audio.ambient.gain.setTargetAtTime(activeReaction?.012:present?.035:.015,now,.6);
  audio.filter.frequency.setTargetAtTime(700+stillness*700+motionEnergy*500,now,.35);
  audio.oscillators.forEach((voice,i)=>voice.osc.detune.setTargetAtTime(Math.sin(performance.now()*.00015+i)*4+motionEnergy*8,now,.5));
  if(bodyCount>0&&lastAudioCount===0){tone(261.63,.7,.035);tone(392,.8,.025,.14)}
  if(fused&&!audioFused){tone(220,1.2,.07);tone(329.63,1.4,.06,.1);tone(493.88,1.6,.04,.2)}
  audioFused=fused;lastAudioCount=bodyCount;
}
function decodeMask(data){
  if(!data.mask||!data.mw||!data.mh)return null;
  try{const raw=atob(data.mask),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}catch(_){return null}
}

function updateTexture(mask,mw,mh){
  if(!mask||mask===lastUploadedMask)return;
  lastUploadedMask=mask;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,maskTexture);
  if(mw!==textureW||mh!==textureH){gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,mw,mh,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,mask);textureW=mw;textureH=mh}
  else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,mw,mh,gl.LUMINANCE,gl.UNSIGNED_BYTE,mask);
}

function point(body,index){
  const p=body?.joints?.[index];if(!p)return null;
  if(body.id==="demo")return{x:p.x*width,y:p.y*height,z:p.z,state:p.state};
  const sourceX=mirror?1-p.x:p.x,aspect=(frame.mw/frame.mh)/(width/height),x=((sourceX-.5)*aspect*config.scale+.5+config.offsetX)*width,y=((p.y-.5)*config.scale+.5+config.offsetY)*height;
  return{x,y,z:p.z,state:p.state};
}

function resetMolecule(molecule,fromEdge=false){
  molecule.type=ELEMENT_POOL[(Math.random()*ELEMENT_POOL.length)|0];
  molecule.x=fromEdge?(Math.random()<.5?-30:width+30):Math.random()*width;
  molecule.y=40+Math.random()*(height-80);
  molecule.vx=(Math.random()-.5)*18+(fromEdge?(molecule.x<0?12:-12):0);
  molecule.vy=(Math.random()-.5)*13;
  molecule.radius=18+Math.random()*7;
  molecule.seed=Math.random()*9999;
  molecule.phase=Math.random()*Math.PI*2;
  return molecule;
}

function ensureMolecules(){
  const desired=Math.max(50,Math.min(66,Math.floor(width*height/16500)));
  while(molecules.length<desired)molecules.push(resetMolecule({}));
  if(molecules.length>desired)molecules.length=desired;
}

function inventoryFor(bodyId){
  if(!inventories.has(bodyId))inventories.set(bodyId,{left:[],right:[],leftGesture:{candidate:null,since:0,releaseSince:0},rightGesture:{candidate:null,since:0,releaseSince:0},seen:performance.now()});
  const inventory=inventories.get(bodyId);inventory.seen=performance.now();return inventory;
}

function moleculeCircle(x,y,type,r,alpha=1){
  const element=ELEMENTS[type];ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=alpha;ctx.strokeStyle=element.color;ctx.fillStyle="#05080d";ctx.shadowColor=element.color;ctx.shadowBlur=demo?0:16;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#f6f3ec";ctx.font=`700 ${Math.max(8,r*.75)}px Segoe UI`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(element.label,x,y+.5);ctx.strokeStyle=element.color;ctx.globalAlpha=alpha*.5;ctx.beginPath();ctx.ellipse(x,y,r+5,r+2,Math.sin(x+y)*.5,0,Math.PI*2);ctx.stroke();ctx.restore();
}

function handTargets(bodies){
  const targets=[];
  for(const body of bodies){const inventory=inventoryFor(body.id),left=point(body,J.HandLeft),right=point(body,J.HandRight),hip=point(body,J.SpineBase);if(left)targets.push({body,side:"left",p:left,hip,state:body.left||0,store:inventory.left,gesture:inventory.leftGesture});if(right&&body.id!=="demo")targets.push({body,side:"right",p:right,hip,state:body.right||0,store:inventory.right,gesture:inventory.rightGesture})}
  return targets;
}

function releaseHand(target){
  target.store.forEach((atom,index)=>{const molecule=molecules[(index*7+Math.floor(Math.random()*molecules.length))%molecules.length];resetMolecule(molecule);molecule.type=atom.type;molecule.x=target.p.x+(Math.random()-.5)*50;molecule.y=target.p.y+(Math.random()-.5)*35;molecule.vx=(Math.random()-.5)*150;molecule.vy=-30-Math.random()*90});
  if(target.store.length){pulses.push({x:target.p.x,y:target.p.y,r:8,life:.7});releaseSound()}
  target.store.length=0;target.gesture.releaseSince=0;target.gesture.candidate=null;
}

function drawMoleculeField(bodies,dt,now){
  ensureMolecules();const hands=handTargets(bodies),speed=activeReaction&&!activeReaction.preview ? .35 : 1;
  for(const hand of hands){
    let candidate=null,distance=Infinity;for(const molecule of molecules){const d=Math.hypot(molecule.x-hand.p.x,molecule.y-hand.p.y);if(d<distance){distance=d;candidate=molecule}}
    hand.capture=distance<92?candidate:null;
    if(hand.state===3&&hand.capture){if(hand.gesture.candidate!==hand.capture.seed){hand.gesture.candidate=hand.capture.seed;hand.gesture.since=now}}else{hand.gesture.candidate=null;hand.gesture.since=0}
    const lowered=hand.hip&&hand.p.y>hand.hip.y+Math.max(70,height*.1);
    if(hand.state===4){releaseHand(hand)}
    else if(hand.body.id!=="demo"&&lowered&&hand.store.length){if(!hand.gesture.releaseSince)hand.gesture.releaseSince=now;if(now-hand.gesture.releaseSince>900)releaseHand(hand)}
    else hand.gesture.releaseSince=0;
  }
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.lineWidth=.7;
  for(let i=0;i<molecules.length;i++){const a=molecules[i];for(let j=i+1;j<molecules.length;j++){const b=molecules[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;if(d2<5200){ctx.globalAlpha=(1-Math.sqrt(d2)/73)*.09;ctx.strokeStyle=ELEMENTS[a.type].color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}
  ctx.restore();
  for(const molecule of molecules){
    molecule.vx+=Math.sin(now*.00023+molecule.seed)*dt*5;molecule.vy+=Math.cos(now*.00019+molecule.seed)*dt*4;
    let nearest=null,best=Infinity;for(const hand of hands){const d=Math.hypot(molecule.x-hand.p.x,molecule.y-hand.p.y);if(d<best){best=d;nearest=hand}}
    if(nearest&&best<205){const dx=nearest.p.x-molecule.x,dy=nearest.p.y-molecule.y,d=best||1,isCandidate=nearest.capture===molecule&&nearest.state===3,targetRadius=isCandidate?18:82,force=clamp((d-targetRadius)/115,-.55,1)*(isCandidate?70:38);molecule.vx+=dx/d*force*dt;molecule.vy+=dy/d*force*dt;ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=(1-d/205)*(isCandidate?.38:.16);ctx.strokeStyle=ELEMENTS[molecule.type].color;ctx.beginPath();ctx.moveTo(molecule.x,molecule.y);ctx.lineTo(nearest.p.x,nearest.p.y);ctx.stroke();ctx.restore();if(isCandidate&&now-nearest.gesture.since>520&&nearest.store.length<8){nearest.store.push({type:molecule.type,seed:molecule.seed,caught:now});if(nearest.body.id==="demo"){demoCaptured=true;nearest.state=2}collectionSound(molecule.type);nearest.gesture.candidate=null;nearest.gesture.since=now;resetMolecule(molecule,true);continue}}
    molecule.vx*=Math.pow(.992,dt*60);molecule.vy*=Math.pow(.992,dt*60);molecule.x+=molecule.vx*dt*speed;molecule.y+=molecule.vy*dt*speed;
    if(molecule.x<-45||molecule.x>width+45||molecule.y<-45||molecule.y>height+45)resetMolecule(molecule,true);
    const pulse=1+Math.sin(now*.002+molecule.phase)*.08;moleculeCircle(molecule.x,molecule.y,molecule.type,molecule.radius*pulse,bodies.length ? .72 : .48);
  }
  for(const target of hands){const total=target.store.length,radius=48+total*4;target.store.forEach((atom,index)=>{const angle=now*.0012*(target.side==="left"?1:-1)+index/Math.max(1,total)*Math.PI*2+atom.seed;const x=target.p.x+Math.cos(angle)*radius,y=target.p.y+Math.sin(angle)*radius*.62;moleculeCircle(x,y,atom.type,15,.95);ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.28;ctx.strokeStyle=ELEMENTS[atom.type].color;ctx.beginPath();ctx.moveTo(target.p.x,target.p.y);ctx.lineTo(x,y);ctx.stroke();ctx.restore()})}
  for(const [id,inventory] of inventories)if(now-inventory.seen>1800)inventories.delete(id);
  checkMolecularReactions(bodies,now);
}

function countAtoms(stores){const counts={};for(const store of stores)for(const atom of store)counts[atom.type]=(counts[atom.type]||0)+1;return counts}
function matchingRecipe(stores){const counts=countAtoms(stores);return RECIPES.filter(recipe=>Object.entries(recipe.need).every(([type,amount])=>(counts[type]||0)>=amount)).sort((a,b)=>Object.values(b.need).reduce((x,y)=>x+y,0)-Object.values(a.need).reduce((x,y)=>x+y,0))[0]||null}
function consumeAtoms(stores,need){for(const [type,amount] of Object.entries(need)){let remaining=amount;for(const store of stores){for(let i=store.length-1;i>=0&&remaining>0;i--)if(store[i].type===type){store.splice(i,1);remaining--}}}}

function showDiscovery(recipe,preview=false){
  const lesson=REACTION_LESSONS[recipe.name];
  if(!demo||!lesson)return;
  lastDiscovery={recipe,preview};
  document.getElementById("last-result").hidden=false;
  discoveryEl.style.setProperty("--discovery-color",recipe.color);
  const fields={heading:preview?"REACTION PREVIEW":"YOU MADE A DISCOVERY",formula:lesson.formula,name:lesson.name,kind:`${lesson.kind} · ${lesson.state}`,recipe:recipe.formula,bonding:lesson.bonding,everyday:lesson.everyday};
  for(const [key,value] of Object.entries(fields))document.getElementById(`discovery-${key}`).textContent=value;
  document.getElementById("discovery-source").href=lesson.source;
  if(!discoveryEl.open)discoveryEl.showModal();
}

function beginReaction(recipe,x,y,stores,now,preview=false){
  consumeAtoms(stores,recipe.need);activeReaction={...recipe,x,y,started:now,preview,duration:preview?2600:4300,seed:Math.random()*9999};reactionCooldown=now+2500;document.body.classList.add("reacting");reactionEl.style.setProperty("--reaction-color",recipe.color);reactionFormulaEl.textContent=recipe.formula;reactionNameEl.textContent=(REACTION_LESSONS[recipe.name]?.name||recipe.name).toUpperCase();reactionMessageEl.textContent=recipe.message;
  pulses.push({x,y,r:12,life:1});reactionSound(recipe);
}

function checkMolecularReactions(bodies,now){
  if(activeReaction||now<reactionCooldown)return;
  for(const body of bodies){if(body.id==="demo")continue;const inventory=inventoryFor(body.id),left=point(body,J.HandLeft),right=point(body,J.HandRight);if(!left||!right)continue;const distance=Math.hypot(left.x-right.x,left.y-right.y),stores=[inventory.left,inventory.right],total=stores[0].length+stores[1].length;if(distance<92&&total>=2){const recipe=matchingRecipe(stores);if(recipe){beginReaction(recipe,(left.x+right.x)/2,(left.y+right.y)/2,stores,now);return}if(total>=3)failedMixUntil=now+1400}}
  if(bodies.length>1){const connection=closestConnection(bodies[0],bodies[1]);if(connection&&connection.d<92){const a=inventoryFor(bodies[0].id),b=inventoryFor(bodies[1].id),stores=[a.left,a.right,b.left,b.right],recipe=matchingRecipe(stores);if(recipe)beginReaction(recipe,(connection.p.x+connection.q.x)/2,(connection.p.y+connection.q.y)/2,stores,now)}}
}

function seeded(seed){return Math.abs(Math.sin(seed*12.9898)*43758.5453)%1}
function drawReactionVisual(now){
  if(!activeReaction)return;const reaction=activeReaction,elapsed=(now-reaction.started)/1000,age=elapsed*(reaction.preview?1.65:1),progress=clamp(elapsed/(reaction.duration/1000)),fade=reaction.preview?clamp(elapsed/.12)*clamp((reaction.duration/1000-elapsed)/.5):Math.sin(progress*Math.PI),x=reaction.x,y=reaction.y;ctx.save();ctx.globalCompositeOperation="lighter";ctx.strokeStyle=reaction.color;ctx.fillStyle=reaction.color;ctx.shadowColor=reaction.color;ctx.shadowBlur=demo?6:26;
  if(reaction.type==="water"){for(let i=0;i<9;i++){ctx.globalAlpha=fade*(.38-i*.025);ctx.lineWidth=1.3+i*.35;ctx.beginPath();const base=age*105-i*28;for(let a=0;a<=80;a++){const angle=a/80*Math.PI*2,r=base+Math.sin(a*.65+age*4+i)*12;a?ctx.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r*.58):ctx.moveTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r*.58)}ctx.stroke()}}
  else if(reaction.type==="crystal"){for(let i=0;i<34;i++){const angle=i/34*Math.PI*2,r=28+seeded(i+reaction.seed)*age*190,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.7,size=9+seeded(i*3)*18*fade;ctx.globalAlpha=fade*.48;ctx.beginPath();for(let k=0;k<=6;k++){const a=k/6*Math.PI*2;k?ctx.lineTo(px+Math.cos(a)*size,py+Math.sin(a)*size):ctx.moveTo(px+Math.cos(a)*size,py+Math.sin(a)*size)}ctx.stroke()}}
  else if(reaction.type==="network"){const nodes=[];for(let i=0;i<42;i++){const a=seeded(i+reaction.seed)*Math.PI*2,r=seeded(i*4+3)*age*210;nodes.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.62})}for(let i=1;i<nodes.length;i++){const a=nodes[i],b=nodes[(i*7)%nodes.length];ctx.globalAlpha=fade*.22;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=fade*.72;ctx.beginPath();ctx.arc(a.x,a.y,2.5+seeded(i)*4,0,Math.PI*2);ctx.fill()}}
  else if(reaction.type==="gas"){for(let i=0;i<44;i++){const drift=seeded(i+reaction.seed),px=x+(drift-.5)*age*260+Math.sin(age*2+i)*18,py=y-age*(32+drift*70)+seeded(i*9)*120,r=4+seeded(i*5)*19;ctx.globalAlpha=fade*(.18+drift*.34);ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke()}}
  else{for(let i=0;i<54;i++){const a=i/54*Math.PI*2+Math.sin(i)*.05,r=age*(80+seeded(i+reaction.seed)*190);ctx.globalAlpha=fade*(.16+seeded(i)*.42);ctx.lineWidth=1+seeded(i*2)*4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*18,y+Math.sin(a)*18);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.stroke()}}
  ctx.restore();if(now-reaction.started>reaction.duration){activeReaction=null;document.body.classList.remove("reacting");showDiscovery(reaction,reaction.preview)}
}

function updateMotion(bodies,dt){
  let total=0,count=0;
  const nowMap=new Map();
  for(const body of bodies){
    const sample=[J.Head,J.HandLeft,J.HandRight,J.SpineMid,J.FootLeft,J.FootRight].map(i=>body.joints?.[i]).filter(Boolean);
    const before=previousBodies.get(body.id);
    if(before&&dt>0){for(let i=0;i<Math.min(sample.length,before.length);i++){total+=Math.hypot(sample[i].x-before[i].x,sample[i].y-before[i].y)/dt;count++}}
    nowMap.set(body.id,sample.map(p=>({x:p.x,y:p.y})));
  }
  previousBodies=nowMap;
  const instant=clamp((count?total/count:0)*1.7,0,1);
  motionEnergy=lerp(motionEnergy,instant,clamp(dt*5));
  const target=bodies.length?clamp(1-motionEnergy*1.45,0,1):0;
  stillness=lerp(stillness,target,clamp(dt*(target>stillness?1.1:4.5)));
  stillnessBar.style.setProperty("--stillness",`${Math.round(stillness*100)}%`);
  document.body.classList.toggle("deep-still",stillness>.58);
}

function demoFrame(dt){
  const joints=Array.from({length:25},()=>({x:.5,y:.5,z:2,state:2}));

  for(const side of ["left","right"]){
    const hand=demoHands[side];
    hand.x=hand.tx;hand.y=hand.ty;
    joints[side==="left"?J.HandLeft:J.HandRight]={x:hand.x,y:hand.y,z:2,state:2};
  }
  joints[J.SpineBase]={x:.5,y:.76,z:2,state:2};
  const body={id:"demo",index:0,joints,left:2,right:2};
  body[selectedHand]=demoRelease?4:demoHolding&&!demoCaptured?3:2;
  demoRelease=false;
  return{tracked:true,bodies:[body],mask:null,mw:384,mh:318,received:performance.now()};
}

function releaseDemoPointer(){demoHolding=false;demoCaptured=false}
function collectDemoAtom(event){
  if(activeReaction)return;
  const inventory=inventoryFor("demo");
  if(inventory.left.length>=8)return;
  let candidate=null,best=Infinity;
  for(const molecule of molecules){
    const distance=Math.hypot(molecule.x-event.clientX,molecule.y-event.clientY);
    if(distance<molecule.radius+18&&distance<best){candidate=molecule;best=distance}
  }
  if(!candidate)return;
  inventory.left.push({type:candidate.type,seed:candidate.seed,caught:performance.now()});
  pulses.push({x:candidate.x,y:candidate.y,r:8,life:.5});
  collectionSound(candidate.type);
  resetMolecule(candidate,true);
}
function combineDemoHands(){
  const stores=[inventoryFor("demo").left];
  const recipe=matchingRecipe(stores),now=performance.now();
  if(activeReaction||now<reactionCooldown)return;
  if(recipe)beginReaction(recipe,width/2,height/2,stores,now);
  else failedMixUntil=now+1800;
}
function updateDemoControls(){
  const atoms=inventoryFor("demo").left;
  const label=atoms.length?`Collected: ${atoms.map(atom=>atom.type).join(" + ")}`:"Click an atom to collect it. Try H + H.";
  const inventoryEl=document.getElementById("demo-inventory");
  if(inventoryEl.textContent!==label)inventoryEl.textContent=label;
  const recipe=matchingRecipe([atoms]),button=document.getElementById("demo-combine");
  const buttonLabel=recipe?`Combine: ${(REACTION_LESSONS[recipe.name]?.name||recipe.name).toLowerCase()}`:"Combine atoms";
  if(button.textContent!==buttonLabel)button.textContent=buttonLabel;
  button.disabled=!recipe||!!activeReaction;
  document.getElementById("demo-release").disabled=!atoms.length;
}function addMemory(body){
  const c=point(body,J.SpineMid);if(!c)return;
  memory.push({x:c.x,y:c.y,color:PALETTES[body.index%PALETTES.length],born:performance.now(),seed:Math.random()*9999});
  if(memory.length>28)memory.shift();
}

function updateTrails(bodies,now){
  const active=new Set();
  for(const body of bodies){active.add(body.id);let pair=trails.get(body.id);if(!pair){pair=[[],[]];trails.set(body.id,pair)}[J.HandLeft,J.HandRight].forEach((joint,k)=>{const p=point(body,joint);if(body.id==="demo"&&k===1)return;if(p){pair[k].push({x:p.x,y:p.y,t:now});if(pair[k].length>(demo?16:54))pair[k].shift()}})}
  for(const [id] of trails)if(!active.has(id)&&trails.get(id)[0].every(p=>now-p.t>2500))trails.delete(id);
}

function drawMemory(now){
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=memory.length-1;i>=0;i--){const m=memory[i],age=(now-m.born)/1000,life=1-age/95;if(life<=0){memory.splice(i,1);continue}const r=10+age*.22+Math.sin(age+m.seed)*4;ctx.strokeStyle=m.color.replace(")",`,${life*.24})`).replace("rgb","rgba");ctx.fillStyle=m.color;ctx.globalAlpha=life*.16;ctx.shadowColor=m.color;ctx.shadowBlur=18;ctx.beginPath();for(let n=0;n<=22;n++){const a=n/22*Math.PI*2,rr=r+Math.sin(a*5+age)*3;n?ctx.lineTo(m.x+Math.cos(a)*rr,m.y+Math.sin(a)*rr):ctx.moveTo(m.x+Math.cos(a)*rr,m.y+Math.sin(a)*rr)}ctx.closePath();ctx.stroke();ctx.globalAlpha=life*.08;ctx.fill()}
  ctx.restore();ctx.globalAlpha=1;
}

function drawTrails(now){
  ctx.save();ctx.globalCompositeOperation="lighter";let colorIndex=0;
  for(const pair of trails.values()){const color=PALETTES[colorIndex++%PALETTES.length];for(const trail of pair){if(trail.length<2)continue;ctx.lineCap="round";for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],life=clamp(1-(now-b.t)/2300);ctx.strokeStyle=color;ctx.globalAlpha=life*.52;ctx.shadowColor=color;ctx.shadowBlur=demo?0:11;ctx.lineWidth=.6+life*3.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}}
  ctx.restore();ctx.globalAlpha=1;
}

function drawHands(bodies,now){
  ctx.save();ctx.globalCompositeOperation="lighter";
  bodies.forEach((body,i)=>{const color=PALETTES[body.index%PALETTES.length],inventory=inventoryFor(body.id);[[J.HandLeft,"left",body.left||0],[J.HandRight,"right",body.right||0]].forEach(([joint,side,state])=>{const p=point(body,joint);if(!p||(body.id==="demo"&&side==="right"))return;const gesture=inventory[side+"Gesture"],store=inventory[side],closed=state===3,r=17+Math.sin(now*.004+i)*3+motionEnergy*9;ctx.strokeStyle=closed?"#f1eee7":color;ctx.globalAlpha=closed?.9:.58;ctx.lineWidth=closed?2.8:1.5;ctx.shadowColor=color;ctx.shadowBlur=26;for(let n=0;n<2;n++){ctx.beginPath();ctx.arc(p.x,p.y,r+n*11,0,Math.PI*2);ctx.stroke()}if(closed&&gesture.since){const progress=clamp((now-gesture.since)/520);ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(p.x,p.y,r+18,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);ctx.stroke()}ctx.shadowBlur=0;ctx.globalCompositeOperation="source-over";ctx.globalAlpha=.72;ctx.fillStyle="#f1eee7";ctx.font="700 9px Segoe UI";ctx.textAlign="center";ctx.fillText(body.id==="demo"?`${store.length} ATOMS · CLICK TO COLLECT`:state===4?"RELEASE":closed?"HOLD":store.length?"LOWER TO RELEASE":"OPEN · SEEK",p.x,p.y+r+29);ctx.globalCompositeOperation="lighter"})});
  ctx.restore();ctx.globalAlpha=1;
}

function closestConnection(a,b){
  const ap=[point(a,J.HandLeft),point(a,J.HandRight)].filter(Boolean),bp=[point(b,J.HandLeft),point(b,J.HandRight)].filter(Boolean);let best=null;
  for(const p of ap)for(const q of bp){const d=Math.hypot(p.x-q.x,p.y-q.y);if(!best||d<best.d)best={p,q,d}}
  return best;
}

function drawConnection(bodies,dt,now){
  let target=0,connection=null;
  if(bodies.length>1){connection=closestConnection(bodies[0],bodies[1]);if(connection)target=clamp(1-connection.d/(width*.34),0,1)}
  fusion=lerp(fusion,target,clamp(dt*3.4));fused=fusion>.82;
  document.body.classList.toggle("fusing",fusion>.16);document.body.classList.toggle("fused",fused);
  if(!connection||fusion<.03)return;
  const {p,q}=connection,mx=(p.x+q.x)/2,my=(p.y+q.y)/2-Math.min(130,connection.d*.24);
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.lineCap="round";
  for(let layer=0;layer<5;layer++){const wobble=Math.sin(now*.003+layer)*12*fusion;ctx.strokeStyle=layer%2?"#56e5ff":"#a66cff";ctx.globalAlpha=(.08+fusion*.16)*(1-layer*.11);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18+layer*5;ctx.lineWidth=.7+fusion*(5-layer*.65);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(mx+wobble,my-layer*4,q.x,q.y);ctx.stroke()}
  for(let i=0;i<18;i++){const u=(i/18+now*.00018*(1+i%3))%1,om=1-u,xx=om*om*p.x+2*om*u*mx+u*u*q.x,yy=om*om*p.y+2*om*u*my+u*u*q.y;ctx.globalAlpha=.3+fusion*.6;ctx.fillStyle=i%2?"#fff":"#56e5ff";ctx.beginPath();ctx.arc(xx,yy,1.2+fusion*2.4,0,Math.PI*2);ctx.fill()}
  if(fused&&Math.random()<dt*4)pulses.push({x:mx,y:my,r:10,life:1});
  ctx.restore();ctx.globalAlpha=1;
}

function drawPulses(dt){
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=pulses.length-1;i>=0;i--){const p=pulses[i];p.r+=dt*210;p.life-=dt*.72;ctx.globalAlpha=Math.max(0,p.life)*.7;ctx.strokeStyle="#bff7ff";ctx.shadowColor="#56e5ff";ctx.shadowBlur=28;ctx.lineWidth=1+p.life*4;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();if(p.life<=0)pulses.splice(i,1)}
  ctx.restore();ctx.globalAlpha=1;
}

function syncPresence(bodies){
  const count=bodies.length;document.body.classList.toggle("present",count>0);
  const activeIds=new Set(bodies.map(body=>body.id));
  for(const [id,body] of lastVisibleBodies)if(!activeIds.has(id))addMemory(body);
  lastVisibleBodies=new Map(bodies.map(body=>[body.id,body]));
  lastBodyCount=count;
}

function render(now){
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  const live=now-frame.received<1200;
  let active=demo?demoFrame(dt):(live?frame:{tracked:false,bodies:[],mask:null,mw:384,mh:318});
  const bodies=active.tracked?active.bodies:[];
  if(!demo){if(active.mask)updateTexture(active.mask,active.mw,active.mh);else if(lastUploadedMask?.some(value=>value!==0))updateTexture(new Uint8Array(textureW*textureH),textureW,textureH);}
  updateMotion(bodies,dt);syncPresence(bodies);updateTrails(bodies,now);

  gl.useProgram(program);gl.uniform1f(uniforms.demo,demo?1:0);gl.uniform2f(uniforms.resolution,world.width,world.height);gl.uniform1f(uniforms.time,(now-startedAt)/1000);gl.uniform1f(uniforms.presence,bodies.length?1:0);gl.uniform1f(uniforms.stillness,stillness);gl.uniform1f(uniforms.motion,motionEnergy);gl.uniform1f(uniforms.fusion,fusion);gl.uniform1f(uniforms.mirror,mirror?1:0);gl.uniform2f(uniforms.offset,config.offsetX,config.offsetY);gl.uniform1f(uniforms.scale,config.scale);gl.uniform1f(uniforms.maskAspect,active.mw/active.mh);gl.drawArrays(gl.TRIANGLES,0,6);

  ctx.clearRect(0,0,width,height);drawMemory(now);drawMoleculeField(bodies,dt,now);drawTrails(now);drawHands(bodies,now);drawConnection(bodies,dt,now);drawPulses(dt);drawReactionVisual(now);updateAudio(bodies.length);
  const targets=handTargets(bodies),hasAtoms=targets.some(target=>target.store.length),isGrabbing=targets.some(target=>target.state===3);
  whisperEl.textContent=activeReaction?"REACTION IN PROGRESS":now<failedMixUntil?"UNSTABLE MIXTURE · LOWER A HAND TO RELEASE":fusion>.18?"JOIN HANDS · COMBINE YOUR ELEMENTS":isGrabbing?"KEEP YOUR FIST CLOSED · HOLD TO COLLECT ONE ELEMENT":hasAtoms?"BRING HANDS TOGETHER · OR LOWER A HAND TO RELEASE":stillness>.58?"STILLNESS REVEALS THE BONDS":"OPEN HAND ATTRACTS · CLOSE FIST TO COLLECT";
  if(demo){updateDemoControls();if(!activeReaction)whisperEl.textContent=hasAtoms?"CLICK MORE ATOMS · COMBINE WHEN YOUR RECIPE IS READY":"MOVE TO EXPLORE · CLICK AN ATOM TO COLLECT";}
  requestAnimationFrame(render);
}

function connect(){
  const events=new EventSource("/events");
  events.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type!=="body")return;const oldBodies=frame.bodies;const mask=decodeMask(data);frame={tracked:!!data.tracked,bodies:data.bodies||[],mask,mw:data.mw||384,mh:data.mh||318,received:performance.now(),oldBodies};if(mask)updateTexture(mask,frame.mw,frame.mh)}catch(_){}};
}

addEventListener("resize",resize);
document.getElementById("last-result").addEventListener("click",()=>{if(lastDiscovery)showDiscovery(lastDiscovery.recipe,lastDiscovery.preview)});
addEventListener("pointerdown",event=>{if(!event.target.closest?.("#demo-sound"))unlockAudio()},{capture:true});
document.getElementById("demo-sound").addEventListener("click",toggleSound);
function moveDemoHand(event){
  const hand=demoHands[selectedHand];hand.tx=clamp(event.clientX/innerWidth);hand.ty=clamp(event.clientY/innerHeight);
}
world.addEventListener("pointermove",event=>{if(demo)moveDemoHand(event)});
world.addEventListener("pointerdown",event=>{
  if(!demo||event.button!==0)return;
  moveDemoHand(event);collectDemoAtom(event);
});
addEventListener("pointerup",releaseDemoPointer);
addEventListener("pointercancel",releaseDemoPointer);
addEventListener("blur",releaseDemoPointer);
document.addEventListener("visibilitychange",()=>{if(document.hidden)releaseDemoPointer()});

document.getElementById("demo-combine").addEventListener("click",combineDemoHands);
document.getElementById("demo-release").addEventListener("click",()=>{releaseDemoPointer();demoRelease=true});
addEventListener("keydown",event=>{
  const key=event.key.toLowerCase(),step=event.shiftKey ? .02 : .006;
  if(discoveryEl.open&&key!=="s")return;
  if(key!=="s"&&!event.ctrlKey&&!event.metaKey&&!event.altKey)unlockAudio();
  if(key==="c")setCalibration(!calibrationActive);
  if(demo&&!event.repeat){

    if(key===" "&&event.target===document.body){event.preventDefault();combineDemoHands()}
    if(key==="x"){releaseDemoPointer();demoRelease=true}
  }
  if(key==="d"){demo=!demo;releaseDemoPointer();document.body.classList.toggle("demo",demo);resize()}
  if(key==="f")document.documentElement.requestFullscreen?.();
  if(key==="m"){mirror=!mirror;saveConfig()}
  if(key==="s"&&!event.repeat)toggleSound();
  if(key==="r"){memory=[];pulses=[];trails.clear()}
  if(!event.repeat&&/^[1-8]$/.test(key)){const recipe=RECIPES[Number(key)-1];beginReaction(recipe,width/2,height/2,[[]],performance.now(),true)}
  if(calibrationActive){
    if(key==="arrowleft")config.offsetX-=step;
    if(key==="arrowright")config.offsetX+=step;
    if(key==="arrowup")config.offsetY-=step;
    if(key==="arrowdown")config.offsetY+=step;
    if(key==="[")config.scale=clamp(config.scale-.015,.72,1.35);
    if(key==="]")config.scale=clamp(config.scale+.015,.72,1.35);
    if(key==="0")resetCalibration();
    if(key.startsWith("arrow")||key==="["||key==="]"){event.preventDefault();saveConfig()}
  }
});

syncSoundControl();document.body.classList.toggle("demo",demo);saveConfig();resize();if(localInstallation)connect();requestAnimationFrame(render);
