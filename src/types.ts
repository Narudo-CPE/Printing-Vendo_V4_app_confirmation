export type ColorMode = 'bw' | 'color';
export type PaperSize = 'A4' | 'Short' | 'Long';

export interface KioskPendingPayment {
  sessionId: string;
  fileName: string;
  pageCount: number;
  colorMode: ColorMode;
  paperSize?: PaperSize;
  copies?: number;
  amount: number; // in Philippine Pesos (PHP)
  createdAt: string; // ISO string or timestamp
  kioskId?: string;
  kioskName?: string;
  customerName?: string;
  status?: 'pending' | 'approving' | 'approved' | 'rejecting' | 'rejected';
}

export interface ApprovedPrintJob {
  id: string;
  sessionId: string;
  fileName: string;
  pageCount: number;
  colorMode: ColorMode;
  paperSize: string;
  copies: number;
  amount: number;
  reference: string;
  approvedAt: string;
  status: 'approved' | 'rejected';
  rejectReason?: string;
  kioskId?: string;
}

export interface KioskConnectionState {
  url: string;
  status: 'connected' | 'error' | 'checking' | 'offline';
  lastChecked: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  httpStatus?: number;
}

export interface ShiftSummary {
  totalRevenue: number;
  totalPages: number;
  approvedCount: number;
  rejectedCount: number;
  shiftStartedAt: string;
}
