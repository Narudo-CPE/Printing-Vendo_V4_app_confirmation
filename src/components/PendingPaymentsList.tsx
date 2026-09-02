import React from 'react';
import { 
  BellRing, 
  Sparkles, 
  Clock, 
  Printer, 
  PlusCircle, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { KioskPendingPayment } from '../types';
import { OrderCard } from './OrderCard';

interface PendingPaymentsListProps {
  orders: KioskPendingPayment[];
  newOrderBanner: { visible: boolean; count: number; orderId: string } | null;
  onDismissBanner: () => void;
  onApproveOrder: (sessionId: string, reference: string, amount: number) => Promise<boolean>;
  onRejectOrder: (sessionId: string, reason: string) => Promise<boolean>;
  onQuickTestOrder: () => void;
  isPolling: boolean;
}

export const PendingPaymentsList: React.FC<PendingPaymentsListProps> = ({
  orders,
  newOrderBanner,
  onDismissBanner,
  onApproveOrder,
  onRejectOrder,
  onQuickTestOrder,
  isPolling,
}) => {
  return (
    <div className="space-y-4">
      {/* Prominent Visual Banner when new order arrives */}
      {newOrderBanner && newOrderBanner.visible && (
        <div
          id="new-order-alert-banner"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007dfe] text-white shadow-xl shadow-emerald-500/20 flex items-center justify-between animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white shrink-0 animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wide">
                  New GCash Payment Waiting!
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[11px] font-mono font-bold">
                  {newOrderBanner.orderId}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Customer is waiting at the kiosk payment screen. Please verify your GCash receipt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissBanner}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#cbd5e1] flex items-center gap-1.5">
            <span>Pending Approvals</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#007dfe]/15 text-[#38bdf8] border border-[#007dfe]/30">
              {orders.length}
            </span>
          </h2>
          {isPolling && (
            <span className="flex items-center gap-1 text-[11px] text-[#94a3b8] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
              <span>1.5s live poll</span>
            </span>
          )}
        </div>

        {orders.length > 0 && (
          <button
            type="button"
            onClick={onQuickTestOrder}
            className="text-xs text-[#94a3b8] hover:text-[#10b981] flex items-center gap-1 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Test Customer</span>
          </button>
        )}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        /* Empty State: Standby */
        <div className="py-12 px-6 rounded-3xl bg-[#0f172a]/70 border border-[#334155]/60 text-center flex flex-col items-center justify-center space-y-4 shadow-inner">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[#94a3b8] shadow-lg">
              <Printer className="w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#10b981] text-[9px] font-bold text-[#020617] items-center justify-center">
                ✓
              </span>
            </div>
          </div>

          <div className="max-w-xs space-y-1.5">
            <h3 className="text-base font-bold text-[#f8fafc]">
              Cashier Standby
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              No customers waiting at the kiosk payment screen. The app continuously checks every <strong className="text-[#cbd5e1]">1.5s</strong>.
            </p>
          </div>

          {/* Quick Simulation CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              id="empty-quick-test-btn"
              onClick={onQuickTestOrder}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Quick Test Kiosk Order</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#334155]/50 text-[11px] text-[#64748b] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#007dfe]" />
            <span>Ready to approve GCash payments and trigger physical print jobs.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.sessionId}
              order={order}
              onApprove={onApproveOrder}
              onReject={onRejectOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
};
