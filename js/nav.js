/**
 * nav.js — SnapKitty OS Portfolio
 * Mobile hamburger toggle, active link detection, smooth page transitions.
 */

(function () {
  'use strict';

  // ── Page transition ────────────────────────────────────────────────────────
  // Fade in on load
  function onLoad() {
    document.body.classList.add('loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      // Give browser a frame to paint before fading in
      requestAnimationFrame(function () {
        requestAnimationFrame(onLoad);
      });
    });
  } else {
    init();
    requestAnimationFrame(function () {
      requestAnimationFrame(onLoad);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    initHamburger();
    markActiveLink();
    bindTransitionLinks();
    initPageTransitionIn();
  }

  // ── Hamburger / mobile nav ─────────────────────────────────────────────────
  function initHamburger() {
    var btn = document.getElementById('hamburger');
    var nav = document.getElementById('site-nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      // Trap scroll when nav open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on nav link click (mobile)
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        btn.focus();
      }
    });

    // Close if window resizes above mobile breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        nav.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ── Active link detection ──────────────────────────────────────────────────
  function markActiveLink() {
    var path     = window.location.pathname;
    var filename = path.split('/').pop() || 'index.html';

    // Normalise: bare "/" → index.html
    if (filename === '') filename = 'index.html';

    var links = document.querySelectorAll('.site-nav a');
    links.forEach(function (link) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
      var href     = link.getAttribute('href') || '';
      var linkFile = href.split('/').pop() || 'index.html';
      if (linkFile === filename) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Smooth page transitions ────────────────────────────────────────────────
  function bindTransitionLinks() {
    // Intercept all internal links that carry [data-transition] or are in the nav
    var internalLinks = document.querySelectorAll(
      'a[data-transition], .site-nav a, .footer-links a'
    );

    internalLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      // Skip empty, anchor-only, or mailto links
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
      // Skip external links
      if (href.startsWith('http') && !href.includes(window.location.hostname)) return;

      link.addEventListener('click', function (e) {
        // If it's a modifier click (open new tab etc.) let browser handle it
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();
        var target = href;
        fadeOutThenNavigate(target);
      });
    });
  }

  function fadeOutThenNavigate(url) {
    var overlay = document.getElementById('page-transition');
    document.body.classList.remove('loaded');

    if (overlay) {
      overlay.classList.add('leaving');
    }

    setTimeout(function () {
      window.location.href = url;
    }, 280);
  }

  // ── Page transition in (when arriving on a page) ───────────────────────────
  function initPageTransitionIn() {
    var overlay = document.getElementById('page-transition');
    if (!overlay) return;
    // Ensure overlay starts opaque if browser shows cached page state,
    // then immediately remove it so the CSS body transition can take over.
    overlay.classList.remove('leaving');
  }

})();
