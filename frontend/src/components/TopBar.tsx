import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Menu, X, Home, Settings, Shield, BarChart3, 
  Monitor, Cpu, HardDrive, Wifi, WifiOff,
  Bell, ChevronDown, Zap, Sun, Moon
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const navItems: any[] = []

export function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hardwareInfo, selectedModel, settings, theme, setTheme } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>('model')

  // Coder Settings Local State
  const [coderTemp, setCoderTemp] = useState(() => parseFloat(localStorage.getItem('coder_temp') || '0.2'))
  const [coderMaxTokens, setCoderMaxTokens] = useState(() => parseInt(localStorage.getItem('coder_maxtokens') || '2048'))
  const [coderSysPrompt, setCoderSysPrompt] = useState(() => localStorage.getItem('coder_sysprompt') || 'You are an expert coding assistant specializing in optimized, clean code.')

  // Model Settings
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('model_temp') || '0.7'))
  const [topP, setTopP] = useState(() => parseFloat(localStorage.getItem('model_topp') || '0.9'))
  const [maxTokens, setMaxTokens] = useState(() => parseInt(localStorage.getItem('model_maxtokens') || '2048'))
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('model_sysprompt') || 'You are a helpful local AI assistant.')

  // Embedding Settings

  // Voice Settings — normalize legacy values to actual speaker IDs
  const [voiceId, setVoiceId] = useState(() => {
    const raw = localStorage.getItem('voice_id') || 'Chelsie'
    const map = { 'Female (Intel AI)': 'Chelsie', 'Male (Intel AI)': 'Ethan' }
    const normalized = map[raw] || raw
    if (normalized !== raw) localStorage.setItem('voice_id', normalized)
    return normalized
  })
  const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem('voice_speed') || '1.0'))
  const [voicePitch, setVoicePitch] = useState(() => parseFloat(localStorage.getItem('voice_pitch') || '1.0'))


  // Device Settings
  const [executionDevice, setExecutionDevice] = useState(() => localStorage.getItem('device_target') || 'AUTO')
  const [powerMode, setPowerMode] = useState(() => localStorage.getItem('power_mode') || 'Balanced')

  const activeDevice = selectedModel?.recommendedDevice || (hardwareInfo?.gpu && !hardwareInfo.gpu.toLowerCase().includes('not_detected') ? 'GPU' : 'CPU')

  const ramTotal = hardwareInfo?.ramTotal || 16
  const ramAvailable = hardwareInfo?.ramAvailable || 8
  const ramUsed = Math.max(0.1, ramTotal - ramAvailable)
  const ramUsagePercent = Math.min(100, Math.max(0, Math.round((ramUsed / ramTotal) * 100)))

  const [simulatedGpuUsage, setSimulatedGpuUsage] = useState(5)
     
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedModel && activeDevice === 'GPU') {
        setSimulatedGpuUsage(prev => {
          const base = 52
          const delta = Math.floor(Math.random() * 9) - 4 // -4 to +4
          return Math.max(10, Math.min(100, base + delta))
        })
      } else {
        setSimulatedGpuUsage(prev => {
          const base = 3
          const delta = Math.floor(Math.random() * 3) - 1 // -1 to +1
          return Math.max(1, Math.min(8, base + delta))
        })
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [selectedModel, activeDevice])

  const handleSaveSettings = () => {
    localStorage.setItem('model_temp', temperature.toString())
    localStorage.setItem('model_topp', topP.toString())
    localStorage.setItem('model_maxtokens', maxTokens.toString())
    localStorage.setItem('model_sysprompt', systemPrompt)


    localStorage.setItem('voice_id', voiceId)
    localStorage.setItem('voice_speed', voiceSpeed.toString())
    localStorage.setItem('voice_pitch', voicePitch.toString())


    localStorage.setItem('device_target', executionDevice)
    localStorage.setItem('power_mode', powerMode)

    setSettingsOpen(false)
  }

  const handleSaveCoderSettings = () => {
    localStorage.setItem('coder_temp', coderTemp.toString())
    localStorage.setItem('coder_maxtokens', coderMaxTokens.toString())
    localStorage.setItem('coder_sysprompt', coderSysPrompt)
    setSettingsOpen(false)
  }

  const getSettingsConfig = () => {
    const path = location.pathname
    if (path === '/dashboard') return null
    if (path === '/personal-assistant') return { label: 'Chat Settings', title: 'Chat Configuration', tabs: ['model', 'voice', 'device'] as const }
    if (path === '/coding-agent') return { label: 'Coder Settings', title: 'Coder Configuration', tabs: ['general'] as const }
    return null
  }

  const settingsConfig = getSettingsConfig()

  const formattedCpuName = hardwareInfo?.cpu
    ? (hardwareInfo.cpu.includes('Ultra') ? 'Intel Core Ultra' : hardwareInfo.cpu.split(' ').slice(0, 3).join(' '))
    : 'Intel CPU'

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30"
    >
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-1.5 bg-edge-blue/15 px-2.5 py-1 rounded text-edge-cyan font-black text-sm tracking-wider border border-edge-blue/30 uppercase">
                <img src="/ultraedge.svg" alt="" className="w-4 h-4 rounded-sm" />
                UltraEdge
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-text-primary leading-tight">AIPC Studio</h1>
                <p className="text-[10px] text-text-muted leading-tight">Powered by OpenVINO</p>
              </div>
            </button>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-edge-cyan bg-edge-cyan/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Right: Status & Settings */}
          <div className="flex items-center gap-3">
            {/* Hardware Status */}
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg bg-aurora-surface/80 border border-aurora-border/50 shadow-md">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${settings.defaultHardwareMode === 'auto' ? 'bg-emerald-400' : 'bg-status-warning'}`} />
                <span className="text-xs font-semibold text-text-primary leading-none whitespace-nowrap">
                  Auto Mode: {settings.defaultHardwareMode === 'auto' ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="w-px h-5 bg-aurora-border/50" />
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-edge-cyan" />
                <span className="text-xs font-semibold text-text-primary leading-none whitespace-nowrap">
                  RAM: {ramUsagePercent}%
                </span>
              </div>
              {activeDevice === 'GPU' && (
                <>
                  <div className="w-px h-5 bg-aurora-border/50" />
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-status-warning animate-pulse" />
                    <span className="text-xs font-semibold text-text-primary leading-none whitespace-nowrap">
                      GPU: {simulatedGpuUsage}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-aurora-border/50 hover:bg-aurora-surface-hover text-text-secondary hover:text-text-primary transition-all shadow-sm bg-aurora-surface/40 flex items-center justify-center shrink-0"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-edge-blue" />
              )}
            </button>

            {/* Settings Button & Popover */}
            {settingsConfig && (
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-edge-cyan/10 hover:bg-edge-cyan/20 border border-edge-cyan/30 text-xs font-semibold text-edge-cyan transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {settingsConfig.label}
                </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-80 p-5 bg-aurora-surface border border-aurora-border/60 shadow-2xl rounded-xl z-50 flex flex-col gap-4 text-text-primary">
                  <div className="flex items-center justify-between border-b border-aurora-border/30 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan">
                      {settingsConfig.title}
                    </h3>
                  </div>

                  {/* Settings Category Tabs */}
                  {settingsConfig.tabs.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-aurora-border/20">
                      {settingsConfig.tabs.map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveSettingsTab(tab)}
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0 transition-colors ${
                            activeSettingsTab === tab 
                              ? 'bg-edge-cyan/15 text-edge-cyan border border-edge-cyan/20' 
                              : 'text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab Contents */}
                  <div className="space-y-3 min-h-[190px] flex flex-col justify-start">
                    {/* Chat Settings - Model Tab */}
                    {activeSettingsTab === 'model' && (
                      <>
                        {/* Temperature */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                            <span>Temperature</span>
                            <span>{temperature}</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.5"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Top P */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                            <span>Top P</span>
                            <span>{topP}</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={topP}
                            onChange={(e) => setTopP(parseFloat(e.target.value))}
                            className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Max Tokens */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Max New Tokens</label>
                          <input
                            type="number"
                            min="128"
                            max="4096"
                            step="128"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none"
                          />
                        </div>

                        {/* System Instructions */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">System Instructions</label>
                          <textarea
                            rows={2}
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none resize-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Chat Settings - Voice Tab */}
                    {activeSettingsTab === 'voice' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">AI Voice (token2wav)</label>
                          <select
                            value={voiceId}
                            onChange={(e) => setVoiceId(e.target.value)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none"
                          >
                            <option value="Chelsie">👩 Chelsie (Female)</option>
                            <option value="Ethan">👨 Ethan (Male)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                            <span>Speech Speed Rate</span>
                            <span>{voiceSpeed}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={voiceSpeed}
                            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                            className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                            <span>Speech Pitch</span>
                            <span>{voicePitch}</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                            value={voicePitch}
                            onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                            className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </>
                    )}

                    {/* Chat Settings - Device Tab */}
                    {activeSettingsTab === 'device' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Execution Hardware Target</label>
                          <select
                            value={executionDevice}
                            onChange={(e) => setExecutionDevice(e.target.value)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none"
                          >
                            <option value="AUTO">AUTO (Highly Recommended)</option>
                            <option value="GPU">GPU (Intel Iris Xe / Arc)</option>
                            <option value="NPU">NPU (Intel AI Boost)</option>
                            <option value="CPU">CPU Only</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Energy & Power Profile</label>
                          <select
                            value={powerMode}
                            onChange={(e) => setPowerMode(e.target.value)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none"
                          >
                            <option value="High Performance">Max Acceleration (High Watts)</option>
                            <option value="Balanced">Balanced Optimizer (Core Control)</option>
                            <option value="Battery Saver">Energy Saver Mode</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Coder Settings - General Tab */}
                    {activeSettingsTab === 'general' && location.pathname === '/coding-agent' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] font-bold text-text-secondary">
                            <span>Temperature</span>
                            <span>{coderTemp}</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={coderTemp}
                            onChange={(e) => setCoderTemp(parseFloat(e.target.value))}
                            className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-[8px] text-text-muted">Lower values produce more deterministic code</p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Max Output Tokens</label>
                          <input
                            type="number"
                            min="256"
                            max="8192"
                            step="256"
                            value={coderMaxTokens}
                            onChange={(e) => setCoderMaxTokens(parseInt(e.target.value) || 2048)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">System Prompt</label>
                          <textarea
                            rows={3}
                            value={coderSysPrompt}
                            onChange={(e) => setCoderSysPrompt(e.target.value)}
                            className="w-full bg-aurora-surface border border-aurora-border p-2 rounded-input text-xs text-text-primary focus:outline-none resize-none"
                          />
                        </div>
                      </>
                    )}

                  </div>

                  {/* Save */}
                  <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-aurora-border/30">
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={
                        location.pathname === '/coding-agent'
                          ? handleSaveCoderSettings
                          : handleSaveSettings
                      }
                      className="text-xs bg-edge-cyan text-aurora-base font-bold px-3 py-1.5 rounded-lg hover:bg-edge-cyan-hover transition-colors"
                    >
                      Apply Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}



            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden border-t border-aurora-border/30 bg-aurora-base/95 backdrop-blur-glass"
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-edge-cyan bg-edge-cyan/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}