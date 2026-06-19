import butterchurn from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'

// Wrapper autour de Butterchurn (moteur Milkdrop/projectM en WebGL).
// Alimenté par un nœud Web Audio (entrée ligne, micro, ou pulse "beat seul").
export class Visualizer {
  private ctx: AudioContext
  private viz: any
  private raf = 0
  private presets: Record<string, any>
  private names: string[]
  private current = 0
  private destroyed = false

  constructor(canvas: HTMLCanvasElement, ctx: AudioContext) {
    this.ctx = ctx
    this.viz = butterchurn.createVisualizer(ctx, canvas, {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    this.presets = butterchurnPresets.getPresets()
    this.names = Object.keys(this.presets)
  }

  get presetNames(): string[] { return this.names }
  get currentPresetName(): string { return this.names[this.current] ?? '' }

  connect(node: AudioNode) { this.viz.connectAudio(node) }

  loadPreset(name: string, blendSeconds = 2.0) {
    const idx = this.names.indexOf(name)
    if (idx >= 0) { this.current = idx; this.viz.loadPreset(this.presets[name], blendSeconds) }
  }

  loadRandom(blendSeconds = 2.7) {
    this.current = Math.floor(Math.random() * this.names.length)
    this.viz.loadPreset(this.presets[this.names[this.current]], blendSeconds)
  }

  next(blend = 2.7) { this.current = (this.current + 1) % this.names.length; this.viz.loadPreset(this.presets[this.names[this.current]], blend) }

  setSize(w: number, h: number) { this.viz.setRendererSize(w, h) }

  start() {
    const loop = () => {
      if (this.destroyed) return
      this.viz.render()
      this.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
  }
}
