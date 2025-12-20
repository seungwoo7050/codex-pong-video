import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { useAudioCue } from '../hooks/useAudioCue'

/**
 * [테스트] frontend/src/test/AudioCue.test.tsx
 * 설명:
 *   - WebAudio 큐가 준비되면 완료 알림음을 큐잉하고 오실레이터가 실행되는지 확인한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */

class FakeOscillator {
  public type: OscillatorType = 'sine'
  public frequency = { value: 0 }
  public onended: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => {
    this.onended?.()
  })
  connect = vi.fn()
}

class FakeGain {
  public gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
}

class FakeAudioContext {
  static lastInstance: FakeAudioContext | null = null
  public currentTime = 0
  public destination: any = {}
  public state: AudioContextState = 'suspended'
  constructor() {
    FakeAudioContext.lastInstance = this
  }
  createOscillator = vi.fn(() => new FakeOscillator())
  createGain = vi.fn(() => new FakeGain())
  close = vi.fn().mockResolvedValue(undefined)
  resume = vi.fn().mockImplementation(() => {
    this.state = 'running'
    return Promise.resolve()
  })
}

describe('useAudioCue', () => {
  const original = (global as any).AudioContext

  beforeEach(() => {
    ;(global as any).AudioContext = FakeAudioContext as any
  })

  afterEach(() => {
    ;(global as any).AudioContext = original
  })

  it('준비 후 enqueueComplete 호출 시 오실레이터를 실행한다', async () => {
    const Test = () => {
      const { ready, enqueueComplete } = useAudioCue()
      useEffect(() => {
        if (ready) {
          enqueueComplete()
        }
      }, [ready, enqueueComplete])
      return null
    }
    render(<Test />)
    const ctxInstance = FakeAudioContext.lastInstance
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    await waitFor(() => {
      expect(ctxInstance?.createOscillator).toHaveBeenCalled()
    })
  })
})
