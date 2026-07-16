import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { useAppStore } from './hooks'

// ── Lazy-loaded pages (code-split per route) ────────────────────────────────
const SplashPage = lazy(() => import('./pages/SplashPage').then(m => ({ default: m.SplashPage })))
const HardwareScanPage = lazy(() => import('./pages/HardwareScanPage').then(m => ({ default: m.HardwareScanPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ModelManagerPage = lazy(() => import('./pages/ModelManagerPage').then(m => ({ default: m.ModelManagerPage })))
const PersonalAssistantPage = lazy(() => import('./pages/PersonalAssistantPage').then(m => ({ default: m.PersonalAssistantPage })))
const CodingAgentPage = lazy(() => import('./pages/CodingAgentPage').then(m => ({ default: m.CodingAgentPage })))
const VoiceAssistantPage = lazy(() => import('./pages/VoiceAssistantPage').then(m => ({ default: m.VoiceAssistantPage })))
const SecurityPrivacyPage = lazy(() => import('./pages/SecurityPrivacyPage').then(m => ({ default: m.SecurityPrivacyPage })))
const BenchmarkStudioPage = lazy(() => import('./pages/BenchmarkStudioPage').then(m => ({ default: m.BenchmarkStudioPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ModelSelectionPage = lazy(() => import('./pages/ModelSelectionPage').then(m => ({ default: m.ModelSelectionPage })))
const InteractiveCompilePage = lazy(() => import('./pages/InteractiveCompilePage').then(m => ({ default: m.InteractiveCompilePage })))
const SchedulerPage = lazy(() => import('./pages/SchedulerPage').then(m => ({ default: m.SchedulerPage })))
const AgentManagerPage = lazy(() => import('./pages/AgentManagerPage').then(m => ({ default: m.AgentManagerPage })))
const MCPServerPage = lazy(() => import('./pages/MCPServerPage').then(m => ({ default: m.MCPServerPage })))
const HooksPage = lazy(() => import('./pages/HooksPage').then(m => ({ default: m.HooksPage })))
const ArtifactsPage = lazy(() => import('./pages/ArtifactsPage').then(m => ({ default: m.ArtifactsPage })))

// ── Loading fallback ────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-aurora-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-edge-cyan/30 border-t-edge-cyan rounded-full animate-spin" />
        <span className="text-xs text-text-muted">Loading...</span>
      </div>
    </div>
  )
}

// ── App layout ──────────────────────────────────────────────────────────────
function AppLayout() {
  const { theme } = useAppStore()
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const hideTopBar = pathname === '/' || pathname === '/hardware-scan' || pathname === '/compile-load'

  return (
    <div className="min-h-screen bg-aurora-bg">
      {!hideTopBar && <TopBar />}
      <main className={!hideTopBar ? 'pt-16' : ''}>
        <div key={pathname} className="animate-page-enter">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<SplashPage />} />
              <Route path="/hardware-scan" element={<HardwareScanPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/model-manager" element={<ModelManagerPage />} />
              <Route path="/model-select" element={<ModelSelectionPage />} />
              <Route path="/compile-load" element={<InteractiveCompilePage />} />
              <Route path="/personal-assistant" element={<PersonalAssistantPage />} />
              <Route path="/coding-agent" element={<CodingAgentPage />} />
              <Route path="/voice-assistant" element={<VoiceAssistantPage />} />
              <Route path="/security-privacy" element={<SecurityPrivacyPage />} />
              <Route path="/benchmark-studio" element={<BenchmarkStudioPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scheduler" element={<SchedulerPage />} />
              <Route path="/agent-manager" element={<AgentManagerPage />} />
              <Route path="/mcp-server" element={<MCPServerPage />} />
              <Route path="/hooks" element={<HooksPage />} />
              <Route path="/artifacts" element={<ArtifactsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return <AppLayout />
}
