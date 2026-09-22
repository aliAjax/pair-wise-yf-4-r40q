export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
  /** 补录原因：仅补录进缺口的记录携带 */
  gapReason?: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/** 补录表单：在常规窗景字段外，必须提供采样时刻与缺口原因 */
export interface BackfillFormData extends SceneFormData {
  timestamp: string
  gapReason: string
}

/** 线路设置：目标采样间隔（分钟），未设置时按 DEFAULT_TARGET_INTERVAL_MINUTES */
export interface RouteSettings {
  targetIntervalMinutes: number
}

/** 相邻两条记录之间的漏采缺口 */
export interface Gap {
  /** 较早一条记录的 id */
  startId: string
  startTime: string
  /** 较晚一条记录的 id */
  endId: string
  endTime: string
  durationMinutes: number
}

export type BackfillResult = { ok: true } | { ok: false; error: string }
