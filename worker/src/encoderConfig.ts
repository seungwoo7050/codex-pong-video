/**
 * [유틸] worker/src/encoderConfig.ts
 * 설명:
 *   - 하드웨어 가속 여부와 지원 목록에 따라 ffmpeg 인코더 인자를 결정한다.
 *   - 미지원 시에는 안전하게 소프트웨어 인코더(libx264)로 폴백한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export type EncoderConfig = {
  preArgs: string[]
  codec: string
  fallbackNote?: string
}

export function selectEncoderConfig(preferHw: boolean, accelerators: string[]): EncoderConfig {
  if (!preferHw) {
    return { preArgs: [], codec: 'libx264' }
  }
  const lower = accelerators.map((v) => v.toLowerCase())
  if (lower.includes('cuda')) {
    return { preArgs: ['-hwaccel', 'cuda'], codec: 'h264_nvenc' }
  }
  if (lower.includes('vaapi')) {
    return { preArgs: ['-hwaccel', 'vaapi'], codec: 'h264_vaapi' }
  }
  if (lower.includes('qsv')) {
    return { preArgs: ['-hwaccel', 'qsv'], codec: 'h264_qsv' }
  }
  return { preArgs: [], codec: 'libx264', fallbackNote: 'HWACCEL_UNAVAILABLE' }
}
