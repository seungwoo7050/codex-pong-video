import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useGameSocket } from '../hooks/useGameSocket'
import { GameSnapshot } from '../shared/types/game'

/**
 * [페이지] frontend/src/pages/GamePage.tsx
 * 설명:
 *   - WebSocket으로 전달받은 게임 스냅샷을 렌더링하고 간단한 패들 입력 버튼을 제공한다.
 *   - v0.4.0에서는 랭크/일반 구분과 레이팅 변동 메시지를 표시한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/frontend/v0.4.0-ranking-and-leaderboard-ui.md
 *   - design/realtime/v0.4.0-ranking-aware-events.md
 */
export function GamePage() {
  const { token, user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const roomId = params.get('roomId')

  const { connected, error, snapshot, sendInput, matchType, ratingChange } = useGameSocket(roomId, token)

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby')
    }
  }, [roomId, navigate])

  const ratingMessage = useMemo(() => {
    if (!user || !ratingChange || matchType !== 'RANKED') return ''
    if (ratingChange.winnerId === user.id) {
      return `랭크전 승리! 레이팅 +${ratingChange.winnerDelta}`
    }
    if (ratingChange.loserId === user.id) {
      return `랭크전 패배... 레이팅 ${ratingChange.loserDelta}`
    }
    return '랭크전 결과가 반영되었습니다.'
  }, [matchType, ratingChange, user])

  const renderCourt = (state: GameSnapshot) => {
    const scale = 0.6
    const courtWidth = 800 * scale
    const courtHeight = 480 * scale
    const paddleHeight = 80 * scale
    const paddleWidth = 12
    const ballSize = 12

    return (
      <div className="court" style={{ width: courtWidth, height: courtHeight }}>
        <div
          className="paddle left"
          style={{ height: paddleHeight, width: paddleWidth, top: state.leftPaddleY * scale }}
        />
        <div
          className="paddle right"
          style={{
            height: paddleHeight,
            width: paddleWidth,
            top: state.rightPaddleY * scale,
            right: 0,
          }}
        />
        <div
          className="ball"
          style={{ width: ballSize, height: ballSize, left: state.ballX * scale, top: state.ballY * scale }}
        />
      </div>
    )
  }

  return (
    <main className="page">
      <section className="panel">
        <h2>실시간 경기</h2>
        <p>
          방 번호: {roomId ?? '없음'} / 연결 상태: {connected ? '연결됨' : '대기 중'} / 타입:{' '}
          {matchType === 'RANKED' ? '랭크' : '일반'}
        </p>
        {error && <p className="error">{error}</p>}
        {snapshot ? (
          <div className="game-area">
            {renderCourt(snapshot)}
            <div className="scoreboard">
              <div className="score">왼쪽: {snapshot.leftScore}</div>
              <div className="score">오른쪽: {snapshot.rightScore}</div>
              <div className="score">목표: {snapshot.targetScore}</div>
            </div>
            <div className="controls">
              <button type="button" onClick={() => sendInput('UP')}>
                위로
              </button>
              <button type="button" onClick={() => sendInput('STAY')}>
                정지
              </button>
              <button type="button" onClick={() => sendInput('DOWN')}>
                아래로
              </button>
            </div>
            {snapshot.finished && <p className="hint">경기가 종료되었습니다.</p>}
            {ratingMessage && <p className="success">{ratingMessage}</p>}
          </div>
        ) : (
          <p>게임 상태를 불러오는 중...</p>
        )}
      </section>
    </main>
  )
}
