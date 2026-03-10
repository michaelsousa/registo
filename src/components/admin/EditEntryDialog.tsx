import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  user_id: string;
  type: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
}

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null;
  onSuccess: () => void;
}

export function EditEntryDialog({ open, onOpenChange, entry, onSuccess }: EditEntryDialogProps) {
  const [type, setType] = useState("entrada");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      const d = new Date(entry.timestamp);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }
  }, [entry]);

  const handleSubmit = async () => {
    if (!entry) return;
    setLoading(true);
    const timestamp = `${date}T${time}:00`;
    const { error } = await supabase
      .from("time_entries")
      .update({ type, timestamp })
      .eq("id", entry.id);
    setLoading(false);
    if (error) { toast.error("Erro ao atualizar registro"); return; }
    toast.success("Registro atualizado!");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Registro de Ponto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saída">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
