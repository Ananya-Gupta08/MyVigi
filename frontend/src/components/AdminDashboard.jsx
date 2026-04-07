import { useEffect, useState } from 'react'
import io from 'socket.io-client'

function AdminDashboard() {
  const [guards, setGuards] = useState([])
  const [leaves, setLeaves] = useState([])
  const [sosAlerts, setSosAlerts] = useState([])
  const [activeTab, setActiveTab] = useState('guards')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchGuards = async () => {
    try {
      const response = await fetch('/api/admin/guards-status', {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setGuards(data.guards || [])
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to fetch guards')
    }
  }

  const fetchLeaves = async () => {
    try {
      const response = await fetch('/api/leave', {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setLeaves(data.leaves || [])
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to fetch leave requests')
    }
  }

  const fetchSOS = async () => {
    try {
      const response = await fetch('/api/sos', {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setSosAlerts(data.alerts || [])
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to fetch SOS alerts')
    }
  }

  const reviewLeave = async (leaveId, status, notes = '') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, adminNotes: notes }),
      })
      const data = await response.json()
      if (response.ok) {
        setLeaves(leaves.filter((l) => l._id !== leaveId))
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to review leave')
    } finally {
      setLoading(false)
    }
  }

  const resolveSOS = async (sosId) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sos/${sosId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sosId, status: 'resolved' }),
      })
      const data = await response.json()
      if (response.ok) {
        setSosAlerts(sosAlerts.map((a) => (a._id === sosId ? { ...a, status: 'resolved' } : a)))
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError('Failed to resolve SOS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuards()
    fetchLeaves()
    fetchSOS()

    const interval = setInterval(() => {
      fetchGuards()
      fetchLeaves()
      fetchSOS()
    }, 5000)

    const socket = io()
    socket.on('shiftUpdate', fetchGuards)
    socket.on('patrolUpdate', fetchGuards)
    socket.on('sosAlert', fetchSOS)

    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">MyVigi Guard Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('guards')}
            className={`py-4 font-semibold transition ${
              activeTab === 'guards'
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Guards ({guards.length})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`py-4 font-semibold transition ${
              activeTab === 'leaves'
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Requests ({leaves.filter((l) => l.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('sos')}
            className={`py-4 font-semibold transition ${
              activeTab === 'sos'
                ? 'border-b-2 border-rose-600 text-rose-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SOS Alerts ({sosAlerts.filter((a) => a.status === 'active').length})
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Guards Tab */}
        {activeTab === 'guards' && (
          <div className="rounded-lg bg-white shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-sm font-semibold text-slate-600">
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Shift Status</th>
                    <th className="px-6 py-4 text-left">Started</th>
                    <th className="px-6 py-4 text-left">Last Activity</th>
                    <th className="px-6 py-4 text-left">Request</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {guards.map((guard) => (
                    <tr key={guard._id} className="text-sm hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">{guard.username}</td>
                      <td className="px-6 py-4 text-slate-600">{guard.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            guard.activeShiftStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {guard.activeShiftStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {guard.activeShiftStart ? new Date(guard.activeShiftStart).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {guard.lastPatrol ? new Date(guard.lastPatrol).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {guard.lastRequest ? (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              guard.lastRequest.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : guard.lastRequest.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {guard.lastRequest.type}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leave Requests Tab */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            {leaves.filter((l) => l.status === 'pending').length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-slate-600">
                No pending leave requests
              </div>
            ) : (
              leaves
                .filter((l) => l.status === 'pending')
                .map((leave) => (
                  <div key={leave._id} className="rounded-lg border border-slate-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{leave.guardId?.username}</p>
                        <p className="mt-1 text-sm text-slate-600">{leave.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Requested: {new Date(leave.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewLeave(leave._id, 'approved')}
                          disabled={loading}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewLeave(leave._id, 'rejected')}
                          disabled={loading}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* SOS Alerts Tab */}
        {activeTab === 'sos' && (
          <div className="space-y-4">
            {sosAlerts.filter((a) => a.status === 'active').length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-slate-600">
                No active SOS alerts
              </div>
            ) : (
              sosAlerts
                .filter((a) => a.status === 'active')
                .map((alert) => (
                  <div
                    key={alert._id}
                    className="rounded-lg border-2 border-rose-300 bg-rose-50 p-6 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-rose-600 animate-pulse"></div>
                          <p className="font-bold text-rose-700">SOS FROM {alert.guardId?.username?.toUpperCase()}</p>
                        </div>
                        <p className="mt-2 text-sm text-rose-600">{alert.reason}</p>
                        <p className="mt-2 text-xs text-rose-500">
                          Time: {new Date(alert.createdAt).toLocaleString()}
                        </p>
                        {alert.location?.latitude && alert.location?.longitude && (
                          <p className="mt-1 text-xs text-rose-500">
                            Location: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => resolveSOS(alert._id)}
                        disabled={loading}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Resolved
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
