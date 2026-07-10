import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Code2, File, Folder, FolderOpen, Play, Save, Copy, 
  Settings, Terminal, GitBranch, Zap, Cpu, ChevronRight,
  ChevronDown, FileCode, FileText, FileJson, FileCog,
  Send, Loader2, CheckCircle2, AlertCircle, RefreshCw,
  Wand2, Bug, RefreshCcw, Search, X, ArrowRight, RotateCw,
  Upload, Plus, Trash2, Edit3, MoreVertical, Server, Swords,
  ChevronLeft, MessageSquare, Paperclip, FolderPlus, Sparkles, Bot
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/Button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CoderArenaPage } from './coderArena'
import { AgentPage, AgentSettings, DEFAULT_AGENT_SETTINGS } from './AgentPage'

const BACKEND_URL = 'http://localhost:8000'
const CODER_MODEL_ID = 'Qwen2.5-Coder-1.5B-Instruct-ov-int4'

type ViewPhase = 'select' | 'welcome' | 'loading' | 'ready'
type ModelStatus = 'pending' | 'loading' | 'ready' | 'error'

interface ModelSlot {
  id: string
  label: string
  status: ModelStatus
}

interface FileItem {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileItem[]
  content?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  filesCreated?: string[]
}

interface ContextMenuState {
  x: number
  y: number
  target: FileItem
}

interface CreateDialogState {
  open: boolean
  type: 'file' | 'folder'
  parentPath: string
  name: string
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx': case 'ts': return <FileCode className='w-4 h-4 text-edge-cyan' />
    case 'json': return <FileJson className='w-4 h-4 text-status-warning' />
    case 'md': return <FileText className='w-4 h-4 text-text-muted' />
    case 'py': return <FileCode className='w-4 h-4 text-emerald-400' />
    case 'js': case 'jsx': return <FileCode className='w-4 h-4 text-yellow-400' />
    case 'c': case 'cpp': case 'h': return <FileCode className='w-4 h-4 text-blue-400' />
    case 'go': return <FileCode className='w-4 h-4 text-cyan-400' />
    case 'rs': return <FileCode className='w-4 h-4 text-orange-400' />
    case 'java': return <FileCode className='w-4 h-4 text-red-400' />
    default: return <File className='w-4 h-4 text-text-muted' />
  }
}

function ProjectTree({ items, level = 0, onSelect, selectedPath, onContextMenu, onCreateInFolder }: { 
  items: FileItem[]; 
  level?: number;
  onSelect?: (path: string) => void;
  selectedPath?: string;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  onCreateInFolder?: (parentPath: string, type: 'file' | 'folder') => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <div className={level > 0 ? 'ml-3' : ''}>
      {items.map((item) => (
        <div key={item.path}>
          <div
            className={`group flex items-center gap-1.5 w-full px-2 py-1 text-xs transition-colors rounded cursor-pointer ${
              selectedPath === item.path 
                ? 'bg-qwen-violet/15 text-qwen-violet' 
                : 'text-text-secondary hover:bg-aurora-surface-hover'
            }`}
            onClick={() => {
              if (item.type === 'folder') {
                setExpanded(prev => ({ ...prev, [item.path]: !prev[item.path] }))
              } else {
                onSelect?.(item.path)
              }
            }}
            onContextMenu={(e) => onContextMenu?.(e, item)}
          >
            {item.type === 'folder' ? (
              expanded[item.path] ? <FolderOpen className='w-3.5 h-3.5 text-status-warning shrink-0' /> : <Folder className='w-3.5 h-3.5 text-status-warning shrink-0' />
            ) : (
              <FileIcon name={item.name} />
            )}
            <span className='truncate flex-1'>{item.name}</span>
            {item.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(prev => ({ ...prev, [item.path]: true }))
                  onCreateInFolder?.(item.path, 'file')
                }}
                className='opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-aurora-surface transition-opacity'
                title='New file'
              >
                <Plus className='w-3 h-3 text-text-muted' />
              </button>
            )}
          </div>
          {item.type === 'folder' && expanded[item.path] && item.children && (
            <ProjectTree 
              items={item.children} 
              level={level + 1} 
              onSelect={onSelect} 
              selectedPath={selectedPath}
              onContextMenu={onContextMenu}
              onCreateInFolder={onCreateInFolder}
            />
          )}
          {item.type === 'folder' && expanded[item.path] && item.children && item.children.length === 0 && (
            <div className='ml-6 py-1 text-[10px] text-text-muted italic'>Empty</div>
          )}
        </div>
      ))}
    </div>
  )
}

export function CodingAgentPage() {
  const navigate = useNavigate()
  const { selectedModel, setSelectedModel } = useAppStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewPhase, setViewPhase] = useState<ViewPhase>('select')
  const [hardware, setHardware] = useState<any>(null)
  const [activeDevice, setActiveDevice] = useState('CPU')
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const abortRef = useRef<AbortController | null>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null)
  const gameCanvasRef = useRef<HTMLCanvasElement>(null)
  const cancelledRef = useRef(false)
  
  const [workspacePath, setWorkspacePath] = useState('')
  const [workspaceFiles, setWorkspaceFiles] = useState<FileItem[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false, type: 'file', parentPath: '', name: '' })
  
  const [progress, setProgress] = useState(0)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [statusText, setStatusText] = useState('Initializing...')
  const [modelSlots, setModelSlots] = useState<ModelSlot[]>([
    { id: CODER_MODEL_ID, label: 'Qwen Coder', status: 'pending' },
  ])
  const [gameScore, setGameScore] = useState(0)
  const [gameLives, setGameLives] = useState(3)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'gameover'>('playing')
  const [gameBest, setGameBest] = useState(() => parseInt(localStorage.getItem('bb_best_coder') || '0'))
  const [gameRound, setGameRound] = useState(0)
  const [showCoderArena, setShowCoderArena] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS)

  // Terminal / Run state
  const [isRunning, setIsRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<Array<{ type: 'stdout' | 'stderr' | 'info'; text: string }>>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Resizable panel state
  const [explorerWidth, setExplorerWidth] = useState(240)
  const [chatWidth, setChatWidth] = useState(340)
  const [editorHeightRatio, setEditorHeightRatio] = useState(0.5)
  const draggingRef = useRef<'explorer' | 'chat' | 'editor-terminal' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Editor & Terminal state
  const [editorContent, setEditorContent] = useState<string>('')
  const [activeTerminalTab, setActiveTerminalTab] = useState<'PROBLEMS' | 'OUTPUT' | 'TERMINAL'>('TERMINAL')
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalHistory, setTerminalHistory] = useState<string[]>([])
  const [problems, setProblems] = useState<Array<{ type: 'error' | 'warning' | 'info'; message: string; file?: string; line?: number }>>([])
  const [outputLogs, setOutputLogs] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const retryGame = () => {
    setGameScore(0)
    setGameLives(3)
    setGameStatus('playing')
    setGameRound(r => r + 1)
  }

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg])
  }

  const handleUnload = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/runtime/unload`, { method: 'POST' })
    } catch {}
    setSelectedModel(null)
    setViewPhase('select')
  }

  const extToLang: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', go: 'go', rs: 'rust', java: 'java',
  }

  const detectLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    return extToLang[ext] || 'python'
  }

  const handleRun = async () => {
    if (!activeTab || isRunning) return
    const lang = detectLanguage(activeTab)
    const contentToRun = editorContent ?? workspaceFiles.flatMap(f => f.children || [f]).find(f => f.path === activeTab)?.content
    if (!contentToRun) return

    setIsRunning(true)
    setRunError(null)
    setTerminalOutput([{ type: 'info', text: `Running ${activeTab.split('/').pop()} (${lang})...` }])
    setOutputLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Running ${activeTab.split('/').pop()} (${lang})...`])

    try {
      const res = await fetch(`${BACKEND_URL}/api/runtimes/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: contentToRun, language: lang, timeout: 30 }),
      })
      const data = await res.json()

      const output: Array<{ type: 'stdout' | 'stderr' | 'info'; text: string }> = []
      if (data.stdout) output.push({ type: 'stdout', text: data.stdout })
      if (data.stderr) output.push({ type: 'stderr', text: data.stderr })
      if (data.compile_time) output.push({ type: 'info', text: `Compile: ${data.compile_time}s` })
      if (data.run_time) output.push({ type: 'info', text: `Runtime: ${data.run_time}s` })

      const newProblems: Array<{ type: 'error' | 'warning' | 'info'; message: string; file?: string; line?: number }> = []

      if (data.exit_code !== 0 && data.stderr) {
        setRunError(data.stderr)
        output.push({ type: 'info', text: `Exit code: ${data.exit_code}` })
        const fileName = activeTab.split('/').pop() || activeTab
        newProblems.push({ type: 'error', message: data.stderr.split('\n')[0], file: fileName, line: 1 })
        setProblems(newProblems)
        setOutputLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Exit code: ${data.exit_code}`, data.stderr])
      } else if (!data.stderr && data.exit_code === 0) {
        output.push({ type: 'info', text: 'Process exited with code 0' })
        setProblems([])
        setOutputLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Process exited with code 0`, data.stdout || ''])
      }

      setTerminalOutput(prev => [...prev, ...output])
    } catch (err: any) {
      setTerminalOutput(prev => [...prev, { type: 'stderr', text: `Error: ${err.message}` }])
      setRunError(err.message)
      setProblems([{ type: 'error', message: err.message, file: activeTab.split('/').pop(), line: 1 }])
      setOutputLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${err.message}`])
    } finally {
      setIsRunning(false)
    }
  }

  const handleTerminalSubmit = async () => {
    if (!terminalInput.trim()) return
    const cmd = terminalInput.trim()
    setTerminalHistory(prev => [...prev, cmd])
    setTerminalInput('')
    setOutputLogs(prev => [...prev, `$ ${cmd}`])
    setActiveTerminalTab('TERMINAL')

    if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
      setTerminalOutput([])
      setTerminalHistory([])
      setOutputLogs([])
      return
    }

    if (cmd.toLowerCase().startsWith('run') || cmd.toLowerCase() === '.') {
      handleRun()
      return
    }

    setTerminalOutput(prev => [...prev, { type: 'stdout', text: `> ${cmd}` }])
  }

  const handleExecuteInTerminal = (code: string, lang?: string) => {
    const commandMap: Record<string, (code: string) => string> = {
      python: (c) => `python -c "${c.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      javascript: (c) => `node -e "${c.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      bash: (c) => c,
      shell: (c) => c,
    }
    const cmd = lang && commandMap[lang] ? commandMap[lang](code) : code
    setTerminalInput(cmd)
    setActiveTerminalTab('TERMINAL')
    setTimeout(() => handleTerminalSubmit(), 50)
  }

  const handleAskQwenAboutError = () => {
    if (!runError || !activeTab) return
    const fileName = activeTab.split('/').pop() || activeTab
    const lang = detectLanguage(activeTab)
    const fileContent = workspaceFiles.flatMap(f => f.children || [f]).find(f => f.path === activeTab)?.content || ''
    const errorMsg = `Fix the error in this ${lang} file.\n\nFile: ${fileName}\n\nCode:\n\`\`\`${lang}\n${fileContent}\n\`\`\`\n\nError:\n\`\`\`\n${runError}\n\`\`\`\n\nPlease provide the corrected full file code in a single code block.`
    setRunError(null)
    handleChatSend(errorMsg)
  }

  const handleOpenFolder = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspace/pick-folder`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.path) {
          setWorkspacePath(data.path)
          scanFolder(data.path)
          setViewPhase('ready')
        }
      }
    } catch {
      const path = prompt('Enter folder path:')
      if (path) {
        setWorkspacePath(path)
        scanFolder(path)
        setViewPhase('ready')
      }
    }
  }

  const scanFolder = useCallback(async (path: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspace/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaceFiles(data.files || [])
      }
    } catch { setWorkspaceFiles([]) }
  }, [])

  const createFileWithContent = async (fileName: string, content: string): Promise<boolean> => {
    const fullPath = `${workspacePath}/${fileName}`
    try {
      const createRes = await fetch(`${BACKEND_URL}/api/workspace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, type: 'file' })
      })
      if (createRes.ok) {
        const writeRes = await fetch(`${BACKEND_URL}/api/workspace/write-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fullPath, content })
        })
        if (writeRes.ok) {
          scanFolder(workspacePath)
          if (!openTabs.includes(fullPath)) {
            setOpenTabs(prev => [...prev, fullPath])
          }
          setActiveTab(fullPath)
          await handleOpenFile(fullPath)
          return true
        }
      }
    } catch {}
    return false
  }

  const createProjectFiles = async (files: Record<string, string>, projectDir: string) => {
    const createdFiles: string[] = []
    const dirPath = `${workspacePath}/${projectDir}`

    await fetch(`${BACKEND_URL}/api/workspace/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath, type: 'folder' })
    })

    for (const [fileName, content] of Object.entries(files)) {
      const filePath = `${dirPath}/${fileName}`
      try {
        await fetch(`${BACKEND_URL}/api/workspace/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, type: 'file' })
        })
        await fetch(`${BACKEND_URL}/api/workspace/write-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content })
        })
        createdFiles.push(`${projectDir}/${fileName}`)
      } catch {}
    }

    scanFolder(workspacePath)
    const mainFile = `${dirPath}/index.html`
    if (!openTabs.includes(mainFile)) {
      setOpenTabs(prev => [...prev, mainFile])
    }
    setActiveTab(mainFile)
    await handleOpenFile(mainFile)
    return createdFiles
  }

  const handleCreate = async () => {
    if (!createDialog.name.trim()) return
    const fullPath = createDialog.parentPath 
      ? `${workspacePath}/${createDialog.parentPath}/${createDialog.name}`
      : `${workspacePath}/${createDialog.name}`
    try {
      await fetch(`${BACKEND_URL}/api/workspace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, type: createDialog.type })
      })
      setCreateDialog({ open: false, type: 'file', parentPath: '', name: '' })
      if (workspacePath) scanFolder(workspacePath)
    } catch { setCreateDialog({ open: false, type: 'file', parentPath: '', name: '' }) }
  }

  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Delete ${item.type} '${item.name}'?`)) return
    try {
      await fetch(`${BACKEND_URL}/api/workspace/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path })
      })
      if (workspacePath) scanFolder(workspacePath)
    } catch {}
  }

  const handleRename = async (item: FileItem) => {
    const newName = prompt(`Rename '${item.name}' to:`, item.name)
    if (!newName || newName === item.name) return
    try {
      await fetch(`${BACKEND_URL}/api/workspace/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path, newName })
      })
      if (workspacePath) scanFolder(workspacePath)
    } catch {}
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspace/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      })
      if (res.ok) {
        const data = await res.json()
        setWorkspaceFiles(prev => {
          const update = (items: FileItem[]): FileItem[] => items.map(f => {
            if (f.path === filePath) return { ...f, content: data.content }
            if (f.children) return { ...f, children: update(f.children) }
            return f
          })
          return update(prev)
        })
        if (!openTabs.includes(filePath)) {
          setOpenTabs(prev => [...prev, filePath])
        }
        setActiveTab(filePath)
        setEditorContent(data.content)
      }
    } catch {}
  }

  const handleSaveFile = async () => {
    if (!activeTab || editorContent === null) return
    try {
      await fetch(`${BACKEND_URL}/api/workspace/write-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeTab, content: editorContent })
      })
      setWorkspaceFiles(prev => {
        const update = (items: FileItem[]): FileItem[] => items.map(f => {
          if (f.path === activeTab) return { ...f, content: editorContent }
          if (f.children) return { ...f, children: update(f.children) }
          return f
        })
        return update(prev)
      })
    } catch {}
  }

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, target: item })
  }

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Ctrl+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, isRunning])

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalOutput])

  // Resizable panel drag handlers
  const handleDragStart = (panel: 'explorer' | 'chat' | 'editor-terminal') => (e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = panel
    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      if (draggingRef.current === 'explorer') {
        setExplorerWidth(Math.max(160, Math.min(400, x)))
      } else if (draggingRef.current === 'chat') {
        setChatWidth(Math.max(240, Math.min(600, rect.right - ev.clientX)))
      } else if (draggingRef.current === 'editor-terminal') {
        const mainHeight = rect.height - 40
        setEditorHeightRatio(Math.max(0.15, Math.min(0.85, (y - 40) / mainHeight)))
      }
    }
    const onMouseUp = () => {
      draggingRef.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = draggingRef.current === 'editor-terminal' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/system/profile`)
        if (res.ok) {
          const data = await res.json()
          setHardware(data)
          const devices = data.supported_devices || ['CPU']
          setActiveDevice(devices.includes('GPU') ? 'GPU' : (devices.includes('NPU') ? 'NPU' : 'CPU'))
        }
      } catch {}
    }
    fetchHardware()
  }, [])

  useEffect(() => {
    if (viewPhase !== 'loading') return
    const canvas = matrixCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&%*+=-/'
    const charArr = chars.split('')
    const fontSize = 12
    const columns = Math.floor(canvas.width / fontSize)
    const drops = Array.from({ length: columns }, () => 1)
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#a855f7'
      ctx.font = `${fontSize}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const char = charArr[Math.floor(Math.random() * charArr.length)]
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) { drops[i] = 0 }
        drops[i]++
      }
    }
    const timer = setInterval(draw, 33)
    return () => clearInterval(timer)
  }, [viewPhase])

  useEffect(() => {
    if (viewPhase !== 'loading') return
    const canvas = gameCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let score = 0, lives = 3, remaining = 15, running = true
    const endGame = (won: boolean) => {
      running = false
      const best = Math.max(parseInt(localStorage.getItem('bb_best_coder') || '0'), score)
      localStorage.setItem('bb_best_coder', String(best))
      setGameBest(best)
      setGameStatus(won ? 'won' : 'gameover')
    }
    const pH = 10, pW = 75
    let pX = (canvas.width - pW) / 2, rP = false, lP = false, bR = 6
    let x = canvas.width / 2, y = canvas.height - 30, dx = 2.2, dy = -2.2
    const bR2 = 3, bC = 5, bW = 50, bH = 12, bP = 8, bOT = 20, bOL = 20
    const bricks: any[] = []
    for (let c = 0; c < bC; c++) { bricks[c] = []; for (let r = 0; r < bR2; r++) bricks[c][r] = { x: 0, y: 0, s: 1 } }
    const kD = (e: KeyboardEvent) => { if (e.key === 'Right' || e.key === 'ArrowRight') rP = true; if (e.key === 'Left' || e.key === 'ArrowLeft') lP = true }
    const kU = (e: KeyboardEvent) => { if (e.key === 'Right' || e.key === 'ArrowRight') rP = false; if (e.key === 'Left' || e.key === 'ArrowLeft') lP = false }
    document.addEventListener('keydown', kD)
    document.addEventListener('keyup', kU)
    const hMM = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); const rx = e.clientX - r.left; if (rx > 0 && rx < canvas.width) pX = rx - pW / 2 }
    canvas.addEventListener('mousemove', hMM)
    const drawG = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let c = 0; c < bC; c++) for (let r = 0; r < bR2; r++) {
        if (bricks[c][r].s === 1) {
          const bX = c * (bW + bP) + bOL, bY = r * (bH + bP) + bOT
          bricks[c][r].x = bX; bricks[c][r].y = bY
          ctx.beginPath(); ctx.rect(bX, bY, bW, bH)
          ctx.fillStyle = r === 0 ? '#a855f7' : (r === 1 ? '#00f5ff' : '#10b981')
          ctx.fill(); ctx.closePath()
        }
      }
      ctx.beginPath(); ctx.arc(x, y, bR, 0, Math.PI * 2); ctx.fillStyle = '#a855f7'; ctx.fill(); ctx.closePath()
      ctx.beginPath(); ctx.rect(pX, canvas.height - pH, pW, pH); ctx.fillStyle = '#7c3aed'; ctx.fill(); ctx.closePath()
      for (let c = 0; c < bC; c++) for (let r = 0; r < bR2; r++) {
        const b = bricks[c][r]
        if (b.s === 1 && x > b.x && x < b.x + bW && y > b.y && y < b.y + bH) { dy = -dy; b.s = 0; score++; remaining--; setGameScore(score); if (remaining === 0) { endGame(true); return } }
      }
      if (x + dx > canvas.width - bR || x + dx < bR) dx = -dx
      if (y + dy < bR) dy = -dy
      else if (y + dy > canvas.height - bR) { if (x > pX && x < pX + pW) dy = -dy; else { lives--; setGameLives(lives); if (lives <= 0) { endGame(false); return } x = canvas.width / 2; y = canvas.height - 30; dx = 2.2; dy = 2.2; pX = (canvas.width - pW) / 2 } }
      if (rP && pX < canvas.width - pW) pX += 4; else if (lP && pX > 0) pX -= 4
      x += dx; y += dy
      if (running) requestAnimationFrame(drawG)
    }
    drawG()
    return () => { running = false; document.removeEventListener('keydown', kD); document.removeEventListener('keyup', kU); canvas.removeEventListener('mousemove', hMM) }
  }, [gameRound, viewPhase])

  useEffect(() => {
    if (viewPhase !== 'loading') return
    cancelledRef.current = false
    const waitForModel = async () => {
      addLog(`[SYSTEM] Initiating model load: ${CODER_MODEL_ID}`)
      setProgress(5); setStatusText('Clearing existing model slot...')
      addLog('[RUNTIME] Clearing existing model slot...')
      try { await fetch(`${BACKEND_URL}/api/runtime/unload`, { method: 'POST' }) } catch {}
      if (cancelledRef.current) return
      setProgress(10); setStatusText('Loading Qwen Coder model...')
      addLog(`[RUNTIME] Sending load request for ${CODER_MODEL_ID}...`)
      let loadStarted = false
      try {
        const res = await fetch(`${BACKEND_URL}/api/runtime/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_id: CODER_MODEL_ID, device: 'AUTO', precision: 'INT4' })
        })
        loadStarted = res.ok
        if (res.ok) addLog('[RUNTIME] Load request accepted, loading in background...')
      } catch (err: any) { addLog(`[WARN] Backend unreachable (${err.message})`) }
      if (cancelledRef.current) return
      if (!loadStarted) {
        setProgress(10); setStatusText('Backend unreachable, simulating load...'); addLog('[SYSTEM] Backend unreachable, simulating model load...')
        const steps = [
          { p: 15, s: 'Initializing OpenVINO Runtime...', l: '[RUNTIME] Initializing OpenVINO Runtime...' },
          { p: 25, s: 'Loading model weights...', l: '[RUNTIME] Loading Qwen2.5-Coder-1.5B weights...' },
          { p: 40, s: 'Configuring inference pipeline...', l: '[RUNTIME] Configuring inference pipeline...' },
          { p: 55, s: 'Compiling model for CPU...', l: '[RUNTIME] Compiling model for CPU device...' },
          { p: 70, s: 'Allocating memory buffers...', l: '[RUNTIME] Allocating memory buffers...' },
          { p: 85, s: 'Finalizing model setup...', l: '[RUNTIME] Finalizing model setup...' },
          { p: 95, s: 'Model ready, verifying...', l: '[RUNTIME] Verifying model integrity...' },
          { p: 100, s: 'Load complete!', l: '[SYSTEM] Model load simulation complete!' },
        ]
        for (const step of steps) {
          if (cancelledRef.current) return
          await new Promise(r => setTimeout(r, 800))
          setProgress(step.p)
          setStatusText(step.s)
          addLog(step.l)
        }
        if (cancelledRef.current) return
        setModelSlots(prev => prev.map(s => s.id === CODER_MODEL_ID ? { ...s, status: 'ready' } : s))
        finalizeLoad(); return
      }
      setModelSlots(prev => prev.map(s => s.id === CODER_MODEL_ID ? { ...s, status: 'loading' } : s))
      setProgress(20); addLog('[RUNTIME] Polling for active status...')
      let polls = 0
      while (polls < 300 && !cancelledRef.current) {
        polls++
        try {
          const logRes = await fetch(`${BACKEND_URL}/api/runtime/logs`)
          if (logRes.ok) { const logData = await logRes.json(); if (logData.logs?.length) { setTerminalLogs(logData.logs); setProgress(Math.min(95, 15 + Math.round((logData.logs.length / 10) * 75))) } }
        } catch {}
        try {
          const res = await fetch(`${BACKEND_URL}/api/runtime/active`)
          if (res.ok) { const info = await res.json(); if (info.model_id) { setModelSlots(prev => prev.map(s => s.id === CODER_MODEL_ID ? { ...s, status: 'ready' } : s)); setProgress(100); addLog('[SYSTEM] Model active!'); finalizeLoad(info); return } }
        } catch {}
        await new Promise(r => setTimeout(r, 1000))
      }
      if (!cancelledRef.current) { addLog('[SYSTEM] Timed out, proceeding...'); finalizeLoad() }
    }
    const finalizeLoad = (info?: any) => {
      setSelectedModel({ id: CODER_MODEL_ID, name: 'Qwen2.5-Coder-1.5B', family: 'Qwen2.5-Coder', featureType: 'coding_agent', parameterSize: '1.5B', recommendedDevice: info?.device || 'CPU', recommendedRamGb: 8, status: 'ready', state: 'ready', license: 'Apache-2.0', sourceUrl: '', precisionOptions: ['INT4'], openvinoStatus: 'ready', benchmarkStatus: 'not-run', npuStatus: 'supported', localOpenVinoPath: '', packageType: 'openvino' })
      setTimeout(() => { if (!cancelledRef.current) setViewPhase('welcome') }, 500)
    }
    const timer = setTimeout(waitForModel, 200)
    return () => { cancelledRef.current = true; clearTimeout(timer) }
  }, [viewPhase])

  const detectCodeRequest = (input: string): { isCodeRequest: boolean; fileName?: string; language?: string; isFix?: boolean; isProject?: boolean; projectType?: string } => {
    const lower = input.toLowerCase()

    const projectPatterns: Record<string, string[]> = {
      website: ['website', 'web page', 'webpage', 'web app', 'webapp', 'landing page', 'landing', 'homepage', 'portfolio', 'blog', 'site'],
      html: ['static site', 'html page', 'html site'],
      api: ['rest api', 'api endpoint', 'backend api', 'server api'],
      cli: ['cli tool', 'command line tool', 'terminal tool', 'console app'],
      desktop: ['desktop app', 'gui app', 'electron app'],
      mobile: ['mobile app', 'react native', 'flutter app'],
    }

    const createPatterns = ['create', 'write', 'make', 'generate', 'build', 'new', 'add', 'develop', 'design']
    const isCreate = createPatterns.some(p => lower.includes(p))

    let detectedProjectType: string | null = null
    for (const [type, patterns] of Object.entries(projectPatterns)) {
      if (patterns.some(p => lower.includes(p))) {
        detectedProjectType = type
        break
      }
    }

    if (isCreate && detectedProjectType) {
      return { isCodeRequest: true, isProject: true, projectType: detectedProjectType, language: 'html' }
    }

    const langPatterns: Record<string, string[]> = {
      python: ['python', 'py', '.py'],
      javascript: ['javascript', 'js', 'node', '.js'],
      typescript: ['typescript', 'ts', '.ts'],
      c: [' c ', 'c language', '.c'],
      cpp: ['c++', 'cpp', '.cpp'],
      java: ['java', '.java'],
      go: ['golang', 'go ', '.go'],
      rust: ['rust', '.rs'],
    }

    const fixPatterns = ['fix', 'debug', 'error', 'solve', 'repair', 'correct', 'resolve']
    const isFix = fixPatterns.some(p => lower.includes(p))
    const isCode = lower.includes('script') || lower.includes('code') || lower.includes('program') || lower.includes('file') || lower.includes('function') || lower.includes('class') || lower.includes('api') || lower.includes('app') || lower.includes('tool') || lower.includes('error')

    if (!isCreate && !isFix) return { isCodeRequest: false }
    if (!isCode) return { isCodeRequest: false }

    let detectedLang = 'python'
    for (const [lang, patterns] of Object.entries(langPatterns)) {
      if (patterns.some(p => lower.includes(p))) {
        detectedLang = lang
        break
      }
    }

    const extMap: Record<string, string> = {
      python: '.py', javascript: '.js', typescript: '.ts', c: '.c', cpp: '.cpp', java: '.java', go: '.go', rust: '.rs'
    }

    const nameMatch = input.match(/(?:named?|called?|called)\s+['"]?(\w+)['"]?/i)
      || input.match(/(?:as|for)\s+['"]?(\w+)['"]?/i)
    let fileName = nameMatch ? nameMatch[1] : `main`
    if (!fileName.includes('.')) {
      fileName += extMap[detectedLang] || '.py'
    }

    return { isCodeRequest: true, fileName, language: detectedLang, isFix }
  }

  const handleChatSendWithMessage = async (message: string) => {
    setChatInput(message)
    await new Promise(r => setTimeout(r, 50))
    handleChatSend()
  }

  const handleChatSend = async (overrideMessage?: string) => {
    const msgToSend = overrideMessage || chatInput.trim()
    if (!msgToSend || isGenerating) return
    const userMsg: ChatMessage = { id: `msg_${Date.now()}`, role: 'user', content: msgToSend, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMsg])
    const currentInput = msgToSend
    setChatInput('')

    if (agentMode && workspacePath) {
      agentLoop(currentInput)
      return
    }

    setIsGenerating(true)

    const codeCheck = detectCodeRequest(currentInput)

    let contextMsg = currentInput
    if (activeTab) {
      const fileContent = workspaceFiles.flatMap(f => f.children || [f]).find(f => f.path === activeTab)?.content
      if (fileContent) {
        contextMsg = `File: ${activeTab}\n\n${fileContent}\n\n---\n\n${currentInput}`
      }
    }

    if (codeCheck.isProject && workspacePath) {
      const projectName = currentInput.match(/(?:named?|called?|for)\s+['"]?(\w[\w\s-]*)['"]?/i)?.[1]?.trim().replace(/\s+/g, '-').toLowerCase() || 'my-website'
      const projectPrompt = `Create a complete ${codeCheck.projectType} project called "${projectName}". Return EXACTLY this JSON format with all file contents. No explanation, just the JSON object.\n\n{\n  "files": {\n    "index.html": "<!DOCTYPE html>...</html>",\n    "css/styles.css": "...",\n    "js/script.js": "..."\n  },\n  "description": "Brief description of what was created"\n}\n\nRequirements:\n- Complete, working ${codeCheck.projectType}\n- Proper HTML5 structure\n- Modern CSS with responsive design\n- JavaScript for interactivity\n- All files should be complete and functional`

      try {
        abortRef.current = new AbortController()
        const res = await fetch(`${BACKEND_URL}/api/coding/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: projectPrompt, language: 'javascript', mode: 'generate' }),
          signal: abortRef.current.signal
        })

        if (res.ok && res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let fullContent = ''
          const assistantMsg: ChatMessage = { id: `msg_${Date.now()}_ai`, role: 'assistant', content: '', timestamp: new Date() }
          setChatMessages(prev => [...prev, assistantMsg])

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullContent += decoder.decode(value, { stream: true })
            setChatMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m))
          }

          try {
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const projectData = JSON.parse(jsonMatch[0])
              if (projectData.files) {
                const createdFiles = await createProjectFiles(projectData.files, projectName)
                const summaryMsg: ChatMessage = {
                  id: `msg_${Date.now()}_summary`,
                  role: 'assistant',
                  content: `**Project "${projectName}" created!**\n\n**Files:**\n${createdFiles.map((f: string) => `\`${f}\``).join('\n')}\n\n${projectData.description || ''}\n\nClick **index.html** to view the code. Open it in a browser to see the result.`,
                  timestamp: new Date(),
                  filesCreated: createdFiles
                }
                setChatMessages(prev => [...prev, summaryMsg])
              }
            }
          } catch (e) {
            const errMsg: ChatMessage = { id: `msg_${Date.now()}_err`, role: 'assistant', content: 'Failed to parse project structure. Please try again.', timestamp: new Date() }
            setChatMessages(prev => [...prev, errMsg])
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errMsg: ChatMessage = { id: `msg_${Date.now()}_err`, role: 'assistant', content: 'Error creating project. Please try again.', timestamp: new Date() }
          setChatMessages(prev => [...prev, errMsg])
        }
      } finally {
        setIsGenerating(false)
      }
      return
    }

    if (codeCheck.isCodeRequest && workspacePath) {
      contextMsg = `Generate ONLY the code for this request. Do not include any explanation, just the raw code in a single code block.\n\nRequest: ${currentInput}`
    }

    try {
      abortRef.current = new AbortController()
      const res = await fetch(`${BACKEND_URL}/api/coding/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: contextMsg, language: codeCheck.language || 'python', mode: 'generate' }),
        signal: abortRef.current.signal
      })
      
      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        const assistantMsg: ChatMessage = { id: `msg_${Date.now()}_ai`, role: 'assistant', content: '', timestamp: new Date() }
        setChatMessages(prev => [...prev, assistantMsg])
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += decoder.decode(value, { stream: true })
          setChatMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m))
        }

        if (codeCheck.isCodeRequest && workspacePath && codeCheck.fileName) {
          const codeMatch = fullContent.match(/```(?:\w+)?\n([\s\S]*?)```/)
          if (codeMatch) {
            const code = codeMatch[1].trim()
            const created = await createFileWithContent(codeCheck.fileName, code)
            if (created) {
              const explanationPrompt = `Explain this ${codeCheck.language} code briefly (2-3 sentences). What does it do?\n\n\`\`\`${codeCheck.language}\n${code}\n\`\`\``
              try {
                const explainRes = await fetch(`${BACKEND_URL}/api/coding/generate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: explanationPrompt, language: codeCheck.language, mode: 'explain' }),
                })
                if (explainRes.ok && explainRes.body) {
                  const reader2 = explainRes.body.getReader()
                  let explanation = ''
                  const explainMsg: ChatMessage = { id: `msg_${Date.now()}_explain`, role: 'assistant', content: '', timestamp: new Date(), filesCreated: [codeCheck.fileName] }
                  setChatMessages(prev => [...prev, explainMsg])
                  while (true) {
                    const { done, value } = await reader2.read()
                    if (done) break
                    explanation += decoder.decode(value, { stream: true })
                    setChatMessages(prev => prev.map(m => m.id === explainMsg.id ? { ...m, content: explanation } : m))
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errMsg: ChatMessage = { id: `msg_${Date.now()}_err`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }
        setChatMessages(prev => [...prev, errMsg])
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const agentLoop = async (task: string) => {
    if (!workspacePath) return
    setAgentRunning(true)

    const agentMsg: ChatMessage = { id: `msg_${Date.now()}_agent`, role: 'assistant', content: '', timestamp: new Date() }
    setChatMessages(prev => [...prev, agentMsg])

    const update = (content: string) => {
      setChatMessages(prev => prev.map(m => m.id === agentMsg.id ? { ...m, content } : m))
    }

    let messages = [{ role: 'user', content: agentSettings.systemPrompt + `\n\nWorkspace: ${workspacePath}\nTask: ${task}` }]
    let stepsLog: string[] = []

    try {
      for (let i = 0; i < agentSettings.maxSteps; i++) {
        if (!agentRunning) break

        update(`**Agent running...** Step ${i + 1}/${agentSettings.maxSteps}\n\n${stepsLog.join('\n')}`)

        const res = await fetch(`${BACKEND_URL}/api/coding/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: messages[messages.length - 1].content, language: 'javascript', mode: 'generate' }),
        })

        if (!res.ok) break

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let full = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
        }

        const match = full.match(/\{[\s\S]*?\}/)
        if (!match) break

        let action
        try { action = JSON.parse(match[0]) } catch { break }

        let result = ''

        if (action.action === 'done') {
          stepsLog.push(`**DONE:** ${action.summary}`)
          update(`**Agent completed!**\n\n${stepsLog.join('\n')}`)
          break
        } else if (action.action === 'command') {
          const data = await fetch(`${BACKEND_URL}/api/runtimes/agent/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: action.command, cwd: workspacePath }),
          }).then(r => r.json())
          result = data.stdout || data.stderr || 'No output'
          stepsLog.push(`$ ${action.command}\n${result.slice(0, 150)}`)
        } else if (action.action === 'write') {
          const data = await fetch(`${BACKEND_URL}/api/runtimes/agent/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: action.path, content: action.content, action: 'create' }),
          }).then(r => r.json())
          result = data.message
          stepsLog.push(`**WRITE** ${action.path}`)
          scanFolder(workspacePath)
        } else if (action.action === 'mkdir') {
          const data = await fetch(`${BACKEND_URL}/api/runtimes/agent/file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: action.path, content: '', action: 'mkdir' }),
          }).then(r => r.json())
          result = data.message
          stepsLog.push(`**MKDIR** ${action.path}`)
          scanFolder(workspacePath)
        } else if (action.action === 'read') {
          const data = await fetch(`${BACKEND_URL}/api/runtimes/agent/read?path=${encodeURIComponent(action.path)}`).then(r => r.json())
          result = data.content?.slice(0, 500) || 'Failed'
          stepsLog.push(`**READ** ${action.path}`)
        } else if (action.action === 'list') {
          const data = await fetch(`${BACKEND_URL}/api/runtimes/agent/list?path=${encodeURIComponent(action.path)}`).then(r => r.json())
          result = data.items?.map((i: any) => `${i.type === 'folder' ? '[DIR]' : '[FILE]'} ${i.name}`).join('\n') || 'Empty'
          stepsLog.push(`**LIST** ${action.path}\n${result.slice(0, 100)}`)
        }

        messages.push({ role: 'user', content: `Result:\n${result}\n\nContinue or {"action": "done", "summary": "..."}` })
      }

      if (stepsLog.length > 0 && !stepsLog[stepsLog.length - 1].startsWith('**DONE')) {
        update(`**Agent stopped** (max ${agentSettings.maxSteps} steps)\n\n${stepsLog.join('\n')}`)
      }
    } catch (err) {
      update(`**Agent error:** ${String(err)}\n\n${stepsLog.join('\n')}`)
    } finally {
      setAgentRunning(false)
      scanFolder(workspacePath)
    }
  }

  const activeFileContent = activeTab ? workspaceFiles.flatMap(f => f.children || [f]).find(f => f.path === activeTab)?.content : null

  return (
    <div className='w-full'>
      {/* WELCOME PHASE - VS Code style with mandatory Open Folder */}
      {viewPhase === 'welcome' && (
        <div className='min-h-screen bg-aurora-base flex flex-col items-center justify-center p-6 relative overflow-hidden'>
          <div className='absolute inset-0 bg-neural-grid opacity-20' />
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-qwen-violet/5 rounded-full blur-[100px]' />
          
          <div className='relative z-10 w-full max-w-2xl text-center'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className='w-24 h-24 rounded-2xl bg-gradient-to-br from-qwen-violet/20 to-edge-cyan/20 flex items-center justify-center mx-auto mb-6 border border-qwen-violet/20 shadow-lg shadow-qwen-violet/10'>
                <Code2 className='w-12 h-12 text-qwen-violet' />
              </div>
              <h1 className='text-4xl font-bold text-text-primary mb-3'>Qwen Coder Agent</h1>
              <p className='text-text-secondary text-base mb-8'>AI-powered coding assistant with local inference</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className='glass-card p-6 mb-6 border border-aurora-border/40 text-left'>
              <h3 className='text-sm font-bold text-text-primary mb-4 flex items-center gap-2'>
                <Sparkles className='w-4 h-4 text-qwen-violet' />
                Get Started
              </h3>
              <p className='text-xs text-text-secondary mb-5'>
                Open a project folder to start coding with Qwen Coder. Your files will appear in the Explorer, and you can chat with the AI assistant to generate, explain, and debug code.
              </p>
              
              <button
                onClick={handleOpenFolder}
                className='w-full flex items-center gap-4 p-4 rounded-xl bg-qwen-violet/10 border-2 border-dashed border-qwen-violet/30 hover:border-qwen-violet/60 hover:bg-qwen-violet/15 transition-all group cursor-pointer'
              >
                <div className='w-12 h-12 rounded-xl bg-qwen-violet/20 flex items-center justify-center group-hover:bg-qwen-violet/30 transition-colors shrink-0'>
                  <FolderOpen className='w-6 h-6 text-qwen-violet' />
                </div>
                <div className='text-left flex-1 min-w-0'>
                  <div className='text-sm font-bold text-text-primary group-hover:text-qwen-violet transition-colors'>Open Folder</div>
                  <div className='text-[10px] text-text-muted mt-0.5'>Select a project folder to begin</div>
                </div>
                <ArrowRight className='w-5 h-5 text-qwen-violet opacity-50 group-hover:opacity-100 transition-opacity' />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className='grid grid-cols-3 gap-3 mb-6'>
              {[
                { icon: Code2, label: 'Generate', desc: 'Write code from prompts', color: 'text-qwen-violet' },
                { icon: Bug, label: 'Debug', desc: 'Find and fix bugs', color: 'text-status-error' },
                { icon: Wand2, label: 'Refactor', desc: 'Improve code quality', color: 'text-edge-cyan' },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className='glass-card p-4 border border-aurora-border/30 text-center'>
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                  <div className='text-xs font-bold text-text-primary'>{label}</div>
                  <div className='text-[10px] text-text-muted mt-0.5'>{desc}</div>
                </div>
              ))}
            </motion.div>

            {hardware && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className='glass-card p-4 border border-aurora-border/30'>
                <div className='flex items-center gap-2 mb-3'>
                  <Cpu className='w-4 h-4 text-qwen-violet' />
                  <h3 className='text-xs font-semibold text-text-primary'>System Hardware</h3>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  <div className='flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30'>
                    <Cpu className='w-3.5 h-3.5 text-qwen-violet shrink-0' />
                    <div className='min-w-0'>
                      <p className='text-[9px] text-text-muted'>CPU</p>
                      <p className='text-[10px] text-text-primary truncate'>{hardware.cpu}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30'>
                    <Zap className='w-3.5 h-3.5 text-edge-cyan shrink-0' />
                    <div className='min-w-0'>
                      <p className='text-[9px] text-text-muted'>GPU</p>
                      <p className='text-[10px] text-text-primary truncate'>{hardware.gpu}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30'>
                    <Terminal className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
                    <div className='min-w-0'>
                      <p className='text-[9px] text-text-muted'>RAM</p>
                      <p className='text-[10px] text-text-primary'>{hardware.ram_total_gb}GB</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* SELECT PHASE - Model Selection */}
      {viewPhase === 'select' && (
        <div className='relative min-h-screen bg-aurora-base flex flex-col items-center justify-center p-6 overflow-hidden'>
          <div className='absolute inset-0 bg-neural-grid opacity-20' />
          <div className='relative z-10 w-full max-w-2xl'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center mb-8'>
              <button onClick={() => navigate('/dashboard')} className='absolute top-0 left-0 text-xs text-text-muted hover:text-text-secondary border border-aurora-border/40 px-3 py-1.5 rounded-lg hover:bg-aurora-surface-hover transition-colors'>
                ← Back
              </button>
              <div className='w-20 h-20 rounded-2xl bg-gradient-to-br from-qwen-violet/20 to-edge-cyan/20 flex items-center justify-center mx-auto mb-4 border border-qwen-violet/20'>
                <Code2 className='w-10 h-10 text-qwen-violet' />
              </div>
              <h1 className='text-3xl font-bold text-text-primary mb-2'>Qwen Coder Agent</h1>
              <p className='text-text-secondary text-sm'>Select a model to get started</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className='space-y-3'>
              <div onClick={() => { setSelectedModel({ id: CODER_MODEL_ID, name: 'Qwen2.5-Coder-1.5B', family: 'Qwen2.5-Coder', featureType: 'coding_agent', parameterSize: '1.5B', recommendedDevice: 'CPU', recommendedRamGb: 8, status: 'ready', state: 'ready', license: 'Apache-2.0', sourceUrl: '', precisionOptions: ['INT4'], openvinoStatus: 'ready', benchmarkStatus: 'not-run', npuStatus: 'supported', localOpenVinoPath: '', packageType: 'openvino' }); setViewPhase('loading') }} className='glass-card p-4 rounded-xl border border-aurora-border/30 hover:border-qwen-violet/50 cursor-pointer transition-all hover:bg-aurora-surface-hover group'>
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-qwen-violet/20 to-edge-cyan/20 flex items-center justify-center border border-qwen-violet/20 group-hover:border-qwen-violet/40 transition-colors'>
                    <Code2 className='w-6 h-6 text-qwen-violet' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-sm font-semibold text-text-primary'>Qwen2.5-Coder-1.5B</h3>
                    <p className='text-[10px] text-text-muted'>INT4 OpenVINO • CPU Optimized • 1.5B Parameters</p>
                  </div>
                  <div className='text-right'>
                    <span className='text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>Ready</span>
                  </div>
                </div>
              </div>

              <div className='glass-card p-4 rounded-xl border border-aurora-border/30 opacity-50 cursor-not-allowed'>
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-xl bg-aurora-surface/50 flex items-center justify-center border border-aurora-border/20'>
                    <Code2 className='w-6 h-6 text-text-muted' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-sm font-semibold text-text-secondary'>More models coming soon</h3>
                    <p className='text-[10px] text-text-muted'>Additional coding models will be available in future updates</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* LOADING PHASE */}
      {viewPhase === 'loading' && (
        <div className='relative min-h-screen bg-aurora-base text-text-primary flex flex-col items-center justify-center p-6 overflow-hidden'>
          <div className='absolute inset-0 z-0 opacity-20'><canvas ref={matrixCanvasRef} className='w-full h-full' /></div>
          <div className='glass-panel max-w-4xl w-full p-8 flex flex-col gap-6 relative z-10 border-qwen-violet/30 bg-aurora-surface/80'>
            <header className='flex justify-between items-center border-b border-aurora-border/60 pb-3'>
              <div className='flex items-center gap-2.5'>
                <RotateCw className='w-5 h-5 text-qwen-violet animate-spin' />
                <div><h2 className='text-lg font-black text-white'>Loading Qwen Coder</h2><p className='text-[10px] text-text-secondary mt-0.5'>{statusText}</p></div>
              </div>
              <span className='status-badge bg-status-preparing/20 text-status-preparing border border-status-preparing/30 font-mono text-xs'>{progress}% COMPLETE</span>
            </header>
            <div className='flex flex-col gap-2 border-t border-aurora-border/40 pt-3'>
              <span className='text-xs font-bold text-white mb-1'>Model Matrix</span>
              <div className='grid grid-cols-2 gap-3'>
                {modelSlots.map((slot) => (
                  <div key={slot.id} className={`flex items-center gap-2 px-3 py-2 rounded-card border text-[10px] font-mono transition-all duration-300 ${slot.status === 'ready' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : slot.status === 'loading' ? 'border-qwen-violet/40 bg-qwen-violet/10 text-qwen-violet' : 'border-aurora-border/40 bg-aurora-base text-text-muted'}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.status === 'ready' ? 'bg-emerald-400' : slot.status === 'loading' ? 'bg-qwen-violet animate-pulse' : 'bg-text-muted/30'}`} />
                    <span className='truncate'>{slot.label}</span>
                    <span className='ml-auto text-[9px] uppercase tracking-wider opacity-70'>{slot.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'>
              <div className='flex flex-col gap-3'>
                <div className='flex justify-between items-center text-xs font-bold text-white'><span>Play Brick Breaker</span><span className='text-[10px] text-text-muted'>Mouse or arrows</span></div>
                <div className='flex items-center gap-3 text-[10px] font-mono'><span className='px-2 py-0.5 rounded bg-qwen-violet/10 border border-qwen-violet/30 text-qwen-violet font-bold'>SCORE {gameScore}</span><span className='text-status-error'>{'\u2764'.repeat(gameLives)}{'\u2661'.repeat(Math.max(0, 3 - gameLives))}</span><span className='ml-auto px-2 py-0.5 rounded bg-aurora-surface border border-aurora-border/40 text-text-secondary font-bold'>BEST {gameBest}</span></div>
                <div className='border border-aurora-border/60 rounded-card bg-aurora-base flex items-center justify-center p-3 relative h-[220px]'>
                  <canvas ref={gameCanvasRef} width={300} height={200} className='w-full h-full cursor-none' />
                  {gameStatus !== 'playing' && (
                    <div className='absolute inset-0 bg-aurora-base/85 backdrop-blur-sm rounded-card flex flex-col items-center justify-center gap-1.5 animate-fade-in z-10'>
                      <span className='text-4xl animate-bounce'>{gameStatus === 'won' ? '\uD83C\uDFC6' : '\uD83D\uDCAB'}</span>
                      <p className={`text-sm font-bold ${gameStatus === 'won' ? 'text-emerald-400' : 'text-status-error'}`}>{gameStatus === 'won' ? 'You Win!' : 'Game Over'}</p>
                      <button onClick={retryGame} className='mt-1 px-4 py-1.5 rounded-lg bg-qwen-violet text-white text-xs font-bold hover:opacity-90'>{gameStatus === 'won' ? 'Play Again' : 'Retry'}</button>
                    </div>
                  )}
                </div>
              </div>
              <div className='flex flex-col gap-3'>
                <span className='text-xs font-bold text-white flex items-center gap-1.5'><Terminal className='w-4 h-4 text-qwen-violet' /> Runtime stdout</span>
                <div className='border border-aurora-border/60 rounded-card p-4 h-[220px] overflow-y-auto bg-aurora-base/80 font-mono text-[10px] text-qwen-violet leading-relaxed flex flex-col gap-1.5 scrollbar-hide'>
                  {terminalLogs.map((log, idx) => <div key={idx} className='truncate'><span className='text-text-muted mr-1.5'>&gt;&gt;</span>{log}</div>)}
                  <div className='w-1.5 h-3 bg-qwen-violet animate-pulse' />
                </div>
              </div>
            </div>
            <div className='flex flex-col gap-2 border-t border-aurora-border/40 pt-4 mt-2'>
              <div className='w-full bg-aurora-base h-2.5 rounded-full overflow-hidden border border-aurora-border'><div className='bg-gradient-to-r from-qwen-violet via-edge-cyan to-qwen-violet h-full transition-all duration-300' style={{ width: `${progress}%` }} /></div>
              <span className='text-[10px] text-text-muted text-center italic'>{statusText}</span>
            </div>
            <button onClick={() => { cancelledRef.current = true; setViewPhase('welcome') }} className='mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors'>Cancel</button>
          </div>
        </div>
      )}

      {/* READY PHASE - VS Code Layout */}
      {viewPhase === 'ready' && (
        <div className='h-screen flex flex-col bg-aurora-base'>
          {/* Title Bar */}
          <div className='flex-shrink-0 h-9 flex items-center px-3 border-b border-aurora-border/30 bg-aurora-surface/30 gap-3'>
            <div className='flex items-center gap-2'>
              <Code2 className='w-4 h-4 text-qwen-violet' />
              <span className='text-[11px] font-bold text-text-primary'>Qwen Coder Agent</span>
            </div>
            <div className='flex-1' />
            <div className='flex items-center gap-2'>
              {selectedModel && (
                <div className='flex items-center gap-1.5 px-2 py-0.5 rounded bg-qwen-violet/10 border border-qwen-violet/30'>
                  <div className='w-1.5 h-1.5 rounded-full bg-qwen-violet animate-pulse' />
                  <span className='text-[9px] text-qwen-violet font-semibold'>{selectedModel.name} ({activeDevice})</span>
                </div>
              )}
              <button onClick={handleUnload} className='text-[9px] text-status-error hover:text-status-error/80 font-semibold px-2 py-0.5 rounded hover:bg-status-error/10 transition-colors'>
                Unload Model
              </button>
            </div>
          </div>

          {/* Main Content - Resizable Panels */}
          <div ref={containerRef} className='flex-1 flex overflow-hidden min-h-0'>
            {/* Left - Explorer */}
            <div style={{ width: explorerWidth }} className='flex flex-col border-r border-aurora-border/30 bg-aurora-surface/20 shrink-0 overflow-hidden'>
              <div className='px-3 py-2 border-b border-aurora-border/30 flex items-center justify-between'>
                <span className='text-[10px] font-bold text-text-muted uppercase tracking-wider'>Explorer</span>
                <div className='flex items-center gap-1'>
                  <button onClick={handleOpenFolder} className='p-1 rounded hover:bg-aurora-surface-hover' title='Open Folder'><FolderOpen className='w-3.5 h-3.5 text-text-muted' /></button>
                  {workspacePath && <button onClick={() => setCreateDialog({ open: true, type: 'file', parentPath: '', name: '' })} className='p-1 rounded hover:bg-aurora-surface-hover' title='New File'><Plus className='w-3.5 h-3.5 text-text-muted' /></button>}
                </div>
              </div>
              {workspacePath && (
                <div className='px-3 py-1 border-b border-aurora-border/30 bg-aurora-base/40'>
                  <div className='flex items-center gap-1.5 text-[9px] text-text-secondary truncate'>
                    <Folder className='w-3 h-3 text-status-warning shrink-0' />
                    <span className='truncate font-mono'>{workspacePath.split('/').pop() || workspacePath.split('\\').pop()}</span>
                  </div>
                </div>
              )}
              <div className='flex-1 overflow-y-auto p-1.5'>
                {workspaceFiles.length > 0 ? (
                  <ProjectTree items={workspaceFiles} onSelect={(p) => handleOpenFile(p)} selectedPath={activeTab || undefined} onContextMenu={handleContextMenu} onCreateInFolder={(pp, t) => setCreateDialog({ open: true, type: t, parentPath: pp, name: '' })} />
                ) : workspacePath ? (
                  <div className='flex flex-col items-center justify-center py-6 text-center'>
                    <Folder className='w-6 h-6 text-text-muted/30 mb-2' />
                    <p className='text-[10px] text-text-muted'>Empty folder</p>
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-6 text-center'>
                    <FolderOpen className='w-8 h-8 text-text-muted/20 mb-2' />
                    <p className='text-[10px] text-text-muted mb-2'>No folder open</p>
                    <button onClick={handleOpenFolder} className='text-[10px] text-qwen-violet hover:underline'>Open Folder</button>
                  </div>
                )}
              </div>
              {/* Bottom Navigation */}
              <div className='flex-shrink-0 border-t border-aurora-border/30'>
                <div className='px-3 py-1.5 border-b border-aurora-border/30 bg-aurora-base/40'>
                  <span className='text-[9px] font-bold text-text-muted uppercase tracking-wider'>Workspace Tools</span>
                </div>
                <div className='p-1.5 space-y-0.5'>
                  {[
                    { icon: Bot, label: 'Agent', color: 'text-edge-cyan', onClick: () => setShowAgent(true) },
                    { icon: Terminal, label: 'Scheduler', color: 'text-edge-cyan' },
                    { icon: Server, label: 'MCP Server', color: 'text-emerald-400' },
                    { icon: Zap, label: 'Hooks', color: 'text-status-warning' },
                    { icon: Swords, label: 'Coder Arena', color: 'text-qwen-violet', onClick: () => setShowCoderArena(true) },
                  ].map(({ icon: Icon, label, color, onClick }) => (
                    <button key={label} onClick={onClick} className='w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] text-text-secondary hover:bg-aurora-surface-hover hover:text-text-primary transition-colors group'>
                      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                      <span className='truncate'>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className='w-[3px] shrink-0 cursor-col-resize hover:bg-qwen-violet/40 active:bg-qwen-violet/60 transition-colors' onMouseDown={handleDragStart('explorer')} />

            {/* Center - Code Editor + Terminal */}
            <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
              {/* Tabs */}
              <div className='flex-shrink-0 flex items-center border-b border-aurora-border/30 bg-aurora-base/60 overflow-x-auto h-8'>
                {openTabs.length > 0 ? (
                  <>
                    {openTabs.map(tab => {
                      const name = tab.split('/').pop() || tab.split('\\').pop() || tab
                      return (
                        <div key={tab} className={`group flex items-center gap-1.5 px-3 text-[11px] border-r border-aurora-border/30 cursor-pointer shrink-0 h-full ${activeTab === tab ? 'bg-aurora-surface/40 text-text-primary' : 'text-text-muted hover:bg-aurora-surface-hover'}`} onClick={() => setActiveTab(tab)}>
                          <FileIcon name={name} />
                          <span className='truncate max-w-[120px]'>{name}</span>
                          <button onClick={(e) => { e.stopPropagation(); setOpenTabs(prev => prev.filter(t => t !== tab)); if (activeTab === tab) setActiveTab(openTabs.find(t => t !== tab) || null) }} className='opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-aurora-surface'>
                            <X className='w-3 h-3' />
                          </button>
                        </div>
                      )
                    })}
                    <div className='ml-auto flex items-center gap-1 px-2 shrink-0'>
                      <button onClick={handleRun} disabled={isRunning || !activeFileContent} className='flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                        {isRunning ? <Loader2 className='w-3 h-3 animate-spin' /> : <Play className='w-3 h-3' />}
                        {isRunning ? 'Running...' : 'Run'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className='flex items-center h-full px-3 text-[10px] text-text-muted/40'>No files open</div>
                )}
              </div>

              {/* Code Content */}
              <div style={{ height: terminalCollapsed ? '100%' : `${editorHeightRatio * 100}%` }} className='min-h-0 flex flex-col border-b border-aurora-border/30 overflow-hidden'>
                {activeTab && activeFileContent !== null ? (
                  <>
                    {/* Editor Toolbar */}
                    <div className='flex-shrink-0 flex items-center gap-1 px-2 py-1 border-b border-aurora-border/20 bg-aurora-surface/10'>
                      <button onClick={() => { navigator.clipboard.writeText(editorContent || activeFileContent || '') }} className='flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-text-muted hover:text-text-primary hover:bg-aurora-surface-hover transition-colors' title='Copy All'>
                        <Copy className='w-3 h-3' /> Copy
                      </button>
                      <button onClick={() => navigator.clipboard.readText().then(t => setEditorContent(prev => (prev ?? activeFileContent ?? '') + t))} className='flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-text-muted hover:text-text-primary hover:bg-aurora-surface-hover transition-colors' title='Paste'>
                        <Upload className='w-3 h-3' /> Paste
                      </button>
                      <button onClick={() => { setEditorContent(''); textareaRef.current?.focus() }} className='flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-status-error hover:bg-status-error/10 transition-colors' title='Delete All'>
                        <Trash2 className='w-3 h-3' /> Clear
                      </button>
                      <div className='flex-1' />
                      {editorContent !== null && editorContent !== activeFileContent && (
                        <button onClick={handleSaveFile} className='flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-qwen-violet hover:bg-qwen-violet/10 transition-colors font-bold'>
                          <Save className='w-3 h-3' /> Save
                        </button>
                      )}
                      <span className='text-[9px] text-text-muted/40 ml-1'>Ln 1, Col 1</span>
                    </div>
                    {/* Editor with Line Numbers */}
                    <div className='flex-1 min-h-0 flex overflow-hidden'>
                      {/* Line Numbers */}
                      <div className='flex-shrink-0 w-10 bg-aurora-surface/10 border-r border-aurora-border/20 overflow-hidden select-none pt-2'>
                        {(editorContent ?? activeFileContent ?? '').split('\n').map((_, i) => (
                          <div key={i} className='text-[11px] text-text-muted/30 text-right pr-2 font-mono leading-[1.4] h-[1.4em]'>{i + 1}</div>
                        ))}
                      </div>
                      {/* Editable Textarea */}
                      <div className='flex-1 min-w-0 relative'>
                        <textarea
                          ref={textareaRef}
                          value={editorContent ?? activeFileContent ?? ''}
                          onChange={(e) => setEditorContent(e.target.value)}
                          spellCheck={false}
                          className='absolute inset-0 w-full h-full p-2 pl-3 font-mono text-[11px] text-text-primary bg-transparent resize-none focus:outline-none leading-[1.4] whitespace-pre overflow-auto'
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className='flex-1 flex flex-col items-center justify-center text-center'>
                    <Code2 className='w-12 h-12 text-text-muted/20 mb-3' />
                    <p className='text-sm text-text-muted'>Open a file from the Explorer</p>
                    <p className='text-[10px] text-text-muted/60 mt-1'>or ask Qwen Coder to create one</p>
                  </div>
                )}
              </div>

              {/* Editor-Terminal Resize Handle */}
              {!terminalCollapsed && (
                <div className='h-[3px] shrink-0 cursor-row-resize hover:bg-qwen-violet/40 active:bg-qwen-violet/60 transition-colors' onMouseDown={handleDragStart('editor-terminal')} />
              )}

              {/* Terminal Panel */}
              <div className={`${terminalCollapsed ? 'h-8' : 'flex-1'} flex flex-col bg-aurora-base/80 overflow-hidden`}>
                {/* Terminal Header */}
                <div className='flex-shrink-0 flex items-center gap-2 px-3 h-8 border-b border-aurora-border/30 bg-aurora-surface/20'>
                  <button onClick={() => setTerminalCollapsed(!terminalCollapsed)} className='flex items-center gap-1.5 text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors'>
                    <Terminal className='w-3.5 h-3.5' />
                    TERMINAL
                    <ChevronDown className={`w-3 h-3 transition-transform ${terminalCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!terminalCollapsed && (
                    <div className='flex items-center gap-1.5 ml-2'>
                      {(['PROBLEMS', 'OUTPUT', 'TERMINAL'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTerminalTab(tab)} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${activeTerminalTab === tab ? 'text-text-primary bg-aurora-surface/40' : 'text-text-muted hover:text-text-secondary'}`}>
                          {tab}
                          {tab === 'PROBLEMS' && problems.length > 0 && <span className='ml-1 text-status-error'>({problems.length})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {activeTab && !terminalCollapsed && (
                    <div className='flex items-center gap-1 ml-auto'>
                      <span className='text-[9px] text-text-muted font-mono px-1.5 py-0.5 rounded bg-aurora-base/60 border border-aurora-border/30'>
                        {detectLanguage(activeTab)}
                      </span>
                      <button onClick={handleRun} disabled={isRunning || !activeFileContent} className='flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 transition-colors'>
                        {isRunning ? <Loader2 className='w-2.5 h-2.5 animate-spin' /> : <Play className='w-2.5 h-2.5' />}
                      </button>
                      <button onClick={() => { setTerminalOutput([]); setProblems([]); setOutputLogs([]); setTerminalHistory([]) }} className='px-1.5 py-0.5 rounded text-[9px] text-text-muted hover:text-text-secondary hover:bg-aurora-surface-hover transition-colors'>
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Terminal Tabs Content */}
                {!terminalCollapsed && (
                  <div className='flex-1 min-h-0 overflow-hidden'>
                    {/* PROBLEMS Tab */}
                    {activeTerminalTab === 'PROBLEMS' && (
                      <div className='h-full overflow-y-auto p-2'>
                        {problems.length === 0 ? (
                          <div className='flex items-center gap-2 text-[10px] text-text-muted/40 p-2'>
                            <CheckCircle2 className='w-3.5 h-3.5' />
                            <span>No problems detected</span>
                          </div>
                        ) : (
                          <div className='space-y-0.5'>
                            {problems.map((p, i) => (
                              <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${p.type === 'error' ? 'text-status-error bg-status-error/5' : p.type === 'warning' ? 'text-status-warning bg-status-warning/5' : 'text-edge-cyan bg-edge-cyan/5'}`}>
                                {p.type === 'error' ? <AlertCircle className='w-3 h-3 shrink-0' /> : <CheckCircle2 className='w-3 h-3 shrink-0' />}
                                <span className='flex-1 truncate'>{p.message}</span>
                                {p.file && <span className='text-text-muted shrink-0'>{p.file}:{p.line}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* OUTPUT Tab */}
                    {activeTerminalTab === 'OUTPUT' && (
                      <div className='h-full overflow-y-auto p-3 font-mono text-[10px] leading-relaxed'>
                        {outputLogs.length === 0 ? (
                          <div className='text-text-muted/40'>No output</div>
                        ) : (
                          outputLogs.map((log, i) => <div key={i} className='text-text-secondary whitespace-pre-wrap'>{log}</div>)
                        )}
                      </div>
                    )}

                    {/* TERMINAL Tab */}
                    {activeTerminalTab === 'TERMINAL' && (
                      <div className='h-full flex flex-col'>
                        <div className='flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed scrollbar-hide'>
                          {terminalOutput.length === 0 && terminalHistory.length === 0 ? (
                            <div className='flex flex-col gap-1 text-text-muted/40'>
                              <span>Microsoft Windows [Version 10.0.26100.4351]</span>
                              <span>(c) Microsoft Corporation. All rights reserved.</span>
                            </div>
                          ) : (
                            <>
                              {terminalHistory.map((cmd, i) => (
                                <div key={`h-${i}`} className='text-text-secondary'>
                                  <span className='text-emerald-400/80'>C:\&gt;</span> {cmd}
                                </div>
                              ))}
                              {terminalOutput.map((line, idx) => (
                                <div key={idx} className={`whitespace-pre-wrap break-all ${
                                  line.type === 'stderr' ? 'text-status-error' : 
                                  line.type === 'info' ? 'text-text-muted' : 
                                  'text-emerald-400'
                                }`}>
                                  {line.text}
                                </div>
                              ))}
                              <div ref={terminalEndRef} />
                            </>
                          )}
                        </div>
                        {/* Terminal Input */}
                        <div className='flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-t border-aurora-border/30'>
                          <span className='text-[10px] text-emerald-400/80 font-mono shrink-0'>C:\&gt;</span>
                          <input
                            type='text'
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && terminalInput.trim()) { handleTerminalSubmit() } }}
                            placeholder={activeTab ? `${detectLanguage(activeTab)} — type a command` : 'Open a file to run'}
                            className='flex-1 bg-transparent text-[10px] text-text-primary font-mono focus:outline-none placeholder:text-text-muted/30'
                          />
                          <div className='flex items-center gap-1'>
                            <button onClick={() => navigator.clipboard.readText().then(t => setTerminalInput(t))} className='p-0.5 rounded hover:bg-aurora-surface-hover text-text-muted/40 hover:text-text-muted transition-colors' title='Paste'>
                              <Upload className='w-3 h-3' />
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(terminalOutput.map(l => l.text).join('\n')) }} className='p-0.5 rounded hover:bg-aurora-surface-hover text-text-muted/40 hover:text-text-muted transition-colors' title='Copy Output'>
                              <Copy className='w-3 h-3' />
                            </button>
                            <button onClick={() => { setTerminalOutput([]); setTerminalHistory([]) }} className='p-0.5 rounded hover:bg-aurora-surface-hover text-text-muted/40 hover:text-text-muted transition-colors' title='Clear'>
                              <Trash2 className='w-3 h-3' />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {!terminalCollapsed && runError && (
                  <div className='flex-shrink-0 border-t border-status-error/30 bg-status-error/5 px-3 py-2'>
                    <div className='flex items-center gap-2'>
                      <AlertCircle className='w-4 h-4 text-status-error shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-[10px] font-bold text-status-error'>Execution Failed</p>
                        <p className='text-[9px] text-text-muted truncate'>{runError.split('\n')[0]}</p>
                      </div>
                      <button onClick={handleAskQwenAboutError} className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-qwen-violet/15 border border-qwen-violet/30 text-qwen-violet text-[10px] font-bold hover:bg-qwen-violet/25 transition-colors shrink-0'>
                        <MessageSquare className='w-3 h-3' />
                        Ask Qwen to Fix
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Resize Handle */}
            <div className='w-[3px] shrink-0 cursor-col-resize hover:bg-qwen-violet/40 active:bg-qwen-violet/60 transition-colors' onMouseDown={handleDragStart('chat')} />

            {/* Right - Qwen Coder Chat */}
            <div style={{ width: chatWidth }} className='flex flex-col border-l border-aurora-border/30 bg-aurora-surface/10 shrink-0 overflow-hidden'>
              <div className='px-3 py-2 border-b border-aurora-border/30 flex items-center gap-2'>
                <MessageSquare className='w-4 h-4 text-qwen-violet' />
                <span className='text-[11px] font-bold text-text-primary'>Qwen Coder</span>
                {selectedModel && <span className='ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>Online</span>}
              </div>
              <div className='flex-1 min-h-0 overflow-y-auto p-3 space-y-3'>
                {chatMessages.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-full text-center'>
                    <div className='w-12 h-12 rounded-xl bg-qwen-violet/10 flex items-center justify-center mb-3'>
                      <Code2 className='w-6 h-6 text-qwen-violet' />
                    </div>
                    <p className='text-sm font-medium text-text-primary mb-1'>Qwen Coder</p>
                    <p className='text-[10px] text-text-muted max-w-[200px]'>Ask me to generate, explain, debug, or refactor code.</p>
                    <div className='mt-4 space-y-2 w-full max-w-[220px]'>
                      {['Create a Python hello world script', 'Create a JavaScript calculator', 'Create a C factorial function'].map((hint) => (
                        <button key={hint} onClick={() => setChatInput(hint)} className='w-full text-left px-3 py-2 rounded-lg border border-aurora-border/40 text-[10px] text-text-secondary hover:bg-aurora-surface-hover hover:border-qwen-violet/30 transition-colors'>{hint}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-qwen-violet/20 text-text-primary' : 'bg-aurora-surface/60 border border-aurora-border/30 text-text-secondary'}`}>
                          {msg.filesCreated && msg.filesCreated.length > 0 && (
                            <div className='mb-2 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1'>
                              <FileCode className='w-3 h-3' />
                              Created: {msg.filesCreated.join(', ')}
                            </div>
                          )}
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              code: ({ children, ...props }) => <code className='bg-aurora-surface-hover px-1 py-0.5 rounded text-edge-cyan text-[10px]' {...props}>{children}</code>,
                              pre: ({ children, ...props }) => {
                                const codeContent = typeof children === 'object' && children !== null && 'props' in children ? (children as any).props.children : ''
                                const codeText = typeof codeContent === 'string' ? codeContent : Array.isArray(codeContent) ? codeContent.join('') : String(codeContent || '')
                                const langMatch = String((children as any)?.props?.className || '').match(/language-(\w+)/)
                                const lang = langMatch?.[1]
                                return (
                                  <div className='my-1 relative group'>
                                    <pre className='bg-aurora-base/60 border border-aurora-border/30 rounded p-2 overflow-x-auto text-[10px]' {...props}>{children}</pre>
                                    <div className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1'>
                                      <button onClick={() => navigator.clipboard.writeText(codeText)} className='px-1.5 py-0.5 rounded bg-aurora-surface/80 border border-aurora-border/40 text-[8px] text-text-muted hover:text-text-primary hover:bg-aurora-surface transition-colors' title='Copy'>
                                        <Copy className='w-2.5 h-2.5 inline' />
                                      </button>
                                      <button onClick={() => handleExecuteInTerminal(codeText, lang)} className='px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[8px] text-emerald-400 hover:bg-emerald-500/30 transition-colors' title='Run in Terminal'>
                                        <Play className='w-2.5 h-2.5 inline' /> Run
                                      </button>
                                    </div>
                                  </div>
                                )
                              }
                            }}>{msg.content}</ReactMarkdown>
                          ) : msg.content}
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className='flex justify-start'>
                        <div className='bg-aurora-surface/60 border border-aurora-border/30 rounded-lg px-3 py-2 flex items-center gap-2'>
                          <Loader2 className='w-3 h-3 text-qwen-violet animate-spin' />
                          <span className='text-[10px] text-text-muted'>Thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              <div className='p-3 border-t border-aurora-border/30'>
                <div className='flex items-end gap-2'>
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                    placeholder={agentMode ? 'Describe task for agent...' : 'Ask Qwen Coder...'}
                    className='flex-1 min-h-[36px] max-h-[100px] px-3 py-2 rounded-lg bg-aurora-base border border-aurora-border/50 text-xs text-text-primary resize-none focus:outline-none focus:border-qwen-violet placeholder:text-text-muted/50'
                    rows={1}
                  />
                  <button onClick={() => handleChatSend()} disabled={!chatInput.trim() || isGenerating} className='p-2 rounded-lg bg-qwen-violet hover:bg-qwen-violet-hover text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0'>
                    <Send className='w-4 h-4' />
                  </button>
                </div>
                <div className='flex items-center gap-2 mt-1.5 text-[9px] text-text-muted'>
                  <span>{activeTab ? `File: ${activeTab.split('/').pop()}` : 'No file selected'}</span>
                  <div className='flex-1' />
                  {workspacePath && (
                    <button
                      onClick={() => setAgentMode(!agentMode)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${agentMode ? 'bg-edge-cyan/20 border-edge-cyan/40 text-edge-cyan' : 'border-aurora-border/30 hover:border-aurora-border/50 text-text-muted hover:text-text-secondary'}`}
                      title={agentMode ? 'Agent mode ON' : 'Agent mode OFF'}
                    >
                      <Bot className='w-2.5 h-2.5' />
                      {agentMode ? 'Agent ON' : 'Agent'}
                    </button>
                  )}
                  {agentMode && (
                    <button onClick={() => setShowAgent(true)} className='flex items-center gap-1 px-2 py-0.5 rounded border border-aurora-border/30 hover:border-aurora-border/50 text-text-muted hover:text-text-secondary transition-colors' title='Agent Settings'>
                      <Settings className='w-2.5 h-2.5' />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className='flex-shrink-0 h-6 flex items-center px-3 border-t border-aurora-border/30 bg-aurora-surface/30 text-[9px] text-text-muted gap-4'>
            <span className='flex items-center gap-1'><Code2 className='w-3 h-3' /> Qwen Coder</span>
            {workspacePath && <span className='flex items-center gap-1'><Folder className='w-3 h-3' /> {workspacePath.split('/').pop() || workspacePath.split('\\').pop()}</span>}
            {activeTab && <span>{activeTab.split('/').pop()}</span>}
            <div className='flex-1' />
            {activeTab && <span>Ln 1, Col 1</span>}
            <span>UTF-8</span>
            <span className='text-qwen-violet'>Qwen2.5-Coder-1.5B</span>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className='fixed z-50 bg-aurora-surface border border-aurora-border/60 rounded-lg shadow-xl py-1 min-w-[140px]' style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            {contextMenu.target.type === 'file' && <button onClick={() => { handleOpenFile(contextMenu.target.path); setContextMenu(null) }} className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-aurora-surface-hover'><Edit3 className='w-3.5 h-3.5' /> Open</button>}
            <button onClick={() => { handleRename(contextMenu.target); setContextMenu(null) }} className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-aurora-surface-hover'><Edit3 className='w-3.5 h-3.5' /> Rename</button>
            {contextMenu.target.type === 'folder' && (
              <>
                <button onClick={() => { setCreateDialog({ open: true, type: 'file', parentPath: contextMenu.target.path.replace(workspacePath + '/', ''), name: '' }); setContextMenu(null) }} className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-aurora-surface-hover'><FileCode className='w-3.5 h-3.5' /> New File</button>
                <button onClick={() => { setCreateDialog({ open: true, type: 'folder', parentPath: contextMenu.target.path.replace(workspacePath + '/', ''), name: '' }); setContextMenu(null) }} className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-aurora-surface-hover'><Folder className='w-3.5 h-3.5' /> New Folder</button>
              </>
            )}
            <div className='border-t border-aurora-border/40 my-1' />
            <button onClick={() => { handleDelete(contextMenu.target); setContextMenu(null) }} className='w-full flex items-center gap-2 px-3 py-1.5 text-xs text-status-error hover:bg-status-error/10'><Trash2 className='w-3.5 h-3.5' /> Delete</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Dialog */}
      <AnimatePresence>
        {createDialog.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => setCreateDialog({ open: false, type: 'file', parentPath: '', name: '' })}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className='bg-aurora-surface border border-aurora-border/60 rounded-xl p-5 w-full max-w-sm shadow-2xl' onClick={(e) => e.stopPropagation()}>
              <h3 className='text-sm font-bold text-text-primary mb-1'>Create New {createDialog.type === 'file' ? 'File' : 'Folder'}</h3>
              {createDialog.parentPath && <p className='text-[10px] text-text-muted mb-3 font-mono'>in {createDialog.parentPath || '/'}</p>}
              <input type='text' value={createDialog.name} onChange={(e) => setCreateDialog(prev => ({ ...prev, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} placeholder={createDialog.type === 'file' ? 'filename.ext' : 'folder-name'} className='w-full px-3 py-2 rounded-lg bg-aurora-base border border-aurora-border/50 text-sm text-text-primary focus:outline-none focus:border-qwen-violet mb-4 font-mono' autoFocus />
              <div className='flex justify-end gap-2'>
                <Button variant='ghost' size='sm' onClick={() => setCreateDialog({ open: false, type: 'file', parentPath: '', name: '' })}>Cancel</Button>
                <Button variant='primary' size='sm' onClick={handleCreate} disabled={!createDialog.name.trim()} className='bg-qwen-violet hover:bg-qwen-violet-hover text-white'>Create</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCoderArena && <CoderArenaPage onClose={() => setShowCoderArena(false)} />}
      {showAgent && <AgentPage workspacePath={workspacePath} onClose={() => setShowAgent(false)} settings={agentSettings} onSave={setAgentSettings} />}
    </div>
  )
}
