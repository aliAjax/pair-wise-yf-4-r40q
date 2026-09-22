import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Route,
  X,
  Trash2,
  Clock,
  MapPin,
  AlertTriangle,
  Timer,
  PenLine,
  Armchair,
  CloudSun,
  Signpost,
  TreePine,
  Users,
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
  DEFAULT_TARGET_MIN,
  gapMidpointLocalInput,
  localInputToIso,
  type RouteIntervals,
} from '@/utils/gapRules'
import type {
  WindowScene,
  RouteGap,
  GapFillData,
  Weather,
  TreeDensity,
  PedestrianStatus,
  SeatDirection,
} from '@/types'

const WEATHERS: Weather[] = ['晴', '多云', '阴', '小雨', '大雨', '雪', '雾']
const TREES: TreeDensity[] = ['稀疏', '适中', '茂密']
const PEDESTRIANS: PedestrianStatus[] = ['稀少', '零星', '密集']

export default function TimelinePage() {
  const {
    routeNames,
    selectedRoute,
    currentRouteScenes,
    selectRoute,
    loadAll,
    deleteScene,
    routeIntervals,
    currentRouteGaps,
    blockedRoutes,
    setRouteInterval,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [fillGapTarget, setFillGapTarget] = useState<RouteGap | null>(null)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...currentRouteScenes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  /** 以较早记录 id 为键，便于在倒序时间线中在相邻两条记录间插入缺口卡片 */
  const gapByStartId = useMemo(() => {
    const map = new Map<string, RouteGap>()
    currentRouteGaps.forEach((g) => map.set(g.startSceneId, g))
    return map
  }, [currentRouteGaps])

  const openGapCount = currentRouteGaps.filter((g) => !g.filled).length
  const targetMin = selectedRoute
    ? (routeIntervals as RouteIntervals)[selectedRoute] ?? DEFAULT_TARGET_MIN
    : DEFAULT_TARGET_MIN

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
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
              const blocked = blockedRoutes.has(name)
              return (
                <button
                  key={name}
                  onClick={() => selectRoute(name)}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                    selectedRoute === name
                      ? 'bg-dusk-400 text-teal-950'
                      : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                  }`}
                >
                  <Route className="w-3 h-3" />
                  {name}
                  {blocked && (
                    <AlertTriangle
                      className={`w-3 h-3 ${
                        selectedRoute === name ? 'text-red-800' : 'text-red-400'
                      }`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selectedRoute && (
          <RouteIntervalEditor
            routeName={selectedRoute}
            targetMin={targetMin}
            openGapCount={openGapCount}
            onSave={(minutes) => setRouteInterval(selectedRoute, minutes)}
          />
        )}

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
                    <div
                      className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-teal-950 ${
                        scene.gapReason ? 'bg-amber-400' : 'bg-dusk-400'
                      }`}
                    />
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
                          <span className="ml-auto inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                            <PenLine className="w-2.5 h-2.5" />
                            补录
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{scene.routeName}</span>
                        <span className="mx-1 text-teal-700">·</span>
                        <span className="text-xs">{scene.seatDirection}侧</span>
                      </div>
                      {scene.gapReason && (
                        <p className="mb-1 text-xs text-amber-300/90">
                          缺口原因：{scene.gapReason}
                        </p>
                      )}
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
                  {gapByStartId.get(scene.id) && (
                    <GapCard
                      gap={gapByStartId.get(scene.id)!}
                      onFill={() => setFillGapTarget(gapByStartId.get(scene.id)!)}
                    />
                  )}
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
              {detailScene.gapReason && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-300">
                  缺口原因：{detailScene.gapReason}
                </div>
              )}
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
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

      {fillGapTarget && (
        <GapFillModal
          routeName={selectedRoute}
          gap={fillGapTarget}
          onClose={() => setFillGapTarget(null)}
        />
      )}
    </div>
  )
}

function RouteIntervalEditor({
  routeName,
  targetMin,
  openGapCount,
  onSave,
}: {
  routeName: string
  targetMin: number
  openGapCount: number
  onSave: (minutes: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(targetMin))

  useEffect(() => {
    setValue(String(targetMin))
  }, [routeName, targetMin])

  const minutes = Number(value)
  const valid = Number.isFinite(minutes) && minutes > 0

  const submit = () => {
    if (!valid) return
    onSave(Math.round(minutes))
    setEditing(false)
  }

  return (
    <div className="mb-6 rounded-xl border border-teal-800 bg-teal-900/50 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-mist-300">
          <Timer className="w-4 h-4 text-dusk-400" />
          {routeName} 目标间隔
        </span>
        {editing ? (
          <span className="inline-flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 rounded-lg border border-teal-700 bg-teal-950 px-2 py-1 text-sm text-mist-100 outline-none focus:border-dusk-400"
            />
            <span className="text-xs text-mist-400">分钟（默认 {DEFAULT_TARGET_MIN}）</span>
            <button
              onClick={submit}
              disabled={!valid}
              className="rounded-lg bg-dusk-400 px-3 py-1 text-xs text-teal-950 disabled:opacity-40"
            >
              保存
            </button>
            <button
              onClick={() => {
                setValue(String(targetMin))
                setEditing(false)
              }}
              className="rounded-lg px-2 py-1 text-xs text-mist-400 hover:text-mist-200"
            >
              取消
            </button>
          </span>
        ) : (
          <>
            <span className="text-dusk-300">{targetMin} 分钟</span>
            <span className="text-xs text-mist-500">
              相邻记录超过 {targetMin * 2} 分钟即判为漏采缺口
            </span>
            <button
              onClick={() => setEditing(true)}
              className="ml-auto rounded-lg border border-teal-700 px-3 py-1 text-xs text-mist-300 hover:border-dusk-400/50 hover:text-dusk-300"
            >
              设置间隔
            </button>
          </>
        )}
      </div>
      {openGapCount > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          仍有 {openGapCount} 个未补缺口，补录前该线路不参与灵感抽取
        </p>
      )}
    </div>
  )
}

function GapCard({
  gap,
  onFill,
}: {
  gap: RouteGap
  onFill: () => void
}) {
  return (
    <div
      className={`my-3 ml-24 rounded-xl border border-dashed p-3 ${
        gap.filled
          ? 'border-teal-700 bg-teal-900/30'
          : 'border-amber-400/50 bg-amber-400/5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {gap.filled ? (
          <span className="text-mist-400">缺口 {gap.durationMin} 分钟 · 已补录</span>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300">
              漏采缺口 {gap.durationMin} 分钟（超过两倍目标间隔 {gap.targetMin * 2} 分钟）
            </span>
            <button
              onClick={onFill}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-400/25"
            >
              <PenLine className="w-3 h-3" />
              补录
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GapFillModal({
  routeName,
  gap,
  onClose,
}: {
  routeName: string
  gap: RouteGap
  onClose: () => void
}) {
  const fillGap = useSceneStore((s) => s.fillGap)
  const [form, setForm] = useState<GapFillData>({
    timestamp: gapMidpointLocalInput(gap),
    gapReason: '',
    segment: '',
    seatDirection: '左',
    weather: '晴',
    signText: '',
    treeDensity: '适中',
    pedestrianStatus: '稀少',
    note: '',
  })
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof GapFillData>(key: K, val: GapFillData[K]) => {
    setError(null)
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 校验由规则层完成：原因必填，时刻必须落在该缺口内；否则整次拒绝
    const err = fillGap(routeName, {
      ...form,
      timestamp: localInputToIso(form.timestamp),
    })
    if (err) {
      setError(err)
      return
    }
    onClose()
  }

  const inputCls =
    'w-full bg-teal-950 text-mist-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-dusk-400 border border-teal-800'
  const labelCls = 'mb-1 flex items-center gap-1 text-xs text-mist-300'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-mist-400 hover:text-mist-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-amber-300">
          <PenLine className="w-5 h-5" />
          补录漏采窗景
        </h2>
        <p className="mb-4 text-xs text-mist-400">
          {routeName} · 缺口 {gap.durationMin} 分钟 · 需介于{' '}
          {formatTimestamp(gap.startTime)} 与 {formatTimestamp(gap.endTime)} 之间
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                <Clock className="w-3 h-3" />
                采样时刻 <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.timestamp}
                onChange={(e) => update('timestamp', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <MapPin className="w-3 h-3" />
                区间 <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.segment}
                onChange={(e) => update('segment', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <AlertTriangle className="w-3 h-3" />
              缺口原因 <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={form.gapReason}
              onChange={(e) => update('gapReason', e.target.value)}
              placeholder="例如：交通管制临时绕行，错过了该区间"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <Armchair className="w-3 h-3" />
              座位方向
            </label>
            <div className="flex gap-2">
              {(['左', '右'] as SeatDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update('seatDirection', d)}
                  className={`flex-1 rounded-lg py-2 text-sm transition ${
                    form.seatDirection === d
                      ? 'border border-dusk-400 bg-dusk-400/20 text-dusk-400'
                      : 'border border-transparent bg-teal-950 text-mist-300'
                  }`}
                >
                  {d}侧
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <CloudSun className="w-3 h-3" />
              天气
            </label>
            <div className="grid grid-cols-4 gap-2">
              {WEATHERS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => update('weather', w)}
                  className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition ${
                    form.weather === w
                      ? 'border border-dusk-400 bg-dusk-400/20 text-dusk-400'
                      : 'border border-transparent bg-teal-950 text-mist-300'
                  }`}
                >
                  {getWeatherIcon(w)}
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                <Signpost className="w-3 h-3" />
                招牌文字
              </label>
              <input
                value={form.signText}
                onChange={(e) => update('signText', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <TreePine className="w-3 h-3" />
                树木密度
              </label>
              <div className="flex gap-1">
                {TREES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('treeDensity', t)}
                    className={`flex-1 rounded-lg py-2 text-xs transition ${
                      form.treeDensity === t
                        ? 'border border-dusk-400 bg-dusk-400/20 text-dusk-400'
                        : 'border border-transparent bg-teal-950 text-mist-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <Users className="w-3 h-3" />
              行人状态
            </label>
            <div className="flex gap-2">
              {PEDESTRIANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('pedestrianStatus', p)}
                  className={`flex-1 rounded-lg py-2 text-xs transition ${
                    form.pedestrianStatus === p
                      ? 'border border-dusk-400 bg-dusk-400/20 text-dusk-400'
                      : 'border border-transparent bg-teal-950 text-mist-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>观察笔记</label>
            <textarea
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              className={`${inputCls} h-20 resize-none`}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-teal-700 py-2.5 text-sm text-mist-300 hover:bg-teal-800"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-amber-400/90 py-2.5 text-sm font-medium text-teal-950 hover:bg-amber-300"
          >
            提交补录
          </button>
        </div>
      </form>
    </div>
  )
}
