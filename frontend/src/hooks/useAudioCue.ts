import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * [훅] frontend/src/hooks/useAudioCue.ts
 * 설명:
 *   - WebAudio 기반 단일 큐를 운용해 내보내기 완료 시 효과음을 재생한다.
 *   - 사용자 제스처 이후 활성화된 AudioContext를 재사용하고, 큐가 중복 호출되어도 소리를 순차 재생한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export function useAudioCue() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [ready, setReady] = useState(false)
  const queueRef = useRef<number[]>([])
  const playingRef = useRef(false)

  useEffect(() => {
    const AudioCtor: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtor) {
      return
    }
    const context = new AudioCtor()
    ctxRef.current = context
    setReady(true)
    return () => {
      context.close().catch(() => {})
    }
  }, [])

  const playNext = useCallback(async () => {
    if (playingRef.current || !ctxRef.current) return
    const ts = queueRef.current.shift()
    if (ts === undefined) {
      return
    }
    playingRef.current = true
    const ctx = ctxRef.current
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.9)
    oscillator.onended = () => {
      playingRef.current = false
      void playNext()
    }
  }, [])

  const enqueueComplete = useCallback(() => {
    if (!ctxRef.current) {
      return
    }
    queueRef.current.push(Date.now())
    void playNext()
  }, [playNext])

  return { ready, enqueueComplete }
}
