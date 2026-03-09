import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, ArrowLeft, TrendingUp, TrendingDown, Send, Banknote, History } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface ProfileOption {
  user_id: string;
  full_name: string | null;
}

const WalletPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [txRes, profilesRes] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("id, type, amount, description, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("approved", true)
        .neq("user_id", user!.id),
    ]);

    const txs = (txRes.data || []) as Transaction[];
    setTransactions(txs);
    setProfiles((profilesRes.data || []) as ProfileOption[]);

    // Calculate balance
    const bal = txs.reduce((sum, tx) => {
      return sum + (tx.type === "credit" ? tx.amount : -tx.amount);
    }, 0);
    setBalance(bal);
  };

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Valor inválido");
      return;
    }
    if (val > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: user!.id,
      created_by: user!.id,
      type: "debit",
      amount: val,
      description: description || "Saque solicitado",
    });
    if (error) {
      toast.error("Erro ao solicitar saque");
    } else {
      toast.success("Saque registrado com sucesso!");
      setShowWithdraw(false);
      setAmount("");
      setDescription("");
      fetchData();
    }
    setLoading(false);
  };

  const handleTransfer = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Valor inválido");
      return;
    }
    if (val > balance) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!transferTo) {
      toast.error("Selecione um destinatário");
      return;
    }
    setLoading(true);

    const targetName = profiles.find((p) => p.user_id === transferTo)?.full_name || "Colaborador";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            targetUserId: transferTo,
            amount: val,
            description: description || undefined,
          }),
        }
      );

      const result = await resp.json();
      if (!resp.ok || result.error) {
        toast.error(result.error === "Insufficient balance" ? "Saldo insuficiente" : "Erro na transferência");
      } else {
        toast.success(`R$ ${val.toFixed(2)} transferido para ${targetName}!`);
        setShowTransfer(false);
        setAmount("");
        setDescription("");
        setTransferTo("");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro na transferência");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-heading font-bold text-foreground">Minha Carteira</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full gap-6">
        {/* Balance Card */}
        <Card className="w-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-sm opacity-80">Saldo disponível</p>
            <p className="text-4xl font-bold font-mono tabular-nums mt-1">
              R$ {balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="w-full grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-1"
            onClick={() => { setShowWithdraw(true); setAmount(""); setDescription(""); }}
          >
            <Banknote className="w-5 h-5" />
            <span className="text-xs">Saque</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex flex-col gap-1"
            onClick={() => { setShowTransfer(true); setAmount(""); setDescription(""); setTransferTo(""); }}
          >
            <Send className="w-5 h-5" />
            <span className="text-xs">Transferir</span>
          </Button>
        </div>

        {/* Transaction history */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Histórico</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhuma transação ainda</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((tx) => (
                <Card key={tx.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-success/10" : "bg-destructive/10"}`}>
                        {tx.type === "credit" ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || (tx.type === "credit" ? "Crédito" : "Débito")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("pt-BR")} {new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" /> Solicitar Saque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Saldo: R$ {balance.toFixed(2)}</p>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo do saque"
              />
            </div>
            <Button onClick={handleWithdraw} disabled={loading} className="w-full">
              {loading ? "Processando..." : "Confirmar Saque"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" /> Transferir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Saldo: R$ {balance.toFixed(2)}</p>
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo da transferência"
              />
            </div>
            <Button onClick={handleTransfer} disabled={loading} className="w-full">
              {loading ? "Processando..." : "Confirmar Transferência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
