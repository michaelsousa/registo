import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Plus, Edit, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export function StoreLocationManager() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [editing, setEditing] = useState<StoreLocation | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("store_locations")
      .select("id, name, latitude, longitude, radius_meters, is_active")
      .order("created_at");
    setLocations((data as StoreLocation[]) || []);
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setName("Loja Principal");
    setLatitude("");
    setLongitude("");
    setRadius("200");
    setIsActive(true);
  };

  const openEdit = (loc: StoreLocation) => {
    setIsNew(false);
    setEditing(loc);
    setName(loc.name);
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setRadius(String(loc.radius_meters));
    setIsActive(loc.is_active);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        toast.success("Localização capturada!");
      },
      () => toast.error("Erro ao obter localização."),
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Latitude e longitude são obrigatórias.");
      return;
    }
    if (isNaN(rad) || rad < 10) {
      toast.error("Raio mínimo de 10 metros.");
      return;
    }

    setSaving(true);

    if (isNew) {
      const { error } = await supabase.from("store_locations").insert({
        name,
        latitude: lat,
        longitude: lng,
        radius_meters: rad,
        is_active: isActive,
      });
      if (error) { toast.error("Erro ao criar localização."); }
      else { toast.success("Localização criada!"); }
    } else if (editing) {
      const { error } = await supabase.from("store_locations")
        .update({ name, latitude: lat, longitude: lng, radius_meters: rad, is_active: isActive })
        .eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar."); }
      else { toast.success("Localização atualizada!"); }
    }

    setSaving(false);
    setEditing(null);
    setIsNew(false);
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_locations").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); }
    else { toast.success("Localização removida."); fetchLocations(); }
  };

  const dialogOpen = isNew || !!editing;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Localizações da Loja
          </CardTitle>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">
              Nenhuma localização configurada. Adicione uma para restringir onde o ponto pode ser batido.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Coordenadas</TableHead>
                    <TableHead>Raio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      </TableCell>
                      <TableCell>{loc.radius_meters}m</TableCell>
                      <TableCell>
                        <Badge variant={loc.is_active ? "default" : "secondary"}>
                          {loc.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(loc)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(loc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditing(null); setIsNew(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova Localização" : "Editar Localização"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Loja Centro" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-23.5505" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-46.6333" />
              </div>
            </div>

            <Button variant="outline" size="sm" type="button" onClick={handleGetCurrentLocation} className="w-full">
              <MapPin className="w-4 h-4 mr-1" /> Usar minha localização atual
            </Button>

            <div className="space-y-2">
              <Label>Raio permitido (metros)</Label>
              <Input type="number" min="10" value={radius} onChange={(e) => setRadius(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Colaboradores só poderão bater ponto dentro deste raio.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Localização ativa</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
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
