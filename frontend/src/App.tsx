import { Link, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LobbyPage } from './pages/LobbyPage'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { useAuth } from './features/auth/AuthProvider'
import { ProtectedRoute } from './features/auth/ProtectedRoute'

/**
 * [루트] frontend/src/App.tsx
 * 설명:
 *   - 기본 네비게이션과 페이지 라우팅을 설정한다.
 *   - v0.3.0에서는 빠른 대전/실시간 경기 페이지까지 보호된 라우트를 확장한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/frontend/v0.4.0-ranking-and-leaderboard-ui.md
 * 변경 이력:
 *   - v0.1.0: React Router 기반 기본 라우팅 추가
 *   - v0.2.0: 인증 라우팅 및 네비게이션 확장
 *   - v0.3.0: 게임 전용 보호 라우트 추가
 *   - v0.4.0: 리더보드 라우트와 랭크 네비게이션 추가
 */
function App() {
  const { user, status, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="header">
        <Link to="/" className="brand">
          Codex Pong
        </Link>
        <nav className="nav">
          <Link to="/lobby">로비</Link>
          <Link to="/game">게임</Link>
          <Link to="/leaderboard">리더보드</Link>
          {status === 'authenticated' ? (
            <>
              <Link to="/profile">내 프로필</Link>
              <button className="link-button" type="button" onClick={logout}>
                로그아웃
              </button>
              <span className="nickname">{user?.nickname}</span>
            </>
          ) : (
            <>
              <Link to="/login">로그인</Link>
              <Link to="/register">회원가입</Link>
            </>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/lobby"
          element={(
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/game"
          element={(
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/leaderboard"
          element={(
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </div>
  )
}

export default App
