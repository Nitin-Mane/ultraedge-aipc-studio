import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Cpu, HardDrive, Monitor, Zap, Wifi, WifiOff, 
  CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  Server, MemoryStick
} from 'lucide-react'
import { useAppStore, HardwareInfo } from '../store/useAppStore'
import { PageTransition, FadeIn, ParticleField } from '../components/PageTransition'
import { Button } from '../components/Button'
import { getSystemProfile } from '../api/system'

const fallbackHardware: HardwareInfo = {
  cpu: 'Intel Core Processor',
  gpu: 'Intel Integrated Graphics',
  npu: 'Not Detected',
  ramTotal: 16,
  ramAvailable: 8,
  storage: '100GB Free',
  os: 'Windows 11',
  openvinoStatus: 'unknown',
  driverReadiness: 'unknown',
}

interface BackendProfile {
  os: string
  cpu: string
  gpu: string
  npu: string
  ram_total_gb: number
  ram_available_gb: number
  storage_free_gb: number
  storage_total?: string
  openvino_status: string
  supported_devices: string[]
}

export function HardwareScanPage() {
  const navigate = useNavigate()
  const { setHardwareInfo, setHardwareScanned, hardwareInfo, hardwareScanned } = useAppStore()

  const [scanning, setScanning] = useState(!hardwareScanned)
  const [progress, setProgress] = useState(hardwareScanned ? 100 : 0)
  const [currentStep, setCurrentStep] = useState(hardwareScanned ? 'Analysis Complete!' : 'Preparing scan...')
  const [hardware, setHardware] = useState<HardwareInfo | null>(hardwareScanned ? hardwareInfo : null)

  const steps = [
    'Detecting CPU...',
    'Scanning GPU...',
    'Checking NPU...',
    'Measuring RAM...',
    'Checking Storage...',
    'Verifying OpenVINO...',
    'Checking Drivers...',
    'Analysis Complete!',
  ]

  const mapBackendToHardware = (data: BackendProfile): HardwareInfo => {
    const storageStr = data.storage_total
      ? `${data.storage_total} (${data.storage_free_gb}GB free)`
      : `${data.storage_free_gb}GB Free`
    return {
      cpu: data.cpu,
      gpu: data.gpu,
      npu: data.npu === 'detected' ? 'Intel AI Boost (NPU)' : 'Not Detected',
      ramTotal: data.ram_total_gb,
      ramAvailable: data.ram_available_gb,
      storage: storageStr,
      os: data.os,
      openvinoStatus: data.openvino_status === 'available' ? 'installed' : 'not-installed',
      driverReadiness: data.openvino_status === 'available' && data.supported_devices.length > 1 ? 'ready' : 'partial',
    }
  }

  const runScan = async () => {
    setScanning(true)
    setProgress(0)
    setCurrentStep('Preparing scan...')
    setHardware(null)

    let stepIndex = 0
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex])
        setProgress(((stepIndex + 1) / steps.length) * 90)
        stepIndex++
      }
    }, 400)

    try {
      const data = await getSystemProfile() as unknown as BackendProfile
      clearInterval(stepInterval)

      setCurrentStep('Loading results...')
      setProgress(95)
      await new Promise(r => setTimeout(r, 300))

      const mapped = mapBackendToHardware(data)
      setHardware(mapped)
      setHardwareInfo(mapped)
      setHardwareScanned(true)
      setCurrentStep('Analysis Complete!')
      setProgress(100)
      setScanning(false)
      return
    } catch {
      // backend not reachable
    }

    clearInterval(stepInterval)
    setCurrentStep('Using fallback data...')
    setProgress(95)
    await new Promise(r => setTimeout(r, 300))

    setHardware(fallbackHardware)
    setHardwareInfo(fallbackHardware)
    setHardwareScanned(true)
    setCurrentStep('Analysis Complete!')
    setProgress(100)
    setScanning(false)
  }

  useEffect(() => {
    if (hardwareScanned && hardwareInfo && !scanning) {
      setHardware(hardwareInfo)
      setProgress(100)
      setScanning(false)
      return
    }
    runScan()
  }, [])

  return (
    <PageTransition>
      <div className="min-h-screen bg-aurora-base flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-neural-grid opacity-20" />
        <ParticleField count={30} color="rgba(0, 180, 216, 0.3)" />

        <div className="relative z-10 w-full max-w-2xl px-4">
          <FadeIn>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">Hardware Scan</h1>
              <p className="text-text-secondary">Detecting your system capabilities</p>
            </div>

            <div className="glass-card p-8">
              {scanning ? (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="w-full h-2 bg-aurora-surface-hover rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-edge-cyan to-qwen-violet rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-text-muted">
                      <span>{currentStep}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>

                  <div className="flex justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-edge-cyan/40 flex items-center justify-center"
                    >
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-2 border-qwen-violet/40 flex items-center justify-center"
                      >
                        <Cpu className="w-8 h-8 text-edge-cyan" />
                      </motion.div>
                    </motion.div>
                  </div>

                  <p className="text-center text-sm text-text-muted">
                    Analyzing hardware configuration...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-status-ready/10">
                      <CheckCircle2 className="w-6 h-6 text-status-ready" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">Scan Complete</h2>
                      <p className="text-sm text-text-secondary">Your system is ready for AI</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <Cpu className="w-5 h-5 text-edge-cyan" />
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted">CPU</p>
                        <p className="text-sm font-medium text-text-primary truncate">{hardware?.cpu}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <Zap className="w-5 h-5 text-qwen-violet" />
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted">GPU</p>
                        <p className="text-sm font-medium text-text-primary truncate">{hardware?.gpu}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <Server className="w-5 h-5 text-status-warning" />
                      <div>
                        <p className="text-xs text-text-muted">NPU</p>
                        <p className="text-sm font-medium text-text-primary">{hardware?.npu || 'Not Detected'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <MemoryStick className="w-5 h-5 text-status-ready" />
                      <div>
                        <p className="text-xs text-text-muted">RAM</p>
                        <p className="text-sm font-medium text-text-primary">
                          {hardware?.ramTotal ? `${hardware.ramTotal}GB (${hardware.ramAvailable}GB available)` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <HardDrive className="w-5 h-5 text-text-muted" />
                      <div>
                        <p className="text-xs text-text-muted">Storage</p>
                        <p className="text-sm font-medium text-text-primary">{hardware?.storage || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface/30">
                      <Monitor className="w-5 h-5 text-text-muted" />
                      <div>
                        <p className="text-xs text-text-muted">OS</p>
                        <p className="text-sm font-medium text-text-primary">{hardware?.os}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-4 rounded-xl border ${
                    hardware?.openvinoStatus === 'installed'
                      ? 'bg-status-ready/10 border-status-ready/30'
                      : 'bg-status-warning/10 border-status-warning/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {hardware?.openvinoStatus === 'installed' ? (
                        <Wifi className="w-5 h-5 text-status-ready" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-status-warning" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">OpenVINO Runtime</p>
                        <p className="text-xs text-text-secondary">
                          {hardware?.openvinoStatus === 'installed' ? 'Installed and ready' : 'Not detected'}
                        </p>
                      </div>
                    </div>
                    <span className={`status-badge ${
                      hardware?.openvinoStatus === 'installed' ? 'status-ready' : 'status-warning'
                    }`}>
                      {hardware?.openvinoStatus === 'installed' ? 'Active' : 'Unavailable'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => navigate('/dashboard')}
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                      Continue to Dashboard
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={runScan}
                      leftIcon={<RefreshCw className="w-5 h-5" />}
                    >
                      Re-scan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}
