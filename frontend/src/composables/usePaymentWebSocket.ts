import { ref, onUnmounted, watch, type Ref } from 'vue'

/* ───────────────────────────────────────────
 *  Types
 * ─────────────────────────────────────────── */

interface PaymentStatusEvent {
  type: 'payment:status'
  data: {
    reference: string
    payment_status: string
    order_status: string
    timestamp: string
  }
}

interface ConnectedEvent {
  type: 'connected'
  data: {
    message: string
    timestamp: string
  }
}

interface SubscribedEvent {
  type: 'subscribed'
  data: {
    reference: string
    timestamp: string
  }
}

type WsMessage = PaymentStatusEvent | ConnectedEvent | SubscribedEvent

/* ───────────────────────────────────────────
 *  Composable
 * ─────────────────────────────────────────── */

export function usePaymentWebSocket(reference: Ref<string | null>) {
  const connected = ref(false)
  const lastEvent = ref<PaymentStatusEvent['data'] | null>(null)
  const reconnectAttempts = ref(0)
  const MaxReconnectAttempts = 10

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let closeRequested = false

  /**
   * Callback invoked when a payment:status event is received.
   * The parent component sets this to handle the event (e.g. show success overlay).
   */
  let onStatusChange: ((data: PaymentStatusEvent['data']) => void) | null = null
  function setOnStatusChange(cb: (data: PaymentStatusEvent['data']) => void) {
    onStatusChange = cb
  }

  /**
   * Connect to the WebSocket server and subscribe to the given reference.
   */
  function connect(refToSubscribe: string) {
    // Don't reconnect if close was requested
    if (closeRequested) return

    // Determine the WebSocket URL based on the current environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws`

    try {
      ws = new WebSocket(wsUrl)
    } catch (err) {
      console.warn('⚠️  WebSocket connection failed:', err)
      scheduleReconnect(refToSubscribe)
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectAttempts.value = 0

      // Subscribe to the order reference
      ws?.send(
        JSON.stringify({
          type: 'subscribe',
          reference: refToSubscribe,
        })
      )
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data)

        if (msg.type === 'payment:status') {
          lastEvent.value = msg.data

          // Notify the parent component
          if (onStatusChange) {
            onStatusChange(msg.data)
          }
        }
        // 'connected' and 'subscribed' are ack messages — no action needed
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null

      // Auto-reconnect unless close was intentional
      if (!closeRequested) {
        scheduleReconnect(refToSubscribe)
      }
    }

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnection is handled there
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  function scheduleReconnect(refToSubscribe: string) {
    if (reconnectTimer) clearTimeout(reconnectTimer)

    if (reconnectAttempts.value >= MaxReconnectAttempts) {
      console.warn('⚠️  WebSocket max reconnect attempts reached — giving up')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
    reconnectAttempts.value++

    reconnectTimer = setTimeout(() => {
      connect(refToSubscribe)
    }, delay)
  }

  /**
   * Disconnect from the WebSocket server.
   */
  function disconnect() {
    closeRequested = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
    reconnectAttempts.value = 0
  }

  /**
   * Subscribe to a new reference (e.g. after retry with a new payment).
   */
  function subscribe(newRef: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          reference: newRef,
        })
      )
    } else {
      // If not connected, reconnect with the new reference
      disconnect()
      closeRequested = false
      connect(newRef)
    }
  }

  // Watch the reference prop — auto-connect when a reference is available
  const stopWatch = watch(
    reference,
    (newRef) => {
      // Always disconnect the OLD WebSocket before connecting to a new reference
      // This prevents leaking connections on retry or reference changes
      disconnect()
      if (newRef) {
        closeRequested = false
        connect(newRef)
      }
    },
    { immediate: true }
  )

  // Cleanup on component unmount
  onUnmounted(() => {
    stopWatch()
    disconnect()
  })

  return {
    connected,
    lastEvent,
    reconnectAttempts,
    setOnStatusChange,
    subscribe,
    disconnect,
  }
}
