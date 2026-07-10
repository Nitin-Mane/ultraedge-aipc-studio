import { useState, useEffect } from 'react'
import { 
  Swords, Cpu, Terminal, CheckCircle2, XCircle, RefreshCw, 
  FolderOpen, ChevronRight, ExternalLink, Settings, Zap,
  Code2, FileCode, FileJson, FileText, AlertCircle
} from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

interface RuntimeInfo {
  id: string
  name: string
  language: string
  file_extension: string
  is_available: boolean
  version: string | null
  path: string | null
  custom_path: string | null
}

interface RuntimeSettings {
  paths: Record<string, string>
  auto_detect: boolean
}

const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3776ab',
  javascript: '#f7df1e',
  c: '#a8b9cc',
  cpp: '#00599c',
  go: '#00add8',
  java: '#ed8b00',
  rust: '#dea584',
  typescript: '#3178c6',
}

const LANGUAGE_ICONS: Record<string, string> = {
  python: '🐍',
  javascript: '🟨',
  c: '⚙️',
  cpp: '⚙️',
  go: '🐹',
  java: '☕',
  rust: '🦀',
  typescript: '🔷',
}

export function CoderArenaPage({ onClose }: { onClose: () => void }) {
  const [runtimes, setRuntimes] = useState<RuntimeInfo[]>([])
  const [settings, setSettings] = useState<RuntimeSettings>({ paths: {}, auto_detect: true })
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [pathInput, setPathInput] = useState('')

  const fetchRuntimes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/runtimes/list`)
      if (res.ok) {
        const data = await res.json()
        setRuntimes(data.runtimes || [])
        setSettings(data.settings || { paths: {}, auto_detect: true })
      }
    } catch (err) {
      console.error('Failed to fetch runtimes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuntimes()
  }, [])

  const handleAutoDetect = async () => {
    setDetecting(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/runtimes/detect`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        await fetchRuntimes()
      }
    } catch (err) {
      console.error('Auto-detect failed:', err)
    } finally {
      setDetecting(false)
    }
  }

  const handleSetPath = async (language: string) => {
    if (!pathInput.trim()) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/runtimes/set-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, path: pathInput })
      })
      if (res.ok) {
        setEditingPath(null)
        setPathInput('')
        await fetchRuntimes()
      }
    } catch (err) {
      console.error('Failed to set path:', err)
    }
  }

  const availableCount = runtimes.filter(r => r.is_available).length
  const totalCount = runtimes.length

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-aurora-surface border border-aurora-border/60 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aurora-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-qwen-violet/10">
              <Swords className="w-5 h-5 text-qwen-violet" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Coder Arena</h2>
              <p className="text-xs text-text-secondary">Runtime Environment Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-aurora-base/60 border border-aurora-border/30">
              <div className={`w-2 h-2 rounded-full ${availableCount === totalCount ? 'bg-emerald-400' : 'bg-status-warning'}`} />
              <span className="text-xs text-text-secondary">{availableCount}/{totalCount} Available</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-aurora-surface-hover text-text-muted">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auto-detect bar */}
        <div className="px-6 py-3 border-b border-aurora-border/30 bg-aurora-base/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-edge-cyan" />
              <span className="text-xs text-text-secondary">Auto-detect compiler and interpreter paths</span>
            </div>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-edge-cyan/10 border border-edge-cyan/20 text-edge-cyan text-xs font-semibold hover:bg-edge-cyan/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
              {detecting ? 'Detecting...' : 'Auto Detect'}
            </button>
          </div>
        </div>

        {/* Runtime List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-qwen-violet animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {runtimes.map((runtime) => (
                <div 
                  key={runtime.id}
                  className={`border rounded-xl p-4 transition-all ${
                    runtime.is_available 
                      ? 'border-emerald-500/30 bg-emerald-500/5' 
                      : 'border-aurora-border/40 bg-aurora-base/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${LANGUAGE_COLORS[runtime.language]}15` }}
                      >
                        {LANGUAGE_ICONS[runtime.language]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text-primary">{runtime.name}</h3>
                          {runtime.is_available ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Available
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-status-error">
                              <XCircle className="w-3 h-3" /> Not Found
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                          <span className="flex items-center gap-1">
                            <FileCode className="w-3 h-3" /> {runtime.file_extension}
                          </span>
                          {runtime.version && (
                            <span className="flex items-center gap-1">
                              <Terminal className="w-3 h-3" /> v{runtime.version}
                            </span>
                          )}
                        </div>
                        {runtime.path && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted font-mono bg-aurora-base/60 rounded px-2 py-1">
                            <FolderOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{runtime.path}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {editingPath === runtime.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={pathInput}
                            onChange={(e) => setPathInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetPath(runtime.id)}
                            placeholder="Enter path..."
                            className="w-48 px-2 py-1 rounded bg-aurora-base border border-aurora-border/50 text-xs text-text-primary font-mono focus:outline-none focus:border-qwen-violet"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSetPath(runtime.id)}
                            className="px-2 py-1 rounded bg-qwen-violet/20 text-qwen-violet text-[10px] font-semibold hover:bg-qwen-violet/30"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingPath(null); setPathInput('') }}
                            className="px-2 py-1 rounded text-text-muted text-[10px] hover:bg-aurora-surface-hover"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingPath(runtime.id); setPathInput(runtime.path || runtime.custom_path || '') }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-aurora-border/40 text-xs text-text-secondary hover:bg-aurora-surface-hover transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                          {runtime.custom_path ? 'Edit Path' : 'Set Path'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-aurora-border/30 bg-aurora-base/30">
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>Platform: {navigator.platform}</span>
            <span>Configure paths for compilers and interpreters not in system PATH</span>
          </div>
        </div>
      </div>
    </div>
  )
}
