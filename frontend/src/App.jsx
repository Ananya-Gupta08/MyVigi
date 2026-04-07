import './App.css'
import Login from './components/Login'
import GuardDashboard from './components/GuardDashboard'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const path = window.location.pathname

  if (path === '/guard-dashboard') {
    return <GuardDashboard />
  }

  if (path === '/admin-dashboard') {
    return <AdminDashboard />
  }

  return <Login />
}

export default App

