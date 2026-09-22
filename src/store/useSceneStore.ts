import { create } from 'zustand'
import type { WindowScene, SceneFormData, BackfillFormData, Gap, BackfillResult } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getScenesByRoute,
  getAllRouteNames,
  getRandomSceneFromRoutes,
  getAllRouteSettings,
  saveRouteSettings as storageSaveRouteSettings,
  deleteRouteSettings as storageDeleteRouteSettings,
} from '@/services/storage'
import { findGaps, getTargetIntervalMinutes, validateBackfill } from '@/utils/gapRules'

interface SceneState {
  scenes: WindowScene[]
  routeNames: string[]
  currentRouteScenes: WindowScene[]
  selectedRoute: string
  randomScene: WindowScene | null
  /** 线路名 -> 设置 */
  routeSettings: Record<string, { targetIntervalMinutes: number }>
  /** 线路名 -> 当前漏采缺口列表（按时间升序） */
  gapsByRoute: Record<string, Gap[]>
  /** 仍有未补缺口的线路名集合 */
  routesWithGaps: string[]
  /** 没有未补缺口、可参与灵感抽取的线路名集合 */
  eligibleRoutes: string[]

  loadAll: () => void
  saveScene: (data: SceneFormData) => void
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  /** 设置线路目标间隔（分钟）；未设置时规则层按二十分钟处理 */
  setRouteTargetInterval: (routeName: string, minutes: number | null) => void
  /** 向指定缺口补录一条记录；校验失败则整次拒绝，原记录与缺口状态不变 */
  backfillGap: (gap: Gap, data: BackfillFormData) => BackfillResult
  refreshRandom: () => void
}

/** 根据当前记录与设置，重算所有线路的缺口状态 */
function computeGapState(
  scenes: WindowScene[],
  settings: Record<string, { targetIntervalMinutes: number }>
): Pick<SceneState, 'gapsByRoute' | 'routesWithGaps' | 'eligibleRoutes'> {
  const routes = Array.from(new Set(scenes.map((s) => s.routeName)))
  const gapsByRoute: Record<string, Gap[]> = {}
  const routesWithGaps: string[] = []
  for (const route of routes) {
    const gaps = findGaps(
      scenes.filter((s) => s.routeName === route),
      getTargetIntervalMinutes(settings[route])
    )
    if (gaps.length > 0) {
      gapsByRoute[route] = gaps
      routesWithGaps.push(route)
    }
  }
  return {
    gapsByRoute,
    routesWithGaps,
    eligibleRoutes: routes.filter((r) => !routesWithGaps.includes(r)),
  }
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  routeNames: [],
  currentRouteScenes: [],
  selectedRoute: '',
  randomScene: null,
  routeSettings: {},
  gapsByRoute: {},
  routesWithGaps: [],
  eligibleRoutes: [],

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const routeSettings = getAllRouteSettings()
    set({
      scenes,
      routeNames,
      routeSettings,
      ...computeGapState(scenes, routeSettings),
    })
  },

  saveScene: (data: SceneFormData) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    storageSaveScene(scene)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const routeSettings = getAllRouteSettings()
    set((state) => ({
      scenes,
      routeNames,
      routeSettings,
      currentRouteScenes: state.selectedRoute ? getScenesByRoute(state.selectedRoute) : [],
      ...computeGapState(scenes, routeSettings),
    }))
  },

  deleteScene: (id: string) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const routeSettings = getAllRouteSettings()
    set((state) => ({
      scenes,
      routeNames,
      routeSettings,
      currentRouteScenes: state.selectedRoute ? getScenesByRoute(state.selectedRoute) : [],
      ...computeGapState(scenes, routeSettings),
    }))
  },

  selectRoute: (routeName: string) => {
    const currentRouteScenes = routeName ? getScenesByRoute(routeName) : []
    set({ selectedRoute: routeName, currentRouteScenes })
  },

  setRouteTargetInterval: (routeName, minutes) => {
    if (minutes === null) {
      storageDeleteRouteSettings(routeName)
    } else {
      if (!Number.isFinite(minutes) || minutes <= 0) return
      storageSaveRouteSettings(routeName, { targetIntervalMinutes: minutes })
    }
    // 设置变化立即重算
    const scenes = getAllScenes()
    const routeSettings = getAllRouteSettings()
    set({
      routeSettings,
      ...computeGapState(scenes, routeSettings),
    })
  },

  backfillGap: (gap, data) => {
    // 补录前先按当前状态校验：原因必填，时刻必须落在对应缺口内
    const error = validateBackfill({
      timestamp: data.timestamp,
      gapReason: data.gapReason,
      gap,
    })
    if (error) return { ok: false, error }

    const scene: WindowScene = {
      ...data,
      routeName: data.routeName,
      id: crypto.randomUUID(),
      timestamp: new Date(data.timestamp).toISOString(),
      gapReason: data.gapReason.trim(),
    }
    storageSaveScene(scene)

    const nextScenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const nextSettings = getAllRouteSettings()
    set((state) => ({
      scenes: nextScenes,
      routeNames,
      routeSettings: nextSettings,
      currentRouteScenes: state.selectedRoute ? getScenesByRoute(state.selectedRoute) : [],
      ...computeGapState(nextScenes, nextSettings),
    }))
    return { ok: true }
  },

  refreshRandom: () => {
    // 仍有未补缺口的线路不参与灵感抽取
    const randomScene = getRandomSceneFromRoutes(get().eligibleRoutes)
    set({ randomScene })
  },
}))
