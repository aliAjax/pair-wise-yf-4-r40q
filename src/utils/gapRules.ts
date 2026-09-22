import type { WindowScene, Gap } from '@/types'

/** 未设置目标间隔时的默认值（分钟） */
export const DEFAULT_TARGET_INTERVAL_MINUTES = 20

/** 相邻记录超过目标间隔的倍数即视为漏采缺口 */
export const GAP_THRESHOLD_FACTOR = 2

export function getTargetIntervalMinutes(
  settings?: { targetIntervalMinutes?: number } | null
): number {
  const value = settings?.targetIntervalMinutes
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_TARGET_INTERVAL_MINUTES
}

/**
 * 按目标间隔检查一条线路的漏采缺口。
 * 相邻两条记录的时间差超过两倍目标间隔即为一个缺口。
 */
export function findGaps(scenes: WindowScene[], targetIntervalMinutes: number): Gap[] {
  const sorted = [...scenes]
    .filter((s) => !Number.isNaN(new Date(s.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const limit = targetIntervalMinutes * GAP_THRESHOLD_FACTOR
  const gaps: Gap[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    const durationMinutes =
      (new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60000
    if (durationMinutes > limit) {
      gaps.push({
        startId: start.id,
        startTime: start.timestamp,
        endId: end.id,
        endTime: end.timestamp,
        durationMinutes: Math.round(durationMinutes),
      })
    }
  }
  return gaps
}

/** 缺口时长展示：分钟或“x 小时 y 分” */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
}

/**
 * 校验补录是否合法：
 * - 采样时刻必须是有效时间
 * - 采样时刻必须严格落在指定缺口内部（与缺口两端的记录之间）
 * - 缺口原因必须填写
 */
export function validateBackfill(params: {
  timestamp: string
  gapReason: string
  gap: Pick<Gap, 'startTime' | 'endTime'>
}): string | null {
  const { timestamp, gapReason, gap } = params
  const t = new Date(timestamp).getTime()
  if (Number.isNaN(t)) return '请选择有效的采样时刻'
  if (!gapReason.trim()) return '请填写缺口原因'
  if (
    t <= new Date(gap.startTime).getTime() ||
    t >= new Date(gap.endTime).getTime()
  ) {
    return '采样时刻必须落在对应缺口之内'
  }
  return null
}
