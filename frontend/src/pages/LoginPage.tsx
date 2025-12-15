import { FormEvent, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

/**
 * [페이지] frontend/src/pages/LoginPage.tsx
 * 설명:
 *   - 아이디/비밀번호를 입력받아 로그인하고 보호된 라우트로 복귀한다.
 *   - 실패 시 한국어 메시지를 표시하며, 회원가입 링크를 제공한다.
 * 버전: v0.2.0
 * 관련 설계문서:
 *   - design/frontend/v0.2.0-auth-and-profile-ui.md
 */
export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string })?.from ?? '/lobby'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError('로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <h2>로그인</h2>
        <p>v0.2.0 기본 계정 로그인 화면입니다.</p>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            아이디
            <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={4} maxLength={60} />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button" type="submit" disabled={loading || status === 'loading'}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p>
          아직 계정이 없다면 <Link to="/register">회원가입</Link>
        </p>
      </section>
    </main>
  )
}
