import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, FolderOpen, HardDrive, Cpu, Monitor, Palette,
  Database, Code, FileText, Shield, Bell, Globe, Info,
  ChevronRight, ExternalLink, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function SettingsPage() {
  const { settings, updateSettings, hardwareInfo } = useAppStore()
  const [activeSection, setActiveSection] = useState('general')

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'data', label: 'Data & Storage', icon: Database },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'developer', label: 'Developer', icon: Code },
    { id: 'about', label: 'About', icon: Info },
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
            <p className="text-sm text-text-secondary mt-1">Configure application preferences</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <FadeIn delay={0.1}>
              <div className="lg:w-64 flex-shrink-0">
                <div className="glass-card p-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                        activeSection === section.id
                          ? 'bg-edge-cyan/10 text-edge-cyan border border-edge-cyan/30'
                          : 'text-text-secondary hover:bg-aurora-surface-hover'
                      }`}
                    >
                      <section.icon className="w-4 h-4" />
                      <span>{section.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Main Content */}
            <div className="flex-1">
              <FadeIn delay={0.15}>
                {/* General Settings */}
                {activeSection === 'general' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">General Settings</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-aurora-surface/30">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Enterprise Mode</p>
                            <p className="text-xs text-text-secondary">Enable enterprise features and policies</p>
                          </div>
                          <button
                            onClick={() => updateSettings({ enterpriseMode: !settings.enterpriseMode })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              settings.enterpriseMode ? 'bg-edge-cyan' : 'bg-aurora-surface-hover'
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 w-4 h-4 rounded-full bg-white"
                              animate={{ left: settings.enterpriseMode ? 28 : 4 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-aurora-surface/30">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Developer Mode</p>
                            <p className="text-xs text-text-secondary">Show advanced options and debug tools</p>
                          </div>
                          <button
                            onClick={() => updateSettings({ developerMode: !settings.developerMode })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              settings.developerMode ? 'bg-edge-cyan' : 'bg-aurora-surface-hover'
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 w-4 h-4 rounded-full bg-white"
                              animate={{ left: settings.developerMode ? 28 : 4 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Settings */}
                {activeSection === 'models' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">Model Settings</h2>
                      
                      <div className="space-y-4">
                        <Input
                          label="Model Directory"
                          value={settings.modelDirectory || '~/.ultraedge-aipc-studio/models'}
                          onChange={(e) => updateSettings({ modelDirectory: e.target.value })}
                          leftIcon={<FolderOpen className="w-4 h-4" />}
                          helperText="Where downloaded models are stored"
                        />

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Default Hardware Mode
                          </label>
                          <select
                            value={settings.defaultHardwareMode}
                            onChange={(e) => updateSettings({ defaultHardwareMode: e.target.value as 'auto' | 'cpu' | 'gpu' | 'npu' })}
                            className="input-field"
                          >
                            <option value="auto">AUTO (App chooses best device)</option>
                            <option value="cpu">CPU (Maximum compatibility)</option>
                            <option value="gpu">GPU (Recommended for larger models)</option>
                            <option value="npu">NPU (After compatibility test)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data & Storage */}
                {activeSection === 'data' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">Data & Storage</h2>
                      
                      <div className="space-y-4">
                        <Input
                          label="Data Directory"
                          value={settings.dataDirectory || '~/.ultraedge-aipc-studio/data'}
                          onChange={(e) => updateSettings({ dataDirectory: e.target.value })}
                          leftIcon={<Database className="w-4 h-4" />}
                          helperText="Where chat history and documents are stored"
                        />

                        <div className="p-4 rounded-xl bg-aurora-surface/30">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-text-primary">Storage Usage</p>
                            <span className="text-xs text-text-muted">14.2 GB total</span>
                          </div>
                          <div className="w-full h-2 bg-aurora-surface-hover rounded-full overflow-hidden">
                            <div className="w-[45%] h-full bg-gradient-to-r from-edge-cyan to-qwen-violet rounded-full" />
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span>Models: 12.4 GB</span>
                            <span>Data: 1.5 GB</span>
                            <span>Logs: 56 MB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy */}
                {activeSection === 'privacy' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">Privacy Settings</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-aurora-surface/30">
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-status-ready" />
                            <div>
                              <p className="text-sm font-medium text-text-primary">Local-Only Mode</p>
                              <p className="text-xs text-text-secondary">All processing happens on your device</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-ready/10 border border-status-ready/30">
                            <CheckCircle2 className="w-4 h-4 text-status-ready" />
                            <span className="text-xs font-medium text-status-ready">Active</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-aurora-surface/30">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Privacy Mode</p>
                            <p className="text-xs text-text-secondary">Disable network access completely</p>
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance */}
                {activeSection === 'appearance' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">Appearance</h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Theme
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button className="p-4 rounded-xl border-2 border-edge-cyan bg-aurora-base text-left">
                              <div className="w-full h-20 rounded-lg bg-aurora-base mb-3 border border-aurora-border" />
                              <p className="text-sm font-medium text-text-primary">Dark (Default)</p>
                              <p className="text-xs text-text-muted">OpenVINO Aurora UI</p>
                            </button>
                            <button className="p-4 rounded-xl border-2 border-aurora-border bg-aurora-surface-hover/30 text-left opacity-50" disabled>
                              <div className="w-full h-20 rounded-lg bg-gray-100 mb-3 border border-gray-200" />
                              <p className="text-sm font-medium text-text-primary">Light</p>
                              <p className="text-xs text-text-muted">Coming Soon</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Developer */}
                {activeSection === 'developer' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">Developer Settings</h2>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Logging Level
                          </label>
                          <select
                            value={settings.loggingLevel}
                            onChange={(e) => updateSettings({ loggingLevel: e.target.value as 'debug' | 'info' | 'warn' | 'error' })}
                            className="input-field"
                          >
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                          </select>
                        </div>

                        <div className="p-4 rounded-xl bg-aurora-surface/30">
                          <p className="text-sm font-medium text-text-primary mb-2">API Endpoint</p>
                          <p className="text-xs font-mono text-text-secondary">http://localhost:8000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* About */}
                {activeSection === 'about' && (
                  <div className="space-y-6">
                    <div className="glass-card p-6">
                      <h2 className="text-lg font-semibold text-text-primary mb-4">About</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shadow-glow-cyan">
                            <img src="/ultraedge.svg" alt="UltraEdge AIPC Studio" className="w-full h-full" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-text-primary">UltraEdge AIPC Studio</h3>
                            <p className="text-sm text-text-secondary">Version 1.0.0</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-aurora-surface/30">
                            <span className="text-sm text-text-secondary">Developer</span>
                            <span className="text-sm font-medium text-text-primary">Mr. Nitin Mane</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-aurora-surface/30">
                            <span className="text-sm text-text-secondary">Role</span>
                            <span className="text-sm font-medium text-text-primary">Intel Software Innovator</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-aurora-surface/30">
                            <span className="text-sm text-text-secondary">Powered By</span>
                            <span className="text-sm font-medium text-edge-cyan">OpenVINO Toolkit</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-aurora-surface/30">
                            <span className="text-sm text-text-secondary">Model Ecosystem</span>
                            <span className="text-sm font-medium text-qwen-violet">Qwen3</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-aurora-border/30">
                          <p className="text-xs text-text-muted text-center">
                            A local-first AI application for Intel AI PCs.
                            All processing happens on your device for complete privacy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}