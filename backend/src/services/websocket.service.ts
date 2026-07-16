import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

/* ───────────────────────────────────────────
 *  Types
 * ─────────────────────────────────────────── */

interface SubscriptionMessage {
  type: 'subscribe';
  reference: string;
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  reference?: string;
}

type ClientMessage = SubscriptionMessage | UnsubscribeMessage;

export interface PaymentStatusEvent {
  type: 'payment:status';
  data: {
    reference: string;
    payment_status: string;
    order_status: string;
    timestamp: string;
  };
}

/* ───────────────────────────────────────────
 *  Service
 * ─────────────────────────────────────────── */

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  /** Map of reference → Set of connected clients subscribed to that reference */
  private subscriptions = new Map<string, Set<WebSocket>>();
  /** Map of client → Set of references the client is subscribed to (for cleanup) */
  private clientRefs = new Map<WebSocket, Set<string>>();

  /**
   * Initialize the WebSocket server by attaching to an existing HTTP server.
   * Called once during server startup.
   */
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 WebSocket client connected');

      // Initialize this client's subscription set
      this.clientRefs.set(ws, new Set());

      ws.on('message', (raw: Buffer) => {
        try {
          const msg: ClientMessage = JSON.parse(raw.toString());

          if (msg.type === 'subscribe' && msg.reference) {
            this.subscribe(ws, msg.reference);
          } else if (msg.type === 'unsubscribe') {
            if (msg.reference) {
              this.unsubscribe(ws, msg.reference);
            } else {
              // Unsubscribe from ALL references
              this.unsubscribeAll(ws);
            }
          }
        } catch (err) {
          console.warn('⚠️  WebSocket invalid message:', err);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.cleanupClient(ws);
      });

      ws.on('error', (err) => {
        console.warn('⚠️  WebSocket error:', err.message);
        this.cleanupClient(ws);
      });

      // Send a welcome/acknowledgment message
      this.send(ws, {
        type: 'connected',
        data: { message: 'WebSocket connected', timestamp: new Date().toISOString() },
      });
    });

    console.log('🔌 WebSocket server attached at /ws');
  }

  /**
   * Subscribe a client to a specific order reference.
   */
  private subscribe(ws: WebSocket, reference: string): void {
    // Add reference → client mapping
    if (!this.subscriptions.has(reference)) {
      this.subscriptions.set(reference, new Set());
    }
    this.subscriptions.get(reference)!.add(ws);

    // Add client → reference mapping (for cleanup)
    const refs = this.clientRefs.get(ws);
    if (refs) {
      refs.add(reference);
    }

    this.send(ws, {
      type: 'subscribed',
      data: { reference, timestamp: new Date().toISOString() },
    });
  }

  /**
   * Unsubscribe a client from a specific reference.
   */
  private unsubscribe(ws: WebSocket, reference: string): void {
    const clients = this.subscriptions.get(reference);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.subscriptions.delete(reference);
      }
    }

    const refs = this.clientRefs.get(ws);
    if (refs) {
      refs.delete(reference);
    }
  }

  /**
   * Unsubscribe a client from ALL references.
   */
  private unsubscribeAll(ws: WebSocket): void {
    const refs = this.clientRefs.get(ws);
    if (refs) {
      for (const reference of refs) {
        const clients = this.subscriptions.get(reference);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            this.subscriptions.delete(reference);
          }
        }
      }
      refs.clear();
    }
  }

  /**
   * Clean up all subscriptions for a disconnected client.
   */
  private cleanupClient(ws: WebSocket): void {
    this.unsubscribeAll(ws);
    this.clientRefs.delete(ws);
  }

  /**
   * Emit a payment status update to all subscribers of a given reference.
   *
   * This is the PRIMARY method called from order.service.ts whenever
   * payment status changes (paid, failed, processing, completed).
   */
  emitPaymentStatus(data: {
    reference: string;
    payment_status: string;
    order_status: string;
  }): void {
    const event: PaymentStatusEvent = {
      type: 'payment:status',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    };

    const clients = this.subscriptions.get(data.reference);
    if (!clients || clients.size === 0) return;

    const payload = JSON.stringify(event);

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }

    console.log(
      `📡 WebSocket emitted payment:status for ${data.reference} → ${data.payment_status} (${clients.size} subscribers)`
    );
  }

  /**
   * Send a JSON message to a single WebSocket client.
   */
  private send(ws: WebSocket, data: Record<string, any>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Get the total number of connected clients.
   */
  get connectedClients(): number {
    return this.clientRefs.size;
  }

  /**
   * Get the total number of active subscriptions.
   */
  get activeSubscriptions(): number {
    return this.subscriptions.size;
  }
}

export const webSocketService = new WebSocketService();
