import { useCallback, useRef } from 'react'

// Generates sounds via Web Audio API — no audio files needed.
// Each call gets its own AudioContext to avoid state issues between sounds.

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  freqEnd?: number,
) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration)
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    // Close context after sound finishes to free resources
    osc.onended = () => void ctx.close()
  } catch {
    // AudioContext unavailable (e.g. SSR or sandboxed env) — fail silently
  }
}

export function useSounds() {
  const mutedRef = useRef(false)

  const playSelect = useCallback(() => {
    if (mutedRef.current) return
    playTone(880, 0.08, 'sine', 0.15)
  }, [])

  const playPour = useCallback(() => {
    if (mutedRef.current) return
    // Descending sweep — sounds like liquid dropping
    playTone(600, 0.3, 'sine', 0.2, 300)
  }, [])

  const playInvalid = useCallback(() => {
    if (mutedRef.current) return
    // Short buzz
    playTone(180, 0.15, 'square', 0.1)
  }, [])

  const playComplete = useCallback(() => {
    if (mutedRef.current) return
    // Ascending arpeggio: C E G C
    const notes = [262, 330, 392, 524]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.2), i * 120)
    })
  }, [])

  function toggleMute() {
    mutedRef.current = !mutedRef.current
    return mutedRef.current
  }

  function isMuted() {
    return mutedRef.current
  }

  return { playSelect, playPour, playInvalid, playComplete, toggleMute, isMuted }
}
