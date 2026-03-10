import { useEffect, useRef } from "react";
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

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
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
      // Notification API not available (e.g. some mobile browsers)
    }
  }
}

function notify(title: string, body: string) {
  playNotificationSound();
  toast.info(title, { description: body });
  showPushNotification(title, body);
}

function notifyWarning(title: string, body: string) {
  playNotificationSound();
  toast.warning(title, { description: body });
  showPushNotification(title, body);
}

export function useAdminNotifications() {
  const { user, isAdmin } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !isAdmin || initialized.current) return;
    initialized.current = true;

    // Request permission on init
    requestNotificationPermission();

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
          notify(`${type} — ${name}`, `Ponto registrado às ${time}`);
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
            notifyWarning(`💸 Pedido de saque — ${name}`, `${amount} — ${tx.description || "Saque solicitado"}`);
          } else if (tx.type === "transfer_in") {
            notify(`🔄 Transferência recebida — ${name}`, amount);
          } else if (tx.type === "transfer_out") {
            const senderName = await getUserName(tx.created_by);
            notify(`🔄 Transferência enviada — ${senderName}`, `${amount} para ${name}`);
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
