import { useEffect, useState } from 'react'
import {
  Search, Route, X, Trash2, Clock, MapPin, AlertTriangle, Plus,
  Armchair, CloudSun, Signpost, TreePine, Users,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import {
  DEFAULT_TARGET_INTERVAL_MINUTES,
  formatDuration,
  getTargetIntervalMinutes,
} from '@/utils/gapRules'
import type {
  WindowScene, Gap, BackfillFormData,
  Weather, TreeDensity, PedestrianStatus, SeatDirection,
} from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function gapMidpointValue(gap: Gap): string {
  return toLocalInputValue(
    new Date(
      (new Date(gap.startTime).getTime() + new Date(gap.endTime).getTime()) / 2
    ).toISOString()
  )
}

function emptyBackfill(gap: Gap, routeName: string): BackfillFormData {
  return {
    routeName,
    segment: '',
    seatDirection: '左',
    timestamp: gapMidpointValue(gap),
    weather: '晴',
    signText: '',
    treeDensity: '适中',
    pedestrianStatus: '稀少',
    gapReason: '',
    note: '',
  }
}

export default function TimelinePage() {
  const {
    routeNames, selectedRoute, currentRouteScenes, selectRoute, loadAll,
    deleteScene, gapsByRoute, routeSettings, setRouteTargetInterval, backfillGap,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [intervalInput, setIntervalInput] = useState('')
  const [backfillGapState, setBackfillGapState] = useState<Gap | null>(null)
  const [backfillForm, setBackfillForm] = useState<BackfillFormData | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const gaps = selectedRoute ? gapsByRoute[selectedRoute] ?? [] : []
  const targetMinutes = selectedRoute
    ? getTargetIntervalMinutes(routeSettings[selectedRoute])
    : DEFAULT_TARGET_INTERVAL_MINUTES

  // 切换线路时同步间隔输入框
  useEffect(() => {
    if (selectedRoute && routeSettings[selectedRoute]) {
      setIntervalInput(String(routeSettings[selectedRoute].targetIntervalMinutes))
    } else {
      setIntervalInput('')
    }
  }, [selectedRoute, routeSettings])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...currentRouteScenes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const gapAfterMap = new Map(gaps.map((g) => [g.endId, g]))

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  const commitInterval = () => {
    if (!selectedRoute) return
    const trimmed = intervalInput.trim()
    if (trimmed === '') {
      setRouteTargetInterval(selectedRoute, null)
      return
    }
    const minutes = Number(trimmed)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setIntervalInput(
        routeSettings[selectedRoute]
          ? String(routeSettings[selectedRoute].targetIntervalMinutes)
          : ''
      )
      return
    }
    setRouteTargetInterval(selectedRoute, Math.round(minutes))
  }

  const openBackfill = (gap: Gap) => {
    setBackfillGapState(gap)
    setBackfillForm(emptyBackfill(gap, selectedRoute))
    setBackfillError(null)
  }

  const closeBackfill = () => {
    setBackfillGapState(null)
    setBackfillForm(null)
    setBackfillError(null)
  }

  const updateBackfill = <K extends keyof BackfillFormData>(key: K, val: BackfillFormData[K]) =>
    setBackfillForm((prev) => (prev ? { ...prev, [key]: val } : prev))

  const submitBackfill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!backfillGapState || !backfillForm) return
    const result = backfillGap(backfillGapState, backfillForm)
    if (result.ok === false) {
      // 整次拒绝：表单与缺口状态都保持不变
      setBackfillError(result.error)
      return
    }
    closeBackfill()
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索路线..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectRoute('')}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            {filteredRoutes.map((name) => {
              const count = gapsByRoute[name]?.length ?? 0
              return (
                <button
                  key={name}
                  onClick={() => selectRoute(name)}
                  className={`relative rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                    selectedRoute === name
                      ? 'bg-dusk-400 text-teal-950'
                      : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                  }`}
                >
                  <Route className="mr-1 inline w-3 h-3" />
                  {name}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/90 px-1 text-[10px] font-semibold text-teal-950">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {selectedRoute && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-800 bg-teal-900/40 px-3 py-2 text-xs text-mist-400">
              <Clock className="w-3.5 h-3.5 text-dusk-400" />
              <span>
                目标间隔
                <span className="mx-1 text-dusk-300">{targetMinutes}</span>
                分钟，相邻记录超过
                <span className="mx-1 text-dusk-300">{targetMinutes * 2}</span>
                分钟视为漏采
              </span>
              <span className="text-teal-700">·</span>
              <input
                type="number"
                min={1}
                value={intervalInput}
                onChange={(e) => setIntervalInput(e.target.value)}
                onBlur={commitInterval}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder={`默认 ${DEFAULT_TARGET_INTERVAL_MINUTES}`}
                className="w-24 rounded-md border border-teal-800 bg-teal-950/70 px-2 py-1 text-xs text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
              />
              <span className="text-[11px] text-mist-500">分钟（留空恢复默认，失焦生效）</span>
              {gaps.length > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {gaps.length} 处漏采缺口
                </span>
              )}
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {selectedRoute ? '该路线暂无窗景记录' : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {sorted.map((scene) => (
                <div key={scene.id}>
                  <div className="relative flex gap-4">
                    <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                    <div className="w-20 shrink-0 pt-0.5 text-right">
                      <p className="text-xs text-dusk-400">
                        {formatTimestamp(scene.timestamp)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-mist-500">
                        {getTimeOfDay(scene.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailScene(scene)}
                      className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getWeatherIcon(scene.weather)}
                        <span className="text-sm font-semibold text-mist-100">
                          {scene.segment}
                        </span>
                        {scene.gapReason && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                            <Plus className="w-2.5 h-2.5" />补录
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{scene.routeName}</span>
                        <span className="mx-1 text-teal-700">·</span>
                        <span className="text-xs">{scene.seatDirection}侧</span>
                      </div>
                      {scene.note && (
                        <p className="text-xs text-mist-400 line-clamp-2">
                          {scene.note}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {getTreeIcon(scene.treeDensity)}
                        {getPedestrianIcon(scene.pedestrianStatus)}
                        {scene.signText && (
                          <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                            {scene.signText}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {gapAfterMap.get(scene.id) && (() => {
                    const gap = gapAfterMap.get(scene.id)!
                    return (
                      <div className="relative mt-3 flex items-start gap-4">
                        <div className="absolute -left-5 top-1.5 flex h-3 w-3 items-center justify-center">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="w-20 shrink-0" />
                        <div className="flex-1 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-amber-300">
                              漏采缺口 · 间隔 {formatDuration(gap.durationMinutes)}
                            </div>
                            <button
                              onClick={() => openBackfill(gap)}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] text-amber-300 transition-colors hover:bg-amber-500/25"
                            >
                              <Plus className="w-3 h-3" />补录
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-mist-500">
                            {formatTimestamp(gap.startTime)} — {formatTimestamp(gap.endTime)}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detailScene.routeName}</span>
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.gapReason && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-300">
                  缺口原因：{detailScene.gapReason}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}

      {backfillGapState && backfillForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeBackfill}
        >
          <form
            onSubmit={submitBackfill}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto animate-scale-in rounded-2xl border border-amber-500/30 bg-teal-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeBackfill}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-300">补录漏采窗景</h2>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-mist-400">
              {selectedRoute} · 缺口范围 {formatTimestamp(backfillGapState.startTime)} —{' '}
              {formatTimestamp(backfillGapState.endTime)}（间隔{' '}
              {formatDuration(backfillGapState.durationMinutes)}），采样时刻必须落在此区间内。
            </p>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <MapPin className="w-3 h-3" />区间
                  </label>
                  <input
                    required
                    className="w-full rounded-lg bg-teal-950/70 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-amber-400"
                    value={backfillForm.segment}
                    onChange={(e) => updateBackfill('segment', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <Armchair className="w-3 h-3" />座位方向
                  </label>
                  <div className="flex gap-2">
                    {(['左', '右'] as SeatDirection[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateBackfill('seatDirection', d)}
                        className={`flex-1 rounded-lg py-1.5 text-xs transition ${
                          backfillForm.seatDirection === d
                            ? 'border border-amber-400 bg-amber-500/15 text-amber-300'
                            : 'border border-transparent bg-teal-950/70 text-mist-300'
                        }`}
                      >
                        {d}侧
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <Clock className="w-3 h-3" />采样时刻
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={toLocalInputValue(backfillGapState.startTime)}
                    max={toLocalInputValue(backfillGapState.endTime)}
                    className="w-full rounded-lg bg-teal-950/70 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-amber-400 [color-scheme:dark]"
                    value={backfillForm.timestamp}
                    onChange={(e) => updateBackfill('timestamp', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <CloudSun className="w-3 h-3" />天气
                  </label>
                  <select
                    className="w-full rounded-lg bg-teal-950/70 px-2 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-amber-400"
                    value={backfillForm.weather}
                    onChange={(e) => updateBackfill('weather', e.target.value as Weather)}
                  >
                    {WEATHERS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <TreePine className="w-3 h-3" />树木密度
                  </label>
                  <div className="flex gap-1.5">
                    {TREES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateBackfill('treeDensity', t)}
                        className={`flex-1 rounded-lg py-1.5 text-[11px] transition ${
                          backfillForm.treeDensity === t
                            ? 'border border-amber-400 bg-amber-500/15 text-amber-300'
                            : 'border border-transparent bg-teal-950/70 text-mist-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                    <Users className="w-3 h-3" />行人状态
                  </label>
                  <div className="flex gap-1.5">
                    {PEDESTRIANS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateBackfill('pedestrianStatus', p)}
                        className={`flex-1 rounded-lg py-1.5 text-[11px] transition ${
                          backfillForm.pedestrianStatus === p
                            ? 'border border-amber-400 bg-amber-500/15 text-amber-300'
                            : 'border border-transparent bg-teal-950/70 text-mist-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-mist-300">
                  <Signpost className="w-3 h-3" />招牌文字
                </label>
                <input
                  className="w-full rounded-lg bg-teal-950/70 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-amber-400"
                  value={backfillForm.signText}
                  onChange={(e) => updateBackfill('signText', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-amber-300">
                  <AlertTriangle className="w-3 h-3" />缺口原因（必填）
                </label>
                <input
                  required
                  placeholder="如：设备没电、途中换乘、忘记记录……"
                  className="w-full rounded-lg border border-amber-500/30 bg-teal-950/70 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 outline-none focus:ring-1 focus:ring-amber-400"
                  value={backfillForm.gapReason}
                  onChange={(e) => updateBackfill('gapReason', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-mist-300">观察笔记</label>
                <textarea
                  className="h-20 w-full resize-none rounded-lg bg-teal-950/70 px-3 py-2 text-sm text-mist-100 outline-none focus:ring-1 focus:ring-amber-400"
                  value={backfillForm.note}
                  onChange={(e) => updateBackfill('note', e.target.value)}
                />
              </div>

              {backfillError && (
                <p className="flex items-center gap-1.5 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {backfillError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-teal-950 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              提交补录
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
