import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Bot } from 'lucide-react'

export interface AgentSettings {
  maxSteps: number
  autoExecute: boolean
  shell: 'cmd' | 'powershell' | 'bash'
  systemPrompt: string
}

const DEFAULT_SETTINGS: AgentSettings = {
  maxSteps: 20,
  autoExecute: true,
  shell: 'cmd',
  systemPrompt: `You are an autonomous coding agent. Given a task, execute it step by step.

For each step, respond with EXACTLY one JSON action (no other text):
{"action": "command", "command": "shell command to run", "description": "what this does"}
{"action": "write", "path": "full/file/path", "content": "file content here", "description": "what this file does"}
{"action": "mkdir", "path": "folder/path", "description": "what this folder is for"}
{"action": "read", "path": "file/path", "description": "reading this file"}
{"action": "list", "path": "folder/path", "description": "listing this folder"}
{"action": "done", "summary": "what was accomplished"}

Rules:
- First run: dir to see current workspace
- Create project structure with folders and files
- After all actions, respond with {"action": "done", "summary": "..."}
- Only output ONE JSON object per response, nothing else`
}

export function AgentSettingsPage({ open, onClose, settings, onSave }: {
  open: boolean
  onClose: () => void
  settings: AgentSettings
  onSave: (s: AgentSettings) => void
}) {
  const [local, setLocal] = useState(settings)

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className='w-full max-w-lg bg-aurora-surface border border-aurora-border/40 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden' onClick={e => e.stopPropagation()}>
          <div className='flex items-center justify-between px-5 py-4 border-b border-aurora-border/30'>
            <div className='flex items-center gap-2'>
              <Bot className='w-4 h-4 text-edge-cyan' />
              <span className='font-semibold text-sm text-text-primary'>Agent Settings</span>
            </div>
            <button onClick={onClose} className='p-1 rounded hover:bg-aurora-surface-hover transition-colors'>
              <X className='w-4 h-4 text-text-muted' />
            </button>
          </div>

          <div className='p-5 space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='text-[10px] text-text-muted block mb-1'>Max Steps</label>
                <input type='number' value={local.maxSteps} onChange={(e) => setLocal(s => ({ ...s, maxSteps: parseInt(e.target.value) || 20 }))} className='w-full px-2 py-1.5 rounded bg-aurora-base border border-aurora-border/50 text-xs text-text-primary focus:outline-none focus:border-qwen-violet' />
              </div>
              <div>
                <label className='text-[10px] text-text-muted block mb-1'>Shell</label>
                <select value={local.shell} onChange={(e) => setLocal(s => ({ ...s, shell: e.target.value as any }))} className='w-full px-2 py-1.5 rounded bg-aurora-base border border-aurora-border/50 text-xs text-text-primary focus:outline-none focus:border-qwen-violet'>
                  <option value='cmd'>Command Prompt</option>
                  <option value='powershell'>PowerShell</option>
                  <option value='bash'>Bash</option>
                </select>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <input type='checkbox' checked={local.autoExecute} onChange={(e) => setLocal(s => ({ ...s, autoExecute: e.target.checked }))} className='rounded' />
              <label className='text-[10px] text-text-muted'>Auto-execute commands without confirmation</label>
            </div>

            <div>
              <label className='text-[10px] text-text-muted block mb-1'>System Prompt</label>
              <textarea value={local.systemPrompt} onChange={(e) => setLocal(s => ({ ...s, systemPrompt: e.target.value }))} className='w-full h-32 px-2 py-1.5 rounded bg-aurora-base border border-aurora-border/50 text-[10px] font-mono text-text-primary resize-none focus:outline-none focus:border-qwen-violet' />
            </div>
          </div>

          <div className='flex items-center justify-end gap-2 px-5 py-3 border-t border-aurora-border/30'>
            <button onClick={onClose} className='px-3 py-1.5 rounded text-[10px] text-text-muted hover:bg-aurora-surface-hover transition-colors'>Cancel</button>
            <button onClick={() => { onSave(local); onClose() }} className='px-3 py-1.5 rounded bg-edge-cyan/80 hover:bg-edge-cyan text-aurora-base text-[10px] font-medium transition-colors'>Save</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
