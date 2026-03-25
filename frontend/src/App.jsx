import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import QRScanner from './components/QRScanner'
import './App.css'

const STORAGE_KEY = 'myvigi_users_v1'
function getUsers() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function setUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)) }

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">MyVigi</div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/signup">Signup</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

function Home() {
  return (
    <div className="card">
      <h1>Welcome to MyVigi</h1>
      <p>Login or Signup to go to Guard/Admin dashboards.</p>
    </div>
  )
}

function GuardPatrol({ onLog }) {
  const [location, setLocation] = useState('Gate A')
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('Ready')
  const [showScanner, setShowScanner] = useState(false)

  const submit = () => {
    const entry = `${new Date().toLocaleTimeString()}: checked ${location}`
    setLogs((prev) => [entry, ...prev])
    setStatus('Patrol logged')
    onLog(entry)
  }

  const handleScan = (scannedValue) => {
    const entry = `${new Date().toLocaleTimeString()}: scanned ${scannedValue}`
    setLogs((prev) => [entry, ...prev])
    setStatus('Patrol scanned')
    onLog(entry)
    setShowScanner(false)
  }

  return (
    <div className="card">
      <h3>Patrol Check</h3>
      <div className="form">
        <label>Location</label>
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option>Gate A</option>
          <option>Gate B</option>
          <option>Zone C</option>
        </select>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" onClick={submit}>Log Patrol</button>
          <button type="button" className="btn-secondary" onClick={() => setShowScanner(true)}>Scan QR Patrol</button>
        </div>
      </div>
      {showScanner && <div className="card" style={{ marginTop: '14px', padding: '12px' }}><QRScanner onScan={handleScan} /></div>}
      <p>{status}</p>
      <div className="panel-row">
        {logs.slice(0, 4).map((l, i) => <div key={i} className="panel">{l}</div>)}
      </div>
    </div>
  )
}

function Dashboard({ role, onLogout }) {
  const [patrolLog, setPatrolLog] = useState('')

  return (
    <div className="card">
      <h1>{role === 'admin' ? 'Admin Dashboard' : 'Guard Dashboard'}</h1>
      <p>Logged in as <strong>{role}</strong>.</p>
      <div className="panel-row">
        <div className="panel">{role === 'admin' ? 'User management' : 'Patrol queue'}</div>
        <div className="panel">{role === 'admin' ? 'System health' : 'Current checkpoint'}</div>
      </div>
      {role === 'guard' && <GuardPatrol onLog={(entry) => setPatrolLog(entry)} />}
      {patrolLog && <div className="error">Last patrol: {patrolLog}</div>}
      <button className="btn-secondary" onClick={onLogout}>Logout</button>
    </div>
  )
}

function Signup({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('guard')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { setError('Please fill username and password.'); return }
    const users = getUsers()
    if (users.some((u) => u.username === username.trim())) { setError('Username exists.'); return }
    users.push({ username: username.trim(), password: password.trim(), role })
    setUsers(users)
    onLogin({ username: username.trim(), role })
    navigate(`/${role}-dashboard`)
  }

  return (
    <div className="card">
      <h1>Create Account</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="guard">Guard</option>
          <option value="admin">Admin</option>
        </select>
        {error && <div className="error">{error}</div>}
        <button className="btn-primary" type="submit">Signup</button>
      </form>
    </div>
  )
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const found = getUsers().find((u) => u.username === username.trim() && u.password === password.trim())
    if (!found) { setError('Invalid credentials.'); return }
    onLogin({ username: found.username, role: found.role })
    navigate(`/${found.role}-dashboard`)
  }

  return (
    <div className="card">
      <h1>Login</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn-primary" type="submit">Login</button>
      </form>
    </div>
  )
}

function RequireAuth({ user, role, children }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function App() {
  const [user, setUser] = useState(null)

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup onLogin={setUser} />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/guard-dashboard" element={<RequireAuth user={user} role="guard"><Dashboard role="guard" onLogout={() => setUser(null)} /></RequireAuth>} />
          <Route path="/admin-dashboard" element={<RequireAuth user={user} role="admin"><Dashboard role="admin" onLogout={() => setUser(null)} /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
