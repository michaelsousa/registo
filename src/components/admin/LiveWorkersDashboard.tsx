import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Users, Play } from "lucide-react";

interface ActiveWorker {
  userId: string;
  name: string;
  entradaTime: Date;
  hourlyRate: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WorkerCard({ worker }: { worker: ActiveWorker }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - worker.entradaTime.getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [worker.entradaTime]);

  const earned = (elapsed / 3600) * worker.hourlyRate;

  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-sm truncate">{worker.name}</span>
          </div>
          <Badge variant="outline" className="text-success border-success/40 text-[10px]">
            <Play className="w-3 h-3 mr-1 fill-success" /> Ativo
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono font-bold text-lg tabular-nums">{formatDuration(elapsed)}</span>
          </div>
          {worker.hourlyRate > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="font-bold text-success tabular-nums">R$ {earned.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Entrada: {worker.entradaTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          {worker.hourlyRate > 0 && <span>R$ {worker.hourlyRate.toFixed(2)}/h</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveWorkersDashboard() {
  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveWorkers = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Get all today's entries
    const { data: entries } = await supabase
      .from("time_entries")
      .select("user_id, type, timestamp")
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59`)
      .order("timestamp", { ascending: true });

    if (!entries) { setLoading(false); return; }

    // Find users whose last entry is "entrada"
    const lastEntryByUser = new Map<string, { type: string; timestamp: string }>();
    for (const e of entries) {
      lastEntryByUser.set(e.user_id, { type: e.type, timestamp: e.timestamp });
    }

    const activeUserIds: { userId: string; entradaTime: Date }[] = [];
    for (const [userId, entry] of lastEntryByUser) {
      if (entry.type === "entrada") {
        activeUserIds.push({ userId, entradaTime: new Date(entry.timestamp) });
      }
    }

    if (activeUserIds.length === 0) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    // Get profiles and settings
    const userIds = activeUserIds.map((a) => a.userId);
    const [profilesRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("user_settings").select("user_id, hourly_rate").in("user_id", userIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p.full_name || "Sem nome"]));
    const rateMap = new Map((settingsRes.data || []).map((s) => [s.user_id, Number(s.hourly_rate) || 0]));

    setWorkers(
      activeUserIds.map((a) => ({
        userId: a.userId,
        name: profileMap.get(a.userId) || "Sem nome",
        entradaTime: a.entradaTime,
        hourlyRate: rateMap.get(a.userId) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveWorkers();
    const interval = setInterval(fetchActiveWorkers, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Users className="w-5 h-5 text-success" />
          Trabalhando Agora
          <Badge variant="outline" className="ml-auto">{workers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum colaborador trabalhando no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workers.map((w) => (
              <WorkerCard key={w.userId} worker={w} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
