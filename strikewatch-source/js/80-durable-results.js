/*
 * Strikewatch source module: 80-durable-results.js
 * Purpose: Make completed match rewards durable even when another session has
 * advanced the save sequence while the match is being played.
 *
 * This final source fragment deliberately wraps the established save and match
 * settlement authorities rather than creating a second career state.
 */

  const durableResultsBaseSaveCareerState = saveCareerState;
  const durableResultsBaseCompleteCareerMatch = completeCareerMatch;

  saveCareerState = function saveCareerStateWithProtectedSettlement(options = {}) {
    const protectedEarnedProgress = options.protectEarnedProgress === true;
    if (!protectedEarnedProgress || !careerSaveIsStale()) {
      return durableResultsBaseSaveCareerState(options);
    }

    // A completed match is already being presented to the manager as banked
    // progress. Preserve the newer stored career as the recovery backup, then
    // write the complete settled result using the stored sequence as authority.
    // Ordinary autosaves still use the original stale-session rejection path.
    try {
      const displaced = localStorage.getItem(CAREER_STORAGE_KEY);
      if (displaced) localStorage.setItem(CAREER_BACKUP_STORAGE_KEY, displaced);
    } catch (error) {
      // The authoritative writer below reports storage failure through the
      // existing career data notice. Do not claim durability here.
    }

    return durableResultsBaseSaveCareerState({
      ...options,
      force: true,
      createBackup: false,
      reason: String(options.reason || 'protected-earned-progress')
    });
  };

  completeCareerMatch = function completeCareerMatchWithDurableSettlement(winner) {
    const summary = durableResultsBaseCompleteCareerMatch(winner);

    // The base settlement has now applied finance, Gold Coins, the league
    // fixture, player progression and any pending victory crate. Commit that
    // complete state before the manager can leave the reward presentation.
    saveCareerState({
      reason: 'match-settlement',
      protectEarnedProgress: true
    });
    return summary;
  };

  if (window.__strikeDebug) {
    window.__strikeDebug.durableMatchSettlementForTest = () => {
      const keys = [CAREER_STORAGE_KEY, CAREER_BACKUP_STORAGE_KEY, CAREER_SAVE_META_STORAGE_KEY];
      const storedSnapshot = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
      const stateSnapshot = JSON.stringify(careerState);
      const sequenceSnapshot = careerSaveSequence;
      const failureSnapshot = careerSaveFailure ? { ...careerSaveFailure } : null;
      const noticeSnapshot = careerDataNotice ? { ...careerDataNotice } : null;

      try {
        const oldCareer = {
          created: true,
          goldCoins: 2,
          league: {
            fixtures: [{ id: 'DURABLE-TEST', homeId: LEAGUE_USER_CLUB_ID, awayId: 'test-opponent', played: false, winnerId: null }]
          }
        };
        const settledCareer = {
          ...oldCareer,
          goldCoins: 14,
          league: {
            fixtures: [{ id: 'DURABLE-TEST', homeId: LEAGUE_USER_CLUB_ID, awayId: 'test-opponent', played: true, homeScore: 3, awayScore: 1, winnerId: LEAGUE_USER_CLUB_ID }]
          }
        };

        localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(oldCareer));
        localStorage.removeItem(CAREER_BACKUP_STORAGE_KEY);
        localStorage.setItem(CAREER_SAVE_META_STORAGE_KEY, JSON.stringify({
          savedAt: new Date().toISOString(),
          buildVersion: BUILD_VERSION,
          reason: 'durability-test-newer-session',
          saveSequence: sequenceSnapshot + 5,
          backupProtected: false
        }));
        careerState = settledCareer;
        careerSaveSequence = sequenceSnapshot;

        const ordinarySaved = saveCareerState({ reason: 'durability-test-ordinary' });
        const ordinaryStored = JSON.parse(localStorage.getItem(CAREER_STORAGE_KEY) || 'null');
        const protectedSaved = saveCareerState({
          reason: 'durability-test-match-settlement',
          protectEarnedProgress: true
        });
        const persisted = JSON.parse(localStorage.getItem(CAREER_STORAGE_KEY) || 'null');
        const backup = JSON.parse(localStorage.getItem(CAREER_BACKUP_STORAGE_KEY) || 'null');
        const meta = JSON.parse(localStorage.getItem(CAREER_SAVE_META_STORAGE_KEY) || 'null');
        const fixture = persisted?.league?.fixtures?.[0] || null;

        const result = {
          ordinaryGuardHeld: ordinarySaved === false && ordinaryStored?.goldCoins === 2,
          protectedSaved,
          persistedGoldCoins: Number(persisted?.goldCoins) || 0,
          persistedFixturePlayed: Boolean(fixture?.played),
          persistedWinnerId: fixture?.winnerId || null,
          backupGoldCoins: Number(backup?.goldCoins) || 0,
          backupFixturePlayed: Boolean(backup?.league?.fixtures?.[0]?.played),
          storedSequence: Number(meta?.saveSequence) || 0
        };
        result.ok = result.ordinaryGuardHeld
          && result.protectedSaved === true
          && result.persistedGoldCoins === 14
          && result.persistedFixturePlayed
          && result.persistedWinnerId === LEAGUE_USER_CLUB_ID
          && result.backupGoldCoins === 2
          && !result.backupFixturePlayed
          && result.storedSequence === sequenceSnapshot + 6;
        return result;
      } finally {
        for (const key of keys) {
          const value = storedSnapshot[key];
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        }
        careerState = normaliseCareerState(JSON.parse(stateSnapshot));
        careerSaveSequence = sequenceSnapshot;
        careerSaveFailure = failureSnapshot;
        careerDataNotice = noticeSnapshot;
      }
    };
  }
