import { useState } from 'react'

const initialErrors = {
  username: '',
  email: '',
  password: '',
  role: '',
}

function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('guard')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [errors, setErrors] = useState(initialErrors)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const validate = () => {
    const next = { username: '', email: '', password: '', role: '' }
    if (!username.trim()) next.username = 'Username is required.'
    if (!email.trim()) next.email = 'Email is required.'
    if (!password.trim()) next.password = 'Password is required.'
    if (!role) next.role = 'Role is required.'
    setErrors(next)
    return !next.username && !next.email && !next.password && !next.role
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMessage('')

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role, profilePhoto }),
      })

      const text = await response.text()
      let data = null
      try {
        data = JSON.parse(text)
      } catch (jsonError) {
        throw new Error(`Unexpected response from server: ${text || response.statusText}`)
      }

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('userRole', data.user?.role || 'guard')
      localStorage.setItem('userId', data.user?.id)
      localStorage.setItem('userName', data.user?.username || '')
      localStorage.setItem('profilePhoto', data.user?.profilePhoto || '')

      setStatusMessage('Signup successful. Redirecting...')
      window.location.href = data.user?.role === 'admin' ? '/admin-dashboard' : '/guard-dashboard'
    } catch (error) {
      setStatusMessage(error?.message || 'Unable to complete signup.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-500">Sign up to manage patrol and guard operations.</p>
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
              placeholder="Choose a username"
            />
            {errors.username && <p className="mt-2 text-sm text-rose-600">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Enter your email"
            />
            {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email}</p>}
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
              placeholder="Create a secure password"
            />
            {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-slate-700">
              Profile Photo
            </label>
            <div className="mt-2 flex items-center gap-4">
              <label className="inline-flex min-h-[3rem] min-w-[3rem] cursor-pointer items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile preview" className="h-12 w-12 rounded-3xl object-cover" />
                ) : (
                  'Upload'
                )}
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      setProfilePhoto(e.target.result || '')
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              <p className="text-sm text-slate-500">Optional: Upload a profile photo for dashboard display.</p>
            </div>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="guard">Guard</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p className="mt-2 text-sm text-rose-600">{errors.role}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Login
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

export default Signup
