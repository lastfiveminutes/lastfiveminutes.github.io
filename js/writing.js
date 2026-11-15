var VERSION=2, DIARY_T=180, STORY_T=300, FIRST_TIME=DIARY_T, MIN_WORDS=30, BONUS_WORDS=50;
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
var MWORDS = ["watch","police","mirror","truth","because","then"];

function fresh(){return {v:VERSION,name:"",attempt:0,started:false,finished:false,reason:"",score:0,token:true,phase:"",diary:{},story:"",storyPts:0,left:0,pasteTries:0,endAt:0,startedAt:0,finishedAt:0}}

/* ---- mission 1: diary ---- */
function diaryCount(){return Object.keys(S.diary).length}
function renderDiary(){
  var live=S.started&&!S.finished&&S.phase==="diary";
  $("diarySec").classList.toggle("locked",!live);
  $("diaryTag").textContent=S.phase==="diary"?"In progress · 3 minutes":(S.phase?"Closed":"Locked · starts with the clock");
  $("diaryList").innerHTML=DIARY.map(function(d,i){
    var a=S.diary[i],cls=a?(a.ok?"right":"wrong"):"";
    return '<li><form class="dline" data-i="'+i+'">'+esc(d[0])+' <input type="text" id="d'+i+'" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Past simple of '+d[2]+'"'+(cls?' class="'+cls+'"':'')+(a?' value="'+esc(a.v)+'"':'')+(a||!live?" disabled":"")+'> <span class="base">('+d[2]+')</span>'+esc(d[1])+' <button class="dchk" type="submit"'+(a||!live?" disabled":"")+'>'+(a?(a.ok?"✓":"✗"):"Check")+'</button></form></li>'}).join("");
  document.querySelectorAll(".dline").forEach(function(f){f.onsubmit=function(e){e.preventDefault();checkVerb(+f.getAttribute("data-i"))}});
  $("diaryProg").textContent=diaryCount()+" / "+DIARY.length+" verbs";
  $("diaryNext").disabled=!live;
}
function checkVerb(i){
  if(S.diary[i]||S.phase!=="diary")return;
  var d=DIARY[i],el=$("d"+i),v=el.value.trim().toLowerCase().replace(/\s+/g," ");
  if(!v){el.focus();return}
  if(v===d[3]){S.diary[i]={v:v,ok:true};addScore(20);save();renderDiary();afterVerb()}
  else{
    S.diary[i]={v:v,ok:false};save();renderDiary();
    offerRewind('"'+v+'" is not the past of "'+d[2]+'".',function(){delete S.diary[i];save();renderDiary();$("d"+i).focus()},afterVerb);
  }
}
function afterVerb(){
  if(diaryCount()===DIARY.length){setTimeout(endDiary,700);return}
  var next=DIARY.findIndex(function(x,j){return !S.diary[j]});
  if(next>=0&&$("d"+next))$("d"+next).focus();
}
$("diaryNext").onclick=function(){
  var empty=DIARY.length-diaryCount();
  if(empty)ask("Go to Mission 2?","You have "+empty+" empty verb"+(empty===1?"":"s")+". "+(empty===1?"It":"They")+" will count as wrong, and you can't come back.","Yes, go to Mission 2","Stay here",endDiary,null);
  else endDiary();
};
function endDiary(){
  if(S.phase!=="diary"||S.finished)return;
  closeModal();S.phase="story";flash();
  startClock(STORY_T,"Mission 2",endStory);save();renderAll();
  $("storySec").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(function(){$("story").focus()},400);
}

/* ---- mission 2: story ---- */
function wc(t){return t.trim().split(/\s+/).filter(Boolean).length}
function usedWords(t){t=t.toLowerCase();return MWORDS.filter(function(w){return new RegExp("\\b"+w+"\\b").test(t)})}
function renderStory(){
  var live=S.started&&!S.finished&&S.phase==="story";
  $("storySec").classList.toggle("locked",!live);
  $("storyTag").textContent=live?"In progress · 5 minutes":(S.phase==="done"?"Submitted":"Locked · opens after Mission 1");
  var ta=$("story");if(ta.value!==S.story)ta.value=S.story;ta.disabled=!live;
  $("storySubmit").disabled=!live;
  renderWords();
}
function renderWords(){
  var t=$("story").value,used=usedWords(t),n=wc(t);
  $("mWords").innerHTML=MWORDS.map(function(w){var u=used.indexOf(w)>=0;return '<span class="wchip'+(u?" used":"")+'">'+(u?"✓ ":"")+w+'</span>'}).join("");
  var bar=$("wcBar");if(bar){bar.style.width=Math.min(100,n/BONUS_WORDS*100)+"%";bar.className=n>=BONUS_WORDS?"bonus":(n>=MIN_WORDS?"ok":"")}
  $("wc").textContent=n+(n===1?" word":" words")+(n<MIN_WORDS?" · minimum "+MIN_WORDS:n<BONUS_WORDS?" ✓ · "+BONUS_WORDS+" for the bonus":" ✓ bonus!");
}
var ta=$("story");
ta.addEventListener("input",function(){S.story=ta.value;renderWords();save()});
function noPaste(e){e.preventDefault();S.pasteTries++;save();$("pasteMsg").textContent="Paste is turned off. Write the story with your own words."}
ta.addEventListener("paste",noPaste);ta.addEventListener("drop",noPaste);
$("storySubmit").onclick=function(){
  var n=wc(S.story);
  if(n<MIN_WORDS){$("storyFb").className="feedback";$("storyFb").textContent="Your story has "+n+" words. Write at least "+MIN_WORDS+" before you submit.";return}
  ask("Submit your story?","You can't change it after this.","Yes, submit","Keep writing",endStory,null);
};
function endStory(){
  if(S.phase!=="story"||S.finished)return;
  S.story=$("story").value;
  var n=wc(S.story),pts=0;
  if(n>0)pts+=usedWords(S.story).length*10;
  if(n>=BONUS_WORDS)pts+=30;
  S.storyPts=pts;if(pts)addScore(pts);
  S.phase="done";finish(n<MIN_WORDS?"short":"done");
}

/* ---- flow ---- */
function onStart(){S.phase="diary";startClock(DIARY_T,"Mission 1",endDiary);renderAll();setTimeout(function(){$("d0").focus()},300)}
function resume(){
  if(S.phase==="diary"){if(remaining()<=0)endDiary();else{runClock(DIARY_T,"Mission 1",endDiary)}}
  else if(S.phase==="story"){if(remaining()<=0)endStory();else{runClock(STORY_T,"Mission 2",endStory)}}
}
function renderAll(){renderDiary();renderStory();$("result").hidden=true;$("pasteMsg").textContent="";$("storyFb").textContent=""}
function finish(reason){
  if(S.finished)return;
  S.finished=true;S.reason=reason;S.finishedAt=Date.now();
  stopClock();closeModal();save();renderAll();showResult();flash();
}
function report(){
  var ok=DIARY.filter(function(d,i){return S.diary[i]&&S.diary[i].ok}).length;
  return {ok:ok,words:wc(S.story),used:usedWords(S.story)};
}
function showResult(){
  stopClock();drawClock(0,"Finished");
  var r=report();
  var rv=DIARY.map(function(d,i){var a=S.diary[i];
    var mine=a?esc(a.v):"<em>empty</em>";
    return '<li>'+esc(d[0])+' <strong>'+(a&&a.ok?'<span class="okc">'+mine+'</span>':'<span class="badc">'+mine+'</span> → '+esc(d[3]))+'</strong>'+esc(d[1])+'</li>'}).join("");
  $("result").innerHTML='<div class="big">'+(S.reason==="short"?"Time's up!":"Mission complete!")+'</div>'+
    '<p>Writer: <strong>'+esc(S.name)+'</strong> · Attempt '+S.attempt+'</p>'+
    '<div class="stats"><div class="stat"><span>Verbs</span><b>'+r.ok+' / '+DIARY.length+'</b></div><div class="stat"><span>Story words</span><b>'+r.words+'</b></div><div class="stat"><span>Mission words</span><b>'+r.used.length+' / '+MWORDS.length+'</b></div><div class="stat"><span>Score</span><b>'+S.score+'</b></div></div>'+
    (S.reason==="short"?'<p class="badc">The story has fewer than '+MIN_WORDS+' words.</p>':'')+
    '<p class="meta">Rewind: '+(S.token?"not used":"used")+' · Left the page: '+S.left+' · Paste attempts: '+S.pasteTries+' · Finished: '+fmtDate(S.finishedAt)+'</p>'+
    '<div class="rv"><h5>My story</h5><div class="starter" style="white-space:pre-wrap;font-style:normal;color:var(--text)">'+(S.story.trim()?esc(S.story):"<em>No story</em>")+'</div></div>'+
    '<p>Take a screenshot of this box, or press "Copy my report" and send it to your teacher.</p>'+
    '<div class="row" style="margin-top:10px"><button class="btn" id="copyRep" type="button">Copy my report</button><button class="btn line" id="again" type="button">Try again (new attempt)</button></div>'+
    '<div class="rv"><h5>Diary answers</h5><ol>'+rv+'</ol></div>';
  $("result").hidden=false;
  $("copyRep").onclick=function(){
    var b=this,txt="Daniela's Diary · "+S.name+" · Attempt "+S.attempt+"\nVerbs: "+r.ok+"/"+DIARY.length+" · Words: "+r.words+" · Mission words: "+r.used.length+"/"+MWORDS.length+" · Score: "+S.score+"\nLeft the page: "+S.left+" · Paste attempts: "+S.pasteTries+" · "+fmtDate(S.finishedAt)+"\n\n"+S.story;
    try{navigator.clipboard.writeText(txt).then(function(){b.textContent="Copied!"},function(){b.textContent="Take a screenshot instead"})}catch(e){b.textContent="Take a screenshot instead"}
    setTimeout(function(){b.textContent="Copy my report"},2500);
  };
  afterResult();
  $("doneCard").scrollIntoView({behavior:"smooth",block:"start"});
}
