import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * [컴포넌트] frontend/src/shared/components/ReplayRenderer.tsx
 * 설명:
 *   - WebGL을 우선 시도하여 리플레이 진행률에 따라 색상/텍스트를 그리며, 실패 시 Canvas2D로 자동 폴백한다.
 *   - 렌더러 종류를 data 속성으로 노출해 테스트와 성능 점검 시 확인 가능하도록 한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export function ReplayRenderer({ width, height, progress }: { width: number; height: number; progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [renderer, setRenderer] = useState<'webgl' | 'canvas2d'>('canvas2d')

  const easedProgress = useMemo(() => {
    const clamped = Math.max(0, Math.min(progress, 1))
    return Math.sqrt(clamped)
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gl: WebGLRenderingContext | null = null
    try {
      gl = (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
        (canvas.getContext('webgl') as WebGLRenderingContext | null)
    } catch (err) {
      gl = null
    }
    if (gl) {
      setRenderer('webgl')
      const renderGl = () => {
        const r = 0.1 + 0.7 * easedProgress
        const g = 0.3 + 0.5 * (1 - easedProgress)
        const b = 0.6
        ;(gl as WebGLRenderingContext).viewport(0, 0, width, height)
        ;(gl as WebGLRenderingContext).clearColor(r, g, b, 1)
        ;(gl as WebGLRenderingContext).clear(gl.COLOR_BUFFER_BIT)
        requestAnimationFrame(renderGl)
      }
      renderGl()
      return
    }
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch (err) {
      ctx = null
    }
    if (ctx) {
      setRenderer('canvas2d')
      const render2d = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = `rgba(${Math.round(30 + 200 * easedProgress)}, 80, 150, 0.8)`
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px sans-serif'
        ctx.fillText(`Canvas2D fallback ${Math.round(easedProgress * 100)}%`, 24, height / 2)
        requestAnimationFrame(render2d)
      }
      render2d()
    }
  }, [easedProgress, height, width])

  return <canvas ref={canvasRef} width={width} height={height} data-renderer={renderer} aria-label="replay-renderer" />
}
