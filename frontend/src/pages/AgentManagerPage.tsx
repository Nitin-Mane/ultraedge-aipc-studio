import { useState } from 'react'
import { 
  Bot, Settings, Sliders, Layers, 
  Cpu, ArrowLeft, ArrowRight, Activity, ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

export function AgentManagerPage() {
  const navigate = useNavigate()
  const [pipelineMode, setPipelineMode] = useState('sequential')
  const [maxOverhead, setMaxOverhead] = useState(12)
  const [routingTemperature, setRoutingTemperature] = useState(0.3)

  return (
    <div className="min-h-screen bg-aurora-base text-text-primary pt-16">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/personal-assistant?loaded=true')}
              className="p-2 rounded-lg bg-aurora-surface hover:bg-aurora-surface-hover border border-aurora-border/40 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-text-secondary" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-edge-cyan" />
                <h1 className="text-xl font-bold">Multi-Model Agent Configuration</h1>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Configure complex agent pipelines and routing parameters for local offline models</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pipeline configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <Layers className="w-5 h-5" /> Agent Routing Pipeline
            </h2>
            <div className="flex items-center gap-3 mb-6 bg-aurora-surface/30 p-1.5 rounded-lg border border-aurora-border/20">
              {['sequential', 'parallel', 'fallback'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setPipelineMode(mode)}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-md uppercase tracking-wide transition-all ${
                    pipelineMode === mode
                      ? 'bg-edge-cyan text-aurora-base shadow-lg shadow-edge-cyan/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover'
                  }`}
                >
                  {mode} Mode
                </button>
              ))}
            </div>

            {/* Pipeline visualizer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-aurora-surface/20 border border-aurora-border/30">
              <div className="flex flex-col items-center p-3.5 bg-aurora-surface border border-aurora-border/50 rounded-xl w-full md:w-36 text-center">
                <div className="w-8 h-8 rounded-lg bg-edge-cyan/10 flex items-center justify-center mb-2 font-bold text-edge-cyan text-xs">IN</div>
                <div className="text-xs font-bold">User Input</div>
                <div className="text-[10px] text-text-muted mt-0.5">Query/Speech</div>
              </div>

              <ArrowRight className="w-5 h-5 text-edge-cyan rotate-90 md:rotate-0" />

              <div className="flex flex-col items-center p-3.5 bg-aurora-surface border border-aurora-border/50 rounded-xl w-full md:w-44 text-center relative">
                <div className="w-8 h-8 rounded-lg bg-qwen-violet/10 flex items-center justify-center mb-2 font-bold text-qwen-violet text-xs">OMNI</div>
                <div className="text-xs font-bold">Qwen2.5-Omni-3B</div>
                <div className="text-[10px] text-text-muted mt-0.5">ASR & Intent Router</div>
              </div>

              <ArrowRight className="w-5 h-5 text-edge-cyan rotate-90 md:rotate-0" />

              <div className="flex flex-col items-center p-3.5 bg-aurora-surface border border-aurora-border/50 rounded-xl w-full md:w-44 text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2 font-bold text-emerald-400 text-xs">LLM</div>
                <div className="text-xs font-bold">Quantized Thinker</div>
                <div className="text-[10px] text-text-muted mt-0.5">CPU/GPU Inference</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-text-secondary bg-edge-cyan/5 border border-edge-cyan/10 p-3 rounded-lg">
              <span>Pipeline active target latency: ~{maxOverhead}ms routing overhead</span>
              <button className="text-edge-cyan font-semibold hover:underline flex items-center gap-1">Configure Routing Nodes <ChevronRight className="w-3 h-3" /></button>
            </div>
          </div>

          {/* Pipeline Execution Parameters Card */}
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <Settings className="w-5 h-5" /> Pipeline Execution Parameters
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary font-semibold">Routing Temperature</span>
                    <span className="font-mono text-edge-cyan font-bold">{routingTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={routingTemperature}
                    onChange={(e) => setRoutingTemperature(parseFloat(e.target.value))}
                    className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary font-semibold">Max Threshold Overhead (ms)</span>
                    <span className="font-mono text-edge-cyan font-bold">{maxOverhead} ms</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={maxOverhead}
                    onChange={(e) => setMaxOverhead(parseInt(e.target.value))}
                    className="w-full accent-edge-cyan h-1.5 bg-aurora-surface rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-aurora-border/20">
                <div className="p-3.5 rounded-xl bg-aurora-surface/30 border border-aurora-border/30">
                  <div className="font-bold text-xs text-text-primary">Failover Target</div>
                  <div className="text-[10px] text-text-muted mt-1 leading-relaxed">Reroutes active pipeline runs to CPU when hardware thermal limits are met.</div>
                </div>
                <div className="p-3.5 rounded-xl bg-aurora-surface/30 border border-aurora-border/30">
                  <div className="font-bold text-xs text-text-primary">Pipeline Caching</div>
                  <div className="text-[10px] text-text-muted mt-1 leading-relaxed">Saves active intermediate tensor paths to speed up intent scanning.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Model Context */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-aurora-border/40">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-edge-cyan" /> Model Acceleration
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Execution Device</p>
                  <p className="text-[10px] text-text-muted">Target device selection</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded border border-edge-cyan/30 text-edge-cyan bg-edge-cyan/5">GPU (AUTO)</span>
              </div>

              <div className="p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Quantization Precision</p>
                  <p className="text-[10px] text-text-muted">Inference word size</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded border border-qwen-violet/30 text-qwen-violet bg-qwen-violet/5">INT4</span>
              </div>

              <div className="p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Context Window Size</p>
                  <p className="text-[10px] text-text-muted">Max dynamic context capacity</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded border border-status-ready/30 text-status-ready bg-status-ready/5">32,768 tokens</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 border border-aurora-border/40 bg-edge-blue/5 border-edge-blue/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan mb-2">Local Agent Memory</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-normal">
              Enables short-term state retention across chat boundaries. The system retains sliding context loops and indexes past queries in a local vector registry, optimizing inference speed and reducing repeated model compiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
