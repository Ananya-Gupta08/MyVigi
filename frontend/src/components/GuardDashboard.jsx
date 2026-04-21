import { useEffect, useState } from 'react'
import io from 'socket.io-client'

function ActionCard({ title, description, onClick, variant, disabled }) {
  const isPrimary = variant === 'primary'
  const isDanger = variant === 'danger'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-3xl border px-6 py-6 text-left transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 ${
        isPrimary
          ? 'border-sky-300 bg-sky-600 text-white shadow-sky-200/40'
          : isDanger
          ? 'border-rose-300 bg-rose-600 text-white shadow-rose-200/30'
          : 'border-slate-200 bg-white text-slate-900 shadow-slate-200/50'
      }`}
    >
      <div className="text-sm font-medium opacity-80">{title}</div>
      <p className={`mt-3 text-sm leading-6 ${isPrimary || isDanger ? 'text-slate-100/90' : 'text-slate-600'}`}>
        {description}
      </p>
    </button>
  )
}

function PatrolLogItem({ log }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{log.checkpoint}</p>
          <p className="mt-1 text-xs text-slate-500">{log.status}</p>
        </div>
        <p className="text-xs text-slate-400">{log.timestamp}</p>
      </div>
      <p className="mt-4 text-sm text-slate-600">{log.notes}</p>
    </div>
  )
}

function GuardDashboard() {
  const [logs, setLogs] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeShift, setActiveShift] = useState(null)
  const [otherSOS, setOtherSOS] = useState([])
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveStartDate, setLeaveStartDate] = useState('')
  const [leaveEndDate, setLeaveEndDate] = useState('')
  const [leaveRequests, setLeaveRequests] = useState([])
  const [userName, setUserName] = useState('Guard')
  const [profilePhoto, setProfilePhoto] = useState('')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please log in before using dashboard actions.')
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  const apiPost = async (path, body) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  const apiGet = async (path) => {
    const response = await fetch(path, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  const getCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        return resolve(null)
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => resolve(null),
        { timeout: 8000 }
      )
    })

  const loadDashboardState = async () => {
    try {
      const activeData = await apiGet('/api/shift/active')
      setActiveShift(activeData.shift)

      const leaveData = await apiGet('/api/leave')
      setLeaveRequests(leaveData.leaves || [])

      try {
        const sosData = await apiGet('/api/sos')
        setOtherSOS(sosData.alerts?.filter((a) => a.status === 'active') || [])
      } catch {
        // Guard doesn't have admin access to see all SOS
        setOtherSOS([])
      }
    } catch (error) {
      // Don't show error if shift/sos endpoints fail - not critical
    }
  }

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'Guard')
    setProfilePhoto(localStorage.getItem('profilePhoto') || '')
    loadDashboardState()

    const interval = setInterval(loadDashboardState, 5000)
    const socket = io()

    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  const handleUserAction = async (action) => {
    setStatusMessage('')
    setBusy(true)

    try {
      await action()
      await loadDashboardState()
    } catch (error) {
      setStatusMessage(error?.message || 'Action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleStartShift = () => {
    handleUserAction(async () => {
      const currentLocation = await getCurrentLocation()
      const payload = currentLocation
        ? {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }
        : {}

      const data = await apiPost('/api/shift/start', payload)
      setActiveShift(data.shift)
      setStatusMessage(`Shift started at ${new Date(data.shift.startTime).toLocaleTimeString()}.`)
    })
  }

  const handleScanQR = () => {
    window.location.href = '/guard-patrol'
  }

  const handleEndShift = () => {
    handleUserAction(async () => {
      const data = await apiPost('/api/shift/end', {})
      setActiveShift(null)
      setStatusMessage(
        `Shift ended. Total hours: ${data.shift.durationHours ?? '0.00'}`
      )
    })
  }

  const handleRequestLeave = () => {
    setShowLeaveModal(true)
  }

  const handleSubmitLeaveRequest = () => {
    handleUserAction(async () => {
      if (!leaveReason.trim()) {
        setStatusMessage('Please enter a reason for the leave request.')
        return
      }

      if (!leaveStartDate || !leaveEndDate) {
        setStatusMessage('Please select both start and end dates.')
        return
      }

      const startDate = new Date(leaveStartDate)
      const endDate = new Date(leaveEndDate)

      if (startDate >= endDate) {
        setStatusMessage('End date must be after start date.')
        return
      }

      const data = await apiPost('/api/leave/request', {
        reason: leaveReason.trim(),
        startDate: leaveStartDate,
        endDate: leaveEndDate
      })

      setStatusMessage(data.message || 'Leave request submitted.')
      setShowLeaveModal(false)
      setLeaveReason('')
      setLeaveStartDate('')
      setLeaveEndDate('')
    })
  }

  const handleCancelLeaveRequest = () => {
    setShowLeaveModal(false)
    setLeaveReason('')
    setLeaveStartDate('')
    setLeaveEndDate('')
  }

  const handleSOS = () => {
    handleUserAction(async () => {
      const currentLocation = await getCurrentLocation()
      const reason = window.prompt('Enter a brief SOS description:')?.trim() || 'SOS alert from guard'
      const payload = {
        reason,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      }
      const data = await apiPost('/api/sos', payload)
      setStatusMessage(data.message || 'SOS alert sent!')
    })
  }

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Guard Dashboard</h1>
            <p className="text-sm text-slate-500">MyVigi Patrol System</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-3xl bg-slate-100">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-600">
                      {userName?.trim()?.[0] || 'G'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">Welcome back</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{userName}</h2>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-sky-600">Shift Status</p>
                <h1 className="mt-2 text-4xl font-bold text-slate-900">Ready for patrol</h1>
                <p className="mt-3 text-base text-slate-600">
                  {activeShift
                    ? `Shift active since ${new Date(activeShift.startTime).toLocaleTimeString()}`
                    : 'Start your shift to begin patrol'}
                </p>

                {activeShift ? (
                  <div className="mt-4 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-900">✓ Shift Active</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Started: {new Date(activeShift.startTime).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border-2 border-slate-200 bg-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-700">No active shift</p>
                  </div>
                )}

                {statusMessage && (
                  <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-sm text-sky-800">{statusMessage}</p>
                  </div>
                )}
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:flex-col">
                <ActionCard
                  title="Start Shift"
                  description="Begin your shift"
                  onClick={handleStartShift}
                  variant="primary"
                  disabled={busy || Boolean(activeShift)}
                />
                <ActionCard
                  title="End Shift"
                  description="End your shift"
                  onClick={handleEndShift}
                  variant="secondary"
                  disabled={busy || !activeShift}
                />
                <ActionCard
                  title="Scan QR"
                  description="Scan checkpoint"
                  onClick={handleScanQR}
                  variant="secondary"
                  disabled={busy}
                />
                <ActionCard
                  title="Request Leave"
                  description="Submit leave request"
                  onClick={handleRequestLeave}
                  variant="secondary"
                  disabled={busy}
                />
                <ActionCard
                  title="SOS"
                  description="Send emergency alert"
                  onClick={handleSOS}
                  variant="danger"
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {otherSOS.length > 0 && (
            <section className="mb-8 rounded-3xl bg-rose-50 p-8 shadow-lg ring-1 ring-rose-200">
              <h2 className="text-2xl font-bold text-rose-900">Active SOS Alerts</h2>
              <p className="mt-1 text-sm text-rose-700">Alerts from other guards</p>
              <div className="mt-6 space-y-4">
                {otherSOS.map((alert) => (
                  <div
                    key={alert._id}
                    className="rounded-lg border-2 border-rose-300 bg-white p-4 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></div>
                          <p className="font-bold text-rose-700">SOS ALERT</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{alert.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                        {alert.location?.latitude && (
                          <p className="text-xs text-slate-400">
                            Lat: {alert.location.latitude.toFixed(4)}, Lng: {alert.location.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {leaveRequests.length > 0 && (
            <section className="mb-8 rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">My Leave Requests</h2>
              <p className="mt-1 text-sm text-slate-600">Review your leave request status and approver details.</p>
              <div className="mt-6 space-y-4">
                {leaveRequests.map((leave) => (
                  <div key={leave._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{leave.reason}</p>
                        <p className="text-sm text-slate-600">
                          From: {new Date(leave.startDate).toLocaleDateString()} • To: {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">Requested: {new Date(leave.requestedAt).toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        {leave.status === 'approved' ? 'Approved' : leave.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </div>
                    </div>
                    {leave.status === 'approved' && leave.reviewedBy?.username && (
                      <p className="mt-3 text-sm text-emerald-700">Approved by admin {leave.reviewedBy.username}</p>
                    )}
                    {leave.status === 'rejected' && leave.reviewedBy?.username && (
                      <p className="mt-3 text-sm text-rose-700">Rejected by admin {leave.reviewedBy.username}</p>
                    )}
                    {leave.adminNotes && (
                      <p className="mt-2 text-sm text-slate-600">Admin notes: {leave.adminNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {logs.length > 0 && (
            <section className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Patrol History</h2>
              <p className="mt-1 text-sm text-slate-600">Your scanned checkpoints</p>
              <div className="mt-6 space-y-3">
                {logs.map((log) => (
                  <PatrolLogItem key={log.id} log={log} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Request Leave</h2>
              <p className="mt-1 text-sm text-slate-600">Submit a leave request for admin approval</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="leaveReason" className="block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  id="leaveReason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter reason for leave request"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="leaveStartDate" className="block text-sm font-medium text-slate-700">
                  Start Date
                </label>
                <input
                  id="leaveStartDate"
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="leaveEndDate" className="block text-sm font-medium text-slate-700">
                  End Date
                </label>
                <input
                  id="leaveEndDate"
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleCancelLeaveRequest}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitLeaveRequest}
                disabled={busy}
                className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuardDashboard
