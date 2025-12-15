import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ReplaysPage } from '../pages/ReplaysPage'

/**
 * [테스트] frontend/src/test/ExportProgress.test.tsx
 * 설명:
 *   - 내보내기 진행률 UI가 버튼 클릭 후 증가해 완료 상태가 되는지 스모크 검증한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
describe('ReplaysPage export UI', () => {
  it('내보내기 진행률이 완료 문구로 전환된다', async () => {
    const user = userEvent.setup()
    render(<ReplaysPage />)

    await user.click(screen.getByText('내보내기'))
    await waitFor(() => expect(screen.getByLabelText('export-progress').textContent).toContain('완료'), {
      timeout: 6000,
    })
  })
})
