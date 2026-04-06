import './App.css'
import Login from './components/Login'
import GuardDashboard from './components/GuardDashboard'

function App() {
  const path = window.location.pathname

  if (path === '/guard-dashboard') {
    return <GuardDashboard />
  }

  if (path === '/admin-dashboard') {
    return (
      <div className="app-container">
        <header>
          <h1>Admin dashboard coming soon</h1>
        </header>
        <main>
          <p>Please log in with an admin account to view admin features.</p>
        </main>
      </div>
    )
  }

  return <Login />
}

export default App

