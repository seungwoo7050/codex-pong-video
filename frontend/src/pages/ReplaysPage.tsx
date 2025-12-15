import { useEffect, useMemo, useState } from 'react'

/**
 * [페이지] frontend/src/pages/ReplaysPage.tsx
 * 설명:
 *   - 리플레이 목록을 노출하고 기본 재생/일시정지/구간 이동/재생 속도 제어를 제공한다.
 *   - v0.5.0 내보내기 버튼으로 작업 진행률과 완료 링크를 UI에서 확인한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
export function ReplaysPage() {
  const replays = useMemo(
    () => [
      { id: 1, title: '샘플 리플레이', durationMillis: 120000 },
      { id: 2, title: '연습 경기', durationMillis: 90000 },
    ],
    [],
  )
  const [selectedId, setSelectedId] = useState(1)
  const [isPlaying, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [exportProgress, setExportProgress] = useState(0)
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)

  const activeReplay = replays.find((r) => r.id === selectedId) ?? replays[0]

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setPosition((prev) => {
        const next = prev + 1000 * speed
        if (activeReplay && next > activeReplay.durationMillis) {
          setPlaying(false)
          return activeReplay.durationMillis
        }
        return next
      })
    }, 500)
    return () => clearInterval(timer)
  }, [isPlaying, speed, activeReplay])

  useEffect(() => {
    if (jobStatus !== 'running') return
    const timer = setInterval(() => {
      setExportProgress((prev) => {
        const next = prev + 20
        if (next >= 100) {
          setJobStatus('completed')
          return 100
        }
        return next
      })
    }, 300)
    return () => clearInterval(timer)
  }, [jobStatus])

  const triggerExport = () => {
    setError(null)
    setExportProgress(0)
    setJobStatus('running')
  }

  const progressLabel = useMemo(() => {
    switch (jobStatus) {
      case 'running':
        return `진행률 ${exportProgress}%`
      case 'completed':
        return '완료! 다운로드 링크 준비됨'
      case 'failed':
        return `실패: ${error ?? ''}`
      default:
        return '대기 중'
    }
  }, [jobStatus, exportProgress, error])

  return (
    <div className="replay-page">
      <h2>리플레이</h2>
      <div className="replay-layout">
        <aside>
          <ul>
            {replays.map((replay) => (
              <li key={replay.id}>
                <button
                  className={selectedId === replay.id ? 'active' : ''}
                  onClick={() => {
                    setSelectedId(replay.id)
                    setPosition(0)
                  }}
                >
                  {replay.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="viewer">
          <div className="controls">
            <button onClick={() => setPlaying((prev) => !prev)}>{isPlaying ? '일시정지' : '재생'}</button>
            <label>
              위치(ms)
              <input
                aria-label="seek-bar"
                type="range"
                min={0}
                max={activeReplay?.durationMillis ?? 0}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
            </label>
            <label>
              배속
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>
            </label>
          </div>
          <div className="export-panel">
            <button onClick={triggerExport} disabled={jobStatus === 'running'}>
              내보내기
            </button>
            <div aria-label="export-progress">{progressLabel}</div>
            {jobStatus === 'completed' && <a href="#">다운로드</a>}
            {jobStatus === 'failed' && <p className="error">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
