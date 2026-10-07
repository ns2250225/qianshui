// WebAudio 程序化音频：环境声 + 生成式 BGM + 音效

export type MusicZone = 'surface' | 'shallow' | 'reef' | 'open' | 'twilight' | 'deep' | 'trench' | 'cave'

interface ZoneMusic {
  bpm: number
  root: number
  scale: number[]
  wave: OscillatorType
  noteProb: number
  spread: number
  pad: number[]
  padWave: OscillatorType
  bass: number
  vol: number
}

const ZONES: Record<MusicZone, ZoneMusic> = {
  // 海面：轻快
  surface: { bpm: 112, root: 67, scale: [0, 2, 4, 7, 9, 12, 14], wave: 'triangle', noteProb: 0.55, spread: 1, pad: [0, 4, 7], padWave: 'sine', bass: 0.5, vol: 0.5 },
  // 浅海：治愈
  shallow: { bpm: 84, root: 65, scale: [0, 2, 4, 7, 9, 12], wave: 'sine', noteProb: 0.38, spread: 1, pad: [0, 4, 7, 11], padWave: 'sine', bass: 0.35, vol: 0.55 },
  // 珊瑚礁：活泼
  reef: { bpm: 118, root: 64, scale: [0, 2, 4, 6, 7, 9, 11, 12], wave: 'triangle', noteProb: 0.5, spread: 1, pad: [0, 4, 7, 14], padWave: 'triangle', bass: 0.55, vol: 0.5 },
  // 外海：空灵
  open: { bpm: 64, root: 62, scale: [0, 2, 5, 7, 9, 12, 14], wave: 'sine', noteProb: 0.25, spread: 2, pad: [0, 7, 14], padWave: 'sine', bass: 0.2, vol: 0.55 },
  // 暮光带：神秘
  twilight: { bpm: 52, root: 57, scale: [0, 2, 3, 7, 8, 12], wave: 'sine', noteProb: 0.2, spread: 2, pad: [0, 3, 7, 10], padWave: 'sine', bass: 0.25, vol: 0.5 },
  // 深海：低频 Ambient
  deep: { bpm: 40, root: 45, scale: [0, 1, 5, 7, 8], wave: 'sine', noteProb: 0.12, spread: 1, pad: [0, 7], padWave: 'sine', bass: 0.3, vol: 0.55 },
  // 海沟：极简 + 压迫感
  trench: { bpm: 30, root: 38, scale: [0, 1, 6], wave: 'sine', noteProb: 0.06, spread: 1, pad: [0, 1], padWave: 'sine', bass: 0.4, vol: 0.6 },
  cave: { bpm: 48, root: 50, scale: [0, 3, 5, 6, 7, 10], wave: 'triangle', noteProb: 0.16, spread: 1, pad: [0, 6], padWave: 'sine', bass: 0.25, vol: 0.45 },
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

class AudioEngine {
  ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambBus!: GainNode
  private uwFilter!: BiquadFilterNode
  private delay!: DelayNode
  private noiseBuf!: AudioBuffer
  private waveGain!: GainNode
  private uwGain!: GainNode
  private deepGain!: GainNode
  private deepOsc!: OscillatorNode
  private zone: MusicZone = 'surface'
  private nextStep = 0
  private step = 0
  private vols = { music: 0.6, sfx: 0.8, mute: false }
  private underwater = false
  private depth = 0
  private ambTimer = 0

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    const ctx: AudioContext = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.connect(ctx.destination)
    this.uwFilter = ctx.createBiquadFilter()
    this.uwFilter.type = 'lowpass'
    this.uwFilter.frequency.value = 20000
    this.uwFilter.connect(this.master)
    this.musicBus = ctx.createGain()
    this.sfxBus = ctx.createGain()
    this.ambBus = ctx.createGain()
    this.musicBus.connect(this.master)
    this.sfxBus.connect(this.master)
    this.ambBus.connect(this.uwFilter)
    // 回声
    this.delay = ctx.createDelay(2)
    this.delay.delayTime.value = 0.42
    const fb = ctx.createGain()
    fb.gain.value = 0.38
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    this.delay.connect(fb)
    fb.connect(this.delay)
    this.delay.connect(wet)
    wet.connect(this.musicBus)
    // 噪声
    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    // 海浪
    this.waveGain = ctx.createGain()
    this.waveGain.gain.value = 0
    const wn = this.noiseSource(true)
    const wf = ctx.createBiquadFilter()
    wf.type = 'lowpass'
    wf.frequency.value = 700
    wn.connect(wf)
    wf.connect(this.waveGain)
    this.waveGain.connect(this.ambBus)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.12
    const lfoG = ctx.createGain()
    lfoG.gain.value = 300
    lfo.connect(lfoG)
    lfoG.connect(wf.frequency)
    lfo.start()
    wn.start()
    // 水下低沉水流
    this.uwGain = ctx.createGain()
    this.uwGain.gain.value = 0
    const un = this.noiseSource(true)
    const uf = ctx.createBiquadFilter()
    uf.type = 'lowpass'
    uf.frequency.value = 220
    un.connect(uf)
    uf.connect(this.uwGain)
    this.uwGain.connect(this.master)
    un.start()
    // 深海低频
    this.deepGain = ctx.createGain()
    this.deepGain.gain.value = 0
    this.deepOsc = ctx.createOscillator()
    this.deepOsc.type = 'sine'
    this.deepOsc.frequency.value = 42
    const deepOsc2 = ctx.createOscillator()
    deepOsc2.frequency.value = 42.7
    this.deepOsc.connect(this.deepGain)
    deepOsc2.connect(this.deepGain)
    this.deepGain.connect(this.master)
    this.deepOsc.start()
    deepOsc2.start()
    this.applyVolumes()
    this.nextStep = ctx.currentTime + 0.1
  }

  private noiseSource(loop = false) {
    const s = this.ctx!.createBufferSource()
    s.buffer = this.noiseBuf
    s.loop = loop
    return s
  }

  setVolumes(music: number, sfx: number, mute: boolean) {
    this.vols = { music, sfx, mute }
    this.applyVolumes()
  }

  private applyVolumes() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.vols.mute ? 0 : 1, t, 0.05)
    this.musicBus.gain.setTargetAtTime(this.vols.music * ZONES[this.zone].vol * 0.5, t, 0.5)
    this.sfxBus.gain.setTargetAtTime(this.vols.sfx * 0.7, t, 0.05)
    this.ambBus.gain.setTargetAtTime(this.vols.sfx * 0.6, t, 0.3)
  }

  setZone(z: MusicZone) {
    if (z === this.zone) return
    this.zone = z
    this.applyVolumes()
  }

  setEnv(underwater: boolean, depth: number) {
    this.underwater = underwater
    this.depth = depth
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.uwFilter.frequency.setTargetAtTime(underwater ? 500 : 20000, t, 0.3)
    this.waveGain.gain.setTargetAtTime(underwater ? (depth < 30 ? 0.25 : 0.05) : 0.5, t, 0.5)
    this.uwGain.gain.setTargetAtTime(underwater ? 0.12 * this.vols.sfx : 0, t, 0.5)
    const deep = underwater ? Math.min(1, Math.max(0, (depth - 300) / 2000)) : 0
    this.deepGain.gain.setTargetAtTime(deep * 0.12 * this.vols.sfx, t, 1)
  }

  update(dt: number) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const z = ZONES[this.zone]
    const stepDur = 60 / z.bpm / 2
    while (this.nextStep < ctx.currentTime + 0.2) {
      this.scheduleStep(this.nextStep, z, stepDur)
      this.nextStep += stepDur
      this.step++
    }
    // 环境随机声
    this.ambTimer -= dt
    if (this.ambTimer <= 0) {
      this.ambTimer = 2 + Math.random() * 6
      if (!this.underwater) {
        if (Math.random() < 0.5) this.sfx('gull')
      } else {
        if (Math.random() < 0.6) this.sfx('bubble')
        if (this.depth > 300 && Math.random() < 0.12) this.sfx('whale')
      }
    }
  }

  private scheduleStep(t: number, z: ZoneMusic, stepDur: number) {
    const ctx = this.ctx!
    const bar = Math.floor(this.step / 8)
    // 长音 Pad，每 4 小节
    if (this.step % 32 === 0) {
      const chordShift = [0, 5, -3, 7][bar / 4 % 4 | 0] ?? 0
      for (const n of z.pad) this.tone(mtof(z.root - 12 + n + chordShift), t, stepDur * 32, z.padWave, 0.05, stepDur * 6, this.musicBus, false)
    }
    // 低音
    if (this.step % 8 === 0 && Math.random() < z.bass) {
      this.tone(mtof(z.root - 24 + ([0, 5, -3, 7][bar % 4] ?? 0)), t, stepDur * 6, 'sine', 0.12, 0.05, this.musicBus, false)
    }
    // 旋律
    if (Math.random() < z.noteProb) {
      const n = z.scale[Math.floor(Math.random() * z.scale.length)] + 12 * Math.floor(Math.random() * z.spread)
      this.tone(mtof(z.root + n), t, stepDur * (1 + Math.random() * 2), z.wave, 0.07, 0.01, this.musicBus, true)
    }
  }

  private tone(freq: number, t: number, dur: number, wave: OscillatorType, vol: number, attack: number, bus: AudioNode, echo: boolean) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur)
    o.connect(g)
    g.connect(bus)
    if (echo) g.connect(this.delay)
    o.start(t)
    o.stop(t + attack + dur + 0.05)
  }

  private noiseBurst(t: number, dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', sweepTo?: number) {
    const ctx = this.ctx!
    const s = this.noiseSource()
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, t)
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f)
    f.connect(g)
    g.connect(this.sfxBus)
    s.start(t, Math.random())
    s.stop(t + dur + 0.05)
  }

  private blip(freq: number, t: number, dur: number, wave: OscillatorType, vol: number, slideTo?: number, echo = false) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(this.sfxBus)
    if (echo) g.connect(this.delay)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  sfx(name: string) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime
    switch (name) {
      case 'splash':
        this.noiseBurst(t, 0.6, 800, 0.6, 0.8, 'lowpass', 200)
        this.noiseBurst(t + 0.05, 0.3, 2500, 1, 0.3)
        break
      case 'swing':
        this.noiseBurst(t, 0.18, 600, 2, 0.35, 'bandpass', 2400)
        break
      case 'catch':
        ;[0, 4, 7, 12].forEach((n, i) => this.blip(mtof(76 + n), t + i * 0.06, 0.18, 'triangle', 0.2))
        break
      case 'newspecies':
        ;[0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.blip(mtof(72 + n), t + i * 0.08, 0.5, 'triangle', 0.18, undefined, true))
        break
      case 'fail':
        this.blip(320, t, 0.25, 'square', 0.08, 160)
        break
      case 'sonar':
        this.blip(1250, t, 1.4, 'sine', 0.3, 1180, true)
        break
      case 'hurt':
        this.blip(140, t, 0.3, 'sawtooth', 0.2, 60)
        this.noiseBurst(t, 0.2, 300, 1, 0.4, 'lowpass')
        break
      case 'coin':
        this.blip(988, t, 0.1, 'square', 0.1)
        this.blip(1319, t + 0.08, 0.3, 'square', 0.1)
        break
      case 'buy':
        ;[0, 7, 12].forEach((n, i) => this.blip(mtof(67 + n), t + i * 0.07, 0.2, 'square', 0.08))
        break
      case 'photo':
        this.noiseBurst(t, 0.05, 4000, 1, 0.5, 'highpass')
        this.noiseBurst(t + 0.08, 0.06, 3000, 1, 0.3, 'highpass')
        break
      case 'bubble':
        for (let i = 0; i < 3; i++) this.blip(400 + Math.random() * 600, t + i * 0.07 + Math.random() * 0.05, 0.08, 'sine', 0.05, 1200)
        break
      case 'click':
        this.blip(880, t, 0.04, 'square', 0.05)
        break
      case 'event':
        ;[0, 5, 9].forEach((n, i) => this.blip(mtof(69 + n), t + i * 0.12, 0.6, 'sine', 0.14, undefined, true))
        break
      case 'thunder':
        this.noiseBurst(t, 2.5, 120, 0.5, 1, 'lowpass', 40)
        break
      case 'levelup':
        ;[0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.blip(mtof(67 + n), t + i * 0.09, 0.3, 'square', 0.08))
        break
      case 'achievement':
        ;[0, 7, 12, 16].forEach((n, i) => this.blip(mtof(72 + n), t + i * 0.1, 0.5, 'triangle', 0.16, undefined, true))
        break
      case 'gull':
        this.blip(1800 + Math.random() * 400, t, 0.18, 'sawtooth', 0.025, 1100)
        this.blip(1900 + Math.random() * 300, t + 0.22, 0.15, 'sawtooth', 0.02, 1200)
        break
      case 'whale': {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        const f0 = 180 + Math.random() * 120
        o.frequency.setValueAtTime(f0, t)
        o.frequency.linearRampToValueAtTime(f0 * 1.6, t + 1.2)
        o.frequency.linearRampToValueAtTime(f0 * 0.8, t + 3)
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.06, t + 0.8)
        g.gain.linearRampToValueAtTime(0, t + 3.2)
        o.connect(g)
        g.connect(this.sfxBus)
        g.connect(this.delay)
        o.start(t)
        o.stop(t + 3.4)
        break
      }
      case 'interact':
        this.blip(660, t, 0.08, 'triangle', 0.12)
        this.blip(990, t + 0.06, 0.1, 'triangle', 0.12)
        break
      case 'chest':
        ;[0, 4, 7, 11, 14].forEach((n, i) => this.blip(mtof(79 + n), t + i * 0.05, 0.25, 'square', 0.07))
        break
      case 'warn':
        this.blip(440, t, 0.15, 'square', 0.06)
        this.blip(440, t + 0.2, 0.15, 'square', 0.06)
        break
      case 'rumble':
        this.noiseBurst(t, 3, 80, 0.5, 0.8, 'lowpass', 30)
        break
    }
  }
}

export const audio = new AudioEngine()
