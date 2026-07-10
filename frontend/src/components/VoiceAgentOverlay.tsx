import React, { useEffect, useRef } from 'react'
import { X, Mic, Volume2 } from 'lucide-react'

interface VoiceAgentOverlayProps {
  agentState: 'idle' | 'listening' | 'thinking' | 'speaking'
  transcript: string
  response: string
  onClose: () => void
  onMicPress: () => void
}

export function VoiceAgentOverlay({
  agentState,
  transcript,
  response,
  onClose,
  onMicPress
}: VoiceAgentOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Wave Spectrum Animation Drawer (Adapted from previous workspace)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio
      canvas.height = canvas.clientHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const waves = [
      { color: 'rgba(0, 113, 197, 0.7)',  speed: 0.08, frequency: 0.015, phase: 0 },
      { color: 'rgba(139, 92, 246, 0.65)', speed: 0.06, frequency: 0.02,  phase: Math.PI / 3 },
      { color: 'rgba(16, 185, 129, 0.6)',  speed: 0.09, frequency: 0.01,  phase: Math.PI * 2 / 3 },
      { color: 'rgba(236, 72, 153, 0.55)', speed: 0.05, frequency: 0.025, phase: Math.PI },
      { color: 'rgba(79, 70, 229, 0.5)',   speed: 0.07, frequency: 0.012, phase: Math.PI * 1.5 },
    ]

    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 400,
      y: 100,
      size: 1 + Math.random() * 2,
      speedX: 0.4 + Math.random() * 0.8,
      alpha: 0.1 + Math.random() * 0.4,
      color: ['#0071C5', '#00f5ff', '#10b981', '#a855f7'][Math.floor(Math.random() * 4)],
    }))

    let t = 0
    let frameId: number

    const draw = () => {
      frameId = requestAnimationFrame(draw)
      t += 0.04

      const w = canvas.width / window.devicePixelRatio
      const h = canvas.height / window.devicePixelRatio

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'screen'

      let maxAmp = 10
      let freqMultiplier = 1.0

      if (agentState === 'listening') {
        maxAmp = 25
        freqMultiplier = 1.8
      } else if (agentState === 'thinking') {
        maxAmp = 15
        freqMultiplier = 3.0
      } else if (agentState === 'speaking') {
        maxAmp = 45
        freqMultiplier = 1.1
      } else {
        maxAmp = 6
        freqMultiplier = 0.8
      }

      // Draw overlapping colored ribbon waves
      waves.forEach((wave, idx) => {
        ctx.beginPath()
        ctx.strokeStyle = agentState === 'thinking' ? 'rgba(245, 158, 11, 0.55)' : wave.color
        ctx.lineWidth = idx === 0 ? 4 : 2

        for (let x = 0; x < w; x++) {
          const phaseOffset = wave.phase + t * wave.speed
          const sine = Math.sin(x * wave.frequency * freqMultiplier + phaseOffset)
          const envelope = Math.exp(-Math.pow((x - w / 2) / (w * 0.4), 2))
          const mod = Math.cos(x * 0.004 * freqMultiplier - phaseOffset * 0.4) * 0.3
          const y = h / 2 + (sine + mod) * maxAmp * envelope

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      })

      // Render floating particles
      particles.forEach(p => {
        p.x -= p.speedX
        if (p.x < -10) {
          p.x = w + 10
          p.y = h / 2 + (Math.random() - 0.5) * maxAmp * 1.5
        }

        const waveCenterY = h / 2 + Math.sin(p.x * 0.02 + t) * maxAmp * 0.5
        p.y += (waveCenterY - p.y) * 0.1

        ctx.fillStyle = agentState === 'thinking' ? '#f59e0b' : p.color
        ctx.globalAlpha = p.alpha * (agentState !== 'idle' ? 1.0 : 0.3)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalAlpha = 1.0
      ctx.globalCompositeOperation = 'source-over'
    }

    draw()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [agentState])

  const stateLabels = {
    idle: { label: 'Ready', hint: 'Click mic to speak' },
    listening: { label: 'Listening...', hint: 'Speak clearly now' },
    thinking: { label: 'Thinking...', hint: 'Qwen model generating response' },
    speaking: { label: 'Speaking', hint: 'Click to interrupt speech' },
  }

  const currentLabel = stateLabels[agentState] || stateLabels.idle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-aurora-base/95 backdrop-blur-md p-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-edge-cyan/10 rounded-full blur-[90px]" />
      
      <div className="glass-panel max-w-2xl w-full p-8 flex flex-col gap-6 relative z-10 border-edge-cyan/30 bg-aurora-surface-hover/80 text-center">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-aurora-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-edge-cyan animate-pulse" />
            <span className="font-bold text-white text-sm">Multimodal Qwen Voice Mode</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-aurora-surface-hover text-text-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visualizer Canvas Area */}
        <div className="relative h-[180px] w-full bg-aurora-base/50 rounded-card border border-aurora-border/40 overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
          
          <div className="absolute top-4 left-4 text-xs font-mono text-text-muted">
            Status: <span className="text-edge-cyan font-bold uppercase">{currentLabel.label}</span>
          </div>
        </div>

        {/* Transcripts displays */}
        <div className="flex flex-col gap-4 text-left">
          {transcript && (
            <div className="bg-aurora-base/80 p-4 rounded-card border border-aurora-border/30">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">User Speech</span>
              <p className="text-sm text-white mt-1 leading-relaxed">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="bg-edge-blue/10 p-4 rounded-card border border-edge-cyan/20">
              <span className="text-[10px] text-edge-cyan uppercase font-bold tracking-wider">Qwen Voice Engine</span>
              <p className="text-sm text-edge-cyan-light mt-1 leading-relaxed">{response}</p>
            </div>
          )}
        </div>

        {/* Mic control button */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            onClick={onMicPress}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              agentState === 'listening' 
                ? 'bg-status-preparing text-white shadow-glow-amber animate-pulse' 
                : agentState === 'speaking' 
                ? 'bg-edge-cyan text-white shadow-glow-cyan' 
                : 'bg-aurora-surface text-text-secondary hover:text-white border border-aurora-border'
            }`}
          >
            {agentState === 'speaking' ? <Volume2 className="w-6 h-6 animate-bounce" /> : <Mic className="w-6 h-6" />}
          </button>
          <span className="text-[10px] text-text-muted font-mono">{currentLabel.hint}</span>
        </div>

      </div>
    </div>
  )
}
