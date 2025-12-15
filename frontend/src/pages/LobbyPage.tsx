import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useQuickMatch } from '../hooks/useQuickMatch'
import { apiFetch } from '../shared/api/client'
import { toTierLabel } from '../shared/utils/rating'

interface GameResult {
  id: number
  playerAId: number
  playerANickname: string
  playerBId: number
  playerBNickname: string
  scoreA: number
  scoreB: number
  matchType: 'NORMAL' | 'RANKED'
  ratingChangeA: number
  ratingChangeB: number
  ratingAfterA: number
  ratingAfterB: number
  roomId: string
  startedAt: string
  finishedAt: string
}

/**
 * [페이지] frontend/src/pages/LobbyPage.tsx
 * 설명:
 *   - v0.4.0 일반/랭크 큐를 구분해 입장 버튼을 제공하고 현재 레이팅을 노출한다.
 *   - 최근 경기 결과에서 랭크 여부와 점수 변동을 표시한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/frontend/v0.4.0-ranking-and-leaderboard-ui.md
 */
export function LobbyPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const normalQueue = useQuickMatch('normal', token)
  const rankedQueue = useQuickMatch('ranked', token)
  const [results, setResults] = useState<GameResult[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    apiFetch<GameResult[]>('/api/games', { method: 'GET' }, token)
      .then(setResults)
      .catch(() => setError('최근 경기 결과를 불러오지 못했습니다.'))
  }, [token])

  useEffect(() => {
    if (normalQueue.status === 'matched' && normalQueue.roomId) {
      navigate(`/game?roomId=${normalQueue.roomId}`)
      normalQueue.reset()
    }
  }, [normalQueue.status, normalQueue.roomId, normalQueue, navigate])

  useEffect(() => {
    if (rankedQueue.status === 'matched' && rankedQueue.roomId) {
      navigate(`/game?roomId=${rankedQueue.roomId}`)
      rankedQueue.reset()
    }
  }, [rankedQueue.status, rankedQueue.roomId, rankedQueue, navigate])

  const ratingSection = user ? (
    <section className="panel">
      <h2>내 랭크 정보</h2>
      <p>현재 레이팅: {user.rating}점</p>
      <p>티어: {toTierLabel(user.rating)}</p>
      <p className="hint">랭크 대전 승패에 따라 레이팅이 변동됩니다.</p>
    </section>
  ) : null

  const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`)

  return (
    <main className="page">
      {ratingSection}

      <section className="panel">
        <h2>일반전 매칭</h2>
        <p>{user ? `${user.nickname} 님으로 일반전을 시작합니다.` : '로그인 후 이용 가능합니다.'}</p>
        <button className="button" type="button" onClick={normalQueue.start} disabled={normalQueue.status === 'waiting'}>
          {normalQueue.status === 'waiting' ? '상대를 찾는 중...' : '일반전 빠른 대전'}
        </button>
        {normalQueue.message && <p className="hint">{normalQueue.message}</p>}
      </section>

      <section className="panel">
        <h2>랭크전 매칭</h2>
        <p>{user ? `${user.nickname} 님의 랭크전 레이팅을 반영합니다.` : '로그인 후 이용 가능합니다.'}</p>
        <button className="button" type="button" onClick={rankedQueue.start} disabled={rankedQueue.status === 'waiting'}>
          {rankedQueue.status === 'waiting' ? '랭크전 대기 중...' : '랭크전 시작'}
        </button>
        {rankedQueue.message && <p className="hint">{rankedQueue.message}</p>}
      </section>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>최근 경기 결과</h2>
        {results.length === 0 && <p>아직 기록된 경기가 없습니다.</p>}
        <ul className="list">
          {results.map((result) => (
            <li key={result.id} className="list-item">
              <div className="row">
                <strong>
                  {result.playerANickname}
                  {result.matchType === 'RANKED' && (
                    <span className="badge" aria-label="랭크전">랭크</span>
                  )}
                </strong>
                <span className="score">{result.scoreA}</span>
              </div>
              <div className="row">
                <strong>{result.playerBNickname}</strong>
                <span className="score">{result.scoreB}</span>
              </div>
              {result.matchType === 'RANKED' && (
                <div className="row">
                  <small>레이팅 변화: {formatDelta(result.ratingChangeA)} / {formatDelta(result.ratingChangeB)}</small>
                </div>
              )}
              <small>{new Date(result.finishedAt).toLocaleString('ko-KR')}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
