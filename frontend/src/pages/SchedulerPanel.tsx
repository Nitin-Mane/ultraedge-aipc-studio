import { useState } from 'react'
import {
  Calendar, Clock, Play, Trash2, ToggleLeft, ToggleRight,
  Plus, X, Activity
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface Task {
  id: string
  name: string
  type: string
  schedule: string
  targetModel: string
  active: boolean
  lastRun: string
  status: 'success' | 'failed' | 'running' | 'idle'
}

interface SchedulerPanelProps {
  onClose: () => void
}

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    name: 'Model Cache Warm-up',
    type: 'Cache Optimization',
    schedule: '0 6 * * * (Daily at 6 AM)',
    targetModel: 'Qwen2.5-Omni-3B',
    active: true,
    lastRun: 'Today, 6:00 AM',
    status: 'success'
  },
  {
    id: 'task-2',
    name: 'System Logs Purge',
    type: 'System Sweep',
    schedule: '0 0 * * 0 (Weekly on Sun)',
    targetModel: 'None',
    active: true,
    lastRun: 'Jul 4, 12:00 AM',
    status: 'success'
  },
]

export function SchedulerPanel({ onClose }: SchedulerPanelProps) {
  const { selectedModel } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS)
  const [showCreate, setShowCreate] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskType, setNewTaskType] = useState('Cache Optimization')
  const [newTaskCron, setNewTaskCron] = useState('0 0 * * *')
  const [logs, setLogs] = useState<string[]>([
    '[11:00:00 AM] Scheduler engine initialized.',
    '[11:00:05 AM] Task: Model Cache Warm-up compiled weights.',
    '[11:30:00 AM] Vector DB Sync bypassed (task inactive).'
  ])

  const activeCount = tasks.filter(t => t.active).length

  const handleToggle = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleCreate = () => {
    if (!newTaskName.trim()) return
    const created: Task = {
      id: `task-${Date.now()}`,
      name: newTaskName,
      type: newTaskType,
      schedule: `${newTaskCron} (Custom)`,
      targetModel: selectedModel?.name || 'Qwen2.5-Coder-1.5B',
      active: true,
      lastRun: 'Never',
      status: 'idle'
    }
    setTasks(prev => [...prev, created])
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Created: ${newTaskName}`])
    setNewTaskName('')
    setShowCreate(false)
  }

  const triggerTask = (taskName: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Triggered: ${taskName}`])
  }

  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='relative w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col bg-aurora-base border border-aurora-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3 border-b border-aurora-border/30 bg-aurora-surface/30'>
          <div className='flex items-center gap-2.5'>
            <div className='p-1.5 rounded-lg bg-edge-cyan/10 border border-edge-cyan/20'>
              <Calendar className='w-4 h-4 text-edge-cyan' />
            </div>
            <div>
              <h2 className='text-sm font-bold text-text-primary'>Task Scheduler</h2>
              <p className='text-[10px] text-text-muted'>{activeCount} active / {tasks.length} total</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-edge-cyan/10 border border-edge-cyan/20 text-edge-cyan text-[10px] font-bold hover:bg-edge-cyan/20 transition-colors'
            >
              <Plus className='w-3 h-3' /> New
            </button>
            <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-aurora-surface-hover text-text-muted hover:text-text-primary transition-colors'>
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className='px-5 py-3 border-b border-aurora-border/30 bg-aurora-surface/20 space-y-2.5'>
            <input
              type='text'
              placeholder='Task name...'
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              className='w-full bg-aurora-surface border border-aurora-border/50 p-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-edge-cyan'
            />
            <div className='flex gap-2'>
              <select
                value={newTaskType}
                onChange={e => setNewTaskType(e.target.value)}
                className='flex-1 bg-aurora-surface border border-aurora-border/50 p-2 rounded-lg text-xs text-text-primary focus:outline-none'
              >
                <option value='Cache Optimization'>Cache Optimization</option>
                <option value='System Sweep'>System Sweep</option>
                <option value='Model Test'>Model Accuracy Audit</option>
              </select>
              <input
                type='text'
                value={newTaskCron}
                onChange={e => setNewTaskCron(e.target.value)}
                placeholder='cron'
                className='w-32 bg-aurora-surface border border-aurora-border/50 p-2 rounded-lg text-xs text-text-primary font-mono focus:outline-none'
              />
              <button
                onClick={handleCreate}
                disabled={!newTaskName.trim()}
                className='px-3 py-2 rounded-lg bg-edge-cyan text-aurora-base text-[10px] font-bold hover:bg-edge-cyan/90 transition-colors disabled:opacity-40'
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className='flex-1 overflow-y-auto flex'>
          {/* Task List */}
          <div className='flex-1 p-4 space-y-2 border-r border-aurora-border/20'>
            {tasks.map(task => (
              <div key={task.id} className='p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center gap-3'>
                <div className={`p-1.5 rounded-lg shrink-0 ${task.active ? 'bg-edge-cyan/15 text-edge-cyan' : 'bg-aurora-surface-hover text-text-muted'}`}>
                  <Clock className='w-3.5 h-3.5' />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-bold text-text-primary truncate'>{task.name}</p>
                  <p className='text-[10px] text-text-muted truncate'>{task.type} &bull; {task.schedule}</p>
                </div>
                <div className='flex items-center gap-1.5 shrink-0'>
                  <button onClick={() => handleToggle(task.id)} className='text-text-secondary hover:text-edge-cyan transition-colors'>
                    {task.active ? <ToggleRight className='w-5 h-5 text-edge-cyan' /> : <ToggleLeft className='w-5 h-5 text-text-muted' />}
                  </button>
                  <button onClick={() => triggerTask(task.name)} disabled={!task.active} className='p-1 rounded hover:bg-aurora-surface text-text-secondary hover:text-edge-cyan disabled:opacity-30 transition-colors'>
                    <Play className='w-3 h-3' />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className='p-1 rounded hover:bg-aurora-surface text-text-secondary hover:text-status-error transition-colors'>
                    <Trash2 className='w-3 h-3' />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Logs */}
          <div className='w-48 p-3 flex flex-col bg-aurora-surface/10'>
            <div className='flex items-center gap-1.5 mb-2'>
              <Activity className='w-3 h-3 text-edge-cyan' />
              <span className='text-[9px] font-bold text-text-muted uppercase tracking-wider'>Logs</span>
            </div>
            <div className='flex-1 overflow-y-auto space-y-1'>
              {logs.map((log, idx) => (
                <p key={idx} className='text-[9px] text-text-muted font-mono leading-relaxed'>{log}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
