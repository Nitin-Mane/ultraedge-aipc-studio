import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  BarChart3, Cpu, HardDrive, Zap, Clock, Activity, 
  TrendingUp, ArrowUp, ArrowDown, Settings, Play,
  RefreshCw, Download, CheckCircle2, AlertTriangle, ArrowLeft
} from 'lucide-react'
import { useAppStore, BenchmarkResult } from '../store/useAppStore'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'
import { Button } from '../components/Button'

const mockBenchmarks: BenchmarkResult[] = [
  {
    modelId: 'qwen3-vl-4b',
    device: 'GPU',
    precision: 'INT8',
    firstTokenLatency: 125,
    tokensPerSecond: 45.2,
    modelLoadTime: 2.3,
    ramUsage: 6.8,
    gpuUsage: 78,
    timestamp: new Date('2026-07-04T10:00:00'),
  },
  {
    modelId: 'qwen3-asr-06b',
    device: 'CPU',
    precision: 'INT4',
    firstTokenLatency: 89,
    tokensPerSecond: 62.1,
    modelLoadTime: 1.1,
    ramUsage: 1.8,
    timestamp: new Date('2026-07-04T10:30:00'),
  },
  {
    modelId: 'qwen3-embedding-06b',
    device: 'CPU',
    precision: 'INT8',
    firstTokenLatency: 45,
    tokensPerSecond: 120.5,
    modelLoadTime: 0.8,
    ramUsage: 1.2,
    timestamp: new Date('2026-07-04T11:00:00'),
  },
]

export function BenchmarkStudioPage() {
  const navigate = useNavigate()
  const { benchmarkResults, selectedModel } = useAppStore()
  const [selectedMetric, setSelectedMetric] = useState<'latency' | 'throughput' | 'memory'>('throughput')

  const results = benchmarkResults.length > 0 ? benchmarkResults : mockBenchmarks

  const stats = {
    avgLatency: Math.round(results.reduce((a, b) => a + b.firstTokenLatency, 0) / results.length),
    avgThroughput: (results.reduce((a, b) => a + b.tokensPerSecond, 0) / results.length).toFixed(1),
    totalModels: results.length,
    avgLoadTime: (results.reduce((a, b) => a + b.modelLoadTime, 0) / results.length).toFixed(1),
  }

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
                <Button variant="secondary" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
                <Button variant="primary" size="sm">
                  <Play className="w-4 h-4 mr-1.5" /> Run Benchmark
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Cards */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-edge-cyan/10">
                    <Clock className="w-5 h-5 text-edge-cyan" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.avgLatency}ms</p>
                    <p className="text-xs text-text-muted">Avg Latency</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-status-ready/10">
                    <TrendingUp className="w-5 h-5 text-status-ready" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.avgThroughput}</p>
                    <p className="text-xs text-text-muted">Avg tok/s</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-qwen-violet/10">
                    <BarChart3 className="w-5 h-5 text-qwen-violet" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.totalModels}</p>
                    <p className="text-xs text-text-muted">Models Tested</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-status-warning/10">
                    <Activity className="w-5 h-5 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.avgLoadTime}s</p>
                    <p className="text-xs text-text-muted">Avg Load Time</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Metric Selector */}
          <FadeIn delay={0.15}>
            <div className="glass-card p-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-text-primary">View Metric:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMetric('throughput')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedMetric === 'throughput'
                        ? 'bg-edge-cyan/20 text-edge-cyan border border-edge-cyan/30'
                        : 'text-text-secondary hover:bg-aurora-surface-hover'
                    }`}
                  >
                    Throughput (tok/s)
                  </button>
                  <button
                    onClick={() => setSelectedMetric('latency')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedMetric === 'latency'
                        ? 'bg-edge-cyan/20 text-edge-cyan border border-edge-cyan/30'
                        : 'text-text-secondary hover:bg-aurora-surface-hover'
                    }`}
                  >
                    Latency (ms)
                  </button>
                  <button
                    onClick={() => setSelectedMetric('memory')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedMetric === 'memory'
                        ? 'bg-edge-cyan/20 text-edge-cyan border border-edge-cyan/30'
                        : 'text-text-secondary hover:bg-aurora-surface-hover'
                    }`}
                  >
                    Memory (GB)
                  </button>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Benchmark Chart */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Performance Comparison</h2>
              <div className="space-y-4">
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
                  const percentage = (value / maxValue) * 100

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 text-right">
                        <p className="text-sm font-medium text-text-primary">{result.modelId}</p>
                        <p className="text-xs text-text-muted">{result.device} • {result.precision}</p>
                      </div>
                      <div className="flex-1 h-8 bg-aurora-surface/50 rounded-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
                          className={`h-full rounded-lg ${
                            selectedMetric === 'throughput' 
                              ? 'bg-gradient-to-r from-edge-cyan to-edge-cyan/70'
                              : selectedMetric === 'latency'
                                ? 'bg-gradient-to-r from-status-warning to-status-warning/70'
                                : 'bg-gradient-to-r from-qwen-violet to-qwen-violet/70'
                          }`}
                        />
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-sm font-bold text-text-primary">
                          {value.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {selectedMetric === 'throughput' ? 'tok/s' : selectedMetric === 'latency' ? 'ms' : 'GB'}
                        </p>
                      </div>
                    </div>
                  )
                })}
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
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b border-aurora-border/20 last:border-0 hover:bg-aurora-surface-hover/30">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-text-primary">{result.modelId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">{result.device}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs bg-aurora-surface-hover text-text-secondary">{result.precision}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">{result.firstTokenLatency}ms</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-status-ready">{result.tokensPerSecond} tok/s</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">{result.modelLoadTime}s</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">{result.ramUsage} GB</span>
                        </td>
                        <td className="px-4 py-3">
                          {result.gpuUsage ? (
                            <span className="text-sm text-text-secondary">{result.gpuUsage}%</span>
                          ) : (
                            <span className="text-xs text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}