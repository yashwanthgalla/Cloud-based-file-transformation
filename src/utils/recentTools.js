const STORAGE_KEY = 'recentTools'
const MAX_ITEMS = 6

export function readRecentTools() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : []
    if (!Array.isArray(data)) return []
    return data
      .filter((x) => x && typeof x === 'object')
      .filter((x) => typeof x.slug === 'string' && typeof x.title === 'string' && typeof x.path === 'string')
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function trackToolUse(tool) {
  if (!tool?.slug || !tool?.title || !tool?.path) return
  const entry = { slug: tool.slug, title: tool.title, path: tool.path, at: Date.now() }

  const prev = readRecentTools()
  const next = [entry, ...prev.filter((x) => x.slug !== entry.slug)].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}
