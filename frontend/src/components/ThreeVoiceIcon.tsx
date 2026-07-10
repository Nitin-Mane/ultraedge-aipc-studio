import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeVoiceIcon() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(36, 36)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
    camera.position.z = 2.4

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0x00c8ff, 1.5)
    dirLight.position.set(1, 1, 1)
    scene.add(dirLight)

    // Create 3 audio bars in 3D (rounded cylinders)
    const barGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16)
    const materials = [
      new THREE.MeshPhongMaterial({ color: 0x00c8ff, emissive: 0x003366, shininess: 100 }),
      new THREE.MeshPhongMaterial({ color: 0x8b5cf6, emissive: 0x330066, shininess: 100 }),
      new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x003311, shininess: 100 }),
    ]

    const bars: THREE.Mesh[] = []
    const positionsX = [-0.25, 0, 0.25]

    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(barGeo, materials[i])
      bar.position.x = positionsX[i]
      bar.position.y = 0
      scene.add(bar)
      bars.push(bar)
    }

    let frameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Animating the scale and rotation of each bar to simulate audio level pitches
      bars.forEach((bar, idx) => {
        const offset = idx * 1.5
        const scaleY = 0.3 + Math.abs(Math.sin(elapsed * 6 + offset)) * 0.9
        bar.scale.y = scaleY
        
        // Slight rotation to make the 3D depth apparent
        bar.rotation.x = Math.sin(elapsed * 2 + offset) * 0.2
        bar.rotation.y = elapsed * 1.2
      })

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 36,
        height: 36,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
