import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

interface StoredOrder {
  sessionId: string;
  fileName: string;
  pageCount: number;
  colorMode: 'color' | 'bw';
  paperSize?: string;
  copies?: number;
  amount: number;
  customerName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  reference?: string;
}

const inMemoryOrders: Map<string, StoredOrder> = new Map();

function kioskProxyPlugin(): Plugin {
  return {
    name: 'kiosk-proxy-plugin',
    configureServer(server) {
      // Helper for CORS headers
      const setCorsHeaders = (res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      };

      // 1. Inbound Kiosk Order Webhook: POST /api/kiosk/order
      server.middlewares.use('/api/kiosk/order', async (req, res, next) => {
        setCorsHeaders(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'POST') {
          try {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            const data = JSON.parse(rawBody || '{}');

            const sessionId = data.sessionId || data.orderId || `ORD-${Date.now().toString().slice(-4)}`;
            const order: StoredOrder = {
              sessionId,
              fileName: data.fileName || data.filename || 'Document.pdf',
              pageCount: Number(data.pageCount || data.pages || 1),
              colorMode: data.colorMode === 'color' || data.isColor ? 'color' : 'bw',
              paperSize: data.paperSize || 'A4',
              copies: Number(data.copies || 1),
              amount: Number(data.amount || data.totalPrice || 0),
              customerName: data.customerName || 'Walk-in Customer',
              status: 'pending',
              createdAt: new Date().toISOString(),
            };

            inMemoryOrders.set(sessionId, order);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              message: 'Order received by Cashier Terminal',
              order,
            }));
            return;
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid order JSON payload', details: err?.message }));
            return;
          }
        }
        next();
      });

      // 2. Pending Payments List: GET /api/kiosk/pending-payments
      server.middlewares.use('/api/kiosk/pending-payments', (req, res, next) => {
        setCorsHeaders(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          const pending = Array.from(inMemoryOrders.values()).filter(
            (o) => o.status === 'pending'
          );
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(pending));
          return;
        }
        next();
      });

      // 3. Order Status & Approval Handlers: /api/payment/
      server.middlewares.use('/api/payment', async (req, res, next) => {
        setCorsHeaders(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = req.url || '';
        const matchApprove = url.match(/^\/([^/]+)\/approve/);
        const matchReject = url.match(/^\/([^/]+)\/reject/);
        const matchStatus = url.match(/^\/([^/]+)\/status/);

        if (matchApprove && req.method === 'POST') {
          const sessionId = decodeURIComponent(matchApprove[1]);
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          const body = JSON.parse(rawBody || '{}');

          const existing = inMemoryOrders.get(sessionId) || {
            sessionId,
            fileName: 'Document.pdf',
            pageCount: 1,
            colorMode: 'bw' as const,
            amount: Number(body.amount || 0),
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          };

          existing.status = 'approved';
          existing.approvedAt = new Date().toISOString();
          existing.reference = body.reference || '';
          inMemoryOrders.set(sessionId, existing);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            status: 'approved',
            message: 'Order approved by Cashier. Kiosk authorized to print.',
            order: existing,
          }));
          return;
        }

        if (matchReject && req.method === 'POST') {
          const sessionId = decodeURIComponent(matchReject[1]);
          const existing = inMemoryOrders.get(sessionId);
          if (existing) {
            existing.status = 'rejected';
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, status: 'rejected' }));
          return;
        }

        if (matchStatus && req.method === 'GET') {
          const sessionId = decodeURIComponent(matchStatus[1]);
          const order = inMemoryOrders.get(sessionId);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            found: !!order,
            status: order ? order.status : 'unknown',
            order: order || null,
          }));
          return;
        }

        next();
      });

      // 4. Kiosk Proxy to forward requests to the target Kiosk if needed
      server.middlewares.use('/api/kiosk-proxy', async (req, res) => {
        setCorsHeaders(res);
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
          const target = urlObj.searchParams.get('target');
          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing target URL parameter' }));
            return;
          }

          const method = req.method || 'GET';
          let bodyData: string | undefined = undefined;

          if (method !== 'GET' && method !== 'HEAD') {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            bodyData = Buffer.concat(chunks).toString('utf-8');
          }

          const targetUrl = new URL(target);
          const response = await fetch(targetUrl.toString(), {
            method,
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': (req.headers['content-type'] as string) || 'application/json',
            },
            body: bodyData,
          });

          const contentType = response.headers.get('content-type') || 'application/json';
          const text = await response.text();

          res.statusCode = response.status;
          res.setHeader('Content-Type', contentType);
          res.end(text);
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Proxy request failed', details: err?.message || String(err) }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), kioskProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
