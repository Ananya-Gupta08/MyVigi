import { useState } from 'react'

const initialErrors = {
  username: '',
  password: '',
}

function Login({ onSubmit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const text = await response.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
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
      const redirectTo = role === 'admin' ? '/admin-dashboard' : '/guard-dashboard'
      window.location.href = redirectTo
    } catch (error) {
      setStatusMessage(error?.message || 'Unable to submit login.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Login</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your credentials to access the guard or admin dashboard.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Enter your username"
            />
            {errors.username && <p className="mt-2 text-sm text-rose-600">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Enter your password"
            />
            {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => (window.location.href = '/signup')}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Sign up
          </button>
        </div>

        {statusMessage && (
          <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
