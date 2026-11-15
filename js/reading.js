var VERSION=1, TIME=300, FIRST_TIME=TIME;
var ROOMS = [
  {name:"Garage", letter:"T", night:"First night",
   text:"Daniela climbs the wall of Dr. Vargas's big house. She feels confident, and she goes in and walks slowly. Suddenly a camera turns and a red light points at her. Daniela presses the watch. Flash. She is at the garage door again, five minutes earlier. This time she walks a different way and hides from the red light. She does not find money, but in the kitchen she finds a paper.",
   qs:[{type:"mc", q:"What does Daniela do when the camera sees her?", opts:["She runs away","She presses the watch","She breaks the camera","She calls the police"], a:1},
       {type:"tf", q:"Daniela finds money in the house on the first night.", a:false}]},
  {name:"Kitchen", letter:"R", night:"First night",
   text:"In the kitchen she finds a paper that says: Test product, twenty units, cheapest price. It is her first clue.",
   qs:[{type:"code", q:"Lock code: how many units are on the paper? Write the number.", ok:["20","twenty"], show:"20"},
       {type:"mc", q:"In this story, a \"clue\" is...", opts:["a type of medicine","information that helps you find the truth","a key for a door","a security camera"], a:1}]},
  {name:"Office", letter:"U", night:"Second night",
   text:"Daniela opens the desk and reads some papers. There is a list of patients, and next to Marta's name there are two words: test product. Then she hears steps. Dr. Vargas comes back early. She takes a knife from the desk and stabs her. Daniela presses the watch. Flash. There is no wound.",
   qs:[{type:"mc", q:"Why does Daniela use the watch on the second night?", opts:["The camera sees her","She forgets the papers","Dr. Vargas stabs her","The police arrive"], a:2},
       {type:"tf", q:"After the flash, Daniela has a wound on her side.", a:false}]},
  {name:"Bedroom", letter:"T", night:"Third night",
   text:"Dr. Vargas is at a party, so Daniela looks in the drawers of the bedroom, one by one. In the last drawer she finds a small box with bottles with no labels. This is the proof. Then her phone makes a sound. It is a message from the hospital: her mother is very bad, please come now.",
   qs:[{type:"mc", q:"Why is the box important?", opts:["It is the proof","It has money inside","It is a gift for Marta","The watch is inside"], a:0},
       {type:"tf", q:"On the third night, Daniela receives a message from the hospital.", a:true}]},
  {name:"Computer", letter:"H", night:"Fourth night",
   text:"Daniela comes back for the truth. In the office she finds a video called Test 14. It is the video of the operation. She uploads it to the internet. Then the door opens and Dr. Vargas comes in. They fight. The watch hits the floor and the glass breaks.",
   qs:[{type:"code", q:"Lock code: what is the number of the video? Write it.", ok:["14","fourteen"], show:"14"},
       {type:"order", q:"Put the events in order. Tap them from first to last.", items:["She finds the video","She uploads the video","Dr. Vargas comes in","The watch breaks"], show:[2,0,3,1]}]}
];
var TOTAL=ROOMS.length*2;

function fresh(){return {v:VERSION,name:"",attempt:0,started:false,finished:false,reason:"",score:0,token:true,room:0,ans:{},left:0,endAt:0,startedAt:0,finishedAt:0}}
var pick=[]; /* taps for the order question, not saved */

function roomDone(r){return S.ans[r+"-0"]&&S.ans[r+"-1"]}
function roomOk(r){return roomDone(r)&&S.ans[r+"-0"].ok&&S.ans[r+"-1"].ok}
function correct(){var n=0;for(var k in S.ans)if(S.ans[k].ok)n++;return n}
function shown(q,v){if(q.type==="mc")return q.opts[v];if(q.type==="tf")return v?"True":"False";if(q.type==="order")return v.map(function(i){return q.items[i]}).join(" → ");return v}
function rightAns(q){if(q.type==="mc")return q.opts[q.a];if(q.type==="tf")return q.a?"True":"False";if(q.type==="order")return q.items.join(" → ");return q.show}

function renderDoors(){
  $("doors").innerHTML=ROOMS.map(function(r,i){
    var cls="door",L="?";
    if(roomDone(i)){L=r.letter;cls+=roomOk(i)?" open":" forced"}else if(S.started&&!S.finished&&i===S.room)cls+=" now";
    return '<div class="'+cls+'"><div class="L">'+L+'</div><div class="r">'+esc(r.name)+'</div></div>';
  }).join("");
}
function qHTML(r,j){
  var q=ROOMS[r].qs[j],key=r+"-"+j,a=S.ans[key],live=S.started&&!S.finished,h='<div class="lq"><p class="q">'+(j+1)+'. '+esc(q.q)+'</p>';
  if(q.type==="mc"||q.type==="tf"){
    var opts=q.type==="mc"?q.opts:["True","False"];
    h+='<div class="opts">'+opts.map(function(o,i){
      var val=q.type==="mc"?i:(i===0),cls="";
      if(a&&a.v===val)cls=a.ok?" right":" picked-wrong";
      return '<button class="opt'+cls+'" type="button" data-q="'+key+'" data-v="'+i+'"'+(a||!live?" disabled":"")+'>'+esc(o)+'</button>'}).join("")+'</div>';
  } else if(q.type==="code"){
    h+=a?'<p class="'+(a.ok?"okc":"badc")+'">'+(a.ok?"✓ ":"✗ ")+esc(a.v)+'</p>':
      '<form class="code-in" data-q="'+key+'"><input type="text" id="in-'+key+'" inputmode="numeric" autocomplete="off" aria-label="Lock code"'+(live?"":" disabled")+'><button class="btn" type="submit"'+(live?"":" disabled")+'>Open the lock</button></form>';
  } else if(q.type==="order"){
    if(a){h+='<p class="'+(a.ok?"okc":"badc")+'">'+(a.ok?"✓ ":"✗ ")+esc(shown(q,a.v))+'</p>'}
    else{
      h+='<div class="order">'+q.show.map(function(i){var n=pick.indexOf(i);
        return '<button class="opt'+(n>=0?" picked":"")+'" type="button" data-ord="'+key+'" data-i="'+i+'"'+(live?"":" disabled")+'><span class="ordn">'+(n>=0?n+1:"")+'</span>'+esc(q.items[i])+'</button>'}).join("")+'</div>'+
        '<div class="row" style="margin-top:10px"><button class="btn" type="button" id="ordCheck"'+(pick.length===q.items.length&&live?"":" disabled")+'>Check the order</button><button class="btn line" type="button" id="ordClear"'+(pick.length&&live?"":" disabled")+'>Clear</button></div>';
    }
  }
  return h+'</div>';
}
var shownRoom=-1;
function renderRoom(){
  renderDoors();
  var box=$("room");
  $("roomWrap").classList.toggle("locked",!S.started);
  $("progress").textContent=Object.keys(S.ans).length+" / "+TOTAL+" answered";
  if(S.finished){box.innerHTML='<p class="note">The game is over. See your result below.</p>';return}
  var r=Math.min(S.room,ROOMS.length-1),room=ROOMS[r];
  var h='<div class="room-tag">Room '+(r+1)+' of '+ROOMS.length+' · '+esc(room.night)+' · The '+esc(room.name.toLowerCase())+'</div><blockquote>'+esc(room.text)+'</blockquote>'+qHTML(r,0)+qHTML(r,1);
  if(roomDone(r)&&r<ROOMS.length-1&&!S.finished)h+='<div class="feedback '+(roomOk(r)?"good":"")+'">'+(roomOk(r)?"Perfect! The door opens. Letter: "+room.letter:"You forced the door open. Letter: "+room.letter)+'</div><button class="btn red" type="button" id="nextRoom">Open the next door →</button>';
  box.innerHTML=h;
  if(r!==shownRoom){shownRoom=r;box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter')}
  box.querySelectorAll(".opt[data-q]").forEach(function(b){b.onclick=function(){
    var key=b.getAttribute("data-q"),i=+b.getAttribute("data-v"),q=qOf(key);
    submit(key,q.type==="mc"?i:(i===0));
  }});
  box.querySelectorAll("form[data-q]").forEach(function(f){f.onsubmit=function(e){e.preventDefault();
    var key=f.getAttribute("data-q"),v=$("in-"+key).value.trim().toLowerCase();if(!v){$("in-"+key).focus();return}submit(key,v)}});
  box.querySelectorAll("[data-ord]").forEach(function(b){b.onclick=function(){
    var i=+b.getAttribute("data-i"),n=pick.indexOf(i);if(n>=0)pick.splice(n,1);else pick.push(i);renderRoom()}});
  if($("ordCheck"))$("ordCheck").onclick=function(){var key=r+"-1";submit(key,pick.slice())};
  if($("ordClear"))$("ordClear").onclick=function(){pick=[];renderRoom()};
  if($("nextRoom")&&!S.finished){var nb=$("nextRoom");setTimeout(function(){var r2=nb.getBoundingClientRect();if(r2.bottom>window.innerHeight-12)nb.scrollIntoView({behavior:"smooth",block:"center"})},350)}
  if($("nextRoom"))$("nextRoom").onclick=function(){S.room++;pick=[];save();flash();renderRoom();$("roomWrap").scrollIntoView({behavior:"smooth",block:"start"})};
}
function qOf(key){var p=key.split("-");return ROOMS[+p[0]].qs[+p[1]]}
function isRight(q,v){
  if(q.type==="mc"||q.type==="tf")return v===q.a;
  if(q.type==="code")return q.ok.indexOf(v)>=0;
  if(q.type==="order")return v.join(",")===q.items.map(function(x,i){return i}).join(",");
}
function doorFx(key){
  var r=+key.split("-")[0];if(!roomDone(r))return;var ok=roomOk(r),room=ROOMS[r];
  FX.reveal({kicker:'Room '+(r+1)+' · '+esc(room.name),big:room.letter,title:ok?'The door opens!':'You forced the door',sub:ok?'You found a letter of the secret word':'You still get the letter',ok:ok});
  FX.play(ok?'door':'bad');
}
function submit(key,v){
  if(S.ans[key]||S.finished||!S.started)return;
  var q=qOf(key);
  if(isRight(q,v)){S.ans[key]={v:v,ok:true};addScore(100);pick=[];save();renderRoom();doorFx(key);checkRoom()}
  else{
    S.ans[key]={v:v,ok:false};save();renderRoom();
    offerRewind("Dr. Vargas heard you! That answer is wrong.",function(){delete S.ans[key];pick=[];save();renderRoom()},function(){pick=[];renderRoom();doorFx(key);checkRoom()});
  }
}
function checkRoom(){
  var last=ROOMS.length-1;
  if(S.room===last&&roomDone(last)&&!S.finished)finish("done");
}

/* ---- flow ---- */
function onStart(){startClock(TIME,"Time left",function(){finish("time")});renderRoom()}
function resume(){if(remaining()<=0)finish("time");else{runClock(TIME,"Time left",function(){finish("time")});renderRoom()}}
function renderAll(){pick=[];renderRoom();$("result").hidden=true}
function finish(reason){
  if(S.finished)return;
  S.finished=true;S.reason=reason;S.finishedAt=Date.now();
  stopClock();closeModal();save();renderRoom();showResult();flash();
}
function showResult(){
  stopClock();drawClock(remaining(),S.reason==="time"?"Time's up":"Finished");
  var used=Math.min(TIME,Math.round((S.finishedAt-S.startedAt)/1000));
  var word=ROOMS.map(function(r,i){var c=roomOk(i)?"okc":(roomDone(i)?"badc":"");return '<span class="'+c+'">'+(roomDone(i)?r.letter:"_")+'</span>'}).join("");
  var rv=ROOMS.map(function(r,i){
    return '<div class="rv"><h5>Room '+(i+1)+' · '+esc(r.name)+'</h5><ul>'+r.qs.map(function(q,j){var a=S.ans[i+"-"+j];
      var mine=a?esc(shown(q,a.v)):"<em>no answer</em>";
      return '<li>'+esc(q.q)+'<br>Your answer: '+(a&&a.ok?'<span class="okc">✓ '+mine+'</span>':'<span class="badc">✗ '+mine+'</span> · Correct: '+esc(rightAns(q)))+'</li>'}).join("")+'</ul></div>';
  }).join("");
  $("result").innerHTML='<div class="big">'+(S.reason==="time"?"Time's up!":"You escaped!")+'</div>'+FX.stars(correct()/TOTAL)+
    '<div class="secret">'+word+'</div>'+
    '<p>Explorer <strong>'+esc(S.name)+'</strong> · Attempt '+S.attempt+'</p>'+
    '<div class="stats"><div class="stat"><span>Correct</span><b>'+correct()+' / '+TOTAL+'</b></div><div class="stat"><span>Score</span><b>'+S.score+'</b></div><div class="stat"><span>Time used</span><b>'+mmss(used)+'</b></div><div class="stat"><span>Left the page</span><b>'+S.left+'</b></div></div>'+
    '<p class="meta">Rewind: '+(S.token?"not used":"used")+' · Finished: '+fmtDate(S.finishedAt)+'</p>'+
    '<p>Take a screenshot of this box and send it to your teacher.</p>'+
    '<h3>Review the answers</h3>'+rv;
  $("result").hidden=false;
  afterResult();
  FX.finish(correct()/TOTAL,S.finishedAt);
  $("doneCard").scrollIntoView({behavior:"smooth",block:"start"});
}
