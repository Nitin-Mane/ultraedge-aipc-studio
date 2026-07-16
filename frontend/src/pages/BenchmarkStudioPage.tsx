import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, Cpu, HardDrive, Zap, Clock, Activity, 
  TrendingUp, ArrowUp, ArrowDown, Play, RefreshCw, 
  CheckCircle2, AlertTriangle, ArrowLeft, Loader2,
  Target, Gauge, MemoryStick, Server, MonitorSmartphone
} from 'lucide-react'
import { getBenchmarkResults, getModelsCatalog, benchmarkModel, type BenchmarkResult as ApiBenchmarkResult } from '../api/models'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'
import { Button } from '../components/Button'

interface DisplayResult {
  modelId: string
  modelName: string
  device: string
  precision: string
  firstTokenLatency: number
  tokensPerSecond: number
  modelLoadTime: number
  ramUsage: number
  gpuUsage?: number
  npuStatus?: string
  createdAt: string
}

function AnimatedCounter({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = 0
    const end = value
    const duration = 1200
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + (end - start) * eased)
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])

  return <span>{display.toFixed(decimals)}{suffix}</span>
}

function PerformanceRing({ value, max, color, size = 64 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(pct), 100)
    return () => clearTimeout(timer)
  }, [pct])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth="4"
          className="text-aurora-surface/50" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animatedPct)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-text-primary">{Math.round(animatedPct * 100)}%</span>
      </div>
    </div>
  )
}

export function BenchmarkStudioPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<DisplayResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'throughput' | 'memory'>('throughput')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [runningBenchmark, setRunningBenchmark] = useState<string | null>(null)
  const [selectedModelForRun, setSelectedModelForRun] = useState('')
  const [catalogModels, setCatalogModels] = useState<{ id: string; name: string; state: string }[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [benchRes, catRes] = await Promise.all([
        getBenchmarkResults().catch(() => ({ results: [] })),
        getModelsCatalog().catch(() => ({ models: [] })),
      ])

      const mapped: DisplayResult[] = (benchRes.results || []).map((r: ApiBenchmarkResult) => ({
        modelId: r.model_id,
        modelName: r.model_name,
        device: r.device,
        precision: r.precision,
        firstTokenLatency: r.first_token_latency_ms,
        tokensPerSecond: r.tokens_per_second,
        modelLoadTime: r.model_load_time_ms / 1000,
        ramUsage: r.ram_used_mb / 1024,
        gpuUsage: r.gpu_used_mb > 0 ? Math.round((r.gpu_used_mb / 8192) * 100) : undefined,
        npuStatus: r.npu_status,
        createdAt: r.created_at,
      }))

      // Deduplicate: keep only the latest result per model_id
      const latestByModel = new Map<string, DisplayResult>()
      for (const r of mapped) {
        const existing = latestByModel.get(r.modelId)
        if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
          latestByModel.set(r.modelId, r)
        }
      }

      // Only show results for models that are actually available on disk
      const availableModelIds = new Set(
        (catRes.models || [])
          .filter((m: any) => m.state === 'ready' || m.status === 'ready')
          .map((m: any) => m.id)
      )
      const filtered = Array.from(latestByModel.values()).filter(
        r => availableModelIds.has(r.modelId)
      )
      setResults(filtered)
      setCatalogModels((catRes.models || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        state: m.state || m.status || 'unknown',
      })))
    } catch {
      // keep empty
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleRunBenchmark = async () => {
    if (!selectedModelForRun) return
    setRunningBenchmark(selectedModelForRun)
    try {
      await benchmarkModel(selectedModelForRun, 'CPU', 'INT4')
      // poll for results
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const res = await getBenchmarkResults()
        if (res.results.length > results.length) {
          await fetchData()
          break
        }
      }
    } catch {
      // silently fail
    } finally {
      setRunningBenchmark(null)
    }
  }

  const readyModels = catalogModels.filter(m => m.state === 'ready')

  const stats = results.length > 0 ? {
    avgLatency: Math.round(results.reduce((a, b) => a + b.firstTokenLatency, 0) / results.length),
    avgThroughput: (results.reduce((a, b) => a + b.tokensPerSecond, 0) / results.length),
    totalModels: results.length,
    avgLoadTime: results.reduce((a, b) => a + b.modelLoadTime, 0) / results.length,
    bestThroughput: Math.max(...results.map(r => r.tokensPerSecond)),
    bestLatency: Math.min(...results.map(r => r.firstTokenLatency)),
  } : null

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg hover:bg-aurora-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Benchmark Studio</h1>
                  <p className="text-sm text-text-secondary mt-1">Performance metrics and hardware analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Run Benchmark Section */}
          {readyModels.length > 0 && (
            <FadeIn delay={0.05}>
              <div className="glass-card p-4 mb-6 flex items-center gap-4">
                <div className="p-2 rounded-xl bg-qwen-violet/10">
                  <Play className="w-5 h-5 text-qwen-violet" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Run Benchmark</p>
                  <p className="text-xs text-text-muted">Select a ready model to benchmark on CPU</p>
                </div>
                <select
                  value={selectedModelForRun}
                  onChange={e => setSelectedModelForRun(e.target.value)}
                  className="bg-aurora-surface border border-aurora-border/40 rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-qwen-violet/50"
                >
                  <option value="">Select model...</option>
                  {readyModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunBenchmark}
                  disabled={!selectedModelForRun || !!runningBenchmark}
                  className="bg-qwen-violet hover:bg-qwen-violet/90"
                >
                  {runningBenchmark ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Running...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-1.5" /> Run</>
                  )}
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Stats Cards */}
          {stats && (
            <FadeIn delay={0.1}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <motion.div
                  className="glass-card p-4 group hover:border-edge-cyan/40 transition-all duration-300 cursor-default"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-edge-cyan/10 group-hover:bg-edge-cyan/20 transition-colors">
                      <Clock className="w-5 h-5 text-edge-cyan" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        <AnimatedCounter value={stats.avgLatency} suffix="ms" />
                      </p>
                      <p className="text-xs text-text-muted">Avg Latency</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                    <Target className="w-3 h-3 text-edge-cyan" />
                    <span className="text-text-muted">Best: {stats.bestLatency}ms</span>
                  </div>
                </motion.div>

                <motion.div
                  className="glass-card p-4 group hover:border-status-ready/40 transition-all duration-300 cursor-default"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-status-ready/10 group-hover:bg-status-ready/20 transition-colors">
                      <TrendingUp className="w-5 h-5 text-status-ready" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        <AnimatedCounter value={stats.avgThroughput} decimals={1} suffix=" tok/s" />
                      </p>
                      <p className="text-xs text-text-muted">Avg Throughput</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                    <Zap className="w-3 h-3 text-status-ready" />
                    <span className="text-text-muted">Peak: {stats.bestThroughput.toFixed(1)} tok/s</span>
                  </div>
                </motion.div>

                <motion.div
                  className="glass-card p-4 group hover:border-qwen-violet/40 transition-all duration-300 cursor-default"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-qwen-violet/10 group-hover:bg-qwen-violet/20 transition-colors">
                      <BarChart3 className="w-5 h-5 text-qwen-violet" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        <AnimatedCounter value={stats.totalModels} />
                      </p>
                      <p className="text-xs text-text-muted">Models Tested</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-qwen-violet" />
                    <span className="text-text-muted">{catalogModels.length} total in catalog</span>
                  </div>
                </motion.div>

                <motion.div
                  className="glass-card p-4 group hover:border-status-warning/40 transition-all duration-300 cursor-default"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-status-warning/10 group-hover:bg-status-warning/20 transition-colors">
                      <Activity className="w-5 h-5 text-status-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        <AnimatedCounter value={stats.avgLoadTime} decimals={1} suffix="s" />
                      </p>
                      <p className="text-xs text-text-muted">Avg Load Time</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px]">
                    <Gauge className="w-3 h-3 text-status-warning" />
                    <span className="text-text-muted">OpenVINO optimized</span>
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          )}

          {/* Metric Selector */}
          <FadeIn delay={0.15}>
            <div className="glass-card p-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-text-primary">View Metric:</span>
                <div className="flex gap-2">
                  {([
                    { key: 'throughput' as const, label: 'Throughput (tok/s)', active: 'bg-edge-cyan/20 text-edge-cyan border-edge-cyan/30' },
                    { key: 'latency' as const, label: 'Latency (ms)', active: 'bg-status-warning/20 text-status-warning border-status-warning/30' },
                    { key: 'memory' as const, label: 'Memory (GB)', active: 'bg-qwen-violet/20 text-qwen-violet border-qwen-violet/30' },
                  ]).map(m => (
                    <motion.button
                      key={m.key}
                      onClick={() => setSelectedMetric(m.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        selectedMetric === m.key
                          ? m.active
                          : 'text-text-secondary hover:bg-aurora-surface-hover border-transparent'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {m.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Loading State */}
          {loading && (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-qwen-violet animate-spin" />
              <p className="text-sm text-text-muted">Loading benchmark results...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && results.length === 0 && (
            <FadeIn delay={0.2}>
              <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 text-center">
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-qwen-violet/20 to-edge-cyan/20 flex items-center justify-center border border-qwen-violet/20"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <BarChart3 className="w-10 h-10 text-qwen-violet" />
                </motion.div>
                <h3 className="text-lg font-bold text-text-primary">No Benchmark Results Yet</h3>
                <p className="text-sm text-text-muted max-w-md">
                  Run a benchmark on a ready model to see performance metrics, latency, and throughput analysis.
                </p>
                {readyModels.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={selectedModelForRun}
                      onChange={e => setSelectedModelForRun(e.target.value)}
                      className="bg-aurora-surface border border-aurora-border/40 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-qwen-violet/50"
                    >
                      <option value="">Select a model...</option>
                      {readyModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRunBenchmark}
                      disabled={!selectedModelForRun || !!runningBenchmark}
                      className="bg-qwen-violet hover:bg-qwen-violet/90"
                    >
                      {runningBenchmark ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Running...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-1.5" /> Run Benchmark</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </FadeIn>
          )}

          {/* Benchmark Chart */}
          {!loading && results.length > 0 && (
            <>
              <FadeIn delay={0.2}>
                <div className="glass-card p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-text-primary">Performance Comparison</h2>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-edge-cyan" /> Throughput
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-status-warning" /> Latency
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-qwen-violet" /> Memory
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {results.map((result, index) => {
                        const value = selectedMetric === 'throughput' 
                          ? result.tokensPerSecond 
                          : selectedMetric === 'latency' 
                            ? result.firstTokenLatency 
                            : result.ramUsage
                        const maxValue = Math.max(...results.map(r => 
                          selectedMetric === 'throughput' 
                            ? r.tokensPerSecond 
                            : selectedMetric === 'latency' 
                              ? r.firstTokenLatency 
                              : r.ramUsage
                        ))
                        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

                        return (
                          <motion.div
                            key={`${result.modelId}-${selectedMetric}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            className="flex items-center gap-4 group"
                            onMouseEnter={() => setHoveredRow(index)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            <div className="w-36 text-right shrink-0">
                              <p className="text-sm font-medium text-text-primary truncate">{result.modelName || result.modelId}</p>
                              <p className="text-[10px] text-text-muted">{result.device} · {result.precision}</p>
                            </div>
                            <div className="flex-1 h-8 bg-aurora-surface/50 rounded-lg overflow-hidden relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
                                className={`h-full rounded-lg relative overflow-hidden ${
                                  selectedMetric === 'throughput' 
                                    ? 'bg-gradient-to-r from-edge-cyan to-edge-cyan/70'
                                    : selectedMetric === 'latency'
                                      ? 'bg-gradient-to-r from-status-warning to-status-warning/70'
                                      : 'bg-gradient-to-r from-qwen-violet to-qwen-violet/70'
                                }`}
                              >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              </motion.div>
                              {/* Glow on hover */}
                              {hoveredRow === index && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`absolute inset-0 rounded-lg ${
                                    selectedMetric === 'throughput'
                                      ? 'shadow-[inset_0_0_20px_rgba(0,245,255,0.15)]'
                                      : selectedMetric === 'latency'
                                        ? 'shadow-[inset_0_0_20px_rgba(245,158,11,0.15)]'
                                        : 'shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]'
                                  }`}
                                />
                              )}
                            </div>
                            <div className="w-24 text-right shrink-0">
                              <motion.p
                                className="text-sm font-bold text-text-primary"
                                key={value}
                                initial={{ scale: 1.2, color: selectedMetric === 'throughput' ? '#00f5ff' : selectedMetric === 'latency' ? '#f59e0b' : '#a855f7' }}
                                animate={{ scale: 1, color: 'inherit' }}
                                transition={{ duration: 0.3 }}
                              >
                                {value.toFixed(1)}
                              </motion.p>
                              <p className="text-[10px] text-text-muted">
                                {selectedMetric === 'throughput' ? 'tok/s' : selectedMetric === 'latency' ? 'ms' : 'GB'}
                              </p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </FadeIn>

              {/* Device Performance Rings */}
              <FadeIn delay={0.22}>
                <div className="glass-card p-6 mb-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Device Performance</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {(() => {
                      const devices = ['CPU', 'GPU', 'NPU']
                      return devices.map(device => {
                        const deviceResults = results.filter(r => r.device === device)
                        if (deviceResults.length === 0) return null
                        const avgThroughput = deviceResults.reduce((a, r) => a + r.tokensPerSecond, 0) / deviceResults.length
                        const avgLatency = deviceResults.reduce((a, r) => a + r.firstTokenLatency, 0) / deviceResults.length
                        const avgRam = deviceResults.reduce((a, r) => a + r.ramUsage, 0) / deviceResults.length
                        return (
                          <motion.div
                            key={device}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-aurora-surface/30 border border-aurora-border/20"
                            whileHover={{ scale: 1.03, borderColor: 'rgba(168,85,247,0.3)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            <div className="flex items-center gap-2">
                              {device === 'CPU' && <Cpu className="w-4 h-4 text-edge-cyan" />}
                              {device === 'GPU' && <MonitorSmartphone className="w-4 h-4 text-status-ready" />}
                              {device === 'NPU' && <Server className="w-4 h-4 text-status-warning" />}
                              <span className="text-sm font-bold text-text-primary">{device}</span>
                            </div>
                            <PerformanceRing
                              value={avgThroughput}
                              max={Math.max(...results.map(r => r.tokensPerSecond))}
                              color={device === 'CPU' ? '#00f5ff' : device === 'GPU' ? '#10b981' : '#f59e0b'}
                              size={72}
                            />
                            <div className="text-center space-y-1">
                              <p className="text-xs font-medium text-text-primary">{avgThroughput.toFixed(1)} tok/s</p>
                              <p className="text-[10px] text-text-muted">{avgLatency.toFixed(0)}ms latency</p>
                              <p className="text-[10px] text-text-muted">{avgRam.toFixed(1)} GB RAM</p>
                            </div>
                            <p className="text-[10px] text-text-muted">{deviceResults.length} benchmark{deviceResults.length > 1 ? 's' : ''}</p>
                          </motion.div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </FadeIn>

              {/* Detailed Results */}
              <FadeIn delay={0.25}>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Detailed Results</h2>
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-aurora-border/30">
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Model</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Device</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Precision</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Latency</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Throughput</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Load Time</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">RAM</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">GPU</th>
                          <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-aurora-border/20 last:border-0 hover:bg-aurora-surface-hover/30 transition-colors cursor-default"
                          >
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-text-primary">{result.modelName || result.modelId}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                                result.device === 'GPU' ? 'bg-status-ready/10 text-status-ready' :
                                result.device === 'NPU' ? 'bg-status-warning/10 text-status-warning' :
                                'bg-edge-cyan/10 text-edge-cyan'
                              }`}>
                                {result.device === 'CPU' && <Cpu className="w-3 h-3" />}
                                {result.device === 'GPU' && <MonitorSmartphone className="w-3 h-3" />}
                                {result.device === 'NPU' && <Server className="w-3 h-3" />}
                                {result.device}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded text-xs bg-aurora-surface-hover text-text-secondary font-mono">{result.precision}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-text-secondary font-mono">{result.firstTokenLatency}ms</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-status-ready font-mono">{result.tokensPerSecond} tok/s</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-text-secondary font-mono">{result.modelLoadTime.toFixed(1)}s</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-text-secondary font-mono">{result.ramUsage.toFixed(1)} GB</span>
                            </td>
                            <td className="px-4 py-3">
                              {result.gpuUsage ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1.5 bg-aurora-surface rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${result.gpuUsage}%` }}
                                      transition={{ duration: 0.8, delay: index * 0.1 }}
                                      className="h-full bg-status-ready rounded-full"
                                    />
                                  </div>
                                  <span className="text-xs text-text-secondary font-mono">{result.gpuUsage}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-[10px] text-status-ready">
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </FadeIn>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
