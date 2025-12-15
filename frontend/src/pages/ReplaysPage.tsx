import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../shared/api/client'
import { API_BASE_URL, WS_BASE_URL } from '../constants'
import { useAuth } from '../features/auth/AuthProvider'
import { ReplayRenderer } from '../shared/components/ReplayRenderer'
import { useAudioCue } from '../hooks/useAudioCue'

/**
 * [페이지] frontend/src/pages/ReplaysPage.tsx
 * 설명:
 *   - 리플레이 목록을 실제 API에서 불러오고 재생 컨트롤과 내보내기 요청을 제공한다.
 *   - /ws/jobs WebSocket과 REST 폴백을 통해 진행률/완료/실패 이벤트를 반영한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
type ReplaySummary = {
  id: number
  ownerId: number
  title: string
  durationMillis: number
  createdAt: string
}

type JobResponse = {
  schemaVersion: string
  id: string
  replayId: number
  type: string
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  progress: number
  error_code?: string | null
  error_message?: string | null
}

export function ReplaysPage() {
  const { token } = useAuth()
  const [replays, setReplays] = useState<ReplaySummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isPlaying, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [jobId, setJobId] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const { enqueueComplete } = useAudioCue()

  const activeReplay = useMemo(() => replays.find((r) => r.id === selectedId) ?? replays[0], [replays, selectedId])

  const loadReplays = useCallback(async () => {
    if (!token) return
    const response = await apiFetch<{ items: ReplaySummary[] }>('/api/replays', {}, token)
    setReplays(response.items)
    if (response.items.length > 0 && selectedId === null) {
      setSelectedId(response.items[0].id)
    }
  }, [selectedId, token])

  useEffect(() => {
    loadReplays().catch(() => setReplays([]))
  }, [loadReplays])

  useEffect(() => {
    if (!isPlaying || !activeReplay) return
    const timer = setInterval(() => {
      setPosition((prev) => {
        const next = prev + 1000 * speed
        if (next > activeReplay.durationMillis) {
          setPlaying(false)
          return activeReplay.durationMillis
        }
        return next
      })
    }, 500)
    return () => clearInterval(timer)
  }, [isPlaying, speed, activeReplay])

  const triggerExport = useCallback(async () => {
    if (!token || !activeReplay) return
    setError(null)
    setExportProgress(0)
    setJobStatus('running')
    setDownloadUrl(null)
    const response = await apiFetch<{ jobId: string }>(`/api/replays/${activeReplay.id}/exports/mp4`, { method: 'POST' }, token)
    setJobId(response.jobId)
  }, [activeReplay, token])

  useEffect(() => {
    if (!token) return
    let attempt = 0
    let activeSocket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      const socket = new WebSocket(`${WS_BASE_URL}/ws/jobs?token=${encodeURIComponent(token)}`)
      activeSocket = socket
      socket.onopen = () => {
        attempt = 0
      }
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data) as any
        if (jobId && data.jobId !== jobId) {
          return
        }
        if (data.event === 'job.progress') {
          setJobStatus('running')
          setExportProgress(data.progress ?? 0)
        }
        if (data.event === 'job.completed') {
          setJobStatus('completed')
          setExportProgress(100)
          setDownloadUrl(`${API_BASE_URL}/api/jobs/${data.jobId}/download`)
        }
        if (data.event === 'job.failed') {
          setJobStatus('failed')
          setError(data.error_code ?? 'UNKNOWN_ERROR')
        }
      }
      socket.onclose = () => {
        attempt += 1
        const delay = Math.min(10000, Math.pow(2, attempt) * 1000)
        reconnectTimer = setTimeout(connect, delay)
      }
      socket.onerror = () => {
        socket.close()
      }
    }

    connect()

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      activeSocket?.close()
    }
  }, [jobId, token])

  useEffect(() => {
    if (!jobId || !token) return
    const interval = setInterval(async () => {
      try {
        const job = await apiFetch<JobResponse>(`/api/jobs/${jobId}`, {}, token)
        setExportProgress(job.progress)
        if (job.status === 'SUCCEEDED') {
          setJobStatus('completed')
          setDownloadUrl(`${API_BASE_URL}/api/jobs/${jobId}/download`)
          clearInterval(interval)
        } else if (job.status === 'FAILED') {
          setJobStatus('failed')
          setError(job.error_code ?? job.error_message ?? 'JOB_FAILED')
          clearInterval(interval)
        }
      } catch (err) {
        // 폴백 폴링 실패 시 WS에 맡긴다.
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId, token])

  useEffect(() => {
    if (jobStatus === 'completed') {
      enqueueComplete()
    }
  }, [enqueueComplete, jobStatus])

  const createSampleReplay = useCallback(async () => {
    if (!token) return
    try {
      await apiFetch<ReplaySummary>('/api/replays/sample', { method: 'POST' }, token)
      await loadReplays()
    } catch (err) {
      setError('샘플 리플레이 생성에 실패했습니다.')
    }
  }, [loadReplays, token])

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
      {replays.length === 0 && (
        <div className="empty-replays">
          <p>리플레이가 없습니다.</p>
          <button type="button" onClick={createSampleReplay}>
            샘플 리플레이 생성
          </button>
        </div>
      )}
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
          <ReplayRenderer
            width={640}
            height={360}
            progress={(position || 0) / Math.max(activeReplay?.durationMillis ?? 1, 1)}
          />
          <div className="export-panel">
            <button onClick={triggerExport} disabled={jobStatus === 'running'}>
              내보내기
            </button>
            <div aria-label="export-progress">{progressLabel}</div>
            {jobStatus === 'completed' && downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                다운로드
              </a>
            )}
            {jobStatus === 'failed' && <p className="error">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
