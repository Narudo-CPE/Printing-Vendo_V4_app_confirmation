import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Smartphone,
  ChevronDown,
  Layers,
  Palette
} from 'lucide-react';
import { KioskPendingPayment } from '../types';

interface OrderCardProps {
  order: KioskPendingPayment;
  onApprove: (sessionId: string, reference: string, amount: number) => Promise<boolean>;
  onReject: (sessionId: string, reason: string) => Promise<boolean>;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onApprove,
  onReject,
}) => {
  const [reference, setReference] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApprovedSuccess, setIsApprovedSuccess] = useState(false);
  const [isCopiedId, setIsCopiedId] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRejectMenu, setShowRejectMenu] = useState(false);

  // Live Waiting Timer ticker
  useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - createdTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const formatElapsed = (sec: number) => {
    if (sec < 60) return `${sec}s waiting`;
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}m ${remainder}s waiting`;
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(order.sessionId);
    setIsCopiedId(true);
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const handleAutoFillSampleRef = () => {
    // Generate realistic 12-digit GCash reference formatted like: 1029 4819 2831
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(1000 + Math.random() * 9000);
    setReference(`${part1} ${part2} ${part3}`);
  };

  const handleApproveClick = async () => {
    if (isApproving || isApprovedSuccess) return;
    setIsApproving(true);
    try {
      const success = await onApprove(order.sessionId, reference, order.amount);
      if (success) {
        setIsApprovedSuccess(true);
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectClick = async (reason: string = 'Payment not received') => {
    if (isRejecting) return;
    setIsRejecting(true);
    setShowRejectMenu(false);
    try {
      await onReject(order.sessionId, reason);
    } finally {
      setIsRejecting(false);
    }
  };

  // Urgency color for waiting timer
  const timerBadgeColor =
    elapsedSeconds > 120
      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
      : elapsedSeconds > 60
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155]';

  return (
    <div
      id={`order-card-${order.sessionId.replace(/[^a-zA-Z0-9]/g, '')}`}
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl ${
        isApprovedSuccess
          ? 'bg-[#0f172a] border-emerald-500/50 ring-2 ring-emerald-500/20'
          : 'bg-[#0f172a] border-[#334155]/80 hover:border-[#334155]'
      }`}
    >
      {/* Top Session & Timer Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#020617]/70 border-b border-[#334155]/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#38bdf8] tracking-wider">
            {order.sessionId}
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            title="Copy Session ID"
            className="text-[#64748b] hover:text-[#cbd5e1] transition-colors"
          >
            {isCopiedId ? (
              <Check className="w-3.5 h-3.5 text-[#10b981]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {order.customerName && (
            <span className="text-xs text-[#94a3b8] hidden sm:inline">
              • {order.customerName}
            </span>
          )}
        </div>

        {/* Customer Waiting Timer */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${timerBadgeColor}`}>
          <Clock className="w-3 h-3" />
          <span>{formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Main Order Details Body */}
      <div className="p-4 space-y-4">
        {/* File and Specifications */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-[#007dfe]/15 text-[#38bdf8] border border-[#007dfe]/25 shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#f8fafc] truncate max-w-[200px] xs:max-w-[260px] sm:max-w-xs" title={order.fileName}>
                {order.fileName}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-[#cbd5e1]">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e293b] border border-[#334155] font-medium">
                  <Layers className="w-3 h-3 text-[#94a3b8]" />
                  {order.pageCount} {order.pageCount === 1 ? 'page' : 'pages'}
                </span>
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border font-medium ${
                    order.colorMode === 'color'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155]'
                  }`}
                >
                  <Palette className="w-3 h-3" />
                  {order.colorMode === 'color' ? 'Full Color' : 'Black & White'}
                </span>
                {order.copies && order.copies > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[#94a3b8]">
                    {order.copies} copies
                  </span>
                )}
                {order.paperSize && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[#94a3b8]">
                    {order.paperSize}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Exact Amount Due Highlighted in Bold Emerald */}
          <div className="text-right shrink-0">
            <span className="text-[11px] font-semibold text-[#94a3b8] block uppercase tracking-wider">
              Amount Due
            </span>
            <div className="text-2xl font-black tracking-tight text-[#10b981] drop-shadow-sm">
              ₱{order.amount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* GCash Verification & Reference Input */}
        <div className="p-3.5 rounded-xl bg-[#020617]/70 border border-[#334155]/70 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`gcash-ref-${order.sessionId}`}
              className="text-xs font-semibold text-[#cbd5e1] flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#007dfe]" />
              <span>GCash Reference No.</span>
              <span className="text-[#64748b] text-[11px] font-normal">(Optional, 8-13 digits)</span>
            </label>
            <button
              type="button"
              onClick={handleAutoFillSampleRef}
              className="text-[11px] text-[#38bdf8] hover:text-[#007dfe] flex items-center gap-1 hover:underline font-medium"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-Fill Sample Ref</span>
            </button>
          </div>

          <div className="relative">
            <input
              id={`gcash-ref-${order.sessionId}`}
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 1029 4819 2831 (from SMS/GCash App)"
              disabled={isApprovedSuccess || isApproving}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-sm font-mono text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#007dfe] focus:ring-1 focus:ring-[#007dfe] disabled:opacity-60 transition-colors"
            />
          </div>
        </div>

        {/* Success Confirmation State */}
        {isApprovedSuccess ? (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center justify-between animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-full bg-[#10b981] text-[#020617]">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Payment Approved & Print Released!</p>
                <p className="text-[11px] text-emerald-400">
                  Command sent to Kiosk terminal printer.
                </p>
              </div>
            </div>
            <Printer className="w-5 h-5 text-[#10b981] animate-bounce" />
          </div>
        ) : (
          /* Owner Verification & Control Action Buttons */
          <div className="flex items-center gap-2.5 pt-1">
            {/* Prominent Green "Approve & Release Print" Button */}
            <button
              type="button"
              id={`approve-btn-${order.sessionId.replace(/[^a-zA-Z0-9]/g, '')}`}
              onClick={handleApproveClick}
              disabled={isApproving || isRejecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#10b981] hover:bg-[#059669] active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-[#10b981]/25 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving & Triggering Print...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Approve & Release Print</span>
                </>
              )}
            </button>

            {/* Decline / Reject Action with optional quick reasons */}
            <div className="relative">
              <button
                type="button"
                id={`reject-btn-${order.sessionId.replace(/[^a-zA-Z0-9]/g, '')}`}
                onClick={() => setShowRejectMenu(!showRejectMenu)}
                disabled={isApproving || isRejecting}
                title="Decline or reject order if payment was not received"
                className="flex items-center justify-center gap-1 px-3.5 py-3.5 rounded-xl bg-[#1e293b] hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-[#334155] hover:border-rose-900/60 font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isRejecting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span className="hidden xs:inline">Decline</span>
                    <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
                  </>
                )}
              </button>

              {/* Decline Reason Dropdown Popup */}
              {showRejectMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl p-1.5 z-20 space-y-1 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] border-b border-[#334155]/60">
                    Select Decline Reason
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRejectClick('Payment not received in GCash')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors"
                  >
                    Payment not received in GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClick('Incorrect / Insufficient amount')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors"
                  >
                    Incorrect / Insufficient amount
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectClick('Customer cancelled at kiosk')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#cbd5e1] hover:bg-[#1e293b] transition-colors"
                  >
                    Customer cancelled at kiosk
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
