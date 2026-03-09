import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Settings, Save, DollarSign, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [workScale, setWorkScale] = useState("5x2");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [lunchDuration, setLunchDuration] = useState("60");

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, department, position").eq("user_id", user!.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);

    if (profileRes.data) {
      setFullName(profileRes.data.full_name || "");
      setDepartment(profileRes.data.department || "");
      setPosition(profileRes.data.position || "");
    }

    if (settingsRes.data) {
      setHourlyRate(String(settingsRes.data.hourly_rate));
      setWorkScale(settingsRes.data.work_scale);
      setWorkStart(settingsRes.data.work_start_time);
      setWorkEnd(settingsRes.data.work_end_time);
      setLunchDuration(String(settingsRes.data.lunch_duration_minutes));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const profileUpdate = supabase
      .from("profiles")
      .update({ full_name: fullName, department, position })
      .eq("user_id", user!.id);

    // Upsert settings
    const settingsUpsert = supabase
      .from("user_settings")
      .upsert({
        user_id: user!.id,
        hourly_rate: parseFloat(hourlyRate) || 0,
        work_scale: workScale,
        work_start_time: workStart,
        work_end_time: workEnd,
        lunch_duration_minutes: parseInt(lunchDuration) || 60,
      }, { onConflict: "user_id" });

    const [profRes, setRes] = await Promise.all([profileUpdate, settingsUpsert]);

    if (profRes.error || setRes.error) {
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
    setSaving(false);
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
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-heading font-bold">Configurações</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Settings className="w-4 h-4" /> Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Valor e Jornada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Valor da hora (R$)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Escala de trabalho</Label>
              <Select value={workScale} onValueChange={setWorkScale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x2">5x2 (Seg-Sex)</SelectItem>
                  <SelectItem value="6x1">6x1</SelectItem>
                  <SelectItem value="12x36">12x36</SelectItem>
                  <SelectItem value="4x2">4x2</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Entrada
                </Label>
                <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Saída
                </Label>
                <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunch">Intervalo de almoço (minutos)</Label>
              <Input
                id="lunch"
                type="number"
                min="0"
                value={lunchDuration}
                onChange={(e) => setLunchDuration(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </main>
    </div>
  );
}
