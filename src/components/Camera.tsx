import { useRef, useState, useEffect } from 'react'

interface Props {
  onCapture: (imageDataUrl: string, description?: string) => void
}

export default function Camera({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      stopStream()
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        })
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
        setError(null)
      } catch {
        if (!cancelled) {
          setError('Camera access denied. Please allow camera permissions.')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video) return

    // Cap at 1024px on longest side — enough for food recognition, much smaller payload
    const { videoWidth: vw, videoHeight: vh } = video
    const MAX = 1024
    let w = vw, h = vh
    if (w > MAX || h > MAX) {
      const scale = MAX / Math.max(w, h)
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    stopStream()
    onCapture(dataUrl, description || undefined)
  }

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = () => {
      // Resize uploaded images same as camera captures
      const MAX = 1024
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      stopStream()
      onCapture(dataUrl, description || undefined)
    }
    img.src = URL.createObjectURL(file)
  }

  const retry = () => {
    stopStream()
    setError(null)
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
    }).then((mediaStream) => {
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    }).catch(() => {
      setError('Camera access denied. Please allow camera permissions.')
    })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-gray-600">{error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary text-white rounded-full font-medium text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full bg-black">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 object-cover"
      />

      {/* Controls area - raised above bottom nav */}
      <div className="absolute bottom-20 left-0 right-0 bg-black/70 backdrop-blur-sm px-4 pt-3 pb-4 flex flex-col gap-3 rounded-t-2xl">
        {/* Text input */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you eating? (optional)"
          className="w-full px-4 py-2.5 bg-white/10 text-white placeholder-gray-400 rounded-full text-sm border border-white/20 focus:outline-none focus:border-white/50"
        />

        {/* Action buttons row */}
        <div className="flex items-center justify-center gap-8">
          {/* Upload button */}
          <button
            onClick={handleUpload}
            className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Upload photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>

          {/* Capture button */}
          <button
            onClick={capture}
            className="w-18 h-18 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-95 transition-transform"
            aria-label="Take photo"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-gray-50" />
          </button>

          {/* Spacer to balance layout */}
          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  )
}
