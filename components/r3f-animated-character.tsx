'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import type { ExpressionState } from '@/lib/types'
import { EMOTION_CONFIG } from '@/lib/constants'

// ─── GLSL shaders ─────────────────────────────────────────────────────────────

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec3 uTint;
  uniform float uTintStrength;
  uniform float uBrightnessPulse;

  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);

    // Apply emotion color tint
    vec3 tinted = mix(texColor.rgb, texColor.rgb * uTint, uTintStrength);

    // Soft vignette — focus on character, darken edges subtly
    float vignette = smoothstep(0.0, 0.5, 1.0 - length(vUv - 0.5) * 1.2);
    tinted *= mix(0.88, 1.0, vignette);

    // Brightness pulse for speaking reactivity and surprised flash
    tinted += uBrightnessPulse * 0.15;

    gl_FragColor = vec4(tinted, texColor.a);
  }
`

// ─── Inner mesh component (runs inside Canvas) ────────────────────────────────

function AvatarMesh({
  imageUrl,
  expressionState,
  pulseIntensity,
}: {
  imageUrl: string
  expressionState: ExpressionState
  pulseIntensity: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const texture = useLoader(TextureLoader, imageUrl)

  // Ensure crisp texture — no mipmapping, max anisotropy
  useEffect(() => {
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.anisotropy = 16
    texture.needsUpdate = true
  }, [texture, imageUrl])

  const config = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

  // Lerp targets for smooth shader transitions
  const lerpRef = useRef({
    tint: new THREE.Vector3(...config.tint),
    tintStrength: config.tintStrength,
  })

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uTint: { value: new THREE.Vector3(...config.tint) },
    uTintStrength: { value: config.tintStrength },
    uTime: { value: 0 },
    uBrightnessPulse: { value: 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [texture])

  // Update lerp targets when expression state changes
  useEffect(() => {
    const c = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle
    lerpRef.current.tint.set(...c.tint)
    lerpRef.current.tintStrength = c.tintStrength
  }, [expressionState])

  useFrame((_state, delta) => {
    timeRef.current += delta
    const u = uniforms
    const t = lerpRef.current
    const lerpSpeed = 2.5 * delta
    const time = timeRef.current
    u.uTime.value = time

    // Smooth lerp shader uniforms
    u.uTint.value.lerp(t.tint, lerpSpeed)
    u.uTintStrength.value = THREE.MathUtils.lerp(u.uTintStrength.value, t.tintStrength, lerpSpeed)
    u.uBrightnessPulse.value = THREE.MathUtils.lerp(u.uBrightnessPulse.value, pulseIntensity, lerpSpeed * 3)

    if (!meshRef.current) return
    const c = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

    // Breathing — gentle up/down Y translation
    const breathe = Math.sin(time * c.breatheSpeed) * c.breatheAmp

    // Sway — gentle X rotation tilt (like body weight shift)
    const sway = Math.sin(time * c.swaySpeed) * c.swayAmp

    // Bob — secondary Y motion (bounce for happy/speaking, slow sink for sad)
    const bob = c.bobAmp !== 0
      ? Math.sin(time * c.bobSpeed) * Math.abs(c.bobAmp) * Math.sign(c.bobAmp)
      : 0

    // Shake — rapid X translation (angry tremor)
    const shake = c.shakeAmp !== 0
      ? Math.sin(time * c.shakeSpeed) * c.shakeAmp
      : 0

    // Apply to mesh — crisp image moves as a unit, zero UV distortion
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, breathe + bob, lerpSpeed * 2)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, shake, lerpSpeed * 2)
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -sway, lerpSpeed * 2)
  })

  return (
    <mesh ref={meshRef}>
      {/* Subdivided plane — 1.92x2.64 units fills 192x264px at zoom:100 */}
      <planeGeometry args={[1.92, 2.64, 48, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface R3FAnimatedCharacterProps {
  imageUrl: string
  name: string
  expressionState?: ExpressionState
  isOnline?: boolean
}

export function R3FAnimatedCharacter({
  imageUrl,
  name,
  expressionState = 'idle',
  isOnline = false,
}: R3FAnimatedCharacterProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)
  const config = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

  // Speaking pulse feeds into brightness shader uniform
  useEffect(() => {
    if (expressionState !== 'speaking') {
      setPulseIntensity(0)
      return
    }
    const interval = setInterval(() => {
      setPulseIntensity(0.3 + Math.random() * 0.7)
    }, 100)
    return () => clearInterval(interval)
  }, [expressionState])

  return (
    <div className="relative w-full h-full">
      {/* Outer glow ring — driven by emotion config */}
      <div
        className="absolute inset-0 rounded-lg transition-all duration-700 pointer-events-none"
        style={{ boxShadow: `0 0 28px 4px ${config.glowColor}, 0 0 56px 8px ${config.glowColor.replace('0.', '0.0')}` }}
      />

      {/* Three.js canvas — fills the container */}
      <div className="w-full h-full rounded-lg overflow-hidden border border-white/10">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 100 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <ambientLight intensity={1.2} />
          <AvatarMesh
            key={imageUrl}
            imageUrl={imageUrl}
            expressionState={expressionState}
            pulseIntensity={pulseIntensity}
          />
        </Canvas>
      </div>
    </div>
  )
}
