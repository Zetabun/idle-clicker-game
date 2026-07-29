/*
 * Strikewatch source module: 81-career-indexeddb.js
 * Purpose: IndexedDB durability tier for the career save, and the storage
 * figures the configuration page reports.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone distribution.
 *
 * Why this is a tier and not a replacement
 * ----------------------------------------
 * localStorage caps a single origin at roughly 5MB, shared with everything
 * else the page stores, and a long career only grows. IndexedDB quota is
 * measured in hundreds of megabytes to gigabytes, so it is where a career
 * belongs long term.
 *
 * It cannot simply take over, because IndexedDB is asynchronous. Build 12.141
 * made `pagehide` and `visibilitychange` save checkpoints precisely because
 * progress was being lost when a tab closed, and that works only because
 * `localStorage.setItem` completes inside the handler. An IndexedDB
 * transaction started in a page-hide handler is not guaranteed to commit
 * before the page goes away. Making the save path async would reintroduce the
 * exact defect 12.141 fixed and 12.158 hardened.
 *
 * So both are kept, with clearly divided jobs:
 *
 *  - localStorage stays the synchronous write-through tier. It is what makes an
 *    unload-time save land, and it remains the fast path on load.
 *  - IndexedDB is the durable tier. Every committed save is mirrored to it, and
 *    it is the only tier that can still accept a career once localStorage is
 *    full.
 *
 * `saveSequence`, already maintained by Build 12.134, decides which tier wins
 * when they disagree. Higher sequence is newer; that is the whole reconcile
 * rule.
 */

  const CAREER_IDB_NAME = 'strikewatchCareer';
  const CAREER_IDB_VERSION = 1;
  const CAREER_IDB_STORE = 'records';
  // The three records that make up a save. Mirrored under the same names the
  // localStorage tier uses so the two are directly comparable.
  const CAREER_IDB_KEYS = Object.freeze([
    CAREER_STORAGE_KEY,
    CAREER_BACKUP_STORAGE_KEY,
    CAREER_SAVE_META_STORAGE_KEY
  ]);

  const careerIdbState = {
    supported: typeof indexedDB !== 'undefined' && indexedDB !== null,
    db: null,
    opening: null,
    lastError: null,
    writes: 0,
    failedWrites: 0,
    lastWriteAt: null,
    adopted: false,
    adoptedSequence: 0,
    primaryTier: 'localStorage'
  };

  function careerIdbOpen() {
    if (!careerIdbState.supported) return Promise.resolve(null);
    if (careerIdbState.db) return Promise.resolve(careerIdbState.db);
    if (careerIdbState.opening) return careerIdbState.opening;
    careerIdbState.opening = new Promise(resolve => {
      let request;
      try {
        request = indexedDB.open(CAREER_IDB_NAME, CAREER_IDB_VERSION);
      } catch (error) {
        careerIdbState.supported = false;
        careerIdbState.lastError = String(error?.message || error);
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CAREER_IDB_STORE)) db.createObjectStore(CAREER_IDB_STORE);
      };
      request.onsuccess = () => {
        careerIdbState.db = request.result;
        // A second tab upgrading or deleting the database must not leave this
        // one holding a dead handle.
        careerIdbState.db.onversionchange = () => {
          try { careerIdbState.db.close(); } catch (error) { /* already closing */ }
          careerIdbState.db = null;
        };
        resolve(careerIdbState.db);
      };
      request.onerror = () => {
        // Private browsing and blocked-storage modes reject the open. The game
        // stays fully playable on localStorage alone.
        careerIdbState.supported = false;
        careerIdbState.lastError = String(request.error?.message || 'IndexedDB unavailable');
        resolve(null);
      };
      request.onblocked = () => resolve(null);
    }).finally(() => {
      careerIdbState.opening = null;
    });
    return careerIdbState.opening;
  }

  function careerIdbTransaction(db, mode) {
    return db.transaction(CAREER_IDB_STORE, mode).objectStore(CAREER_IDB_STORE);
  }

  async function careerIdbReadAll() {
    const db = await careerIdbOpen();
    if (!db) return null;
    return new Promise(resolve => {
      const records = {};
      let store;
      try {
        store = careerIdbTransaction(db, 'readonly');
      } catch (error) {
        resolve(null);
        return;
      }
      let pending = CAREER_IDB_KEYS.length;
      for (const key of CAREER_IDB_KEYS) {
        const request = store.get(key);
        request.onsuccess = () => {
          records[key] = typeof request.result === 'string' ? request.result : null;
          if (--pending === 0) resolve(records);
        };
        request.onerror = () => {
          records[key] = null;
          if (--pending === 0) resolve(records);
        };
      }
    });
  }

  // Writes are fire-and-forget from the caller's point of view: the save has
  // already been committed and verified on the synchronous tier by the time
  // this runs, so a mirror failure degrades capacity, never correctness.
  async function careerIdbWriteRecords(records) {
    const db = await careerIdbOpen();
    if (!db) return false;
    return new Promise(resolve => {
      let transaction;
      try {
        transaction = db.transaction(CAREER_IDB_STORE, 'readwrite');
      } catch (error) {
        careerIdbState.failedWrites++;
        careerIdbState.lastError = String(error?.message || error);
        resolve(false);
        return;
      }
      const store = transaction.objectStore(CAREER_IDB_STORE);
      for (const [key, value] of Object.entries(records)) {
        if (value === null || value === undefined) store.delete(key);
        else store.put(String(value), key);
      }
      transaction.oncomplete = () => {
        careerIdbState.writes++;
        careerIdbState.lastWriteAt = new Date().toISOString();
        resolve(true);
      };
      transaction.onerror = () => {
        careerIdbState.failedWrites++;
        careerIdbState.lastError = String(transaction.error?.message || 'IndexedDB write failed');
        resolve(false);
      };
      transaction.onabort = () => {
        careerIdbState.failedWrites++;
        careerIdbState.lastError = String(transaction.error?.message || 'IndexedDB write aborted');
        resolve(false);
      };
    });
  }

  function careerIdbSequenceOf(metaRaw) {
    try {
      const parsed = JSON.parse(metaRaw || 'null');
      return Math.max(0, Math.round(Number(parsed?.saveSequence) || 0));
    } catch (error) {
      return 0;
    }
  }

  // Mirror whatever the synchronous tier now holds. Called after a save has
  // already been committed and verified there.
  function careerIdbMirrorCurrentSave() {
    if (!careerIdbState.supported) return;
    const records = {};
    for (const key of CAREER_IDB_KEYS) {
      let value = null;
      try { value = localStorage.getItem(key); } catch (error) { value = null; }
      records[key] = value;
    }
    careerIdbWriteRecords(records);
  }

  // The escape hatch for a career that no longer fits the fast tier. Bumps the
  // sequence itself, because the localStorage metadata write is exactly what
  // failed, and records that the durable tier now holds the newer copy so the
  // next boot adopts it.
  function careerIdbCommitPrimary(serialised, reason) {
    if (!careerIdbState.supported || typeof serialised !== 'string' || !serialised) return false;
    careerSaveSequence = Math.max(0, Math.round(Number(careerSaveMetadata()?.saveSequence) || 0)) + 1;
    const meta = JSON.stringify({
      savedAt: new Date().toISOString(),
      buildVersion: BUILD_VERSION,
      reason: String(reason || 'autosave'),
      saveSequence: careerSaveSequence,
      backupProtected: false,
      backupStatus: 'durable-tier-only',
      primaryTier: 'indexedDB'
    });
    careerIdbState.primaryTier = 'indexedDB';
    careerIdbWriteRecords({
      [CAREER_STORAGE_KEY]: serialised,
      [CAREER_SAVE_META_STORAGE_KEY]: meta
    });
    // The metadata is small enough that the fast tier can almost always still
    // take it, and keeping it there is what lets a stale second tab be
    // detected without waiting on an asynchronous read.
    try { localStorage.setItem(CAREER_SAVE_META_STORAGE_KEY, meta); } catch (error) { /* durable tier holds it */ }
    return true;
  }

  // On boot the game has already loaded from localStorage, synchronously,
  // because that is the only tier that can be read that way. If IndexedDB turns
  // out to hold a strictly newer save — the localStorage copy was evicted by
  // the browser, or a previous save was too large for it — adopt that instead.
  //
  // Only ever before this session has written anything of its own: adopting
  // over a career the manager has already been playing would be exactly the
  // silent overwrite Build 12.134 set out to prevent.
  async function careerIdbAdoptIfNewer() {
    if (!careerIdbState.supported) return { adopted: false, reason: 'unsupported' };
    const records = await careerIdbReadAll();
    if (!records) return { adopted: false, reason: 'unavailable' };
    const mirroredMeta = records[CAREER_SAVE_META_STORAGE_KEY];
    const mirroredSequence = careerIdbSequenceOf(mirroredMeta);
    const localSequence = Math.max(0, Math.round(Number(careerSaveMetadata()?.saveSequence) || 0));
    if (!records[CAREER_STORAGE_KEY]) {
      // Nothing mirrored yet. Seed the durable tier from what is already here
      // so the first adopt-capable save does not have to wait for a match.
      if (localSequence > 0) careerIdbMirrorCurrentSave();
      return { adopted: false, reason: 'no-mirrored-save', localSequence, mirroredSequence };
    }
    if (mirroredSequence <= localSequence) {
      return { adopted: false, reason: 'local-is-current', localSequence, mirroredSequence };
    }
    if (careerSaveSequence > localSequence) {
      return { adopted: false, reason: 'session-already-saved', localSequence, mirroredSequence };
    }
    let restored = null;
    try {
      restored = JSON.parse(records[CAREER_STORAGE_KEY]);
    } catch (error) {
      return { adopted: false, reason: 'mirrored-save-unreadable', localSequence, mirroredSequence };
    }
    if (!restored || typeof restored !== 'object') {
      return { adopted: false, reason: 'mirrored-save-empty', localSequence, mirroredSequence };
    }
    careerState = normaliseCareerState(restored);
    careerSaveSequence = mirroredSequence;
    careerIdbState.adopted = true;
    careerIdbState.adoptedSequence = mirroredSequence;
    // Write the recovered career back to the synchronous tier so the next
    // unload-time checkpoint has something current to protect. If it does not
    // fit, the durable tier simply stays the primary.
    try {
      for (const key of CAREER_IDB_KEYS) {
        const value = records[key];
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
      careerIdbState.primaryTier = 'localStorage';
    } catch (error) {
      careerIdbState.primaryTier = 'indexedDB';
    }
    setCareerDataNotice('success', 'CAREER RECOVERED',
      'A newer career was restored from durable browser storage. Browser site data had removed the faster copy.');
    if (typeof updateMenuUI === 'function') updateMenuUI();
    return { adopted: true, reason: 'adopted-newer', localSequence, mirroredSequence };
  }

  // ---------------------------------------------------------------------
  // Storage reporting for the configuration page.
  // ---------------------------------------------------------------------

  const careerStorageReport = {
    primaryBytes: 0,
    backupBytes: 0,
    metaBytes: 0,
    totalBytes: 0,
    quotaBytes: 0,
    usageBytes: 0,
    estimateStatus: 'idle',
    estimateError: null,
    measuredAt: null,
    quotaMeasuredAt: null
  };
  let careerStorageEstimatePromise = null;

  function careerStorageByteLength(value) {
    if (typeof value !== 'string' || !value) return 0;
    // The save is JSON, so it is almost all single-byte, but a club name can
    // carry anything. Measure the real encoded length rather than assuming.
    try {
      return new TextEncoder().encode(value).length;
    } catch (error) {
      return value.length;
    }
  }

  function careerStorageFormatBytes(bytes) {
    const value = Math.max(0, Number(bytes) || 0);
    if (value < 1024) return `${Math.round(value)} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function careerStorageMeasure() {
    const primary = careerStorageByteLength(careerStorageValue(CAREER_STORAGE_KEY));
    const backup = careerStorageByteLength(careerStorageValue(CAREER_BACKUP_STORAGE_KEY));
    const meta = careerStorageByteLength(careerStorageValue(CAREER_SAVE_META_STORAGE_KEY));
    careerStorageReport.primaryBytes = primary;
    careerStorageReport.backupBytes = backup;
    careerStorageReport.metaBytes = meta;
    careerStorageReport.totalBytes = primary + backup + meta;
    careerStorageReport.measuredAt = new Date().toISOString();
    return careerStorageReport;
  }

  function careerStorageOriginUsageLabel(report = careerStorageReport) {
    const status = String(report?.estimateStatus || 'idle');
    if (status === 'idle' || status === 'loading') return 'MEASURING...';
    if (status !== 'ready') return 'NOT REPORTED BY BROWSER';
    const quota = Math.max(0, Number(report?.quotaBytes) || 0);
    const usage = Math.max(0, Number(report?.usageBytes) || 0);
    if (quota > 0) return `${careerStorageFormatBytes(usage)} OF ${careerStorageFormatBytes(quota)} · ALL SITE DATA`;
    if (usage > 0) return `${careerStorageFormatBytes(usage)} USED · ALL SITE DATA`;
    return 'NOT REPORTED BY BROWSER';
  }

  function careerStorageRefreshOpenSettings() {
    if (typeof menuTab !== 'string' || menuTab !== 'settings' || typeof updateMenuUI !== 'function') return;
    const refresh = () => {
      if (typeof menuTab === 'string' && menuTab === 'settings' && typeof updateMenuUI === 'function') updateMenuUI();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refresh);
    else setTimeout(refresh, 0);
  }

  // navigator.storage.estimate() describes every storage bucket owned by this
  // site origin. It is asynchronous and is not the career's personal quota.
  function careerStorageRefreshQuota(options = {}) {
    const refreshUi = options.refreshUi !== false;
    const force = options.force === true;
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
      careerStorageReport.estimateStatus = 'unavailable';
      careerStorageReport.estimateError = 'Storage estimate API unavailable';
      return Promise.resolve(null);
    }
    if (careerStorageEstimatePromise) return careerStorageEstimatePromise;
    if (!force && careerStorageReport.estimateStatus === 'ready') return Promise.resolve(careerStorageReport);

    careerStorageReport.estimateStatus = 'loading';
    careerStorageReport.estimateError = null;
    careerStorageEstimatePromise = navigator.storage.estimate().then(estimate => {
      careerStorageReport.quotaBytes = Math.max(0, Number(estimate?.quota) || 0);
      careerStorageReport.usageBytes = Math.max(0, Number(estimate?.usage) || 0);
      careerStorageReport.estimateStatus = (careerStorageReport.quotaBytes > 0 || careerStorageReport.usageBytes > 0)
        ? 'ready'
        : 'unavailable';
      careerStorageReport.quotaMeasuredAt = new Date().toISOString();
      return careerStorageReport.estimateStatus === 'ready' ? careerStorageReport : null;
    }).catch(error => {
      careerStorageReport.estimateStatus = 'unavailable';
      careerStorageReport.estimateError = String(error?.message || error || 'Storage estimate failed');
      return null;
    }).finally(() => {
      careerStorageEstimatePromise = null;
      if (refreshUi) careerStorageRefreshOpenSettings();
    });
    return careerStorageEstimatePromise;
  }

  function careerStorageSummary(options = {}) {
    careerStorageMeasure();
    if (options.refresh !== false && careerStorageReport.estimateStatus === 'idle') {
      careerStorageRefreshQuota({ refreshUi: options.refreshUi !== false });
    }
    const quota = Math.max(0, Number(careerStorageReport.quotaBytes) || 0);
    const usage = Math.max(0, Number(careerStorageReport.usageBytes) || 0);
    const originUsageLabel = careerStorageOriginUsageLabel();
    return {
      saveSize: careerStorageFormatBytes(careerStorageReport.primaryBytes),
      backupSize: careerStorageReport.backupBytes
        ? careerStorageFormatBytes(careerStorageReport.backupBytes)
        : 'NONE STORED',
      totalSize: careerStorageFormatBytes(careerStorageReport.totalBytes),
      fastTierSize: careerStorageFormatBytes(careerStorageReport.totalBytes),
      originUsageLabel,
      originUsageStatus: careerStorageReport.estimateStatus,
      originUsagePercent: quota ? Math.min(100, (usage / quota) * 100) : 0,
      originScope: 'Includes all storage used by this site origin, not only this career and not a career-specific allowance.',
      // Retain aliases for older diagnostics while making their scope truthful.
      usageLabel: originUsageLabel,
      usagePercent: quota ? Math.min(100, (usage / quota) * 100) : 0,
      durableTier: careerIdbState.supported
        ? (careerIdbState.failedWrites > 0 && careerIdbState.writes === 0 ? 'UNAVAILABLE' : 'INDEXEDDB ACTIVE')
        : 'INDEXEDDB UNAVAILABLE',
      primaryTier: careerIdbState.primaryTier,
      bytes: { ...careerStorageReport }
    };
  }

  function careerStorageReportingForTest() {
    const loading = careerStorageOriginUsageLabel({ estimateStatus: 'loading', usageBytes: 0, quotaBytes: 0 });
    const ready = careerStorageOriginUsageLabel({ estimateStatus: 'ready', usageBytes: 2 * 1024 * 1024, quotaBytes: 100 * 1024 * 1024 });
    const unavailable = careerStorageOriginUsageLabel({ estimateStatus: 'unavailable', usageBytes: 0, quotaBytes: 0 });
    const summary = careerStorageSummary({ refresh: false });
    return {
      ok: loading === 'MEASURING...'
        && ready.includes('ALL SITE DATA')
        && unavailable === 'NOT REPORTED BY BROWSER'
        && !ready.includes('CAREER')
        && !summary.originUsageLabel.startsWith('0 B OF 0 B')
        && summary.fastTierSize === summary.totalSize
        && summary.originScope.includes('not a career-specific allowance'),
      loading,
      ready,
      unavailable,
      currentStatus: summary.originUsageStatus,
      currentLabel: summary.originUsageLabel,
      fastTierSize: summary.fastTierSize,
      originScope: summary.originScope
    };
  }

  function careerIndexedDbAuditForTest() {
    return {
      ok: true,
      supported: careerIdbState.supported,
      writes: careerIdbState.writes,
      failedWrites: careerIdbState.failedWrites,
      lastWriteAt: careerIdbState.lastWriteAt,
      lastError: careerIdbState.lastError,
      adopted: careerIdbState.adopted,
      adoptedSequence: careerIdbState.adoptedSequence,
      primaryTier: careerIdbState.primaryTier,
      keys: [...CAREER_IDB_KEYS],
      summary: careerStorageSummary()
    };
  }

  // Round-trips a save through the durable tier and reports whether the bytes
  // came back identical. Persistence changes require a round-trip check, and
  // this is it.
  async function careerIndexedDbRoundTripForTest() {
    if (!careerIdbState.supported) return { ok: false, reason: 'IndexedDB unavailable in this browser.' };
    const written = localStorage.getItem(CAREER_STORAGE_KEY);
    if (written === null) return { ok: false, reason: 'No career is stored to round-trip.' };
    const mirrored = await careerIdbWriteRecords({
      [CAREER_STORAGE_KEY]: written,
      [CAREER_SAVE_META_STORAGE_KEY]: localStorage.getItem(CAREER_SAVE_META_STORAGE_KEY)
    });
    const records = await careerIdbReadAll();
    const readBack = records ? records[CAREER_STORAGE_KEY] : null;
    const identical = readBack === written;
    let parses = false;
    try {
      parses = Boolean(readBack && typeof JSON.parse(readBack) === 'object');
    } catch (error) {
      parses = false;
    }
    return {
      ok: mirrored && identical && parses,
      mirrored,
      identical,
      parses,
      bytes: careerStorageByteLength(written),
      sequence: careerIdbSequenceOf(records ? records[CAREER_SAVE_META_STORAGE_KEY] : null)
    };
  }

  window.__strikeDebug = window.__strikeDebug || {};
  window.__strikeDebug.careerIndexedDbForTest = () => careerIndexedDbAuditForTest();
  window.__strikeDebug.careerIndexedDbRoundTripForTest = () => careerIndexedDbRoundTripForTest();
  window.__strikeDebug.careerStorageSummaryForTest = () => careerStorageSummary();
  window.__strikeDebug.careerStorageReportingForTest = () => careerStorageReportingForTest();
  window.__strikeDebug.careerIndexedDbAdoptForTest = () => careerIdbAdoptIfNewer();

  // Seed and reconcile once the rest of the game has booted. Deferred so a slow
  // or blocked database can never delay first paint.
  careerIdbAdoptIfNewer().catch(() => null);
  careerStorageRefreshQuota({ refreshUi: false });
