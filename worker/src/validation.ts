/**
 * [유틸] worker/src/validation.ts
 * 설명:
 *   - ffprobe 구조 검증과 트리비얼 프레임 감지를 수행한다.
 *   - v0.5.0 포트폴리오 트랙 안전장치 요구사항을 반영한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
export type ProbeStream = {
  codec_type?: string
  width?: number
  height?: number
}

export type ProbeOutput = {
  streams?: ProbeStream[]
  format?: { duration?: string }
}

export type ProbeValidationResult = {
  durationMs: number
  width: number
  height: number
}

/**
 * ffprobe 결과에 비디오 스트림이 존재하고, 길이와 해상도가 유효한지 확인한다.
 * 실패 시 error_code를 포함한 오류를 던진다.
 */
export function validateProbeOutput(probe: ProbeOutput): ProbeValidationResult {
  const streams = probe.streams ?? []
  const videoStreams = streams.filter((s) => s.codec_type === 'video')
  if (videoStreams.length === 0) {
    throw new Error('FFPROBE_INVALID_OUTPUT')
  }
  const first = videoStreams[0]
  if (!first.width || !first.height || first.width <= 0 || first.height <= 0) {
    throw new Error('FFPROBE_INVALID_OUTPUT')
  }
  const duration = probe.format?.duration ? Number(probe.format.duration) : 0
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('FFPROBE_INVALID_OUTPUT')
  }
  return {
    durationMs: Math.round(duration * 1000),
    width: first.width,
    height: first.height,
  }
}

/**
 * 서로 다른 시점의 프레임 해시가 동일하면 의미없는 영상으로 간주한다.
 */
export function assertNonTrivialFrames(firstHash: string, secondHash: string) {
  if (firstHash === secondHash) {
    throw new Error('EXPORT_TRIVIAL_FRAMES')
  }
}
