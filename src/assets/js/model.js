/* ==========================================================================
   iCAUR — model.js (model pages). Loaded after main.js.
     [data-dock] [data-dock-link]           floating section nav + active section
     [data-turn] [data-turn-step]           pinned section: car views change on scroll
     [data-turn-cover] [data-turn-word]     cover with a cut-out word that zooms away first
     [data-steps] [data-step]               pinned section: one detail at a time
     [data-colors] [data-swatches]          colour picker
     [data-hotspots] [data-spot] [data-spot-card]  image hotspots, a click opens the detail card
     [data-expand]                          image grows to full width on scroll
   Pinned effects run only on desktop (≥1024px) without reduced motion;
   otherwise the same markup is shown as a simple vertical list.
   ========================================================================== */
(function () {
  'use strict';

  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && window.ScrollTrigger;

  /* ---------- Dock: visible after the hero, highlights the current section ---------- */
  var dock = document.querySelector('[data-dock]');
  if (dock && 'IntersectionObserver' in window) {
    var hero = document.querySelector('[data-hero]');
    var footer = document.querySelector('.site-footer');
    var picker = document.querySelector('.colors__picker');   // the colour names sit where the dock is: hide it while they are on screen
    var heroVisible = true, footerVisible = false, pickerVisible = false;
    var update = function () { dock.classList.toggle('is-visible', !heroVisible && !footerVisible && !pickerVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
    if (footer) new IntersectionObserver(function (e) { footerVisible = e[0].isIntersecting; update(); }).observe(footer);
    if (picker) new IntersectionObserver(function (e) { pickerVisible = e[0].isIntersecting && window.innerWidth >= 768; update(); }).observe(picker);

    var links = $$('[data-dock-link]', dock);
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        var a = byId[en.target.id];
        if (a) {
          a.classList.add('is-active'); a.setAttribute('aria-current', 'true');
          a.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Colour picker ---------- */
  $$('[data-colors]').forEach(function (root) {
    var buttons = $$('[data-color]', root);
    var imgs = $$('[data-color-img]', root);
    var name = root.querySelector('[data-color-name]');
    var select = function (btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      imgs.forEach(function (img) {
        var on = img.dataset.colorImg === btn.dataset.color;
        if (on) img.loading = 'eager';
        img.classList.toggle('is-active', on);
      });
      if (name) name.textContent = btn.dataset.name;
      if (focus) btn.focus();
    };
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b); });
      b.addEventListener('keydown', function (e) {
        var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(buttons[(i + d + buttons.length) % buttons.length], true);
      });
    });
    if (buttons[0]) select(buttons[0]);
  });

  /* ---------- Hotspots: a click opens the detail card; arrows and dots move between the details of the same image ---------- */
  $$('[data-hotspots]').forEach(function (panel) {
    var spots = $$('[data-spot]', panel);
    var card = panel.querySelector('[data-spot-card]');
    if (!card || !spots.length) return;
    var slides = $$('[data-spot-slide]', card), dots = $$('[data-spot-dot]', card);
    var closeBtn = card.querySelector('[data-spot-close]');
    var current = -1, opener = null, hideTimer = null;
    var show = function (i) {
      current = (i + spots.length) % spots.length;
      slides.forEach(function (sl, k) { sl.hidden = k !== current; });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === current); });
      spots.forEach(function (b, k) { b.classList.toggle('is-active', k === current); b.setAttribute('aria-expanded', String(k === current)); });
    };
    var open = function (i, btn) {
      clearTimeout(hideTimer);
      show(i);
      if (btn) opener = btn;
      card.hidden = false;
      requestAnimationFrame(function () { card.classList.add('is-open'); });
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    };
    var close = function () {
      card.classList.remove('is-open');
      spots.forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-expanded', 'false'); });
      current = -1;
      hideTimer = setTimeout(function () { card.hidden = true; }, 450);
      if (opener) opener.focus({ preventScroll: true });
    };
    spots.forEach(function (b, k) {
      b.addEventListener('click', function () { if (current === k) close(); else open(k, b); });
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    var prev = card.querySelector('[data-spot-prev]'), next = card.querySelector('[data-spot-next]');
    if (prev) prev.addEventListener('click', function () { show(current - 1); });
    if (next) next.addEventListener('click', function () { show(current + 1); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current > -1) close(); });
  });

  if (!hasGsap) return;

  /* ---------- Image grows to full width (interior) ---------- */
  if (!reduceMotion) {
    $$('[data-expand]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(6% 8% 6% 8% round 24px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 15%', scrub: true }
      });
      gsap.fromTo(el.querySelector('img'), { scale: 1.15 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  var mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {

    /* ---------- Turn: the car changes angle as you scroll ---------- */
    $$('[data-turn]').forEach(function (section) {
      var steps = $$('[data-turn-step]', section);
      if (steps.length < 2) return;
      section.classList.add('is-pinned');
      var imgs = steps.map(function (s) { return s.querySelector('.turn-step__img'); });
      var caps = steps.map(function (s) { return s.querySelector('.turn-step__caption'); });
      imgs.forEach(function (img) { img.loading = 'eager'; });

      gsap.set(imgs.slice(1), { opacity: 0 });
      gsap.set(caps.slice(1), { opacity: 0, y: 30 });

      // optional cover: the word is cut out of it; it scales up from the middle of the "I" until the first view is fully visible
      var cover = section.querySelector('[data-turn-cover]'), word = section.querySelector('[data-turn-word]');
      var setOrigin = function () {
        if (!cover || !word) return;
        var txt = word.textContent, i = txt.indexOf('I'), box = null;
        try { box = word.getExtentOfChar(i < 0 ? Math.floor(txt.length / 2) : i); } catch (e) {}
        gsap.set(cover, { transformOrigin: box ? (box.x + box.width / 2) + 'px ' + (box.y + box.height * 0.55) + 'px' : '50% 50%' });
      };
      // with a cover, the reveal plays on its own (not scrubbed) as soon as the section reaches the top, and rewinds when scrolling back above it
      var head = section.querySelector('.turn__head');
      var intro = cover ? gsap.timeline({ paused: true })
        .fromTo(cover, { scale: 1, autoAlpha: 1 }, { scale: 90, ease: 'power3.in', duration: 1.3 }, 0)
        .to(cover, { autoAlpha: 0, duration: 0.15 })
        .fromTo(imgs[0], { scale: 1.18 }, { scale: 1, ease: 'power2.out', duration: 1.8 }, 0)
        .fromTo(head, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out', immediateRender: true }, 1.35)
        // the first caption is shown with a class (CSS filter), so it never fights with the scrubbed timeline that hides it later
        .call(function () { section.classList.toggle('is-covered', intro.reversed()); }, null, 1.35) : null;
      if (cover) section.classList.add('is-covered');
      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: section, start: 'top top', end: '+=' + (steps.length * 90) + '%',
          pin: true, scrub: 0.6, anticipatePin: 1, onRefresh: setOrigin,
          onEnter: function () { if (intro) intro.timeScale(1).play(); },
          onLeaveBack: function () { if (intro) intro.timeScale(1.6).reverse(); }
        }
      });
      setOrigin();
      // without a cover the first view settles in (zoom out) with the scroll; then each view replaces the previous one
      if (cover) tl.to({}, { duration: 0.6 });
      else tl.fromTo(imgs[0], { scale: 1.18 }, { scale: 1, duration: 1 }, 0);
      for (var i = 1; i < steps.length; i++) {
        tl.to(caps[i - 1], { opacity: 0, y: -30, duration: 0.4 }, '+=0.5')
          .fromTo(imgs[i], { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1 }, '<')
          .to(caps[i], { opacity: 1, y: 0, duration: 0.5 }, '-=0.4');
      }
      tl.to({}, { duration: 0.6 }); // hold on the last view

      return function () {
        section.classList.remove('is-pinned', 'is-covered');
        if (intro) intro.kill();
        gsap.set(imgs.concat(caps, cover ? [cover, head] : []), { clearProps: 'all' });
      };
    });

    /* ---------- Details: one at a time ---------- */
    $$('[data-steps]').forEach(function (section) {
      var items = $$('[data-step]', section);
      if (items.length < 2) return;
      section.classList.add('is-pinned');
      var medias = items.map(function (it) { return it.querySelector('.detail__media'); });
      var texts = items.map(function (it) { return [it.querySelector('.detail__title'), it.querySelector('.detail__text')]; });
      var bars = $$('[data-step-bar]', section);
      $$('img', section).forEach(function (img) { img.loading = 'eager'; });

      gsap.set(medias.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
      texts.slice(1).forEach(function (t) { gsap.set(t, { opacity: 0, y: 40 }); });

      var setBars = function (p) {
        var per = 1 / items.length;
        bars.forEach(function (b, i) { b.style.setProperty('--p', Math.min(1, Math.max(0, (p - i * per) / per))); });
      };
      var tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        scrollTrigger: {
          trigger: section, start: 'top top', end: '+=' + (items.length * 100) + '%',
          pin: true, scrub: 0.6, anticipatePin: 1,
          onUpdate: function (st) { setBars(st.progress); }
        }
      });
      for (var i = 1; i < items.length; i++) {
        tl.to(texts[i - 1], { opacity: 0, y: -40, duration: 0.5, stagger: 0.05 }, '+=0.6')
          .to(medias[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, '<')
          .fromTo(medias[i].querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.2 }, '<')
          .to(texts[i], { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.5');
      }
      tl.to({}, { duration: 0.6 });

      return function () {
        section.classList.remove('is-pinned');
        gsap.set(medias, { clearProps: 'all' });
        texts.forEach(function (t) { gsap.set(t, { clearProps: 'all' }); });
      };
    });

    ScrollTrigger.refresh();
  });
})();
