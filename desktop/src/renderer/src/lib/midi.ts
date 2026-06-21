// Pilotage MIDI (contrôleur / pad / surface) pour un usage live.
// Web MIDI API (dispo dans Chromium/Electron). On parse note on/off + control
// change, et on laisse l'app mapper chaque contrôle à une action.

export type MidiKind = 'noteon' | 'noteoff' | 'cc'
export interface MidiMessage { kind: MidiKind; data1: number; value: number; channel: number }

export interface MidiBinding { kind: 'note' | 'cc'; data1: number; channel: number }
export type MidiMap = Record<string, MidiBinding | undefined>

// Actions pilotables (réutilisé par les Réglages pour l'apprentissage).
export const MIDI_ACTIONS: { id: string; label: string }[] = [
  { id: 'preset-next', label: 'Preset suivant' },
  { id: 'preset-prev', label: 'Preset précédent' },
  { id: 'preset-random', label: 'Preset aléatoire' },
  { id: 'strobe-hold', label: 'Stroboscope (maintenu)' },
  { id: 'strobe-toggle', label: 'Stroboscope on/off' },
  { id: 'blackout', label: 'Blackout on/off' },
  { id: 'media-toggle', label: 'Média on/off' },
  { id: 'media-next', label: 'Média suivant' },
  { id: 'media-prev', label: 'Média précédent' },
]

export function bindingLabel(b?: MidiBinding): string {
  if (!b) return '—'
  return `${b.kind === 'note' ? 'Note' : 'CC'} ${b.data1} · canal ${b.channel + 1}`
}

// Une note on/off correspond au même contrôle physique (un pad) → 'note'.
export function matches(b: MidiBinding, m: MidiMessage): boolean {
  const isNote = m.kind !== 'cc'
  return (b.kind === 'note') === isNote && b.data1 === m.data1 && b.channel === m.channel
}

export class MidiManager {
  private access: MIDIAccess | null = null
  private cb: (m: MidiMessage) => void
  inputs: string[] = []

  constructor(cb: (m: MidiMessage) => void) { this.cb = cb }

  async enable(): Promise<boolean> {
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false })
      this.bind()
      return true
    } catch { return false }
  }

  private bind() {
    if (!this.access) return
    this.inputs = []
    this.access.inputs.forEach(input => {
      this.inputs.push(input.name || 'Contrôleur MIDI')
      input.onmidimessage = (e: MIDIMessageEvent) => { if (e.data) this.parse(e.data) }
    })
    this.access.onstatechange = () => this.bind()
  }

  private parse(d: Uint8Array) {
    if (d.length < 2) return
    const cmd = d[0] & 0xf0, channel = d[0] & 0x0f
    if (cmd === 0x90 && (d[2] ?? 0) > 0) this.cb({ kind: 'noteon', data1: d[1], value: d[2], channel })
    else if (cmd === 0x80 || (cmd === 0x90 && (d[2] ?? 0) === 0)) this.cb({ kind: 'noteoff', data1: d[1], value: 0, channel })
    else if (cmd === 0xb0) this.cb({ kind: 'cc', data1: d[1], value: d[2] ?? 0, channel })
  }

  destroy() {
    if (!this.access) return
    this.access.inputs.forEach(i => { i.onmidimessage = null })
    this.access.onstatechange = null
    this.access = null
  }
}
