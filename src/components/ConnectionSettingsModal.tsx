import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  ExternalLink, 
  Zap,
  Radio
} from 'lucide-react';
import { KioskConnectionState } from '../types';
import { DEFAULT_KIOSK_URL } from '../utils/kioskApi';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: KioskConnectionState;
  onSaveUrl: (url: string) => void;
  onTestConnection: () => Promise<void>;
  autoSimulate: boolean;
  onToggleAutoSimulate: (enabled: boolean) => void;
}

export const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({
  isOpen,
  onClose,
  connection,
  onSaveUrl,
  onTestConnection,
  autoSimulate,
  onToggleAutoSimulate,
}) => {
  const [urlInput, setUrlInput] = useState(connection.url);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (newUrl?: string) => {
    const target = (newUrl || urlInput).trim();
    if (!target) return;
    onSaveUrl(target);
    setUrlInput(target);
    setSaveSuccessMessage('Kiosk URL updated and active!');
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  const handleTest = async () => {
    setIsTesting(true);
    await onTestConnection();
    setIsTesting(false);
  };

  const isConnected = connection.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] bg-[#020617]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#007dfe]/10 text-[#38bdf8] border border-[#007dfe]/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-bold text-[#f8fafc]">
                Kiosk Terminal Connection
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Configure target hardware terminal & verify live health
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Live Heartbeat Card */}
          <div className="p-4 rounded-xl bg-[#020617]/80 border border-[#334155]/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {isConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      connection.status === 'checking'
                        ? 'bg-amber-400'
                        : isConnected
                        ? 'bg-[#10b981]'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                </span>
                <span className="font-semibold text-[#f8fafc]">
                  Heartbeat Indicator ({isConnected ? 'Online' : 'Offline / Checking'})
                </span>
              </div>
              <button
                type="button"
                id="test-connection-btn"
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155] hover:text-white border border-[#334155] active:scale-95 disabled:opacity-50 transition-all"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#38bdf8]' : ''}`} />
                <span>{isTesting ? 'Pinging...' : 'Ping GET /api/health'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#334155]/60 text-xs">
              <div>
                <span className="text-[#94a3b8]">Response Latency:</span>
                <p className="font-mono font-medium text-[#f8fafc] mt-0.5">
                  {connection.latencyMs !== null ? `${connection.latencyMs} ms` : '—'}
                </p>
              </div>
              <div>
                <span className="text-[#94a3b8]">Last Checked:</span>
                <p className="font-mono text-[#cbd5e1] mt-0.5">
                  {connection.lastChecked
                    ? new Date(connection.lastChecked).toLocaleTimeString()
                    : 'Not checked yet'}
                </p>
              </div>
            </div>

            {connection.errorMessage && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden break-words">
                  <span className="font-semibold">Notice: </span>
                  {connection.errorMessage}
                  <p className="text-[11px] text-[#94a3b8] mt-1">
                    Tip: You can use the "Quick Test Kiosk Order" button or enable automatic simulation anytime to test cashier payment approvals even without physical kiosk connectivity.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* URL Input Form */}
          <div className="space-y-2">
            <label htmlFor="kiosk-url-input" className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Kiosk Terminal API Base URL
            </label>
            <div className="relative">
              <input
                id="kiosk-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] focus:border-[#007dfe] focus:ring-1 focus:ring-[#007dfe] text-[#f8fafc] text-sm font-mono placeholder:text-[#64748b] transition-colors"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUrlInput(DEFAULT_KIOSK_URL);
                  handleApply(DEFAULT_KIOSK_URL);
                }}
                className="px-2.5 py-1 text-xs rounded-md bg-[#1e293b] text-[#cbd5e1] hover:text-white border border-[#334155] hover:border-[#007dfe] transition-colors"
              >
                Reset Default Cloud Run URL
              </button>
              <button
                type="button"
                onClick={() => {
                  const local = 'http://localhost:3000';
                  setUrlInput(local);
                  handleApply(local);
                }}
                className="px-2.5 py-1 text-xs rounded-md bg-[#1e293b] text-[#cbd5e1] hover:text-white border border-[#334155] hover:border-[#007dfe] transition-colors"
              >
                Localhost (3000)
              </button>
            </div>
          </div>

          {/* Polling Interval & Workflow Info */}
          <div className="p-3.5 rounded-xl bg-[#020617]/50 border border-[#334155]/70 space-y-2 text-xs text-[#cbd5e1]">
            <div className="flex items-center gap-2 font-medium text-[#f8fafc]">
              <Activity className="w-4 h-4 text-[#007dfe]" />
              <span>Real-Time Polling Engine</span>
            </div>
            <p className="text-[#94a3b8] leading-relaxed">
              The cashier dashboard queries <code className="text-[#38bdf8] bg-[#007dfe]/15 px-1 py-0.5 rounded border border-[#007dfe]/20">GET /api/kiosk/pending-payments</code> automatically every <strong className="text-[#f8fafc]">1.5 seconds</strong>. When a customer reaches the QR payment screen on the kiosk, it instantly triggers an alert banner and chime sound here.
            </p>
          </div>

          {/* Simulation Mode Toggle */}
          <div className="p-4 rounded-xl bg-[#020617]/70 border border-[#334155] flex items-center justify-between">
            <div className="pr-3">
              <div className="flex items-center gap-1.5 font-semibold text-[#f8fafc]">
                <Radio className={`w-4 h-4 ${autoSimulate ? 'text-[#10b981] animate-pulse' : 'text-[#64748b]'}`} />
                <span>Auto-Simulation Mode</span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Automatically generate sample kiosk walk-in customers every 20 seconds for cashier practice
              </p>
            </div>
            <button
              type="button"
              id="toggle-auto-simulate-btn"
              onClick={() => onToggleAutoSimulate(!autoSimulate)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoSimulate ? 'bg-[#10b981]' : 'bg-[#334155]'
              }`}
              role="switch"
              aria-checked={autoSimulate}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoSimulate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#334155] bg-[#020617]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            id="save-settings-btn"
            onClick={() => handleApply()}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007dfe] hover:bg-blue-600 text-white shadow-lg shadow-[#007dfe]/25 active:scale-95 transition-all"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
