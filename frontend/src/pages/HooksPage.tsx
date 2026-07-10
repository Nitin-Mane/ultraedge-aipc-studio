import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Link, ToggleLeft, ToggleRight, Play, ArrowLeft,
  ChevronRight, AlertTriangle, CheckCircle, Database,
  Sliders, MessageSquare, ShieldCheck, Eye, RefreshCw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

interface Hook {
  id: string
  name: string
  phase: 'pre' | 'post'
  description: string
  active: boolean
  triggerCount: number
}

export function HooksPage() {
  const navigate = useNavigate()
  const [hooks, setHooks] = useState<Hook[]>([
    { id: 'h-1', name: 'PII Redactor Scrubber', phase: 'pre', description: 'Redacts credit cards, emails, and phone numbers before model load.', active: true, triggerCount: 14 },
    { id: 'h-2', name: 'Prompt Template Booster', phase: 'pre', description: 'Appends contextual parameters and local prompt styling templates.', active: true, triggerCount: 89 },
    { id: 'h-3', name: 'Safety Guardrails Interceptor', phase: 'pre', description: 'Validates toxicity metrics and local privacy violations.', active: false, triggerCount: 0 },
    { id: 'h-4', name: 'Markdown Output Sanitizer', phase: 'post', description: 'Scans response HTML tables and formats LaTeX slide bounds.', active: true, triggerCount: 42 },
    { id: 'h-5', name: 'Regex Structured Output Formatter', phase: 'post', description: 'Forces generated tokens into JSON schemas or tables.', active: false, triggerCount: 0 }
  ])

  const [testPrompt, setTestPrompt] = useState('Hey, my email is admin@intel.com. Please write a report.')
  const [processedPrompt, setProcessedPrompt] = useState('')
  const [modelResponse, setModelResponse] = useState('')
  const [processedResponse, setProcessedResponse] = useState('')
  const [testing, setTesting] = useState(false)

  const toggleHook = (id: string) => {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h))
  }

  const runHookTest = () => {
    setTesting(true)
    setTimeout(() => {
      // 1. Pre-inference redacts email if redactor is active
      const isScrubberActive = hooks.find(h => h.id === 'h-1')?.active
      const isBoosterActive = hooks.find(h => h.id === 'h-2')?.active
      
      let prompt = testPrompt
      if (isScrubberActive) {
        prompt = prompt.replace(/admin@intel.com/g, '[EMAIL_REDACTED]')
      }
      if (isBoosterActive) {
        prompt = `[System Template Option Active]\n[Context Injected]\n\n${prompt}`
      }
      setProcessedPrompt(prompt)

      // 2. Model response
      const rawResponse = `Here is your local report for the user ([EMAIL_REDACTED]). UltraEdge AIPC Studio running Qwen engine.`
      setModelResponse(rawResponse)

      // 3. Post-inference sanitizer
      const isSanitizerActive = hooks.find(h => h.id === 'h-4')?.active
      let response = rawResponse
      if (isSanitizerActive) {
        response = `✨ SUCCESSFUL RUN ✨\n\n${response}\n\n[Formated via Sanitizer]`
      }
      setProcessedResponse(response)

      // Increment triggers
      setHooks(prev => prev.map(h => h.active ? { ...h, triggerCount: h.triggerCount + 1 } : h))
      setTesting(false)
    }, 1500)
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
                <Link className="w-5 h-5 text-edge-cyan" />
                <h1 className="text-xl font-bold">Inference Hooks & Interceptors</h1>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Control pipeline prompt expansions, redact privacy components, and format model outputs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interceptors Config */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pre-Inference Hooks */}
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <ShieldCheck className="w-5 h-5" /> Pre-Inference Hooks (Input Modifiers)
            </h2>
            <div className="space-y-4">
              {hooks.filter(h => h.phase === 'pre').map(hook => (
                <div key={hook.id} className="p-4 bg-aurora-surface/30 rounded-xl border border-aurora-border/20 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{hook.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-edge-cyan/10 text-edge-cyan font-bold">PRE-INF</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{hook.description}</p>
                    <div className="text-[10px] text-text-muted mt-2 font-semibold">Total triggers: {hook.triggerCount} times</div>
                  </div>
                  <button 
                    onClick={() => toggleHook(hook.id)}
                    className="text-text-secondary hover:text-edge-cyan transition-colors"
                  >
                    {hook.active ? <ToggleRight className="w-8 h-8 text-edge-cyan" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Inference Hooks */}
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <Sliders className="w-5 h-5" /> Post-Inference Hooks (Output Formatters)
            </h2>
            <div className="space-y-4">
              {hooks.filter(h => h.phase === 'post').map(hook => (
                <div key={hook.id} className="p-4 bg-aurora-surface/30 rounded-xl border border-aurora-border/20 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{hook.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-qwen-violet/10 text-qwen-violet font-bold">POST-INF</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{hook.description}</p>
                    <div className="text-[10px] text-text-muted mt-2 font-semibold">Total triggers: {hook.triggerCount} times</div>
                  </div>
                  <button 
                    onClick={() => toggleHook(hook.id)}
                    className="text-text-secondary hover:text-edge-cyan transition-colors"
                  >
                    {hook.active ? <ToggleRight className="w-8 h-8 text-edge-cyan" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Hooks Sandbox Testing */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-aurora-border/40">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-edge-cyan" /> Interactive Test Lab
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Raw User Prompt</label>
                <textarea
                  rows={2}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full bg-aurora-surface border border-aurora-border p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-edge-cyan resize-none"
                />
              </div>

              <Button 
                variant="primary" 
                fullWidth 
                onClick={runHookTest}
                disabled={testing}
                className="py-2 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testing ? 'animate-spin' : ''}`} />
                Test Hook Pipeline
              </Button>

              {processedPrompt && (
                <div className="space-y-3 pt-3 border-t border-aurora-border/20">
                  <div className="bg-edge-cyan/5 p-3 rounded-lg border border-edge-cyan/15">
                    <p className="text-[10px] font-bold text-edge-cyan uppercase">1. Prompt After Pre-Hooks</p>
                    <p className="text-xs font-mono mt-1 text-text-primary break-all leading-relaxed whitespace-pre-wrap">{processedPrompt}</p>
                  </div>

                  <div className="bg-qwen-violet/5 p-3 rounded-lg border border-qwen-violet/15">
                    <p className="text-[10px] font-bold text-qwen-violet uppercase">2. Raw Model Response</p>
                    <p className="text-xs font-mono mt-1 text-text-primary leading-relaxed">{modelResponse}</p>
                  </div>

                  <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">3. Output After Post-Hooks</p>
                    <p className="text-xs font-mono mt-1 text-text-primary whitespace-pre-wrap leading-relaxed">{processedResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5 border border-aurora-border/40 bg-edge-blue/5 border-edge-blue/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan">Inference Interception</h3>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              Hooks enable secure offline workflows. Pre-inference interceptors scan and sanitize raw inputs, while post-inference interceptors strip unwanted tokens, validate formatting rules, or inject citations into vector data returns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
