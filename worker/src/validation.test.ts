import { assertNonTrivialDiffScore, validateProbeOutput } from './validation'
import { describe, expect, it } from 'vitest'

/**
 * [테스트] worker/src/validation.test.ts
 * 설명:
 *   - ffprobe 검증과 트리비얼 프레임 가드를 검증한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
describe('validateProbeOutput', () => {
  it('유효한 비디오 스트림과 duration을 반환한다', () => {
    const result = validateProbeOutput({
      streams: [{ codec_type: 'video', width: 1280, height: 720 }],
      format: { duration: '1.23' },
    })
    expect(result.durationMs).toBe(1230)
    expect(result.width).toBe(1280)
  })

  it('비디오 스트림이 없으면 에러코드를 던진다', () => {
    expect(() => validateProbeOutput({ streams: [], format: { duration: '1' } })).toThrowError(
      'FFPROBE_INVALID_OUTPUT',
    )
  })
})

describe('assertNonTrivialDiffScore', () => {
  it('임계값보다 크면 통과한다', () => {
    expect(() => assertNonTrivialDiffScore(0.01, 0.001)).not.toThrow()
  })

  it('임계값 이하면 FAILED_NATIVE_VALIDATION 에러', () => {
    expect(() => assertNonTrivialDiffScore(0.0001, 0.001)).toThrowError('FAILED_NATIVE_VALIDATION')
  })
})
