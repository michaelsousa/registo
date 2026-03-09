import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Clock, DollarSign, Calendar, Coffee, LogOut, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("full_name, department, position").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_schedules").select("*").eq("user_id", user.id).order("day_index"),
    ]).then(([profileRes, settingsRes, scheduleRes]) => {
      setProfile(profileRes.data);
      setSettings(settingsRes.data);
      setSchedule(scheduleRes.data || []);
      setLoading(false);
    });
  }, [user]);

  const toleranceModeLabels: Record<string, string> = {
    grace: "Graça (ganha tempo extra)",
    strict: "Estrito (perde se passar)",
    round: "Arredonda pro horário",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const getDayLabel = (index: number) => {
    if (settings?.schedule_type === "monthly") return `Dia ${index + 1}`;
    return WEEKDAY_NAMES[index] || `Dia ${index}`;
  };

  const workdays = schedule.filter((d: any) => d.is_workday);

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
        {/* Profile */}
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
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Calendar className="w-5 h-5 text-primary" />
                  <p className="text-sm font-heading font-bold">
                    {settings.schedule_type === "monthly" ? "30 dias" : "Semanal"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Escala</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <p className="text-sm font-heading font-bold">{settings.tolerance_minutes} min</p>
                  <p className="text-[10px] text-muted-foreground">Tolerância</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Coffee className="w-5 h-5 text-accent" />
                  <p className="text-sm font-heading font-bold">{settings.lunch_duration_minutes} min</p>
                  <p className="text-[10px] text-muted-foreground">Almoço</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Modo de tolerância: <span className="font-medium text-foreground">{toleranceModeLabels[settings.tolerance_mode] || settings.tolerance_mode}</span>
                </p>
              </CardContent>
            </Card>

            {/* Schedule table */}
            {schedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-heading">Minha Escala</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dia</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>R$/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.map((day: any) => (
                          <TableRow key={day.day_index} className={!day.is_workday ? "opacity-50" : ""}>
                            <TableCell className="font-medium text-sm">
                              {getDayLabel(day.day_index)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={day.is_workday ? "default" : "secondary"}>
                                {day.is_workday ? "Trabalha" : "Folga"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {day.is_workday ? (
                                <span className="text-sm flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  {day.start_time} — {day.end_time}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              {day.is_workday ? (
                                <span className="text-sm flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                                  R$ {Number(day.hourly_rate).toFixed(2)}
                                </span>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
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
