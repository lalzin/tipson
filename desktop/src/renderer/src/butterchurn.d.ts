// Déclarations ambient pour Butterchurn / projectM (pas de types officiels).
declare module 'butterchurn' {
  const butterchurn: {
    createVisualizer(
      ctx: AudioContext,
      canvas: HTMLCanvasElement,
      opts: { width: number; height: number; pixelRatio?: number },
    ): {
      connectAudio(node: AudioNode): void
      loadPreset(preset: unknown, blendTime: number): void
      setRendererSize(w: number, h: number): void
      render(): void
    }
  }
  export default butterchurn
}
declare module 'butterchurn-presets' {
  const presets: { getPresets(): Record<string, unknown> }
  export default presets
}
