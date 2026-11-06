import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, RotateCcw, Upload } from 'lucide-react';
import Button from './Button';

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function CameraCapture({ capturedPreviewUrl, onCapture, onRetake, disabled = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (capturedPreviewUrl) {
      stopStream(streamRef.current);
      streamRef.current = null;
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Cet appareil ne permet pas l'acces direct a la camera. Utilisez l'import de photo.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError('');
        setIsStreaming(true);
      } catch {
        if (cancelled) return;
        setCameraError("Camera inaccessible (autorisation refusee ou absente). Utilisez l'import de photo ci-dessous.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [capturedPreviewUrl]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.92
    );
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!acceptedTypes.includes(file.type)) return;

    onCapture(file, URL.createObjectURL(file));
  };

  return (
    <div className="space-y-4">
      <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-[24px] border-2 border-[#0C4A6E]/30 bg-[#0F172A]">
        {capturedPreviewUrl ? (
          <img src={capturedPreviewUrl} alt="Selfie capture" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover"
          />
        )}

        {!capturedPreviewUrl && (
          <>
            <div className="pointer-events-none absolute inset-6 rounded-[20px] border-2 border-dashed border-white/40" />
            {isStreaming && (
              <motion.div
                initial={{ y: '-10%' }}
                animate={{ y: '110%' }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                className="pointer-events-none absolute inset-x-6 h-1 bg-[#38BDF8] shadow-[0_0_12px_2px_rgba(56,189,248,0.8)]"
              />
            )}
            {!isStreaming && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/60">
                <p className="text-sm text-white/80">Activation de la camera...</p>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0F172A]/90 px-6 text-center">
                <AlertTriangle className="h-8 w-8 text-[#F59E0B]" />
                <p className="text-sm text-white/90">{cameraError}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {capturedPreviewUrl ? (
          <Button variant="secondary" size="large" className="w-full" icon={RotateCcw} onClick={onRetake} disabled={disabled}>
            Reprendre la photo
          </Button>
        ) : (
          <Button
            variant="primary"
            size="large"
            className="w-full"
            icon={Camera}
            onClick={handleCapture}
            disabled={disabled || !isStreaming}
          >
            Capturer le visage
          </Button>
        )}
        {!capturedPreviewUrl && (
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0C4A6E] hover:bg-[#F8FAFC] sm:w-auto">
            <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} disabled={disabled} />
            <Upload className="h-4 w-4 flex-shrink-0" />
            Importer
          </label>
        )}
      </div>
    </div>
  );
}

export default CameraCapture;
