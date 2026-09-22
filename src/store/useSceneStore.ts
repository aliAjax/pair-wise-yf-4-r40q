import { create } from 'zustand'
import type { WindowScene, SceneFormData, GapFillData } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomScene,
  getRouteIntervals,
  saveRouteInterval,
} from '@/services/storage'
import {
  validateGapFill,
  getRouteGaps,
  getRoutesWithOpenGaps,
  type RouteIntervals,
} from '@/utils/gapRules'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  /** 各线路目标采样间隔（分钟） */
  routeIntervals: RouteIntervals
  /** 当前选中线路的漏采缺口（补录或移除后立即重算） */
  currentRouteGaps: ReturnType<typeof getRouteGaps>
  /** 仍有未补缺口的线路集合，灵感抽取时排除 */
  blockedRoutes: Set<string>

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
  setRouteInterval: (routeName: string, minutes: number) => void
  /** 补录缺口；校验失败则整次拒绝，返回错误信息，成功返回 null */
  fillGap: (routeName: string, data: GapFillData) => string | null
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,
  routeIntervals: {},
  currentRouteGaps: [],
  blockedRoutes: new Set<string>(),

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const routeIntervals = getRouteIntervals()
    const blockedRoutes = getRoutesWithOpenGaps(
      routeNames,
      scenes,
      routeIntervals
    )
    const { selectedRoute } = get()
    set({
      scenes,
      routeNames,
      routeIntervals,
      blockedRoutes,
      currentRouteScenes: selectedRoute
        ? getScenesByRoute(selectedRoute)
        : [],
      currentRouteGaps: selectedRoute
        ? getRouteGaps(selectedRoute, scenes, routeIntervals)
        : [],
    })
  },

  saveScene: (data) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    get().loadAll()
  },

  deleteScene: (id) => {
    storageDeleteScene(id)
    get().loadAll()
  },

  selectRoute: (routeName) => {
    const { scenes, routeIntervals } = get()
    set({
      selectedRoute: routeName,
      currentRouteScenes: routeName ? getScenesByRoute(routeName) : [],
      currentRouteGaps: routeName
        ? getRouteGaps(routeName, scenes, routeIntervals)
        : [],
    })
  },

  refreshRandom: () => {
    const randomScene = getRandomScene()
    set({ randomScene })
  },

  setRouteInterval: (routeName, minutes) => {
    saveRouteInterval(routeName, minutes)
    get().loadAll()
  },

  fillGap: (routeName, data) => {
    const { scenes, routeIntervals } = get()
    const result = validateGapFill(routeName, data, scenes, routeIntervals)
    if (!result.ok) {
      // 整次拒绝：原记录和缺口状态不变
      return result.error ?? '补录被拒绝'
    }

    const scene: WindowScene = {
      id: crypto.randomUUID(),
      routeName,
      segment: data.segment,
      seatDirection: data.seatDirection,
      timestamp: new Date(data.timestamp).toISOString(),
      weather: data.weather,
      signText: data.signText,
      treeDensity: data.treeDensity,
      pedestrianStatus: data.pedestrianStatus,
      note: data.note,
      gapReason: data.gapReason.trim(),
    }
    storageSaveScene(scene)
    get().loadAll()
    return null
  },
}))
