import { useEffect, useRef, useState } from 'react'
import type { StudioSession } from '../lib/session'
import { Visualizer } from '../visual/butterchurn'
import { type AudioMode, type AudioDevice, type AudioSource, listInputDevices, createInputSource, createBeatSource } from '../visual/audio'
import Overlay from './Overlay'
import Settings, { type OverlayToggles } from './Settings'

const DEFAULT_TOGGLES: OverlayToggles = { messages: true, track: true, emojis: true, votes: true, code: true }

export default function Studio({ session, onExit }: { session: StudioSession; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vizRef = useRef<Visualizer | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioSource | null>(null)

  const [mode, setMode] = useState<AudioMode>('mic')
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [bpm, setBpm] = useState(128)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<string[]>([])
  const [toggles, setToggles] = useState<OverlayToggles>(DEFAULT_TOGGLES)
  const [showPanel, setShowPanel] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [error, setError] = useState('')

  // Init du visualiseur (canvas plein écran)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = new AudioContext()
    ctxRef.current = ctx
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

  // Auto-masquage des contrôles (rendu "écran")
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reveal = () => { setControlsVisible(true); clearTimeout(t); t = setTimeout(() => setControlsVisible(false), 3000) }
    reveal()
    window.addEventListener('mousemove', reveal)
    return () => { clearTimeout(t); window.removeEventListener('mousemove', reveal) }
  }, [])

  function applyPreset(name: string) { vizRef.current?.loadPreset(name); setPresetName(name) }
  function nextPreset() { vizRef.current?.next(); setPresetName(vizRef.current?.currentPresetName ?? '') }

  return (
    <div className="studio" style={{ cursor: controlsVisible ? 'default' : 'none' }}>
      <canvas ref={canvasRef} className="viz-canvas" />

      <Overlay session={session} toggles={toggles} onBeat={() => { if (mode === 'beat') srcRef.current?.pulse?.(0.9) }} />

      <div className="toolbar" style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}>
        <button className="tool" onClick={nextPreset}>🎞️ Preset</button>
        <button className="tool" onClick={() => setShowPanel(p => !p)}>⚙️ Réglages</button>
        <button className="tool" onClick={() => window.tipson.toggleFullscreen()}>⛶ Plein écran</button>
        <button className="tool" onClick={onExit}>✕ Quitter</button>
      </div>

      {showPanel && controlsVisible && (
        <Settings
          session={session}
          mode={mode} setMode={setMode}
          devices={devices} deviceId={deviceId} setDeviceId={setDeviceId}
          bpm={bpm} setBpm={setBpm}
          presets={presets} presetName={presetName} applyPreset={applyPreset}
          toggles={toggles} setToggles={setToggles}
          error={error}
        />
      )}
    </div>
  )
}
