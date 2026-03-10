import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Clock, MapPin, Search, LogOut, ArrowLeft, Calendar, Shield, UserCheck, UserX, Wallet, Settings, MapPinned, Download, FileImage, Eye, Plus, Pencil,
} from "lucide-react";
import { exportElementAsPNG, exportElementAsPDF } from "@/lib/exportUtils";
import { useReceiptDialog, EntryReceiptActions } from "@/components/ReceiptDialog";
import { WalletDashboard } from "@/components/admin/WalletDashboard";
import { UserSettingsManager } from "@/components/admin/UserSettingsManager";
import { StoreLocationManager } from "@/components/admin/StoreLocationManager";
import { AdminPunchDialog } from "@/components/admin/AdminPunchDialog";
import { EditEntryDialog } from "@/components/admin/EditEntryDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  department: string | null;
  position: string | null;
  approved: boolean;
}

interface TimeEntryRow {
  id: string;
  user_id: string;
  type: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
}

export default function AdminPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [useDateRange, setUseDateRange] = useState(false);
  const [loading, setLoading] = useState(true);
  const { viewEntry, ReceiptDialog } = useReceiptDialog();
  const [showPunchDialog, setShowPunchDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryRow | null>(null);

  useEffect(() => { fetchProfiles(); }, []);
  useEffect(() => { fetchEntries(); }, [selectedUser, dateFilter, dateFrom, dateTo, useDateRange]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, department, position, approved");
    if (error) { toast.error("Erro ao carregar usuários"); return; }
    setProfiles((data as ProfileRow[]) || []);
    setLoading(false);
  };

  const fetchEntries = async () => {
    const fromDate = useDateRange ? dateFrom : dateFilter;
    const toDate = useDateRange ? dateTo : dateFilter;
    let query = supabase
      .from("time_entries")
      .select("*")
      .gte("timestamp", `${fromDate}T00:00:00`)
      .lte("timestamp", `${toDate}T23:59:59`)
      .order("timestamp", { ascending: false });
    if (selectedUser) query = query.eq("user_id", selectedUser);
    const { data, error } = await query;
    if (error) { toast.error("Erro ao carregar registros"); return; }
    setEntries((data as TimeEntryRow[]) || []);
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved })
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao atualizar aprovação");
      return;
    }
    toast.success(approved ? "Usuário aprovado!" : "Usuário reprovado.");
    fetchProfiles();
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.full_name || "Sem nome";
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingProfiles = filteredProfiles.filter((p) => !p.approved);
  const approvedProfiles = filteredProfiles.filter((p) => p.approved);
  const totalEntradas = entries.filter((e) => e.type === "entrada").length;
  const totalSaidas = entries.filter((e) => e.type === "saída").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-heading font-bold">Painel Admin</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-1" /> Sair
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Colaboradores</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <UserX className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{pendingProfiles.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{totalEntradas}</p>
                <p className="text-sm text-muted-foreground">Entradas hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">{totalSaidas}</p>
                <p className="text-sm text-muted-foreground">Saídas hoje</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              Usuários {pendingProfiles.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{pendingProfiles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="entries">Registros de Ponto</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPinned className="w-4 h-4 mr-1" /> Localizações
            </TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet className="w-4 h-4 mr-1" /> Carteira
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-heading">Gerenciar Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {pendingProfiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <UserX className="w-4 h-4" /> Pendentes de aprovação
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Departamento</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingProfiles.map((p) => (
                            <TableRow key={p.user_id}>
                              <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                              <TableCell>{p.department || "—"}</TableCell>
                              <TableCell>{p.position || "—"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleApproval(p.user_id, true)}>
                                    <UserCheck className="w-4 h-4 mr-1" /> Aprovar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleApproval(p.user_id, false)}>
                                    Rejeitar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Aprovados ({approvedProfiles.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedProfiles.map((p) => (
                        <TableRow key={p.user_id}>
                          <TableCell className="font-medium">{p.full_name || "Sem nome"}</TableCell>
                          <TableCell>{p.department || "—"}</TableCell>
                          <TableCell>{p.position || "—"}</TableCell>
                          <TableCell><Badge variant="default">Aprovado</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="destructive" onClick={() => handleApproval(p.user_id, false)}>
                              Revogar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-heading">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 items-end">
                <div className="w-[200px]">
                  <Select
                    value={selectedUser || "all"}
                    onValueChange={(v) => setSelectedUser(v === "all" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {approvedProfiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={!useDateRange ? "default" : "outline"}
                    onClick={() => setUseDateRange(false)}
                  >
                    Dia
                  </Button>
                  <Button
                    size="sm"
                    variant={useDateRange ? "default" : "outline"}
                    onClick={() => setUseDateRange(true)}
                  >
                    Período
                  </Button>
                </div>
                {!useDateRange ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[145px]"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[145px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-heading">
                  Registros {useDateRange
                    ? `${new Date(dateFrom + "T12:00:00").toLocaleDateString("pt-BR")} — ${new Date(dateTo + "T12:00:00").toLocaleDateString("pt-BR")}`
                    : `— ${new Date(dateFilter + "T12:00:00").toLocaleDateString("pt-BR")}`}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowPunchDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Registrar Ponto
                  </Button>
                  {entries.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => {
                        const el = document.getElementById("entries-export");
                        if (el) exportElementAsPNG(el, `ponto-${useDateRange ? `${dateFrom}_${dateTo}` : dateFilter}`);
                      }}>
                        <FileImage className="w-4 h-4 mr-1" /> PNG
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        const el = document.getElementById("entries-export");
                        if (el) exportElementAsPDF(el, `ponto-${useDateRange ? `${dateFrom}_${dateTo}` : dateFilter}`);
                      }}>
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado para esta data.
                  </p>
                ) : (
                  <div className="overflow-x-auto" id="entries-export">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data / Horário</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Foto</TableHead>
                          <TableHead>Comprovante</TableHead>
                          <TableHead>Ações</TableHead>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id} id={`entry-${entry.id}`}>
                            <TableCell className="font-medium">{getUserName(entry.user_id)}</TableCell>
                            <TableCell>
                              <Badge variant={entry.type === "entrada" ? "default" : "destructive"}>
                                {entry.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(entry.timestamp).toLocaleDateString("pt-BR")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {entry.photo_url ? (
                                <img src={entry.photo_url} alt="Registro" className="w-8 h-8 rounded-full object-cover border border-border" />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <EntryReceiptActions
                                entry={entry}
                                userName={getUserName(entry.user_id)}
                                onView={viewEntry}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Settings Tab */}
          <TabsContent value="settings">
            <UserSettingsManager />
          </TabsContent>
          <TabsContent value="locations">
            <StoreLocationManager />
          </TabsContent>
          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <WalletDashboard />
          </TabsContent>
        </Tabs>
      </main>
      <ReceiptDialog />
    </div>
  );
}
