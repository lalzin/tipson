'use client'
import { useRef, useEffect, useState } from 'react'

interface Props {
  text: string
  className?: string
}

export default function MarqueeText({ text, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    function check() {
      if (!containerRef.current || !textRef.current) return
      const containerW = containerRef.current.offsetWidth
      const textW = textRef.current.scrollWidth
      const overflows = textW > containerW + 2
      setOverflow(overflows)
      if (overflows) {
        const offset = -(textW - containerW + 8)
        containerRef.current.style.setProperty('--marquee-offset', `${offset}px`)
      }
    }
    check()
    const ro = new ResizeObserver(check)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={`marquee-container ${className}`}>
      <span ref={textRef} className={overflow ? 'marquee-text' : 'marquee-static'}>
        {text}
      </span>
    </div>
  )
}
