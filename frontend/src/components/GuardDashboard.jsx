import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import { buildApiUrl, getSocketUrl } from '../lib/api'

function ActionCard({ title, description, onClick, variant, disabled }) {
  const toneClasses =
    variant === 'primary'
      ? 'border-[#99ad7a] bg-[#546b41] text-[#fff8ec] shadow-[0_16px_36px_rgba(84,107,65,0.22)]'
      : variant === 'danger'
      ? 'border-[#d8a98e] bg-[#b76a4a] text-[#fff8ec] shadow-[0_16px_36px_rgba(183,106,74,0.18)]'
      : 'border-[#dcccac] bg-white text-[#2f3b22] shadow-[0_12px_28px_rgba(84,107,65,0.08)]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[1.75rem] border px-6 py-6 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${toneClasses}`}
    >
      <div className="text-sm font-medium opacity-80">{title}</div>
      <p className={`mt-3 text-sm leading-6 ${variant === 'primary' || variant === 'danger' ? 'text-[#fff8ec]/90' : 'text-[#6f745d]'}`}>
        {description}
      </p>
    </button>
  )
}

function SosToast({ alert, onDismiss, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(alert.id)}
      className="w-full max-w-md rounded-[1.5rem] border border-[#d8a98e] bg-[#fff8ec] p-4 text-left shadow-[0_16px_36px_rgba(84,107,65,0.18)] transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b76a4a]">SOS Alert</p>
          <p className="mt-2 text-sm font-semibold text-[#546b41]">{alert.title}</p>
          <p className="mt-1 text-sm text-[#6f745d]">{alert.reason}</p>
          <p className="mt-2 text-xs text-[#8b846f]">{alert.timeLabel}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#99ad7a]">Click to view details</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDismiss(alert.id)
          }}
          className="rounded-full bg-[#f2e8d4] px-3 py-1 text-xs font-semibold text-[#546b41] hover:bg-[#e6d8b9]"
        >
          Close
        </button>
      </div>
    </button>
  )
}

const mapAlertToToast = (alert, currentUserId) => {
  const creatorId = alert.guardId?._id || alert.guardId?.id || alert.guardId
  const creatorName = alert.guardId?.username || 'A guard'
  const ownAlert = creatorId === currentUserId

  return {
    id: alert._id || alert.id,
    title: ownAlert ? 'Your SOS alert is active' : `SOS created by ${creatorName}`,
    reason: alert.reason,
    timeLabel: new Date(alert.createdAt).toLocaleString(),
  }
}

function GuardDashboard() {
  const dismissedStorageKey = 'guardDismissedSosNotifications'
  const [statusMessage, setStatusMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeShift, setActiveShift] = useState(null)
  const [sosAlerts, setSosAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveStartDate, setLeaveStartDate] = useState('')
  const [leaveEndDate, setLeaveEndDate] = useState('')
  const [leaveRequests, setLeaveRequests] = useState([])
  const [userName, setUserName] = useState('Guard')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [userId, setUserId] = useState('')
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])

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
    const response = await fetch(buildApiUrl(path), {
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
    const response = await fetch(buildApiUrl(path), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  const syncNotificationsFromAlerts = (alerts, currentUserId, dismissedIds = dismissedNotificationIds) => {
    setNotifications(
      alerts
        .filter((alert) => alert.status === 'active' && !dismissedIds.includes(alert._id || alert.id))
        .map((alert) => mapAlertToToast(alert, currentUserId))
    )
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

  const loadDashboardState = async (currentUserId, dismissedIds = dismissedNotificationIds) => {
    try {
      const activeData = await apiGet('/api/shift/active')
      setActiveShift(activeData.shift)

      const leaveData = await apiGet('/api/leave')
      setLeaveRequests(leaveData.leaves || [])

      const sosData = await apiGet('/api/sos')
      const activeAlerts = sosData.alerts?.filter((alert) => alert.status === 'active') || []
      setSosAlerts(activeAlerts)
      syncNotificationsFromAlerts(activeAlerts, currentUserId, dismissedIds)
    } catch {
      // Keep dashboard functional even if one endpoint is unavailable.
    }
  }

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId') || ''
    const storedDismissedIds = JSON.parse(localStorage.getItem(dismissedStorageKey) || '[]')
    const safeDismissedIds = Array.isArray(storedDismissedIds) ? storedDismissedIds : []
    setDismissedNotificationIds(safeDismissedIds)
    setUserId(currentUserId)
    setUserName(localStorage.getItem('userName') || 'Guard')
    setProfilePhoto(localStorage.getItem('profilePhoto') || '')
    loadDashboardState(currentUserId, safeDismissedIds)

    const interval = setInterval(() => loadDashboardState(currentUserId), 5000)
    const socket = io(getSocketUrl())

    socket.on('sosAlert', (alert) => {
      setSosAlerts((current) => {
        const next = [alert, ...current.filter((item) => item._id !== alert._id)]
        syncNotificationsFromAlerts(next, currentUserId)
        return next
      })
    })

    socket.on('sosUpdate', ({ sosId, status }) => {
      if (status === 'resolved') {
        setSosAlerts((current) => {
          const next = current.filter((alert) => alert._id !== sosId)
          syncNotificationsFromAlerts(next, currentUserId)
          return next
        })
      }
    })

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
      await loadDashboardState(userId)
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
      setStatusMessage(`Shift ended. Total hours: ${data.shift.durationHours ?? '0.00'}`)
    })
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
        endDate: leaveEndDate,
      })

      setStatusMessage(data.message || 'Leave request submitted.')
      setShowLeaveModal(false)
      setLeaveReason('')
      setLeaveStartDate('')
      setLeaveEndDate('')
    })
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

  const openSosDetails = () => {
    const sosSection = document.getElementById('guard-sos-feed')
    if (sosSection) {
      sosSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
        {notifications.map((notification) => (
          <SosToast
            key={notification.id}
            alert={notification}
            onDismiss={(id) => {
              const nextDismissedIds = [...new Set([...dismissedNotificationIds, id])]
              setDismissedNotificationIds(nextDismissedIds)
              localStorage.setItem(dismissedStorageKey, JSON.stringify(nextDismissedIds))
              setNotifications((current) => current.filter((item) => item.id !== id))
            }}
            onOpen={openSosDetails}
          />
        ))}
      </div>

      <nav className="border-b border-[#dcccac] bg-[#fff8ec]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#99ad7a]">MyVigi</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#546b41]">Guard Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#dcccac] bg-white/75 px-3 py-2">
              <div className="h-12 w-12 overflow-hidden rounded-[1.1rem] border border-[#dcccac] bg-[#fff8ec]">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#546b41]">
                    {userName?.trim()?.[0] || 'G'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#99ad7a]">Signed in</p>
                <p className="text-sm font-semibold text-[#546b41]">{userName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533]"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 rounded-[2rem] border border-[#dcccac] bg-[linear-gradient(135deg,rgba(255,248,236,0.98),rgba(220,204,172,0.48))] p-8 shadow-[0_24px_60px_rgba(84,107,65,0.14)] sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="mb-6 h-32 w-32 overflow-hidden rounded-[1.75rem] border border-[#dcccac] bg-[#fff8ec] shadow-[0_14px_32px_rgba(84,107,65,0.16)]">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[#546b41]">
                      {userName?.trim()?.[0] || 'G'}
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#99ad7a]">Shift Status</p>
                <h2 className="mt-3 text-4xl font-semibold text-[#546b41]">Ready for patrol</h2>
                <p className="mt-4 text-base text-[#6f745d]">
                  {activeShift
                    ? `Shift active since ${new Date(activeShift.startTime).toLocaleTimeString()}`
                    : 'Start your shift to begin patrol and checkpoint tracking.'}
                </p>

                <div className={`mt-5 rounded-[1.5rem] border px-4 py-4 ${activeShift ? 'border-[#99ad7a] bg-[#eef4e4]' : 'border-[#dcccac] bg-white/75'}`}>
                  <p className="text-sm font-semibold text-[#546b41]">{activeShift ? 'Shift Active' : 'No active shift'}</p>
                  {activeShift?.startTime && (
                    <p className="mt-1 text-xs text-[#6f745d]">Started: {new Date(activeShift.startTime).toLocaleString()}</p>
                  )}
                </div>

                {statusMessage && (
                  <div className="mt-4 rounded-[1.5rem] border border-[#dcccac] bg-white/80 px-4 py-3">
                    <p className="text-sm text-[#546b41]">{statusMessage}</p>
                  </div>
                )}
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[24rem]">
                <ActionCard
                  title="Start Shift"
                  description="Begin your shift and open live patrol tracking."
                  onClick={handleStartShift}
                  variant="primary"
                  disabled={busy || Boolean(activeShift)}
                />
                <ActionCard
                  title="End Shift"
                  description="Close your active shift and save total duration."
                  onClick={handleEndShift}
                  variant="secondary"
                  disabled={busy || !activeShift}
                />
                <ActionCard
                  title="Scan QR"
                  description="Open your assigned patrol route and scan the next checkpoint."
                  onClick={handleScanQR}
                  variant="secondary"
                  disabled={busy}
                />
                <ActionCard
                  title="Request Leave"
                  description="Send a leave request for admin approval."
                  onClick={() => setShowLeaveModal(true)}
                  variant="secondary"
                  disabled={busy}
                />
                <div className="sm:col-span-2">
                  <ActionCard
                    title="SOS"
                    description="Raise an emergency alert that appears immediately to guards and admins."
                    onClick={handleSOS}
                    variant="danger"
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </div>

          {sosAlerts.length > 0 && (
            <section id="guard-sos-feed" className="mb-8 rounded-[2rem] border border-[#dcccac] bg-white/80 p-8 shadow-[0_18px_40px_rgba(84,107,65,0.10)]">
              <h2 className="text-2xl font-semibold text-[#546b41]">Active SOS Feed</h2>
              <p className="mt-1 text-sm text-[#6f745d]">Every active SOS stays visible here when you log in.</p>
              <div className="mt-6 space-y-4">
                {sosAlerts.map((alert) => {
                  const creatorName = alert.guardId?.username || 'Guard'
                  const ownAlert = (alert.guardId?._id || alert.guardId) === userId

                  return (
                    <div
                      key={alert._id}
                      className="rounded-[1.5rem] border border-[#dcccac] bg-[#fff8ec] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b76a4a]">
                            {ownAlert ? 'Your SOS Alert' : `SOS by ${creatorName}`}
                          </p>
                          <p className="mt-2 text-sm text-[#546b41]">{alert.reason}</p>
                          <p className="mt-2 text-xs text-[#8b846f]">{new Date(alert.createdAt).toLocaleString()}</p>
                          {alert.location?.latitude && (
                            <p className="mt-1 text-xs text-[#8b846f]">
                              Lat: {alert.location.latitude.toFixed(4)}, Lng: {alert.location.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-[#f0e2d0] px-3 py-1 text-xs font-semibold text-[#b76a4a]">
                          Active
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {leaveRequests.length > 0 && (
            <section className="rounded-[2rem] border border-[#dcccac] bg-white/80 p-8 shadow-[0_18px_40px_rgba(84,107,65,0.10)]">
              <h2 className="text-2xl font-semibold text-[#546b41]">My Leave Requests</h2>
              <p className="mt-1 text-sm text-[#6f745d]">Review your leave request status and approver details.</p>
              <div className="mt-6 space-y-4">
                {leaveRequests.map((leave) => (
                  <div key={leave._id} className="rounded-[1.5rem] border border-[#dcccac] bg-[#fff8ec] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#546b41]">{leave.reason}</p>
                        <p className="text-sm text-[#6f745d]">
                          From: {new Date(leave.startDate).toLocaleDateString()} | To: {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-[#8b846f]">Requested: {new Date(leave.requestedAt).toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#546b41]">
                        {leave.status === 'approved' ? 'Approved' : leave.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </div>
                    </div>
                    {leave.reviewedBy?.username && (
                      <p className="mt-3 text-sm text-[#6f745d]">
                        {leave.status === 'approved' ? 'Approved' : 'Reviewed'} by admin {leave.reviewedBy.username}
                      </p>
                    )}
                    {leave.adminNotes && (
                      <p className="mt-2 text-sm text-[#6f745d]">Admin notes: {leave.adminNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-[#dcccac] bg-[#fff8ec] p-8 shadow-[0_24px_60px_rgba(84,107,65,0.18)]">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#546b41]">Request Leave</h2>
              <p className="mt-1 text-sm text-[#6f745d]">Submit a leave request for admin approval.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="leaveReason" className="block text-sm font-medium text-[#546b41]">
                  Reason
                </label>
                <textarea
                  id="leaveReason"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#2f3b22] outline-none transition focus:border-[#99ad7a] focus:ring-2 focus:ring-[#dcccac]"
                  placeholder="Enter reason for leave request"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="leaveStartDate" className="block text-sm font-medium text-[#546b41]">
                  Start Date
                </label>
                <input
                  id="leaveStartDate"
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#2f3b22] outline-none transition focus:border-[#99ad7a] focus:ring-2 focus:ring-[#dcccac]"
                />
              </div>

              <div>
                <label htmlFor="leaveEndDate" className="block text-sm font-medium text-[#546b41]">
                  End Date
                </label>
                <input
                  id="leaveEndDate"
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#2f3b22] outline-none transition focus:border-[#99ad7a] focus:ring-2 focus:ring-[#dcccac]"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false)
                  setLeaveReason('')
                  setLeaveStartDate('')
                  setLeaveEndDate('')
                }}
                className="flex-1 rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm font-semibold text-[#546b41] hover:bg-[#faf1df]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitLeaveRequest}
                disabled={busy}
                className="flex-1 rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533] disabled:cursor-not-allowed disabled:bg-[#99ad7a]"
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
