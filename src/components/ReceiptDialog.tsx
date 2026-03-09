import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileImage, Eye } from "lucide-react";
import { EntryReceipt, TransactionReceipt } from "@/components/ReceiptTemplates";
import { exportElementAsPNG, exportElementAsPDF } from "@/lib/exportUtils";

interface EntryData {
  id: string;
  userName: string;
  type: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
}

interface TransactionData {
  id: string;
  userName: string;
  type: string;
  amount: number;
  description?: string | null;
  date: string;
}

export function useReceiptDialog() {
  const [open, setOpen] = useState(false);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [txData, setTxData] = useState<TransactionData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const viewEntry = useCallback((data: EntryData) => {
    setEntryData(data);
    setTxData(null);
    setOpen(true);
  }, []);

  const viewTransaction = useCallback((data: TransactionData) => {
    setTxData(data);
    setEntryData(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const exportPNG = useCallback(() => {
    if (receiptRef.current) {
      const name = entryData ? `comprovante-ponto-${entryData.id}` : `comprovante-tx-${txData?.id}`;
      exportElementAsPNG(receiptRef.current, name);
    }
  }, [entryData, txData]);

  const exportPDF = useCallback(() => {
    if (receiptRef.current) {
      const name = entryData ? `comprovante-ponto-${entryData.id}` : `comprovante-tx-${txData?.id}`;
      exportElementAsPDF(receiptRef.current, name);
    }
  }, [entryData, txData]);

  const ReceiptDialog = () => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Comprovante</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-2">
          {entryData && (
            <EntryReceipt
              ref={receiptRef}
              userName={entryData.userName}
              type={entryData.type}
              timestamp={entryData.timestamp}
              latitude={entryData.latitude}
              longitude={entryData.longitude}
              photoUrl={entryData.photoUrl}
            />
          )}
          {txData && (
            <TransactionReceipt
              ref={receiptRef}
              userName={txData.userName}
              type={txData.type}
              amount={txData.amount}
              description={txData.description}
              date={txData.date}
            />
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={exportPNG}>
            <FileImage className="w-4 h-4 mr-1" /> PNG
          </Button>
          <Button size="sm" variant="outline" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { viewEntry, viewTransaction, close, ReceiptDialog };
}

// Inline action buttons for table rows
export function EntryReceiptActions({ entry, userName, onView }: {
  entry: { id: string; type: string; timestamp: string; latitude: number; longitude: number; photo_url?: string | null };
  userName: string;
  onView: (data: EntryData) => void;
}) {
  return (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onView({
        id: entry.id,
        userName,
        type: entry.type,
        timestamp: entry.timestamp,
        latitude: entry.latitude,
        longitude: entry.longitude,
        photoUrl: entry.photo_url,
      })}>
        <Eye className="w-3 h-3" />
      </Button>
    </div>
  );
}

export function TransactionReceiptActions({ tx, userName, onView }: {
  tx: { id: string; type: string; amount: number; description?: string | null; created_at: string };
  userName: string;
  onView: (data: TransactionData) => void;
}) {
  return (
    <div className="flex gap-1">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onView({
        id: tx.id,
        userName,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.created_at,
      })}>
        <Eye className="w-3 h-3" />
      </Button>
    </div>
  );
}
