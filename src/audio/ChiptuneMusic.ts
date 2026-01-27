// XM tracker music player using chiptune3 (libopenmpt)
//
// MUSIC ATTRIBUTION:
// All music tracks by Drozerix - Released to Public Domain
// https://modarchive.org/member.php?84702
//
// Tracks used:
// - cabin_fever.xm (Level 1) - https://modarchive.org/module.php?174833
// - chip_overture.xm (Level 2) - https://modarchive.org/module.php?172185
// - augmented_emotions.xm (Level 3) - https://modarchive.org/module.php?172184

import { ChiptuneJsPlayer } from 'chiptune3'

// Map level numbers to .xm file paths
const LEVEL_TRACKS: Record<number, string> = {
  1: './music/cabin_fever.xm',      // Upbeat adventure (rated 9/10)
  2: './music/chip_overture.xm',    // Mid-game exploration (rated 7/10)
  3: './music/augmented_emotions.xm', // Boss battle (rated 8/10)
}

export class ChiptuneMusic {
  private player: ChiptuneJsPlayer | null = null
  private isPlaying = false
  private currentLevel = 0
  private volume = 0.5
  private initialized = false
  private pendingPlay: number | null = null

  constructor() {}

  private initPlayer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.player && this.initialized) {
        resolve()
        return
      }

      this.player = new ChiptuneJsPlayer({
        repeatCount: -1, // Loop forever
      })

      this.player.onInitialized(() => {
        this.initialized = true
        if (this.player) {
          this.player.setVol(this.volume)
        }
        resolve()

        // If there was a pending play request, execute it now
        if (this.pendingPlay !== null) {
          const level = this.pendingPlay
          this.pendingPlay = null
          this.playTrack(level)
        }
      })

      this.player.onEnded(() => {
        // Track ended (shouldn't happen with repeatCount -1)
        this.isPlaying = false
      })

      this.player.onError((err: { type: string }) => {
        console.error('Chiptune player error:', err.type)
      })
    })
  }

  private playTrack(level: number) {
    if (!this.player || !this.initialized) return

    const trackPath = LEVEL_TRACKS[level] || LEVEL_TRACKS[1]
    this.player.load(trackPath)
    this.isPlaying = true
    this.currentLevel = level
  }

  play(level: number) {
    // If already playing the same level, don't restart
    if (this.isPlaying && this.currentLevel === level) return

    // Stop current playback
    this.stop()

    if (!this.player || !this.initialized) {
      // Queue the play request for after initialization
      this.pendingPlay = level
      this.initPlayer()
      return
    }

    this.playTrack(level)
  }

  stop() {
    this.isPlaying = false
    this.pendingPlay = null
    if (this.player && this.initialized) {
      this.player.stop()
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.player) {
      this.player.setVol(this.volume)
    }
  }

  getVolume(): number {
    return this.volume
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }

  getCurrentLevel(): number {
    return this.currentLevel
  }

  destroy() {
    this.stop()
    // ChiptuneJsPlayer doesn't have a destroy method, but stopping is sufficient
    this.player = null
    this.initialized = false
  }
}
