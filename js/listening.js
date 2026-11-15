var VERSION=2, TIME=300, FIRST_TIME=TIME, MAX_PLAYS=2, RATE=0.9;
var EVIDENCE = [
  {title:"Evidence 1 · The emergency call", lines:[
    {who:"Operator", t:"Emergency services. What is your emergency?"},
    {who:"Operator", t:"Hello? Can you hear me?"},
    {who:"Dr. Vargas", t:"Give me that watch! This is my house!"},
    {who:"Daniela", t:"Everybody can see the video now! Everybody knows the truth!"},
    {who:"Operator", t:"All units, go to forty-two Rose Street. Two women are fighting. Hurry, please."}],
   qs:[{q:"What is the address of the house?", opts:["12 Rose Street","42 Rose Street","42 Rome Street","24 Rose Street"], a:1},
       {q:"How many people are fighting?", opts:["One","Two","Three","Four"], a:1},
       {q:"What does Dr. Vargas want?", opts:["The phone","The video","The watch","The money"], a:2}]},
  {title:"Evidence 2 · A voicemail from the hospital", lines:[
    {who:"Nurse", t:"Hello, this is Nurse Paula from Saint Mary Hospital. This message is for Daniela. Your mother is very bad tonight. Please come now. She is in room three hundred and five. Thank you."}],
   qs:[{q:"Who is calling?", opts:["A doctor","A police officer","A nurse","Marta"], a:2},
       {q:"What is the room number?", opts:["315","503","350","305"], a:3},
       {q:"What does the nurse want Daniela to do?", opts:["Call the police","Come to the hospital now","Pay the bill","Bring the watch"], a:1}]},
  {title:"Evidence 3 · Video file: Test 14", lines:[
    {who:"Dr. Vargas", t:"Test fourteen. Patient: Marta. Product: test product, no label. Twenty units, the cheapest price. Nobody will ever know."}],
   qs:[{q:"What is the name of the patient?", opts:["Daniela","Paula","Marta","Vargas"], a:2},
       {q:"How many units does she use?", opts:["Twelve","Fourteen","Twenty","Forty"], a:2},
       {q:"What does she say at the end?", opts:["Everybody will know","Nobody will ever know","Nobody can help","I will never know"], a:1}]}
];
var TOTAL=0;EVIDENCE.forEach(function(e){TOTAL+=e.qs.length});

function fresh(){return {v:VERSION,name:"",attempt:0,started:false,finished:false,reason:"",score:0,token:true,plays:{},ans:{},left:0,endAt:0,startedAt:0,finishedAt:0}}

/* ---- audio ---- */
var synth=window.speechSynthesis||null,voices=[],playing=-1,playId=0,safety=null;
function loadVoices(){if(!synth)return;try{voices=synth.getVoices().filter(function(v){return /^en/i.test(v.lang)})}catch(e){voices=[]}}
if(synth){loadVoices();synth.onvoiceschanged=loadVoices}else{$("noVoice").hidden=false}
var CAST={"Operator":{i:0,p:.9},"Dr. Vargas":{i:1,p:.75},"Daniela":{i:2,p:1.3},"Nurse":{i:3,p:1.1}};
function playsLeft(k){return MAX_PLAYS-(S.plays[k]||0)}
function heard(k){return !synth||(S.plays[k]||0)>0}
function stopAudio(){playId++;playing=-1;clearTimeout(safety);try{synth&&synth.cancel()}catch(e){}}
function audioDone(id){if(id!==playId)return;playing=-1;clearTimeout(safety);renderEvidence()}
function play(k){
  if(!synth||playing>=0||playsLeft(k)<=0||!S.started||S.finished)return;
  S.plays[k]=(S.plays[k]||0)+1;save();
  var id=++playId;playing=k;renderEvidence();
  var ev=EVIDENCE[k],ind=$("spk"+k),words=0;
  try{synth.cancel()}catch(e){}
  ev.lines.forEach(function(l,n){
    words+=l.t.split(/\s+/).length;
    var u=new SpeechSynthesisUtterance(l.t),c=CAST[l.who]||{i:0,p:1};
    u.lang="en-US";u.rate=RATE;u.pitch=c.p;
    if(voices.length)u.voice=voices[c.i%voices.length];
    u.onstart=function(){if(id===playId)ind.innerHTML="Now speaking: <b>"+esc(l.who)+"</b>"};
    if(n===ev.lines.length-1){u.onend=function(){audioDone(id)};u.onerror=function(){audioDone(id)}}
    synth.speak(u);
  });
  /* if the browser never reports the end, unlock after the expected length */
  safety=setTimeout(function(){audioDone(id)},words/(150*RATE)*60000+ev.lines.length*900+3000);
}

/* ---- board ---- */
function answered(){return Object.keys(S.ans).length}
function renderProgress(){$("progress").textContent=answered()+" / "+TOTAL+" answered"}
function renderEvidence(){
  var live=S.started&&!S.finished;
  $("evidence").classList.toggle("locked",!S.started);
  $("evidence").innerHTML=EVIDENCE.map(function(ev,k){
    var left=playsLeft(k),open=live&&heard(k),showQs=open||S.finished||!live,done=0;
    ev.qs.forEach(function(q,j){if(S.ans[k+"-"+j])done++});
    var qs=ev.qs.map(function(q,j){
      var a=S.ans[k+"-"+j];
      return '<div class="lq"><p class="q">'+(j+1)+'. '+esc(q.q)+'</p><div class="opts">'+q.opts.map(function(o,i){
        var cls="";if(a&&a.p===i)cls=a.ok?" right":" picked-wrong";
        return '<button class="opt'+cls+'" type="button" data-k="'+k+'" data-j="'+j+'" data-i="'+i+'"'+(!open||a?" disabled":"")+'>'+esc(o)+'</button>'}).join("")+'</div></div>';
    }).join("");
    var status=playing===k?'<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Playing...':(synth?(left>0?"Plays left: <b>"+left+"</b>":"No plays left"):"");
    var fallback=!synth?'<div class="transcript on">'+ev.lines.map(function(l){return '<p><b>'+esc(l.who)+':</b> '+esc(l.t)+'</p>'}).join("")+'</div>':"";
    return '<div class="evidence'+(playing===k?' is-playing':'')+(done===ev.qs.length?' is-done':'')+'"><div class="ev-head"><h4>'+esc(ev.title)+' <span class="ev-count">'+done+' / '+ev.qs.length+'</span></h4>'+
      (synth?'<span class="plays">'+status+'</span><button class="play" type="button" data-play="'+k+'" aria-label="Play '+esc(ev.title)+'"'+(!live||playing>=0||left<=0?" disabled":"")+'>▶</button>':'')+
      '</div><div class="speaking" id="spk'+k+'"></div>'+fallback+
      (live&&!heard(k)?'<p class="lockmsg">🔒 Press ▶ and listen first. Then the 3 questions appear.</p>':'')+(showQs?qs:'')+'</div>';
  }).join("");
  document.querySelectorAll("[data-play]").forEach(function(b){b.onclick=function(){play(+b.getAttribute("data-play"))}});
  document.querySelectorAll("#evidence .opt").forEach(function(b){b.onclick=function(){answer(+b.dataset.k,+b.dataset.j,+b.dataset.i)}});
  renderProgress();
}
function answer(k,j,i){
  var key=k+"-"+j,q=EVIDENCE[k].qs[j];
  if(S.ans[key]||S.finished||!heard(k))return;
  if(i===q.a){S.ans[key]={p:i,ok:true};addScore(100);save();renderEvidence();checkDone()}
  else{
    S.ans[key]={p:i,ok:false};save();renderEvidence();
    offerRewind("That is not the correct answer.",function(){delete S.ans[key];save();renderEvidence()},checkDone);
  }
}
function checkDone(){if(answered()===TOTAL&&!S.finished)finish("done")}

/* ---- flow ---- */
function onStart(){startClock(TIME,"Time left",function(){finish("time")});renderEvidence()}
function resume(){if(remaining()<=0)finish("time");else{runClock(TIME,"Time left",function(){finish("time")});renderEvidence()}}
function renderAll(){renderEvidence();$("result").hidden=true}
function finish(reason){
  if(S.finished)return;
  S.finished=true;S.reason=reason;S.finishedAt=Date.now();
  stopClock();stopAudio();closeModal();save();renderEvidence();showResult();flash();
}
function showResult(){
  stopClock();drawClock(remaining(),S.reason==="time"?"Time's up":"Finished");
  var ok=0;Object.keys(S.ans).forEach(function(k){if(S.ans[k].ok)ok++});
  var used=Math.min(TIME,Math.round((S.finishedAt-S.startedAt)/1000));
  var rv=EVIDENCE.map(function(ev,k){
    return '<div class="rv"><h5>'+esc(ev.title)+'</h5><p class="tr">'+ev.lines.map(function(l){return esc(l.who)+': '+esc(l.t)}).join("<br>")+'</p><ul>'+
      ev.qs.map(function(q,j){var a=S.ans[k+"-"+j];
        var mine=a?esc(q.opts[a.p]):"<em>no answer</em>";
        return '<li>'+esc(q.q)+' <br>Your answer: '+(a&&a.ok?'<span class="okc">✓ '+mine+'</span>':'<span class="badc">✗ '+mine+'</span> · Correct: '+esc(q.opts[q.a]))+'</li>'}).join("")+'</ul></div>';
  }).join("");
  $("result").innerHTML='<div class="big">'+(S.reason==="time"?"Time's up!":"Case closed!")+'</div>'+
    '<p>Detective <strong>'+esc(S.name)+'</strong> · Attempt '+S.attempt+'</p>'+
    '<div class="stats"><div class="stat"><span>Correct</span><b>'+ok+' / '+TOTAL+'</b></div><div class="stat"><span>Score</span><b>'+S.score+'</b></div><div class="stat"><span>Time used</span><b>'+mmss(used)+'</b></div><div class="stat"><span>Left the page</span><b>'+S.left+'</b></div></div>'+
    '<p class="meta">Rewind: '+(S.token?"not used":"used")+' · Finished: '+fmtDate(S.finishedAt)+'</p>'+
    '<p>Take a screenshot of this box and send it to your teacher.</p>'+
    '<div class="row" style="margin-top:10px"><button class="btn line" id="again" type="button">Try again (new attempt)</button></div>'+
    '<h3>Review the answers</h3>'+rv;
  $("result").hidden=false;
  afterResult();
  $("doneCard").scrollIntoView({behavior:"smooth",block:"start"});
}
