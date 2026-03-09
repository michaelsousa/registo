import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Settings, Save, DollarSign, Clock, Edit } from "lucide-react";
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
}

export function UserSettingsManager() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, UserSettingsRow>>({});
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [form, setForm] = useState({
    hourly_rate: "0",
    work_scale: "5x2",
    work_start_time: "08:00",
    work_end_time: "17:00",
    lunch_duration_minutes: "60",
    department: "",
    position: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, department, position").eq("approved", true),
      supabase.from("user_settings").select("*"),
    ]);

    setProfiles((profilesRes.data || []) as ProfileRow[]);

    const map: Record<string, UserSettingsRow> = {};
    ((settingsRes.data || []) as UserSettingsRow[]).forEach((s) => {
      map[s.user_id] = s;
    });
    setSettingsMap(map);
  };

  const openEdit = (userId: string) => {
    const settings = settingsMap[userId];
    const profile = profiles.find((p) => p.user_id === userId);
    setForm({
      hourly_rate: settings ? String(settings.hourly_rate) : "0",
      work_scale: settings?.work_scale || "5x2",
      work_start_time: settings?.work_start_time || "08:00",
      work_end_time: settings?.work_end_time || "17:00",
      lunch_duration_minutes: settings ? String(settings.lunch_duration_minutes) : "60",
      department: profile?.department || "",
      position: profile?.position || "",
    });
    setEditingUser(userId);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);

    const [profRes, setRes] = await Promise.all([
      supabase.from("profiles").update({
        department: form.department || null,
        position: form.position || null,
      }).eq("user_id", editingUser),
      supabase.from("user_settings").upsert({
        user_id: editingUser,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        work_scale: form.work_scale,
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        lunch_duration_minutes: parseInt(form.lunch_duration_minutes) || 60,
      }, { onConflict: "user_id" }),
    ]);

    if (profRes.error || setRes.error) {
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações salvas!");
      setEditingUser(null);
      fetchData();
    }
    setSaving(false);
  };

  const scaleLabels: Record<string, string> = {
    "5x2": "5x2 (Seg-Sex)",
    "6x1": "6x1",
    "12x36": "12x36",
    "4x2": "4x2",
    "custom": "Personalizado",
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
                  <TableHead>Valor/Hora</TableHead>
                  <TableHead>Escala</TableHead>
                  <TableHead>Horário</TableHead>
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
                        {s ? `R$ ${Number(s.hourly_rate).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>{s ? (scaleLabels[s.work_scale] || s.work_scale) : "—"}</TableCell>
                      <TableCell>
                        {s ? `${s.work_start_time} - ${s.work_end_time}` : "—"}
                      </TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar — {editingProfile?.full_name || "Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Valor da hora (R$)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.hourly_rate}
                onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Escala de trabalho</Label>
              <Select value={form.work_scale} onValueChange={(v) => setForm({ ...form, work_scale: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5x2">5x2 (Seg-Sex)</SelectItem>
                  <SelectItem value="6x1">6x1</SelectItem>
                  <SelectItem value="12x36">12x36</SelectItem>
                  <SelectItem value="4x2">4x2</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Entrada</Label>
                <Input type="time" value={form.work_start_time} onChange={(e) => setForm({ ...form, work_start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Saída</Label>
                <Input type="time" value={form.work_end_time} onChange={(e) => setForm({ ...form, work_end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Intervalo de almoço (minutos)</Label>
              <Input
                type="number"
                min="0"
                value={form.lunch_duration_minutes}
                onChange={(e) => setForm({ ...form, lunch_duration_minutes: e.target.value })}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
