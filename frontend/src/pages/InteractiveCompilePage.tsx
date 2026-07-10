import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Terminal, RotateCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const BACKEND_URL = 'http://localhost:8000'


type ModelStatus = 'pending' | 'loading' | 'ready' | 'error'

interface ModelSlot {
  id: string
  label: string
  status: ModelStatus
}

export function InteractiveCompilePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setSelectedModel } = useAppStore()

  const featureId = searchParams.get('feature') || 'personal-assistant'
  const modelId = searchParams.get('model') || ''
  const device = searchParams.get('device') || 'CPU'
  const precision = searchParams.get('precision') || 'INT4'

  const [progress, setProgress] = useState(0)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [statusText, setStatusText] = useState('Initializing...')
  const [modelSlots, setModelSlots] = useState<ModelSlot[]>([
    { id: modelId, label: 'Primary LLM', status: 'pending' },
  ])

  const matrixCanvasRef = useRef<HTMLCanvasElement>(null)
  const gameCanvasRef = useRef<HTMLCanvasElement>(null)
  const cancelledRef = useRef(false)

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

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg])
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
    let ballRadius = 6
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

      // Poll until ready
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
                const existing = prev.filter(l => !l.startsWith(`[${tag}]`))
                const newLogs = logData.logs.map((l: string) => `[${tag}] ${l}`)
                return [...existing, ...newLogs]
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
              addLog(`[${tag}] Model ${info.model_id} is now active!`)
              return true
            }
            if (info.loading === false && !info.model_id) {
              addLog(`[${tag}] Load completed but model is not active.`)
              return false
            }
          }
        } catch { /* ignore */ }

        await new Promise(r => setTimeout(r, 1000))
      }
      return false
    }

    const waitForModel = async () => {
      addLog(`[SYSTEM] Initiating model load: ${modelId} on ${device} (${precision})`)

      setProgress(2)
      setStatusText('Clearing existing model slot...')
      addLog('[SYSTEM] Clearing existing model slot...')
      try {
        await fetch(`${BACKEND_URL}/api/runtime/unload`, { method: 'POST' })
      } catch { /* ignore */ }

      if (cancelledRef.current) return

      // Load primary model (progress 5-95%)
      setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'loading' } : s))
      setProgress(5)
      setStatusText(`Loading ${modelId}...`)
      addLog(`[RUNTIME] Initiating primary model load: ${modelId}`)

      let primaryOk = false
      try {
        primaryOk = await loadSingleModel(modelId, 5, 90)
      } catch (err: any) {
        addLog(`[RUNTIME] Load error: ${err.message}`)
      }

      if (cancelledRef.current) return

      if (!primaryOk) {
        addLog('[SYSTEM] Backend unavailable — simulating model preparation...')
        setProgress(50)
        setStatusText('Simulating model preparation...')
        for (let i = 50; i <= 100 && !cancelledRef.current; i += 5) {
          await new Promise(r => setTimeout(r, 200))
          setProgress(i)
        }
        if (cancelledRef.current) return
        setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'ready' } : s))
        addLog('[SYSTEM] Model ready (simulated)')
        navigate(`/${featureId}?loaded=true`)
        return
      }

      setModelSlots(prev => prev.map(s => s.id === modelId ? { ...s, status: 'ready' } : s))

      setProgress(100)
      setStatusText('Model ready!')
      addLog('[SYSTEM] Model loaded successfully!')

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

      await new Promise(r => setTimeout(r, 500))
      if (!cancelledRef.current) {
        navigate(`/${featureId}?loaded=true`)
      }
    }

    const timer = setTimeout(waitForModel, 200)

    return () => {
      cancelledRef.current = true
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-aurora-base text-text-primary flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <canvas ref={matrixCanvasRef} className="w-full h-full" />
      </div>

      <div className="glass-panel max-w-4xl w-full p-8 flex flex-col gap-6 relative z-10 border-edge-cyan/30 bg-aurora-surface/80">
        <header className="flex justify-between items-center border-b border-aurora-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <RotateCw className="w-5 h-5 text-edge-cyan animate-spin" />
            <div>
              <h2 className="text-lg font-black text-white">Loading Models</h2>
              <p className="text-[10px] text-text-secondary mt-0.5">{statusText}</p>
            </div>
          </div>
          <span className="status-badge bg-status-preparing/20 text-status-preparing border border-status-preparing/30 font-mono text-xs">
            {progress}% COMPLETE
          </span>
        </header>

        {/* Model Loading Matrix */}
        <div className="flex flex-col gap-2 border-t border-aurora-border/40 pt-3">
          <span className="text-xs font-bold text-white mb-1">Model Matrix</span>
          <div className="grid grid-cols-2 gap-3">
            {modelSlots.map((slot) => (
              <div
                key={slot.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-card border text-[10px] font-mono transition-all duration-300 ${
                  slot.status === 'ready'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : slot.status === 'loading'
                    ? 'border-edge-cyan/40 bg-edge-cyan/10 text-edge-cyan'
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
                      ? 'bg-edge-cyan animate-pulse'
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
              <span className="px-2 py-0.5 rounded bg-edge-cyan/10 border border-edge-cyan/30 text-edge-cyan font-bold">SCORE {gameScore}</span>
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
              <Terminal className="w-4 h-4 text-edge-cyan" />
              Runtime stdout
            </span>
            <div className="border border-aurora-border/60 rounded-card p-4 h-[220px] overflow-y-auto bg-aurora-base/80 font-mono text-[10px] text-edge-cyan-light leading-relaxed flex flex-col gap-1.5 scrollbar-hide">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="truncate">
                  <span className="text-text-muted mr-1.5">&gt;&gt;</span>
                  {log}
                </div>
              ))}
              <div className="w-1.5 h-3 bg-edge-cyan-glow animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-aurora-border/40 pt-4 mt-2">
          <div className="w-full bg-aurora-base h-2.5 rounded-full overflow-hidden border border-aurora-border">
            <div
              className="bg-gradient-to-r from-edge-cyan via-qwen-purple to-edge-cyan h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted text-center italic">
            {statusText}
          </span>
        </div>
      </div>
    </div>
  )
}
