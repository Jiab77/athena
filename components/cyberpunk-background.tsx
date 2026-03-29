'use client'

export function CyberpunkBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Layer 1: AI-generated cyberpunk city background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/cyberpunk-bg.jpg)',
        }}
      />

      {/* Layer 2: Dark gradient overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.6) 70%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      />

      {/* Layer 3: Subtle neon grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(168, 85, 247, 0.15) 25%, rgba(168, 85, 247, 0.15) 26%, transparent 27%, transparent 74%, rgba(168, 85, 247, 0.15) 75%, rgba(168, 85, 247, 0.15) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(168, 85, 247, 0.15) 25%, rgba(168, 85, 247, 0.15) 26%, transparent 27%, transparent 74%, rgba(168, 85, 247, 0.15) 75%, rgba(168, 85, 247, 0.15) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  )
}
