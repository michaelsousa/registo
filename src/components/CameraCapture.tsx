import { useEffect } from "react";
import { useCamera } from "@/hooks/useCamera";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (photoUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const { videoRef, photo, error, active, startCamera, capturePhoto, stopCamera } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const url = capturePhoto();
    if (url) onCapture(url);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Camera className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-destructive text-sm text-center">{error}</p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    );
  }

  if (photo) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-success shadow-lg">
          <img src={photo} alt="Foto capturada" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-2 text-success text-sm font-medium">
          <Check className="w-4 h-4" />
          Foto capturada com sucesso
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-primary shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {active && (
          <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-ring pointer-events-none" />
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button size="sm" onClick={handleCapture} disabled={!active}>
          <Camera className="w-4 h-4 mr-1" /> Capturar
        </Button>
      </div>
    </div>
  );
}
