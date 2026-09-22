interface StationTimeline {
  currentTrack: number;
  trackOffsetSeconds: number;
  lastSyncTimestamp: number;
  trackDuration: number;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.5; // 0.0 to 1.0 (default 50%)
  private playSessionId: number = 0;
  private stationTimelines: Record<string, StationTimeline> = {};

  constructor() {
    if (typeof window !== "undefined") {
      const storedMuted = localStorage.getItem("ztt.audio.muted");
      this.muted = storedMuted === "true";
      const storedVol = localStorage.getItem("ztt.audio.volume");
      if (storedVol !== null) {
        const parsed = parseFloat(storedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
      this.loadStationTimelines();
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getDestinationNode(): AudioNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, Math.round(vol * 100) / 100));
    this.volume = clamped;
    if (typeof window !== "undefined") {
      localStorage.setItem("ztt.audio.volume", String(clamped));
    }

    const ctx = this.getContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
    }

    if (clamped === 0) {
      if (!this.muted) {
        this.setMuted(true);
      }
      return;
    }

    if (this.muted) {
      this.muted = false;
      if (typeof window !== "undefined") {
        localStorage.setItem("ztt.audio.muted", "false");
      }
      if (ctx && this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      }
      if (this.radioAudioElement) {
        this.radioAudioElement.muted = false;
        this.radioAudioElement.volume = this.volume * 0.4;
      }
    } else if (this.radioAudioElement) {
      this.radioAudioElement.volume = this.volume * 0.4;
    }

    this.notifyRadioListeners();
  }

  public setMuted(val: boolean): void {
    this.muted = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("ztt.audio.muted", String(this.muted));
    }

    const ctx = this.getContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
    }

    if (this.muted) {
      // MUTE: Silencia o áudio sem pausar ou resetar a posição de reprodução!
      if (this.radioAudioElement) {
        this.radioAudioElement.muted = true;
        this.radioAudioElement.volume = 0;
      }
    } else {
      // DESMUTAR: Restaura o volume na posição exata da música em tempo real!
      if (this.volume <= 0) {
        this.volume = 0.5;
        if (typeof window !== "undefined") {
          localStorage.setItem("ztt.audio.volume", "0.5");
        }
      }
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      if (this.radioAudioElement) {
        this.radioAudioElement.muted = false;
        this.radioAudioElement.volume = this.volume * 0.4;
        if (this.radioPlaying && this.radioAudioElement.paused) {
          this.radioAudioElement.play().catch(() => {});
        }
      } else if (this.radioPlaying && !this.proceduralInterval) {
        this.startCurrentStation();
      }
    }

    this.notifyRadioListeners();
  }

  public toggleMute(): boolean {
    const nextMuted = !this.muted;
    this.setMuted(nextMuted);
    return this.muted;
  }

  // --- Sound FX (Scaled by volume & muted state) ---

  private getMasterGain(): number {
    if (this.muted) return 0;
    return this.volume;
  }

  // Card select/flip sound
  public playCardFlip() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

    gain.gain.setValueAtTime(0.15 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Attribute choice click
  public playAttrSelect() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.04);

    gain.gain.setValueAtTime(0.12 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Juiz apitando (Whistle)
  public playWhistle() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    [2400, 2460].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq + 40, now + 0.05);
      osc.frequency.setValueAtTime(freq - 30, now + 0.1);
      osc.frequency.setValueAtTime(freq + 30, now + 0.15);

      gain.gain.setValueAtTime(0.18 * masterGain, now);
      gain.gain.setValueAtTime(0.2 * masterGain, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  // Cartão Amarelo / Falta
  public playYellowCard() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.2 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Ponto ganho na rodada
  public playPointWon() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.18 * masterGain, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.15);
    });
  }

  // Ponto perdido na rodada
  public playPointLost() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 370, 311.13]; // A4, F#4, Eb4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.12 * masterGain, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.16);
    });
  }

  // GOOOOL! / Posição Vencida (Fanfarra Arcade Triunfante)
  public playGoal() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
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

      gain.gain.setValueAtTime(0.22 * masterGain, now + m.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + m.time + m.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + m.time);
      osc.stop(now + m.time + m.dur);
    });
  }

  // Chute de Pênalti
  public playPenaltyKick() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.35 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Defesa de Pênalti
  public playPenaltySave() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

    gain.gain.setValueAtTime(0.25 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Vitória no Jogo (Campeão)
  public playVictory() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
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

      gain.gain.setValueAtTime(0.25 * masterGain, now + m.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + m.time + m.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + m.time);
      osc.stop(now + m.time + m.dur);
    });
  }

  // Rasgar pacotinho de figurinha
  public playPackTear() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.18;
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
    gain.gain.setValueAtTime(0.25 * masterGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  // Revelação de carta
  public playCardReveal() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18 * masterGain, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.12);
    });
  }

  // Revelação de carta Lendária
  public playLegendaryReveal() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.22 * masterGain, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  // Som de moeda
  public playCoinEarn() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.setValueAtTime(1318.51, now + 0.08);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(987.77, now);
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);

    gain.gain.setValueAtTime(0.2 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Som de colar figurinha
  public playStickerStick() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.25 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Ruído de sintonia de rádio
  public playRadioTune() {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
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
    gain.gain.setValueAtTime(0.18 * masterGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    oscGain.gain.setValueAtTime(0.12 * masterGain, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
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
  private currentTrackNumber = 1;
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

  // Som mecânico e retrô de fita K7 sendo inserida no deck
  public playTapeInsert() {
    const ctx = this.getContext();
    const dest = this.getDestinationNode();
    if (!ctx || !dest || this.muted) return;

    const now = ctx.currentTime;

    // 1. Ruído de fricção do compartimento da fita
    const bufSize = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);

    // 2. Trava metálica da mola (Click 1)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1200, now + 0.06);
    osc1.frequency.exponentialRampToValueAtTime(280, now + 0.12);
    gain1.gain.setValueAtTime(0.3, now + 0.06);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(dest);
    osc1.start(now + 0.06);
    osc1.stop(now + 0.12);

    // 3. Batida mecânica sólida "CLACK-CHUNCK" (Encaixe e cabeça magnética)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(190, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.24);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.24);
  }

  public playTapeMode(): void {
    this.syncCurrentStationTimeline();
    this.saveStationTimelines();
    this.playTapeInsert();
    this.isPirateMode = true;
    this.currentStationIndex = 0;
    this.radioPlaying = true;
    this.setMuted(false);
    this.startCurrentStation();
    this.notifyRadioListeners();
  }

  public playFmRadioMode(): void {
    this.syncCurrentStationTimeline();
    this.saveStationTimelines();
    this.playRadioTune();
    this.isPirateMode = false;
    this.currentStationIndex = 0;
    this.radioPlaying = true;
    this.setMuted(false);
    this.startCurrentStation();
    this.notifyRadioListeners();
  }

  public togglePirateMode(): boolean {
    if (this.isPirateMode) {
      this.playFmRadioMode();
    } else {
      this.playTapeMode();
    }
    this.notifyRadioListeners();
    return this.isPirateMode;
  }

  public getRadioStationIndex() {
    return this.currentStationIndex;
  }

  public isRadioPlaying() {
    return this.radioPlaying;
  }

  public getCurrentTrackNumber(): number {
    return this.currentTrackNumber;
  }

  public getCurrentPlaybackTime(): { current: number; duration: number } {
    if (this.radioAudioElement && !isNaN(this.radioAudioElement.currentTime)) {
      return {
        current: Math.floor(this.radioAudioElement.currentTime),
        duration: Math.floor(this.radioAudioElement.duration || 180),
      };
    }
    const station = this.getRadioStation();
    const timeline = this.stationTimelines[station.id];
    return {
      current: Math.floor(timeline?.trackOffsetSeconds ?? 0),
      duration: Math.floor(timeline?.trackDuration ?? 180),
    };
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
    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Retoma no ponto exato do relógio virtual contínuo da estação atual
    this.startCurrentStation();
    this.notifyRadioListeners();
  }

  public pauseRadio() {
    this.syncCurrentStationTimeline();
    this.saveStationTimelines();
    this.radioPlaying = false;
    if (this.radioAudioElement) {
      try {
        this.radioAudioElement.pause();
      } catch {
        // ignore
      }
    }
    if (this.proceduralInterval) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
    this.notifyRadioListeners();
  }

  public nextRadioStation() {
    this.syncCurrentStationTimeline();
    this.saveStationTimelines();
    this.playRadioTune();
    const stations = this.getRadioStations();
    this.currentStationIndex = (this.currentStationIndex + 1) % stations.length;
    if (this.radioPlaying) {
      this.startCurrentStation();
    }
    this.notifyRadioListeners();
  }

  public prevRadioStation() {
    this.syncCurrentStationTimeline();
    this.saveStationTimelines();
    this.playRadioTune();
    const stations = this.getRadioStations();
    this.currentStationIndex =
      (this.currentStationIndex - 1 + stations.length) % stations.length;
    if (this.radioPlaying) {
      this.startCurrentStation();
    }
    this.notifyRadioListeners();
  }

  private stopAudioAndProcedural() {
    this.playSessionId++;
    if (this.radioAudioElement) {
      try {
        this.radioAudioElement.pause();
        this.radioAudioElement.currentTime = 0;
        this.radioAudioElement.onended = null;
        this.radioAudioElement.onerror = null;
      } catch {
        // ignore
      }
      this.radioAudioElement = null;
    }
    if (this.proceduralInterval) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
  }

  private loadStationTimelines(): void {
    if (typeof window === "undefined") return;
    const now = Date.now();
    try {
      const raw = localStorage.getItem("ztt.radio.timelines");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          this.stationTimelines = parsed;
        }
      }
    } catch {
      // ignore
    }

    const allStations = [...this.officialStations, ...this.pirateStations];
    allStations.forEach((s, idx) => {
      if (!this.stationTimelines[s.id]) {
        this.stationTimelines[s.id] = {
          currentTrack: 1,
          trackOffsetSeconds: (idx * 43) % 120, // defasagem inicial para sensação de transmissão ao vivo
          lastSyncTimestamp: now,
          trackDuration: 180,
        };
      }
    });
  }

  private saveStationTimelines(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ztt.radio.timelines", JSON.stringify(this.stationTimelines));
    } catch {
      // ignore
    }
  }

  private getOrUpdateStationTimeline(stationId: string): StationTimeline {
    const now = Date.now();
    let timeline = this.stationTimelines[stationId];
    if (!timeline) {
      timeline = {
        currentTrack: 1,
        trackOffsetSeconds: 0,
        lastSyncTimestamp: now,
        trackDuration: 180,
      };
      this.stationTimelines[stationId] = timeline;
    }

    const currentStation = this.getRadioStation();
    const isCurrentlyActive =
      this.radioPlaying &&
      this.radioAudioElement &&
      !this.radioAudioElement.paused &&
      currentStation.id === stationId;

    if (!isCurrentlyActive) {
      const elapsedSeconds = Math.max(0, (now - timeline.lastSyncTimestamp) / 1000);
      if (elapsedSeconds > 0) {
        let remaining = timeline.trackOffsetSeconds + elapsedSeconds;
        let track = timeline.currentTrack;
        const dur = Math.max(30, timeline.trackDuration || 180);

        while (remaining >= dur) {
          remaining -= dur;
          track += 1;
          if (track > 5) track = 1;
        }

        timeline.currentTrack = track;
        timeline.trackOffsetSeconds = remaining;
        timeline.lastSyncTimestamp = now;
      }
    }

    return timeline;
  }

  private syncCurrentStationTimeline(): void {
    const station = this.getRadioStation();
    const timeline = this.stationTimelines[station.id];
    if (!timeline) return;

    if (this.radioAudioElement) {
      timeline.trackOffsetSeconds = this.radioAudioElement.currentTime;
      timeline.lastSyncTimestamp = Date.now();
      if (this.radioAudioElement.duration && isFinite(this.radioAudioElement.duration)) {
        timeline.trackDuration = this.radioAudioElement.duration;
      }
    }
    this.saveStationTimelines();
  }

  private startCurrentStation() {
    this.stopAudioAndProcedural();
    if (!this.radioPlaying) return;

    const station = this.getRadioStation();
    const timeline = this.getOrUpdateStationTimeline(station.id);
    this.currentTrackNumber = timeline.currentTrack;

    if (typeof window === "undefined") {
      this.startProceduralBGM(station.proceduralPattern);
      return;
    }

    const folderTrackSrc = `/audio/${station.folder}/${timeline.currentTrack}.mp3`;
    this.tryPlayAudioFile(folderTrackSrc, station, timeline.trackOffsetSeconds, () => {
      if (timeline.currentTrack !== 1) {
        timeline.currentTrack = 1;
        timeline.trackOffsetSeconds = 0;
        this.currentTrackNumber = 1;
        const resetSrc = `/audio/${station.folder}/1.mp3`;
        this.tryPlayAudioFile(resetSrc, station, 0, () => {
          if (station.legacySrc) {
            this.tryPlayAudioFile(station.legacySrc, station, 0, () => {
              this.startProceduralBGM(station.proceduralPattern);
            });
          } else {
            this.startProceduralBGM(station.proceduralPattern);
          }
        });
      } else if (station.legacySrc) {
        this.tryPlayAudioFile(station.legacySrc, station, timeline.trackOffsetSeconds, () => {
          this.startProceduralBGM(station.proceduralPattern);
        });
      } else {
        this.startProceduralBGM(station.proceduralPattern);
      }
    });
  }

  private tryPlayAudioFile(
    src: string,
    station: typeof this.officialStations[0],
    initialOffset: number,
    onFail: () => void
  ) {
    const sessionId = this.playSessionId;
    if (!this.radioPlaying) {
      onFail();
      return;
    }

    const audio = new Audio(src);
    audio.volume = this.muted ? 0 : this.volume * 0.4;
    audio.muted = this.muted;
    this.radioAudioElement = audio;

    let seekApplied = false;
    const applySeek = () => {
      if (!seekApplied && audio.duration && isFinite(audio.duration)) {
        seekApplied = true;
        const timeline = this.stationTimelines[station.id];
        if (timeline) {
          timeline.trackDuration = audio.duration;
          const safeOffset = initialOffset % audio.duration;
          audio.currentTime = Math.max(0, Math.min(safeOffset, audio.duration - 0.5));
          timeline.trackOffsetSeconds = audio.currentTime;
          timeline.lastSyncTimestamp = Date.now();
        }
      }
    };

    audio.addEventListener("loadedmetadata", applySeek);
    audio.addEventListener("canplay", applySeek, { once: true });

    audio.ontimeupdate = () => {
      if (sessionId === this.playSessionId && this.radioPlaying && !audio.paused) {
        const timeline = this.stationTimelines[station.id];
        if (timeline) {
          timeline.trackOffsetSeconds = audio.currentTime;
          timeline.lastSyncTimestamp = Date.now();
          if (audio.duration && isFinite(audio.duration)) {
            timeline.trackDuration = audio.duration;
          }
        }
      }
    };

    audio.onended = () => {
      if (sessionId === this.playSessionId && this.radioPlaying) {
        const timeline = this.stationTimelines[station.id];
        if (timeline) {
          timeline.currentTrack += 1;
          timeline.trackOffsetSeconds = 0;
          timeline.lastSyncTimestamp = Date.now();
          this.currentTrackNumber = timeline.currentTrack;
        }
        this.startCurrentStation();
      }
    };

    audio.onerror = () => {
      if (sessionId === this.playSessionId) {
        onFail();
      }
    };

    audio
      .play()
      .then(() => {
        applySeek();
        if (sessionId !== this.playSessionId || !this.radioPlaying) {
          audio.pause();
          audio.currentTime = 0;
          if (this.radioAudioElement === audio) {
            this.radioAudioElement = null;
          }
        }
      })
      .catch(() => {
        if (sessionId === this.playSessionId) {
          onFail();
        }
      });
  }

  // Procedural 16-bit retro music generator
  private startProceduralBGM(pattern: string) {
    if (this.proceduralInterval) clearInterval(this.proceduralInterval);
    this.proceduralStep = 0;

    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Play first note immediately if radio is active
    if (this.radioPlaying) {
      this.playProceduralStep(pattern);
      this.proceduralStep = 1;
    }

    const stepTime = pattern === "samba" ? 140 : pattern === "arcade" ? 120 : 160;

    this.proceduralInterval = setInterval(() => {
      if (!this.radioPlaying) {
        if (this.proceduralInterval) {
          clearInterval(this.proceduralInterval);
          this.proceduralInterval = null;
        }
        return;
      }
      this.playProceduralStep(pattern);
      this.proceduralStep = (this.proceduralStep + 1) % 16;
    }, stepTime);
  }

  private playProceduralStep(pattern: string) {
    const masterGain = this.getMasterGain();
    if (masterGain <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const step = this.proceduralStep;

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
      gain.gain.setValueAtTime(0.08 * masterGain, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

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
      gain.gain.setValueAtTime(0.03 * masterGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    }

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
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05 * masterGain, now);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  }
}

export const sound = new SoundManager();
