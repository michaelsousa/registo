import { useState, useEffect, useRef } from "react";
import { Clock, DollarSign, Play, Square } from "lucide-react";

interface WorkTimerProps {
  startTime: Date;
  hourlyRate: number;
  isRunning: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkTimer({ startTime, hourlyRate, isRunning }: WorkTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isRunning) {
      const update = () => {
        const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setElapsed(Math.max(0, diff));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [isRunning, startTime]);

  const earned = (elapsed / 3600) * hourlyRate;

  return (
    <div className="w-full glass rounded-2xl p-6 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        {isRunning ? (
          <Play className="w-3 h-3 text-success fill-success" />
        ) : (
          <Square className="w-3 h-3 text-muted-foreground" />
        )}
        {isRunning ? "Trabalhando" : "Parado"}
      </div>

      <div className="text-4xl font-mono font-bold text-foreground tracking-wider tabular-nums">
        {formatDuration(elapsed)}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Início: {startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {hourlyRate > 0 && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-success font-bold text-lg tabular-nums">
              R$ {earned.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {hourlyRate > 0 && (
        <p className="text-[10px] text-muted-foreground">
          R$ {hourlyRate.toFixed(2)}/hora
        </p>
      )}
    </div>
  );
}
