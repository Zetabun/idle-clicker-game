// Build 12.140: management status surface.
//
// `showStatus()` writes to `.status`, which lives inside the match stage and is
// hidden by `body[data-app-state="menu"] .status { display: none }`. Roughly
// eighty call sites across the management modules therefore explained a refusal
// to nobody: pressing MATCH while the fixture was days away routed to the
// league table and said nothing, so the control read as a dead loop.
//
// Every management-context message is now mirrored into a live region inside
// the menu shell. This adds a surface; it does not change what any caller says.

(() => {
  const MANAGEMENT_STATUS_MS = 7200;
  let managementStatusEl = null;
  let managementStatusTextEl = null;
  let managementStatusTimer = 0;
  let managementStatusMessage = '';

  function ensureManagementStatusSurface() {
    if (managementStatusEl?.isConnected) return managementStatusEl;
    const host = menuShellEl || document.getElementById('menuShell') || document.body;
    if (!host) return null;
    managementStatusEl = document.createElement('div');
    managementStatusEl.className = 'management-status';
    managementStatusEl.hidden = true;
    // Advisory, not an alert: it must not steal focus mid-task.
    managementStatusEl.setAttribute('role', 'status');
    managementStatusEl.setAttribute('aria-live', 'polite');
    managementStatusEl.innerHTML = '<i aria-hidden="true"></i><p></p><button type="button" aria-label="Dismiss message">DISMISS</button>';
    managementStatusTextEl = managementStatusEl.querySelector('p');
    managementStatusEl.querySelector('button').addEventListener('click', () => hideManagementStatus());
    host.append(managementStatusEl);
    return managementStatusEl;
  }

  function hideManagementStatus() {
    managementStatusTimer = 0;
    managementStatusMessage = '';
    if (!managementStatusEl) return;
    managementStatusEl.classList.remove('show');
    managementStatusEl.hidden = true;
  }

  function presentManagementStatus(message, tone = 'info') {
    const text = String(message || '').trim();
    if (!text) {
      hideManagementStatus();
      return false;
    }
    const surface = ensureManagementStatusSurface();
    if (!surface || !managementStatusTextEl) return false;
    managementStatusMessage = text;
    managementStatusTextEl.textContent = text;
    surface.dataset.tone = tone === 'blocked' ? 'blocked' : 'info';
    surface.hidden = false;
    // Restart the entry transition when the same message repeats, so pressing a
    // refused control twice still reads as a fresh response rather than a
    // frozen page.
    surface.classList.remove('show');
    void surface.offsetWidth;
    surface.classList.add('show');
    managementStatusTimer = MANAGEMENT_STATUS_MS;
    return true;
  }

  function managementStatusVisible() {
    return Boolean(managementStatusEl && !managementStatusEl.hidden);
  }

  function managementStatusForTest() {
    return {
      visible: managementStatusVisible(),
      message: managementStatusMessage,
      tone: managementStatusEl?.dataset.tone || '',
      rendered: managementStatusEl?.isConnected ? managementStatusTextEl?.textContent || '' : '',
      onScreen: (() => {
        if (!managementStatusVisible()) return false;
        const rect = managementStatusEl.getBoundingClientRect();
        const style = getComputedStyle(managementStatusEl);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
      })()
    };
  }

  const baseShowStatusForManagement = showStatus;
  showStatus = function showStatusWithManagementSurface(text, options = {}) {
    const result = baseShowStatusForManagement(text);
    // The match HUD owns its own status line during play.
    if (appState !== 'menu') return result;
    presentManagementStatus(text, options.tone);
    return result;
  };

  const baseHideStatusForManagement = typeof hideStatus === 'function' ? hideStatus : null;
  if (baseHideStatusForManagement) {
    hideStatus = function hideStatusWithManagementSurface() {
      hideManagementStatus();
      return baseHideStatusForManagement();
    };
  }

  function updateManagementStatus(dt) {
    if (!managementStatusTimer) return;
    managementStatusTimer -= Math.max(0, Number(dt) || 0) * 1000;
    if (managementStatusTimer <= 0) hideManagementStatus();
  }

  const baseUpdateMenuForManagementStatus = updateMenu;
  updateMenu = function updateMenuWithManagementStatus(dt) {
    updateManagementStatus(dt);
    return baseUpdateMenuForManagementStatus(dt);
  };

  window.__strikeDebug = window.__strikeDebug || {};
  window.__strikeDebug.managementStatusForTest = managementStatusForTest;
  window.__strikeDebug.showManagementStatusForTest = (text, tone) => {
    showStatus(String(text || 'TEST MESSAGE'), { tone });
    return managementStatusForTest();
  };
})();
