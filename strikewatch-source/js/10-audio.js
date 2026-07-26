/*
 * Strikewatch source module: 10-audio.js
 * Purpose: Web Audio initialisation, unlock handling, generated sounds and spatial sound events.
 *
 * This file is a source fragment. Run `python3 build.py` to regenerate
 * js/strikewatch.dev.js and the standalone release in dist/.
 */

  const AUDIO_EVENT_PROFILES = {
    gunshot: {
      radius: 30,
      baseVolume: 1.02,
      falloff: 0.0125,
      occludedScale: 0.48,
      directCutoff: 9800,
      farCutoff: 3300,
      occludedCutoff: 1250,
      selfScale: 0.64,
      duration: 0.50,
      reflection: 0.20
    },
    footstep: {
      radius: 8.5,
      baseVolume: 0.31,
      falloff: 0.058,
      occludedScale: 0.22,
      directCutoff: 3800,
      farCutoff: 1500,
      occludedCutoff: 620,
      selfScale: 0.52,
      duration: 0.27,
      reflection: 0.016
    },
    reloadOut: {
      radius: 8,
      baseVolume: 0.34,
      falloff: 0.060,
      occludedScale: 0.20,
      directCutoff: 5200,
      farCutoff: 1800,
      occludedCutoff: 650,
      selfScale: 0.82,
      duration: 0.15,
      reflection: 0.025
    },
    reloadIn: {
      radius: 8,
      baseVolume: 0.38,
      falloff: 0.060,
      occludedScale: 0.20,
      directCutoff: 4800,
      farCutoff: 1700,
      occludedCutoff: 620,
      selfScale: 0.82,
      duration: 0.19,
      reflection: 0.030
    },

    reloadRelease: {
      radius: 7,
      baseVolume: 0.42,
      falloff: 0.065,
      occludedScale: 0.18,
      directCutoff: 6200,
      farCutoff: 2100,
      occludedCutoff: 720,
      selfScale: 1.0,
      duration: 0.11,
      reflection: 0.018
    },
    reloadMagazineOut: {
      radius: 7.5,
      baseVolume: 0.46,
      falloff: 0.062,
      occludedScale: 0.19,
      directCutoff: 5400,
      farCutoff: 1900,
      occludedCutoff: 660,
      selfScale: 1.0,
      duration: 0.17,
      reflection: 0.024
    },
    reloadMagazineIn: {
      radius: 7.5,
      baseVolume: 0.43,
      falloff: 0.062,
      occludedScale: 0.19,
      directCutoff: 5000,
      farCutoff: 1800,
      occludedCutoff: 640,
      selfScale: 1.0,
      duration: 0.16,
      reflection: 0.024
    },
    reloadMagazineSeat: {
      radius: 8,
      baseVolume: 0.55,
      falloff: 0.060,
      occludedScale: 0.20,
      directCutoff: 4700,
      farCutoff: 1700,
      occludedCutoff: 620,
      selfScale: 1.0,
      duration: 0.14,
      reflection: 0.030
    },
    reloadRack: {
      radius: 8.5,
      baseVolume: 0.54,
      falloff: 0.058,
      occludedScale: 0.20,
      directCutoff: 6800,
      farCutoff: 2300,
      occludedCutoff: 700,
      selfScale: 1.0,
      duration: 0.20,
      reflection: 0.032
    },
    weaponSwitch: {
      radius: 6,
      baseVolume: 0.25,
      falloff: 0.075,
      occludedScale: 0.18,
      directCutoff: 4300,
      farCutoff: 1450,
      occludedCutoff: 560,
      selfScale: 0.86,
      duration: 0.17,
      reflection: 0.018
    },
    doorOpen: {
      radius: 10,
      baseVolume: 0.46,
      falloff: 0.048,
      occludedScale: 0.28,
      directCutoff: 4200,
      farCutoff: 1550,
      occludedCutoff: 580,
      selfScale: 0.82,
      duration: 0.42,
      reflection: 0.040
    },
    impact: {
      radius: 11,
      baseVolume: 0.38,
      falloff: 0.055,
      occludedScale: 0.24,
      directCutoff: 6200,
      farCutoff: 2100,
      occludedCutoff: 720,
      selfScale: 0.88,
      duration: 0.13,
      reflection: 0.045
    },
    bodyfall: {
      radius: 10,
      baseVolume: 0.42,
      falloff: 0.050,
      occludedScale: 0.30,
      directCutoff: 2200,
      farCutoff: 900,
      occludedCutoff: 420,
      selfScale: 0.76,
      duration: 0.31,
      reflection: 0.055
    }
  };

  function updateAudioButton() {
    const running = Boolean(audioContext && audioContext.state === 'running');
    const active = Boolean(audioEnabled && running);
    if (audioBtn) {
      if (!audioEnabled && audioUnlocked) audioBtn.textContent = 'SOUND: OFF';
      else if (!audioUnlocked || !running) audioBtn.textContent = 'SOUND: TAP';
      else audioBtn.textContent = 'SOUND: ON';
      audioBtn.classList.toggle('primary', active);
      audioBtn.dataset.audioState = audioContext ? audioContext.state : 'locked';
      audioBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (portraitAudioBtn) {
      portraitAudioBtn.dataset.muted = active ? 'false' : 'true';
      portraitAudioBtn.dataset.audioState = audioContext ? audioContext.state : 'locked';
      portraitAudioBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      portraitAudioBtn.setAttribute('aria-label', active ? 'Mute match audio' : 'Enable match audio');
      portraitAudioBtn.title = active ? 'Mute match audio' : 'Enable match audio';
    }
  }

  function audioDisplayState() {
    if (!(window.AudioContext || window.webkitAudioContext)) return 'UNSUPPORTED';
    if (!audioEnabled) return 'OFF';
    if (!audioContext || audioContext.state !== 'running') return 'TAP TO RESUME';
    return 'ON';
  }

  function bindAudioContextLifecycle() {
    if (!audioContext) return;
    audioContext.onstatechange = () => {
      combatDebug.audioStateChanges++;
      updateAudioButton();
      if (!audioContext) return;
      if (audioContext.state === 'running') {
        audioLastHealthyAt = performance.now();
        const now = audioContext.currentTime;
        if (audioMaster) {
          audioMaster.gain.cancelScheduledValues(now);
          audioMaster.gain.setTargetAtTime(audioEnabled ? 0.82 : 0.0001, now, 0.012);
        }
        primeAudioOutput();
        flushPendingAudio();
      } else if (audioEnabled && audioUnlocked && document.visibilityState === 'visible') {
        // Safari may report "interrupted" as well as "suspended" after an
        // orientation/fullscreen transition or brief app switch. Queue a fresh
        // recovery rather than waiting for the next gunshot to reveal silence.
        queueAudioRecovery(audioContext.state === 'interrupted' ? 40 : 120);
      }
    };
  }

  function clearClosedAudioContext() {
    if (!audioContext || audioContext.state !== 'closed') return;
    try { audioContext.onstatechange = null; } catch (_) {}
    audioContext = null;
    audioMaster = null;
    audioCompressor = null;
    audioUnlockPromise = null;
    audioResumeFailureCount = 0;
    for (const key of Object.keys(audioBuffers)) delete audioBuffers[key];
  }

  function softClip(sample, drive = 1.1) {
    return Math.tanh(sample * drive);
  }

  function buildAudioBuffer(kind, profileName = 'default', variant = 0) {
    if (!audioContext) return null;
    const gunProfiles = {
      rifle: { duration: 0.48, bodyHz: 72, bodyGain: 0.86, crack: 1.18, tail: 0.46, mechHz: 205, brightness: 1.0 },
      carbine: { duration: 0.42, bodyHz: 82, bodyGain: 0.76, crack: 1.08, tail: 0.38, mechHz: 232, brightness: 1.08 },
      smg: { duration: 0.35, bodyHz: 96, bodyGain: 0.58, crack: 0.92, tail: 0.31, mechHz: 278, brightness: 1.16 },
      pistol: { duration: 0.31, bodyHz: 112, bodyGain: 0.54, crack: 1.03, tail: 0.27, mechHz: 330, brightness: 1.24 }
    };

    const reloadProfiles = {
      'worn-pistol': { pitch: 0.91, metal: 0.92, polymer: 1.18, rattle: 1.30, snap: 0.90 },
      'service-pistol': { pitch: 1.00, metal: 1.02, polymer: 1.00, rattle: 0.72, snap: 1.08 },
      'compact-pistol': { pitch: 1.13, metal: 1.08, polymer: 0.92, rattle: 0.82, snap: 1.18 },
      pistol: { pitch: 1.00, metal: 1.00, polymer: 1.00, rattle: 0.82, snap: 1.00 },
      smg: { pitch: 0.96, metal: 1.08, polymer: 0.94, rattle: 0.90, snap: 1.08 },
      carbine: { pitch: 0.86, metal: 1.18, polymer: 0.90, rattle: 0.88, snap: 1.12 },
      rifle: { pitch: 0.78, metal: 1.28, polymer: 0.86, rattle: 0.84, snap: 1.16 }
    };
    const reloadProfile = reloadProfiles[profileName] || reloadProfiles.pistol;
    const footstepRunning = kind === 'footstep' && variant >= 4;
    const durations = {
      footstep: footstepRunning ? 0.205 : 0.275,
      reloadOut: 0.15,
      reloadIn: 0.19,
      reloadRelease: 0.11,
      reloadMagazineOut: 0.17,
      reloadMagazineIn: 0.16,
      reloadMagazineSeat: 0.14,
      reloadRack: 0.20,
      weaponSwitch: 0.17,
      doorOpen: 0.42,
      impact: 0.13,
      bodyfall: 0.31
    };
    const gunProfile = gunProfiles[profileName] || gunProfiles.rifle;
    const duration = kind === 'gunshot' ? gunProfile.duration : (durations[kind] || 0.16);
    const sampleRate = audioContext.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);
    let lowNoise = 0;
    let mediumNoise = 0;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = i / length;
      const noise = Math.random() * 2 - 1;
      lowNoise = lowNoise * 0.82 + noise * 0.18;
      mediumNoise = mediumNoise * 0.52 + noise * 0.48;
      let sample = 0;

      if (kind === 'gunshot') {
        const highNoise = noise - mediumNoise * 0.42;
        const crack = highNoise * Math.exp(-t * 78) * gunProfile.crack * gunProfile.brightness;
        const pressure = Math.sin(TAU * (gunProfile.bodyHz + t * 58) * t) * Math.exp(-t * 16) * gunProfile.bodyGain;
        const sub = Math.sin(TAU * gunProfile.bodyHz * 0.46 * t) * Math.exp(-t * 11) * gunProfile.bodyGain * 0.50;
        const mechanism = Math.sin(TAU * gunProfile.mechHz * t) * Math.exp(-t * 42) * 0.22;
        const gas = mediumNoise * Math.exp(-t * 8.6) * gunProfile.tail;
        sample = crack + pressure + sub + mechanism + gas;

        const firstReflection = Math.floor(sampleRate * 0.043);
        const secondReflection = Math.floor(sampleRate * 0.091);
        if (i > firstReflection) sample += channel[i - firstReflection] * 0.16 * Math.exp(-t * 1.4);
        if (i > secondReflection) sample += channel[i - secondReflection] * 0.09 * Math.exp(-t * 1.2);
        channel[i] = softClip(sample, 1.18);
        continue;
      }

      if (kind === 'footstep') {
        // Layer a muted heel compression, sole contact and short grit release.
        // The sound is noise-led rather than sine-led, avoiding the resonant
        // wooden knock heard in earlier builds. Variants 0-3 are walking;
        // variants 4-7 are shorter running contacts.
        const localVariant = variant % 4;
        const running = variant >= 4;
        const side = localVariant % 2;
        const texture = Math.floor(localVariant / 2);
        const heelTime = t - (0.004 + side * 0.0015);
        const soleTime = t - (running ? 0.018 : 0.027) - side * 0.002;
        const toeTime = t - (running ? 0.070 : 0.105) - texture * 0.004;
        const heelEnv = heelTime >= 0 ? Math.exp(-heelTime * (running ? 48 : 38)) : 0;
        const soleEnv = soleTime >= 0 ? Math.exp(-soleTime * (running ? 25 : 18)) : 0;
        const toeEnv = toeTime >= 0 ? Math.exp(-toeTime * (running ? 62 : 48)) : 0;
        const lowContact = lowNoise * heelEnv * (running ? 0.54 : 0.46);
        const soleContact = (lowNoise * 0.72 + mediumNoise * 0.22) * soleEnv * (running ? 0.34 : 0.29);
        const grit = (noise - mediumNoise * 0.72) * toeEnv * (0.105 + texture * 0.018);
        const leather = mediumNoise * Math.exp(-t * (running ? 28 : 20)) * 0.075;
        const weightPulse = heelTime >= 0
          ? Math.sin(TAU * (72 + side * 5 + texture * 4) * heelTime) * Math.exp(-heelTime * (running ? 34 : 28)) * (running ? 0.075 : 0.052)
          : 0;
        const gearTime = t - (running ? 0.040 : 0.062);
        const gear = gearTime > 0 ? (noise - lowNoise) * Math.exp(-gearTime * 54) * 0.030 : 0;
        sample = lowContact + soleContact + grit + leather + weightPulse + gear;

      } else if (kind === 'reloadRelease') {
        const click = Math.sin(TAU * (640 * reloadProfile.pitch) * t) * Math.exp(-t * 92) * 0.30 * reloadProfile.snap;
        const spring = Math.sin(TAU * (285 * reloadProfile.pitch) * t) * Math.exp(-t * 46) * 0.18 * reloadProfile.metal;
        const handling = mediumNoise * Math.exp(-t * 34) * 0.17 * reloadProfile.polymer;
        sample = click + spring + handling;
      } else if (kind === 'reloadMagazineOut') {
        const scrape = mediumNoise * Math.exp(-t * 23) * 0.34 * reloadProfile.polymer;
        const body = Math.sin(TAU * (126 * reloadProfile.pitch) * t) * Math.exp(-t * 20) * 0.38 * reloadProfile.polymer;
        const rattleTime = t - 0.045;
        const rattle = rattleTime > 0 ? (noise - lowNoise) * Math.exp(-rattleTime * 58) * 0.13 * reloadProfile.rattle : 0;
        sample = scrape + body + rattle;
      } else if (kind === 'reloadMagazineIn') {
        const guide = mediumNoise * Math.exp(-t * 27) * 0.30 * reloadProfile.polymer;
        const shell = Math.sin(TAU * (164 * reloadProfile.pitch) * t) * Math.exp(-t * 25) * 0.25 * reloadProfile.polymer;
        const contactTime = t - 0.070;
        const contact = contactTime > 0 ? Math.sin(TAU * (410 * reloadProfile.pitch) * contactTime) * Math.exp(-contactTime * 64) * 0.14 * reloadProfile.metal : 0;
        sample = guide + shell + contact;
      } else if (kind === 'reloadMagazineSeat') {
        const seat = Math.sin(TAU * (104 * reloadProfile.pitch) * t) * Math.exp(-t * 24) * 0.72 * reloadProfile.polymer;
        const latch = Math.sin(TAU * (720 * reloadProfile.pitch) * t) * Math.exp(-t * 96) * 0.28 * reloadProfile.snap;
        const rattleTime = t - 0.030;
        const rattle = rattleTime > 0 ? mediumNoise * Math.exp(-rattleTime * 52) * 0.11 * reloadProfile.rattle : 0;
        sample = seat + latch + rattle;
      } else if (kind === 'reloadRack') {
        const pull = mediumNoise * Math.exp(-t * 24) * 0.31 * reloadProfile.metal;
        const rail = Math.sin(TAU * (225 * reloadProfile.pitch) * t) * Math.exp(-t * 30) * 0.30 * reloadProfile.metal;
        const returnTime = t - 0.085;
        const returnSnap = returnTime > 0 ? Math.sin(TAU * (610 * reloadProfile.pitch) * returnTime) * Math.exp(-returnTime * 78) * 0.39 * reloadProfile.snap : 0;
        const spring = returnTime > 0 ? mediumNoise * Math.exp(-returnTime * 45) * 0.14 * reloadProfile.metal : 0;
        sample = pull + rail + returnSnap + spring;
      } else if (kind === 'reloadOut') {
        const release = Math.sin(TAU * 520 * t) * Math.exp(-t * 80) * 0.34;
        const scrape = mediumNoise * Math.exp(-t * 28) * 0.38;
        const plastic = Math.sin(TAU * 145 * t) * Math.exp(-t * 24) * 0.40;
        sample = release + scrape + plastic;
      } else if (kind === 'reloadIn') {
        const seat = Math.sin(TAU * 118 * t) * Math.exp(-t * 21) * 0.74;
        const click = Math.sin(TAU * 690 * t) * Math.exp(-t * 76) * 0.27;
        const handling = mediumNoise * Math.exp(-t * 25) * 0.26;
        const boltTime = t - 0.075;
        const bolt = boltTime > 0 ? Math.sin(TAU * 410 * boltTime) * Math.exp(-boltTime * 55) * 0.25 : 0;
        sample = seat + click + handling + bolt;
      } else if (kind === 'weaponSwitch') {
        const cloth = lowNoise * Math.exp(-t * 17) * 0.34;
        const sling = Math.sin(TAU * 175 * t) * Math.exp(-t * 30) * 0.26;
        const latchTime = t - 0.050;
        const latch = latchTime > 0 ? Math.sin(TAU * 560 * latchTime) * Math.exp(-latchTime * 65) * 0.21 : 0;
        sample = cloth + sling + latch;
      } else if (kind === 'doorOpen') {
        const motorEnv = Math.sin(Math.min(1, progress) * Math.PI);
        const motor = Math.sin(TAU * (82 + progress * 28) * t) * motorEnv * 0.22;
        const rail = (lowNoise * 0.62 + mediumNoise * 0.24) * motorEnv * 0.30;
        const release = Math.sin(TAU * 690 * t) * Math.exp(-t * 82) * 0.16;
        const settleTime = t - 0.315;
        const settle = settleTime > 0
          ? (Math.sin(TAU * 126 * settleTime) * Math.exp(-settleTime * 34) * 0.34
            + mediumNoise * Math.exp(-settleTime * 42) * 0.12)
          : 0;
        sample = motor + rail + release + settle;
      } else if (kind === 'impact') {
        const snap = (noise - lowNoise) * Math.exp(-t * 58) * 0.78;
        const armour = Math.sin(TAU * 235 * t) * Math.exp(-t * 31) * 0.47;
        const body = Math.sin(TAU * 92 * t) * Math.exp(-t * 24) * 0.42;
        sample = snap + armour + body;
      } else if (kind === 'bodyfall') {
        const body = Math.sin(TAU * 61 * t) * Math.exp(-t * 12) * 0.86;
        const gear = mediumNoise * Math.exp(-t * 18) * 0.34;
        const secondaryTime = t - 0.095;
        const secondary = secondaryTime > 0 ? Math.sin(TAU * 94 * secondaryTime) * Math.exp(-secondaryTime * 22) * 0.36 : 0;
        sample = body + gear + secondary;
      }

      channel[i] = softClip(sample, 1.08);
    }
    return buffer;
  }

  function weaponAudioProfile(source) {
    const weaponName = source && source.weapon ? source.weapon.name : '';
    if (source?.weapon?.category === 'pistol' || weaponName.indexOf('SIDEARM') >= 0 || weaponName.indexOf('P12') >= 0 || weaponName.indexOf('VIPER') >= 0) return 'pistol';
    if (weaponName.indexOf('KILO') >= 0) return 'smg';
    if (weaponName.indexOf('M8') >= 0) return 'carbine';
    return 'rifle';
  }

  function weaponReloadAudioProfile(source) {
    if (typeof careerWeaponReloadAudioProfile === 'function') return careerWeaponReloadAudioProfile(source?.weapon || source?.primaryWeapon || source);
    return String(source?.weapon?.reloadAudioProfile || source?.reloadAudioProfile || weaponAudioProfile(source) || 'rifle');
  }

  function isReloadAudioEvent(type) {
    return ['reloadRelease', 'reloadMagazineOut', 'reloadMagazineIn', 'reloadMagazineSeat', 'reloadRack'].includes(type);
  }

  function reloadAudioProfilesInUse() {
    const profiles = new Set(['worn-pistol', 'service-pistol', 'compact-pistol', 'pistol', 'smg', 'carbine', 'rifle']);
    try {
      for (const weapon of Object.values(CAREER_WEAPON_CATALOG || {})) profiles.add(careerWeaponReloadAudioProfile(weapon));
      for (const weapon of Object.values(CAREER_NPC_WEAPON_CATALOG || {})) profiles.add(careerWeaponReloadAudioProfile(weapon));
      for (const weapon of weaponDefs || []) profiles.add(weapon.reloadAudioProfile || weaponAudioProfile({ weapon }));
      profiles.add(SIDEARM_DEF.reloadAudioProfile || 'service-pistol');
    } catch (_) {}
    return [...profiles].filter(Boolean);
  }

  function audioBufferForEvent(event) {
    if (event.type === 'gunshot') return audioBuffers[`gunshot-${event.audioProfile || weaponAudioProfile(event.source)}`] || audioBuffers['gunshot-rifle'];
    if (event.type === 'footstep') return audioBuffers[`footstep-${clamp(Math.floor(Number(event.variant) || 0), 0, 7)}`] || audioBuffers['footstep-0'];
    if (isReloadAudioEvent(event.type)) {
      const profile = event.audioProfile || weaponReloadAudioProfile(event.source);
      return audioBuffers[`${event.type}-${profile}`] || audioBuffers[`${event.type}-pistol`] || audioBuffers[event.type] || null;
    }
    return audioBuffers[event.type] || null;
  }

  function initialiseAudioBuffers() {
    audioBuffers['gunshot-rifle'] = buildAudioBuffer('gunshot', 'rifle');
    audioBuffers['gunshot-carbine'] = buildAudioBuffer('gunshot', 'carbine');
    audioBuffers['gunshot-smg'] = buildAudioBuffer('gunshot', 'smg');
    audioBuffers['gunshot-pistol'] = buildAudioBuffer('gunshot', 'pistol');
    for (let variant = 0; variant < 8; variant++) {
      audioBuffers[`footstep-${variant}`] = buildAudioBuffer('footstep', 'default', variant);
    }
    audioBuffers.reloadOut = buildAudioBuffer('reloadOut');
    audioBuffers.reloadIn = buildAudioBuffer('reloadIn');
    const reloadCueTypes = ['reloadRelease', 'reloadMagazineOut', 'reloadMagazineIn', 'reloadMagazineSeat', 'reloadRack'];
    for (const reloadProfile of reloadAudioProfilesInUse()) {
      for (const cueType of reloadCueTypes) {
        audioBuffers[`${cueType}-${reloadProfile}`] = buildAudioBuffer(cueType, reloadProfile);
      }
    }
    audioBuffers.weaponSwitch = buildAudioBuffer('weaponSwitch');
    audioBuffers.doorOpen = buildAudioBuffer('doorOpen');
    audioBuffers.impact = buildAudioBuffer('impact');
    audioBuffers.bodyfall = buildAudioBuffer('bodyfall');
  }

  function primeAudioOutput() {
    if (!audioContext || !audioMaster) return;
    try {
      const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      gain.gain.value = 0.00001;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(audioMaster);
      source.start(0);
    } catch (_) {}
  }

  function playAudioConfirmation() {
    if (!audioContext || audioContext.state !== 'running' || !audioMaster) return;
    try {
      const now = audioContext.currentTime;
      const mix = audioContext.createGain();
      mix.gain.value = 0.045;
      mix.connect(audioMaster);
      [560, 760].forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.045;
        osc.type = index ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.08, start + 0.050);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(index ? 0.70 : 1.0, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
        osc.connect(gain);
        gain.connect(mix);
        osc.start(start);
        osc.stop(start + 0.080);
      });
    } catch (_) {}
  }

  function playMatchMomentCue(tone = 'neutral') {
    if (!audioEnabled || !audioContext || audioContext.state !== 'running' || !audioMaster) return false;
    const profiles = {
      danger: [310, 245],
      clutch: [520, 760],
      adjustment: [470, 640],
      advantage: [600, 860],
      positive: [620, 900],
      coach: [430, 560],
      neutral: [420, 510]
    };
    const frequencies = profiles[String(tone || 'neutral')] || profiles.neutral;
    try {
      const now = audioContext.currentTime;
      const mix = audioContext.createGain();
      mix.gain.setValueAtTime(0.0001, now);
      mix.gain.exponentialRampToValueAtTime(0.032, now + 0.008);
      mix.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      mix.connect(audioMaster);
      frequencies.forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.055;
        osc.type = index ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * (tone === 'danger' ? 0.94 : 1.06), start + 0.12);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(index ? 0.46 : 0.68, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
        osc.connect(gain);
        gain.connect(mix);
        osc.start(start);
        osc.stop(start + 0.16);
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function flushPendingAudio() {
    if (!audioContext || audioContext.state !== 'running') return;
    const queued = pendingAudioEvents
      .filter(event => simulationClock - event.createdAt < 0.75)
      .slice(-10);
    pendingAudioEvents = [];
    for (const event of queued) playSpatialSound(event, true);
  }

  async function ensureAudio(withConfirmation = false) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      audioEnabled = false;
      audioUnlocked = true;
      combatDebug.audioFailures++;
      updateAudioButton();
      showStatus('AUDIO NOT SUPPORTED');
      return false;
    }

    clearClosedAudioContext();

    if (audioUnlockPromise && !withConfirmation) return audioUnlockPromise;

    if (audioContext && audioContext.state !== 'running' && audioResumeFailureCount >= 2) {
      try { audioContext.close(); } catch (_) {}
      clearClosedAudioContext();
    }

    if (!audioContext) {
      try {
        try {
          audioContext = new AudioCtor({ latencyHint: 'interactive' });
        } catch (_) {
          audioContext = new AudioCtor();
        }
        audioMaster = audioContext.createGain();
        audioMaster.gain.value = 0.0001;
        if (audioContext.createDynamicsCompressor) {
          audioCompressor = audioContext.createDynamicsCompressor();
          audioCompressor.threshold.value = -20;
          audioCompressor.knee.value = 18;
          audioCompressor.ratio.value = 6;
          audioCompressor.attack.value = 0.003;
          audioCompressor.release.value = 0.22;
          audioMaster.connect(audioCompressor);
          audioCompressor.connect(audioContext.destination);
        } else {
          audioMaster.connect(audioContext.destination);
        }
        bindAudioContextLifecycle();
        initialiseAudioBuffers();
      } catch (_) {
        audioContext = null;
        audioMaster = null;
        audioEnabled = false;
        audioUnlocked = true;
        combatDebug.audioFailures++;
        updateAudioButton();
        showStatus('AUDIO START FAILED');
        return false;
      }
    }

    const wasUnlocked = audioUnlocked;
    audioUnlocked = true;
    if (!wasUnlocked || withConfirmation) audioEnabled = true;
    updateAudioButton();

    // iOS Safari is most reliable when a source is started synchronously inside
    // the user gesture, before waiting for resume() to settle.
    primeAudioOutput();
    // Always make a fresh resume attempt. Reusing an older failed promise can
    // consume the next real user gesture on iOS without actually resuming audio.
    combatDebug.audioResumeAttempts++;
    const currentUnlock = (async () => {
      try {
        if (audioContext.state !== 'running') await audioContext.resume();
        primeAudioOutput();
        if (audioContext.state !== 'running') throw new Error('Audio context remained suspended');
        combatDebug.audioUnlocks++;
        audioResumeFailureCount = 0;
        audioLastHealthyAt = performance.now();
        const now = audioContext.currentTime;
        audioMaster.gain.cancelScheduledValues(now);
        audioMaster.gain.setTargetAtTime(audioEnabled ? 0.82 : 0.0001, now, 0.012);
        flushPendingAudio();
        return true;
      } catch (_) {
        combatDebug.audioFailures++;
        audioResumeFailureCount++;
        return false;
      }
    })();
    audioUnlockPromise = currentUnlock;

    const running = await currentUnlock;
    if (audioUnlockPromise === currentUnlock) audioUnlockPromise = null;
    updateAudioButton();
    if (running && withConfirmation) {
      playAudioConfirmation();
      showStatus('SOUND ENABLED');
    } else if (!running && withConfirmation) {
      showStatus('TAP SOUND AGAIN');
    }
    return running;
  }

  function resumeAudioFromGesture() {
    if (!audioEnabled) return;
    const now = performance.now();
    if (audioContext && audioContext.state === 'running') {
      audioLastGestureAttempt = now;
      audioLastHealthyAt = now;
      primeAudioOutput();
      return;
    }
    if (now - audioLastGestureAttempt < 90 && audioUnlockPromise) return;
    audioLastGestureAttempt = now;
    ensureAudio(false);
  }

  function maintainAudioHealth(timestamp = performance.now()) {
    if (timestamp - audioLastHealthCheck < 1250) return;
    audioLastHealthCheck = timestamp;
    if (!audioEnabled || !audioUnlocked || document.visibilityState !== 'visible') return;
    if (audioContext && audioContext.state === 'running') {
      audioLastHealthyAt = timestamp;
      flushPendingAudio();
      return;
    }
    combatDebug.audioRecoveries++;
    queueAudioRecovery(0);
  }

  function recoverAudioAfterVisibility() {
    updateAudioButton();
    if (!audioEnabled || !audioUnlocked || !audioContext || audioContext.state === 'running') return;
    combatDebug.audioRecoveries++;
    ensureAudio(false);
  }

  function queueAudioRecovery(delay = 100) {
    if (audioRecoveryTimer) clearTimeout(audioRecoveryTimer);
    audioRecoveryTimer = window.setTimeout(() => {
      audioRecoveryTimer = 0;
      updateAudioButton();
      if (!audioEnabled || !audioUnlocked) return;
      clearClosedAudioContext();
      if (!audioContext || audioContext.state !== 'running') {
        combatDebug.audioRecoveries++;
        ensureAudio(false);
      } else {
        audioLastHealthyAt = performance.now();
        flushPendingAudio();
      }
    }, Math.max(0, Number(delay) || 0));
  }

  async function toggleAudio() {
    if (!audioUnlocked || !audioContext || audioContext.state !== 'running') {
      await ensureAudio(true);
      return;
    }
    audioEnabled = !audioEnabled;
    const now = audioContext.currentTime;
    audioMaster.gain.cancelScheduledValues(now);
    audioMaster.gain.setTargetAtTime(audioEnabled ? 0.82 : 0.0001, now, 0.015);
    if (audioEnabled) {
      playAudioConfirmation();
      showStatus('SOUND ENABLED');
    } else {
      showStatus('SOUND MUTED');
    }
    updateAudioButton();
  }

  function playSpatialSound(event, fromQueue = false) {
    if (!audioEnabled || !audioUnlocked || !audioContext || !audioMaster) return;
    if (audioContext.state !== 'running') {
      if (!fromQueue) {
        pendingAudioEvents.push(event);
        if (pendingAudioEvents.length > 20) pendingAudioEvents.shift();
        combatDebug.audioQueued++;
        queueAudioRecovery(0);
      }
      return;
    }
    audioLastHealthyAt = performance.now();
    const listener = bots[spectatorIndex];
    if (!listener) return;
    const profile = AUDIO_EVENT_PROFILES[event.type] || AUDIO_EVENT_PROFILES.footstep;
    const radius = Number.isFinite(event.radius) ? event.radius : profile.radius;
    const dx = event.x - listener.x;
    const dy = event.y - listener.y;
    const distanceToSound = Math.hypot(dx, dy);
    if (distanceToSound > radius * 1.25) return;

    const direct = hasLineOfSight(listener, event);
    const occlusion = direct ? 1 : profile.occludedScale;
    const falloff = 1 / (1 + distanceToSound * distanceToSound * profile.falloff);
    const selfScale = event.source === listener ? profile.selfScale : 1;
    const loudness = Number.isFinite(event.loudness) ? event.loudness : 1;
    const volume = clamp(profile.baseVolume * loudness * falloff * occlusion * selfScale, 0, 1.12);
    if (volume < 0.005) return;

    try {
      const buffer = audioBufferForEvent(event);
      if (!buffer) return;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      if (event.type === 'gunshot') {
        const profileName = event.audioProfile || weaponAudioProfile(event.source);
        const pitchBase = profileName === 'pistol' ? 1.08 : (profileName === 'smg' ? 1.03 : (profileName === 'carbine' ? 0.98 : 0.93));
        source.playbackRate.value = pitchBase + Math.random() * 0.10;
      } else if (event.type === 'footstep') {
        const gaitPitch = event.gait === 'sprint' ? 1.10 : (event.gait === 'run' ? 1.035 : 0.955);
        source.playbackRate.value = gaitPitch + Math.random() * 0.075;
      } else if (isReloadAudioEvent(event.type)) {
        source.playbackRate.value = 0.985 + Math.random() * 0.030;
      } else {
        source.playbackRate.value = 0.96 + Math.random() * 0.08;
      }

      const distanceRatio = clamp(distanceToSound / Math.max(0.01, radius), 0, 1);
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = direct
        ? lerp(profile.directCutoff, profile.farCutoff, distanceRatio)
        : profile.occludedCutoff;
      filter.Q.value = event.type === 'gunshot' ? 0.68 : (event.type === 'footstep' ? 0.18 : 0.42);
      const sourceInput = event.type === 'footstep' ? audioContext.createBiquadFilter() : null;
      if (sourceInput) {
        sourceInput.type = 'highpass';
        sourceInput.frequency.value = event.gait === 'sprint' ? 66 : (event.gait === 'run' ? 58 : 48);
        sourceInput.Q.value = 0.18;
      }

      const now = audioContext.currentTime;
      const startAt = now + Math.max(0, Number(event.delay) || 0);
      const duration = Math.max(0.08, buffer.duration / Math.max(0.25, source.playbackRate.value));
      const dryGain = audioContext.createGain();
      dryGain.gain.setValueAtTime(0.0001, now);
      dryGain.gain.setValueAtTime(Math.max(0.0001, volume), startAt);
      dryGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      const mix = audioContext.createGain();
      if (sourceInput) {
        source.connect(sourceInput);
        sourceInput.connect(filter);
      } else {
        source.connect(filter);
      }
      filter.connect(dryGain);
      dryGain.connect(mix);

      if (profile.reflection > 0 && volume > 0.018) {
        const reflectionFilter = audioContext.createBiquadFilter();
        reflectionFilter.type = 'lowpass';
        reflectionFilter.frequency.value = direct ? 2400 : 980;
        const delay = audioContext.createDelay(0.28);
        delay.delayTime.value = (direct ? 0.044 : 0.068) + Math.min(0.026, distanceToSound * 0.0015) + Math.random() * 0.012;
        const reflectionGain = audioContext.createGain();
        const wetVolume = Math.max(0.0001, volume * profile.reflection * (direct ? 1 : 0.62));
        reflectionGain.gain.setValueAtTime(0.0001, now);
        reflectionGain.gain.setValueAtTime(wetVolume, startAt);
        reflectionGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration + 0.16);
        filter.connect(reflectionFilter);
        reflectionFilter.connect(delay);
        delay.connect(reflectionGain);
        reflectionGain.connect(mix);
      }

      const bearing = angleDiff(Math.atan2(dy, dx), listener.angle);
      if (audioContext.createStereoPanner) {
        const pan = audioContext.createStereoPanner();
        pan.pan.value = clamp(Math.sin(bearing) * (0.82 + distanceRatio * 0.16), -0.96, 0.96);
        mix.connect(pan);
        pan.connect(audioMaster);
      } else {
        mix.connect(audioMaster);
      }
      source.start(startAt);
      source.stop(startAt + duration + 0.05);
      combatDebug.audioPlays++;
    } catch (_) {
      combatDebug.audioFailures++;
    }
  }

  function emitSoundEvent(type, source, radius, loudness = 1, options = {}) {
    if (!source) return null;
    const event = {
      id: ++soundEventSequence,
      type,
      x: source.x,
      y: source.y,
      team: Number.isFinite(source.team) ? source.team : null,
      source,
      radius,
      loudness,
      audioProfile: type === 'gunshot' ? weaponAudioProfile(source) : (isReloadAudioEvent(type) ? weaponReloadAudioProfile(source) : ''),
      variant: options.variant || 0,
      gait: options.gait || '',
      delay: options.delay || 0,
      createdAt: simulationClock
    };
    soundEvents.push(event);
    if (type === 'gunshot') registerCombatContact();
    if (soundEvents.length > 48) soundEvents.splice(0, soundEvents.length - 48);
    playSpatialSound(event);
    return event;
  }

  function emitCosmeticSound(type, source, loudness = 1, options = {}) {
    if (!source) return null;
    const profile = AUDIO_EVENT_PROFILES[type];
    if (!profile) return null;
    const event = {
      id: 0,
      type,
      x: source.x,
      y: source.y,
      team: Number.isFinite(source.team) ? source.team : null,
      source,
      radius: Number.isFinite(options.radius) ? options.radius : profile.radius,
      loudness,
      audioProfile: type === 'gunshot' ? weaponAudioProfile(source) : (isReloadAudioEvent(type) ? weaponReloadAudioProfile(source) : ''),
      variant: options.variant || 0,
      gait: options.gait || '',
      delay: options.delay || 0,
      createdAt: simulationClock
    };
    playSpatialSound(event);
    return event;
  }

  function updateSoundEvents() {
    for (let i = soundEvents.length - 1; i >= 0; i--) {
      const event = soundEvents[i];
      if (simulationClock - event.createdAt >= (event.type === 'gunshot' ? 2.2 : 1.15)) soundEvents.splice(i, 1);
    }
  }
