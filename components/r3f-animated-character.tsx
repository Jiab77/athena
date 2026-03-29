'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import type { ExpressionState } from '@/lib/types'

// ─── Emotion config ────────────────────────────────────────────────────────────
const EMOTION_CONFIG: Record<string, {
  tint: [number, number, number]
  tintStrength: number
  glowColor: string
  // Mesh-level animation params (no UV distortion)
  breatheAmp: number    // Y translation — breathing up/down
  breatheSpeed: number  // breathing frequency
  swayAmp: number       // X rotation — gentle side tilt
  swaySpeed: number     // sway frequency
  bobAmp: number        // Y translation secondary — bounce/sink
  bobSpeed: number      // bob frequency
  shakeAmp: number      // X translation — horizontal shake (angry)
  shakeSpeed: number    // shake frequency
}> = {
  idle: {
    tint: [1.0, 1.0, 1.0],
    tintStrength: 0.0,
    glowColor: 'rgba(139,92,246,0.35)',
    breatheAmp: 0.012, breatheSpeed: 0.6,
    swayAmp: 0.008, swaySpeed: 0.4,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  listening: {
    tint: [0.6, 0.8, 1.0],
    tintStrength: 0.08,
    glowColor: 'rgba(59,130,246,0.55)',
    breatheAmp: 0.014, breatheSpeed: 0.8,
    swayAmp: 0.012, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thinking: {
    tint: [0.7, 0.6, 1.0],
    tintStrength: 0.1,
    glowColor: 'rgba(168,85,247,0.55)',
    breatheAmp: 0.008, breatheSpeed: 0.4,
    swayAmp: 0.02, swaySpeed: 0.3,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  speaking: {
    tint: [0.7, 1.0, 0.75],
    tintStrength: 0.07,
    glowColor: 'rgba(34,197,94,0.5)',
    breatheAmp: 0.018, breatheSpeed: 1.4,
    swayAmp: 0.01, swaySpeed: 0.6,
    bobAmp: 0.008, bobSpeed: 2.2,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  happy: {
    tint: [1.0, 0.92, 0.5],
    tintStrength: 0.12,
    glowColor: 'rgba(250,204,21,0.65)',
    breatheAmp: 0.022, breatheSpeed: 1.6,
    swayAmp: 0.018, swaySpeed: 1.2,
    bobAmp: 0.018, bobSpeed: 2.4,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  sad: {
    tint: [0.55, 0.65, 0.9],
    tintStrength: 0.15,
    glowColor: 'rgba(100,116,139,0.4)',
    breatheAmp: 0.006, breatheSpeed: 0.25,
    swayAmp: 0.005, swaySpeed: 0.2,
    bobAmp: -0.025, bobSpeed: 0.18,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  angry: {
    tint: [1.0, 0.45, 0.45],
    tintStrength: 0.18,
    glowColor: 'rgba(239,68,68,0.65)',
    breatheAmp: 0.02, breatheSpeed: 2.0,
    swayAmp: 0.006, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.028, shakeSpeed: 18.0,
  },
  surprised: {
    tint: [1.0, 0.75, 0.4],
    tintStrength: 0.14,
    glowColor: 'rgba(249,115,22,0.65)',
    breatheAmp: 0.028, breatheSpeed: 3.0,
    swayAmp: 0.0, swaySpeed: 0.0,
    bobAmp: 0.03, bobSpeed: 3.5,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thoughtful: {
    tint: [0.6, 0.7, 1.0],
    tintStrength: 0.09,
    glowColor: 'rgba(99,102,241,0.5)',
    breatheAmp: 0.01, breatheSpeed: 0.5,
    swayAmp: 0.025, swaySpeed: 0.35,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
}

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

  useEffect(() => {
    console.log('[R3FAvatar] AvatarMesh mounted — imageUrl:', imageUrl)
    return () => console.log('[R3FAvatar] AvatarMesh unmounted — imageUrl:', imageUrl)
  }, [imageUrl])

  // Ensure crisp texture — no mipmapping, max anisotropy
  useEffect(() => {
    console.log('[R3FAvatar] Texture loaded — size:', texture.image?.width, 'x', texture.image?.height, 'url:', imageUrl)
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
    console.log('[R3FAvatar] Expression changed:', expressionState)
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

// ─── Status indicator config ──────────────────────────────────────────────────

function getStatusText(expressionState: ExpressionState, isOnline: boolean): string {
  if (!isOnline) return 'Offline'
  switch (expressionState) {
    case 'listening':   return 'Listening...'
    case 'thinking':    return 'Thinking...'
    case 'speaking':    return 'Speaking...'
    case 'happy':       return 'Happy'
    case 'sad':         return 'Sad'
    case 'angry':       return 'Frustrated'
    case 'surprised':   return 'Surprised'
    case 'thoughtful':  return 'Thoughtful'
    default:            return 'Online'
  }
}

function getStatusDotColor(expressionState: ExpressionState, isOnline: boolean): string {
  if (!isOnline) return 'bg-gray-500'
  switch (expressionState) {
    case 'listening':   return 'bg-blue-500'
    case 'thinking':    return 'bg-purple-500'
    case 'speaking':    return 'bg-green-500'
    case 'happy':       return 'bg-yellow-400'
    case 'sad':         return 'bg-slate-400'
    case 'angry':       return 'bg-red-500'
    case 'surprised':   return 'bg-orange-400'
    case 'thoughtful':  return 'bg-indigo-400'
    default:            return 'bg-green-500'
  }
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
  isOnline = true,
}: R3FAnimatedCharacterProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)
  const config = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

  useEffect(() => {
    console.log('[R3FAvatar] Component mounted — imageUrl:', imageUrl, 'expression:', expressionState, 'isOnline:', isOnline)
    return () => console.log('[R3FAvatar] Component unmounted')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    console.log('[R3FAvatar] imageUrl changed to:', imageUrl)
  }, [imageUrl])

  // Speaking pulse feeds into brightness shader uniform
  useEffect(() => {
    if (expressionState !== 'speaking') {
      setPulseIntensity(0)
      return
    }
    console.log('[R3FAvatar] Speaking pulse started')
    const interval = setInterval(() => {
      setPulseIntensity(0.3 + Math.random() * 0.7)
    }, 100)
    return () => {
      console.log('[R3FAvatar] Speaking pulse stopped')
      clearInterval(interval)
    }
  }, [expressionState])

  return (
    <div className="relative w-48" style={{ height: '264px' }}>
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
          style={{ background: 'transparent' }}
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

      {/* Status indicator badge */}
      <div className="absolute bottom-1 right-1 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50 shadow-md">
        <div
          className={`h-2 w-2 rounded-full ${getStatusDotColor(expressionState, isOnline)} ${
            expressionState !== 'idle' && isOnline ? 'animate-pulse' : ''
          }`}
        />
        <span className="text-xs font-medium text-foreground">
          {getStatusText(expressionState, isOnline)}
        </span>
      </div>
    </div>
  )
}
