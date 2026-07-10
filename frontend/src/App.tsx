import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SplashPage } from './pages/SplashPage'
import { HardwareScanPage } from './pages/HardwareScanPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModelManagerPage } from './pages/ModelManagerPage'
import { PersonalAssistantPage } from './pages/PersonalAssistantPage'
import { CodingAgentPage } from './pages/CodingAgentPage'
import { VoiceAssistantPage } from './pages/VoiceAssistantPage'
import { SecurityPrivacyPage } from './pages/SecurityPrivacyPage'
import { BenchmarkStudioPage } from './pages/BenchmarkStudioPage'
import { SettingsPage } from './pages/SettingsPage'
import { ModelSelectionPage } from './pages/ModelSelectionPage'
import { InteractiveCompilePage } from './pages/InteractiveCompilePage'
import { SchedulerPage } from './pages/SchedulerPage'
import { AgentManagerPage } from './pages/AgentManagerPage'
import { MCPServerPage } from './pages/MCPServerPage'
import { HooksPage } from './pages/HooksPage'
import { ArtifactsPage } from './pages/ArtifactsPage'
import { TopBar } from './components/TopBar'
import { useAppStore } from './hooks'

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
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return <AppLayout />
}