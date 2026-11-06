import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertTriangle } from 'lucide-react';

function QrScanner({ active, onDecode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return undefined;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    let cancelled = false;
    let detector = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    async function scanFrame() {
      if (cancelled) return;
      const video = videoRef.current;

      if (video && video.videoWidth) {
        try {
          let text = null;

          if (detector) {
            const results = await detector.detect(video);
            text = results?.[0]?.rawValue || null;
          } else {
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            text = result?.data || null;
          }

          if (text && !cancelled) {
            onDecode(text);
            return;
          }
        } catch {
          // Ignore single-frame decode errors, keep scanning.
        }
      }

      if (!cancelled) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError('');
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch {
        if (!cancelled) {
          setError("Impossible d'acceder a la camera pour scanner le QR. Verifiez les autorisations.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-[24px] border-2 border-[#0C4A6E]/30 bg-[#0F172A]">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-dashed border-white/50" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0F172A]/90 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-[#F59E0B]" />
          <p className="text-sm text-white/90">{error}</p>
        </div>
      )}
    </div>
  );
}

export default QrScanner;
