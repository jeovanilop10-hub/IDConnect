import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { PHOTO_ASPECT, cropToBase64, fileToBase64 } from "../lib/image";

const COUNTDOWN_SECONDS = 3;

/**
 * Photo capture for a card: live camera inside a 3:4 frame with a face guide,
 * a short countdown so the person can pose, and an upload fallback. The saved
 * photo is the same crop the frame shows, scaled down for the request.
 */
export default function CameraCapture({
  value,
  onCapture,
}: {
  value: string | null;
  onCapture: (base64: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (value) return; // already captured — don't keep the camera running
    let cancelled = false;
    setCameraReady(false);
    setCameraError(null);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch {
        if (!cancelled) {
          setCameraError(
            "No pudimos usar la cámara. Revisa que el navegador tenga permiso para usarla, o sube una foto desde tu dispositivo.",
          );
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [value, attempt]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      takePhoto();
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    onCapture(cropToBase64(video, video.videoWidth, video.videoHeight, PHOTO_ASPECT));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      onCapture(await fileToBase64(file, PHOTO_ASPECT));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo leer la imagen.");
    }
  }

  const frameClass =
    "relative w-full max-w-[17rem] aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-surface-alt";

  const uploadLink = (
    <label className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink cursor-pointer transition-colors py-2">
      <Upload size={15} />
      {cameraError ? "Subir una foto" : "Prefiero subir una foto"}
      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </label>
  );

  if (value) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className={frameClass}>
          <img src={`data:image/jpeg;base64,${value}`} alt="Foto capturada" className="w-full h-full object-cover" />
          {flash && <div className="absolute inset-0 bg-white/80" />}
        </div>
        <p className="text-sm text-muted text-center max-w-xs">
          ¿Se ve bien tu rostro, centrado y sin sombras? Si no, repítela.
        </p>
        <button
          type="button"
          onClick={() => onCapture(null)}
          className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-full text-sm font-medium text-ink hover:bg-surface-alt transition-colors"
        >
          <RotateCcw size={15} />
          Repetir foto
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={frameClass}>
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
            <Camera size={28} className="text-muted" />
            <p className="text-muted text-sm">{cameraError}</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink border border-border px-4 py-2 rounded-full hover:bg-surface transition-colors"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {/* Face guide: an oval at the usual head position on an ID photo. */}
            <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
              <defs>
                <mask id="face-guide">
                  <rect width="300" height="400" fill="white" />
                  <ellipse cx="150" cy="175" rx="92" ry="122" fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(2,15,10,0.35)" mask="url(#face-guide)" />
              <ellipse
                cx="150"
                cy="175"
                rx="92"
                ry="122"
                fill="none"
                stroke="white"
                strokeOpacity="0.9"
                strokeWidth="2.5"
                strokeDasharray="8 7"
              />
            </svg>
            {!cameraReady && (
              <p className="absolute inset-x-0 bottom-4 text-center text-white text-sm">Encendiendo la cámara…</p>
            )}
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-bold text-white text-7xl drop-shadow-lg" aria-live="assertive">
                  {countdown}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {!cameraError && (
        <>
          <p className="text-sm text-muted text-center max-w-xs">
            Coloca tu rostro dentro del óvalo, mira a la cámara y quítate lentes oscuros o gorra.
          </p>
          <button
            type="button"
            onClick={() => setCountdown(COUNTDOWN_SECONDS)}
            disabled={!cameraReady || countdown !== null}
            className="inline-flex items-center gap-2 bg-brand text-white font-display font-semibold px-6 py-3 rounded-full hover:bg-brand-dim transition-colors disabled:opacity-50"
          >
            <Camera size={18} />
            {countdown !== null ? "Prepárate…" : "Tomar foto"}
          </button>
        </>
      )}

      {uploadLink}
      {uploadError && <p className="text-danger text-sm">{uploadError}</p>}
    </div>
  );
}
