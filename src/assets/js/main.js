/* ==========================================================================
   iCAUR — main.js (shared). Vanilla JS + GSAP/ScrollTrigger + Lenis.
   Every feature is opt-in through data attributes, so the same file works
   on all pages:
     [data-header] [data-nav] [data-nav-toggle] [data-models]  navigation
     [data-video] [data-autoplay] [data-video-toggle]            background videos
     [data-hover-video]                                         video on card hover
     [data-split-lines] [data-hero-fade]                        hero title reveal
     [data-words]                                               words lighting up on scroll
     [data-reveal]                                              fade/slide in on enter
     [data-parallax="N"]                                        parallax, N = % of travel
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

  /* ---------- Header: hide on scroll down, show on scroll up ---------- */
  var header = document.querySelector('[data-header]');
  var nav = document.querySelector('[data-nav]');
  var navToggle = document.querySelector('[data-nav-toggle]');
  var models = document.querySelector('[data-models]');
  var modelsTrigger = document.querySelector('[data-models-trigger]');
  var modelsPanel = document.querySelector('[data-models-panel]');

  if (header) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      var menuOpen = nav && nav.classList.contains('is-open');
      var panelOpen = modelsPanel && modelsPanel.classList.contains('is-open');
      header.classList.toggle('is-hidden', y > 160 && y > lastY + 4 && !menuOpen && !panelOpen);
      if (y < lastY - 4 || y < 160) header.classList.remove('is-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Navigation ---------- */
  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    var label = navToggle.querySelector('.nav-toggle__label');
    if (label) label.textContent = open ? label.dataset.labelClose : label.dataset.labelOpen;
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  function setModels(open) {
    if (!modelsPanel || !modelsTrigger) return;
    modelsPanel.classList.toggle('is-open', open);
    modelsTrigger.setAttribute('aria-expanded', String(open));
  }
  if (navToggle) navToggle.addEventListener('click', function () { setMenu(navToggle.getAttribute('aria-expanded') !== 'true'); });
  if (modelsTrigger) modelsTrigger.addEventListener('click', function () { setModels(modelsTrigger.getAttribute('aria-expanded') !== 'true'); });

  // desktop: open the models panel on hover too
  if (models && finePointer) {
    var closeTimer;
    var desktop = function () { return window.matchMedia('(min-width: 1180px)').matches; };
    models.addEventListener('mouseenter', function () { if (desktop()) { clearTimeout(closeTimer); setModels(true); } });
    models.addEventListener('mouseleave', function () { if (desktop()) closeTimer = setTimeout(function () { setModels(false); }, 180); });
  }
  document.addEventListener('click', function (e) {
    if (models && !models.contains(e.target)) setModels(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modelsPanel && modelsPanel.classList.contains('is-open')) { setModels(false); modelsTrigger.focus(); }
    else if (nav && nav.classList.contains('is-open')) { setMenu(false); navToggle.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 1180px)').matches) setMenu(false);
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
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });

  // Simple reveal
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, {
      opacity: 0, y: reduceMotion ? 0 : 32, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

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
