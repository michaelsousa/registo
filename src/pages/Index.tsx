import { useState, useCallback } from "react";
import { MapPin, Fingerprint, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveClock } from "@/components/LiveClock";
import { CameraCapture } from "@/components/CameraCapture";
import { TimeEntryCard, TimeEntry } from "@/components/TimeEntryCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";

type Step = "idle" | "camera" | "processing";

const Index = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [pendingType, setPendingType] = useState<"entrada" | "saída">("entrada");
  const geo = useGeolocation();

  const nextType: "entrada" | "saída" =
    entries.length === 0 || entries[0].type === "saída" ? "entrada" : "saída";

  const handleStartPunch = useCallback(() => {
    setPendingType(nextType);
    geo.requestPosition();
    setStep("camera");
  }, [nextType, geo]);

  const handlePhotoCapture = useCallback(
    (photoUrl: string) => {
      setStep("processing");

      // simulate brief processing
      setTimeout(() => {
        if (!geo.position) {
          toast.error("Localização não disponível. Tente novamente.");
          setStep("idle");
          return;
        }

        const newEntry: TimeEntry = {
          id: crypto.randomUUID(),
          type: pendingType,
          timestamp: new Date(),
          latitude: geo.position.latitude,
          longitude: geo.position.longitude,
          photoUrl,
        };

        setEntries((prev) => [newEntry, ...prev]);
        toast.success(
          `${pendingType === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
        );
        setStep("idle");
      }, 1200);
    },
    [geo.position, pendingType]
  );

  const handleCancel = useCallback(() => {
    setStep("idle");
  }, []);

  const todayEntries = entries.filter(
    (e) => e.timestamp.toDateString() === new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-heading font-bold text-foreground">
            PontoFácil
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{todayEntries.length} registros hoje</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full gap-8">
        {/* Clock */}
        <LiveClock />

        {/* Punch area */}
        <div className="w-full glass rounded-2xl p-8 flex flex-col items-center gap-6">
          {step === "idle" && (
            <>
              <p className="text-muted-foreground text-sm">
                Próximo registro:{" "}
                <span
                  className={`font-semibold ${
                    nextType === "entrada" ? "text-success" : "text-destructive"
                  }`}
                >
                  {nextType.toUpperCase()}
                </span>
              </p>

              {/* Big punch button */}
              <button
                onClick={handleStartPunch}
                className="relative w-36 h-36 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group"
              >
                <Fingerprint className="w-16 h-16 group-hover:scale-110 transition-transform" />
                <span className="absolute inset-0 rounded-full border-4 border-primary/30 animate-pulse-ring" />
              </button>

              <p className="text-xs text-muted-foreground">
                Toque para registrar com foto e localização
              </p>

              {/* GPS Status */}
              {geo.position && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <MapPin className="w-3 h-3" />
                  GPS ativo — {geo.position.latitude.toFixed(4)},{" "}
                  {geo.position.longitude.toFixed(4)}
                </div>
              )}
              {geo.error && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <MapPin className="w-3 h-3" />
                  {geo.error}
                </div>
              )}
            </>
          )}

          {step === "camera" && (
            <CameraCapture onCapture={handlePhotoCapture} onCancel={handleCancel} />
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Fingerprint className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Verificando identidade...</p>
            </div>
          )}
        </div>

        {/* History */}
        {todayEntries.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Registros de hoje
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {todayEntries.map((entry) => (
                <TimeEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
