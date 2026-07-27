/*
 * Strikewatch source module: 76-tactical-selection-feedback.js
 * Purpose: Give the match setup choice cards (Formation, Team Approach,
 * Engagement Range, Map Selection, Team Priority) immediate press feedback and
 * a post-selection confirmation pulse. Selecting a choice re-renders the panel,
 * which discards the browser's own :active state, so the confirmation has to be
 * re-applied to the replacement element. Presentation only: this module never
 * reads or writes tactical state.
 */

  (() => {
    const CARD_SELECTOR = '.club-formation-card, .club-plan-option';
    const CHOICE_ATTRIBUTES = [
      'data-club-formation',
      'data-club-approach',
      'data-club-engagement',
      'data-club-priority',
      'data-club-map'
    ];
    const PRESS_CLASS = 'is-pressing';
    const CONFIRM_CLASS = 'just-selected';
    const CONFIRM_CLEAR_MS = 620;
    const CONFIRM_WINDOW_MS = 700;

    let pressedCard = null;

    function cardFromEvent(event) {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return null;
      const card = target.closest(CARD_SELECTOR);
      return card && !card.disabled ? card : null;
    }

    function choiceSelector(card) {
      for (const attribute of CHOICE_ATTRIBUTES) {
        const value = card.getAttribute(attribute);
        if (value === null) continue;
        return `[${attribute}="${value.replace(/(["\\])/g, '\\$1')}"].active`;
      }
      return '';
    }

    function releasePress() {
      if (!pressedCard) return;
      pressedCard.classList.remove(PRESS_CLASS);
      pressedCard = null;
    }

    function confirmSelection(selector) {
      const deadline = Date.now() + CONFIRM_WINDOW_MS;
      const step = () => {
        let card = null;
        try { card = document.querySelector(selector); } catch (error) { return; }
        if (!card) {
          if (Date.now() < deadline) requestAnimationFrame(step);
          return;
        }
        card.classList.remove(CONFIRM_CLASS);
        void card.offsetWidth;
        card.classList.add(CONFIRM_CLASS);
        setTimeout(() => card.classList.remove(CONFIRM_CLASS), CONFIRM_CLEAR_MS);
      };
      requestAnimationFrame(step);
    }

    document.addEventListener('pointerdown', event => {
      const card = cardFromEvent(event);
      if (!card) return;
      releasePress();
      pressedCard = card;
      card.classList.add(PRESS_CLASS);
    }, true);

    document.addEventListener('pointerup', releasePress, true);
    document.addEventListener('pointercancel', releasePress, true);
    window.addEventListener('blur', releasePress);

    document.addEventListener('click', event => {
      const card = cardFromEvent(event);
      if (!card) return;
      const selector = choiceSelector(card);
      if (selector) confirmSelection(selector);
    }, true);
  })();
