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
  /** 补录记录必填：漏采缺口原因；普通采样记录不填 */
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

/** 一条补录表单：缺口原因 + 采样时刻均为必填 */
export interface GapFillData {
  timestamp: string
  gapReason: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/** 相邻两条记录之间的漏采缺口 */
export interface RouteGap {
  routeName: string
  startSceneId: string
  endSceneId: string
  startTime: string
  endTime: string
  /** 缺口时长（分钟） */
  durationMin: number
  /** 该线路目标采样间隔（分钟） */
  targetMin: number
  /** 是否已被补录记录填补 */
  filled: boolean
}

/** 补录校验结果：失败时整次拒绝 */
export interface GapFillValidation {
  ok: boolean
  error?: string
}
