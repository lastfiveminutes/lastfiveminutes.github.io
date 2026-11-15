/* Shared effects for all games: sounds, floating timer, +points, confetti, stars, reveal card.
   Everything is optional: if the browser can't do something, the game still works. */
var FX = (function () {
  var SOUND_KEY = "l5m-sound";
  var on = true;
  try { on = localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) {}
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- sounds (synthesised, no files) ---------- */
  var ac = null;
  function audio() {
    if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { ac = new A(); } catch (e) { return null; } }
    if (ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function tone(freq, dur, type, vol, when, slide) {
    var c = audio(); if (!c) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  var SOUNDS = {
    good:   function () { tone(660, .12, "triangle", .2); tone(990, .24, "triangle", .2, .09); },
    bad:    function () { tone(230, .32, "sawtooth", .1, 0, 120); },
    tick:   function () { tone(1250, .05, "square", .05); },
    click:  function () { tone(560, .05, "triangle", .08); },
    door:   function () { tone(260, .2, "triangle", .14, 0, 520); tone(784, .18, "triangle", .14, .16); tone(1175, .3, "triangle", .14, .3); },
    rewind: function () { tone(1100, .45, "sawtooth", .08, 0, 160); },
    coin:   function () { tone(988, .08, "square", .08); tone(1319, .28, "square", .08, .08); },
    start:  function () { tone(440, .1, "triangle", .15); tone(660, .1, "triangle", .15, .1); tone(880, .22, "triangle", .15, .2); },
    win:    function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, .3, "triangle", .16, i * .11); }); },
    end:    function () { tone(392, .25, "triangle", .14); tone(330, .25, "triangle", .14, .2); tone(262, .45, "triangle", .14, .4); }
  };
  function play(name) { if (!on) return; try { SOUNDS[name] && SOUNDS[name](); } catch (e) {} }

  function soundButton() {
    var bar = document.querySelector(".bar .wrap"); if (!bar || document.getElementById("sndBtn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "ghost snd"; b.id = "sndBtn";
    function draw() { b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Sound on" : "Sound off"); b.title = on ? "Sound on" : "Sound off"; }
    b.onclick = function () { on = !on; try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch (e) {} draw(); if (on) play("click"); };
    draw();
    var before = bar.querySelector("#restart, #endGame");
    bar.insertBefore(b, before || null);
  }

  /* ---------- floating timer (always on screen while playing) ---------- */
  var ft = null, lastTick = -1;
  function timerEl() {
    if (ft) return ft;
    ft = document.createElement("div");
    ft.className = "ftimer"; ft.id = "fTimer"; ft.setAttribute("aria-hidden", "true");
    ft.innerHTML = '<svg viewBox="0 0 64 64"><circle class="trk" cx="32" cy="32" r="28"/><circle class="arc" cx="32" cy="32" r="28" pathLength="100"/></svg>' +
      '<div class="ft-in"><b class="ft-time">--:--</b><span class="ft-label"></span></div>';
    document.body.appendChild(ft);
    return ft;
  }
  /* text: what to show, p: 0..1 left, warn: last part, secs: seconds left (for the tick sound) */
  function timer(text, p, warn, label, secs, running) {
    var el = timerEl();
    el.querySelector(".ft-time").textContent = text;
    if (label != null) el.querySelector(".ft-label").textContent = label;
    el.querySelector(".arc").style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, p)) * 100);
    el.classList.toggle("warn", !!warn);
    if (running && secs > 0 && secs <= 10 && secs !== lastTick) { lastTick = secs; play("tick"); }
    if (secs > 10) lastTick = -1;
  }

  /* ---------- +points that float up ---------- */
  function points(n, from) {
    if (!n) return;
    var anchor = from || document.activeElement;
    if (!anchor || anchor === document.body || !anchor.getBoundingClientRect) anchor = document.getElementById("score");
    var r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    var s = document.createElement("div");
    s.className = "fx-points" + (n < 0 ? " neg" : "");
    s.textContent = (n > 0 ? "+" : "") + n;
    s.style.left = Math.min(innerWidth - 60, Math.max(10, r.left + r.width / 2 - 30)) + "px";
    s.style.top = Math.max(60, r.top - 10) + "px";
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1200);
  }

  /* ---------- shake ---------- */
  function shake() {
    if (reduce) return;
    var w = document.querySelector("body > .wrap"); if (!w) return;
    w.classList.remove("fx-shake"); void w.offsetWidth; w.classList.add("fx-shake");
    setTimeout(function () { w.classList.remove("fx-shake"); }, 500);
  }

  /* ---------- confetti ---------- */
  function confetti(amount) {
    if (reduce) return;
    var cv = document.createElement("canvas"); cv.className = "fx-confetti";
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    var c = cv.getContext("2d"); c.scale(dpr, dpr);
    var cols = ["#ff4757", "#46cf9f", "#c7ccd8", "#ffd166", "#ffffff"], ps = [];
    for (var i = 0; i < (amount || 140); i++) ps.push({
      x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .4, y: innerHeight * .35,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, s: 5 + Math.random() * 6,
      r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length]
    });
    var t0 = performance.now();
    (function frame(t) {
      var k = (t - t0) / 2600;
      c.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(function (p) {
        p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        c.save(); c.globalAlpha = Math.max(0, 1 - k); c.translate(p.x, p.y); c.rotate(p.r);
        c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
      });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------- stars for the result ---------- */
  function starsFor(ratio) { return ratio >= .9 ? 3 : ratio >= .6 ? 2 : ratio >= .3 ? 1 : 0; }
  function stars(ratio) {
    var n = starsFor(ratio), h = '<div class="fx-stars" role="img" aria-label="' + n + ' of 3 stars">';
    for (var i = 0; i < 3; i++) h += '<span class="' + (i < n ? "on" : "") + '" style="--d:' + (i * .18) + 's">★</span>';
    return h + "</div>";
  }

  /* ---------- reveal card (door opened, case solved...) ---------- */
  var rv = null, rvT = null;
  function reveal(o) {
    if (!rv) {
      rv = document.createElement("div"); rv.className = "fx-reveal"; rv.setAttribute("role", "status");
      rv.onclick = function () { rv.classList.remove("on"); };
      document.body.appendChild(rv);
    }
    rv.className = "fx-reveal" + (o.ok === false ? " bad" : "");
    rv.innerHTML = '<div class="fx-card"><div class="fx-kicker">' + (o.kicker || "") + '</div><div class="fx-big">' + (o.big || "") + '</div><div class="fx-title">' + (o.title || "") + '</div>' + (o.sub ? '<div class="fx-sub">' + o.sub + '</div>' : "") + "</div>";
    void rv.offsetWidth; rv.classList.add("on");
    clearTimeout(rvT); rvT = setTimeout(function () { rv.classList.remove("on"); }, o.ms || 1500);
  }

  /* celebrate the end of a game, only when it just happened (not on reload) */
  function finish(ratio, finishedAt) {
    if (finishedAt && Date.now() - finishedAt > 4000) return;
    if (ratio >= .6) { play("win"); confetti(ratio >= .9 ? 200 : 120); }
    else play("end");
  }

  document.addEventListener("DOMContentLoaded", soundButton);
  if (document.readyState !== "loading") soundButton();

  return { play: play, timer: timer, points: points, shake: shake, confetti: confetti, stars: stars, reveal: reveal, finish: finish, reduce: reduce };
})();
