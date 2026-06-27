/**
 * carousel.js — SnapKitty OS Portfolio
 * Auto-advancing carousel with prev/next, dots, pause-on-hover, touch/swipe.
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  var INTERVAL_MS   = 5000;   // auto-advance interval
  var TRANSITION_MS = 800;    // must match CSS transition duration (0.8s)
  var SWIPE_THRESHOLD = 40;   // px required to register a swipe

  // ── State ────────────────────────────────────────────────────────────────
  var current    = 0;
  var total      = 0;
  var timer      = null;
  var paused     = false;
  var touchStartX = 0;
  var touchStartY = 0;
  var isAnimating = false;

  // ── DOM refs ─────────────────────────────────────────────────────────────
  var carousel, slides, prevBtn, nextBtn, dotsContainer, counter;

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    carousel     = document.getElementById('carousel');
    if (!carousel) return;   // not on this page

    slides       = carousel.querySelectorAll('.carousel-slide');
    prevBtn      = document.getElementById('carousel-prev');
    nextBtn      = document.getElementById('carousel-next');
    dotsContainer = document.getElementById('carousel-dots');
    counter      = document.getElementById('carousel-counter');

    total = slides.length;
    if (total === 0) return;

    buildDots();
    updateState(0, false);
    startTimer();
    bindEvents();
  }

  // ── Build dot indicators ─────────────────────────────────────────────────
  function buildDots() {
    dotsContainer.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var btn = document.createElement('button');
      btn.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      btn.setAttribute('role', 'tab');
      btn.dataset.index = i;
      dotsContainer.appendChild(btn);
    }
  }

  // ── Update active slide ───────────────────────────────────────────────────
  function updateState(index, animate) {
    if (isAnimating && animate) return;
    if (animate) isAnimating = true;

    // Clamp / wrap
    index = ((index % total) + total) % total;

    // Slide classes
    slides.forEach(function (slide, i) {
      slide.classList.toggle('active', i === index);
    });

    // Dot classes
    var dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    // Counter
    if (counter) {
      counter.textContent =
        String(index + 1).padStart(2, '0') + ' / ' +
        String(total).padStart(2, '0');
    }

    // ARIA on carousel
    carousel.setAttribute('aria-label', 'Slide ' + (index + 1) + ' of ' + total);

    current = index;

    if (animate) {
      setTimeout(function () { isAnimating = false; }, TRANSITION_MS);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(index) {
    updateState(index, true);
  }

  function goNext() {
    goTo(current + 1);
  }

  function goPrev() {
    goTo(current - 1);
  }

  // ── Auto-advance timer ───────────────────────────────────────────────────
  function startTimer() {
    clearInterval(timer);
    timer = setInterval(function () {
      if (!paused) goNext();
    }, INTERVAL_MS);
  }

  function resetTimer() {
    startTimer();
  }

  // ── Bind events ──────────────────────────────────────────────────────────
  function bindEvents() {
    // Prev / Next buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goPrev();
        resetTimer();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goNext();
        resetTimer();
      });
    }

    // Dot clicks
    dotsContainer.addEventListener('click', function (e) {
      var dot = e.target.closest('.carousel-dot');
      if (!dot) return;
      var idx = parseInt(dot.dataset.index, 10);
      goTo(idx);
      resetTimer();
    });

    // Pause on hover
    carousel.addEventListener('mouseenter', function () { paused = true; });
    carousel.addEventListener('mouseleave', function () { paused = false; });

    // Pause on focus (accessibility)
    carousel.addEventListener('focusin',  function () { paused = true; });
    carousel.addEventListener('focusout', function () { paused = false; });

    // Keyboard arrow nav when focused
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { goPrev(); resetTimer(); }
      if (e.key === 'ArrowRight') { goNext(); resetTimer(); }
    });

    // Touch / swipe support
    carousel.addEventListener('touchstart', onTouchStart, { passive: true });
    carousel.addEventListener('touchend',   onTouchEnd,   { passive: true });

    // Visibility API — pause when tab hidden
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
    });
  }

  // ── Touch handlers ────────────────────────────────────────────────────────
  function onTouchStart(e) {
    var touch = e.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function onTouchEnd(e) {
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;

    // Only register horizontal swipe (ignore vertical scrolls)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

    if (dx < 0) {
      goNext();
    } else {
      goPrev();
    }
    resetTimer();
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
