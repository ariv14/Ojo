declare module 'msr' {
  interface MediaStreamRecorderInstance {
    start: (timeSlice?: number) => void
    stop: () => void
    ondataavailable: (blob: Blob) => void
    onstop: () => void
    mimeType: string
    blobs?: Blob[]
  }

  class MediaStreamRecorder implements MediaStreamRecorderInstance {
    constructor(mediaStream: MediaStream)
    start(timeSlice?: number): void
    stop(): void
    ondataavailable: (blob: Blob) => void
    onstop: () => void
    mimeType: string
    blobs?: Blob[]
  }

  export = MediaStreamRecorder
}
