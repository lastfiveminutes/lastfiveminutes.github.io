var VERSION=3, DIARY_T=180, BUILD_T=300, FIRST_TIME=DIARY_T, VERB_PTS=20, SENT_PTS=30;
var DIARY = [
  ["Tonight I"," the wall of Dr. Vargas's house.","climb","climbed"],
  ["A camera"," and a red light pointed at me.","turn","turned"],
  ["I"," the watch and went back five minutes.","press","pressed"],
  ["In the kitchen I"," a paper with a clue.","find","found"],
  ["The next night I"," to the office.","go","went"],
  ["I"," a pale girl in the mirror.","see","saw"],
  ["Dr. Vargas"," back early!","come","came"],
  ["She"," a knife from the desk.","take","took"],
  ["The second time, I"," away before she arrived.","run","ran"],
  ["I"," afraid, but I didn't stop.","feel","felt"]
];
/* Mission 2: build the new ending. Each sentence has one trap word (not past simple). */
var BUILD = [
  {w:["Daniela","picked","up","the","watch","from","the","floor."], trap:"pick", alt:["Daniela picked the watch up from the floor."]},
  {w:["She","went","back","five","minutes","to","the","office."], trap:"go", alt:[]},
  {w:["This","time","she","hid","behind","the","door."], trap:"hide", alt:[]},
  {w:["Dr.","Vargas","came","in","but","didn't","see","her."], trap:"come", alt:[]},
  {w:["Daniela","called","the","police","and","they","arrived","quickly."], trap:"call", alt:[]}
];

function shuffled(n){var a=[];for(var i=0;i<n;i++)a.push(i);for(var j=n-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),t=a[j];a[j]=a[k];a[k]=t}return a}
function tiles(i){return BUILD[i].w.concat([BUILD[i].trap])}
function rightText(i){return BUILD[i].w.join(" ")}
function fresh(){
  return {v:VERSION,name:"",attempt:0,started:false,finished:false,reason:"",score:0,token:true,phase:"",diary:{},
    order:BUILD.map(function(b,i){return shuffled(tiles(i).length)}),bi:0,placed:[],built:{},left:0,endAt:0,startedAt:0,finishedAt:0};
}

/* ---- mission 1: diary ---- */
function diaryCount(){return Object.keys(S.diary).length}
function diaryOk(){return DIARY.filter(function(d,i){return S.diary[i]&&S.diary[i].ok}).length}
function renderDiary(){
  var live=S.started&&!S.finished&&S.phase==="diary";
  $("diarySec").classList.toggle("locked",!live);
  $("diaryTag").textContent=S.phase==="diary"?"Mission 1 · in progress":(S.phase?"Mission 1 · closed":"Locked · starts with the clock");
  $("diaryList").innerHTML=DIARY.map(function(d,i){
    var a=S.diary[i],st=a?(a.ok?"right":"wrong"):"";
    return '<li class="dl '+st+'"><form class="dline" data-i="'+i+'"><span class="dn">'+(i+1)+'</span>'+
      '<p class="ds">'+esc(d[0])+' <span class="blank"><input type="text" id="d'+i+'" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Past simple of '+d[2]+'"'+(a?' value="'+esc(a.v)+'"':'')+(a||!live?" disabled":"")+'><small>'+esc(d[2])+'</small></span>'+esc(d[1])+
      (a&&!a.ok?' <span class="fix">→ '+esc(d[3])+'</span>':'')+'</p>'+
      '<button class="dchk" type="submit"'+(a||!live?" disabled":"")+' aria-label="Check verb '+(i+1)+'">'+(a?(a.ok?"✓":"✗"):"Check")+'</button></form></li>'}).join("");
  document.querySelectorAll(".dline").forEach(function(f){f.onsubmit=function(e){e.preventDefault();checkVerb(+f.getAttribute("data-i"))}});
  $("diaryProg").textContent=diaryCount()+" / "+DIARY.length+" verbs";
  $("diaryBar").style.width=(diaryCount()/DIARY.length*100)+"%";
  $("diaryNext").disabled=!live;
}
function checkVerb(i){
  if(S.diary[i]||S.phase!=="diary")return;
  var d=DIARY[i],el=$("d"+i),v=el.value.trim().toLowerCase().replace(/\s+/g," ");
  if(!v){el.focus();return}
  if(v===d[3]){S.diary[i]={v:v,ok:true};addScore(VERB_PTS);save();renderDiary();afterVerb()}
  else{
    S.diary[i]={v:v,ok:false};save();renderDiary();
    offerRewind('"'+v+'" is not the past of "'+d[2]+'".',function(){delete S.diary[i];save();renderDiary();$("d"+i).focus()},afterVerb);
  }
}
function afterVerb(){
  if(diaryCount()===DIARY.length){setTimeout(endDiary,900);return}
  var next=DIARY.findIndex(function(x,j){return !S.diary[j]});
  if(next>=0&&$("d"+next))$("d"+next).focus({preventScroll:false});
}
$("diaryNext").onclick=function(){
  var empty=DIARY.length-diaryCount();
  if(empty)ask("Go to Mission 2?","You have "+empty+" empty verb"+(empty===1?"":"s")+". "+(empty===1?"It":"They")+" will count as wrong, and you can't come back.","Yes, go to Mission 2","Stay here",endDiary,null);
  else endDiary();
};
function endDiary(){
  if(S.phase!=="diary"||S.finished)return;
  closeModal();S.phase="build";flash();
  FX.reveal({kicker:"Mission 1 complete",big:diaryOk()+"/"+DIARY.length,title:"verbs correct",sub:"Mission 2 starts now",ok:diaryOk()>=5,ms:1700});
  FX.play(diaryOk()>=5?"door":"end");
  startClock(BUILD_T,"Mission 2",endBuild);save();renderAll();
  $("buildSec").scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---- mission 2: sentence builder ---- */
function builtCount(){return Object.keys(S.built).length}
function builtOk(){var n=0;for(var k in S.built)if(S.built[k].ok)n++;return n}
function renderBuild(){
  var live=S.started&&!S.finished&&S.phase==="build";
  $("buildSec").classList.toggle("locked",!live);
  $("buildTag").textContent=live?"Mission 2 · in progress":(S.phase==="done"?"Mission 2 · closed":"Locked · opens after Mission 1");
  $("bDots").innerHTML=BUILD.map(function(b,i){var a=S.built[i],c=a?(a.ok?"ok":"bad"):(live&&i===S.bi?"now":"");return '<span class="'+c+'" title="Sentence '+(i+1)+'">'+(i+1)+'</span>'}).join("");
  /* the ending, sentence by sentence */
  var story=BUILD.map(function(b,i){var a=S.built[i];if(!a)return "";
    return '<span class="'+(a.ok?"s-ok":"s-bad")+'">'+esc(a.ok?a.v:rightText(i))+'</span> '}).join("");
  $("ending").innerHTML=story?story:'<span class="ph">Your new ending appears here, sentence by sentence...</span>';
  var box=$("builder");
  if(!live||S.bi>=BUILD.length){box.innerHTML="";return}
  var i=S.bi,t=tiles(i),need=BUILD[i].w.length,placed=S.placed;
  var slots='';
  for(var k=0;k<need;k++){var idx=placed[k];
    slots+=idx==null?'<span class="slot" aria-hidden="true"></span>':'<button class="tile in" type="button" data-out="'+k+'">'+esc(t[idx])+'</button>'}
  var bank=S.order[i].map(function(idx){var used=placed.indexOf(idx)>=0;
    return '<button class="tile'+(used?" used":"")+'" type="button" data-in="'+idx+'"'+(used?" disabled aria-hidden=\"true\"":"")+'>'+esc(t[idx])+'</button>'}).join("");
  box.innerHTML='<div class="b-head"><span class="room-tag">Sentence '+(i+1)+' of '+BUILD.length+'</span><span class="note">Tap the words in order · one word is a trap</span></div>'+
    '<div class="answer-line" aria-label="Your sentence">'+slots+'</div>'+
    '<div class="bank" aria-label="Words">'+bank+'</div>'+
    '<div class="row"><button class="btn red" id="bCheck" type="button"'+(placed.length===need?"":" disabled")+'>Check sentence</button><button class="btn line" id="bClear" type="button"'+(placed.length?"":" disabled")+'>Clear</button></div>';
  box.querySelectorAll("[data-in]").forEach(function(b){b.onclick=function(){
    if(S.placed.length>=need)return;S.placed.push(+b.getAttribute("data-in"));FX.play("click");save();renderBuild()}});
  box.querySelectorAll("[data-out]").forEach(function(b){b.onclick=function(){
    S.placed.splice(+b.getAttribute("data-out"),1);save();renderBuild()}});
  $("bCheck").onclick=checkSentence;
  $("bClear").onclick=function(){S.placed=[];save();renderBuild()};
}
function checkSentence(){
  var i=S.bi;if(S.phase!=="build"||S.built[i])return;
  var t=tiles(i),v=S.placed.map(function(idx){return t[idx]}).join(" ");
  var ok=v===rightText(i)||BUILD[i].alt.indexOf(v)>=0;
  if(ok){S.built[i]={v:v,ok:true};addScore(SENT_PTS);nextSentence()}
  else{
    S.built[i]={v:v,ok:false};save();renderBuild();
    offerRewind("That sentence is not correct. Check the order and the trap word!",
      function(){delete S.built[i];S.placed=[];save();renderBuild()},
      function(){nextSentence()});
  }
}
function nextSentence(){
  S.bi++;S.placed=[];save();renderBuild();
  if(S.bi>=BUILD.length)setTimeout(endBuild,700);
}
function endBuild(){
  if(S.phase!=="build"||S.finished)return;
  S.phase="done";finish(builtCount()<BUILD.length?"time":"done");
}

/* ---- flow ---- */
function onStart(){S.phase="diary";startClock(DIARY_T,"Mission 1",endDiary);renderAll();setTimeout(function(){$("d0").focus()},400)}
function resume(){
  if(S.phase==="diary"){if(remaining()<=0)endDiary();else runClock(DIARY_T,"Mission 1",endDiary)}
  else if(S.phase==="build"){if(remaining()<=0)endBuild();else runClock(BUILD_T,"Mission 2",endBuild)}
}
function renderAll(){renderDiary();renderBuild();$("result").hidden=true}
function finish(reason){
  if(S.finished)return;
  S.finished=true;S.reason=reason;S.finishedAt=Date.now();
  stopClock();closeModal();save();renderAll();showResult();flash();
}
function showResult(){
  stopClock();drawClock(0,"Finished");
  var vOk=diaryOk(),bOk=builtOk(),ratio=(vOk+bOk)/(DIARY.length+BUILD.length);
  var rvD=DIARY.map(function(d,i){var a=S.diary[i],mine=a?esc(a.v):"<em>empty</em>";
    return '<li>'+esc(d[0])+' <strong>'+(a&&a.ok?'<span class="okc">'+mine+'</span>':'<span class="badc">'+mine+'</span> → '+esc(d[3]))+'</strong>'+esc(d[1])+'</li>'}).join("");
  var rvB=BUILD.map(function(b,i){var a=S.built[i],mine=a?esc(a.v):"<em>no answer</em>";
    return '<li>'+(a&&a.ok?'<span class="okc">✓ '+mine+'</span>':'<span class="badc">✗ '+mine+'</span><br>Correct: '+esc(rightText(i)))+'</li>'}).join("");
  $("result").innerHTML='<div class="big">'+(S.reason==="time"?"Time's up!":"Mission complete!")+'</div>'+FX.stars(ratio)+
    '<p>Writer: <strong>'+esc(S.name)+'</strong> · Attempt '+S.attempt+'</p>'+
    '<div class="stats"><div class="stat"><span>Verbs</span><b>'+vOk+' / '+DIARY.length+'</b></div><div class="stat"><span>Sentences</span><b>'+bOk+' / '+BUILD.length+'</b></div><div class="stat"><span>Score</span><b>'+S.score+'</b></div><div class="stat"><span>Left the page</span><b>'+S.left+'</b></div></div>'+
    '<p class="meta">Rewind: '+(S.token?"not used":"used")+' · Finished: '+fmtDate(S.finishedAt)+'</p>'+
    '<p>Take a screenshot of this box, or press "Copy my report" and send it to your teacher.</p>'+
    '<div class="row" style="margin-top:10px"><button class="btn" id="copyRep" type="button">Copy my report</button><button class="btn line" id="again" type="button">Try again (new attempt)</button></div>'+
    '<div class="rv"><h5>Mission 1 · Diary</h5><ol>'+rvD+'</ol></div>'+
    '<div class="rv"><h5>Mission 2 · The new ending</h5><ol>'+rvB+'</ol></div>';
  $("result").hidden=false;
  $("copyRep").onclick=function(){
    var b=this,txt="Daniela's Diary · "+S.name+" · Attempt "+S.attempt+"\nVerbs: "+vOk+"/"+DIARY.length+" · Sentences: "+bOk+"/"+BUILD.length+" · Score: "+S.score+"\nLeft the page: "+S.left+" · Rewind: "+(S.token?"not used":"used")+" · "+fmtDate(S.finishedAt);
    try{navigator.clipboard.writeText(txt).then(function(){b.textContent="Copied!"},function(){b.textContent="Take a screenshot instead"})}catch(e){b.textContent="Take a screenshot instead"}
    setTimeout(function(){b.textContent="Copy my report"},2500);
  };
  afterResult();
  FX.finish(ratio,S.finishedAt);
  $("doneCard").scrollIntoView({behavior:"smooth",block:"start"});
}
