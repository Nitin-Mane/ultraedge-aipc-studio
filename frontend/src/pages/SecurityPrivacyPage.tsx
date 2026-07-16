import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Lock, Eye, EyeOff, Wifi, WifiOff,
  Globe, ArrowLeft, HardDrive, AlertTriangle,
  CheckCircle2, Trash2, MessageSquare, Server
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { Button } from '../components/Button'

const dataLocations = [
  { name: 'Models', path: '~/.ultraedge-aipc-studio/models', size: '12.4 GB', encrypted: true },
  { name: 'Chat History', path: '~/.ultraedge-aipc-studio/data/chats', size: '245 MB', encrypted: true },
  { name: 'Benchmarks', path: '~/.ultraedge-aipc-studio/data/benchmarks', size: '18 MB', encrypted: false },
  { name: 'Logs', path: '~/.ultraedge-aipc-studio/logs', size: '56 MB', encrypted: false },
]

export function SecurityPrivacyPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useAppStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearStatus, setClearStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [internetEnabled, setInternetEnabled] = useState(true)

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
                  <h1 className="text-2xl font-bold text-text-primary">Security & Privacy</h1>
                  <p className="text-sm text-text-secondary mt-1">Internet access, data controls, and agent restrictions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Internet Access */}
          <FadeIn delay={0.1}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Internet Access</h2>
            <div className="glass-card p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${internetEnabled ? 'bg-status-warning/10' : 'bg-status-ready/10'}`}>
                    {internetEnabled
                      ? <Globe className="w-6 h-6 text-status-warning" />
                      : <WifiOff className="w-6 h-6 text-status-ready" />
                    }
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Internet Access</h3>
                    <p className="text-xs text-text-secondary">Allow the application to make external network requests</p>
                  </div>
                </div>
                <button
                  onClick={() => setInternetEnabled(!internetEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    internetEnabled ? 'bg-status-warning' : 'bg-aurora-surface-hover'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: internetEnabled ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              <div className={`p-4 rounded-lg border mb-4 ${
                internetEnabled
                  ? 'bg-status-warning/5 border-status-warning/20'
                  : 'bg-status-ready/5 border-status-ready/20'
              }`}>
                {internetEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-status-warning text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Internet access is enabled (default)</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      When enabled, the following features can reach external networks:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-aurora-surface/50 border border-aurora-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Globe className="w-3.5 h-3.5 text-edge-cyan" />
                          <span className="text-xs font-semibold text-text-primary">Online Search</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Web Search API Gateway fetches live web results when you ask questions that require real-time information.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-aurora-surface/50 border border-aurora-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Server className="w-3.5 h-3.5 text-edge-violet" />
                          <span className="text-xs font-semibold text-text-primary">MCP Protocol</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Model Context Protocol tools that call external APIs (e.g. web fetch, third-party integrations) require network access.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-aurora-surface/50 border border-aurora-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-status-warning" />
                          <span className="text-xs font-semibold text-text-primary">Agents</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Personal Assistant and Coding Agent can invoke MCP tools that access the internet when permitted by this setting.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-status-ready text-xs font-medium">
                      <WifiOff className="w-4 h-4" />
                      <span>Internet access is disabled — fully offline mode</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      All network requests are blocked. Agents and MCP tools operate entirely on-device. Online search and external API calls will fail.
                    </p>
                  </div>
                )}
              </div>

              {!internetEnabled && (
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <AlertTriangle className="w-3 h-3 text-status-warning" />
                  <span>Some MCP tools depend on network access. Disabling this may break web search functionality.</span>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Data Controls */}
          <FadeIn delay={0.2}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Data Controls</h2>
            <div className="glass-card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-aurora-border/30">
                      <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Data Type</th>
                      <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Path</th>
                      <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Size</th>
                      <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Encrypted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataLocations.map((loc) => (
                      <tr key={loc.name} className="border-b border-aurora-border/20 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-text-muted" />
                            <span className="text-sm text-text-primary">{loc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-text-secondary">{loc.path}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-text-secondary">{loc.size}</span>
                        </td>
                        <td className="px-4 py-3">
                          {loc.encrypted ? (
                            <div className="flex items-center gap-1.5 text-status-ready">
                              <Lock className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">Yes</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-text-muted">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="text-xs">No</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clear Data */}
              <div className="px-4 py-3 border-t border-aurora-border/20 flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary font-medium">Clear All Chat History</p>
                  <p className="text-xs text-text-secondary">Remove all conversations from local storage</p>
                </div>
                <div className="flex items-center gap-3">
                  {clearStatus === 'success' && (
                    <span className="text-xs text-status-ready">Chat history cleared</span>
                  )}
                  {clearStatus === 'error' && (
                    <span className="text-xs text-status-warning">Failed to clear</span>
                  )}
                  {showClearConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-status-warning">Are you sure?</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          try {
                            localStorage.removeItem('ultraedge-aipc-studio-store')
                            setClearStatus('success')
                            setShowClearConfirm(false)
                            setTimeout(() => window.location.reload(), 800)
                          } catch {
                            setClearStatus('error')
                            setShowClearConfirm(false)
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1 text-status-warning" />
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowClearConfirm(false); setClearStatus('idle') }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowClearConfirm(true); setClearStatus('idle') }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-text-muted" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Privacy Settings */}
          <FadeIn delay={0.3}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Privacy Settings</h2>
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Telemetry</h3>
                  <p className="text-xs text-text-secondary">Send anonymous usage stats to improve the app</p>
                </div>
                <button
                  onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.privacyMode ? 'bg-status-ready' : 'bg-aurora-surface-hover'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: settings.privacyMode ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Chat History Logging</h3>
                  <p className="text-xs text-text-secondary">Store conversation history locally in SQLite</p>
                </div>
                <button
                  className="relative w-12 h-6 rounded-full bg-status-ready transition-colors"
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: 28 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Audit Logging</h3>
                  <p className="text-xs text-text-secondary">Track model operations and tool invocations</p>
                </div>
                <button
                  className="relative w-12 h-6 rounded-full bg-status-ready transition-colors"
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 rounded-full bg-white"
                    animate={{ left: 28 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </PageTransition>
  )
}
