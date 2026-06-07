import React, { useState, useCallback } from "react"
import Background from "./components/Background"
import Navbar from "./components/Navbar"
import HUDDashboard from "./pages/HUDDashboard"
import ChatDashboard from "./pages/ChatDashboard"
import SystemDashboard from "./pages/SystemDashboard"
import ControlDashboard from "./pages/ControlDashboard"
import AnalyticsDashboard from "./pages/AnalyticsDashboard"
import ProfileDashboard from "./pages/ProfileDashboard"
import DocumentsDashboard from "./pages/DocumentsDashboard"
import { ThemeProvider } from "./context/ThemeContext"
import { useSystemStats } from "./hooks/useSystemStats"
import { useOllamaStatus } from "./hooks/useOllamaStatus"
import { useTTS } from "./hooks/useTTS"

function AppContent() {
  const [active,         setActive]         = useState("hud")
  const [resumedSession, setResumedSession] = useState(null)
  const [chatKey,        setChatKey]        = useState(0)
  const [chatDocFile,    setChatDocFile]    = useState(null)

  const stats        = useSystemStats()
  const ollamaStatus = useOllamaStatus()
  const tts          = useTTS()

  const handleResume = useCallback((sessionId, messages) => {
    setResumedSession({ sessionId, messages })
    setChatDocFile(null)
    setChatKey(k => k + 1)
    setActive("chat")
  }, [])

  const handleChatWithDoc = useCallback((file) => {
    setChatDocFile(file)
    setResumedSession(null)
    setChatKey(k => k + 1)
    setActive("chat")
  }, [])

  const handleNavChange = useCallback((page) => {
    if (page !== "chat") setResumedSession(null)
    setActive(page)
  }, [])

  const renderPage = () => {
    switch (active) {
      case "hud":
        return <HUDDashboard stats={stats} ollamaStatus={ollamaStatus} tts={tts} />
      case "chat":
        return (
          <ChatDashboard
            key={chatKey}
            ollamaStatus={ollamaStatus}
            tts={tts}
            resumedSession={resumedSession}
            initialDocFile={chatDocFile}
          />
        )
      case "docs":
        return <DocumentsDashboard onChatWithDoc={handleChatWithDoc} />
      case "system":
        return <SystemDashboard stats={stats} />
      case "control":
        return <ControlDashboard />
      case "analytics":
        return <AnalyticsDashboard stats={stats} />
      case "profile":
        return (
          <ProfileDashboard
            stats={stats}
            ollamaStatus={ollamaStatus}
            onResume={handleResume}
          />
        )
      default:
        return <HUDDashboard stats={stats} ollamaStatus={ollamaStatus} tts={tts} />
    }
  }

  return (
    <>
      <Background />
      <Navbar active={active} onChange={handleNavChange} ollamaOnline={ollamaStatus?.online} />
      <div style={{ marginLeft:"var(--nav-w)", height:"100vh", position:"relative", zIndex:1, overflow:"hidden" }}>
        {renderPage()}
      </div>
    </>
  )
}

export default function App() {
  const initTheme = localStorage.getItem("tony_theme") || "dark"
  return (
    <ThemeProvider initTheme={initTheme}>
      <AppContent />
    </ThemeProvider>
  )
}
