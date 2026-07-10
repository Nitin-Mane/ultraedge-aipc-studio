import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, Play, Trash2, ToggleLeft, ToggleRight,
  Plus, CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Activity, ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

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

export function SchedulerPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([
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
  ])

  const [modalOpen, setModalOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskType, setNewTaskType] = useState('Cache Optimization')
  const [newTaskCron, setNewTaskCron] = useState('0 0 * * *')
  const [newTaskModel, setNewTaskModel] = useState('Qwen2.5-Omni-3B')
  const [logs, setLogs] = useState<string[]>([
    '[11:00:00 AM] Scheduler engine initialized.',
    '[11:00:05 AM] Task: Model Cache Warm-up successfully compiled openvino weights.',
    '[11:30:00 AM] Vector DB Sync bypassed (task is inactive).'
  ])

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
      targetModel: newTaskModel,
      active: true,
      lastRun: 'Never',
      status: 'idle'
    }
    setTasks(prev => [...prev, created])
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Created scheduled task: ${newTaskName}`])
    setNewTaskName('')
    setModalOpen(false)
  }

  const triggerTask = (taskName: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Manually triggered task: ${taskName}`])
  }

  return (
    <div className="min-h-screen bg-aurora-base text-text-primary pt-16">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-aurora-base/80 backdrop-blur-glass border-b border-aurora-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/personal-assistant?loaded=true')}
              className="p-2 rounded-lg bg-aurora-surface hover:bg-aurora-surface-hover border border-aurora-border/40 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-text-secondary" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-edge-cyan" />
                <h1 className="text-xl font-bold">Automated Task Scheduler</h1>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Automate and run background tasks, warm-ups, and synchronization routines offline</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Schedule
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Scheduled Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Active Task Schedules</h2>
          
          {tasks.map(task => (
            <div key={task.id} className="glass-card p-5 border border-aurora-border/40 hover:border-edge-cyan/35 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${task.active ? 'bg-edge-cyan/15 text-edge-cyan' : 'bg-aurora-surface-hover text-text-muted'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary">{task.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{task.type} • Target: <span className="text-edge-cyan font-semibold">{task.targetModel}</span></p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-text-muted font-mono">{task.schedule}</span>
                    <span className="text-text-muted/40">•</span>
                    <span className="text-xs text-text-muted">Last run: {task.lastRun}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-aurora-border/20 justify-end">
                <button 
                  onClick={() => handleToggle(task.id)}
                  className="text-text-secondary hover:text-edge-cyan transition-colors"
                >
                  {task.active ? <ToggleRight className="w-8 h-8 text-edge-cyan" /> : <ToggleLeft className="w-8 h-8 text-text-muted" />}
                </button>

                <button
                  onClick={() => triggerTask(task.name)}
                  disabled={!task.active}
                  className="p-2 rounded-lg bg-aurora-surface hover:bg-edge-cyan/20 border border-aurora-border/50 text-text-secondary hover:text-edge-cyan transition-all disabled:opacity-40 disabled:pointer-events-none"
                  title="Run Now"
                >
                  <Play className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 rounded-lg bg-aurora-surface hover:bg-status-error/20 border border-aurora-border/50 text-text-secondary hover:text-status-error transition-all"
                  title="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Engine Logs */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-edge-cyan" /> Execution Audit Logs
          </h2>
          <div className="glass-card p-4 border border-aurora-border/40 bg-aurora-surface/20 flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto font-mono text-xs text-text-secondary space-y-2 p-1">
              {logs.map((log, idx) => (
                <p key={idx} className="leading-relaxed border-b border-aurora-border/10 pb-1.5 last:border-0">{log}</p>
              ))}
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              fullWidth 
              onClick={() => setLogs([`[${new Date().toLocaleTimeString()}] Logs cleared.`])}
              className="mt-4 text-xs font-semibold py-2"
            >
              Clear Log History
            </Button>
          </div>
        </div>
      </div>

      {/* Create Schedule Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-aurora-base border border-aurora-border/60 shadow-2xl rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-4">Create Task Schedule</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Task Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Model Compression Check"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-edge-cyan"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Task Type</label>
                  <select 
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-edge-cyan"
                  >
                    <option value="Cache Optimization">Cache Optimization</option>
                    <option value="System Sweep">System Sweep</option>
                    <option value="Model Test">Model Accuracy Audit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Cron Expression</label>
                  <input 
                    type="text" 
                    value={newTaskCron}
                    onChange={(e) => setNewTaskCron(e.target.value)}
                    className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary font-mono focus:outline-none"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Standard 5-field cron syntax (min hr dom mon dow)</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">Target Engine</label>
                  <select 
                    value={newTaskModel}
                    onChange={(e) => setNewTaskModel(e.target.value)}
                    className="w-full bg-aurora-surface border border-aurora-border/50 p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-edge-cyan"
                  >
                    <option value="Qwen2.5-Omni-3B">Qwen2.5-Omni-3B</option>
                    <option value="None">None (System Command)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreate}>Add Schedule</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
