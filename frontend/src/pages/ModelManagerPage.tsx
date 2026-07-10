import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Download, Upload, Play, Pause, Trash2, BarChart3, 
  Settings, ChevronDown, ChevronUp, ExternalLink, Cpu, HardDrive,
  MemoryStick, Zap, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Eye, Code2, FileText, Mic, Volume2, Layers, Image,
  MoreVertical, Info, ArrowUpDown, Grid, List, ArrowLeft
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { 
  QWEN_MODEL_CATALOG, 
  MODEL_FEATURE_TYPES, 
  MODEL_FAMILIES,
  MODEL_STATE_LABELS,
  OPENVINO_STATUS_LABELS,
  BENCHMARK_STATUS_LABELS
} from '../hooks/modelCatalog'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'

const iconMap: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="w-5 h-5" />,
  Code2: <Code2 className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Eye: <Eye className="w-5 h-5" />,
  Mic: <Mic className="w-5 h-5" />,
  Volume2: <Volume2 className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Image: <Image className="w-5 h-5" />,
}

function getStateColor(state: string) {
  switch (state) {
    case 'ready': return 'text-status-ready'
    case 'downloading':
    case 'converting':
    case 'quantizing':
    case 'benchmarking':
    case 'verifying': return 'text-status-preparing'
    case 'failed': return 'text-status-error'
    case 'not-installed': return 'text-text-muted'
    default: return 'text-text-secondary'
  }
}

function getStateBadge(state: string) {
  switch (state) {
    case 'ready': return 'status-ready'
    case 'downloading':
    case 'converting':
    case 'quantizing':
    case 'benchmarking':
    case 'verifying': return 'status-preparing'
    case 'failed': return 'status-error'
    case 'not-installed': return 'bg-aurora-surface-hover text-text-muted border border-aurora-border'
    default: return 'bg-aurora-surface-hover text-text-secondary border border-aurora-border'
  }
}

function ModelCard({ model, onSelect, onPrepare, onStop, onDelete }: {
  model: typeof QWEN_MODEL_CATALOG[0]
  onSelect: () => void
  onPrepare: (precision: string) => void
  onStop: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedPrecision, setSelectedPrecision] = useState('int4')
  const featureInfo = MODEL_FEATURE_TYPES[model.featureType as keyof typeof MODEL_FEATURE_TYPES] || MODEL_FEATURE_TYPES.personal_assistant
  const familyInfo = MODEL_FAMILIES[model.family as keyof typeof MODEL_FAMILIES]

  const isDownloading = ['downloading', 'converting', 'quantizing', 'benchmarking', 'verifying', 'queued'].includes(model.state)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className="glass-card-hover p-5 cursor-pointer"
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${featureInfo.bgColor} ${featureInfo.color}`}>
            {iconMap[featureInfo.icon] || <Zap className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">{model.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">{familyInfo?.description || model.family}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-badge ${getStateBadge(model.state)}`}>
            {MODEL_STATE_LABELS[model.state] || model.state}
          </span>
        </div>
      </div>

      {/* Model Info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Cpu className="w-3.5 h-3.5 text-edge-cyan" />
          <span>{model.parameterSize} Parameters</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <HardDrive className="w-3.5 h-3.5 text-qwen-violet" />
          <span>{model.recommendedRamGb}GB RAM</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Zap className="w-3.5 h-3.5 text-status-warning" />
          <span>{model.recommendedDevice}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <MemoryStick className="w-3.5 h-3.5 text-status-ready" />
          <span>{model.precisionOptions.join(', ')}</span>
        </div>
      </div>

      {/* Benchmark Summary (if available) */}
      {model.benchmark && (
        <div className="mb-3 p-2.5 rounded-lg bg-aurora-surface-hover/30 border border-aurora-border/20">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-edge-cyan" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-edge-cyan">Benchmarks</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xs font-bold text-text-primary">{model.benchmark.firstTokenLatency}ms</p>
              <p className="text-[8px] text-text-muted">First Token</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-text-primary">{model.benchmark.tokensPerSecond}</p>
              <p className="text-[8px] text-text-muted">tok/s</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-text-primary">{model.benchmark.loadTimeMs}ms</p>
              <p className="text-[8px] text-text-muted">Load Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Row */}
      <div className="flex items-center justify-between pt-3 border-t border-aurora-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${model.openvinoStatus === 'converted' ? 'bg-status-ready' : 'bg-status-warning'}`} />
            <span className="text-xs text-text-muted">
              OpenVINO: {OPENVINO_STATUS_LABELS[model.openvinoStatus] || model.openvinoStatus}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${model.benchmarkStatus === 'completed' ? 'bg-status-ready' : 'bg-status-warning'}`} />
            <span className="text-xs text-text-muted">
              Benchmark: {BENCHMARK_STATUS_LABELS[model.benchmarkStatus] || model.benchmarkStatus}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="p-1 rounded-lg hover:bg-aurora-surface-hover transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-aurora-border/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Feature Type</span>
                <span className={featureInfo.color}>{featureInfo.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">License</span>
                <span className="text-text-secondary">{model.license}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">NPU Support</span>
                <span className={model.npuStatus === 'supported' ? 'text-status-ready' : model.npuStatus === 'not-supported' ? 'text-status-error' : 'text-text-muted'}>
                  {model.npuStatus === 'supported' ? 'Supported' : model.npuStatus === 'not-supported' ? 'Not Supported' : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Source</span>
                <a 
                  href={model.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-edge-cyan hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  HuggingFace <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {model.localOpenVinoPath && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">OpenVINO Path</span>
                  <span className="text-text-secondary font-mono text-[10px]">{model.localOpenVinoPath}</span>
                </div>
              )}
              {model.diskSizeGb !== undefined && model.diskSizeGb > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Disk Size</span>
                  <span className="text-text-secondary">{model.diskSizeGb} GB</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Last Updated</span>
                <span className="text-text-secondary">{model.lastUpdated}</span>
              </div>
            </div>

            {/* Full Benchmark Details (expanded) */}
            {model.benchmark && (
              <div className="mt-3 p-3 rounded-lg bg-aurora-surface-hover/30 border border-aurora-border/20 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-edge-cyan" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-edge-cyan">Detailed Benchmarks</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Device</span>
                    <span className="text-text-secondary font-medium">{model.benchmark.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Precision</span>
                    <span className="text-text-secondary font-medium">{model.benchmark.precision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">First Token Latency</span>
                    <span className="text-text-secondary font-medium">{model.benchmark.firstTokenLatency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Throughput</span>
                    <span className="text-text-secondary font-medium">{model.benchmark.tokensPerSecond} tok/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Model Load Time</span>
                    <span className="text-text-secondary font-medium">{model.benchmark.loadTimeMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">RAM Used</span>
                    <span className="text-text-secondary font-medium">{Math.round(model.benchmark.ramUsedMb)}MB</span>
                  </div>
                  {model.benchmark.gpuUsedMb > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">GPU VRAM</span>
                      <span className="text-text-secondary font-medium">{Math.round(model.benchmark.gpuUsedMb)}MB</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-muted">NPU Status</span>
                    <span className={`font-medium ${model.benchmark.npuStatus === 'available' ? 'text-status-ready' : 'text-text-muted'}`}>
                      {model.benchmark.npuStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Conversion Progress Bar */}
            {['downloading', 'converting', 'quantizing', 'benchmarking', 'verifying', 'queued'].includes(model.state) && (
              <div className="mt-3 p-3 rounded-lg bg-aurora-surface-hover/30 border border-aurora-border/20 space-y-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span className="font-medium animate-pulse">{model.jobMessage || 'Preparing model...'}</span>
                  <span>{model.progress ?? 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-aurora-surface-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-edge-cyan to-qwen-violet rounded-full transition-all duration-500"
                    style={{ width: `${model.progress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Failed State Error */}
            {model.state === 'failed' && (
              <div className="mt-3 p-3 rounded-lg bg-status-error/10 border border-status-error/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-error" />
                  <span className="text-xs font-semibold text-status-error">Download/Conversion Failed</span>
                </div>
                {model.jobMessage && (
                  <p className="text-[10px] text-text-muted mt-1.5 font-mono">{model.jobMessage}</p>
                )}
                <p className="text-[10px] text-text-secondary mt-2">Click "Retry Download" to try again, or "Clear Status" to reset.</p>
              </div>
            )}

            {/* Action Buttons - No Load button */}
            <div className="flex gap-2 mt-4">
              {model.state === 'not-installed' && (
                <>
                  <div className="relative">
                    <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }}>
                      <Settings className="w-4 h-4 mr-1" /> Download & Convert
                    </Button>
                    {showSettings && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 p-4 bg-aurora-surface border border-aurora-border/60 shadow-2xl rounded-xl z-50" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-edge-cyan mb-3">Conversion Settings</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Weight Format</label>
                            <select
                              value={selectedPrecision}
                              onChange={(e) => setSelectedPrecision(e.target.value)}
                              className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none mt-1"
                            >
                              {model.precisionOptions.map(p => (
                                <option key={p} value={p.toLowerCase()}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onPrepare(selectedPrecision); setShowSettings(false) }}>
                              <Download className="w-4 h-4 mr-1" /> Start
                            </Button>
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setShowSettings(false) }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      try {
                        await fetch(`http://localhost:8000/api/models/${model.id}/status`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'ready' })
                        });
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Ready
                  </Button>
                </>
              )}
              {isDownloading && (
                <>
                  <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onStop() }}>
                    <Pause className="w-4 h-4 mr-1" /> Stop
                  </Button>
                </>
              )}
              {model.state === 'failed' && (
                <>
                  <div className="relative">
                    <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings) }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Retry Download
                    </Button>
                    {showSettings && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 p-4 bg-aurora-surface border border-aurora-border/60 shadow-2xl rounded-xl z-50" onClick={(e) => e.stopPropagation()}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-edge-cyan mb-3">Conversion Settings</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Weight Format</label>
                            <select
                              value={selectedPrecision}
                              onChange={(e) => setSelectedPrecision(e.target.value)}
                              className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none mt-1"
                            >
                              {model.precisionOptions.map(p => (
                                <option key={p} value={p.toLowerCase()}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onPrepare(selectedPrecision); setShowSettings(false) }}>
                              <RefreshCw className="w-4 h-4 mr-1" /> Retry
                            </Button>
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setShowSettings(false) }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      try {
                        await fetch(`http://localhost:8000/api/models/${model.id}/status`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'not_installed' })
                        });
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Clear Status
                  </Button>
                </>
              )}
              {model.state === 'ready' && (
                <Button variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                  <BarChart3 className="w-4 h-4 mr-1" /> Benchmark
                </Button>
              )}
              {model.state === 'loaded' && (
                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                  <Pause className="w-4 h-4 mr-1" /> Unload
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Info className="w-4 h-4 mr-1" /> Details
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ModelManagerPage() {
  const navigate = useNavigate()
  const { models, setModels, updateModel, selectedModel, setSelectedModel, hardwareInfo } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFamily, setSelectedFamily] = useState<string>('all')
  const [selectedFeature, setSelectedFeature] = useState<string>('all')
  const [selectedState, setSelectedState] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'state'>('name')
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState<Record<string, string>>({})

  const JOB_STATUS_MAP: Record<string, string> = {
    'running': 'downloading',
    'downloading': 'downloading',
    'converting': 'converting',
    'quantizing': 'quantizing',
    'benchmarking': 'benchmarking',
    'verifying': 'verifying',
    'queued': 'queued',
    'completed': 'ready',
    'ready': 'ready',
    'failed': 'failed',
    'cancelled': 'not-installed',
  }

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/models/catalog')
        if (res.ok) {
          const data = await res.json()
          setModels(data.models)
        }
      } catch (err) {
        console.error("Error loading model catalog:", err)
      } finally {
        setLoading(false)
      }
    }

    const pollJobs = async () => {
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
            if (['completed', 'failed', 'cancelled'].includes(job.status)) {
              setActiveJobs(prev => { const n = { ...prev }; delete n[modelId]; return n })
            }
          }
        } catch (err) {
          console.error(`Error polling job for ${modelId}:`, err)
        }
      }
    }

    fetchCatalog()
    const catalogInterval = setInterval(fetchCatalog, 3000)
    const jobInterval = setInterval(pollJobs, 1500)
    return () => { clearInterval(catalogInterval); clearInterval(jobInterval) }
  }, [activeJobs])

  // Use database catalog models as source of truth, fallback to static catalog if empty
  const catalogModels = models.length > 0 ? models : QWEN_MODEL_CATALOG

  // Filter models
  const filteredModels = catalogModels.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.featureType.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFamily = selectedFamily === 'all' || model.family === selectedFamily
    const matchesFeature = selectedFeature === 'all' || model.featureType === selectedFeature
    const matchesState = selectedState === 'all' || model.state === selectedState

    return matchesSearch && matchesFamily && matchesFeature && matchesState
  })

  // Sort models
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'size') return parseFloat(a.parameterSize) - parseFloat(b.parameterSize)
    return a.state.localeCompare(b.state)
  })

  // Stats
  const stats = {
    total: catalogModels.length,
    ready: catalogModels.filter(m => m.state === 'ready').length,
    installed: catalogModels.filter(m => ['ready', 'loaded', 'running'].includes(m.state)).length,
    notInstalled: catalogModels.filter(m => m.state === 'not-installed').length,
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg hover:bg-aurora-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Model Manager</h1>
                  <p className="text-sm text-text-secondary mt-1">
                    {stats.total} models in catalog • {stats.ready} ready to use
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
                <Button variant="primary" size="sm">
                  <Download className="w-4 h-4 mr-1.5" /> Import Model
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
                    <Layers className="w-5 h-5 text-edge-cyan" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
                    <p className="text-xs text-text-muted">Total Models</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-status-ready/10">
                    <CheckCircle2 className="w-5 h-5 text-status-ready" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.ready}</p>
                    <p className="text-xs text-text-muted">Ready</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-status-preparing/10">
                    <Clock className="w-5 h-5 text-status-preparing" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.installed}</p>
                    <p className="text-xs text-text-muted">Installed</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-status-warning/10">
                    <AlertTriangle className="w-5 h-5 text-status-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{stats.notInstalled}</p>
                    <p className="text-xs text-text-muted">Not Installed</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Filters */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search models by name, family, or feature..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
                <div className="flex gap-3">
                  <select
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                    className="input-field w-auto min-w-[150px]"
                  >
                    <option value="all">All Families</option>
                    {Object.entries(MODEL_FAMILIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedFeature}
                    onChange={(e) => setSelectedFeature(e.target.value)}
                    className="input-field w-auto min-w-[150px]"
                  >
                    <option value="all">All Features</option>
                    {Object.entries(MODEL_FEATURE_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="input-field w-auto min-w-[150px]"
                  >
                    <option value="all">All States</option>
                    <option value="ready">Ready</option>
                    <option value="not-installed">Not Installed</option>
                    <option value="downloading">Downloading</option>
                    <option value="converting">Converting</option>
                    <option value="failed">Failed</option>
                    <option value="loaded">Loaded</option>
                    <option value="running">Running</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-aurora-border/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Sort by:</span>
                  <button
                    onClick={() => setSortBy('name')}
                    className={`text-xs px-2 py-1 rounded ${sortBy === 'name' ? 'bg-edge-cyan/20 text-edge-cyan' : 'text-text-secondary hover:bg-aurora-surface-hover'}`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => setSortBy('size')}
                    className={`text-xs px-2 py-1 rounded ${sortBy === 'size' ? 'bg-edge-cyan/20 text-edge-cyan' : 'text-text-secondary hover:bg-aurora-surface-hover'}`}
                  >
                    Size
                  </button>
                  <button
                    onClick={() => setSortBy('state')}
                    className={`text-xs px-2 py-1 rounded ${sortBy === 'state' ? 'bg-edge-cyan/20 text-edge-cyan' : 'text-text-secondary hover:bg-aurora-surface-hover'}`}
                  >
                    State
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-edge-cyan/20 text-edge-cyan' : 'text-text-secondary hover:bg-aurora-surface-hover'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-edge-cyan/20 text-edge-cyan' : 'text-text-secondary hover:bg-aurora-surface-hover'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Model Grid */}
          <StaggerContainer delay={0.05}>
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {sortedModels.map((model) => (
                <StaggerItem key={model.id}>
                  <ModelCard
                    model={model}
                    onSelect={() => setSelectedModel(model)}
                    onPrepare={async (precision) => {
                      try {
                        updateModel(model.id, { state: 'queued', openvinoStatus: 'downloading', progress: 0, jobMessage: 'Queuing download job...' })
                        const res = await fetch(`http://localhost:8000/api/models/${model.id}/prepare`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ precision: precision.toUpperCase() })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.job_id) {
                            setActiveJobs(prev => ({ ...prev, [model.id]: data.job_id }))
                          }
                        }
                      } catch (err) {
                        console.error("Error preparing model:", err)
                        updateModel(model.id, { state: 'failed', jobMessage: 'Failed to queue job' })
                      }
                    }}
                    onStop={async () => {
                      try {
                        await fetch(`http://localhost:8000/api/models/${model.id}/stop`, {
                          method: 'POST'
                        })
                        updateModel(model.id, { state: 'not-installed', openvinoStatus: 'not_downloaded', progress: 0, jobMessage: '' })
                        setActiveJobs(prev => { const n = { ...prev }; delete n[model.id]; return n })
                      } catch (err) {
                        console.error("Error stopping model:", err)
                      }
                    }}
                    onDelete={async () => {
                      try {
                        updateModel(model.id, { state: 'ready' })
                        await fetch('http://localhost:8000/api/runtime/unload', {
                          method: 'POST'
                        })
                      } catch (err) {
                        console.error("Error unloading model:", err)
                      }
                    }}
                  />
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>

          {sortedModels.length === 0 && (
            <FadeIn delay={0.3}>
              <div className="glass-card p-12 text-center">
                <Search className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No models found</h3>
                <p className="text-text-secondary">Try adjusting your search or filters</p>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

// Import icons for iconMap
import { MessageSquare } from 'lucide-react'