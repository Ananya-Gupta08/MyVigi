import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import { buildApiUrl, getSocketUrl } from '../lib/api'

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

const mapAlertToToast = (alert) => ({
  id: alert._id || alert.id,
  title: `SOS created by ${alert.guardId?.username || 'a guard'}`,
  reason: alert.reason,
  timeLabel: new Date(alert.createdAt).toLocaleString(),
})

function AdminDashboard() {
  const dismissedStorageKey = 'adminDismissedSosNotifications'
  const [guards, setGuards] = useState([])
  const [leaves, setLeaves] = useState([])
  const [sosAlerts, setSosAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [activeTab, setActiveTab] = useState('guards')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [guardDetails, setGuardDetails] = useState(null)
  const [showGuardDetails, setShowGuardDetails] = useState(false)
  const [selectedGuardLoading, setSelectedGuardLoading] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [adminPhoto, setAdminPhoto] = useState('')
  const [selectedRouteIds, setSelectedRouteIds] = useState([])
  const [routeSaving, setRouteSaving] = useState(false)
  const [routeResetting, setRouteResetting] = useState(false)
  const [routeMessage, setRouteMessage] = useState('')
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  const syncNotificationsFromAlerts = (alerts, dismissedIds) => {
    setNotifications(
      alerts
        .filter((alert) => alert.status === 'active' && !dismissedIds.includes(alert._id || alert.id))
        .map(mapAlertToToast)
    )
  }

  const fetchGuards = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/guards-status'), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setGuards(data.guards || [])
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to fetch guards')
    }
  }

  const fetchLeaves = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/leave'), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setLeaves(data.leaves || [])
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to fetch leave requests')
    }
  }

  const fetchSOS = async (dismissedIds = dismissedNotificationIds) => {
    try {
      const response = await fetch(buildApiUrl('/api/sos'), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setSosAlerts(data.alerts || [])
        syncNotificationsFromAlerts(data.alerts || [], dismissedIds)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to fetch SOS alerts')
    }
  }

  const fetchCheckpoints = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/checkpoints'), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setCheckpoints(data.checkpoints || [])
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to fetch checkpoints')
    }
  }

  const openGuardDetails = async (guardId) => {
    setSelectedGuardLoading(true)
    setRouteMessage('')
    setError('')

    try {
      const response = await fetch(buildApiUrl(`/api/admin/guards/${guardId}`), {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (response.ok) {
        setGuardDetails(data.guard)
        setSelectedRouteIds((data.guard.assignedCheckpointIds || []).slice())
        setShowGuardDetails(true)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to load guard details')
    } finally {
      setSelectedGuardLoading(false)
    }
  }

  const reviewLeave = async (leaveId, status, notes = '') => {
    setLoading(true)
    try {
      const response = await fetch(buildApiUrl(`/api/leave/${leaveId}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, adminNotes: notes }),
      })
      const data = await response.json()
      if (response.ok) {
        setLeaves(leaves.filter((leave) => leave._id !== leaveId))
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to review leave')
    } finally {
      setLoading(false)
    }
  }

  const resolveSOS = async (sosId) => {
    setLoading(true)
    try {
      const response = await fetch(buildApiUrl(`/api/sos/${sosId}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sosId, status: 'resolved' }),
      })
      const data = await response.json()
      if (response.ok) {
        const nextAlerts = sosAlerts.map((alert) => (alert._id === sosId ? { ...alert, status: 'resolved' } : alert))
        setSosAlerts(nextAlerts)
        syncNotificationsFromAlerts(nextAlerts)
      } else {
        setError(data.message)
      }
    } catch {
      setError('Failed to resolve SOS')
    } finally {
      setLoading(false)
    }
  }

  const toggleCheckpointSelection = (checkpointId) => {
    setSelectedRouteIds((current) =>
      current.includes(checkpointId)
        ? current.filter((id) => id !== checkpointId)
        : [...current, checkpointId]
    )
  }

  const saveAssignedRoute = async () => {
    if (!guardDetails?._id) {
      return
    }

    if (!selectedRouteIds.length) {
      setRouteMessage('Select at least one checkpoint before saving the route.')
      return
    }

    setRouteSaving(true)
    setRouteMessage('')

    try {
      const response = await fetch(buildApiUrl(`/api/admin/guards/${guardDetails._id}/route`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assignedCheckpointIds: selectedRouteIds }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to assign route')
      }

      setGuardDetails(data.guard)
      setSelectedRouteIds((data.guard.assignedCheckpointIds || []).slice())
      setRouteMessage(data.message || 'Route assigned successfully.')
      await fetchGuards()
    } catch (routeError) {
      setRouteMessage(routeError.message || 'Failed to assign route')
    } finally {
      setRouteSaving(false)
    }
  }

  const resetPatrolRoute = async () => {
    if (!guardDetails?._id) {
      return
    }

    setRouteResetting(true)
    setRouteMessage('')

    try {
      const response = await fetch(buildApiUrl(`/api/admin/guards/${guardDetails._id}/route/reset`), {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset patrol route')
      }

      setGuardDetails(data.guard)
      setSelectedRouteIds((data.guard.assignedCheckpointIds || []).slice())
      setRouteMessage(data.message || 'Patrol route reset successfully.')
      await fetchGuards()
    } catch (routeError) {
      setRouteMessage(routeError.message || 'Failed to reset patrol route')
    } finally {
      setRouteResetting(false)
    }
  }

  useEffect(() => {
    const storedDismissedIds = JSON.parse(localStorage.getItem(dismissedStorageKey) || '[]')
    const safeDismissedIds = Array.isArray(storedDismissedIds) ? storedDismissedIds : []
    setDismissedNotificationIds(safeDismissedIds)
    setAdminName(localStorage.getItem('userName') || 'Admin')
    setAdminPhoto(localStorage.getItem('profilePhoto') || '')
    fetchGuards()
    fetchLeaves()
    fetchSOS(safeDismissedIds)
    fetchCheckpoints()

    const interval = setInterval(() => {
      fetchGuards()
      fetchLeaves()
      fetchSOS()
    }, 5000)

    const socket = io(getSocketUrl())
    socket.on('shiftUpdate', fetchGuards)
    socket.on('patrolUpdate', fetchGuards)
    socket.on('sosAlert', (alert) => {
      setSosAlerts((current) => {
        const next = [alert, ...current.filter((item) => item._id !== alert._id)]
          const dismissedIds = JSON.parse(
        localStorage.getItem(dismissedStorageKey) || '[]'
      )
        syncNotificationsFromAlerts(next,dismissedIds)
        return next
      })
    })
    socket.on('sosUpdate', ({ sosId, status }) => {
      if (status === 'resolved') {
        setSosAlerts((current) => {
          const next = current.filter((alert) => alert._id !== sosId)
          const dismissedIds = JSON.parse(
        localStorage.getItem(dismissedStorageKey) || '[]'
      )

      syncNotificationsFromAlerts(next, dismissedIds)
          return next
        })
      }
    })
    socket.on('guardRouteUpdated', fetchGuards)
    socket.on('guardRouteReset', fetchGuards)

    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/'
  }

  const openSosDetails = () => {
    setActiveTab('sos')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const sosSection = document.getElementById('admin-sos-feed')
        if (sosSection) {
          sosSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    })
  }

  const activeSosCount = sosAlerts.filter((alert) => alert.status === 'active').length

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#99ad7a]">MyVigi</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#546b41]">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#dcccac] bg-white/75 px-3 py-2">
              <div className="h-12 w-12 overflow-hidden rounded-[1.1rem] border border-[#dcccac] bg-[#fff8ec]">
                {adminPhoto ? (
                  <img src={adminPhoto} alt={adminName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#546b41]">
                    {adminName?.[0] || 'A'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#99ad7a]">Signed in</p>
                <p className="text-sm font-semibold text-[#546b41]">{adminName}</p>
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

      <div className="border-b border-[#dcccac] bg-white/60 px-6">
        <div className="mx-auto flex max-w-7xl gap-6">
          <button
            onClick={() => setActiveTab('guards')}
            className={`py-4 font-semibold transition ${activeTab === 'guards' ? 'border-b-2 border-[#546b41] text-[#546b41]' : 'text-[#6f745d] hover:text-[#546b41]'}`}
          >
            Guards ({guards.length})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`py-4 font-semibold transition ${activeTab === 'leaves' ? 'border-b-2 border-[#546b41] text-[#546b41]' : 'text-[#6f745d] hover:text-[#546b41]'}`}
          >
            Leave Requests ({leaves.filter((leave) => leave.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('sos')}
            className={`py-4 font-semibold transition ${activeTab === 'sos' ? 'border-b-2 border-[#b76a4a] text-[#b76a4a]' : 'text-[#6f745d] hover:text-[#546b41]'}`}
          >
            SOS Alerts ({activeSosCount})
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-[1.5rem] border border-[#d8a98e] bg-[#fff8ec] p-4 text-sm text-[#9b5c3d]">
            {error}
          </div>
        )}

        {selectedGuardLoading && (
          <div className="mb-6 rounded-[1.5rem] border border-[#dcccac] bg-white/80 p-4 text-sm text-[#546b41]">
            Loading guard details...
          </div>
        )}

        {activeTab === 'guards' && (
          <div className="overflow-hidden rounded-[2rem] border border-[#dcccac] bg-white/80 shadow-[0_18px_40px_rgba(84,107,65,0.10)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#dcccac] bg-[#fff8ec]">
                  <tr className="text-sm font-semibold text-[#6f745d]">
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Shift Status</th>
                    <th className="px-6 py-4 text-left">Started</th>
                    <th className="px-6 py-4 text-left">Assigned Route</th>
                    <th className="px-6 py-4 text-left">Current Route</th>
                    <th className="px-6 py-4 text-left">Last Activity</th>
                    <th className="px-6 py-4 text-left">Request</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe3cb]">
                  {guards.map((guard) => (
                    <tr
                      key={guard._id}
                      onClick={() => openGuardDetails(guard._id)}
                      className="cursor-pointer text-sm hover:bg-[#fffaf1]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-[#dcccac] bg-[#fff8ec]">
                            {guard.profilePhoto ? (
                              <img src={guard.profilePhoto} alt={guard.username} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#546b41]">
                                {guard.username?.[0] || 'G'}
                              </div>
                            )}
                          </div>
                          <span className="font-semibold text-[#546b41]">{guard.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#6f745d]">{guard.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${guard.activeShiftStatus === 'active' ? 'bg-[#eef4e4] text-[#546b41]' : 'bg-[#f4eee2] text-[#7a765f]'}`}>
                          {guard.activeShiftStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#6f745d]">
                        {guard.activeShiftStart ? new Date(guard.activeShiftStart).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-[#6f745d]">
                        {guard.assignedRouteCount ? `${guard.assignedRouteCount} checkpoints` : '-'}
                      </td>
                      <td className="px-6 py-4 text-[#6f745d]">{guard.currentRoute || 'Completed / Not started'}</td>
                      <td className="px-6 py-4 text-[#6f745d]">
                        {guard.lastPatrol ? new Date(guard.lastPatrol).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {guard.lastRequest ? (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${guard.lastRequest.status === 'pending' ? 'bg-[#f5ead4] text-[#9a774a]' : guard.lastRequest.status === 'approved' ? 'bg-[#eef4e4] text-[#546b41]' : 'bg-[#f1dfd6] text-[#b76a4a]'}`}>
                            {guard.lastRequest.type}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showGuardDetails && guardDetails && (
          <div className="fixed inset-0 z-40 overflow-auto bg-black/45 px-4 py-8">
            <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-[#dcccac] bg-[#fff8ec] p-8 shadow-[0_24px_60px_rgba(84,107,65,0.18)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-[1.5rem] border border-[#dcccac] bg-white">
                    {guardDetails.profilePhoto ? (
                      <img src={guardDetails.profilePhoto} alt={guardDetails.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#546b41]">
                        {guardDetails.username?.[0] || 'G'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#546b41]">{guardDetails.username}</h2>
                    <p className="text-sm text-[#6f745d]">{guardDetails.email}</p>
                    <p className="mt-2 text-sm text-[#6f745d]">Role: {guardDetails.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuardDetails(false)}
                  className="rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533]"
                >
                  Close
                </button>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#99ad7a]">Current Shift</p>
                  <p className="mt-4 text-lg font-semibold text-[#546b41]">
                    {guardDetails.activeShift?.status === 'active' ? 'Active' : 'No active shift'}
                  </p>
                  {guardDetails.activeShift?.startTime && (
                    <p className="mt-2 text-sm text-[#6f745d]">Started: {new Date(guardDetails.activeShift.startTime).toLocaleString()}</p>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#99ad7a]">Current Route</p>
                  <p className="mt-4 text-lg font-semibold text-[#546b41]">
                    {guardDetails.currentRoute?.checkpointId || 'Completed / Not started'}
                  </p>
                  {guardDetails.currentRoute?.location && (
                    <p className="mt-2 text-sm text-[#6f745d]">{guardDetails.currentRoute.location}</p>
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#99ad7a]">Completed Checkpoints</p>
                  <p className="mt-4 text-lg font-semibold text-[#546b41]">{guardDetails.completedCheckpoints?.length || 0}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                  <h3 className="text-xl font-semibold text-[#546b41]">Assigned Patrol Route</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {guardDetails.patrolRoute?.map((checkpoint) => (
                      <div key={checkpoint.checkpointId} className="rounded-[1.25rem] border border-[#dcccac] bg-[#fff8ec] p-4">
                        <p className="text-sm text-[#8b846f]">Checkpoint {checkpoint.order}</p>
                        <p className="mt-2 font-semibold text-[#546b41]">{checkpoint.checkpointId}</p>
                        <p className="mt-1 text-sm text-[#6f745d]">{checkpoint.location}</p>
                        <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${checkpoint.status === 'completed' ? 'bg-[#eef4e4] text-[#546b41]' : 'bg-white text-[#6f745d]'}`}>
                          {checkpoint.status}
                        </p>
                        {checkpoint.completedAt && (
                          <p className="mt-2 text-xs text-[#8b846f]">
                            Completed at {new Date(checkpoint.completedAt).toLocaleString()} by {checkpoint.completedBy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                  <h3 className="text-xl font-semibold text-[#546b41]">Assign Route</h3>
                  <p className="mt-2 text-sm text-[#6f745d]">Selected checkpoints appear immediately on the guard patrol page.</p>
                  <div className="mt-4 max-h-[22rem] space-y-3 overflow-auto pr-1">
                    {checkpoints.map((checkpoint) => {
                      const checked = selectedRouteIds.includes(checkpoint.checkpointId)
                      return (
                        <label
                          key={checkpoint.checkpointId}
                          className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border p-3 ${checked ? 'border-[#99ad7a] bg-[#eef4e4]' : 'border-[#dcccac] bg-[#fff8ec]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCheckpointSelection(checkpoint.checkpointId)}
                            className="mt-1 h-4 w-4 rounded border-[#99ad7a] text-[#546b41] focus:ring-[#99ad7a]"
                          />
                          <div>
                            <p className="font-semibold text-[#546b41]">
                              {checkpoint.checkpointId} - Circle {checkpoint.order}
                            </p>
                            <p className="text-sm text-[#6f745d]">{checkpoint.location}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {routeMessage && (
                    <div className="mt-4 rounded-[1.25rem] border border-[#dcccac] bg-[#fff8ec] px-4 py-3 text-sm text-[#546b41]">
                      {routeMessage}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={saveAssignedRoute}
                      disabled={routeSaving || routeResetting}
                      className="rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533] disabled:cursor-not-allowed disabled:bg-[#99ad7a]"
                    >
                      {routeSaving ? 'Saving route...' : 'Save Assigned Route'}
                    </button>
                    <button
                      type="button"
                      onClick={resetPatrolRoute}
                      disabled={routeSaving || routeResetting}
                      className="rounded-2xl bg-[#b76a4a] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#9f593d] disabled:cursor-not-allowed disabled:bg-[#d8a98e]"
                    >
                      {routeResetting ? 'Resetting patrol...' : 'Reset Patrol Route Progress'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-[#dcccac] bg-white/70 p-6">
                <h3 className="text-xl font-semibold text-[#546b41]">Recent Completed Checkpoints</h3>
                {guardDetails.completedCheckpoints?.length ? (
                  <div className="mt-4 space-y-3">
                    {guardDetails.completedCheckpoints.map((checkpoint) => (
                      <div key={`${checkpoint.checkpointId}-${checkpoint.completedAt}`} className="rounded-[1.25rem] border border-[#dcccac] bg-[#fff8ec] p-4">
                        <p className="font-semibold text-[#546b41]">{checkpoint.checkpointId}</p>
                        <p className="mt-1 text-sm text-[#6f745d]">Order {checkpoint.order}</p>
                        <p className="mt-2 text-xs text-[#8b846f]">
                          Completed at {new Date(checkpoint.completedAt).toLocaleString()} by {checkpoint.completedBy}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#6f745d]">No checkpoints completed yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div id="admin-sos-feed" className="space-y-4">
            {leaves.filter((leave) => leave.status === 'pending').length === 0 ? (
              <div className="rounded-[2rem] border border-[#dcccac] bg-white/80 p-8 text-center text-[#6f745d]">No pending leave requests</div>
            ) : (
              leaves
                .filter((leave) => leave.status === 'pending')
                .map((leave) => (
                  <div key={leave._id} className="rounded-[2rem] border border-[#dcccac] bg-white/80 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#546b41]">{leave.guardId?.username}</p>
                        <p className="mt-1 text-sm text-[#6f745d]">{leave.reason}</p>
                        <div className="mt-2 text-xs text-[#8b846f]">
                          <p>From: {new Date(leave.startDate).toLocaleDateString()}</p>
                          <p>To: {new Date(leave.endDate).toLocaleDateString()}</p>
                          <p>Requested: {new Date(leave.requestedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewLeave(leave._id, 'approved')}
                          disabled={loading}
                          className="rounded-2xl bg-[#546b41] px-4 py-2 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533] disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewLeave(leave._id, 'rejected')}
                          disabled={loading}
                          className="rounded-2xl bg-[#b76a4a] px-4 py-2 text-sm font-semibold text-[#fff8ec] hover:bg-[#9f593d] disabled:opacity-50"
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

        {activeTab === 'sos' && (
          <div className="space-y-4">
            {activeSosCount === 0 ? (
              <div className="rounded-[2rem] border border-[#dcccac] bg-white/80 p-8 text-center text-[#6f745d]">No active SOS alerts</div>
            ) : (
              sosAlerts
                .filter((alert) => alert.status === 'active')
                .map((alert) => (
                  <div key={alert._id} className="rounded-[2rem] border border-[#d8a98e] bg-[#fff8ec] p-6 shadow-[0_14px_32px_rgba(84,107,65,0.08)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-[#b76a4a]"></div>
                          <p className="font-bold text-[#b76a4a]">SOS FROM {alert.guardId?.username?.toUpperCase()}</p>
                        </div>
                        <p className="mt-2 text-sm text-[#6f745d]">{alert.reason}</p>
                        <p className="mt-2 text-xs text-[#8b846f]">Time: {new Date(alert.createdAt).toLocaleString()}</p>
                        {alert.location?.latitude && alert.location?.longitude && (
                          <p className="mt-1 text-xs text-[#8b846f]">
                            Location: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => resolveSOS(alert._id)}
                        disabled={loading}
                        className="rounded-2xl bg-[#546b41] px-4 py-2 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533] disabled:opacity-50"
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
