/* ==========================================================================
   iCAUR — main.js (shared). Vanilla JS + GSAP/ScrollTrigger + Lenis.
   Every feature is opt-in through data attributes, so the same file works
   on all pages:
     [data-header] [data-megamenu] [data-menu-toggle]          header + mega menu
     [data-video] [data-autoplay] [data-video-toggle]            background videos
     [data-slider] [data-slide] [data-slide-to]                  hero slideshow with progress steps (paused by [data-video-toggle])
     [data-hover-video]                                         video on card hover
     [data-split-lines] [data-hero-fade]                        hero title reveal
     [data-words]                                               words lighting up on scroll
     [data-reveal]                                              fade/slide in on enter
     [data-drift]                                               block slides down its column on scroll
     [data-grow-box]                                            centred box grows to full width on scroll
     [data-mask-zoom] [data-mask-cover] [data-mask-word]        word cut out of a cover, zooms through on scroll
     [data-tech] [data-tech-item] [data-tech-img]               pinned stage: image + titles change on scroll
     [data-parallax="N"]                                        parallax, N = % of travel
     [data-grow-bg]                                             section background grows to full width
     [data-count]                                               animated numbers
     [data-accordion]                                           horizontal accordion
     [data-cursor-target="Label"]                               custom cursor label
   With prefers-reduced-motion every strong effect becomes a simple fade.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isMobile = function () { return window.matchMedia('(max-width: 767px)').matches; };
  var hasGsap = typeof window.gsap !== 'undefined';
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  // in-page anchors go through Lenis too
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Language switch: mark current ---------- */
  $$('.lang-switch [data-lang]').forEach(function (a) {
    if (a.dataset.lang === root.lang) a.setAttribute('aria-current', 'true');
  });

  /* ---------- Header: transparent and full width at the top, .is-solid once scrolled ---------- */
  var header = document.querySelector('[data-header]');
  var menu = document.querySelector('[data-megamenu]');
  var menuToggles = $$('[data-menu-toggle]');
  var menuOpen = false;

  var lastY = window.scrollY;
  function updateHeader() {
    if (!header) return;
    var y = window.scrollY;
    header.classList.toggle('is-solid', y > 24 && !menuOpen);   // compact bar with panels
    header.classList.toggle('is-menu', menuOpen);               // full bar over the open mega menu
    // after 600px the bar slides away while scrolling down and comes back as soon as the user scrolls up
    if (menuOpen || y <= 600) header.classList.remove('is-hidden');
    else if (Math.abs(y - lastY) > 4) header.classList.toggle('is-hidden', y > lastY && !header.contains(document.activeElement));
    lastY = y;
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ---------- Mega menu [data-megamenu], opened by every [data-menu-toggle] ---------- */
  var lastToggle = null;
  function setMenu(open, focusBack) {
    if (!menu || open === menuOpen) return;
    menuOpen = open;
    menuToggles.forEach(function (t) {
      t.setAttribute('aria-expanded', String(open));
      var label = t.querySelector('[data-menu-label]');
      if (label) label.textContent = open ? t.dataset.labelClose : t.dataset.labelOpen;
    });
    root.classList.toggle('menu-open', open);
    updateHeader();
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      var first = menu.querySelector('a');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 250);
    } else {
      menu.classList.remove('is-open');
      setTimeout(function () { if (!menuOpen) menu.hidden = true; }, reduceMotion ? 0 : 450);
      if (focusBack && lastToggle) lastToggle.focus();
    }
  }
  menuToggles.forEach(function (t) {
    t.addEventListener('click', function () { lastToggle = t; setMenu(!menuOpen); });
  });
  if (menu) {
    // close when a link inside is used (also in-page anchors) or the empty area is clicked
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target === menu) setMenu(false);
    });
    // keep keyboard focus inside header + menu while open
    document.addEventListener('focusin', function (e) {
      if (menuOpen && !menu.contains(e.target) && !header.contains(e.target)) { var a = menu.querySelector('a'); if (a) a.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) setMenu(false, true);
  });

  /* ---------- Videos ---------- */
  function loadVideo(v) {
    if (v.dataset.loaded) return;
    var src = (isMobile() && v.dataset.srcMobile) || v.dataset.src;
    if (!src) return;
    v.src = src;
    v.dataset.loaded = '1';
    v.addEventListener('playing', function () { v.classList.add('is-playing'); });
  }
  function play(v) {
    loadVideo(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
  }

  // autoplay background videos, paused when off screen; none with reduced motion
  var toggles = $$('[data-video-toggle]');
  var userPaused = reduceMotion;
  $$('video[data-autoplay]').forEach(function (v) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !userPaused) play(v);
          else if (!en.isIntersecting) v.pause();
        });
      }, { threshold: 0.15 }).observe(v);
    } else if (!userPaused) play(v);
  });
  function syncToggles() {
    toggles.forEach(function (b) {
      b.setAttribute('aria-pressed', String(userPaused));
      var l = b.querySelector('[data-video-toggle-label]');
      if (l) l.textContent = userPaused ? b.dataset.labelPlay : b.dataset.labelPause;
    });
  }
  toggles.forEach(function (b) {
    b.addEventListener('click', function () {
      userPaused = !userPaused;
      var scope = b.closest('section') || document;
      $$('video[data-autoplay]', scope).forEach(function (v) { userPaused ? v.pause() : play(v); });
      syncToggles();
    });
  });
  syncToggles();

  // swap desktop/mobile source when the window crosses the breakpoint
  var mqMobile = window.matchMedia('(max-width: 767px)');
  var swapSources = function () {
    $$('video[data-src-mobile][data-loaded]').forEach(function (v) {
      var want = mqMobile.matches ? v.dataset.srcMobile : v.dataset.src;
      if (v.getAttribute('src') === want) return;
      var wasPlaying = !v.paused;
      v.classList.remove('is-playing');
      v.src = want;
      if (wasPlaying) play(v);
    });
  };
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', swapSources);

  // card videos: play on hover (desktop) or when well in view (touch)
  $$('[data-hover-video]').forEach(function (card) {
    var v = card.querySelector('video[data-video]');
    if (!v || reduceMotion) return;
    if (finePointer) {
      card.addEventListener('mouseenter', function () { play(v); });
      card.addEventListener('mouseleave', function () { v.pause(); });
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? play(v) : v.pause(); });
      }, { threshold: 0.6 }).observe(card);
    }
  });

  /* ---------- Hero slideshow [data-slider]: a timer moves to the next slide; the step bar only shows the progress ---------- */
  $$('[data-slider]').forEach(function (root) {
    var slides = $$('[data-slide]', root), steps = $$('[data-slide-to]', root);
    var toggle = root.querySelector('[data-video-toggle]');
    if (slides.length < 2) return;
    var interval = parseInt(root.dataset.interval, 10) || 8000;
    root.style.setProperty('--hero-interval', interval + 'ms');
    var current = 0, timer = null, startedAt = 0, remaining = interval;
    var isPaused = function () { return toggle ? toggle.getAttribute('aria-pressed') === 'true' : reduceMotion; };
    var stop = function () { clearTimeout(timer); timer = null; };
    var run = function () {
      stop();
      if (isPaused()) return;
      startedAt = Date.now();
      timer = setTimeout(function () { go(current + 1); }, remaining);
    };
    var go = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (sl, k) {
        var on = k === current;
        sl.classList.toggle('is-active', on);
        if (on) { sl.removeAttribute('aria-hidden'); sl.removeAttribute('inert'); }
        else { sl.setAttribute('aria-hidden', 'true'); sl.setAttribute('inert', ''); }
        var v = sl.querySelector('video[data-autoplay]');
        if (v) { if (on && !isPaused()) play(v); else v.pause(); }
      });
      steps.forEach(function (st, k) {
        st.classList.remove('is-active');
        st.classList.toggle('is-done', k < current);
        if (k === current) st.setAttribute('aria-current', 'true'); else st.removeAttribute('aria-current');
      });
      var active = steps[current];
      if (active) { void active.offsetWidth; active.classList.add('is-active'); }   // restart the fill animation
      remaining = interval;
      run();
    };
    steps.forEach(function (st) {
      st.addEventListener('click', function () { go(parseInt(st.dataset.slideTo, 10)); });
    });
    // the pause button (also pauses the video): runs after the video toggle has updated aria-pressed
    if (toggle) toggle.addEventListener('click', function () {
      setTimeout(function () {
        var paused = isPaused();
        root.classList.toggle('is-paused', paused);
        if (paused) { if (timer) remaining = Math.max(0, remaining - (Date.now() - startedAt)); stop(); }
        else run();
      }, 0);
    });
    root.classList.toggle('is-paused', isPaused());
    go(0);
  });

  /* ---------- Horizontal accordion ---------- */
  $$('[data-accordion]').forEach(function (acc) {
    var panels = $$('[data-accordion-panel]', acc);
    var activate = function (p) { panels.forEach(function (x) { x.classList.toggle('is-active', x === p); }); };
    activate(panels[0]);
    panels.forEach(function (p) {
      p.addEventListener('mouseenter', function () { activate(p); });
      p.addEventListener('focus', function () { activate(p); });
      p.addEventListener('click', function () { activate(p); });
    });
  });

  /* ---------- Carousel [data-carousel]: [data-carousel-track], -prev, -next, -dots ---------- */
  $$('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('[data-carousel-track]');
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var dotsBox = root.querySelector('[data-carousel-dots]');
    if (!track) return;
    var behavior = reduceMotion ? 'auto' : 'smooth';
    var step = function () {
      var c = track.firstElementChild;
      return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : 300;
    };
    var max = function () { return track.scrollWidth - track.clientWidth; };
    var dots = [];
    var buildDots = function () {
      if (!dotsBox) return;
      var n = Math.max(1, Math.ceil((max() - 4) / step()) + 1);
      if (n === dots.length) return;
      dotsBox.innerHTML = '';
      dots = [];
      for (var i = 0; i < n; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', (dotsBox.getAttribute('data-label') || '') + ' ' + (i + 1));
        b.addEventListener('click', (function (k) { return function () { track.scrollTo({ left: Math.min(k * step(), max()), behavior: behavior }); }; })(i));
        dotsBox.appendChild(b);
        dots.push(b);
      }
      dotsBox.hidden = n < 2;
    };
    var sync = function () {
      if (prev) prev.disabled = track.scrollLeft < 8;
      if (next) next.disabled = track.scrollLeft > max() - 8;
      if (dots.length) {
        var i = track.scrollLeft > max() - 8 ? dots.length - 1 : Math.round(track.scrollLeft / step());
        dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      }
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: behavior }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: behavior }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', function () { buildDots(); sync(); });
    buildDots();
    sync();
  });

  /* ---------- Pinned tech stage [data-tech]: one step per screen of scrolling ---------- */
  $$('[data-tech]').forEach(function (sec) {
    var items = $$('[data-tech-item]', sec), imgs = $$('[data-tech-img]', sec);
    var list = sec.querySelector('[data-tech-list]');
    var mq = window.matchMedia('(min-width: 1024px)');
    var current = -1;
    sec.style.setProperty('--tech-steps', items.length);
    var setStep = function (i) {
      if (i === current) return;
      current = i;
      items.forEach(function (el, k) { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
      imgs.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
      // offset = collapsed height of the items above (only titles: their text closes when they become inactive)
      var gap = parseFloat(getComputedStyle(list).rowGap) || 0, y = 0;
      for (var k = 0; k < i; k++) y += items[k].querySelector('.tech__title').offsetHeight + gap;
      list.style.transform = 'translateY(' + (-y) + 'px)';
    };
    var onScroll = function () {
      if (!sec.classList.contains('is-pinned')) return;
      var r = sec.getBoundingClientRect();
      var p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      setStep(Math.floor(p * items.length));
    };
    var apply = function () {
      var on = mq.matches && !reduceMotion;
      sec.classList.toggle('is-pinned', on);
      current = -1;
      if (on) onScroll();
      else { list.style.transform = ''; items.concat(imgs).forEach(function (el) { el.classList.remove('is-active', 'is-past'); }); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { current = -1; onScroll(); });
    if (mq.addEventListener) mq.addEventListener('change', apply);
    apply();
  });

  /* ---------- Drag to scroll (mouse only; touch scrolls natively) ---------- */
  $$('[data-drag-scroll]').forEach(function (track) {
    var startX = 0, startLeft = 0, down = false, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  /* ---------- Custom cursor ---------- */
  var cursor = document.querySelector('[data-cursor]');
  if (cursor && finePointer && !reduceMotion) {
    var label = cursor.querySelector('[data-cursor-label]');
    root.classList.add('has-cursor');
    var cx = 0, cy = 0, tx = 0, ty = 0, moving = false;
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!moving) { moving = true; requestAnimationFrame(loop); }
    }, { passive: true });
    var loop = function () {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) requestAnimationFrame(loop);
      else moving = false;
    };
    $$('[data-cursor-target]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { label.textContent = el.dataset.cursorTarget; cursor.classList.add('is-active'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-active'); });
    });
  }

  /* ---------- Countdown: [data-countdown="2027-03-01T09:00:00+01:00"] ----------
     Empty value = date not announced: the placeholder label stays and the grid is hidden. */
  $$('[data-countdown]').forEach(function (el) {
    var target = Date.parse(el.dataset.countdown || '');
    var grid = el.querySelector('[data-countdown-grid]');
    if (!target || !grid) return;
    grid.hidden = false;
    var label = el.querySelector('[data-countdown-label]');
    if (label) label.textContent = new Date(target).toLocaleDateString(root.lang || 'it', { day: 'numeric', month: 'long', year: 'numeric' });
    var cells = {};
    $$('[data-unit]', grid).forEach(function (c) { cells[c.dataset.unit] = c; });
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      cells.d.textContent = Math.floor(s / 86400);
      cells.h.textContent = pad(Math.floor(s / 3600) % 24);
      cells.m.textContent = pad(Math.floor(s / 60) % 60);
      cells.s.textContent = pad(s % 60);
      if (s > 0) setTimeout(tick, 1000);
    };
    tick();
  });

  /* ---------- Hand-off forms [data-handoff]: keep the values for the next page, without putting them in the URL ---------- */
  $$('form[data-handoff]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (!f.checkValidity()) return;
      var data = {};
      $$('input, select, textarea', f).forEach(function (el) { if (el.name && el.value) data[el.name] = el.value; });
      try { sessionStorage.setItem('icaur-prefill', JSON.stringify(data)); } catch (err) { return; }   // no storage: plain GET fallback
      e.preventDefault();
      window.location.href = f.getAttribute('action');
    });
  });

  /* ---------- Forms [data-form]: client-side validation, success message ----------
     Prototype only: nothing is sent. Messages come from data-msg-* attributes. */
  $$('[data-form]').forEach(function (form) {
    var success = form.querySelector('[data-form-success]');
    // [data-prefill]: values handed over by a short form elsewhere ([data-handoff], kept in sessionStorage)
    if (form.hasAttribute('data-prefill')) {
      try {
        var handed = JSON.parse(sessionStorage.getItem('icaur-prefill') || 'null');
        sessionStorage.removeItem('icaur-prefill');
        if (handed) Object.keys(handed).forEach(function (key) {
          var f = form.querySelector('[name="' + key.replace(/[^\w-]/g, '') + '"]');
          if (f && f.type !== 'checkbox' && f.type !== 'hidden') f.value = handed[key];
        });
      } catch (e) {}
    }
    // [data-prefill]: fields named like a URL parameter take its value (?motivo=test-drive&modello=v27)
    if (form.hasAttribute('data-prefill') && window.URLSearchParams) {
      new URLSearchParams(window.location.search).forEach(function (val, key) {
        var field = form.querySelector('[name="' + key.replace(/[^\w-]/g, '') + '"]');
        if (!field || field.type === 'checkbox' || field.type === 'hidden') return;
        if (field.tagName === 'SELECT' && !field.querySelector('option[value="' + val.replace(/[^\w-]/g, '') + '"]')) return;
        field.value = val;
      });
    }
    var showError = function (input, msg) {
      var err = document.getElementById(input.id + '-err');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) {
        err.textContent = msg || '';
        err.hidden = !msg;
        if (msg) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
      }
    };
    var check = function (input) {
      var msg = '';
      if (input.type === 'checkbox') { if (input.required && !input.checked) msg = form.dataset.msgPrivacy; }
      else if (input.required && !input.value.trim()) msg = form.dataset.msgRequired;
      else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) msg = form.dataset.msgEmail;
      showError(input, msg);
      return !msg;
    };
    var inputs = $$('input, select, textarea', form).filter(function (i) { return i.type !== 'hidden'; });
    inputs.forEach(function (i) {
      i.addEventListener('blur', function () { if (i.getAttribute('aria-invalid') || i.value) check(i); });
      i.addEventListener('change', function () { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      inputs.forEach(function (i) { if (!check(i) && !firstInvalid) firstInvalid = i; });
      if (firstInvalid) { firstInvalid.focus(); return; }
      form.reset();
      inputs.forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (success) { success.hidden = false; success.focus && success.setAttribute('tabindex', '-1'); success.focus(); }
    });
  });

  /* ---------- Hover reveal: an image follows the cursor over list rows ----------
     <section data-hover-reveal> rows [data-hover-img="src"] + frame [data-hover-reveal-frame] */
  if (finePointer && !reduceMotion) {
    $$('[data-hover-reveal]').forEach(function (root) {
      var frame = root.querySelector('[data-hover-reveal-frame]');
      var img = root.querySelector('[data-hover-reveal-img]');
      if (!frame || !img) return;
      var x = 0, y = 0, fx = 0, fy = 0, running = false;
      var loop = function () {
        fx += (x - fx) * 0.14; fy += (y - fy) * 0.14;
        frame.style.transform = 'translate3d(' + fx + 'px,' + fy + 'px,0) rotate(' + Math.max(-6, Math.min(6, (x - fx) * 0.05)) + 'deg)';
        if (frame.classList.contains('is-active') || Math.abs(x - fx) > 0.5) requestAnimationFrame(loop); else running = false;
      };
      $$('[data-hover-img]', root).forEach(function (row) {
        row.addEventListener('mouseenter', function (e) {
          img.src = row.dataset.hoverImg;
          if (!frame.classList.contains('is-active')) { fx = x = e.clientX; fy = y = e.clientY; }
          frame.classList.add('is-active');
          if (!running) { running = true; requestAnimationFrame(loop); }
        });
        row.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; });
        row.addEventListener('mouseleave', function () { frame.classList.remove('is-active'); });
      });
    });
  }

  /* ---------- Text splitting helpers ---------- */
  function splitLines(el) {
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p) {
      return '<span class="line-mask"><span>' + p.trim() + '</span></span>';
    }).join('');
    el.classList.add('is-split');
    return $$('.line-mask > span', el);
  }
  function splitWords(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="word">' + w + '</span>';
    }).join(' ');
    return $$('.word', el);
  }

  /* ---------- Animations (GSAP) ---------- */
  if (!hasGsap) {
    $$('[data-split-lines]').forEach(function (el) { el.classList.add('is-split'); });
    return;
  }

  // Hero: title rises line by line, then the rest fades in
  $$('[data-hero]').forEach(function (hero) {
    var title = hero.querySelector('[data-split-lines]');
    var lines = title ? splitLines(title) : [];
    var fades = $$('[data-hero-fade]', hero);
    var tl = gsap.timeline({ delay: 0.15 });
    if (reduceMotion) {
      tl.from([title].concat(fades), { opacity: 0, duration: 0.8, stagger: 0.1 });
    } else {
      tl.from(hero.querySelector('.hero__media'), { scale: 1.08, duration: 2.2, ease: 'power2.out' }, 0)
        .from(lines, { yPercent: 110, duration: 1.2, ease: 'power4.out', stagger: 0.12 }, 0.2)
        .from(fades, { opacity: 0, y: 16, duration: 0.9, ease: 'power2.out', stagger: 0.08 }, 0.7);
    }
  });
  $$('[data-split-lines]').forEach(function (el) {
    if (el.closest('[data-hero]')) return;
    var lines = splitLines(el);
    gsap.from(reduceMotion ? el : lines, {
      yPercent: reduceMotion ? 0 : 110, opacity: reduceMotion ? 0 : 1, duration: 1.1, ease: 'power4.out', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // Words lighting up as you scroll
  $$('[data-words]').forEach(function (el) {
    var words = splitWords(el);
    if (reduceMotion) { gsap.set(words, { opacity: 1 }); gsap.from(el, { opacity: 0, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 85%' } }); return; }
    gsap.to(words, {
      opacity: 1, ease: 'none', stagger: 0.4,   /* larger stagger = fewer half-lit words, sharper edge */
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  // Grow box: starts as a centred rounded box, becomes full width while it scrolls into view
  if (!reduceMotion) {
    gsap.matchMedia().add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, function (ctx) {
      $$('[data-grow-box]').forEach(function (el) {
        gsap.fromTo(el, { width: ctx.conditions.desk ? '72%' : '88%', borderRadius: 20 }, {
          width: '100%', borderRadius: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 5%', scrub: true }
        });
      });
    });
  }

  // Mask zoom: the cover with the cut-out word scales up from the middle of the "I" until the image below is fully visible
  if (!reduceMotion) {
    $$('[data-mask-zoom]').forEach(function (sec) {
      var cover = sec.querySelector('[data-mask-cover]'), word = sec.querySelector('[data-mask-word]');
      var img = sec.querySelector('[data-mask-img]');
      if (!cover || !word) return;
      var origin = function () {
        var txt = word.textContent, i = txt.indexOf('I'), box;
        try { box = word.getExtentOfChar(i < 0 ? Math.floor(txt.length / 2) : i); } catch (e) { box = null; }
        return box ? (box.x + box.width / 2) + 'px ' + (box.y + box.height * 0.55) + 'px' : '50% 50%';
      };
      var setOrigin = function () { gsap.set(cover, { transformOrigin: origin() }); };
      setOrigin();
      var tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true, onRefresh: setOrigin } });
      tl.fromTo(cover, { scale: 1 }, { scale: 90, ease: 'power3.in', duration: 1 }, 0.15)
        .to(cover, { autoAlpha: 0, duration: 0.08 }, 1.07);
      if (img) tl.fromTo(img, { scale: 1.15 }, { scale: 1, ease: 'none', duration: 1.15 }, 0);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    });
  }

  // Drift: the block slides down its column while the section scrolls by (desktop only)
  if (!reduceMotion) {
    gsap.matchMedia().add('(min-width: 900px)', function () {
      $$('[data-drift]').forEach(function (el) {
        var col = el.parentElement;
        gsap.fromTo(el, { y: 0 }, {
          y: function () { return Math.max(0, col.clientHeight - el.offsetHeight); }, ease: 'none',
          scrollTrigger: { trigger: col, start: 'top 75%', end: 'bottom 75%', scrub: true, invalidateOnRefresh: true }
        });
      });
    });
  }

  // Simple reveal
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, {
      opacity: 0, y: reduceMotion ? 0 : 32, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // Growing background [data-grow-bg]: inset + rounded → full width while its section rises into view
  if (!reduceMotion) {
    $$('[data-grow-bg]').forEach(function (bg) {
      var section = bg.parentElement;
      var inset = window.matchMedia('(max-width: 767px)').matches ? 3 : 5;
      gsap.fromTo(bg,
        { clipPath: 'inset(0% ' + inset + '% 0% ' + inset + '% round 20px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 10%', scrub: true } });
      // the hero underneath dims slightly as it gets covered
      var hero = section.previousElementSibling;
      if (hero && hero.matches('[data-hero]')) {
        gsap.to($$('.hero__frame', hero).length ? $$('.hero__frame', hero) : hero, {
          opacity: 0.45, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true }
        });
      }
    });
  }

  // Parallax
  if (!reduceMotion) {
    $$('[data-parallax]').forEach(function (el) {
      var amount = parseFloat(el.dataset.parallax) || 12;
      gsap.to(el, {
        yPercent: amount, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  }

  // Animated numbers: <span data-count="5.9" data-decimals="1" data-locale="it-IT">5,9</span>
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var fmt = new Intl.NumberFormat(root.lang || 'it', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduceMotion) { el.textContent = fmt.format(end); return; }
    var obj = { v: 0 };
    el.textContent = fmt.format(0);
    var inHero = el.closest('[data-hero]');
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power2.out',
      delay: inHero ? 1 : 0, // in the hero: right after the title reveal
      onUpdate: function () { el.textContent = fmt.format(obj.v); },
      scrollTrigger: inHero ? null : { trigger: el, start: 'top 90%', once: true }
    });
  });

  // Recalculate after fonts and images settle
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
