import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, FileSpreadsheet, Film, Play, Download, Trash2,
  FolderOpen, ArrowLeft, ArrowRight, Settings, Activity, Plus, CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

interface Template {
  id: string
  name: string
  format: 'excel' | 'pdf' | 'latex' | 'slides'
  description: string
  status: 'ready' | 'draft'
}

interface GeneratedFile {
  id: string
  name: string
  type: string
  size: string
  path: string
  created: string
}

export function ArtifactsPage() {
  const navigate = useNavigate()
  const [compiling, setCompiling] = useState(false)
  const [compilationLogs, setCompilationLogs] = useState<string[]>([
    'Artifact workspace ready.',
    'System paths bound to local documents.'
  ])

  const [templates] = useState<Template[]>([
    { id: 't-1', name: 'Financial Model Ledger', format: 'excel', description: 'Creates Excel sheets with pandas & openpyxl integration.', status: 'ready' },
    { id: 't-2', name: 'Technical Briefing PDF', format: 'pdf', description: 'Generates structured PDF reports using local reportlab scripts.', status: 'ready' },
    { id: 't-3', name: 'Academic Dissertation Template', format: 'latex', description: 'Includes LaTeX layout repositories, citation setups, and bibliography.', status: 'draft' },
    { id: 't-4', name: 'Product Slides (Beamer)', format: 'slides', description: 'LaTeX slides preset compiled into presentation PDF.', status: 'ready' }
  ])

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([
    { id: 'g-1', name: 'qwen_financials_q3.xlsx', type: 'Excel Spreadsheet', size: '1.2 MB', path: './data/exports/xlsx', created: 'Today, 10:15 AM' },
    { id: 'g-2', name: 'openvino_benchmark_report.pdf', type: 'PDF Document', size: '2.4 MB', path: './data/exports/pdf', created: 'Yesterday, 4:40 PM' }
  ])

  const compileArtifact = (templateName: string, format: string) => {
    setCompiling(true)
    setCompilationLogs(prev => [...prev, `[compiler] Initializing compile sequence for ${templateName}...`])
    
    setTimeout(() => {
      let ext = 'pdf'
      let typeStr = 'PDF Document'
      if (format === 'excel') {
        ext = 'xlsx'
        typeStr = 'Excel Spreadsheet'
      } else if (format === 'latex') {
        ext = 'tex'
        typeStr = 'LaTeX Document'
      } else if (format === 'slides') {
        ext = 'pdf'
        typeStr = 'Presentation Slides'
      }

      const fileName = `${templateName.toLowerCase().replace(/ /g, '_')}_output.${ext}`
      const newFile: GeneratedFile = {
        id: `g-${Date.now()}`,
        name: fileName,
        type: typeStr,
        size: '1.5 MB',
        path: `./data/exports/${ext}`,
        created: 'Just now'
      }

      setGeneratedFiles(prev => [newFile, ...prev])
      setCompilationLogs(prev => [
        ...prev,
        `[compiler] Loaded pandas/openpyxl engine.`,
        `[compiler] Compiling LaTeX Beamer layout templates...`,
        `[compiler] PDF engine rendered document successfully.`,
        `✅ Output written to: ./data/exports/${ext}/${fileName}`
      ])
      setCompiling(false)
    }, 2000)
  }

  const deleteFile = (id: string) => {
    setGeneratedFiles(prev => prev.filter(f => f.id !== id))
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
                <FileText className="w-5 h-5 text-edge-cyan" />
                <h1 className="text-xl font-bold">Document & Spreadsheet Artifacts</h1>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Generate Excel spreadsheets, PDFs, slide decks, and compile LaTeX reports locally</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Templates selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-edge-cyan">
              <FolderOpen className="w-5 h-5" /> Artifact Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="p-4 bg-aurora-surface/30 rounded-xl border border-aurora-border/20 flex flex-col justify-between h-40">
                  <div>
                    <div className="flex items-center justify-between">
                      {tmpl.format === 'excel' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      ) : tmpl.format === 'pdf' ? (
                        <FileText className="w-5 h-5 text-edge-cyan" />
                      ) : tmpl.format === 'slides' ? (
                        <Film className="w-5 h-5 text-qwen-violet" />
                      ) : (
                        <FileText className="w-5 h-5 text-status-warning" />
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${tmpl.status === 'ready' ? 'bg-status-ready/10 text-status-ready' : 'bg-status-warning/10 text-status-warning'}`}>
                        {tmpl.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-text-primary mt-2">{tmpl.name}</h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">{tmpl.description}</p>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => compileArtifact(tmpl.name, tmpl.format)}
                    disabled={compiling}
                    className="mt-3 text-xs py-1 text-center font-bold"
                  >
                    <Play className="w-3 h-3 mr-1" /> Compile Template
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Compilation log terminal */}
          <div className="glass-card p-6 border border-aurora-border/40">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-edge-cyan">
              <Activity className="w-5 h-5" /> Artifact Compiler Output
            </h2>
            <div className="bg-black/80 font-mono text-xs text-emerald-400 p-4 rounded-xl h-36 overflow-y-auto space-y-1">
              {compilationLogs.map((log, idx) => (
                <p key={idx} className="leading-relaxed">{log}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Generated artifacts lists */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-aurora-border/40">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Generated Artifacts</h2>
            <div className="space-y-3">
              {generatedFiles.map(file => (
                <div key={file.id} className="p-3 bg-aurora-surface/30 rounded-lg border border-aurora-border/20 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{file.type} • {file.size}</p>
                    <p className="text-[9px] text-text-muted font-mono truncate mt-1 bg-aurora-surface-hover p-1 rounded">{file.path}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      className="p-1.5 rounded bg-aurora-surface border border-aurora-border/40 hover:text-edge-cyan transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => deleteFile(file.id)}
                      className="p-1.5 rounded bg-aurora-surface border border-aurora-border/40 hover:text-status-error transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border border-aurora-border/40 bg-edge-blue/5 border-edge-blue/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-edge-cyan">Office & Presentation Integration</h3>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              Build slides and documents directly on the model's text generation output. Use structured formats to generate Python scripts that automate spreadsheet ledger creation and LaTeX slide deck updates locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
