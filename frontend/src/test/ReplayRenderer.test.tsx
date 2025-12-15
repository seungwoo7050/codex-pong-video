import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReplayRenderer } from '../shared/components/ReplayRenderer'

/**
 * [테스트] frontend/src/test/ReplayRenderer.test.tsx
 * 설명:
 *   - WebGL 우선 경로와 Canvas2D 폴백이 data 속성에 반영되는지 확인한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */

describe('ReplayRenderer', () => {
  const original = HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = original
    vi.useRealTimers()
  })

  it('WebGL이 지원되면 webgl 경로를 선택한다', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
      if (type === 'webgl' || type === 'webgl2') {
        return {
          viewport: vi.fn(),
          clearColor: vi.fn(),
          clear: vi.fn(),
          COLOR_BUFFER_BIT: 0x4000,
        } as any
      }
      return null
    })
    render(<ReplayRenderer width={100} height={50} progress={0.5} />)
    vi.runOnlyPendingTimers()
    const canvas = screen.getByLabelText('replay-renderer')
    expect(canvas.getAttribute('data-renderer')).toBe('webgl')
  })

  it('WebGL이 없으면 Canvas2D 폴백을 사용한다', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
      if (type === '2d') {
        return {
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          fillStyle: '',
        } as any
      }
      return null
    })
    render(<ReplayRenderer width={100} height={50} progress={0.2} />)
    vi.runOnlyPendingTimers()
    const canvas = screen.getByLabelText('replay-renderer')
    expect(canvas.getAttribute('data-renderer')).toBe('canvas2d')
  })
})
