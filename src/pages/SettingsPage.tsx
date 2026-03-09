import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, DollarSign, Calendar, Coffee, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; department: string; position: string } | null>(null);
  const [settings, setSettings] = useState<{
    hourly_rate: number;
    work_scale: string;
    work_start_time: string;
    work_end_time: string;
    lunch_duration_minutes: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("full_name, department, position").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]).then(([profileRes, settingsRes]) => {
      setProfile(profileRes.data as any);
      setSettings(settingsRes.data as any);
      setLoading(false);
    });
  }, [user]);

  const scaleLabels: Record<string, string> = {
    "5x2": "5x2 (Seg-Sex)",
    "6x1": "6x1",
    "12x36": "12x36",
    "4x2": "4x2",
    "custom": "Personalizado",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-heading font-bold">Minha Jornada</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Profile info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nome</span>
              <span className="text-sm font-medium">{profile?.full_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Departamento</span>
              <span className="text-sm font-medium">{profile?.department || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cargo</span>
              <span className="text-sm font-medium">{profile?.position || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {settings ? (
          <>
            {/* Work schedule cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xl font-heading font-bold">R$ {Number(settings.hourly_rate).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Valor/Hora</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-xl font-heading font-bold">{scaleLabels[settings.work_scale] || settings.work_scale}</p>
                  <p className="text-xs text-muted-foreground">Escala</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-heading">Jornada de Trabalho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Entrada
                  </span>
                  <Badge variant="outline" className="text-sm">{settings.work_start_time}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Saída
                  </span>
                  <Badge variant="outline" className="text-sm">{settings.work_end_time}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Intervalo
                  </span>
                  <Badge variant="outline" className="text-sm">{settings.lunch_duration_minutes} min</Badge>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Suas configurações de jornada ainda não foram definidas pelo administrador.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
