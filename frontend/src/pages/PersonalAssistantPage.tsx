import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, Mic, MicOff, Paperclip, Plus, Settings, Cpu, Zap, Layers, HardDrive, MemoryStick, ShieldCheck, ArrowRight, Monitor, Server, Wifi, WifiOff, Search, Edit2, Trash2, Check, X, Calendar, Bot, Link, FileText, FolderClosed, ChevronDown, Copy, RotateCw, Volume2, Video, Image, FileSpreadsheet, Globe, Radio, Music, Square } from 'lucide-react'
import { useAppStore, ChatMessage } from '../store/useAppStore'
import { Button } from '../components/Button'
import { Textarea } from '../components/Input'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const BACKEND_URL = 'http://localhost:8000'
const TARGET_MODEL_ID = 'Qwen2.5-Omni-3B'
const TARGET_MODEL_NAME = 'Qwen2.5-Omni-3B'
const TARGET_MODEL_FAMILY = 'Qwen2.5-Omni'

type PagePhase = 'select' | 'loading' | 'ready'

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

const parseMessageContent = (content: string) => {
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/;
  const match = content.match(thoughtRegex);
  if (match) {
    const thought = match[1].trim();
    const rest = content.replace(thoughtRegex, '').trim();
    return { thought, content: rest };
  }
  return { thought: null, content };
}

const GEN_PHRASES = [
  'Thinking...',
  'Gathering context...',
  'Reasoning it through...',
  'Almost there...',
]

const formatSessionTime = (sessionId: string) => {
  const parsed = parseInt(sessionId)
  if (isNaN(parsed)) return 'New Chat'
  const date = new Date(parsed)
  return isNaN(date.getTime()) ? 'New Chat' : date.toLocaleTimeString()
}

const formatMessageTime = (timestamp: any) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString()
}

export function PersonalAssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedModel, chatSessions, activeSessionId, addChatMessage, updateChatMessage, setActiveSessionId, setSelectedModel, chatSessionTitles, deleteChatSession, updateChatSessionTitle, settings, projectsList, chatSessionProjects, addProject, deleteProject, setSessionProject, mcpTools } = useAppStore()
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [phase, setPhase] = useState<PagePhase>(selectedModel ? 'ready' : (searchParams.get('loaded') === 'true' ? 'ready' : 'select'))
  const [hardware, setHardware] = useState<HardwareProfile>(DEFAULT_HARDWARE)
  const [activeDevice, setActiveDevice] = useState<string>('GPU')
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [selectedProject, setSelectedProject] = useState(() => projectsList[0] || 'My AI Project')
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const [chatMode, setChatMode] = useState<'auto' | 'thinking' | 'fast'>('auto')
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)
  const [agentVideo, setAgentVideo] = useState(false)
  const [agentElapsed, setAgentElapsed] = useState(0)
  const [isAudioAgentOpen, setIsAudioAgentOpen] = useState(false)
  const [audioAgentStatus, setAudioAgentStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening')
  const [audioAgentTranscript, setAudioAgentTranscript] = useState<{user: string, assistant: string}[]>([])

  const audioAgentActiveRef = useRef(false)
  const agentRecognitionRef = useRef<any>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const [agentStopped, setAgentStopped] = useState(false)

  // Stop the live session (mic, speech, camera) but keep the console open
  const stopAgent = () => {
    audioAgentActiveRef.current = false
    try { agentRecognitionRef.current?.stop?.() } catch { /* noop */ }
    agentAudioRef.current?.pause()
    window.speechSynthesis.cancel()
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    setAgentStopped(true)
  }

  useEffect(() => {
    if (!isAudioAgentOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAudioAgentOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAudioAgentOpen])

  const getSpeechRecognition = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  // Voice Agent: real listen (ASR) -> think (LLM) -> speak (TTS) loop
  useEffect(() => {
    if (!isAudioAgentOpen) {
      audioAgentActiveRef.current = false
      try { agentRecognitionRef.current?.stop?.() } catch { /* noop */ }
      agentAudioRef.current?.pause()
      window.speechSynthesis.cancel()
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
      return
    }

    audioAgentActiveRef.current = true
    setAudioAgentTranscript([])
    setAudioAgentStatus('listening')
    setAgentElapsed(0)
    const sessionTimer = setInterval(() => setAgentElapsed(e => {
      if (e + 1 >= 600) { setIsAudioAgentOpen(false); return e } // 10 min cap
      return e + 1
    }), 1000)
    setAgentStopped(false)
    const chatLabel = agentVideo ? 'Video Chat' : 'Voice Chat'
    const voiceSessionId = `voice-${Date.now()}`
    let exchanges = 0
    if (setSessionProject) setSessionProject(voiceSessionId, selectedProject)
    if (updateChatSessionTitle) updateChatSessionTitle(voiceSessionId, chatLabel)
    addChatMessage(voiceSessionId, { id: `msg_${Date.now()}`, role: 'system', content: `Opening ${chatLabel}...`, timestamp: new Date() })
    const SR = getSpeechRecognition()

    // Video Chat: ask camera + mic permission and show the live stream
    if (agentVideo) {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 360, max: 720 },
          frameRate: { ideal: 15, max: 24 },
        },
        audio: true,
      }).then(stream => {
        cameraStreamRef.current = stream
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream
      }).catch(() => {
        setAudioAgentTranscript(prev => [...prev, { user: '(camera unavailable)', assistant: 'Camera/microphone permission was denied. Please allow access and reopen Video Chat.' }])
      })
    }

    // Grab the current camera frame so the Omni model answers about the live stream
    const captureFrame = (): string | null => {
      const v = videoPreviewRef.current
      if (!agentVideo || !v || !v.videoWidth) return null
      const c = document.createElement('canvas')
      const scale = Math.min(1, 640 / v.videoWidth, 360 / v.videoHeight)
      c.width = Math.max(1, Math.round(v.videoWidth * scale))
      c.height = Math.max(1, Math.round(v.videoHeight * scale))
      c.getContext('2d')?.drawImage(v, 0, 0)
      return c.toDataURL('image/jpeg', 0.72)
    }

    // Capture one user utterance: browser SpeechRecognition when available,
    // otherwise record the mic and send it to the backend Qwen-ASR endpoint.
    const listenOnce = () => new Promise<string>((resolve, reject) => {
      if (SR) {
        const rec = new SR()
        rec.continuous = false
        rec.interimResults = false
        rec.lang = 'en-US'
        let heard = ''
        rec.onresult = (e: any) => { heard = e.results[0][0].transcript }
        rec.onerror = (e: any) => reject(new Error(e.error || 'speech-error'))
        rec.onend = () => resolve(heard)
        agentRecognitionRef.current = rec
        rec.start()
      } else {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const mr = new MediaRecorder(stream)
          const chunks: Blob[] = []
          mr.ondataavailable = e => chunks.push(e.data)
          mr.onstop = async () => {
            stream.getTracks().forEach(t => t.stop())
            try {
              const fd = new FormData()
              fd.append('file', new Blob(chunks, { type: 'audio/webm' }), 'voice.webm')
              const r = await fetch(`${BACKEND_URL}/api/voice/transcribe`, { method: 'POST', body: fd })
              const j = await r.json()
              resolve(j.text || '')
            } catch (err) { reject(err as Error) }
          }
          agentRecognitionRef.current = { stop: () => { try { mr.stop() } catch { /* noop */ } } }
          mr.start()
          setTimeout(() => { try { mr.stop() } catch { /* noop */ } }, 6000)
        }).catch(reject)
      }
    })

    const askAssistant = async (text: string, frame: string | null): Promise<string> => {
      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: voiceSessionId,
          message: text,
          feature_type: agentVideo ? 'video_chat' : 'voice_agent',
          mode: 'fast',
          max_tokens: 96,
          internet: false,
          tools: mcpTools.filter(t => t.active).map(t => t.id),
          attachments: frame ? [{ id: `cam-${Date.now()}`, name: 'camera-frame.jpg', type: 'image', size: '', base64: frame }] : []
        })
      })
      if (!res.ok || !res.body) throw new Error('chat backend unavailable')
      const full = await res.text()
      // Drop stream metadata line and thought blocks; keep the spoken answer plain
      let content = full.startsWith('__METADATA__:') ? full.slice(full.indexOf('\n') + 1) : full
      content = content.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim()
      return content
    }

    const speak = (text: string) => new Promise<void>((resolve) => {
      // Strip markdown so TTS reads clean prose
      const plain = text.replace(/[#*`>|_]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').slice(0, 360)
      if (!plain) return resolve()
      // Model-generated speech (token2wav) is the primary spoken output;
      // browser speech synthesis is the fallback if the backend fails.
      const speakWithBrowser = () => {
        if (!('speechSynthesis' in window)) return resolve()
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(plain)
        u.rate = 1.05
        u.onend = () => resolve()
        u.onerror = () => resolve()
        window.speechSynthesis.speak(u)
      }
      const speaker = localStorage.getItem('voice_id') || 'Chelsie'
      const audio = new Audio(`${BACKEND_URL}/api/chat/tts?text=${encodeURIComponent(plain)}&speaker=${encodeURIComponent(speaker)}&profile=fast`)
      agentAudioRef.current = audio
      audio.onended = () => resolve()
      audio.onerror = () => speakWithBrowser()
      audio.play().catch(() => speakWithBrowser())
    })

    let consecutiveErrors = 0
    const loop = async () => {
      while (audioAgentActiveRef.current) {
        setAudioAgentStatus('listening')
        let heard = ''
        try {
          heard = (await listenOnce()).trim()
          consecutiveErrors = 0
        } catch {
          consecutiveErrors++
          if (consecutiveErrors >= 3) {
            setAudioAgentTranscript(prev => [...prev, { user: '(microphone unavailable)', assistant: 'I cannot access the microphone. Please check browser permissions and reopen the agent.' }])
            break
          }
          await new Promise(r => setTimeout(r, 800))
          continue
        }
        if (!audioAgentActiveRef.current) break
        if (!heard) continue

        setAudioAgentTranscript(prev => [...prev, { user: heard, assistant: '' }])
        exchanges++
        // Persist the spoken conversation into normal chat history
        addChatMessage(voiceSessionId, { id: `msg_${Date.now()}`, role: 'user', content: heard, timestamp: new Date(), modelId: TARGET_MODEL_ID, device: activeDevice })
        setAudioAgentStatus('thinking')
        const frame = captureFrame()
        let reply = ''
        try {
          reply = await askAssistant(heard, frame)
        } catch {
          reply = 'Sorry, the local inference backend is not reachable right now.'
        }
        if (!audioAgentActiveRef.current) break
        setAudioAgentTranscript(prev => prev.map((t, i) => i === prev.length - 1 ? { ...t, assistant: reply } : t))
        addChatMessage(voiceSessionId, { id: `msg_${Date.now() + 1}`, role: 'assistant', content: reply, timestamp: new Date(), modelId: TARGET_MODEL_ID, device: activeDevice })
        setAudioAgentStatus('speaking')
        await speak(reply)
      }
    }
    loop()

    return () => {
      audioAgentActiveRef.current = false
      clearInterval(sessionTimer)
      try { agentRecognitionRef.current?.stop?.() } catch { /* noop */ }
      agentAudioRef.current?.pause()
      window.speechSynthesis.cancel()
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
      // Close the console into the saved conversation in the main chat
      addChatMessage(voiceSessionId, { id: `msg_${Date.now()}`, role: 'system', content: `${chatLabel} ended — ${exchanges} exchange${exchanges === 1 ? '' : 's'}`, timestamp: new Date() })
      setActiveSessionId(voiceSessionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioAgentOpen])

  // Dictation: voice-to-text into the input box via Web Speech API
  const dictationRef = useRef<any>(null)
  const toggleDictation = () => {
    if (isMicActive) {
      try { dictationRef.current?.stop() } catch { /* noop */ }
      setIsMicActive(false)
      return
    }
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      if (finalText) setInput(prev => (prev ? prev.trimEnd() + ' ' : '') + finalText.trim())
    }
    rec.onend = () => setIsMicActive(false)
    rec.onerror = () => setIsMicActive(false)
    dictationRef.current = rec
    rec.start()
    setIsMicActive(true)
  }

  const handleCreateProject = () => {
    const name = prompt('Enter new project name:')
    if (!name || !name.trim()) return
    const trimmed = name.trim()
    if (projectsList.includes(trimmed)) {
      alert('Project already exists.')
      return
    }
    if (addProject) {
      addProject(trimmed)
    }
    setSelectedProject(trimmed)
  }

  const handleNewChat = () => {
    const newSessionId = Date.now().toString()
    if (setSessionProject) {
      setSessionProject(newSessionId, selectedProject)
    }
    setActiveSessionId(newSessionId)
  }

  interface AttachedFile {
    id: string
    name: string
    size: string
    type: 'image' | 'video' | 'audio' | 'doc'
    url?: string
    base64?: string
  }

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>, forceType?: 'video' | 'image' | 'audio' | 'doc') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      let type: 'image' | 'video' | 'audio' | 'doc' = 'doc'
      if (forceType) {
        type = forceType
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) type = 'image'
        else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) type = 'video'
        else if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) type = 'audio'
      }

      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`

      const reader = new FileReader()
      reader.onload = () => {
        const base64Str = reader.result as string
        const newFile: AttachedFile = {
          id: `attach-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: sizeStr,
          type: type,
          url: URL.createObjectURL(file),
          base64: base64Str
        }
        setAttachedFiles(prev => [...prev, newFile])
      }
      reader.readAsDataURL(file)
    }
  }

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [ttsProcessingId, setTtsProcessingId] = useState<string | null>(null)
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null)

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleReadAloud = (messageId: string, text: string) => {
    if (speakingMessageId === messageId || ttsProcessingId === messageId) {
      if (activeAudio) {
        activeAudio.pause()
        setActiveAudio(null)
      }
      window.speechSynthesis.cancel()
      setSpeakingMessageId(null)
      setTtsProcessingId(null)
    } else {
      if (activeAudio) {
        activeAudio.pause()
      }
      window.speechSynthesis.cancel()
      setSpeakingMessageId(null)
      setTtsProcessingId(messageId)   // show processing banner immediately

      const speaker = localStorage.getItem('voice_id') || 'Chelsie'
      const plain = text.replace(/[#*`>|_]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').slice(0, 600)
      const audioUrl = `${BACKEND_URL}/api/chat/tts?text=${encodeURIComponent(plain)}&msg_id=${messageId}&speaker=${encodeURIComponent(speaker)}`
      const audio = new Audio(audioUrl)

      audio.oncanplay = () => {
        setTtsProcessingId(null)   // backend responded — hide processing banner
        setSpeakingMessageId(messageId)
      }
      audio.onended = () => {
        setSpeakingMessageId(null)
        setActiveAudio(null)
      }
      audio.onerror = () => {
        setTtsProcessingId(null)
        console.warn('Backend TTS failed, falling back to browser synthesis API')
        const utterance = new SpeechSynthesisUtterance(plain)
        setSpeakingMessageId(messageId)
        utterance.onend = () => { setSpeakingMessageId(null); setActiveAudio(null) }
        utterance.onerror = () => { setSpeakingMessageId(null); setActiveAudio(null) }
        window.speechSynthesis.speak(utterance)
      }
      audio.play().catch(() => {
        setTtsProcessingId(null)
        const utterance = new SpeechSynthesisUtterance(plain)
        setSpeakingMessageId(messageId)
        utterance.onend = () => { setSpeakingMessageId(null); setActiveAudio(null) }
        utterance.onerror = () => { setSpeakingMessageId(null); setActiveAudio(null) }
        window.speechSynthesis.speak(utterance)
      })
      setActiveAudio(audio)
    }
  }

  const handleRegenerate = async (msgId: string) => {
    if (isGenerating) return
    const msgIndex = messages.findIndex(m => m.id === msgId)
    if (msgIndex === -1) return
    
    const userMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user')
    if (!userMsg) return

    const truncated = messages.slice(0, msgIndex)
    useAppStore.setState((state) => ({
      chatSessions: {
        ...state.chatSessions,
        [activeSessionId]: truncated
      }
    }))

    handleSend(userMsg.content)
  }

  const messages = chatSessions[activeSessionId] || []

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180
      if (isNearBottom || messages.length <= 1) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [messages])

  const handleLoadModel = () => {
    navigate(`/compile-load?feature=personal-assistant&model=${TARGET_MODEL_ID}&device=AUTO&precision=INT4`)
  }

  const handleUnloadModel = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/runtime/unload`, { method: 'POST' })
      setSelectedModel(null)
    } catch (err) {
      console.error("Error unloading model:", err)
    }
  }

  // Rotate the creative "generating" phrases while the model is thinking
  const [genPhraseIdx, setGenPhraseIdx] = useState(0)
  useEffect(() => {
    if (!isGenerating) return
    setGenPhraseIdx(Math.floor(Math.random() * GEN_PHRASES.length))
    const iv = setInterval(() => setGenPhraseIdx(i => i + 1), 2200)
    return () => clearInterval(iv)
  }, [isGenerating])

  // Always open with a fresh blank chat; previous sessions remain in the sidebar history
  useEffect(() => {
    setActiveSessionId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch hardware profile from backend
  useEffect(() => {
    const fetchHardware = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/system/profile`)
        if (res.ok) {
          const data = await res.json()
          setHardware(data)
        }
      } catch {
        // keep DEFAULT_HARDWARE
      }
    }
    fetchHardware()
  }, [])

  // Fetch actual loaded device from runtime so the badge is always accurate
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/runtime/active`)
        if (res.ok) {
          const data = await res.json()
          if (data?.device) setActiveDevice(data.device.toUpperCase())
        }
      } catch { /* keep default */ }
    }
    fetchActive()
    const iv = setInterval(fetchActive, 8000)
    return () => clearInterval(iv)
  }, [selectedModel])

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput !== undefined ? customInput : input
    if (!textToSend.trim() || isGenerating) return

    const sessionId = activeSessionId || Date.now().toString()
    const isFirstMessage = !chatSessions[sessionId] || chatSessions[sessionId].length === 0
    const userInput = textToSend.trim()

    if (!activeSessionId) {
      if (setSessionProject) {
        setSessionProject(sessionId, selectedProject)
      }
      setActiveSessionId(sessionId)
    }

    if (isFirstMessage && updateChatSessionTitle) {
      let autoTitle = userInput.slice(0, 30)
      if (userInput.length > 30) autoTitle += '...'
      updateChatSessionTitle(sessionId, autoTitle)
    }

    if (customInput === undefined) {
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: new Date(),
        modelId: selectedModel?.id || TARGET_MODEL_ID,
        device: activeDevice,
        // base64 stays out of the store: it is ~1MB per image and overflows the
        // persisted localStorage quota, which crashes the send midway
        attachments: attachedFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, url: f.url }))
      }
      addChatMessage(sessionId, userMessage)
      setInput('')
      setAttachedFiles([])
    }
    
    setIsGenerating(true)

    try {
      abortRef.current = new AbortController()
      const temp = parseFloat(localStorage.getItem('model_temp') || '0.7')
      const topP = parseFloat(localStorage.getItem('model_topp') || '0.9')
      const maxTokens = parseInt(localStorage.getItem('model_maxtokens') || '2048')
      const sysPrompt = localStorage.getItem('model_sysprompt') || 'You are a helpful local AI assistant.'

      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          message: userInput, 
          feature_type: 'personal_assistant',
          temperature: temp,
          top_p: topP,
          max_tokens: maxTokens,
          system_prompt: sysPrompt,
          mode: chatMode,
          internet: true,
          tools: mcpTools.filter(t => t.active).map(t => t.id),
          attachments: attachedFiles.map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, base64: f.base64 }))
        }),
        signal: abortRef.current.signal
      })

      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantContent = ''
        const assistantId = `msg_${Date.now() + 1}`

        const startTime = Date.now()

        // Add placeholder message immediately for typing effect
        addChatMessage(sessionId, {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          modelId: selectedModel?.id || TARGET_MODEL_ID,
          device: activeDevice,
          tokensPerSecond: 0,
        })

        let meta: { model_id?: string, device?: string } | null = null
        let parsedMetadata = false

        const readLoop = async () => {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            
            if (!parsedMetadata) {
              const newlineIdx = buffer.indexOf('\n')
              if (newlineIdx !== -1) {
                const firstLine = buffer.substring(0, newlineIdx)
                buffer = buffer.substring(newlineIdx + 1)
                if (firstLine.startsWith('__METADATA__:')) {
                  try {
                    const metaStr = firstLine.substring('__METADATA__:'.length)
                    meta = JSON.parse(metaStr)
                  } catch (e) {
                    console.error('Failed to parse metadata:', e)
                  }
                } else {
                  buffer = firstLine + '\n' + buffer
                }
                parsedMetadata = true
              }
            }
            
            if (parsedMetadata) {
              assistantContent += buffer
              buffer = ''
            }

            // Update message in-place for typing effect
            if (assistantContent || meta) {
              const elapsed = (Date.now() - startTime) / 1000
              const tokens = Math.max(1, Math.round(assistantContent.length / 4.1))
              const realToksPerSec = elapsed > 0.05 ? parseFloat((tokens / elapsed).toFixed(1)) : 35.0

              const updates: any = {
                tokensPerSecond: realToksPerSec
              }
              if (meta) {
                if (meta.model_id) updates.modelId = meta.model_id
                if (meta.device) updates.device = meta.device
              }
              updateChatMessage(sessionId, assistantId, assistantContent, updates)
            }
          }
          setIsGenerating(false)
        }

        readLoop().catch(() => setIsGenerating(false))
      } else {
        throw new Error('API not reachable')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.warn('Backend chat unavailable, falling back to simulation', err)
      
      const activeTools = mcpTools.filter(t => t.active).map(t => t.name)
      let simulationOutput = ''

      if (chatMode !== 'fast') {
        simulationOutput += `<thought>\nQwen ThoughtChain (offline fallback) • Mode: ${chatMode.toUpperCase()}\nActive MCP tools: ${activeTools.length ? activeTools.join(', ') : 'none'}\nPlanning, analyzing context and verifying the draft answer...\n</thought>\n\n`
      }

      simulationOutput += `Here is the processed response for your task in **${chatMode.toUpperCase()}** mode${activeTools.length ? `, with MCP tools: ${activeTools.join(', ')}` : ''}.\n\nThe local backend is not reachable, so this is an offline fallback answer. Start the backend server for full Qwen responses.`

      setTimeout(() => {
        addChatMessage(sessionId, {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: simulationOutput,
          timestamp: new Date(),
          modelId: selectedModel?.id || TARGET_MODEL_ID,
          device: activeDevice,
          tokensPerSecond: parseFloat((35.0 + Math.random() * 5.0).toFixed(1)),
        })
        setIsGenerating(false)
      }, 1200)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isSelectionPhase = phase === 'select'

  return (
    <div className="w-full">
      {isSelectionPhase ? (
          <div className="min-h-screen bg-aurora-base flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-neural-grid opacity-30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-edge-cyan/5 rounded-full blur-[120px]" />

            <div className="relative z-10 w-full max-w-2xl">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-edge-cyan/20 to-qwen-violet/20 flex items-center justify-center mx-auto mb-5 border border-edge-cyan/20">
                  <Layers className="w-10 h-10 text-edge-cyan" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">Personal Assistant</h1>
                <p className="text-text-secondary">Load the engine to start chatting with multimodal intelligence</p>
              </div>

              {/* Model Card */}
              <div className="glass-card p-6 mb-6 border border-aurora-border/40">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-edge-cyan/10 shrink-0">
                    <Layers className="w-6 h-6 text-edge-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary text-lg">Integrated Qwen AI Engines</h3>
                    <p className="text-xs text-text-muted mt-0.5">Optimized for Intel Core Ultra and Arc Graphics</p>
                    <div className="mt-4 space-y-2 text-sm text-text-secondary">
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-edge-cyan mt-1.5 shrink-0" />
                        <div>
                          <strong className="text-text-primary">Omni Chat Engine (Qwen-Omni):</strong> Multimodal dialogue supporting text, image, video, and audio understanding.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-aurora-border/30">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Cpu className="w-3.5 h-3.5 text-edge-cyan shrink-0" />
                    <span>Target: CPU / GPU / NPU</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <HardDrive className="w-3.5 h-3.5 text-qwen-violet shrink-0" />
                    <span>Footprint: 16 GB Total</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Zap className="w-3.5 h-3.5 text-status-warning shrink-0" />
                    <span>Precision: INT4 / FP16</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <MemoryStick className="w-3.5 h-3.5 text-status-ready shrink-0" />
                    <span>OpenVINO Optimized</span>
                  </div>
                </div>
              </div>

              {/* Hardware Scan Results */}
              {hardware && (
                <div className="glass-card p-5 mb-6 border border-aurora-border/40">
                  <div className="flex items-center gap-2 mb-4">
                    <Monitor className="w-4 h-4 text-edge-cyan" />
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
                      <Cpu className="w-4 h-4 text-edge-cyan shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-muted">CPU</p>
                        <p className="text-xs text-text-primary truncate">{hardware.cpu}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-aurora-surface/30">
                      <Zap className="w-4 h-4 text-qwen-violet shrink-0" />
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
                            ? 'border-qwen-violet/30 text-qwen-violet bg-qwen-violet/5'
                            : 'border-edge-cyan/30 text-edge-cyan bg-edge-cyan/5'
                        }`}>
                          {dev}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Load Model Button */}
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleLoadModel}
                  className="py-4 text-base font-bold bg-edge-cyan hover:bg-edge-cyan-hover text-aurora-base"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Load Engine
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Internet-enhanced capability enabled for deep retrieval and online tools
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col bg-aurora-base overflow-hidden h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-aurora-border/30 bg-aurora-base/80 backdrop-blur-glass">
              <div className="max-w-full mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-edge-cyan/10">
                      <MessageSquareIcon className="w-5 h-5 text-edge-cyan" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-text-primary">Personal Assistant</h1>
                      <p className="text-xs text-text-secondary">Running on Qwen2.5-Omni-3B</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedModel && (
                      <span className="hidden sm:inline-flex text-xs font-semibold text-edge-cyan bg-edge-cyan/10 border border-edge-cyan/30 px-3 py-1.5 rounded-lg">
                        Qwen2.5-Omni-3B ({activeDevice})
                      </span>
                    )}

                    {selectedModel && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleUnloadModel}
                        className="bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/30 text-xs font-semibold py-1.5 px-3"
                      >
                        Unload Model
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      disabled={selectedModel !== null}
                      className="text-xs font-semibold py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex overflow-hidden h-full">
              {/* Left Sidebar - Sessions */}
              <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-aurora-border/30 bg-aurora-surface/30 h-full overflow-hidden">
                {/* Projects Workspace */}
                <div className="p-3 border-b border-aurora-border/30 relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Project Workspace</div>
                    <button 
                      onClick={handleCreateProject}
                      className="p-1 text-text-muted hover:text-edge-cyan rounded hover:bg-edge-cyan/15 transition-all"
                      title="Create New Project"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-aurora-surface border border-aurora-border/50 hover:bg-aurora-surface-hover text-sm text-text-primary transition-all font-medium"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FolderClosed className="w-4 h-4 text-edge-cyan" />
                      {selectedProject}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {projectDropdownOpen && (
                    <div className="absolute left-3 right-3 mt-1.5 bg-aurora-surface border border-aurora-border/60 shadow-2xl rounded-xl z-20 overflow-hidden">
                      {projectsList.map(proj => (
                        <div
                          key={proj}
                          className="group flex items-center hover:bg-aurora-surface-hover border-b border-aurora-border/35 last:border-0 transition-all"
                        >
                          <button
                            onClick={() => {
                              setSelectedProject(proj)
                              setProjectDropdownOpen(false)
                            }}
                            className="flex-1 text-left px-3 py-2.5 text-xs text-text-primary font-medium truncate"
                          >
                            {proj}
                          </button>
                          {projectsList.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!confirm(`Delete project "${proj}"? Its chats will move to the first remaining project.`)) return
                                deleteProject(proj)
                                if (selectedProject === proj) {
                                  setSelectedProject(projectsList.filter(p => p !== proj)[0])
                                }
                              }}
                              className="hidden group-hover:block p-1.5 mr-2 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* New Chat Button */}
                <div className="p-3 border-b border-aurora-border/30">
                  <Button variant="primary" size="sm" fullWidth onClick={handleNewChat}>
                    <Plus className="w-4 h-4 mr-1.5" /> New Chat
                  </Button>
                </div>

                {/* Search input */}
                <div className="px-3 py-2 border-b border-aurora-border/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-aurora-surface border border-aurora-border/50 rounded-lg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-edge-cyan transition-colors"
                    />
                  </div>
                </div>

                {/* Scrollable list of chat sessions */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {Object.keys(chatSessions)
                    // Stack order: newest chat on top (session ids embed their creation timestamp)
                    .sort((a, b) => (parseInt(b.replace(/\D/g, '')) || 0) - (parseInt(a.replace(/\D/g, '')) || 0))
                    .filter(sessionId => {
                      const title = (chatSessionTitles && chatSessionTitles[sessionId]) || `Chat ${formatSessionTime(sessionId)}`
                      const sessionProj = chatSessionProjects?.[sessionId] || 'My AI Project'
                      return sessionProj === selectedProject && title.toLowerCase().includes(searchQuery.toLowerCase())
                    })
                    .map((sessionId) => {
                      const isEditing = editingSessionId === sessionId
                      const title = (chatSessionTitles && chatSessionTitles[sessionId]) || `Chat ${formatSessionTime(sessionId)}`

                      if (isEditing) {
                        return (
                          <div key={sessionId} className="flex items-center gap-2 p-2 rounded-lg bg-edge-cyan/5 border border-edge-cyan/20">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-1 bg-aurora-surface border border-aurora-border px-2 py-1 rounded text-xs text-text-primary focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingTitle.trim() && updateChatSessionTitle) {
                                    updateChatSessionTitle(sessionId, editingTitle.trim())
                                  }
                                  setEditingSessionId(null)
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null)
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (editingTitle.trim() && updateChatSessionTitle) {
                                  updateChatSessionTitle(sessionId, editingTitle.trim())
                                }
                                setEditingSessionId(null)
                              }}
                              className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-status-error hover:bg-status-error/10 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={sessionId}
                          className={`group relative flex items-center justify-between w-full rounded-lg text-sm transition-all ${
                            sessionId === activeSessionId
                              ? 'bg-edge-cyan/10 text-edge-cyan border border-edge-cyan/30'
                              : 'text-text-secondary hover:bg-aurora-surface-hover'
                          }`}
                        >
                          <button
                            onClick={() => setActiveSessionId(sessionId)}
                            className="flex-1 text-left px-3 py-2.5 min-w-0"
                          >
                            <p className="truncate font-medium">{title}</p>
                          </button>
                          
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-aurora-surface/90 backdrop-blur p-1 rounded-md border border-aurora-border/40 shadow-md">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(sessionId)
                                setEditingTitle(title)
                              }}
                              className="p-1 text-text-secondary hover:text-edge-cyan hover:bg-edge-cyan/10 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (deleteChatSession) deleteChatSession(sessionId)
                              }}
                              className="p-1 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Workspace Tools Options */}
                <div className="mt-auto p-3 border-t border-aurora-border/30 bg-aurora-surface/20 space-y-1.5 flex-shrink-0">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-1">Workspace Tools</div>
                  <button
                    onClick={() => navigate('/scheduler')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-edge-cyan hover:bg-edge-cyan/10 border border-aurora-border/30 hover:border-edge-cyan/20 transition-all font-medium animate-fade-in"
                    title="Scheduler"
                  >
                    <Calendar className="w-4 h-4 shrink-0 text-edge-cyan" />
                    <span>Scheduler</span>
                  </button>
                  <button 
                    onClick={() => navigate('/agent-manager')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-edge-cyan hover:bg-edge-cyan/10 border border-aurora-border/30 hover:border-edge-cyan/20 transition-all font-medium animate-fade-in"
                    title="Agent Manager"
                  >
                    <Bot className="w-4 h-4 shrink-0 text-edge-cyan" />
                    <span>Agent Manager</span>
                  </button>
                  <button 
                    onClick={() => navigate('/mcp-server')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-edge-cyan hover:bg-edge-cyan/10 border border-aurora-border/30 hover:border-edge-cyan/20 transition-all font-medium animate-fade-in"
                    title="MCP Server"
                  >
                    <Server className="w-4 h-4 shrink-0 text-edge-cyan" />
                    <span>MCP Server</span>
                  </button>
                  <button 
                    onClick={() => navigate('/hooks')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-edge-cyan hover:bg-edge-cyan/10 border border-aurora-border/30 hover:border-edge-cyan/20 transition-all font-medium animate-fade-in"
                    title="Hooks Manager"
                  >
                    <Link className="w-4 h-4 shrink-0 text-edge-cyan" />
                    <span>Hooks</span>
                  </button>
                </div>
              </div>

              {/* Center - Messages */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {!selectedModel ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-2xl bg-status-error/10 flex items-center justify-center mb-4">
                        <WifiOff className="w-8 h-8 text-status-error" />
                      </div>
                      <h2 className="text-xl font-bold text-text-primary mb-2">Model Unloaded</h2>
                      <p className="text-text-secondary max-w-md mb-6">
                        The active intelligence engine has been unloaded from your system memory.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/dashboard')}
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-edge-cyan/10 flex items-center justify-center mb-4">
                          <MessageSquareIcon className="w-8 h-8 text-edge-cyan" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Start a Conversation</h2>
                        <p className="text-text-secondary max-w-md">
                          Ask me anything! I'm running locally on your device using {selectedModel?.name || TARGET_MODEL_NAME}
                          for complete privacy and offline capability.
                        </p>
                      </div>
                  ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {messages.map((msg) => msg.role === 'system' ? (
                        <div key={msg.id} className="flex items-center gap-3 my-3 select-none">
                          <div className="flex-1 h-px bg-aurora-border/50" />
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{msg.content}</span>
                          <div className="flex-1 h-px bg-aurora-border/50" />
                        </div>
                      ) : (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                            <div className={`p-4 rounded-2xl ${
                              msg.role === 'user'
                                ? 'bg-edge-blue text-white rounded-br-md'
                                : 'bg-aurora-surface border border-aurora-border/50 text-text-primary rounded-bl-md'
                            }`}>
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mb-2.5 space-y-2">
                                  {msg.attachments.map(att => (
                                    <div key={att.id} className="rounded-lg overflow-hidden border border-aurora-border/30 bg-aurora-surface p-1 max-w-full">
                                      {att.type === 'image' && att.url ? (
                                        <div className="flex flex-col gap-1">
                                          <img
                                            src={att.url}
                                            alt={att.name}
                                            className="max-h-60 rounded object-contain max-w-full"
                                          />
                                          <span className="text-[10px] text-text-secondary px-1 font-mono">{att.name} ({att.size})</span>
                                        </div>
                                      ) : att.type === 'video' && att.url ? (
                                        <div className="flex flex-col gap-1">
                                          <video
                                            src={att.url}
                                            controls
                                            className="max-h-60 rounded max-w-full"
                                          />
                                          <span className="text-[10px] text-text-secondary px-1 font-mono">{att.name} ({att.size})</span>
                                        </div>
                                      ) : att.type === 'audio' && att.url ? (
                                        <div className="flex flex-col gap-1 p-1">
                                          <audio src={att.url} controls className="w-full h-10" />
                                          <span className="text-[10px] text-text-secondary px-1 font-mono">{att.name} ({att.size})</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 text-xs">
                                          <FileText className="w-4 h-4 text-edge-cyan" />
                                          <div className="min-w-0">
                                            <p className="font-semibold text-text-primary truncate">{att.name}</p>
                                            <p className="text-[9px] text-text-muted">{att.size}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(() => {
                                const parsed = parseMessageContent(msg.content);
                                return (
                                  <>
                                    <div className="text-sm leading-relaxed whitespace-normal markdown-body">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2.5 space-y-1" {...props} />,
                                          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...props} />,
                                          li: ({ node, ...props }) => <li className="text-sm text-text-primary" {...props} />,
                                          h3: ({ node, ...props }) => <h3 className="text-base font-bold text-text-primary mt-3 mb-1.5" {...props} />,
                                          h4: ({ node, ...props }) => <h4 className="text-sm font-bold text-text-primary mt-2 mb-1" {...props} />,
                                          table: ({ node, ...props }) => <table className="min-w-full border-collapse border border-aurora-border/30 my-3 rounded-lg overflow-hidden text-xs" {...props} />,
                                          thead: ({ node, ...props }) => <thead className="bg-aurora-surface-hover/30 text-left font-bold" {...props} />,
                                          th: ({ node, ...props }) => <th className="border border-aurora-border/30 px-3 py-1.5 text-text-secondary uppercase tracking-wider font-semibold text-[10px]" {...props} />,
                                          td: ({ node, ...props }) => <td className="border border-aurora-border/30 px-3 py-1.5 text-text-primary font-medium" {...props} />,
                                          pre: ({ node, ...props }) => <pre className="bg-aurora-base/60 border border-aurora-border/30 rounded-lg p-3 my-2 overflow-x-auto text-xs" {...props} />,
                                          code: ({ node, ...props }) => <code className="bg-aurora-surface-hover px-1.5 py-0.5 rounded font-mono text-xs border border-aurora-border/20 text-edge-cyan" {...props} />
                                        }}
                                      >
                                        {parsed.content}
                                      </ReactMarkdown>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            {msg.role === 'user' ? (
                              <div className="flex items-center justify-end mt-1 text-xs text-text-muted">
                                <span>{formatMessageTime(msg.timestamp)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                {msg.tokensPerSecond && (
                                  <span className="flex items-center gap-1 font-medium bg-edge-cyan/5 px-2 py-0.5 rounded border border-edge-cyan/15">
                                    <Zap className="w-3 h-3 text-edge-cyan" /> {msg.tokensPerSecond} tok/s
                                  </span>
                                )}
                                {msg.device && (
                                  <span className="flex items-center gap-1 font-medium bg-aurora-surface-hover px-2 py-0.5 rounded border border-aurora-border/40">
                                    <Cpu className="w-3 h-3" /> {msg.device}
                                  </span>
                                )}
                                
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button
                                    onClick={() => handleCopy(msg.id, msg.content)}
                                    className="p-1 hover:bg-aurora-surface-hover hover:text-edge-cyan rounded transition-colors"
                                    title="Copy response"
                                  >
                                    {copiedMessageId === msg.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleReadAloud(msg.id, msg.content)}
                                    className={`p-1 hover:bg-aurora-surface-hover rounded transition-colors ${
                                      speakingMessageId === msg.id ? 'text-edge-cyan animate-pulse'
                                      : ttsProcessingId === msg.id ? 'text-amber-400 animate-spin'
                                      : 'hover:text-edge-cyan'
                                    }`}
                                    title={ttsProcessingId === msg.id ? 'Synthesising speech…' : speakingMessageId === msg.id ? 'Stop' : 'Read aloud'}
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleRegenerate(msg.id)}
                                    className="p-1 hover:bg-aurora-surface-hover hover:text-edge-cyan rounded transition-colors"
                                    title="Regenerate response"
                                  >
                                    <RotateCw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {/* TTS processing toast */}
                      {ttsProcessingId && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-2 text-xs text-amber-300">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                            </div>
                            <span className="font-medium">Synthesising speech on GPU · token2wav running…</span>
                          </div>
                        </motion.div>
                      )}
                      {/* Show only while waiting for the first token — once the answer streams above, hide it */}
                      {isGenerating && !(messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-transparent border-none rounded-2xl rounded-bl-md p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-edge-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-edge-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-edge-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-xs text-edge-cyan/80 italic animate-pulse">{GEN_PHRASES[genPhraseIdx % GEN_PHRASES.length]}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                 {/* Input Area */}
                 <div className="flex-shrink-0 border-t border-aurora-border/30 bg-aurora-base/80 backdrop-blur-glass p-4">
                   <div className="max-w-3xl mx-auto">
                     {/* Chat Mode & Reasoning Effort Controls */}
                     <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-aurora-border/20">
                       {/* Chat Mode selection (Qwen style) */}
                       <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aurora-surface-hover/30 border border-aurora-border/20">
                         <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Mode:</span>
                         <select
                           value={chatMode}
                           onChange={(e) => setChatMode(e.target.value as any)}
                           className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
                         >
                           <option value="auto" className="bg-aurora-surface text-text-primary">Auto</option>
                           <option value="thinking" className="bg-aurora-surface text-text-primary">Thinking</option>
                           <option value="fast" className="bg-aurora-surface text-text-primary">Fast</option>
                         </select>
                       </div>

                       {/* Web search is always on (free DuckDuckGo engine) */}
                       <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-aurora-surface-hover/30 border border-aurora-border/20 text-xs">
                         <Globe className="w-3.5 h-3.5 text-edge-cyan" />
                         <span className="font-semibold text-text-secondary text-[10px] uppercase tracking-wider">Web Search On</span>
                       </div>
                     </div>

                     {isMicActive && (
                       <div className="flex items-center gap-4 p-3.5 mb-3 bg-edge-cyan/15 border border-edge-cyan/30 rounded-2xl shadow-lg animate-fade-in">
                         {/* Animated Voice Agent Model Sphere */}
                         <div className="relative flex items-center justify-center shrink-0">
                           <div className="absolute w-8 h-8 rounded-full bg-edge-cyan/45 animate-ping" />
                           <div className="absolute w-6 h-6 rounded-full bg-edge-cyan/65 animate-pulse" />
                           <div className="relative w-4 h-4 rounded-full bg-edge-cyan shadow-md shadow-edge-cyan/50" />
                         </div>
                         
                         {/* Speech Waveform dictation animation */}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1.5 h-6">
                             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(bar => {
                               const delay = bar * 0.05
                               const dur = 0.5 + Math.random() * 0.4
                               return (
                                 <div
                                   key={bar}
                                   className="w-1 bg-edge-cyan rounded-full animate-bounce"
                                   style={{
                                     height: `${Math.floor(Math.random() * 16) + 4}px`,
                                     animationDelay: `${delay}s`,
                                     animationDuration: `${dur}s`
                                   }}
                                 />
                               )
                             })}
                           </div>
                           <p className="text-[10px] font-bold text-edge-cyan uppercase tracking-wider mt-1 select-none">Dictating • Qwen Speech ASR Active</p>
                         </div>
                       </div>
                     )}
                     {/* Composited Attached Files Preview */}
                     {attachedFiles.length > 0 && (
                       <div className="flex items-center gap-2 mb-2.5 p-2 bg-aurora-surface/40 border border-aurora-border/30 rounded-xl overflow-x-auto no-scrollbar">
                         {attachedFiles.map(file => (
                           <div key={file.id} className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-aurora-surface border border-aurora-border/50 text-xs shrink-0 group">
                             {file.type === 'image' ? (
                               <Image className="w-3.5 h-3.5 text-qwen-violet" />
                             ) : file.type === 'video' ? (
                               <Video className="w-3.5 h-3.5 text-status-warning" />
                             ) : file.type === 'audio' ? (
                               <Music className="w-3.5 h-3.5 text-emerald-400" />
                             ) : (
                               <FileText className="w-3.5 h-3.5 text-edge-cyan" />
                             )}
                             <div className="min-w-0 max-w-[120px]">
                               <p className="font-bold text-[10px] text-text-primary truncate">{file.name}</p>
                               <p className="text-[8px] text-text-muted">{file.size}</p>
                             </div>
                             <button 
                               onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))}
                               className="p-0.5 rounded-full bg-status-error/10 hover:bg-status-error/20 text-status-error ml-1 transition-all"
                               title="Remove attachment"
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}

                     <div className="flex items-end gap-3">
                       {/* Single file selector: images, videos, audio and documents */}
                       <input
                         type="file"
                         accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx"
                         ref={fileInputRef}
                         className="hidden"
                         onChange={handleAttachFile}
                         multiple
                       />

                       <Button
                         variant="ghost"
                         size="sm"
                         className="mb-1 text-text-secondary hover:text-edge-cyan"
                         disabled={!selectedModel}
                         onClick={() => fileInputRef.current?.click()}
                         title="Attach files (Image, Video, Audio, Doc)"
                       >
                         <Paperclip className="w-5 h-5" />
                       </Button>

                       <div className="flex-1 relative">
                         <Textarea
                           ref={textareaRef}
                           value={input}
                           onChange={(e) => setInput(e.target.value)}
                           onKeyDown={handleKeyDown}
                           placeholder={selectedModel ? "Type your message..." : "Select or load a model to chat..."}
                           className="min-h-[48px] max-h-[120px] resize-none pr-12"
                           rows={1}
                           disabled={!selectedModel}
                         />
                       </div>

                       {/* Speech Section (Dictate + Audio Agent) */}
                       <div className="flex items-center gap-1 bg-aurora-surface-hover/30 p-1 rounded-xl border border-aurora-border/30 mb-1 select-none">
                         <Button
                           variant="ghost"
                           size="sm"
                           className={`p-1.5 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                             isMicActive ? 'bg-status-error/10 text-status-error animate-pulse' : 'text-text-secondary hover:text-edge-cyan'
                           }`}
                           onClick={toggleDictation}
                           disabled={!selectedModel}
                           title="Dictate (voice to text)"
                         >
                           {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                         </Button>

                         <div className="relative">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="p-1.5 h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-edge-cyan"
                             onClick={() => setVoiceMenuOpen(!voiceMenuOpen)}
                             disabled={!selectedModel}
                             title="Voice / Video Chat"
                           >
                             <Radio className="w-4 h-4 animate-pulse" />
                           </Button>
                           {voiceMenuOpen && (
                             <div className="absolute bottom-10 right-0 w-36 bg-aurora-surface border border-aurora-border/60 rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
                               <button
                                 onClick={() => { setAgentVideo(false); setVoiceMenuOpen(false); setIsAudioAgentOpen(true) }}
                                 className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-text-primary hover:bg-aurora-surface-hover transition-colors"
                               >
                                 <Mic className="w-3.5 h-3.5 text-edge-cyan" /> Voice Chat
                               </button>
                               <button
                                 onClick={() => { setAgentVideo(true); setVoiceMenuOpen(false); setIsAudioAgentOpen(true) }}
                                 className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-text-primary hover:bg-aurora-surface-hover transition-colors border-t border-aurora-border/30"
                               >
                                 <Video className="w-3.5 h-3.5 text-qwen-violet" /> Video Chat
                               </button>
                             </div>
                           )}
                         </div>
                       </div>

                       <Button
                         variant="primary"
                         size="sm"
                         className="mb-1"
                         onClick={() => handleSend()}
                         disabled={!selectedModel || !input.trim() || isGenerating}
                       >
                         <Send className="w-5 h-5" />
                       </Button>
                     </div>
                     <p className="text-[10px] text-text-muted mt-2 text-center">
                       Press Enter to send • Shift+Enter for new line • All data stays local
                     </p>
                   </div>
                 </div>
               </div>

      {isAudioAgentOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-agent-title"
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col items-center overflow-hidden bg-aurora-base/95 p-2 text-text-primary backdrop-blur-md sm:p-4 lg:p-6"
        >
          <div className="pointer-events-none absolute inset-0 bg-neural-grid opacity-20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(800px,100vw)] w-[min(800px,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-edge-cyan/10 blur-[140px]" />
          
          <div className="relative z-10 flex h-full min-h-0 w-full max-w-5xl animate-fade-in flex-col items-center gap-3 overflow-hidden rounded-2xl border border-aurora-border/30 bg-aurora-base/60 p-3 shadow-2xl sm:gap-4 sm:p-4">
            {/* Header */}
            <div className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between gap-2 border-b border-aurora-border/30 bg-aurora-base/90 pb-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Radio className="h-5 w-5 shrink-0 animate-pulse text-edge-cyan sm:h-6 sm:w-6" />
                <div className="min-w-0">
                  <h2 id="live-agent-title" className="truncate text-sm font-bold text-text-primary sm:text-xl">{agentVideo ? 'Video Chat' : 'Voice Chat'}</h2>
                  <p className="hidden truncate text-xs text-text-secondary sm:block">Qwen Omni Agent • Speech in, speech out</p>
                </div>
              </div>
              <span className="hidden shrink-0 rounded-lg border border-aurora-border/40 bg-aurora-surface px-3 py-1.5 font-mono text-xs text-text-secondary md:inline-flex">
                {`${Math.floor(agentElapsed / 60).toString().padStart(2, '0')}:${(agentElapsed % 60).toString().padStart(2, '0')} / 10:00`}
              </span>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopAgent}
                  disabled={agentStopped}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-status-error hover:bg-status-error/10 disabled:opacity-40 sm:px-3"
                  title="Stop the session (keeps transcript open)"
                  aria-label="Stop live session"
                >
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { stopAgent(); setIsAudioAgentOpen(false) }}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-text-secondary hover:bg-aurora-surface-hover hover:text-text-primary sm:px-3"
                  title="Close and open the conversation in chat"
                  aria-label="Close live session and return to chat"
                >
                  <X className="h-4 w-4" /> Close
                </Button>
              </div>
            </div>

            {/* Video stream (Video Chat) or glowing agent sphere (Voice Chat) */}
            <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden py-2 sm:py-3">
              {agentVideo ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="block h-full min-h-0 w-full rounded-2xl border border-aurora-border/50 bg-aurora-surface object-contain shadow-2xl"
                />
              ) : (
                <>
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-edge-cyan to-qwen-violet flex items-center justify-center shadow-[0_0_50px_rgba(0,180,216,0.3)] transition-transform duration-500 ${
                    audioAgentStatus === 'listening' ? 'scale-100 animate-pulse' :
                    audioAgentStatus === 'thinking' ? 'scale-110 animate-bounce' :
                    'scale-105 shadow-[0_0_70px_rgba(147,51,234,0.4)]'
                  }`}>
                    <div className="w-28 h-28 rounded-full bg-aurora-base flex items-center justify-center border border-edge-cyan/20">
                      <Bot className={`w-12 h-12 text-edge-cyan ${audioAgentStatus === 'speaking' ? 'animate-pulse text-qwen-violet' : ''}`} />
                    </div>
                  </div>

                  {/* Outer pulsing rings */}
                  <div className="absolute inset-0 -z-10 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full border border-edge-cyan/20 animate-ping opacity-40" />
                    <div className="w-64 h-64 rounded-full border border-qwen-violet/10 animate-ping opacity-25" />
                  </div>
                </>
              )}

              <div className="absolute left-1/2 top-4 -translate-x-1/2 text-center">
                <span aria-live="polite" className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${
                  audioAgentStatus === 'listening' ? 'bg-edge-cyan/10 border-edge-cyan/30 text-edge-cyan' :
                  audioAgentStatus === 'thinking' ? 'bg-status-warning/10 border-status-warning/30 text-status-warning' :
                  'bg-qwen-violet/10 border-qwen-violet/30 text-qwen-violet'
                }`}>
                  {agentStopped ? 'Stopped' :
                   audioAgentStatus === 'listening' ? 'Listening...' :
                   audioAgentStatus === 'thinking' ? 'Thinking...' :
                   'Speaking...'}
                </span>
              </div>
            </div>

            {/* Speech Waveform Visualizer */}
            <div className="flex h-12 w-full shrink-0 items-center justify-center gap-1 overflow-hidden px-3 sm:h-16 sm:gap-1.5 sm:px-8" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, idx) => {
                const heights = {
                  listening: [24, 48, 12, 60, 36, 72, 16, 50, 20, 80, 40, 64, 18, 55, 30, 75, 14, 42, 28, 58, 22, 46, 32, 10],
                  thinking: [4, 6, 4, 8, 4, 6, 4, 8, 4, 6, 4, 8, 4, 6, 4, 8, 4, 6, 4, 8, 4, 6, 4, 8],
                  speaking: [40, 18, 55, 30, 72, 12, 60, 24, 48, 16, 50, 20, 80, 10, 32, 46, 22, 58, 28, 42, 14, 75, 30, 55]
                }[audioAgentStatus] || [4, 4, 4, 4]
                
                return (
                  <motion.div
                    key={idx}
                    animate={{ height: heights[idx % heights.length] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 0.3 + (idx % 4) * 0.1
                    }}
                    className={`max-h-12 w-1 rounded-full sm:w-1.5 ${
                      audioAgentStatus === 'listening' ? 'bg-edge-cyan' :
                      audioAgentStatus === 'thinking' ? 'bg-status-warning' :
                      'bg-qwen-violet'
                    }`}
                  />
                )
              })}
            </div>

            {/* Conversation Log / Transcripts */}
            <div className="flex h-24 w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-aurora-border/60 bg-aurora-surface p-3 shadow-2xl sm:h-32 sm:p-4 lg:h-40">
              {audioAgentTranscript.length === 0 && (
                <p className="text-xs text-text-muted m-auto select-none">Listening... speak into your microphone to start the conversation.</p>
              )}
              {audioAgentTranscript.map((chat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[10px] font-bold text-text-muted mt-1 uppercase">User:</span>
                    <p className="text-sm text-text-primary font-medium">{chat.user}</p>
                  </div>
                  {chat.assistant && (
                    <div className="flex items-start gap-2.5 pl-4 border-l-2 border-qwen-violet/30">
                      <span className="text-[10px] font-bold text-qwen-violet mt-1 uppercase">Qwen AI:</span>
                      <p className="text-sm text-text-secondary">{chat.assistant}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer status & information */}
            <div className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-aurora-border/20 pt-2 text-[10px] text-text-muted sm:text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${agentStopped ? 'bg-text-muted' : 'bg-emerald-400'}`} />
                <span className="truncate">{agentStopped ? 'Session stopped — transcript remains available' : 'Local Intel OpenVINO GPU pipeline (FP16)'}</span>
              </div>
              <span className="shrink-0 font-mono md:hidden">{`${Math.floor(agentElapsed / 60).toString().padStart(2, '0')}:${(agentElapsed % 60).toString().padStart(2, '0')}`}</span>
              <span className="hidden shrink-0 md:inline">Press Esc to close</span>
            </div>
          </div>
        </div>
      )}

            </div>
          </div>
        )}
      </div>
  )
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
