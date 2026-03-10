import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Calendar, FileText, DollarSign } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({ transaction, open, onOpenChange }: Props) {
  if (!transaction) return null;

  const isCredit = transaction.type === "credit";
  const typeLabels: Record<string, string> = {
    credit: "Crédito",
    debit: "Saque",
    transfer_in: "Transferência recebida",
    transfer_out: "Transferência enviada",
    withdrawal: "Saque solicitado",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Detalhes da Transação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isCredit ? "bg-success/10" : "bg-destructive/10"}`}>
              {isCredit ? (
                <TrendingUp className="w-8 h-8 text-success" />
              ) : (
                <TrendingDown className="w-8 h-8 text-destructive" />
              )}
            </div>
          </div>

          <p className={`text-center text-2xl font-bold tabular-nums ${isCredit ? "text-success" : "text-destructive"}`}>
            {isCredit ? "+" : "-"}R$ {transaction.amount.toFixed(2)}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <span className="text-sm font-medium">{typeLabels[transaction.type] || transaction.type}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Data</span>
              <span className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(transaction.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Horário</span>
              <span className="text-sm font-medium">
                {new Date(transaction.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {transaction.description && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Descrição
                </span>
                <span className="text-sm font-medium text-right max-w-[180px]">{transaction.description}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
