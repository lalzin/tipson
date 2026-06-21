import { useEffect, useState } from 'react'
import type { StudioSession } from '../lib/session'
import type { AudioMode, AudioDevice } from '../visual/audio'
import { MIDI_ACTIONS, bindingLabel, type MidiMap } from '../lib/midi'

export interface OverlayToggles {
  logo: boolean
  dj: boolean
  title: boolean
  venue: boolean
  messages: boolean
  emojis: boolean
  votes: boolean
  requests: boolean
  code: boolean
}

export default function Settings(props: {
  session: StudioSession
  mode: AudioMode; setMode: (m: AudioMode) => void
  devices: AudioDevice[]; deviceId: string; setDeviceId: (id: string) => void
  bpm: number; setBpm: (n: number) => void
  presets: string[]; presetName: string; applyPreset: (n: string) => void
  toggles: OverlayToggles; setToggles: (t: OverlayToggles) => void
  strobeOn: boolean; setStrobeOn: (b: boolean) => void
  strobeHz: number; setStrobeHz: (n: number) => void
  midiOn: boolean; midiInputs: string[]; enableMidi: () => void
  midiMap: MidiMap; learning: string | null; startLearn: (id: string | null) => void; clearBinding: (id: string) => void
  error: string
}) {
  const { mode, setMode, devices, deviceId, setDeviceId, bpm, setBpm, presets, presetName, applyPreset, toggles, setToggles, strobeOn, setStrobeOn, strobeHz, setStrobeHz, midiOn, midiInputs, enableMidi, midiMap, learning, startLearn, clearBinding, error } = props
  const [prolink, setProlink] = useState<{ connected: boolean; reason?: string }>({ connected: false })

  useEffect(() => {
    const off = window.tipson.onProlinkStatus(s => setProlink({ connected: s.connected }))
    return () => { off() }
  }, [])

  async function linkPlatine() {
    const res = await window.tipson.prolinkStart()
    if (!res.ok) setProlink({ connected: false, reason: res.reason })
  }

  const Toggle = (k: keyof OverlayToggles, label: string) => (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={toggles[k]} onChange={e => setToggles({ ...toggles, [k]: e.target.checked })} />
    </label>
  )

  return (
    <div className="panel">
      <h3>Source de réactivité</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {(['line', 'mic', 'beat'] as AudioMode[]).map(m => (
          <button key={m} className="tool" style={{ background: mode === m ? '#a855f7' : undefined, color: mode === m ? '#fff' : undefined }}
            onClick={() => setMode(m)}>
            {m === 'line' ? '🎚️ Ligne' : m === 'mic' ? '🎙️ Micro' : '🥁 Beat'}
          </button>
        ))}
      </div>

      {mode !== 'beat' && (
        <>
          <label>Entrée audio</label>
          <select className="field" value={deviceId} onChange={e => setDeviceId(e.target.value)}>
            <option value="">Par défaut</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <p className="muted" style={{ marginTop: -6, textAlign: 'left' }}>
            {mode === 'line' ? 'Branchez le booth/aux de la table sur une interface USB.' : 'Micro de l\'ordi ou micro USB près des enceintes.'}
          </p>
        </>
      )}

      {mode === 'beat' && (
        <>
          <label>BPM (métronome) · {bpm}</label>
          <input type="range" min={60} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ width: '100%' }} />
          <p className="muted" style={{ marginTop: 4, textAlign: 'left' }}>Sans audio : le visuel pulse au tempo. Le link platine (ci-dessous) le synchronisera automatiquement.</p>
        </>
      )}

      {error && <p className="err" style={{ textAlign: 'left' }}>{error}</p>}

      <h3>Link platine (Pro DJ Link)</h3>
      {prolink.connected
        ? <p style={{ color: '#34d399', fontSize: 13 }}>● Platine connectée</p>
        : <>
            <button className="btn" onClick={linkPlatine}>Activer le link platine</button>
            {prolink.reason && <p className="muted" style={{ textAlign: 'left', marginTop: 8 }}>{prolink.reason}</p>}
          </>}

      <h3>Stroboscope</h3>
      <label className="toggle">
        <span>Activer (continu)</span>
        <input type="checkbox" checked={strobeOn} onChange={e => setStrobeOn(e.target.checked)} />
      </label>
      <label>Vitesse · {strobeHz} flashs/s</label>
      <input type="range" min={1} max={20} value={strobeHz} onChange={e => setStrobeHz(Number(e.target.value))} style={{ width: '100%' }} />
      <p className="muted" style={{ textAlign: 'left', marginTop: 4 }}>Astuce : maintenez la touche <b>S</b> pour un strobe momentané (s'arrête au relâchement).</p>

      <h3>Visualisation</h3>
      <label>Preset Milkdrop <span className="muted">· touche P = suivant</span></label>
      <select className="field" value={presetName} onChange={e => applyPreset(e.target.value)}>
        {presets.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <h3>Mapping MIDI (live)</h3>
      {!midiOn ? (
        <button className="btn" onClick={enableMidi}>Activer le contrôle MIDI</button>
      ) : (
        <>
          <p className="muted" style={{ textAlign: 'left', marginTop: -4 }}>
            {midiInputs.length ? `Connecté : ${midiInputs.join(', ')}` : 'Aucun contrôleur détecté — branchez-le puis réactivez.'}
          </p>
          {MIDI_ACTIONS.map(a => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', gap: 8, margin: '6px 0' }}>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13 }}>{a.label}</span>
              <span className="muted" style={{ margin: 0, fontSize: 12, minWidth: 96, textAlign: 'right' }}>
                {learning === a.id ? '⌛ appuyez…' : bindingLabel(midiMap[a.id])}
              </span>
              <button className="tool" style={{ padding: '4px 8px' }} onClick={() => startLearn(learning === a.id ? null : a.id)}>
                {learning === a.id ? 'Annuler' : 'Apprendre'}
              </button>
              {midiMap[a.id] && learning !== a.id && (
                <button className="tool" style={{ padding: '4px 8px' }} onClick={() => clearBinding(a.id)}>✕</button>
              )}
            </div>
          ))}
        </>
      )}

      <h3>Éléments TIPSON</h3>
      <p className="muted" style={{ textAlign: 'left', marginTop: -4 }}>Chaque bloc est déplaçable à la souris sur l'écran.</p>
      {Toggle('logo', 'Logo réactif (couleur/son)')}
      {Toggle('dj', 'Nom du DJ')}
      {Toggle('title', 'Titre de la soirée')}
      {Toggle('venue', 'Lieu')}
      {Toggle('requests', 'Demandes (+ express)')}
      {Toggle('messages', 'Messages (défilants + super)')}
      {Toggle('emojis', 'Emojis')}
      {Toggle('votes', 'Votes (+1)')}
      {Toggle('code', 'QR + code soirée')}
    </div>
  )
}
