var KEY="l5m-speaking", VERSION=1, RW_TIME=60, HOT_TIME=90, MAX_RW=3;
var TOPICS = [
  "Describe Daniela's first night in the house.",
  "Describe Dr. Vargas. What does she look like? What is she like?",
  "Tell the story of the silver watch.",
  "You are Daniela. Explain why you went into the house.",
  "You are Dr. Vargas. Explain why you used the test product.",
  "You are a police officer. Describe what you saw in the house.",
  "Describe Marta, Daniela's mother.",
  "What happens on the fourth night?",
  "Was Daniela right? Give two reasons.",
  "If you had the watch, what would you do with it?",
  "Describe the hospital room.",
  "Tell the end of the story, but change the ending.",
  "What are the rules of the watch?",
  "Describe a day in Daniela's life at university.",
  "What did Daniela find on each night? Tell it in order."
];
var HOT = {
  "Daniela":["Why did you go into Dr. Vargas's house?","How did you feel when she attacked you?","What did you find in the bedroom?","Are you sorry for what you did? Why?","What did you see in the mirror at the end?","Where did you find the watch?"],
  "Dr. Vargas":["Why did you use the test product?","Why did you record the operation?","How did you feel when you saw Daniela?","Why did you call the police?","Do you think you are a good doctor?","What will you say to the judge?"],
  "Police officer":["What did you hear on the phone?","What did you see when you arrived?","Why did you put handcuffs on both women?","What did Daniela do when you arrived?","Who do you think is guilty? Why?"],
  "Marta":["How was your relationship with Daniela?","Did you trust Dr. Vargas? Why?","What was the operation like?","What do you want to say to your daughter?","How do you feel in the hospital?"]
};
var BONUS=[["past","Used the past tense correctly",20],["vocab","Used words from the story",20],["clear","Spoke clearly and loud",20]];
var VOPTS=[["a","Yes, she was right"],["b","No, she was wrong"],["c","It depends"]];

function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function store(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}
function recall(){try{var v=localStorage.getItem(KEY);return v?JSON.parse(v):null}catch(e){return null}}
function flash(){var f=$("flash");f.classList.remove("go");void f.offsetWidth;f.classList.add("go")}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}

var G;
function fresh(names){return {v:VERSION,started:false,finished:false,teams:(names||["Team A","Team B","Team C","Team D"]).map(function(n){return {name:n,score:0,token:true,turns:0}}),
  turn:-1,round:1,mode:"rewind",phase:"idle",used:[],card:"",endAt:0,rewinds:0,base:0,bonus:{},hot:null,vote:{a:0,b:0,c:0}}}
function save(){store(G)}

/* ---- dialog ---- */
var mYes=null,mNo=null;
function ask(title,text,yes,no,onYes,onNo){$("mTitle").textContent=title;$("mText").textContent=text;$("mYes").hidden=!yes;$("mYes").textContent=yes||"";$("mNo").textContent=no;mYes=onYes;mNo=onNo;$("modal").classList.add("on");(yes?$("mYes"):$("mNo")).focus()}
function closeModal(){$("modal").classList.remove("on");mYes=mNo=null}
$("mYes").onclick=function(){var f=mYes;closeModal();if(f)f()};
$("mNo").onclick=function(){var f=mNo;closeModal();if(f)f()};

/* ---- clock ---- */
var tick=null;
function remaining(){return Math.max(0,Math.ceil((G.endAt-Date.now())/1000))}
function drawClock(){
  var r=G.phase==="running"?remaining():(G.mode==="hot"?HOT_TIME:RW_TIME);
  $("tTime").textContent=G.started?r:"--";
  $("tChip").classList.toggle("warn",G.phase==="running"&&r<=10);
  var tot=G.mode==="hot"?HOT_TIME:RW_TIME,rs=document.documentElement.style;
  rs.setProperty("--turn-p",r/tot);rs.setProperty("--clock-p",G.phase==="running"?r/tot:0);
  var tb=$("bigClock");if(tb)tb.classList.toggle("warn",G.phase==="running"&&r<=10);
  var c=$("bigClock");if(c)c.textContent=r;
}
function runClock(){clearInterval(tick);tick=setInterval(function(){drawClock();if(remaining()<=0){clearInterval(tick);tick=null;flash();timeUp()}},200);drawClock()}
function stopClock(){clearInterval(tick);tick=null;drawClock()}

/* ---- setup ---- */
var names=["Team A","Team B","Team C","Team D"];
function renderSetup(){
  $("teamsIn").innerHTML=names.map(function(n,i){return '<label class="sr" for="tn'+i+'">Team '+(i+1)+' name</label><input type="text" id="tn'+i+'" maxlength="24" value="'+esc(n)+'" autocomplete="off">'}).join("");
  names.forEach(function(n,i){$("tn"+i).oninput=function(){names[i]=this.value}});
  $("addTeam").disabled=names.length>=6;$("delTeam").disabled=names.length<=2;
}
$("addTeam").onclick=function(){if(names.length<6){names.push("Team "+String.fromCharCode(65+names.length));renderSetup()}};
$("delTeam").onclick=function(){if(names.length>2){names.pop();renderSetup()}};
$("startGame").onclick=function(){
  var list=names.map(function(n,i){return (n||"").trim()||("Team "+String.fromCharCode(65+i))});
  var vote=G?G.vote:null;G=fresh(list);if(vote)G.vote=vote;G.started=true;save();flash();nextTurn();
};

/* ---- leaderboard ---- */
function renderBoard(){
  var max=Math.max.apply(null,G.teams.map(function(t){return t.score}).concat([1]));
  var order=G.teams.map(function(t,i){return i}).sort(function(a,b){return G.teams[b].score-G.teams[a].score||a-b});
  $("board").innerHTML=order.map(function(i,rank){var t=G.teams[i];
    return '<div class="brow'+(i===G.turn&&!G.finished?" now":"")+'"><div class="rk">'+(rank+1)+'</div><div class="nm"><i class="tok'+(t.token?"":" used")+'" title="'+(t.token?"Rewind token ready":"Rewind token used")+'"></i><span>'+esc(t.name)+'</span></div><div class="vbar"><i style="width:'+Math.round(t.score/max*100)+'%"></i></div><div class="sc">'+t.score+'</div></div>'}).join("");
  $("roundN").textContent=G.round;
}

/* ---- turns ---- */
function team(){return G.teams[G.turn]}
function drawCard(){
  var left=TOPICS.map(function(t,i){return i}).filter(function(i){return G.used.indexOf(i)<0});
  if(!left.length){G.used=[];left=TOPICS.map(function(t,i){return i})}
  var i=left[Math.floor(Math.random()*left.length)];G.used.push(i);G.card=TOPICS[i];
}
function drawHot(){
  var chars=Object.keys(HOT),c=chars[Math.floor(Math.random()*chars.length)];
  G.hot={char:c,qs:shuffle(HOT[c]).slice(0,4),qi:0,marks:[]};
}
function nextTurn(){
  var n=G.teams.length;G.turn=(G.turn+1)%n;if(G.turn===0&&G.teams.some(function(t){return t.turns>0}))G.round++;
  G.phase="ready";G.rewinds=0;G.base=0;G.bonus={};
  if(G.mode==="hot")drawHot();else drawCard();
  save();render();
}
function setMode(m){if(G.phase!=="ready")return;G.mode=m;if(m==="hot")drawHot();else drawCard();save();render()}
function startTurn(){
  if(G.phase!=="ready")return;
  G.phase="running";G.endAt=Date.now()+(G.mode==="hot"?HOT_TIME:RW_TIME)*1000;flash();save();render();runClock();
}
function shoutRewind(){
  if(G.phase!=="running"||G.mode!=="rewind")return;
  G.rewinds++;flash();
  if(G.rewinds>=MAX_RW){G.base=0;stopClock();G.phase="scoring";save();render();return}
  G.endAt=Date.now()+RW_TIME*1000;save();render();runClock();
}
function timeUp(){
  if(G.phase!=="running")return;
  if(G.mode==="rewind")G.base=Math.max(0,100-25*G.rewinds);
  else G.base=G.hot.marks.filter(function(m){return m==="good"}).length*30;
  G.phase="scoring";save();render();
}
function hotMark(kind){
  if(G.phase!=="running"||G.mode!=="hot")return;
  var h=G.hot;if(h.qi>=h.qs.length)return;
  h.marks[h.qi]=kind;h.qi++;save();
  if(h.qi>=h.qs.length){G.endAt=Date.now();stopClock();timeUp();return}
  render();
}
function usePass(){
  var t=team();if(G.phase!=="ready"||!t.token)return;
  t.token=false;flash();if(G.mode==="hot")drawHot();else drawCard();save();render();
}
function bonusTotal(){var s=0;BONUS.forEach(function(b){if(G.bonus[b[0]])s+=b[2]});return s}
function givePoints(){
  if(G.phase!=="scoring")return;
  var p=G.base+(G.base>0||G.mode==="hot"?bonusTotal():0);
  team().score+=p;team().turns++;G.phase="idle";flash();save();render();
}

/* ---- stage ---- */
function render(){
  var on=G.started&&!G.finished;
  $("setup").hidden=G.started;$("boardSec").hidden=!G.started;$("stage").hidden=!on;$("voteSec").hidden=!G.started;$("endGame").hidden=!on;
  $("final").hidden=!G.finished;
  document.body.classList.toggle("started",!!G.started);document.body.classList.toggle("finished",!!G.finished);
  document.body.classList.toggle("running",G.phase==="running"&&!G.finished);
  if(!G.started){drawClock();return}
  renderBoard();renderVote();
  if(G.finished){renderFinal();return}
  var t=team(),h='';
  if(G.phase==="idle"){
    var nx=G.teams[(G.turn+1)%G.teams.length];
    h='<div class="phase-tag">Points saved</div><p class="turn">Next: <span>'+esc(nx.name)+'</span></p><div class="row"><button class="btn red" id="nextBtn" type="button">Start next turn</button></div>';
  } else {
    h='<div class="phase-tag">Round '+G.round+' · '+(G.mode==="hot"?"Hot seat":"Rewind! challenge")+'</div><p class="turn"><span>'+esc(t.name)+'</span>, it\'s your turn</p>';
    if(G.phase==="ready")h+='<div class="modes" role="group" aria-label="Game mode"><button class="btn line" type="button" data-mode="rewind" aria-pressed="'+(G.mode==="rewind")+'">Rewind! challenge · 60 s</button><button class="btn line" type="button" data-mode="hot" aria-pressed="'+(G.mode==="hot")+'">Hot seat · 90 s</button></div>';
    h+='<div class="stage-grid"><div class="card">';
    if(G.mode==="rewind"){
      h+='<div class="room-tag">Topic card</div><div class="topic">'+esc(G.card)+'</div>';
    } else {
      var hs=G.hot;
      h+='<div class="room-tag">Hot seat character</div><div class="charcard">'+esc(hs.char)+'</div><p class="note">One student from '+esc(t.name)+' is '+esc(hs.char)+'. The other teams ask these questions:</p><ol class="hq">'+
        hs.qs.map(function(q,i){var m=hs.marks[i];return '<li class="'+(m?m:"")+(G.phase==="running"&&i===hs.qi?" cur":"")+'">'+esc(q)+(m==="good"?" ✓":"")+'</li>'}).join("")+'</ol>';
    }
    if(G.phase==="ready")h+='<div class="row" style="margin-top:12px"><button class="btn line" id="passBtn" type="button"'+(t.token?"":" disabled")+'>'+(t.token?"Use our Rewind token: new card":"Rewind token already used")+'</button></div>';
    h+='</div><div class="card">';
    if(G.phase==="ready"){
      h+='<div class="big-clock" id="bigClock">'+(G.mode==="hot"?HOT_TIME:RW_TIME)+'</div><div class="tbar" aria-hidden="true"><i></i></div><p class="note">The turn starts when you press the button. It can\'t be paused.</p><button class="btn red" id="goBtn" type="button" style="width:100%">Start '+(G.mode==="hot"?"90":"60")+' seconds</button>';
    } else if(G.phase==="running"){
      h+='<div class="big-clock" id="bigClock">'+remaining()+'</div><div class="tbar" aria-hidden="true"><i></i></div>';
      if(G.mode==="rewind")h+='<button class="rewind-btn" id="rwBtn" type="button">REWIND!</button><div class="rw-count">Rewinds: '+G.rewinds+' of '+MAX_RW+(G.rewinds?' · start again and change one detail!':'')+'</div>';
      else h+='<div class="row" style="margin-top:12px"><button class="btn" id="goodBtn" type="button">Good answer +30</button><button class="btn line" id="skipBtn" type="button">Skip question</button></div>';
    } else if(G.phase==="scoring"){
      var lost=G.mode==="rewind"&&G.rewinds>=MAX_RW;
      h+='<div class="room-tag">'+(lost?"Caught three times!":"Time!")+'</div><div class="pts" id="ptsNow">'+(G.base+(lost?0:bonusTotal()))+'</div><p class="note">'+(G.mode==="rewind"?(lost?"Three rewinds: this turn gets 0 points.":"Base: "+G.base+" ("+G.rewinds+" rewind"+(G.rewinds===1?"":"s")+")"):"Good answers: "+(G.base/30)+" × 30")+'</p>';
      if(!lost)h+='<div class="toggles">'+BONUS.map(function(b){return '<button class="toggle" type="button" data-b="'+b[0]+'" aria-pressed="'+(!!G.bonus[b[0]])+'"><span>'+b[1]+'</span><b>+'+b[2]+'</b></button>'}).join("")+'</div>';
      h+='<button class="btn red" id="giveBtn" type="button" style="width:100%">Give the points to '+esc(t.name)+'</button>';
    }
    h+='</div></div>';
  }
  $("stage").innerHTML=h;
  var b;
  if((b=$("nextBtn")))b.onclick=nextTurn;
  document.querySelectorAll("[data-mode]").forEach(function(x){x.onclick=function(){setMode(x.getAttribute("data-mode"))}});
  if((b=$("passBtn")))b.onclick=usePass;
  if((b=$("goBtn")))b.onclick=startTurn;
  if((b=$("rwBtn")))b.onclick=shoutRewind;
  if((b=$("goodBtn")))b.onclick=function(){hotMark("good")};
  if((b=$("skipBtn")))b.onclick=function(){hotMark("skip")};
  if((b=$("giveBtn")))b.onclick=givePoints;
  document.querySelectorAll("[data-b]").forEach(function(x){x.onclick=function(){var k=x.getAttribute("data-b");G.bonus[k]=!G.bonus[k];save();render()}});
  drawClock();
}

/* ---- vote ---- */
function renderVote(){
  var v=G.vote,tot=v.a+v.b+v.c;
  $("vote").innerHTML=VOPTS.map(function(o){var n=v[o[0]],w=tot?Math.round(n/tot*100):0;
    return '<div class="vote-row"><button type="button" data-v="'+o[0]+'">'+o[1]+'</button><div class="vbar"><i style="width:'+w+'%"></i></div><span>'+n+'</span></div>'}).join("");
  document.querySelectorAll("[data-v]").forEach(function(b){b.onclick=function(){G.vote[b.getAttribute("data-v")]++;save();renderVote()}});
}
$("voteReset").onclick=function(){G.vote={a:0,b:0,c:0};save();renderVote()};

/* ---- end ---- */
$("endGame").onclick=function(){
  if(G.phase==="running"){ask("Finish the turn first","A team is speaking now. Wait for the clock to stop.",null,"OK",null,null);return}
  ask("Finish the game?","The leaderboard will show the winners. Points that were not given yet are lost.","Yes, finish","Keep playing",function(){stopClock();G.finished=true;save();flash();render()},null);
};
function renderFinal(){
  var order=G.teams.slice().sort(function(a,b){return b.score-a.score});
  var top=order[0].score,winners=order.filter(function(t){return t.score===top});
  $("final").innerHTML='<div class="big">Game over!</div><div class="podium"><div class="phase-tag">'+(winners.length>1?"Winners (tie)":"Winners")+'</div><div class="first">'+winners.map(function(t){return esc(t.name)}).join(" & ")+'</div><p class="meta">'+top+' points · '+G.round+' round'+(G.round===1?"":"s")+'</p></div>'+
    '<div class="row" style="margin-top:14px"><button class="btn red" id="newGame" type="button">New game (same teams)</button><button class="btn line" id="editTeams" type="button">Change the teams</button></div>';
  $("newGame").onclick=function(){var n=G.teams.map(function(t){return t.name}),v=G.vote;G=fresh(n);G.vote=v;G.started=true;save();flash();nextTurn()};
  $("editTeams").onclick=function(){names=G.teams.map(function(t){return t.name});var v=G.vote;G=fresh(names);G.vote=v;save();renderSetup();render()};
  $("final").scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---- boot ---- */
function boot(hot){
  var s=(hot&&hot.v===VERSION)?hot:recall();
  G=(s&&s.v===VERSION)?s:fresh();
  names=G.teams.map(function(t){return t.name});
  renderSetup();render();
  if(G.started&&!G.finished&&G.phase==="running"){if(remaining()>0)runClock();else timeUp()}
}
boot({});
