import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Mic, MicOff, Volume2, VolumeX, Play, Pause, Square,
  Settings, Zap, Cpu, Download, Upload, Trash2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { Button } from '../components/Button'
import { Textarea } from '../components/Input'

export function VoiceAssistantPage() {
  const { selectedModel } = useAppStore()
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [ttsText, setTtsText] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRecord = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      // Simulate recording
      setTimeout(() => {
        setTranscript('This is a simulated transcription of your voice input. In production, this would use the Qwen3-ASR model to convert speech to text locally on your device.')
        setIsRecording(false)
      }, 3000)
    }
  }

  const handleTranscribe = async () => {
    if (!audioFile) return
    setIsTranscribing(true)
    setTimeout(() => {
      setTranscript('This is a simulated transcription of the uploaded audio file. The Qwen3-ASR model processes audio locally for complete privacy.')
      setIsTranscribing(false)
    }, 2000)
  }

  const handleSynthesize = async () => {
    if (!ttsText.trim()) return
    setIsSynthesizing(true)
    setTimeout(() => {
      setIsSynthesizing(false)
      setIsPlaying(true)
      setTimeout(() => setIsPlaying(false), 3000)
    }, 1500)
  }

  return (
    <PageTransition>
      <div className="h-screen flex flex-col bg-aurora-base">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-aurora-border/30 bg-aurora-base/80 backdrop-blur-glass">
          <div className="max-w-full mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-status-error/10">
                  <Mic className="w-5 h-5 text-status-error" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary">Voice Assistant</h1>
                  <p className="text-xs text-text-secondary">Speech-to-text and text-to-speech</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedModel && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-ready/10 border border-status-ready/30">
                    <div className="w-2 h-2 rounded-full bg-status-ready animate-pulse" />
                    <span className="text-xs text-status-ready">{selectedModel.name}</span>
                  </div>
                )}
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center - Voice Controls */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* STT Section */}
                <FadeIn delay={0.1}>
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Mic className="w-4 h-4 text-status-error" />
                      <h2 className="text-lg font-semibold text-text-primary">Speech to Text</h2>
                    </div>
                    <p className="text-sm text-text-secondary mb-6">
                      Record audio or upload a file to transcribe speech to text using Qwen3-ASR.
                    </p>

                    {/* Recording Controls */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRecord}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                          isRecording
                            ? 'bg-status-error/20 border-2 border-status-error shadow-glow-purple'
                            : 'bg-aurora-surface-hover border-2 border-aurora-border hover:border-status-error/50'
                        }`}
                      >
                        {isRecording ? (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <MicOff className="w-8 h-8 text-status-error" />
                          </motion.div>
                        ) : (
                          <Mic className="w-8 h-8 text-status-error" />
                        )}
                      </motion.button>
                    </div>

                    {isRecording && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center mb-4"
                      >
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [8, 24, 8] }}
                              transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                              className="w-1 bg-status-error rounded-full"
                            />
                          ))}
                        </div>
                        <p className="text-xs text-status-error mt-2">Recording...</p>
                      </motion.div>
                    )}

                    {/* Upload Audio */}
                    <div className="flex items-center gap-4">
                      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-1.5" /> Upload Audio
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      {audioFile && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">{audioFile.name}</span>
                          <Button variant="ghost" size="sm" onClick={handleTranscribe} loading={isTranscribing}>
                            <Zap className="w-4 h-4 mr-1" /> Transcribe
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Transcript */}
                    {transcript && (
                      <div className="mt-4 p-4 bg-aurora-base/50 rounded-xl">
                        <p className="text-sm text-text-secondary whitespace-pre-wrap">{transcript}</p>
                      </div>
                    )}
                  </div>
                </FadeIn>

                {/* TTS Section */}
                <FadeIn delay={0.2}>
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Volume2 className="w-4 h-4 text-status-error" />
                      <h2 className="text-lg font-semibold text-text-primary">Text to Speech</h2>
                    </div>
                    <p className="text-sm text-text-secondary mb-6">
                      Convert text to natural speech using Qwen3-TTS.
                    </p>

                    <Textarea
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Enter text to convert to speech..."
                      className="mb-4"
                    />

                    <div className="flex items-center gap-4">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleSynthesize}
                        disabled={!ttsText.trim() || isSynthesizing}
                        loading={isSynthesizing}
                      >
                        <Volume2 className="w-4 h-4 mr-1.5" /> Generate Speech
                      </Button>
                      {isPlaying && (
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsPlaying(false)}
                            className="w-10 h-10 rounded-full bg-status-error/20 flex items-center justify-center"
                          >
                            <Square className="w-5 h-5 text-status-error" />
                          </motion.button>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [4, 16, 4] }}
                                transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                                className="w-1 bg-status-error rounded-full"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-text-muted">Playing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Model Info */}
          <div className="hidden xl:flex flex-col w-72 border-l border-aurora-border/30 bg-aurora-surface/30 p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Voice Models</h3>
            <div className="space-y-3">
              <div className="glass-card p-3 border-status-ready/30">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-status-ready" />
                  <span className="text-xs font-medium text-text-primary">Qwen3-ASR-0.6B</span>
                </div>
                <p className="text-xs text-text-muted">Speech Recognition</p>
                <p className="text-xs text-text-muted mt-1">52 languages • Streaming</p>
              </div>
              <div className="glass-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-qwen-violet" />
                  <span className="text-xs font-medium text-text-primary">Qwen3-TTS-0.6B</span>
                </div>
                <p className="text-xs text-text-muted">Text-to-Speech</p>
                <p className="text-xs text-text-muted mt-1">10 languages • 97ms latency</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}