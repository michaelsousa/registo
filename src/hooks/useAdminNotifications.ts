import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone chime
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}

async function getUserName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.full_name || "Colaborador";
}

export function useAdminNotifications() {
  const { user, isAdmin } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !isAdmin || initialized.current) return;
    initialized.current = true;

    // Listen for new time entries
    const timeChannel = supabase
      .channel("admin-time-entries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_entries" },
        async (payload) => {
          const entry = payload.new as any;
          // Don't notify for own entries
          if (entry.user_id === user.id) return;
          const name = await getUserName(entry.user_id);
          const type = entry.type === "entrada" ? "⬆️ Entrada" : "⬇️ Saída";
          const time = new Date(entry.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          playNotificationSound();
          toast.info(`${type} — ${name}`, {
            description: `Ponto registrado às ${time}`,
          });
        }
      )
      .subscribe();

    // Listen for wallet transactions (transfers, withdrawals, credits)
    const walletChannel = supabase
      .channel("admin-wallet")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        async (payload) => {
          const tx = payload.new as any;
          // Don't notify for own actions
          if (tx.created_by === user.id) return;
          const name = await getUserName(tx.user_id);
          const amount = `R$ ${Number(tx.amount).toFixed(2)}`;

          if (tx.type === "withdrawal") {
            playNotificationSound();
            toast.warning(`💸 Pedido de saque — ${name}`, {
              description: `${amount} — ${tx.description || "Saque solicitado"}`,
            });
          } else if (tx.type === "transfer_in") {
            playNotificationSound();
            toast.info(`🔄 Transferência recebida — ${name}`, {
              description: `${amount}`,
            });
          } else if (tx.type === "transfer_out") {
            const senderName = await getUserName(tx.created_by);
            playNotificationSound();
            toast.info(`🔄 Transferência enviada — ${senderName}`, {
              description: `${amount} para ${name}`,
            });
          } else if (tx.type === "credit") {
            // Auto-credit from clock-out, less urgent
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timeChannel);
      supabase.removeChannel(walletChannel);
      initialized.current = false;
    };
  }, [user, isAdmin]);
}
