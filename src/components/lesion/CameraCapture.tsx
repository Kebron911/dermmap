import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, SwitchCamera, ZoomIn, ZoomOut, FlipHorizontal2, Download } from 'lucide-react';
import clsx from 'clsx';

interface CameraCaptureProps {
  onCapture: (photo: { url: string; type: 'clinical' | 'dermoscopic' }) => void;
  onClose: () => void;
  defaultType?: 'clinical' | 'dermoscopic';
}

export function CameraCapture({ onCapture, onClose, defaultType = 'clinical' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'clinical' | 'dermoscopic'>(defaultType);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch {
      setError('Camera access denied. Please allow camera permissions or use file upload.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    if (zoom > 1) {
      const w = video.videoWidth / zoom;
      const h = video.videoHeight / zoom;
      const sx = (video.videoWidth - w) / 2;
      const sy = (video.videoHeight - h) / 2;
      ctx.drawImage(video, sx, sy, w, h, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    // Add metadata overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `${photoType === 'dermoscopic' ? '🔬 Dermoscopic' : '📷 Clinical'} | ${new Date().toLocaleString()}`,
      12,
      canvas.height - 14,
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);
  }, [zoom, photoType]);

  const handleTimedCapture = () => {
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirm = () => {
    if (captured) {
      onCapture({ url: captured, type: photoType });
      setCaptured(null);
    }
  };

  const handleRetake = () => {
    setCaptured(null);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6">
        <Camera size={48} className="text-slate-400 mb-4" />
        <p className="text-center mb-4">{error}</p>
        <div className="flex gap-3">
          <button onClick={startCamera} className="px-4 py-2 bg-teal-600 rounded-lg text-sm font-medium">
            Try Again
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80 z-10">
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
          <X size={22} />
        </button>
        <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
          <button
            onClick={() => setPhotoType('clinical')}
            className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition',
              photoType === 'clinical' ? 'bg-teal-600 text-white' : 'text-white/70')}
          >
            📷 Clinical
          </button>
          <button
            onClick={() => setPhotoType('dermoscopic')}
            className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold transition',
              photoType === 'dermoscopic' ? 'bg-purple-600 text-white' : 'text-white/70')}
          >
            🔬 Dermoscopic
          </button>
        </div>
        <button onClick={toggleCamera} className="p-2 text-white hover:bg-white/10 rounded-full">
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {!captured ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: `scale(${zoom})` }}
            />
            {/* Dermoscopic overlay guide */}
            {photoType === 'dermoscopic' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 rounded-full border-2 border-purple-400/60 border-dashed" />
                <div className="absolute bottom-20 text-center">
                  <span className="bg-purple-900/80 text-purple-200 px-3 py-1 rounded-full text-xs font-medium">
                    Align dermatoscope within circle
                  </span>
                </div>
              </div>
            )}
            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
              </div>
            )}
            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-px bg-white/30" />
              <div className="w-px h-8 bg-white/30 absolute" />
            </div>
          </>
        ) : (
          <img src={captured} alt="Captured" className="w-full h-full object-contain bg-black" />
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-4">
        {!captured ? (
          <div className="flex items-center justify-between">
            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(1, z - 0.5))}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                disabled={zoom <= 1}
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/60 text-xs font-mono w-8 text-center">{zoom}x</span>
              <button
                onClick={() => setZoom(z => Math.min(4, z + 0.5))}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                disabled={zoom >= 4}
              >
                <ZoomIn size={18} />
              </button>
            </div>

            {/* Shutter button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleTimedCapture}
                className="text-white/60 text-xs px-2 py-1 bg-white/10 rounded-lg hover:bg-white/20"
              >
                3s Timer
              </button>
              <button
                onClick={takePhoto}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
              <div className="w-16" /> {/* spacer */}
            </div>

            <div className="w-20" />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-5 py-3 bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-600"
            >
              <RotateCcw size={16} />
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-500"
            >
              <Check size={16} />
              Use Photo
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
