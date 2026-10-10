let magModel=null,modelText="";
let currentPosition=null;
let waypoints=[{name:"HENGCHUN",lat:"N2152.00",lon:"E12022.05",eta:"",snapshot:null,tracking:null}];
let currentTarget=0,candidateTarget=0,watchId=null;
const $=id=>document.getElementById(id),waypointList=$("waypointList");
const CAPTURE_RADIUS_NM=0.3,INCREASE_EPS_NM=0.002,INCREASE_FIXES=2;

function fmtCoord(raw){let s=(raw||"").trim().toUpperCase().replace(/\s/g,"");if(!s)return"";let d=s[0];if(!["N","S","E","W"].includes(d))return s;let b=s.slice(1);if(!/^\d+(?:\.\d+)?$/.test(b))return s;if(b.includes("."))return d+b;let n=(d==="N"||d==="S")?6:7,k=(d==="N"||d==="S")?2:3;if(b.length===n)return d+b.slice(0,k+2)+"."+b.slice(k+2);return d+b}
function wpName(i){let w=waypoints[i];return(w&&w.name.trim())||`WP${i+1}`}
function invalidate(i){waypoints[i].snapshot=null;waypoints[i].tracking=null}

function render(){
  waypointList.innerHTML="";
  waypoints.forEach((w,i)=>{
    let[h="",m="",s=""]=w.eta?w.eta.split(":"):[];
    let box=document.createElement("div");box.className="wpBox";
    box.innerHTML=`<div class="wpHead"><b>WP${i+1}</b><div class="wpTools"><button class="insert del" data-i="${i}">INSERT BEFORE</button><button class="del delete" data-i="${i}">DELETE</button></div></div><label class="fieldLabel">WAYPOINT NAME<input class="wpInput" value="${escapeHtml(w.name)}" placeholder="HENGCHUN" data-i="${i}" data-f="name"></label><div class="fieldGrid"><label class="fieldLabel">LAT<input class="wpInput coord" value="${escapeHtml(w.lat)}" placeholder="N222000" data-i="${i}" data-f="lat"></label><label class="fieldLabel">LON<input class="wpInput coord" value="${escapeHtml(w.lon)}" placeholder="E1203050" data-i="${i}" data-f="lon"></label></div><label class="fieldLabel">MAG VAR · +W / −E · blank = WMM or 0<input class="wpInput" inputmode="decimal" value="${escapeHtml(w.magVar)}" placeholder="0" data-i="${i}" data-f="magVar"></label><label class="fieldLabel">ETA (24H)</label><div class="etaInputs"><input class="etaPart hh" inputmode="numeric" maxlength="2" placeholder="HH" value="${h}" data-i="${i}"><span>:</span><input class="etaPart mm" inputmode="numeric" maxlength="2" placeholder="MM" value="${m}" data-i="${i}"><span>:</span><input class="etaPart ss" inputmode="numeric" maxlength="2" placeholder="SS" value="${s}" data-i="${i}"></div>`;
    let leg=document.createElement("div");leg.className="legSummary";leg.dataset.leg=i;box.appendChild(leg);waypointList.appendChild(box)
  });
  waypointList.querySelectorAll(".wpInput").forEach(x=>{x.oninput=()=>{let i=+x.dataset.i;waypoints[i][x.dataset.f]=x.value.toUpperCase();invalidate(i);if(x.dataset.f==="lat"||x.dataset.f==="lon") {if(i+1<waypoints.length)invalidate(i+1)}updateLegs();updateSelector();if(i===currentTarget){active();calc()}};if(x.classList.contains("coord"))x.onblur=()=>{let i=+x.dataset.i;x.value=fmtCoord(x.value);waypoints[i][x.dataset.f]=x.value;invalidate(i);updateLegs();calc()}});
  waypointList.querySelectorAll(".etaPart").forEach(x=>x.oninput=()=>{let box=x.closest(".wpBox"),i=+x.dataset.i,h=digits(box,".hh"),m=digits(box,".mm"),s=digits(box,".ss");waypoints[i].eta=(h.length===2&&m.length===2&&s.length===2&&+h<24&&+m<60&&+s<60)?`${h}:${m}:${s}`:"";invalidate(i);if(i===currentTarget)calc()});
  waypointList.querySelectorAll(".delete").forEach(x=>x.onclick=()=>del(+x.dataset.i));
  waypointList.querySelectorAll(".insert").forEach(x=>x.onclick=()=>insert(+x.dataset.i));
  updateSelector();active();updateLegs()
}
function escapeHtml(v){return(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function digits(box,sel){let e=box.querySelector(sel);e.value=e.value.replace(/\D/g,"").slice(0,2);return e.value}
function active(){$("activeWP").textContent=wpName(currentTarget);$("bearingLabel").textContent="BEARING TO "+wpName(currentTarget)}
function updateSelector(){candidateTarget=Math.max(0,Math.min(candidateTarget,waypoints.length-1));$("selectBtn").textContent=`SELECT ${wpName(candidateTarget)}`}

$("addBtn").onclick=()=>{waypoints.push({name:"",lat:"",lon:"",eta:"",snapshot:null,tracking:null});candidateTarget=waypoints.length-1;render()};
function del(i){if(waypoints.length===1)return alert("At least one waypoint is required.");waypoints.splice(i,1);if(i<waypoints.length)invalidate(i);if(currentTarget>i)currentTarget--;else if(currentTarget>=waypoints.length)currentTarget=waypoints.length-1;if(candidateTarget>i)candidateTarget--;else if(candidateTarget>=waypoints.length)candidateTarget=waypoints.length-1;render();calc()}
$("prevBtn").onclick=()=>{candidateTarget=(candidateTarget+waypoints.length-1)%waypoints.length;updateSelector()};
$("nextBtn").onclick=()=>{candidateTarget=(candidateTarget+1)%waypoints.length;updateSelector()};
$("selectBtn").onclick=()=>{currentTarget=candidateTarget;active();calc();let b=$("selectBtn");b.textContent=`${wpName(currentTarget)} SELECTED`;setTimeout(()=>{updateSelector()},700)};

$("gpsBtn").onclick=()=>{if(!navigator.geolocation)return alert("GPS is not supported.");if(watchId!==null)return;$("status").textContent="GPS STARTING...";watchId=navigator.geolocation.watchPosition(p=>{currentPosition=p;$("status").textContent="●  GPS ACTIVE";trackWaypointPass(p);calc()},e=>{$("status").textContent="GPS ERROR";alert("GPS error: "+e.message)},{enableHighAccuracy:true,maximumAge:1000,timeout:10000})};

function coord(v){
 v=fmtCoord(v);if(!/^[NSEW]\d+\.\d+$/.test(v))return null;
 let d=v[0],n=Number(v.slice(1)),deg=Math.floor(n/100),min=n-deg*100,max=/[NS]/.test(d)?90:180;
 if(!Number.isFinite(n)||min>=60||deg>max||(deg===max&&min>0))return null;
 return (d==="S"||d==="W"?-1:1)*(deg+min/60)
}
function point(w){if(!w||!/^\s*[NS]/i.test(w.lat)||!/^\s*[EW]/i.test(w.lon))return null;let a=coord(w.lat),b=coord(w.lon);return a===null||b===null?null:[a,b]}
function variation(w,position){let raw=String(w.magVar??"").trim();if(raw){let n=Number(raw);return Number.isFinite(n)?n:null;}if(!magModel)return 0;let pt=position||point(w);if(!pt)return null;try{let d=new Date(),date=String(d.getFullYear())+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0"),field=magModel.field(pt[0],pt[1],0,decimalYear(date));if(field.h<2000)throw Error("地磁水平場過弱，請手填磁差");$("modelStatus").textContent=magModel.name+" · TODAY · SEA LEVEL 0 · MANUAL OVERRIDE";return -field.declination;}catch(e){$("modelStatus").textContent=e.message;return null;}}
function bearing(a,b,c,d){let r=Math.PI/180,p=a*r,q=c*r,l=(d-b)*r;return (Math.atan2(Math.sin(l)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(l))/r+360)%360}
function angle(n){return String(Math.round((n%360+360)%360)%360).padStart(3,"0")+"°"}
function updateLegs(){document.querySelectorAll(".legSummary").forEach(e=>{let i=+e.dataset.leg;e.hidden=i===0;if(i===0)return;let a=point(waypoints[i-1]),b=point(waypoints[i]),v=variation(waypoints[i]);let label=wpName(i-1)+" → "+wpName(i);e.textContent=label+" · "+(a&&b?dist(...a,...b).toFixed(1)+" NM":"--- NM")+" · MC "+(a&&b&&dist(...a,...b)>0.000001&&v!==null?angle(bearing(...a,...b)+v):"---")})}
function navState(w,lat,lon){let b=point(w),i=waypoints.indexOf(w),a=i>0?point(waypoints[i-1]):null,v=variation(w,[lat,lon]),out={trueBearing:"---",magBearing:"---",crossTrack:"---",crossTrackYD:"---"};if(!b)return out;
 if(dist(lat,lon,...b)>0.000001){let t=bearing(lat,lon,...b);out.trueBearing=angle(t);out.magBearing=v===null?"---":angle(t+v)}
 if(a&&dist(...a,...b)>0.000001){let d=dist(...a,lat,lon)/3440.065,r=Math.PI/180,x=Math.asin(Math.max(-1,Math.min(1,Math.sin(d)*Math.sin((bearing(...a,lat,lon)-bearing(...a,...b))*r))))*3440.065,n=Math.abs(x).toFixed(2);out.crossTrackYD=(Math.abs(x)*1852/0.9144<.5?"":x<0?"L ":"R ")+Math.round(Math.abs(x)*1852/0.9144)+" YD";out.crossTrack=n==="0.00"?"0.00":x<0?`L${n} ▶️`:`◀️ R${n}`}
 return out
}
function dist(a,b,c,d){let R=3440.065,r=x=>x*Math.PI/180,da=r(c-a),dl=r(d-b),q=Math.sin(da/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q))}
function clock(d){return[String(d.getHours()).padStart(2,"0"),String(d.getMinutes()).padStart(2,"0"),String(d.getSeconds()).padStart(2,"0")].join(":")}
function hms(sec){sec=Math.max(0,Math.round(Math.abs(sec)));let h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function etaDate(text,now){let[h,m,s]=text.split(":").map(Number),d=new Date(now);d.setHours(h,m,s,0);return d}
function blankFlight(){$("targetETA").textContent=$("estArrival").textContent=$("timeDifference").textContent=$("distance").textContent=$("timeRemaining").textContent=$("currentGsTime").textContent=$("requiredGS").textContent=$("gsCorrection").textContent="---"}
function showState(v){for(let k of ["trueBearing","magBearing","crossTrack","crossTrackYD"])$(k).textContent=v[k]||"---";$("position").textContent=v.position;$("currentTime").textContent=v.currentTime;$("currentGS").textContent=v.currentGS;$("targetETA").textContent=v.targetETA;$("estArrival").textContent=v.estArrival;$("timeDifference").textContent=v.timeDifference;$("distance").textContent=v.distance;$("timeRemaining").textContent=v.timeRemaining;$("currentGsTime").textContent=v.currentGsTime;$("requiredGS").textContent=v.requiredGS;$("gsCorrection").textContent=v.gsCorrection}

function sampleOf(p,D){return{latitude:p.coords.latitude,longitude:p.coords.longitude,speed:p.coords.speed,timestamp:p.timestamp||Date.now(),distance:D}}
function passageState(w,s){
  let now=new Date(s.timestamp),kt=s.speed!==null?s.speed*1.94384:null,D=s.distance,predicted=null,currentGsTime="---",estArrival=clock(now);
  if(kt!==null&&kt>0){let travel=D/kt*3600;currentGsTime=hms(travel);predicted=new Date(now.getTime()+travel*1000);estArrival=clock(predicted)}
  let state={position:`${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}`,currentTime:clock(now),currentGS:kt!==null?kt.toFixed(1):"---",targetETA:w.eta||"---",estArrival,timeDifference:"---",distance:D.toFixed(2),timeRemaining:w.eta?"00:00:00":"SET ETA",currentGsTime,requiredGS:"---",gsCorrection:"---"};
  if(w.eta){let eta=etaDate(w.eta,now),diff=(now-eta)/1000,rem=(eta-now)/1000;state.timeDifference=Math.abs(diff)<.5?"ON TIME":`${diff<0?"A":"B"} ${hms(diff)}`;state.timeRemaining=rem>0?hms(rem):"00:00:00";if(rem>0){let req=D/(rem/3600);state.requiredGS=req.toFixed(1);if(kt!==null)state.gsCorrection=(req>=kt?"+":"")+(req-kt).toFixed(1)}}
  return Object.assign(state,navState(w,s.latitude,s.longitude))
}
function trackWaypointPass(p){
  let w=waypoints[currentTarget];if(!w||w.snapshot)return;let pt=point(w);if(!pt)return;let[la,lo]=pt;
  let D=dist(p.coords.latitude,p.coords.longitude,la,lo),t=w.tracking;
  if(!t){if(D>CAPTURE_RADIUS_NM)return;w.tracking={minDistance:D,best:sampleOf(p,D),previousDistance:D,increases:0};return}
  if(D<t.minDistance){t.minDistance=D;t.best=sampleOf(p,D)}
  if(D>t.previousDistance+INCREASE_EPS_NM)t.increases++;else if(D<t.previousDistance-INCREASE_EPS_NM)t.increases=0;
  t.previousDistance=D;
  if(t.increases>=INCREASE_FIXES&&t.minDistance<=CAPTURE_RADIUS_NM){w.snapshot=passageState(w,t.best);w.tracking=null}
}

function calc(){
  let now=new Date(),w=waypoints[currentTarget];$("currentTime").textContent=clock(now);$("targetETA").textContent=w&&w.eta?w.eta:"---";
  if(w&&w.snapshot){showState(w.snapshot);return}
  if(!currentPosition||!w){$("position").textContent=currentPosition?`${currentPosition.coords.latitude.toFixed(6)}, ${currentPosition.coords.longitude.toFixed(6)}`:"---";$("currentGS").textContent=currentPosition&&currentPosition.coords.speed!==null?(currentPosition.coords.speed*1.94384).toFixed(1):"---";return}
  let c=currentPosition.coords,la=coord(w.lat),lo=coord(w.lon),position=`${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`,currentGS=c.speed!==null?(c.speed*1.94384).toFixed(1):"---";$("position").textContent=position;$("currentGS").textContent=currentGS;
  if(!point(w)){blankFlight();for(let k of ["trueBearing","magBearing","crossTrack","crossTrackYD"])$(k).textContent="---";$("position").textContent=position;$("currentTime").textContent=clock(now);$("currentGS").textContent=currentGS;return}
  let D=dist(c.latitude,c.longitude,la,lo),kt=c.speed!==null?c.speed*1.94384:null,predicted=null,currentGsTime="---",estArrival="---";
  if(kt!==null&&kt>0){let travel=D/kt*3600;currentGsTime=hms(travel);predicted=new Date(now.getTime()+travel*1000);estArrival=clock(predicted)}
  let state={position,currentTime:clock(now),currentGS,targetETA:w.eta||"---",estArrival,timeDifference:"---",distance:D.toFixed(2),timeRemaining:w.eta?"---":"SET ETA",currentGsTime,requiredGS:"---",gsCorrection:"---"};
  if(w.eta){let eta=etaDate(w.eta,now),rem=(eta-now)/1000;if(predicted){let diff=(predicted-eta)/1000;state.timeDifference=Math.abs(diff)<.5?"ON TIME":`${diff<0?"A":"B"} ${hms(diff)}`}
    if(rem>0){state.timeRemaining=hms(rem);let req=D/(rem/3600);state.requiredGS=req.toFixed(1);if(kt!==null)state.gsCorrection=(req>=kt?"+":"")+(req-kt).toFixed(1)}
    else state.timeRemaining="00:00:00"
  }
  showState(Object.assign(state,navState(w,c.latitude,c.longitude)))
}
restore();setInterval(()=>{calc();updateLegs()},1000);render();calc();

function cleanPlan(){return {format:"required-gs-plan",version:1,currentTarget,candidateTarget,waypoints:waypoints.map(w=>({name:w.name,lat:w.lat,lon:w.lon,eta:w.eta,magVar:w.magVar??""}))};}
function saveLocal(){try{localStorage.setItem("required-gs-plan-v1",JSON.stringify(cleanPlan()));$("saveStatus").textContent="INPUTS SAVED ON THIS DEVICE";}catch{$("saveStatus").textContent="SAVE FAILED · PLEASE EXPORT PLAN";}}
function validatePlan(t,draft=false){if(t?.format!=="required-gs-plan"||t.version!==1||!Array.isArray(t.waypoints)||!t.waypoints.length||t.waypoints.length>2000)throw Error("Invalid plan file");return t.waypoints.map(w=>{for(const k of ["name","lat","lon","eta","magVar"])if(w[k]!=null&&(typeof w[k]!=="string"||w[k].length>100))throw Error("Invalid waypoint field");if(w.eta&&!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(w.eta))throw Error("Invalid ETA");if(w.magVar&&(!Number.isFinite(Number(w.magVar))||Math.abs(Number(w.magVar))>180))throw Error("Invalid magnetic variation");const q={name:w.name||"",lat:w.lat||"",lon:w.lon||"",eta:w.eta||"",magVar:w.magVar||"",snapshot:null,tracking:null};if(!draft&&(q.lat&&(!/^[NS]/i.test(q.lat)||coord(q.lat)===null)||q.lon&&(!/^[EW]/i.test(q.lon)||coord(q.lon)===null)))throw Error("Invalid coordinate");return q;});}
function applyPlan(t,draft=false){const checked=validatePlan(t,draft);waypoints=checked;currentTarget=Number.isInteger(t.currentTarget)?Math.max(0,Math.min(t.currentTarget,waypoints.length-1)):0;candidateTarget=Number.isInteger(t.candidateTarget)?Math.max(0,Math.min(t.candidateTarget,waypoints.length-1)):currentTarget;}
function restore(){try{const raw=localStorage.getItem("required-gs-plan-v1");if(raw){applyPlan(JSON.parse(raw),true);$("saveStatus").textContent="PREVIOUS INPUTS RESTORED · START GPS TO TRACK";}const text=localStorage.getItem("required-gs-wmm-v1");if(text){magModel=new MagneticModel(text);modelText=text;$("modelStatus").textContent=magModel.name+" · TODAY · SEA LEVEL 0 · MANUAL OVERRIDE";}}catch(e){$("saveStatus").textContent="RESTORE FAILED · "+e.message;}}
function insert(i){waypoints.splice(i,0,{name:"",lat:"",lon:"",eta:"",magVar:"",snapshot:null,tracking:null});if(currentTarget>=i)currentTarget++;if(candidateTarget>=i)candidateTarget++;if(i+1<waypoints.length)invalidate(i+1);render();calc();saveLocal();}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function pick(accept,fn){const el=document.createElement("input");el.type="file";el.accept=accept;el.onchange=async()=>{try{const f=el.files[0];if(!f)return;if(f.size>2e6)throw Error("File too large");await fn(await f.text());}catch(e){alert(e.message);}};el.click();}
$("exportBtn").onclick=()=>download("required-gs-plan.json",JSON.stringify(cleanPlan(),null,2),"application/json");
$("importBtn").onclick=()=>pick(".json",text=>{const t=JSON.parse(text);validatePlan(t);if(!confirm("Replace current waypoints and settings?"))return;applyPlan(t);render();calc();saveLocal();});
$("modelBtn").onclick=()=>pick(".cof,.COF",text=>{const candidate=new MagneticModel(text);localStorage.setItem("required-gs-wmm-v1",text);magModel=candidate;modelText=text;waypoints.forEach((_,i)=>invalidate(i));$("modelStatus").textContent=candidate.name+" · TODAY · SEA LEVEL 0 · MANUAL OVERRIDE";updateLegs();calc();});
$("newPlanBtn").onclick=()=>{if(!confirm("開始新航線？目前航線與凍結紀錄將清除，WMM 保留。需要備份請先按 EXPORT PLAN。"))return;if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}currentPosition=null;waypoints=[{name:"",lat:"",lon:"",eta:"",magVar:"",snapshot:null,tracking:null}];currentTarget=0;candidateTarget=0;$("status").textContent="GPS OFF";render();calc();saveLocal();};
document.addEventListener("input",saveLocal);document.addEventListener("focusout",saveLocal);document.addEventListener("click",e=>{if(e.target.closest("#addBtn,.delete,#prevBtn,#nextBtn,#selectBtn"))saveLocal();});addEventListener("pagehide",saveLocal);
