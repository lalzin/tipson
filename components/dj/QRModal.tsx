'use client'
import { useEffect, useRef } from 'react'
import { X, Download } from 'lucide-react'
import type { Session } from '@/types'
import { formatPrice } from '@/lib/utils'

interface Props {
  session: Session
  onClose: () => void
}

// QR code généré côté client via canvas — pas de lib externe
function drawQRPlaceholder(canvas: HTMLCanvasElement, url: string) {
  // On utilise l'API native du browser via un img tag avec QR API publique
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Fond
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // QR centré avec padding
    const padding = 20
    ctx.drawImage(img, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2)
  }
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&bgcolor=0a0a0a&color=ffffff&qzone=1&data=${encodeURIComponent(url)}`
}

export default function QRModal({ session, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/join?code=${session.code}`
    : `https://tipson.app/join?code=${session.code}`

  useEffect(() => {
    if (canvasRef.current) {
      drawQRPlaceholder(canvasRef.current, url)
    }
  }, [url])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `tipson-${session.code}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xs bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">{session.name}</h2>
            <p className="text-gray-500 text-xs mt-0.5">Scannez pour rejoindre</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Canvas */}
        <div className="flex justify-center">
          <div className="bg-gray-950 rounded-2xl p-1 border border-white/10">
            <canvas ref={canvasRef} width={260} height={260} className="rounded-xl" />
          </div>
        </div>

        {/* Code */}
        <div className="text-center space-y-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Code soirée</p>
          <p className="font-black text-4xl tracking-[0.3em] text-white font-mono">{session.code}</p>
        </div>

        {/* Prix */}
        {session.session_type === 'karaoke' ? (
          <div className="flex gap-3">
            <div className="flex-1 bg-pink-500/10 border border-pink-500/20 rounded-xl p-2.5 text-center">
              <p className="text-pink-300 font-bold">{formatPrice(session.price_karaoke)}</p>
              <p className="text-pink-400/60 text-xs">File normale</p>
            </div>
            {(session.price_karaoke_priority ?? 0) > 0 && (
              <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 text-center">
                <p className="text-yellow-300 font-bold">{formatPrice(session.price_karaoke_priority)}</p>
                <p className="text-yellow-400/60 text-xs">Passer devant</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
              <p className="text-blue-300 font-bold">{formatPrice(session.price_normal)}</p>
              <p className="text-blue-400/60 text-xs">Dans la playlist</p>
            </div>
            <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl p-2.5 text-center">
              <p className="text-purple-300 font-bold">{formatPrice(session.price_priority)}</p>
              <p className="text-purple-400/60 text-xs">La chanson maint.</p>
            </div>
          </div>
        )}

        <button
          onClick={download}
          className="w-full py-3 rounded-2xl glass hover:bg-white/8 text-gray-300 font-medium flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          Télécharger le QR code
        </button>
      </div>
    </div>
  )
}
