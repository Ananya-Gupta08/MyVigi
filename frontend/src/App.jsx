import './App.css'
import Login from './components/Login'
import Signup from './components/Signup'
import GuardDashboard from './components/GuardDashboard'
import GuardPatrol from './components/GuardPatrol'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const path = window.location.pathname

  if (path === '/guard-dashboard') {
    return <GuardDashboard />
  }

  if (path === '/guard-patrol') {
    return <GuardPatrol />
  }

  if (path === '/admin-dashboard') {
    return <AdminDashboard />
  }

  if (path === '/signup') {
    return <Signup />
  }

  return <Login />
}

export default App

