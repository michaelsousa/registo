import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNotificationModal } from "@/components/NotificationModal";

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
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

function showPushNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: `admin-${Date.now()}`,
        requireInteraction: true,
      });
    } catch {
      // Notification API not available
    }
  }
}

export function useAdminNotifications() {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotificationModal();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !isAdmin || initialized.current) return;
    initialized.current = true;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const timeChannel = supabase
      .channel("admin-time-entries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_entries" },
        async (payload) => {
          const entry = payload.new as any;
          if (entry.user_id === user.id) return;
          const name = await getUserName(entry.user_id);
          const type = entry.type === "entrada" ? "⬆️ Entrada" : "⬇️ Saída";
          const time = new Date(entry.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const title = `${type} — ${name}`;
          const body = `Ponto registrado às ${time}`;
          playNotificationSound();
          showPushNotification(title, body);
          showNotification({ title, body, variant: "info" });
        }
      )
      .subscribe();

    const walletChannel = supabase
      .channel("admin-wallet")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        async (payload) => {
          const tx = payload.new as any;
          if (tx.created_by === user.id) return;
          const name = await getUserName(tx.user_id);
          const amount = `R$ ${Number(tx.amount).toFixed(2)}`;

          if (tx.type === "withdrawal") {
            const title = `💸 Pedido de saque — ${name}`;
            const body = `${amount} — ${tx.description || "Saque solicitado"}`;
            playNotificationSound();
            showPushNotification(title, body);
            showNotification({ title, body, variant: "warning" });
          } else if (tx.type === "transfer_in") {
            const title = `🔄 Transferência recebida — ${name}`;
            playNotificationSound();
            showPushNotification(title, amount);
            showNotification({ title, body: amount, variant: "info" });
          } else if (tx.type === "transfer_out") {
            const senderName = await getUserName(tx.created_by);
            const title = `🔄 Transferência enviada — ${senderName}`;
            const body = `${amount} para ${name}`;
            playNotificationSound();
            showPushNotification(title, body);
            showNotification({ title, body, variant: "info" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timeChannel);
      supabase.removeChannel(walletChannel);
      initialized.current = false;
    };
  }, [user, isAdmin, showNotification]);
}
