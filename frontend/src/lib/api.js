const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || ''

export const apiBaseUrl = rawApiUrl.replace(/\/+$/, '')

export function buildApiUrl(path) {
  if (!path) {
    return apiBaseUrl || '/'
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath
}

export function getSocketUrl() {
  return apiBaseUrl || undefined
}
