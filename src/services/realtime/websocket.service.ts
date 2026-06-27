import { ENV } from "@/constants";
import type {
  RealtimeConnectionStatus,
  RealtimeEnvelope,
} from "@/types";

interface RealtimeWebSocketClientOptions {
  accessToken: string;
  onMessage: (envelope: RealtimeEnvelope) => void;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
}

const PING_INTERVAL_MS = 28000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const deriveRealtimeUrl = (): string => {
  if (ENV.WS_URL) {
    return ENV.WS_URL;
  }

  const apiUrl = new URL(ENV.API_URL);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = "/api/realtime/ws";
  apiUrl.search = "";
  return apiUrl.toString();
};

const withAccessToken = (url: string, accessToken: string): string => {
  const wsUrl = new URL(url);
  wsUrl.searchParams.set("accessToken", accessToken);
  return wsUrl.toString();
};

export class RealtimeWebSocketClient {
  private accessToken: string;
  private onMessage: (envelope: RealtimeEnvelope) => void;
  private onStatusChange?: (status: RealtimeConnectionStatus) => void;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = true;

  constructor(options: RealtimeWebSocketClientOptions) {
    this.accessToken = options.accessToken;
    this.onMessage = options.onMessage;
    this.onStatusChange = options.onStatusChange;
  }

  connect(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.shouldReconnect = true;
    this.emitStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    const socket = new WebSocket(
      withAccessToken(deriveRealtimeUrl(), this.accessToken)
    );
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emitStatus("connected");
      this.startPing();
    };

    socket.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as RealtimeEnvelope;
        this.onMessage(envelope);
      } catch {
        this.emitStatus("error");
      }
    };

    socket.onerror = () => {
      this.emitStatus("error");
    };

    socket.onclose = () => {
      this.stopPing();
      this.socket = null;

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.emitStatus("closed");
      }
    };
  }

  close(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.stopPing();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.emitStatus("closed");
  }

  subscribe(topics: string[]): void {
    this.sendTopics("subscribe", topics);
  }

  unsubscribe(topics: string[]): void {
    this.sendTopics("unsubscribe", topics);
  }

  private sendTopics(type: "subscribe" | "unsubscribe", topics: string[]): void {
    const normalizedTopics = [...new Set(topics.map((topic) => topic.trim()))]
      .filter(Boolean);

    if (normalizedTopics.length === 0) {
      return;
    }

    this.send({ type, topics: normalizedTopics });
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempt += 1;
    this.emitStatus("reconnecting");

    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** (this.reconnectAttempt - 1),
      RECONNECT_MAX_MS
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emitStatus(status: RealtimeConnectionStatus): void {
    this.onStatusChange?.(status);
  }
}
