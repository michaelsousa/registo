import { useState } from "react";
import { MapPin, Clock, Camera } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export interface TimeEntry {
  id: string;
  type: "entrada" | "saída";
  timestamp: Date;
  latitude: number;
  longitude: number;
  photoUrl: string;
}

export function TimeEntryCard({ entry }: { entry: TimeEntry }) {
  const [open, setOpen] = useState(false);
  const isEntry = entry.type === "entrada";

  return (
    <>
      <div
        className="glass rounded-lg p-4 flex items-center gap-4 animate-fade-in cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
        onClick={() => setOpen(true)}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isEntry ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isEntry ? "text-success" : "text-destructive"
              }`}
            >
              {entry.type}
            </span>
            <span className="text-sm font-medium text-foreground">
              {entry.timestamp.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              Foto registrada
            </span>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border shrink-0">
          <img src={entry.photoUrl} alt="Registro" className="w-full h-full object-cover" />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Detalhes do Registro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-border">
                <img src={entry.photoUrl} alt="Registro" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <span className={`text-sm font-bold uppercase ${isEntry ? "text-success" : "text-destructive"}`}>
                  {entry.type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data</span>
                <span className="text-sm font-medium">
                  {entry.timestamp.toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Horário</span>
                <span className="text-sm font-medium">
                  {entry.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Localização</span>
                <a
                  href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="w-3 h-3" />
                  {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
