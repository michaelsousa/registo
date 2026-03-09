import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, Plus, Minus, DollarSign, TrendingUp, TrendingDown, Download, FileImage } from "lucide-react";
import { toast } from "sonner";
import { exportElementAsPNG, exportElementAsPDF } from "@/lib/exportUtils";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

interface UserBalance {
  user_id: string;
  full_name: string;
  balance: number;
}

export function WalletDashboard() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txType, setTxType] = useState<"credit" | "debit">("credit");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, txRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").eq("approved", true),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }),
    ]);

    const profs = (profilesRes.data || []) as ProfileRow[];
    const txs = (txRes.data || []) as WalletTransaction[];
    setProfiles(profs);
    setTransactions(txs);

    // Calculate balances
    const balanceMap: Record<string, number> = {};
    txs.forEach((tx) => {
      if (!balanceMap[tx.user_id]) balanceMap[tx.user_id] = 0;
      balanceMap[tx.user_id] += tx.type === "credit" ? tx.amount : -tx.amount;
    });

    setBalances(
      profs.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name || "Sem nome",
        balance: balanceMap[p.user_id] || 0,
      }))
    );
  };

  const handleSubmit = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: selectedUser,
      amount: parseFloat(amount),
      type: txType,
      description: description || null,
      created_by: user!.id,
    });

    if (error) {
      toast.error("Erro ao registrar transação.");
      return;
    }

    toast.success(txType === "credit" ? "Crédito adicionado!" : "Débito registrado!");
    setAmount("");
    setDescription("");
    setDialogOpen(false);
    fetchData();
  };

  const totalCredits = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const getUserName = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.full_name || "Sem nome";

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                R$ {(totalCredits - totalDebits).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Saldo total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-success">
                R$ {totalCredits.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total créditos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-destructive">
                R$ {totalDebits.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total débitos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balances per user */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading">Saldo por Colaborador</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <DollarSign className="w-4 h-4 mr-1" /> Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Transação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name || "Sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={txType === "credit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxType("credit")}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Crédito
                  </Button>
                  <Button
                    variant={txType === "debit" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setTxType("debit")}
                    className="flex-1"
                  >
                    <Minus className="w-4 h-4 mr-1" /> Débito
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="Valor (R$)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Button onClick={handleSubmit} className="w-full">
                  Confirmar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.user_id}>
                    <TableCell className="font-medium">{b.full_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={b.balance >= 0 ? "default" : "destructive"}>
                        R$ {b.balance.toFixed(2)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 20).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{getUserName(tx.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "credit" ? "default" : "destructive"}>
                          {tx.type === "credit" ? "Crédito" : "Débito"}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {tx.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.description || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
