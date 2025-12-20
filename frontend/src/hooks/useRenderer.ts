import { useEffect, useRef, useState, type RefObject } from 'react'
import { ERROR_CODES } from '../constants'

/**
 * [훅] frontend/src/hooks/useRenderer.ts
 * 설명:
 *   - WebGL 우선 경로와 Canvas2D 폴백을 전략 패턴으로 캡슐화한다.
 *   - WebGL 컨텍스트 소실 시 GPU_CONTEXT_LOST 코드로 전환을 기록한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export type RendererType = 'webgl' | 'canvas2d'

type RendererStrategy = {
  type: RendererType
  render: (progress: number) => void
  dispose: () => void
}

type RendererOptions = {
  canvas: HTMLCanvasElement
  width: number
  height: number
  onContextLost: () => void
  onContextRestored?: () => void
}

function createWebglStrategy(options: RendererOptions): RendererStrategy | null {
  const { canvas, width, height, onContextLost, onContextRestored } = options
  let gl: WebGLRenderingContext | null = null
  try {
    gl = (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
  } catch (err) {
    gl = null
  }
  if (!gl) {
    return null
  }
  const handleContextLost = (event: Event) => {
    event.preventDefault()
    onContextLost()
  }
  const handleContextRestored = () => {
    onContextRestored?.()
  }
  canvas.addEventListener('webglcontextlost', handleContextLost)
  canvas.addEventListener('webglcontextrestored', handleContextRestored)
  return {
    type: 'webgl',
    render: (progress: number) => {
      const r = 0.1 + 0.7 * progress
      const g = 0.3 + 0.5 * (1 - progress)
      const b = 0.6
      gl?.viewport(0, 0, width, height)
      gl?.clearColor(r, g, b, 1)
      gl?.clear(gl.COLOR_BUFFER_BIT)
    },
    dispose: () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    },
  }
}

function createCanvas2dStrategy(options: RendererOptions): RendererStrategy {
  const { canvas, width, height } = options
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch (err) {
    ctx = null
  }
  if (!ctx) {
    throw new Error('Canvas2D 컨텍스트를 생성할 수 없습니다.')
  }
  return {
    type: 'canvas2d',
    render: (progress: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = `rgba(${Math.round(30 + 200 * progress)}, 80, 150, 0.8)`
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px sans-serif'
      ctx.fillText(`Canvas2D fallback ${Math.round(progress * 100)}%`, 24, height / 2)
    },
    dispose: () => {},
  }
}

export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  { width, height, progress }: { width: number; height: number; progress: number },
) {
  const [rendererType, setRendererType] = useState<RendererType>('canvas2d')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const progressRef = useRef(progress)
  const animationRef = useRef<number | null>(null)
  const strategyRef = useRef<RendererStrategy | null>(null)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let recoveryTimer: ReturnType<typeof setTimeout> | null = null

    const stopLoop = () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      strategyRef.current?.dispose()
    }

    const startLoop = (strategy: RendererStrategy) => {
      strategyRef.current = strategy
      setRendererType(strategy.type)
      const loop = () => {
        strategyRef.current?.render(progressRef.current)
        animationRef.current = requestAnimationFrame(loop)
      }
      loop()
    }

    const handleContextRestored = () => {
      const recovered = createWebglStrategy({ canvas, width, height, onContextLost: handleContextLost, onContextRestored: handleContextRestored })
      if (!recovered) {
        return
      }
      stopLoop()
      startLoop(recovered)
    }

    const handleContextLost = () => {
      setErrorCode(ERROR_CODES.GPU_CONTEXT_LOST)
      stopLoop()
      startLoop(
        createCanvas2dStrategy({
          canvas,
          width,
          height,
          onContextLost: () => {},
        }),
      )
      if (recoveryTimer) {
        clearTimeout(recoveryTimer)
      }
      recoveryTimer = setTimeout(() => {
        handleContextRestored()
      }, 2000)
    }

    const webgl = createWebglStrategy({
      canvas,
      width,
      height,
      onContextLost: handleContextLost,
      onContextRestored: handleContextRestored,
    })
    const initialStrategy = webgl ?? createCanvas2dStrategy({ canvas, width, height, onContextLost: handleContextLost })
    startLoop(initialStrategy)

    return () => {
      if (recoveryTimer) {
        clearTimeout(recoveryTimer)
      }
      stopLoop()
    }
  }, [canvasRef, height, width])

  return { rendererType, errorCode }
}
