import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  MessageSquare, Code2, Cpu, BarChart3, 
  Shield, Image
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '../components/PageTransition'

const aiAssistants = [
  {
    id: 'personal-assistant',
    title: 'Personal Assistant',
    description: 'Offline AI chat with local memory and Qwen models',
    icon: MessageSquare,
    color: 'text-edge-cyan',
    bgColor: 'bg-edge-cyan/10',
    borderColor: 'border-edge-cyan/30',
    model: 'Qwen2.5-Omni-3B',
    device: 'GPU',
    path: '/personal-assistant',
  },
  {
    id: 'coding-agent',
    title: 'Coding Agent',
    description: 'Code generation, explanation, and debugging',
    icon: Code2,
    color: 'text-qwen-violet',
    bgColor: 'bg-qwen-violet/10',
    borderColor: 'border-qwen-violet/30',
    model: 'Qwen2.5-Coder-7B',
    device: 'GPU',
    path: '/coding-agent',
  }
]

const systemTools = [
  {
    id: 'model-manager',
    title: 'Model Manager',
    description: 'Manage, compile, and initialize local models',
    icon: Cpu,
    color: 'text-edge-blue',
    bgColor: 'bg-edge-blue/10',
    borderColor: 'border-edge-blue/30',
    path: '/model-manager',
  },
  {
    id: 'benchmark-studio',
    title: 'Benchmark Studio',
    description: 'Performance metrics and hardware speed testing',
    icon: BarChart3,
    color: 'text-qwen-purple',
    bgColor: 'bg-qwen-purple/10',
    borderColor: 'border-qwen-purple/30',
    path: '/benchmark-studio',
  },
  {
    id: 'security-privacy',
    title: 'Security & Privacy',
    description: 'Local-only data shield and privacy controls',
    icon: Shield,
    color: 'text-status-enterprise',
    bgColor: 'bg-status-enterprise/10',
    borderColor: 'border-status-enterprise/30',
    path: '/security-privacy',
  }
]

export function DashboardPage() {
  const navigate = useNavigate()

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {aiAssistants.map((feature) => (
                <StaggerItem key={feature.id}>
                  <motion.button
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(feature.path)}
                    className="glass-card-hover p-6 w-full text-left group"
                  >
                    <div className={`p-3 rounded-xl ${feature.bgColor} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1.5 text-base">{feature.title}</h3>
                    <p className="text-xs text-text-secondary mb-4 line-clamp-2">{feature.description}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-aurora-border/30">
                      <span className="text-[10px] text-text-muted">Model:</span>
                      <span className="text-[10px] text-text-secondary">{feature.model}</span>
                      <span className="text-[10px] text-text-muted ml-auto">Device:</span>
                      <span className="text-[10px] text-text-secondary">{feature.device}</span>
                    </div>
                  </motion.button>
                </StaggerItem>
              ))}
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