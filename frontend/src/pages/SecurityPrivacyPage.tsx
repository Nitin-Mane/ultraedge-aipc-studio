import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Shield, Lock, Unlock, Eye, EyeOff, Wifi, WifiOff,
  Database, Key, FileCheck, AlertTriangle, CheckCircle2,
  Settings, Server, HardDrive, Globe, Activity, ArrowLeft
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'
import { Button } from '../components/Button'

const securityFeatures = [
  {
    id: 'local-only',
    title: 'Local-Only Mode',
    description: 'All processing happens on your device. No data leaves your machine.',
    icon: WifiOff,
    status: 'active',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready/10',
  },
  {
    id: 'encryption',
    title: 'Encrypted Storage',
    description: 'Model weights and user data are encrypted at rest.',
    icon: Lock,
    status: 'active',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready/10',
  },
  {
    id: 'privacy',
    title: 'Privacy Controls',
    description: 'Control what data is stored and for how long.',
    icon: Eye,
    status: 'active',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready/10',
  },
  {
    id: 'audit',
    title: 'Audit Logs',
    description: 'Track all model operations and data access.',
    icon: FileCheck,
    status: 'active',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready/10',
  },
  {
    id: 'permissions',
    title: 'Tool Permissions',
    description: 'Control which tools and features have access to your data.',
    icon: Key,
    status: 'active',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready/10',
  },
  {
    id: 'enterprise',
    title: 'Enterprise Policy',
    description: 'Advanced controls for enterprise deployments.',
    icon: Server,
    status: 'inactive',
    color: 'text-text-muted',
    bgColor: 'bg-aurora-surface-hover',
  },
]

const dataLocations = [
  { name: 'Models', path: '~/.ultraedge-aipc-studio/models', size: '12.4 GB', encrypted: true },
  { name: 'Chat History', path: '~/.ultraedge-aipc-studio/data/chats', size: '245 MB', encrypted: true },
  { name: 'Documents', path: '~/.ultraedge-aipc-studio/data/rag', size: '1.2 GB', encrypted: true },
  { name: 'Benchmarks', path: '~/.ultraedge-aipc-studio/data/benchmarks', size: '18 MB', encrypted: false },
  { name: 'Logs', path: '~/.ultraedge-aipc-studio/logs', size: '56 MB', encrypted: false },
]

export function SecurityPrivacyPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useAppStore()
  const [showNetwork, setShowNetwork] = useState(false)

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
                  <h1 className="text-2xl font-bold text-text-primary">Security & Privacy Center</h1>
                  <p className="text-sm text-text-secondary mt-1">Manage security settings and privacy controls</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-1.5" /> Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Security Status */}
          <FadeIn delay={0.1}>
            <div className="glass-card p-6 mb-6 border-status-ready/30">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-status-ready/10">
                  <Shield className="w-8 h-8 text-status-ready" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">System Secure</h2>
                  <p className="text-sm text-text-secondary">All security features are active. Your data stays local.</p>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-status-ready/10 border border-status-ready/30">
                    <CheckCircle2 className="w-4 h-4 text-status-ready" />
                    <span className="text-sm font-medium text-status-ready">Protected</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Security Features */}
          <FadeIn delay={0.15}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Security Features</h2>
          </FadeIn>

          <StaggerContainer delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {securityFeatures.map((feature) => (
                <StaggerItem key={feature.id}>
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-xl ${feature.bgColor}`}>
                        <feature.icon className={`w-5 h-5 ${feature.color}`} />
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        feature.status === 'active' 
                          ? 'bg-status-ready/10 text-status-ready' 
                          : 'bg-aurora-surface-hover text-text-muted'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          feature.status === 'active' ? 'bg-status-ready' : 'bg-text-muted'
                        }`} />
                        {feature.status === 'active' ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                    <p className="text-xs text-text-secondary">{feature.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>

          {/* Data Locations */}
          <FadeIn delay={0.3}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Data Storage Locations</h2>
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
                              <Unlock className="w-3.5 h-3.5" />
                              <span className="text-xs">No</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>

          {/* Network Permissions */}
          <FadeIn delay={0.35}>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Network Permissions</h2>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Network Access</h3>
                  <p className="text-xs text-text-secondary">Control whether the app can access the internet</p>
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-aurora-surface/50">
                {settings.privacyMode ? (
                  <>
                    <WifiOff className="w-4 h-4 text-status-ready" />
                    <span className="text-xs text-status-ready">Network access disabled. All processing is local.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-status-warning" />
                    <span className="text-xs text-status-warning">Network access enabled. Some data may be sent externally.</span>
                  </>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}