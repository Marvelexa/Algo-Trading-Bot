/**
 * Nexvora Response Capture
 * Runs in the ISOLATED world (Extension Content Script).
 * Listens for messages dispatched by the MAIN world `interceptor.ts`.
 */

export interface InterceptedPayload {
  url: string;
  payload: string;
  timestamp: number;
}

type PayloadCallback = (data: InterceptedPayload) => void;

class ResponseCapture {
  private listeners: PayloadCallback[] = [];
  private isListening = false;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
  }

  public start() {
    if (this.isListening) return;
    window.addEventListener('message', this.handleMessage);
    this.isListening = true;
    console.log('[Nexvora Capture] Listening for network payloads from MAIN world.');
  }

  public stop() {
    if (!this.isListening) return;
    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;
  }

  public subscribe(callback: PayloadCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private handleMessage(event: MessageEvent) {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data && event.data.type === '__NEXVORA_INTERCEPTED_PAYLOAD__') {
      const payloadData: InterceptedPayload = {
        url: event.data.url,
        payload: event.data.payload,
        timestamp: Date.now()
      };

      this.listeners.forEach(listener => {
        try {
          listener(payloadData);
        } catch (error) {
          console.error('[Nexvora Capture] Listener error:', error);
        }
      });
    }
  }
}

export const responseCapture = new ResponseCapture();
