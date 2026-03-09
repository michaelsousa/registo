import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Fingerprint } from "lucide-react";

interface EntryReceiptProps {
  userName: string;
  type: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
}

interface TransactionReceiptProps {
  userName: string;
  type: string;
  amount: number;
  description?: string | null;
  date: string;
}

export const EntryReceipt = forwardRef<HTMLDivElement, EntryReceiptProps>(
  ({ userName, type, timestamp, latitude, longitude, photoUrl }, ref) => {
    const isEntry = type === "entrada";
    const time = new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const date = new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    return (
      <div ref={ref} className="bg-white text-black p-6 w-[360px] border border-gray-200 rounded-lg" style={{ fontFamily: "system-ui, sans-serif" }}>
        <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Fingerprint className="w-5 h-5 text-gray-700" />
            <span className="font-bold text-lg">PontoFácil</span>
          </div>
          <p className="text-xs text-gray-500">Comprovante de Registro</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Colaborador</span>
            <span className="font-semibold">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Tipo</span>
            <span className={`font-semibold px-2 py-0.5 rounded text-xs ${isEntry ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {type.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Data</span>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Horário</span>
            <span className="font-semibold text-base">{time}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Local</span>
            <span className="text-xs text-right">{latitude.toFixed(6)},<br/>{longitude.toFixed(6)}</span>
          </div>
          {photoUrl && (
            <div className="flex justify-center pt-2">
              <img src={photoUrl} alt="Foto" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 mt-4 pt-3 text-center">
          <p className="text-[10px] text-gray-400">
            Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    );
  }
);
EntryReceipt.displayName = "EntryReceipt";

export const TransactionReceipt = forwardRef<HTMLDivElement, TransactionReceiptProps>(
  ({ userName, type, amount, description, date }, ref) => {
    const isCredit = type === "credit";
    const formattedDate = new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    return (
      <div ref={ref} className="bg-white text-black p-6 w-[360px] border border-gray-200 rounded-lg" style={{ fontFamily: "system-ui, sans-serif" }}>
        <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-gray-700" />
            <span className="font-bold text-lg">PontoFácil</span>
          </div>
          <p className="text-xs text-gray-500">Comprovante de Transação</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Colaborador</span>
            <span className="font-semibold">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Tipo</span>
            <span className={`font-semibold px-2 py-0.5 rounded text-xs ${isCredit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {isCredit ? "CRÉDITO" : "DÉBITO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Valor</span>
            <span className={`font-bold text-lg ${isCredit ? "text-green-700" : "text-red-700"}`}>
              R$ {amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Data</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          {description && (
            <div className="flex justify-between">
              <span className="text-gray-500">Descrição</span>
              <span className="font-medium text-right max-w-[180px]">{description}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 mt-4 pt-3 text-center">
          <p className="text-[10px] text-gray-400">
            Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    );
  }
);
TransactionReceipt.displayName = "TransactionReceipt";
