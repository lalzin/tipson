import { useEffect, useRef, useState } from 'react'
import type { StudioSession } from '../lib/session'
import { Visualizer } from '../visual/butterchurn'
import { type AudioMode, type AudioDevice, type AudioSource, listInputDevices, createInputSource, createBeatSource } from '../visual/audio'
import Overlay from './Overlay'
import Settings, { type OverlayToggles } from './Settings'
import { MidiManager, matches, type MidiMap, type MidiMessage } from '../lib/midi'

const MIDI_MAP_KEY = 'tipson-midi-map'

export interface MediaItem { id: string; url: string; type: 'image' | 'video'; name: string }

const DEFAULT_TOGGLES: OverlayToggles = { logo: true, dj: true, title: true, venue: true, messages: true, emojis: true, votes: true, requests: true, code: true }

export default function Studio({ session, onExit }: { session: StudioSession; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vizRef = useRef<Visualizer | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioSource | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const [mode, setMode] = useState<AudioMode>('mic')
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [bpm, setBpm] = useState(128)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<string[]>([])
  const togglesKey = `tipson-toggles-${session.id}`
  const [toggles, setToggles] = useState<OverlayToggles>(() => {
    try { const raw = localStorage.getItem(togglesKey); if (raw) return { ...DEFAULT_TOGGLES, ...JSON.parse(raw) } } catch {}
    return DEFAULT_TOGGLES
  })
  useEffect(() => { try { localStorage.setItem(togglesKey, JSON.stringify(toggles)) } catch {} }, [togglesKey, toggles])
  const [showPanel, setShowPanel] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [error, setError] = useState('')
  const [strobeOn, setStrobeOn] = useState(false)   // mode continu (case à cocher)
  const [strobeHeld, setStrobeHeld] = useState(false) // momentané (touche S maintenue)
  const [strobeHz, setStrobeHz] = useState(10)        // vitesse (flashs/seconde)
  const [midiOn, setMidiOn] = useState(false)
  const [midiInputs, setMidiInputs] = useState<string[]>([])
  const [learning, setLearning] = useState<string | null>(null)
  const [midiMap, setMidiMap] = useState<MidiMap>(() => {
    try { const raw = localStorage.getItem(MIDI_MAP_KEY); if (raw) return JSON.parse(raw) } catch {}
    return {}
  })
  const [blackout, setBlackout] = useState(false)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaIdx, setMediaIdx] = useState(0)
  const [mediaShown, setMediaShown] = useState(false)
  const [mediaOpacity, setMediaOpacity] = useState(1) // 0..1 — laisse voir le visuel derrière

  // Init du visualiseur (canvas plein écran)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = new AudioContext()
    ctxRef.current = ctx
    // Analyseur partagé : alimente le logo réactif (niveau/rythme).
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    analyserRef.current = analyser
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      vizRef.current?.setSize(canvas.width, canvas.height)
    }
    resize()
    const viz = new Visualizer(canvas, ctx)
    vizRef.current = viz
    setPresets(viz.presetNames)
    viz.loadRandom(0)
    setPresetName(viz.currentPresetName)
    viz.start()
    window.addEventListener('resize', resize)
    listInputDevices().then(setDevices)
    return () => {
      window.removeEventListener('resize', resize)
      viz.destroy(); srcRef.current?.stop(); ctx.close()
    }
  }, [])

  // (Re)connecte la source audio quand le mode/appareil change
  useEffect(() => {
    const ctx = ctxRef.current, viz = vizRef.current
    if (!ctx || !viz) return
    let cancelled = false
    ;(async () => {
      setError('')
      srcRef.current?.stop()
      try {
        if (ctx.state === 'suspended') await ctx.resume()
        const src = mode === 'beat' ? createBeatSource(ctx) : await createInputSource(ctx, deviceId || undefined)
        if (cancelled) { src.stop(); return }
        srcRef.current = src
        viz.connect(src.node)
        try { if (analyserRef.current) src.node.connect(analyserRef.current) } catch {}
        if (mode === 'beat') src.setBpm?.(bpm)
        if (mode !== 'beat') listInputDevices().then(setDevices) // labels après permission
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Source audio indisponible')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, deviceId])

  useEffect(() => { if (mode === 'beat') srcRef.current?.setBpm?.(bpm) }, [bpm, mode])

  // Auto-masquage des contrôles : visibles tant que la souris bouge sur l'app,
  // masqués après une période d'inactivité (rendu "écran" propre).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reveal = () => {
      setControlsVisible(true)
      clearTimeout(t)
      t = setTimeout(() => setControlsVisible(false), 4000)
    }
    reveal()
    // Seule la souris révèle les contrôles : les raccourcis clavier (live)
    // ne doivent pas faire réapparaître le curseur ni les menus.
    window.addEventListener('mousemove', reveal)
    window.addEventListener('mousedown', reveal)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('mousedown', reveal)
    }
  }, [])

  // Stroboscope momentané : maintenir S l'active, le relâcher l'arrête.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    const down = (e: KeyboardEvent) => { if (!e.repeat && e.key.toLowerCase() === 's' && !typing(e.target)) setStrobeHeld(true) }
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 's') setStrobeHeld(false) }
    const blur = () => setStrobeHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])
  const strobeActive = strobeOn || strobeHeld

  // Le panneau de réglages, une fois ouvert, force l'affichage des contrôles.
  const uiVisible = controlsVisible || showPanel

  function applyPreset(name: string) { vizRef.current?.loadPreset(name); setPresetName(name) }
  function nextPreset() { vizRef.current?.next(); setPresetName(vizRef.current?.currentPresetName ?? '') }
  function prevPreset() { vizRef.current?.prev(); setPresetName(vizRef.current?.currentPresetName ?? '') }
  function randomPreset() { vizRef.current?.loadRandom(); setPresetName(vizRef.current?.currentPresetName ?? '') }

  // ── Pilotage live : raccourcis clavier + mapping MIDI ───────────────────────
  useEffect(() => { try { localStorage.setItem(MIDI_MAP_KEY, JSON.stringify(midiMap)) } catch {} }, [midiMap])

  // ── Média (image / vidéo) intégré au visuel ─────────────────────────────────
  function addMedia(files: FileList | null) {
    if (!files) return
    const items: MediaItem[] = []
    for (const f of Array.from(files)) {
      const type = f.type.startsWith('video') ? 'video' : 'image'
      items.push({ id: `${Date.now()}-${f.name}`, url: URL.createObjectURL(f), type, name: f.name })
    }
    if (items.length) { setMedia(prev => [...prev, ...items]); setMediaShown(true) }
  }
  function removeMedia(id: string) {
    setMedia(prev => {
      const it = prev.find(m => m.id === id)
      if (it) URL.revokeObjectURL(it.url)
      return prev.filter(m => m.id !== id)
    })
  }
  function stepMedia(dir: 1 | -1) {
    setMedia(cur => {
      if (cur.length) { setMediaShown(true); setMediaIdx(i => (i + dir + cur.length) % cur.length) }
      return cur
    })
  }

  // Action discrète (déclenchée par P, un pad MIDI, etc.)
  function runAction(id: string) {
    if (id === 'preset-next') nextPreset()
    else if (id === 'preset-prev') prevPreset()
    else if (id === 'preset-random') randomPreset()
    else if (id === 'strobe-toggle') setStrobeOn(v => !v)
    else if (id === 'blackout') setBlackout(v => !v)
    else if (id === 'media-toggle') setMediaShown(v => !v)
    else if (id === 'media-next') stepMedia(1)
    else if (id === 'media-prev') stepMedia(-1)
  }

  // Callback MIDI maintenu à jour à chaque rendu (closures fraîches), appelé via
  // un manager créé une seule fois.
  const midiCbRef = useRef<(m: MidiMessage) => void>(() => {})
  midiCbRef.current = (m: MidiMessage) => {
    if (learning) {
      const binding = { kind: m.kind === 'cc' ? 'cc' as const : 'note' as const, data1: m.data1, channel: m.channel }
      setMidiMap(prev => ({ ...prev, [learning]: binding }))
      setLearning(null)
      return
    }
    for (const action of Object.keys(midiMap)) {
      const b = midiMap[action]
      if (!b || !matches(b, m)) continue
      if (action === 'strobe-hold') {
        if (m.kind === 'noteon') setStrobeHeld(true)
        else if (m.kind === 'noteoff') setStrobeHeld(false)
      } else if (action === 'media-opacity' && m.kind === 'cc') {
        setMediaOpacity(m.value / 127) // knob continu
        setMediaShown(true)
      } else if (m.kind === 'noteon' || (m.kind === 'cc' && m.value >= 64)) {
        runAction(action)
      }
    }
  }

  const midiRef = useRef<MidiManager | null>(null)
  useEffect(() => {
    const mgr = new MidiManager(m => midiCbRef.current(m))
    midiRef.current = mgr
    return () => mgr.destroy()
  }, [])
  async function enableMidi() {
    const ok = await midiRef.current?.enable()
    setMidiOn(!!ok)
    setMidiInputs(midiRef.current?.inputs ?? [])
  }
  function clearBinding(action: string) { setMidiMap(prev => ({ ...prev, [action]: undefined })) }

  // Raccourcis clavier (P = preset suivant). Réfs pour des closures fraîches.
  const actionRef = useRef(runAction); actionRef.current = runAction
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || typing(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'p') actionRef.current('preset-next')
      else if (k === 'b') actionRef.current('blackout')
      else if (k === 'm') actionRef.current('media-toggle')
      else if (k === 'n') actionRef.current(e.shiftKey ? 'media-prev' : 'media-next')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="studio" style={{ cursor: uiVisible ? 'default' : 'none' }}>
      <canvas ref={canvasRef} className="viz-canvas" />

      {/* Couche média (image / vidéo) — au-dessus du visualiseur, sous l'overlay */}
      {mediaShown && media[mediaIdx] && (
        media[mediaIdx].type === 'video' ? (
          <video key={media[mediaIdx].id} src={media[mediaIdx].url} autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', opacity: mediaOpacity }} />
        ) : (
          <img key={media[mediaIdx].id} src={media[mediaIdx].url} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', opacity: mediaOpacity }} />
        )
      )}

      <Overlay session={session} toggles={toggles} analyserRef={analyserRef} onBeat={() => { if (mode === 'beat') srcRef.current?.pulse?.(0.9) }} />

      {/* Stroboscope plein écran */}
      {strobeActive && (
        <div style={{
          position: 'absolute', inset: 0, background: '#fff', pointerEvents: 'none', zIndex: 5,
          animation: `strobeFlash ${(1 / Math.max(1, strobeHz)).toFixed(3)}s linear infinite`,
        }} />
      )}
      <style>{`@keyframes strobeFlash { 0%,48%{opacity:1} 50%,100%{opacity:0} }`}</style>

      {/* Blackout (au-dessus de tout, sous les contrôles) */}
      {blackout && <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, pointerEvents: 'none' }} />}

      <div className="toolbar" style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? 'auto' : 'none' }}>
        <button className="tool" onClick={nextPreset}>🎞️ Preset</button>
        {media.length > 0 && (
          <button className="tool" style={{ background: mediaShown ? '#a855f7' : undefined }} onClick={() => setMediaShown(v => !v)}>🖼️ Média</button>
        )}
        <button className="tool" style={{ background: blackout ? '#a855f7' : undefined }} onClick={() => setBlackout(v => !v)}>⬛ Blackout</button>
        <button className="tool" onClick={() => setShowPanel(p => !p)}>⚙️ Réglages</button>
        <button className="tool" onClick={() => window.tipson.toggleFullscreen()}>⛶ Plein écran</button>
        <button className="tool" onClick={onExit}>✕ Quitter</button>
      </div>

      {showPanel && (
        <Settings
          session={session}
          mode={mode} setMode={setMode}
          devices={devices} deviceId={deviceId} setDeviceId={setDeviceId}
          bpm={bpm} setBpm={setBpm}
          presets={presets} presetName={presetName} applyPreset={applyPreset}
          toggles={toggles} setToggles={setToggles}
          strobeOn={strobeOn} setStrobeOn={setStrobeOn} strobeHz={strobeHz} setStrobeHz={setStrobeHz}
          midiOn={midiOn} midiInputs={midiInputs} enableMidi={enableMidi}
          midiMap={midiMap} learning={learning} startLearn={setLearning} clearBinding={clearBinding}
          media={media} mediaIdx={mediaIdx} addMedia={addMedia} removeMedia={removeMedia} selectMedia={(i) => { setMediaIdx(i); setMediaShown(true) }}
          mediaOpacity={mediaOpacity} setMediaOpacity={setMediaOpacity}
          error={error}
        />
      )}
    </div>
  )
}
