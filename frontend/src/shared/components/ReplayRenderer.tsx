import { useMemo, useRef } from 'react'
import { useRenderer } from '../../hooks/useRenderer'

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

  const easedProgress = useMemo(() => {
    const clamped = Math.max(0, Math.min(progress, 1))
    return Math.sqrt(clamped)
  }, [progress])

  const { rendererType } = useRenderer(canvasRef, { width, height, progress: easedProgress })

  return <canvas ref={canvasRef} width={width} height={height} data-renderer={rendererType} aria-label="replay-renderer" />
}
