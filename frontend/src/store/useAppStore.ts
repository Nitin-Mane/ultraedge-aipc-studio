import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PageName = 
  | 'splash' 
  | 'hardware-scan' 
  | 'dashboard' 
  | 'model-manager' 
  | 'model-select'
  | 'compile-load'
  | 'personal-assistant' 
  | 'coding-agent'
  | 'voice-assistant' 
  | 'security-privacy' 
  | 'benchmark-studio' 
  | 'settings'

export interface HardwareInfo {
  cpu: string
  gpu: string
  npu: string | null
  ramTotal: number
  ramAvailable: number
  storage: string
  os: string
  openvinoStatus: 'installed' | 'not-installed' | 'unknown'
  driverReadiness: 'ready' | 'partial' | 'not-ready' | 'unknown'
}

export interface ModelInfo {
  id: string
  name: string
  family: string
  
  // Legacy camelCase properties (Required to satisfy static modelCatalog.ts and page scripts)
  featureType: string
  parameterSize: string
  license: string
  sourceUrl: string
  precisionOptions: string[]
  state: string
  openvinoStatus: string
  recommendedDevice: string
  recommendedRamGb: number
  benchmarkStatus: string
  npuStatus: string
  localOpenVinoPath: string
  packageType: string
  progress?: number
  jobMessage?: string
  jobStatus?: string
  diskSizeGb?: number
  benchmark?: {
    device: string
    precision: string
    firstTokenLatency: number
    tokensPerSecond: number
    loadTimeMs: number
    ramUsedMb: number
    gpuUsedMb: number
    npuStatus: string
  } | null

  // New database-aligned snake_case properties (Optional to satisfy static modelCatalog.ts compiles)
  feature_type?: string
  parameter_size?: string
  source_url?: string
  recommended_device?: string
  ram_required_gb?: number
  status?: string
  original_path?: string
  openvino_path?: string
  checksum?: string
  created_at?: string
  updated_at?: string
  lastUpdated?: string
  precision?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  modelId?: string
  device?: string
  tokensPerSecond?: number
  attachments?: { id: string; name: string; type: 'image' | 'video' | 'audio' | 'doc'; size: string; url?: string; base64?: string }[]
}

export interface McpTool {
  id: string
  name: string
  desc: string
  active: boolean
}

// The same Registered MCP Tools that already existed on the MCP Server page,
// lifted into the shared store so the Personal Assistant integrates with them.
export const DEFAULT_MCP_TOOLS: McpTool[] = [
  { id: 'calculator', name: 'Calculator Tool', desc: 'Performs scientific calculation operations.', active: true },
  { id: 'fetch', name: 'Web Search API Gateway', desc: 'Fetches real-time web contexts via Scarf APIs.', active: true },
  { id: 'code_interpreter', name: 'Python Sandbox Interpreter', desc: 'Compiles and executes arbitrary code cells offline.', active: false },
  { id: 'filesystem', name: 'Local File System Sync', desc: 'Indexes documents from local directory structures.', active: false },
]

export interface BenchmarkResult {
  modelId: string
  device: string
  precision: string
  firstTokenLatency: number
  tokensPerSecond: number
  modelLoadTime: number
  ramUsage: number
  gpuUsage?: number
  npuUsage?: number
  timestamp: Date
}

export interface AppState {
  currentPage: PageName
  hardwareScanned: boolean
  hardwareInfo: HardwareInfo | null
  models: ModelInfo[]
  selectedModel: ModelInfo | null
  chatSessions: Record<string, ChatMessage[]>
  activeSessionId: string
  benchmarkResults: BenchmarkResult[]
  theme: 'dark' | 'light'
  activeFeatureModel: ModelInfo | null
  settings: {
    userName: string
    userRole: string
    modelDirectory: string
    dataDirectory: string
    defaultHardwareMode: 'auto' | 'cpu' | 'gpu' | 'npu'
    enterpriseMode: boolean
    privacyMode: boolean
    loggingLevel: 'debug' | 'info' | 'warn' | 'error'
    developerMode: boolean
  }
  projectsList: string[]
  chatSessionProjects: Record<string, string>
  mcpTools: McpTool[]
  toggleMcpTool: (id: string) => void

  // Actions
  setCurrentPage: (page: PageName) => void
  setHardwareScanned: (scanned: boolean) => void
  setHardwareInfo: (info: HardwareInfo) => void
  setModels: (models: ModelInfo[]) => void
  addModel: (model: ModelInfo) => void
  setActiveFeatureModel: (model: ModelInfo | null) => void
  updateModel: (id: string, updates: Partial<ModelInfo>) => void
  setSelectedModel: (model: ModelInfo | null) => void
  addChatMessage: (sessionId: string, message: ChatMessage) => void
  updateChatMessage: (sessionId: string, messageId: string, content: string, updates?: Partial<Omit<ChatMessage, 'id' | 'role'>>) => void
  setChatSessions: (sessions: Record<string, ChatMessage[]>) => void
  setActiveSessionId: (id: string) => void
  addBenchmarkResult: (result: BenchmarkResult) => void
  setTheme: (theme: 'dark' | 'light') => void
  chatSessionTitles?: Record<string, string>
  deleteChatSession?: (sessionId: string) => void
  updateChatSessionTitle?: (sessionId: string, title: string) => void
  updateSettings: (settings: Partial<AppState['settings']>) => void
  addProject: (projectName: string) => void
  deleteProject: (projectName: string) => void
  setSessionProject: (sessionId: string, projectName: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: 'splash',
      hardwareScanned: false,
      hardwareInfo: null,
      models: [],
      selectedModel: null,
      activeFeatureModel: null,
      chatSessions: {},
      activeSessionId: '',
      benchmarkResults: [],
      theme: 'dark',
      chatSessionTitles: {},
      projectsList: ['My AI Project', 'Default Project'],
      chatSessionProjects: {},
      mcpTools: DEFAULT_MCP_TOOLS,
      toggleMcpTool: (id) => set((state) => ({
        mcpTools: state.mcpTools.map(t => t.id === id ? { ...t, active: !t.active } : t)
      })),
      settings: {
        userName: '',
        userRole: '',
        modelDirectory: '',
        dataDirectory: '',
        defaultHardwareMode: 'auto',
        enterpriseMode: false,
        privacyMode: true,
        loggingLevel: 'info',
        developerMode: false,
      },

      setCurrentPage: (page) => set({ currentPage: page }),
      setHardwareScanned: (scanned) => set({ hardwareScanned: scanned }),
      setHardwareInfo: (info) => set({ hardwareInfo: info }),
      setModels: (models) => set({ models }),
      addModel: (model) => set((state) => ({ models: [...state.models, model] })),
      setActiveFeatureModel: (activeFeatureModel) => set({ activeFeatureModel }),
      updateModel: (id, updates) => set((state) => ({
        models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m))
      })),
      setSelectedModel: (model) => set({ selectedModel: model }),
      addChatMessage: (sessionId, message) => set((state) => ({
        chatSessions: {
          ...state.chatSessions,
          [sessionId]: [...(state.chatSessions[sessionId] || []), message]
        }
      })),
      updateChatMessage: (sessionId, messageId, content, updates) => set((state) => ({
        chatSessions: {
          ...state.chatSessions,
          [sessionId]: (state.chatSessions[sessionId] || []).map(msg =>
            msg.id === messageId ? { ...msg, content, ...updates } : msg
          )
        }
      })),
      setChatSessions: (sessions) => set({ chatSessions: sessions }),
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      addBenchmarkResult: (result) => set((state) => ({
        benchmarkResults: [...state.benchmarkResults, result]
      })),
      setTheme: (theme) => set({ theme }),
      deleteChatSession: (sessionId) => set((state) => {
        const newSessions = { ...state.chatSessions }
        delete newSessions[sessionId]
        const newTitles = { ...(state.chatSessionTitles || {}) }
        delete newTitles[sessionId]
        return { 
          chatSessions: newSessions,
          chatSessionTitles: newTitles,
          activeSessionId: state.activeSessionId === sessionId ? '' : state.activeSessionId
        }
      }),
      updateChatSessionTitle: (sessionId, title) => set((state) => ({
        chatSessionTitles: {
          ...(state.chatSessionTitles || {}),
          [sessionId]: title
        }
      })),
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
      addProject: (projectName) => set((state) => ({
        projectsList: [...state.projectsList, projectName]
      })),
      deleteProject: (projectName) => set((state) => {
        const projectsList = state.projectsList.filter(p => p !== projectName)
        const fallback = projectsList[0] || 'My AI Project'
        // Chats from the deleted project move to the first remaining project
        const chatSessionProjects = Object.fromEntries(
          Object.entries(state.chatSessionProjects).map(([id, p]) => [id, p === projectName ? fallback : p])
        )
        return { projectsList: projectsList.length ? projectsList : [fallback], chatSessionProjects }
      }),
      setSessionProject: (sessionId, projectName) => set((state) => ({
        chatSessionProjects: {
          ...state.chatSessionProjects,
          [sessionId]: projectName
        }
      })),
    }),
    {
      name: 'ultraedge-aipc-studio-store',
      partialize: (state) => ({
        theme: state.theme,
        settings: state.settings,
        models: state.models,
        hardwareInfo: state.hardwareInfo,
        hardwareScanned: state.hardwareScanned,
        // Strip heavy inline data (base64 payloads) before persisting so the
        // localStorage quota is never exceeded; also cleans up older sessions.
        chatSessions: Object.fromEntries(
          Object.entries(state.chatSessions).map(([id, msgs]) => [
            id,
            msgs.map(m => m.attachments
              ? { ...m, attachments: m.attachments.map(({ base64, ...rest }) => rest) }
              : m),
          ])
        ),
        chatSessionTitles: state.chatSessionTitles,
        activeSessionId: state.activeSessionId,
        benchmarkResults: state.benchmarkResults,
        projectsList: state.projectsList,
        chatSessionProjects: state.chatSessionProjects,
        mcpTools: state.mcpTools,
      }),
    }
  )
)