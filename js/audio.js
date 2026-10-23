// Som (efeitos + música) sintetizado com WebAudio e vibração. Sem arquivos de áudio.
(function (root) {
  const QK = root.QK;
  let ac = null, sfxBus = null, musicBus = null, musicLp = null, noiseBuf = null;
  const last = {};

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.35;
    sfxBus.connect(ac.destination);
    musicLp = ac.createBiquadFilter();
    musicLp.type = 'lowpass'; musicLp.frequency.value = 2200;
    musicBus = ac.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(musicLp); musicLp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
    return true;
  }

  // ------------------------------------------------------------- efeitos
  const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4];
  const sfx = {
    enabled: true,
    unlock() { if (ensure()) music.sync(); },
    tone(freq, dur, type, vol, slide, when) {
      if (!this.enabled || !ac) return;
      const t = ac.currentTime + (when || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + dur + 0.02);
    },
    throttle(name, ms) {
      const now = performance.now();
      if (last[name] && now - last[name] < ms) return false;
      last[name] = now;
      return true;
    },
    // n = posição na sequência de quebras da jogada (sobe na escala pentatônica)
    play(ev, n) {
      if (!this.enabled || !ac) return;
      switch (ev) {
        case 'hit': if (this.throttle('hit', 28)) this.tone(560 + Math.random() * 240, 0.05, 'triangle', 0.11); break;
        case 'clank': if (this.throttle('clank', 40)) this.tone(1400, 0.06, 'square', 0.04); break;
        case 'break': if (this.throttle('break', 30)) {
          const step = Math.min(n || 0, PENTA.length - 1);
          this.tone(240, 0.14, 'triangle', 0.11, 0.45);
          this.tone(523.25 * PENTA[step], 0.12, 'sine', 0.1, 1.04);
        } break;
        case 'plus': { const f = [660, 740, 880][Math.floor(Math.random() * 3)]; this.tone(f, 0.08, 'sine', 0.14, 1.5); this.tone(f * 1.5, 0.1, 'sine', 0.1, 1.3, 0.06); break; }
        case 'praise': [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(659 * m, 0.16, 'triangle', 0.1, 1, i * 0.06)); break;
        case 'land': if (this.throttle('land', 120)) this.tone(150, 0.07, 'sine', 0.08, 0.7); break;
        case 'coin': this.tone(1046, 0.07, 'square', 0.05); this.tone(1568, 0.12, 'square', 0.05, 1, 0.06); break;
        case 'laser': if (this.throttle('laser', 50)) this.tone(1800, 0.18, 'sawtooth', 0.05, 0.25); break;
        case 'spread': if (this.throttle('spread', 50)) this.tone(400, 0.1, 'triangle', 0.1, 2); break;
        case 'pop': this.tone(1200, 0.06, 'sine', 0.12, 0.5); break;
        case 'shoot': this.tone(260, 0.09, 'triangle', 0.12, 1.6); break;
        case 'turn': this.tone(196, 0.12, 'sine', 0.1, 0.85); break;
        case 'rocket': this.tone(200, 0.3, 'sawtooth', 0.07, 3); break;
        case 'blackhole': this.tone(120, 0.5, 'sine', 0.2, 0.3); break;
        case 'gameover': [523, 392, 330, 262].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.15, 0.97, i * 0.16)); break;
        case 'record': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.13, 1, i * 0.09)); break;
        case 'thorn': if (this.throttle('thorn', 40)) this.tone(700, 0.08, 'square', 0.05, 0.5); break;
        case 'pad': if (this.throttle('pad', 40)) this.tone(300, 0.06, 'triangle', 0.08, 1.8); break;
        case 'action': this.tone(500, 0.2, 'sawtooth', 0.07, 2.5); break;
        case 'click': this.tone(880, 0.035, 'sine', 0.07); break;
        case 'select': this.tone(660, 0.05, 'sine', 0.08); this.tone(990, 0.06, 'sine', 0.06, 1, 0.04); break;
      }
    },
  };

  // -------------------------------------------------------------- música
  // Loop calmo em Lá menor: baixo + acorde suave + arpejo pentatônico.
  const BPM = 92, EIGHTH = 60 / BPM / 2;
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G (MIDI)
  const ARP = [0, 1, 2, 1, 3, 2, 1, 2];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const music = {
    enabled: true,
    timer: null, step: 0, nextT: 0, playing: false, tension: false,
    // blocos perto do chão: filtro abre e entra um chimbal
    setTension(on) {
      if (on === this.tension) return;
      this.tension = on;
      if (musicLp) musicLp.frequency.setTargetAtTime(on ? 5200 : 2200, ac.currentTime, 0.6);
    },
    // abaixa a música por um instante (fim de jogo, recorde)
    duck(sec) {
      if (!this.playing) return;
      const t = ac.currentTime;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setTargetAtTime(0.04, t, 0.08);
      musicBus.gain.setTargetAtTime(0.16, t + (sec || 1.5), 0.6);
    },
    hat(t) {
      const src = ac.createBufferSource(), g = ac.createGain(), hp = ac.createBiquadFilter();
      src.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 6000;
      g.gain.value = 0.08;
      src.connect(hp); hp.connect(g); g.connect(musicBus);
      src.start(t);
    },
    sync() {
      if (!ac) return;
      const want = this.enabled && !document.hidden;
      if (want && !this.playing) this.start();
      else if (!want && this.playing) this.stop();
    },
    start() {
      this.playing = true;
      musicBus.gain.cancelScheduledValues(ac.currentTime);
      musicBus.gain.setTargetAtTime(0.16, ac.currentTime, 0.8);
      this.nextT = ac.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 120);
    },
    stop() {
      this.playing = false;
      clearInterval(this.timer);
      if (musicBus) musicBus.gain.setTargetAtTime(0, ac.currentTime, 0.25);
    },
    note(freq, t, dur, type, vol, attack) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + dur + 0.05);
    },
    schedule() {
      while (this.nextT < ac.currentTime + 0.4) {
        const t = this.nextT, s = this.step;
        const bar = Math.floor(s / 8) % CHORDS.length, chord = CHORDS[bar], i = s % 8;
        if (i === 0) {
          this.note(midi(chord[0] - 24), t, EIGHTH * 7, 'sine', 0.5, 0.02);
          for (const n of chord) this.note(midi(n), t, EIGHTH * 8, 'triangle', 0.05, 0.4);
        }
        if (i === 4) this.note(midi(chord[0] - 12), t, EIGHTH * 3, 'sine', 0.22, 0.02);
        if (this.tension) { this.hat(t); if (i % 2) this.note(midi(chord[0] - 12), t, EIGHTH * 0.9, 'sine', 0.12, 0.01); }
        // arpejo: falha algumas notas de propósito para respirar
        if ((s * 7 + bar) % 5 !== 0) {
          const k = ARP[i];
          const n = k < 3 ? chord[k] + 12 : chord[0] + 24;
          this.note(midi(n), t, EIGHTH * 1.6, 'sine', 0.09, 0.005);
        }
        this.nextT += EIGHTH;
        this.step++;
      }
    },
  };
  document.addEventListener('visibilitychange', () => music.sync());

  // ------------------------------------------------------------- vibração
  const haptics = {
    enabled: true,
    buzz(pattern, gate, ms) {
      if (!this.enabled || !navigator.vibrate) return;
      if (gate && !sfx.throttle('vib-' + gate, ms || 80)) return;
      try { navigator.vibrate(pattern); } catch (e) { /* sem suporte */ }
    },
  };

  QK.sfx = sfx;
  QK.music = music;
  QK.haptics = haptics;
})(window);
