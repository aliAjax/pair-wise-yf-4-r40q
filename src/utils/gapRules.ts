import type {
  WindowScene,
  RouteGap,
  GapFillData,
  GapFillValidation,
} from '@/types'

/** 未为线路设置目标间隔时，默认二十分钟 */
export const DEFAULT_TARGET_MIN = 20

/** 缺口阈值：相邻记录超过两倍目标间隔即视为漏采缺口 */
export const GAP_MULTIPLIER = 2

export type RouteIntervals = Record<string, number>

export function getTargetMin(
  routeName: string,
  intervals: RouteIntervals
): number {
  const v = intervals[routeName]
  return typeof v === 'number' && Number.isFinite(v) && v > 0
    ? v
    : DEFAULT_TARGET_MIN
}

function toTime(iso: string): number {
  return new Date(iso).getTime()
}

/** 补录记录：填写了缺口原因的记录；不参与缺口骨架，只用于填补缺口 */
function isMakeup(scene: WindowScene): boolean {
  return !!scene.gapReason?.trim()
}

/**
 * 计算一条线路的全部漏采缺口：
 * 以普通采样记录（无缺口原因）为骨架按时刻排序，
 * 相邻骨架记录超过两倍目标间隔即为一个缺口；
 * 缺口开区间内存在带缺口原因的补录记录，则该缺口已补。
 * 若骨架中间插入新的普通采样，补录只覆盖其时刻所落入的那段缺口。
 */
export function getRouteGaps(
  routeName: string,
  scenes: WindowScene[],
  intervals: RouteIntervals
): RouteGap[] {
  const targetMin = getTargetMin(routeName, intervals)
  const thresholdMs = targetMin * GAP_MULTIPLIER * 60_000

  const routeScenes = scenes.filter((s) => s.routeName === routeName)
  const backbone = routeScenes
    .filter((s) => !isMakeup(s))
    .sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp))

  const gaps: RouteGap[] = []
  for (let i = 0; i < backbone.length - 1; i++) {
    const start = backbone[i]
    const end = backbone[i + 1]
    const startMs = toTime(start.timestamp)
    const endMs = toTime(end.timestamp)
    if (endMs - startMs <= thresholdMs) continue

    const filled = routeScenes.some(
      (s) =>
        isMakeup(s) &&
        toTime(s.timestamp) > startMs &&
        toTime(s.timestamp) < endMs
    )

    gaps.push({
      routeName,
      startSceneId: start.id,
      endSceneId: end.id,
      startTime: start.timestamp,
      endTime: end.timestamp,
      durationMin: Math.round((endMs - startMs) / 60_000),
      targetMin,
      filled,
    })
  }
  return gaps
}

/** 该线路是否仍有未补缺口 */
export function hasOpenGap(
  routeName: string,
  scenes: WindowScene[],
  intervals: RouteIntervals
): boolean {
  return getRouteGaps(routeName, scenes, intervals).some((g) => !g.filled)
}

/** 仍有未补缺口的线路集合 */
export function getRoutesWithOpenGaps(
  routeNames: string[],
  scenes: WindowScene[],
  intervals: RouteIntervals
): Set<string> {
  return new Set(
    routeNames.filter((r) => hasOpenGap(r, scenes, intervals))
  )
}

/** 过滤掉仍有未补缺口线路的记录，供灵感抽取使用 */
export function filterInspirableScenes(
  scenes: WindowScene[],
  intervals: RouteIntervals
): WindowScene[] {
  const routeNames = Array.from(new Set(scenes.map((s) => s.routeName)))
  const blocked = getRoutesWithOpenGaps(routeNames, scenes, intervals)
  return scenes.filter((s) => !blocked.has(s.routeName))
}

function findGapAt(
  gaps: RouteGap[],
  ms: number
): RouteGap | undefined {
  return gaps.find(
    (g) => ms > toTime(g.startTime) && ms < toTime(g.endTime)
  )
}

/**
 * 校验一次补录：
 * - 必须填写缺口原因；
 * - 采样时刻必须是有效时间，且落在该线路某个当前未补缺口内；
 * 任一不满足则整次拒绝，原记录与缺口状态不变。
 */
export function validateGapFill(
  routeName: string,
  data: GapFillData,
  scenes: WindowScene[],
  intervals: RouteIntervals
): GapFillValidation {
  if (!data.gapReason?.trim()) {
    return { ok: false, error: '补录必须填写缺口原因' }
  }

  const ms = new Date(data.timestamp).getTime()
  if (!Number.isFinite(ms)) {
    return { ok: false, error: '采样时刻无效' }
  }

  const gaps = getRouteGaps(routeName, scenes, intervals)
  if (gaps.length === 0) {
    return { ok: false, error: '该线路没有需要补录的漏采缺口' }
  }

  const gap = findGapAt(gaps, ms)
  if (!gap) {
    return { ok: false, error: '采样时刻不在任何漏采缺口内' }
  }
  if (gap.filled) {
    return { ok: false, error: '该缺口已补录，请勿重复补录' }
  }

  return { ok: true }
}

/** 找出采样时刻所落入的未补缺口（供页面定位使用） */
export function findOpenGapAt(
  routeName: string,
  timestamp: string,
  scenes: WindowScene[],
  intervals: RouteIntervals
): RouteGap | undefined {
  const ms = new Date(timestamp).getTime()
  if (!Number.isFinite(ms)) return undefined
  return getRouteGaps(routeName, scenes, intervals)
    .filter((g) => !g.filled)
    .find((g) => ms > toTime(g.startTime) && ms < toTime(g.endTime))
}

/** datetime-local 字符串（本地时区）转 ISO */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString()
}

/** ISO 转 datetime-local 可接受的本地时间字符串 */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

/** 缺口开区间的中点，作为补录时刻输入框的默认值 */
export function gapMidpointLocalInput(gap: RouteGap): string {
  const mid =
    (toTime(gap.startTime) + toTime(gap.endTime)) / 2
  return isoToLocalInput(new Date(mid).toISOString())
}
