import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../store/useAppStore'

beforeEach(() => {
  useAppStore.setState({
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
  })
})

const mockModel = {
  id: 'test-model',
  name: 'Test Model',
  family: 'test',
  featureType: 'personal_assistant',
  parameterSize: '3B',
  recommendedDevice: 'GPU',
  recommendedRamGb: 16,
  status: 'ready' as const,
  state: 'ready' as const,
  license: 'Apache-2.0',
  sourceUrl: '',
  precisionOptions: ['INT4'],
  openvinoStatus: 'ready',
  benchmarkStatus: 'not_run' as const,
  npuStatus: 'not_supported',
  localOpenVinoPath: '',
  packageType: 'local' as const,
}

describe('useAppStore', () => {
  it('has correct initial state', () => {
    const state = useAppStore.getState()
    expect(state.currentPage).toBe('splash')
    expect(state.theme).toBe('dark')
    expect(state.selectedModel).toBeNull()
    expect(state.chatSessions).toEqual({})
    expect(state.benchmarkResults).toEqual([])
  })

  it('setSelectedModel sets the model', () => {
    useAppStore.getState().setSelectedModel(mockModel)
    expect(useAppStore.getState().selectedModel?.id).toBe('test-model')
  })

  it('setSelectedModel clears model when null', () => {
    useAppStore.getState().setSelectedModel(mockModel)
    useAppStore.getState().setSelectedModel(null)
    expect(useAppStore.getState().selectedModel).toBeNull()
  })

  it('addChatMessage adds to a session', () => {
    const msg = { id: 'm1', role: 'user' as const, content: 'hi', timestamp: new Date() }
    useAppStore.getState().addChatMessage('s1', msg)
    expect(useAppStore.getState().chatSessions['s1']).toHaveLength(1)
    expect(useAppStore.getState().chatSessions['s1'][0].content).toBe('hi')
  })

  it('addChatMessage appends multiple messages', () => {
    useAppStore.getState().addChatMessage('s1', { id: 'm1', role: 'user', content: 'a', timestamp: new Date() })
    useAppStore.getState().addChatMessage('s1', { id: 'm2', role: 'assistant', content: 'b', timestamp: new Date() })
    expect(useAppStore.getState().chatSessions['s1']).toHaveLength(2)
  })

  it('updateChatMessage updates content', () => {
    useAppStore.getState().addChatMessage('s1', { id: 'm1', role: 'assistant', content: 'old', timestamp: new Date() })
    useAppStore.getState().updateChatMessage('s1', 'm1', 'new')
    expect(useAppStore.getState().chatSessions['s1'][0].content).toBe('new')
  })

  it('deleteChatSession removes session and title', () => {
    useAppStore.getState().addChatMessage('s1', { id: 'm1', role: 'user', content: 'x', timestamp: new Date() })
    useAppStore.getState().updateChatSessionTitle?.('s1', 'My Chat')
    useAppStore.getState().deleteChatSession?.('s1')
    expect(useAppStore.getState().chatSessions['s1']).toBeUndefined()
    expect(useAppStore.getState().chatSessionTitles?.['s1']).toBeUndefined()
  })

  it('addBenchmarkResult appends result', () => {
    const result = {
      modelId: 'm1',
      device: 'GPU',
      precision: 'INT4',
      firstTokenLatency: 50,
      tokensPerSecond: 100,
      modelLoadTime: 2,
      ramUsage: 4,
      timestamp: new Date(),
    }
    useAppStore.getState().addBenchmarkResult(result)
    expect(useAppStore.getState().benchmarkResults).toHaveLength(1)
  })

  it('updateSettings merges settings', () => {
    useAppStore.getState().updateSettings({ userName: 'Alice', developerMode: true })
    expect(useAppStore.getState().settings.userName).toBe('Alice')
    expect(useAppStore.getState().settings.developerMode).toBe(true)
    expect(useAppStore.getState().settings.privacyMode).toBe(true)
  })

  it('addProject and deleteProject', () => {
    useAppStore.getState().addProject('New Project')
    expect(useAppStore.getState().projectsList).toContain('New Project')
    useAppStore.getState().deleteProject('New Project')
    expect(useAppStore.getState().projectsList).not.toContain('New Project')
  })

  it('setTheme toggles theme', () => {
    useAppStore.getState().setTheme('light')
    expect(useAppStore.getState().theme).toBe('light')
    useAppStore.getState().setTheme('dark')
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('setCurrentPage updates page', () => {
    useAppStore.getState().setCurrentPage('dashboard')
    expect(useAppStore.getState().currentPage).toBe('dashboard')
  })
})
