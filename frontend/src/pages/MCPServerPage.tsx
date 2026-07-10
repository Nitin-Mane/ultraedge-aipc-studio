import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Server, Cpu, Database, Settings, ShieldAlert,
  Play, CheckCircle2, RefreshCw, Terminal, Info,
  ExternalLink, ArrowLeft, ArrowRight, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { useAppStore } from '../store/useAppStore'

export function MCPServerPage() {
  const navigate = useNavigate()
  const { mcpTools, toggleMcpTool } = useAppStore()

  // Model select state
  const [language, setLanguage] = useState('English')
  const [model, setModel] = useState('Qwen/Qwen3-8B')
  const [precision, setPrecision] = useState('INT4-NPU')
  const [usePreconverted, setUsePreconverted] = useState(true)
  const [isConverting, setIsConverting] = useState(false)
  const [terminalLog, setTerminalLog] = useState<string[]>([
    'MCP Host process initialized.',
    'Ready for optimum-cli export command.'
  ])

  // Active tools live in the shared store so the Personal Assistant sees the same config
  const tools = mcpTools

  // Optimum command generator
  const getCommand = () => {
    const pt_model_name = model.split('/').pop()
    const model_subdir = precision === 'FP16' ? 'FP16' : `${precision}_compressed_weights`
    const command = `optimum-cli export openvino --model ${model} --task text-generation-with-past --weight-format ${precision.split('-')[0].toLowerCase()}`
    
    let extra = ` --group-size ${precision === 'INT4-NPU' ? '-1' : '128'} --ratio 1.0`
    if (precision === 'INT4-NPU') {
      extra += ' --sym'
    }
    
    return `${command}${extra} ./${pt_model_name}/${model_subdir}`
  }

  const triggerConversion = () => {
    setIsConverting(true)
    setTerminalLog(prev => [...prev, `[optimum-cli] Starting conversion for ${model} (${precision})...`])
    
    setTimeout(() => {
      setTerminalLog(prev => [
        ...prev,
        `[optimum-cli] snapshot_download started for OpenVINO preconverted snaps.`,
        `[optimum-cli] Compressing model weights to ${precision}...`,
        `✅ Export completed successfully. Model resides in ./${model.split('/').pop()}/${precision}_compressed_weights`
      ])
      setIsConverting(false)
    }, 3000)
  }

  const toggleTool = (idx: number) => {
    toggleMcpTool(tools[idx].id)
  }

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
                <Server className="w-5 h-5 text-edge-cyan" />
                <h1 className="text-xl font-bold">Model Context Protocol (MCP) Server</h1>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Connect local models directly to context connectors, filesystem sandboxes, and APIs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Optimum Converter & Compiler */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <Cpu className="w-5 h-5" /> OpenVINO Model Compiler Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Chinese">Chinese</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Hugging Face Model ID</label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none"
                >
                  <option value="Qwen/Qwen3-8B">Qwen/Qwen3-8B (8 Billion Parameters)</option>
                  <option value="Qwen/Qwen3-4B">Qwen/Qwen3-4B (4 Billion Parameters)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Weight Precision</label>
                <select 
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none"
                >
                  <option value="INT4-NPU">INT4-NPU (Intel NPU optimized)</option>
                  <option value="INT4-AWQ">INT4-AWQ (Activation-aware quant)</option>
                  <option value="INT8">INT8 (Balanced precision)</option>
                  <option value="FP16">FP16 (High precision)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-aurora-surface/30 rounded-lg border border-aurora-border/20">
                <div>
                  <p className="text-xs font-semibold">Preconverted Models Hub</p>
                  <p className="text-[10px] text-text-muted">Pull preconverted snaps if available</p>
                </div>
                <button 
                  onClick={() => setUsePreconverted(!usePreconverted)}
                  className="text-text-secondary hover:text-edge-cyan transition-colors"
                >
                  {usePreconverted ? <ToggleRight className="w-8 h-8 text-edge-cyan" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                </button>
              </div>
            </div>

            {/* Generated command */}
            <div className="mb-6 p-4 rounded-xl bg-aurora-surface border border-aurora-border/40 font-mono text-xs text-text-primary select-all break-all leading-relaxed">
              <span className="text-edge-cyan font-bold block mb-1.5">Generated Export Command:</span>
              <code>{getCommand()}</code>
            </div>

            <Button 
              variant="primary" 
              onClick={triggerConversion} 
              disabled={isConverting}
              className="py-3 text-sm flex items-center justify-center mx-auto w-full md:w-auto md:px-8"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isConverting ? 'animate-spin' : ''}`} />
              {isConverting ? 'Exporting OpenVINO Model...' : 'Export & Compile OpenVINO Model'}
            </Button>
          </div>

          {/* Terminal log simulator */}
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-edge-cyan">
              <Terminal className="w-5 h-5" /> Export Compiler Console
            </h2>
            <div className="bg-black/80 font-mono text-xs text-emerald-400 p-4 rounded-xl h-44 overflow-y-auto space-y-1.5">
              {terminalLog.map((log, idx) => (
                <p key={idx} className="leading-relaxed">{log}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: MCP Server tools config */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-aurora-border/40">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Registered MCP Tools</h2>
            <div className="space-y-3">
              {tools.map((tool, idx) => (
                <div key={idx} className="p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary">{tool.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{tool.desc}</p>
                  </div>
                  <button 
                    onClick={() => toggleTool(idx)}
                    className="shrink-0 text-text-secondary hover:text-edge-cyan transition-colors"
                  >
                    {tool.active ? <ToggleRight className="w-7 h-7 text-edge-cyan" /> : <ToggleLeft className="w-7 h-7 text-text-muted" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border border-aurora-border/40 bg-edge-blue/5 border-edge-blue/20 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan flex items-center gap-1">
              <Info className="w-4 h-4 shrink-0" /> MCP Standard Protocol
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Model Context Protocol (MCP) standardizes context pipelines. When an agent requires calculations or filesystem lookups, the client issues a standard MCP tool request, executing code inside secure boundaries and supplying direct context back to the prompt loop.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
