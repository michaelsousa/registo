import { useState, useCallback, useEffect } from "react";
import { MapPin, Fingerprint, Clock, History, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveClock } from "@/components/LiveClock";
import { CameraCapture } from "@/components/CameraCapture";
import { TimeEntryCard, TimeEntry } from "@/components/TimeEntryCard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

type Step = "idle" | "camera" | "processing";

const Index = () => {
  const { user, isAdmin, isApproved, signOut } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [pendingType, setPendingType] = useState<"entrada" | "saída">("entrada");
  const geo = useGeolocation();

  // Block unapproved users
  if (isApproved === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-heading font-bold text-foreground">PontoFácil</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-heading font-bold">Aguardando aprovação</h2>
              <p className="text-muted-foreground text-sm">
                Seu cadastro está pendente de aprovação pelo administrador. Você será notificado quando for aprovado.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Fetch today's entries
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59`)
      .order("timestamp", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setEntries(
            data.map((e) => ({
              id: e.id,
              type: e.type as "entrada" | "saída",
              timestamp: new Date(e.timestamp),
              latitude: e.latitude,
              longitude: e.longitude,
              photoUrl: e.photo_url || "",
            }))
          );
        }
      });
  }, [user]);

  const nextType: "entrada" | "saída" =
    entries.length === 0 || entries[0].type === "saída" ? "entrada" : "saída";

  const handleStartPunch = useCallback(() => {
    setPendingType(nextType);
    geo.requestPosition();
    setStep("camera");
  }, [nextType, geo]);

  const handlePhotoCapture = useCallback(
    async (photoUrl: string) => {
      setStep("processing");
      await new Promise((r) => setTimeout(r, 1200));

      if (!geo.position) {
        toast.error("Localização não disponível. Tente novamente.");
        setStep("idle");
        return;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: user!.id,
          type: pendingType,
          latitude: geo.position.latitude,
          longitude: geo.position.longitude,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao registrar ponto.");
        setStep("idle");
        return;
      }

      const newEntry: TimeEntry = {
        id: data.id,
        type: data.type as "entrada" | "saída",
        timestamp: new Date(data.timestamp),
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: data.photo_url || "",
      };

      setEntries((prev) => [newEntry, ...prev]);
      toast.success(
        `${pendingType === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`
      );
      setStep("idle");
    },
    [geo.position, pendingType, user]
  );

  const handleCancel = useCallback(() => {
    setStep("idle");
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-heading font-bold text-foreground">PontoFácil</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4 mr-1" /> Admin
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full gap-8">
        <LiveClock />

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

        {entries.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Registros de hoje
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {entries.map((entry) => (
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
