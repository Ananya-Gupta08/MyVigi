import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildApiUrl } from '../lib/api'

const normalizeScanValue = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '')

async function detectQrFromFile(file) {
  if (!file) {
    return ''
  }

  if (typeof window === 'undefined' || typeof window.BarcodeDetector === 'undefined') {
    throw new Error('QR detection is not supported in this browser. Use Chrome on mobile or enter the QR value manually.')
  }

  const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
  const bitmap = await createImageBitmap(file)
  const results = await detector.detect(bitmap)
  bitmap.close()

  if (!results.length) {
    throw new Error('No QR code detected in the selected image.')
  }

  return results[0].rawValue || ''
}

function GuardPatrol() {
  const navigate = useNavigate()
  const [route, setRoute] = useState([])
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanMode, setScanMode] = useState('')
  const [scanFileName, setScanFileName] = useState('')
  const [scanText, setScanText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [guardName, setGuardName] = useState(localStorage.getItem('userName') || 'Guard')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
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

  const loadRoute = async () => {
    setRouteLoading(true)
    try {
      const data = await apiGet('/api/patrol/route')
      setRoute(data.route || [])
      setGuardName(data.guard?.username || localStorage.getItem('userName') || 'Guard')
    } catch (error) {
      setStatusMessage(error?.message || 'Could not load patrol route')
    } finally {
      setRouteLoading(false)
    }
  }

  useEffect(() => {
    loadRoute()
  }, [])

  const openScanModal = (checkpoint) => {
    if (!checkpoint.canScan && checkpoint.status !== 'completed') {
      setStatusMessage(`Checkpoint ${checkpoint.order} is locked. Scan the next pending circle first.`)
      return
    }

    setSelectedCheckpoint(checkpoint)
    setScanModalOpen(true)
    setScanMode('')
    setScanFileName('')
    setScanText('')
    setStatusMessage('')
  }

  const closeScanModal = () => {
    setScanModalOpen(false)
    setSelectedCheckpoint(null)
    setScanMode('')
    setScanFileName('')
    setScanText('')
  }

  const handleFileChange = async (event, mode) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setScanMode(mode)
    setScanFileName(file.name)
    setStatusMessage('Detecting QR code...')

    try {
      const detectedValue = await detectQrFromFile(file)
      setScanText(detectedValue)
      setStatusMessage(`QR detected: ${detectedValue}`)
    } catch (error) {
      setScanText('')
      setStatusMessage(error?.message || 'Unable to detect QR code from the selected image.')
    }
  }

  const handleScanSubmit = async () => {
    if (!selectedCheckpoint) {
      setStatusMessage('Select a checkpoint to scan.')
      return
    }

    const effectiveText = normalizeScanValue(scanText)
    if (!effectiveText) {
      setStatusMessage('Please scan with camera, upload an image, or enter the QR value manually.')
      return
    }

    const expectedValues = [
      selectedCheckpoint.checkpointId,
      `p${selectedCheckpoint.order}`,
      `checkpoint${selectedCheckpoint.order}`,
    ].map(normalizeScanValue)

    if (!expectedValues.includes(effectiveText)) {
      setStatusMessage(`Detected QR value does not match circle ${selectedCheckpoint.order}.`)
      return
    }

    setLoading(true)
    try {
      const data = await apiPost('/api/patrol/scan', {
        checkpointId: selectedCheckpoint.checkpointId,
        scannedValue: scanText,
      })
      setStatusMessage(
        data.message || `Circle ${selectedCheckpoint.order} checkpoint completed at ${new Date().toLocaleTimeString()}.`
      )
      await loadRoute()
      setTimeout(() => {
        closeScanModal()
      }, 1200)
    } catch (error) {
      setStatusMessage(error?.message || 'Failed to process scan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/guard-dashboard')
  }

  const nextPendingCheckpoint = route.find((checkpoint) => checkpoint.canScan) || null

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patrol Route</h1>
            <p className="text-sm text-slate-500">Assigned route for {guardName}</p>
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
            <p className="mt-2 text-sm text-slate-600">
              Click the next patrol circle to scan. Each completed checkpoint is filled automatically with completion time.
            </p>

            {nextPendingCheckpoint && (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Next checkpoint to scan: {nextPendingCheckpoint.checkpointId} at {nextPendingCheckpoint.location}
              </div>
            )}

            {statusMessage && !scanModalOpen && (
              <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{statusMessage}</div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {route.map((checkpoint) => {
                const isCompleted = checkpoint.status === 'completed'
                const isActive = checkpoint.canScan

                return (
                  <button
                    key={checkpoint.checkpointId}
                    type="button"
                    onClick={() => openScanModal(checkpoint)}
                    disabled={!isCompleted && !isActive}
                    className={`group flex flex-col items-center justify-center rounded-3xl border p-5 text-center transition ${
                      isCompleted
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : isActive
                        ? 'border-sky-300 bg-sky-50 text-slate-900 hover:-translate-y-0.5 hover:ring-2 hover:ring-sky-200'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    }`}
                  >
                    <div
                      className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold shadow-sm ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-slate-400'
                      }`}
                    >
                      {checkpoint.order}
                    </div>
                    <span className="text-sm font-semibold">{checkpoint.checkpointId}</span>
                    <span className="mt-1 text-xs">
                      {isCompleted ? 'Completed' : isActive ? 'Ready to scan' : 'Locked'}
                    </span>
                  </button>
                )
              })}
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
                    <p className={`text-sm font-semibold ${checkpoint.status === 'completed' ? 'text-emerald-700' : checkpoint.canScan ? 'text-sky-700' : 'text-slate-500'}`}>
                      {checkpoint.status === 'completed' ? 'Completed' : checkpoint.canScan ? 'Next to scan' : 'Waiting'}
                    </p>
                    {checkpoint.completedAt ? (
                      <p className="text-xs text-slate-500">
                        {new Date(checkpoint.completedAt).toLocaleString()} by {checkpoint.completedBy}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Pending for {guardName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {routeLoading && <p className="mt-4 text-sm text-slate-500">Refreshing route...</p>}
          </div>
        </div>
      </main>

      {scanModalOpen && selectedCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Scan checkpoint {selectedCheckpoint.order}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Detect the QR for {selectedCheckpoint.checkpointId}. If the QR contains `P{selectedCheckpoint.order}`, this circle will be marked completed.
                </p>
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
                <p className="mt-2 text-sm text-slate-600">Open the device camera and capture the checkpoint QR.</p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">
                  Choose camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, 'camera')}
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h4 className="font-semibold text-slate-900">Upload from device</h4>
                <p className="mt-2 text-sm text-slate-600">Choose a QR image from this device and detect it automatically.</p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  Upload file
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, 'upload')}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Selected mode: {scanMode || 'Not selected'} {scanFileName ? `• ${scanFileName}` : ''}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Detected QR value</label>
                <input
                  type="text"
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="QR payload will appear here"
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
                  {loading ? 'Scanning...' : `Complete circle ${selectedCheckpoint.order}`}
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
