import { useState, useEffect } from 'react'
import { Loader2, MessageSquare, X, CheckCircle2, Edit3, Trash2, Plus, AlertCircle } from 'lucide-react'

interface ChatHistoryPanelProps {
  backendUrl: string
  onLoadSession: (sessionId: string) => void
  onNewChat: () => void
  onClose: () => void
}

export function ChatHistoryPanel({ backendUrl, onLoadSession, onNewChat, onClose }: ChatHistoryPanelProps) {
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; feature_type: string; created_at: string; updated_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const fetchSessions = () => {
    setLoading(true)
    setError(null)
    fetch(`${backendUrl}/api/chat/sessions?feature_type=coding_agent`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data)) setSessions(data)
        else setSessions([])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to load history')
        setSessions([])
        setLoading(false)
      })
  }

  useEffect(() => { fetchSessions() }, [backendUrl])

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return
    try {
      await fetch(`${backendUrl}/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle.trim() } : s))
    } catch { /* ignore */ }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${backendUrl}/api/chat/sessions/${id}`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setSessions(prev => prev.filter(s => s.id !== id))
    setConfirmDeleteId(null)
  }

  const handleClearAll = async () => {
    try {
      await fetch(`${backendUrl}/api/chat/sessions?feature_type=coding_agent`, { method: 'DELETE' })
    } catch { /* ignore */ }
    setSessions([])
    setConfirmClearAll(false)
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHrs = Math.floor(diffMin / 60)
      if (diffHrs < 24) return `${diffHrs}h ago`
      return d.toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <div className='flex-1 min-h-0 flex flex-col overflow-hidden' style={{ background: '#0a0e17' }}>
      {/* Header */}
      <div className='flex-shrink-0 flex items-center gap-2 px-3 py-2' style={{ borderBottom: '1px solid #333' }}>
        <svg className='w-4 h-4' style={{ color: '#7c3aed' }} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <circle cx='12' cy='12' r='10' />
          <polyline points='12 6 12 12 16 14' />
        </svg>
        <span className='text-[11px] font-bold' style={{ color: '#e5e5e5' }}>Chat History</span>
        <button onClick={onClose} className='ml-auto p-1 rounded' style={{ color: '#888' }} onMouseEnter={e => (e.currentTarget.style.color = '#e5e5e5')} onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
          <X className='w-3.5 h-3.5' />
        </button>
      </div>

      {/* Session List */}
      <div className='flex-1 min-h-0 overflow-y-auto'>
        {loading ? (
          <div className='flex flex-col items-center justify-center p-8 gap-2'>
            <Loader2 className='w-5 h-5 animate-spin' style={{ color: '#7c3aed' }} />
            <span className='text-[10px]' style={{ color: '#888' }}>Loading history...</span>
          </div>
        ) : error ? (
          <div className='flex flex-col items-center justify-center p-6 gap-2 text-center'>
            <AlertCircle className='w-8 h-8' style={{ color: '#f44747' }} />
            <p className='text-[11px] font-medium' style={{ color: '#e5e5e5' }}>Failed to load history</p>
            <p className='text-[9px]' style={{ color: '#888' }}>{error}</p>
            <button onClick={fetchSessions} className='mt-2 px-3 py-1 rounded text-[10px] font-medium' style={{ background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed44' }}>
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className='flex flex-col items-center justify-center p-8 gap-2 text-center'>
            <MessageSquare className='w-10 h-10' style={{ color: '#333' }} />
            <p className='text-[11px] font-medium' style={{ color: '#e5e5e5' }}>No chat history yet</p>
            <p className='text-[9px]' style={{ color: '#666' }}>Start a conversation to see it here</p>
          </div>
        ) : (
          <div className='p-2 space-y-1'>
            {sessions.map(session => (
              <div key={session.id} className='group rounded-lg overflow-hidden' style={{ border: '1px solid #333' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c3aed55')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}>
                {editingId === session.id ? (
                  <div className='flex items-center gap-1 p-2'>
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(session.id); if (e.key === 'Escape') setEditingId(null) }}
                      className='flex-1 min-w-0 px-2 py-1 rounded text-[10px] focus:outline-none'
                      style={{ background: '#111', border: '1px solid #7c3aed66', color: '#e5e5e5' }}
                    />
                    <button onClick={() => handleRename(session.id)} className='p-1 rounded' style={{ background: '#7c3aed22', color: '#7c3aed' }}>
                      <CheckCircle2 className='w-3 h-3' />
                    </button>
                    <button onClick={() => setEditingId(null)} className='p-1 rounded' style={{ color: '#888' }}>
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ) : confirmDeleteId === session.id ? (
                  <div className='flex items-center gap-1 p-2'>
                    <span className='text-[9px] flex-1' style={{ color: '#f44747' }}>Delete this chat?</span>
                    <button onClick={() => handleDelete(session.id)} className='px-2 py-0.5 rounded text-[9px] font-bold' style={{ background: '#f4474722', color: '#f44747' }}>
                      Delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className='px-2 py-0.5 rounded text-[9px]' style={{ color: '#888' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    className='flex items-center gap-2 px-3 py-2 cursor-pointer'
                    onClick={() => onLoadSession(session.id)}
                  >
                    <MessageSquare className='w-3 h-3 shrink-0' style={{ color: '#7c3aed99' }} />
                    <div className='flex-1 min-w-0'>
                      <p className='text-[10px] truncate font-medium' style={{ color: '#e5e5e5' }}>{session.title || 'Untitled chat'}</p>
                      <p className='text-[8px] mt-0.5' style={{ color: '#666' }}>{formatDate(session.updated_at)}</p>
                    </div>
                    <div className='flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(session.id); setEditTitle(session.title || '') }}
                        className='p-1 rounded'
                        style={{ color: '#888' }}
                        title='Rename'
                      >
                        <Edit3 className='w-3 h-3' />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id) }}
                        className='p-1 rounded'
                        style={{ color: '#888' }}
                        title='Delete'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='flex-shrink-0 px-3 py-2' style={{ borderTop: '1px solid #333' }}>
        {confirmClearAll ? (
          <div className='flex items-center gap-2'>
            <span className='text-[9px] flex-1' style={{ color: '#f44747' }}>Delete ALL chats?</span>
            <button onClick={handleClearAll} className='px-2 py-0.5 rounded text-[9px] font-bold' style={{ background: '#f4474722', color: '#f44747' }}>
              Clear All
            </button>
            <button onClick={() => setConfirmClearAll(false)} className='px-2 py-0.5 rounded text-[9px]' style={{ color: '#888' }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className='space-y-1.5'>
            <button
              onClick={() => { onNewChat(); onClose() }}
              className='w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px]'
              style={{ border: '1px dashed #444', color: '#888' }}
            >
              <Plus className='w-3 h-3' /> New Chat
            </button>
            {sessions.length > 0 && (
              <button
                onClick={() => setConfirmClearAll(true)}
                className='w-full text-[9px]'
                style={{ color: '#666' }}
              >
                Clear all history
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
