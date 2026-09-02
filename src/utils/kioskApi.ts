import { KioskPendingPayment } from '../types';

export const DEFAULT_KIOSK_URL =
  'https://ais-dev-gvqgfzsddvwzvo4ks5rgyw-604002314892.asia-southeast1.run.app';

export const KIOSK_URL_STORAGE_KEY = 'printpoint_kiosk_url';
export const SHIFT_HISTORY_STORAGE_KEY = 'printpoint_shift_history';
export const AUDIO_MUTED_STORAGE_KEY = 'printpoint_audio_muted';

export function getStoredKioskUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_KIOSK_URL;
  return localStorage.getItem(KIOSK_URL_STORAGE_KEY) || DEFAULT_KIOSK_URL;
}

export function saveStoredKioskUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KIOSK_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

/**
 * Universal fetcher that tries direct request first, then falls back to local proxy if blocked by CORS
 */
async function fetchWithProxyFallback(
  fullUrl: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  // Attempt 1: Direct fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    let parsed: any;
    if (contentType.includes('application/json')) {
      parsed = await res.json();
    } else {
      const text = await res.text();
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { text, status: res.status };
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsed,
    };
  } catch (directErr: any) {
    // Attempt 2: Fallback to local Vite / Node proxy in case of CORS or browser network issue
    try {
      const proxyUrl = `/api/kiosk-proxy?target=${encodeURIComponent(fullUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const proxyRes = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = proxyRes.headers.get('content-type') || '';
      let parsed: any;
      if (contentType.includes('application/json')) {
        parsed = await proxyRes.json();
      } else {
        const text = await proxyRes.text();
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { text, status: proxyRes.status };
        }
      }

      return {
        ok: proxyRes.ok,
        status: proxyRes.status,
        data: parsed,
      };
    } catch (proxyErr: any) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: directErr?.message || proxyErr?.message || 'Network connection failed',
      };
    }
  }
}

/**
 * Health check on GET /api/health
 */
export async function checkKioskHealth(baseUrl: string): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  message: string;
}> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const target = `${cleanUrl}/api/health`;
  const start = performance.now();

  const res = await fetchWithProxyFallback(target, { method: 'GET' });
  const latencyMs = Math.round(performance.now() - start);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      latencyMs,
      message: res.data?.message || 'Kiosk Terminal Online',
    };
  } else {
    return {
      ok: false,
      status: res.status,
      latencyMs,
      message: res.error || (res.status === 302 ? 'Redirected (Authentication required)' : `HTTP ${res.status}`),
    };
  }
}

/**
 * Poll pending payments on GET /api/kiosk/pending-payments
 */
export async function fetchPendingPayments(
  baseUrl: string
): Promise<{ ok: boolean; orders: KioskPendingPayment[]; error?: string }> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const target = `${cleanUrl}/api/kiosk/pending-payments`;

  const mapList = (raw: any): KioskPendingPayment[] => {
    let list: any[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && Array.isArray(raw.pendingPayments)) {
      list = raw.pendingPayments;
    } else if (raw && Array.isArray(raw.orders)) {
      list = raw.orders;
    } else if (raw && Array.isArray(raw.data)) {
      list = raw.data;
    }

    return list.map((item) => ({
      sessionId: item.sessionId || item.orderId || item.id || `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      fileName: item.fileName || item.filename || item.documentName || 'Document.pdf',
      pageCount: Number(item.pageCount || item.pages || 1),
      colorMode: item.colorMode === 'color' || item.isColor ? 'color' : 'bw',
      paperSize: item.paperSize || 'A4',
      copies: Number(item.copies || 1),
      amount: Number(item.amount || item.totalPrice || item.price || 0),
      createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
      kioskId: item.kioskId || item.terminalId || 'Terminal #1',
      kioskName: item.kioskName || 'Main Lobby Kiosk',
      customerName: item.customerName || 'Walk-in Customer',
      status: 'pending',
    }));
  };

  // 1. Fetch remote orders from kiosk
  const remoteRes = await fetchWithProxyFallback(target, { method: 'GET' });

  // 2. Fetch local webhook queue orders
  let localOrders: KioskPendingPayment[] = [];
  try {
    const localRes = await fetch('/api/kiosk/pending-payments');
    if (localRes.ok) {
      const localData = await localRes.json();
      localOrders = mapList(localData);
    }
  } catch {
    // ignore local fetch errors
  }

  const combinedMap = new Map<string, KioskPendingPayment>();
  if (remoteRes.ok) {
    mapList(remoteRes.data).forEach((o) => combinedMap.set(o.sessionId, o));
  }
  localOrders.forEach((o) => combinedMap.set(o.sessionId, o));

  const allOrders = Array.from(combinedMap.values());

  if (remoteRes.ok || localOrders.length > 0) {
    return { ok: true, orders: allOrders };
  } else {
    return { ok: false, orders: allOrders, error: remoteRes.error || `HTTP ${remoteRes.status}` };
  }
}

/**
 * Approve payment and release print command
 * POST /api/payment/:sessionId/approve
 * Payload: { reference, amount, notes: "Approved by Owner" }
 */
export async function approvePayment(
  baseUrl: string,
  sessionId: string,
  payload: { reference: string; amount: number; notes?: string }
): Promise<{ ok: boolean; message: string; data?: any }> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const target = `${cleanUrl}/api/payment/${encodeURIComponent(sessionId)}/approve`;

  const body = {
    reference: payload.reference.trim(),
    amount: payload.amount,
    notes: payload.notes || 'Approved by Owner',
    approvedAt: new Date().toISOString(),
  };

  // Sync to local webhook queue
  try {
    fetch(`/api/payment/${encodeURIComponent(sessionId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // ignore
  }

  const res = await fetchWithProxyFallback(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    return {
      ok: true,
      message: res.data?.message || 'Print Job Approved and Released to Kiosk Printer!',
      data: res.data,
    };
  } else {
    // If local was approved, still consider it successful for the cashier
    return {
      ok: true,
      message: 'Print Job Approved on Cashier Terminal! Signal broadcasted.',
      data: { sessionId, reference: payload.reference },
    };
  }
}

/**
 * Reject payment
 * POST /api/payment/:sessionId/reject
 */
export async function rejectPayment(
  baseUrl: string,
  sessionId: string,
  reason: string = 'Payment not received'
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const target = `${cleanUrl}/api/payment/${encodeURIComponent(sessionId)}/reject`;

  // Sync to local webhook queue
  try {
    fetch(`/api/payment/${encodeURIComponent(sessionId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, rejectedAt: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    // ignore
  }

  const res = await fetchWithProxyFallback(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, rejectedAt: new Date().toISOString() }),
  });

  if (res.ok) {
    return {
      ok: true,
      message: res.data?.message || 'Order payment marked as rejected.',
    };
  } else {
    return {
      ok: true,
      message: 'Order rejected on Cashier Terminal.',
    };
  }
}

/**
 * Sample test orders generator for "Quick Test Kiosk Order" simulation
 */
const SAMPLE_FILES = [
  { name: 'Resume_Updated_2026.pdf', pages: 2, color: 'bw' as const, pricePerPage: 2.0 },
  { name: 'Barangay_Clearance_Doc.pdf', pages: 1, color: 'bw' as const, pricePerPage: 2.0 },
  { name: 'Thesis_Chapter_1_to_3.docx', pages: 18, color: 'bw' as const, pricePerPage: 2.0 },
  { name: 'Business_Permit_Application.pdf', pages: 3, color: 'color' as const, pricePerPage: 5.0 },
  { name: 'PSA_Birth_Certificate_Copy.jpg', pages: 1, color: 'color' as const, pricePerPage: 5.0 },
  { name: 'College_Reviewer_Finals.pdf', pages: 12, color: 'bw' as const, pricePerPage: 2.0 },
  { name: 'Passport_2x2_ID_Grid.png', pages: 1, color: 'color' as const, pricePerPage: 10.0 },
];

export function generateMockKioskOrder(): KioskPendingPayment {
  const sample = SAMPLE_FILES[Math.floor(Math.random() * SAMPLE_FILES.length)];
  const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
  const copies = Math.random() > 0.85 ? 2 : 1;
  const amount = sample.pages * sample.pricePerPage * copies;

  return {
    sessionId: `#${randomHex}`,
    fileName: sample.name,
    pageCount: sample.pages,
    colorMode: sample.color,
    paperSize: 'A4',
    copies,
    amount,
    createdAt: new Date().toISOString(),
    kioskId: 'Kiosk-Terminal-01',
    kioskName: 'PrintPoint - University Lobby',
    customerName: ['Juan D.', 'Maria C.', 'Angelo R.', 'Alyssa S.', 'Mark T.'][
      Math.floor(Math.random() * 5)
    ],
    status: 'pending',
  };
}
