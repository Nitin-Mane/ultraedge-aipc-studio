import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Terminal, RotateCw, Cpu, Zap, HardDrive, MemoryStick, Monitor, Server, Wifi, WifiOff, ShieldCheck, ArrowRight, Code2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const BACKEND_URL = 'http://localhost:8000'

type ModelStatus = 'pending' | 'loading' | 'ready' | 'error'

interface ModelSlot {
  id: string
  label: string
  status: ModelStatus
}

interface HardwareProfile {
  os: string
  cpu: string
  gpu: string
  npu: string
  ram_total_gb: number
  ram_available_gb: number
  storage_free_gb: number
  storage_total?: string
  openvino_status: string
  supported_devices: string[]
}

const DEFAULT_HARDWARE: HardwareProfile = {
  os: 'Windows 11',
  cpu: 'Intel Core Processor',
  gpu: 'Intel Integrated Graphics',
  npu: 'not_detected',
  ram_total_gb: 16,
  ram_available_gb: 8,
  storage_free_gb: 100,
  storage_total: '',
  openvino_status: 'not_available',
  supported_devices: ['CPU'],
}

export function InteractiveCompilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setSelectedModel } = useAppStore()

  const featureId = searchParams.get('feature') || 'personal-assistant'
  const modelId = searchParams.get('model') || ''
  const device = searchParams.get('device') || 'CPU'
  const precision = searchParams.get('precision') || 'INT4'

  const isCodingAgent = featureId === 'coding-agent'
  const featureConfig = isCodingAgent
    ? { title: 'Qwen Coder Agent', subtitle: 'Integrated Qwen Coder Engine', desc: 'Optimized for Intel Core Ultra — fast, local code generation', icon: Code2, iconColor: 'text-qwen-violet', iconBg: 'from-qwen-violet/20 to-emerald-500/20', iconBorder: 'border-qwen-violet/20' }
    : { title: 'Personal Assistant', subtitle: 'Qwen Omni Engine', desc: 'Multimodal assistant — chat, voice, vision, and documents on your Intel AI PC', icon: Server, iconColor: 'text-edge-cyan', iconBg: 'from-edge-cyan/20 to-qwen-violet/20', iconBorder: 'border-edge-cyan/20' }

  const [progress, setProgress] = useState(0)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [statusText, setStatusText] = useState('Initializing...')
  const [modelSlots, setModelSlots] = useState<ModelSlot[]>([
    { id: modelId, label: 'Primary LLM', status: 'pending' },
  ])

  const matrixCanvasRef = useRef<HTMLCanvasElement>(null)
  const gameCanvasRef = useRef<HTMLCanvasElement>(null)
  const cancelledRef = useRef(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HARDWARE)

  // Brick Breaker scoreboard
  const [gameScore, setGameScore] = useState(0)
  const [gameLives, setGameLives] = useState(3)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'gameover'>('playing')
  const [gameBest, setGameBest] = useState(() => parseInt(localStorage.getItem('bb_best') || '0'))
  const [gameRound, setGameRound] = useState(0)

  const retryGame = () => {
    setGameScore(0)
    setGameLives(3)
    setGameStatus('playing')
    setGameRound(r => r + 1)
  }

  const retryModelLoad = () => {
    setTerminalLogs([])
    setProgress(0)
    setStatusText('Retrying model load...')
    setModelSlots([{ id: modelId, label: 'Primary LLM', status: 'pending' }])
    setLoadFailed(false)
    setRetryKey(k => k + 1)
  }

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `>> ${msg}`])
  }

  // 1. Matrix Digital Rain
  useEffect(() => {
    const canvas = matrixCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&%*+=-/\\'
    const charArr = chars.split('')
    const fontSize = 12
    const columns = Math.floor(canvas.width / fontSize)
    const drops = Array.from({ length: columns }, () => 1)

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00f5ff'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = charArr[Math.floor(Math.random() * charArr.length)]
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const timer = setInterval(draw, 33)
    return () => clearInterval(timer)
  }, [])

  // Fetch hardware profile
  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/system/profile`)
        if (res.ok) {
          const data = await res.json()
          setHardware(data)
        }
      } catch {}
    }
    fetchHardware()
  }, [])

  // 2. Brick Breaker Game
  useEffect(() => {
    const canvas = gameCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let score = 0
    let lives = 3
    let remaining = 15 // brickRowCount * brickColumnCount
    let running = true

    const endGame = (won: boolean) => {
      running = false
      const best = Math.max(parseInt(localStorage.getItem('bb_best') || '0'), score)
      localStorage.setItem('bb_best', String(best))
      setGameBest(best)
      setGameStatus(won ? 'won' : 'gameover')
    }

    const paddleHeight = 10
    const paddleWidth = 75
    let paddleX = (canvas.width - paddleWidth) / 2
    let rightPressed = false
    let leftPressed = false
    const ballRadius = 6
    let x = canvas.width / 2
    let y = canvas.height - 30
    let dx = 2.2
    let dy = -2.2

    const brickRowCount = 3
    const brickColumnCount = 5
    const brickWidth = 50
    const brickHeight = 12
    const brickPadding = 8
    const brickOffsetTop = 20
    const brickOffsetLeft = 20

    const bricks: any[] = []
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = []
      for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 }
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true
      if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false
      if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2
      }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const drawGame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop
            bricks[c][r].x = brickX
            bricks[c][r].y = brickY
            ctx.beginPath()
            ctx.rect(brickX, brickY, brickWidth, brickHeight)
            ctx.fillStyle = r === 0 ? '#00f5ff' : (r === 1 ? '#a855f7' : '#10b981')
            ctx.fill()
            ctx.closePath()
          }
        }
      }

      ctx.beginPath()
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#00b4d8'
      ctx.fill()
      ctx.closePath()

      ctx.beginPath()
      ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight)
      ctx.fillStyle = '#7c3aed'
      ctx.fill()
      ctx.closePath()

      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          const b = bricks[c][r]
          if (b.status === 1) {
            if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
              dy = -dy
              b.status = 0
              score++
              remaining--
              setGameScore(score)
              if (remaining === 0) {
                endGame(true)
                return
              }
            }
          }
        }
      }

      if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx
      if (y + dy < ballRadius) {
        dy = -dy
      } else if (y + dy > canvas.height - ballRadius) {
        if (x > paddleX && x < paddleX + paddleWidth) {
          dy = -dy
        } else {
          lives--
          setGameLives(lives)
          if (lives <= 0) {
            endGame(false)
            return
          }
          x = canvas.width / 2
          y = canvas.height - 30
          dx = 2.2
          dy = -2.2
          paddleX = (canvas.width - paddleWidth) / 2
        }
      }

      if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 4
      else if (leftPressed && paddleX > 0) paddleX -= 4

      x += dx
      y += dy
      if (running) requestAnimationFrame(drawGame)
    }

    drawGame()

    return () => {
      running = false
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [gameRound])

  // 3. Backend load + poll until ready
  useEffect(() => {
    cancelledRef.current = false
    setLoadFailed(false)

    const loadSingleModel = async (targetModelId: string, baseProgress: number, progressRange: number): Promise<boolean> => {
      const tag = 'RUNTIME'
      addLog(`[${tag}] Sending load request for ${targetModelId}...`)
      let loadStarted = false
      try {
        const res = await fetch(`${BACKEND_URL}/api/runtime/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: targetModelId, device, precision })
        })
        loadStarted = res.ok
        if (res.ok) {
          addLog(`[${tag}] Load request accepted, loading in background...`)
        } else {
          const err = await res.json().catch(() => ({}))
          addLog(`[ERROR] Load returned ${res.status}: ${err.detail || res.statusText}`)
        }
      } catch (err: any) {
        addLog(`[WARN] Backend unreachable (${err.message})`)
      }

      if (!loadStarted) return false

      // Poll until ready — wait for the backend to confirm the model is active
      const maxPolls = 300
      let polls = 0
      while (polls < maxPolls && !cancelledRef.current) {
        polls++
        try {
          const logRes = await fetch(`${BACKEND_URL}/api/runtime/logs`)
          if (logRes.ok) {
            const logData = await logRes.json()
            if (logData.logs && logData.logs.length > 0) {
              setTerminalLogs(prev => {
                const backendLogs = logData.logs.map((l: string) => `>> ${l}`)
                return backendLogs
              })
              const logCount = logData.logs.length
              const pct = Math.min(baseProgress + progressRange - 5, baseProgress + Math.round((logCount / 10) * progressRange))
              setProgress(pct)
            }
          }
        } catch { /* ignore */ }

        try {
          const res = await fetch(`${BACKEND_URL}/api/runtime/active`)
          if (res.ok) {
            const info = await res.json()
            if (info.model_id === targetModelId) {
              addLog(`[${tag}] Model ${info.model_id} is now active on ${info.device || 'CPU'}!`)
              return true
            }
            // Still loading — keep polling
            if (info.loading === true) {
              // continue polling
            }
          }
        } catch { /* ignore */ }

        await new Promise(r => setTimeout(r, 1000))
      }
      return false
    }

    const waitForModel = async () => {
      setProgress(2)
      setStatusText('Clearing existing model slot...')
      try {
        await fetch(`${BACKEND_URL}/api/runtime/unload`, { method: 'POST' })
      } catch { /* ignore */ }

      if (cancelledRef.current) return

      // Load primary model (progress 5-95%)
      setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'loading' } : s))
      setProgress(5)
      setStatusText(`Loading ${modelId}...`)

      let primaryOk = false
      try {
        primaryOk = await loadSingleModel(modelId, 5, 90)
      } catch (err: any) {
        addLog(`[ERROR] Frontend load error: ${err.message}`)
      }

      if (cancelledRef.current) return

      if (!primaryOk) {
        addLog('[ERROR] Model failed to load — check that the backend is running and model files are available.')
        setStatusText('Model load failed — check runtime logs below')
        setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'error' } : s))
        setProgress(0)
        setLoadFailed(true)
        return
      }

      setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'ready' } : s))

      setProgress(100)
      setStatusText('Model ready!')

      // Fetch final active info for primary model
      try {
        const res = await fetch(`${BACKEND_URL}/api/runtime/active`)
        if (res.ok) {
          const info = await res.json()
          setSelectedModel({
            id: info.model_id || modelId,
            name: info.model_name || info.model_id || modelId,
            family: info.model_family || 'Qwen',
            featureType: featureId,
            parameterSize: '3B',
            license: 'Apache-2.0',
            sourceUrl: '',
            precisionOptions: [precision],
            state: 'ready',
            openvinoStatus: 'converted',
            recommendedDevice: info.device || device,
            recommended_device: info.device || device,
            recommendedRamGb: 12,
            benchmarkStatus: 'not_run',
            npuStatus: 'not_supported',
            localOpenVinoPath: '',
            packageType: 'local'
          })
        }
      } catch { /* ignore */ }

      // Wait for UI to settle, then navigate
      await new Promise(r => setTimeout(r, 800))
      if (!cancelledRef.current) {
        navigate(`/${featureId}?loaded=true`)
      }
    }

    const timer = setTimeout(waitForModel, 200)

    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
    }
  }, [retryKey])

  return (
    <div className="min-h-screen bg-aurora-base flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <canvas ref={matrixCanvasRef} className="w-full h-full" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-qwen-violet/5 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${featureConfig.iconBg} flex items-center justify-center mx-auto mb-5 border ${featureConfig.iconBorder}`}>
            {loadFailed ? (
              <RotateCw className="w-10 h-10 text-status-error" />
            ) : (
              <featureConfig.icon className={`w-10 h-10 ${featureConfig.iconColor}`} />
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{featureConfig.title}</h1>
          <p className="text-text-secondary text-sm">{statusText}</p>
        </div>

        {isCodingAgent && (
        <div className="glass-card p-6 mb-6 border border-aurora-border/40">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${isCodingAgent ? 'bg-qwen-violet/10' : 'bg-edge-cyan/10'} shrink-0`}>
              <featureConfig.icon className={`w-6 h-6 ${featureConfig.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-text-primary text-lg">{featureConfig.subtitle}</h3>
              <p className="text-xs text-text-muted mt-0.5">{featureConfig.desc}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-aurora-border/30">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Cpu className="w-3.5 h-3.5 text-qwen-violet shrink-0" />
              <span>Target: CPU / GPU</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <HardDrive className="w-3.5 h-3.5 text-edge-cyan shrink-0" />
              <span>Footprint: ~3 GB</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Zap className="w-3.5 h-3.5 text-status-warning shrink-0" />
              <span>Precision: INT4</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <MemoryStick className="w-3.5 h-3.5 text-status-ready shrink-0" />
              <span>OpenVINO Optimized</span>
            </div>
          </div>
        </div>
        )}

        {isCodingAgent && (
        <div className="glass-card p-5 mb-6 border border-aurora-border/40">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-qwen-violet" />
            <h3 className="text-sm font-semibold text-text-primary">System Hardware</h3>
            <div className="flex items-center gap-1 ml-auto">
              {hardware.openvino_status === 'available' ? (
                <span className="text-[10px] text-status-ready flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> OpenVINO Ready
                </span>
              ) : (
                <span className="text-[10px] text-status-warning flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> OpenVINO Unavailable
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <Cpu className="w-4 h-4 text-qwen-violet shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">CPU</p>
                <p className="text-xs text-text-primary truncate">{hardware.cpu}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <Zap className="w-4 h-4 text-edge-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">GPU</p>
                <p className="text-xs text-text-primary truncate">{hardware.gpu}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <Server className="w-4 h-4 text-status-warning shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">NPU</p>
                <p className="text-xs text-text-primary truncate">
                  {hardware.npu === 'detected' ? 'Intel AI Boost (NPU)' : hardware.npu === 'not_detected' ? 'Not Detected' : hardware.npu}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <MemoryStick className="w-4 h-4 text-status-ready shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">RAM</p>
                <p className="text-xs text-text-primary">{hardware.ram_total_gb}GB ({hardware.ram_available_gb}GB free)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <HardDrive className="w-4 h-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">Storage</p>
                <p className="text-xs text-text-primary">
                  {hardware.storage_total
                    ? `${hardware.storage_total} (${hardware.storage_free_gb}GB free)`
                    : `${hardware.storage_free_gb}GB free`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
              <Monitor className="w-4 h-4 text-text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted">OS</p>
                <p className="text-xs text-text-primary truncate">{hardware.os}</p>
              </div>
            </div>
          </div>
          {hardware.supported_devices.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-aurora-border/20">
              <span className="text-[10px] text-text-muted">Supported Devices:</span>
              {hardware.supported_devices.map((dev: string) => (
                <span key={dev} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  dev === 'NPU'
                    ? 'border-status-warning/30 text-status-warning bg-status-warning/5'
                    : dev === 'GPU'
                    ? 'border-edge-cyan/30 text-edge-cyan bg-edge-cyan/5'
                    : 'border-qwen-violet/30 text-qwen-violet bg-qwen-violet/5'
                }`}>
                  {dev}
                </span>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Model Loading Matrix */}
        <div className="flex flex-col gap-2 border-t border-aurora-border/40 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white mb-1">Model Matrix</span>
            <span className={`status-badge border font-mono text-xs ${
              loadFailed
                ? 'bg-status-error/20 text-status-error border-status-error/30'
                : 'bg-status-preparing/20 text-status-preparing border-status-preparing/30'
            }`}>
              {loadFailed ? 'FAILED' : `${progress}% COMPLETE`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {modelSlots.map((slot) => (
              <div
                key={slot.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-card border text-[10px] font-mono transition-all duration-300 ${
                  slot.status === 'ready'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : slot.status === 'loading'
                    ? 'border-qwen-violet/40 bg-qwen-violet/10 text-qwen-violet'
                    : slot.status === 'error'
                    ? 'border-status-error/40 bg-status-error/10 text-status-error'
                    : 'border-aurora-border/40 bg-aurora-base text-text-muted'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    slot.status === 'ready'
                      ? 'bg-emerald-400'
                      : slot.status === 'loading'
                      ? 'bg-qwen-violet animate-pulse'
                      : slot.status === 'error'
                      ? 'bg-status-error'
                      : 'bg-text-muted/30'
                  }`}
                />
                <span className="truncate">{slot.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider opacity-70">
                  {slot.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-bold text-white">
              <span>Play Brick Breaker while you wait</span>
              <span className="text-[10px] text-text-muted">Mouse or Left/Right arrows</span>
            </div>
            {/* Score card */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-qwen-violet/10 border border-qwen-violet/30 text-qwen-violet font-bold">SCORE {gameScore}</span>
              <span className="text-status-error tracking-widest" title="Lives">{'❤'.repeat(gameLives)}{'♡'.repeat(Math.max(0, 3 - gameLives))}</span>
              <span className="ml-auto px-2 py-0.5 rounded bg-aurora-surface border border-aurora-border/40 text-text-secondary font-bold">BEST {gameBest}</span>
            </div>
            <div className="border border-aurora-border/60 rounded-card bg-aurora-base flex items-center justify-center p-3 relative h-[220px]">
              <canvas
                ref={gameCanvasRef}
                width={300}
                height={200}
                className="w-full h-full cursor-none"
              />
              {gameStatus !== 'playing' && (
                <div className="absolute inset-0 bg-aurora-base/85 backdrop-blur-sm rounded-card flex flex-col items-center justify-center gap-1.5 animate-fade-in z-10">
                  {gameStatus === 'won' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <span
                          key={i}
                          className="absolute w-1.5 h-1.5 rounded-full animate-ping"
                          style={{
                            left: `${(i * 7 + 8) % 95}%`,
                            top: `${(i * 13 + 10) % 85}%`,
                            backgroundColor: ['#00f5ff', '#a855f7', '#10b981', '#f59e0b'][i % 4],
                            animationDelay: `${(i % 5) * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-4xl animate-bounce">{gameStatus === 'won' ? '🏆' : '💥'}</span>
                  <p className={`text-sm font-bold ${gameStatus === 'won' ? 'text-emerald-400' : 'text-status-error'}`}>
                    {gameStatus === 'won' ? 'You Win! All bricks cleared!' : 'Game Over'}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">Score: {gameScore} &bull; Best: {gameBest}</p>
                  <button
                    onClick={retryGame}
                    className="mt-1 px-4 py-1.5 rounded-lg bg-edge-cyan text-aurora-base text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    {gameStatus === 'won' ? 'Play Again' : 'Retry'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-qwen-violet" />
              Runtime stdout
            </span>
            <div className="border border-aurora-border/60 rounded-card p-4 h-[220px] overflow-y-auto bg-aurora-base/80 font-mono text-[10px] text-qwen-violet leading-relaxed flex flex-col gap-1.5 scrollbar-hide">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="truncate">
                  <span className="text-text-muted mr-1.5">&gt;&gt;</span>
                  {log}
                </div>
              ))}
              <div className="w-1.5 h-3 bg-qwen-violet animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-aurora-border/40 pt-4 mt-2">
          <div className="w-full bg-aurora-base h-2.5 rounded-full overflow-hidden border border-aurora-border">
            <div
              className={`h-full transition-all duration-300 ${
                loadFailed
                  ? 'bg-gradient-to-r from-status-error via-status-error/80 to-status-error'
                  : 'bg-gradient-to-r from-qwen-violet via-edge-cyan to-qwen-violet'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted text-center italic">
            {statusText}
          </span>
          {loadFailed && (
            <div className="flex justify-center mt-2">
              <button
                onClick={retryModelLoad}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-qwen-violet text-white text-xs font-bold hover:bg-qwen-violet/90 transition-all"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry Model Load
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
