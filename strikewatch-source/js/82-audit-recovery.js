/* Build 12.161: side-effect-free diagnostic and release audit hardening. */
(() => {
  if (!window.__strikeDebug) window.__strikeDebug = {};
  window.__strikeDebug.scoreboardTelemetryForTest = (slot = 0) => {
    const players = typeof matchTeamPlayers === 'function' ? matchTeamPlayers(CAREER_OWNED_TEAM) : [];
    const index = Math.max(0, Math.min(Math.max(0, players.length - 1), Math.round(Number(slot) || 0)));
    const player = players[index] || null;
    return {
      ok: Boolean(player),
      route: typeof menuTab === 'string' ? menuTab : '',
      playerId: player?.id || null,
      selectedPlayerId: typeof selectedTeamPlayerId === 'string' ? selectedTeamPlayerId : null,
      appState,
      score: { blue: scores[TEAM_BLUE], red: scores[TEAM_RED] },
      roundTime,
      sideEffectFree: true
    };
  };
})();
