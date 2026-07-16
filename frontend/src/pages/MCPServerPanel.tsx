import { Server, Info, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface MCPServerPanelProps {
  onClose: () => void
}

export function MCPServerPanel({ onClose }: MCPServerPanelProps) {
  const { mcpTools, toggleMcpTool } = useAppStore()
  const activeCount = mcpTools.filter(t => t.active).length

  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='relative w-full max-w-lg mx-4 max-h-[80vh] flex flex-col bg-aurora-base border border-aurora-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3 border-b border-aurora-border/30 bg-aurora-surface/30'>
          <div className='flex items-center gap-2.5'>
            <div className='p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
              <Server className='w-4 h-4 text-emerald-400' />
            </div>
            <div>
              <h2 className='text-sm font-bold text-text-primary'>MCP Server</h2>
              <p className='text-[10px] text-text-muted'>{activeCount} of {mcpTools.length} tools active</p>
            </div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-aurora-surface-hover text-text-muted hover:text-text-primary transition-colors'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tool List */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2.5'>
          {mcpTools.map((tool, idx) => (
            <div key={tool.id} className='p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <p className='text-xs font-bold text-text-primary'>{tool.name}</p>
                  {tool.active && (
                    <span className='text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'>ON</span>
                  )}
                </div>
                <p className='text-[10px] text-text-muted mt-0.5 leading-relaxed'>{tool.desc}</p>
              </div>
              <button
                onClick={() => toggleMcpTool(tool.id)}
                className='shrink-0 text-text-secondary hover:text-edge-cyan transition-colors'
              >
                {tool.active
                  ? <ToggleRight className='w-7 h-7 text-edge-cyan' />
                  : <ToggleLeft  className='w-7 h-7 text-text-muted' />}
              </button>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className='px-5 py-3 border-t border-aurora-border/30 bg-edge-blue/5'>
          <div className='flex items-start gap-2'>
            <Info className='w-3.5 h-3.5 text-edge-cyan shrink-0 mt-0.5' />
            <p className='text-[10px] text-text-secondary leading-relaxed'>
              Active MCP tools are sent with each coding request. Toggle tools on/off to control what context the model can access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
