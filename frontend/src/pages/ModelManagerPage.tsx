import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, BarChart3, Info, ArrowLeft, CheckCircle2,
  Cpu, HardDrive, Zap, AlertTriangle,
  RefreshCw, ExternalLink, Layers, Code2, MessageSquare,
  ChevronDown, ChevronUp, XCircle, Pause, Play,
  Key, Eye, EyeOff, ShieldCheck, Trash2, Edit3, Lock, Unlock
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'

// ─────────────────────────────────────────────
// Active model definitions (two supported cards)
// ─────────────────────────────────────────────
const ACTIVE_MODELS = [
  {
    id: 'Qwen2.5-Omni-3B',
    displayName: 'Omni Personal Assistant',
    subtitle: 'Qwen2.5-Omni · 3B · Multimodal',
    description: 'Offline AI chat with voice, vision and local memory. Powered by the Qwen2.5-Omni multimodal model optimized via OpenVINO.',
    featureType: 'personal_assistant',
    icon: MessageSquare,
    color: 'text-edge-cyan',
    bgColor: 'bg-edge-cyan/10',
    borderColor: 'border-edge-cyan/30',
    glowColor: 'shadow-edge-cyan/20',
    gradientFrom: 'from-edge-cyan/20',
    gradientTo: 'to-qwen-violet/10',
    parameterSize: '3B',
    recommendedRamGb: 12,
    recommendedDevice: 'GPU',
    precisionOptions: ['FP16', 'INT8', 'INT4'],
    defaultPrecision: 'INT4',
    sourceUrl: 'https://huggingface.co/Qwen/Qwen2.5-Omni-3B',
    workspacePath: '/personal-assistant',
    workspaceLabel: 'Open Personal Assistant',
  },
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-ov-int4',
    displayName: 'Qwen Coder',
    subtitle: 'Qwen2.5-Coder · 1.5B · Code Generation',
    description: 'Intelligent code generation, debugging, and explanation. Runs locally with OpenVINO acceleration for ultra-fast inference.',
    featureType: 'coding_agent',
    icon: Code2,
    color: 'text-qwen-violet',
    bgColor: 'bg-qwen-violet/10',
    borderColor: 'border-qwen-violet/30',
    glowColor: 'shadow-qwen-violet/20',
    gradientFrom: 'from-qwen-violet/20',
    gradientTo: 'to-edge-blue/10',
    parameterSize: '1.5B',
    recommendedRamGb: 8,
    recommendedDevice: 'GPU',
    precisionOptions: ['FP16', 'INT8', 'INT4'],
    defaultPrecision: 'INT4',
    sourceUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct',
    workspacePath: '/coding-agent',
    workspaceLabel: 'Open Coding Agent',
  },
] as const

// ─────────────────────────────────────────────
// Pipeline step labels shown on the button
// ─────────────────────────────────────────────
function getPipelineStepLabel(state: string): { label: string; step: number; total: number } {
  switch (state) {
    case 'not-installed':
    case 'not_installed':
      return { label: 'Download Weights', step: 0, total: 3 }
    case 'queued':
    case 'downloading':
      return { label: 'Downloading…', step: 1, total: 3 }
    case 'verifying':
      return { label: 'Verifying…', step: 1, total: 3 }
    case 'downloaded':
      return { label: 'Optimize Model', step: 1, total: 3 }
    case 'converting':
      return { label: 'Optimizing…', step: 2, total: 3 }
    case 'quantizing':
      return { label: 'Quantizing…', step: 2, total: 3 }
    case 'benchmarking':
      return { label: 'Benchmarking…', step: 3, total: 3 }
    case 'ready':
      return { label: 'Ready to Use', step: 3, total: 3 }
    case 'failed':
      return { label: 'Retry Setup', step: 0, total: 3 }
    default:
      return { label: 'Download Weights', step: 0, total: 3 }
  }
}

const PIPELINE_STAGES = ['Download', 'Optimize', 'Ready to Use']

function PipelineStepsBar({ state, progress }: { state: string; progress: number }) {
  const { step } = getPipelineStepLabel(state)
  const isActive = ['queued','downloading','verifying','converting','quantizing','benchmarking'].includes(state)
  const isFailed = state === 'failed'
  const isReady = state === 'ready'

  return (
    <div className="mt-4 mb-1">
      {/* Stage labels */}
      <div className="flex items-center justify-between mb-2">
        {PIPELINE_STAGES.map((stageName, idx) => {
          const done = isReady || (idx < step && !isFailed)
          const current = isActive && idx === (step > 0 ? step - 1 : 0)
          return (
            <div key={stageName} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-500 ${
                  done
                    ? 'bg-status-ready border-status-ready text-white'
                    : current
                    ? 'bg-aurora-surface border-edge-cyan text-edge-cyan animate-pulse'
                    : isFailed && idx === 0
                    ? 'bg-status-error/20 border-status-error text-status-error'
                    : 'bg-aurora-surface border-aurora-border text-text-muted'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider ${
                  done ? 'text-status-ready' : current ? 'text-edge-cyan' : 'text-text-muted'
                }`}
              >
                {stageName}
              </span>
            </div>
          )
        })}
        {/* Connector lines between stages */}
        <div className="absolute" />
      </div>
      {/* Progress bar (shown when active) */}
      {isActive && (
        <div className="w-full h-1.5 bg-aurora-surface-hover rounded-full overflow-hidden mt-1">
          <motion.div
            className="h-full bg-gradient-to-r from-edge-cyan to-qwen-violet rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Individual Model Card
// ─────────────────────────────────────────────
function ModelCard({
  modelDef,
  liveModel,
  onPrepare,
  onStop,
  onBenchmark,
}: {
  modelDef: typeof ACTIVE_MODELS[number]
  liveModel: any | null
  onPrepare: (precision: string, step: 'download' | 'convert' | 'all') => void
  onStop: () => void
  onBenchmark: () => void
}) {
  const navigate = useNavigate()
  const [selectedPrecision, setSelectedPrecision] = useState<string>(modelDef.defaultPrecision)
  const [showInfo, setShowInfo] = useState(false)

  const state = liveModel?.state ?? 'not-installed'
  const progress = liveModel?.progress ?? 0
  const jobMessage = liveModel?.jobMessage ?? ''
  const benchmark = liveModel?.benchmark ?? null

  const isProcessing = ['queued', 'downloading', 'verifying', 'converting', 'quantizing', 'benchmarking'].includes(state)
  const isReady = state === 'ready'
  const isDownloaded = state === 'downloaded'
  const isFailed = state === 'failed'
  const isNotInstalled = !isProcessing && !isReady && !isDownloaded && !isFailed

  const { label: pipelineLabel } = getPipelineStepLabel(state)

  const Icon = modelDef.icon

  const handlePrimaryAction = () => {
    if (isReady) {
      navigate(modelDef.workspacePath)
    } else if (isDownloaded) {
      onPrepare(selectedPrecision, 'convert')
    } else if (isFailed || isNotInstalled) {
      onPrepare(selectedPrecision, 'download')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative flex flex-col rounded-2xl border ${modelDef.borderColor} bg-aurora-surface overflow-hidden shadow-xl ${modelDef.glowColor} hover:shadow-2xl transition-shadow duration-300`}
    >
      {/* Top gradient stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${modelDef.gradientFrom} ${modelDef.gradientTo}`} />

      {/* Card body */}
      <div className="p-6 flex flex-col gap-5 flex-1">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${modelDef.bgColor} ${modelDef.color} shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary leading-tight">{modelDef.displayName}</h3>
              <p className="text-xs text-text-muted mt-0.5">{modelDef.subtitle}</p>
            </div>
          </div>
          {/* State badge */}
          <div className="shrink-0">
            {isReady && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-ready/10 border border-status-ready/30 text-status-ready text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            )}
            {isProcessing && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-edge-cyan/10 border border-edge-cyan/30 text-edge-cyan text-[11px] font-semibold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Processing
              </span>
            )}
            {isFailed && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-error/10 border border-status-error/30 text-status-error text-[11px] font-semibold">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            )}
            {isNotInstalled && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aurora-surface-hover border border-aurora-border text-text-muted text-[11px] font-semibold">
                Not Installed
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed">{modelDef.description}</p>

        {/* Specs row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-aurora-surface-hover/50 border border-aurora-border/20">
            <Cpu className="w-4 h-4 text-edge-cyan" />
            <span className="text-xs font-bold text-text-primary">{modelDef.parameterSize}</span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Parameters</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-aurora-surface-hover/50 border border-aurora-border/20">
            <HardDrive className="w-4 h-4 text-qwen-violet" />
            <span className="text-xs font-bold text-text-primary">{modelDef.recommendedRamGb}GB</span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">RAM</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-aurora-surface-hover/50 border border-aurora-border/20">
            <Zap className="w-4 h-4 text-status-warning" />
            <span className="text-xs font-bold text-text-primary">{modelDef.recommendedDevice}</span>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Device</span>
          </div>
        </div>

        {/* Precision selector pills */}
        {!isProcessing && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Optimization Format</p>
            <div className="flex gap-2">
              {modelDef.precisionOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPrecision(p)}
                  disabled={isReady}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                    selectedPrecision === p
                      ? `${modelDef.bgColor} ${modelDef.color} ${modelDef.borderColor} shadow-sm`
                      : 'bg-aurora-surface-hover border-aurora-border text-text-muted hover:border-aurora-border/80'
                  } ${isReady ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            {isReady && liveModel?.precision && (
              <p className="text-[10px] text-text-muted mt-1">
                Installed as: <span className="text-text-secondary font-semibold">{liveModel.precision}</span>
              </p>
            )}
          </div>
        )}

        {/* Pipeline steps bar */}
        <PipelineStepsBar state={state} progress={progress} />

        {/* Active job message */}
        {isProcessing && jobMessage && (
          <div className="flex items-center gap-2 text-xs text-text-secondary bg-aurora-surface-hover/40 border border-aurora-border/20 rounded-lg px-3 py-2">
            <RefreshCw className="w-3 h-3 text-edge-cyan animate-spin shrink-0" />
            <span className="truncate">{jobMessage}</span>
            <span className="ml-auto font-mono text-edge-cyan">{progress}%</span>
          </div>
        )}

        {/* Failed error box */}
        {isFailed && (
          <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-status-error" />
              <span className="text-xs font-semibold text-status-error">Preparation Failed</span>
            </div>
            {jobMessage && (
              <p className="text-[10px] text-text-muted font-mono truncate">{jobMessage}</p>
            )}
          </div>
        )}

        {/* Benchmark summary (when ready) */}
        {isReady && benchmark && (
          <div className="p-3 rounded-xl bg-aurora-surface-hover/30 border border-aurora-border/20">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-edge-cyan" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-edge-cyan">Benchmark</span>
              <span className="text-[10px] text-text-muted ml-auto">{benchmark.device} · {benchmark.precision}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-sm font-bold text-text-primary">{benchmark.firstTokenLatency || '—'}ms</p>
                <p className="text-[9px] text-text-muted">First Token</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-text-primary">{benchmark.tokensPerSecond || '—'}</p>
                <p className="text-[9px] text-text-muted">tok/s</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-text-primary">{benchmark.loadTimeMs || '—'}ms</p>
                <p className="text-[9px] text-text-muted">Load Time</p>
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="flex gap-2 mt-auto">
          {isProcessing ? (
            <button
              onClick={onStop}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-sm font-semibold hover:bg-status-error/20 transition-colors"
            >
              <Pause className="w-4 h-4" /> Stop
            </button>
          ) : isReady ? (
            <button
              onClick={handlePrimaryAction}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${modelDef.bgColor} border ${modelDef.borderColor} ${modelDef.color} text-sm font-bold hover:brightness-110 transition-all shadow-lg`}
            >
              <Play className="w-4 h-4" /> {modelDef.workspaceLabel}
            </button>
          ) : (
            <button
              onClick={handlePrimaryAction}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${modelDef.gradientFrom.replace('/20','/30')} to-transparent border ${modelDef.borderColor} ${modelDef.color} text-sm font-bold hover:brightness-110 transition-all`}
            >
              {isFailed ? (
                <><RefreshCw className="w-4 h-4" /> {pipelineLabel}</>
              ) : (
                <><Download className="w-4 h-4" /> {pipelineLabel}</>
              )}
            </button>
          )}
        </div>

        {/* Secondary actions row */}
        <div className="flex gap-2">
          <button
            onClick={onBenchmark}
            disabled={!isReady}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              isReady
                ? 'bg-aurora-surface-hover border-aurora-border text-text-secondary hover:border-edge-cyan/40 hover:text-edge-cyan'
                : 'bg-aurora-surface-hover/30 border-aurora-border/30 text-text-muted opacity-50 cursor-not-allowed'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Benchmark
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-aurora-border bg-aurora-surface-hover text-text-secondary hover:border-qwen-violet/40 hover:text-qwen-violet transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Info
            {showInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Info Panel (expanded) */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-aurora-border/30"
          >
            <div className="px-6 py-4 space-y-2.5 bg-aurora-surface-hover/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Model Details</p>

              <InfoRow label="Model ID" value={modelDef.id} mono />
              <InfoRow label="Feature Type" value={modelDef.featureType} />
              <InfoRow label="Parameters" value={modelDef.parameterSize} />
              <InfoRow label="RAM Required" value={`${modelDef.recommendedRamGb} GB`} />
              <InfoRow label="Recommended Device" value={modelDef.recommendedDevice} />
              <InfoRow label="Precision Options" value={modelDef.precisionOptions.join(', ')} />
              {liveModel?.precision && (
                <InfoRow label="Installed Precision" value={liveModel.precision} />
              )}
              {liveModel?.diskSizeGb > 0 && (
                <InfoRow label="Disk Size" value={`${liveModel.diskSizeGb} GB`} />
              )}
              {liveModel?.openvino_path && (
                <InfoRow label="OpenVINO Path" value={liveModel.openvino_path} mono />
              )}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-text-muted">Source</span>
                <a
                  href={modelDef.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-edge-cyan hover:underline flex items-center gap-1"
                >
                  HuggingFace <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Detailed benchmark (if available) */}
              {isReady && benchmark && (
                <div className="mt-3 pt-3 border-t border-aurora-border/30 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Detailed Benchmark</p>
                  <InfoRow label="Device" value={benchmark.device} />
                  <InfoRow label="Precision" value={benchmark.precision} />
                  <InfoRow label="First Token Latency" value={`${benchmark.firstTokenLatency} ms`} />
                  <InfoRow label="Throughput" value={`${benchmark.tokensPerSecond} tok/s`} />
                  <InfoRow label="Model Load Time" value={`${benchmark.loadTimeMs} ms`} />
                  <InfoRow label="RAM Used" value={`${Math.round(benchmark.ramUsedMb)} MB`} />
                  {benchmark.gpuUsedMb > 0 && (
                    <InfoRow label="GPU VRAM" value={`${Math.round(benchmark.gpuUsedMb)} MB`} />
                  )}
                  <InfoRow
                    label="NPU Status"
                    value={benchmark.npuStatus === 'available' ? 'Available' : 'Not Used'}
                    valueClass={benchmark.npuStatus === 'available' ? 'text-status-ready' : 'text-text-muted'}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
  valueClass,
}: {
  label: string
  value: string
  mono?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`${mono ? 'font-mono text-[10px]' : ''} ${valueClass ?? 'text-text-secondary'} max-w-[55%] truncate text-right`}>
        {value}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// HuggingFace Token Panel
// ─────────────────────────────────────────────
interface HFTokenStatus {
  configured: boolean
  masked: string | null
  prefix: string | null
  length: number
}

function HFTokenPanel() {
  const [tokenStatus, setTokenStatus] = useState<HFTokenStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/settings/hf-token')
      if (res.ok) setTokenStatus(await res.json())
    } catch {
      // silently ignore if backend not running
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleSave = async () => {
    const t = tokenInput.trim()
    if (!t.startsWith('hf_')) {
      showToast('error', 'Token must start with hf_')
      return
    }
    setActionLoading('save')
    try {
      const res = await fetch('http://localhost:8000/api/settings/hf-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      if (res.ok) {
        setEditing(false)
        setTokenInput('')
        setShowToken(false)
        await fetchStatus()
        showToast('success', 'HuggingFace token saved successfully.')
      } else {
        const err = await res.json()
        showToast('error', err.detail || 'Failed to save token.')
      }
    } catch {
      showToast('error', 'Could not reach backend.')
    } finally {
      setActionLoading('')
    }
  }

  const handleRevoke = async () => {
    setActionLoading('revoke')
    try {
      const res = await fetch('http://localhost:8000/api/settings/hf-token/revoke', { method: 'POST' })
      if (res.ok) {
        await fetchStatus()
        showToast('success', 'Token revoked. Downloads will run unauthenticated.')
      }
    } catch {
      showToast('error', 'Could not reach backend.')
    } finally {
      setActionLoading('')
    }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try {
      const res = await fetch('http://localhost:8000/api/settings/hf-token', { method: 'DELETE' })
      if (res.ok) {
        setConfirmDelete(false)
        await fetchStatus()
        showToast('success', 'Token permanently deleted.')
      }
    } catch {
      showToast('error', 'Could not reach backend.')
    } finally {
      setActionLoading('')
    }
  }

  const isConfigured = tokenStatus?.configured === true

  return (
    <div className="mt-8 rounded-2xl border border-aurora-border/30 bg-aurora-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-aurora-border/30 bg-aurora-surface-hover/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-status-warning/10">
            <Key className="w-4 h-4 text-status-warning" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">HuggingFace API Token</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Enables authenticated, rate-limit-free model downloads
            </p>
          </div>
        </div>
        {/* Status badge */}
        {!loading && (
          <div className="shrink-0">
            {isConfigured ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-ready/10 border border-status-ready/30 text-status-ready text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-warning/10 border border-status-warning/30 text-status-warning text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" /> Not Set
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Token display row */}
        {!editing && (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-aurora-surface-hover/50 border border-aurora-border/30">
              <Lock className="w-4 h-4 text-text-muted shrink-0" />
              <span className="flex-1 font-mono text-sm text-text-secondary tracking-widest">
                {loading
                  ? '...'
                  : isConfigured
                  ? (showToken ? tokenStatus!.prefix + '…' : tokenStatus!.masked)
                  : 'No token configured'}
              </span>
              {isConfigured && (
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-1 rounded text-text-muted hover:text-text-secondary transition-colors"
                  title={showToken ? 'Hide token' : 'Show prefix'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setEditing(true); setTokenInput('') }}
                title={isConfigured ? 'Edit token' : 'Add token'}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-aurora-border bg-aurora-surface-hover text-xs font-semibold text-text-secondary hover:text-edge-cyan hover:border-edge-cyan/40 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isConfigured ? 'Edit' : 'Add Token'}
              </button>

              {isConfigured && (
                <>
                  <button
                    onClick={handleRevoke}
                    disabled={actionLoading === 'revoke'}
                    title="Revoke token (deactivate without deleting)"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-status-warning/30 bg-status-warning/5 text-xs font-semibold text-status-warning hover:bg-status-warning/10 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'revoke'
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Unlock className="w-3.5 h-3.5" />}
                    Revoke
                  </button>

                  <button
                    onClick={() => setConfirmDelete(true)}
                    title="Permanently delete token"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-status-error/30 bg-status-error/5 text-xs font-semibold text-status-error hover:bg-status-error/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit / Add token form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3">
                <p className="text-xs text-text-muted">
                  Enter your HuggingFace access token (starts with <code className="text-edge-cyan">hf_</code>).
                  {' '}Get one at{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-edge-cyan hover:underline inline-flex items-center gap-0.5"
                  >
                    huggingface.co/settings/tokens <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter Hugging Face access token"
                    className="w-full bg-aurora-surface border border-aurora-border/60 rounded-xl px-4 py-3 pr-12 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-edge-cyan/50 transition-colors"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!tokenInput.trim() || actionLoading === 'save'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-edge-cyan/10 border border-edge-cyan/30 text-edge-cyan text-xs font-bold hover:bg-edge-cyan/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'save'
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Save Token
                  </button>
                  <button
                    onClick={() => { setEditing(false); setTokenInput(''); setShowToken(false) }}
                    className="px-4 py-2 rounded-xl border border-aurora-border bg-aurora-surface-hover text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="p-4 rounded-xl bg-status-error/10 border border-status-error/30 space-y-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-status-error mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-status-error">Permanently Delete Token?</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    The token will be removed from storage. Future downloads will run unauthenticated.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === 'delete'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-status-error text-white text-xs font-bold hover:bg-status-error/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'delete'
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-lg border border-aurora-border bg-aurora-surface-hover text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info note */}
        {!editing && (
          <p className="text-[11px] text-text-muted leading-relaxed">
            <ShieldCheck className="w-3 h-3 inline mr-1 text-status-ready" />
            Token is stored locally in your SQLite database and never sent to any external service
            other than HuggingFace Hub. It is never returned in full via any API response.
          </p>
        )}
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`mx-5 mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-status-ready/10 border border-status-ready/30 text-status-ready'
                : 'bg-status-error/10 border border-status-error/30 text-status-error'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <XCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export function ModelManagerPage() {

  const navigate = useNavigate()
  const { models, setModels, updateModel } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState<Record<string, string>>({})

  // Map job status strings to model state strings
  const JOB_STATUS_MAP: Record<string, string> = {
    running: 'downloading',
    downloading: 'downloading',
    verifying: 'verifying',
    converting: 'converting',
    quantizing: 'quantizing',
    benchmarking: 'benchmarking',
    queued: 'queued',
    completed: 'ready',
    ready: 'ready',
    downloaded: 'downloaded',
    failed: 'failed',
    cancelled: 'not-installed',
  }

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/models/catalog')
      if (res.ok) {
        const data = await res.json()
        setModels(data.models)
      }
    } catch (err) {
      console.error('Error loading model catalog:', err)
    } finally {
      setLoading(false)
    }
  }, [setModels])

  const pollJobs = useCallback(async () => {
    for (const [modelId, jobId] of Object.entries(activeJobs)) {
      try {
        const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`)
        if (res.ok) {
          const job = await res.json()
          const newState = JOB_STATUS_MAP[job.status] || job.status
          updateModel(modelId, {
            state: newState,
            jobStatus: job.status,
            jobMessage: job.message,
            progress: job.progress || 0,
          })
          if (['completed', 'failed', 'cancelled', 'downloaded'].includes(job.status)) {
            setActiveJobs((prev) => {
              const n = { ...prev }
              delete n[modelId]
              return n
            })
            // Refresh catalog after job completes
            fetchCatalog()
          }
        }
      } catch (err) {
        console.error(`Error polling job for ${modelId}:`, err)
      }
    }
  }, [activeJobs, updateModel, fetchCatalog])

  useEffect(() => {
    fetchCatalog()
    const catalogInterval = setInterval(fetchCatalog, 4000)
    const jobInterval = setInterval(pollJobs, 1500)
    return () => {
      clearInterval(catalogInterval)
      clearInterval(jobInterval)
    }
  }, [fetchCatalog, pollJobs])

  // Find live model data for each active model card
  const getLiveModel = (modelId: string) => {
    return models.find((m) => m.id === modelId) ?? null
  }

  // Stats derived from only the two active models
  const activeModelData = ACTIVE_MODELS.map((def) => getLiveModel(def.id))
  const readyCount = activeModelData.filter((m) => m?.state === 'ready').length
  const totalCount = ACTIVE_MODELS.length

  const handlePrepare = async (modelId: string, precision: string, step: 'download' | 'convert' | 'all' = 'all') => {
    try {
      updateModel(modelId, {
        state: 'queued',
        openvinoStatus: step === 'convert' ? 'converting' : 'downloading',
        progress: 0,
        jobMessage: step === 'convert' ? 'Queuing optimization job…' : 'Queuing download job…',
      })
      const res = await fetch(`http://localhost:8000/api/models/${modelId}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precision: precision.toUpperCase(),
          step: step,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.job_id) {
          setActiveJobs((prev) => ({ ...prev, [modelId]: data.job_id }))
        }
      }
    } catch (err) {
      console.error('Error preparing model:', err)
      updateModel(modelId, { state: 'failed', jobMessage: 'Failed to queue job' })
    }
  }

  const handleStop = async (modelId: string) => {
    try {
      await fetch(`http://localhost:8000/api/models/${modelId}/stop`, { method: 'POST' })
      updateModel(modelId, {
        state: 'not-installed',
        openvinoStatus: 'not_downloaded',
        progress: 0,
        jobMessage: '',
      })
      setActiveJobs((prev) => {
        const n = { ...prev }
        delete n[modelId]
        return n
      })
    } catch (err) {
      console.error('Error stopping model:', err)
    }
  }

  const handleBenchmark = async (modelId: string) => {
    try {
      const liveModel = getLiveModel(modelId)
      await fetch(`http://localhost:8000/api/models/${modelId}/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: liveModel?.recommendedDevice ?? 'GPU',
          precision: liveModel?.precision ?? 'INT4',
        }),
      })
      // Refresh to get new benchmark data
      setTimeout(fetchCatalog, 3000)
    } catch (err) {
      console.error('Error running benchmark:', err)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg hover:bg-aurora-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Model Manager</h1>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {readyCount} of {totalCount} models ready to use
                  </p>
                </div>
              </div>
              <button
                onClick={fetchCatalog}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-aurora-border bg-aurora-surface hover:bg-aurora-surface-hover text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Hero banner ── */}
          <FadeIn delay={0.05}>
            <div className="relative rounded-2xl border border-aurora-border/30 bg-aurora-surface overflow-hidden mb-8 p-6">
              <div className="absolute inset-0 bg-neural-grid opacity-10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-edge-cyan/5 rounded-full blur-[60px]" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-5 h-5 text-edge-cyan" />
                    <span className="text-xs font-bold uppercase tracking-wider text-edge-cyan">OpenVINO Pipeline</span>
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">AI Model Preparation</h2>
                  <p className="text-sm text-text-secondary mt-1 max-w-lg">
                    Download and optimize models with Intel OpenVINO. Models are converted and quantized
                    for maximum performance on your AI PC hardware.
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-3xl font-black text-text-primary">{readyCount}</p>
                    <p className="text-xs text-text-muted">Ready</p>
                  </div>
                  <div className="w-px h-10 bg-aurora-border/40" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-text-primary">{totalCount}</p>
                    <p className="text-xs text-text-muted">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* ── Model Cards ── */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-aurora-border/30 bg-aurora-surface h-80 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <StaggerContainer delay={0.08}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ACTIVE_MODELS.map((modelDef) => (
                  <StaggerItem key={modelDef.id}>
                    <ModelCard
                      modelDef={modelDef}
                      liveModel={getLiveModel(modelDef.id)}
                      onPrepare={(precision, step) => handlePrepare(modelDef.id, precision, step)}
                      onStop={() => handleStop(modelDef.id)}
                      onBenchmark={() => handleBenchmark(modelDef.id)}
                    />
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          )}

          {/* ── Pipeline explanation ── */}
          <FadeIn delay={0.3}>
            <div className="mt-8 p-5 rounded-xl border border-aurora-border/20 bg-aurora-surface-hover/20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">How the Pipeline Works</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Download',
                    desc: 'Model weights are fetched from HuggingFace Hub and verified for integrity.',
                    color: 'text-edge-cyan',
                    bg: 'bg-edge-cyan/10',
                  },
                  {
                    step: '2',
                    title: 'Optimize',
                    desc: 'Weights are converted to OpenVINO IR format and quantized to your chosen precision.',
                    color: 'text-qwen-violet',
                    bg: 'bg-qwen-violet/10',
                  },
                  {
                    step: '3',
                    title: 'Ready to Use',
                    desc: 'Model is benchmarked and ready for inference on your CPU, GPU or NPU.',
                    color: 'text-status-ready',
                    bg: 'bg-status-ready/10',
                  },
                ].map(({ step, title, desc, color, bg }) => (
                  <div key={step} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full ${bg} ${color} flex items-center justify-center text-xs font-black shrink-0 mt-0.5`}>
                      {step}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${color}`}>{title}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* ── HuggingFace Token Manager ── */}
          <FadeIn delay={0.4}>
            <HFTokenPanel />
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}
