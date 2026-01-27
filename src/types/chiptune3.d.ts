// Type declarations for chiptune3 library
// https://github.com/DrSnuggles/chiptune

declare module 'chiptune3' {
  export interface ChiptuneJsConfig {
    /** -1 = play endless, 0 = play once, do not repeat */
    repeatCount?: number
    /** Stereo separation in percents */
    stereoSeparation?: number
    /** Interpolation filter setting */
    interpolationFilter?: number
    /** Custom AudioContext to use */
    context?: AudioContext
  }

  export interface ChiptuneMetadata {
    dur: number
    [key: string]: unknown
  }

  export interface ProgressData {
    pos: number
    order: number
    pattern: number
    row: number
  }

  export interface ErrorData {
    type: string
  }

  export class ChiptuneJsPlayer {
    meta?: ChiptuneMetadata
    duration?: number
    currentTime?: number
    order?: number
    pattern?: number
    row?: number

    constructor(cfg?: ChiptuneJsConfig)

    // Event handlers
    onInitialized(handler: () => void): void
    onEnded(handler: () => void): void
    onError(handler: (err: ErrorData) => void): void
    onMetadata(handler: (meta: ChiptuneMetadata) => void): void
    onProgress(handler: (data: ProgressData) => void): void

    // Playback control
    load(url: string): void
    play(arrayBuffer: ArrayBuffer): void
    stop(): void
    pause(): void
    unpause(): void
    togglePause(): void

    // Settings
    setRepeatCount(val: number): void
    setPitch(val: number): void
    setTempo(val: number): void
    setPos(val: number): void
    setOrderRow(order: number, row: number): void
    setVol(val: number): void
    selectSubsong(val: number): void

    // Compatibility aliases
    seek(val: number): void
    getCurrentTime(): number
  }
}
