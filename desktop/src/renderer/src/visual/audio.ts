// Source audio pour le visualiseur. 3 modes :
//  - 'line' / 'mic' : capture une entrée audio (interface USB / booth, ou micro)
//  - 'beat'         : aucun audio requis — on synthétise une enveloppe rythmique
//                     (pulse) pilotée par un BPM (manuel ou Pro DJ Link en Phase 3)
export type AudioMode = 'line' | 'mic' | 'beat'

export interface AudioDevice { id: string; label: string }

export async function listInputDevices(): Promise<AudioDevice[]> {
  try {
    // Il faut une permission active pour obtenir les labels
    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ id: d.deviceId, label: d.label || 'Entrée audio' }))
  } catch {
    return []
  }
}

export interface AudioSource {
  node: AudioNode          // à connecter à Butterchurn
  /** Pour le mode 'beat' : déclenche un pulse (ex. sur chaque temps). */
  pulse?: (intensity?: number) => void
  /** Pour le mode 'beat' : fixe le BPM d'un métronome interne. */
  setBpm?: (bpm: number) => void
  stop: () => void
}

// Capture d'une entrée audio réelle (ligne ou micro)
export async function createInputSource(ctx: AudioContext, deviceId?: string): Promise<AudioSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    },
  })
  const node = ctx.createMediaStreamSource(stream)
  return {
    node,
    stop: () => stream.getTracks().forEach(t => t.stop()),
  }
}

// Source "beat seul" : un buffer de bruit gaté par une enveloppe que l'on pulse
// sur chaque temps. Butterchurn lit le signal et réagit comme à un kick.
export function createBeatSource(ctx: AudioContext): AudioSource {
  const noise = ctx.createBufferSource()
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noise.buffer = buffer
  noise.loop = true

  // Filtre passe-bas pour un "kick" plutôt qu'un bruit blanc
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 180

  const gain = ctx.createGain()
  gain.gain.value = 0
  noise.connect(lp).connect(gain)
  noise.start()

  let metronome: ReturnType<typeof setInterval> | null = null

  function pulse(intensity = 1) {
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.min(1, intensity), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
  }

  function setBpm(bpm: number) {
    if (metronome) clearInterval(metronome)
    if (bpm > 0) metronome = setInterval(() => pulse(0.9), 60000 / bpm)
  }

  return {
    node: gain,
    pulse,
    setBpm,
    stop: () => { if (metronome) clearInterval(metronome); try { noise.stop() } catch {} },
  }
}
