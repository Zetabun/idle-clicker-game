// Build 12.141: career save checkpoints.
//
// Earned Gold Coins could be lost by closing the browser after returning to
// HQ. `exitToMainMenu()` calls `createMatch()` and drops straight back to the
// menu without writing a save, and nothing wrote one when the tab was closed
// or backgrounded, so anything banked into `careerState` since the last
// explicit save went with it.
//
// Progress is now written at the points where the manager reasonably believes
// it is safe: leaving a match for HQ, any match/free-roam to menu transition,
// and the browser being hidden or closed. End Day already saved through
// `advanceCareerDay()` and is left alone.

(() => {
  // Rapid transitions (exitToMainMenu also drives setAppState) must not write
  // the same state repeatedly. A short floor keeps one save per checkpoint
  // without risking a missed write.
  const CHECKPOINT_FLOOR_MS = 400;
  let lastCheckpointAt = 0;
  let checkpointCount = 0;
  let lastCheckpointReason = '';

  function careerSaveCheckpoint(reason, options = {}) {
    if (!careerState?.created) return false;
    // A rejected write must still be retried at the next checkpoint, so a
    // failed save does not update the floor.
    const now = Date.now();
    if (options.force !== true && now - lastCheckpointAt < CHECKPOINT_FLOOR_MS) return false;
    const saved = saveCareerState({ reason: `checkpoint:${reason}` }) !== false;
    if (saved) {
      lastCheckpointAt = now;
      checkpointCount += 1;
      lastCheckpointReason = String(reason || '');
    }
    return saved;
  }

  const baseSetAppStateForCheckpoints = setAppState;
  setAppState = function setAppStateWithCheckpoint(nextState) {
    const previousState = appState;
    const result = baseSetAppStateForCheckpoints(nextState);
    // Returning to HQ from a match or free roam is the moment the manager
    // treats their winnings as banked.
    if (nextState === 'menu' && (previousState === 'match' || previousState === 'free-roam')) {
      careerSaveCheckpoint('return-to-hq');
    }
    return result;
  };

  if (typeof exitToMainMenu === 'function') {
    const baseExitToMainMenuForCheckpoints = exitToMainMenu;
    exitToMainMenu = function exitToMainMenuWithCheckpoint() {
      const result = baseExitToMainMenuForCheckpoints();
      careerSaveCheckpoint('exit-to-hq');
      return result;
    };
  }

  // Closing, backgrounding or navigating away. `pagehide` is the reliable
  // signal on iOS Safari, where `beforeunload` is unreliable; `visibilitychange`
  // covers tab switches and app backgrounding. localStorage is synchronous, so
  // the write completes inside the handler.
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') careerSaveCheckpoint('page-hidden', { force: true });
  });
  window.addEventListener('pagehide', () => careerSaveCheckpoint('page-hide', { force: true }));

  window.__strikeDebug = window.__strikeDebug || {};
  window.__strikeDebug.saveCheckpointForTest = () => ({
    checkpointCount,
    lastCheckpointReason,
    lastCheckpointAt
  });
  // The crate canvas is created without preserveDrawingBuffer, so its rotation
  // cannot be confirmed by reading pixels back. Expose the live pose instead.
  // Registered here because 70-runtime.js reassigns window.__strikeDebug
  // wholesale, discarding anything an earlier module attached.
  window.__strikeDebug.crateSpinForTest = () => ({
    yaw: Number(rewardRendererState.yaw.toFixed(4)),
    targetYaw: Number(rewardRendererState.targetYaw.toFixed(4)),
    spinBase: Number(rewardRendererState.spinBase.toFixed(4)),
    dragging: rewardRendererState.dragging
  });
  // Registered here for the same reason as the crate hook: 70-runtime.js
  // reassigns window.__strikeDebug wholesale.
  window.__strikeDebug.skyDomeForTest = () => skyDomeForTest();
  window.__strikeDebug.skyDomeSampleForTest = dir => skyDomeSampleForTest(dir);
  window.__strikeDebug.forceSaveCheckpointForTest = reason => ({
    saved: careerSaveCheckpoint(String(reason || 'manual'), { force: true }),
    state: { checkpointCount, lastCheckpointReason }
  });
})();
