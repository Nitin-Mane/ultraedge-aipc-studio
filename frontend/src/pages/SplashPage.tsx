import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, SkipForward } from 'lucide-react'
import { ParticleField, GlowRing } from '../components/PageTransition'
import { Button } from '../components/Button'

export function SplashPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState(0)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 500)
    const timer2 = setTimeout(() => setPhase(2), 1500)
    const timer3 = setTimeout(() => setShowContent(true), 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="min-h-screen bg-aurora-base flex flex-col items-center justify-center relative overflow-hidden">
      {/* Neural Background */}
      <div className="absolute inset-0 bg-neural-grid opacity-20" />
      
      {/* Particle Field */}
      <ParticleField count={80} color="rgba(0, 180, 216, 0.4)" />
      
      {/* Glow Rings */}
      <GlowRing size={400} color="rgba(0, 180, 216, 0.15)" className="top-1/4 left-1/4" />
      <GlowRing size={300} color="rgba(124, 58, 237, 0.1)" className="bottom-1/4 right-1/4" />

      {/* Central Content */}
      <div className="relative z-10 text-center px-4 flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Phase 0: Initial */}
          {phase === 0 && (
            <motion.div
              key="phase0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-full border-2 border-edge-cyan/50 border-t-edge-cyan"
              />
            </motion.div>
          )}

          {/* Phase 1: Ring */}
          {phase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-edge-cyan/40"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-2 border-qwen-violet/40"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-edge-cyan to-qwen-violet" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 2: Full Content */}
          {phase === 2 && showContent && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-8"
              >
                <div className="relative">
                  <motion.div
                    className="w-20 h-20 rounded-2xl overflow-hidden shadow-glow-cyan"
                    animate={{
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <img src="/ultraedge.svg" alt="UltraEdge AIPC Studio" className="w-full h-full" />
                  </motion.div>
                  <motion.div
                    className="absolute -inset-4 rounded-full bg-edge-cyan/10"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl sm:text-5xl font-bold text-text-primary mb-3"
              >
                <span className="text-gradient">UltraEdge AIPC Studio</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-text-secondary mb-8"
              >
                Powered by Intel OpenVINO™ Toolkit
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/hardware-scan')}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Get Started
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  rightIcon={<SkipForward className="w-5 h-5" />}
                >
                  Skip to Dashboard
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative z-10 pb-8 text-center"
      >
        <p className="text-xs text-text-muted mb-1">
          © 2026 UltraEdge AI Studio. All rights reserved.
        </p>
        <p className="text-[10px] text-text-muted/70">
          Made with <span className="text-red-400">❤</span> for local AI, creators, developers, and Intel AI PC innovation.
        </p>
        <p className="text-[10px] text-text-muted/50 mt-1">
          Open-source beta application for testing, research, and community feedback.
        </p>
      </motion.div>
    </div>
  )
}
