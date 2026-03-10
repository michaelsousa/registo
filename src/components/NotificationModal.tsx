import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface NotificationData {
  title: string;
  body: string;
  variant?: "info" | "warning" | "destructive";
}

interface NotificationModalContextType {
  showNotification: (data: NotificationData) => void;
}

const NotificationModalContext = createContext<NotificationModalContextType | undefined>(undefined);

export function useNotificationModal() {
  const ctx = useContext(NotificationModalContext);
  if (!ctx) throw new Error("useNotificationModal must be within NotificationModalProvider");
  return ctx;
}

export function NotificationModalProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<NotificationData[]>([]);
  const current = queue[0] || null;

  const showNotification = useCallback((data: NotificationData) => {
    setQueue((prev) => [...prev, data]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const variantColors = {
    info: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <NotificationModalContext.Provider value={{ showNotification }}>
      {children}
      <Dialog open={!!current} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${variantColors[current?.variant || "info"]}`}>
                <Bell className="w-4 h-4" />
              </div>
              {current?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-2">{current?.body}</p>
          <Button onClick={dismiss} className="w-full mt-2">OK</Button>
        </DialogContent>
      </Dialog>
    </NotificationModalContext.Provider>
  );
}
