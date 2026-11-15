var PAGE=document.body.getAttribute("data-page");
var KEY="l5m-"+PAGE;
var S;
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function store(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v))}catch(e){}}
function recall(k){try{var v=localStorage.getItem(KEY+k);return v?JSON.parse(v):null}catch(e){return null}}
function save(){store("-game",S)}
function attempts(){return recall("-attempts")||0}
function mmss(s){s=Math.max(0,s);var m=Math.floor(s/60),x=s%60;return (m<10?"0":"")+m+":"+(x<10?"0":"")+x}
function fmtDate(ts){try{return new Date(ts).toLocaleString()}catch(e){return ""}}

function renderScore(pop){var el=$("score");el.textContent=S.score;if(pop){el.classList.remove("score-pop");void el.offsetWidth;el.classList.add("score-pop")}}
function addScore(n){S.score=Math.max(0,S.score+n);renderScore(true);if(n>0){FX.points(n);FX.play("good")}}
function renderToken(){$("tokenChip").classList.toggle("token-used",!S.token);$("tokenText").textContent=S.token?"Rewind ready":"Rewind used"}
function pageState(){var b=document.body;b.classList.toggle("started",!!(S&&S.started));b.classList.toggle("finished",!!(S&&S.finished))}
function flash(){var f=$("flash");f.classList.remove("go");void f.offsetWidth;f.classList.add("go")}

/* ---- dialog ---- */
var mYes=null,mNo=null;
function ask(title,text,yesLabel,noLabel,onYes,onNo){
  $("mTitle").textContent=title;$("mText").textContent=text;
  $("mYes").hidden=!yesLabel;$("mYes").textContent=yesLabel||"";
  $("mNo").textContent=noLabel;
  mYes=onYes;mNo=onNo;$("modal").classList.add("on");
  (yesLabel?$("mYes"):$("mNo")).focus();
}
function closeModal(){$("modal").classList.remove("on");mYes=mNo=null}
$("mYes").onclick=function(){var f=mYes;closeModal();if(f)f()};
$("mNo").onclick=function(){var f=mNo;closeModal();if(f)f()};
function offerRewind(text,onRetry,onKeep){
  FX.play("bad");FX.shake();
  if(!S.token){ask("Wrong!",text+" You have no Rewind left, so this answer stays wrong.",null,"Continue",null,onKeep);return}
  ask("Wrong!",text+" Do you want to use your only Rewind and try again?","Use my Rewind","No, continue",
    function(){S.token=false;renderToken();flash();FX.play("rewind");save();onRetry()},onKeep);
}

/* ---- clock: based on real time, cannot be paused ---- */
var tick=null,clockTotal=0;
function remaining(){return Math.max(0,Math.ceil((S.endAt-Date.now())/1000))}
function drawClock(sec,label){
  $("tTime").textContent=mmss(sec);$("dialTime").textContent=mmss(sec);
  if(label){$("tLabel").textContent=label;$("dialLabel").textContent=label}
  $("tChip").classList.toggle("warn",sec>0&&sec<=60&&!!tick);
  $("dial").style.setProperty("--p",clockTotal?sec/clockTotal:1);
  document.documentElement.style.setProperty("--clock-p",clockTotal&&tick?sec/clockTotal:0);
  FX.timer(mmss(sec),clockTotal?sec/clockTotal:1,sec<=60&&!!tick,label||null,sec,!!tick);
}
function stopClock(){clearInterval(tick);tick=null;$("tChip").classList.remove("warn");document.documentElement.style.setProperty("--clock-p",0)}
function runClock(total,label,onEnd){
  stopClock();clockTotal=total;
  tick=setInterval(function(){var r=remaining();drawClock(r);if(r<=0){stopClock();flash();onEnd()}},250);
  drawClock(remaining(),label);
}
function startClock(total,label,onEnd){S.endAt=Date.now()+total*1000;save();runClock(total,label,onEnd)}

/* ---- gate ---- */
function showGate(){
  $("gate").hidden=false;$("playerChip").hidden=true;$("doneCard").hidden=true;$("restart").hidden=true;
  var a=attempts();$("attemptNote").textContent=a?"This device has started this game "+a+" time"+(a===1?"":"s")+". Your teacher can see the attempt number.":"";
  $("startBtn").disabled=$("nameIn").value.trim().length<2;
  pageState();
}
function hideGate(){$("gate").hidden=true;$("playerChip").hidden=false;$("playerName").textContent=S.name;$("doneCard").hidden=true;$("restart").hidden=!!S.finished;pageState()}
function confirmAgain(){ask("Play again?","A new attempt starts. Your teacher will see that this is attempt "+(attempts()+1)+".","Yes, play again","Cancel",tryAgain,null)}
function afterResult(){
  $("restart").hidden=true;$("doneCard").hidden=false;pageState();
  $("doneMeta").textContent=S.name+" · Attempt "+S.attempt+" · Score "+S.score+" · "+fmtDate(S.finishedAt);
  var a=$("again");if(a)a.onclick=confirmAgain;
}
$("againTop").onclick=confirmAgain;
$("seeResult").onclick=function(){$("result").scrollIntoView({behavior:"smooth",block:"start"})};
$("restart").onclick=function(){ask("Start over?","This game stops now and a new attempt starts. Your teacher will see that this is attempt "+(attempts()+1)+".","Yes, start over","Keep playing",function(){if(typeof stopAudio==="function")stopAudio();tryAgain()},null)};
$("nameIn").addEventListener("input",function(){var ok=this.value.trim().length>=2;$("startBtn").disabled=!ok;var h=$("startHint");if(h)h.textContent=ok?"Ready? The clock starts as soon as you press the button.":"Write your name to unlock the button. The clock starts right away."});
$("gateForm").onsubmit=function(e){
  e.preventDefault();var n=$("nameIn").value.trim().replace(/\s+/g," ");
  if(n.length<2){$("nameIn").focus();return}
  S=fresh();S.name=n;S.attempt=attempts()+1;store("-attempts",S.attempt);
  S.started=true;S.startedAt=Date.now();
  hideGate();renderScore();renderToken();flash();FX.play("start");onStart();save();
  var first=document.querySelector("[data-first]");if(first)first.scrollIntoView({behavior:"smooth",block:"start"});
};
document.addEventListener("visibilitychange",function(){if(document.hidden&&S&&S.started&&!S.finished){S.left++;save()}});

function tryAgain(){
  try{localStorage.removeItem(KEY+"-game")}catch(e){}
  stopClock();closeModal();S=fresh();renderScore();renderToken();renderAll();showGate();clockTotal=FIRST_TIME;drawClock(FIRST_TIME,"Clock");
  window.scrollTo({top:0,behavior:"smooth"});$("nameIn").focus();
}

function boot(hot){
  var saved=(hot&&hot.started)?hot:recall("-game");
  if(saved&&saved.started&&saved.v===VERSION){
    S=saved;$("nameIn").value=S.name;hideGate();renderScore();renderToken();
    if(S.finished){renderAll();showResult()}else{renderAll();resume()}
  } else {
    S=fresh();renderAll();showGate();clockTotal=FIRST_TIME;drawClock(FIRST_TIME,"Clock");
  }
}
