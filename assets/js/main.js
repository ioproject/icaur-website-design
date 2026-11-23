/* ICAUR — Prototipo statico. Vanilla JS, nessuna dipendenza. */
(function () {
  'use strict';

  // Menu mobile (hamburger)
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  // Sottomenu (click su mobile; su desktop si apre anche con hover/focus via CSS)
  document.querySelectorAll('.menu__toggle').forEach(function (btn) {
    var submenu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!submenu) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      submenu.classList.toggle('is-open', !open);
    });
  });

  // Chiudi con ESC
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[aria-expanded="true"]').forEach(function (el) {
      el.setAttribute('aria-expanded', 'false');
      var target = document.getElementById(el.getAttribute('aria-controls'));
      if (target) target.classList.remove('is-open');
    });
  });
})();
