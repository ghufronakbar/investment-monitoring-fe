/**
 * Query Keys for TanStack Query
 * Centralized query key definitions for easy invalidation
 */
import type { QueryClient } from "@tanstack/react-query";
import type { DomainEventData, RealtimeEnvelope } from "@/types";

// Query key factory pattern
export const queryKeys = {
  // Auth & User
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
    memberships: () => [...queryKeys.auth.all, "memberships"] as const,
    profile: () => [...queryKeys.auth.all, "profile"] as const,
  },

  // Organizations
  organizations: {
    all: ["organizations"] as const,
    registered: () => [...queryKeys.organizations.all, "registered"] as const,
    my: () => [...queryKeys.organizations.all, "my"] as const,
    detail: (orgId: string) =>
      [...queryKeys.organizations.all, "detail", orgId] as const,
    members: (orgId: string) =>
      [...queryKeys.organizations.all, "members", orgId] as const,
  },

  // Projects
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (projectId: string) =>
      [...queryKeys.projects.all, "detail", projectId] as const,
  },

  // Monitoring - Tasks
  tasks: {
    all: ["tasks"] as const,
    tree: (projectId: string) =>
      [...queryKeys.tasks.all, "tree", projectId] as const,
    leaf: (projectId: string) =>
      [...queryKeys.tasks.all, "leaf", projectId] as const,
    validation: (projectId: string) =>
      [...queryKeys.tasks.all, "validation", projectId] as const,
    detail: (taskId: string) =>
      [...queryKeys.tasks.all, "detail", taskId] as const,
  },

  // Monitoring - Progress
  progress: {
    all: ["progress"] as const,
    logs: (projectId: string) =>
      [...queryKeys.progress.all, "logs", projectId] as const,
    pending: (projectId: string) =>
      [...queryKeys.progress.all, "pending", projectId] as const,
    scurve: (projectId: string) =>
      [...queryKeys.progress.all, "scurve", projectId] as const,
  },

  // Tickets
  tickets: {
    all: ["tickets"] as const,
    list: (projectId: string, filter?: string) =>
      [...queryKeys.tickets.all, "list", projectId, filter].filter(
        Boolean
      ) as readonly string[],
    detail: (ticketId: string) =>
      [...queryKeys.tickets.all, "detail", ticketId] as const,
  },

  // Finance - Payments
  payments: {
    all: ["payments"] as const,
    list: (projectId: string) =>
      [...queryKeys.payments.all, "list", projectId] as const,
    detail: (requestId: string) =>
      [...queryKeys.payments.all, "detail", requestId] as const,
    summary: (projectId: string) =>
      [...queryKeys.payments.all, "summary", projectId] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: (projectId: string) =>
      [...queryKeys.dashboard.all, "stats", projectId] as const,
    scurve: (projectId: string) =>
      [...queryKeys.dashboard.all, "scurve", projectId] as const,
  },

  realtime: {
    all: ["realtime"] as const,
    connection: () => [...queryKeys.realtime.all, "connection"] as const,
  },

  // Monitoring - convenience grouping
  monitoring: {
    tasks: (projectId: string) => queryKeys.tasks.tree(projectId),
    taskValidation: (projectId: string) =>
      queryKeys.tasks.validation(projectId),
    leafTasks: (projectId: string) => queryKeys.tasks.leaf(projectId),
    logs: (projectId: string) => queryKeys.progress.logs(projectId),
    pending: (projectId: string) => queryKeys.progress.pending(projectId),
    scurve: (projectId: string) => queryKeys.progress.scurve(projectId),
  },
} as const;

/**
 * Invalidation helpers - which keys to invalidate after mutations
 */
export const invalidationMap = {
  // After login/logout - invalidate all auth-related queries
  auth: [queryKeys.auth.all, queryKeys.organizations.my()],

  // After creating/updating organization
  organization: (orgId?: string) => [
    queryKeys.organizations.all,
    ...(orgId
      ? [
          queryKeys.organizations.detail(orgId),
          queryKeys.organizations.members(orgId),
        ]
      : []),
  ],

  // After project mutations
  project: (projectId?: string) => [
    queryKeys.projects.list(),
    ...(projectId ? [queryKeys.projects.detail(projectId)] : []),
  ],

  // After task mutations - also invalidate progress and dashboard
  task: (projectId: string) => [
    queryKeys.tasks.tree(projectId),
    queryKeys.tasks.leaf(projectId),
    queryKeys.tasks.validation(projectId),
    queryKeys.progress.scurve(projectId),
    queryKeys.dashboard.stats(projectId),
    queryKeys.dashboard.scurve(projectId),
  ],

  // After progress submission
  progressSubmit: (projectId: string) => [
    queryKeys.progress.logs(projectId),
    queryKeys.progress.pending(projectId),
    queryKeys.progress.scurve(projectId),
    queryKeys.tasks.tree(projectId), // Update task percentages
    queryKeys.dashboard.stats(projectId),
    queryKeys.dashboard.scurve(projectId),
  ],

  // After progress validation
  progressValidate: (projectId: string) => [
    queryKeys.progress.logs(projectId),
    queryKeys.progress.pending(projectId),
    queryKeys.progress.scurve(projectId),
    queryKeys.tasks.tree(projectId),
    queryKeys.dashboard.stats(projectId),
    queryKeys.dashboard.scurve(projectId),
  ],

  // After ticket mutations
  ticket: (projectId: string, ticketId?: string) => [
    queryKeys.tickets.list(projectId),
    ...(ticketId ? [queryKeys.tickets.detail(ticketId)] : []),
    queryKeys.dashboard.stats(projectId), // Update ticket stats
  ],

  // After payment mutations
  payment: (projectId: string, requestId?: string) => [
    queryKeys.payments.list(projectId),
    queryKeys.payments.summary(projectId),
    ...(requestId ? [queryKeys.payments.detail(requestId)] : []),
    queryKeys.dashboard.stats(projectId), // Update disbursed amount
  ],
} as const;

const topicProjectId = (topic: string): string | null => {
  const match = topic.match(/^project\.([^.\s]+)/);
  return match?.[1] ?? null;
};

const payloadString = (
  payload: Record<string, unknown> | null,
  key: string
): string | null => {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
};

const invalidateKeys = (
  queryClient: QueryClient,
  keys: readonly (readonly unknown[])[]
): void => {
  keys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};

export const invalidateByRealtimeEvent = (
  queryClient: QueryClient,
  envelope: RealtimeEnvelope
): void => {
  const data = envelope.data as DomainEventData | undefined;
  if (!data?.eventType) {
    return;
  }

  const projectId =
    topicProjectId(envelope.topic) ?? payloadString(data.payload, "projectId");

  switch (data.eventType) {
    case "progress.submitted":
      if (projectId) {
        invalidateKeys(queryClient, invalidationMap.progressSubmit(projectId));
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
      break;

    case "progress.validated":
      if (projectId) {
        invalidateKeys(queryClient, invalidationMap.progressValidate(projectId));
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.progress.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
      break;

    case "ticket.created":
    case "ticket.assigned":
    case "ticket.resolved":
    case "ticket.closed": {
      const ticketId =
        data.aggregateType === "ticket"
          ? data.aggregateId
          : payloadString(data.payload, "ticketId");
      if (projectId) {
        invalidateKeys(queryClient, invalidationMap.ticket(projectId, ticketId ?? undefined));
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
      break;
    }

    case "payment.approved":
    case "payment.paid": {
      const requestId =
        data.aggregateType === "payment"
          ? data.aggregateId
          : payloadString(data.payload, "paymentRequestId");
      if (projectId) {
        invalidateKeys(queryClient, invalidationMap.payment(projectId, requestId ?? undefined));
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }
      break;
    }

    case "organization.member.invited": {
      const organizationId =
        payloadString(data.payload, "organizationId") ??
        (data.aggregateType === "organization" ? data.aggregateId : null);
      invalidateKeys(queryClient, invalidationMap.auth);
      invalidateKeys(queryClient, invalidationMap.organization(organizationId ?? undefined));
      break;
    }
  }
};
