import { useEffect, useRef } from 'react'

/**
 * [훅] frontend/src/hooks/usePerfAudit.ts
 * 설명:
 *   - PerformanceObserver로 Long Task/레이아웃 변경을 추적한다.
 *   - 재생 종료 시 FPS와 Reflow Count를 포함한 리포트를 콘솔에 출력한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export function usePerfAudit({
  active,
  reportOnStop,
  label,
}: {
  active: boolean
  reportOnStop: boolean
  label: string
}) {
  const metricsRef = useRef({
    startTime: 0,
    frames: 0,
    longTaskCount: 0,
    reflowCount: 0,
  })
  const animationRef = useRef<number | null>(null)
  const observerRef = useRef<PerformanceObserver | null>(null)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      const now = performance.now()
      metricsRef.current = {
        startTime: now,
        frames: 0,
        longTaskCount: 0,
        reflowCount: 0,
      }
      const loop = () => {
        metricsRef.current.frames += 1
        animationRef.current = requestAnimationFrame(loop)
      }
      loop()

      if ('PerformanceObserver' in window) {
        const supported = PerformanceObserver.supportedEntryTypes ?? []
        const entryTypes = ['longtask', 'layout-shift'].filter((type) => supported.includes(type))
        if (entryTypes.length > 0) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'longtask') {
                metricsRef.current.longTaskCount += 1
              }
              if (entry.entryType === 'layout-shift') {
                metricsRef.current.reflowCount += 1
              }
            }
          })
          observer.observe({ entryTypes })
          observerRef.current = observer
        }
      }
      wasActiveRef.current = true
      return
    }

    if (!active && wasActiveRef.current) {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
      observerRef.current?.disconnect()
      observerRef.current = null
      if (reportOnStop) {
        const now = performance.now()
        const elapsedMs = Math.max(1, now - metricsRef.current.startTime)
        const fps = metricsRef.current.frames / (elapsedMs / 1000)
        const message = `[Performance Report] ${label} | FPS: ${fps.toFixed(1)} | Reflow Count: ${metricsRef.current.reflowCount} | Long Task: ${metricsRef.current.longTaskCount}`
        console.info(message)
      }
      wasActiveRef.current = false
    }
  }, [active, label, reportOnStop])
}
