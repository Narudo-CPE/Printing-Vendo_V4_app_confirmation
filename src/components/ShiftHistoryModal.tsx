import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Receipt, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  FileText, 
  Printer, 
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { ApprovedPrintJob, ShiftSummary } from '../types';

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ApprovedPrintJob[];
  summary: ShiftSummary;
  onClearShift: () => void;
}

export const ShiftHistoryModal: React.FC<ShiftHistoryModalProps> = ({
  isOpen,
  onClose,
  jobs,
  summary,
  onClearShift,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptView, setShowReceiptView] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    return (
      job.sessionId.toLowerCase().includes(q) ||
      job.fileName.toLowerCase().includes(q) ||
      job.reference.toLowerCase().includes(q) ||
      (job.rejectReason && job.rejectReason.toLowerCase().includes(q))
    );
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (jobs.length === 0) return;

    const headers = [
      'Timestamp',
      'Session ID',
      'File Name',
      'Pages',
      'Color Mode',
      'Copies',
      'Amount (PHP)',
      'GCash Reference',
      'Status',
      'Notes / Reason',
    ];

    const rows = jobs.map((job) => [
      `"${job.approvedAt}"`,
      `"${job.sessionId}"`,
      `"${job.fileName.replace(/"/g, '""')}"`,
      job.pageCount,
      `"${job.colorMode}"`,
      job.copies,
      job.amount.toFixed(2),
      `"${job.reference}"`,
      `"${job.status}"`,
      `"${(job.rejectReason || 'Approved by Owner').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `printpoint-shift-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-history-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] bg-[#020617]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shift-history-title" className="text-base font-bold text-[#f8fafc]">
                Cashier Shift History & Revenue
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Shift started {new Date(summary.shiftStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(summary.shiftStartedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-shift-history-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#020617]/80 border border-[#334155]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Total Revenue
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#10b981] mt-1">
                ₱{summary.totalRevenue.toFixed(2)}
              </div>
              <span className="text-[10px] text-[#64748b]">Collected via GCash</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#020617]/80 border border-[#334155]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Pages Printed
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#38bdf8] mt-1">
                {summary.totalPages}
              </div>
              <span className="text-[10px] text-[#64748b]">Total paper output</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#020617]/80 border border-[#334155]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Approved Jobs
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#f8fafc] mt-1">
                {summary.approvedCount}
              </div>
              <span className="text-[10px] text-emerald-400">Successful prints</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#020617]/80 border border-[#334155]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider block">
                Declined Orders
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#cbd5e1] mt-1">
                {summary.rejectedCount}
              </div>
              <span className="text-[10px] text-rose-400">Unpaid / Rejected</span>
            </div>
          </div>

          {/* Action Bar: Export CSV & View Summary Slip */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, file, or GCash ref..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-xs text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#007dfe]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="export-csv-btn"
                onClick={handleExportCSV}
                disabled={jobs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] hover:text-[#f8fafc] border border-[#334155] disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                id="view-receipt-btn"
                onClick={() => setShowReceiptView(!showReceiptView)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#007dfe]/15 hover:bg-[#007dfe]/25 text-[#38bdf8] border border-[#007dfe]/30 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{showReceiptView ? 'Hide Receipt Slip' : 'Cashier Slip'}</span>
              </button>
            </div>
          </div>

          {/* Cashier Slip Preview (Thermal Print Style) */}
          {showReceiptView && (
            <div className="p-5 rounded-2xl bg-white text-slate-900 font-mono text-xs space-y-3 shadow-xl max-w-sm mx-auto border border-slate-300">
              <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-1">
                <div className="font-bold text-sm tracking-wider">PRINTPOINT SELF-SERVICE KIOSK</div>
                <div className="text-[11px] text-slate-600">TERMINAL OWNER / CASHIER SHIFT REPORT</div>
                <div className="text-[10px] text-slate-500">
                  {new Date().toLocaleString()}
                </div>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                <div className="flex justify-between">
                  <span>Shift Started:</span>
                  <span className="font-semibold">{new Date(summary.shiftStartedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved Print Jobs:</span>
                  <span className="font-semibold">{summary.approvedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Pages Printed:</span>
                  <span className="font-semibold">{summary.totalPages} pages</span>
                </div>
                <div className="flex justify-between">
                  <span>Declined Orders:</span>
                  <span className="font-semibold">{summary.rejectedCount}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm font-bold border-b border-dashed border-slate-400 pb-3">
                <span>TOTAL GCASH COLLECTED:</span>
                <span>₱{summary.totalRevenue.toFixed(2)}</span>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1 space-y-1">
                <div>Z-READING SUMMARY VERIFIED</div>
                <div>Keep for father's GCash bookkeeping audit</div>
              </div>

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full mt-2 py-2 rounded-lg bg-[#020617] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#0f172a] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip (Browser Print)</span>
              </button>
            </div>
          )}

          {/* Transactions List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
              Shift Transaction Log ({filteredJobs.length})
            </h3>

            {filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748b] border border-dashed border-[#334155] rounded-xl">
                No transactions recorded in this shift yet. Approved orders will appear here automatically.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl bg-[#020617]/80 border border-[#334155]/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5">
                        {job.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[#f8fafc]">
                            {job.sessionId}
                          </span>
                          <span className="text-[#334155]">•</span>
                          <span className="text-[#cbd5e1] truncate max-w-[160px] sm:max-w-[220px]">
                            {job.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#94a3b8]">
                          <span>{job.pageCount} pgs ({job.colorMode.toUpperCase()})</span>
                          <span>•</span>
                          <span>{new Date(job.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {job.reference && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[#38bdf8]">Ref: {job.reference}</span>
                            </>
                          )}
                          {job.rejectReason && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400">{job.rejectReason}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${job.status === 'approved' ? 'text-[#10b981]' : 'text-[#64748b] line-through'}`}>
                        ₱{job.amount.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#64748b] uppercase font-medium">
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Shift Section */}
          <div className="pt-4 border-t border-[#334155]/60 flex items-center justify-between">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300">Are you sure? This resets shift totals.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearShift();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1.5 text-xs text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="reset-shift-btn"
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset / Close Shift</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[#f8fafc] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
