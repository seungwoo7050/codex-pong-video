/**
 * [상수] frontend/src/constants.ts
 * 설명:
 *   - 프런트엔드에서 사용하는 API/WS 엔드포인트와 오류 코드를 정의한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080'
export const WS_BASE_URL = import.meta.env.VITE_BACKEND_WS ?? 'ws://localhost:8080'

export const ERROR_CODES = {
  FAILED_NATIVE_VALIDATION: 'FAILED_NATIVE_VALIDATION',
  FFMPEG_ENCODE_ERROR: 'FFMPEG_ENCODE_ERROR',
  GPU_CONTEXT_LOST: 'GPU_CONTEXT_LOST',
} as const
