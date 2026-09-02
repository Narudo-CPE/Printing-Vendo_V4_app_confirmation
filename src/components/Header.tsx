import React from 'react';
import { 
  Printer, 
  Settings, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  History, 
  Wifi, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';
import { KioskConnectionState, ShiftSummary } from '../types';

interface HeaderProps {
  connection: KioskConnectionState;
  onOpenSettings: () => void;
  onOpenShiftHistory: () => void;
  onQuickTestOrder: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  shiftSummary: ShiftSummary;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  connection,
  onOpenSettings,
  onOpenShiftHistory,
  onQuickTestOrder,
  isAudioMuted,
  onToggleAudio,
  shiftSummary,
  pendingCount,
}) => {
  const isConnected = connection.status === 'connected';
  const isChecking = connection.status === 'checking';

  return (
    <header className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur-md border-b border-[#334155]/80 px-4 py-3 shadow-lg shadow-black/30 transition-all">
      <div className="max-w-3xl mx-auto flex flex-col gap-2.5">
        {/* Top bar: Brand + Connection Status + Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#007dfe] to-[#38bdf8] shadow-md shadow-[#007dfe]/25 text-white">
              <Printer className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-bold text-[#020617] animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#f8fafc]">PrintPoint</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#007dfe]/15 text-[#38bdf8] border border-[#007dfe]/30">
                  Cashier
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                <span>GCash Approval Hub</span>
                <span className="text-[#334155]">•</span>
                <span className="text-[#10b981] font-medium">Owner Terminal</span>
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              id="header-audio-toggle-btn"
              onClick={onToggleAudio}
              title={isAudioMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
              aria-label={isAudioMuted ? 'Unmute alerts' : 'Mute alerts'}
              className={`p-2 rounded-lg transition-colors border ${
                isAudioMuted
                  ? 'bg-[#1e293b] text-[#94a3b8] border-[#334155] hover:text-[#f8fafc] hover:bg-[#334155]/60'
                  : 'bg-[#007dfe]/20 text-[#38bdf8] border-[#007dfe]/40 hover:bg-[#007dfe]/30'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Quick Test Simulated Order */}
            <button
              type="button"
              id="header-quick-test-order-btn"
              onClick={onQuickTestOrder}
              title="Inject a simulated customer order to test cashier flow"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/25 active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Test Order</span>
            </button>

            {/* Shift History Modal Trigger */}
            <button
              type="button"
              id="header-shift-history-btn"
              onClick={onOpenShiftHistory}
              title="View shift earnings & approved jobs"
              className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#334155]/70 active:scale-95 transition-all"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Settings Trigger */}
            <button
              type="button"
              id="header-settings-toggle-btn"
              onClick={onOpenSettings}
              title="Configure Kiosk API Endpoint"
              className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#334155]/70 active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Sub-bar: Live Heartbeat Badge & Quick Shift Revenue Pill */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#334155]/50">
          {/* Connection Heartbeat Indicator */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1e293b]/70 hover:bg-[#1e293b] border border-[#334155]/60 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isChecking
                    ? 'bg-amber-400'
                    : isConnected
                    ? 'bg-[#10b981]'
                    : 'bg-rose-500'
                }`}
              ></span>
            </span>
            <span className="text-[#cbd5e1] font-medium">
              {isChecking
                ? 'Testing Kiosk...'
                : isConnected
                ? `Kiosk Online (${connection.latencyMs ?? 0}ms)`
                : 'Kiosk Offline / Reconnecting'}
            </span>
            {isConnected ? (
              <Wifi className="w-3 h-3 text-[#10b981] ml-0.5" />
            ) : (
              <WifiOff className="w-3 h-3 text-rose-400 ml-0.5" />
            )}
          </button>

          {/* Shift Revenue Tracker Pill */}
          <button
            type="button"
            onClick={onOpenShiftHistory}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1e293b]/70 hover:bg-[#1e293b] border border-[#334155]/60 transition-colors"
          >
            <span className="text-[#94a3b8]">Shift Total:</span>
            <span className="font-bold text-[#10b981]">
              ₱{shiftSummary.totalRevenue.toFixed(2)}
            </span>
            <span className="text-[#334155]">•</span>
            <span className="text-[#cbd5e1]">{shiftSummary.totalPages} pgs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
