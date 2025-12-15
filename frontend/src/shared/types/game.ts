/**
 * [타입] frontend/src/shared/types/game.ts
 * 설명:
 *   - v0.4.0 랭크/일반 구분과 레이팅 변동 정보를 포함하는 실시간 게임 타입 정의다.
 * 관련 설계문서:
 *   - design/frontend/v0.4.0-ranking-and-leaderboard-ui.md
 *   - design/realtime/v0.4.0-ranking-aware-events.md
 */
export interface GameSnapshot {
  roomId: string
  ballX: number
  ballY: number
  ballVelocityX: number
  ballVelocityY: number
  leftPaddleY: number
  rightPaddleY: number
  leftScore: number
  rightScore: number
  targetScore: number
  finished: boolean
}

export interface GameServerMessage {
  type: 'READY' | 'STATE' | 'FINISHED'
  snapshot: GameSnapshot
  matchType: 'NORMAL' | 'RANKED'
  ratingChange?: RatingChange | null
}

export interface RatingChange {
  winnerId: number | null
  winnerDelta: number
  loserId: number | null
  loserDelta: number
}
