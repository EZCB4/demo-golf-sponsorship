/* Fairline Media (fictional demo) — draft concept · shared behaviours */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var capture = location.search.indexOf('capture') !== -1;
  if (capture) { document.body.classList.add('capture'); reduced = true; }
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  if (!reduced) { requestAnimationFrame(function(){ document.body.classList.add('anim'); }); }
  else { document.body.classList.add('anim'); }

  /* page fade-in (fade-out handled on internal link clicks below) */
  requestAnimationFrame(function(){ document.body.classList.add('page-in'); });

  /* scroll-scrubbed swing hero: scroll drives a canvas blitting pre-decoded
     WebP frames (ImageBitmap). Decoding happens once at load; every scroll
     frame is a plain draw, smooth on any device. Falls back to the living
     sign-loop hero on reduced motion, missing APIs, or fetch failure. */
  var scrubSection = document.querySelector('.scrub');
  if (scrubSection) {
    var cvS = document.getElementById('scrubCanvas');
    var beat1 = document.getElementById('beat1');
    var beat3 = document.getElementById('beat3');
    var sHint = document.getElementById('scrubHint');
    var swapToFallback = function () {
      var tpl = document.getElementById('fallbackHero');
      if (tpl && scrubSection.parentNode) scrubSection.replaceWith(tpl.content.cloneNode(true));
    };
    if (reduced || capture || !cvS || !('createImageBitmap' in window) || !window.fetch) {
      swapToFallback();
    } else {
      var portraitS = innerHeight > innerWidth;
      var FS = portraitS
        ? { pre: 'assets/frames/p-', n: 108, fw: 810 }
        : { pre: 'assets/frames/l-', n: 145, fw: 1440 };
      var ctxS = cvS.getContext('2d');
      var framesS = new Array(FS.n);
      var gotFirst = false, drawnIdx = -1, cwS = 0, chS = 0;
      var sTarget = 0, sCur = -1;

      function sizeCanvasS() {
        var r = cvS.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        var scale = Math.min(window.devicePixelRatio || 1, FS.fw / r.width, 2);
        var w = Math.round(r.width * scale), h = Math.round(r.height * scale);
        if (w !== cwS || h !== chS) { cwS = cvS.width = w; chS = cvS.height = h; drawnIdx = -1; }
      }

      function drawS(p) {
        if (!cwS) sizeCanvasS();
        if (!cwS) return;
        var want = Math.round(clamp01(p) * (FS.n - 1));
        var idx = -1;
        for (var d = 0; d < FS.n; d++) {
          if (want - d >= 0 && framesS[want - d]) { idx = want - d; break; }
          if (want + d < FS.n && framesS[want + d]) { idx = want + d; break; }
        }
        if (idx < 0 || idx === drawnIdx) return;
        drawnIdx = idx;
        var bm = framesS[idx];
        var sc = Math.max(cwS / bm.width, chS / bm.height);
        var sw = cwS / sc, sh = chS / sc;
        ctxS.drawImage(bm, (bm.width - sw) / 2, (bm.height - sh) / 2, sw, sh, 0, 0, cwS, chS);
      }

      var order = (function () {
        var out = [0, FS.n - 1], seen = {}; seen[0] = 1; seen[FS.n - 1] = 1;
        var spans = [[0, FS.n - 1]];
        while (spans.length) {
          var sp = spans.shift(), mid = (sp[0] + sp[1]) >> 1;
          if (!seen[mid]) { seen[mid] = 1; out.push(mid); }
          if (mid - sp[0] > 1) spans.push([sp[0], mid]);
          if (sp[1] - mid > 1) spans.push([mid, sp[1]]);
        }
        return out;
      })();
      var inflight = 0, cursor = 0, failed = 0;
      function pump() {
        while (inflight < 6 && cursor < order.length) {
          (function (i) {
            inflight++;
            var name = ('00' + (i + 1)).slice(-3);
            fetch(FS.pre + name + '.webp').then(function (r) {
              if (!r.ok) throw new Error('http');
              return r.blob();
            }).then(function (b) { return createImageBitmap(b); }).then(function (bm) {
              framesS[i] = bm; gotFirst = true; drawnIdx = -1;
              inflight--; pump();
            }).catch(function () { failed++; inflight--; pump(); });
          })(order[cursor++]);
        }
      }
      pump();
      var fallbackChecks = 0;
      (function armFallback() {
        setTimeout(function () {
          if (gotFirst) return;
          if (failed >= 4 || fallbackChecks++ > 5) { swapToFallback(); return; }
          armFallback();
        }, 4000);
      })();

      var onScrubScroll = function () {
        var total = scrubSection.offsetHeight - innerHeight;
        sTarget = total > 0 ? clamp01(-scrubSection.getBoundingClientRect().top / total) : 0;
      };
      addEventListener('scroll', onScrubScroll, { passive: true });
      addEventListener('resize', function () { sizeCanvasS(); onScrubScroll(); }, { passive: true });
      onScrubScroll();

      (function scrubLoop() {
        var gap = sTarget - sCur;
        sCur += gap * (Math.abs(gap) > 0.18 ? 0.34 : 0.15);
        if (Math.abs(gap) < 0.0006) sCur = sTarget;
        var p = clamp01(sCur);
        drawS(p);
        if (beat1) {
          beat1.style.opacity = clamp01(1 - (p - 0.20) / 0.14);
          beat1.style.transform = 'translateY(' + (p * -60).toFixed(1) + 'px)';
        }
        if (beat3) beat3.style.opacity = clamp01((p - 0.70) / 0.14);
        if (sHint) sHint.style.opacity = p > 0.05 ? 0 : 1;
        requestAnimationFrame(scrubLoop);
      })();
    }
  }

  /* masked title reveals — wrap every section heading */
  document.querySelectorAll('.sec-head h2, .feature h2, .split__inner h2, .band h2, .show h2, .range__head h2, .how__head h2').forEach(function(h){
    if (h.querySelector('.tmask__inner')) return;
    var inner = document.createElement('span');
    inner.className = 'tmask__inner';
    while (h.firstChild) inner.appendChild(h.firstChild);
    h.appendChild(inner);
    h.classList.add('tmask');
  });
  var tio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add('in'); tio.unobserve(e.target); }
    });
  }, {threshold:.4});
  document.querySelectorAll('.tmask').forEach(function(el){
    if (capture || reduced) el.classList.add('in');
    else tio.observe(el);
  });

  /* scroll progress bar */
  var prog = document.createElement('div');
  prog.className = 'progress';
  document.body.appendChild(prog);
  addEventListener('scroll', function(){
    var max = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
  }, {passive:true});

  /* reduced motion / capture: swap hero video for its poster still */
  var hv = document.getElementById('heroVideo');
  if (hv && reduced) {
    var still = document.createElement('img');
    still.src = hv.getAttribute('poster');
    still.className = hv.className;
    still.alt = 'A golden-hour golf course with a twin-post tee sign';
    still.style.animation = 'none';
    hv.replaceWith(still);
  }

  /* sticky nav: solid after 24px, hidden once past the first screen (returns on scroll up) */
  var nav = document.querySelector('.nav');
  var lastY = scrollY;
  function navState(){
    if (!nav) return;
    nav.classList.toggle('scrolled', scrollY > 24);
    if (capture || document.body.classList.contains('menu-open')) { nav.classList.remove('hidden'); lastY = scrollY; return; }
    var pastFirstScreen = scrollY > innerHeight * .85;
    var goingDown = scrollY > lastY + 2;
    var goingUp = scrollY < lastY - 2;
    if (pastFirstScreen && goingDown) nav.classList.add('hidden');
    else if (goingUp || !pastFirstScreen) nav.classList.remove('hidden');
    lastY = scrollY;
  }
  addEventListener('scroll', navState, {passive:true}); navState();

  /* burger / drawer */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function(){
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.drawer a').forEach(function(a){
      a.addEventListener('click', function(){ document.body.classList.remove('menu-open'); });
    });
  }

  /* dropdown */
  document.querySelectorAll('.dd').forEach(function(dd){
    var btn = dd.querySelector('.dd__btn');
    btn.addEventListener('click', function(e){ e.stopPropagation(); dd.classList.toggle('open'); });
    dd.addEventListener('pointerenter', function(){ dd.classList.add('open'); });
    dd.addEventListener('pointerleave', function(){ dd.classList.remove('open'); });
  });
  addEventListener('click', function(){ document.querySelectorAll('.dd.open').forEach(function(d){ d.classList.remove('open'); }); });

  /* scroll reveals */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:.16, rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.reveal, .tstep').forEach(function(el){ io.observe(el); });
  if (capture) document.querySelectorAll('.reveal, .tstep').forEach(function(el){ el.classList.add('in'); });

  /* animated counters */
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, target = parseInt(el.getAttribute('data-count'), 10);
      var prefix = el.getAttribute('data-prefix') || '', suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = prefix + target + suffix; return; }
      var t0 = null;
      function tick(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 1400, 1);
        el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, {threshold:.5});
  document.querySelectorAll('[data-count]').forEach(function(el){
    if (capture || reduced) el.textContent = (el.getAttribute('data-prefix')||'') + el.getAttribute('data-count') + (el.getAttribute('data-suffix')||'');
    else cio.observe(el);
  });

  /* accordion: keep only one open */
  document.querySelectorAll('.acc').forEach(function(acc){
    acc.querySelectorAll('details').forEach(function(d){
      d.addEventListener('toggle', function(){
        if (d.open) acc.querySelectorAll('details').forEach(function(o){ if (o !== d) o.open = false; });
      });
    });
    if (capture) { var f = acc.querySelector('details'); if (f) f.open = true; }
  });

  /* compare slider */
  document.querySelectorAll('.compare').forEach(function(c){
    function setPos(clientX){
      var r = c.getBoundingClientRect();
      var p = Math.min(Math.max((clientX - r.left) / r.width, .04), .96);
      c.style.setProperty('--pos', (p * 100).toFixed(2) + '%');
    }
    c.addEventListener('pointerdown', function(e){ c.setPointerCapture(e.pointerId); setPos(e.clientX); });
    c.addEventListener('pointermove', function(e){ if (e.pressure > 0 || e.buttons) setPos(e.clientX); });
    c.addEventListener('pointerenter', function(e){ if (!('ontouchstart' in window)) setPos(e.clientX); });
    c.addEventListener('pointermove', function(e){ if (!('ontouchstart' in window) && !e.buttons) setPos(e.clientX); });
  });

  /* lightbox */
  var lb = document.querySelector('.lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    document.querySelectorAll('[data-lightbox]').forEach(function(t){
      t.addEventListener('click', function(){
        lbImg.src = t.getAttribute('data-lightbox') || t.currentSrc || t.src;
        lb.classList.add('open');
      });
    });
    lb.addEventListener('click', function(){ lb.classList.remove('open'); });
    addEventListener('keydown', function(e){ if (e.key === 'Escape') lb.classList.remove('open'); });
  }

  /* club grid: search + country filter */
  var grid = document.getElementById('clubGrid');
  if (grid) {
    var q = document.getElementById('clubSearch');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var countEl = document.getElementById('clubCount');
    var active = 'all';
    function apply(){
      var term = (q && q.value || '').toLowerCase().trim();
      var visible = 0;
      grid.querySelectorAll('.club').forEach(function(card){
        var hay = (card.getAttribute('data-name') + ' ' + card.getAttribute('data-loc')).toLowerCase();
        var okTerm = !term || hay.indexOf(term) !== -1;
        var okChip = active === 'all' || card.getAttribute('data-country') === active;
        var show = okTerm && okChip;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      if (countEl) countEl.innerHTML = 'Showing <b>' + visible + '</b> of <b>' + grid.querySelectorAll('.club').length + '</b> partner venues';
    }
    if (q) q.addEventListener('input', apply);
    chips.forEach(function(ch){
      ch.addEventListener('click', function(){
        chips.forEach(function(o){ o.classList.remove('active'); });
        ch.classList.add('active');
        active = ch.getAttribute('data-filter');
        apply();
      });
    });
    apply();
  }

  if (reduced) return; /* everything below is motion */

  /* page fade-out on internal navigation */
  document.querySelectorAll('a[href$=".html"], a[href^="index"], a[href^="#"]').forEach(function(a){
    var href = a.getAttribute('href') || '';
    if (href.indexOf('.html') === -1) return;
    a.addEventListener('click', function(e){
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
      e.preventDefault();
      document.body.classList.add('page-out');
      setTimeout(function(){ location.href = href; }, 210);
    });
  });

  var fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    /* custom cursor */
    document.body.classList.add('has-cursor');
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var halo = document.createElement('div'); halo.className = 'cursor-halo';
    document.body.appendChild(halo); document.body.appendChild(dot);
    var mx = innerWidth/2, my = innerHeight/2, hx = mx, hy = my;
    addEventListener('pointermove', function(e){ mx = e.clientX; my = e.clientY; }, {passive:true});
    (function cursorLoop(){
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      hx += (mx - hx) * .16; hy += (my - hy) * .16;
      halo.style.left = hx + 'px'; halo.style.top = hy + 'px';
      requestAnimationFrame(cursorLoop);
    })();
    document.querySelectorAll('a, button, .compare, input, select, textarea').forEach(function(el){
      el.addEventListener('pointerenter', function(){ halo.classList.add('grow'); });
      el.addEventListener('pointerleave', function(){ halo.classList.remove('grow'); });
    });

    /* hero cursor spotlight (living hero or scrub stage) */
    var heroEl = document.querySelector('.hero__media') || document.querySelector('.scrub__stage');
    if (heroEl) {
      var spot = document.createElement('div');
      spot.className = 'spotlight';
      heroEl.appendChild(spot);
      heroEl.addEventListener('pointermove', function(e){
        var r = heroEl.getBoundingClientRect();
        spot.style.background = 'radial-gradient(560px at ' + (e.clientX - r.left) + 'px ' + (e.clientY - r.top) + 'px, rgba(112,80,255,.16), transparent 62%)';
      });
    }

    /* 3D tilt on cards */
    document.querySelectorAll('.card, .club, .case').forEach(function(el){
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        el.classList.add('tilting');
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 7) + 'deg) rotateY(' + (px * 9) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function(){
        el.classList.remove('tilting');
        el.style.transform = '';
      });
    });
  }

  /* scroll parallax on editorial images */
  var pimgs = Array.prototype.slice.call(document.querySelectorAll('.feature__img img, .show__img img'));
  if (pimgs.length) {
    var ticking = false;
    function parallax(){
      pimgs.forEach(function(img){
        var r = img.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var p = (r.top + r.height/2 - innerHeight/2) / innerHeight;
        img.style.transform = 'translateY(' + (p * -26) + 'px) scale(1.08)';
      });
      ticking = false;
    }
    addEventListener('scroll', function(){
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, {passive:true});
    parallax();
  }

  /* magnetic buttons */
  document.querySelectorAll('.btn').forEach(function(btn){
    btn.addEventListener('pointermove', function(e){
      var r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + (e.clientX - r.left - r.width/2) * .22 + 'px,' + (e.clientY - r.top - r.height/2) * .28 + 'px)';
    });
    btn.addEventListener('pointerleave', function(){
      btn.style.transition = 'transform .45s cubic-bezier(.2,.65,.2,1), background .25s, border-color .25s, color .25s';
      btn.style.transform = '';
      setTimeout(function(){ btn.style.transition = ''; }, 460);
    });
  });

  /* hero cursor depth-parallax (home) */
  var media = document.getElementById('heroMedia');
  var content = document.getElementById('heroContent');
  if (media) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    var loop = function(){
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      media.style.transform = 'translate3d(' + (cx * 20) + 'px,' + (cy * 13) + 'px,0) scale(1.045)';
      if (content) content.style.transform = 'translate3d(' + (cx * -9) + 'px,' + (cy * -6) + 'px,0)';
      raf = requestAnimationFrame(loop);
    };
    addEventListener('pointermove', function(e){
      tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5);
      if (raf === null) raf = requestAnimationFrame(loop);
    }, {passive:true});
  }

  /* page-hero scroll parallax (inner pages) */
  var pmedia = document.querySelector('.phero__media');
  if (pmedia) {
    addEventListener('scroll', function(){
      var y = Math.min(scrollY, innerHeight);
      pmedia.style.transform = 'translateY(' + y * .28 + 'px)';
    }, {passive:true});
  }

  /* drifting particles over the living hero */
  var canvas = document.getElementById('particles');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var P = [];
    function size(){ canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    size(); addEventListener('resize', size);
    for (var i = 0; i < 46; i++) {
      P.push({
        x: Math.random(), y: Math.random(),
        r: .6 + Math.random() * 1.7,
        s: .00016 + Math.random() * .00042,
        w: Math.random() * Math.PI * 2,
        a: .12 + Math.random() * .3,
        c: i % 3 === 0 ? '166,139,255' : '226,196,142'
      });
    }
    (function draw(){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      P.forEach(function(p){
        p.y -= p.s; p.w += .008;
        if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        var x = (p.x + Math.sin(p.w) * .012) * canvas.width;
        ctx.beginPath();
        ctx.arc(x, p.y * canvas.height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.fill();
      });
      requestAnimationFrame(draw);
    })();
  }
})();


/* demo: disabled contact links show a toast */
(function () {
  var toastEl = null, toastTimer = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href="#demo"]') : null;
    if (!a) return;
    e.preventDefault();
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'demo-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.textContent = 'This is a demo site. Contact buttons are switched off.';
      document.body.appendChild(toastEl);
    }
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  });
})();
