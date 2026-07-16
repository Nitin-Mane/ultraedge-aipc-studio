import { useState } from 'react'
import { 
  Server, Info, ArrowLeft, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function MCPServerPage() {
  const navigate = useNavigate()
  const { mcpTools, toggleMcpTool } = useAppStore()

  // Active tools live in the shared store so the Personal Assistant sees the same config
  const tools = mcpTools

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Registered MCP Tools */}
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

        {/* MCP Standard Protocol Info */}
        <div className="glass-card p-5 border border-aurora-border/40 bg-edge-blue/5 border-edge-blue/20 space-y-3 self-start">
          <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan flex items-center gap-1">
            <Info className="w-4 h-4 shrink-0" /> MCP Standard Protocol
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Model Context Protocol (MCP) standardizes context pipelines. When an agent requires calculations or filesystem lookups, the client issues a standard MCP tool request, executing code inside secure boundaries and supplying direct context back to the prompt loop.
          </p>
        </div>
      </div>
    </div>
  )
}
