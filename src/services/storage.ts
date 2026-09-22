import type { WindowScene } from '@/types'
import { filterInspirableScenes, type RouteIntervals } from '@/utils/gapRules'

const STORAGE_KEY = 'bus_window_scenes'
const INTERVALS_KEY = 'bus_route_intervals'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
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

/** 各线路目标采样间隔（分钟），未设置的线路不写入，由规则层回退到默认值 */
export function getRouteIntervals(): RouteIntervals {
  try {
    const raw = localStorage.getItem(INTERVALS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as RouteIntervals
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveRouteInterval(routeName: string, minutes: number): void {
  const intervals = getRouteIntervals()
  intervals[routeName] = minutes
  localStorage.setItem(INTERVALS_KEY, JSON.stringify(intervals))
}

/** 仍有未补缺口的线路不参与灵感抽取 */
export function getRandomScene(): WindowScene | null {
  const scenes = filterInspirableScenes(getAllScenes(), getRouteIntervals())
  if (scenes.length === 0) return null
  return scenes[Math.floor(Math.random() * scenes.length)]
}
