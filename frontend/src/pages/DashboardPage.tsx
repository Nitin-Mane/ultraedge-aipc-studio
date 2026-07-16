import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  MessageSquare, Code2, Cpu, BarChart3, 
  Shield, CheckCircle2, AlertTriangle, Settings
} from 'lucide-react'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'
import { ACTIVE_MODEL_IDS } from '../hooks/modelCatalog'
import { getModelsCatalog } from '../api/models'

// AI Workspace cards — linked to their model IDs for readiness checking
const aiAssistants = [
  {
    id: 'personal-assistant',
    title: 'Personal Assistant',
    description: 'Offline AI chat with voice, vision and local memory powered by Qwen2.5-Omni.',
    icon: MessageSquare,
    color: 'text-edge-cyan',
    bgColor: 'bg-edge-cyan/10',
    borderColor: 'border-edge-cyan/30',
    modelId: ACTIVE_MODEL_IDS.personalAssistant,
    model: 'Qwen2.5-Omni-3B',
    device: 'GPU',
    path: '/personal-assistant',
  },
  {
    id: 'coding-agent',
    title: 'Coding Agent',
    description: 'Local code generation, explanation, and debugging with Qwen Coder.',
    icon: Code2,
    color: 'text-qwen-violet',
    bgColor: 'bg-qwen-violet/10',
    borderColor: 'border-qwen-violet/30',
    modelId: ACTIVE_MODEL_IDS.codingAgent,
    model: 'Qwen2.5-Coder-1.5B',
    device: 'GPU',
    path: '/coding-agent',
  }
]

const systemTools = [
  {
    id: 'model-manager',
    title: 'Model Manager',
    description: 'Download, optimize, and benchmark local AI models with OpenVINO.',
    icon: Cpu,
    color: 'text-edge-blue',
    bgColor: 'bg-edge-blue/10',
    borderColor: 'border-edge-blue/30',
    path: '/model-manager',
  },
  {
    id: 'benchmark-studio',
    title: 'Benchmark Studio',
    description: 'Performance metrics and hardware speed testing.',
    icon: BarChart3,
    color: 'text-qwen-purple',
    bgColor: 'bg-qwen-purple/10',
    borderColor: 'border-qwen-purple/30',
    path: '/benchmark-studio',
  },
  {
    id: 'security-privacy',
    title: 'Security & Privacy',
    description: 'Local-only data shield and privacy controls.',
    icon: Shield,
    color: 'text-status-enterprise',
    bgColor: 'bg-status-enterprise/10',
    borderColor: 'border-status-enterprise/30',
    path: '/security-privacy',
  }
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [modelReadiness, setModelReadiness] = useState<Record<string, boolean>>({})

  // Fetch model catalog once to check readiness of the two active models
  useEffect(() => {
    const checkModels = async () => {
      try {
        const data = await getModelsCatalog()
        const readinessMap: Record<string, boolean> = {}
        for (const m of data.models ?? []) {
          readinessMap[m.id] = m.state === 'ready' || m.status === 'ready'
        }
        setModelReadiness(readinessMap)
      } catch {
        // Backend might not be running; silently ignore
      }
    }
    checkModels()
    const interval = setInterval(checkModels, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base">

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-neural-grid opacity-30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-edge-cyan/5 rounded-full blur-[120px]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <FadeIn>
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
                  Welcome to <span className="text-gradient">UltraEdge AIPC Studio</span>
                </h1>
                <p className="text-text-secondary max-w-2xl mx-auto text-sm leading-relaxed">
                  Run high-performance AI workloads locally on your Intel AI PC. 
                  Privacy-first, offline-capable, and optimized via OpenVINO.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* AI Workspaces Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <FadeIn delay={0.1}>
            <h2 className="text-lg font-bold text-text-primary mb-5">AI Workspaces</h2>
          </FadeIn>

          <StaggerContainer delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {aiAssistants.map((feature) => {
                const isReady = modelReadiness[feature.modelId] === true
                const isChecked = Object.keys(modelReadiness).length > 0

                return (
                  <StaggerItem key={feature.id}>
                    <motion.button
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(feature.path)}
                      className={`glass-card-hover p-6 w-full text-left group border ${feature.borderColor} relative overflow-hidden`}
                    >
                      {/* Readiness indicator stripe */}
                      <div
                        className={`absolute top-0 left-0 right-0 h-0.5 transition-all duration-700 ${
                          isReady
                            ? 'bg-gradient-to-r from-status-ready/60 to-transparent'
                            : isChecked
                            ? 'bg-gradient-to-r from-status-warning/40 to-transparent'
                            : 'bg-transparent'
                        }`}
                      />

                      <div className={`p-3 rounded-xl ${feature.bgColor} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                        <feature.icon className={`w-6 h-6 ${feature.color}`} />
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-text-primary text-base">{feature.title}</h3>
                        {/* Model readiness badge */}
                        {isChecked && (
                          isReady ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-ready/10 border border-status-ready/30 text-status-ready text-[10px] font-semibold shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate('/model-manager') }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-warning/10 border border-status-warning/30 text-status-warning text-[10px] font-semibold shrink-0 hover:bg-status-warning/20 transition-colors"
                            >
                              <Settings className="w-3 h-3" /> Setup Required
                            </button>
                          )
                        )}
                      </div>

                      <p className="text-xs text-text-secondary mb-4 line-clamp-2">{feature.description}</p>

                      <div className="flex items-center gap-2 pt-3 border-t border-aurora-border/30">
                        <span className="text-[10px] text-text-muted">Model:</span>
                        <span className="text-[10px] text-text-secondary">{feature.model}</span>
                        <span className="text-[10px] text-text-muted ml-auto">Device:</span>
                        <span className="text-[10px] text-text-secondary">{feature.device}</span>
                      </div>

                      {/* "Setup Required" overlay hint when not ready */}
                      {isChecked && !isReady && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-status-warning/80">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Model not installed — go to Model Manager to download</span>
                        </div>
                      )}
                    </motion.button>
                  </StaggerItem>
                )
              })}
            </div>
          </StaggerContainer>
        </div>

        {/* System Utilities & Diagnostics Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 border-t border-aurora-border/20 pt-10">
          <FadeIn delay={0.2}>
            <h2 className="text-base font-bold text-text-secondary mb-5">System Utilities & Diagnostics</h2>
          </FadeIn>

          <StaggerContainer delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {systemTools.map((feature) => (
                <StaggerItem key={feature.id}>
                  <motion.button
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(feature.path)}
                    className="glass-card-hover p-5 w-full text-left group flex items-start gap-4"
                  >
                    <div className={`p-2.5 rounded-lg ${feature.bgColor} group-hover:scale-105 transition-transform shrink-0`}>
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-text-primary mb-1 text-sm">{feature.title}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2">{feature.description}</p>
                    </div>
                  </motion.button>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </div>
    </PageTransition>
  )
}