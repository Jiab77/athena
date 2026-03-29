'use client'

import { useEffect, useRef } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WaveformRecorderProps {
  isRecording: boolean
  recordingTime: number
  maxDuration?: number
  onStop: () => void
}

export function WaveformRecorder({
  isRecording,
  recordingTime,
  maxDuration = 120,
  onStop,
}: WaveformRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isRecording) return

    const initAudioCapture = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
        
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64
        analyserRef.current = analyser
        
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        drawWaveform()
      } catch (error) {
        // ignore
      }
    }

    initAudioCapture()

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isRecording])

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw vertical bars (like WormGPT style)
    const barCount = 12
    const barWidth = 3
    const gap = 2
    const totalWidth = barCount * (barWidth + gap) - gap
    const startX = (canvas.width - totalWidth) / 2
    const maxBarHeight = canvas.height * 0.8

    for (let i = 0; i < barCount; i++) {
      // Sample from different parts of frequency data
      const dataIndex = Math.floor((i / barCount) * bufferLength)
      const value = dataArray[dataIndex] || 0
      const barHeight = Math.max(4, (value / 255) * maxBarHeight)
      
      const x = startX + i * (barWidth + gap)
      const y = (canvas.height - barHeight) / 2

      ctx.fillStyle = '#f97316' // orange-500 to match WormGPT
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 1.5)
      ctx.fill()
    }

    animationIdRef.current = requestAnimationFrame(drawWaveform)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatMaxTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Waveform pill with mic icon */}
      <div className="flex items-center gap-2 bg-orange-500/20 rounded-full px-3 py-1.5 border border-orange-500/40">
        <canvas
          ref={canvasRef}
          width={60}
          height={24}
          className="w-[60px] h-6"
        />
        <Mic className="h-4 w-4 text-orange-500" />
      </div>

      {/* Timer */}
      <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
        {formatTime(recordingTime)}<span className="text-muted-foreground/50">/{formatMaxTime(maxDuration)}</span>
      </span>

      {/* Volume indicator */}
      <Volume2 className="h-4 w-4 text-muted-foreground" />

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
