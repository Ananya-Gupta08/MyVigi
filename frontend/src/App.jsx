import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import Signup from './components/Signup'
import GuardDashboard from './components/GuardDashboard'
import GuardPatrol from './components/GuardPatrol'
import AdminDashboard from './components/AdminDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/guard-dashboard" element={<GuardDashboard />} />
      <Route path="/guard-patrol" element={<GuardPatrol />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
