/* FALLOW — site behaviour (vanilla, no dependencies, works on file://) */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesk = function () { return w.matchMedia('(min-width: 768px)').matches; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var seg = function (t, start, dur) { return clamp((t - start) / dur, 0, 1); };
  var BASE = d.body.getAttribute('data-base') || '';

  /* ---------- viewport helpers ---------- */
  function measure() {
    root.style.setProperty('--svh', w.innerHeight + 'px');
    root.style.setProperty('--sb', (w.innerWidth - root.clientWidth) + 'px');
  }
  measure(); w.addEventListener('resize', measure);

  /* ---------- scroll driver: every effect registers a frame callback ---------- */
  var frames = [];
  (function loop() { for (var i = 0; i < frames.length; i++) frames[i](); requestAnimationFrame(loop); })();
  /* smoothed value, ~1s catch-up like a scrubbed timeline */
  function scrubber() {
    var v = null, last = 0;
    return function (target) {
      var now = performance.now(), dt = Math.min(64, now - last); last = now;
      if (v === null) { v = target; return v; }
      v += (target - v) * (1 - Math.exp(-dt / 210));
      if (Math.abs(target - v) < 0.00015) v = target;
      return v;
    };
  }

  /* ---------- header ---------- */
  function onScroll() { d.body.classList.toggle('scrolled', w.scrollY > 5); }
  onScroll(); w.addEventListener('scroll', onScroll, { passive: true });
  $$('.hd-nav li.has').forEach(function (li) {
    var btn = $('button', li), t;
    var hover = w.matchMedia('(hover: hover) and (min-width: 768px)').matches;
    function set(o) { clearTimeout(t); li.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); }
    if (hover) {
      li.addEventListener('pointerenter', function () { set(true); });
      li.addEventListener('pointerleave', function () { t = setTimeout(function () { set(false); }, 120); });
    }
    btn.addEventListener('click', function () { if (hover) set(true); else set(!li.classList.contains('open')); });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) set(false); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } if (e.key === 'ArrowDown' && e.target === btn) { e.preventDefault(); set(true); $('.hd-dd a', li).focus(); } });
    d.addEventListener('click', function (e) { if (!li.contains(e.target)) set(false); });
  });

  /* ---------- sticky product CTA (mobile) ---------- */
  (function () {
    var c = $('.scta'); if (!c) return;
    var main = $('main'), foot = $('.ft'), second = $('[data-second]') || main.children[1];
    var pd = c.classList.contains('pdp') && $('.pd');
    function upd() {
      if (pd) c.classList.toggle('show', pd.getBoundingClientRect().bottom < w.innerHeight);
      if (w.innerWidth >= 1024) { c.classList.remove('dock'); c.style.top = ''; return; }
      if (c.classList.contains('home') && second) c.classList.toggle('rev', second.getBoundingClientRect().top < w.innerHeight);
      var fy = foot.getBoundingClientRect().top, dock = fy < w.innerHeight - 4 - 78 + 94;
      if (dock) { c.classList.add('dock'); c.style.top = (fy + w.scrollY - 94) + 'px'; } else { c.classList.remove('dock'); c.style.top = ''; }
    }
    w.addEventListener('scroll', upd, { passive: true }); w.addEventListener('resize', upd); upd();
  })();

  /* ---------- dotted links ---------- */
  $$('.dots').forEach(function (a) {
    var i = d.createElement('i'), h = ''; for (var k = 0; k < 90; k++) h += '<b style="--i:' + k + '"></b>'; i.innerHTML = h; i.setAttribute('aria-hidden', 'true'); a.appendChild(i);
  });

  /* ---------- scramble text ---------- */
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scramble(el, text, ms) {
    if (!el || el.textContent === text) return;
    if (reduced) { el.textContent = text; return; }
    var from = el.textContent, t0 = performance.now(), id = (el._s = (el._s || 0) + 1);
    (function tick(now) {
      if (el._s !== id) return;
      var p = clamp((now - t0) / ms, 0, 1), len = Math.round(from.length + (text.length - from.length) * p), done = Math.floor(text.length * p), out = text.slice(0, done);
      for (var i = done; i < len; i++) out += text[i] === ' ' ? ' ' : ABC[(Math.random() * 26) | 0];
      el.textContent = p === 1 ? text : out;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- pills timeline ---------- */
  var SEGS = [[0, 128], [151, 40], [353, 59], [488, 126], [639, 104], [961, 129], [1118, 65], [1265, 49], [1485, 18], [1640, 94], [1821, 83], [1976, 118], [2186, 65], [2398, 132], [2609, 37], [2850, 124], [3129, 123]];
  $$('.ptl').forEach(function (el) {
    var labels = JSON.parse(el.getAttribute('data-labels')), pill = $('.ptl-pill', el), dot = $('span', pill), txt = $('em', pill), strip = $('.ptl-strip', el), run = $('.ptl-run', el);
    var half = '<div>' + SEGS.map(function (s) { return '<b style="left:' + s[0] + 'px;width:' + s[1] + 'px"></b>'; }).join('') + '</div>';
    run.innerHTML = half + half;
    var bars = $$('b', run), idx = 0, ghost = txt.cloneNode(); ghost.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-style:normal'; pill.appendChild(ghost);
    function size() { ghost.textContent = labels[idx][0]; pill.style.width = Math.ceil(ghost.getBoundingClientRect().width + 56.5) + 'px'; }
    function mask() { var r = pill.getBoundingClientRect(), s = strip.getBoundingClientRect(); if (!s.width) return; var a = Math.max(0, (r.left - s.left + 1) / s.width * 100), b = Math.min(100, (r.right - s.left - 1) / s.width * 100), m = 'linear-gradient(to right,#000 ' + a + '%,#0000 ' + a + '%,#0000 ' + b + '%,#000 ' + b + '%)'; strip.style.webkitMaskImage = m; strip.style.maskImage = m; }
    size(); mask();
    (d.fonts && d.fonts.ready || Promise.resolve()).then(function () { size(); mask(); });
    w.addEventListener('resize', function () { size(); mask(); });
    if (reduced) return;
    var prev = [], vis = false;
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; prev = []; }, { rootMargin: '100px' }).observe(el);
    frames.push(function () {
      if (!vis) return; mask();
      var th = pill.getBoundingClientRect().right - 20;
      for (var i = 0; i < bars.length; i++) {
        var x = bars[i].getBoundingClientRect().left, p = prev[i];
        if (p !== undefined && p >= th && x < th) { idx = (idx + 1) % labels.length; size(); dot.style.backgroundColor = labels[idx][1]; scramble(txt, labels[idx][0], 600); }
        prev[i] = x;
      }
    });
  });

  /* ---------- number reveal ---------- */
  $$('[data-num]').forEach(function (el) {
    if (reduced) return;
    el.classList.add('na');
    var m = el.textContent.trim().match(/^([^0-9]*)([\d.]+)(.*)$/), delay = +el.getAttribute('data-num') || 0;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io.disconnect();
      setTimeout(function () {
        el.classList.add('in'); if (!m) return;
        var end = parseFloat(m[2]), dec = (m[2].split('.')[1] || '').length, st = Math.max(end - 20, dec ? 0 : 1), t0 = performance.now();
        (function f(now) { var p = clamp((now - t0) / 1500, 0, 1), e = p < .5 ? 2 * p * p : (4 - 2 * p) * p - 1; el.firstChild.nodeValue = m[1] + (st + (end - st) * e).toFixed(dec) + m[3]; if (p < 1) requestAnimationFrame(f); else el.firstChild.nodeValue = m[1] + m[2] + m[3]; })(t0);
      }, delay);
    }, { rootMargin: '0px', threshold: .1 }); io.observe(el);
  });

  /* ---------- split helpers ---------- */
  function splitWords(el) {
    var out = [];
    $$('span.ln', el).concat($('span.ln', el) ? [] : [el]).forEach(function (line) {
      var words = line.textContent.split(/\s+/).filter(Boolean); line.textContent = '';
      words.forEach(function (wd, i) { var s = d.createElement('span'); s.className = 'wd'; s.textContent = wd; line.appendChild(s); if (i < words.length - 1) line.appendChild(d.createTextNode(' ')); out.push(s); });
    });
    return out;
  }

  /* ---------- HOME hero ---------- */
  (function () {
    var sec = $('.hph'); if (!sec) return;
    /* rotating partner marks */
    var marks = $$('.hph-logos svg', sec);
    if (marks.length > 1 && !reduced) {
      var mi = 0; marks.forEach(function (m) { m.style.transition = 'opacity .75s linear'; });
      setInterval(function () { marks[mi].style.opacity = 0; mi = (mi + 1) % marks.length; marks[mi].style.opacity = 1; }, 3000);
    }
    if (reduced) return;
    var title = $('.hph-main h1', sec), words = splitWords(title), blur = $('.hph-blur', sec), groups = $$('[data-fade]', sec);
    var tp = $('.hph-text .bd p', sec), tw = splitWords(tp), lab = $$('[data-rise]', sec), chars = [];
    tw.forEach(function (s) { var t = s.textContent; s.textContent = ''; t.split('').forEach(function (c) { var k = d.createElement('span'); k.textContent = c; s.appendChild(k); chars.push(k); }); });
    var s1 = scrubber(), s2 = scrubber(), l1 = -1, l2 = -1, state = [], vids = $$('.hph-bg video', sec), slow = false;
    frames.push(function () {
      var y = w.scrollY; if (y > sec.offsetHeight + 200 && l2 === 1) return;
      var vh = w.innerHeight, desk = isDesk(), f = (desk ? 2.25 : 2) * vh, p = (desk ? 2.5 : 1.5) * vh, st = (desk ? 1 : .5) * vh;
      var a = s1(clamp(y / f, 0, 1)), b = s2(clamp((y - st) / p, 0, 1));
      if (a !== l1) {
        l1 = a; var n = words.length, wEnd = .05 + .08 * (n - 1) + .4, oStart = wEnd - .5, T = wEnd + 3, t = a * T;
        words.forEach(function (s, i) { var k = seg(t, .05 + .08 * i, .4); s.style.opacity = 1 - k; s.style.filter = k ? 'blur(' + (16 * k).toFixed(2) + 'px)' : ''; });
        var g = seg(t, oStart, .4); groups.forEach(function (o) { o.style.opacity = 1 - g; o.style.filter = g ? 'blur(' + (16 * g).toFixed(2) + 'px)' : ''; o.style.visibility = g === 1 ? 'hidden' : ''; });
        if (desk) { var q = seg(t, .05, .6); blur.style.width = (50 + 100 * q) + '%'; blur.style.setProperty('--e', (100 - 30 * q) + '%'); } else { blur.style.width = ''; blur.style.removeProperty('--e'); }
      }
      if (b !== l2) {
        l2 = b; var d0 = desk ? .25 : .1, aEnd = d0 + 1 + .15 * (lab.length - 1), wS = aEnd - .3, wE = wS + 1.6, cS = wE + .3, TT = cS + 3.6, u = b * TT;
        lab.forEach(function (e, i) { var k = seg(u, d0 + .15 * i, 1); e.style.opacity = k; e.style.transform = 'translateY(' + (32 * (1 - k)) + 'px)'; e.style.filter = k < 1 ? 'blur(' + (12 * (1 - k)) + 'px)' : ''; });
        var N = tw.length - 1; tw.forEach(function (e, i) { var k = seg(u, wS + i / N, .6); e.style.opacity = k; e.style.transform = k < 1 ? 'translateY(' + (24 * (1 - k)) + 'px)' : ''; });
        var C = chars.length - 1; for (var i = 0; i <= C; i++) { var k = seg(u, cS + 3 * i / C, .6); if (state[i] === k) continue; state[i] = k; chars[i].style.opacity = .3 + .7 * k; chars[i].style.filter = k < 1 ? 'blur(' + (2 * (1 - k)).toFixed(2) + 'px)' : ''; }
      }
      var want = y >= st && y <= st + p; if (want !== slow) { slow = want; vids.forEach(function (v) { try { v.playbackRate = want ? .5 : 1; } catch (e) { } }); }
    });
  })();

  /* ---------- pinned glass slides (science / story / score) ---------- */
  $$('.ch').forEach(function (sec) {
    if (reduced) return;
    var intro = $('.ch-intro', sec), cards = $$('.ch-card', sec), n = cards.length, s = scrubber(), on = [];
    cards.forEach(function (c) { c.style.transition = 'opacity 1.1s cubic-bezier(.22,.61,.36,1), transform 1.1s cubic-bezier(.22,.61,.36,1)'; });
    frames.push(function () {
      if (!isDesk()) {
        cards.forEach(function (c) { c.style.opacity = ''; c.style.transform = ''; }); intro.style.opacity = '';
        var r = $('.ch-slide', sec).getBoundingClientRect(); intro.style.filter = r.top <= 0 ? 'blur(16px)' : ''; return;
      }
      var top = sec.getBoundingClientRect().top, P = clamp(-top / (1.33 * w.innerHeight * n), 0, 1), q = s(P), k = seg(q * n, 0, 1);
      intro.style.opacity = 1 - k; intro.style.filter = k ? 'blur(' + (16 * k).toFixed(2) + 'px)' : ''; intro.style.visibility = k === 1 ? 'hidden' : '';
      var last = -1; cards.forEach(function (c, i) { var o = P >= (i + .4) / n; if (o) last = i; if (o !== on[i]) { on[i] = o; c.style.transitionDuration = o ? '1.1s' : '.46s'; c.style.opacity = o ? 1 : 0; c.style.transform = o ? 'none' : 'translateY(56px)'; } });
      cards.forEach(function (c, i) { c.classList.toggle('on', i === last); c.style.visibility = i < last - 0 && on[last] && i !== last ? (c._hid || (c._hid = 1, setTimeout(function () { }, 0)), c.style.visibility) : ''; if (i < last) c.style.backdropFilter = 'none'; else c.style.backdropFilter = ''; });
      cards.forEach(function (c, i) { var b = $('.ch-b', c), num = $('.num', c), hide = i < last; if (b) { b.style.transition = num ? (num.style.transition = 'opacity .5s') : ''; b.style.opacity = hide ? 0 : 1; if (num) num.style.opacity = hide ? 0 : 1; } });
    });
  });

  /* ---------- WHAT WE TEST ---------- */
  (function () {
    var sec = $('.wwt'); if (!sec) return;
    var slides = $$('.wwt-slide', sec), intro = $('.wwt-white', sec), inn = $('.wwt-in', sec), o = slides.length, Rh = .3, Ih = .8;
    /* tabs inside a slide */
    slides.forEach(function (sl) {
      var tabs = $$('.wwt-tabs button', sl), ps = $$('.wwt-p>div', sl);
      tabs.forEach(function (b, i) { b.addEventListener('click', function () { tabs.forEach(function (x, j) { x.setAttribute('aria-selected', i === j); ps[j].classList.toggle('on', i === j); }); }); });
    });
    /* rolling list */
    var roll = $('.wwt-roll ul', sec);
    if (roll) {
      var lis = $$('li', roll), N = lis.length, cur = 0; lis.forEach(function (l) { roll.appendChild(l.cloneNode(true)); }); var all = $$('li', roll);
      var put = function (i, anim) { roll.style.transition = anim ? 'transform .7s cubic-bezier(.4,0,.2,1)' : 'none'; roll.style.transform = 'translateY(' + (-60.6 * i) + 'px)'; all.forEach(function (l, j) { l.classList.toggle('on', j === i); }); };
      cur = 5; put(cur, false);
      if (!reduced) setInterval(function () { cur++; put(cur, true); if (cur >= N + 5) setTimeout(function () { cur -= N; put(cur, false); }, 760); }, 1500);
    }
    if (reduced) { intro.style.display = 'none'; return; }
    slides.forEach(function (sl) { sl._c = [].concat($('.pill', sl), $$('.wwt-tabs button', sl), $('.wwt-p', sl)); sl._c.forEach(function (e, i) { e._i = i; }); });
    function play(sl, on) {
      sl._c.forEach(function (e, i) {
        e.style.transition = 'opacity ' + (on ? .75 : .35) + 's cubic-bezier(.22,.61,.36,1) ' + (on ? (i ? .25 + .12 * (i - 1) : 0) : 0) + 's, filter ' + (on ? .75 : .35) + 's ' + (on ? (i ? .25 + .12 * (i - 1) : 0) : 0) + 's';
        e.style.filter = on ? 'blur(0px)' : 'blur(12px)';
        e.style.opacity = on ? '' : 0;
      });
      if (on) setTimeout(function () { sl._c.forEach(function (e) { if (sl._on) { e.style.transition = ''; e.style.filter = ''; } }); }, 2200);
    }
    slides.forEach(function (sl) { sl._c.forEach(function (e) { e.style.opacity = 0; e.style.filter = 'blur(12px)'; }); });
    var s = scrubber(), dir = 1, ly = w.scrollY, idle;
    frames.push(function () {
      var vh = w.innerHeight, len = vh * 3 * o, top = sec.getBoundingClientRect().top; if (top < -(len + vh * 1.2)) return;
      var P = clamp(-top / len, 0, 1), T = s(P) * o;
      slides.forEach(function (sl, t) {
        var k = seg(T, t, Ih), sc;
        if (t === 0) {
          sc = 1 + 3 * k; intro.style.setProperty('--os', sc); intro.style.visibility = k === 1 ? 'hidden' : ''; sl.style.visibility = 'visible';
          var f = seg(T, 0, Rh); inn.style.opacity = 1 - f; inn.style.filter = f ? 'blur(' + (12 * f) + 'px)' : '';
        } else {
          sc = .15 + 3.85 * k; sl.style.setProperty('--os', sc); var v = seg(T, t, .2); sl.style.opacity = v; sl.style.visibility = v > 0 ? 'visible' : 'hidden'; sl.classList.toggle('ov', k < 1);
        }
        var on = P >= (t + Rh) / o; if (on !== !!sl._on) { sl._on = on; play(sl, on); }
        sl.style.pointerEvents = T >= t + Rh && T < t + 1 + Rh ? 'auto' : 'none';
      });
    });
    function snap() {
      var vh = w.innerHeight, len = vh * 3 * o, start = sec.offsetTop, P = (w.scrollY - start) / len; if (P <= 0 || P >= 1) return;
      var n = P * o, r = Math.floor(n), i = n - r, to = null;
      if (i >= .62 && i < Ih && dir > 0) to = (r + Ih) / o; else if (i > 0 && i <= .12 && dir < 0) to = r / o;
      if (to !== null) w.scrollTo({ top: start + to * len + 1, behavior: 'smooth' });
    }
    w.addEventListener('scroll', function () { dir = w.scrollY >= ly ? 1 : -1; ly = w.scrollY; clearTimeout(idle); idle = setTimeout(snap, 140); }, { passive: true });
  })();

  /* ---------- carousels ---------- */
  $$('.car').forEach(function (car) {
    var tr = $('.car-tr', car), sl = $$('.car-s', car), pv = $('[data-prev]', car), nx = $('[data-next]', car), i = 0, x0 = null, dx = 0, base = 0;
    function cs(n) { return parseFloat(getComputedStyle(car).getPropertyValue(n)); }
    function calc() {
      var gap = parseFloat(getComputedStyle(sl[0]).marginRight), sw = cs('--sw'), aw = cs('--aw'), vw = tr.parentElement.clientWidth, tot = aw + sw * (sl.length - 1) + gap * (sl.length - 1);
      var x = i * (sw + gap); return -(w.innerWidth >= 1024 ? Math.min(x, Math.max(0, tot - vw)) : Math.min(x, Math.max(0, tot - vw + 0)));
    }
    function go(n) { i = clamp(n, 0, sl.length - 1); sl.forEach(function (s, k) { s.classList.toggle('on', k === i); }); base = calc(); tr.style.transform = 'translateX(' + base + 'px)'; pv.disabled = i === 0; nx.disabled = i === sl.length - 1; }
    function tall() {
      /* keep the row height stable: tallest open slide */
      var max = 0, aw = cs('--aw'), sw = cs('--sw'), pad = w.innerWidth < 768 ? 16 : 24;
      sl.forEach(function (s) { var t = $('.car-t', s), n = $('.car-n', s); t.style.width = (sw - pad) + 'px'; n.style.width = sw + 'px'; max = Math.max(max, aw + t.offsetHeight + n.offsetHeight + 8); t.style.width = n.style.width = ''; });
      tr.style.minHeight = Math.max(max, cs('--mh') || 0) + 'px';
    }
    pv.addEventListener('click', function () { go(i - 1); }); nx.addEventListener('click', function () { go(i + 1); });
    /* hover (desktop): only when the cursor really moved, not when a slide slid under a still cursor */
    var mx = -1, my = -1, lock = 0, moved = false, pid = null, y0 = 0, lx = 0, lt = 0, vel = 0;
    sl.forEach(function (s, k) {
      s.addEventListener('mouseenter', function (e) { if (w.innerWidth < 1024 || x0 !== null || performance.now() < lock || (e.clientX === mx && e.clientY === my)) return; go(k); });
      s.addEventListener('click', function () { if (!moved) go(k); });
    });
    car.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    function swipeTo(n) { lock = performance.now() + 650; go(n); }
    /* rubber band: free inside the track, damped past either end */
    function follow(d) {
      var min = -Math.max(0, tr.scrollWidth - tr.parentElement.clientWidth), x = base + d;
      if (x > 0) x *= .3; else if (x < min) x = min + (x - min) * .3;
      tr.style.transform = 'translateX(' + x + 'px)';
    }
    /* swipe / drag: mouse, pen and touch */
    tr.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = lx = e.clientX; y0 = e.clientY; lt = performance.now(); dx = vel = 0; moved = false; pid = e.pointerId;
    });
    w.addEventListener('pointermove', function (e) {
      if (x0 === null || e.pointerId !== pid) return;
      dx = e.clientX - x0;
      if (!moved) { if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - y0)) return; moved = true; tr.classList.add('drag'); }
      var now = performance.now(); if (now > lt) { vel = (e.clientX - lx) / (now - lt); lx = e.clientX; lt = now; }
      follow(dx);
    });
    function up(e) {
      if (x0 === null || (e && e.pointerId !== pid)) return;
      x0 = null; tr.classList.remove('drag'); if (!moved) return;
      if (performance.now() - lt > 120) vel = 0;
      var step = cs('--sw') + parseFloat(getComputedStyle(sl[0]).marginRight), n = Math.round(-dx / step);
      if (!n && (Math.abs(dx) > 50 || Math.abs(vel) > .4)) n = (Math.abs(vel) > .4 ? vel : dx) < 0 ? 1 : -1;
      swipeTo(i + n);
      setTimeout(function () { moved = false; }, 60);
    }
    w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
    tr.addEventListener('dragstart', function (e) { e.preventDefault(); });
    tr.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    /* touchpad: two-finger horizontal swipe = one slide per gesture (momentum tail is ignored) */
    var acc = 0, last = 0, prev = 0, busy = 0;
    car.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = performance.now(), d = e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? w.innerWidth : 1), ab = Math.abs(d);
      if (now - last > 140) { acc = 0; busy = 0; }                         /* new gesture */
      else if (busy && now > busy && ab > prev * 1.6 && ab > 12) busy = 0; /* a fresh flick inside the momentum tail */
      if (acc && (acc < 0) !== (d < 0)) acc = 0;
      last = now; prev = ab;
      if (busy) return;
      acc += d;
      if (Math.abs(acc) >= 40) { swipeTo(i + (acc > 0 ? 1 : -1)); acc = 0; busy = now + 420; }
    }, { passive: false });
    car.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
    function init() { tall(); go(i); } init(); (d.fonts && d.fonts.ready || Promise.resolve()).then(init); w.addEventListener('resize', init);
  });

  /* ---------- how it works ---------- */
  (function () {
    var sec = $('.hiw'); if (!sec) return;
    var steps = $$('.hs', sec), med = $$('.hiw-m .hiw-sl', sec), badge = $('.hiw-m .hiw-b', sec), A = $('[data-a]', badge), B = $('[data-b]', badge), ico = $('svg', badge), cur = 0;
    function set(n) {
      if (n === cur) return; cur = n; med.forEach(function (m, k) { m.style.zIndex = k === n ? 2 : 1; m.classList.toggle('on', k === n); });
      var a = med[n].getAttribute('data-a') || '', b = med[n].getAttribute('data-b') || ''; badge.style.opacity = a || b ? 1 : 0; ico.style.opacity = med[n].hasAttribute('data-i') ? 1 : 0;
      if (a || b) { scramble(A, a, 600); scramble(B, b, 600); }
    }
    frames.push(function () {
      if (!isDesk()) return; var r0 = sec.getBoundingClientRect(); if (r0.bottom < -100 || r0.top > w.innerHeight + 100) return;
      var mid = w.innerHeight / 2, last = 0;
      steps.forEach(function (s, k) {
        var r = s.getBoundingClientRect(); if (r.top <= mid) last = k;
        var pin = $('.hs-p', s), ln = $('.ln', s), bot = $('.hs-c>.cap', s).getBoundingClientRect(); ln.style.height = Math.max(0, bot.top - pin.getBoundingClientRect().top - 20) + 'px';
      }); set(last);
    });
  })();

  /* ---------- folds (accordions) ---------- */
  $$('[data-fold]').forEach(function (b) {
    var p = d.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', o); p.classList.toggle('on', o); });
  });

  /* ---------- content explorer tabs ---------- */
  $$('.ce').forEach(function (ce) {
    var tabs = $$('.ce-tabs button', ce), bar = $('.ce-bar', ce), ds = $$('.ce-d p', ce), ms = $$('.ce-m>div', ce);
    function go(i) { tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; ds[k].classList.toggle('on', k === i); ms[k].classList.toggle('on', k === i); }); bar.style.transform = 'translateY(' + i * 64 + 'px)'; }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); }); t.addEventListener('keydown', function (e) { var n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : -1; if (n >= 0 && n < tabs.length) { e.preventDefault(); go(n); tabs[n].focus(); } }); });
    if (tabs.length) go(0);
  });

  /* ---------- lightbox ---------- */
  (function () {
    var trig = $$('[data-zoom]'); if (!trig.length) return;
    var box = d.createElement('div'); box.className = 'lbx'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Image'); box.innerHTML = '<div class="in"></div><button type="button" aria-label="Close"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M1 1l10 10M11 1L1 11"/></svg></button>'; d.body.appendChild(box);
    var last;
    function close() { box.classList.remove('on'); d.body.style.overflow = ''; if (last) last.focus(); }
    trig.forEach(function (t) { t.addEventListener('click', function () { last = t; var src = t.tagName === 'IMG' ? t : t.closest('figure').querySelector('.ui,img'); var n = src.cloneNode(true); n.className = src.classList.contains('ui') ? 'ui' : ''; n.removeAttribute('data-zoom'); var h = $('.in', box); h.innerHTML = ''; h.appendChild(n); box.classList.add('on'); d.body.style.overflow = 'hidden'; $('button', box).focus(); }); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('button') || e.target.classList.contains('in')) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  })();

  /* ---------- cart (localStorage, demo only) ---------- */
  var KEY = 'fallow-cart', PLANS = { once: { n: 'Fallow™ Soil Core Test', s: 'One time purchase', p: 189 }, season: { n: 'Fallow™ Soil Core Test', s: 'Seasonal tracking, every 3 months', p: 149 } };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { } badgeN(); }
  function count() { var c = load(), n = 0; Object.keys(c).forEach(function (k) { n += c[k]; }); return n; }
  function badgeN() { $$('[data-cart]').forEach(function (a) { var n = count(); a.textContent = n ? 'Cart (' + n + ')' : 'Cart'; }); }
  badgeN();
  (function () {
    var opts = $$('.opt'); if (!opts.length) return;
    opts.forEach(function (o) {
      $('input', o).addEventListener('change', function () { opts.forEach(function (x) { x.classList.toggle('on', x === o); }); });
      $('.btn', o).addEventListener('click', function (e) { e.preventDefault(); var c = load(), k = $('input', o).value; c[k] = (c[k] || 0) + 1; save(c); location.href = BASE + 'cart.html'; });
    });
  })();
  (function () {
    var m = $('[data-cart-page]'); if (!m) return;
    function draw() {
      var c = load(), ks = Object.keys(c).filter(function (k) { return c[k] > 0 && PLANS[k]; }), tot = 0, h = '';
      if (!ks.length) h = '<div class="cart-e"><h1 class="h2">Your cart is empty</h1><a class="btn btn-g" href="test.html">Shop now</a></div>';
      ks.forEach(function (k) { var P = PLANS[k]; tot += P.p * c[k]; h += '<div class="ci"><img src="assets/img/range-1.jpg" alt=""><div><h2 class="t16">' + P.n + '</h2><p class="t14">' + P.s + '</p><span class="qty"><button type="button" data-d="-1" data-k="' + k + '" aria-label="Decrease">–</button><span>' + c[k] + '</span><button type="button" data-d="1" data-k="' + k + '" aria-label="Increase">+</button></span></div><div><span class="t16">$' + (P.p * c[k]).toFixed(2) + '</span><button type="button" class="rm" data-rm="' + k + '">Remove</button></div></div>'; });
      $('[data-items]', m).innerHTML = h; $('[data-total]', m).textContent = '$' + tot.toFixed(2);
      var pay = $('[data-pay]', m); pay.className = 'btn ' + (ks.length ? 'btn-g' : 'btn-x'); pay.setAttribute('aria-disabled', !ks.length); pay.style.opacity = 1;
    }
    m.addEventListener('click', function (e) { var b = e.target.closest('[data-d],[data-rm]'); if (!b) return; var c = load(); if (b.hasAttribute('data-rm')) delete c[b.getAttribute('data-rm')]; else { var k = b.getAttribute('data-k'); c[k] = (c[k] || 0) + (+b.getAttribute('data-d')); if (c[k] <= 0) delete c[k]; } save(c); draw(); });
    $('[data-pay]', m).addEventListener('click', function (e) { e.preventDefault(); var n = $('[data-note]', m); n.hidden = false; });
    draw();
  })();

  /* ---------- reviews ---------- */
  (function () {
    var r = $('.rev'); if (!r) return;
    var list = $('[data-list]', r), items = $$('.rv', list), more = $('.rv-more', r), open = false, stars = 0;
    function draw() { var n = 0; items.forEach(function (x) { var ok = !stars || +x.getAttribute('data-s') === stars; n += ok ? 1 : 0; x.hidden = !ok || (!open && n > 5); }); $('[data-count]', r).textContent = n + (n === 1 ? ' review' : ' reviews'); more.hidden = open || n <= 5; }
    more.addEventListener('click', function () { open = true; draw(); });
    $('[data-filter]', r).addEventListener('click', function () { var f = $('.rev-fil', r); f.hidden = !f.hidden; this.setAttribute('aria-expanded', !f.hidden); });
    $$('.rev-fil button', r).forEach(function (b) { b.addEventListener('click', function () { var s = +b.getAttribute('data-s'); stars = stars === s ? 0 : s; $$('.rev-fil button', r).forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-s') === stars); }); draw(); }); });
    $('select', r).addEventListener('change', function () { var v = this.value; items.sort(function (a, b) { return v === 'photos' ? (b.querySelector('img') ? 1 : 0) - (a.querySelector('img') ? 1 : 0) || a._o - b._o : v === 'new' ? a.getAttribute('data-t') - b.getAttribute('data-t') : v === 'high' ? b.getAttribute('data-s') - a.getAttribute('data-s') : a.getAttribute('data-s') - b.getAttribute('data-s'); }); items.forEach(function (x) { list.appendChild(x); }); draw(); });
    items.forEach(function (x, i) { x._o = i; $$('.hp button', x).forEach(function (b) { b.addEventListener('click', function () { var on = b.classList.toggle('on'), s = $('span', b); s.textContent = +s.textContent + (on ? 1 : -1); }); }); });
    draw();
  })();

  /* ---------- journal filters ---------- */
  (function () {
    var j = $('[data-journal]'); if (!j) return;
    var topic = '', el = '', arts = $$('.jr-l article', j), tb = $$('.jr-t button', j), eb = $$('.elt', j), all = $('[data-all]', j), sw = $('.sw', j);
    function draw() {
      var n = 0; arts.forEach(function (a) { var ok = (!topic || (' ' + a.getAttribute('data-topic') + ' ').indexOf(' ' + topic + ' ') > -1) && (!el || (' ' + a.getAttribute('data-el') + ' ').indexOf(' ' + el + ' ') > -1); a.hidden = !ok; if (ok) n++; });
      $('[data-n]', j).textContent = n + ' of ' + arts.length + ' articles'; $('.jr-e', j).hidden = n > 0;
      tb.forEach(function (b) { b.classList.toggle('on', b.value === topic); b.setAttribute('aria-pressed', b.value === topic); }); eb.forEach(function (b) { b.classList.toggle('on', b.value === el); b.setAttribute('aria-pressed', b.value === el); }); all.classList.toggle('on', !el);
      var t = tb.filter(function (b) { return b.value === topic; })[0]; sw.hidden = !topic; if (t) $('b', sw).textContent = $('b', t).textContent;
    }
    tb.forEach(function (b) { b.addEventListener('click', function () { topic = topic === b.value ? '' : b.value; draw(); }); });
    eb.forEach(function (b) { b.addEventListener('click', function () { el = el === b.value ? '' : b.value; draw(); }); });
    all.addEventListener('click', function () { el = ''; draw(); }); $('button', sw).addEventListener('click', function () { topic = ''; el = ''; draw(); });
    draw();
  })();

  /* ---------- forms (front-end only, nothing is sent) ---------- */
  var MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  (function () {
    var f = $('#contact-form'); if (!f) return; var btn = $('button[type=submit]', f), agree = $('[name=agree]', f);
    function sync() { btn.disabled = !agree.checked; } agree.addEventListener('change', sync); sync();
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var bad = 0;
      $$('.fld', f).forEach(function (l) { var i = $('input,textarea', l), err = $('em', l), msg = ''; if (i.required && !i.value.trim()) msg = 'This field is required'; else if (i.type === 'email' && !MAIL.test(i.value)) msg = 'Please enter a valid email address'; l.classList.toggle('bad', !!msg); err.hidden = !msg; err.textContent = msg; if (msg) bad++; });
      if (bad) return; f.reset(); sync(); $('.form-ok', f).hidden = false;
    });
  })();
  (function () {
    var f = $('#account-form'); if (!f) return;
    f.addEventListener('submit', function (e) { e.preventDefault(); var i = $('input[type=email]', f), o = $('.ok', f); o.hidden = false; o.textContent = MAIL.test(i.value) ? 'Check your inbox. A six-digit code is on its way.' : 'Please enter a valid email address.'; });
  })();

  /* ---------- promo popup ---------- */
  (function () {
    var p = $('.pop'); if (!p) return;
    var KEYP = 'fallow-popup', seen; try { seen = sessionStorage.getItem('popup-seen') || sessionStorage.getItem(KEYP); } catch (e) { }
    function close() { p.classList.remove('on'); d.body.style.overflow = ''; try { sessionStorage.setItem(KEYP, '1'); } catch (e) { } }
    if (!seen) setTimeout(function () { p.classList.add('on'); d.body.style.overflow = 'hidden'; $('.pop-x', p).focus({ preventScroll: true }); }, 9000);
    p.addEventListener('click', function (e) { if (e.target === p || e.target.closest('.pop-x,.no')) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && p.classList.contains('on')) close(); });
    $('form', p).addEventListener('submit', function (e) { e.preventDefault(); var i = $('input', p), er = $('.er', p); if (!MAIL.test(i.value)) { er.hidden = false; return; } er.hidden = true; $('.pop-l', p).innerHTML = '<h2>You’re on the list</h2><p>Use code FIRSTCORE at checkout for 10% off.</p><button type="button" class="btn btn-g no">Keep reading</button>'; });
  })();

  /* ---------- video: play when visible ---------- */
  $$('video').forEach(function (v) {
    v.muted = true;
    if (reduced) return;
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () { }); } else v.pause(); }).observe(v);
  });

  /* ---------- closing gradient: drifting two-tone field (WebGL) ---------- */
  var FS = 'precision highp float;uniform vec2 r;uniform float t;' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}' +
    'void main(){vec2 u=gl_FragCoord.xy/r.y*1.9;float a=t*.05;vec2 q=vec2(n(u*.8+vec2(a,3.-a*.6)),n(u*.8+vec2(7.2-a*.7,a)));' +
    'float f=n(u*.95+q*1.9+vec2(-a*.6,a*.4))*.72+n(u*1.9+q+vec2(5.+a,-a))*.28;f=smoothstep(.30,.58,f);' +
    'vec3 c=mix(vec3(.765,.69,.685),vec3(.40,.665,.69),f);c=mix(c,vec3(.49,.71,.69),.5*f*smoothstep(.4,.8,q.x));c=mix(c,vec3(.31,.60,.66),.45*f*smoothstep(.45,.85,q.y));' +
    'c+=(h(gl_FragCoord.xy*.37+fract(t*.13))-.5)*.04;gl_FragColor=vec4(c,1);}';
  $$('canvas[data-field]').forEach(function (cv) {
    var gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true }); if (!gl) return;
    function sh(tp, src) { var s = gl.createShader(tp); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return; gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.bindAttribLocation(pr, 0, 'p'); gl.vertexAttribPointer(gl.getAttribLocation(pr, 'p'), 2, gl.FLOAT, false, 0, 0);
    var ur = gl.getUniformLocation(pr, 'r'), ut = gl.getUniformLocation(pr, 't'), vis = false, off = +cv.getAttribute('data-field') || 0, last = 0;
    function draw(t) { var W = Math.max(2, Math.round(cv.clientWidth * .5)), H = Math.max(2, Math.round(cv.clientHeight * .5)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); } gl.uniform2f(ur, W, H); gl.uniform1f(ut, t + off); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    draw(20);
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
    w.addEventListener('resize', function () { draw(20); });
    if (!reduced) frames.push(function () { if (!vis) return; var now = performance.now(); if (now - last < 33) return; last = now; draw(20 + now / 1000 * 1.6); });
  });
})();
