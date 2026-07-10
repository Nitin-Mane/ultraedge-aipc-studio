import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { Cpu, HardDrive, Zap, Play, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'

export function ModelSelectionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { models, setModels, setActiveFeatureModel, setCurrentPage, hardwareInfo } = useAppStore()
  
  const featureId = searchParams.get('feature') || 'personal-assistant'
  
  const [loading, setLoading] = useState(true)
  const [featureModels, setFeatureModels] = useState<any[]>([])
  
  const [selectedModelId, setSelectedModelId] = useState('')
  const [precision, setPrecision] = useState('INT4')
  const [device, setDevice] = useState('AUTO') // Default set to AUTO at starting
  
  const featureMapping: Record<string, string> = {
    'personal-assistant': 'personal_assistant',
    'coding-agent': 'coding_agent',
    'voice-assistant': 'voice_input',
  }

  const featureLabels: Record<string, string> = {
    'personal-assistant': 'Personal Assistance Chatbot',
    'coding-agent': 'Coding Agent Workspace',
    'voice-assistant': 'ASR & TTS Voice Hub',
  }

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/models/catalog')
        if (res.ok) {
          const data = await res.json()
          setModels(data.models)
          
          const dbFeatureName = featureMapping[featureId] || 'personal_assistant'
          
          let filtered = data.models.filter((m: any) => m.feature_type === dbFeatureName)
          if (filtered.length === 0) {
            filtered = data.models.filter((m: any) => m.feature_type === 'personal_assistant')
          }
          setFeatureModels(filtered)
          
          if (filtered.length > 0) {
            setSelectedModelId(filtered[0].id)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadCatalog()
  }, [featureId])

  const handleStartCompile = () => {
    const matchedModel = featureModels.find(m => m.id === selectedModelId)
    if (matchedModel) {
      setActiveFeatureModel(matchedModel)
      navigate(`/compile-load?feature=${featureId}&model=${selectedModelId}&device=${device}&precision=${precision}`)
    }
  }

  const activeModel = featureModels.find(m => m.id === selectedModelId)

  // Map glow border colors based on model family
  const getGlowColor = (family: string) => {
    const fam = family.toLowerCase()
    if (fam.includes('omni')) return 'rgba(0, 245, 255, 0.4)'
    if (fam.includes('coder')) return 'rgba(139, 92, 246, 0.4)'
    if (fam.includes('embedding')) return 'rgba(16, 185, 129, 0.4)'
    return 'rgba(236, 72, 153, 0.4)'
  }

  return (
    <div className="page-container flex flex-col gap-6 pt-20 bg-neural-grid min-h-screen">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            setCurrentPage('dashboard')
            navigate('/dashboard')
          }}
          className="p-2 border border-aurora-border bg-aurora-surface/60 rounded-button text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="section-title font-black text-white">Select Intelligence Engine</h2>
          <p className="section-subtitle">Choose a model optimized for your hardware configurations.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">Loading model candidates...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
          
          {/* Left Panel: Candidate model card lists styled as personal_assistance_bot UI */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureModels.map((model) => {
              const isSelected = selectedModelId === model.id
              const isReady = model.status === 'ready'
              const glow = getGlowColor(model.family)
              
              return (
                <div 
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`glass-panel p-5 flex flex-col justify-between gap-4 cursor-pointer border transition-all duration-300 ${
                    isSelected ? 'bg-aurora-surface-hover/80' : 'border-aurora-border/40 hover:border-aurora-border'
                  }`}
                  style={{
                    borderColor: isSelected ? glow.replace('0.4', '1') : 'rgba(255, 255, 255, 0.08)',
                    boxShadow: isSelected ? `0 0 20px ${glow}` : 'none'
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-base leading-snug">{model.name}</h3>
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                        isReady 
                          ? 'bg-status-ready/10 border-status-ready/30 text-status-ready' 
                          : 'bg-status-preparing/10 border-status-preparing/30 text-status-preparing'
                      }`}>
                        {isReady ? 'Ready' : 'Convert Needed'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {model.family.includes('Omni') 
                        ? 'Default offline multimodal engine. Supports speech transcription, local text loops, and citations.'
                        : `Curated ${model.family} optimized weights configured for dedicated developer workloads.`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-aurora-border/30 pt-3 mt-1">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Cpu className="w-3.5 h-3.5 text-edge-cyan shrink-0" />
                      <span>Target: {model.recommended_device}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <HardDrive className="w-3.5 h-3.5 text-qwen-violet shrink-0" />
                      <span>Footprint: {model.ram_required_gb} GB</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Size: {model.parameter_size} ({model.license})</span>
                    </div>
                  </div>

                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartCompile(); }}
                      className="w-full mt-2 py-2.5 rounded-button font-bold text-xs text-white uppercase tracking-wider transition-all duration-200 animate-fade-in shadow-glow-cyan"
                      style={{ 
                        background: isReady 
                          ? 'linear-gradient(135deg, #0071c5, #00aeff)' 
                          : 'linear-gradient(135deg, #f59e0b, #d97706)' 
                      }}
                    >
                      {isReady ? 'Load Engine →' : 'Convert & Load →'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Panel: Device / Precision Configuration selectors */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass-panel p-6 border-aurora-border/40 bg-aurora-surface/60 flex flex-col gap-5">
              <h3 className="text-sm font-bold text-white border-b border-aurora-border/40 pb-3 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-edge-cyan" />
                Target Core Settings
              </h3>

              {/* Precision select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Weight Precision</label>
                <select
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  className="w-full bg-aurora-base border border-aurora-border p-2.5 rounded-input text-xs text-white focus:outline-none"
                >
                  <option value="INT4">INT4 (Quantized - Fast)</option>
                  <option value="INT8">INT8 (Balanced)</option>
                  <option value="FP16">FP16 (High Precision)</option>
                </select>
              </div>

              {/* Device target */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Target Processor Device</label>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="w-full bg-aurora-base border border-aurora-border p-2.5 rounded-input text-xs text-white focus:outline-none"
                >
                  <option value="AUTO">Auto-Select (Best Hardware)</option>
                  <option value="CPU">CPU Only</option>
                  <option value="GPU">Intel Integrated/Arc GPU</option>
                  <option value="NPU">Intel NPU Accelerator</option>
                </select>
              </div>

              {/* Warnings / Safety Checks */}
              {activeModel && hardwareInfo && activeModel.ram_required_gb > hardwareInfo.ramTotal && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-card flex gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block font-bold">Memory warning</strong>
                    Model requires {activeModel.ram_required_gb}GB, but your AIPC has {hardwareInfo.ramTotal}GB.
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Model runs 100% locally with private audit trails.
              </div>

              {/* Compile CTA Trigger */}
              <button
                onClick={handleStartCompile}
                disabled={!selectedModelId}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 font-bold text-sm shadow-glow-cyan disabled:opacity-40"
              >
                Compile & Load Feature
                <Play className="w-4 h-4 fill-white" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Author signature footer matches bot */}
      <div className="text-center text-xs text-text-muted opacity-85 py-6 mt-4 tracking-wider">
        Contributed by the Open Source Community
      </div>

    </div>
  )
}
