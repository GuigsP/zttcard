// Web Audio API procedural retro 8-bit sound generator
// Zero external files, instant loading, zero latency, pure arcade nostalgia.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ztt.audio.muted");
      this.muted = stored === "true";
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("ztt.audio.muted", String(this.muted));
    }
    return this.muted;
  }

  // --- Sound FX ---

  // Card select/flip sound
  public playCardFlip() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Attribute choice click
  public playAttrSelect() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Juiz apitando (Whistle)
  public playWhistle() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dual oscillator with frequency modulation for realistic whistle trill
    [2400, 2460].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      // Trill modulation
      osc.frequency.setValueAtTime(freq + 40, now + 0.05);
      osc.frequency.setValueAtTime(freq - 30, now + 0.1);
      osc.frequency.setValueAtTime(freq + 30, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.2, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  // Cartão Amarelo / Falta
  public playYellowCard() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Ponto ganho na rodada
  public playPointWon() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.15);
    });
  }

  // Ponto perdido na rodada
  public playPointLost() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 370, 311.13]; // A4, F#4, Eb4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.12, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.16);
    });
  }

  // GOOOOL! / Posição Vencida (Fanfarra Arcade Triunfante)
  public playGoal() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5, E5, G5, C6 (Fanfarra 8-bit rápida)
    const melody = [
      { note: 523.25, time: 0, dur: 0.1 },
      { note: 659.25, time: 0.1, dur: 0.1 },
      { note: 783.99, time: 0.2, dur: 0.1 },
      { note: 1046.5, time: 0.3, dur: 0.35 },
    ];

    melody.forEach((m) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(m.note, now + m.time);

      gain.gain.setValueAtTime(0.22, now + m.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + m.time + m.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + m.time);
      osc.stop(now + m.time + m.dur);
    });
  }

  // Chute de Pênalti (Impacto Thump)
  public playPenaltyKick() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Defesa de Pênalti
  public playPenaltySave() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Vitória no Jogo (Campeão)
  public playVictory() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { note: 523.25, time: 0, dur: 0.15 },
      { note: 523.25, time: 0.16, dur: 0.15 },
      { note: 523.25, time: 0.32, dur: 0.15 },
      { note: 659.25, time: 0.48, dur: 0.3 },
      { note: 587.33, time: 0.8, dur: 0.15 },
      { note: 659.25, time: 0.96, dur: 0.15 },
      { note: 783.99, time: 1.12, dur: 0.45 },
    ];

    notes.forEach((m) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(m.note, now + m.time);

      gain.gain.setValueAtTime(0.25, now + m.time);
      gain.gain.exponentialRampToValueAtTime(0.01, now + m.time + m.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + m.time);
      osc.stop(now + m.time + m.dur);
    });
  }

  // Rasgar pacotinho de figurinha (ruído de plástico / papel)
  public playPackTear() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.18; // 180ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  // Revelação de carta normal/rara
  public playCardReveal() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.12);
    });
  }

  // Revelação de carta Lendária / Dourada (Epic chime)
  public playLegendaryReveal() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C major extended
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.22, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  // Som de moeda (Coin / Bling)
  public playCoinEarn() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(987.77, now);
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Som de colar figurinha no álbum (Sticker slap)
  public playStickerStick() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Ruído de sintonia de rádio analógico (Radio tuning static & blip)
  public playRadioTune() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Quick burst of static noise
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);

    // Followed by a small frequency blip
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    oscGain.gain.setValueAtTime(0.12, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.05);
    osc.stop(now + 0.15);
  }

  // ==========================================
  // --- RADINHO RETRÔ (BGM & PROCEDURAL CHIPTUNE) ---
  // ==========================================

  private officialStations = [
    {
      id: "varzea",
      freq: "94.0",
      freqPercent: 28,
      title: "VÁRZEA GROOVE",
      genre: "Samba 16-bit",
      folder: "94",
      legacySrc: "/audio/menu-theme.mp3",
      proceduralPattern: "samba",
      isPirate: false,
    },
    {
      id: "campeoes",
      freq: "98.5",
      freqPercent: 50,
      title: "ARENA 90s",
      genre: "Arcade Match",
      folder: "98.5",
      legacySrc: "/audio/duel-theme.mp3",
      proceduralPattern: "arcade",
      isPirate: false,
    },
    {
      id: "lendas",
      freq: "104.2",
      freqPercent: 78,
      title: "CLÁSSICOS RETRÔ",
      genre: "Retro Synth",
      folder: "104.2",
      legacySrc: "/audio/victory-theme.mp3",
      proceduralPattern: "synth",
      isPirate: false,
    },
  ];

  private pirateStations = [
    {
      id: "pirate1",
      freq: "99.9",
      freqPercent: 57,
      title: "PIRATA VOL. 1",
      genre: "Hits 80s 16-bit",
      folder: "k-7",
      legacySrc: "/audio/pirate-hits-1.mp3",
      proceduralPattern: "arcade",
      isPirate: true,
    },
    {
      id: "pirate2",
      freq: "106.5",
      freqPercent: 88,
      title: "PIRATA VOL. 2",
      genre: "Sucessos 90s",
      folder: "k-7",
      legacySrc: "/audio/pirate-hits-2.mp3",
      proceduralPattern: "samba",
      isPirate: true,
    },
    {
      id: "pirate3",
      freq: "107.9",
      freqPercent: 96,
      title: "CAMELÔ 16-BIT",
      genre: "Clássicos VIP",
      folder: "k-7",
      legacySrc: "/audio/pirate-hits-3.mp3",
      proceduralPattern: "synth",
      isPirate: true,
    },
  ];

  private isPirateMode = false;
  private currentStationIndex = 0;
  private currentTrackNumber = 1; // 1.mp3, 2.mp3, 3.mp3...
  private radioPlaying = false;
  private radioAudioElement: HTMLAudioElement | null = null;
  private proceduralInterval: ReturnType<typeof setInterval> | null = null;
  private proceduralStep = 0;
  private radioListeners: Array<() => void> = [];

  public getRadioStations() {
    return this.isPirateMode ? this.pirateStations : this.officialStations;
  }

  public getRadioStation() {
    const list = this.getRadioStations();
    return list[this.currentStationIndex] ?? list[0];
  }

  public getIsPirateMode() {
    return this.isPirateMode;
  }

  public togglePirateMode(): boolean {
    this.playRadioTune();
    this.isPirateMode = !this.isPirateMode;
    this.currentStationIndex = 0;
    this.currentTrackNumber = 1;
    if (this.radioPlaying) {
      this.startCurrentStation();
    }
    this.notifyRadioListeners();
    return this.isPirateMode;
  }

  public getRadioStationIndex() {
    return this.currentStationIndex;
  }

  public isRadioPlaying() {
    return this.radioPlaying && !this.muted;
  }

  public subscribeRadio(cb: () => void) {
    this.radioListeners.push(cb);
    return () => {
      this.radioListeners = this.radioListeners.filter((l) => l !== cb);
    };
  }

  private notifyRadioListeners() {
    this.radioListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }

  public toggleRadio(): boolean {
    if (this.radioPlaying) {
      this.pauseRadio();
    } else {
      this.playRadio();
    }
    return this.isRadioPlaying();
  }

  public playRadio() {
    this.radioPlaying = true;
    if (this.muted) {
      this.toggleMute();
    }
    this.startCurrentStation();
    this.notifyRadioListeners();
  }

  public pauseRadio() {
    this.radioPlaying = false;
    this.stopAudioAndProcedural();
    this.notifyRadioListeners();
  }

  public nextRadioStation() {
    this.playRadioTune();
    const stations = this.getRadioStations();
    this.currentStationIndex = (this.currentStationIndex + 1) % stations.length;
    this.currentTrackNumber = 1;
    if (this.radioPlaying) {
      this.startCurrentStation();
    }
    this.notifyRadioListeners();
  }

  public prevRadioStation() {
    this.playRadioTune();
    const stations = this.getRadioStations();
    this.currentStationIndex =
      (this.currentStationIndex - 1 + stations.length) % stations.length;
    this.currentTrackNumber = 1;
    if (this.radioPlaying) {
      this.startCurrentStation();
    }
    this.notifyRadioListeners();
  }

  private stopAudioAndProcedural() {
    if (this.radioAudioElement) {
      this.radioAudioElement.pause();
      this.radioAudioElement.currentTime = 0;
      this.radioAudioElement.onended = null;
      this.radioAudioElement.onerror = null;
      this.radioAudioElement = null;
    }
    if (this.proceduralInterval) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
  }

  private startCurrentStation() {
    this.stopAudioAndProcedural();
    if (!this.radioPlaying || this.muted) return;

    const station = this.getRadioStation();

    if (typeof window === "undefined") {
      this.startProceduralBGM(station.proceduralPattern);
      return;
    }

    // Attempt to play from folder e.g. /audio/94/1.mp3, /audio/98.5/1.mp3, /audio/k-7/1.mp3
    const folderTrackSrc = `/audio/${station.folder}/${this.currentTrackNumber}.mp3`;
    this.tryPlayAudioFile(folderTrackSrc, station, () => {
      // If folderTrackSrc failed on track 1, try legacySrc e.g. /audio/menu-theme.mp3
      if (this.currentTrackNumber === 1 && station.legacySrc) {
        this.tryPlayAudioFile(station.legacySrc, station, () => {
          // If no files found, fallback to 16-bit procedural radio synth
          this.startProceduralBGM(station.proceduralPattern);
        });
      } else {
        // If track N failed, cycle back to track 1
        this.currentTrackNumber = 1;
        const resetSrc = `/audio/${station.folder}/1.mp3`;
        this.tryPlayAudioFile(resetSrc, station, () => {
          this.startProceduralBGM(station.proceduralPattern);
        });
      }
    });
  }

  private tryPlayAudioFile(src: string, station: typeof this.officialStations[0], onFail: () => void) {
    const audio = new Audio(src);
    audio.volume = 0.28;

    // True radio behavior: When song finishes, automatically advance to next track in the station!
    audio.onended = () => {
      this.currentTrackNumber += 1;
      this.startCurrentStation();
    };

    audio.onerror = () => {
      onFail();
    };

    audio
      .play()
      .then(() => {
        this.radioAudioElement = audio;
      })
      .catch(() => {
        onFail();
      });
  }

  // Procedural 16-bit retro music generator
  private startProceduralBGM(pattern: string) {
    if (this.proceduralInterval) clearInterval(this.proceduralInterval);
    this.proceduralStep = 0;

    // Tempo in ms (120 BPM = ~125ms per 16th note)
    const stepTime = pattern === "samba" ? 140 : pattern === "arcade" ? 120 : 160;

    this.proceduralInterval = setInterval(() => {
      if (!this.radioPlaying || this.muted) {
        this.stopAudioAndProcedural();
        return;
      }
      this.playProceduralStep(pattern);
      this.proceduralStep = (this.proceduralStep + 1) % 16;
    }, stepTime);
  }

  private playProceduralStep(pattern: string) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const step = this.proceduralStep;

    // Bassline (Triangle)
    const sambaBass = [130.81, 0, 164.81, 130.81, 174.61, 0, 196.0, 164.81, 130.81, 0, 164.81, 146.83, 174.61, 0, 196.0, 146.83];
    const arcadeBass = [110.0, 110.0, 0, 130.81, 146.83, 146.83, 0, 164.81, 110.0, 110.0, 0, 130.81, 164.81, 174.61, 164.81, 130.81];
    const synthBass = [98.0, 0, 98.0, 0, 123.47, 0, 130.81, 0, 98.0, 0, 110.0, 0, 123.47, 0, 146.83, 0];

    const bassArr = pattern === "samba" ? sambaBass : pattern === "arcade" ? arcadeBass : synthBass;
    const bassNote = bassArr[step];

    if (bassNote > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(bassNote, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    // Melody / Chords (Square/Sine)
    const melodyNotes = [
      523.25, 0, 659.25, 587.33, 783.99, 0, 659.25, 523.25,
      880.0, 0, 783.99, 659.25, 587.33, 659.25, 523.25, 0,
    ];
    const melNote = melodyNotes[(step + (pattern === "arcade" ? 4 : 0)) % 16];

    if (melNote > 0 && (step % 2 === 0 || step % 3 === 0)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = pattern === "synth" ? "sine" : "square";
      osc.frequency.setValueAtTime(melNote, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    }

    // Retro Percussion / Hi-hat (White noise tick on even steps)
    if (step % 2 === 0) {
      const bufferSize = ctx.sampleRate * 0.02;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.015;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, now);
      noise.connect(filter);
      filter.connect(ctx.destination);
      noise.start(now);
    }
  }
}

export const sound = new SoundManager();
