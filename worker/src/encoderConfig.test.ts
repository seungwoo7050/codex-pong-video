import { describe, expect, it } from 'vitest'
import { buildEncoderPlan, selectEncoderConfig } from './encoderConfig'

/**
 * [테스트] worker/src/encoderConfig.test.ts
 * 설명:
 *   - 하드웨어 가속 설정이 켜졌을 때 가용 목록에 맞춰 적절한 인코더를 선택하고, 미지원 시 폴백 메시지를 남기는지 검증한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */

describe('selectEncoderConfig', () => {
  it('CUDA 지원 시 nvenc를 선택한다', () => {
    const config = selectEncoderConfig(true, ['h264_nvenc', 'h264_vaapi'])
    expect(config.codec).toBe('h264_nvenc')
    expect(config.preArgs).toContain('cuda')
  })

  it('가속 미지원이면 libx264로 안전하게 폴백한다', () => {
    const config = selectEncoderConfig(true, [])
    expect(config.codec).toBe('libx264')
    expect(config.fallbackNote).toBe('HWACCEL_UNAVAILABLE')
  })

  it('가속 미사용 설정이면 기본 libx264를 사용한다', () => {
    const config = selectEncoderConfig(false, ['h264_nvenc'])
    expect(config.codec).toBe('libx264')
    expect(config.preArgs.length).toBe(0)
  })

  it('하드웨어 선호 시 하드웨어→소프트웨어 순으로 시도 계획을 만든다', () => {
    const plan = buildEncoderPlan(true, ['h264_vaapi'])
    expect(plan[0].codec).toBe('h264_vaapi')
    expect(plan[1].codec).toBe('libx264')
    expect(plan[1].fallbackNote).toBe('HWACCEL_HANDSHAKE_FAILED')
  })

  it('가속 미지원이면 즉시 HWACCEL_UNAVAILABLE 폴백만 사용한다', () => {
    const plan = buildEncoderPlan(true, [])
    expect(plan).toHaveLength(1)
    expect(plan[0].codec).toBe('libx264')
    expect(plan[0].fallbackNote).toBe('HWACCEL_UNAVAILABLE')
  })
})
