/**
 * Tracker types - Ticket system
 */

// Ticket status enum
export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

// Ticket log action enum
export type TicketLogAction =
  | "CREATE"
  | "ASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENTED";

// Ticket creator/assignee info
export interface TicketParticipant {
  orgId: string;
  orgName: string;
}

// Ticket log entry
export interface TicketLog {
  id: string;
  action: TicketLogAction;
  description: string;
  attachmentUrl: string | null;
  previousStatus: TicketStatus | null;
  newStatus: TicketStatus;
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// Ticket data
export interface Ticket {
  id: string;
  title: string;
  description: string;
  location: string;
  evidenceImageUrls: string[];
  taskItemId: string | null;
  taskTitle: string | null;
  contractId: string;
  currentStatus: TicketStatus;
  creator: TicketParticipant;
  assignedTo: TicketParticipant | null;
  logs?: TicketLog[];
  createdAt: string;
  lastLogAt?: string;
}

// Create ticket request
export interface CreateTicketRequest {
  title: string;
  description: string;
  location: string;
  evidenceImageUrls: string[];
  taskItemId?: string | null;
}

// Assign ticket request
export interface AssignTicketRequest {
  assignToOrgId: string;
}

// Add ticket log request
export interface AddTicketLogRequest {
  description: string;
  newStatus?: "IN_PROGRESS" | "RESOLVED" | null;
  attachmentUrl?: string | null;
}

// Ticket filter
export type TicketFilter = "open" | "closed" | "";
