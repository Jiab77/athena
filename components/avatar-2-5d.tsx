'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import type { ExpressionState } from '@/lib/types'

// Plane geometry dimensions (units) — must match planeGeometry args below
const PLANE_W = 1.92
const PLANE_H = 2.64

/** Adjusts orthographic camera zoom so the plane fills the popup window */
function FullscreenCameraRig() {
  const { camera, gl } = useThree()

  useEffect(() => {
    function update() {
      if (!(camera instanceof THREE.OrthographicCamera)) return
      const w = gl.domElement.clientWidth  || window.innerWidth
      const h = gl.domElement.clientHeight || window.innerHeight
      const zoomW = w / PLANE_W
      const zoomH = h / PLANE_H
      camera.zoom = Math.min(zoomW, zoomH)
      camera.updateProjectionMatrix()
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [camera, gl])

  return null
}

// ─── Emotion config (shared with r3f-animated-character) ──────────────────────
const EMOTION_CONFIG: Record<string, {
  tint: [number, number, number]
  tintStrength: number
  glowColor: string
  breatheAmp: number
  breatheSpeed: number
  swayAmp: number
  swaySpeed: number
  bobAmp: number
  bobSpeed: number
  shakeAmp: number
  shakeSpeed: number
}> = {
  idle: {
    tint: [1.0, 1.0, 1.0], tintStrength: 0.0,
    glowColor: 'rgba(139,92,246,0.35)',
    breatheAmp: 0.012, breatheSpeed: 0.6,
    swayAmp: 0.008, swaySpeed: 0.4,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  listening: {
    tint: [0.6, 0.8, 1.0], tintStrength: 0.08,
    glowColor: 'rgba(59,130,246,0.55)',
    breatheAmp: 0.014, breatheSpeed: 0.8,
    swayAmp: 0.012, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thinking: {
    tint: [0.7, 0.6, 1.0], tintStrength: 0.1,
    glowColor: 'rgba(168,85,247,0.55)',
    breatheAmp: 0.008, breatheSpeed: 0.4,
    swayAmp: 0.02, swaySpeed: 0.3,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  speaking: {
    tint: [0.7, 1.0, 0.75], tintStrength: 0.07,
    glowColor: 'rgba(34,197,94,0.5)',
    breatheAmp: 0.018, breatheSpeed: 1.4,
    swayAmp: 0.01, swaySpeed: 0.6,
    bobAmp: 0.008, bobSpeed: 2.2,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  happy: {
    tint: [1.0, 0.92, 0.5], tintStrength: 0.12,
    glowColor: 'rgba(250,204,21,0.65)',
    breatheAmp: 0.022, breatheSpeed: 1.6,
    swayAmp: 0.018, swaySpeed: 1.2,
    bobAmp: 0.018, bobSpeed: 2.4,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  sad: {
    tint: [0.55, 0.65, 0.9], tintStrength: 0.15,
    glowColor: 'rgba(100,116,139,0.4)',
    breatheAmp: 0.006, breatheSpeed: 0.25,
    swayAmp: 0.005, swaySpeed: 0.2,
    bobAmp: -0.025, bobSpeed: 0.18,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  angry: {
    tint: [1.0, 0.45, 0.45], tintStrength: 0.18,
    glowColor: 'rgba(239,68,68,0.65)',
    breatheAmp: 0.02, breatheSpeed: 2.0,
    swayAmp: 0.006, swaySpeed: 0.5,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.028, shakeSpeed: 18.0,
  },
  surprised: {
    tint: [1.0, 0.75, 0.4], tintStrength: 0.14,
    glowColor: 'rgba(249,115,22,0.65)',
    breatheAmp: 0.028, breatheSpeed: 3.0,
    swayAmp: 0.0, swaySpeed: 0.0,
    bobAmp: 0.03, bobSpeed: 3.5,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
  thoughtful: {
    tint: [0.6, 0.7, 1.0], tintStrength: 0.09,
    glowColor: 'rgba(99,102,241,0.5)',
    breatheAmp: 0.01, breatheSpeed: 0.5,
    swayAmp: 0.025, swaySpeed: 0.35,
    bobAmp: 0.0, bobSpeed: 0.0,
    shakeAmp: 0.0, shakeSpeed: 0.0,
  },
}

// ─── GLSL shaders ─────────────────────────────────────────────────────────────
// The vertex shader displaces each vertex in Z based on a luminance-derived
// depth proxy. Bright areas (face, highlights) protrude toward the camera;
// dark areas (hair, background edges) recede. The mouse tilt uniform then
// shifts the UV sampling position, creating the parallax illusion.

const vertexShader = `
  uniform float uDepthStrength;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;

    // Geometric depth proxy: center of the face (UV ~0.5, 0.4) protrudes,
    // edges recede — creates a convex dome shape that approximates face curvature.
    // This avoids texture sampling in the vertex shader which is unreliable in WebGL 1.
    vec2 centered = uv - vec2(0.5, 0.42);
    float radial = 1.0 - smoothstep(0.0, 0.55, length(centered));
    float depth = radial * uDepthStrength;
    vDepth = depth;

    vec3 displaced = position + vec3(0.0, 0.0, depth);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec3 uTint;
  uniform float uTintStrength;
  uniform float uBrightnessPulse;
  uniform vec2 uParallaxOffset;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    // Parallax UV shift — scale offset by depth so foreground layers move more
    // Clamp strictly to [0.02, 0.98] to avoid sampling edge artifacts on JPEGs
    vec2 parallaxUv = vUv + uParallaxOffset * (vDepth * 0.5 + 0.2);
    parallaxUv = clamp(parallaxUv, 0.02, 0.98);

    vec4 texColor = texture2D(uTexture, parallaxUv);

    // Emotion tint
    vec3 tinted = mix(texColor.rgb, texColor.rgb * uTint, uTintStrength);

    // Soft vignette
    float vignette = smoothstep(0.0, 0.5, 1.0 - length(vUv - 0.5) * 1.2);
    tinted *= mix(0.88, 1.0, vignette);

    // Brightness pulse for speaking
    tinted += uBrightnessPulse * 0.15;

    gl_FragColor = vec4(tinted, texColor.a);
  }
`

// ─── Inner mesh component ─────────────────────────────────────────────────────

function AvatarMesh25D({
  imageUrl,
  expressionState,
  pulseIntensity,
  parallaxTarget,
}: {
  imageUrl: string
  expressionState: ExpressionState
  pulseIntensity: number
  parallaxTarget: THREE.Vector2
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const texture = useLoader(TextureLoader, imageUrl)

  useEffect(() => {
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false
    texture.anisotropy = 16
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
  }, [texture, imageUrl])

  const config = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

  const lerpRef = useRef({
    tint: new THREE.Vector3(...config.tint),
    tintStrength: config.tintStrength,
    parallax: new THREE.Vector2(0, 0),
  })

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uTint: { value: new THREE.Vector3(...config.tint) },
    uTintStrength: { value: config.tintStrength },
    uBrightnessPulse: { value: 0 },
    uParallaxOffset: { value: new THREE.Vector2(0, 0) },
    uDepthStrength: { value: 0.12 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [texture])

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

    // Lerp shader uniforms
    u.uTint.value.lerp(t.tint, lerpSpeed)
    u.uTintStrength.value = THREE.MathUtils.lerp(u.uTintStrength.value, t.tintStrength, lerpSpeed)
    u.uBrightnessPulse.value = THREE.MathUtils.lerp(u.uBrightnessPulse.value, pulseIntensity, lerpSpeed * 3)

    // Lerp parallax offset toward mouse target
    t.parallax.lerp(parallaxTarget, lerpSpeed * 4)
    u.uParallaxOffset.value.copy(t.parallax)

    if (!meshRef.current) return
    const c = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

    const breathe = Math.sin(time * c.breatheSpeed) * c.breatheAmp
    const sway = Math.sin(time * c.swaySpeed) * c.swayAmp
    const bob = c.bobAmp !== 0 ? Math.sin(time * c.bobSpeed) * Math.abs(c.bobAmp) * Math.sign(c.bobAmp) : 0
    const shake = c.shakeAmp !== 0 ? Math.sin(time * c.shakeSpeed) * c.shakeAmp : 0

    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, breathe + bob, lerpSpeed * 2)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, shake, lerpSpeed * 2)
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -sway, lerpSpeed * 2)
  })

  return (
    <mesh ref={meshRef}>
      {/* Higher subdivision for smoother depth displacement */}
      <planeGeometry args={[1.92, 2.64, 64, 96]} />
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

interface Avatar25DProps {
  imageUrl: string
  name: string
  expressionState?: ExpressionState
  isOnline?: boolean
  hideStatus?: boolean
  fullscreen?: boolean
}

export function Avatar25D({
  imageUrl,
  name,
  expressionState = 'idle',
  isOnline = true,
  hideStatus = false,
  fullscreen = false,
}: Avatar25DProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0)
  const parallaxTargetRef = useRef(new THREE.Vector2(0, 0))
  const [parallaxTarget, setParallaxTarget] = useState(() => new THREE.Vector2(0, 0))
  const containerRef = useRef<HTMLDivElement>(null)
  const config = EMOTION_CONFIG[expressionState] ?? EMOTION_CONFIG.idle

  // Speaking pulse
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

  // Mouse parallax — normalize to [-0.04, 0.04] range
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const nx = (e.clientX - cx) / (rect.width / 2)   // -1 to 1
    const ny = (e.clientY - cy) / (rect.height / 2)  // -1 to 1
    const PARALLAX_STRENGTH = 0.04
    parallaxTargetRef.current.set(nx * PARALLAX_STRENGTH, -ny * PARALLAX_STRENGTH)
    setParallaxTarget(new THREE.Vector2(nx * PARALLAX_STRENGTH, -ny * PARALLAX_STRENGTH))
  }, [])

  const handleMouseLeave = useCallback(() => {
    parallaxTargetRef.current.set(0, 0)
    setParallaxTarget(new THREE.Vector2(0, 0))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseMove, handleMouseLeave])

  // Device tilt parallax (mobile)
  useEffect(() => {
    const TILT_STRENGTH = 0.03
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const nx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30))
      const ny = Math.max(-1, Math.min(1, (e.beta ?? 0) / 30))
      setParallaxTarget(new THREE.Vector2(nx * TILT_STRENGTH, -ny * TILT_STRENGTH))
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`${fullscreen ? 'absolute inset-0' : 'relative w-full h-full'} cursor-default`}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-lg transition-all duration-700 pointer-events-none"
        style={{ boxShadow: `0 0 28px 4px ${config.glowColor}, 0 0 56px 8px ${config.glowColor.replace('0.', '0.0')}` }}
      />

      {/* Three.js canvas */}
      <div className={fullscreen ? 'absolute inset-0 overflow-hidden' : 'w-full h-full rounded-lg overflow-hidden border border-white/10'}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: fullscreen ? 1 : 100 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          {fullscreen && <FullscreenCameraRig />}
          <ambientLight intensity={1.2} />
          <AvatarMesh25D
            key={imageUrl}
            imageUrl={imageUrl}
            expressionState={expressionState}
            pulseIntensity={pulseIntensity}
            parallaxTarget={parallaxTarget}
          />
        </Canvas>
      </div>

    </div>
  )
}
