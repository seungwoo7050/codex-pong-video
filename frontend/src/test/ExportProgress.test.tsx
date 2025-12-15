import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'
import { ReplaysPage } from '../pages/ReplaysPage'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onmessage: ((event: { data: string }) => void) | null = null
  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }
  close() {}
  send() {}
  simulate(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

vi.stubGlobal('WebSocket', MockWebSocket as any)

vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    token: 'test-token',
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}))

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(async (path: string) => {
    if (path === '/api/replays') {
      return { items: [{ id: 1, ownerId: 1, title: '샘플 리플레이', durationMillis: 3000, createdAt: '' }] }
    }
    if (path.includes('/exports/mp4')) {
      return { jobId: 'job-1' }
    }
    if (path.startsWith('/api/jobs/job-1')) {
      return {
        schemaVersion: '1',
        id: 'job-1',
        replayId: 1,
        type: 'MP4',
        status: 'SUCCEEDED',
        progress: 100,
      }
    }
    if (path === '/api/replays/sample') {
      return { id: 2, ownerId: 1, title: '샘플', durationMillis: 3000, createdAt: '' }
    }
    return {}
  }),
}))

vi.mock('../shared/api/client', () => ({
  apiFetch: apiFetchMock,
}))

/**
 * [테스트] frontend/src/test/ExportProgress.test.tsx
 * 설명:
 *   - WebSocket 진행률 이벤트 수신 후 다운로드 링크가 노출되는지 스모크 검증한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
describe('ReplaysPage export UI', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
      if (type === '2d') {
        return {
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          font: '',
          fillStyle: '',
        } as any
      }
      return {
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        COLOR_BUFFER_BIT: 0x4000,
      } as any
    })
  })

  beforeEach(() => {
    apiFetchMock.mockClear()
    MockWebSocket.instances = []
  })

  it('WS 진행률/완료 이벤트 후 다운로드 링크를 노출한다', async () => {
    const user = userEvent.setup()
    render(<ReplaysPage />)

    await user.click(screen.getByText('내보내기'))

    const socket = MockWebSocket.instances[0]
    expect(socket.url).toContain('/ws/jobs')

    socket.simulate({ event: 'job.progress', jobId: 'job-1', progress: 42 })
    socket.simulate({ event: 'job.completed', jobId: 'job-1', artifactPath: '/tmp/out.mp4' })

    await waitFor(() => {
      expect(screen.getByLabelText('export-progress').textContent).toContain('완료')
      expect(screen.getByText('다운로드')).toBeInTheDocument()
    })
  })
})
