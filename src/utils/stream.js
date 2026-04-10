const liveBase = (import.meta.env.VITE_LIVE_BASE_URL || '').trim()

function getLiveBase() {
  if (liveBase) return liveBase
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

function joinLiveBase(path) {
  if (!path) return ''
  const base = getLiveBase()
  if (!base) return path

  if (/^https?:\/\//i.test(base)) {
    return new URL(path.replace(/^\//, ''), `${base.replace(/\/+$/, '')}/`).toString()
  }

  return `${base.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
}

export function resolveLivePlaybackUrl(rawUrl) {
  if (!rawUrl) return ''

  try {
    const url = new URL(rawUrl)
    return joinLiveBase(`${url.pathname}${url.search}${url.hash}`)
  } catch {
    if (rawUrl.startsWith('/')) {
      return joinLiveBase(rawUrl)
    }
    return rawUrl
  }
}

export function buildCameraLiveUrl(cameraId) {
  if (!cameraId) return ''
  return joinLiveBase(`/live/cam${cameraId}.live.flv`)
}
