import { useState } from 'react'
import { buildApiUrl } from '../lib/api'

const initialErrors = {
  username: '',
  password: '',
}

function Login({ onSubmit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [errors, setErrors] = useState(initialErrors)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const validate = () => {
    const next = { username: '', password: '' }
    if (!username.trim()) next.username = 'Username is required.'
    if (!password.trim()) next.password = 'Password is required.'
    setErrors(next)
    return !next.username && !next.password
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, profilePhoto }),
      })

      const text = await response.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Unexpected server response: ${text || response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', data.user?.id)
      localStorage.setItem('userName', data.user?.username || '')
      localStorage.setItem('userRole', data.user?.role || '')
      localStorage.setItem('profilePhoto', data.user?.profilePhoto || '')

      if (typeof onSubmit === 'function') {
        onSubmit(data)
      }

      setStatusMessage('Login successful. Redirecting...')

      const role = data.user?.role || ''
      window.location.href = role === 'admin' ? '/admin-dashboard' : '/guard-dashboard'
    } catch (error) {
      setStatusMessage(error?.message || 'Unable to submit login.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#dcccac] bg-[#fff8ec] shadow-[0_24px_80px_rgba(84,107,65,0.16)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[linear-gradient(150deg,#546B41_0%,#70895c_55%,#99AD7A_100%)] p-10 text-[#fff8ec] lg:block">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f5ead4]">MyVigi</p>
          <h1 className="mt-8 max-w-sm text-5xl font-semibold leading-tight">Patrol oversight with a calmer visual system.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#f7f0e4]">
            Sign in to manage routes, patrol progress, SOS alerts, and guard activity from one place.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#546b41]">Login</h1>
            <p className="mt-2 text-sm text-[#6f745d]">Enter your credentials and optionally refresh your profile photo.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="rounded-[1.75rem] border border-[#dcccac] bg-white/70 p-4">
              <p className="text-sm font-medium text-[#546b41]">Profile Photo</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-[1.5rem] border border-[#dcccac] bg-[#fff8ec]">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-[#99ad7a]">
                      Preview
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] hover:bg-[#435533]">
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (e) => setProfilePhoto(e.target?.result || '')
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                  <p className="mt-2 text-sm text-[#6f745d]">The uploaded photo will be shown on your dashboard after sign in.</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#546b41]">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#2f3b22] outline-none transition focus:border-[#99ad7a] focus:ring-2 focus:ring-[#dcccac]"
                placeholder="Enter your username"
              />
              {errors.username && <p className="mt-2 text-sm text-[#9b5c3d]">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#546b41]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#2f3b22] outline-none transition focus:border-[#99ad7a] focus:ring-2 focus:ring-[#dcccac]"
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-2 text-sm text-[#9b5c3d]">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#546b41] px-4 py-3 text-sm font-semibold text-[#fff8ec] transition hover:bg-[#435533] disabled:cursor-not-allowed disabled:bg-[#99ad7a]"
            >
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#6f745d]">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => (window.location.href = '/signup')}
              className="font-semibold text-[#546b41] hover:text-[#435533]"
            >
              Sign up
            </button>
          </div>

          {statusMessage && (
            <div className="mt-6 rounded-2xl border border-[#dcccac] bg-white px-4 py-3 text-sm text-[#546b41]">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
