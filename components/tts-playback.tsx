'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AudioControls } from '@/lib/types'

interface TTSPlaybackProps {
  isPlaying: boolean
  audioControls: AudioControls | null
  onStop: () => void
}

export function TTSPlayback({ isPlaying, audioControls, onStop }: TTSPlaybackProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying || !audioControls) return

    // Update duration once available
    const checkDuration = setInterval(() => {
      const dur = audioControls.getDuration()
      if (dur > 0 && !isNaN(dur)) {
        setDuration(dur)
        clearInterval(checkDuration)
      }
    }, 100)

    // Track playback progress
    const progressInterval = setInterval(() => {
      const time = audioControls.getCurrentTime()
      setCurrentTime(time)
    }, 100)

    // Start waveform animation
    drawWaveform()

    return () => {
      clearInterval(checkDuration)
      clearInterval(progressInterval)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [isPlaying, audioControls])

  const drawWaveform = () => {
    if (!canvasRef.current || !audioControls) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = audioControls.getAnalyser()
    
    if (analyser) {
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw vertical bars (matching WaveformRecorder style)
      const barCount = 12
      const barWidth = 3
      const gap = 2
      const totalWidth = barCount * (barWidth + gap) - gap
      const startX = (canvas.width - totalWidth) / 2
      const maxBarHeight = canvas.height * 0.8

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const value = dataArray[dataIndex] || 0
        const barHeight = Math.max(4, (value / 255) * maxBarHeight)
        
        const x = startX + i * (barWidth + gap)
        const y = (canvas.height - barHeight) / 2

        ctx.fillStyle = '#3b82f6' // blue-500 for playback (different from orange recording)
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 1.5)
        ctx.fill()
      }
    } else {
      // Fallback: draw static bars if analyser not available
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barCount = 12
      const barWidth = 3
      const gap = 2
      const totalWidth = barCount * (barWidth + gap) - gap
      const startX = (canvas.width - totalWidth) / 2

      for (let i = 0; i < barCount; i++) {
        const barHeight = 4 + Math.sin(Date.now() / 200 + i) * 8
        const x = startX + i * (barWidth + gap)
        const y = (canvas.height - barHeight) / 2

        ctx.fillStyle = '#3b82f6'
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, Math.max(4, barHeight), 1.5)
        ctx.fill()
      }
    }

    animationIdRef.current = requestAnimationFrame(drawWaveform)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isPlaying) return null

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Waveform pill with volume icon */}
      <div className="flex items-center gap-2 bg-blue-500/20 rounded-full px-3 py-1.5 border border-blue-500/40">
        <canvas
          ref={canvasRef}
          width={60}
          height={24}
          className="w-[60px] h-6"
        />
        <Volume2 className="h-4 w-4 text-blue-500" />
      </div>

      {/* Timer */}
      <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
        {formatTime(currentTime)}<span className="text-muted-foreground/50">/{formatTime(duration)}</span>
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stop button */}
      <Button
        size="sm"
        onClick={onStop}
        className="cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full px-4"
      >
        Stop
      </Button>
    </div>
  )
}
