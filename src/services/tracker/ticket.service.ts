/**
 * Ticket Service
 * API calls for ticket/issue tracking endpoints
 */
import { api } from "@/lib/api";
import type {
  Ticket,
  TicketLog,
  CreateTicketRequest,
  AssignTicketRequest,
  AddTicketLogRequest,
  TicketFilter,
} from "@/types";

/**
 * Create new ticket
 * Only CONTRACTOR can create
 */
export const createTicket = async (
  projectId: string,
  data: CreateTicketRequest
): Promise<Ticket> => {
  return api.post<Ticket>(`/tracker/project/${projectId}/ticket`, data);
};

/**
 * Get all tickets for a project
 * @param filter - 'open' | 'closed' | '' (all)
 */
export const getTickets = async (
  projectId: string,
  filter?: TicketFilter
): Promise<Ticket[]> => {
  const params = filter ? `?status=${filter}` : "";
  return api.get<Ticket[]>(`/tracker/project/${projectId}/ticket${params}`);
};

/**
 * Get ticket detail with full log history
 */
export const getTicketDetail = async (ticketId: string): Promise<Ticket> => {
  return api.get<Ticket>(`/tracker/ticket/${ticketId}`);
};

/**
 * Assign ticket to GOV_PARTNER
 * Only EXECUTING_AGENCY ADMIN can assign
 */
export const assignTicket = async (
  ticketId: string,
  data: AssignTicketRequest
): Promise<Ticket> => {
  return api.put<Ticket>(`/tracker/ticket/${ticketId}/assign`, data);
};

/**
 * Add log/comment to ticket
 * Only GOV_PARTNER (assigned) or EXECUTING_AGENCY can add
 */
export const addTicketLog = async (
  ticketId: string,
  data: AddTicketLogRequest
): Promise<TicketLog> => {
  return api.post<TicketLog>(`/tracker/ticket/${ticketId}/log`, data);
};

/**
 * Close ticket
 * Only EXECUTING_AGENCY ADMIN can close
 */
export const closeTicket = async (ticketId: string): Promise<Ticket> => {
  return api.put<Ticket>(`/tracker/ticket/${ticketId}/close`);
};
