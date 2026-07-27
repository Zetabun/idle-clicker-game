/*
 * Strikewatch source module: 77-mail-scroll-guard.js
 * Purpose: Stop the Inbox feed from swallowing page scroll. The mail list is a
 * nested scroll container, so a wheel or drag started over it scrolled the feed
 * instead of the page. The feed is now inert until the manager clicks or
 * focuses inside it, at which point it scrolls normally and contains its own
 * overscroll. Presentation only: no mail state is read or written.
 *
 * The armed flag lives on <body>, not on the list, because the Inbox re-renders
 * whenever a message is selected and would otherwise disarm itself mid-read.
 */

  (() => {
    const LIST_SELECTOR = '.club-mail-list';
    const ARMED_CLASS = 'mail-scroll-armed';
    const OVERFLOW_CLASS = 'mail-scroll-overflow';

    function lists() {
      return document.querySelectorAll(LIST_SELECTOR);
    }

    function refreshOverflowHints() {
      const armed = document.body.classList.contains(ARMED_CLASS);
      for (const list of lists()) {
        const overflowing = !armed && list.scrollHeight - list.clientHeight > 4;
        list.classList.toggle(OVERFLOW_CLASS, overflowing);
      }
    }

    function setArmed(next) {
      if (document.body.classList.contains(ARMED_CLASS) === next) {
        refreshOverflowHints();
        return;
      }
      document.body.classList.toggle(ARMED_CLASS, next);
      if (!next) for (const list of lists()) list.scrollTop = 0;
      refreshOverflowHints();
    }

    function withinList(target) {
      return Boolean(target && typeof target.closest === 'function' && target.closest(LIST_SELECTOR));
    }

    document.addEventListener('pointerdown', event => {
      setArmed(withinList(event.target));
    }, true);

    document.addEventListener('focusin', event => {
      if (withinList(event.target)) setArmed(true);
    }, true);

    // The Inbox re-renders on selection, so re-measure once the new rows land.
    document.addEventListener('click', event => {
      if (!withinList(event.target)) return;
      requestAnimationFrame(refreshOverflowHints);
    }, true);

    window.addEventListener('resize', refreshOverflowHints);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshOverflowHints);
    else refreshOverflowHints();
  })();
