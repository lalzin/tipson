import { useEffect, useId, useRef } from 'react'

// Logo TIPSON (monogramme TS) réactif : la couleur défile et pulse au rythme
// du son capté par l'analyseur, comme l'animation du visualiseur.
const T_PATH = 'M250 2597 l0 -244 173 -6 c94 -4 219 -7 277 -7 166 0 176 -8 131 -98 -159 -316 -161 -680 -4 -984 142 -276 417 -489 701 -544 46 -9 140 -14 253 -14 159 0 184 2 218 20 79 40 116 112 109 211 -5 73 -44 133 -108 169 -41 22 -60 25 -200 31 -185 7 -252 25 -361 98 -128 84 -206 185 -256 328 -23 68 -27 93 -27 193 0 98 4 126 26 188 55 152 148 267 274 338 133 75 134 75 729 77 l530 2 0 240 0 240 -1232 3 -1233 2 0 -243z'
const S_PATH = 'M1695 1931 c-83 -38 -125 -106 -125 -199 0 -75 31 -136 89 -177 41 -29 46 -30 199 -37 170 -7 230 -22 347 -80 77 -39 200 -162 242 -243 175 -334 16 -731 -342 -853 l-80 -27 -512 -3 -513 -3 0 -155 0 -154 723 0 722 0 58 38 c312 208 497 598 459 965 -40 372 -252 677 -587 844 -154 77 -279 103 -494 103 -121 0 -153 -4 -186 -19z'

export default function ReactiveLogo({ analyserRef, size = 76 }: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  size?: number
}) {
  const gid = useId().replace(/:/g, '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const stop1 = useRef<SVGStopElement>(null)
  const stop2 = useRef<SVGStopElement>(null)
  const rectRef = useRef<SVGRectElement>(null)

  useEffect(() => {
    let raf = 0
    let hue = Math.random() * 360
    let smooth = 0
    const buf = new Uint8Array(128)
    const loop = () => {
      const an = analyserRef.current
      let level = 0
      if (an) {
        const arr = buf.length >= an.frequencyBinCount ? buf : new Uint8Array(an.frequencyBinCount)
        an.getByteFrequencyData(arr)
        // Pondéré sur les graves (kick/basse) pour suivre le rythme.
        const n = Math.min(28, arr.length)
        let s = 0
        for (let i = 0; i < n; i++) s += arr[i]
        level = s / (n * 255)
      }
      smooth += (level - smooth) * 0.25
      hue = (hue + 0.5 + smooth * 5) % 360
      const c1 = `hsl(${hue.toFixed(0)}, 85%, 58%)`
      const c2 = `hsl(${((hue + 55) % 360).toFixed(0)}, 85%, 52%)`
      stop1.current?.setAttribute('stop-color', c1)
      stop2.current?.setAttribute('stop-color', c2)
      rectRef.current?.setAttribute('stroke', c2)
      if (wrapRef.current) {
        const sc = 1 + smooth * 0.32
        wrapRef.current.style.transform = `scale(${sc.toFixed(3)})`
        wrapRef.current.style.filter = `drop-shadow(0 0 ${(6 + smooth * 34).toFixed(1)}px ${c1})`
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [analyserRef])

  return (
    <div ref={wrapRef} style={{ transformOrigin: 'center', willChange: 'transform, filter' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="TIPSON">
        <defs>
          <linearGradient id={`rl-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop ref={stop1} offset="0%" stopColor="#9333ea" />
            <stop ref={stop2} offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <rect ref={rectRef} x="2" y="2" width="96" height="96" rx="22" fill={`url(#rl-${gid})`} strokeWidth="2" />
        <g transform="translate(50 50) scale(0.2183) translate(-135.83 -142.00)" fill="#ffffff">
          <g transform="translate(-25 284.007873) scale(0.1 -0.1)" stroke="none">
            <path d={T_PATH} />
            <path d={S_PATH} />
          </g>
        </g>
      </svg>
    </div>
  )
}
