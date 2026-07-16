import { useState } from 'react'
import {
  Link, ToggleLeft, ToggleRight, Play, X,
  ShieldCheck, Sliders, Eye, RefreshCw
} from 'lucide-react'

interface Hook {
  id: string
  name: string
  phase: 'pre' | 'post'
  description: string
  active: boolean
  triggerCount: number
}

interface HooksPanelProps {
  onClose: () => void
}

const DEFAULT_HOOKS: Hook[] = [
  { id: 'h-1', name: 'PII Redactor Scrubber', phase: 'pre', description: 'Redacts credit cards, emails, and phone numbers before model load.', active: true, triggerCount: 14 },
  { id: 'h-2', name: 'Prompt Template Booster', phase: 'pre', description: 'Appends contextual parameters and local prompt styling templates.', active: true, triggerCount: 89 },
  { id: 'h-3', name: 'Safety Guardrails Interceptor', phase: 'pre', description: 'Validates toxicity metrics and local privacy violations.', active: false, triggerCount: 0 },
  { id: 'h-4', name: 'Markdown Output Sanitizer', phase: 'post', description: 'Scans response HTML tables and formats LaTeX slide bounds.', active: true, triggerCount: 42 },
  { id: 'h-5', name: 'Regex Structured Output Formatter', phase: 'post', description: 'Forces generated tokens into JSON schemas or tables.', active: false, triggerCount: 0 }
]

export function HooksPanel({ onClose }: HooksPanelProps) {
  const [hooks, setHooks] = useState<Hook[]>(DEFAULT_HOOKS)
  const [testPrompt, setTestPrompt] = useState('Hey, my email is admin@intel.com. Please write a report.')
  const [processedPrompt, setProcessedPrompt] = useState('')
  const [modelResponse, setModelResponse] = useState('')
  const [processedResponse, setProcessedResponse] = useState('')
  const [testing, setTesting] = useState(false)

  const activeCount = hooks.filter(h => h.active).length
  const preHooks = hooks.filter(h => h.phase === 'pre')
  const postHooks = hooks.filter(h => h.phase === 'post')

  const toggleHook = (id: string) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h))
  }

  const runHookTest = () => {
    setTesting(true)
    setProcessedPrompt('')
    setModelResponse('')
    setProcessedResponse('')
    setTimeout(() => {
      const isScrubberActive = hooks.find(h => h.id === 'h-1')?.active
      const isBoosterActive = hooks.find(h => h.id === 'h-2')?.active

      let prompt = testPrompt
      if (isScrubberActive) prompt = prompt.replace(/admin@intel.com/g, '[EMAIL_REDACTED]')
      if (isBoosterActive) prompt = `[System Template Option Active]\n[Context Injected]\n\n${prompt}`
      setProcessedPrompt(prompt)

      const rawResponse = `Here is your local report for the user ([EMAIL_REDACTED]). UltraEdge AIPC Studio running Qwen engine.`
      setModelResponse(rawResponse)

      const isSanitizerActive = hooks.find(h => h.id === 'h-4')?.active
      let response = rawResponse
      if (isSanitizerActive) response = `[Formatted via Sanitizer]\n\n${response}`
      setProcessedResponse(response)

      setHooks(prev => prev.map(h => h.active ? { ...h, triggerCount: h.triggerCount + 1 } : h))
      setTesting(false)
    }, 1500)
  }

  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='relative w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col bg-aurora-base border border-aurora-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3 border-b border-aurora-border/30 bg-aurora-surface/30'>
          <div className='flex items-center gap-2.5'>
            <div className='p-1.5 rounded-lg bg-status-warning/10 border border-status-warning/20'>
              <Link className='w-4 h-4 text-status-warning' />
            </div>
            <div>
              <h2 className='text-sm font-bold text-text-primary'>Inference Hooks</h2>
              <p className='text-[10px] text-text-muted'>{activeCount} active &bull; {preHooks.length} pre &bull; {postHooks.length} post</p>
            </div>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-aurora-surface-hover text-text-muted hover:text-text-primary transition-colors'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto flex'>
          {/* Hooks List */}
          <div className='flex-1 p-4 space-y-4 border-r border-aurora-border/20'>
            {/* Pre-Inference */}
            <div>
              <div className='flex items-center gap-1.5 mb-2'>
                <ShieldCheck className='w-3 h-3 text-edge-cyan' />
                <span className='text-[9px] font-bold text-edge-cyan uppercase tracking-wider'>Pre-Inference</span>
              </div>
              <div className='space-y-1.5'>
                {preHooks.map(hook => (
                  <div key={hook.id} className='p-2.5 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center gap-2.5'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5'>
                        <p className='text-[11px] font-bold text-text-primary truncate'>{hook.name}</p>
                        <span className='text-[8px] px-1 py-0.5 rounded bg-edge-cyan/10 text-edge-cyan font-bold shrink-0'>PRE</span>
                      </div>
                      <p className='text-[10px] text-text-muted mt-0.5 truncate'>{hook.description}</p>
                    </div>
                    <span className='text-[9px] text-text-muted shrink-0'>{hook.triggerCount}x</span>
                    <button onClick={() => toggleHook(hook.id)} className='shrink-0 text-text-secondary hover:text-edge-cyan transition-colors'>
                      {hook.active ? <ToggleRight className='w-5 h-5 text-edge-cyan' /> : <ToggleLeft className='w-5 h-5 text-text-muted' />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-Inference */}
            <div>
              <div className='flex items-center gap-1.5 mb-2'>
                <Sliders className='w-3 h-3 text-qwen-violet' />
                <span className='text-[9px] font-bold text-qwen-violet uppercase tracking-wider'>Post-Inference</span>
              </div>
              <div className='space-y-1.5'>
                {postHooks.map(hook => (
                  <div key={hook.id} className='p-2.5 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center gap-2.5'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5'>
                        <p className='text-[11px] font-bold text-text-primary truncate'>{hook.name}</p>
                        <span className='text-[8px] px-1 py-0.5 rounded bg-qwen-violet/10 text-qwen-violet font-bold shrink-0'>POST</span>
                      </div>
                      <p className='text-[10px] text-text-muted mt-0.5 truncate'>{hook.description}</p>
                    </div>
                    <span className='text-[9px] text-text-muted shrink-0'>{hook.triggerCount}x</span>
                    <button onClick={() => toggleHook(hook.id)} className='shrink-0 text-text-secondary hover:text-edge-cyan transition-colors'>
                      {hook.active ? <ToggleRight className='w-5 h-5 text-edge-cyan' /> : <ToggleLeft className='w-5 h-5 text-text-muted' />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Test Lab */}
          <div className='w-64 p-3 flex flex-col bg-aurora-surface/10'>
            <div className='flex items-center gap-1.5 mb-2'>
              <Eye className='w-3 h-3 text-edge-cyan' />
              <span className='text-[9px] font-bold text-text-muted uppercase tracking-wider'>Test Lab</span>
            </div>
            <textarea
              rows={2}
              value={testPrompt}
              onChange={e => setTestPrompt(e.target.value)}
              className='w-full bg-aurora-surface border border-aurora-border p-2 rounded-lg text-[10px] text-text-primary focus:outline-none focus:border-edge-cyan resize-none mb-2'
              placeholder='Enter a test prompt...'
            />
            <button
              onClick={runHookTest}
              disabled={testing}
              className='w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-edge-cyan/10 border border-edge-cyan/20 text-edge-cyan text-[10px] font-bold hover:bg-edge-cyan/20 transition-colors disabled:opacity-50'
            >
              <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Running...' : 'Test Pipeline'}
            </button>

            {processedPrompt && (
              <div className='mt-3 space-y-2 overflow-y-auto flex-1'>
                <div className='p-2 rounded-lg bg-edge-cyan/5 border border-edge-cyan/15'>
                  <p className='text-[8px] font-bold text-edge-cyan uppercase'>1. After Pre-Hooks</p>
                  <p className='text-[9px] font-mono mt-0.5 text-text-primary break-all whitespace-pre-wrap leading-relaxed'>{processedPrompt}</p>
                </div>
                <div className='p-2 rounded-lg bg-qwen-violet/5 border border-qwen-violet/15'>
                  <p className='text-[8px] font-bold text-qwen-violet uppercase'>2. Model Response</p>
                  <p className='text-[9px] font-mono mt-0.5 text-text-primary leading-relaxed'>{modelResponse}</p>
                </div>
                <div className='p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15'>
                  <p className='text-[8px] font-bold text-emerald-400 uppercase'>3. After Post-Hooks</p>
                  <p className='text-[9px] font-mono mt-0.5 text-text-primary whitespace-pre-wrap leading-relaxed'>{processedResponse}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
