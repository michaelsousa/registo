import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Settings, Save, DollarSign, Clock, Edit, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  department: string | null;
  position: string | null;
}

interface UserSettingsRow {
  user_id: string;
  hourly_rate: number;
  work_scale: string;
  work_start_time: string;
  work_end_time: string;
  lunch_duration_minutes: number;
  schedule_type: string;
  tolerance_minutes: number;
  tolerance_mode: string;
}

interface ScheduleDay {
  day_index: number;
  is_workday: boolean;
  start_time: string;
  end_time: string;
  hourly_rate: number;
}

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function getDayLabel(index: number, type: string) {
  if (type === "weekly") return WEEKDAY_NAMES[index] || `Dia ${index}`;
  return `Dia ${index + 1}`;
}

function getDefaultSchedule(type: string, defaultRate: number): ScheduleDay[] {
  const count = type === "weekly" ? 7 : 30;
  return Array.from({ length: count }, (_, i) => ({
    day_index: i,
    is_workday: type === "weekly" ? (i >= 1 && i <= 5) : true,
    start_time: "08:00",
    end_time: "17:00",
    hourly_rate: defaultRate,
  }));
}

export function UserSettingsManager() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, UserSettingsRow>>({});
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [scheduleType, setScheduleType] = useState<"weekly" | "monthly">("weekly");
  const [toleranceMinutes, setToleranceMinutes] = useState("30");
  const [toleranceMode, setToleranceMode] = useState("grace");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [lunchDuration, setLunchDuration] = useState("60");
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [profilesRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, department, position").eq("approved", true),
      supabase.from("user_settings").select("*"),
    ]);
    setProfiles((profilesRes.data || []) as ProfileRow[]);
    const map: Record<string, UserSettingsRow> = {};
    ((settingsRes.data || []) as UserSettingsRow[]).forEach((s) => { map[s.user_id] = s; });
    setSettingsMap(map);
  };

  const openEdit = async (userId: string) => {
    const settings = settingsMap[userId];
    const profile = profiles.find((p) => p.user_id === userId);
    const type = (settings?.schedule_type as "weekly" | "monthly") || "weekly";

    setScheduleType(type);
    setToleranceMinutes(settings ? String(settings.tolerance_minutes) : "30");
    setToleranceMode(settings?.tolerance_mode || "grace");
    setDepartment(profile?.department || "");
    setPosition(profile?.position || "");
    setLunchDuration(settings ? String(settings.lunch_duration_minutes) : "60");

    // Load existing schedule
    const { data: scheduleData } = await supabase
      .from("user_schedules")
      .select("day_index, is_workday, start_time, end_time, hourly_rate")
      .eq("user_id", userId)
      .order("day_index");

    if (scheduleData && scheduleData.length > 0) {
      setSchedule(scheduleData.map((d) => ({
        day_index: d.day_index,
        is_workday: d.is_workday,
        start_time: d.start_time as string,
        end_time: d.end_time as string,
        hourly_rate: Number(d.hourly_rate),
      })));
    } else {
      setSchedule(getDefaultSchedule(type, settings ? Number(settings.hourly_rate) : 0));
    }

    setEditingUser(userId);
  };

  const handleScheduleTypeChange = (newType: "weekly" | "monthly") => {
    setScheduleType(newType);
    const avgRate = schedule.length > 0
      ? schedule.reduce((s, d) => s + d.hourly_rate, 0) / schedule.length
      : 0;
    setSchedule(getDefaultSchedule(newType, avgRate));
  };

  const updateDay = (index: number, field: keyof ScheduleDay, value: any) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day_index === index ? { ...d, [field]: value } : d))
    );
  };

  const applyToAll = (field: "start_time" | "end_time" | "hourly_rate", value: string | number) => {
    setSchedule((prev) =>
      prev.map((d) => (d.is_workday ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);

    const avgRate = schedule.filter((d) => d.is_workday).length > 0
      ? schedule.filter((d) => d.is_workday).reduce((s, d) => s + d.hourly_rate, 0) /
        schedule.filter((d) => d.is_workday).length
      : 0;

    // Save settings, profile, and schedule in parallel
    const [profRes, setRes] = await Promise.all([
      supabase.from("profiles").update({
        department: department || null,
        position: position || null,
      }).eq("user_id", editingUser),
      supabase.from("user_settings").upsert({
        user_id: editingUser,
        hourly_rate: avgRate,
        work_scale: scheduleType === "weekly" ? "custom" : "monthly",
        work_start_time: schedule.find((d) => d.is_workday)?.start_time || "08:00",
        work_end_time: schedule.find((d) => d.is_workday)?.end_time || "17:00",
        lunch_duration_minutes: parseInt(lunchDuration) || 60,
        schedule_type: scheduleType,
        tolerance_minutes: parseInt(toleranceMinutes) || 30,
        tolerance_mode: toleranceMode,
      }, { onConflict: "user_id" }),
    ]);

    if (profRes.error || setRes.error) {
      toast.error("Erro ao salvar configurações.");
      setSaving(false);
      return;
    }

    // Delete old schedule then insert new
    await supabase.from("user_schedules").delete().eq("user_id", editingUser);
    const { error: schedError } = await supabase.from("user_schedules").insert(
      schedule.map((d) => ({
        user_id: editingUser,
        day_index: d.day_index,
        is_workday: d.is_workday,
        start_time: d.start_time,
        end_time: d.end_time,
        hourly_rate: d.hourly_rate,
      }))
    );

    if (schedError) {
      toast.error("Erro ao salvar escala.");
    } else {
      toast.success("Configurações salvas!");
      setEditingUser(null);
      fetchData();
    }
    setSaving(false);
  };

  const editingProfile = profiles.find((p) => p.user_id === editingUser);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurações por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Tipo Escala</TableHead>
                  <TableHead>Tolerância</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const s = settingsMap[p.user_id];
                  return (
                    <TableRow key={p.user_id}>
                      <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                      <TableCell>{p.department || "—"}</TableCell>
                      <TableCell>{p.position || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {s?.schedule_type === "monthly" ? "Mensal (30d)" : "Semanal (7d)"}
                        </Badge>
                      </TableCell>
                      <TableCell>{s ? `${s.tolerance_minutes} min` : "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEdit(p.user_id)}>
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar — {editingProfile?.full_name || "Colaborador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
            </div>

            {/* Tolerance */}
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Tolerância
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minutos de tolerância</Label>
                    <Input
                      type="number"
                      min="0"
                      value={toleranceMinutes}
                      onChange={(e) => setToleranceMinutes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modo</Label>
                    <Select value={toleranceMode} onValueChange={setToleranceMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grace">Graça (ganha o tempo extra)</SelectItem>
                        <SelectItem value="strict">Estrito (perde se passar)</SelectItem>
                        <SelectItem value="round">Arredonda pro horário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex: Se o horário é 18:00 e tolerância é 30min, batendo até 18:30 no modo "Graça" o colaborador recebe a meia hora extra. No modo "Estrito", se passar dos 30min perde o período.
                </p>
              </CardContent>
            </Card>

            {/* Schedule type */}
            <div className="space-y-2">
              <Label>Tipo de escala</Label>
              <div className="flex gap-2">
                <Button
                  variant={scheduleType === "weekly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScheduleTypeChange("weekly")}
                >
                  Semanal (7 dias)
                </Button>
                <Button
                  variant={scheduleType === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScheduleTypeChange("monthly")}
                >
                  Mensal (30 dias)
                </Button>
              </div>
            </div>

            {/* Lunch duration */}
            <div className="space-y-2">
              <Label>Intervalo de almoço (min)</Label>
              <Input
                type="number"
                min="0"
                value={lunchDuration}
                onChange={(e) => setLunchDuration(e.target.value)}
                className="w-32"
              />
            </div>

            {/* Bulk apply */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold mb-3">Aplicar em massa (dias úteis)</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Entrada:</Label>
                    <Input
                      type="time"
                      className="w-28 h-8 text-xs"
                      defaultValue="08:00"
                      onBlur={(e) => applyToAll("start_time", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Saída:</Label>
                    <Input
                      type="time"
                      className="w-28 h-8 text-xs"
                      defaultValue="17:00"
                      onBlur={(e) => applyToAll("end_time", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">R$/h:</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24 h-8 text-xs"
                      defaultValue="0"
                      onBlur={(e) => applyToAll("hourly_rate", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-day schedule */}
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Dia</TableHead>
                    <TableHead className="w-16 text-center">Ativo</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>R$/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((day) => (
                    <TableRow key={day.day_index} className={!day.is_workday ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-sm">
                        {getDayLabel(day.day_index, scheduleType)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={day.is_workday}
                          onCheckedChange={(v) => updateDay(day.day_index, "is_workday", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateDay(day.day_index, "start_time", e.target.value)}
                          disabled={!day.is_workday}
                          className="h-8 text-xs w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateDay(day.day_index, "end_time", e.target.value)}
                          disabled={!day.is_workday}
                          className="h-8 text-xs w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={day.hourly_rate}
                          onChange={(e) => updateDay(day.day_index, "hourly_rate", parseFloat(e.target.value) || 0)}
                          disabled={!day.is_workday}
                          className="h-8 text-xs w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
