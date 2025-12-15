import { assertNonTrivialFrames, validateProbeOutput } from './validation'
import { describe, expect, it } from 'vitest'

/**
 * [테스트] worker/src/validation.test.ts
 * 설명:
 *   - ffprobe 검증과 트리비얼 프레임 가드를 검증한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
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

describe('assertNonTrivialFrames', () => {
  it('서로 다른 해시이면 통과한다', () => {
    expect(() => assertNonTrivialFrames('hash-a', 'hash-b')).not.toThrow()
  })

  it('동일 해시면 EXPORT_TRIVIAL_FRAMES 에러', () => {
    expect(() => assertNonTrivialFrames('same', 'same')).toThrowError('EXPORT_TRIVIAL_FRAMES')
  })
})
