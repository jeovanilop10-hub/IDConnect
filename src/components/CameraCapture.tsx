import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Upload } from "lucide-react";

export default function CameraCapture({
  value,
  onCapture,
}: {
  value: string | null;
  onCapture: (base64: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (value) return; // already captured — don't keep the camera running
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
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
        setCameraError(null);
      } catch (err) {
        setCameraError(
          "No se pudo acceder a la cámara. Puedes subir una foto desde tu dispositivo en su lugar.",
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [value]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = dataUrl.split(",")[1] ?? dataUrl;
    onCapture(base64);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? result;
      onCapture(base64);
    };
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="flex flex-col items-center gap-3">
        <img
          src={`data:image/jpeg;base64,${value}`}
          alt="Foto capturada"
          className="w-full max-w-64 aspect-square object-cover rounded-lg border border-border"
        />
        <button
          type="button"
          onClick={() => onCapture(null)}
          className="flex items-center gap-1.5 text-sm border border-border px-3 py-1.5 rounded-lg text-muted hover:text-ink transition-colors"
        >
          <RotateCcw size={14} />
          Tomar otra foto
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-64 aspect-square rounded-lg border border-border bg-surface-alt overflow-hidden flex items-center justify-center">
        {cameraError ? (
          <p className="text-muted text-xs text-center px-4">{cameraError}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {!cameraError && cameraReady && (
        <button
          type="button"
          onClick={handleCapture}
          className="flex items-center gap-1.5 bg-brand text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-dim transition-colors text-sm"
        >
          <Camera size={16} />
          Tomar foto
        </button>
      )}

      <label className="flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer transition-colors">
        <Upload size={13} />
        {cameraError ? "Subir una foto" : "o sube una foto en su lugar"}
        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </label>
    </div>
  );
}
