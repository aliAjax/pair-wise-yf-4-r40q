import type { WindowScene, RouteSettings } from '@/types'

const STORAGE_KEY = 'bus_window_scenes'
const SETTINGS_KEY = 'bus_route_settings'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WindowScene[]) : []
  } catch {
    return []
  }
}

export function saveScene(scene: WindowScene): void {
  const scenes = getAllScenes()
  scenes.push(scene)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function deleteScene(id: string): void {
  const scenes = getAllScenes().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAllRouteNames(): string[] {
  const scenes = getAllScenes()
  const routeSet = new Set(scenes.map((s) => s.routeName))
  return Array.from(routeSet).sort()
}

export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}

/** 仅从指定线路集合中随机取一条记录 */
export function getRandomSceneFromRoutes(routeNames: string[]): WindowScene | null {
  if (routeNames.length === 0) return null
  const allowed = new Set(routeNames)
  const scenes = getAllScenes().filter((s) => allowed.has(s.routeName))
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}

/** 读取全部线路设置：{ 线路名: { targetIntervalMinutes } } */
export function getAllRouteSettings(): Record<string, RouteSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, RouteSettings>) : {}
  } catch {
    return {}
  }
}

export function getRouteSettings(routeName: string): RouteSettings | undefined {
  return getAllRouteSettings()[routeName]
}

export function saveRouteSettings(routeName: string, settings: RouteSettings): void {
  const all = getAllRouteSettings()
  all[routeName] = settings
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all))
}

/** 移除线路设置，使该线路恢复默认目标间隔 */
export function deleteRouteSettings(routeName: string): void {
  const all = getAllRouteSettings()
  delete all[routeName]
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all))
}
