export type RealtimeSystemEventType =
  | "realtime.connected"
  | "realtime.pong"
  | "realtime.subscription_updated"
  | "realtime.error";

export type DomainEventType =
  | "progress.submitted"
  | "progress.validated"
  | "ticket.created"
  | "ticket.assigned"
  | "ticket.resolved"
  | "ticket.closed"
  | "payment.approved"
  | "payment.paid"
  | "organization.member.invited";

export type RealtimeEventType = RealtimeSystemEventType | DomainEventType;

export interface RealtimeEnvelope<T = unknown> {
  type: RealtimeEventType | string;
  topic: string;
  data: T;
  sentAt: string;
}

export interface RealtimeConnectedData {
  clientId: string;
  userId: string;
  topics: string[];
}

export interface RealtimePongData {
  receivedAt: string;
}

export interface RealtimeSubscriptionUpdatedData {
  subscribed: string[];
  unsubscribed: string[];
  rejected: string[];
}

export interface RealtimeErrorData {
  message: string;
}

export interface DomainEventData {
  outboxEventId: string;
  eventType: DomainEventType | string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown> | null;
}

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";
