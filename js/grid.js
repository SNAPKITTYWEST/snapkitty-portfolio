/**
 * grid.js — SnapKitty OS Portfolio
 * Project grid interaction: click logging, keyboard nav, focus management.
 */

(function () {
  'use strict';

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    var grid = document.getElementById('project-grid');
    if (!grid) return;

    var cards = grid.querySelectorAll('.project-card');
    if (cards.length === 0) return;

    cards.forEach(function (card) {
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', onCardKeydown);
    });
  }

  // ── Card click ────────────────────────────────────────────────────────────
  function onCardClick(e) {
    var card  = e.currentTarget;
    var title = card.dataset.title  || card.querySelector('.card-title')  && card.querySelector('.card-title').textContent;
    var index = card.dataset.project;

    // Log for extensibility (future: open detail panel or navigate)
    console.log('[SnapKitty Grid] Selected project ' + index + ': ' + title);

    // Visual pulse feedback
    pulseCard(card);
  }

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  function onCardKeydown(e) {
    var card = e.currentTarget;
    var grid = document.getElementById('project-grid');
    if (!grid) return;
    var cards = Array.from(grid.querySelectorAll('.project-card'));
    var idx   = cards.indexOf(card);

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        card.click();
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (idx < cards.length - 1) cards[idx + 1].focus();
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (idx > 0) cards[idx - 1].focus();
        break;

      case 'Home':
        e.preventDefault();
        cards[0].focus();
        break;

      case 'End':
        e.preventDefault();
        cards[cards.length - 1].focus();
        break;
    }
  }

  // ── Visual feedback ────────────────────────────────────────────────────────
  function pulseCard(card) {
    card.style.transition = 'transform 0.15s ease';
    card.style.transform  = 'scale(1.04)';
    setTimeout(function () {
      card.style.transform  = '';
      card.style.transition = '';
    }, 150);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
