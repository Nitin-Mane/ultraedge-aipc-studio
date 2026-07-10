import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Sparkles, Terminal, ArrowRight } from 'lucide-react'

interface ProfileRegistrationProps {
  onComplete: () => void
}

export function ProfileRegistration({ onComplete }: ProfileRegistrationProps) {
  const { updateSettings } = useAppStore()
  
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim() || loading) return
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: name,
          user_role: role
        })
      })
      if (res.ok) {
        updateSettings({
          userName: name,
          userRole: role
        })
        onComplete()
      }
    } catch (err) {
      console.error("Failed to save profile settings", err)
      // Fallback local save in case server isn't running yet
      updateSettings({
        userName: name,
        userRole: role
      })
      onComplete()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-aurora-base/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-edge-cyan/15 rounded-full blur-[80px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-qwen-purple/15 rounded-full blur-[80px] animate-pulse-glow" />

      <form 
        onSubmit={handleSubmit}
        className="glass-panel max-w-md w-full p-8 flex flex-col gap-6 relative z-10 border-edge-cyan/30 bg-aurora-surface-hover/80 text-center"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-edge-blue/20 border border-edge-cyan/30 rounded-full text-edge-cyan">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Configure Developer Workspace</h2>
          <p className="text-xs text-text-secondary">Enter details to authorize local session audit memory</p>
        </div>

        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Developer Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Developer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-sm bg-aurora-base border-aurora-border/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Developer Role / Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Intel Software Innovator"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field text-sm bg-aurora-base border-aurora-border/60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !role.trim()}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 font-bold text-sm shadow-glow-cyan mt-2 disabled:opacity-40"
        >
          {loading ? 'Authorizing Profile...' : 'Save & Continue'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
