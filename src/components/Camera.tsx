import { useRef, useState, useCallback, useEffect } from 'react'

interface Props {
  onCapture: (imageDataUrl: string) => void
}

export default function Camera({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
    } catch {
      setError('Camera access denied. Please allow camera permissions.')
    }
  }, [stopStream])

  useEffect(() => {
    startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    stopStream()
    onCapture(dataUrl)
  }, [stopStream, onCapture])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-gray-600">{error}</p>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-primary text-white rounded-full font-medium text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 object-cover"
      />
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={capture}
          className="w-18 h-18 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-95 transition-transform"
          aria-label="Take photo"
        >
          <div className="w-full h-full rounded-full bg-white hover:bg-gray-50" />
        </button>
      </div>
    </div>
  )
}
