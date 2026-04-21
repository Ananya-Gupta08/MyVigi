import { useEffect, useState } from 'react'

function GuardPatrol() {
  const [route, setRoute] = useState([])
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanMode, setScanMode] = useState('')
  const [scanFile, setScanFile] = useState(null)
  const [scanText, setScanText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
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

  const parseScanResult = (value) => {
    if (!value) return ''
    const normalized = value.toLowerCase().trim()
    const orderMatch = normalized.match(/p(\d+)/) || normalized.match(/checkpoint\s*(\d+)/) || normalized.match(/(\d+)/)
    if (orderMatch) {
      return `p${orderMatch[1]}`
    }
    return normalized
  }

  const loadRoute = async () => {
    try {
      const data = await apiGet('/api/patrol/route')
      setRoute(data.route || [])
    } catch (error) {
      setStatusMessage(error?.message || 'Could not load patrol route')
    }
  }

  useEffect(() => {
    loadRoute()
  }, [])

  const openScanModal = (checkpoint) => {
    setSelectedCheckpoint(checkpoint)
    setScanModalOpen(true)
    setScanMode('')
    setScanFile(null)
    setScanText('')
    setStatusMessage('')
  }

  const closeScanModal = () => {
    setScanModalOpen(false)
    setSelectedCheckpoint(null)
    setScanMode('')
    setScanFile(null)
    setScanText('')
    setStatusMessage('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setScanFile(file)
    const detected = parseScanResult(file.name)
    setScanText(detected)
  }

  const handleScanSubmit = async () => {
    if (!selectedCheckpoint) {
      setStatusMessage('Select a checkpoint to scan.')
      return
    }

    const effectiveText = scanText || (scanFile ? parseScanResult(scanFile.name) : '')
    if (!effectiveText) {
      setStatusMessage('Please upload an image or enter the scanned QR text.')
      return
    }

    const expectedCheckpointIds = [
      selectedCheckpoint.checkpointId.toLowerCase(),
      `p${selectedCheckpoint.order}`,
      `checkpoint${selectedCheckpoint.order}`,
    ]

    if (!expectedCheckpointIds.includes(effectiveText.toLowerCase())) {
      setStatusMessage(`Scanned value does not match expected checkpoint for circle ${selectedCheckpoint.order}.`)
      return
    }

    setLoading(true)
    try {
      const data = await apiPost('/api/patrol/scan', {
        checkpointId: selectedCheckpoint.checkpointId,
      })
      setStatusMessage(data.message || `Checkpoint ${selectedCheckpoint.checkpointId} scanned successfully.`)
      await loadRoute()
      setTimeout(closeScanModal, 1200)
    } catch (error) {
      setStatusMessage(error?.message || 'Failed to process scan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    window.location.href = '/guard-dashboard'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patrol Route</h1>
            <p className="text-sm text-slate-500">Scan your assigned checkpoints in order.</p>
          </div>
          <button
            onClick={handleBack}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Assigned Patrol Route</h2>
            <p className="mt-2 text-sm text-slate-600">Tap the next checkpoint circle to scan with camera or upload from your device.</p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {route.map((checkpoint) => (
                <button
                  key={checkpoint.checkpointId}
                  type="button"
                  onClick={() => openScanModal(checkpoint)}
                  disabled={checkpoint.status === 'completed'}
                  className={`group flex flex-col items-center justify-center rounded-3xl border p-5 text-center transition hover:-translate-y-0.5 hover:ring-2 hover:ring-sky-200 ${
                    checkpoint.status === 'completed'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-900'
                  } ${checkpoint.status !== 'completed' ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-900 shadow-sm">
                    {checkpoint.order}
                  </div>
                  <span className="text-sm font-semibold">{checkpoint.checkpointId}</span>
                  <span className="mt-1 text-xs text-slate-500">{checkpoint.status === 'completed' ? 'Completed' : 'Pending'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Route Progress</h2>
            <div className="mt-4 space-y-3">
              {route.map((checkpoint) => (
                <div key={checkpoint.checkpointId} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{checkpoint.checkpointId}</p>
                    <p className="text-xs text-slate-500">{checkpoint.location}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${checkpoint.status === 'completed' ? 'text-emerald-700' : 'text-slate-600'}`}>{checkpoint.status}</p>
                    {checkpoint.completedAt && (
                      <p className="text-xs text-slate-500">{new Date(checkpoint.completedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {scanModalOpen && selectedCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Scan checkpoint {selectedCheckpoint.order}</h3>
                <p className="mt-2 text-sm text-slate-600">Use camera or upload from device to confirm your patrol.</p>
              </div>
              <button
                type="button"
                onClick={closeScanModal}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="font-semibold text-slate-900">Scan with camera</h4>
                <p className="mt-2 text-sm text-slate-600">Take a photo of the QR code with your phone camera.</p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">
                  Choose camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      setScanMode('camera')
                      handleFileChange(e)
                    }}
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="font-semibold text-slate-900">Upload from device</h4>
                <p className="mt-2 text-sm text-slate-600">Choose a QR snapshot or device photo file.</p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  Upload file
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setScanMode('upload')
                      handleFileChange(e)
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Detected QR value</label>
                <input
                  type="text"
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Type or confirm the scanned QR payload"
                />
              </div>

              {statusMessage && (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{statusMessage}</div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeScanModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScanSubmit}
                  disabled={loading}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? 'Scanning...' : `Scan checkpoint ${selectedCheckpoint.order}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuardPatrol
