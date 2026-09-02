import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getStoredKioskUrl, 
  saveStoredKioskUrl, 
  checkKioskHealth, 
  fetchPendingPayments, 
  approvePayment, 
  rejectPayment, 
  generateMockKioskOrder,
  SHIFT_HISTORY_STORAGE_KEY,
  AUDIO_MUTED_STORAGE_KEY
} from './utils/kioskApi';
import { 
  playNewOrderChime, 
  playApprovedChime, 
  playRejectTone, 
  getAudioContext,
  isAudioContextRunning
} from './utils/audio';
import { 
  KioskPendingPayment, 
  ApprovedPrintJob, 
  KioskConnectionState, 
  ShiftSummary 
} from './types';
import { Header } from './components/Header';
import { PendingPaymentsList } from './components/PendingPaymentsList';
import { ConnectionSettingsModal } from './components/ConnectionSettingsModal';
import { ShiftHistoryModal } from './components/ShiftHistoryModal';
import { 
  Volume2, 
  AlertCircle, 
  PlusCircle, 
  Smartphone, 
  Printer, 
  Info,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // Connection state
  const [kioskUrl, setKioskUrl] = useState<string>(getStoredKioskUrl);
  const [connection, setConnection] = useState<KioskConnectionState>({
    url: getStoredKioskUrl(),
    status: 'checking',
    lastChecked: null,
    latencyMs: null,
    errorMessage: null,
  });

  // Orders and dashboard state
  const [pendingOrders, setPendingOrders] = useState<KioskPendingPayment[]>([]);
  const [seenSessionIds, setSeenSessionIds] = useState<Set<string>>(new Set());
  const [newOrderBanner, setNewOrderBanner] = useState<{ visible: boolean; count: number; orderId: string } | null>(null);

  // Audio settings
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true';
  });
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShiftHistoryOpen, setIsShiftHistoryOpen] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Shift history and totals (stored in localStorage)
  const [shiftJobs, setShiftJobs] = useState<ApprovedPrintJob[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(SHIFT_HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate shift metrics
  const shiftSummary: ShiftSummary = React.useMemo(() => {
    let totalRevenue = 0;
    let totalPages = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    shiftJobs.forEach((job) => {
      if (job.status === 'approved') {
        totalRevenue += job.amount;
        totalPages += job.pageCount * (job.copies || 1);
        approvedCount++;
      } else {
        rejectedCount++;
      }
    });

    const shiftStartedAt =
      shiftJobs.length > 0
        ? shiftJobs[shiftJobs.length - 1].approvedAt
        : new Date().toISOString();

    return {
      totalRevenue,
      totalPages,
      approvedCount,
      rejectedCount,
      shiftStartedAt,
    };
  }, [shiftJobs]);

  // Persist shift jobs
  useEffect(() => {
    try {
      localStorage.setItem(SHIFT_HISTORY_STORAGE_KEY, JSON.stringify(shiftJobs));
    } catch (e) {
      console.warn('Failed to save shift history', e);
    }
  }, [shiftJobs]);

  // Audio mute toggle
  const handleToggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(next));
    if (!next) {
      getAudioContext();
      playApprovedChime(0.2);
    }
  };

  // Health check handler
  const runHealthCheck = useCallback(async () => {
    setConnection((prev) => ({ ...prev, status: 'checking' }));
    const result = await checkKioskHealth(kioskUrl);

    setConnection({
      url: kioskUrl,
      status: result.ok ? 'connected' : 'offline',
      lastChecked: Date.now(),
      latencyMs: result.latencyMs,
      errorMessage: result.ok ? null : result.message,
      httpStatus: result.status,
    });
  }, [kioskUrl]);

  // Initial health check & periodic health check (every 10s)
  useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 10000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  // Real-time polling for pending payments every 1.5 seconds
  useEffect(() => {
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled) return;
      const res = await fetchPendingPayments(kioskUrl);

      if (!isCancelled && res.ok && res.orders) {
        setPendingOrders((currentOrders) => {
          // Merge with any active local mock orders that haven't expired
          const liveIds = new Set(res.orders.map((o) => o.sessionId));
          const localOnlyOrders = currentOrders.filter(
            (o) => !liveIds.has(o.sessionId) && o.sessionId.startsWith('#')
          );
          const combined = [...res.orders, ...localOnlyOrders];

          // Check if any incoming order is new to trigger chime and visual banner
          const newlyDiscovered = combined.filter((o) => !seenSessionIds.has(o.sessionId));
          if (newlyDiscovered.length > 0) {
            setSeenSessionIds((prev) => {
              const updated = new Set(prev);
              newlyDiscovered.forEach((o) => updated.add(o.sessionId));
              return updated;
            });

            // Trigger chime if not muted
            if (!isAudioMuted) {
              playNewOrderChime();
            }

            // Show banner
            const latest = newlyDiscovered[0];
            setNewOrderBanner({
              visible: true,
              count: newlyDiscovered.length,
              orderId: latest.sessionId,
            });
          }

          return combined;
        });
      }
    };

    // Run poll every 1500 ms (1.5 seconds)
    const interval = setInterval(poll, 1500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [kioskUrl, seenSessionIds, isAudioMuted]);

  // Auto-simulation mode generator (if enabled)
  useEffect(() => {
    if (!autoSimulate) return;
    const interval = setInterval(() => {
      const mockOrder = generateMockKioskOrder();
      setPendingOrders((prev) => [mockOrder, ...prev]);
      setSeenSessionIds((prev) => new Set([...prev, mockOrder.sessionId]));
      if (!isAudioMuted) {
        playNewOrderChime();
      }
      setNewOrderBanner({
        visible: true,
        count: 1,
        orderId: mockOrder.sessionId,
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [autoSimulate, isAudioMuted]);

  // Quick Test Order Injection
  const handleQuickTestOrder = () => {
    // Unlock Web Audio context if not yet running
    getAudioContext();

    const mock = generateMockKioskOrder();
    setPendingOrders((prev) => [mock, ...prev]);
    setSeenSessionIds((prev) => new Set([...prev, mock.sessionId]));

    if (!isAudioMuted) {
      playNewOrderChime();
    }

    setNewOrderBanner({
      visible: true,
      count: 1,
      orderId: mock.sessionId,
    });
  };

  // Handle Owner Approval
  const handleApproveOrder = async (
    sessionId: string,
    reference: string,
    amount: number
  ): Promise<boolean> => {
    const targetOrder = pendingOrders.find((o) => o.sessionId === sessionId);
    if (!targetOrder) return false;

    // Send POST /api/payment/:sessionId/approve to kiosk
    const result = await approvePayment(kioskUrl, sessionId, {
      reference,
      amount,
      notes: 'Approved by Owner',
    });

    if (!isAudioMuted) {
      playApprovedChime();
    }

    // Record into Shift History
    const approvedJob: ApprovedPrintJob = {
      id: `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: targetOrder.sessionId,
      fileName: targetOrder.fileName,
      pageCount: targetOrder.pageCount,
      colorMode: targetOrder.colorMode,
      paperSize: targetOrder.paperSize || 'A4',
      copies: targetOrder.copies || 1,
      amount: targetOrder.amount,
      reference: reference || 'Not specified',
      approvedAt: new Date().toISOString(),
      status: 'approved',
      kioskId: targetOrder.kioskId,
    };

    setShiftJobs((prev) => [approvedJob, ...prev]);

    // Delay order card removal slightly for pleasant animation feedback
    setTimeout(() => {
      setPendingOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
      if (newOrderBanner?.orderId === sessionId) {
        setNewOrderBanner(null);
      }
    }, 1800);

    return true;
  };

  // Handle Owner Rejection
  const handleRejectOrder = async (sessionId: string, reason: string): Promise<boolean> => {
    const targetOrder = pendingOrders.find((o) => o.sessionId === sessionId);
    if (!targetOrder) return false;

    // Send POST /api/payment/:sessionId/reject to kiosk
    await rejectPayment(kioskUrl, sessionId, reason);

    if (!isAudioMuted) {
      playRejectTone();
    }

    // Record declined order into Shift History
    const declinedJob: ApprovedPrintJob = {
      id: `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: targetOrder.sessionId,
      fileName: targetOrder.fileName,
      pageCount: targetOrder.pageCount,
      colorMode: targetOrder.colorMode,
      paperSize: targetOrder.paperSize || 'A4',
      copies: targetOrder.copies || 1,
      amount: targetOrder.amount,
      reference: 'DECLINED',
      approvedAt: new Date().toISOString(),
      status: 'rejected',
      rejectReason: reason,
      kioskId: targetOrder.kioskId,
    };

    setShiftJobs((prev) => [declinedJob, ...prev]);
    setPendingOrders((prev) => prev.filter((o) => o.sessionId !== sessionId));
    if (newOrderBanner?.orderId === sessionId) {
      setNewOrderBanner(null);
    }

    return true;
  };

  const handleSaveKioskUrl = (newUrl: string) => {
    saveStoredKioskUrl(newUrl);
    setKioskUrl(newUrl);
  };

  const handleClearShift = () => {
    setShiftJobs([]);
    localStorage.removeItem(SHIFT_HISTORY_STORAGE_KEY);
  };

  // Ensure AudioContext is unlocked on first user tap anywhere
  const handleUserInteraction = () => {
    getAudioContext();
  };

  return (
    <div 
      className="min-h-screen bg-[#020617] text-[#f8fafc] flex flex-col font-sans selection:bg-[#007dfe] selection:text-white"
      onClick={handleUserInteraction}
    >
      {/* Mobile-First Cashier Navigation Header */}
      <Header
        connection={connection}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShiftHistory={() => setIsShiftHistoryOpen(true)}
        onQuickTestOrder={handleQuickTestOrder}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        shiftSummary={shiftSummary}
        pendingCount={pendingOrders.length}
      />

      {/* Main Cashier View Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 sm:py-6 space-y-5">
        {/* Quick Kiosk Status Ribbon */}
        {connection.status === 'offline' && (
          <div className="p-3.5 rounded-xl bg-[#0f172a] border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-[#f8fafc]">Target Terminal Standby: </span>
                <span className="text-[#94a3b8]">
                  {connection.errorMessage || 'Checking connection to Kiosk API'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickTestOrder}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-md shadow-emerald-600/20"
            >
              Test Mock Order
            </button>
          </div>
        )}

        {/* Dashboard Quick Stats Ribbon */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#334155]/60 shadow-md flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Pending
            </span>
            <div className="text-2xl font-black text-[#38bdf8] mt-1">
              {pendingOrders.length}
            </div>
            <span className="text-[10px] text-[#64748b]">Awaiting owner</span>
          </div>

          <div 
            onClick={() => setIsShiftHistoryOpen(true)}
            className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#334155]/60 shadow-md flex flex-col justify-between cursor-pointer hover:border-[#334155] transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Today's GCash
            </span>
            <div className="text-2xl font-black text-[#10b981] mt-1">
              ₱{shiftSummary.totalRevenue.toFixed(0)}
            </div>
            <span className="text-[10px] text-emerald-400/90 font-medium">
              {shiftSummary.approvedCount} approved
            </span>
          </div>

          <div 
            onClick={() => setIsShiftHistoryOpen(true)}
            className="p-3.5 rounded-2xl bg-[#0f172a] border border-[#334155]/60 shadow-md flex flex-col justify-between cursor-pointer hover:border-[#334155] transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Pages
            </span>
            <div className="text-2xl font-black text-[#f8fafc] mt-1">
              {shiftSummary.totalPages}
            </div>
            <span className="text-[10px] text-[#64748b]">Printed today</span>
          </div>
        </div>

        {/* Pending Payments Real-Time Dashboard */}
        <PendingPaymentsList
          orders={pendingOrders}
          newOrderBanner={newOrderBanner}
          onDismissBanner={() => setNewOrderBanner(null)}
          onApproveOrder={handleApproveOrder}
          onRejectOrder={handleRejectOrder}
          onQuickTestOrder={handleQuickTestOrder}
          isPolling={true}
        />

        {/* Owner Guidance Footer Info */}
        <div className="pt-6 pb-4 border-t border-[#1e293b] text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f172a] border border-[#334155]/60 text-[11px] text-[#94a3b8]">
            <Printer className="w-3.5 h-3.5 text-[#007dfe]" />
            <span>Approving commands the physical Kiosk printer to start printing immediately.</span>
          </div>
          <p className="text-[11px] text-[#64748b]">
            PrintPoint Kiosk System • GCash Cashier Approval Terminal • Designed for Smartphone & Tablet
          </p>
        </div>
      </main>

      {/* Modals */}
      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        connection={connection}
        onSaveUrl={handleSaveKioskUrl}
        onTestConnection={runHealthCheck}
        autoSimulate={autoSimulate}
        onToggleAutoSimulate={setAutoSimulate}
      />

      <ShiftHistoryModal
        isOpen={isShiftHistoryOpen}
        onClose={() => setIsShiftHistoryOpen(false)}
        jobs={shiftJobs}
        summary={shiftSummary}
        onClearShift={handleClearShift}
      />
    </div>
  );
}
