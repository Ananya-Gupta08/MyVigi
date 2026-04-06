import { useEffect, useState } from 'react'

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
  const [logs, setLogs] = useState([
    {
      id: '1',
      checkpoint: 'CHK101 - Gate A',
      status: 'Completed',
      timestamp: '2026-04-06 09:12 AM',
      notes: 'Patrol completed successfully.',
    },
    {
      id: '2',
      checkpoint: 'CHK103 - Warehouse',
      status: 'Completed',
      timestamp: '2026-04-06 09:45 AM',
      notes: 'Checked QR and confirmed area clear.',
    },
    {
      id: '3',
      checkpoint: 'CHK105 - Parking Lot',
      status: 'Completed',
      timestamp: '2026-04-06 10:08 AM',
      notes: 'No issues found.',
    },
  ])
  const [statusMessage, setStatusMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeShift, setActiveShift] = useState(null)
  const [sosNotifications, setSosNotifications] = useState([])

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
      const [activeData, notificationsData] = await Promise.all([
        apiGet('/api/shift/active'),
        apiGet('/api/request/notifications'),
      ])
      setActiveShift(activeData.shift)
      setSosNotifications(notificationsData.notifications || [])
    } catch (error) {
      setStatusMessage(error?.message || 'Unable to load dashboard state.')
    }
  }

  useEffect(() => {
    loadDashboardState()
  }, [])

  const handleUserAction = async (action) => {
    setStatusMessage('')
    setBusy(true)

    try {
      await action()
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
            qrCode: 'SHIFT_START',
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }
        : { qrCode: 'SHIFT_START' }

      const data = await apiPost('/api/shift/start', payload)
      setActiveShift(data.shift)
      setStatusMessage(
        `Shift started at ${new Date(data.shift.startTime).toLocaleTimeString()}.`
      )
    })
  }

  const handleScanQR = () => {
    handleUserAction(async () => {
      const checkpointId = window.prompt('Enter the checkpoint ID from the QR code:')?.trim()
      if (!checkpointId) {
        setStatusMessage('Checkpoint scan canceled.')
        return
      }

      const data = await apiPost('/api/patrol/scan', { checkpointId })
      setStatusMessage(data.message || 'Checkpoint scanned successfully.')
      setLogs((previousLogs) => [
        {
          id: `scan-${Date.now()}`,
          checkpoint: checkpointId,
          status: 'Completed',
          timestamp: new Date().toLocaleString(),
          notes: 'QR scan recorded successfully.',
        },
        ...previousLogs,
      ])
    })
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

  const handleEarlyLeave = () => {
    handleUserAction(async () => {
      const reason = window.prompt('Enter a short reason for the early leave request:')?.trim()
      if (!reason) {
        setStatusMessage('Early leave request canceled.')
        return
      }

      const data = await apiPost('/api/request/create', {
        type: 'early_exit',
        reason,
      })
      setStatusMessage(data.message || 'Early leave request submitted.')
    })
  }

  const handleSOS = () => {
    handleUserAction(async () => {
      const currentLocation = await getCurrentLocation()
      const reason = window.prompt('Enter a brief SOS description:')?.trim() || 'SOS alert from guard'
      const payload = {
        type: 'sos',
        reason,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      }
      const data = await apiPost('/api/request/create', payload)
      setStatusMessage(data.message || 'SOS alert sent.')
      await loadDashboardState()
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Guard dashboard</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">Ready for your next patrol</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Start your shift, scan checkpoints, and review recent patrol activity from one place.
              </p>
              {activeShift ? (
                <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Active shift started at {new Date(activeShift.startTime).toLocaleTimeString()}.
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  No active shift. Click Start Shift to register your beginning time.
                </div>
              )}
              {statusMessage && (
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {statusMessage}
                </div>
              )}
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto">
              <ActionCard
                title="Start Shift"
                description="Begin your shift and mark yourself active."
                onClick={handleStartShift}
                variant="primary"
                disabled={busy || Boolean(activeShift)}
              />
              <ActionCard
                title="Scan QR"
                description="Open the QR scanner to register a checkpoint."
                onClick={handleScanQR}
                variant="secondary"
                disabled={busy}
              />
              <ActionCard
                title="End Shift"
                description="Complete your current shift when patrol is done."
                onClick={handleEndShift}
                variant="secondary"
                disabled={busy || !activeShift}
              />
              <ActionCard
                title="Early Leave"
                description="Request an early leave if needed."
                onClick={handleEarlyLeave}
                variant="secondary"
                disabled={busy}
              />
              <ActionCard
                title="SOS"
                description="Send a quick alert if you need immediate help."
                onClick={handleSOS}
                variant="danger"
                disabled={busy}
              />
            </div>
          </div>
        </div>

        {sosNotifications.length > 0 && (
          <section className="mb-6 rounded-[2rem] bg-rose-50 p-6 shadow-xl shadow-rose-200/40 ring-1 ring-rose-200 sm:p-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-rose-900">SOS Alerts</h2>
                <p className="mt-2 text-sm text-rose-700">Recent SOS alerts from other guards.</p>
              </div>
            </div>
            <div className="space-y-3">
              {sosNotifications.map((alert) => (
                <div key={alert.id} className="rounded-3xl border border-rose-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-rose-900">SOS from {alert.from}</p>
                      <p className="mt-1 text-xs text-rose-600">{new Date(alert.time).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{alert.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{alert.reason}</p>
                  {alert.location?.latitude && alert.location?.longitude && (
                    <p className="mt-3 text-xs text-slate-500">
                      Location: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Recent patrol logs</h2>
              <p className="mt-2 text-sm text-slate-600">Track your completed checkpoints and scan history.</p>
            </div>
            <div className="rounded-3xl bg-slate-100 px-4 py-2 text-sm text-slate-700">Completed patrols only</div>
          </div>

          <div className="grid gap-4">
            {logs.map((log) => (
              <PatrolLogItem key={log.id} log={log} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default GuardDashboard
